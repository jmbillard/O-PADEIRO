/*

---------------------------------------------------------------
> teclado comum dos painéis
---------------------------------------------------------------

Mesmo vocabulário em todos os painéis:
  ↑ ↓          andam nas listas (↑ no primeiro item volta para a busca)
  Enter        abre / seleciona (botões nativos)
  Esc          limpa a busca ou fecha
  Ctrl/Cmd+F   foca a busca
  Ctrl/Cmd+S   salva (onde existir)

No CEP, as teclas só chegam ao painel se ele pedir: sem 'registerKeyEventsInterest' as setas,
o Enter e os atalhos com Ctrl/Cmd podem ir direto para o After Effects (mover a agulha, salvar o projeto...).

  PAD_KEYS.listNav({ root, items, search, onLeft, onRight, horizontal })
  PAD_KEYS.shortcuts({ find, save, escape })
  PAD_KEYS.focusItem(node)

*/

(function () {
	'use strict';

	var MAC = /^Mac/.test(navigator.platform);

	// códigos virtuais de tecla: macOS (kVK_*) e Windows (VK_*)
	var CODES = MAC
		? {
			up: 126, down: 125, left: 123, right: 124, enter: 36, esc: 53, tab: 48, space: 49, back: 51, del: 117, home: 115, end: 119, pgup: 116, pgdn: 121,
			a: 0, b: 11, c: 8, d: 2, e: 14, f: 3, g: 5, h: 4, i: 34, j: 38, k: 40, l: 37, m: 46, n: 45, o: 31, p: 35, q: 12, r: 15, s: 1, t: 17, u: 32, v: 9, w: 13, x: 7, y: 16, z: 6,
			n0: 29, n1: 18, n2: 19, n3: 20, n4: 21, n5: 23, n6: 22, n7: 26, n8: 28, n9: 25, minus: 27, equal: 24, slash: 44, backslash: 42, period: 47, comma: 43, semicolon: 41, quote: 39, lbracket: 33, rbracket: 30, grave: 50
		}
		: {
			up: 38, down: 40, left: 37, right: 39, enter: 13, esc: 27, tab: 9, space: 32, back: 8, del: 46, home: 36, end: 35, pgup: 33, pgdn: 34,
			n0: 48, n1: 49, n2: 50, n3: 51, n4: 52, n5: 53, n6: 54, n7: 55, n8: 56, n9: 57, minus: 189, equal: 187, slash: 191, backslash: 220, period: 190, comma: 188, semicolon: 186, quote: 222, lbracket: 219, rbracket: 221, grave: 192
		};

	if (!MAC) {
		'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function (ch) {
			CODES[ch] = ch.toUpperCase().charCodeAt(0);
		});
	}

	// Pede ao CEP as teclas que o painel usa (digitar, navegar e os atalhos de edição e dos painéis).
	function registerKeys() {
		var cep = window.__adobe_cep__;

		if (!cep || !cep.registerKeyEventsInterest) return;

		var list = [];
		var modKey = MAC ? 'metaKey' : 'ctrlKey';

		Object.keys(CODES).forEach(function (name) {
			var code = CODES[name];
			var plain = { keyCode: code };
			var shift = { keyCode: code, shiftKey: true };

			list.push(plain, shift);
		});

		// atalhos com Ctrl/Cmd: editar texto, buscar, salvar, preencher (Enter) e desfazer
		['a', 'c', 'v', 'x', 'z', 'y', 'f', 's', 'enter'].forEach(function (name) {
			var item = { keyCode: CODES[name] };
			var withShift = { keyCode: CODES[name], shiftKey: true };

			item[modKey] = true;
			withShift[modKey] = true;
			list.push(item, withShift);
		});

		try {
			cep.registerKeyEventsInterest(JSON.stringify(list));
		} catch (err) { }
	}

	function isMod(e) {
		return MAC ? e.metaKey : e.ctrlKey;
	}

	function isTyping(node) {
		if (!node || !node.tagName) return false;

		var tag = node.tagName;

		return tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable || (tag === 'INPUT' && !/^(button|checkbox|radio|submit|reset|file|color|range)$/i.test(node.type));
	}

	function isVisible(node) {
		return !!(node && node.getClientRects().length) && !node.disabled;
	}

	// Foca sem rolar a página inteira: só o necessário para o item aparecer na lista.
	function focusItem(node) {
		if (!node) return;

		node.focus({ preventScroll: true });

		if (node.scrollIntoView) node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}

	/*
	   Navegação por setas numa lista de botões.
	   opts.root       elemento que contém os itens
	   opts.items      () => array de itens (ou seletor CSS dentro de root)
	   opts.search     campo de busca: ↓ nele vai ao primeiro item, ↑ no primeiro item volta a ele
	   opts.onLeft / onRight (item, event) → true se tratou a tecla
	   opts.horizontal true: ← → também andam (barras de botões)
	   opts.typeToSearch true: digitar numa lista leva a letra para a busca
	*/
	function listNav(opts) {
		function items() {
			var list = typeof opts.items === 'function' ? opts.items() : opts.root.querySelectorAll(opts.items);

			return Array.prototype.filter.call(list, isVisible);
		}

		function move(current, delta) {
			var list = items();
			var at = list.indexOf(current);

			if (at < 0) return false;

			var next = at + delta;

			if (next < 0) {
				if (opts.search) {
					opts.search.focus();
					return true;
				}

				next = 0;
			}

			focusItem(list[Math.min(list.length - 1, next)]);

			return true;
		}

		opts.root.addEventListener('keydown', function (e) {
			if (e.altKey || e.defaultPrevented) return;

			var list = items();
			var current = e.target.closest ? list.filter(function (item) {
				return item === e.target || item.contains(e.target);
			})[0] : null;

			if (!current) return;

			var key = e.key;
			var handled = false;

			if (!isMod(e) && !e.ctrlKey && !e.metaKey) {
				if (key === 'ArrowDown' || (opts.horizontal && key === 'ArrowRight')) handled = move(current, 1);
				else if (key === 'ArrowUp' || (opts.horizontal && key === 'ArrowLeft')) handled = move(current, -1);
				else if (key === 'Home') handled = move(current, -list.indexOf(current));
				else if (key === 'End') handled = move(current, list.length);
				else if (key === 'ArrowLeft' && opts.onLeft) handled = opts.onLeft(current, e);
				else if (key === 'ArrowRight' && opts.onRight) handled = opts.onRight(current, e);
				else if (opts.typeToSearch && opts.search && key.length === 1 && key !== ' ') {
					// a letra cai na busca (o foco muda antes do caractere ser inserido)
					opts.search.focus();
					return;
				}
			}

			if (handled) e.preventDefault();
		});

		if (opts.search) {
			opts.search.addEventListener('keydown', function (e) {
				if (e.key !== 'ArrowDown' || e.altKey || isMod(e)) return;

				var first = items()[0];

				if (!first) return;

				e.preventDefault();
				focusItem(first);
			});
		}

		return { items: items, move: move };
	}

	/*
	   Atalhos do painel:
	   map.find()     Ctrl/Cmd+F
	   map.save()     Ctrl/Cmd+S
	   map.escape(e)  Esc fora de um campo de texto (retorna true se tratou)
	*/
	function shortcuts(map) {
		document.addEventListener('keydown', function (e) {
			if (e.defaultPrevented) return;

			var key = (e.key || '').toLowerCase();

			if (isMod(e) && !e.altKey) {
				if (key === 'f' && map.find) {
					e.preventDefault();
					map.find();
				} else if (key === 's' && map.save) {
					e.preventDefault();
					map.save();
				}

				return;
			}

			if (key === 'escape' && map.escape && map.escape(e)) e.preventDefault();
		});
	}

	// Foca e seleciona o texto de um campo de busca.
	function focusSearch(input) {
		if (!input || !isVisible(input)) return;

		input.focus();
		input.select();
	}

	registerKeys();

	window.PAD_KEYS = {
		mac: MAC,
		isMod: isMod,
		isTyping: isTyping,
		focusItem: focusItem,
		focusSearch: focusSearch,
		listNav: listNav,
		shortcuts: shortcuts,
		registerKeys: registerKeys
	};
})();
