/*

---------------------------------------------------------------
> animação ao mostrar / esconder (todas as janelas)
---------------------------------------------------------------

Os painéis mostram e escondem elementos pelo atributo 'hidden' (el.hidden = true / false). Este script
intercepta essa propriedade e anima a troca: o elemento encolhe e some (ou cresce e aparece) em vez de
pular, e os vizinhos acompanham, inclusive o 'gap' do contêiner. Elementos flutuantes (toasts, menus)
só esmaecem.

Não anima (troca na hora, como antes):
  - nos primeiros instantes da janela (a montagem inicial da tela);
  - elementos grandes (troca de telas inteiras) ou fora da tela;
  - dentro de [data-motion="off"] (listas filtradas a cada tecla, por exemplo);
  - com "reduzir movimento" ligado no sistema.

Enquanto some, 'el.hidden' já responde true.

*/

(function () {
	'use strict';

	var desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidden');

	if (!desc || !desc.set || !Element.prototype.animate) return;

	var DURATION = 200;
	var EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
	var MAX_SIZE = 320; // maior que isso é troca de tela: sem animação
	var ready = false;
	var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	window.addEventListener('load', function () {
		setTimeout(function () {
			ready = true;
		}, 600);
	});

	function rawHidden(el) {
		return desc.get.call(el);
	}

	function setRaw(el, value) {
		desc.set.call(el, value);
	}

	function skip(el) {
		return !ready || reduce || !el.isConnected || !!el.closest('[data-motion="off"]');
	}

	// em que direção o elemento ocupa espaço no contêiner (linha → largura; o resto → altura)
	function axisOf(el) {
		var parent = el.parentElement;

		if (!parent) return 'y';

		var cs = getComputedStyle(parent);

		if ((cs.display === 'flex' || cs.display === 'inline-flex') && cs.flexDirection.indexOf('row') === 0) return 'x';

		return 'y';
	}

	// o gap que some junto com o elemento (só quando há outro item visível antes dele)
	function gapOf(el, axis) {
		var parent = el.parentElement;

		if (!parent) return 0;

		var cs = getComputedStyle(parent);

		if (!/flex|grid/.test(cs.display)) return 0;

		var gap = parseFloat(axis === 'x' ? cs.columnGap : cs.rowGap) || 0;
		var prev = el.previousElementSibling;

		while (prev && (rawHidden(prev) || getComputedStyle(prev).display === 'none' || /absolute|fixed/.test(getComputedStyle(prev).position))) prev = prev.previousElementSibling;

		return prev ? gap : 0;
	}

	// quadros "aberto" e "fechado" para o elemento no estado atual
	function frames(el) {
		var cs = getComputedStyle(el);

		if (/absolute|fixed/.test(cs.position)) {
			return { open: { opacity: 1, transform: 'translateY(0)' }, closed: { opacity: 0, transform: 'translateY(-4px)' } };
		}

		if (cs.display === 'inline') return { open: { opacity: 1 }, closed: { opacity: 0 } };

		var axis = axisOf(el);
		var box = el.getBoundingClientRect();
		var gap = gapOf(el, axis);
		var open = { opacity: 1 };
		var closed = { opacity: 0 };

		if (axis === 'x') {
			open.width = box.width + 'px';
			open.marginLeft = cs.marginLeft;
			open.marginRight = cs.marginRight;
			open.paddingLeft = cs.paddingLeft;
			open.paddingRight = cs.paddingRight;
			closed.width = '0px';
			closed.marginLeft = -gap + 'px';
			closed.marginRight = '0px';
			closed.paddingLeft = '0px';
			closed.paddingRight = '0px';
		} else {
			open.height = box.height + 'px';
			open.marginTop = cs.marginTop;
			open.marginBottom = cs.marginBottom;
			open.paddingTop = cs.paddingTop;
			open.paddingBottom = cs.paddingBottom;
			closed.height = '0px';
			closed.marginTop = -gap + 'px';
			closed.marginBottom = '0px';
			closed.paddingTop = '0px';
			closed.paddingBottom = '0px';
		}

		return { open: open, closed: closed, size: axis === 'x' ? box.width : box.height };
	}

	function tooBig(el, f) {
		return f.size != null && f.size > MAX_SIZE;
	}

	function clear(el) {
		if (el._padMotion) el._padMotion.cancel();

		el._padMotion = null;
		el._padHiding = false;
		el.style.overflow = el._padOverflow || '';
	}

	function run(el, keyframes, done) {
		el._padOverflow = el.style.overflow;

		if (keyframes[0].height || keyframes[0].width) el.style.overflow = 'hidden';

		var anim = el.animate(keyframes, { duration: DURATION, easing: EASE });

		el._padMotion = anim;
		anim.onfinish = function () {
			if (el._padMotion !== anim) return;

			el._padMotion = null;
			el.style.overflow = el._padOverflow || '';
			if (done) done();
		};
	}

	function hide(el) {
		if (el._padHiding) return;

		clear(el); // estava aparecendo: some a partir do tamanho cheio

		if (rawHidden(el) || skip(el) || !el.getClientRects().length) return setRaw(el, true);

		var f = frames(el);

		if (tooBig(el, f)) return setRaw(el, true);

		el._padHiding = true;
		run(el, [f.open, f.closed], function () {
			el._padHiding = false;
			setRaw(el, true);
		});
	}

	function show(el) {
		var wasHiding = el._padHiding;

		clear(el);

		if (wasHiding) return; // estava sumindo: fica onde está

		if (!rawHidden(el)) return;

		setRaw(el, false);

		if (skip(el) || !el.getClientRects().length) return;

		var cs = getComputedStyle(el);

		// quem já tem animação própria de entrada (toasts, menus) fica com ela
		if (cs.animationName && cs.animationName !== 'none') return;

		var f = frames(el);

		if (tooBig(el, f)) return;

		run(el, [f.closed, f.open]);
	}

	Object.defineProperty(HTMLElement.prototype, 'hidden', {
		configurable: true,
		enumerable: desc.enumerable,
		get: function () {
			return this._padHiding ? true : rawHidden(this);
		},
		set: function (value) {
			if (value) hide(this);
			else show(this);
		}
	});
})();
