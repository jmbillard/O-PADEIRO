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

	function balloon() {
		if (!tip) {
			tip = document.createElement('div');
			tip.className = 'pad-tooltip';
			tip.setAttribute('role', 'tooltip');
			document.body.appendChild(tip);
		}

		return tip;
	}

	function hide() {
		clearTimeout(timer);
		target = null;

		if (tip) tip.classList.remove('is-visible');
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

		balloon().textContent = text;
		place(el);
		tip.classList.add('is-visible');
	}

	document.addEventListener('mouseover', function (e) {
		var el = e.target.closest && e.target.closest('[title], [data-tip]');

		if (el === target) return;

		hide();

		if (!el) return;

		// o 'title' pode ter sido trocado pelo código desde o último hover
		if (el.hasAttribute('title')) {
			if (el.getAttribute('title')) el.setAttribute('data-tip', el.getAttribute('title'));
			el.removeAttribute('title');
		}

		target = el;
		timer = setTimeout(function () {
			if (target === el) show(el);
		}, DELAY);
	});

	document.addEventListener('mouseout', function (e) {
		if (target && !(e.relatedTarget && target.contains(e.relatedTarget))) hide();
	});

	['mousedown', 'keydown', 'wheel', 'blur'].forEach(function (type) {
		window.addEventListener(type, hide, true);
	});
})();
