/*

---------------------------------------------------------------
> O ARQUIVISTA — renomear os arquivos e as pastas de um diretório
---------------------------------------------------------------

A mesma regra do renomear das comps (configuração > renomear), nos nomes dos arquivos e das pastas de uma pasta. O
host (files.jsx) lê a pasta e sugere o nome de cada item; aqui a pessoa confere, edita o novo nome que quiser,
desliga o que não deve mudar e renomeia.

  - o prefixo do tipo vem do próprio nome do arquivo (_CRT_HOJE → CRT - HOJE), nunca da pasta de cima;
  - nome repetido na mesma pasta, vazio ou com caractere inválido fica de fora (o alerta na linha diz o motivo); o resto renomeia, em lotes, com a barra de progresso;
  - o arquivo usado no projeto aberto é religado depois de renomeado;
  - uma sequência de imagens é uma linha só (os números dos quadros ficam);
  - a última renomeação pode ser desfeita (o botão redondo do rodapé), mesmo depois de fechar a janela.

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;
	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/README.md#arquivos';
	var PREF_OPTS = 'pad.files.opts';
	var BAD_CHARS = /[\\\/:*?"<>|]/;

	var ICON = {
		folder: '<svg class="fl-kind is-folder" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></svg>',
		file: '<svg class="fl-kind" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><path d="M13.5 3.5V8H18" /></svg>',
		seq: '<svg class="fl-kind" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="13" height="13" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></svg>'
	};
	// a situação em ícone: o lápis (muda), o visto (já no padrão), o alerta (não pode), o elo (muda e é usado no
	// projeto aberto) e o traço (desligado)
	var STATE_ICON = {
		chg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>',
		same: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>',
		bad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.5 20h19z" /><path d="M12 10v4.5M12 17.5v.01" /></svg>',
		use: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>',
		off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /></svg>'
	};

	// items: os do host, cada um com id, on (ligado) e custom (o nome editado, ou null)
	var state = { path: '', name: '', items: [], filter: 'all', step: 0, busy: false, undo: null, truncated: false, loaded: false };

	function $(id) {
		return document.getElementById(id);
	}

	function el(tag, className, text) {
		var node = document.createElement(tag);

		if (className) node.className = className;
		if (text != null) node.textContent = text;

		return node;
	}

	function pref(key, value) {
		try {
			if (value === undefined) return localStorage.getItem(key);
			localStorage.setItem(key, value);
		} catch (err) { }

		return null;
	}

	function status(text, kind) {
		var node = $('fw-status');

		node.textContent = text || '';
		node.title = text || '';
		node.className = 'fw-status' + (kind === 'error' ? ' is-error' : '');
	}

	function plural(n, one, many) {
		return n + ' ' + (n === 1 ? one : many);
	}

	function fold(text) {
		return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
	}

	/* ---------- o nome de cada item ---------- */

	function suggest(it) {
		return $('fl-o-prefix').checked ? it.typed : it.plain;
	}

	function target(it) {
		return it.custom != null ? it.custom : suggest(it);
	}

	// o resto do nome, que não muda: os quadros da sequência e a extensão
	function tail(it) {
		return (it.frames || '') + (it.ext ? '.' + it.ext : '');
	}

	function enabled(it) {
		if (!it.on) return false;
		if (it.kind === 'folder') return $('fl-o-folders').checked;

		return $('fl-o-files').checked;
	}

	// o nome final de cada item (os desligados ficam com o de hoje): dois iguais na mesma pasta não podem. os discos
	// não diferenciam a caixa, então a comparação também não
	function clashes() {
		var seen = {};
		var out = {};

		state.items.forEach(function (it) {
			var key = it.dir + '/' + ((enabled(it) ? target(it).trim() : it.name) + tail(it)).toLowerCase();

			(seen[key] = seen[key] || []).push(it.id);
		});
		Object.keys(seen).forEach(function (k) {
			if (seen[k].length > 1) seen[k].forEach(function (id) {
				out[id] = true;
			});
		});

		return out;
	}

	function stateOf(it, clash) {
		if (!enabled(it)) return 'off';

		var name = target(it).trim();

		if (!name || BAD_CHARS.test(name) || clash[it.id]) return 'bad';

		// o mesmo nome com o acento junto ou separado (macOS) é o mesmo nome
		return name.normalize('NFC') === it.name.normalize('NFC') ? 'same' : 'chg';
	}

	function reason(it, st, clash) {
		if (st === 'bad') {
			if (clash[it.id]) return 'nome repetido nesta pasta: fica como está até você editar um dos dois';
			if (!target(it).trim()) return 'sem nome';

			return 'caractere que não vale em nome de arquivo ( \\ / : * ? " < > | )';
		}
		if (st === 'chg') return it.use ? 'muda de nome · usado no projeto aberto: é religado depois de renomeado' : 'muda de nome';
		if (st === 'same') return 'já está no padrão';

		return 'desligado: fica como está';
	}

	/* ---------- a tabela ---------- */

	function render(keepFocus) {
		var clash = clashes();
		var q = fold($('fl-q').value);
		var count = { all: 0, chg: 0, same: 0, bad: 0, off: 0 };
		var used = 0;
		var box = $('fl-rows');
		var focused = keepFocus && document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.id : null;
		var caret = focused != null ? document.activeElement.selectionStart : 0;
		var lastDir = null;

		box.textContent = '';
		state.items.forEach(function (it) {
			var st = stateOf(it, clash);

			count.all++;
			count[st]++;
			if (st === 'chg' && it.use) used++;
			if (state.filter !== 'all' && state.filter !== st) return;
			if (q && fold(it.name + ' ' + target(it)).indexOf(q) < 0) return;

			if (it.dir !== lastDir) {
				var group = el('div', 'fl-group');

				lastDir = it.dir;
				group.innerHTML = ICON.folder;
				group.appendChild(el('span', null, it.dir ? state.name + ' / ' + it.dir.split('/').join(' / ') : state.name));
				box.appendChild(group);
			}

			var row = el('div', 'fl-row is-' + st + (it.custom != null ? ' is-edited' : ''));
			var cb = el('input', 'fl-cb');
			var cur = el('span', 'fl-cur');
			var wrap = el('span', 'fl-new-wrap');
			var input = el('input', 'fl-new');
			var mark = el('span', 'fl-st is-' + (st === 'chg' && it.use ? 'use' : st));
			var why = reason(it, st, clash);

			cb.type = 'checkbox';
			cb.checked = it.on;
			cb.disabled = state.busy;
			cb.setAttribute('aria-label', 'renomear ' + it.name);
			cb.addEventListener('change', function () {
				it.on = this.checked;
				state.step = 0;
				render();
			});

			cur.appendChild(el('span', null, it.name));
			cur.appendChild(el('i', null, tail(it)));
			cur.title = it.name + tail(it) + (it.kind === 'seq' ? ' · sequência de ' + plural(it.count, 'imagem', 'imagens') : '');

			input.type = 'text';
			input.value = target(it);
			input.id = 'fl-new-' + it.id;
			input.dataset.id = it.id;
			input.spellcheck = false;
			input.autocomplete = 'off';
			input.disabled = st === 'off' || state.busy;
			input.setAttribute('aria-label', 'novo nome de ' + it.name);
			input.addEventListener('input', function () {
				it.custom = this.value === suggest(it) ? null : this.value;
				state.step = 0;
				render(true);
			});
			wrap.appendChild(input);
			wrap.appendChild(el('span', 'fl-ext', tail(it)));

			// o nome editado à mão: a seta volta para a sugestão
			if (it.custom != null && !state.busy) {
				var reset = el('button', 'fl-reset');

				reset.type = 'button';
				reset.title = 'voltar para a sugestão';
				reset.setAttribute('aria-label', 'voltar para a sugestão de ' + it.name);
				reset.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4.5 9.5 9 5" /><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" /></svg>';
				reset.addEventListener('click', function () {
					it.custom = null;
					state.step = 0;
					render();
				});
				wrap.appendChild(reset);
			}

			mark.innerHTML = STATE_ICON[st === 'chg' && it.use ? 'use' : st];
			mark.title = why;
			mark.setAttribute('aria-label', why);

			row.appendChild(cb);
			row.insertAdjacentHTML('beforeend', ICON[it.kind] || ICON.file);
			row.appendChild(cur);
			row.appendChild(el('span', 'fl-arrow', '→'));
			row.appendChild(wrap);
			row.appendChild(mark);
			box.appendChild(row);
		});

		if (!box.children.length) box.appendChild(el('p', 'fl-empty', emptyText(count)));

		['all', 'chg', 'same', 'bad', 'off'].forEach(function (k) {
			$('fl-n-' + k).textContent = count[k];
		});
		Array.prototype.forEach.call(document.querySelectorAll('.fl-chip'), function (chip) {
			chip.classList.toggle('is-on', chip.dataset.filter === state.filter);
		});

		var all = $('fl-all');

		all.checked = state.items.length > 0 && state.items.every(function (it) {
			return it.on;
		});
		all.indeterminate = !all.checked && state.items.some(function (it) {
			return it.on;
		});
		all.disabled = state.busy || !state.items.length;

		footer(count, used);

		if (focused != null) {
			var again = $('fl-new-' + focused);

			if (again) {
				again.focus();
				try {
					again.setSelectionRange(caret, caret);
				} catch (err) { }
			}
		}

		return count;
	}

	function emptyText(count) {
		if (!state.loaded) return 'lendo a pasta…';
		if (!state.path) return 'escolha a pasta em cima: a pastinha do campo, ou cole o caminho e Enter.';
		if (!count.all) return 'nada para renomear nesta pasta (os projetos e os arquivos de sistema ficam de fora).';

		return 'nada nesta situação.';
	}

	// o rodapé: o aviso do que vai acontecer e o botão (o segundo clique confirma)
	function footer(count, used) {
		var go = $('fl-go');

		$('fl-back').hidden = state.step !== 1;
		$('fl-undo').disabled = state.busy || !state.undo;
		$('fl-undo').title = state.undo ? 'desfazer a última renomeação: ' + plural(state.undo.count, 'item', 'itens') + ' em ' + state.undo.folder : 'desfazer a última renomeação (nada para desfazer)';
		go.classList.toggle('is-confirm', state.step === 1);

		if (state.busy) return;

		// os com problema não travam: renomeia o que dá, eles ficam como estão (e continuam na lista para resolver depois)
		var left = count.bad ? ' · ' + plural(count.bad, 'com problema fica como está', 'com problema ficam como estão') : '';

		go.textContent = state.step === 1 ? 'Confirmar: renomear ' + count.chg : count.all ? 'Renomear ' + plural(count.chg, 'item', 'itens') : 'Renomear';
		go.disabled = !count.chg;
		if (!state.note) status(count.all ? plural(count.chg, 'muda', 'mudam') + ' · ' + count.same + ' no padrão' + left + (count.off ? ' · ' + plural(count.off, 'desligado', 'desligados') : '') + (used ? ' · ' + used + ' em uso (religados depois)' : '') + (state.truncated ? ' · a pasta tem mais itens do que a lista mostra' : '') : '');
	}

	// o progresso: uma barra fina entre a tabela e o rodapé e a contagem no botão
	function progress(done, total) {
		var bar = $('fl-progress');

		bar.hidden = total == null;
		if (total == null) return;
		bar.firstChild.style.width = (total ? Math.round(done / total * 100) : 0) + '%';
		$('fl-go').textContent = done + ' de ' + total;
		status('renomeando… ' + done + ' de ' + plural(total, 'item', 'itens'));
	}

	/* ---------- ler, renomear, desfazer ---------- */

	async function load(path) {
		state.note = '';
		state.step = 0;
		state.loaded = false;
		state.items = [];
		render();

		try {
			var res = await call('filesList', { path: path, sub: $('fl-o-sub').checked });

			state.path = res.path;
			state.name = res.name;
			state.truncated = !!res.truncated;
			state.undo = res.undo || null;
			state.items = (res.items || []).map(function (it, i) {
				it.id = i;
				it.on = true;
				it.custom = null;

				return it;
			});
			$('fl-path').value = res.path;
			$('fl-path').scrollLeft = $('fl-path').scrollWidth; // o fim do caminho (a pasta) à vista
		} catch (err) {
			state.note = err.message;
			status(err.message, 'error');
		}

		state.loaded = true;
		render();
	}

	var BATCH = 10; // itens por chamada ao After

	async function rename() {
		var clash = clashes();
		var list = state.items.filter(function (it) {
			return stateOf(it, clash) === 'chg';
		}).map(function (it) {
			return { dir: it.dir, name: it.name, ext: it.ext, kind: it.kind, sep: it.sep || '', pad: it.pad || 0, to: target(it).trim() };
		});

		if (!list.length) return;

		// a mesma ordem do host (arquivos antes das pastas, as pastas de dentro para fora), para os lotes não
		// quebrarem o caminho uns dos outros
		var depth = function (it) {
			return it.dir ? it.dir.split('/').length : 0;
		};

		list.sort(function (x, y) {
			var fx = x.kind === 'folder' ? 1 : 0;
			var fy = y.kind === 'folder' ? 1 : 0;

			return fx !== fy ? fx - fy : depth(y) - depth(x);
		});

		state.busy = true;
		$('fl-go').disabled = true;
		progress(0, list.length);

		var note = '';
		var kind = '';
		var count = 0;
		var relinked = 0;
		var errors = [];

		// em lotes: cada um volta do After e a barra anda (o registro do desfazer junta todos)
		try {
			for (var at = 0; at < list.length; at += BATCH) {
				var res = await call('filesRename', { path: state.path, items: list.slice(at, at + BATCH), append: at > 0 });

				count += res.count || 0;
				relinked += res.relinked || 0;
				errors = errors.concat(res.errors || []);
				progress(Math.min(at + BATCH, list.length), list.length);
			}
		} catch (err) {
			errors.push({ name: 'a renomeação parou', error: err.message });
		}

		note = plural(count, 'renomeado', 'renomeados') + (relinked ? ' · ' + plural(relinked, 'religado', 'religados') + ' no projeto' : '');
		if (errors.length) {
			note += ' · ' + plural(errors.length, 'não mudou', 'não mudaram') + ': ' + errors[0].name + ' (' + errors[0].error + ')';
			kind = 'error';
		}

		progress(0, null);
		state.busy = false;
		await load(state.path);
		state.note = note;
		status(note, kind);
	}

	// A lista da pasta num .csv: o nome de cada item e o caminho dele (como estão agora, todos os da lista, sem os
	// filtros). separado por ';' e com o BOM do UTF-8: o Excel em português abre direto, com os acentos certos
	function exportCsv() {
		if (!state.path || !state.items.length) return status('escolha uma pasta com itens para exportar a lista.', 'error');

		var sep = state.path.indexOf('\\') >= 0 ? '\\' : '/';
		var cell = function (text) {
			return '"' + String(text).replace(/"/g, '""') + '"';
		};
		var rows = ['nome;caminho'];

		state.items.forEach(function (it) {
			var name = it.name + tail(it);
			var path = state.path.replace(/[\\\/]+$/, '') + (it.dir ? sep + it.dir.split('/').join(sep) : '') + sep + name;

			rows.push(cell(name) + ';' + cell(path));
		});

		var text = '\ufeff' + rows.join('\r\n') + '\r\n';
		var file = PAD_BRIDGE.pickSaveFile('Salvar a lista da pasta', (state.name || 'lista') + '.csv', ['csv']);

		if (!PAD_BRIDGE.inCep()) return status('lista com ' + plural(rows.length - 1, 'item', 'itens') + ' (no navegador não grava o arquivo)');
		if (!file) return;
		if (!/\.csv$/i.test(file)) file += '.csv';
		if (!PAD_BRIDGE.writeTextFile(file, text)) return status('#PAD_117 - não foi possível gravar ' + file, 'error');

		state.note = 'lista salva: ' + file.replace(/^.*[\\\/]/, '') + ' (' + plural(rows.length - 1, 'item', 'itens') + ')';
		status(state.note);
	}

	async function undo() {
		if (state.busy || !state.undo) return;

		state.busy = true;
		status('desfazendo…');

		var note = '';
		var kind = '';

		try {
			var res = await call('filesUndo');

			note = plural(res.count, 'item voltou', 'itens voltaram') + ' ao nome de antes' + (res.relinked ? ' · ' + plural(res.relinked, 'religado', 'religados') + ' no projeto' : '');
			if (res.errors && res.errors.length) {
				note += ' · ' + plural(res.errors.length, 'não voltou', 'não voltaram') + ': ' + res.errors[0].name + ' (' + res.errors[0].error + ')';
				kind = 'error';
			}
		} catch (err) {
			note = err.message;
			kind = 'error';
		}

		state.busy = false;
		await load(state.path);
		state.note = note;
		status(note, kind);
	}

	/* ---------- início ---------- */

	function saveOpts() {
		pref(PREF_OPTS, JSON.stringify({ files: $('fl-o-files').checked, folders: $('fl-o-folders').checked, sub: $('fl-o-sub').checked, prefix: $('fl-o-prefix').checked }));
	}

	function bind() {
		// as chaves lembradas (neste computador); as subpastas começam desligadas
		try {
			var saved = JSON.parse(pref(PREF_OPTS) || 'null');

			if (saved) {
				$('fl-o-files').checked = saved.files !== false;
				$('fl-o-folders').checked = saved.folders !== false;
				$('fl-o-sub').checked = saved.sub === true;
				$('fl-o-prefix').checked = saved.prefix !== false;
			}
		} catch (err) { }

		['fl-o-files', 'fl-o-folders', 'fl-o-prefix'].forEach(function (id) {
			$(id).addEventListener('change', function () {
				state.step = 0;
				state.note = '';
				saveOpts();
				render();
			});
		});
		// as subpastas mudam a lista: a pasta é lida de novo
		$('fl-o-sub').addEventListener('change', function () {
			saveOpts();
			if (state.path) load(state.path);
		});

		Array.prototype.forEach.call(document.querySelectorAll('.fl-chip'), function (chip) {
			chip.addEventListener('click', function () {
				state.filter = chip.dataset.filter;
				render();
			});
		});
		$('fl-q').addEventListener('input', function () {
			render();
		});
		$('fl-all').addEventListener('change', function () {
			var on = this.checked;

			state.items.forEach(function (it) {
				it.on = on;
			});
			state.step = 0;
			render();
		});

		$('fl-pick').addEventListener('click', function () {
			var picked = PAD_BRIDGE.pickFolder('A pasta com os arquivos para renomear', state.path || $('fl-path').value);

			if (picked) load(picked);
		});
		// arrastar uma pasta do Finder / Explorer para a janela: ela vira a pasta (um arquivo solto traz a pasta dele)
		var root = $('files');

		window.addEventListener('dragover', function (e) {
			e.preventDefault(); // sem isto o painel abriria o arquivo no lugar da janela
			if (e.dataTransfer) e.dataTransfer.dropEffect = state.busy ? 'none' : 'copy';
			root.classList.toggle('is-drop', !state.busy);
		});
		window.addEventListener('dragleave', function (e) {
			if (!e.relatedTarget) root.classList.remove('is-drop');
		});
		window.addEventListener('drop', function (e) {
			e.preventDefault();
			root.classList.remove('is-drop');

			var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
			var path = file && file.path ? String(file.path) : '';

			if (!path || state.busy) return;

			try {
				var stat = window.cep && window.cep.fs && window.cep.fs.stat(path);

				if (stat && stat.err === 0 && stat.data && !stat.data.isDirectory()) path = path.replace(/[\\/][^\\/]*$/, '');
			} catch (err) { }

			load(path);
		});
		$('fl-path').addEventListener('keydown', function (e) {
			if (e.key !== 'Enter') return;

			e.preventDefault();
			if (this.value.trim()) load(this.value.trim());
		});

		// o primeiro clique mostra quantos mudam e pede a confirmação; o segundo renomeia
		$('fl-go').addEventListener('click', function () {
			if (state.busy) return;
			if (state.step === 0) {
				state.step = 1;
				state.note = '';

				return render();
			}
			state.step = 0;
			rename();
		});
		$('fl-back').addEventListener('click', function () {
			state.step = 0;
			render();
		});
		$('fl-undo').addEventListener('click', undo);
		PAD_KEYS.primary($('fl-go')); // Ctrl+Enter faz o botão principal

		var menu = $('app-menu');

		menu.addEventListener('click', async function (e) {
			var btn = e.target.closest('button[data-action]');

			if (!btn) return;

			menu.removeAttribute('open');

			try {
				if (btn.dataset.action === 'reread' && state.path) await load(state.path);
				if (btn.dataset.action === 'folder' && state.path) await call('openFolder', { path: state.path });
				if (btn.dataset.action === 'csv') exportCsv();
				if (btn.dataset.action === 'config') {
					await call('requestConfigTab', { tab: 'rename' });
					PAD_BRIDGE.openPanel('com.jmbillard.opadeiro.productions');
				}
				if (btn.dataset.action === 'docs') PAD_BRIDGE.openUrl(DOCS_URL);
				if (btn.dataset.action === 'reload') location.reload();
			} catch (err) {
				status(err.message, 'error');
			}
		});

		start();
	}

	// a janela abre sempre vazia: a pasta é escolhida aqui (a pastinha, ou o caminho digitado e Enter). nada vem do
	// projeto aberto nem da última vez
	async function start() {
		try {
			var res = await call('filesStart');

			state.undo = res.undo || null;
		} catch (err) { }

		state.loaded = true;
		render();
		$('fl-path').focus();
	}

	bind();
})();
