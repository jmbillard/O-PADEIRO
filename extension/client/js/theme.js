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
	var BRAND_INK = '#18213a'; // o texto escuro sobre degradês claros
	var DARK_INK = '#10121a'; // modo escuro: texto, ícones e vidros sobre o degradê (o inverso do branco do claro)
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

	// contraste (WCAG) entre duas cores
	function luminance(hex) {
		return rgb(hex).map(function (v) {
			v /= 255;

			return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
		}).reduce(function (sum, v, i) {
			return sum + v * [0.2126, 0.7152, 0.0722][i];
		}, 0);
	}

	function contrast(a, b) {
		var x = luminance(a);
		var y = luminance(b);

		return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
	}

	// o destaque também pinta textos (títulos, opções, avisos): se ficar claro demais no fundo (ou escuro
	// demais, no modo escuro), escurece (ou clareia) aos poucos até dar para ler; a matiz fica a mesma
	function readable(color, surface, dark) {
		var out = color;

		for (var t = 0.05; contrast(out, surface) < 4.5 && t <= 1; t += 0.05) out = mix(color, dark ? '#ffffff' : '#000000', t);

		return out;
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

		// destaque e degradê (sólido: as pontas viram o destaque). --blue-500 também é cor de texto: vai na
		// versão legível; o meio dos degradês (--blue-mid) fica com a cor escolhida, como está
		set('--blue-500', readable(t.accent, surface, dark));
		set('--blue-mid', t.accent);
		set('--blue-ink', readable(solid ? t.accent : t.gradientEnd, surface, dark)); // a ponta escura, como texto
		set('--blue-400', solid ? t.accent : t.gradientStart);
		set('--blue-600', solid ? t.accent : t.gradientEnd);
		set('--blue-700', mix(readable(t.accent, surface, dark), '#000000', 0.25));

		// os mesmos tons em r g b (brilhos, anéis de foco e sombras coloridas com transparência)
		set('--accent-rgb', rgb(readable(t.accent, surface, dark)).join(' '));
		set('--accent-deep-rgb', rgb(solid ? t.accent : t.gradientEnd).join(' '));
		set('--glow-rgb', rgb(mix(solid ? t.accent : t.gradientStart, '#ffffff', 0.45)).join(' '));
		set('--shade-rgb', rgb(mix(solid ? t.accent : t.gradientEnd, '#000000', 0.35)).join(' '));

		// tons claros (no escuro, misturados com a superfície escura)
		set('--blue-50', mix(t.accent, surface, dark ? 0.86 : 0.95));
		set('--blue-100', mix(t.accent, surface, dark ? 0.8 : 0.9));
		set('--blue-200', mix(t.accent, surface, dark ? 0.6 : 0.74));
		set('--blue-300', mix(t.accent, surface, dark ? 0.35 : 0.42));

		// texto sobre o degradê: branco, a não ser que o degradê seja claro demais para ele (contraste médio
		// abaixo de 3:1 nas pontas e no meio) e o escuro se leia melhor
		var stops = solid ? [t.accent] : [t.gradientStart, t.accent, t.gradientEnd];
		var average = function (ink) {
			return stops.reduce(function (sum, c) {
				return sum + contrast(ink, c);
			}, 0) / stops.length;
		};
		var white = average('#ffffff');

		// modo escuro: o inverso do claro (texto, ícones e vidros pretos sobre o degradê)
		if (dark) set('--on-brand', rgb(DARK_INK).join(' '));
		else set('--on-brand', white >= 3 || white >= average(BRAND_INK) ? '255 255 255' : rgb(BRAND_INK).join(' '));

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
		FONTS: FONTS,
		current: function () {
			return current;
		}
	};
})();
