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

	// Os ícones da biblioteca (o seletor de ícones das categorias e das produções): um arquivo por ícone na pasta
	// icons/ (nome.svg, ou nome.json para uma animação Lottie), na ordem de icons/icons.json (os que não estão nele
	// vêm depois, pelo nome). No After Effects a pasta é lida direto; no navegador (modo de teste), o retrato
	// icons/_snapshot.js (node extension/scripts/build-icons.js).
	var iconCache = null;
	var iconAliases = {}; // nome antigo → o ícone que ficou no lugar ({ "key", "same" } no icons.json)

	function iconDir() {
		var dir = decodeURI(location.pathname).replace(/\/[^\/]*$/, '') + '/icons';

		if (location.host) return '//' + location.host + dir; // na rede (file://servidor/share/…)

		return /^\/[A-Za-z]:/.test(dir) ? dir.slice(1) : dir; // Windows: /C:/… → C:/…
	}

	function readIconFolder() {
		var fs = require('fs');
		var dir = iconDir();
		var manifest = [];

		try {
			manifest = JSON.parse(fs.readFileSync(dir + '/icons.json', 'utf8'));
		} catch (err) { }

		manifest.forEach(function (m) {
			if (m.same) iconAliases[m.key] = m.same;
		});

		var byKey = {};

		// um nome.json (Lottie) passa à frente do nome.svg: dá para trocar um desenho por uma animação sem apagar o svg
		fs.readdirSync(dir).forEach(function (f) {
			var k = f.replace(/\.(svg|json)$/i, '');

			if (!/\.(svg|json)$/i.test(f) || f === 'icons.json' || /^_/.test(f)) return;
			if (!byKey[k] || /\.json$/i.test(f)) byKey[k] = f;
		});

		var order = manifest.filter(function (m) {
			return byKey[m.key];
		}).concat(Object.keys(byKey).sort().filter(function (k) {
			return !manifest.some(function (m) {
				return m.key === k;
			});
		}).map(function (k) {
			return { key: k, label: k };
		}));

		return order.map(function (m) {
			var file = byKey[m.key];
			var text = fs.readFileSync(dir + '/' + file, 'utf8');

			return /\.json$/i.test(file)
				? { key: m.key, label: m.label || m.key, type: 'lottie', tint: m.tint !== false, data: JSON.parse(text) }
				: { key: m.key, label: m.label || m.key, type: 'svg', svg: text.replace(/<\?xml[^>]*>/, '').trim() };
		});
	}

	function iconList() {
		if (iconCache) return iconCache;

		try {
			if (typeof require !== 'function') throw new Error('sem Node');
			iconCache = readIconFolder();
		} catch (err) {
			iconCache = window.PAD_ICON_SNAPSHOT || [];
			iconAliases = window.PAD_ICON_ALIASES || {};
		}

		return iconCache;
	}

	function findIcon(key) {
		var list = iconList();

		key = iconAliases[key] || key;

		for (var i = 0; i < list.length; i++) {
			if (list[i].key === key) return list[i];
		}

		return null;
	}

	// o desenho do ícone: o svg do arquivo (sem tamanho fixo: quem o mostra decide) ou, num Lottie, o lugar onde a
	// animação entra (montada sozinha quando aparece na página; toca ao passar o mouse)
	var iconCopies = 0;

	function iconMarkup(key) {
		var it = findIcon(key);

		if (!it) return '';
		// Lottie: um <svg> de verdade (as regras de tamanho dos ícones valem para ele), com a animação dentro
		if (it.type === 'lottie') return '<svg viewBox="0 0 24 24" class="pad-lottie' + (it.tint ? ' is-tint' : '') + '" data-lottie="' + it.key + '" aria-hidden="true"></svg>';

		// só a tag do svg perde o tamanho fixo (os retângulos de dentro mantêm o deles); '{u}' (ids de máscaras e
		// recortes) ganha um sufixo próprio de cada cópia
		var copy = '-i' + ++iconCopies;

		return it.svg.replace(/\{u\}/g, copy).replace(/<svg\b[^>]*>/, function (tag) {
			return tag.replace(/\s(width|height)="[^"]*"/g, '').replace(/<svg\b/, '<svg aria-hidden="true"');
		});
	}

	// Lottie: carrega a biblioteca (lib/lottie_light.min.js) na primeira vez e monta cada lugar que aparecer
	var lottieLoading = null;

	function withLottie(fn) {
		if (window.lottie) return fn();
		if (!lottieLoading) {
			lottieLoading = [];

			var script = document.createElement('script');

			script.src = 'lib/lottie_light.min.js';
			script.onload = function () {
				lottieLoading.forEach(function (f) {
					f();
				});
			};
			document.head.appendChild(script);
		}
		lottieLoading.push(fn);
	}

	function mountLottie(node) {
		if (node._lottie) return;

		var it = findIcon(node.getAttribute('data-lottie'));

		if (!it || it.type !== 'lottie') return;
		node._lottie = true;
		withLottie(function () {
			// a animação monta num lugar à parte e o desenho dela passa para o nosso <svg> (a biblioteca segue
			// animando os mesmos elementos)
			var box = document.createElement('div');
			var anim = window.lottie.loadAnimation({ container: box, renderer: 'svg', loop: false, autoplay: false, animationData: JSON.parse(JSON.stringify(it.data)) });
			var drawn = box.querySelector('svg');
			var host = node.closest('button, .dropdown-item, .dropdown-trigger, .wz-opt, .combo-item, .tab, .cat-line') || node;

			if (drawn) {
				node.setAttribute('viewBox', drawn.getAttribute('viewBox') || '0 0 24 24');
				while (drawn.firstChild) node.appendChild(drawn.firstChild);
			}

			anim.goToAndStop(0, true);
			host.addEventListener('mouseenter', function () {
				anim.goToAndPlay(0, true);
			});
		});
	}

	if (window.MutationObserver) {
		new MutationObserver(function (records) {
			records.forEach(function (r) {
				Array.prototype.forEach.call(r.addedNodes, function (n) {
					if (n.nodeType !== 1) return;
					if (n.matches && n.matches('.pad-lottie')) mountLottie(n);
					if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll('.pad-lottie'), mountLottie);
				});
			});
		}).observe(document.documentElement, { childList: true, subtree: true });
	}

	// PAD_UTIL.categoryIcon(icon) → '<svg …>' do ícone escolhido para a categoria na aba PROJETO ('' = sem
	// ícone: quem chama usa a pasta). nada pelo nome: vale só o escolhido
	function categoryIcon(icon) {
		return icon ? iconMarkup(icon) : '';
	}

	// a lista do seletor: [{ key, label, svg }]
	function iconLibrary() {
		return iconList().map(function (it) {
			return { key: it.key, label: it.label, svg: iconMarkup(it.key) };
		});
	}

	// A lixeira de uma linha (fora do campo, à direita): o mesmo botão da configuração
	var TRASH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><g class="trash-lid"><path d="M4.5 7h15" /><path d="M10 7V5h4v2" /></g><path d="M6.5 7h11l-1 12.5h-9z" /><path d="M10 11v5M14 11v5" /></svg>';

	function trashButton(title, onClick) {
		var btn = document.createElement('button');

		btn.type = 'button';
		btn.className = 'row-del';
		btn.title = title;
		btn.setAttribute('aria-label', title);
		btn.innerHTML = TRASH_SVG;
		btn.addEventListener('click', onClick);

		return btn;
	}

	// Excluir uma linha: ela esmaece, 'done' monta a lista de novo (já sem ela) e o que estava embaixo (as linhas
	// seguintes, o '+ novo' e o resto da seção) desliza da posição antiga para a nova
	function removeRow(row, done) {
		var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (!row || !row.animate || reduce) return done();

		var list = row.parentElement;
		var index = Array.prototype.indexOf.call(list.children, row);
		var tops = Array.prototype.slice.call(list.children, index + 1).map(function (c) {
			return c.getBoundingClientRect().top;
		});
		var after = [];

		for (var node = list; node && node !== document.body; node = node.parentElement) {
			for (var sib = node.nextElementSibling; sib; sib = sib.nextElementSibling) after.push({ node: sib, top: sib.getBoundingClientRect().top });
			if (node.classList && (node.classList.contains('cfg-card') || node.classList.contains('cfg-pane'))) break;
		}

		var slide = function (n, oldTop) {
			var dy = oldTop - n.getBoundingClientRect().top;

			if (Math.abs(dy) >= 1) n.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
		};

		row.style.pointerEvents = 'none';
		var fade = row.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110, easing: 'ease-out', fill: 'forwards' });

		fade.onfinish = function () {
			done();
			// a linha que só se esconde (não sai da página) volta ao normal para quando aparecer de novo (só o
			// esmaecimento daqui: as outras animações da linha seguem)
			fade.cancel();
			row.style.pointerEvents = '';
			Array.prototype.slice.call(list.children, index).forEach(function (c, j) {
				if (tops[j] != null) slide(c, tops[j]);
			});
			after.forEach(function (it) {
				if (document.body.contains(it.node)) slide(it.node, it.top);
			});
		};
	}

	window.PAD_UTIL = { iconEntry: findIcon, trashButton: trashButton, removeRow: removeRow, decodeIcon: decodeIcon, ovenLoader: ovenLoader, fileUrl: fileUrl, toast: toast, errorText: errorText, bindMenu: bindMenu, pathLine: pathLine, when: when, categoryIcon: categoryIcon, iconMarkup: iconMarkup, iconLibrary: iconLibrary };
})();
