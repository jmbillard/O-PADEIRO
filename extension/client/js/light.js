/*

---------------------------------------------------------------
> A FORMINHA — o preenchimento leve
---------------------------------------------------------------

Duplica a comp aberta e preenche os layers de texto selecionados, só na memória (sem template, sem arquivo). O host
(light.jsx) lê a comp e a seleção, diz o nome de cada versão e faz o trabalho; aqui a pessoa digita o input (o
mesmo do preenchimento completo: uma linha por layer, linha vazia separa as versões), confere os nomes e duplica.

  - o nome de cada versão segue o da comp de hoje: o trecho que é o texto de um layer selecionado muda; a regra
    do renomear (configuração > renomear) dá a caixa, os acentos e o separador;
  - o texto de um layer pode ter várias linhas: com 1 layer, a versão inteira vai para ele; com 2 ou mais, as partes
    de cada versão são separadas por uma linha com o separador (--- por padrão; vazio: uma linha por layer);
  - o nome digitado na tabela é absoluto: vale como está, por cima até do layer de nome (script_template_name);
  - com menos linhas que layers, o layer sem linha fica escondido; com mais, as que sobram são ignoradas. os dois
    casos aparecem no ícone da linha (o motivo na dica) e a linha ignorada vem riscada entre os chips;
  - AA / aa / Aa trocam a caixa de todo o texto do input.

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;
	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/templates.md#a-forminha';
	var POLL_MS = 1500; // a comp aberta e a seleção
	var PLAN_MS = 220; // a espera depois de digitar, antes de pedir os nomes ao host

	var ICON_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>';
	var ICON_WARN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.5 20h19z" /><path d="M12 10v4.5M12 17.5v.01" /></svg>';
	var ICON_WAIT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /></svg>';
	var ICON_GO = '<svg viewBox="0 0 24 24" aria-hidden="true" class="lt-spin"><path d="M12 4a8 8 0 1 1-8 8" /></svg>';
	var ICON_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4.5h5.5V10" /><path d="M19.5 4.5 11 13" /><path d="M18 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10" /></svg>';
	var ICON_BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4.5 9.5 9 5" /><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" /></svg>';

	// info: o que o host leu (a comp e os layers); plan: os nomes sugeridos; edits: os nomes digitados, pelo texto
	// da versão (apagar uma versão do meio não leva o nome digitado para a seguinte)
	var state = { info: null, infoKey: '', plan: { names: [], existing: [] }, edits: {}, busy: false, note: '', noteKind: '', run: null };
	// run: duplicando ou feito → { rows: [{ lines, name, st: 'wait'|'go'|'ok'|'err', id, error }], done, finished }
	var planTimer = null;
	var planSeq = 0;

	function $(id) {
		return document.getElementById(id);
	}

	function el(tag, className, text) {
		var node = document.createElement(tag);

		if (className) node.className = className;
		if (text != null) node.textContent = text;

		return node;
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

	/* ---------- o input ---------- */

	// as versões: os blocos separados por linha vazia, cada um com as linhas dele (sem as vazias)
	// o separador das partes de uma versão (um layer cada); vazio: uma linha por layer (como antes)
	var SEP_DEFAULT = '---';

	function separator() {
		return $('lt-sep').value.trim();
	}

	// por partes: com 2 layers ou mais e o separador preenchido. com 1 layer, a versão inteira (todas as linhas)
	// vai para ele
	function byParts() {
		return !!(state.info && state.info.layers.length > 1 && separator());
	}

	// as versões: os blocos separados por linha vazia; em cada um, o texto de cada layer (pode ter várias linhas)
	function versions() {
		var count = state.info ? state.info.layers.length : 0;
		var sep = separator();

		return $('lt-input').value.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/).map(function (block) {
			var lines = block.split('\n').map(function (line) {
				return line.trim();
			});

			// 1 layer: o bloco inteiro, com as quebras de linha
			if (count === 1) return [lines.filter(Boolean).join('\n')].filter(Boolean);

			// 2 ou mais, sem separador: uma linha por layer
			if (!sep) return lines.filter(Boolean);

			// 2 ou mais: as partes entre as linhas do separador (cada parte, um layer)
			var parts = [[]];

			lines.forEach(function (line) {
				if (line === sep) return parts.push([]);
				parts[parts.length - 1].push(line);
			});

			// uma parte vazia fica no lugar dela (o layer dela é escondido); só as vazias do fim saem
			parts = parts.map(function (part) {
				return part.filter(Boolean).join('\n');
			});
			while (parts.length && !parts[parts.length - 1]) parts.pop();

			return parts.some(Boolean) ? parts : [];
		}).filter(function (parts) {
			return parts.length;
		});
	}

	function keyOf(lines) {
		return lines.join('\u0001');
	}

	// o texto numa linha só, para os chips e as dicas (a quebra de linha vira ↵)
	function flat(text) {
		return String(text).replace(/\n/g, ' ↵ ');
	}

	function recase(text, how) {
		if (how === 'upper') return text.toUpperCase();
		if (how === 'lower') return text.toLowerCase();

		return text.toLowerCase().replace(/(^|[\s\-\/(])([a-zà-ÿ])/g, function (all, before, letter) {
			return before + letter.toUpperCase();
		});
	}

	function ready() {
		return !!(state.info && state.info.comp && state.info.layers.length);
	}

	/* ---------- a tela ---------- */

	// a comp: o nome de hoje, com cada trecho que é o texto de um layer selecionado marcado
	function renderComp() {
		var info = state.info;
		var box = $('lt-comp');
		var name = $('lt-comp-name');
		var vars = 0;

		name.textContent = '';
		box.classList.toggle('is-empty', !info || !info.comp);

		if (!info || !info.comp) {
			name.textContent = 'nenhuma comp aberta';
			box.title = 'abra a comp que vai ser duplicada';

			return;
		}

		(info.parts || []).forEach(function (part) {
			if (part.layer == null) return name.appendChild(el('span', vars || info.parts.length > 1 ? 'lt-fix' : '', part.text));

			vars++;
			name.appendChild(el('span', 'lt-var', part.text));
		});

		if (info.nameLayer) box.title = info.comp + '\n\na comp tem o layer script_template_name: o texto dele é o nome de cada versão (o nome digitado na tabela vale por cima)';
		else if (vars > 1) box.title = info.comp + '\n\ncada trecho marcado é o texto de um layer selecionado: todos mudam em cada versão';
		else if (vars) box.title = info.comp + '\n\no trecho marcado é o texto de um layer selecionado: muda em cada versão';
		else if (info.layers.length) box.title = info.comp + '\n\no nome não tem o texto dos layers: as versões levam o nome da comp + a 1ª linha';
		else box.title = info.comp;
	}

	function renderLayers() {
		var info = state.info;
		var box = $('lt-layers');
		var inName = {};

		box.textContent = '';
		if (!info) return;

		(info.parts || []).forEach(function (part) {
			if (part.layer != null) inName[part.layer] = true;
		});

		info.layers.forEach(function (layer, i) {
			var pill = el('span', 'lt-layer' + (inName[i] ? ' is-name' : ''));

			pill.title = 'layer ' + layer.index + ' · ' + layer.name + (inName[i] ? '\no texto dele está no nome da comp: muda em cada versão' : '') + '\nrecebe a ' + (i + 1) + 'ª linha de cada bloco';
			pill.appendChild(el('i', 'lt-num', String(i + 1)));
			pill.appendChild(el('span', null, layer.text || layer.name));
			box.appendChild(pill);
		});
	}

	// a situação de uma linha: o que fica de fora ou some nesta versão, e o nome que já existe
	function notesOf(lines, name, custom, planned, seen) {
		var count = state.info.layers.length;
		var extra = lines.length - count;
		var notes = [];
		var key = name.toUpperCase();

		if (custom != null && !name) notes.push('sem nome: a versão fica com o nome sugerido');
		if (custom != null && name && (seen[key] || state.plan.existing.indexOf(key) >= 0)) notes.push('já existe uma comp com este nome');
		if (custom == null && planned && planned.taken) notes.push('o nome já existia no projeto: ganhou o sufixo');
		var unit = byParts() ? ['parte ignorada', 'partes ignoradas'] : ['linha ignorada', 'linhas ignoradas'];

		if (extra > 0) notes.push(plural(extra, unit[0], unit[1]) + ': “' + lines.slice(count).map(flat).join(' / ') + '”');
		var blank = [];

		lines.forEach(function (text, n) {
			if (!text && n < count) blank.push(n + 1);
		});
		if (blank.length) notes.push((blank.length === 1 ? 'layer ' : 'layers ') + blank.join(', ') + (blank.length === 1 ? ' fica escondido' : ' ficam escondidos') + ' (texto vazio)');
		if (extra < 0) {
			var hidden = state.info.layers.slice(lines.length).map(function (layer, i) {
				return lines.length + i + 1;
			});

			notes.push((hidden.length === 1 ? 'layer ' : 'layers ') + hidden.join(', ') + (hidden.length === 1 ? ' fica escondido' : ' ficam escondidos') + ' (sem linha)');
		}
		if (name) seen[key] = true;

		return notes;
	}

	function renderRows(keepFocus) {
		var rows = $('lt-rows');
		var list = ready() ? versions() : [];
		var seen = {};
		var focused = keepFocus && document.activeElement && document.activeElement.getAttribute('data-key');

		rows.textContent = '';
		$('lt-table').hidden = !list.length;

		list.forEach(function (lines, at) {
			var key = keyOf(lines);
			var custom = state.edits.hasOwnProperty(key) ? state.edits[key] : null;
			var planned = state.plan.names[at] || null;
			var auto = planned ? planned.name : '';
			var name = custom != null ? custom.trim() : auto;
			var notes = notesOf(lines, name, custom, planned, seen);
			var row = el('div', 'fl-row' + (custom != null ? ' is-edited' : '') + (notes.length ? ' is-warn' : ''));
			var chips = el('span', 'lt-chips');
			var input = el('input', 'fl-new');
			var side = el('span');
			var st = el('span', 'fl-st ' + (notes.length ? 'is-warn' : 'is-ok'));

			// a versão em chips: um por linha, na ordem dos layers; a que sobra (ignorada) vem riscada
			lines.forEach(function (text, n) {
				var off = n >= state.info.layers.length;
				var chip = el('span', 'tag-chip' + (off ? ' is-off' : ''));

				chip.appendChild(el('span', null, text ? flat(text) : '(vazio)'));

				chip.title = off ? text + '\n\nignorada: não há layer para este texto' : text + '\n\nvai para o layer ' + (n + 1) + (state.info.layers[n] ? ' (' + state.info.layers[n].name + ')' : '');
				chips.appendChild(chip);
			});

			input.type = 'text';
			input.value = custom != null ? custom : auto;
			input.spellcheck = false;
			input.autocomplete = 'off';
			input.disabled = state.busy;
			input.setAttribute('data-key', key);
			input.setAttribute('aria-label', 'nome da comp da versão ' + (at + 1));
			// o layer de nome decide (só dá para saber depois de preencher): o campo vazio diz isso
			if (!auto && state.info.nameLayer) input.placeholder = 'pelo layer de nome';
			input.title = custom != null ? 'nome digitado: vale como está, por cima da regra e do layer de nome' : 'o nome da versão: clique para trocar (o digitado vale como está)';
			input.addEventListener('change', function () {
				var typed = input.value;

				if (typed.trim() === auto || (!typed.trim() && !auto)) delete state.edits[key];
				else state.edits[key] = typed;
				render(true);
			});
			input.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) input.blur();
			});

			if (custom != null) {
				side = el('button', 'fl-reset');
				side.type = 'button';
				side.title = 'voltar ao nome sugerido' + (auto ? ': ' + auto : '');
				side.setAttribute('aria-label', 'voltar ao nome sugerido');
				side.innerHTML = ICON_BACK;
				side.disabled = state.busy;
				side.addEventListener('click', function () {
					delete state.edits[key];
					render();
				});
			}

			st.innerHTML = notes.length ? ICON_WARN : ICON_OK;
			st.title = notes.length ? notes.join('\n') : 'tudo certo';
			st.setAttribute('role', 'img');
			st.setAttribute('aria-label', notes.length ? notes.join('; ') : 'tudo certo');

			row.appendChild(chips);
			row.appendChild(el('span', 'fl-arrow', '→'));
			row.appendChild(input);
			row.appendChild(side);
			row.appendChild(st);
			rows.appendChild(row);
		});

		if (focused) {
			var again = rows.querySelector('[data-key="' + window.CSS.escape(focused) + '"]');

			if (again) again.focus();
		}

		return list.length;
	}

	// o rodapé só orienta quando não há o que duplicar: os avisos de cada versão estão nos ícones da tabela
	// o separador só vale com 2 layers ou mais; o texto de fundo do input diz como digitar
	function renderSeparator() {
		var many = !!(state.info && state.info.layers.length > 1);
		var sep = separator();
		var input = $('lt-input');

		$('lt-sep-box').hidden = !many;
		$('lt-sep').disabled = state.busy;

		if (state.info && state.info.layers.length === 1) input.placeholder = 'o texto do layer (pode ter várias linhas) · linha vazia separa os blocos';
		else if (many && sep) input.placeholder = 'o texto de cada layer separado por uma linha com ' + sep + ' · linha vazia separa os blocos';
		else input.placeholder = 'uma linha por layer · linha vazia separa os blocos';
	}

	function renderFooter(count) {
		var go = $('lt-go');
		var info = state.info;
		var ok = ready();

		$('lt-input').disabled = state.busy || !ok;
		$('lt-reread').disabled = state.busy;
		Array.prototype.forEach.call(document.querySelectorAll('.lt-case'), function (btn) {
			btn.disabled = state.busy || !ok || !$('lt-input').value.trim();
		});

		if (state.busy) return;

		go.disabled = !ok || !count;
		go.textContent = ok && count ? 'Duplicar ' + count : 'Duplicar';

		if (state.note) return status(state.note, state.noteKind);
		if (!info) return status('');
		if (!info.comp) return status('abra a comp que vai ser duplicada');
		if (!info.layers.length) return status('selecione na comp os layers de texto que mudam');
		if (!count) return status('digite o texto das versões');

		status('');
	}

	// duplicando e feito: a barra de progresso no lugar do input; a tabela mostra cada comp (na fila, criando,
	// criada); feita, cada uma abre no visualizador. o rodapé só tem o voltar (para um preenchimento novo)
	function renderRun() {
		var run = state.run;
		var total = run.rows.length;
		var pct = total ? Math.round(run.done / total * 100) : 100;
		var rows = $('lt-rows');

		$('light').classList.toggle('is-running', !run.finished);
		$('light').classList.toggle('is-done', run.finished);
		$('lt-head').hidden = true;
		$('lt-input-box').hidden = true;
		$('lt-progress').hidden = false;
		$('lt-progress-label').textContent = run.finished ? 'Pronto' : 'Duplicando · ' + Math.min(run.done + 1, total) + ' de ' + total;
		$('lt-progress-pct').textContent = pct + '%';
		$('lt-progress-bar').style.width = pct + '%';
		$('lt-table').hidden = false;
		document.querySelector('#lt-table .fl-head').children[2].textContent = run.finished ? 'COMP CRIADA' : 'NOME DA COMP';

		rows.textContent = '';
		run.rows.forEach(function (item) {
			var row = el('div', 'fl-row' + (item.st === 'wait' ? ' is-wait' : ''));
			var chips = el('span', 'lt-chips');
			var st = el('span', 'fl-st is-' + item.st);
			var side = el('span');
			var tips = { wait: 'na fila', go: 'criando…', ok: 'criada', err: 'não foi criada: ' + (item.error || '') };

			item.lines.forEach(function (text, n) {
				var off = n >= state.info.layers.length;
				var chip = el('span', 'tag-chip' + (off ? ' is-off' : ''));

				chip.appendChild(el('span', null, text ? flat(text) : '(vazio)'));
				chip.title = text;
				chips.appendChild(chip);
			});

			if (run.finished && item.st === 'ok' && item.id) {
				side = el('button', 'lt-open');
				side.type = 'button';
				side.title = 'abrir a comp ' + item.name;
				side.setAttribute('aria-label', side.title);
				side.innerHTML = ICON_OPEN;
				side.addEventListener('click', function () {
					call('lightOpen', { id: item.id }).catch(function (err) {
						status(err.message, 'error');
					});
				});
			}

			if (item.st === 'ok') st.innerHTML = ICON_OK;
			else if (item.st === 'go') st.innerHTML = ICON_GO;
			else if (item.st === 'err') st.innerHTML = ICON_WARN;
			else st.innerHTML = ICON_WAIT;
			st.title = tips[item.st];
			st.setAttribute('role', 'img');
			st.setAttribute('aria-label', tips[item.st]);

			var name = el('span', 'lt-name', item.name || '…');

			name.title = item.name || '';
			row.appendChild(chips);
			row.appendChild(el('span', 'fl-arrow', '→'));
			row.appendChild(name);
			row.appendChild(side);
			row.appendChild(st);
			rows.appendChild(row);
		});

		var failed = run.rows.filter(function (item) {
			return item.st === 'err';
		});

		$('lt-reread').hidden = true;
		$('lt-back').hidden = !run.finished;
		$('lt-go').hidden = run.finished;
		$('lt-go').disabled = true;
		$('lt-go').textContent = 'Duplicando…';
		status(run.finished && failed.length ? plural(failed.length, 'comp não foi criada', 'comps não foram criadas') + ': ' + failed[0].error : '', failed.length ? 'error' : '');
	}

	function render(keepFocus) {
		if (state.run) return renderRun();

		$('light').classList.remove('is-running', 'is-done');
		$('lt-head').hidden = false;
		$('lt-input-box').hidden = false;
		$('lt-progress').hidden = true;
		$('lt-back').hidden = true;
		$('lt-reread').hidden = false;
		$('lt-go').hidden = false;
		document.querySelector('#lt-table .fl-head').children[2].textContent = 'NOME DA COMP';
		renderComp();
		renderLayers();
		renderSeparator();
		renderFooter(renderRows(keepFocus));
	}

	/* ---------- ler, planejar, duplicar ---------- */

	// os nomes que as versões vão ter: o host aplica a regra do renomear e confere o que já existe no projeto
	async function plan() {
		var seq = ++planSeq;
		var list = ready() ? versions() : [];

		if (!list.length) {
			state.plan = { names: [], existing: state.plan.existing || [] };

			return render(true);
		}

		try {
			var res = await call('lightPlan', { versions: list });

			if (seq !== planSeq) return; // já pediram outro: este ficou velho
			state.plan = { names: res.names || [], existing: res.existing || [] };
		} catch (err) {
			if (seq !== planSeq) return;
			state.note = err.message;
			state.noteKind = 'error';
		}

		render(true);
	}

	function schedulePlan() {
		clearTimeout(planTimer);
		planTimer = setTimeout(plan, PLAN_MS);
	}

	// a comp aberta e a seleção: a tela só é refeita quando elas mudam (não apaga o que está sendo digitado)
	async function read(force) {
		if (state.busy) return;

		try {
			var info = await call('lightRead');
			var key = JSON.stringify(info);

			if (!force && key === state.infoKey) return;

			state.info = info;
			state.infoKey = key;
			if (force) {
				state.note = '';
				state.noteKind = '';
			}
		} catch (err) {
			state.note = err.message;
			state.noteKind = 'error';
		}

		render(true);
		plan();
	}

	// uma comp por vez, para a barra andar (cada comp é um passo de desfazer do After)
	async function fill() {
		var list = versions();

		if (state.busy || !ready() || !list.length) return;

		var layers = state.info.layers.map(function (layer) {
			return layer.index;
		});

		state.busy = true;
		state.note = '';
		state.run = {
			done: 0,
			finished: false,
			rows: list.map(function (lines, at) {
				var key = keyOf(lines);
				var typed = state.edits.hasOwnProperty(key) ? state.edits[key].trim() : '';
				var planned = state.plan.names[at];

				return { lines: lines, typed: typed, name: typed || (planned && planned.name) || '', st: 'wait', id: 0, error: '' };
			})
		};

		for (var i = 0; i < state.run.rows.length; i++) {
			var item = state.run.rows[i];

			item.st = 'go';
			render();

			try {
				var res = await call('lightFill', { id: state.info.id, layers: layers, versions: [item.lines], names: [item.typed] });

				item.name = (res.names && res.names[0]) || item.name;
				item.id = (res.ids && res.ids[0]) || 0;
				item.st = 'ok';
				if (res.errors && res.errors.length) {
					item.st = 'err';
					item.error = res.errors[0].name + ' (' + res.errors[0].error + ')';
				}
			} catch (err) {
				item.st = 'err';
				item.error = err.message;
			}

			state.run.done = i + 1;
		}

		state.run.finished = true;
		state.busy = false;
		render();
	}

	// voltar: um preenchimento novo (o input limpo; a comp e os layers continuam os de agora)
	function back() {
		state.run = null;
		state.edits = {};
		state.note = '';
		$('lt-input').value = '';
		render();
		plan();
		$('lt-input').focus();
	}

	/* ---------- início ---------- */

	function bind() {
		$('lt-input').addEventListener('input', function () {
			state.note = '';
			render(true);
			schedulePlan();
		});

		Array.prototype.forEach.call(document.querySelectorAll('.lt-case'), function (btn) {
			btn.addEventListener('click', function () {
				var input = $('lt-input');
				var edits = {};

				// os nomes digitados acompanham o texto da versão deles
				Object.keys(state.edits).forEach(function (key) {
					edits[recase(key, btn.dataset.case)] = state.edits[key];
				});
				state.edits = edits;
				input.value = recase(input.value, btn.dataset.case);
				state.note = '';
				render();
				plan();
			});
		});

		// o separador: o último usado neste computador (vazio vale: uma linha por layer)
		try {
			var saved = localStorage.getItem('pad.light.sep');

			$('lt-sep').value = saved == null ? SEP_DEFAULT : saved;
		} catch (err) {
			$('lt-sep').value = SEP_DEFAULT;
		}
		$('lt-sep').addEventListener('input', function () {
			try {
				localStorage.setItem('pad.light.sep', $('lt-sep').value);
			} catch (err) { }
			state.note = '';
			render(true);
			schedulePlan();
		});

		$('lt-reread').addEventListener('click', function () {
			read(true);
		});
		$('lt-go').addEventListener('click', fill);
		$('lt-back').addEventListener('click', back);
		PAD_KEYS.primary($('lt-go')); // Ctrl+Enter faz o botão principal

		var menu = $('app-menu');

		menu.addEventListener('click', async function (e) {
			var btn = e.target.closest('button[data-action]');

			if (!btn) return;

			menu.removeAttribute('open');

			try {
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
		document.addEventListener('click', function (e) {
			if (!menu.contains(e.target)) menu.removeAttribute('open');
		});

		// a seleção muda no After: a janela acompanha (ao voltar o foco e de tempos em tempos)
		window.addEventListener('focus', function () {
			read(false);
		});
		setInterval(function () {
			if (!document.hidden) read(false);
		}, POLL_MS);

		render();
		read(true);
	}

	bind();
})();
