/*

---------------------------------------------------------------
> CONVERSOR DE CAMINHOS Windows / macOS
---------------------------------------------------------------

Cole um caminho em qualquer lugar do painel: o tipo é reconhecido, o caminho vai para o campo
certo e o outro é convertido na hora (host: lib/acessorista.js). Abre já com a pasta da última saída da fila de render quando a barra principal
pede (botão 'pastas', clique direito). Copiar e abrir a pasta ficam dentro dos campos; abrir, só no do sistema atual.

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/conversor.md';
		var REQUEST_TTL = 15000; // ms: um pedido da barra feito há pouco vale ao abrir o painel

	var state = { os: 'Mac', seq: 0, lastStamp: 0, timer: null, statusTimer: null, opening: false };

	function $(id) {
		return document.getElementById(id);
	}

	// A mensagem ocupa o lugar do breadcrumb; as que não são erro somem sozinhas.
	function status(text, isError) {
		var node = $('cv-status');

		clearTimeout(state.statusTimer);
		node.textContent = isError ? PAD_UTIL.errorText(text) : text || '';
		node.title = node.textContent;
		node.classList.toggle('is-error', !!isError);
		$('converter').classList.toggle('has-status', node.textContent !== '');

		if (text && !isError) state.statusTimer = setTimeout(status, 2600);
	}

	/* ---------------------------------------------------------------
	   breadcrumb do caminho do sistema atual: as últimas pastas têm
	   prioridade; as iniciais saem (com "…") quando não cabem
	   --------------------------------------------------------------- */

	function pathParts(path) {
		var text = path.trim().replace(/^["']|["']$/g, '');

		if (state.os === 'Mac') return { prefix: '/', sep: '/', parts: text.split('/').filter(Boolean) };

		var unc = /^[\\/]{2}/.test(text);

		return { prefix: unc ? '\\\\' : '', sep: '\\', parts: text.split(/[\\/]+/).filter(Boolean) };
	}

	function renderCrumbs() {
		var nav = $('cv-crumbs');
		var info = pathParts($(state.os === 'Mac' ? 'cv-mac' : 'cv-win').value);

		nav.textContent = '';

		if (!info.parts.length) return;

		var more = document.createElement('span');

		more.className = 'crumb-more';
		more.textContent = '…';
		more.hidden = true;
		nav.appendChild(more);

		var items = info.parts.map(function (name, i) {
			var btn = document.createElement('button');
			var target = info.prefix + info.parts.slice(0, i + 1).join(info.sep);

			btn.type = 'button';
			btn.className = 'crumb' + (i === info.parts.length - 1 ? ' is-last' : '');
			btn.textContent = name;
			btn.title = 'abrir ' + target;
			btn.addEventListener('click', function () {
				openPath(target);
			});

			if (i > 0) nav.appendChild(Object.assign(document.createElement('span'), { className: 'crumb-sep', textContent: '›' }));
			nav.appendChild(btn);

			return btn;
		});

		// esconde do começo até caber, medindo a última pasta inteira (ela só é cortada se sobrar sozinha)
		nav.classList.add('is-measuring');

		for (var h = 0; nav.scrollWidth > nav.clientWidth && h < items.length - 1; h++) {
			items[h].hidden = true;

			if (items[h].nextSibling) items[h].nextSibling.hidden = true; // o "›" seguinte
			more.hidden = false;
		}

		nav.classList.remove('is-measuring');
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
				renderCrumbs();
				return;
			}

			try {
				var res = await call('convertPaths', { text: source.value, from: from });

				if (seq !== state.seq) return; // chegou uma digitação mais nova

				target.value = from === 'mac' ? res.win : res.mac;
				renderCrumbs();
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
		renderCrumbs();
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
		status('caminho ' + label + ' copiado.');
		setTimeout(function () {
			btn.classList.remove('is-done');
		}, 1600);
	}

	function openFolder() {
		openPath($(state.os === 'Mac' ? 'cv-mac' : 'cv-win').value);
	}

	async function openPath(text) {
		if (text.trim() === '') return;

		if (state.opening) return;

		state.opening = true;

		try {
			var res = await call('openConvertedPath', { text: text });

			status(res.exact ? '' : 'a pasta não existe: abrindo a mais próxima.');
		} catch (err) {
			status(err.message, true);
		} finally {
			state.opening = false;
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

	// A janela não precisa de altura: fica com a do conteúdo (a do manifest só muda reinstalando).
	function fitHeight() {
		var height = Math.ceil($('converter').getBoundingClientRect().height);

		if (Math.abs(height - window.innerHeight) > 2) PAD_BRIDGE.resizeWindow(window.innerWidth, height);
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
		fitHeight();
		window.addEventListener('resize', renderCrumbs);

		await watchRequest(true);

		setInterval(watchRequest, 1000);
		window.addEventListener('focus', watchRequest);
	}

	init();
})();
