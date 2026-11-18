/*

---------------------------------------------------------------
> A FORMINHA — o preenchimento leve
---------------------------------------------------------------

Duplica a comp aberta e preenche os layers de texto selecionados, só na memória (sem template, sem arquivo). O host
(light.jsx) lê a comp e a seleção, diz o nome de cada duplicata e faz o trabalho; aqui a pessoa digita o input (o
mesmo do preenchimento completo: uma linha por layer, linha vazia separa as versões), confere os nomes e duplica.

  - o nome de cada duplicata segue o da comp de hoje: o trecho que é o texto de um layer selecionado muda; a regra
    do renomear (configuração > renomear) dá a caixa, os acentos e o separador;
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
	var ICON_BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4.5 9.5 9 5" /><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" /></svg>';

	// info: o que o host leu (a comp e os layers); plan: os nomes sugeridos; edits: os nomes digitados, pelo texto
	// da versão (apagar uma versão do meio não leva o nome digitado para a seguinte)
	var state = { info: null, infoKey: '', plan: { names: [], existing: [] }, edits: {}, busy: false, note: '', noteKind: '' };
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
	function versions() {
		return $('lt-input').value.replace(/\r/g, '').split(/\n[ \t]*\n+/).map(function (block) {
			return block.split('\n').map(function (line) {
				return line.trim();
			}).filter(Boolean);
		}).filter(function (lines) {
			return lines.length;
		});
	}

	function keyOf(lines) {
		return lines.join('\n');
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

		if (info.nameLayer) box.title = info.comp + '\n\na comp tem o layer script_template_name: o texto dele é o nome de cada duplicata (o nome digitado na tabela vale por cima)';
		else if (vars > 1) box.title = info.comp + '\n\ncada trecho marcado é o texto de um layer selecionado: todos mudam em cada duplicata';
		else if (vars) box.title = info.comp + '\n\no trecho marcado é o texto de um layer selecionado: muda em cada duplicata';
		else if (info.layers.length) box.title = info.comp + '\n\no nome não tem o texto dos layers: as duplicatas levam o nome da comp + a 1ª linha';
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

			pill.title = 'layer ' + layer.index + ' · ' + layer.name + (inName[i] ? '\no texto dele está no nome da comp: muda em cada duplicata' : '') + '\nrecebe a ' + (i + 1) + 'ª linha de cada versão';
			pill.appendChild(el('i', 'lt-num', String(i + 1)));
			pill.appendChild(el('span', null, layer.text || layer.name));
			box.appendChild(pill);
		});
	}

	// a situação de uma linha: o que fica de fora ou some nesta duplicata, e o nome que já existe
	function notesOf(lines, name, custom, planned, seen) {
		var count = state.info.layers.length;
		var extra = lines.length - count;
		var notes = [];
		var key = name.toUpperCase();

		if (custom != null && !name) notes.push('sem nome: a duplicata fica com o nome sugerido');
		if (custom != null && name && (seen[key] || state.plan.existing.indexOf(key) >= 0)) notes.push('já existe uma comp com este nome');
		if (custom == null && planned && planned.taken) notes.push('o nome já existia no projeto: ganhou o sufixo');
		if (extra > 0) notes.push(plural(extra, 'linha ignorada', 'linhas ignoradas') + ': “' + lines.slice(count).join(' / ') + '”');
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
				var chip = el('span', 'lt-chip' + (off ? ' is-off' : ''), text);

				chip.title = off ? text + '\nignorada: não há layer para esta linha' : text + '\nvai para o layer ' + (n + 1) + (state.info.layers[n] ? ' (' + state.info.layers[n].name + ')' : '');
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
			input.title = custom != null ? 'nome digitado: vale como está, por cima da regra e do layer de nome' : 'o nome da duplicata: clique para trocar (o digitado vale como está)';
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

	function render(keepFocus) {
		renderComp();
		renderLayers();
		renderFooter(renderRows(keepFocus));
	}

	/* ---------- ler, planejar, duplicar ---------- */

	// os nomes que as duplicatas vão ter: o host aplica a regra do renomear e confere o que já existe no projeto
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

	async function fill() {
		var list = versions();

		if (state.busy || !ready() || !list.length) return;

		state.busy = true;
		state.note = '';
		$('lt-go').disabled = true;
		$('lt-go').textContent = 'Duplicando…';
		status('duplicando ' + plural(list.length, 'comp', 'comps') + '…');
		render();

		var note = '';
		var kind = '';

		try {
			var res = await call('lightFill', {
				id: state.info.id,
				layers: state.info.layers.map(function (layer) {
					return layer.index;
				}),
				versions: list,
				names: list.map(function (lines) {
					var key = keyOf(lines);

					return state.edits.hasOwnProperty(key) ? state.edits[key].trim() : '';
				})
			});

			note = plural(res.count, 'comp criada', 'comps criadas');
			if (res.errors && res.errors.length) {
				note += ' · ' + plural(res.errors.length, 'layer não mudou', 'layers não mudaram') + ': ' + res.errors[0].name + ' (' + res.errors[0].error + ')';
				kind = 'error';
			}
		} catch (err) {
			note = err.message;
			kind = 'error';
		}

		state.busy = false;
		state.note = note;
		state.noteKind = kind;
		render();
		plan(); // os nomes criados agora existem no projeto
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

		$('lt-reread').addEventListener('click', function () {
			read(true);
		});
		$('lt-go').addEventListener('click', fill);
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
