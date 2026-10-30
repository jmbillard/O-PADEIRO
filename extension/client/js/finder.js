/*

---------------------------------------------------------------
> O ACESSORISTA — busca de caminhos de atrações e de textos dos layers
---------------------------------------------------------------

Aba CAMINHOS (principal): índice de atrações (webhook + cache, no host), busca a partir de 2
caracteres e abertura das pastas. Aba TEXTOS: lê os textos dos layers de texto do projeto
(em lotes de comps) e filtra enquanto você digita.

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/acessorista.md';

	var MIN_QUERY = 2; // mínimo de caracteres na busca de caminhos
	var MAX_RESULTS = 12; // máximo de atrações exibidas
	var MAX_TEXT_ROWS = 300; // máximo de textos exibidos
	var COMPS_PER_CHUNK = 4;
	var TAB_REQUEST_TTL = 15000; // ms: pedido de aba da barra considerado "recente" ao abrir o painel

	/* =========================================================
	   Utilidades
	   ========================================================= */

	function $(id) {
		return document.getElementById(id);
	}

	function el(tag, className, text) {
		var node = document.createElement(tag);

		if (className) node.className = className;
		if (text != null) node.textContent = text;

		return node;
	}

	function yieldUi() {
		return new Promise(function (resolve) {
			setTimeout(resolve, 0);
		});
	}

	// Espera o navegador PINTAR (2 quadros) antes de uma chamada longa ao After Effects: sem isso o loader
	// pode nem aparecer, porque o host ocupado segura o painel. Com limite de tempo (painel oculto não pinta).
	function nextPaint() {
		return Promise.race([
			new Promise(function (resolve) {
				requestAnimationFrame(function () {
					requestAnimationFrame(resolve);
				});
			}),
			new Promise(function (resolve) {
				setTimeout(resolve, 160);
			})
		]);
	}

	function stripAccents(str) {
		return String(str).normalize('NFD').replace(/[̀-ͯ]/g, '');
	}

	// minúsculas, sem acentos e sem nada além de a-z / 0-9 (mesma regra do índice).
	function psNormalize(value) {
		return stripAccents(String(value || '').toLowerCase()).replace(/[^a-z0-9]/g, '');
	}

	// Nome com o termo buscado destacado. A busca compara só a-z / 0-9 sem acentos:
	// cada caractere normalizado guarda a posição de origem para achar o trecho no texto original.
	function highlightNode(tag, className, text, query) {
		var node = el(tag, className);
		var flat = '';
		var origin = [];

		for (var i = 0; i < text.length; i++) {
			var norm = psNormalize(text.charAt(i));

			for (var k = 0; k < norm.length; k++) {
				flat += norm.charAt(k);
				origin.push(i);
			}
		}

		var at = query ? flat.indexOf(query) : -1;

		if (at < 0) {
			node.textContent = text;
			return node;
		}

		var start = origin[at];
		var end = origin[at + query.length - 1] + 1;

		node.appendChild(document.createTextNode(text.slice(0, start)));
		node.appendChild(el('mark', null, text.slice(start, end)));
		node.appendChild(document.createTextNode(text.slice(end)));

		return node;
	}

	// Copia um texto (área de transferência do painel; se falhar, pelo After Effects).
	async function copyText(text, label) {
		var area = el('textarea');
		var active = document.activeElement;
		var copied = false;

		area.value = text;
		area.setAttribute('readonly', '');
		area.style.position = 'fixed';
		area.style.opacity = '0';
		document.body.appendChild(area);
		area.select();

		try {
			copied = document.execCommand('copy');
		} catch (err) { }

		area.remove();
		if (active && active.focus) active.focus({ preventScroll: true });

		try {
			if (!copied) await call('copyText', { text: text });
			toast('success', label + ' copiado.');
		} catch (err) {
			toast('error', err.message);
		}
	}

	// //servidor/share/pasta → /Volumes/share/pasta (macOS); barras invertidas no Windows.
	function toPlatform(path, platform) {
		var p = String(path || '').replace(/\\/g, '/');

		if (platform === 'Mac') {
			if (p.indexOf('//') !== 0) return p;

			var parts = p.replace(/^\/+/, '').split('/');

			return parts.length < 2 ? p : '/Volumes/' + parts.slice(1).join('/');
		}

		return p.replace(/\//g, '\\');
	}

	function toast(kind, text) {
		PAD_UTIL.toast($('toast'), 'finder-toast', kind, text);
	}

	var store = {
		get: function (key) {
			try {
				return localStorage.getItem('acessorista.' + key);
			} catch (err) {
				return null;
			}
		},
		set: function (key, value) {
			try {
				localStorage.setItem('acessorista.' + key, value);
			} catch (err) { }
		}
	};

	/* =========================================================
	   Estado
	   ========================================================= */

	var state = {
		tab: null,
		paths: { index: [], ready: false, loading: false, loaded: false, platform: 'Mac', hidden: {}, error: '' },
		texts: { entries: [], comps: 0, ready: false, loading: false, loaded: false, loadId: 0, hint: '' },
		lastTabStamp: 0
	};

	/* =========================================================
	   Abas
	   ========================================================= */

	function switchTab(tab) {
		if (tab !== 'paths' && tab !== 'texts') tab = 'paths';

		state.tab = tab;
		store.set('tab', tab);

		['paths', 'texts'].forEach(function (name) {
			var on = name === tab;

			$('tab-' + name).setAttribute('aria-selected', String(on));
			$('pane-' + name).hidden = !on;
		});

		var q = $('q-' + tab);

		q.focus();
		var refresh = document.querySelector('#pane-' + tab + ' .finder-refresh');

		refresh.title = tab === 'paths' ? 'Baixar os caminhos atualizados e buscar' : 'Ler os textos do projeto de novo';
		refresh.setAttribute('aria-label', refresh.title);

		// cada aba só carrega na primeira vez que aparece
		if (tab === 'paths' && !state.paths.loaded) loadPaths(false);
		if (tab === 'texts' && !state.texts.loaded) loadTexts();

		scheduleFit();
	}

	/* =========================================================
	   Resultados: estados e loader
	   ========================================================= */

	function showLoader(container, title, hint) {
		var loader = container.querySelector('.oven-loader');

		if (!loader) {
			container.textContent = '';
			loader = PAD_UTIL.ovenLoader(title, hint, true); // fundo branco: versão clara
			container.appendChild(loader);
		}

		loader.querySelector('.oven-title').textContent = title;
		loader.querySelector('.oven-hint').textContent = hint || '';
	}

	function showState(container, title, text, isHint) {
		var box = el('div', 'finder-state' + (isHint ? ' is-hint' : ''));

		box.appendChild(el('strong', null, title));
		if (text) box.appendChild(el('span', null, text));

		container.textContent = '';
		container.appendChild(box);
	}

	/* =========================================================
	   Aba CAMINHOS
	   ========================================================= */

	async function loadPaths(force) {
		var p = state.paths;

		p.loading = true;
		p.ready = false;
		p.error = '';
		showLoader($('results-paths'), force ? 'baixando os caminhos…' : 'esquentando o índice…', 'o workflow pode demorar alguns segundos');
		await nextPaint();

		try {
			var res = await call('pathsIndex', { force: !!force });

			p.index = res.index;
			p.platform = res.platform;
			p.ready = true;
			p.loaded = true;
			buildCategoryFilters();

			if (!res.downloaded) toast(null, 'sem conexão com o workflow: usando o último índice salvo.');
		} catch (err) {
			p.ready = false;
			p.loaded = true;
			p.error = err.message;
		}

		p.loading = false;
		searchPaths();
	}

	// Um chip por categoria do índice. A escolha é mantida ao atualizar o índice.
	function buildCategoryFilters() {
		var box = $('opts-paths');

		box.textContent = '';

		state.paths.index.forEach(function (section) {
			var cat = section.category;
			var chip = el('button', 'chip' + (state.paths.hidden[cat.key] ? '' : ' is-on'));

			chip.type = 'button';
			chip.title = 'incluir ' + cat.label + ' na busca';
			chip.setAttribute('aria-pressed', String(!state.paths.hidden[cat.key]));
			chip.appendChild(el('span', 'chip-check'));
			chip.appendChild(document.createTextNode(cat.label));
			chip.addEventListener('click', function () {
				state.paths.hidden[cat.key] = !state.paths.hidden[cat.key];
				chip.classList.toggle('is-on', !state.paths.hidden[cat.key]);
				chip.setAttribute('aria-pressed', String(!state.paths.hidden[cat.key]));
				searchPaths();
			});

			box.appendChild(chip);
		});
	}

	// Primeira pasta do caminho cujo nome contém o termo buscado.
	async function openPath(btn, path, group) {
		if (btn) btn.classList.add('is-busy');

		try {
			var res = await call('openPath', { path: path, server: group.server, share: group.share });

			if (res.messages && res.messages.length) toast('error', res.messages.join('\n'));
		} catch (err) {
			toast('error', err.message);
		} finally {
			if (btn) btn.classList.remove('is-busy');
		}
	}

	// pastinhas com o conteúdo à mostra: documento (projeto) e quadro de filme (output). no hover a
	// frente da pasta abre e o conteúdo sobe um pouco (CSS em finder.css)
	var FOLDER_BACK = '<path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h7.5A1.5 1.5 0 0 1 20 10v1.5" />';
	var FOLDER_FRONT = '<path class="folder-front" d="M3.5 11.5h17V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" />';
	var CARD_ICONS = {
		projeto: FOLDER_BACK + '<g class="folder-content"><path d="M8 12.500V4h5.500l2.500 2.500v6" /><path d="M13.500 4v2.500h2.500" /></g>' + FOLDER_FRONT,
		output: FOLDER_BACK + '<g class="folder-content"><rect x="7" y="4.500" width="10" height="8" rx="1" /><path d="M9.500 4.500v8M14.500 4.500v8" /></g>' + FOLDER_FRONT
	};

	// projeto e output: ícones à direita do nome da atração
	function iconButton(parent, kind, label, path, group) {
		var btn = el('button', 'icon-button is-light card-icon');

		btn.type = 'button';
		btn.title = label + ':\n' + toPlatform(path, state.paths.platform) + '\n\n' + (PAD_KEYS.mac ? 'Cmd' : 'Ctrl') + '+C copia o caminho';
		btn.setAttribute('aria-label', label);
		btn.dataset.copy = toPlatform(path, state.paths.platform);
		btn.innerHTML = '<svg viewBox="0 0 24 24">' + CARD_ICONS[kind] + '</svg>';
		btn.addEventListener('click', function () {
			openPath(btn, path, group);
		});

		parent.appendChild(btn);
	}

	// Caminho em breadcrumb: cada pasta abre a si mesma; a que contém o termo buscado fica destacada.
	function pathCrumbs(display, query, group) {
		var nav = el('nav', 'path-crumbs');
		var unc = /^[\\/]{2}/.test(display);
		var sep = state.paths.platform === 'Mac' ? '/' : '\\';
		var prefix = state.paths.platform === 'Mac' ? '/' : unc ? '\\\\' : '';
		var parts = display.split(/[\\/]+/).filter(Boolean);

		nav.dataset.copy = display;
		nav.title = display + '\n\n' + (PAD_KEYS.mac ? 'Cmd' : 'Ctrl') + '+C copia o caminho';
		nav.appendChild(el('span', 'crumb-more', '…'));

		parts.forEach(function (name, i) {
			var target = prefix + parts.slice(0, i + 1).join(sep);
			var crumb = el('button', 'crumb' + (i === parts.length - 1 ? ' is-last' : '') + (query && psNormalize(name).indexOf(query) >= 0 ? ' is-match' : ''), name);

			crumb.type = 'button';
			crumb.title = 'abrir ' + target;
			crumb.addEventListener('click', function () {
				openPath(null, target, group);
			});

			if (i > 0) nav.appendChild(el('span', 'crumb-sep', '›'));
			nav.appendChild(crumb);
		});

		return nav;
	}

	// Mostra todas as pastas (para medir a largura natural) ou esconde as iniciais até caber; a última
	// e a que deu match têm prioridade e só saem por último.
	function crumbsExpand(root) {
		Array.prototype.forEach.call(root.querySelectorAll('.path-crumbs'), function (nav) {
			nav.classList.remove('is-collapsed');
			Array.prototype.forEach.call(nav.children, function (child) {
				child.hidden = child.classList.contains('crumb-more');
			});
		});
	}

	function crumbsCollapse(root) {
		crumbsExpand(root);

		Array.prototype.forEach.call(root.querySelectorAll('.path-crumbs'), function (nav) {
			var crumbs = Array.prototype.filter.call(nav.children, function (c) {
				return c.classList.contains('crumb');
			});
			var order = crumbs.slice(0, -1).filter(function (c) {
				return !c.classList.contains('is-match');
			}).concat(crumbs.slice(0, -1).filter(function (c) {
				return c.classList.contains('is-match');
			}));

			nav.classList.add('is-measuring');

			for (var h = 0; nav.scrollWidth > nav.clientWidth && h < order.length; h++) {
				order[h].hidden = true;

				// o separador que vem antes da pasta (ou depois, na primeira)
				var sepNode = order[h].previousSibling && order[h].previousSibling.classList.contains('crumb-sep') ? order[h].previousSibling : order[h].nextSibling;

				if (sepNode && sepNode.classList.contains('crumb-sep')) sepNode.hidden = true;
				nav.querySelector('.crumb-more').hidden = false;
			}

			nav.classList.remove('is-measuring');
		});
	}

	function groupCard(group, query) {
		var card = el('article', 'result-card');
		var head = el('div', 'result-head');
		var icons = el('div', 'result-icons');

		head.appendChild(highlightNode('h4', 'result-name', group.name, query));
		head.firstChild.title = group.name;

		if (group.projetos.length) iconButton(icons, 'projeto', 'abrir o projeto', group.projetos[0], group);
		if (group.outputs.length) iconButton(icons, 'output', 'abrir o output', group.outputs[0], group);

		head.appendChild(icons);
		card.appendChild(head);

		group.caminhos.forEach(function (path) {
			card.appendChild(pathCrumbs(toPlatform(path, state.paths.platform), query, group));
		});

		return card;
	}

	function searchPaths() {
		var p = state.paths;
		var results = $('results-paths');
		var query = psNormalize($('q-paths').value);

		if (p.loading) return;

		results.textContent = '';

		if (!p.ready) {
			showState(results, 'índice de caminhos indisponível', p.error || 'clique em atualizar para baixar de novo.');
			return;
		}

		if (query.length < MIN_QUERY) {
			showState(results, 'O ACESSORISTA', 'pesquise por atração, projeto, output ou caminho', true);
			return;
		}

		var total = 0;
		var shown = 0;

		p.index.forEach(function (section) {
			if (p.hidden[section.category.key]) return;

			var matches = section.groups.filter(function (g) {
				return g.haystack.indexOf(query) >= 0;
			});

			total += matches.length;

			if (!matches.length || shown >= MAX_RESULTS) return;

			var box = el('section', 'result-section');
			var title = el('h3', 'result-title', section.category.label);

			title.appendChild(el('span', 'result-count', String(matches.length)));
			box.appendChild(title);

			for (var m = 0; m < matches.length && shown < MAX_RESULTS; m++, shown++) {
				box.appendChild(groupCard(matches[m], query));
			}

			results.appendChild(box);
		});

		if (total === 0) {
			showState(results, 'nenhum resultado', 'tente outro termo ou ligue mais categorias');
		} else if (total > shown) {
			results.appendChild(el('p', 'finder-more', 'mais ' + (total - shown) + ' — refine a busca'));
		}
	}

	/* =========================================================
	   Aba TEXTOS
	   ========================================================= */

	async function loadTexts() {
		var t = state.texts;
		var id = ++t.loadId;
		var results = $('results-texts');

		t.loading = true;
		t.ready = false;
		t.loaded = true;
		t.entries = [];
		showLoader(results, 'assando os textos…', 'listando as comps do projeto');
		await nextPaint();

		try {
			var comps = (await call('textCompList')).comps;

			t.comps = comps.length;

			if (!comps.length) {
				t.ready = true;
				t.loading = false;
				showState(results, 'projeto sem comps', 'abra um projeto com layers de texto', true);
				return;
			}

			var errors = [];

			for (var i = 0; i < comps.length; i += COMPS_PER_CHUNK) {
				if (id !== t.loadId) return; // uma nova leitura começou

				var ids = comps.slice(i, i + COMPS_PER_CHUNK).map(function (c) {
					return c.id;
				});
				var res = await call('textIndexChunk', { ids: ids });

				t.entries = t.entries.concat(res.entries);
				errors = errors.concat(res.errors);
				showLoader(results, 'assando os textos…', Math.min(i + COMPS_PER_CHUNK, comps.length) + ' / ' + comps.length + ' comps lidas');
				await yieldUi();
			}

			if (errors.length) toast('error', errors.slice(0, 3).join('\n'));

			t.ready = true;
		} catch (err) {
			if (id !== t.loadId) return;

			t.ready = false;
			showState(results, 'não foi possível ler o projeto', err.message);
			t.loading = false;
			return;
		}

		t.loading = false;
		searchTexts();
	}

	function textOptions() {
		return {
			visible: $('chip-vis').classList.contains('is-on'),
			ignoreAccents: $('chip-accent').classList.contains('is-on'),
			invert: $('chip-invert').classList.contains('is-on')
		};
	}

	// A busca é literal e ignora a caixa; a acentuação é ignorada conforme a opção.
	function normalizeText(str, opts) {
		var s = String(str).toLowerCase();

		return opts.ignoreAccents ? stripAccents(s) : s;
	}

	function textNode(text) {
		return document.createTextNode(text);
	}

	// Trecho do texto (em uma linha) em volta do termo, com o termo destacado.
	function snippetNode(text, key, opts, highlight) {
		var span = el('span', 'text-snippet');
		var flat = String(text).replace(/\s*[\n\r]+\s*/g, ' ⏎ ');
		var hay = normalizeText(flat, opts);
		var at = highlight && hay.length === flat.length ? hay.indexOf(key) : -1;

		if (at < 0) {
			span.textContent = flat.length > 140 ? flat.slice(0, 137) + '…' : flat;
			return span;
		}

		var start = Math.max(0, at - 36);
		var end = Math.min(flat.length, at + key.length + 80);

		if (start > 0) span.appendChild(textNode('…'));
		span.appendChild(textNode(flat.slice(start, at)));
		span.appendChild(el('mark', null, flat.slice(at, at + key.length)));
		span.appendChild(textNode(flat.slice(at + key.length, end)));
		if (end < flat.length) span.appendChild(textNode('…'));

		return span;
	}

	async function openText(entry, withLayer) {
		try {
			await call('openTextResult', {
				compId: entry.compId,
				layerIndex: withLayer ? entry.layerIndex : 0,
				refTime: entry.refTime
			});
		} catch (err) {
			toast('error', err.message);
		}
	}

	function searchTexts() {
		var t = state.texts;
		var results = $('results-texts');
		var opts = textOptions();
		var raw = $('q-texts').value;
		var key = normalizeText(raw, opts);

		if (t.loading) return;

		results.textContent = '';

		if (!t.ready) {
			showState(results, 'textos não lidos', 'clique em atualizar para ler o projeto.', true);
			return;
		}

		if (raw === '') {
			showState(results, 'busca nos textos', 'digite um termo para filtrar os layers de texto', true);
			return;
		}

		if (t.comps === 0) {
			showState(results, 'projeto sem comps', 'abra um projeto com layers de texto');
			return;
		}

		var found = t.entries.filter(function (entry) {
			if (opts.visible && !entry.enabled) return false;

			return (normalizeText(entry.text, opts).indexOf(key) >= 0) !== opts.invert;
		});

		if (!found.length) {
			showState(results, 'sem matches', 'nenhum texto casa com “' + raw.trim() + '”');
			return;
		}

		var rows = 0;
		var current = null;
		var group = null;

		for (var i = 0; i < found.length && rows < MAX_TEXT_ROWS; i++, rows++) {
			var entry = found[i];

			// as entradas da mesma comp são consecutivas (o índice é lido comp a comp)
			if (entry.compId !== current) {
				current = entry.compId;
				group = el('section', 'comp-group');

				var title = el('button', 'comp-title');

				title.type = 'button';
				title.title = 'abrir a comp';
				title.appendChild(el('span', null, entry.compName));
				title.addEventListener('click', openText.bind(null, entry, false));
				group.appendChild(title);
				results.appendChild(group);
			}

			var row = el('button', 'text-row' + (entry.enabled ? '' : ' is-off'));

			row.type = 'button';
			row.title = entry.text + '\n\n' + (PAD_KEYS.mac ? 'Cmd' : 'Ctrl') + '+C copia o texto';
			row.dataset.copy = entry.text;
			row.appendChild(el('span', 'text-layer', entry.label));
			row.appendChild(snippetNode(entry.text, key, opts, !opts.invert));
			row.addEventListener('click', openText.bind(null, entry, true));
			group.appendChild(row);
		}

		if (found.length > rows) results.appendChild(el('p', 'finder-more', 'mais ' + (found.length - rows) + ' — refine a busca'));
	}

	/* =========================================================
	   Pedido de aba (barra principal)
	   ========================================================= */

	async function watchRequestedTab() {
		if (document.hidden) return;

		try {
			var req = await call('requestedTab');

			if (!req.stamp || req.stamp <= state.lastTabStamp) return;

			state.lastTabStamp = req.stamp;

			if (req.tab && req.tab !== state.tab) switchTab(req.tab);
		} catch (err) { }
	}

	/* =========================================================
	   Eventos e início
	   ========================================================= */

	function bindSearch(tab, onChange) {
		var q = $('q-' + tab);
		var clear = $('clear-' + tab);

		q.addEventListener('input', function () {
			clear.hidden = q.value === '';
			onChange();
		});

		q.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && q.value) {
				q.value = '';
				q.dispatchEvent(new Event('input'));
			}
		});

		clear.addEventListener('click', function () {
			q.value = '';
			q.dispatchEvent(new Event('input'));
			q.focus();
		});
	}

	function bindEvents() {
		['paths', 'texts'].forEach(function (tab) {
			$('tab-' + tab).addEventListener('click', function () {
				switchTab(tab);
			});
		});

		bindSearch('paths', searchPaths);
		bindSearch('texts', searchTexts);

		['chip-vis', 'chip-accent', 'chip-invert'].forEach(function (id) {
			$(id).addEventListener('click', function () {
				var chip = $(id);
				var on = !chip.classList.contains('is-on');

				chip.classList.toggle('is-on', on);
				chip.setAttribute('aria-pressed', String(on));
				searchTexts();
			});
		});

		Array.prototype.forEach.call(document.querySelectorAll('.finder-refresh'), function (btn) {
			btn.addEventListener('click', function () {
				if (state.tab === 'paths') loadPaths(true);
				else loadTexts();
			});
		});

		// Enter na busca de textos lê o projeto de novo se ainda não houver índice
		$('q-texts').addEventListener('keydown', function (e) {
			if (e.key === 'Enter' && !state.texts.ready && !state.texts.loading) loadTexts();
		});

		// teclado: ↑ ↓ nos resultados, Enter abre, Ctrl/Cmd+C copia, Esc volta para a busca
		['paths', 'texts'].forEach(function (tab) {
			var results = $('results-' + tab);
			var q = $('q-' + tab);

			PAD_KEYS.listNav({
				root: results,
				items: '.card-icon, .crumb.is-last, .comp-title, .text-row',
				search: q,
				typeToSearch: true
			});

			results.addEventListener('keydown', function (e) {
				var target = e.target.closest('[data-copy]');

				if (e.key === 'Escape') {
					e.preventDefault();
					q.focus();
				} else if (target && PAD_KEYS.isMod(e) && e.key.toLowerCase() === 'c') {
					e.preventDefault();
					copyText(target.dataset.copy, target.classList.contains('text-row') ? 'texto' : 'caminho');
				}
			});
		});

		PAD_KEYS.listNav({ root: $('tabs'), items: '.tab', horizontal: true });

		PAD_KEYS.shortcuts({
			find: function () {
				PAD_KEYS.focusSearch($('q-' + state.tab));
			}
		});

		// menu "⋯" (um por aba)
		Array.prototype.forEach.call(document.querySelectorAll('.finder-menu'), function (menu) {
			menu.addEventListener('click', function (e) {
				var btn = e.target.closest('button[data-action]');

				if (!btn) return;

				menu.removeAttribute('open');

				if (btn.dataset.action === 'docs') PAD_BRIDGE.openUrl(DOCS_URL);
				if (btn.dataset.action === 'reload') location.reload();
			});

			document.addEventListener('click', function (e) {
				if (!menu.contains(e.target)) menu.removeAttribute('open');
			});
		});
		window.addEventListener('focus', watchRequestedTab);
	}

	/* =========================================================
	   Altura da janela: só o suficiente para o loader e, com uma
	   busca, a altura que cabe os resultados (até um limite)
	   ========================================================= */

	var FIT_MIN_WIDTH = 720;
	var FIT_WIDE_ITEMS = '.path-crumbs, .result-name, .comp-title span:first-child';
	var fitMinHeight = 150; // só o cabeçalho (busca vazia)
	var fitTimer = null;
	var refitOnResize = false;

	window.addEventListener('resize', function () {
		crumbsCollapse($('results-paths'));

		if (!refitOnResize) return;

		refitOnResize = false;
		scheduleFit();
	});

	function fitHeight(skipWidth) {
		var results = $('results-' + state.tab);

		if (!results || !results.children.length) return;

		// primeiro a largura (a janela só alarga, nunca estreita): os toggles numa linha só e os
		// caminhos e nomes sem reticências, até 70% da largura da tela
		crumbsExpand(results); // mede os caminhos inteiros

		var opts = $('opts-' + state.tab);
		var chips = opts.children;
		var natural = 0;

		for (var c = 0; c < chips.length; c++) natural += chips[c].getBoundingClientRect().width;

		natural += Math.max(0, chips.length - 1) * parseFloat(getComputedStyle(opts).columnGap || 0);

		var extra = Math.max(0, natural - opts.clientWidth);

		Array.prototype.forEach.call(results.querySelectorAll(FIT_WIDE_ITEMS), function (item) {
			extra = Math.max(extra, item.scrollWidth - item.clientWidth);
		});

		var maxWidth = Math.max(FIT_MIN_WIDTH, Math.round((window.screen.availWidth || 1440) * 0.7));
		var width = Math.min(maxWidth, Math.max(FIT_MIN_WIDTH, window.innerWidth + Math.ceil(extra) + (extra ? 2 : 0)));

		if (!skipWidth && width > window.innerWidth + 1) {
			// a altura é medida de novo quando a janela terminar de alargar (o cabeçalho pode perder uma linha)
			refitOnResize = true;
			PAD_BRIDGE.resizeWindow(width, window.innerHeight);

			// se o evento de resize não vier (pedido ignorado ou limitado pelo manifest), mede a altura assim mesmo
			clearTimeout(fitTimer);
			fitTimer = setTimeout(function () {
				refitOnResize = false;
				fitHeight(true);
			}, 1500);
			return;
		}

		crumbsCollapse(results); // na largura final, as pastas iniciais que não cabem saem

		// altura natural do conteúdo (a lista ocupa o espaço que sobra, então mede pelo último filho)
		var top = results.getBoundingClientRect().top;
		var bottom = top;

		Array.prototype.forEach.call(results.children, function (child) {
			bottom = Math.max(bottom, child.getBoundingClientRect().bottom);
		});

		var content = bottom - top + results.scrollTop + parseFloat(getComputedStyle(results).paddingBottom);
		var max = Math.max(600, Math.round((window.screen.availHeight || 900) * 0.85));
		var height = Math.round(Math.min(max, Math.max(fitMinHeight, window.innerHeight - results.clientHeight + content)));


		if (Math.abs(height - window.innerHeight) > 4) PAD_BRIDGE.resizeWindow(window.innerWidth, height);
	}

	// Sem busca, a folha branca sai: só o cabeçalho (loader e avisos aparecem sobre o degradê).
	function updateIdle() {
		['paths', 'texts'].forEach(function (tab) {
			var q = $('q-' + tab).value.trim();

			$('pane-' + tab).classList.toggle('is-idle', q.length < (tab === 'paths' ? MIN_QUERY : 1));
		});
	}

	function scheduleFit() {
		clearTimeout(fitTimer);
		fitTimer = setTimeout(fitHeight, 120);
	}

	async function init() {
		['paths', 'texts'].forEach(function (tab) {
			new MutationObserver(function () {
				updateIdle();
				scheduleFit();
			}).observe($('results-' + tab), { childList: true });
			$('q-' + tab).addEventListener('input', updateIdle);
		});
		updateIdle(); // o loader inicial já vem no HTML

		bindEvents();

		var tab = 'paths'; // aba principal

		try {
			await call('ping');

			// a barra pode ter pedido uma aba há pouco (o painel estava fechado)
			var req = await call('requestedTab');

			state.lastTabStamp = req.stamp || 0;

			if (req.stamp && req.now - req.stamp < TAB_REQUEST_TTL && req.tab) tab = req.tab;
		} catch (err) {
			showState($('results-paths'), 'sem conexão com o After Effects', err.message);
		}

		switchTab(tab);

		setInterval(watchRequestedTab, 1000);
	}

	init();
})();
