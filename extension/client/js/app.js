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

	// Ícone da produção: literal de string binária (PNG) guardado na lista → data URL.
	function decodeIcon(literal) {
		if (typeof literal !== 'string' || literal.length < 2) return null;

		var quote = literal.charAt(0);

		if ((quote !== "'" && quote !== '"') || literal.charAt(literal.length - 1) !== quote) return null;

		var body = literal.slice(1, -1);
		var simple = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0' };
		var out = '';

		for (var i = 0; i < body.length; i++) {
			var c = body.charAt(i);

			if (c !== '\\') {
				out += c;
				continue;
			}

			var n = body.charAt(++i);

			if (n === 'u') {
				out += String.fromCharCode(parseInt(body.substr(i + 1, 4), 16));
				i += 4;
			} else if (n === 'x') {
				out += String.fromCharCode(parseInt(body.substr(i + 1, 2), 16));
				i += 2;
			} else {
				out += Object.prototype.hasOwnProperty.call(simple, n) ? simple[n] : n;
			}
		}

		try {
			return 'data:image/png;base64,' + btoa(out);
		} catch (err) {
			return null;
		}
	}

	/* =========================================================
	   Estado
	   ========================================================= */

	var state = {
		configPath: '',
		productions: [],
		production: 0,
		loading: false,
		tree: null, // árvore em memória { type, text, children | uri }
		treeStatus: 'loading', // loading | ok | missing | empty | error
		templatesPath: '',
		query: '',
		folderOverride: {}, // chave da pasta → aberta / fechada (escolha do usuário)
		selected: null, // nó do template selecionado
		info: null, // retorno de templateInfo
		example: '', // texto de exemplo atual (para saber se o usuário digitou algo)
		run: null, // execução em andamento
		editor: null // editor de config aberto
	};

	var app = $('app-shell');

	/* =========================================================
	   Avisos
	   ========================================================= */

	function notify(kind, text) {
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

		var msg = el('p', 'validation-message' + (kind === 'success' ? ' is-success' : ''), text);

		box.appendChild(msg);
	}

	/* =========================================================
	   Produções
	   ========================================================= */

	// A produção é escolhida na barra do script (main ui): ela grava a escolha em um arquivo
	// compartilhado e o painel acompanha (host: PADX.selectedProduction).
	async function loadProductions() {
		try {
			var res = await call('productions', { configPath: state.configPath });

			state.productions = res.productions;

			if (res.error) pickerMessage('error', 'lista de produções: ' + res.error);
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

	// Acompanha a produção escolhida na barra do script e a conexão com o After Effects.
	async function watchProduction() {
		if (document.hidden || state.busy || runIsOpen() || state.loading || state.editor) return;

		var name;

		try {
			name = (await call('selectedProduction')).name;
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
		state.tree = null;
		state.templatesPath = prod ? prod.templatesPath : '';
		state.treeStatus = prod ? 'loading' : 'empty';
		renderTree();

		if (!prod) {
			state.loading = false;
			return;
		}

		try {
			var res = await call('templateTree', { path: prod.templatesPath });

			state.templatesPath = res.path;

			if (!res.exists) {
				state.treeStatus = 'missing';
			} else {
				state.tree = res.tree;
				annotateTrail(res.tree, []);
				state.treeStatus = countTemplates(res.tree) > 0 ? 'ok' : 'empty';
			}
		} catch (err) {
			state.treeStatus = 'error';
			pickerMessage('error', err.message);
		}

		state.loading = false;
		renderTree();
	}

	// Cada template guarda a trilha de pastas até ele (sem a pasta raiz).
	function annotateTrail(node, trail) {
		node.children.forEach(function (child) {
			if (child.type === 'node') annotateTrail(child, trail.concat(child.text));
			else child.folderTrail = trail;
		});
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

	function isFolderOpen(key, depth) {
		if (state.query) return true;
		if (Object.prototype.hasOwnProperty.call(state.folderOverride, key)) return state.folderOverride[key];

		return depth === 0;
	}

	function buildNode(node, depth, parentKey) {
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
				kids.appendChild(buildNode(child, depth + 1, key));
			});

			li.appendChild(row);
			li.appendChild(kids);
		} else {
			var btn = el('button', 'tree-row');
			var ext = (node.text.match(/\.[a-z0-9]+$/i) || [''])[0].slice(1).toUpperCase();

			li.className = 'tree-item' + (state.selected && state.selected.uri === node.uri ? ' is-selected' : '');
			li.setAttribute('role', 'treeitem');
			li.setAttribute('aria-selected', String(li.classList.contains('is-selected')));
			li.dataset.uri = node.uri;

			btn.type = 'button';
			btn.title = node.fsName || node.text;
			btn.appendChild(svgIcon('file'));
			btn.appendChild(el('span', 'tree-label', node.text.replace(/\.[a-z0-9]+$/i, '')));
			btn.appendChild(el('span', 'tree-ext', ext));
			btn.addEventListener('click', function (e) {
				if (e.detail > 1) return; // o duplo clique só importa, sem alternar a seleção

				selectTemplate(node);
			});
			btn.addEventListener('dblclick', function () {
				importTemplate(node);
			});

			li.appendChild(btn);
		}

		return li;
	}

	function treeState(title, text) {
		var box = el('div', 'picker-state');

		box.appendChild(el('strong', null, title));
		if (text) box.appendChild(el('span', null, text));

		return box;
	}

	function renderTree() {
		var list = $('tree');
		var total = $('picker-total');

		list.textContent = '';
		total.textContent = '';

		if (state.treeStatus === 'loading') {
			list.appendChild(treeState('lendo a pasta de templates…', 'pastas de rede podem demorar um pouco'));
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
			list.appendChild(treeState('nenhum template encontrado', state.productions.length ? state.templatesPath : 'a lista de produções está vazia'));
			return;
		}

		var query = searchText(state.query);
		var data = query ? filterTree(state.tree, query) : state.tree;
		var found = countTemplates(data);

		if (found === 0) {
			list.appendChild(treeState('nada encontrado', 'nenhum template casa com “' + state.query.trim() + '”'));
			total.textContent = '0 / ' + countTemplates(state.tree);
			return;
		}

		data.children.forEach(function (child) {
			list.appendChild(buildNode(child, 0, ''));
		});

		total.textContent = query ? found + ' / ' + countTemplates(state.tree) : plural(found, 'template', 'templates');
	}

	function markSelected() {
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
		['readonly', 'input', 'config', 'run'].forEach(function (view) {
			$('view-' + view).hidden = view !== name;
		});

		$('queue-actions').hidden = name !== 'input';
		$('btn-edit-config').hidden = name === 'run';
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

	async function selectTemplate(node) {
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
		setStage('2 · preencher', node.text.replace(/\.[a-z0-9]+$/i, ''), 'lendo o template…');
		showView('input');
		$('view-input').hidden = true;

		try {
			state.info = await call('templateInfo', { uri: node.uri });
		} catch (err) {
			state.info = null;
			showReadonly(err.message);
			return;
		}

		if (!state.selected || state.selected.uri !== node.uri) return; // mudou de template enquanto lia

		showTemplate(state.info);

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

		// o que o usuário já digitou é mantido ao trocar de template (como no script)
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

	async function importTemplate(node) {
		if (runIsOpen()) return notify('warning', 'Finalize o preenchimento atual antes de importar outro template.');

		var target = node || state.selected;

		if (!target) return;

		try {
			var res = await call('importTemplate', { uri: target.uri });

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

		updateSummary();
	}

	function updateSummary() {
		var counts = { waiting: 0, processing: 0, success: 0, error: 0 };

		state.run.items.forEach(function (item) {
			counts[item.status]++;
		});

		Object.keys(counts).forEach(function (key) {
			var node = $('sum-' + key);

			if (node.textContent !== String(counts[key])) {
				node.textContent = String(counts[key]);
				node.classList.remove('has-changed');
				void node.offsetWidth;
				node.classList.add('has-changed');
			}
		});
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

		if (!state.info || !state.info.hasInputLayers || text.trim() === '') return;

		clearNotices();
		setBusy(true);
		$('btn-fill').disabled = true;

		var begin;

		setStage('3 · preenchendo', null, 'importando o template…');

		try {
			begin = await call('fillBegin', { uri: state.info.uri, text: text });
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
		updateSummary();

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

	async function openTemplatesFolder() {
		if (!state.templatesPath) return;

		try {
			await call('openFolder', { path: state.templatesPath });
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

				if (first) selectTemplate(first);
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
			if (e.target.closest('.tree-row, .picker-search, .picker-footer, .picker-state')) return;

			deselectFromUi();
		});

		document.addEventListener('keydown', function (e) {
			if (e.key !== 'Escape') return;

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
			if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) startFill();
		});

		$('btn-edit-config').addEventListener('click', openEditor);
		$('btn-fill').addEventListener('click', startFill);
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
