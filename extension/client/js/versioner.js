/*

---------------------------------------------------------------
> O VERSIONADOR — salvar o projeto em versões mais velhas do After
---------------------------------------------------------------

O clique direito no importar (barra). Lista as 3 versões do After anteriores à que está rodando (no AE 25: 24, 23
e 22); cada uma marcada vira uma cópia do projeto aberto, <projeto>_AE<versão>.aep, na pasta do campo (que já vem
com a pasta do projeto). A cópia é o arquivo salvo com a versão do cabeçalho trocada (js/aepversion.js): por isso o
projeto é salvo antes (dá para desligar). As versões marcadas ficam guardadas neste computador, como "1, 2 ou 3
para trás", e valem em qualquer versão do After.

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;
	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/versionador.md';
	var STORE = 'pad.versioner';
	var BACK = 3; // quantas versões para trás
	var FILE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><path d="M13.5 3.5V8H18" /></svg>';

	var state = { info: null, busy: false, folderFor: '', saved: readStore() };

	function $(id) {
		return document.getElementById(id);
	}

	function el(tag, className, text) {
		var node = document.createElement(tag);

		if (className) node.className = className;
		if (text != null) node.textContent = text;

		return node;
	}

	// a escolha deste computador: quantas versões para trás (1, 2, 3) e se salva antes
	function readStore() {
		try {
			var d = JSON.parse(localStorage.getItem(STORE) || 'null');

			if (d && Array.isArray(d.back)) return { back: d.back, save: d.save !== false };
		} catch (err) { }

		return { back: [1], save: true };
	}

	function writeStore() {
		try {
			localStorage.setItem(STORE, JSON.stringify(state.saved));
		} catch (err) { }
	}

	function status(text, kind) {
		var node = $('fw-status');

		node.textContent = kind === 'error' ? PAD_UTIL.errorText(text) : text || '';
		node.className = 'fw-status' + (kind ? ' is-' + kind : '');
	}

	function plural(n, one, many) {
		return n + ' ' + (n === 1 ? one : many);
	}

	// as versões para trás da que está rodando (o conversor vai até o AE 20)
	function versions() {
		var major = state.info ? state.info.major : 0;
		var first = (window.PAD_AEPVERSION && PAD_AEPVERSION.FIRST) || 20;
		var out = [];

		for (var b = 1; b <= BACK; b++) {
			if (major - b >= first) out.push({ back: b, major: major - b });
		}

		return out;
	}

	function baseName() {
		return state.info && state.info.name ? state.info.name.replace(/\.(aep|aet)$/i, '').replace(/_AE\d+$/i, '') : 'projeto';
	}

	function extName() {
		var m = state.info && state.info.name ? state.info.name.match(/\.(aep|aet)$/i) : null;

		return m ? m[0].toLowerCase() : '.aep';
	}

	function render() {
		var info = state.info;
		var file = $('vs-file');

		file.innerHTML = FILE_SVG;

		var span = el('span');

		if (info && info.name) {
			span.appendChild(document.createTextNode(info.name + ' · aberto no '));
			span.appendChild(el('b', null, 'AE ' + info.major + ' (20' + info.major + ')'));
		} else {
			span.textContent = 'projeto ainda não salvo · aberto no AE ' + (info ? info.major : '');
		}

		file.appendChild(span);

		var list = $('vs-list');

		list.textContent = '';
		versions().forEach(function (v) {
			var on = state.saved.back.indexOf(v.back) >= 0;
			var row = el('div', 'fw-row cw-row vs-row' + (on ? ' is-on' : ''));
			var head = el('button', 'fw-head');
			var text = el('span', 'fw-text');
			var check = el('span', 'fw-state vs-check');

			row.dataset.major = v.major;
			head.type = 'button';
			head.setAttribute('aria-pressed', String(on));
			head.title = on ? 'salvar nesta versão (clique para desmarcar)' : 'clique para salvar também nesta versão';
			head.appendChild(el('span', 'cw-thumb vs-badge', String(v.major)));
			text.appendChild(el('b', 'cw-name', 'After Effects 20' + v.major));
			text.appendChild(el('span', 'fw-name vs-out', baseName() + '_AE' + v.major + extName()));
			head.appendChild(text);
			check.appendChild(el('i', null, '✓'));
			head.appendChild(check);
			head.addEventListener('click', function () {
				if (state.busy) return;

				var i = state.saved.back.indexOf(v.back);

				if (i >= 0) state.saved.back.splice(i, 1);
				else state.saved.back.push(v.back);
				writeStore();
				render();
			});
			row.appendChild(head);
			list.appendChild(row);
		});

		// a pasta: a do projeto, até a pessoa trocar (vale para este projeto; outro projeto volta para a pasta dele)
		var folder = $('vs-folder');

		if (info && info.path !== state.folderFor) {
			state.folderFor = info.path;
			folder.value = info.folder || '';
			requestAnimationFrame(function () {
				folder.scrollLeft = folder.scrollWidth; // o fim do caminho (a pasta) à vista
			});
		}

		$('vs-save').checked = state.saved.save;
		$('vs-note').textContent = info ? '⚠ efeitos e recursos que só existem no AE ' + info.major + ' podem faltar ou dar aviso na versão mais velha.' : '';

		var count = list.querySelectorAll('.vs-row.is-on').length;
		var go = $('vs-go');

		go.textContent = count ? 'Salvar ' + count + (count === 1 ? ' versão' : ' versões') : 'Salvar';
		go.disabled = state.busy || !count || !(info && info.path);
		go.title = info && !info.path ? 'salve o projeto uma vez antes (Arquivo > Salvar)' : '';
		if (info && !info.path && !state.busy) status('salve o projeto uma vez (Arquivo > Salvar) para criar as cópias.');
		else if (info && info.path && /salve o projeto uma vez/.test($('fw-status').textContent)) status('');
		fitHeight();
	}

	// a janela fica com a altura do conteúdo
	function fitHeight() {
		requestAnimationFrame(function () {
			var height = Math.ceil($('versioner').getBoundingClientRect().height);

			if (Math.abs(height - window.innerHeight) > 2) PAD_BRIDGE.resizeWindow(window.innerWidth, height);
		});
	}

	async function load() {
		if (state.busy) return;

		try {
			var info = await call('versionInfo');
			var changed = !state.info || info.path !== state.info.path || info.major !== state.info.major;

			state.info = info;
			if (changed) render();
		} catch (err) {
			status(err.message, 'error');
		}
	}

	function targetFolder() {
		var typed = $('vs-folder').value.trim();

		return typed || (state.info && state.info.folder) || ''; // a pasta como está (a que não existe dá erro, não vira outra)
	}

	async function save() {
		var info = state.info;
		var rows = Array.prototype.slice.call(document.querySelectorAll('.vs-row.is-on'));

		if (!rows.length || !info) return;

		state.busy = true;
		$('vs-go').disabled = true;
		status('', '');

		var done = 0;
		var folder = targetFolder();

		try {
			if (!info.path) throw new Error('#PAD_102 - versionador: o projeto ainda não foi salvo. salve uma vez (Arquivo > Salvar) e tente de novo.');
			if (!folder) throw new Error('#PAD_102 - versionador: escolha a pasta das cópias.');

			var source = info.path;

			if ($('vs-save').checked) {
				status('salvando o projeto…');
				source = (await call('versionSave')).path || source;
			}

			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];
				var major = parseInt(row.dataset.major, 10);

				row.classList.add('is-working');
				status('salvando no AE ' + major + '…');

				if (PAD_AEPVERSION.available()) {
					var fs = require('fs');

					if (!fs.existsSync(folder)) throw new Error('#PAD_102 - versionador: a pasta não existe: ' + folder);
					await PAD_AEPVERSION.convert(source, major, folder);
				} else if (PAD_BRIDGE.inCep()) {
					throw new Error('#PAD_100 - versionador: este painel não tem acesso aos arquivos (Node).');
				} else {
					await new Promise(function (r) { setTimeout(r, 500); }); // modo de teste: sem Node, só a animação
				}

				row.classList.remove('is-working');
				row.classList.add('is-done');
				done++;
			}

			status('✓ ' + plural(done, 'cópia salva', 'cópias salvas') + '.', 'success');
		} catch (err) {
			document.querySelectorAll('.vs-row.is-working').forEach(function (r) {
				r.classList.remove('is-working');
			});
			status((done ? plural(done, 'cópia salva', 'cópias salvas') + '; ' : '') + err.message, 'error');
		}

		state.busy = false;
		setTimeout(function () {
			document.querySelectorAll('.vs-row.is-done').forEach(function (r) {
				r.classList.remove('is-done');
			});
		}, 2500);
		render();
	}

	function init() {
		$('vs-go').addEventListener('click', save);
		$('vs-save').addEventListener('change', function () {
			state.saved.save = this.checked;
			writeStore();
		});
		$('vs-pick').addEventListener('click', function () {
			var path = PAD_BRIDGE.pickFolder('Salvar as cópias em qual pasta', targetFolder());

			if (path) $('vs-folder').value = path;
		});

		var menu = $('app-menu');

		menu.addEventListener('click', async function (e) {
			var btn = e.target.closest('button[data-action]');

			if (!btn) return;

			menu.removeAttribute('open');

			try {
				if (btn.dataset.action === 'docs') PAD_BRIDGE.openUrl(DOCS_URL);
				if (btn.dataset.action === 'reload') location.reload();
				if (btn.dataset.action === 'folder') {
					var folder = state.info && targetFolder();

					if (!folder) throw new Error('#PAD_102 - versionador: o projeto ainda não foi salvo.');
					await call('openFolder', { path: folder });
				}
			} catch (err) {
				status(err.message, 'error');
			}
		});

		window.addEventListener('focus', load);
		setInterval(function () {
			if (!document.hidden) load();
		}, 4000);
		load();
	}

	init();
})();
