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

	// Loader temático (css/loader.css): o forninho assando pãezinhos, que pulam na esteira e caem na cesta (o
	// desenho da equipe, canvas "O Padeiro — Loader"). Uma cena de 480 × 216, animada só por CSS (transform e
	// opacity); o título e a dica ficam embaixo, fora dela.
	var BAKERY = '<div style="position: absolute; left: 30px; top: 196px; width: 172px; height: 20px; background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.20) 0%, rgba(0, 0, 0, 0) 70%)"></div><div style="position: absolute; left: 176px; top: 200px; width: 178px; height: 12px; background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0) 70%)"></div><div style="position: absolute; left: 348px; top: 197px; width: 116px; height: 18px; background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.20) 0%, rgba(0, 0, 0, 0) 70%)"></div><div class="bk-steam" style="position: absolute; left: 72px; top: 10px; width: 10px; height: 10px; border-radius: 50%; background: #D4D4D4; animation-delay: calc(var(--dur, 4.8s) * -0.00)"></div><div class="bk-steam" style="position: absolute; left: 78px; top: 10px; width: 8px; height: 8px; border-radius: 50%; background: #D4D4D4; animation-delay: calc(var(--dur, 4.8s) * -0.17)"></div><div class="bk-steam" style="position: absolute; left: 68px; top: 10px; width: 9px; height: 9px; border-radius: 50%; background: #D4D4D4; animation-delay: calc(var(--dur, 4.8s) * -0.34)"></div><div style="position: absolute; left: 193.5px; top: 136px; width: 11px; height: 70px; border-radius: 0 0 5px 5px; background: #2D2D2D"></div><div style="position: absolute; left: 327.5px; top: 136px; width: 11px; height: 70px; border-radius: 0 0 5px 5px; background: #2D2D2D"></div><div style="position: absolute; left: 172px; top: 112px; width: 178px; height: 26px; box-sizing: border-box; border: 5px solid #2D2D2D; border-radius: 13px; background: #F1F1F1"></div><div class="bk-ticks" style="position: absolute; z-index: 1; left: 186px; top: 112px; width: 150px; height: 5px; background-image: repeating-linear-gradient(90deg, #9A9A9A 0, #9A9A9A 3px, transparent 3px, transparent 17.5px)"></div><div class="bk-spin" style="position: absolute; z-index: 1; left: 179px; top: 119px; width: 12px; height: 12px; border-radius: 50%; background: #8A8A8A; display: flex; align-items: center; justify-content: center"><div style="width: 2px; height: 8px; border-radius: 1px; background: #F1F1F1"></div></div><div class="bk-spin" style="position: absolute; z-index: 1; left: 255px; top: 119px; width: 12px; height: 12px; border-radius: 50%; background: #8A8A8A; display: flex; align-items: center; justify-content: center"><div style="width: 2px; height: 8px; border-radius: 1px; background: #F1F1F1"></div></div><div class="bk-spin" style="position: absolute; z-index: 1; left: 331px; top: 119px; width: 12px; height: 12px; border-radius: 50%; background: #8A8A8A; display: flex; align-items: center; justify-content: center"><div style="width: 2px; height: 8px; border-radius: 1px; background: #F1F1F1"></div></div><div class="bk-bun" style="position: absolute; z-index: 1; left: 140px; top: 86px; width: 40px; height: 26px; animation-delay: 0s"><div class="bk-wfade" aria-hidden="true" style="position: absolute; inset: 0; animation-delay: 0s"><div class="bk-wisp" aria-hidden="true" style="position: absolute; left: 10px; top: -12px; width: 3px; height: 9px; border-radius: 2px; background: #BDBDBD"></div><div class="bk-wisp" aria-hidden="true" style="position: absolute; left: 19px; top: -15px; width: 3px; height: 11px; border-radius: 2px; background: #BDBDBD; animation-delay: calc(var(--dur, 4.8s) * -0.08)"></div><div class="bk-wisp" aria-hidden="true" style="position: absolute; left: 28px; top: -12px; width: 3px; height: 9px; border-radius: 2px; background: #BDBDBD; animation-delay: calc(var(--dur, 4.8s) * -0.16)"></div></div><div class="bk-hop" style="position: relative; width: 40px; height: 26px; border-radius: 20px 20px 7px 7px / 19px 19px 7px 7px; background: #E9A857; box-shadow: inset 0 -5px 0 rgba(150, 84, 24, 0.28); animation-delay: 0s"><div style="position: absolute; left: 10px; top: 6px; width: 3px; height: 9px; border-radius: 2px; background: #B9742F; transform: rotate(24deg)"></div><div style="position: absolute; left: 18px; top: 4px; width: 3px; height: 10px; border-radius: 2px; background: #B9742F; transform: rotate(24deg)"></div><div style="position: absolute; left: 26px; top: 6px; width: 3px; height: 9px; border-radius: 2px; background: #B9742F; transform: rotate(24deg)"></div></div></div><div class="bk-bun" style="position: absolute; z-index: 1; left: 140px; top: 86px; width: 40px; height: 26px; animation-delay: calc(var(--dur, 4.8s) * -0.25)"><div class="bk-wfade" aria-hidden="true" style="position: absolute; inset: 0; animation-delay: calc(var(--dur, 4.8s) * -0.25)"><div class="bk-wisp" aria-hidden="true" style="position: absolute; left: 10px; top: -12px; width: 3px; height: 9px; border-radius: 2px; background: #BDBDBD"></div><div class="bk-wisp" aria-hidden="true" style="position: absolute; left: 19px; top: -15px; width: 3px; height: 11px; border-radius: 2px; background: #BDBDBD; animation-delay: calc(var(--dur, 4.8s) * -0.08)"></div><div class="bk-wisp" aria-hidden="true" style="position: absolute; left: 28px; top: -12px; width: 3px; height: 9px; border-radius: 2px; background: #BDBDBD; animation-delay: calc(var(--dur, 4.8s) * -0.16)"></div></div><div class="bk-hop" style="position: relative; width: 40px; height: 26px; border-radius: 20px 20px 7px 7px / 19px 19px 7px 7px; background: #E9A857; box-shadow: inset 0 -5px 0 rgba(150, 84, 24, 0.28); animation-delay: calc(var(--dur, 4.8s) * -0.25)"><div style="position: absolute; left: 10px; top: 6px; width: 3px; height: 9px; border-radius: 2px; background: #B9742F; transform: rotate(24deg)"></div><div style="position: absolute; left: 18px; top: 4px; width: 3px; height: 10px; border-radius: 2px; background: #B9742F; transform: rotate(24deg)"></div><div style="position: absolute; left: 26px; top: 6px; width: 3px; height: 9px; border-radius: 2px; background: #B9742F; transform: rotate(24deg)"></div></div></div><div class="bk-bun" style="position: absolute; z-index: 1; left: 140px; top: 86px; width: 40px; height: 26px; animation-delay: calc(var(--dur, 4.8s) * -0.5)"><div class="bk-wfade" aria-hidden="true" style="position: absolute; inset: 0; animation-delay: calc(var(--dur, 4.8s) * -0.5)"><div class="bk-wisp" aria-hidden="true" style="position: absolute; left: 10px; top: -12px; width: 3px; height: 9px; border-radius: 2px; background: #BDBDBD"></div><div class="bk-wisp" aria-hidden="true" style="position: absolute; left: 19px; top: -15px; width: 3px; height: 11px; border-radius: 2px; background: #BDBDBD; animation-delay: calc(var(--dur, 4.8s) * -0.08)"></div><div class="bk-wisp" aria-hidden="true" style="position: absolute; left: 28px; top: -12px; width: 3px; height: 9px; border-radius: 2px; background: #BDBDBD; animation-delay: calc(var(--dur, 4.8s) * -0.16)"></div></div><div class="bk-hop" style="position: relative; width: 40px; height: 26px; border-radius: 20px 20px 7px 7px / 19px 19px 7px 7px; background: #E9A857; box-shadow: inset 0 -5px 0 rgba(150, 84, 24, 0.28); animation-delay: calc(var(--dur, 4.8s) * -0.5)"><div style="position: absolute; left: 10px; top: 6px; width: 3px; height: 9px; border-radius: 2px; background: #B9742F; transform: rotate(24deg)"></div><div style="position: absolute; left: 18px; top: 4px; width: 3px; height: 10px; border-radius: 2px; background: #B9742F; transform: rotate(24deg)"></div><div style="position: absolute; left: 26px; top: 6px; width: 3px; height: 9px; border-radius: 2px; background: #B9742F; transform: rotate(24deg)"></div></div></div><div class="bk-bun" style="position: absolute; z-index: 1; left: 140px; top: 86px; width: 40px; height: 26px; animation-delay: calc(var(--dur, 4.8s) * -0.75)"><div class="bk-wfade" aria-hidden="true" style="position: absolute; inset: 0; animation-delay: calc(var(--dur, 4.8s) * -0.75)"><div class="bk-wisp" aria-hidden="true" style="position: absolute; left: 10px; top: -12px; width: 3px; height: 9px; border-radius: 2px; background: #BDBDBD"></div><div class="bk-wisp" aria-hidden="true" style="position: absolute; left: 19px; top: -15px; width: 3px; height: 11px; border-radius: 2px; background: #BDBDBD; animation-delay: calc(var(--dur, 4.8s) * -0.08)"></div><div class="bk-wisp" aria-hidden="true" style="position: absolute; left: 28px; top: -12px; width: 3px; height: 9px; border-radius: 2px; background: #BDBDBD; animation-delay: calc(var(--dur, 4.8s) * -0.16)"></div></div><div class="bk-hop" style="position: relative; width: 40px; height: 26px; border-radius: 20px 20px 7px 7px / 19px 19px 7px 7px; background: #E9A857; box-shadow: inset 0 -5px 0 rgba(150, 84, 24, 0.28); animation-delay: calc(var(--dur, 4.8s) * -0.75)"><div style="position: absolute; left: 10px; top: 6px; width: 3px; height: 9px; border-radius: 2px; background: #B9742F; transform: rotate(24deg)"></div><div style="position: absolute; left: 18px; top: 4px; width: 3px; height: 10px; border-radius: 2px; background: #B9742F; transform: rotate(24deg)"></div><div style="position: absolute; left: 26px; top: 6px; width: 3px; height: 9px; border-radius: 2px; background: #B9742F; transform: rotate(24deg)"></div></div></div><div style="position: absolute; z-index: 0; left: 368px; top: 158px; width: 76px; height: 20px; border-radius: 4px; background: #6E421B"></div><div class="bk-pile" style="position: absolute; z-index: 1; left: 366px; top: 144px; width: 80px; height: 40px"><div style="position: absolute; left: 2px; top: 6px; width: 40px; height: 26px; border-radius: 20px 20px 7px 7px / 19px 19px 7px 7px; background: #E9A857; box-shadow: inset 0 -5px 0 rgba(150, 84, 24, 0.28); transform: rotate(-12deg)"></div><div style="position: absolute; left: 38px; top: 7px; width: 40px; height: 26px; border-radius: 20px 20px 7px 7px / 19px 19px 7px 7px; background: #E9A857; box-shadow: inset 0 -5px 0 rgba(150, 84, 24, 0.28); transform: rotate(14deg)"></div><div style="position: absolute; left: 20px; top: 1px; width: 40px; height: 26px; border-radius: 20px 20px 7px 7px / 19px 19px 7px 7px; background: #E9A857; box-shadow: inset 0 -5px 0 rgba(150, 84, 24, 0.28); transform: rotate(4deg)"></div></div><div class="bk-wisp2" aria-hidden="true" style="position: absolute; z-index: 1; left: 392px; top: 130px; width: 3px; height: 13px; border-radius: 2px; background: #BDBDBD"></div><div class="bk-wisp2" aria-hidden="true" style="position: absolute; z-index: 1; left: 414px; top: 132px; width: 3px; height: 12px; border-radius: 2px; background: #BDBDBD; animation-delay: calc(var(--dur, 4.8s) * -0.2)"></div><div style="position: absolute; z-index: 3; left: 366px; top: 162px; width: 80px; height: 44px; border-radius: 4px 4px 16px 16px; background-color: #C98A4B; background-image: repeating-linear-gradient(90deg, rgba(110, 66, 27, 0.35) 0, rgba(110, 66, 27, 0.35) 2px, transparent 2px, transparent 10px); overflow: hidden; display: flex; flex-direction: column; justify-content: space-evenly"><div style="height: 3px; background: #A9692F"></div><div style="height: 3px; background: #A9692F"></div><div style="height: 3px; background: #A9692F"></div></div><div style="position: absolute; z-index: 3; left: 361px; top: 157px; width: 90px; height: 9px; border-radius: 5px; background: #B5763A"></div><div class="bk-oven" style="position: absolute; z-index: 2; left: 48px; top: 36px; width: 136px; height: 158px"><div style="position: absolute; left: 22px; top: -12px; width: 16px; height: 14px; border-radius: 3px 3px 0 0; background: #AD4223"></div><div style="position: absolute; left: 14px; bottom: -12px; width: 12px; height: 13px; border-radius: 0 0 4px 4px; background: #AD4223"></div><div style="position: absolute; right: 14px; bottom: -12px; width: 12px; height: 13px; border-radius: 0 0 4px 4px; background: #AD4223"></div><div style="position: absolute; right: -4px; top: 44px; width: 10px; height: 44px; border-radius: 3px; background: #2A1A14"></div><div style="position: absolute; inset: 0; border-radius: 18px; background: linear-gradient(165deg, #E76B47 0%, #E4572E 45%, #C04927 100%); box-shadow: inset 0 -8px 12px rgba(0, 0, 0, 0.1)"></div><div style="position: absolute; left: 16px; top: 12px; right: 16px; height: 10px; display: flex; align-items: center; gap: 8px"><div style="width: 10px; height: 10px; border-radius: 50%; background: #FFF3E0"></div><div style="width: 10px; height: 10px; border-radius: 50%; background: #FFF3E0"></div><div style="width: 10px; height: 10px; border-radius: 50%; background: #FFF3E0"></div><div style="flex: 1"></div><div class="bk-glow" style="width: 8px; height: 8px; border-radius: 50%; background: #FFD25E"></div></div><div style="position: absolute; left: 16px; top: 34px; width: 104px; height: 72px; border-radius: 12px; background: #2A1A14; overflow: hidden; box-shadow: 0 0 0 4px #FFF3E0, 0 0 0 5.5px rgba(0, 0, 0, 0.14); display: flex; align-items: flex-end; justify-content: center"><div class="bk-glow" style="position: absolute; inset: 0; background: #FF8A3D"></div><div class="bk-rise" style="position: relative; width: 46px; height: 30px; margin-bottom: 12px; border-radius: 20px 20px 7px 7px / 19px 19px 7px 7px; background: #E9A857; box-shadow: inset 0 -5px 0 rgba(150, 84, 24, 0.28)"></div><div style="position: absolute; left: 12px; right: 12px; bottom: 9px; height: 3px; border-radius: 2px; background: #2A1A14"></div><div class="bk-glint" aria-hidden="true" style="position: absolute; left: -50px; top: -30px; width: 40px; height: 140px; transform: rotate(24deg)"><div style="position: absolute; left: 0; top: 0; width: 16px; height: 140px; background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0))"></div><div style="position: absolute; left: 24px; top: 0; width: 6px; height: 140px; background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0))"></div></div></div><div style="position: absolute; left: 38px; top: 117px; width: 60px; height: 7px; border-radius: 4px; background: #FFF3E0"></div><div style="position: absolute; left: 16px; top: 136px; width: 104px; height: 4px; border-radius: 2px; background: #AD4223"></div><div style="position: absolute; left: 16px; top: 144px; width: 104px; height: 4px; border-radius: 2px; background: #AD4223"></div></div>';

	function ovenArt() {
		return '<div class="bakery">' + BAKERY + '</div>';
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

	// Depois de instalar fontes: pede ao After Effects que enxergue as novas e passe as camadas com fonte substituída
	// para a de verdade (host: fontsSync), de segundo em segundo, até não faltar nada (ou 'tries' vezes). 'done'
	// (opcional): outra condição para parar (ex: a conferência das fontes do template). → a última resposta do host
	async function syncFonts(call, tries, done) {
		var res = { supported: false, replaced: 0, missing: [] };
		var replaced = 0;

		for (var t = 0; t < (tries || 15); t++) {
			try {
				res = await call('fontsSync');
			} catch (err) {
				return res;
			}

			replaced += res.replaced || 0;

			var ok = done ? await done() : !res.missing.length;

			if (ok || (!res.supported && !done)) break;

			await new Promise(function (r) {
				setTimeout(r, 1000);
			});
		}

		res.replaced = replaced;

		return res;
	}

	window.PAD_UTIL = { iconEntry: findIcon, trashButton: trashButton, removeRow: removeRow, decodeIcon: decodeIcon, ovenLoader: ovenLoader, fileUrl: fileUrl, toast: toast, errorText: errorText, bindMenu: bindMenu, pathLine: pathLine, when: when, categoryIcon: categoryIcon, iconMarkup: iconMarkup, iconLibrary: iconLibrary, syncFonts: syncFonts };
})();
