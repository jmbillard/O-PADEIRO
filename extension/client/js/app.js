/*

---------------------------------------------------------------
> O PADEIRO — painel
---------------------------------------------------------------

Fluxo: 1 buscar > 2 selecionar > 3 preencher (> 4 fila de render).
Toda a conversa com o After Effects passa por PAD_BRIDGE.call (bridge.js → host/api.jsx).

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/README.md#-preenchendo-templates';

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

	function svgIcon(name, className) {
		var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');

		svg.setAttribute('viewBox', '0 0 24 24');
		if (className) svg.setAttribute('class', className);
		use.setAttribute('href', '#i-' + name);
		svg.appendChild(use);

		return svg;
	}

	var store = {
		get: function (key) {
			try {
				return localStorage.getItem('padeiro.' + key);
			} catch (err) {
				return null;
			}
		},
		set: function (key, value) {
			try {
				if (value == null) localStorage.removeItem('padeiro.' + key);
				else localStorage.setItem('padeiro.' + key, value);
			} catch (err) { }
		}
	};

	function nextFrame() {
		return new Promise(function (resolve) {
			requestAnimationFrame(function () {
				setTimeout(resolve, 0);
			});
		});
	}

	// Texto normalizado para comparação (maiúsculas, sem acentos).
	function searchText(str) {
		return String(str).trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
	}

	function plural(n, one, many) {
		return n + ' ' + (n === 1 ? one : many);
	}

	// Caminho do sistema → URL de arquivo (para o preview).
	function fileUrl(path) {
		if (/^(data|file|https?):/.test(path)) return path;

		var s = path.replace(/\\/g, '/');
		var drive = /^[A-Za-z]:\//.test(s) ? s.slice(0, 2) : '';
		var rest = drive ? s.slice(2) : s;
		var encoded = rest.split('/').map(encodeURIComponent).join('/');

		if (s.indexOf('//') === 0) return 'file:' + encoded; // UNC → file://servidor/share/...
		if (drive) return 'file:///' + drive + encoded;

		return 'file://' + encoded;
	}

	/* =========================================================
	   Estado
	   ========================================================= */

	var state = {
		productions: [],
		production: 0,
		loading: false,
		loadId: 0,
		listStamp: 0,
		loadHint: '',
		tree: null, // árvore em memória { type, text, children | uri }
		treeStatus: 'loading', // loading | ok | missing | empty | error
		templatesPath: '',
		query: '',
		folderOverride: {}, // chave da pasta → aberta / fechada (escolha do usuário)
		selected: null, // nó do template selecionado
		info: null, // retorno de templateInfo
		example: '', // texto de exemplo atual (para saber se o usuário digitou algo)
		run: null, // execução em andamento
		editor: null, // editor de config aberto
		byUri: {} // uri → nó do template (fixados e recentes)
	};

	var app = $('app-shell');

	/* =========================================================
	   Avisos
	   ========================================================= */

	// Todo erro mostrado tem um código #PAD_: os que chegam sem código são inesperados.
	function errorText(text) {
		text = String(text || '');

		return /^#PAD_/.test(text) ? text : '#PAD_099 - ' + text;
	}

	function notify(kind, text) {
		if (kind === 'error') text = errorText(text);

		var box = el('div', 'notice is-' + kind);
		var close = el('button', 'notice-close', '×');

		box.appendChild(el('div', 'notice-body', text));
		close.type = 'button';
		close.setAttribute('aria-label', 'Fechar aviso');
		close.addEventListener('click', function () {
			box.remove();
		});
		box.appendChild(close);

		$('notices').appendChild(box);

		return box;
	}

	function clearNotices() {
		$('notices').textContent = '';
	}

	// Mensagem na coluna da busca (vidro sobre o degradê).
	function pickerMessage(kind, text) {
		var box = $('messages');

		box.textContent = '';

		if (!text) return;

		if (kind === 'error') text = errorText(text);

		var msg = el('p', 'validation-message' + (kind === 'success' ? ' is-success' : ''), text);

		box.appendChild(msg);
	}

	/* =========================================================
	   Produções
	   ========================================================= */

	// A produção é escolhida na barra principal: ela grava a escolha em um arquivo
	// compartilhado e o painel acompanha (host: PADX.selectedProduction).
	async function loadProductions() {
		try {
			var res = await call('productions', {});

			state.productions = res.productions;
			state.listStamp = res.stamp;
			state.listError = res.shared ? '' : res.error;

			if (res.error) pickerMessage('error', res.error);
		} catch (err) {
			state.productions = [];
			pickerMessage('error', err.message);
		}

		var name = null;

		try {
			name = (await call('selectedProduction')).name;
		} catch (err) { }

		var found = state.productions.findIndex(function (prod) {
			return prod.name === name;
		});

		state.production = found >= 0 ? found : 0;
		updateSearchPlaceholder();
		await loadTree();
	}

	function updateSearchPlaceholder() {
		var prod = state.productions[state.production];

		$('search').placeholder = prod ? 'buscar em ' + prod.name : 'buscar template';
	}

	// Acompanha a produção escolhida na barra e a conexão com o After Effects.
	// A lista mudou: atualiza o que o painel conhece. Só relê a pasta de templates se a produção atual mudou.
	async function refreshProductionList(selectedName) {
		var current = state.productions[state.production];

		try {
			var res = await call('productions', {});

			state.listStamp = res.stamp;
			state.productions = res.productions;
			state.listError = res.shared ? '' : res.error;
		} catch (err) {
			return;
		}

		var wanted = selectedName || (current && current.name);
		var index = state.productions.findIndex(function (prod) {
			return prod.name === wanted;
		});

		var same = current && index >= 0 && state.productions[index].name === current.name && state.productions[index].templatesPath === current.templatesPath;

		if (same) {
			state.production = index;
			return;
		}

		state.production = index >= 0 ? index : 0;
		state.selected = null;
		state.info = null;
		state.run = null;
		app.classList.remove('is-expanded');
		clearNotices();
		pickerMessage();
		updateSearchPlaceholder();
		await loadTree();
	}

	async function watchProduction() {
		if (document.hidden || state.busy || runIsOpen() || state.loading || state.editor) return;

		var name;

		try {
			var selected = await call('selectedProduction');

			name = selected.name;

			// a lista de produções foi editada (editor, script ou outra pessoa)
			if (selected.stamp && selected.stamp !== state.listStamp && state.treeStatus !== 'error') return refreshProductionList(name);
		} catch (err) {
			if (state.treeStatus !== 'error') {
				state.treeStatus = 'error';
				renderTree();
			}

			return;
		}

		if (state.treeStatus === 'error') return loadProductions();

		var current = state.productions[state.production];

		if (!name || (current && current.name === name)) return;

		var index = state.productions.findIndex(function (prod) {
			return prod.name === name;
		});

		if (index < 0) return;

		state.production = index;
		state.selected = null;
		state.info = null;
		state.run = null;
		app.classList.remove('is-expanded');
		clearNotices();
		pickerMessage();
		updateSearchPlaceholder();
		await loadTree();
	}

	/* =========================================================
	   Árvore de templates
	   ========================================================= */

	async function loadTree() {
		var prod = state.productions[state.production];

		state.loading = true;
		state.loadHint = 'pastas de rede podem demorar um pouco';
		state.tree = null;
		state.byUri = {};
		state.templatesPath = prod ? prod.templatesPath : '';
		state.treeStatus = prod ? 'loading' : 'empty';
		renderTree();

		if (!prod) {
			state.loading = false;
			return;
		}

		var loadId = ++state.loadId;

		await loadLists();

		try {
			var res = await readTemplateTree(
				prod.templatesPath,
				function (folders, name) {
					if (loadId !== state.loadId) return;

					state.loadHint = folders + (folders === 1 ? ' pasta lida' : ' pastas lidas') + ' · ' + name;
					renderTree();
				},
				function () {
					return loadId !== state.loadId;
				}
			);

			if (loadId !== state.loadId) return; // outra leitura começou

			state.templatesPath = res.path;

			if (!res.exists) {
				state.treeStatus = 'missing';
			} else {
				state.tree = res.tree;
				annotateTrail(res.tree, []);
				state.treeStatus = countTemplates(res.tree) > 0 ? 'ok' : 'empty';
			}
		} catch (err) {
			if (loadId !== state.loadId) return; // leitura antiga cancelada

			state.treeStatus = 'error';
			pickerMessage('error', err.message);
		}

		state.loading = false;
		renderTree();
	}

	// Cada template guarda a trilha de pastas até ele (sem a pasta raiz).
	function annotateTrail(node, trail) {
		node.children.forEach(function (child) {
			if (child.type === 'node') {
				annotateTrail(child, trail.concat(child.text));
			} else {
				child.folderTrail = trail;
				state.byUri[child.uri] = child;
			}
		});
	}

	/* =========================================================
	   Fixados e recentes (por produção, só neste computador:
	   'O PADEIRO script/temp/template_lists.json', gravado pelo host)
	   ========================================================= */

	var MAX_RECENTS = 5;

	function productionName() {
		var prod = state.productions[state.production];

		return prod ? prod.name : '';
	}

	async function loadLists() {
		var name = productionName();

		state.lists = { favorites: [], recents: [] };

		if (!name) return;

		try {
			var res = await call('templateLists', { production: name });

			if (name === productionName()) state.lists = { favorites: res.favorites, recents: res.recents };
		} catch (err) { }
	}

	function readList(kind) {
		return (state.lists && state.lists[kind]) || [];
	}

	function writeList(kind, list) {
		var name = productionName();

		if (!state.lists) state.lists = { favorites: [], recents: [] };

		state.lists[kind] = list;

		if (!name) return;

		call('saveTemplateLists', { production: name, favorites: state.lists.favorites, recents: state.lists.recents }).catch(function (err) {
			pickerMessage('error', 'não foi possível gravar fixados / recentes: ' + err.message);
		});
	}

	function isFavorite(uri) {
		return readList('favorites').indexOf(uri) >= 0;
	}

	function toggleFavorite(node) {
		var list = readList('favorites');
		var at = list.indexOf(node.uri);

		if (at >= 0) list.splice(at, 1);
		else list.push(node.uri);

		writeList('favorites', list);
	}

	function pushRecent(node) {
		if (!node) return;

		var list = readList('recents').filter(function (uri) {
			return uri !== node.uri;
		});

		list.unshift(node.uri);
		writeList('recents', list.slice(0, MAX_RECENTS));
	}

	// Só os templates que ainda existem na árvore lida.
	function listNodes(kind) {
		return readList(kind)
			.map(function (uri) {
				return state.byUri[uri];
			})
			.filter(Boolean);
	}

	function yieldUi() {
		return new Promise(function (resolve) {
			setTimeout(resolve, 0);
		});
	}

	// Pasta com uma única subpasta vira 'PASTA / SUBPASTA' (menos níveis na árvore).
	function optimizeTree(node) {
		if (node.type !== 'node') return;

		while (node.children.length === 1 && node.children[0].type === 'node') {
			node.text += ' / ' + node.children[0].text;
			node.children = node.children[0].children;
		}

		node.children.forEach(optimizeTree);
	}

	// Lê a árvore pasta a pasta (chamadas curtas ao host). Pastas sem templates não entram.
	async function readTemplateTree(path, onProgress, isStale) {
		var first = await call('listDir', { path: path });

		if (!first.exists) return { exists: false, path: first.path, tree: null };

		var folders = 0;
		var root = { type: 'node', text: first.name, children: [] };

		async function fill(node, listing) {
			for (var i = 0; i < listing.entries.length; i++) {
				var entry = listing.entries[i];

				if (entry.type === 'item') {
					node.children.push({ type: 'item', text: entry.name, uri: entry.uri, fsName: entry.fsName });
					continue;
				}

				if (isStale()) throw new Error('leitura cancelada');

				await yieldUi(); // deixa o painel respirar entre as chamadas

				var child = { type: 'node', text: entry.name, children: [] };

				await fill(child, await call('listDir', { uri: entry.uri }));
				onProgress(++folders, entry.name);

				if (child.children.length) node.children.push(child);
			}
		}

		await fill(root, first);
		root.children.forEach(optimizeTree);

		return { exists: true, path: first.path, tree: root };
	}

	function countTemplates(node) {
		if (node.type !== 'node') return 1;

		return node.children.reduce(function (sum, child) {
			return sum + countTemplates(child);
		}, 0);
	}

	// Cópia de 'node' só com o que casa com a busca. Pasta que casa entra inteira.
	function filterTree(node, query) {
		var children = [];

		node.children.forEach(function (child) {
			if (searchText(child.text).indexOf(query) >= 0) {
				children.push(child);
			} else if (child.type === 'node') {
				var filtered = filterTree(child, query);

				if (filtered.children.length > 0) children.push(filtered);
			}
		});

		return { type: 'node', text: node.text, children: children };
	}

	function firstTemplate(node) {
		for (var i = 0; i < node.children.length; i++) {
			var child = node.children[i];

			if (child.type !== 'node') return child;

			var found = firstTemplate(child);

			if (found) return found;
		}

		return null;
	}

	// Pastas começam recolhidas (fixados e recentes, abertos); a busca abre tudo.
	function isFolderOpen(key, depth) {
		if (state.query) return true;
		if (Object.prototype.hasOwnProperty.call(state.folderOverride, key)) return state.folderOverride[key];

		return key.indexOf('/:') === 0;
	}

	function buildNode(node, depth, parentKey, section) {
		var li = el('div');

		if (node.type === 'node') {
			var key = parentKey + '/' + node.text;
			var open = isFolderOpen(key, depth);
			var row = el('button', 'tree-row');
			var kids = el('div', 'tree-children');

			li.className = 'tree-folder' + (open ? ' is-open' : '');
			li.setAttribute('role', 'treeitem');
			li.setAttribute('aria-expanded', String(open));

			row.type = 'button';
			row.appendChild(svgIcon('chevron', 'tree-chevron'));
			row.appendChild(svgIcon('folder'));
			row.appendChild(el('span', 'tree-label', node.text));
			row.appendChild(el('span', 'tree-count', String(countTemplates(node))));
			row.addEventListener('click', function () {
				var now = !li.classList.contains('is-open');

				state.folderOverride[key] = now;
				li.classList.toggle('is-open', now);
				li.setAttribute('aria-expanded', String(now));
			});

			node.children.forEach(function (child) {
				kids.appendChild(buildNode(child, depth + 1, key, section));
			});

			li.appendChild(row);
			li.appendChild(kids);
		} else {
			var btn = el('button', 'tree-row');
			var ext = (node.text.match(/\.[a-z0-9]+$/i) || [''])[0].slice(1).toUpperCase();
			var fav = isFavorite(node.uri);
			var star = el('button', 'tree-star');

			li.className = 'tree-item' + (state.selected && state.selected.uri === node.uri ? ' is-selected' : '') + (fav ? ' is-favorite' : '');
			li.setAttribute('role', 'treeitem');
			li.setAttribute('aria-selected', String(li.classList.contains('is-selected')));
			li.dataset.uri = node.uri;
			li.dataset.section = section || '';

			btn.type = 'button';
			btn.title = node.fsName || node.text;
			btn.appendChild(svgIcon('file'));
			btn.appendChild(el('span', 'tree-label', node.text.replace(/\.[a-z0-9]+$/i, '')));

			// nos fixados e recentes, a pasta do template ajuda a diferenciar nomes iguais
			if (section && node.folderTrail && node.folderTrail.length) btn.appendChild(el('span', 'tree-trail', node.folderTrail.join(' / ')));

			btn.appendChild(el('span', 'tree-ext', ext));
			btn.addEventListener('click', function (e) {
				if (e.detail > 1) return; // o duplo clique só importa, sem alternar a seleção

				// Enter no template já selecionado vai para o campo de texto (não desmarca)
				if (e.detail === 0 && state.selected && state.selected.uri === node.uri) return focusInput();

				selectTemplate(node, { focusInput: e.detail === 0 });
			});
			btn.addEventListener('dblclick', function () {
				importTemplate(node);
			});

			star.type = 'button';
			star.title = fav ? 'desafixar' : 'fixar no topo da lista';
			star.setAttribute('aria-label', star.title);
			star.setAttribute('aria-pressed', String(fav));
			star.appendChild(svgIcon('star'));
			star.addEventListener('click', function () {
				toggleFavorite(node);
				renderTree();

				// o foco volta para a estrela do mesmo template na árvore
				var again = $('tree').querySelector('.tree-item[data-section=""][data-uri="' + CSS.escape(node.uri) + '"] .tree-star');

				if (again) again.focus({ preventScroll: true });
			});

			li.appendChild(btn);
			li.appendChild(star);
		}

		return li;
	}

	// Loader temático: pães saindo do forninho (css/loader.css).
	function ovenLoader(title, hint, light) {
		var box = el('div', 'oven-loader' + (light ? ' is-light is-compact' : ''));

		box.setAttribute('role', 'status');
		box.innerHTML =
			'<div class="oven" aria-hidden="true"><span class="oven-glow"></span>' +
			'<span class="oven-belt"><span class="loaf l1"></span><span class="loaf l2"></span><span class="loaf l3"></span></span>' +
			'<span class="steam s1"></span><span class="steam s2"></span><span class="steam s3"></span>' +
			'<span class="oven-body"><span class="oven-panel"><i class="oven-knob k1"></i><i class="oven-knob k2"></i><i class="oven-knob k3"></i></span>' +
			'<span class="oven-door"><span class="oven-handle"></span><span class="oven-window"></span></span></span></div>' +
			'<strong class="oven-title"></strong><span class="oven-hint"></span>';
		box.querySelector('.oven-title').textContent = title;
		box.querySelector('.oven-hint').textContent = hint || '';

		return box;
	}

	function treeState(title, text) {
		var box = el('div', 'picker-state');

		box.appendChild(el('strong', null, title));
		if (text) box.appendChild(el('span', null, text));

		return box;
	}

	// Grupo de atalhos no topo da árvore (fixados / recentes): abre e fecha como uma pasta.
	function buildSection(title, icon, nodes) {
		var key = '/:' + title;
		var open = isFolderOpen(key, 0);
		var li = el('div', 'tree-folder tree-section' + (open ? ' is-open' : ''));
		var row = el('button', 'tree-row');
		var kids = el('div', 'tree-children');

		li.setAttribute('role', 'treeitem');
		li.setAttribute('aria-expanded', String(open));

		row.type = 'button';
		row.appendChild(svgIcon('chevron', 'tree-chevron'));
		row.appendChild(svgIcon(icon));
		row.appendChild(el('span', 'tree-label', title));
		row.appendChild(el('span', 'tree-count', String(nodes.length)));
		row.addEventListener('click', function () {
			var now = !li.classList.contains('is-open');

			state.folderOverride[key] = now;
			li.classList.toggle('is-open', now);
			li.setAttribute('aria-expanded', String(now));
		});

		nodes.forEach(function (node) {
			kids.appendChild(buildNode(node, 1, key, title));
		});

		li.appendChild(row);
		li.appendChild(kids);

		return li;
	}

	function renderTree() {
		var list = $('tree');
		var total = $('picker-total');

		total.textContent = '';

		if (state.treeStatus !== 'loading') list.textContent = '';

		if (state.treeStatus === 'loading') {
			// o loader é reaproveitado entre as atualizações de progresso (recriar reiniciaria a animação)
			var loader = list.querySelector('.oven-loader');

			if (!loader) {
				list.textContent = '';
				loader = ovenLoader('assando a lista de templates…', state.loadHint);
				list.appendChild(loader);
			}

			loader.querySelector('.oven-title').textContent = 'assando a lista de templates…';
			loader.querySelector('.oven-hint').textContent = state.loadHint;
			return;
		}

		if (state.treeStatus === 'missing') {
			list.appendChild(treeState('pasta de templates não localizada', state.templatesPath));
			return;
		}

		if (state.treeStatus === 'error') {
			list.appendChild(treeState('não foi possível ler os templates', 'sem conexão com o After Effects — o painel tenta de novo sozinho'));
			return;
		}

		if (state.treeStatus === 'empty' || !state.tree) {
			list.appendChild(treeState('nenhum template encontrado', state.productions.length ? state.templatesPath : state.listError ? 'a lista de produções compartilhada está inacessível: o painel tenta de novo sozinho' : 'a lista de produções está vazia'));
			return;
		}

		var query = searchText(state.query);
		var data = query ? filterTree(state.tree, query) : state.tree;
		var found = countTemplates(data);

		if (found === 0) {
			list.appendChild(treeState('nada encontrado', 'nenhum template casa com “' + state.query.trim() + '”'));
			total.textContent = '0 de ' + plural(countTemplates(state.tree), 'template', 'templates');
			return;
		}

		if (!query) {
			var favorites = listNodes('favorites');
			var recents = listNodes('recents').filter(function (node) {
				return favorites.indexOf(node) < 0;
			});

			if (favorites.length) list.appendChild(buildSection('fixados', 'star', favorites));
			if (recents.length) list.appendChild(buildSection('recentes', 'clock', recents));
		}

		data.children.forEach(function (child) {
			list.appendChild(buildNode(child, 0, ''));
		});

		total.textContent = query ? found + ' de ' + plural(countTemplates(state.tree), 'template', 'templates') : plural(found, 'template', 'templates');
	}

	function updateFolderButton() {
		var btn = $('btn-open-templates');
		var title = state.selected ? 'Abrir a pasta do template selecionado' : 'Abrir pasta de templates';

		btn.title = title;
		btn.setAttribute('aria-label', title);
	}

	function markSelected() {
		updateFolderButton();

		var items = $('tree').querySelectorAll('.tree-item');

		Array.prototype.forEach.call(items, function (item) {
			var on = !!state.selected && item.dataset.uri === state.selected.uri;

			item.classList.toggle('is-selected', on);
			item.setAttribute('aria-selected', String(on));
		});
	}

	function setPickerLocked(locked) {
		$('picker').style.pointerEvents = locked ? 'none' : '';
		$('picker').style.opacity = locked ? '0.6' : '';
	}

	/* =========================================================
	   Vistas da coluna de trabalho
	   ========================================================= */

	function showView(name) {
		['readonly', 'input', 'config', 'run', 'loading'].forEach(function (view) {
			$('view-' + view).hidden = view !== name;
		});

		$('queue-actions').hidden = name !== 'input';
		$('btn-edit-config').hidden = name === 'run' || name === 'loading';
		$('btn-edit-config').classList.toggle('is-active', name === 'config');
		$('btn-edit-config').setAttribute('aria-pressed', String(name === 'config'));
	}

	// Pasta do template relativa à pasta de templates da produção (ex.: 'PROGRAMAS / ENCONTRO').
	function relativeFolder() {
		var node = state.selected;

		if (node && node.folderTrail && node.folderTrail.length) return node.folderTrail.join(' / ');

		return state.tree ? state.tree.text : '';
	}

	function folderName() {
		var folder = state.info ? state.info.folder : '';

		return folder.split(/[\\/]/).filter(Boolean).pop() || '';
	}

	// O rótulo acima do título é a pasta do template (o 1º argumento, antes a etapa, não é mais usado).
	function setStage(eyebrow, title, message) {
		$('stage-eyebrow').textContent = folderName();
		if (title != null) $('queue-title').textContent = title;
		if (message != null) $('queue-message').textContent = message;
	}

	/* =========================================================
	   Seleção de template
	   ========================================================= */

	function runIsOpen() {
		return !!state.run && !state.run.finished;
	}

	function focusInput() {
		if ($('view-input').hidden) return;

		$('input').focus();
	}

	// Template selecionado na árvore (o primeiro, se aparecer em fixados / recentes também).
	function selectedRow() {
		if (!state.selected) return null;

		var items = $('tree').querySelectorAll('.tree-item.is-selected > .tree-row');

		return items.length ? items[items.length - 1] : null;
	}

	async function selectTemplate(node, opts) {
		if (runIsOpen()) {
			notify('warning', 'Finalize o preenchimento atual (fila de render) antes de trocar de template.');
			return;
		}

		if (!leaveEditor()) return;

		// clicar de novo no template selecionado desmarca (e o painel de trabalho some)
		if (state.selected && state.selected.uri === node.uri) return deselectTemplate();

		state.selected = node;
		state.info = null;
		state.run = null;
		markSelected();
		clearNotices();

		app.classList.add('is-expanded');
		setStage('2 · preencher', node.text.replace(/\.[a-z0-9]+$/i, ''), '');
		showView('loading');

		try {
			state.info = await call('templateInfo', { uri: node.uri });
		} catch (err) {
			state.info = null;
			showReadonly(err.message);
			return;
		}

		if (!state.selected || state.selected.uri !== node.uri) return; // mudou de template enquanto lia

		showTemplate(state.info);
		checkFonts(node.uri);

		if (opts && opts.focusInput) focusInput();

		var queueSide = document.querySelector('.queue-side');

		if (window.matchMedia('(max-width: 900px)').matches && queueSide.scrollIntoView) {
			queueSide.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	/* =========================================================
	   Editor de config
	   ========================================================= */

	// Fecha o editor para trocar de template / desmarcar. Retorna false (com aviso) se há alterações não salvas.
	function leaveEditor() {
		if (!state.editor) return true;

		if (state.editor.isDirty()) {
			notify('warning', 'Há alterações não salvas na config. Use “Salvar config” ou “Cancelar” antes de trocar de template.');
			return false;
		}

		closeEditor();

		return true;
	}

	function closeEditor() {
		if (!state.editor) return;

		state.editor.destroy();
		state.editor = null;
	}

	function openEditor() {
		if (!state.info || runIsOpen() || state.busy) return;

		if (state.editor) {
			if (state.editor.isDirty()) return notify('warning', 'Há alterações não salvas. Use “Salvar config” ou “Cancelar”.');

			closeEditor();
			showTemplate(state.info);

			return;
		}

		var info = state.info;

		clearNotices();

		state.editor = PAD_CONFIG_EDITOR.mount($('view-config'), {
			info: info,
			pickFolder: PAD_BRIDGE.pickFolder,
			normalizePath: async function (path) {
				return (await call('normalizePath', { path: path })).path;
			},
			onCancel: function () {
				closeEditor();
				showTemplate(state.info);
			},
			onSave: async function (config) {
				var res = await call('saveTemplateConfig', { uri: info.uri, config: config });

				state.info = await call('templateInfo', { uri: info.uri });
				closeEditor();
				showTemplate(state.info);
				clearNotices();
				notify('success', 'Config salva: ' + res.path);
			}
		});

		showView('config');
		$('view-config').scrollTop = 0;

		if (info.configError) notify('warning', 'O arquivo de config atual é inválido: o formulário começou com os valores padrão e salvar substitui o arquivo.');
	}

	function deselectTemplate() {
		closeEditor();
		state.selected = null;
		state.info = null;
		state.run = null;
		markSelected();
		clearNotices();
		app.classList.remove('is-expanded');
	}

	function showReadonly(message) {
		setStage('2 · preencher', null, relativeFolder());
		$('readonly-message').textContent = message;
		showView('readonly');
	}

	function showTemplate(info) {
		setStage('2 · preencher', info.name, relativeFolder());

		if (info.configError) return showReadonly(info.configError);
		if (!info.hasConfig) return showReadonly('Esse template ainda não tem config. Use o lápis ao lado do nome para criar uma, ou importe o template e edite manualmente.');
		if (!info.hasInputLayers) return showReadonly('Esse template não possui inputs. Clique em “importar template” e edite manualmente.');

		var cfg = info.config;
		var textarea = $('input');
		var typed = textarea.value.trim() !== '' && textarea.value !== state.example;

		state.example = cfg.exemple;

		// o que o usuário já digitou é mantido ao trocar de template 
		if (!typed) textarea.value = cfg.exemple;

		var tipList = $('tip');

		tipList.textContent = '';
		String(cfg.tip).split(/[\n\r]+/).forEach(function (line) {
			if (line.trim() !== '') tipList.appendChild(el('li', null, line.trim()));
		});
		setPreview(info);
		updateInputCount();
		showView('input');
	}

	// Preview: vídeo (autoplay, em loop) quando existir; senão o png. Se o vídeo não carregar, cai para o png.
	function setPreview(info) {
		var img = $('preview');
		var video = $('preview-video');
		var card = $('preview-card');

		card.classList.remove('has-image', 'has-video', 'is-scrubbing');
		img.hidden = true;
		img.removeAttribute('src');
		video.hidden = true;
		video.pause();
		video.removeAttribute('src');
		video.load();

		function showImage() {
			if (!info.preview) return;

			img.onload = function () {
				img.hidden = false;
				card.classList.add('has-image');
			};
			img.onerror = function () {
				img.hidden = true;
				card.classList.remove('has-image');
			};
			img.src = fileUrl(info.preview);
		}

		if (!info.video) return showImage();

		video.onloadeddata = function () {
			video.hidden = false;
			card.classList.add('has-video');

			var playing = video.play();

			if (playing && playing.catch) playing.catch(function () { });
		};
		video.onerror = function () {
			video.hidden = true;
			card.classList.remove('has-video');
			showImage();
		};
		video.src = fileUrl(info.video);
	}

	// Passar o mouse sobre o vídeo pausa e navega pelos quadros (como o thumbnail do Premiere).
	function bindPreviewScrub() {
		var card = $('preview-card');
		var video = $('preview-video');
		var bar = $('preview-scrub').firstElementChild;
		var pending = null;

		function seek(e) {
			if (!card.classList.contains('has-video') || !isFinite(video.duration)) return;

			// o primeiro movimento sobre o vídeo pausa a reprodução e liga a navegação
			if (!card.classList.contains('is-scrubbing')) {
				video.pause();
				card.classList.add('is-scrubbing');
			}

			var rect = card.getBoundingClientRect();
			var ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));

			bar.style.width = ratio * 100 + '%';
			pending = ratio * video.duration;

			if (video.seeking) return;

			video.currentTime = pending;
			pending = null;
		}

		video.addEventListener('seeked', function () {
			if (pending == null) return;

			video.currentTime = pending;
			pending = null;
		});

		card.addEventListener('mousemove', seek);

		card.addEventListener('mouseleave', function () {
			if (!card.classList.contains('has-video')) return;

			pending = null;
			card.classList.remove('is-scrubbing');

			var playing = video.play();

			if (playing && playing.catch) playing.catch(function () { });
		});
	}

	function countInputs() {
		var text = $('input').value.trim();

		return text === '' ? 0 : text.split(/[\n\r]{2,}/).length;
	}

	function updateInputCount() {
		var n = countInputs();

		$('input-count').textContent = n === 0 ? 'vazio' : plural(n, 'item', 'itens');
		$('btn-fill').textContent = 'Preencher: ' + n;
		$('btn-fill').disabled = n === 0 || !state.info || !state.info.hasInputLayers;
	}

	/* =========================================================
	   Fontes do template (pasta FONTS): aviso acima do input; "instalar" instala ali mesmo.
	   Preencher / importar com fontes faltando segue sem elas, sem a janela "Resolve Fonts".
	   ========================================================= */

	// Confere as fontes do template e atualiza o aviso. Retorna a checagem (ou null).
	async function checkFonts(uri) {
		var res = null;

		try {
			res = await call('templateFonts', { uri: uri });
		} catch (err) { }

		if (!state.selected || state.selected.uri !== uri) return res;

		state.fonts = res ? { uri: uri, missing: res.missing, total: res.total } : null;
		renderFontsWarning();

		return res;
	}

	function missingFonts() {
		return state.fonts && state.selected && state.fonts.uri === state.selected.uri ? state.fonts.missing : [];
	}

	// Abre / fecha o aviso deslizando: o que está embaixo acompanha a altura (e o espaço entre os itens).
	function slideStrip(box, open) {
		var gap = parseFloat(getComputedStyle(box.parentNode).rowGap) || 0;
		var closed = { height: '0px', paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px', marginBottom: -gap + 'px', opacity: 0 };

		if (box._slide) box._slide.cancel();

		if (open) box.hidden = false;

		var full = { height: box.offsetHeight + 'px', paddingTop: '', paddingBottom: '', borderTopWidth: '', borderBottomWidth: '', marginBottom: '0px', opacity: 1 };

		box.style.overflow = 'hidden';
		box._slide = box.animate(open ? [closed, full] : [full, closed], { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
		box._slide.onfinish = function () {
			box._slide = null;
			box.style.overflow = '';
			if (!open) box.hidden = true;
		};
	}

	function stripButton(className, text, title, onClick) {
		var btn = el('button', className, text);

		btn.type = 'button';
		btn.title = title;
		btn.setAttribute('aria-label', title);
		btn.addEventListener('click', onClick);

		return btn;
	}

	// O aviso mostra as fontes faltando e, no mesmo lugar, o resultado da instalação.
	function renderFontsWarning() {
		var box = $('fonts-warning');
		var missing = missingFonts();
		var note = state.fontsNote && state.selected && state.fontsNote.uri === state.selected.uri ? state.fontsNote : null;
		var show = !!note || missing.length > 0;
		var wasShown = !box.hidden && !(box._slide && box._closing);

		box.textContent = '';
		box.className = 'fonts-warning' + (note ? ' is-' + note.kind : '') + (state.fontsInstalling ? ' is-installing' : '');

		if (state.fontsInstalling) {
			box.appendChild(el('strong', null, 'instalando fontes…'));
			box.appendChild(el('span', null, missing.join(' · ')));
		} else if (note) {
			box.appendChild(el('span', 'fonts-note', note.text));
			if (note.kind !== 'success' && missing.length) box.appendChild(stripButton('fonts-action', 'instalar', 'tentar instalar de novo', installFonts));
			box.appendChild(stripButton('fonts-close', '×', 'fechar aviso', closeFontsNote));
		} else if (missing.length) {
			box.appendChild(el('strong', null, plural(missing.length, 'fonte não instalada', 'fontes não instaladas')));
			box.appendChild(el('span', null, missing.join(' · ')));
			box.appendChild(stripButton('fonts-action', 'instalar', 'instalar: ' + missing.join(', '), installFonts));
		}

		if (show && !wasShown) {
			box._closing = false;
			slideStrip(box, true);
		} else if (!show && wasShown) {
			box._closing = true;
			slideStrip(box, false);
		} else if (!show) {
			box.hidden = true;
		}
	}

	function closeFontsNote() {
		clearTimeout(state.fontsNoteTimer);
		state.fontsNote = null;
		renderFontsWarning();
	}

	async function installFonts() {
		if (state.fontsInstalling || !state.selected) return;

		var uri = state.selected.uri;
		var note;

		clearTimeout(state.fontsNoteTimer);
		state.fontsNote = null;
		state.fontsInstalling = true;
		renderFontsWarning();

		try {
			var res = await call('installTemplateFonts', { uri: uri });
			var missing = res.data.missing;

			if (state.selected && state.selected.uri === uri) state.fonts = { uri: uri, missing: missing, total: res.data.total };

			note = !missing.length
				? { kind: 'success', text: 'Fontes instaladas. Se precisar, reinicie o After Effects e/ou a máquina.' }
				: { kind: 'warning', text: (res.messages.length ? res.messages.join(' ') + ' ' : '') + 'Ainda não aparecem como instaladas: ' + missing.join(', ') };
		} catch (err) {
			note = { kind: 'error', text: err.message };
		}

		note.uri = uri;
		state.fontsNote = note;
		state.fontsInstalling = false;
		renderFontsWarning();

		// o aviso de sucesso fecha sozinho (os outros esperam o ×)
		if (note.kind === 'success') state.fontsNoteTimer = setTimeout(closeFontsNote, 7000);
	}

	// Antes de importar o template selecionado: confere de novo (alguém pode ter instalado as fontes).
	// true = faltam fontes: importa sem a janela "Resolve Fonts" (as fontes faltando viram a padrão).
	async function fontsMissingNow() {
		var res = await checkFonts(state.selected.uri);

		return !!(res && res.missing.length);
	}

	async function importTemplate(node, quiet) {
		if (runIsOpen()) return notify('warning', 'Finalize o preenchimento atual antes de importar outro template.');

		var target = node || state.selected;

		if (!target) return;

		// pela lista (duplo clique) ou pelo botão: o template selecionado passa pela checagem das fontes
		if (quiet == null && state.selected && state.selected.uri === target.uri) {
			quiet = await fontsMissingNow();
		}

		try {
			var res = await call('importTemplate', { uri: target.uri, quiet: !!quiet });

			pushRecent(target);
			if (!state.query) renderTree();

			notify('success', 'Template importado e projeto organizado: ' + res.name);
			pickerMessage('success', 'importado: ' + res.name);
		} catch (err) {
			notify('error', err.message);
			pickerMessage('error', err.message);
		}
	}

	/* =========================================================
	   Execução: preenchimento
	   ========================================================= */

	var STATUS_LABEL = { waiting: 'aguardando', processing: 'processando', success: 'pronto', error: 'erro' };

	function buildItem(index, label) {
		var li = el('li', 'file-item is-new');
		var main = el('div', 'file-main');
		var heading = el('div', 'file-heading');
		var actions = el('div', 'file-actions');
		var badge = el('span', 'status-badge status-waiting');

		li.appendChild(el('div', 'file-type', String(index + 1).padStart(2, '0')));

		heading.appendChild(el('p', 'file-name', label));
		main.appendChild(heading);
		main.appendChild(el('p', 'file-metadata', 'aguardando'));
		main.appendChild(el('p', 'file-message'));
		li.appendChild(main);

		badge.textContent = STATUS_LABEL.waiting;
		actions.appendChild(badge);
		li.appendChild(actions);

		li.addEventListener('animationend', function () {
			li.classList.remove('is-new', 'just-completed');
		});

		return li;
	}

	function setItem(i, status, info) {
		var item = state.run.items[i];
		var li = item.node;

		item.status = status;
		li.classList.remove('is-processing', 'is-success', 'is-error');
		if (status !== 'waiting') li.classList.add('is-' + status);

		var badge = li.querySelector('.status-badge');

		badge.className = 'status-badge status-' + status;
		badge.textContent = '';

		if (status === 'processing') badge.appendChild(el('span', 'processing-indicator'));
		badge.appendChild(document.createTextNode(STATUS_LABEL[status]));

		if (info && info.name) li.querySelector('.file-name').textContent = info.name;
		if (info && info.meta != null) li.querySelector('.file-metadata').textContent = info.meta;
		if (info && info.message != null) li.querySelector('.file-message').textContent = info.message;

		if (status === 'success') {
			li.classList.remove('just-completed');
			void li.offsetWidth;
			li.classList.add('just-completed');
		}
	}

	function setProgress(done, total, label) {
		var pct = total === 0 ? 0 : Math.round((done / total) * 100);

		$('progress-bar').style.width = pct + '%';
		$('progress-percentage').textContent = pct + '%';
		if (label) $('progress-label').textContent = label;
	}

	function setBusy(busy) {
		state.busy = busy;
		app.classList.toggle('is-busy', busy);
		setPickerLocked(busy || runIsOpen());
	}

	async function startFill() {
		var text = $('input').value;

		if (!state.info || !state.info.hasInputLayers || text.trim() === '' || state.busy) return;

		if (state.fontsChecking) return;

		state.fontsChecking = true;

		var quiet = await fontsMissingNow();

		state.fontsChecking = false;

		clearNotices();
		setBusy(true);
		$('btn-fill').disabled = true;

		var begin;

		setStage('3 · preenchendo', null, 'importando o template…');

		try {
			begin = await call('fillBegin', { uri: state.info.uri, text: text, quiet: quiet });
			pushRecent(state.selected);
		} catch (err) {
			setBusy(false);
			setStage('2 · preencher', null, relativeFolder());
			updateInputCount();
			notify('error', err.message);
			return;
		}

		// vista de execução
		var list = $('file-list');

		list.textContent = '';
		state.run = { items: [], finished: false, total: begin.total, queued: false, renderTemplates: [], outputPath: [] };

		begin.jobs.forEach(function (job, i) {
			var node = buildItem(i, job.label);

			list.appendChild(node);
			state.run.items.push({ node: node, status: 'waiting', index: i, hostIndex: -1 });
		});

		$('render-options').hidden = true;
		$('run-footer').hidden = true;
		showView('run');
		setStage('3 · preenchendo', state.info.name, begin.templateName);
		setProgress(0, begin.total, 'Preenchendo templates');

		var hostIndex = 0;

		for (var i = 0; i < state.run.items.length; i++) {
			setItem(i, 'processing', { meta: 'duplicando e preenchendo…' });
			await nextFrame();

			try {
				var res = await call('fillStep', { index: i });

				state.run.items[i].hostIndex = hostIndex++;
				setItem(i, 'success', { name: res.name, meta: 'comp criada no projeto', message: '' });
			} catch (err) {
				setItem(i, 'error', { meta: 'não foi possível preencher', message: err.message });
			}

			setProgress(i + 1, begin.total);
		}

		setProgress(begin.total, begin.total, 'Organizando o projeto');
		await nextFrame();

		var fin;

		try {
			fin = await call('fillFinish');
		} catch (err) {
			notify('error', err.message);
			fin = { count: hostIndex, renderTemplates: [], outputPath: [], warnings: [] };
		}

		fin.warnings.forEach(function (w) {
			notify('warning', w);
		});

		state.run.renderTemplates = fin.renderTemplates;
		state.run.outputPath = fin.outputPath;
		setBusy(false);

		var ok = state.run.items.filter(function (item) {
			return item.status === 'success';
		}).length;

		if (ok > 0 && fin.renderTemplates.length > 0) {
			showRenderOptions();
		} else {
			await finishRun(ok === 0 ? 'Nenhum template foi preenchido.' : null);
		}
	}

	/* =========================================================
	   Execução: fila de render
	   ========================================================= */

	function showRenderOptions() {
		var select = $('render-template');
		var saved = store.get('outputTemplate');

		select.textContent = '';
		state.run.renderTemplates.forEach(function (name) {
			var option = el('option', null, name);

			option.value = name;
			select.appendChild(option);
		});

		if (saved && state.run.renderTemplates.indexOf(saved) >= 0) select.value = saved;

		PAD_DROPDOWN.refresh(select);

		var outputs = $('render-outputs');

		outputs.textContent = '';
		state.run.outputPath.forEach(function (path) {
			outputs.appendChild(el('li', null, path));
		});

		setProgress(state.run.total, state.run.total, 'Templates preenchidos');
		setStage('4 · render', null, 'selecione o template de output para continuar');
		$('render-options').hidden = false;
		setPickerLocked(true);
		select.focus();
	}

	async function createQueue() {
		var template = $('render-template').value;

		if (!template) return;

		store.set('outputTemplate', template);
		$('render-options').hidden = true;
		setBusy(true);
		setStage('4 · render', null, 'verificando o caminho de output…');

		var targets = state.run.items.filter(function (item) {
			return item.status === 'success';
		});

		try {
			var begin = await call('queueBegin', { outputTemplate: template });

			begin.warnings.forEach(function (w) {
				notify('warning', w);
			});
		} catch (err) {
			notify('error', err.message);
			setBusy(false);
			$('render-options').hidden = false;
			return;
		}

		setProgress(0, targets.length, 'Criando fila de render');
		setStage('4 · render', null, 'criando fila de render…');

		for (var k = 0; k < targets.length; k++) {
			var item = targets[k];

			setItem(item.index, 'processing', { meta: 'adicionando à fila de render…' });
			await nextFrame();

			try {
				var res = await call('queueStep', { index: item.hostIndex });

				setItem(item.index, 'success', { meta: 'na fila de render', message: 'saída: ' + res.outputs.join('  ·  ') });
			} catch (err) {
				setItem(item.index, 'error', { meta: 'não entrou na fila de render', message: err.message });
			}

			setProgress(k + 1, targets.length);
		}

		state.run.queued = true;
		setBusy(false);
		await finishRun(null);

		// fila criada sem erros: o trabalho do painel acabou e ele fecha (com erros, fica aberto para mostrá-los)
		var failed = targets.some(function (item) {
			return item.status === 'error';
		});

		if (!failed) {
			setTimeout(PAD_BRIDGE.closePanel, 900);
		}
	}

	async function finishRun(message) {
		var run = state.run;
		var ok = run.items.filter(function (item) {
			return item.status === 'success';
		}).length;
		var failed = run.items.length - ok;

		run.finished = true;
		$('render-options').hidden = true;
		$('run-footer').hidden = false;
		setPickerLocked(false);
		renderTree(); // o template entra nos recentes

		try {
			var res = await call('runEnd', {});

			if (res.script) notify('success', 'Script do template executado: ' + res.script);
		} catch (err) {
			notify('error', err.message);
		}

		var summary = message || plural(ok, 'template processado', 'templates processados') + (failed ? ' · ' + plural(failed, 'erro', 'erros') : '');

		setProgress(run.total, run.total, run.queued ? 'Fila de render criada' : 'Concluído');
		setStage('concluído', null, summary);
	}

	function newRun() {
		state.run = null;
		clearNotices();
		setPickerLocked(false);
		showTemplate(state.info);
		updateInputCount();
	}

	async function openOutputs() {
		var info = state.info;
		var paths = (state.run && state.run.outputPath.length ? state.run.outputPath : info && info.config && info.config.outputPath) || [];

		if (!paths.length) return notify('warning', 'Esse template não define uma pasta de output.');

		try {
			var res = await call('openOutputs', { paths: paths });

			res.missing.forEach(function (path) {
				notify('error', '#PAD_019 - output não pode ser acessado: ' + path);
			});
		} catch (err) {
			notify('error', err.message);
		}
	}

	/* =========================================================
	   Menu e eventos
	   ========================================================= */

	// Com um template selecionado, abre a pasta dele; sem seleção, a pasta de templates da produção.
	async function openTemplatesFolder() {
		var path = state.selected && state.info ? state.info.folder : state.templatesPath;

		if (!path) return;

		try {
			await call('openFolder', { path: path });
		} catch (err) {
			pickerMessage('error', err.message);
		}
	}

	async function refreshTree() {
		pickerMessage();
		await loadTree();
	}

	async function menuAction(action) {
		if (action === 'refresh') await refreshTree();
		if (action === 'open-templates') await openTemplatesFolder();
		if (action === 'docs') PAD_BRIDGE.openUrl(DOCS_URL);
		if (action === 'reload') location.reload();
	}

	function bindEvents() {
		bindPreviewScrub();

		var search = $('search');

		search.addEventListener('input', function () {
			state.query = search.value;
			$('search-clear').hidden = search.value === '';
			renderTree();
		});

		search.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && search.value) {
				search.value = '';
				search.dispatchEvent(new Event('input'));
			}

			if (e.key === 'Enter' && state.tree) {
				var query = searchText(state.query);
				var first = firstTemplate(query ? filterTree(state.tree, query) : state.tree);

				if (first) selectTemplate(first, { focusInput: true });
			}
		});

		PAD_KEYS.listNav({
			root: $('tree'),
			items: '.tree-row',
			search: search,
			typeToSearch: true,
			// ← fecha a pasta (ou volta para a pasta do item); → abre a pasta (ou entra nela)
			onLeft: function (row) {
				var li = row.parentNode;

				if (li.classList.contains('tree-folder') && li.classList.contains('is-open')) {
					row.click();
					return true;
				}

				var parent = li.parentNode.closest('.tree-folder');

				if (parent) PAD_KEYS.focusItem(parent.firstElementChild);

				return !!parent;
			},
			onRight: function (row) {
				var li = row.parentNode;

				if (!li.classList.contains('tree-folder')) return false;
				if (!li.classList.contains('is-open')) row.click();
				else PAD_KEYS.focusItem(li.querySelector('.tree-children .tree-row'));

				return true;
			}
		});

		PAD_KEYS.shortcuts({
			find: function () {
				if (!runIsOpen()) PAD_KEYS.focusSearch(search);
			}
		});

		$('search-clear').addEventListener('click', function () {
			search.value = '';
			search.dispatchEvent(new Event('input'));
			search.focus();
		});

		// clicar fora de um template (fundo da lista ou da coluna) ou apertar Esc também desmarca
		function deselectFromUi() {
			if (!state.selected || runIsOpen() || state.busy || !leaveEditor()) return;

			deselectTemplate();
		}

		document.querySelector('.upload-side').addEventListener('click', function (e) {
			if (e.target.closest('.tree-row, .tree-star, .picker-search, .picker-footer, .picker-state')) return;

			deselectFromUi();
		});

		document.addEventListener('keydown', function (e) {
			if (e.key !== 'Escape' || e.defaultPrevented) return; // o Esc do texto só volta para a lista

			var active = document.activeElement;

			if (active === search && search.value) return; // o Esc da busca só limpa o texto
			if (active && active.tagName === 'TEXTAREA') return;
			if (active && active.closest && active.closest('#view-config')) return;
			if ($('app-menu').hasAttribute('open')) return;

			deselectFromUi();
		});

		$('btn-refresh').addEventListener('click', refreshTree);
		$('btn-open-templates').addEventListener('click', openTemplatesFolder);

		$('btn-import').addEventListener('click', function () {
			importTemplate();
		});
		$('btn-import-readonly').addEventListener('click', function () {
			importTemplate();
		});

		var input = $('input');

		input.addEventListener('input', updateInputCount);
		input.addEventListener('focus', function () {
			if (input.value === state.example) input.select();
		});
		input.addEventListener('change', function () {
			input.value = input.value.replace(/[\n\r]{3,}/g, '\n\n');
			updateInputCount();
		});
		input.addEventListener('keydown', function (e) {
			if (e.key === 'Enter' && PAD_KEYS.isMod(e)) startFill();

			// Esc no texto volta para o template na lista (outro Esc desmarca)
			if (e.key === 'Escape') {
				var row = selectedRow();

				if (row) {
					e.preventDefault();
					PAD_KEYS.focusItem(row);
				}
			}
		});

		$('btn-edit-config').addEventListener('click', openEditor);
		$('btn-fill').addEventListener('click', function () {
			startFill();
		});

		$('btn-output').addEventListener('click', openOutputs);
		$('btn-output-run').addEventListener('click', openOutputs);
		$('btn-queue').addEventListener('click', createQueue);
		$('btn-skip-queue').addEventListener('click', function () {
			$('render-options').hidden = true;
			finishRun(null);
		});
		$('btn-again').addEventListener('click', newRun);

		// menu ⋯
		var menu = $('app-menu');

		menu.addEventListener('click', function (e) {
			var btn = e.target.closest('button[data-action]');

			if (!btn) return;

			menu.removeAttribute('open');
			menuAction(btn.dataset.action);
		});

		document.addEventListener('click', function (e) {
			if (!menu.contains(e.target)) menu.removeAttribute('open');
		});

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') menu.removeAttribute('open');
		});
	}

	/* =========================================================
	   Início
	   ========================================================= */

	async function init() {
		bindEvents();
		PAD_DROPDOWN.enhance($('render-template'));

		setTimeout(function () {
			document.body.classList.add('motion-ready');
		}, 0);

		try {
			await call('ping');
		} catch (err) {
			state.treeStatus = 'error';
			renderTree();
		}

		if (state.treeStatus !== 'error') await loadProductions();

		setInterval(watchProduction, 2000);
		window.addEventListener('focus', watchProduction);
	}

	init();
})();
