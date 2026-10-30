/*

---------------------------------------------------------------
> dropdown arredondado (substitui a lista nativa do <select>)
---------------------------------------------------------------

O <select> continua sendo a fonte do valor e dos eventos ('change'); aqui só trocamos a aparência:
um botão com o item atual e uma lista flutuante no mesmo estilo do menu "⋯".

  PAD_DROPDOWN.enhance(selectEl)   → deixa o <select> (dentro de um '.select') com a nova aparência
  PAD_DROPDOWN.refresh(selectEl)   → atualiza o rótulo depois de mudar opções, valor ou 'disabled'

Com a lista aberta, digitar filtra os itens (o termo aparece no lugar do rótulo); Backspace apaga.

*/

(function () {
	'use strict';

	var openState = null; // { select, trigger, popover, close }

	function el(tag, className, text) {
		var node = document.createElement(tag);

		if (className) node.className = className;
		if (text != null) node.textContent = text;

		return node;
	}

	// maiúsculas, sem acentos (para o filtro digitado)
	function fold(str) {
		return String(str).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	}

	function closeOpen() {
		if (openState) openState.close();
	}

	function refresh(select) {
		var trigger = select._dropdownTrigger;

		if (!trigger) return;

		var option = select.options[select.selectedIndex];

		trigger.firstChild.textContent = option ? option.textContent : '';
		trigger.disabled = select.disabled;
	}

	function open(select) {
		var trigger = select._dropdownTrigger;

		if (openState && openState.select === select) return closeOpen();

		closeOpen();

		var popover = el('div', 'dropdown-popover');
		var items = [];
		var active = Math.max(0, select.selectedIndex);
		var query = '';
		var empty = el('p', 'dropdown-empty', 'nada encontrado');
		var queryLine = el('p', 'dropdown-query'); // termo digitado, quando a lista cobre o botão
		var covers = false;

		popover.setAttribute('role', 'listbox');

		Array.prototype.forEach.call(select.options, function (option, i) {
			var item = el('button', 'dropdown-item' + (i === select.selectedIndex ? ' is-selected' : ''), option.textContent);

			item.type = 'button';
			item.setAttribute('role', 'option');
			item.setAttribute('aria-selected', String(i === select.selectedIndex));
			item.addEventListener('click', function () {
				choose(i);
			});
			item.addEventListener('mousemove', function () {
				highlight(i);
			});

			items.push(item);
			popover.appendChild(item);
		});

		empty.hidden = true;
		queryLine.hidden = true;
		popover.insertBefore(queryLine, popover.firstChild);
		popover.appendChild(empty);
		document.body.appendChild(popover);

		// posição: abaixo do botão, ou acima se não couber
		var rect = trigger.getBoundingClientRect();

		popover.style.maxWidth = window.innerWidth - 16 + 'px'; // nada fora do painel: o CEP corta
		popover.style.minWidth = Math.min(rect.width, window.innerWidth - 16) + 'px';

		// a lista fica no lado com mais espaço e rola quando não cabe; sem espaço útil em nenhum dos lados
		// (painel baixo, como a barra), usa a janela inteira, por cima do botão
		var MIN_ROOM = 140;
		var natural = popover.offsetHeight;
		var below = window.innerHeight - rect.bottom - 6 - 8;
		var above = rect.top - 6 - 8;
		var top;
		var maxHeight;

		if (below >= natural || (below >= above && below >= MIN_ROOM)) {
			maxHeight = below;
			top = rect.bottom + 6;
		} else if (above >= MIN_ROOM) {
			maxHeight = above;
			top = rect.top - 6 - Math.min(natural, above);
		} else {
			maxHeight = window.innerHeight - 16;
			top = window.innerHeight - 8 - Math.min(natural, maxHeight);
		}

		popover.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 8)) + 'px';
		popover.style.top = Math.max(8, top) + 'px';
		popover.style.maxHeight = maxHeight + 'px';

		// painel baixo (a barra): a lista fica por cima do botão e o termo digitado aparece nela
		var popRect = popover.getBoundingClientRect();

		covers = popRect.top < rect.bottom && popRect.bottom > rect.top;

		function visible() {
			var list = [];

			items.forEach(function (item, i) {
				if (!item.hidden) list.push(i);
			});

			return list;
		}

		// próximo item visível a partir do ativo (delta = +1 / -1)
		function step(delta) {
			var list = visible();

			if (!list.length) return;

			var at = list.indexOf(active);

			highlight(list[at < 0 ? 0 : Math.max(0, Math.min(list.length - 1, at + delta))]);
		}

		function filter() {
			var label = trigger.firstChild;
			var key = fold(query);

			items.forEach(function (item) {
				item.hidden = key !== '' && fold(item.textContent).indexOf(key) < 0;
			});

			var list = visible();

			empty.hidden = list.length > 0;
			queryLine.hidden = !covers || query === '';
			queryLine.textContent = query;
			trigger.classList.toggle('is-filtering', query !== '');
			label.textContent = query !== '' ? query : (select.options[select.selectedIndex] || {}).textContent || '';

			if (list.length) highlight(list.indexOf(active) >= 0 ? active : list[0]);
			else active = -1;
		}

		function highlight(i) {
			active = i;
			items.forEach(function (item, n) {
				item.classList.toggle('is-active', n === i);
			});
			// mantém o item visível dentro da lista (sem rolar a página)
			var item = items[i];

			if (item.offsetTop < popover.scrollTop) popover.scrollTop = item.offsetTop;
			else if (item.offsetTop + item.offsetHeight > popover.scrollTop + popover.clientHeight) popover.scrollTop = item.offsetTop + item.offsetHeight - popover.clientHeight;
		}

		function choose(i) {
			if (i < 0 || !items[i] || items[i].hidden) return;

			var changed = select.selectedIndex !== i;

			select.selectedIndex = i;
			refresh(select);
			closeOpen();
			trigger.focus();

			if (changed) select.dispatchEvent(new Event('change', { bubbles: true }));
		}

		function onKey(e) {
			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				closeOpen();
				trigger.focus();
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				step(1);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				step(-1);
			} else if (e.key === 'Enter' || (e.key === ' ' && query === '')) {
				e.preventDefault();
				choose(active);
			} else if (e.key === 'Tab') {
				closeOpen();
			} else if (e.key === 'Backspace') {
				e.preventDefault();
				query = query.slice(0, -1);
				filter();
			} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
				e.preventDefault();
				query += e.key;
				filter();
			}
		}

		function onOutside(e) {
			if (!popover.contains(e.target) && !trigger.contains(e.target)) closeOpen();
		}

		function onScroll(e) {
			if (!popover.contains(e.target)) closeOpen();
		}

		document.addEventListener('mousedown', onOutside, true);
		document.addEventListener('keydown', onKey, true);
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('resize', closeOpen);
		window.addEventListener('blur', closeOpen);

		trigger.setAttribute('aria-expanded', 'true');
		highlight(active);

		openState = {
			select: select,
			close: function () {
				document.removeEventListener('mousedown', onOutside, true);
				document.removeEventListener('keydown', onKey, true);
				window.removeEventListener('scroll', onScroll, true);
				window.removeEventListener('resize', closeOpen);
				window.removeEventListener('blur', closeOpen);
				trigger.setAttribute('aria-expanded', 'false');
				trigger.classList.remove('is-filtering');
				popover.remove();
				openState = null;
				refresh(select);
			}
		};
	}

	function enhance(select) {
		if (select._dropdownTrigger) return;

		var wrap = select.parentNode;
		var trigger = el('button', 'dropdown-trigger');

		trigger.type = 'button';
		trigger.setAttribute('aria-haspopup', 'listbox');
		trigger.setAttribute('aria-expanded', 'false');
		if (select.getAttribute('aria-label')) trigger.setAttribute('aria-label', select.getAttribute('aria-label'));
		trigger.title = 'abra e digite para filtrar';
		trigger.appendChild(el('span', 'dropdown-label'));

		trigger.addEventListener('click', function () {
			open(select);
		});
		trigger.addEventListener('keydown', function (e) {
			if (openState && openState.select === select) return; // a lista aberta já trata as teclas

			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				open(select);
			}
		});

		select._dropdownTrigger = trigger;
		select.tabIndex = -1;
		select.setAttribute('aria-hidden', 'true');
		wrap.classList.add('is-enhanced');
		wrap.insertBefore(trigger, select);
		select.addEventListener('change', function () {
			refresh(select);
		});

		refresh(select);
	}

	window.PAD_DROPDOWN = { enhance: enhance, refresh: refresh };
})();
