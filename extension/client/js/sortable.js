/*

---------------------------------------------------------------
> arrastar para reordenar
---------------------------------------------------------------

Listas de linhas que se reordenam pelo puxador (.drag-handle) de cada linha. Usa eventos de mouse (os de ponteiro e
o arrastar nativo do navegador o CEP não entrega no After Effects): a linha segue o mouse, as outras abrem espaço
e, ao soltar, onMove(de, para) recebe os índices e redesenha a lista.

  PAD_SORT.handle()                              → o puxador (botão com os pontinhos)
  PAD_SORT.enable(list, '.cfg-row', onMove)      → liga a reordenação nas linhas de 'list'

*/

(function () {
	'use strict';

	var GRIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" /><circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" /><circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" /></svg>';

	function handle() {
		var btn = document.createElement('button');

		btn.type = 'button';
		btn.className = 'drag-handle';
		btn.title = 'arraste para mudar a ordem';
		btn.setAttribute('aria-label', 'arraste para mudar a ordem (ou use ↑ ↓ com o puxador em foco)');
		btn.innerHTML = GRIP;

		return btn;
	}

	function enable(list, rowSelector, onMove) {
		if (list._sortable) return;

		list._sortable = true;

		function rows() {
			return Array.prototype.filter.call(list.children, function (node) {
				return node.matches(rowSelector);
			});
		}

		list.addEventListener('mousedown', function (e) {
			var grip = e.target.closest('.drag-handle');

			if (!grip || e.button !== 0) return;

			var all = rows();
			var row = grip.closest(rowSelector);
			var from = all.indexOf(row);

			if (from < 0 || all.length < 2) return;

			e.preventDefault();

			var startY = e.clientY;
			var boxes = all.map(function (r) {
				return r.getBoundingClientRect();
			});
			var step = boxes.length > 1 ? boxes[1].top - boxes[0].top : boxes[0].height;
			var to = from;

			grip.focus();
			row.classList.add('is-dragging');
			list.classList.add('is-sorting');

			function move(ev) {
				var dy = ev.clientY - startY;
				var center = boxes[from].top + boxes[from].height / 2 + dy;

				to = from;

				for (var i = 0; i < boxes.length; i++) {
					var mid = boxes[i].top + boxes[i].height / 2;

					if (i < from && center < mid) {
						to = i;
						break;
					}

					if (i > from && center > mid) to = i;
				}

				row.style.transform = 'translateY(' + dy + 'px)';

				all.forEach(function (r, i) {
					if (r === row) return;

					var shift = 0;

					if (from < to && i > from && i <= to) shift = -step;
					if (from > to && i < from && i >= to) shift = step;

					r.style.transform = shift ? 'translateY(' + shift + 'px)' : '';
				});
			}

			function end() {
				window.removeEventListener('mousemove', move, true);
				window.removeEventListener('mouseup', end, true);
				window.removeEventListener('blur', end);
				list.classList.remove('is-sorting');
				row.classList.remove('is-dragging');
				all.forEach(function (r) {
					r.style.transform = '';
				});

				if (to !== from) onMove(from, to);
			}

			// pela janela: o mouse pode sair do puxador (e da lista) durante o arraste
			window.addEventListener('mousemove', move, true);
			window.addEventListener('mouseup', end, true);
			window.addEventListener('blur', end);
		});

		// teclado: com o puxador em foco, ↑ ↓ mudam a ordem
		list.addEventListener('keydown', function (e) {
			var grip = e.target.closest && e.target.closest('.drag-handle');

			if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;

			var all = rows();
			var from = all.indexOf(grip.closest(rowSelector));
			var to = from + (e.key === 'ArrowUp' ? -1 : 1);

			e.preventDefault();
			e.stopPropagation();

			if (from < 0 || to < 0 || to >= all.length) return;

			onMove(from, to);

			var moved = rows()[to];

			if (moved) moved.querySelector('.drag-handle').focus();
		});
	}

	window.PAD_SORT = { handle: handle, enable: enable };
})();
