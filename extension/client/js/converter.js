/*

---------------------------------------------------------------
> CONVERSOR DE CAMINHOS Windows / macOS
---------------------------------------------------------------

Cole um caminho em qualquer lugar do painel: o tipo é reconhecido, o caminho vai para o campo
certo e o outro é convertido na hora (host: lib/acessorista.js). Abre já com a pasta da última saída da fila de render quando a barra principal
pede (botão 'pastas', clique direito).

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/conversor.md';
		var REQUEST_TTL = 15000; // ms: um pedido da barra feito há pouco vale ao abrir o painel

	var state = { os: 'Mac', seq: 0, lastStamp: 0, timer: null };

	function $(id) {
		return document.getElementById(id);
	}

	function status(text, isError) {
		var node = $('cv-status');

		node.textContent = isError ? PAD_UTIL.errorText(text) : text || '';
		node.classList.toggle('is-error', !!isError);
	}

	// Um campo mudou: converte para o outro (sem realimentar o campo digitado).
	function convertFrom(from) {
		clearTimeout(state.timer);
		status('');

		state.timer = setTimeout(async function () {
			var source = $(from === 'mac' ? 'cv-mac' : 'cv-win');
			var target = $(from === 'mac' ? 'cv-win' : 'cv-mac');
			var seq = ++state.seq;

			if (source.value.trim() === '') {
				target.value = '';
				return;
			}

			try {
				var res = await call('convertPaths', { text: source.value, from: from });

				if (seq !== state.seq) return; // chegou uma digitação mais nova

				target.value = from === 'mac' ? res.win : res.mac;
			} catch (err) {
				status(err.message, true);
			}
		}, 220);
	}

	// Caminho vindo de fora (última saída): entra no campo do sistema atual e converte o outro.
	function setPath(path) {
		var os = state.os === 'Mac' ? 'mac' : 'win';

		$('cv-' + os).value = path;
		convertFrom(os);
	}

	// 'mac' | 'win' | null (sem certeza: o colar segue normal)
	function detectKind(text) {
		var t = text.trim().split(/[\n\r]/)[0];

		if (/^\\\\|^\/\/[^/]|^[A-Za-z]:[\\/]/.test(t)) return 'win';
		if (/^smb:\/\/|^\/(Volumes|Users)\//i.test(t)) return 'mac';
		if (/^\//.test(t)) return 'mac';
		if (t.indexOf('\\') >= 0 && t.indexOf('/') < 0) return 'win';

		return null;
	}

	function flash(input) {
		var field = input.closest('.convert-field');

		field.classList.remove('is-flash');
		void field.offsetWidth;
		field.classList.add('is-flash');
	}

	// Colar em qualquer lugar: o caminho vai para o campo do seu tipo. Colar no meio de um texto
	// (parte de um caminho) segue o comportamento normal do campo.
	function onPaste(e) {
		var data = e.clipboardData || window.clipboardData;
		var text = data ? data.getData('text') : '';
		var kind = detectKind(text);

		if (!kind) return;

		var target = $('cv-' + kind);
		var focused = document.activeElement;

		if (focused === target) return;

		if (focused === $('cv-mac') || focused === $('cv-win')) {
			var whole = focused.value === '' || (focused.selectionStart === 0 && focused.selectionEnd === focused.value.length);

			if (!whole) return;
		}

		e.preventDefault();
		target.value = text.trim();
		target.focus();
		flash(target);
		convertFrom(kind);
		status('caminho ' + (kind === 'mac' ? 'MacOS' : 'Windows') + ' reconhecido.');
	}

	function clearAll() {
		clearTimeout(state.timer);
		state.seq++;
		$('cv-mac').value = '';
		$('cv-win').value = '';
		status('');
		$(state.os === 'Mac' ? 'cv-mac' : 'cv-win').focus();
	}

	async function copyField(id, btn, label) {
		var field = $(id);

		if (field.value === '') return;

		var copied = false;

		field.select();

		try {
			copied = document.execCommand('copy');
		} catch (err) { }

		if (!copied) {
			try {
				await call('copyText', { text: field.value });
				copied = true;
			} catch (err) {
				status(err.message, true);
				return;
			}
		}

		field.setSelectionRange(field.value.length, field.value.length);
		btn.classList.add('is-done');
		btn.textContent = 'copiado';
		status('caminho ' + label + ' copiado.');
		setTimeout(function () {
			btn.classList.remove('is-done');
			btn.textContent = 'copiar';
		}, 1600);
	}

	async function openFolder() {
		var field = $(state.os === 'Mac' ? 'cv-mac' : 'cv-win');

		if (field.value.trim() === '') return;

		var btn = $('cv-open');

		btn.disabled = true;

		try {
			var res = await call('openConvertedPath', { text: field.value });

			status(res.exact ? '' : 'a pasta não existe: abrindo a mais próxima.');
		} catch (err) {
			status(err.message, true);
		} finally {
			btn.disabled = false;
		}
	}

	async function useLastOutput() {
		try {
			var res = await call('lastOutputFolder');

			if (!res.path) return status('#PAD_008 - a fila de render está vazia.', true);

			setPath(res.path);
		} catch (err) {
			status(err.message, true);
		}
	}

	// Pedidos da barra principal: o painel já aberto também recebe a pasta nova.
	async function watchRequest(initial) {
		if (document.hidden && !initial) return;

		try {
			var req = await call('requestedConverter');

			if (!req.stamp || req.stamp <= state.lastStamp) return;

			state.lastStamp = req.stamp;

			if (initial && req.now - req.stamp > REQUEST_TTL) return; // pedido antigo: não vale ao abrir

			if (req.path) setPath(req.path);
		} catch (err) { }
	}

	async function init() {
		$('cv-mac').addEventListener('input', function () {
			convertFrom('mac');
		});
		$('cv-win').addEventListener('input', function () {
			convertFrom('win');
		});
		$('cv-copy-mac').addEventListener('click', function () {
			copyField('cv-mac', this, 'MacOS');
		});
		$('cv-copy-win').addEventListener('click', function () {
			copyField('cv-win', this, 'Windows');
		});
		$('cv-open').addEventListener('click', openFolder);
		$('btn-last').addEventListener('click', useLastOutput);

		// menu "⋯"
		var menu = $('app-menu');

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

		['cv-mac', 'cv-win'].forEach(function (id) {
			$(id).addEventListener('keydown', function (e) {
				if (e.key === 'Enter') openFolder();
			});
		});

		document.addEventListener('paste', onPaste);

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				e.preventDefault();

				if (menu.hasAttribute('open')) return menu.removeAttribute('open');

				clearAll();
			}
		});

		try {
			state.os = (await call('ping')).os;
		} catch (err) {
			status(err.message, true);
		}

		$(state.os === 'Mac' ? 'cv-mac' : 'cv-win').focus();

		await watchRequest(true);

		setInterval(watchRequest, 1000);
		window.addEventListener('focus', watchRequest);
	}

	init();
})();
