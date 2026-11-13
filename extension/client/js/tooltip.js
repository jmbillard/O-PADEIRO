/*

---------------------------------------------------------------
> dicas (tooltips)
---------------------------------------------------------------

O CEP no macOS não mostra as dicas nativas do atributo 'title'. Este script mostra as mesmas dicas
num balão próprio, em todas as janelas: o 'title' de qualquer elemento vira 'data-tip' no primeiro
hover (assim o navegador não mostra duas dicas) e aparece depois de uma pausa curta.

O balão não sai da janela: abre embaixo do elemento ou, sem espaço, em cima, e se ajusta nas bordas.

*/

(function () {
	var DELAY = 450;
	var GAP = 6;
	var MARGIN = 4;

	var tip = null;
	var target = null;
	var timer = null;

	// PAD_TIP.mouse: o mousezinho das dicas; PAD_TIP.hook(el, texto, 'enter' | 'leave' | 'input') → true se a
	// dica foi mostrada em outro lugar (a barra põe o dela aqui)
	window.PAD_TIP = { mouse: mouse, hook: null };

	function balloon() {
		if (!tip) {
			tip = document.createElement('div');
			tip.className = 'pad-tooltip';
			tip.style.pointerEvents = 'none'; // o balão nunca pega o mouse (nem antes do css carregar)
			tip.setAttribute('role', 'tooltip');
			document.body.appendChild(tip);
		}

		return tip;
	}

	// o mouse pequeno com o botão do clique aceso (l: esquerdo, r: direito)
	function mouse(side) {
		var ns = 'http://www.w3.org/2000/svg';
		var svg = document.createElementNS(ns, 'svg');
		var parts = [
			['path', { class: 'tip-mouse-btn', d: side === 'l' ? 'M6.5 1.2A5.3 5.3 0 0 0 1.2 6.5V7.5H6.5Z' : 'M6.5 1.2A5.3 5.3 0 0 1 11.8 6.5V7.5H6.5Z' }],
			['rect', { class: 'tip-mouse-body', x: '0.65', y: '0.65', width: '11.7', height: '15.7', rx: '5.85' }],
			['path', { class: 'tip-mouse-body', d: 'M6.5 0.8V7.5M0.8 7.5H12.2' }]
		];

		svg.setAttribute('viewBox', '0 0 13 17');
		svg.setAttribute('class', 'tip-mouse');
		svg.setAttribute('aria-hidden', 'true');
		parts.forEach(function (part) {
			var node = document.createElementNS(ns, part[0]);

			Object.keys(part[1]).forEach(function (k) {
				node.setAttribute(k, part[1][k]);
			});
			svg.appendChild(node);
		});

		return svg;
	}

	// a dica das ferramentas (NOME, uma linha em branco, ◖ → … e ◗ → …, e o estado depois): o nome em cima, cada
	// clique numa linha com o mouse e o botão aceso, e o estado embaixo, mais apagado. as outras: o texto como está
	function fill(t, text) {
		var lines = String(text).split('\n');
		var clicks = lines.filter(function (line) {
			return /^\s*[◖◗]\s*→/.test(line);
		});

		t.textContent = '';
		t.classList.toggle('is-rich', clicks.length > 0);
		if (!clicks.length) {
			t.textContent = text;
			return;
		}

		var notes = [];
		var named = false;

		lines.forEach(function (line, i) {
			var m = /^\s*([◖◗])\s*→\s*(.*)$/.exec(line);

			if (m) {
				var row = document.createElement('p');
				var body = document.createElement('span');

				row.className = 'tip-click';
				body.textContent = m[2];
				row.appendChild(mouse(m[1] === '◖' ? 'l' : 'r'));
				row.appendChild(body);
				t.appendChild(row);
			} else if (line.trim() && i === 0) {
				var name = document.createElement('p');

				name.className = 'tip-name';
				name.textContent = line.trim();
				t.appendChild(name);
				named = true;
			} else if (line.trim()) notes.push(line.trim());
		});

		if (notes.length) {
			var note = document.createElement('p');

			note.className = 'tip-note';
			note.textContent = notes.join('\n');
			t.appendChild(note);
		}
		t.classList.toggle('has-name', named);
	}

	// why: 'leave' (o mouse saiu) ou 'input' (clique, tecla, rolagem). quem mostra a dica em outro lugar (a linha
	// de status da barra, pelo PAD_TIP.hook) é avisado para tirar a dele
	function hide(why) {
		clearTimeout(timer);
		target = null;

		if (tip) tip.classList.remove('is-visible');
		if (window.PAD_TIP.hook) window.PAD_TIP.hook(null, '', why === 'leave' ? 'leave' : 'input');
	}

	function place(el) {
		var box = el.getBoundingClientRect();
		var vw = document.documentElement.clientWidth;
		var vh = document.documentElement.clientHeight;
		var t = balloon();

		t.style.maxWidth = Math.min(420, vw - MARGIN * 2) + 'px';
		t.classList.toggle('is-narrow', vw < 160); // barra vertical (64 px): letra menor
		t.style.left = '0px';
		t.style.top = '0px';

		var w = t.offsetWidth;
		var h = t.offsetHeight;
		var below = box.bottom + GAP;
		var above = box.top - GAP - h;
		var top = below + h <= vh - MARGIN || above < MARGIN ? below : above;

		// sem espaço nem embaixo nem em cima (barra horizontal baixa): o que couber, dentro da janela
		top = Math.max(MARGIN, Math.min(top, vh - MARGIN - h));

		var left = Math.max(MARGIN, Math.min(box.left + box.width / 2 - w / 2, vw - MARGIN - w));

		t.style.left = Math.round(left) + 'px';
		t.style.top = Math.round(top) + 'px';
	}

	function show(el) {
		var text = el.getAttribute('data-tip');

		if (!text || !document.contains(el)) return;

		// menu ⋯ aberto: a dica do botão ficaria por cima do menu
		if (el.matches('summary') && el.parentElement && el.parentElement.open) return;

		fill(balloon(), text);
		place(el);
		tip.classList.add('is-visible');
	}

	document.addEventListener('mouseover', function (e) {
		var el = e.target.closest && e.target.closest('[title], [data-tip]');

		if (el === target) return;

		hide();

		if (!el || document.querySelector('.is-sorting')) return; // arrastando para reordenar: sem dica por cima

		// o 'title' pode ter sido trocado pelo código desde o último hover
		if (el.hasAttribute('title')) {
			if (el.getAttribute('title')) el.setAttribute('data-tip', el.getAttribute('title'));
			el.removeAttribute('title');
		}

		target = el;

		// a barra, com a linha de status à vista, mostra a dica nela (não cobre os botões vizinhos): sem balão
		if (window.PAD_TIP.hook && window.PAD_TIP.hook(el, el.getAttribute('data-tip') || '', 'enter')) return;

		timer = setTimeout(function () {
			if (target === el) show(el);
		}, DELAY);
	});

	document.addEventListener('mouseout', function (e) {
		if (target && !(e.relatedTarget && target.contains(e.relatedTarget))) hide('leave');
	});

	['mousedown', 'keydown', 'wheel', 'blur'].forEach(function (type) {
		window.addEventListener(type, function () {
			hide('input');
		}, true);
	});
})();
