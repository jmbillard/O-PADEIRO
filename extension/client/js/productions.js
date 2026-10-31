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
		rename: { types: [], fixed: [] }, // tipos de peça e nomes fixos (aba RENOMEAR); termos editados como texto
		organize: { folders: [], renderComments: '', autoComment: '', dataExtensions: '', commentSubfolders: true }, // aba ORGANIZAR (folders: { name, parent, contents })
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
	function imageFileToIcon(path) {
		return new Promise(function (resolve, reject) {
			var base64 = PAD_BRIDGE.readFileBase64(path);

			if (!base64) return reject(new Error('não foi possível ler a imagem.'));

			var mime = /\.jpe?g$/i.test(path) ? 'image/jpeg' : 'image/png';
			var img = new Image();

			img.onload = function () {
				var canvas = document.createElement('canvas');
				var side = Math.min(img.width, img.height);

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
			})
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
			autoComment: o.autoComment.trim(),
			dataExtensions: commaList(o.dataExtensions),
			commentSubfolders: o.commentSubfolders
		};
	}

	function currentSnapshot() {
		return JSON.stringify({ list: listForSave(), log: logForSave(), drives: drivesForSave(), rename: renameForSave(), organize: organizeForSave() });
	}

	function updateDirty() {
		var dirty = currentSnapshot() !== state.snapshot;

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
		['btn-save', 'btn-import', 'btn-export'].forEach(function (id) {
			$(id).disabled = !available;
		});
		state.newBtn.disabled = !available;
		renderLog();
		renderDrives();
		renderRename();
		renderOrganize();
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
	var NETWORK_ICON = ['M12 4v5M6 15v-3h12v3M4 15h4v5H4zM10 15h4v5h-4zM16 15h4v5h-4zM9 4h6v5H9z'];

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
			})
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
		testRename();
	}

	// Prévia do renomear com a tabela em edição (a mesma regra do host, rename lib.js), só pelo nome da comp.
	var RENAME_SEP = '[\\s_\\-]';

	function renameNorm(str) {
		return String(str).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, ' ').replace(/[\s_]+/g, ' ').trim();
	}

	function renameEscape(str) {
		return renameNorm(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function previewRename(compName) {
		var data = renameForSave();
		var name = renameNorm(compName);
		var types = data.types.map(function (t) {
			return {
				prefix: renameNorm(t.prefix),
				comment: renameNorm(t.comment),
				terms: t.terms.map(function (x) {
					return renameEscape(x).replace(/[\s_\-]+/g, RENAME_SEP + '+') + '(S)?';
				}).filter(function (x) {
					return x !== '(S)?';
				})
			};
		});
		var found = null;

		types.some(function (t) {
			return t.terms.some(function (re) {
				if (new RegExp('(^|' + RENAME_SEP + ')(' + re + ')(' + RENAME_SEP + '|$)', 'i').test(name)) found = t;

				return !!found;
			});
		});

		var result = { name: name, comment: null };

		if (found) {
			var clean = name;
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
			clean = clean.replace(/[\s_\-]+/g, ' ').trim();
			result.comment = found.comment;
			result.name = clean && clean !== found.prefix ? found.prefix + ' - ' + clean : found.prefix;
		}

		data.fixed.some(function (f) {
			var term = renameEscape(f.match).replace(/[\s_\-]+/g, '[\\s_\\-]*');

			if (term && new RegExp(term).test(name)) {
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
		['precomps', 'outras comps', ['M3.5 6.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', 'M7.5 4.5v15M16.5 4.5v15']],
		['videos', 'vídeos', ['M4 6.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M16 10l4-2.5v9L16 14']],
		['imagens', 'imagens', ['M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'm4.5 16 4.5-4.5 4 4 2.5-2.5 4 4', 'M15 9h.01']],
		['audio', 'áudio', ['M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2']],
		['solidos', 'sólidos', ['M5 5h14v14H5z']],
		['dados', 'dados', ['M4 5.5h16v13H4z', 'M4 10h16M4 14.5h16M10 5.5v13']],
		['missing', 'arquivos ausentes', ['M12 4 3 19.5h18z', 'M12 10v4.5M12 17.5h.01']]
	];

	function typeLabel(key) {
		var t = TYPES.filter(function (x) {
			return x[0] === key;
		})[0];

		return t ? t[1] : key;
	}

	function setOrganize(o) {
		var data = o || {};

		state.organize = {
			folders: (data.folders || []).map(function (f) {
				return { name: f.name || '', parent: f.parent || '', contents: (f.contents || (f.content ? [f.content] : [])).slice() };
			}),
			renderComments: (data.renderComments || []).join(', '),
			autoComment: data.autoComment || '',
			dataExtensions: (data.dataExtensions || []).join(', '),
			commentSubfolders: data.commentSubfolders !== false
		};
		renderOrganize();
	}

	function sameName(a, b) {
		return String(a).trim().toUpperCase() === String(b).trim().toUpperCase();
	}

	function folderByName(name) {
		return state.organize.folders.filter(function (f) {
			return sameName(f.name, name);
		})[0] || null;
	}

	// a pasta e as que estão dentro dela (em qualquer nível)
	function subtree(folder) {
		var out = [folder];

		for (var i = 0; i < out.length; i++) {
			state.organize.folders.forEach(function (f) {
				if (out.indexOf(f) < 0 && f.parent && sameName(f.parent, out[i].name)) out.push(f);
			});
		}

		return out;
	}

	// ordem de árvore: cada pasta logo depois da pasta pai, com a profundidade (para o recuo)
	function folderTree() {
		var folders = state.organize.folders;
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
		return state.organize.folders.filter(function (f) {
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
		node.appendChild(document.createTextNode(typeLabel(type)));
		x.type = 'button';
		x.title = 'tirar da pasta (vai para a raiz)';
		x.setAttribute('aria-label', 'tirar ' + typeLabel(type) + ' da pasta');
		x.appendChild(svgIcon(ICONS.remove));
		x.addEventListener('click', onRemove);
		node.appendChild(x);

		return node;
	}

	function unassign(type) {
		state.organize.folders.forEach(function (f) {
			var i = f.contents.indexOf(type);

			if (i >= 0) f.contents.splice(i, 1);
		});
	}

	function renderOrganize() {
		if (!state.organize) return;

		var tree = $('org-tree');
		var o = state.organize;
		var scroll = tree.scrollTop;

		tree.textContent = '';

		// a raiz do projeto: recebe pastas soltas aqui e mostra os tipos que não entram em pasta nenhuma
		var root = el('div', 'org-folder is-root');
		var rootChips = el('div', 'org-chips');

		root.setAttribute('data-root', '1');
		root.appendChild(svgIcon(['M3.5 7.5A2 2 0 0 1 5.5 5.5h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', 'M3.5 9.5h17']));
		root.appendChild(el('span', 'org-root-label', 'raiz do projeto'));
		TYPES.forEach(function (t) {
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
				renderOrganize();
				updateDirty();
			});
			row.appendChild(remove);

			f.contents.forEach(function (type) {
				chips.appendChild(chip(type, function () {
					unassign(type);
					renderOrganize();
					updateDirty();
				}));
			});
			row.appendChild(chips);
			tree.appendChild(row);
		});

		tree.scrollTop = scroll;
		renderTypes();

		var fields = { 'org-render': 'renderComments', 'org-auto': 'autoComment', 'org-data': 'dataExtensions' };

		Object.keys(fields).forEach(function (id) {
			if ($(id).value !== o[fields[id]]) $(id).value = o[fields[id]];
			$(id).disabled = !state.available;
		});
		$('org-sub').checked = o.commentSubfolders;
		$('org-sub').disabled = !state.available;
		$('btn-new-folder').disabled = !state.available;
	}

	// os cartões dos tipos (direita), com o lugar de cada um
	function renderTypes() {
		var box = $('org-types');

		box.textContent = '';

		TYPES.forEach(function (t) {
			var card = el('div', 'org-type');
			var text = el('span', 'org-type-text');
			var where = folderOf(t[0]);

			card.setAttribute('data-type', t[0]);
			card.title = 'arraste para uma pasta da árvore';
			card.appendChild(svgIcon(t[2]));
			text.appendChild(el('strong', null, t[1]));
			text.appendChild(el('span', null, where ? 'em ' + (where.name.trim() || '(sem nome)') : 'na raiz do projeto'));
			card.appendChild(text);
			box.appendChild(card);
		});
	}

	/* ---------- arrastar ---------- */

	var drag = null; // { kind: 'folder' | 'type', folder, type, x, y, active, ghost, target }

	function dropTarget(x, y) {
		var hit = document.elementFromPoint(x, y);

		if (!hit) return null;

		var tree = $('org-tree');
		var row = hit.closest('.org-folder');

		if (drag.kind === 'type') {
			if (row && row.hasAttribute('data-index')) return { mode: 'inside', folder: state.organize.folders[+row.getAttribute('data-index')], row: row };
			if ((row && row.hasAttribute('data-root')) || hit.closest('.org-side') || hit.closest('.org-tree')) return { mode: 'root' };

			return null;
		}

		if (row && row.hasAttribute('data-index')) {
			var target = state.organize.folders[+row.getAttribute('data-index')];
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
		var tree = $('org-tree');
		var line = tree.querySelector('.org-line');

		Array.prototype.forEach.call(tree.querySelectorAll('.is-drop-inside'), function (r) {
			r.classList.remove('is-drop-inside');
		});
		$('pane-organize').querySelector('.org-side').classList.toggle('is-drop-target', !!(t && t.mode === 'root' && drag.kind === 'type'));

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
		var o = state.organize;

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

		var tree = $('org-tree');
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
			renderOrganize();
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

	function bindOrganize() {
		// pastas: pelo puxador (ou pelo ícone); tipos: pelas etiquetas da árvore e pelos cartões da direita
		$('pane-organize').addEventListener('mousedown', function (e) {
			if (e.target.closest('button:not(.drag-handle), input')) return;

			var row = e.target.closest('.org-folder[data-index]');
			var tag = e.target.closest('.org-chip, .org-type');

			if (tag) return startDrag(e, { kind: 'type', type: tag.getAttribute('data-type') });
			if (row && e.target.closest('.drag-handle, svg')) startDrag(e, { kind: 'folder', folder: state.organize.folders[+row.getAttribute('data-index')] });
		});

		$('btn-new-folder').addEventListener('click', function () {
			var name = 'NOVA PASTA';

			for (var n = 2; folderByName(name); n++) name = 'NOVA PASTA ' + n;

			state.organize.folders.push({ name: name, parent: '', contents: [] });
			renderOrganize();
			updateDirty();

			var inputs = $('org-tree').querySelectorAll('.org-name');
			var last = inputs[inputs.length - 1];

			last.focus();
			last.select();
		});

		[['org-render', 'renderComments'], ['org-auto', 'autoComment'], ['org-data', 'dataExtensions']].forEach(function (pair) {
			$(pair[0]).addEventListener('input', function () {
				state.organize[pair[1]] = this.value;
				updateDirty();
			});
		});

		$('org-sub').addEventListener('change', function () {
			state.organize.commentSubfolders = this.checked;
			updateDirty();
		});
	}

	/* =========================================================
	   Abas
	   ========================================================= */

	function showTab(name) {
		state.tab = name;

		Array.prototype.forEach.call($('tabs').querySelectorAll('.tab'), function (tab) {
			tab.setAttribute('aria-selected', tab.getAttribute('data-tab') === name ? 'true' : 'false');
		});
		['prods', 'logs', 'drives', 'rename', 'organize'].forEach(function (key) {
			$('pane-' + key).hidden = key !== name;
		});

		// filtro, importar e exportar são da lista de produções
		document.querySelector('.prods-filter').hidden = name !== 'prods';
		$('btn-import').hidden = $('btn-export').hidden = name !== 'prods';
	}

	// erro do host numa seção: abre a aba dela
	function tabForError(message) {
		if (/#PAD_078/.test(message)) return 'logs';
		if (/#PAD_0(79|80|81)/.test(message)) return 'drives';
		if (/#PAD_08[23]/.test(message)) return 'rename';
		if (/#PAD_08[45]/.test(message)) return 'organize';

		return null;
	}

	/* =========================================================
	   Carregar / salvar
	   ========================================================= */

	async function load() {
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
		if (state.saving || !state.available) return;

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
			var res = await call('saveProductions', { productions: listForSave(), log: logForSave(), drives: drivesForSave(), rename: renameForSave(), organize: organizeForSave(), stamp: state.stamp });

			state.stamp = res.stamp;
			if (res.log) setLog(res.log);
			if (res.drives) setDrives(res.drives);
			if (res.rename) setRename(res.rename);
			if (res.organize) setOrganize(res.organize);
			state.rows = res.productions.map(newRow);
			state.snapshot = currentSnapshot();
			render();
			updateDirty();
			checkFolders(state.rows);
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

		$('tabs').addEventListener('click', function (e) {
			var tab = e.target.closest('.tab');

			if (tab) showTab(tab.getAttribute('data-tab'));
		});
		showTab('prods');

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
