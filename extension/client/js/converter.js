/*

---------------------------------------------------------------
> CONVERSOR DE CAMINHOS Windows / macOS
---------------------------------------------------------------

Cole um caminho em qualquer campo e o outro é convertido na hora (host: lógica do script,
'path ui.js'). Abre já com a pasta da última saída da fila de render quando a barra principal
pede (botão 'pastas', clique direito).

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var REQUEST_TTL = 15000; // ms: um pedido da barra feito há pouco vale ao abrir o painel

	var state = { os: 'Mac', seq: 0, lastStamp: 0, timer: null };

	function $(id) {
		return document.getElementById(id);
	}

	function status(text, isError) {
		var node = $('cv-status');

		node.textContent = text || '';
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

			if (!res.path) return status('a fila de render está vazia.', true);

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

		['cv-mac', 'cv-win'].forEach(function (id) {
			$(id).addEventListener('keydown', function (e) {
				if (e.key === 'Enter') openFolder();
			});
		});

		try {
			state.os = (await call('ping')).os;
		} catch (err) {
			status('sem conexão com o After Effects: ' + err.message, true);
		}

		$(state.os === 'Mac' ? 'cv-mac' : 'cv-win').focus();

		await watchRequest(true);

		setInterval(watchRequest, 1000);
		window.addEventListener('focus', watchRequest);
	}

	init();
})();
