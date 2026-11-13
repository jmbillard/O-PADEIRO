/*

---------------------------------------------------------------
> O CONTRARREGRA — etiquetas (clique direito no organizar, na barra)
---------------------------------------------------------------

Etiquetas são comentários nos itens do projeto que o organizar entende: as de render e das editáveis (configuração >
organizar), os tipos de peça (os do renomear: a comp vai para uma subpasta com o tipo) e as dos arquivos (o
comentário vira subpasta; configuração > organizar > etiquetas dos arquivos). Cada uma:

  ◖ → aplica nos itens selecionados no painel Project
  ◗ → limpa o comentário dos selecionados

O campo de cima aplica um texto livre (Enter; vazio limpa). No rodapé, a vassourinha limpa o comentário de todos
os itens do projeto e "Organizar" é o clique esquerdo do organizar na barra. Tudo fica num passo de desfazer do
After (Cmd+Z no Mac, Ctrl+Z no Windows).

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;
	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/README.md#organizar';
	var POLL_MS = 1500; // a seleção do painel Project
	var L_CLICK = '◖  →  ';
	var R_CLICK = '◗  →  ';

	var ICON = {
		comp: 'M4 6h16v12H4zM9.5 9.5l5 2.5-5 2.5z',
		edit: 'M5 19l1-4 9.5-9.5 3 3L9 18zM13.5 7.5l3 3',
		type: 'M3.5 12.6V5A1.5 1.5 0 0 1 5 3.5h7.6l8 8a1.5 1.5 0 0 1 0 2.1l-7 7a1.5 1.5 0 0 1-2.1 0zM8 8h.01',
		img: 'M4 5h16v14H4zM4 15l5-5 4 4 2-2 5 5M15 9h.01',
		snd: 'M9 17V6l10-2v11M9 17a2 2 0 1 1-4 0a2 2 0 1 1 4 0M19 15a2 2 0 1 1-4 0a2 2 0 1 1 4 0'
	};
	var SOUND = /^(TRILHA|LOC|AUDIO|SOM|MUSICA|SFX|BG ?SOUND)/; // as dos arquivos com nota musical

	// os grupos: a cor (variável do tema), o ícone e o que acontece com a etiqueta (folders: as pastas da configuração)
	var GROUPS = {
		render: { title: 'render', color: 'var(--blue-500)', icon: 'comp', hint: function (f) { return 'comps · vão para ' + (f.render || 'a pasta de render'); } },
		edit: { title: 'editáveis', color: 'var(--waiting)', icon: 'edit', hint: function (f) { return f.edit ? 'comps · vão para ' + f.edit : 'comps · sem pasta de editáveis, ficam com as outras'; } },
		types: { title: 'tipo de peça', color: 'var(--success)', icon: 'type', hint: function (f) { return 'comps · vão para ' + (f.render || 'a pasta de render') + ' / tipo (os tipos do ETIQUETADOR)'; } },
		files: { title: 'arquivos', color: 'var(--danger)', icon: 'img', hint: function () { return 'footages · viram subpasta na pasta do tipo'; } }
	};

	var state = { info: null, busy: false, selection: 0, shape: '' };

	function $(id) {
		return document.getElementById(id);
	}

	function el(tag, className, text) {
		var node = document.createElement(tag);

		if (className) node.className = className;
		if (text != null) node.textContent = text;

		return node;
	}

	function svg(d) {
		var ns = 'http://www.w3.org/2000/svg';
		var s = document.createElementNS(ns, 'svg');
		var p = document.createElementNS(ns, 'path');

		s.setAttribute('viewBox', '0 0 24 24');
		s.setAttribute('aria-hidden', 'true');
		p.setAttribute('d', d);
		s.appendChild(p);

		return s;
	}

	function plural(n, one, many) {
		return n + ' ' + (n === 1 ? one : many);
	}

	function status(text, kind) {
		var node = $('fw-status');

		node.textContent = kind === 'error' ? PAD_UTIL.errorText(text) : text || '';
		node.className = 'fw-status' + (kind ? ' is-' + kind : '');
	}

	function replay(node, cls) {
		node.classList.remove(cls);
		void node.offsetWidth;
		node.classList.add(cls);
	}

	/* ---------- a seleção ---------- */

	function showSelection(n) {
		state.selection = n;
		$('lb-sel').classList.toggle('is-live', n > 0);
		$('lb-sel-text').textContent = n ? plural(n, 'item selecionado', 'itens selecionados') + ' no projeto' : 'nada selecionado no painel Project';
	}

	/* ---------- as etiquetas ---------- */

	function tagButton(group, tag) {
		var b = el('button', 'lb-tag');
		var name = el('span', null, tag.name);
		var def = GROUPS[group.id];
		var icon = group.id === 'files' && SOUND.test(tag.name) ? 'snd' : def.icon;
		var tip = tag.name + '\n\n' + L_CLICK + 'aplicar nos itens selecionados\n' + R_CLICK + 'limpar o comentário dos selecionados';

		b.type = 'button';
		b.dataset.tag = tag.name;
		b.appendChild(svg(ICON[icon]));
		b.appendChild(name);
		if (tag.count) {
			b.appendChild(el('span', 'lb-count', String(tag.count)));
			tip += '\n\n' + plural(tag.count, 'item do projeto tem', 'itens do projeto têm') + ' esta etiqueta';
		}
		b.title = tip;
		b.setAttribute('aria-label', 'etiqueta ' + tag.name);
		b.addEventListener('click', function () {
			apply(tag.name, b);
		});
		b.addEventListener('contextmenu', function (e) {
			e.preventDefault();
			apply('', b);
		});

		return b;
	}

	function render() {
		var info = state.info;
		var box = $('lb-groups');

		box.textContent = '';
		if (!info) return;

		info.groups.forEach(function (group) {
			var def = GROUPS[group.id];

			if (!def || !group.tags.length) return;

			var section = el('section', 'lb-group');
			var head = el('div', 'lb-group-head');
			var list = el('div', 'lb-list');

			section.style.setProperty('--c', def.color);
			head.appendChild(el('p', 'cfg-title', def.title));
			head.appendChild(el('p', 'cfg-hint', def.hint(info.folders || {})));
			group.tags.forEach(function (tag) {
				list.appendChild(tagButton(group, tag));
			});
			section.appendChild(head);
			section.appendChild(list);
			box.appendChild(section);
		});
	}

	// redesenha só quando as etiquetas ou as contagens mudam (não pisca a cada leitura)
	function adopt(info) {
		var shape = JSON.stringify([info.groups, info.folders]);

		state.info = info;
		showSelection(info.selection || 0);
		if (shape === state.shape) return;

		state.shape = shape;
		render();
	}

	async function load() {
		try {
			adopt(await call('tagsInfo'));
		} catch (err) {
			status(err.message, 'error');
		}
	}

	async function pollSelection() {
		if (document.hidden || state.busy) return;

		try {
			showSelection((await call('tagsSelection')).selection || 0);
		} catch (err) { }
	}

	/* ---------- aplicar e limpar ---------- */

	async function run(fn) {
		if (state.busy) return;

		state.busy = true;
		try {
			await fn();
		} catch (err) {
			status(err.message, 'error');
		} finally {
			state.busy = false;
		}
	}

	function apply(text, button) {
		return run(async function () {
			var res = await call('tagsApply', { text: text });

			if (button) replay(button, 'is-done');
			status(text ? text.toUpperCase() + ' em ' + plural(res.count, 'item', 'itens') + '.' : 'comentário limpo em ' + plural(res.count, 'item', 'itens') + '.', 'success');
			await load();
		});
	}

	function applyFree() {
		var input = $('lb-free');

		apply(input.value.trim(), null);
	}

	function clearAll() {
		var broom = $('lb-clear');

		return run(async function () {
			var res = await call('tagsClearAll');

			replay(broom, 'is-sweeping');
			status(res.count ? plural(res.count, 'comentário limpo', 'comentários limpos') + ' no projeto · ' + PAD_UTIL.undoKey + ' desfaz.' : 'nenhum item do projeto tinha comentário.', 'success');
			await load();
		});
	}

	function organize() {
		var btn = $('lb-organize');

		return run(async function () {
			btn.disabled = true;
			try {
				var res = await call('organizeProject');
				var messages = res && res.messages ? res.messages : [];

				if (messages.length) status(messages.join(' · '), /^#PAD/.test(messages[0]) ? 'error' : '');
				else status('O CONTRARREGRA organizou o projeto.', 'success');
				await load();
			} finally {
				btn.disabled = false;
			}
		});
	}

	/* ---------- início ---------- */

	function bind() {
		$('lb-free').addEventListener('keydown', function (e) {
			if (e.key !== 'Enter') return;

			e.preventDefault();
			applyFree();
		});
		$('lb-free-go').addEventListener('click', applyFree);
		$('lb-clear').addEventListener('click', clearAll);
		$('lb-organize').addEventListener('click', organize);

		var menu = $('app-menu');

		menu.addEventListener('click', async function (e) {
			var btn = e.target.closest('button[data-action]');

			if (!btn) return;

			menu.removeAttribute('open');

			try {
				if (btn.dataset.action === 'clearSel') await apply('', null);
				if (btn.dataset.action === 'config') {
					await call('requestConfigTab', { tab: 'organize' });
					PAD_BRIDGE.openPanel('com.jmbillard.opadeiro.productions');
				}
				if (btn.dataset.action === 'docs') PAD_BRIDGE.openUrl(DOCS_URL);
				if (btn.dataset.action === 'reload') location.reload();
			} catch (err) {
				status(err.message, 'error');
			}
		});

		// a configuração pode ter mudado (etiquetas dos arquivos) e o projeto também: relê ao voltar para a janela
		window.addEventListener('focus', load);
		setInterval(pollSelection, POLL_MS);
		load();
	}

	bind();
})();
