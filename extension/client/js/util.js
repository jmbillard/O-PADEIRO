/*

---------------------------------------------------------------
> utilidades compartilhadas pelos painéis
---------------------------------------------------------------

*/

(function () {
	'use strict';

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

	// Loader temático: pães saindo do forninho (css/loader.css).
	function ovenLoader(title, hint, light, compact) {
		var box = document.createElement('div');

		box.className = 'oven-loader' + (light ? ' is-light' : '') + (compact ? ' is-compact' : '');
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

	// Caminho do sistema → URL de arquivo (preview).
	function fileUrl(path) {
		if (/^(data|file|https?):/.test(path)) return path;

		var s = String(path).replace(/\\/g, '/');
		var drive = /^[A-Za-z]:\//.test(s) ? s.slice(0, 2) : '';
		var rest = drive ? s.slice(2) : s;
		var encoded = rest.split('/').map(encodeURIComponent).join('/');

		if (s.indexOf('//') === 0) return 'file:' + encoded; // UNC → file://servidor/share/...
		if (drive) return 'file:///' + drive + encoded;

		return 'file://' + encoded;
	}

	// Todo erro mostrado tem um código #PAD_: os que chegam sem código são inesperados.
	function errorText(text) {
		text = String(text || '');

		return /^#PAD_/.test(text) ? text : '#PAD_099 - ' + text;
	}

	// Aviso flutuante dos painéis (barra, acessorista, produções, criador): texto + botão de fechar.
	// Some sozinho depois de 'ms' (erros ficam mais tempo).
	function toast(box, baseClass, kind, text, ms) {
		clearTimeout(box._timer);

		var close = document.createElement('button');
		var body = document.createElement('span');

		body.className = 'toast-text';
		body.textContent = kind === 'error' ? errorText(text) : text;
		close.type = 'button';
		close.className = 'toast-close';
		close.textContent = '×';
		close.title = 'fechar aviso';
		close.setAttribute('aria-label', 'fechar aviso');
		close.addEventListener('click', function () {
			clearTimeout(box._timer);
			box.hidden = true;
		});

		box.className = baseClass + (kind ? ' is-' + kind : '');
		box.textContent = '';
		box.appendChild(body);
		box.appendChild(close);
		box.hidden = false;
		box._timer = setTimeout(function () {
			box.hidden = true;
		}, ms || (kind === 'error' ? 9000 : 4500));
	}

	// Menu "⋯" dos painéis: ajuda (a documentação do painel) e recarregar.
	function bindMenu(menu, docsUrl) {
		menu.addEventListener('click', function (e) {
			var btn = e.target.closest('button[data-action]');

			if (!btn) return;

			menu.removeAttribute('open');

			if (btn.dataset.action === 'docs') PAD_BRIDGE.openUrl(docsUrl);
			if (btn.dataset.action === 'reload') location.reload();
		});

		document.addEventListener('click', function (e) {
			if (!menu.contains(e.target)) menu.removeAttribute('open');
		});

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') menu.removeAttribute('open');
		});
	}

	// Caminho só para ler (não editável): ícone estático de pasta + o caminho, cortado com "…" se não couber.
	// O caminho inteiro fica na dica.
	var FOLDER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></svg>';

	function pathLine(path, tag) {
		var node = document.createElement(tag || 'span');
		var text = document.createElement('span');

		node.className = 'path-line';
		node.title = path;
		node.innerHTML = FOLDER;
		text.className = 'path-text';
		text.textContent = path;
		node.appendChild(text);

		return node;
	}

	window.PAD_UTIL = { decodeIcon: decodeIcon, ovenLoader: ovenLoader, fileUrl: fileUrl, toast: toast, errorText: errorText, bindMenu: bindMenu, pathLine: pathLine };
})();
