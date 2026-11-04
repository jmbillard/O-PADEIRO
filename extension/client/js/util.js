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

	// Loader temático (css/loader.css): um roteiro (doc do Word) cai na boca do forno, o forno trabalha e
	// sai um vídeo pulando para a esteira, que leva até a pasta. Um SVG só, animado por CSS (transform e
	// opacity). Os ids das máscaras e recortes são únicos por loader (pode haver mais de um na página).
	var ovenSeq = 0;
	var PAGE = 'M4 2.5h11l5.5 5.5v19.5H4z';

	function ovenArt() {
		var n = ++ovenSeq;
		var gap = 'ov-gap-' + n;
		var hide = 'ov-hide-' + n;
		var file = function (kind, silhouette) {
			var inner = silhouette
				? '<path d="' + PAGE + '" fill="black" stroke="black" stroke-width="5" />'
				: '<path class="o" d="' + PAGE + '" /><path class="d" d="M15 2.5V8h5.5" />' +
				  (kind === 'doc'
					? '<path class="d" d="M12 12.5h5.5M12 16h5.5M8 19.5h9.5M8 23h9.5" /><rect class="f" x="1.5" y="9.5" width="9" height="8" rx="1.5" />'
					: '<path class="f" d="M10 13.5v8l6-4z" />');

			// 24 x 30 → 38,4 x 48 (escala 1,6; o traço é compensado no CSS para ficar igual ao resto)
			return '<g class="ov-' + kind + '"><g class="ov-file" transform="translate(30.8 66) scale(1.6)">' + inner + '</g></g>';
		};

		return '<svg class="oven-art" viewBox="0 0 300 120">' +
			'<defs>' +
			// onde os arquivos aparecem: acima da porta (que abre), entre o forno e a pasta, e dentro do fundo da pasta
			'<clipPath id="' + gap + '"><rect class="ov-gap" x="-20" y="-80" width="116" height="144" /><rect x="96" y="-80" width="118" height="168" /><rect x="214" y="-80" width="90" height="138" />' +
			'<path d="M214 88V60.5a2.5 2.5 0 0 1 2.5-2.5H236l5 5h48.5a2.5 2.5 0 0 1 2.5 2.5V88z" /></clipPath>' +
			// os arquivos passam na frente do forno: as linhas do forno somem atrás deles
			'<mask id="' + hide + '" maskUnits="userSpaceOnUse" x="-20" y="-80" width="340" height="220"><rect x="-20" y="-80" width="340" height="220" fill="white" />' + file('doc', true) + file('vid', true) + '</mask>' +
			'</defs>' +
			'<g class="ov-shake">' +
			'<g mask="url(#' + hide + ')"><rect class="o" x="6" y="32" width="88" height="84" rx="14" /><path class="m" d="M6 56h88" />' +
			'<circle class="b" cx="23.5" cy="43.5" r="5.5" /><circle class="b" cx="46.5" cy="43.5" r="5.5" /><circle class="b" cx="69.5" cy="43.5" r="5.5" />' +
			'<path class="b ov-knob" d="M20.5 45l6-3" /><path class="b ov-knob" d="M43.5 43.5h6" /><path class="b ov-knob" d="M66.8 41.5l5.4 4" />' +
			'<rect class="b" x="19" y="67" width="62" height="36" rx="7" clip-path="url(#' + gap + ')" /></g>' +
			'</g>' +
			'<rect class="o ov-belt" x="102" y="88" width="104" height="20" rx="10" /><rect class="m" x="105.5" y="91.5" width="97" height="13" rx="6.5" />' +
			['112', '154', '196'].map(function (x) {
				return '<g class="ov-wheel"><circle class="b" cx="' + x + '" cy="98" r="4.2" /><circle class="f" cx="' + (+x + 1.9) + '" cy="96.6" r="1" /></g>';
			}).join('') +
			'<g class="ov-folder"><path class="o" mask="url(#' + hide + ')" d="M214 116V60.5a2.5 2.5 0 0 1 2.5-2.5H236l5 5h48.5a2.5 2.5 0 0 1 2.5 2.5V88" /></g>' +
			'<g clip-path="url(#' + gap + ')">' + file('doc') + file('vid') + '</g>' +
			'<g class="ov-shake"><g class="ov-door"><rect class="b" x="16" y="64" width="68" height="42" rx="10" /><rect class="d" x="33" y="69" width="30" height="5" rx="2.5" /><rect class="d" x="22" y="81" width="56" height="20" rx="6" /></g></g>' +
			'<g class="ov-folder"><g class="ov-flap"><path class="o" d="M214 116h78l6-28H220z" /></g></g>' +
			'</svg>';
	}

	// Os loaders escritos direto no HTML (<div class="oven"></div>) recebem o desenho aqui.
	Array.prototype.forEach.call(document.querySelectorAll('.oven:empty'), function (node) {
		node.innerHTML = ovenArt();
	});

	function ovenLoader(title, hint, light, compact) {
		var box = document.createElement('div');

		box.className = 'oven-loader' + (light ? ' is-light' : '') + (compact ? ' is-compact' : '');
		box.setAttribute('role', 'status');
		box.innerHTML =
			'<div class="oven" aria-hidden="true">' + ovenArt() + '</div>' +
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

	// Data e hora curtas: hoje 14:32 · ontem 09:10 · terça 16:20 (até 6 dias atrás) · 28/10 14:32 · 28/10/2025 14:32
	var WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

	function when(iso) {
		var t = Date.parse(iso || '');

		if (isNaN(t)) return '';

		var d = new Date(t);
		var now = new Date();
		var pad = function (n) {
			return (n < 10 ? '0' : '') + n;
		};
		var day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		var time = pad(d.getHours()) + ':' + pad(d.getMinutes());

		// dias de calendário até hoje (meia-noite a meia-noite: a mudança de horário de verão não atrapalha)
		var days = Math.round((day - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);

		if (days <= 0) return 'hoje ' + time;
		if (days === 1) return 'ontem ' + time;
		if (days <= 6) return WEEKDAYS[d.getDay()] + ' ' + time;

		return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + (d.getFullYear() === now.getFullYear() ? '' : '/' + d.getFullYear()) + ' ' + time;
	}

	// Os ícones do seletor (aba PROJETO > categorias), estáticos: [chave, nome, desenho do svg]. os das
	// categorias primeiro (os que o nome escolhe sozinho), depois os outros desenhos do padeiro.
	var ICONS = [
		['tv', 'TV de tubo', '<path d="m8.5 3.5 3.5 4 3.5-4" /><rect x="3" y="7.5" width="18" height="13" rx="2.5" /><rect x="5.5" y="10" width="10.5" height="8" rx="2" /><path d="M18.5 11.5h.01M18.5 15h.01" />'],
		['jornal', 'jornal', '<path d="M5 5.5h11v13a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 18.5z" /><path d="M16 9h2.5v9.5a1.5 1.5 0 0 1-3 0" /><path d="M8 9h5M8 12h5M8 15h3" />'],
		['mascaras', 'máscaras', '<path d="M4 5.5c2.7 1 5.3 1 8 0v5.5a4 4 0 0 1-8 0z" /><path d="M6 9h.01M10 9h.01M6.5 12c.8.7 2.2.7 3 0" /><path d="M12 9.5c2.7 1 5.3 1 8 0V15a4 4 0 0 1-8 0" /><path d="M14 13h.01M18 13h.01M14.5 17.2c.8-.7 2.2-.7 3 0" />'],
		['episodios', 'episódios', '<rect x="3" y="8" width="14" height="11" rx="2" /><path d="M6 5h12a2 2 0 0 1 2 2v9" /><path d="m8.5 11 4 2.5-4 2.5z" />'],
		['microfone', 'microfone', '<rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M8.5 21h7" />'],
		['pelicula', 'película', '<rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M7.5 5v14M16.5 5v14" /><path d="M5.5 6v12M18.5 6v12" stroke-dasharray="1.2 2" />'],
		['bola', 'bola', '<circle cx="12" cy="12" r="8.5" /><path d="m12 7.5 3.5 2.5-1.3 4h-4.4L8.5 10z" /><path d="M12 3.5v4M15.5 10l4.3-1.2M14.2 14l2.7 3.7M9.8 14l-2.7 3.7M8.5 10 4.2 8.8" />'],
		['sinal', 'sinal ao vivo', '<circle cx="12" cy="12" r="2" /><path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.4 5.4a9.3 9.3 0 0 0 0 13.2M18.6 5.4a9.3 9.3 0 0 1 0 13.2" />'],
		['estrela', 'estrela', '<path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z" />'],
		['megafone', 'megafone', '<path d="M4 10v4h3l7 4V6L7 10z" /><path d="M17 9.5a3.5 3.5 0 0 1 0 5M7 14l1 5h2.5l-1-4.4" />'],
		['microfone-mao', 'microfone de mão', '<circle cx="15" cy="8" r="4" /><path d="m12.2 10.8-7.7 7.7a1.4 1.4 0 0 0 2 2l7.7-7.7" /><path d="M13.3 6.3l3.4 3.4" />'],
		['antena', 'antena', '<circle cx="12" cy="11" r="1.6" /><path d="M8.5 7.5a5 5 0 0 0 0 7M15.5 7.5a5 5 0 0 1 0 7M5.7 4.7a9 9 0 0 0 0 12.6M18.3 4.7a9 9 0 0 1 0 12.6M12 12.6V20" />'],
		['no-ar', 'luz no ar', '<rect x="3" y="7" width="18" height="10" rx="5" /><circle cx="8" cy="12" r="1.6" /><path d="M12 10.5h5M12 13.5h3" />'],
		['coracao', 'coração', '<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z" />'],
		['camera', 'câmera', '<rect x="3.5" y="7" width="12" height="9" rx="1.8" /><path d="m15.5 10.5 5-2.5v8l-5-2.5" /><path d="M9.5 16v4M6.5 20h6" />'],
		['claquete', 'claquete', '<path d="M4 10h16v8.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z" /><path d="m4 10-.6-3 15-3.2.6 3z" /><path d="m8 6.3 2.2 2.9M12.6 5.3l2.2 2.9" />'],
		['trofeu', 'troféu', '<path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13v3.5M8.5 20h7M10 16.5h4V20h-4z" />'],
		['alvo', 'alvo', '<circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" />'],
		['balao', 'mensagem', '<path d="M5.5 5h13A2.5 2.5 0 0 1 21 7.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17h-1A2.5 2.5 0 0 1 3 14.5v-7A2.5 2.5 0 0 1 5.5 5z" />'],
		['lapis', 'lápis', '<path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" />'],
		['rolo', 'edição', '<path d="M9.5 6.5H7.5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2M14.5 6.5h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2" /><path d="M12 4.5v15" />'],
		['templates', 'templates', '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M9 9.5v10" />'],
		['fonte', 'fonte', '<path d="M5.5 7.5V5.5h13v2M12 5.5v13M9 18.5h6" />'],
		['camadas', 'camadas', '<path d="m12 3-8.5 4.25L12 11.5l8.5-4.25z" /><path d="m3.5 12 8.5 4.25L20.5 12" /><path d="m3.5 16.5 8.5 4.25 8.5-4.25" />'],
		['renomear', 'renomear', '<rect x="2.5" y="6.5" width="19" height="11" rx="3" /><path d="M6 12h2.4M10.3 12h2.4M14.6 12h2.4M18.6 9.6v4.8" />'],
		['lupa', 'lupa', '<circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" />'],
		['link', 'link', '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />'],
		['globo', 'globo', '<circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5s1.2-6.2 3.6-8.5z" />'],
		['pessoa', 'pessoa', '<circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5" />'],
		['servidor', 'servidor', '<rect x="4" y="4.5" width="16" height="6" rx="1.5" /><rect x="4" y="13.5" width="16" height="6" rx="1.5" /><path d="M7.5 7.5h.01M7.5 16.5h.01" />'],
		['relogio', 'relógio', '<circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" />'],
		['etiqueta', 'etiqueta', '<path d="M3.5 12.6V5A1.5 1.5 0 0 1 5 3.5h7.6l8 8a1.5 1.5 0 0 1 0 2.1l-7 7a1.5 1.5 0 0 1-2.1 0z" /><circle cx="8" cy="8" r="1.4" />'],
		['arquivo', 'arquivo', '<path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><path d="M13.5 3.5V8H18" />'],
		['pasta', 'pasta', '<path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" />']
	];

	// a sugestão de ícone para uma categoria nova (preencher pelas atrações), gravada nela: depois, é o escolhido
	// no seletor que vale (as do DB: PROGRAMAS, ON-AIR, ESPORTES, SHOWS, NOVELAS, SERIES, JORNALISMO, FILMES,
	// INSTITUCIONAL, MARKETING)
	var CATEGORY_AUTO = [[/^SHOW/, 'microfone'], [/^JORNAL/, 'jornal'], [/^NOVELA/, 'mascaras'], [/^PROGRAMA/, 'tv'], [/^FILME/, 'pelicula'], [/^INSTITUC/, 'estrela'], [/^ON ?-? ?AIR/, 'sinal'], [/^SERIE/, 'episodios'], [/^MARKETING/, 'megafone'], [/^ESPORTE/, 'bola']];

	function iconMarkup(key) {
		for (var i = 0; i < ICONS.length; i++) {
			if (ICONS[i][0] === key) return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[i][2] + '</svg>';
		}

		return '';
	}

	// a chave sugerida para o nome da categoria ('' = sem sugestão: a pasta)
	function categoryIconKey(cat) {
		var key = String(cat || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^.*[\\/]/, '').trim();

		for (var i = 0; i < CATEGORY_AUTO.length; i++) {
			if (CATEGORY_AUTO[i][0].test(key)) return CATEGORY_AUTO[i][1];
		}

		return '';
	}

	// PAD_UTIL.categoryIcon(icon) → '<svg …>' do ícone escolhido para a categoria na aba PROJETO ('' = sem
	// ícone: quem chama usa a pasta). nada pelo nome: vale só o escolhido
	function categoryIcon(icon) {
		return icon ? iconMarkup(icon) : '';
	}

	// a lista do seletor: [{ key, label, svg }]
	function iconLibrary() {
		return ICONS.map(function (it) {
			return { key: it[0], label: it[1], svg: iconMarkup(it[0]) };
		});
	}

	window.PAD_UTIL = { decodeIcon: decodeIcon, ovenLoader: ovenLoader, fileUrl: fileUrl, toast: toast, errorText: errorText, bindMenu: bindMenu, pathLine: pathLine, when: when, categoryIcon: categoryIcon, categoryIconKey: categoryIconKey, iconMarkup: iconMarkup, iconLibrary: iconLibrary };
})();
