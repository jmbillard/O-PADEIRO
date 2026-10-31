/*

---------------------------------------------------------------
> aparência (todas as janelas)
---------------------------------------------------------------

Aplica o tema da configuração (aba APARÊNCIA): modo claro / escuro / automático, fundo em degradê ou sólido,
as cores (destaque e as pontas do degradê, com os tons claros calculados a partir do destaque), a fonte e a
logo da barra. O último tema fica guardado no navegador do painel e é aplicado assim que a janela abre; depois
o painel confere a configuração e acompanha as mudanças (a cada 5 s, com a janela à vista).

  PAD_THEME.apply(tema)   → aplica nesta janela (a configuração usa para a prévia)
  PAD_THEME.defaults      → o tema padrão

*/

(function () {
	'use strict';

	var KEY = 'pad.theme';
	var DEFAULTS = { mode: 'light', background: 'gradient', accent: '#5184f8', gradientStart: '#67b7ff', gradientEnd: '#5649e9', font: 'inter', logo: '' };
	var FONTS = {
		inter: 'Inter',
		system: 'system-ui, -apple-system',
		helvetica: '"Helvetica Neue", Helvetica, Arial',
		segoe: '"Segoe UI", Tahoma',
		roboto: 'Roboto, "Helvetica Neue", Arial',
		georgia: 'Georgia, "Times New Roman", serif',
		mono: 'ui-monospace, Menlo, Consolas, monospace'
	};
	var SURFACE = { light: '#ffffff', dark: '#1c2130' };
	var current = null;
	var stamp = null;

	function rgb(hex) {
		var n = parseInt(String(hex).replace('#', ''), 16);

		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}

	// mistura 'a' com 'b' (t = quanto de 'b')
	function mix(a, b, t) {
		var x = rgb(a);
		var y = rgb(b);

		return '#' + x.map(function (v, i) {
			return ('0' + Math.round(v + (y[i] - v) * t).toString(16)).slice(-2);
		}).join('');
	}

	function isDark(theme) {
		if (theme.mode === 'dark') return true;
		if (theme.mode === 'auto') return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

		return false;
	}

	function apply(theme) {
		var t = Object.assign({}, DEFAULTS, theme || {});
		var root = document.documentElement;
		var dark = isDark(t);
		var solid = t.background === 'solid';
		var surface = dark ? SURFACE.dark : SURFACE.light;
		var set = function (name, value) {
			root.style.setProperty(name, value);
		};

		current = t;
		root.setAttribute('data-theme', dark ? 'dark' : 'light');
		root.setAttribute('data-bg', solid ? 'solid' : 'gradient');

		// destaque e degradê (sólido: as pontas viram o destaque)
		set('--blue-500', t.accent);
		set('--blue-400', solid ? t.accent : t.gradientStart);
		set('--blue-600', solid ? t.accent : t.gradientEnd);
		set('--blue-700', mix(t.accent, '#000000', 0.25));

		// tons claros (no escuro, misturados com a superfície escura)
		set('--blue-50', mix(t.accent, surface, dark ? 0.86 : 0.95));
		set('--blue-100', mix(t.accent, surface, dark ? 0.8 : 0.9));
		set('--blue-200', mix(t.accent, surface, dark ? 0.6 : 0.74));
		set('--blue-300', mix(t.accent, surface, dark ? 0.35 : 0.42));

		set('--font-ui', FONTS[t.font] || FONTS.inter);

		try {
			document.dispatchEvent(new CustomEvent('pad-theme', { detail: t }));
		} catch (err) { }
	}

	function remember(theme) {
		try {
			localStorage.setItem(KEY, JSON.stringify(theme));
		} catch (err) { }
	}

	async function refresh() {
		if (document.hidden || !window.PAD_BRIDGE) return;

		try {
			var res = await PAD_BRIDGE.call('appearance');

			if (res.stamp === stamp) return;

			stamp = res.stamp;
			remember(res.appearance);
			apply(res.appearance);
		} catch (err) { }
	}

	// o último tema já na abertura (sem piscar o padrão)
	var cached = null;

	try {
		cached = JSON.parse(localStorage.getItem(KEY) || 'null');
	} catch (err) { }

	apply(cached || DEFAULTS);

	// automático: acompanha o sistema
	if (window.matchMedia) {
		var mq = window.matchMedia('(prefers-color-scheme: dark)');
		var onChange = function () {
			if (current && current.mode === 'auto') apply(current);
		};

		if (mq.addEventListener) mq.addEventListener('change', onChange);
		else if (mq.addListener) mq.addListener(onChange);
	}

	refresh();
	setInterval(refresh, 5000);
	window.addEventListener('focus', refresh);

	window.PAD_THEME = {
		apply: apply,
		defaults: DEFAULTS,
		current: function () {
			return current;
		}
	};
})();
