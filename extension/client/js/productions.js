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
		saving: false
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

	// Ícone padrão: um pãozinho 24 x 24 (também aparece bem na barra escura do script).
	function defaultIcon() {
		var canvas = document.createElement('canvas');

		canvas.width = canvas.height = ICON_SIZE;

		var ctx = canvas.getContext('2d');
		var grad = ctx.createLinearGradient(0, 4, 0, 20);

		grad.addColorStop(0, '#fbd697');
		grad.addColorStop(1, '#e29a4c');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.moveTo(2.5, 18.5);
		ctx.bezierCurveTo(2.5, 8, 7, 4, 12, 4);
		ctx.bezierCurveTo(17, 4, 21.5, 8, 21.5, 18.5);
		ctx.quadraticCurveTo(21.5, 20, 20, 20);
		ctx.lineTo(4, 20);
		ctx.quadraticCurveTo(2.5, 20, 2.5, 18.5);
		ctx.fill();
		ctx.strokeStyle = 'rgba(140,72,18,0.62)';
		ctx.lineWidth = 1.6;
		ctx.lineCap = 'round';
		[[8, 9, 9.5, 14], [12, 8, 13.5, 13.5], [16, 9, 17.5, 14]].forEach(function (l) {
			ctx.beginPath();
			ctx.moveTo(l[0], l[1]);
			ctx.lineTo(l[2], l[3]);
			ctx.stroke();
		});

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

	function currentSnapshot() {
		return JSON.stringify(listForSave());
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
			return;
		}

		state.rows.forEach(function (row) {
			list.appendChild(buildRow(row));
		});

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

		if (state.rows.length && !shown) list.appendChild(el('p', 'prods-empty prods-nomatch', 'nenhuma produção casa com “' + $('filter').value.trim() + '”.'));
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

	function showFileInfo(res) {
		var info = $('file-info');

		info.textContent = '';
		info.appendChild(el('span', null, res.configPath));
		info.appendChild(el('span', 'prods-tag' + (res.shared ? '' : ' is-local'), res.shared ? 'compartilhada' : 'inacessível'));
		info.title = res.shared ? res.configPath : 'a lista compartilhada (junto do padeiro, na rede) não está acessível.';
		info.hidden = false;
	}

	// Sem a lista compartilhada não há o que editar: a lista é uma só para a equipe (nada de cópia local).
	function setAvailable(available) {
		state.available = available;
		['btn-new', 'btn-save', 'btn-import', 'btn-export'].forEach(function (id) {
			$(id).disabled = !available;
		});
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
	}

	/* =========================================================
	   Carregar / salvar
	   ========================================================= */

	async function load() {
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

		state.saving = true;
		$('btn-save').disabled = true;
		$('btn-save').textContent = 'Salvando…';

		try {
			var res = await call('saveProductions', { productions: listForSave(), stamp: state.stamp });

			state.stamp = res.stamp;
			state.rows = res.productions.map(newRow); // volta ordenada, como o script grava
			state.snapshot = currentSnapshot();
			render();
			updateDirty();
			checkFolders(state.rows);
			toast('success', 'lista salva: ' + state.rows.length + (state.rows.length === 1 ? ' produção' : ' produções') + ' (a barra e os painéis atualizam sozinhos).');
		} catch (err) {
			toast('error', err.message);
		} finally {
			state.saving = false;
			$('btn-save').disabled = false;
			$('btn-save').textContent = 'Salvar lista';
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
			toast('success', 'lista importada: ' + state.rows.length + ' produções. clique em “Salvar lista” para aplicar.');
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

		$('btn-new').addEventListener('click', addRow);
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
