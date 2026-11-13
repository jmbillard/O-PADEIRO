/*

---------------------------------------------------------------
> dropdown arredondado (substitui a lista nativa do <select>)
---------------------------------------------------------------

O <select> continua sendo a fonte do valor e dos eventos ('change'); aqui só trocamos a aparência:
um botão com o item atual e uma lista flutuante no mesmo estilo do menu "⋯".

  PAD_DROPDOWN.enhance(selectEl[, icons])   → deixa o <select> (dentro de um '.select') com a nova aparência;
                                              icons: um dos conjuntos de PAD_DROPDOWN.ICONS (ou uma função
                                              (value, text) → svg), para um ícone antes de cada opção
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

	/* ---------- ícones das opções ---------- */

	var SVG = '<svg class="dropdown-svg" viewBox="0 0 24 24" aria-hidden="true">';

	function svg(body) {
		return SVG + body + '</svg>';
	}

	function letters(text, style) {
		return '<span class="dropdown-letters"' + (style ? ' style="' + style + '"' : '') + '>' + text + '</span>';
	}

	var gradients = 0;
	var VIDEO = svg('<rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5v5l4.5-2.5z" />');

	var ICONS = {
		// caixa do nome: o próprio exemplo; livre / como está: um lápis
		textCase: function (value) {
			if (value === 'upperCase') return letters('AB');
			if (value === 'lowerCase') return letters('ab');
			if (value === 'titleCase') return letters('Ab');

			return svg('<path d="M4 19h4L18.5 8.5a2.1 2.1 0 0 0-3-3L5 16z" /><path d="M14 7l3 3" />');
		},
		// fonte: "Aa" na própria fonte (as famílias do theme.js)
		font: function (value) {
			var families = (window.PAD_THEME && PAD_THEME.FONTS) || {};

			return letters('Aa', families[value] ? 'font-family:' + families[value].replace(/"/g, '\'') : '');
		},
		mode: function (value) {
			if (value === 'light') return svg('<circle cx="12" cy="12" r="4" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />');
			if (value === 'dark') return svg('<path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z" />');

			return svg('<circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" class="is-fill" />');
		},
		background: function (value) {
			if (value === 'solid') return svg('<rect x="4" y="4" width="16" height="16" rx="4.5" class="is-fill" />');
			// neutro: o quadrado só no contorno (sem cor), com um ponto de destaque no canto
			if (value === 'neutral') return svg('<rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="15.2" cy="15.2" r="1.9" class="is-fill" />');

			// degradê: do transparente ao cheio, na diagonal (um id novo a cada desenho: o rótulo e a lista
			// existem ao mesmo tempo)
			var id = 'dd-grad-' + (++gradients);

			return svg('<defs><linearGradient id="' + id + '" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="currentColor" stop-opacity="0" /><stop offset="1" stop-color="currentColor" /></linearGradient></defs><rect x="4" y="4" width="16" height="16" rx="4.5" fill="url(#' + id + ')" />');
		},
		// informação do layer: conteúdo do texto (T) ou nome do layer (etiqueta)
		layerMethod: function (value) {
			if (value === 'textContent') return svg('<path d="M5 6h14M12 6v13M9 19h6" />');

			return svg('<path d="M3.5 12.6V5a1.5 1.5 0 0 1 1.5-1.5h7.6L21 12l-8.5 8.5z" /><circle cx="8" cy="8" r="1.4" />');
		},
		// template de output: pelo nome do preset (sem match: vídeo)
		renderTemplate: function (value, text) {
			var name = String(text || value).toLowerCase();

			if (/alpha|alfa|rgba|transpar/.test(name)) return svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M3.5 12h17M12 3.5v17" /><path d="M5 5h7v7H5zM12 12h7v7h-7z" class="is-fill" opacity=".35" />');
			if (/\b(wav|aiff?|mp3|aac|audio|áudio)\b/.test(name)) return svg('<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />');
			if (/png|jpe?g|tiff?|tga|targa|exr|dpx|psd|bmp|sequence|sequência|frames?/.test(name)) return svg('<rect x="6" y="3" width="14" height="14" rx="2.5" /><path d="M4 7v11.5A2.5 2.5 0 0 0 6.5 21H17" /><path d="m9 14 3-3 2 2 2-2.5 2 2.5" />');

			return VIDEO;
		}
	};

	var BADGES = {
		person: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5" /></svg>'
	};

	function iconFor(select, option) {
		var fn = select._dropdownIcons;

		if (!fn || !option) return '';

		try {
			return fn(option.value, option.textContent) || '';
		} catch (err) {
			return '';
		}
	}

	function closeOpen() {
		if (openState) openState.close();
	}

	function refresh(select) {
		var trigger = select._dropdownTrigger;

		if (!trigger) return;

		var option = select.options[select.selectedIndex];
		var icon = trigger.querySelector('.dropdown-icon');

		trigger.querySelector('.dropdown-label').textContent = option ? option.textContent : '';
		if (icon) icon.innerHTML = iconFor(select, option);
		trigger.disabled = select.disabled;
	}

	function open(select) {
		var trigger = select._dropdownTrigger;

		if (openState && openState.select === select) return closeOpen();

		closeOpen();

		var popover = el('div', 'dropdown-popover');
		popover.setAttribute('data-motion', 'off'); // filtra a cada tecla: sem animar os itens
		var items = [];
		var active = Math.max(0, select.selectedIndex);
		var query = '';
		var empty = el('p', 'dropdown-empty', 'nada encontrado');
		var queryLine = el('p', 'dropdown-query'); // termo digitado, quando a lista cobre o botão
		var covers = false;

		popover.setAttribute('role', 'listbox');

		var groups = []; // títulos de grupo (data-group na primeira opção do grupo): somem enquanto filtra

		Array.prototype.forEach.call(select.options, function (option, i) {
			if (option.dataset.group) {
				var head = el('p', 'dropdown-group', option.dataset.group);

				groups.push(head);
				popover.appendChild(head);
			}

			var item = el('button', 'dropdown-item' + (i === select.selectedIndex ? ' is-selected' : ''), option.textContent);
			var mark = iconFor(select, option);

			item._text = option.textContent; // o filtro olha só o texto (não o ícone)
			if (mark) {
				var icon = el('span', 'dropdown-icon');

				icon.innerHTML = mark;
				item.insertBefore(icon, item.firstChild);
				item.classList.add('has-icon');
			}

			// selo no fim do item (ex: data-badge="person": a produção é só deste computador)
			if (option.dataset.badge && BADGES[option.dataset.badge]) {
				var badge = el('span', 'dropdown-badge');

				badge.innerHTML = BADGES[option.dataset.badge];
				item.appendChild(badge);
				item.classList.add('has-badge');
			}

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
			var label = trigger.querySelector('.dropdown-label');
			var key = fold(query);

			items.forEach(function (item) {
				item.hidden = key !== '' && fold(item._text).indexOf(key) < 0;
			});
			groups.forEach(function (head) {
				head.hidden = key !== '';
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

	function enhance(select, icons) {
		if (icons) select._dropdownIcons = typeof icons === 'function' ? icons : ICONS[icons];
		if (select._dropdownTrigger) return refresh(select);

		var wrap = select.parentNode;
		var trigger = el('button', 'dropdown-trigger');

		trigger.type = 'button';
		trigger.setAttribute('aria-haspopup', 'listbox');
		trigger.setAttribute('aria-expanded', 'false');
		if (select.getAttribute('aria-label')) trigger.setAttribute('aria-label', select.getAttribute('aria-label'));
		trigger.title = 'abra e digite para filtrar';
		if (select._dropdownIcons) {
			trigger.appendChild(el('span', 'dropdown-icon'));
			trigger.classList.add('has-icon');
		}
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

	window.PAD_DROPDOWN = { enhance: enhance, refresh: refresh, ICONS: ICONS };
})();
