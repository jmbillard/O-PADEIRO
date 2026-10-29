/*

---------------------------------------------------------------
> dropdown arredondado (substitui a lista nativa do <select>)
---------------------------------------------------------------

O <select> continua sendo a fonte do valor e dos eventos ('change'); aqui só trocamos a aparência:
um botão com o item atual e uma lista flutuante no mesmo estilo do menu "⋯".

  PAD_DROPDOWN.enhance(selectEl)   → deixa o <select> (dentro de um '.select') com a nova aparência
  PAD_DROPDOWN.refresh(selectEl)   → atualiza o rótulo depois de mudar opções, valor ou 'disabled'

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

		document.body.appendChild(popover);

		// posição: abaixo do botão, ou acima se não couber
		var rect = trigger.getBoundingClientRect();
		var height = Math.min(popover.offsetHeight, window.innerHeight - 16);
		var below = window.innerHeight - rect.bottom - 8;
		var top = below >= height || below >= rect.top ? rect.bottom + 6 : rect.top - height - 6;

		popover.style.minWidth = rect.width + 'px';
		popover.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 8)) + 'px';
		popover.style.top = Math.max(8, top) + 'px';
		popover.style.maxHeight = window.innerHeight - 16 + 'px';

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
				highlight(Math.min(items.length - 1, active + 1));
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				highlight(Math.max(0, active - 1));
			} else if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				choose(active);
			} else if (e.key === 'Tab') {
				closeOpen();
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
				popover.remove();
				openState = null;
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
