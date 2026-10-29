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
	function ovenLoader(title, hint, light) {
		var box = document.createElement('div');

		box.className = 'oven-loader' + (light ? ' is-light is-compact' : '');
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

	window.PAD_UTIL = { decodeIcon: decodeIcon, ovenLoader: ovenLoader };
})();
