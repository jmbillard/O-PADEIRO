/*

---------------------------------------------------------------
> LISTA DE PRODUÇÕES — editor
---------------------------------------------------------------

Edita o 'O_PADEIRO_config.json' compartilhado pela equipe:
nome do menu, ícone (24 x 24 px, opcional) e pasta de templates de cada produção.
Salvar confere se o arquivo mudou desde a leitura (outra pessoa pode ter editado).

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/producoes.md';
	var ICON_SIZE = 24; // ícone da produção: 24 x 24 px

	var state = {
		rows: [], // { id, name, icon, path, exists: null | true | false, error }
		nextId: 1,
		stamp: 0,
		snapshot: '',
		discardTimer: null,
		saving: false,
		log: { mode: 'webhook', webhook: '' }, // onde cada render da fila é registrado
		drives: { drives: [], shares: [], defaultServer: '' }, // mapa de drives da rede (aba DRIVES)
		rename: { types: [], fixed: [], removeSpecial: true, textCase: 'upperCase', separator: ' - ' }, // aba RENOMEAR; termos editados como texto
		organize: { folders: [], renderComments: '', editComments: '', autoComment: '', dataExtensions: '', commentSubfolders: true }, // aba ORGANIZAR (folders: { name, parent, contents })
		search: { source: 'webhook', webhook: '', file: '', labels: {} }, // aba BUSCA: origem do índice e { chave: nome de exibição }
		links: [], // aba LINKS: [{ name, url, icon }] (icon vazio = favicon do site)
		project: { root: '', folder: true, fileName: '', retrancas: [] }, // aba PROJETO
		collect: { folders: [], projectFolders: false, saveAfter: true }, // aba COLETAR (folders: { name, parent, contents })
		bar: { items: [], hidden: [] }, // aba FERRAMENTAS: a ordem da barra ('divider' entre os grupos) e as escondidas
		appearance: null, // aba APARÊNCIA: o tema (a janela mostra a prévia enquanto edita)
		savedAppearance: null,
		personal: [], // aba LINKS: os do usuário, só neste computador (gravados à parte, fora do arquivo da rede)
		personalSnapshot: '[]',
		categories: null, // categorias encontradas no índice (pedidas ao abrir a aba)
		tab: 'prods'
	};

	var LOG_HINTS = {
		csvGlobal: 'cada preenchimento vira uma nova linha no “O_PADEIRO_log.csv” da equipe (um arquivo só, na mesma pasta da lista de produções).',
		webhook: 'cada preenchimento é enviado para este endereço (data, produção, template, quantidade, usuário, máquina e projeto).',
		csv: 'cada preenchimento vira uma nova linha no “O_PADEIRO_log.csv” da produção (um arquivo só, na pasta de templates dela).',
		off: 'nada é registrado.'
	};

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

	function svg(paths) {
		var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

		node.setAttribute('viewBox', '0 0 24 24');

		paths.forEach(function (d) {
			var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

			path.setAttribute('d', d);
			node.appendChild(path);
		});

		return node;
	}

	var ICONS = {
		remove: ['M6 6l12 12M18 6 6 18'],
		folder: ['M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17z']
	};

	function miniButton(icon, title, onClick) {
		var btn = el('button', 'mini-button');

		btn.type = 'button';
		btn.title = title;
		btn.setAttribute('aria-label', title);
		btn.appendChild(svg(ICONS[icon]));
		btn.addEventListener('click', onClick);

		return btn;
	}

	function toast(kind, text) {
		PAD_UTIL.toast($('toast'), 'finder-toast', kind, text);
	}

	/* =========================================================
	   Ícones (PNG 24 x 24 guardado como literal de string binária,
	   o formato da lista compartilhada)
	   ========================================================= */

	function bytesToLiteral(bytes) {
		var out = "'";

		for (var i = 0; i < bytes.length; i++) {
			var b = bytes[i];
			var hex = (b < 16 ? '0' : '') + b.toString(16).toUpperCase();

			if (b === 39) out += "\\'";
			else if (b === 92) out += '\\\\';
			else if (b === 10) out += '\\n';
			else if (b === 13) out += '\\r';
			else if (b === 9) out += '\\t';
			else if (b < 32) out += '\\x' + hex;
			else if (b < 127) out += String.fromCharCode(b);
			else out += '\\u00' + hex;
		}

		return out + "'";
	}

	function canvasToLiteral(canvas) {
		var base64 = canvas.toDataURL('image/png').split(',')[1];
		var raw = atob(base64);
		var bytes = new Uint8Array(raw.length);

		for (var i = 0; i < raw.length; i++) {
			bytes[i] = raw.charCodeAt(i);
		}

		return bytesToLiteral(bytes);
	}

	// Ícone padrão: o pão do logo, só o contorno, esmaecido (aparece bem na barra clara e na escura).
	function defaultIcon() {
		var canvas = document.createElement('canvas');
		var scale = 0.62; // o pão do logo ocupa 34 x 24 de 48 x 32

		canvas.width = canvas.height = ICON_SIZE;

		var ctx = canvas.getContext('2d');

		ctx.setTransform(scale, 0, 0, scale, 12 - 24 * scale, 12 - 17 * scale);
		ctx.strokeStyle = 'rgba(138,148,166,0.8)';
		ctx.lineWidth = 1.5 / scale;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke(new Path2D('M7 24C7 12.6 14.6 5 24 5s17 7.6 17 19v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z'));
		ctx.stroke(new Path2D('M7.6 23.2h32.8'));
		ctx.stroke(new Path2D('m18.2 10.8 1.4 4.2M23.4 9.4l1.3 4.6M28.6 10.8l1.4 4.2'));

		return canvasToLiteral(canvas);
	}

	// Imagem escolhida pelo usuário → PNG 24 x 24 (recorte central, sem distorcer).
	// 'logo': a imagem inteira, sem cortar, dentro de 96 x 72 px (a logo da barra), com fundo transparente
	function imageFileToIcon(path, logo) {
		return new Promise(function (resolve, reject) {
			var base64 = PAD_BRIDGE.readFileBase64(path);

			if (!base64) return reject(new Error('não foi possível ler a imagem.'));

			var mime = /\.jpe?g$/i.test(path) ? 'image/jpeg' : 'image/png';
			var img = new Image();

			img.onload = function () {
				var canvas = document.createElement('canvas');
				var side = Math.min(img.width, img.height);

				if (logo) {
					var scale = Math.min(96 / img.width, 72 / img.height, 1);

					canvas.width = Math.max(1, Math.round(img.width * scale));
					canvas.height = Math.max(1, Math.round(img.height * scale));
					canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
					return resolve(canvasToLiteral(canvas));
				}

				canvas.width = canvas.height = ICON_SIZE;
				canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, ICON_SIZE, ICON_SIZE);
				resolve(canvasToLiteral(canvas));
			};
			img.onerror = function () {
				reject(new Error('a imagem não pôde ser aberta.'));
			};
			img.src = 'data:' + mime + ';base64,' + base64;
		});
	}

	/* =========================================================
	   Estado das linhas
	   ========================================================= */

	function newRow(data) {
		return {
			id: state.nextId++,
			name: data.name || '',
			icon: data.icon || '',
			path: data.templatesPath || '',
			exists: null,
			error: false
		};
	}

	function listForSave() {
		return state.rows.map(function (r) {
			return { name: r.name.trim(), icon: r.icon, templatesPath: r.path.trim() };
		});
	}

	function logForSave() {
		return { mode: state.log.mode, webhook: state.log.webhook.trim() };
	}

	function drivesForSave() {
		var d = state.drives;

		return {
			drives: d.drives.map(function (r) {
				return { letter: r.letter.trim().replace(/:$/, '').toUpperCase(), path: r.path.trim() };
			}),
			shares: d.shares.map(function (r) {
				return { share: r.share.trim(), server: r.server.trim() };
			}),
			defaultServer: d.defaultServer.trim()
		};
	}

	function renameForSave() {
		return {
			types: state.rename.types.map(function (t) {
				return {
					prefix: t.prefix.trim(),
					comment: t.comment.trim(),
					terms: t.terms.split(',').map(function (x) {
						return x.trim();
					}).filter(Boolean)
				};
			}),
			fixed: state.rename.fixed.map(function (f) {
				return { match: f.match.trim(), name: f.name.trim() };
			}),
			removeSpecial: state.rename.removeSpecial,
			textCase: state.rename.textCase,
			separator: state.rename.separator
		};
	}

	function commaList(text) {
		return String(text).split(',').map(function (x) {
			return x.trim();
		}).filter(Boolean);
	}

	function organizeForSave() {
		var o = state.organize;

		return {
			folders: o.folders.map(function (f) {
				return { name: f.name.trim(), parent: f.parent, contents: f.contents.slice() };
			}),
			renderComments: commaList(o.renderComments),
			editComments: commaList(o.editComments),
			autoComment: o.autoComment.trim(),
			dataExtensions: commaList(o.dataExtensions),
			commentSubfolders: o.commentSubfolders
		};
	}

	function searchForSave() {
		var labels = state.search.labels;

		return {
			source: state.search.source,
			webhook: state.search.webhook.trim(),
			file: state.search.file.trim(),
			labels: Object.keys(labels).filter(function (key) {
				return labels[key].trim();
			}).map(function (key) {
				return { key: key, label: labels[key].trim() };
			})
		};
	}

	function linksForSave() {
		return state.links.map(function (l) {
			return { name: l.name.trim(), url: l.url.trim(), icon: l.icon || '' };
		});
	}

	function personalForSave() {
		return state.personal.map(function (l) {
			return { name: l.name.trim(), url: l.url.trim(), icon: l.icon || '' };
		});
	}

	function projectForSave() {
		var p = state.project;

		return {
			root: p.root.trim(),
			folder: p.folder,
			fileName: p.fileName.trim(),
			retrancas: p.retrancas.map(function (r) {
				return { code: r.code.trim().toUpperCase(), path: r.path.trim() };
			})
		};
	}

	function collectForSave() {
		var c = state.collect;

		return {
			folders: c.folders.map(function (f) {
				return { name: f.name.trim(), parent: f.parent, contents: f.contents.slice() };
			}),
			projectFolders: c.projectFolders,
			saveAfter: c.saveAfter
		};
	}

	function barForSave() {
		return { items: state.bar.items.slice(), hidden: state.bar.hidden.slice().sort() };
	}

	function appearanceForSave() {
		return state.appearance ? Object.assign({}, state.appearance) : null;
	}

	function currentSnapshot() {
		return JSON.stringify({ list: listForSave(), log: logForSave(), drives: drivesForSave(), rename: renameForSave(), organize: organizeForSave(), search: searchForSave(), links: linksForSave(), project: projectForSave(), collect: collectForSave(), bar: barForSave(), appearance: appearanceForSave() });
	}

	// os links pessoais têm o próprio estado salvo (não dependem da lista da rede)
	function personalDirty() {
		return JSON.stringify(personalForSave()) !== state.personalSnapshot;
	}

	function updateDirty() {
		var dirty = currentSnapshot() !== state.snapshot || personalDirty();

		$('dirty').hidden = !dirty;

		return dirty;
	}

	/* =========================================================
	   Interface
	   ========================================================= */

	function iconSrc(row) {
		return PAD_UTIL.decodeIcon(row.icon) || PAD_UTIL.decodeIcon(state.newIcon) || ''; // sem ícone: mostra o padrão (não é gravado)
	}

	function dotClass(row) {
		return 'prod-dot' + (row.exists === true ? ' is-ok' : row.exists === false ? ' is-missing' : '');
	}

	function dotTitle(row) {
		return row.exists === true ? 'pasta de templates encontrada' : row.exists === false ? 'pasta de templates não localizada' : 'verificando a pasta…';
	}

	function buildRow(row) {
		var box = el('div', 'prod-row');
		var grip = PAD_SORT.handle();
		var iconBtn = el('button', 'prod-icon');
		var img = el('img');
		var name = el('input', 'cfg-input');
		var pathWrap = el('div', 'prod-path');
		var path = el('input', 'cfg-input');
		var dot = el('span', dotClass(row));

		iconBtn.type = 'button';
		iconBtn.title = 'ícone, 24 x 24 px, que aparece no menu (opcional): clique para escolher uma imagem';
		img.alt = '';
		img.src = iconSrc(row);
		iconBtn.appendChild(img);
		iconBtn.addEventListener('click', async function () {
			var file = PAD_BRIDGE.pickFile('Selecione o ícone', ['png', 'jpg', 'jpeg']);

			if (!file) return;

			try {
				row.icon = await imageFileToIcon(file);
				img.src = iconSrc(row);
				updateDirty();
			} catch (err) {
				toast('error', err.message);
			}
		});

		name.type = path.type = 'text';
		name.value = row.name;
		name.placeholder = 'nome no menu';
		name.title = 'nome que aparecerá no menu';
		name.spellcheck = path.spellcheck = false;
		name.addEventListener('input', function () {
			row.name = name.value;
			box.classList.remove('has-error');
			updateDirty();
		});

		path.value = row.path;
		path.placeholder = '//servidor/share/pasta de templates';
		path.title = 'caminho da pasta de templates';
		dot.title = dotTitle(row);

		var checkTimer = null;

		path.addEventListener('input', function () {
			row.path = path.value;
			row.exists = null;
			dot.className = dotClass(row);
			dot.title = dotTitle(row);
			box.classList.remove('has-error');
			updateDirty();

			clearTimeout(checkTimer);
			checkTimer = setTimeout(function () {
				checkFolders([row]);
			}, 700);
		});

		var pick = miniButton('folder', 'escolher a pasta de templates', async function () {
			var picked = PAD_BRIDGE.pickFolder('Selecione a pasta de templates', path.value);

			if (!picked) return;

			try {
				path.value = (await call('canonicalPath', { path: picked })).path;
			} catch (err) {
				path.value = picked;
			}

			path.dispatchEvent(new Event('input'));
		});

		var remove = miniButton('remove', 'deletar produção', function () {
			state.rows = state.rows.filter(function (r) {
				return r !== row;
			});
			render();
			updateDirty();
		});

		// o campo do caminho leva o status (à esquerda) e os botões de pasta e de excluir (à direita)
		var actions = el('div', 'prod-path-actions');

		actions.appendChild(pick);
		actions.appendChild(remove);
		pathWrap.appendChild(dot);
		pathWrap.appendChild(path);
		pathWrap.appendChild(actions);

		box.appendChild(grip);
		box.appendChild(iconBtn);
		box.appendChild(name);
		box.appendChild(pathWrap);

		row.nodes = { box: box, dot: dot, name: name, path: path };

		if (row.error) box.classList.add('has-error');

		return box;
	}

	function render() {
		var list = $('list');

		list.textContent = '';

		if (!state.rows.length) {
			list.appendChild(el('p', 'prods-empty', 'nenhuma produção: clique em “+ nova produção”.'));
			appendNewButton();
			appendFileInfo();
			return;
		}

		state.rows.forEach(function (row) {
			list.appendChild(buildRow(row));
		});

		appendNewButton();
		appendFileInfo();
		applyFilter();
	}

	// Filtro por nome ou pasta (só esconde as linhas: salvar grava a lista inteira).
	function fold(str) {
		return String(str).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	}

	function applyFilter() {
		var key = fold($('filter').value.trim());
		var shown = 0;
		var list = $('list');
		var empty = list.querySelector('.prods-nomatch');

		state.rows.forEach(function (row) {
			if (!row.nodes) return;

			// linhas novas (ainda sem nome) e com erro ficam sempre à vista
			var match = key === '' || row.name.trim() === '' || row.error || fold(row.name + ' ' + row.path).indexOf(key) >= 0;

			row.nodes.box.hidden = !match;
			if (match) shown++;
		});

		if (empty) empty.remove();

		list.classList.toggle('is-filtered', key !== '');

		if (state.rows.length && !shown) list.insertBefore(el('p', 'prods-empty prods-nomatch', 'nenhuma produção casa com “' + $('filter').value.trim() + '”.'), state.newBtn.parentNode === list ? state.newBtn : null);
	}

	// ↑ ↓ num campo vão para o mesmo campo da linha de cima / de baixo.
	function moveBetweenRows(e) {
		if ((e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || e.altKey || e.shiftKey || PAD_KEYS.isMod(e)) return;

		var input = e.target;

		if (input.tagName !== 'INPUT') return;

		var rows = Array.prototype.filter.call($('list').querySelectorAll('.prod-row'), function (box) {
			return !box.hidden;
		});
		var box = input.closest('.prod-row');
		var at = rows.indexOf(box);
		var column = Array.prototype.indexOf.call(box.querySelectorAll('input'), input);
		var next = rows[at + (e.key === 'ArrowDown' ? 1 : -1)];

		if (!next) return;

		e.preventDefault();

		var target = next.querySelectorAll('input')[column];

		target.focus();
		target.setSelectionRange(target.value.length, target.value.length);
		next.scrollIntoView({ block: 'nearest' });
	}

	// Verifica quais pastas existem (a leitura é pelo After Effects, que pode demorar na rede).
	async function checkFolders(rows) {
		try {
			var res = await call('checkFolders', {
				paths: rows.map(function (r) {
					return r.path;
				})
			});

			rows.forEach(function (row, i) {
				row.exists = res.exists[i];

				if (row.nodes) {
					row.nodes.dot.className = dotClass(row);
					row.nodes.dot.title = dotTitle(row);
				}
			});
		} catch (err) { }
	}

	// "+ nova produção": logo abaixo das produções, como o "+ novo output" do criador
	function appendNewButton() {
		state.newBtn.hidden = false;
		$('list').appendChild(state.newBtn);
	}

	// o caminho da lista fica no fim da lista de pastas
	function appendFileInfo() {
		if (state.fileInfo && !state.fileInfo.hidden) $('list').appendChild(state.fileInfo);
	}

	function showFileInfo(res) {
		var info = state.fileInfo || (state.fileInfo = el('p', 'prods-file'));

		info.textContent = '';
		info.appendChild(PAD_UTIL.pathLine(res.configPath || '—'));
		// a lista é sempre a compartilhada: a etiqueta só aparece quando ela não está acessível
		if (!res.shared) info.appendChild(el('span', 'prods-tag is-local', 'inacessível'));
		info.title = res.shared ? res.configPath : 'a lista compartilhada (junto do padeiro, na rede) não está acessível.';
		info.hidden = false;
	}

	// Sem a lista compartilhada não há o que editar: a lista é uma só para a equipe (nada de cópia local).
	function setAvailable(available) {
		state.available = available;
		['btn-import', 'btn-export'].forEach(function (id) {
			$(id).disabled = !available;
		});
		state.newBtn.disabled = !available;
		renderLog();
		renderDrives();
		renderRename();
		renderOrganize();
		renderSearch();
		renderLinks();
		renderAppearance();
		renderProject();
		renderCollect();
		renderTools();
	}

	function showUnavailable(message) {
		var list = $('list');
		var box = el('div', 'prods-unavailable');
		var retry = el('button', 'button button-primary', 'Tentar de novo');

		retry.type = 'button';
		retry.addEventListener('click', load);
		box.appendChild(el('strong', null, 'lista compartilhada inacessível'));
		box.appendChild(el('span', null, message));
		box.appendChild(retry);
		list.textContent = '';
		list.appendChild(box);
		appendFileInfo();
	}

	/* =========================================================
	   Logs
	   ========================================================= */

	function renderLog() {
		var mode = state.log.mode;
		var webhook = $('log-webhook');

		Array.prototype.forEach.call($('log-modes').querySelectorAll('input[name="log-mode"]'), function (radio) {
			radio.checked = radio.value === mode;
			radio.disabled = !state.available;
		});

		if (webhook.value !== state.log.webhook) webhook.value = state.log.webhook;
		$('log-webhook-field').hidden = mode !== 'webhook';
		webhook.disabled = !state.available;
		$('log-hint').textContent = LOG_HINTS[mode] || '';
	}

	function setLog(log) {
		state.log = { mode: (log && log.mode) || 'webhook', webhook: (log && log.webhook) || '' };
		$('log-webhook').classList.remove('has-error');
		renderLog();
	}

	function validateLog() {
		var log = logForSave();
		var bad = log.mode === 'webhook' && !/^https?:\/\/[^\s"'`$\\;&|<>]+$/i.test(log.webhook);

		$('log-webhook').classList.toggle('has-error', bad);

		return bad ? '#PAD_078 - log: endereço do webhook inválido (comece com http:// ou https://, sem espaços nem aspas).' : null;
	}

	function bindLog() {
		$('log-modes').addEventListener('change', function (e) {
			if (e.target.name !== 'log-mode') return;

			state.log.mode = e.target.value;
			$('log-webhook').classList.remove('has-error');
			renderLog();
			updateDirty();

			if (state.log.mode === 'webhook' && !state.log.webhook.trim()) $('log-webhook').focus();
		});

		$('log-webhook').addEventListener('input', function () {
			state.log.webhook = $('log-webhook').value;
			$('log-webhook').classList.remove('has-error');
			updateDirty();
		});
	}

	/* =========================================================
	   Drives da rede
	   ========================================================= */

	var SERVER_ICON = ['M5.5 4.5h13a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 9V6a1.5 1.5 0 0 1 1.5-1.5zM5.5 13.5h13a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18v-3a1.5 1.5 0 0 1 1.5-1.5z', 'M7.5 7.5h.01M7.5 16.5h.01'];
	var NETWORK_ICON = ['M5.5 6h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', 'M3.5 13h17', 'M16.5 15.5h.01M13.5 15.5h.01']; // um HD

	function setDrives(d) {
		var clone = JSON.parse(JSON.stringify(d || { drives: [], shares: [], defaultServer: '' }));

		state.drives = {
			drives: clone.drives || [],
			shares: clone.shares || [],
			defaultServer: clone.defaultServer || ''
		};
		renderDrives();
	}

	// um campo com ícone e o × de remover dentro (como os caminhos das produções)
	function driveField(value, placeholder, label, icon, onInput, onRemove) {
		var line = el('div', 'cfg-path has-field-icon');
		var input = el('input', 'cfg-input');
		var remove = miniButton('remove', 'remover', onRemove);
		var ico = svg(icon);

		ico.setAttribute('class', 'field-icon');
		input.type = 'text';
		input.value = value;
		input.placeholder = placeholder;
		input.spellcheck = false;
		input.setAttribute('aria-label', label);
		input.disabled = !state.available;
		remove.disabled = !state.available;
		input.addEventListener('input', function () {
			onInput(input.value);

			var row = line.closest('.drive-row');

			if (row) row.classList.remove('has-error');
			updateDirty();
		});
		line.appendChild(ico);
		line.appendChild(input);
		line.appendChild(remove);

		return line;
	}

	function renderDrives() {
		if (!state.drives) return;

		var drives = $('drive-list');
		var shares = $('share-list');

		drives.textContent = '';
		shares.textContent = '';

		state.drives.drives.forEach(function (row, i) {
			var box = el('div', 'drive-row');
			var letter = el('input', 'cfg-input drive-letter');

			letter.type = 'text';
			letter.maxLength = 2;
			letter.value = row.letter ? row.letter.replace(/:$/, '') + ':' : '';
			letter.placeholder = 'X:';
			letter.title = 'letra do drive no Windows';
			letter.setAttribute('aria-label', 'letra do drive ' + (i + 1));
			letter.disabled = !state.available;
			letter.addEventListener('input', function () {
				row.letter = letter.value.replace(/[^a-z]/gi, '').slice(0, 1).toUpperCase();
				box.classList.remove('has-error');
				updateDirty();
			});
			letter.addEventListener('blur', function () {
				letter.value = row.letter ? row.letter + ':' : '';
			});

			box.appendChild(letter);
			box.appendChild(driveField(row.path, '//servidor/share/pasta', 'caminho de rede do drive ' + (row.letter || i + 1), NETWORK_ICON, function (v) {
				row.path = v;
			}, function () {
				state.drives.drives.splice(i, 1);
				renderDrives();
				updateDirty();
			}));
			drives.appendChild(box);
		});

		state.drives.shares.forEach(function (row, i) {
			var box = el('div', 'drive-row is-share');
			var share = el('input', 'cfg-input');

			share.type = 'text';
			share.value = row.share;
			share.placeholder = 'nome do volume';
			share.title = 'nome do volume no Mac (/Volumes/NOME)';
			share.spellcheck = false;
			share.setAttribute('aria-label', 'nome do volume ' + (i + 1));
			share.disabled = !state.available;
			share.addEventListener('input', function () {
				row.share = share.value;
				box.classList.remove('has-error');
				updateDirty();
			});

			box.appendChild(share);
			box.appendChild(driveField(row.server, 'servidor.empresa.com', 'servidor do volume ' + (row.share || i + 1), SERVER_ICON, function (v) {
				row.server = v;
			}, function () {
				state.drives.shares.splice(i, 1);
				renderDrives();
				updateDirty();
			}));
			shares.appendChild(box);
		});

		var server = $('default-server');

		if (server.value !== state.drives.defaultServer) server.value = state.drives.defaultServer;
		server.disabled = !state.available;
		['btn-new-drive', 'btn-new-share'].forEach(function (id) {
			$(id).disabled = !state.available;
		});
	}

	function bindDrives() {
		$('btn-new-drive').addEventListener('click', function () {
			state.drives.drives.push({ letter: '', path: '' });
			renderDrives();
			updateDirty();
			$('drive-list').lastChild.querySelector('input').focus();
		});

		$('btn-new-share').addEventListener('click', function () {
			state.drives.shares.push({ share: '', server: '' });
			renderDrives();
			updateDirty();
			$('share-list').lastChild.querySelector('input').focus();
		});

		$('default-server').addEventListener('input', function () {
			state.drives.defaultServer = this.value;
			updateDirty();
		});
	}

	/* =========================================================
	   Renomear
	   ========================================================= */

	var TAG_ICON = ['M3.5 12.6V5A1.5 1.5 0 0 1 5 3.5h7.6l8 8a1.5 1.5 0 0 1 0 2.1l-7 7a1.5 1.5 0 0 1-2.1 0z', 'M8 8h.01'];

	function setRename(r) {
		var data = r || { types: [], fixed: [] };

		state.rename = {
			types: (data.types || []).map(function (t) {
				return { prefix: t.prefix || '', comment: t.comment || '', terms: (t.terms || []).join(', ') };
			}),
			fixed: (data.fixed || []).map(function (f) {
				return { match: f.match || '', name: f.name || '' };
			}),
			removeSpecial: data.removeSpecial !== false,
			textCase: data.textCase || 'upperCase',
			separator: data.separator == null ? ' - ' : data.separator
		};
		renderRename();
	}

	function plainInput(value, className, placeholder, label, onInput) {
		var input = el('input', 'cfg-input' + (className ? ' ' + className : ''));

		input.type = 'text';
		input.value = value;
		input.placeholder = placeholder;
		input.spellcheck = false;
		input.setAttribute('aria-label', label);
		input.disabled = !state.available;
		input.addEventListener('input', function () {
			onInput(input.value);
			updateDirty();
			testRename();
		});

		return input;
	}

	function renderRename() {
		if (!state.rename) return;

		var types = $('type-list');
		var fixed = $('fixed-list');

		types.textContent = '';
		fixed.textContent = '';

		state.rename.types.forEach(function (t, i) {
			var row = el('div', 'rename-row');

			row.appendChild(PAD_SORT.handle());
			row.appendChild(plainInput(t.prefix, 'rename-prefix', 'RDP', 'prefixo do tipo ' + (i + 1), function (v) {
				t.prefix = v;
			}));
			row.appendChild(plainInput(t.comment, null, 'RODAPE', 'comentário do tipo ' + (t.prefix || i + 1), function (v) {
				t.comment = v;
			}));

			var terms = driveField(t.terms, 'rodapé, rdp', 'termos do tipo ' + (t.prefix || i + 1), TAG_ICON, function (v) {
				t.terms = v;
				testRename();
			}, function () {
				state.rename.types.splice(i, 1);
				renderRename();
				updateDirty();
				testRename();
			});

			terms.querySelector('input').title = 'palavras separadas por vírgula (o plural com S também vale)';
			row.appendChild(terms);
			types.appendChild(row);
		});

		state.rename.fixed.forEach(function (f, i) {
			var row = el('div', 'drive-row is-fixed');

			row.appendChild(plainInput(f.match, null, 'quando o nome contém… (ex: LOGO GLOBO)', 'termo do nome fixo ' + (i + 1), function (v) {
				f.match = v;
			}));
			row.appendChild(driveField(f.name, 'a comp se chama…', 'nome fixo ' + (i + 1), TAG_ICON, function (v) {
				f.name = v;
				testRename();
			}, function () {
				state.rename.fixed.splice(i, 1);
				renderRename();
				updateDirty();
				testRename();
			}));
			fixed.appendChild(row);
		});

		['btn-new-type', 'btn-new-fixed'].forEach(function (id) {
			$(id).disabled = !state.available;
		});
		$('rename-special').checked = state.rename.removeSpecial;
		$('rename-special').disabled = !state.available;
		if ($('rename-sep').value !== state.rename.separator) $('rename-sep').value = state.rename.separator;
		$('rename-sep').disabled = !state.available;
		$('rename-case').value = state.rename.textCase;
		$('rename-case').disabled = !state.available;
		PAD_DROPDOWN.refresh($('rename-case'));
		testRename();
	}

	// Prévia do renomear com a tabela em edição (a mesma regra do host, rename lib.js), só pelo nome da comp:
	// os termos aceitam acentos, e o formato (acentos e caixa) vale para a parte descritiva do nome.
	var RENAME_SEP = '[\\s_\\-]';
	var RENAME_ACCENTS = { A: 'Aaàáâãä', E: 'Eeèéêë', I: 'Iiìíîï', O: 'Ooòóôõö', U: 'Uuùúûü', C: 'Ccç', N: 'Nnñ' };

	function renameNorm(str) {
		return String(str).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, ' ').replace(/[\s_]+/g, ' ').trim();
	}

	function renameEscape(str) {
		return renameNorm(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function renameTermRegex(term) {
		var t = renameEscape(term).replace(/[\s_\-]+/g, ' ');

		return t.split('').map(function (c) {
			if (c === ' ') return RENAME_SEP + '+';

			return RENAME_ACCENTS[c] ? '[' + RENAME_ACCENTS[c] + RENAME_ACCENTS[c].toUpperCase() + ']' : c;
		}).join('') + '(S)?';
	}

	function renameFormat(text, options) {
		var t = String(text);

		if (options.removeSpecial) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, ' ');

		t = t.replace(/[\s_]+/g, ' ').trim();

		if (options.textCase === 'upperCase') return t.toUpperCase();
		if (options.textCase === 'lowerCase') return t.toLowerCase();
		if (options.textCase === 'titleCase') return t.toLowerCase().replace(/(^|\s)(\S)/g, function (m, sp, c) {
			return sp + c.toUpperCase();
		});

		return t;
	}

	function previewRename(compName) {
		var data = renameForSave();
		var raw = String(compName).replace(/\s+/g, ' ').trim();
		var types = data.types.map(function (t) {
			return {
				prefix: renameNorm(t.prefix),
				comment: renameNorm(t.comment),
				terms: t.terms.map(renameTermRegex).filter(function (x) {
					return x !== '(S)?';
				})
			};
		});
		var found = null;

		types.some(function (t) {
			return t.terms.some(function (re) {
				if (new RegExp('(^|' + RENAME_SEP + ')(' + re + ')(' + RENAME_SEP + '|$)', 'i').test(raw)) found = t;

				return !!found;
			});
		});

		var result = { name: renameFormat(raw, data), comment: null };

		if (found) {
			var clean = raw;
			var strip = function (terms) {
				terms.forEach(function (re) {
					clean = clean
						.replace(new RegExp('^(' + re + RENAME_SEP + '+)', 'gi'), '')
						.replace(new RegExp(RENAME_SEP + '+' + re + RENAME_SEP + '+', 'gi'), ' ')
						.replace(new RegExp(RENAME_SEP + '+' + re + '$', 'gi'), '')
						.replace(new RegExp('^' + re + '$', 'gi'), '');
				});
			};

			types.forEach(function (t) {
				if (t.prefix) clean = clean.replace(new RegExp('^' + t.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\-]+', 'gi'), '');
				strip(t.terms);
			});
			strip(found.terms);
			clean = renameFormat(clean.replace(/[\s_\-]+/g, ' ').trim(), data);
			result.comment = found.comment;
			result.name = clean && clean.toUpperCase() !== found.prefix ? found.prefix + data.separator + clean : found.prefix;
		}

		var norm = renameNorm(raw);

		data.fixed.some(function (f) {
			var term = renameEscape(f.match).replace(/[\s_\-]+/g, '[\\s_\\-]*');

			if (term && new RegExp(term).test(norm)) {
				result.name = renameNorm(f.name);
				return true;
			}

			return false;
		});

		return result;
	}

	function testRename() {
		var value = $('rename-test').value.trim();
		var out = $('rename-result');

		out.textContent = '';

		if (!value) return;

		var res = previewRename(value);

		out.appendChild(document.createTextNode('→ '));
		out.appendChild(el('b', null, res.name || '(vazio)'));
		out.appendChild(document.createTextNode(res.comment ? '  ·  comentário ' + res.comment : '  ·  nenhum tipo encontrado'));
	}

	function bindRename() {
		$('btn-new-type').addEventListener('click', function () {
			state.rename.types.push({ prefix: '', comment: '', terms: '' });
			renderRename();
			updateDirty();
			$('type-list').lastChild.querySelector('.rename-prefix').focus();
		});

		$('btn-new-fixed').addEventListener('click', function () {
			state.rename.fixed.push({ match: '', name: '' });
			renderRename();
			updateDirty();
			$('fixed-list').lastChild.querySelector('input').focus();
		});

		$('rename-test').addEventListener('input', testRename);

		PAD_DROPDOWN.enhance($('rename-case'));
		$('rename-case').addEventListener('change', function () {
			state.rename.textCase = this.value;
			updateDirty();
			testRename();
		});
		$('rename-sep').addEventListener('input', function () {
			state.rename.separator = this.value;
			updateDirty();
			testRename();
		});
		$('rename-special').addEventListener('change', function () {
			state.rename.removeSpecial = this.checked;
			updateDirty();
			testRename();
		});

		// a ordem dos tipos importa: arrastar pelo puxador reordena
		PAD_SORT.enable($('type-list'), '.rename-row', function (from, to) {
			var moved = state.rename.types.splice(from, 1)[0];

			state.rename.types.splice(to, 0, moved);
			renderRename();
			updateDirty();
		});
	}

	/* =========================================================
	   Organizar: a árvore (esquerda) e os tipos de item (direita),
	   com arrastar e soltar por eventos de mouse (o CEP não entrega
	   os de ponteiro nem o arrastar nativo)
	   ========================================================= */

	var FOLDER_PATH = 'M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z';
	var TYPES = [
		['render', 'comps de render', ['M3.5 6.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', 'M10 9.5v5l4.5-2.5z']],
		['editaveis', 'comps editáveis', ['M3.5 6.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v5', 'M3.5 6.5v11a2 2 0 0 0 2 2h5', 'M14.5 20.5v-2.6l5-5a1.8 1.8 0 0 1 2.6 2.6l-5 5z']],
		['precomps', 'outras comps', ['M3.5 6.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', 'M7.5 4.5v15M16.5 4.5v15']],
		['videos', 'vídeos', ['M4 6.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M16 10l4-2.5v9L16 14']],
		['imagens', 'imagens', ['M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'm4.5 16 4.5-4.5 4 4 2.5-2.5 4 4', 'M15 9h.01']],
		['audio', 'áudio', ['M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2']],
		['solidos', 'sólidos', ['M5 5h14v14H5z']],
		['dados', 'dados', ['M4 5.5h16v13H4z', 'M4 10h16M4 14.5h16M10 5.5v13']],
		['missing', 'arquivos ausentes', ['M12 4 3 19.5h18z', 'M12 10v4.5M12 17.5h.01']]
	];

	function setOrganize(o) {
		var data = o || {};

		state.organize = {
			folders: (data.folders || []).map(function (f) {
				return { name: f.name || '', parent: f.parent || '', contents: (f.contents || (f.content ? [f.content] : [])).slice() };
			}),
			renderComments: (data.renderComments || []).join(', '),
			editComments: (data.editComments || ['EDIT']).join(', '),
			autoComment: data.autoComment || '',
			dataExtensions: (data.dataExtensions || []).join(', '),
			commentSubfolders: data.commentSubfolders !== false
		};
		renderOrganize();
	}

	// Árvore de pastas com tipos de item arrastáveis (organizar e coletar usam a mesma).
	// cfg: { model() → { folders }, types, treeId, typesId, paneId, newBtnId, rootLabel, rootWhere,
	//        removeTitle, rowHint(folder, depth) → nó | null, after() (depois de redesenhar) }
	function makeTree(cfg) {
		function M() {
			return cfg.model();
		}

		function renderAll() {
			render();
			if (cfg.after) cfg.after();
		}

		function typeLabel(key) {
			var t = cfg.types.filter(function (x) {
				return x[0] === key;
			})[0];

			return t ? t[1] : key;
		}

		function sameName(a, b) {
			return String(a).trim().toUpperCase() === String(b).trim().toUpperCase();
		}

		function folderByName(name) {
			return M().folders.filter(function (f) {
				return sameName(f.name, name);
			})[0] || null;
		}

		// a pasta e as que estão dentro dela (em qualquer nível)
		function subtree(folder) {
			var out = [folder];

			for (var i = 0; i < out.length; i++) {
				M().folders.forEach(function (f) {
					if (out.indexOf(f) < 0 && f.parent && sameName(f.parent, out[i].name)) out.push(f);
				});
			}

			return out;
		}

		// ordem de árvore: cada pasta logo depois da pasta pai, com a profundidade (para o recuo)
		function folderTree() {
			var folders = M().folders;
			var out = [];
			var placed = [];

			function add(parentName, depth) {
				folders.forEach(function (f) {
					if (placed.indexOf(f) >= 0) return;

					var isRoot = f.parent === '' || !folderByName(f.parent) || sameName(f.parent, f.name);

					if (parentName === null ? isRoot : sameName(f.parent, parentName)) {
						placed.push(f);
						out.push({ folder: f, depth: depth });
						if (depth < 12) add(f.name, depth + 1);
					}
				});
			}

			add(null, 0);
			folders.forEach(function (f) {
				if (placed.indexOf(f) < 0) out.push({ folder: f, depth: 0 }); // ciclo: aparece na raiz (o salvar avisa)
			});

			return out;
		}

		function folderOf(type) {
			return M().folders.filter(function (f) {
				return f.contents.indexOf(type) >= 0;
			})[0] || null;
		}

		function svgIcon(paths) {
			var node = svg(paths);

			node.setAttribute('aria-hidden', 'true');

			return node;
		}

		function chip(type, onRemove) {
			var node = el('span', 'org-chip');
			var x = el('button');

			node.setAttribute('data-type', type);
			node.appendChild(svgIcon(cfg.types.filter(function (t) {
				return t[0] === type;
			})[0][2]));
			node.appendChild(document.createTextNode(typeLabel(type)));
			x.type = 'button';
			x.title = cfg.removeTitle;
			x.setAttribute('aria-label', 'tirar ' + typeLabel(type) + ' da pasta');
			x.appendChild(svgIcon(ICONS.remove));
			x.addEventListener('click', onRemove);
			node.appendChild(x);

			return node;
		}

		function unassign(type) {
			M().folders.forEach(function (f) {
				var i = f.contents.indexOf(type);

				if (i >= 0) f.contents.splice(i, 1);
			});
		}

		function render() {
			if (!M()) return;

			var tree = $(cfg.treeId);
			var o = M();
			var scroll = tree.scrollTop;

			tree.textContent = '';

			// a raiz do projeto: recebe pastas soltas aqui e mostra os tipos que não entram em pasta nenhuma
			var root = el('div', 'org-folder is-root');
			var rootChips = el('div', 'org-chips');

			root.setAttribute('data-root', '1');
			root.appendChild(svgIcon(['M3.5 7.5A2 2 0 0 1 5.5 5.5h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', 'M3.5 9.5h17']));
			root.appendChild(el('span', 'org-root-label', cfg.rootLabel));
			cfg.types.forEach(function (t) {
				if (!folderOf(t[0])) rootChips.appendChild(chip(t[0], function () { }));
			});
			Array.prototype.forEach.call(rootChips.querySelectorAll('button'), function (b) {
				b.remove(); // na raiz não há o que tirar
			});
			rootChips.style.paddingLeft = '22px';
			root.appendChild(rootChips);
			tree.appendChild(root);

			folderTree().forEach(function (item) {
				var f = item.folder;
				var row = el('div', 'org-folder' + (item.depth ? ' is-child' : ''));
				var name = el('input', 'org-name');
				var remove = el('button', 'org-remove');
				var chips = el('div', 'org-chips');

				row.setAttribute('data-index', o.folders.indexOf(f));
				row.style.setProperty('--depth', item.depth + 1);
				row.appendChild(PAD_SORT.handle());
				row.appendChild(svgIcon([FOLDER_PATH]));

				name.type = 'text';
				name.value = f.name;
				name.placeholder = 'nome da pasta';
				name.spellcheck = false;
				name.disabled = !state.available;
				name.setAttribute('aria-label', 'nome da pasta');
				name.addEventListener('input', function () {
					// renomear leva as subpastas junto
					o.folders.forEach(function (child) {
						if (child !== f && child.parent && sameName(child.parent, f.name)) child.parent = name.value.trim();
					});
					f.name = name.value;
					renderTypes();
					updateDirty();
				});
				row.appendChild(name);

				remove.type = 'button';
				remove.title = 'excluir a pasta (as subpastas e os tipos sobem um nível)';
				remove.setAttribute('aria-label', 'excluir a pasta ' + f.name);
				remove.disabled = !state.available;
				remove.appendChild(svgIcon(ICONS.remove));
				remove.addEventListener('click', function () {
					var up = folderByName(f.parent);

					o.folders.forEach(function (child) {
						if (child !== f && sameName(child.parent, f.name)) child.parent = f.parent;
					});
					if (up) up.contents = up.contents.concat(f.contents);
					o.folders.splice(o.folders.indexOf(f), 1);
					renderAll();
					updateDirty();
				});
				row.appendChild(remove);

				f.contents.forEach(function (type) {
					chips.appendChild(chip(type, function () {
						unassign(type);
						renderAll();
						updateDirty();
					}));
				});
				row.appendChild(chips);
				tree.appendChild(row);

				if (cfg.rowHint) {
					var hintNode = cfg.rowHint(f, item.depth);

					if (hintNode) tree.appendChild(hintNode);
				}
			});

			tree.scrollTop = scroll;
			renderTypes();

		}

		// os cartões dos tipos (direita), com o lugar de cada um
		function renderTypes() {
			var box = $(cfg.typesId);

			box.textContent = '';

			cfg.types.forEach(function (t) {
				var card = el('div', 'org-type');
				var text = el('span', 'org-type-text');
				var where = folderOf(t[0]);

				card.setAttribute('data-type', t[0]);
				card.title = 'arraste para uma pasta da árvore';
				card.appendChild(svgIcon(t[2]));
				text.appendChild(el('strong', null, t[1]));
				text.appendChild(el('span', null, where ? 'em ' + (where.name.trim() || '(sem nome)') : (cfg.whereFor && cfg.whereFor(t[0])) || cfg.rootWhere));
				card.appendChild(text);
				box.appendChild(card);
			});
		}

		/* ---------- arrastar ---------- */

		var drag = null; // { kind: 'folder' | 'type', folder, type, x, y, active, ghost, target }

		function dropTarget(x, y) {
			var hit = document.elementFromPoint(x, y);

			if (!hit) return null;

			var tree = $(cfg.treeId);
			var row = hit.closest('.org-folder');

			if (drag.kind === 'type') {
				if (row && row.hasAttribute('data-index')) return { mode: 'inside', folder: M().folders[+row.getAttribute('data-index')], row: row };
				if ((row && row.hasAttribute('data-root')) || hit.closest('.org-side') || hit.closest('.org-tree')) return { mode: 'root' };

				return null;
			}

			if (row && row.hasAttribute('data-index')) {
				var target = M().folders[+row.getAttribute('data-index')];
				var box = row.getBoundingClientRect();
				var rel = (y - box.top) / box.height;
				var mode = rel < 0.28 ? 'before' : rel > 0.72 ? 'after' : 'inside';

				if (subtree(drag.folder).indexOf(target) >= 0) return null; // não entra nela mesma

				return { mode: mode, folder: target, row: row };
			}

			if ((row && row.hasAttribute('data-root')) || (hit.closest('.org-tree') === tree)) return { mode: 'root' };

			return null;
		}

		function showTarget(t) {
			var tree = $(cfg.treeId);
			var line = tree.querySelector('.org-line');

			Array.prototype.forEach.call(tree.querySelectorAll('.is-drop-inside'), function (r) {
				r.classList.remove('is-drop-inside');
			});
			$(cfg.paneId).querySelector('.org-side').classList.toggle('is-drop-target', !!(t && t.mode === 'root' && drag.kind === 'type'));

			if (!t) {
				if (line) line.remove();
				return;
			}

			if (t.mode === 'inside') t.row.classList.add('is-drop-inside');
			if (t.mode === 'root') tree.querySelector('[data-root]').classList.add('is-drop-inside');

			if (t.mode === 'before' || t.mode === 'after') {
				if (!line) {
					line = el('div', 'org-line');
					tree.appendChild(line);
				}

				var treeBox = tree.getBoundingClientRect();
				var rowBox = t.row.getBoundingClientRect();

				line.style.left = rowBox.left - treeBox.left + 'px';
				line.style.width = rowBox.width + 'px';
				line.style.top = (t.mode === 'before' ? rowBox.top : rowBox.bottom) - treeBox.top + tree.scrollTop - 1 + 'px';
			} else if (line) {
				line.remove();
			}
		}

		function applyDrop(t) {
			var o = M();

			if (drag.kind === 'type') {
				unassign(drag.type);
				if (t.mode === 'inside') t.folder.contents.push(drag.type);
				return;
			}

			var f = drag.folder;

			o.folders.splice(o.folders.indexOf(f), 1);

			if (t.mode === 'inside') {
				f.parent = t.folder.name.trim();
				o.folders.push(f);
			} else if (t.mode === 'root') {
				f.parent = '';
				o.folders.push(f);
			} else {
				f.parent = t.folder.parent;
				o.folders.splice(o.folders.indexOf(t.folder) + (t.mode === 'after' ? 1 : 0), 0, f);
			}
		}

		function onDragMove(e) {
			if (!drag) return;

			if (!drag.active) {
				if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 5) return;

				drag.active = true;
				drag.ghost = el('div', 'org-ghost', drag.kind === 'folder' ? (drag.folder.name.trim() || 'pasta') : typeLabel(drag.type));
				document.body.appendChild(drag.ghost);
				document.body.classList.add('is-org-dragging');
			}

			e.preventDefault();
			drag.ghost.style.left = e.clientX + 'px';
			drag.ghost.style.top = e.clientY + 'px';
			drag.lastX = e.clientX;
			drag.lastY = e.clientY;
			drag.target = dropTarget(e.clientX, e.clientY);
			showTarget(drag.target);
			autoScroll();
		}

		// perto das bordas da árvore, ela rola sozinha enquanto o arrasto continua
		function autoScroll() {
			clearTimeout(drag.scrollTimer);

			var tree = $(cfg.treeId);
			var box = tree.getBoundingClientRect();
			var y = drag.lastY;
			var step = 0;

			if (drag.lastX < box.left || drag.lastX > box.right) return;
			if (y < box.top + 28 && y > box.top - 40) step = -8;
			if (y > box.bottom - 28 && y < box.bottom + 40) step = 8;
			if (!step) return;

			tree.scrollTop += step;
			drag.target = dropTarget(drag.lastX, drag.lastY);
			showTarget(drag.target);
			drag.scrollTimer = setTimeout(function () {
				if (drag && drag.active) autoScroll();
			}, 30);
		}

		function endDrag(e, cancel) {
			window.removeEventListener('mousemove', onDragMove, true);
			window.removeEventListener('mouseup', onDragUp, true);
			window.removeEventListener('keydown', onDragKey, true);

			if (!drag) return;

			var d = drag;

			clearTimeout(d.scrollTimer);
			if (d.ghost) d.ghost.remove();
			document.body.classList.remove('is-org-dragging');
			showTarget(null);
			drag = null;

			if (d.active && !cancel && d.target) {
				drag = d;
				applyDrop(d.target);
				drag = null;
				renderAll();
				updateDirty();
			}
		}

		function onDragUp(e) {
			endDrag(e, false);
		}

		function onDragKey(e) {
			if (e.key === 'Escape') {
				e.preventDefault();
				endDrag(e, true);
			}
		}

		function startDrag(e, data) {
			if (e.button !== 0 || !state.available) return;

			e.preventDefault();
			drag = Object.assign({ x: e.clientX, y: e.clientY, active: false, target: null }, data);
			window.addEventListener('mousemove', onDragMove, true);
			window.addEventListener('mouseup', onDragUp, true);
			window.addEventListener('keydown', onDragKey, true);
		}

		function bind() {
			// pastas: pelo puxador (ou pelo ícone); tipos: pelas etiquetas da árvore e pelos cartões da direita
			$(cfg.paneId).addEventListener('mousedown', function (e) {
				if (e.target.closest('button:not(.drag-handle), input')) return;

				var row = e.target.closest('.org-folder[data-index]');
				var tag = e.target.closest('.org-chip, .org-type');

				if (tag) return startDrag(e, { kind: 'type', type: tag.getAttribute('data-type') });
				if (row && e.target.closest('.drag-handle, svg')) startDrag(e, { kind: 'folder', folder: M().folders[+row.getAttribute('data-index')] });
			});

			$(cfg.newBtnId).addEventListener('click', function () {
				var name = 'NOVA PASTA';

				for (var n = 2; folderByName(name); n++) name = 'NOVA PASTA ' + n;

				M().folders.push({ name: name, parent: '', contents: [] });
				renderAll();
				updateDirty();

				var inputs = $(cfg.treeId).querySelectorAll('.org-name');
				var last = inputs[inputs.length - 1];

				last.focus();
				last.select();
			});

		}

		return { render: renderAll, bind: bind };
	}

	var orgTree = makeTree({
		model: function () {
			return state.organize;
		},
		types: TYPES,
		treeId: 'org-tree',
		typesId: 'org-types',
		paneId: 'pane-organize',
		newBtnId: 'btn-new-folder',
		rootLabel: 'raiz do projeto',
		rootWhere: 'na raiz do projeto',
		removeTitle: 'tirar da pasta (vai para a raiz)',
		whereFor: function (type) {
			return type === 'editaveis' ? 'sem pasta: ficam com as outras comps' : null;
		},
		rowHint: function (f, depth) {
			var o = state.organize;

			// os comentários dos itens viram subpastas desta pasta (se ligado): uma subpasta "fantasma" mostra isso
			if (!o.commentSubfolders || !f.contents.length) return null;

			var sub = el('div', 'org-sub-hint');
			var example = f.contents.indexOf('render') >= 0 ? ' (RODAPE, CARTAO…)' : '';
			var icon = svg([FOLDER_PATH]);

			icon.setAttribute('aria-hidden', 'true');
			sub.style.setProperty('--depth', depth + 2);
			sub.title = 'itens com comentário ficam numa subpasta com o nome do comentário (desligue em "o comentário vira subpasta", à direita)';
			sub.appendChild(icon);
			sub.appendChild(el('span', null, 'comentários viram subpastas' + example));

			return sub;
		},
		after: organizeFields
	});

	function renderOrganize() {
		orgTree.render();
	}

	// os campos à direita (comentários de render, extensões...)
	function organizeFields() {
		var o = state.organize;
		var fields = { 'org-render': 'renderComments', 'org-edit': 'editComments', 'org-auto': 'autoComment', 'org-data': 'dataExtensions' };

		Object.keys(fields).forEach(function (id) {
			if ($(id).value !== o[fields[id]]) $(id).value = o[fields[id]];
			$(id).disabled = !state.available;
		});
		$('org-sub').checked = o.commentSubfolders;
		$('org-sub').disabled = !state.available;
		$('btn-new-folder').disabled = !state.available;
	}

	function bindOrganize() {
		orgTree.bind();

		[['org-render', 'renderComments'], ['org-edit', 'editComments'], ['org-auto', 'autoComment'], ['org-data', 'dataExtensions']].forEach(function (pair) {
			$(pair[0]).addEventListener('input', function () {
				state.organize[pair[1]] = this.value;
				updateDirty();
			});
		});

		$('org-sub').addEventListener('change', function () {
			state.organize.commentSubfolders = this.checked;
			renderOrganize();
			updateDirty();
		});
	}

	/* =========================================================
	   Coletar: a árvore dentro da pasta do projeto (a mesma do
	   organizar); tipo na raiz = não é coletado
	   ========================================================= */

	var COLLECT_TYPES = [
		['videos', 'vídeos', TYPES.filter(function (t) { return t[0] === 'videos'; })[0][2]],
		['sequencias', 'sequências de imagens', ['M8 4.5h10.5a1.5 1.5 0 0 1 1.5 1.5v10.5', 'M5.5 7h11a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19.5v-11A1.5 1.5 0 0 1 5.5 7z', 'm4.5 18 4-4 3.5 3.5 2-2 3.5 3.5']],
		['imagens', 'imagens', TYPES.filter(function (t) { return t[0] === 'imagens'; })[0][2]],
		['audio', 'áudio', TYPES.filter(function (t) { return t[0] === 'audio'; })[0][2]],
		['dados', 'dados', TYPES.filter(function (t) { return t[0] === 'dados'; })[0][2]],
		['fontes', 'fontes', ['M5 8V5.5h14V8M12 5.5v13M9 18.5h6']]
	];

	function setCollect(c) {
		var data = c || {};

		state.collect = {
			folders: (data.folders || []).map(function (f) {
				return { name: f.name || '', parent: f.parent || '', contents: (f.contents || []).slice() };
			}),
			projectFolders: data.projectFolders === true,
			saveAfter: data.saveAfter !== false
		};
		renderCollect();
	}

	var colTree = makeTree({
		model: function () {
			return state.collect;
		},
		types: COLLECT_TYPES,
		treeId: 'col-tree',
		typesId: 'col-types',
		paneId: 'pane-collect',
		newBtnId: 'btn-new-col-folder',
		rootLabel: 'pasta do projeto',
		rootWhere: 'não é coletado',
		removeTitle: 'tirar da pasta (não é coletado)',
		rowHint: function (f, depth) {
			var notes = [];

			if (f.contents.indexOf('sequencias') >= 0) notes.push('uma subpasta por sequência');
			if (state.collect.projectFolders && f.contents.some(function (t) { return t !== 'fontes'; })) notes.push('as pastas do painel de projeto');
			if (!notes.length) return null;

			var sub = el('div', 'org-sub-hint');
			var icon = svg([FOLDER_PATH]);

			icon.setAttribute('aria-hidden', 'true');
			sub.style.setProperty('--depth', depth + 2);
			sub.appendChild(icon);
			sub.appendChild(el('span', null, notes.join(' · ')));

			return sub;
		},
		after: function () {
			$('col-project-folders').checked = state.collect.projectFolders;
			$('col-save').checked = state.collect.saveAfter;
			['col-project-folders', 'col-save', 'btn-new-col-folder'].forEach(function (id) {
				$(id).disabled = !state.available;
			});
		}
	});

	function renderCollect() {
		colTree.render();
	}

	function bindCollect() {
		colTree.bind();

		$('col-project-folders').addEventListener('change', function () {
			state.collect.projectFolders = this.checked;
			renderCollect();
			updateDirty();
		});

		$('col-save').addEventListener('change', function () {
			state.collect.saveAfter = this.checked;
			updateDirty();
		});
	}

	/* =========================================================
	   Ferramentas: a ordem da barra (arrastar), mostrar / esconder
	   e separadores entre os grupos
	   ========================================================= */

	var DEFAULT_BAR = ['templates', 'fontes', 'divider', 'projeto', 'coletar', 'pastas', 'divider', 'renomear', 'organizar', 'divider', 'buscar'];

	// nome, o que os cliques fazem e o ícone (os mesmos traços da barra)
	var TOOL_INFO = {
		templates: ['Templates', 'preencher templates · criar novo template', ['M6 4.5h12a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 17V7A2.5 2.5 0 0 1 6 4.5z', 'M3.5 9.5h17M9 9.5v10']],
		fontes: ['Fontes', 'instalar as fontes do template · collect das fontes', ['M5 8V5.5h14V8M12 5.5v13M9 18.5h6']],
		projeto: ['Projeto', 'janela do projeto · salvar na pasta da retranca', ['M5 10h14.5v8a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18v-8z', 'M4.6 6h14.8a1.1 1.1 0 0 1 1.1 1.1V10h-17V7.1A1.1 1.1 0 0 1 4.6 6z', 'm8.6 6-2 4M13.6 6l-2 4M18.6 6l-2 4']],
		coletar: ['Coletar', 'coletar na pasta do projeto · em outra pasta', ['M3.5 18V7.6A1.5 1.5 0 0 1 5 6.1h.4', 'M6 11.5V4a1 1 0 0 1 1-1h4.6l2.7 2.7v5.8', 'M3.5 11.5h17V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z']],
		pastas: ['Pastas', 'pasta do último output · conversor de caminhos', ['M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h6.5A1.5 1.5 0 0 1 19 10v1.5', 'M3.5 11.5h17V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z']],
		renomear: ['Renomear', 'renomear comps · renomear as saídas de render', ['M5.5 6.5h13a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-13a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3z', 'M6 12h2.4M10.3 12h2.4M14.6 12h2.4M18.6 9.6v4.8']],
		organizar: ['Organizar', 'organizar o projeto · criar as pastas', ['m12 3-8.5 4.25L12 11.5l8.5-4.25z', 'm3.5 12 8.5 4.25L20.5 12', 'm3.5 16.5 8.5 4.25 8.5-4.25']],
		buscar: ['Buscar', 'busca de caminhos · busca em textos', ['M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z', 'm15 15 5 5']]
	};

	function setBar(b) {
		var data = b || {};

		state.bar = {
			items: (data.items && data.items.length ? data.items : DEFAULT_BAR).slice(),
			hidden: (data.hidden || []).slice()
		};
		renderTools();
	}

	function toggleHidden(key, show) {
		state.bar.hidden = state.bar.hidden.filter(function (k) {
			return k !== key;
		});

		if (!show) state.bar.hidden.push(key);
	}

	function renderTools() {
		var list = $('tool-list');

		if (!list) return;

		var disabled = !state.available;

		list.textContent = '';
		$('bar-links').checked = state.bar.hidden.indexOf('links') < 0;
		$('bar-links').disabled = disabled;
		$('btn-new-divider').disabled = disabled;

		state.bar.items.forEach(function (key, i) {
			var row = el('div', 'tool-row');

			row.appendChild(PAD_SORT.handle());

			if (key === 'divider') {
				var remove = miniButton('remove', 'tirar o separador', function () {
					state.bar.items.splice(i, 1);
					renderTools();
					updateDirty();
				});

				row.classList.add('is-divider');
				row.appendChild(el('span', 'tool-divider-line', 'separador'));
				remove.disabled = disabled;
				row.appendChild(remove);
				list.appendChild(row);
				return;
			}

			var info = TOOL_INFO[key] || [key, '', []];
			var icon = el('span', 'tool-icon');
			var text = el('span', 'tool-text');
			var label = el('label', 'cfg-switch');
			var input = el('input');
			var shown = state.bar.hidden.indexOf(key) < 0;
			var ico = svg(info[2]);

			ico.setAttribute('aria-hidden', 'true');
			icon.appendChild(ico);
			text.appendChild(el('strong', null, info[0]));
			text.appendChild(el('span', null, info[1]));
			input.type = 'checkbox';
			input.checked = shown;
			input.disabled = disabled;
			input.addEventListener('change', function () {
				toggleHidden(key, input.checked);
				row.classList.toggle('is-off', !input.checked);
				updateDirty();
			});
			label.title = 'mostrar ' + info[0] + ' na barra (de todo mundo)';
			label.appendChild(input);
			label.appendChild(el('span', 'cfg-switch-track'));
			row.classList.toggle('is-off', !shown);
			row.appendChild(icon);
			row.appendChild(text);
			row.appendChild(label);
			list.appendChild(row);
		});
	}

	function bindTools() {
		$('bar-links').addEventListener('change', function () {
			toggleHidden('links', this.checked);
			updateDirty();
		});

		// um separador novo entra no fim; arraste para o lugar
		$('btn-new-divider').addEventListener('click', function () {
			state.bar.items.push('divider');
			renderTools();
			updateDirty();
			$('tool-list').lastChild.scrollIntoView({ block: 'nearest' });
		});

		PAD_SORT.enable($('tool-list'), '.tool-row', function (from, to) {
			var moved = state.bar.items.splice(from, 1)[0];

			state.bar.items.splice(to, 0, moved);
			renderTools();
			updateDirty();
		});
	}

	/* =========================================================
	   Busca de caminhos
	   ========================================================= */

	function setSearch(sc) {
		var data = sc || {};
		var labels = {};

		(data.labels || []).forEach(function (l) {
			labels[l.key] = l.label;
		});

		state.search = { source: data.source === 'file' ? 'file' : 'webhook', webhook: data.webhook || '', file: data.file || '', labels: labels };
		renderSearch();
	}

	// nome automático (o mesmo do host): sem 'atracoes_', '_' vira espaço, maiúsculas
	function autoLabel(key) {
		return key.replace(/^atracoes_/, '').replace(/_/g, ' ').toUpperCase();
	}

	function renderSearch() {
		var hook = $('search-webhook');
		var list = $('category-list');

		if (hook.value !== state.search.webhook) hook.value = state.search.webhook;
		hook.disabled = !state.available;

		var fromFile = state.search.source === 'file';
		var file = $('search-file');

		Array.prototype.forEach.call(document.querySelectorAll('input[name="search-source"]'), function (radio) {
			radio.checked = radio.value === state.search.source;
			radio.disabled = !state.available;
		});
		if (file.value !== state.search.file) file.value = state.search.file;
		file.disabled = $('search-file-pick').disabled = !state.available;
		$('search-webhook-field').hidden = fromFile;
		$('search-file-field').hidden = !fromFile;
		$('search-source-hint').textContent = fromFile
			? 'um arquivo JSON no mesmo formato que o webhook devolveria ({ "categoria": [ { "atracao", "mac": { "caminho" }, "win": { "caminho" } } ] }). ele é relido a cada 30 s.'
			: 'o índice é pedido ao endereço a cada 30 s (e guardado no computador entre um pedido e outro).';
		$('btn-categories').textContent = fromFile ? 'atualizar as categorias pelo arquivo' : 'atualizar as categorias pelo webhook';
		$('btn-categories').disabled = !state.available;
		list.textContent = '';

		if (!state.categories) {
			list.appendChild(el('p', 'category-empty', state.categoriesError || 'lendo as categorias do índice…'));
			return;
		}

		// as do índice, na ordem dele; depois as que só têm nome guardado (não vieram agora)
		var rows = state.categories.map(function (c) {
			return { key: c.key, auto: c.auto, count: c.count };
		});

		Object.keys(state.search.labels).forEach(function (key) {
			if (!rows.some(function (r) { return r.key === key; })) rows.push({ key: key, auto: autoLabel(key), count: 0, missing: true });
		});

		if (!rows.length) list.appendChild(el('p', 'category-empty', 'o índice não tem categorias.'));

		rows.forEach(function (r) {
			var row = el('div', 'category-row' + (r.missing ? ' is-missing' : ''));
			var key = el('span', 'category-key', r.key);
			var field = el('div', 'has-field-icon');
			var input = el('input', 'cfg-input');
			var icon = svg(TAG_ICON);

			key.title = r.missing ? 'esta categoria não veio no índice agora' : 'categoria no índice';
			icon.setAttribute('class', 'field-icon');
			input.type = 'text';
			input.value = state.search.labels[r.key] || '';
			input.placeholder = r.auto;
			input.spellcheck = false;
			input.disabled = !state.available;
			input.setAttribute('aria-label', 'nome de exibição de ' + r.key);
			input.addEventListener('input', function () {
				if (input.value.trim()) state.search.labels[r.key] = input.value;
				else delete state.search.labels[r.key];
				updateDirty();
			});
			field.appendChild(icon);
			field.appendChild(input);
			row.appendChild(key);
			row.appendChild(field);
			row.appendChild(el('span', 'category-count', r.missing ? 'não veio' : r.count + (r.count === 1 ? ' item' : ' itens')));
			list.appendChild(row);
		});
	}

	async function loadCategories(force) {
		var btn = $('btn-categories');

		btn.disabled = true;
		btn.textContent = force ? 'baixando o índice…' : 'lendo…';

		try {
			var res = await call('searchCategories', { force: !!force });

			state.categories = res.categories;
			state.categoriesError = '';
		} catch (err) {
			state.categoriesError = err.message;
			if (force) toast('error', err.message);
		} finally {
			btn.disabled = !state.available;
			btn.textContent = state.search.source === 'file' ? 'atualizar as categorias pelo arquivo' : 'atualizar as categorias pelo webhook';
			renderSearch();
		}
	}

	function bindSearch() {
		$('search-webhook').addEventListener('input', function () {
			state.search.webhook = this.value;
			this.classList.remove('has-error');
			updateDirty();
		});
		$('btn-categories').addEventListener('click', function () {
			loadCategories(true);
		});

		$('search-source').addEventListener('change', function (e) {
			if (e.target.name !== 'search-source') return;

			state.search.source = e.target.value;
			renderSearch();
			updateDirty();
		});

		$('search-file').addEventListener('input', function () {
			state.search.file = this.value;
			updateDirty();
		});

		$('search-file-pick').addEventListener('click', async function () {
			var picked = PAD_BRIDGE.pickFile('Selecione o arquivo de índice', ['json']);

			if (!picked) return;

			try {
				picked = (await call('canonicalPath', { path: picked })).path || picked;
			} catch (err) { }

			state.search.file = $('search-file').value = picked;
			updateDirty();
		});
	}

	/* =========================================================
	   Links da barra
	   ========================================================= */

	var GLOBE_ICON = ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5s1.2-6.2 3.6-8.5z'];
	var LINK_ICON = ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'];

	function setLinks(list) {
		state.links = (list || []).map(function (l) {
			return { name: l.name || '', url: l.url || '', icon: l.icon || '' };
		});
		renderLinks();
	}

	function faviconUrl(url) {
		var m = /^(https?:\/\/[^\/?#]+)/i.exec(String(url).trim());

		return m ? m[1] + '/favicon.ico' : '';
	}

	// o ícone do link: o escolhido, o favicon do site ou, sem nenhum, o desenho de link
	function linkIconContent(box, link) {
		var src = PAD_UTIL.decodeIcon(link.icon) || faviconUrl(link.url);

		box.textContent = '';

		if (!src) return box.appendChild(svg(LINK_ICON));

		var img = el('img');

		img.alt = '';
		img.addEventListener('error', function () {
			box.textContent = '';
			box.appendChild(svg(LINK_ICON));
		});
		img.src = src;
		box.appendChild(img);
	}

	var PERSON_BADGE = '<svg viewBox="0 0 11 11" aria-hidden="true"><circle class="badge-bg" cx="5.5" cy="5.5" r="5.5" /><circle cx="5.5" cy="4" r="1.5" /><path d="M2.9 9.17C3.2 7.3 4.3 6.6 5.5 6.6S7.8 7.3 8.1 9.17A4.5 4.5 0 0 1 2.9 9.17z" /></svg>';

	function renderLinks() {
		renderLinkList(state.links, 'link-list', false);
		renderLinkList(state.personal, 'personal-list', true);
		$('btn-new-link').disabled = !state.available;
	}

	// 'personal': os links do usuário (editáveis mesmo sem a lista da rede)
	function renderLinkList(links, listId, personal) {
		var list = $(listId);
		var enabled = personal || state.available;

		list.textContent = '';

		links.forEach(function (link, i) {
			var row = el('div', 'link-row');
			var iconWrap = el('div', 'link-icon');
			var iconBtn = el('button', 'prod-icon');
			var name = el('input', 'cfg-input');

			iconBtn.type = 'button';
			iconBtn.title = link.icon ? 'ícone escolhido: clique para trocar' : 'ícone do site (favicon): clique para escolher outra imagem';
			iconBtn.disabled = !enabled;
			linkIconContent(iconBtn, link);
			iconBtn.addEventListener('click', async function () {
				var file = PAD_BRIDGE.pickFile('Selecione o ícone do link', ['png', 'jpg', 'jpeg']);

				if (!file) return;

				try {
					link.icon = await imageFileToIcon(file);
					renderLinks();
					updateDirty();
				} catch (err) {
					toast('error', err.message);
				}
			});
			iconWrap.appendChild(iconBtn);

			if (personal) {
				var badge = el('span', 'link-badge');

				badge.innerHTML = PERSON_BADGE;
				iconWrap.appendChild(badge);
			}

			if (link.icon) {
				var reset = el('button', 'link-reset', '↺');

				reset.type = 'button';
				reset.title = 'voltar para o ícone do site';
				reset.setAttribute('aria-label', 'voltar para o ícone do site');
				reset.addEventListener('click', function () {
					link.icon = '';
					renderLinks();
					updateDirty();
				});
				iconWrap.appendChild(reset);
			}

			name.type = 'text';
			name.value = link.name;
			name.placeholder = 'nome (aparece na dica)';
			name.spellcheck = false;
			name.disabled = !enabled;
			name.setAttribute('aria-label', 'nome do link ' + (i + 1));
			name.addEventListener('input', function () {
				link.name = name.value;
				updateDirty();
			});

			var url = driveField(link.url, 'https://site.com/pagina', 'endereço do link ' + (link.name || i + 1), GLOBE_ICON, function (v) {
				link.url = v;
				if (!link.icon) linkIconContent(iconBtn, link); // o favicon acompanha o endereço
			}, function () {
				links.splice(i, 1);
				renderLinks();
				updateDirty();
			});

			if (personal) {
				url.querySelector('input').disabled = false;
				url.querySelector('.mini-button').disabled = false;
			}

			row.appendChild(PAD_SORT.handle());
			row.appendChild(iconWrap);
			row.appendChild(name);
			row.appendChild(url);
			list.appendChild(row);
		});
	}

	function bindLinks() {
		[['btn-new-link', 'link-list', 'links'], ['btn-new-personal', 'personal-list', 'personal']].forEach(function (k) {
			$(k[0]).addEventListener('click', function () {
				state[k[2]].push({ name: '', url: '', icon: '' });
				renderLinks();
				updateDirty();
				$(k[1]).lastChild.querySelector('input.cfg-input').focus();
			});

			PAD_SORT.enable($(k[1]), '.link-row', function (from, to) {
				var moved = state[k[2]].splice(from, 1)[0];

				state[k[2]].splice(to, 0, moved);
				renderLinks();
				updateDirty();
			});
		});
	}

	async function loadPersonal() {
		try {
			state.personal = (await call('personalLinks')).links.map(function (l) {
				return { name: l.name || '', url: l.url || '', icon: l.icon || '' };
			});
		} catch (err) {
			state.personal = [];
		}

		state.personalSnapshot = JSON.stringify(personalForSave());
		renderLinks();
		updateDirty();
	}

	// grava os links pessoais (à parte da lista da rede). Lança o erro do host.
	async function savePersonal() {
		if (!personalDirty()) return false;

		var res = await call('savePersonalLinks', { links: personalForSave() });

		state.personal = res.links.map(function (l) {
			return { name: l.name, url: l.url, icon: l.icon || '' };
		});
		state.personalSnapshot = JSON.stringify(personalForSave());
		renderLinks();

		return true;
	}

	/* =========================================================
	   Aparência
	   ========================================================= */

	function setAppearance(a) {
		state.appearance = Object.assign({}, PAD_THEME.defaults, a || {});
		state.savedAppearance = Object.assign({}, state.appearance);
		renderAppearance();
		PAD_THEME.apply(state.appearance);
	}

	// cada mudança vira prévia nesta janela; as outras mudam ao salvar
	function changeAppearance(key, value) {
		state.appearance[key] = value;
		PAD_THEME.apply(state.appearance);
		renderAppearance();
		updateDirty();
	}

	function renderAppearance() {
		var a = state.appearance;

		if (!a) return;

		[['app-mode', 'mode'], ['app-bg', 'background']].forEach(function (pair) {
			Array.prototype.forEach.call(document.querySelectorAll('input[name="' + pair[0] + '"]'), function (radio) {
				radio.checked = radio.value === a[pair[1]];
				radio.disabled = !state.available;
			});
		});

		Array.prototype.forEach.call(document.querySelectorAll('.app-color input[type="color"]'), function (input) {
			var key = input.getAttribute('data-key');
			var hex = document.querySelector('[data-hex="' + key + '"]');

			input.value = a[key];
			input.disabled = !state.available;
			if (document.activeElement !== hex) hex.value = a[key];
			hex.disabled = !state.available;
		});

		// fundo sólido: as pontas do degradê não valem
		Array.prototype.forEach.call(document.querySelectorAll('.app-color[data-gradient]'), function (box) {
			box.classList.toggle('is-off', a.background === 'solid');
		});

		$('app-font').value = a.font;
		$('app-font').disabled = !state.available;
		PAD_DROPDOWN.refresh($('app-font'));

		var box = $('app-logo-box');
		var logo = a.logo ? PAD_UTIL.decodeIcon(a.logo) : null;
		var img = box.querySelector('img');

		box.querySelector('.appearance-loaf').style.display = logo ? 'none' : '';
		if (logo && !img) {
			img = el('img');
			img.alt = '';
			box.appendChild(img);
		}
		if (img) {
			if (logo) img.src = logo;
			else img.remove();
		}

		['app-logo-pick', 'app-logo-reset', 'app-defaults'].forEach(function (id) {
			$(id).disabled = !state.available;
		});
		$('app-logo-reset').hidden = !a.logo;
	}

	function bindAppearance() {
		[['app-mode', 'mode'], ['app-bg', 'background']].forEach(function (pair) {
			$(pair[0]).addEventListener('change', function (e) {
				if (e.target.name === pair[0]) changeAppearance(pair[1], e.target.value);
			});
		});

		Array.prototype.forEach.call(document.querySelectorAll('.app-color input[type="color"]'), function (input) {
			input.addEventListener('input', function () {
				changeAppearance(input.getAttribute('data-key'), input.value.toLowerCase());
			});
		});

		Array.prototype.forEach.call(document.querySelectorAll('[data-hex]'), function (hex) {
			hex.addEventListener('input', function () {
				var v = hex.value.trim().toLowerCase();

				if (/^#?[0-9a-f]{6}$/.test(v)) changeAppearance(hex.getAttribute('data-hex'), v.charAt(0) === '#' ? v : '#' + v);
			});
			hex.addEventListener('blur', renderAppearance);
		});

		PAD_DROPDOWN.enhance($('app-font'));
		$('app-font').addEventListener('change', function () {
			changeAppearance('font', this.value);
		});

		$('app-logo-pick').addEventListener('click', async function () {
			var file = PAD_BRIDGE.pickFile('Selecione a logo da barra', ['png', 'jpg', 'jpeg']);

			if (!file) return;

			try {
				changeAppearance('logo', await imageFileToIcon(file, true));
			} catch (err) {
				toast('error', err.message);
			}
		});

		$('app-logo-reset').addEventListener('click', function () {
			changeAppearance('logo', '');
		});

		$('app-defaults').addEventListener('click', function () {
			state.appearance = Object.assign({}, PAD_THEME.defaults);
			PAD_THEME.apply(state.appearance);
			renderAppearance();
			updateDirty();
		});
	}

	/* =========================================================
	   Projeto (janela PROJETO): pasta, nomes e retrancas
	   ========================================================= */

	var PROJECT_TOKENS = ['id', 'projeto', 'usuario', 'retranca', 'data'];
	var CODE_ICON = ['M9.5 4 7.5 20M16.5 4l-2 16M4.5 9h15M3.5 15h15'];
	var FOLDER_ICON = ['M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z'];

	function setProject(p) {
		var data = JSON.parse(JSON.stringify(p || {}));

		state.project = {
			root: data.root || '',
			folder: data.folder !== false,
			fileName: data.fileName || '{id} {projeto}',
			retrancas: (data.retrancas || []).map(function (r) {
				return { code: r.code || '', path: r.path || '' };
			})
		};
		renderProject();
	}

	// variável desconhecida no padrão (a janela só aceita as da lista)
	function badToken(pattern) {
		var re = /\{([^}]*)\}/g;
		var m;

		while ((m = re.exec(pattern)) !== null) {
			if (PROJECT_TOKENS.indexOf(m[1]) < 0) return m[0];
		}

		return null;
	}

	// exemplo com um projeto de mentira: EMP123456, "história ao vivo", sigla JBI
	function projectPreview() {
		var p = state.project;
		var first = p.retrancas[0];
		var id = first && first.code ? first.code.toUpperCase() + '123456' : 'EMP123456';
		var values = {
			id: id,
			projeto: renameFormat('história ao vivo', state.rename),
			usuario: 'JBI',
			retranca: first && first.path ? first.path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() : 'em ponto',
			data: new Date().toISOString().slice(0, 10)
		};
		var fill = function (pattern) {
			return pattern.replace(/\{(\w+)\}/g, function (all, t) {
				return values[t] != null ? values[t] : '';
			}).replace(/\s+/g, ' ').replace(/^[\s\-_]+|[\s\-_]+$/g, '');
		};
		var node = $('proj-pattern-preview');
		var bad = badToken(p.fileName);

		node.textContent = '';

		if (bad) {
			node.appendChild(el('span', 'is-error', bad + ' não é uma variável.'));
			return;
		}

		node.appendChild(document.createTextNode('ex. (' + id + ', “história ao vivo”): '));
		node.appendChild(el('b', null, fill(p.fileName) + '.aep'));
	}

	function renderProject() {
		if (!state.project || !$('pane-project')) return;

		var p = state.project;
		var list = $('retranca-list');
		var disabled = !state.available;

		[['proj-root', 'root'], ['proj-file-pattern', 'fileName']].forEach(function (pair) {
			var input = $(pair[0]);

			if (input.value !== p[pair[1]]) input.value = p[pair[1]];
			input.disabled = disabled;
		});
		$('proj-folder').checked = p.folder;
		['proj-folder', 'proj-root-pick', 'btn-new-retranca', 'btn-retrancas-index'].forEach(function (id) {
			$(id).disabled = disabled;
		});

		list.textContent = '';

		p.retrancas.forEach(function (row, i) {
			var box = el('div', 'drive-row is-retranca');
			var code = el('div', 'has-field-icon');
			var input = el('input', 'cfg-input retranca-code');
			var ico = svg(CODE_ICON);

			ico.setAttribute('class', 'field-icon');
			input.type = 'text';
			input.value = row.code;
			input.placeholder = 'COD';
			input.maxLength = 12;
			input.spellcheck = false;
			input.title = 'o começo do ID do projeto';
			input.setAttribute('aria-label', 'código da retranca ' + (i + 1));
			input.disabled = disabled;
			input.addEventListener('input', function () {
				input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
				row.code = input.value;
				box.classList.remove('has-error');
				projectPreview();
				updateDirty();
			});
			code.appendChild(ico);
			code.appendChild(input);
			box.appendChild(code);
			box.appendChild(driveField(row.path, 'JORNAIS/em ponto', 'pasta da retranca ' + (row.code || i + 1), FOLDER_ICON, function (v) {
				row.path = v;
				projectPreview();
			}, function () {
				p.retrancas.splice(i, 1);
				renderProject();
				updateDirty();
			}));
			list.appendChild(box);
		});

		projectPreview();
	}

	function bindProject() {
		[['proj-root', 'root'], ['proj-file-pattern', 'fileName']].forEach(function (pair) {
			$(pair[0]).addEventListener('input', function () {
				state.project[pair[1]] = this.value;
				projectPreview();
				updateDirty();
			});
		});

		[['proj-folder', 'folder']].forEach(function (pair) {
			$(pair[0]).addEventListener('change', function () {
				state.project[pair[1]] = this.checked;
				updateDirty();
			});
		});

		$('proj-root-pick').addEventListener('click', async function () {
			var picked = PAD_BRIDGE.pickFolder('Pasta dos projetos', state.project.root);

			if (!picked) return;

			try {
				picked = (await call('canonicalPath', { path: picked })).path || picked;
			} catch (err) { }

			state.project.root = picked;
			renderProject();
			updateDirty();
		});

		$('btn-new-retranca').addEventListener('click', function () {
			state.project.retrancas.push({ code: '', path: '' });
			renderProject();
			updateDirty();
			$('retranca-list').lastChild.querySelector('input').focus();
		});

		// as entradas "COD - nome" do índice da busca viram retrancas (as que já existem ficam como estão)
		$('btn-retrancas-index').addEventListener('click', async function () {
			var btn = this;

			btn.disabled = true;

			try {
				var res = await call('projectRetrancasFromIndex');
				var have = {};
				var added = 0;

				state.project.retrancas.forEach(function (r) {
					have[r.code.toUpperCase()] = true;
				});
				res.retrancas.forEach(function (r) {
					if (have[r.code]) return;

					state.project.retrancas.push({ code: r.code, path: r.path });
					added++;
				});
				renderProject();
				updateDirty();
				toast(added ? 'success' : null, added ? added + (added === 1 ? ' retranca importada' : ' retrancas importadas') + ' do índice. clique em “Salvar” para aplicar.' : 'nenhuma retranca nova no índice (entradas no formato “COD - nome”).');
			} catch (err) {
				toast('error', err.message);
			} finally {
				btn.disabled = !state.available;
			}
		});
	}

	/* =========================================================
	   Pedido de aba (2 cliques numa ferramenta da barra)
	   ========================================================= */

	var CONFIG_TAB_TTL = 15000; // pedido mais velho que isso não vale ao abrir
	var TAB_NAMES = ['prods', 'links', 'logs', 'drives', 'rename', 'organize', 'collect', 'search', 'project', 'appearance', 'tools'];

	async function watchRequestedTab(initial) {
		if (document.hidden && !initial) return;

		try {
			var req = await call('requestedConfigTab');

			if (!req.stamp || req.stamp <= (state.lastTabStamp || 0)) return;

			state.lastTabStamp = req.stamp;

			if (initial && req.now - req.stamp > CONFIG_TAB_TTL) return;
			if (TAB_NAMES.indexOf(req.tab) >= 0) showTab(req.tab);
		} catch (err) { }
	}

	/* =========================================================
	   Abas
	   ========================================================= */

	// Ícone de cada aba (o da ferramenta, quando há uma), com uma animação no hover (CSS: .ti-*).
	var TAB_ICONS = {
		prods: '<g class="ti-sheet"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path class="ti-row" d="M3.5 9.5h17" /><path class="ti-col" d="M9 9.5v10" /></g>',
		links: '<g class="ti-link"><path class="ti-link-a" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path class="ti-link-b" d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></g>',
		logs: '<g class="ti-log"><rect x="4.5" y="3.5" width="15" height="17" rx="2.5" /><path class="ti-line" d="M8 8.5h8" /><path class="ti-line" d="M8 12h8" /><path class="ti-line" d="M8 15.5h5" /></g>',
		drives: '<g class="ti-folder"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h6.5A1.5 1.5 0 0 1 19 10v1.5" /><path class="ti-front" d="M3.5 11.5h17V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></g>',
		rename: '<g class="ti-type"><rect x="2.5" y="6.5" width="19" height="11" rx="3" /><path class="ti-char" d="M6 12h2.4" /><path class="ti-char" d="M10.3 12h2.4" /><path class="ti-char" d="M14.6 12h2.4" /><path class="ti-caret" d="M18.6 9.6v4.8" /></g>',
		organize: '<g class="ti-layers"><path class="ti-top" d="m12 3-8.5 4.25L12 11.5l8.5-4.25z" /><path d="m3.5 12 8.5 4.25L20.5 12" /><path class="ti-bottom" d="m3.5 16.5 8.5 4.25 8.5-4.25" /></g>',
		collect: '<g class="ti-collect"><path d="M3.5 18V7.6A1.5 1.5 0 0 1 5 6.1h.4" /><path class="ti-file1" d="M6 11.5V4a1 1 0 0 1 1-1h4.6l2.7 2.7v5.8" /><path class="ti-file2" d="M10 11.5V6.5a1 1 0 0 1 1-1h4.8l2.7 2.7v3.3" /><path d="M3.5 11.5h17V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></g>',
		search: '<g class="ti-lens"><circle cx="10" cy="10" r="6.5" /><path d="m15 15 5 5" /></g>',
		project: '<g class="ti-clap"><rect x="3.5" y="10" width="17" height="9.5" rx="1.5" /><g class="ti-clap-top"><path d="M4.6 6h14.8a1.1 1.1 0 0 1 1.1 1.1V10h-17V7.1A1.1 1.1 0 0 1 4.6 6z" /><path d="m8.6 6-2 4M13.6 6l-2 4M18.6 6l-2 4" /></g></g>',
		appearance: '<g class="ti-palette"><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-1 .8-1.7 1.8-1.7h2.2a3.7 3.7 0 0 0 3.7-3.7c0-4.2-3.8-7.3-8.5-7.3z" /><circle class="ti-dot" cx="7.5" cy="11" r=".9" /><circle class="ti-dot" cx="10" cy="7.3" r=".9" /><circle class="ti-dot" cx="14.5" cy="7.3" r=".9" /></g>',
		tools: '<g class="ti-sliders"><path d="M4 7h16M4 12h16M4 17h16" /><circle class="ti-knob ti-k1" cx="8" cy="7" r="1.8" /><circle class="ti-knob ti-k2" cx="15" cy="12" r="1.8" /><circle class="ti-knob ti-k3" cx="10" cy="17" r="1.8" /></g>'
	};

	function decorateTabs() {
		Array.prototype.forEach.call($('tabs').querySelectorAll('.tab'), function (tab) {
			var icon = TAB_ICONS[tab.getAttribute('data-tab')];

			if (!icon || tab.querySelector('svg')) return;

			var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			var label = el('span', 'tab-label', tab.textContent.trim());

			node.setAttribute('viewBox', '0 0 24 24');
			node.setAttribute('aria-hidden', 'true');
			node.innerHTML = icon;
			tab.textContent = '';
			tab.appendChild(node);
			tab.appendChild(label);
		});
	}

	function showTab(name) {
		state.tab = name;

		Array.prototype.forEach.call($('tabs').querySelectorAll('.tab'), function (tab) {
			var on = tab.getAttribute('data-tab') === name;

			tab.setAttribute('aria-selected', on ? 'true' : 'false');

			// janela estreita: a aba escolhida (pela barra, por exemplo) aparece na fila que rola
			if (on && tab.scrollIntoView) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		});
		TAB_NAMES.forEach(function (key) {
			$('pane-' + key).hidden = key !== name;
		});

		// as categorias da busca são lidas do índice na primeira vez que a aba abre
		if (name === 'search' && !state.categories && state.available) loadCategories(false);

		// filtro, importar e exportar são da lista de produções
		$('btn-import').hidden = $('btn-export').hidden = name !== 'prods';
	}

	// erro do host numa seção: abre a aba dela
	function tabForError(message) {
		if (/#PAD_078/.test(message)) return 'logs';
		if (/#PAD_0(79|80|81)/.test(message)) return 'drives';
		if (/#PAD_08[23]/.test(message)) return 'rename';
		if (/#PAD_08[45]/.test(message)) return 'organize';
		if (/#PAD_086/.test(message)) return 'search';
		if (/#PAD_087/.test(message)) return 'links';
		if (/#PAD_088/.test(message)) return 'appearance';
		if (/#PAD_089/.test(message)) return 'project';
		if (/#PAD_094/.test(message)) return 'collect';

		return null;
	}

	/* =========================================================
	   Carregar / salvar
	   ========================================================= */

	async function load() {
		loadPersonal(); // os pessoais não dependem da rede
		$('list').classList.remove('is-settled'); // ao ler a lista, as linhas entram animadas de novo

		try {
			var res = await call('productions', {});

			showFileInfo(res);

			if (!res.shared) {
				state.rows = [];
				state.snapshot = currentSnapshot();
				setAvailable(false);
				updateDirty();
				showUnavailable(res.error || '');
				return;
			}

			setAvailable(true);
			setLog(res.log);
			setDrives(res.drives);
			setRename(res.rename);
			setOrganize(res.organize);
			setSearch(res.search);
			setLinks(res.links);
			setProject(res.project);
			setCollect(res.collect);
			setBar(res.bar);
			setAppearance(res.appearance);
			state.stamp = res.stamp;
			state.rows = res.productions.map(newRow);
			state.snapshot = currentSnapshot();

			if (res.error) toast('error', res.error);
		} catch (err) {
			state.rows = [];
			setAvailable(false);
			showFileInfo({ configPath: '', shared: false });
			showUnavailable(err.message);
			return;
		}

		render();
		updateDirty();
		checkFolders(state.rows);
	}

	function validate() {
		var names = {};
		var problems = [];

		state.rows.forEach(function (row) {
			var key = row.name.trim().toUpperCase();

			row.error = false;

			if (row.name.trim() === '') {
				row.error = true;
				problems.push('#PAD_052 - preencha o nome de todas as produções.');
			} else if (names[key]) {
				row.error = true;
				problems.push('#PAD_054 - "' + row.name.trim() + '": já existe uma produção com esse nome.');
			}

			names[key] = true;

			if (row.path.trim() === '') {
				row.error = true;
				problems.push('#PAD_053 - ' + (row.name.trim() ? '"' + row.name.trim() + '": ' : '') + 'preencha a pasta de templates.');
			}
		});

		render();

		return problems;
	}

	async function save() {
		if (state.saving) return;

		// só os links pessoais mudaram (ou a lista da rede está inacessível): grava só eles, no computador
		if (!state.available || currentSnapshot() === state.snapshot) {
			if (!personalDirty()) {
				if (!state.available) return;
			} else {
				try {
					await savePersonal();
					updateDirty();
					toast('success', 'meus links salvos (só neste computador).');
				} catch (err) {
					showTab('links');
					toast('error', err.message);
				}

				return;
			}
		}

		if (!state.rows.length) return toast('error', '#PAD_051 - a lista de produções não pode ficar vazia.');

		var problems = validate();

		if (problems.length) return toast('error', problems[0]);

		var logProblem = validateLog();

		if (logProblem) {
			showTab('logs');
			$('log-webhook').focus();
			return toast('error', logProblem);
		}

		state.saving = true;
		$('btn-save').disabled = true;
		$('btn-save').textContent = 'Salvando…';

		try {
			var res = await call('saveProductions', { productions: listForSave(), log: logForSave(), drives: drivesForSave(), rename: renameForSave(), organize: organizeForSave(), search: searchForSave(), links: linksForSave(), project: projectForSave(), collect: collectForSave(), bar: barForSave(), appearance: appearanceForSave(), stamp: state.stamp });

			state.stamp = res.stamp;
			if (res.log) setLog(res.log);
			if (res.drives) setDrives(res.drives);
			if (res.rename) setRename(res.rename);
			if (res.organize) setOrganize(res.organize);
			if (res.search) setSearch(res.search);
			if (res.links) setLinks(res.links);
			if (res.project) setProject(res.project);
			if (res.collect) setCollect(res.collect);
			if (res.bar) setBar(res.bar);
			setAppearance(res.appearance || state.appearance);
			state.rows = res.productions.map(newRow);
			state.snapshot = currentSnapshot();
			render();
			updateDirty();
			checkFolders(state.rows);
			try {
				await savePersonal();
			} catch (err) {
				showTab('links');
				toast('error', err.message);
				return;
			}

			updateDirty();
			toast('success', 'configuração salva: ' + state.rows.length + (state.rows.length === 1 ? ' produção' : ' produções') + ' (os painéis atualizam sozinhos).');
		} catch (err) {
			if (tabForError(err.message)) showTab(tabForError(err.message));
			toast('error', err.message);
		} finally {
			state.saving = false;
			$('btn-save').disabled = false;
			$('btn-save').textContent = 'Salvar';
		}
	}

	// Descartar alterações pede um segundo clique (sem o confirm() nativo, pouco confiável no CEP).
	function confirmDiscard(action) {
		if (!updateDirty() || state.discardTimer) {
			clearTimeout(state.discardTimer);
			state.discardTimer = null;
			return action();
		}

		toast(null, 'há alterações não salvas: clique de novo para descartar.');
		state.discardTimer = setTimeout(function () {
			state.discardTimer = null;
		}, 3500);
	}

	async function importList() {
		var file = PAD_BRIDGE.pickFile('Selecione a lista de produções', ['json']);

		if (!file) return;

		try {
			var res = await call('readProductionsFile', { path: file });

			state.rows = res.productions.map(newRow);
			render();
			updateDirty();
			checkFolders(state.rows);
			toast('success', 'lista importada: ' + state.rows.length + ' produções. clique em “Salvar” para aplicar.');
		} catch (err) {
			toast('error', err.message);
		}
	}

	async function exportList() {
		var problems = validate();

		if (problems.length) return toast('error', problems[0]);

		var file = PAD_BRIDGE.pickSaveFile('Salvar a lista de produções', 'O_PADEIRO_config.json', ['json']);

		if (!file) return;

		try {
			await call('writeProductionsFile', { path: file, productions: listForSave() });
			toast('success', 'lista exportada: ' + file);
		} catch (err) {
			toast('error', err.message);
		}
	}

	function clearFilter() {
		$('filter').value = '';
		$('filter-clear').hidden = true;
		applyFilter();
	}

	function addRow() {
		clearFilter();

		var row = newRow({ name: '', icon: state.newIcon, templatesPath: '' });

		state.rows.push(row);
		render();
		updateDirty();
		row.nodes.name.focus();
		row.nodes.box.scrollIntoView({ block: 'nearest' });
	}

	/* =========================================================
	   Início
	   ========================================================= */

	function init() {
		state.newIcon = defaultIcon();

		// a altura padrão da janela subiu 120 px (manifest): quem já tinha a janela ganha a nova altura uma vez
		try {
			if (PAD_BRIDGE.inCep() && !localStorage.getItem('pad.productions.height640')) {
				localStorage.setItem('pad.productions.height640', '1');
				if (window.innerHeight < 640) PAD_BRIDGE.resizeWindow(window.innerWidth, 640);
			}
		} catch (err) { }
		bindLog();
		bindDrives();
		bindRename();
		bindOrganize();
		bindSearch();
		bindLinks();
		bindAppearance();
		bindProject();
		bindCollect();
		bindTools();

		decorateTabs();

		$('tabs').addEventListener('click', function (e) {
			var tab = e.target.closest('.tab');

			if (tab) showTab(tab.getAttribute('data-tab'));
		});

		// ↑ ↓ (e ← →, na fila estreita) andam pelas abas
		$('tabs').addEventListener('keydown', function (e) {
			var step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
			var tabs = Array.prototype.slice.call($('tabs').querySelectorAll('.tab'));
			var at = tabs.indexOf(document.activeElement);

			if (!step || at < 0) return;

			var next = tabs[(at + step + tabs.length) % tabs.length];

			e.preventDefault();
			showTab(next.getAttribute('data-tab'));
			next.focus();
		});
		showTab('prods');

		// a barra pode ter pedido uma aba (2 cliques numa ferramenta): ao abrir e enquanto a janela está aberta
		watchRequestedTab(true);
		setInterval(watchRequestedTab, 1000);

		state.newBtn = $('btn-new'); // a lista é redesenhada: o botão é guardado e reposto no fim dela
		state.newBtn.addEventListener('click', addRow);
		$('btn-save').addEventListener('click', save);
		$('btn-import').addEventListener('click', importList);
		$('btn-export').addEventListener('click', exportList);
		PAD_UTIL.bindMenu($('app-menu'), DOCS_URL);

		$('btn-reload').addEventListener('click', function () {
			confirmDiscard(load);
		});

		var filter = $('filter');

		filter.addEventListener('input', function () {
			$('filter-clear').hidden = filter.value === '';
			applyFilter();
		});
		filter.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && filter.value) {
				e.preventDefault();
				clearFilter();
			}

			// ↓ no filtro vai para o nome da primeira produção visível
			if (e.key === 'ArrowDown') {
				var first = $('list').querySelector('.prod-row:not([hidden]) input');

				if (first) {
					e.preventDefault();
					first.focus();
				}
			}
		});
		$('filter-clear').addEventListener('click', function () {
			clearFilter();
			filter.focus();
		});

		$('list').addEventListener('keydown', moveBetweenRows);

		// arrastar pelo puxador muda a ordem da lista (a ordem do menu na barra)
		PAD_SORT.enable($('list'), '.prod-row', function (from, to) {
			var moved = state.rows.splice(from, 1)[0];

			state.rows.splice(to, 0, moved);
			$('list').classList.add('is-settled'); // sem a animação de entrada ao redesenhar
			render();
			updateDirty();
		});

		PAD_KEYS.shortcuts({
			save: save,
			find: function () {
				PAD_KEYS.focusSearch(filter);
			},
			escape: function () {
				if (!filter.value) return false;

				clearFilter();

				return true;
			}
		});

		// a rede voltou? ao voltar para o painel, tenta ler a lista compartilhada de novo
		window.addEventListener('focus', function () {
			if (state.available === false) load();
		});

		load();
	}

	init();
})();
