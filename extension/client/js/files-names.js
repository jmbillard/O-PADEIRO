/*

---------------------------------------------------------------
> O ARQUIVISTA — o nome final de cada item (e o sufixo _2, _3…)
---------------------------------------------------------------

O nome pedido de cada item (a sugestão ou o editado) vira o nome final. Um nome que ficaria repetido na mesma pasta
ganha o primeiro sufixo livre (_2, _3…) e a situação 'dup' (o aviso "ganhou _2"): continua na renomeação.

Contam como ocupados, dentro da mesma pasta: o nome de hoje de todos os itens da lista (os desligados e os que mudam:
a ordem das renomeações não importa, nada é sobrescrito), os nomes do disco que não estão na lista (others, do host)
e os nomes finais já dados. A comparação não diferencia a caixa (os discos também não) e junta o acento separado do
macOS (NFD) com o junto (NFC), do mesmo jeito em todas as comparações.

Sem DOM: a janela (files.js) usa no navegador (window.PAD_FILES_NAMES); o teste carrega em Node (module.exports).

*/

(function (root) {
	'use strict';

	var BAD_CHARS = /[\\\/:*?"<>|]/;

	function norm(text) {
		return String(text == null ? '' : text).normalize('NFC');
	}

	// o resto do nome que não muda: a extensão; na sequência, o separador, os dígitos e a extensão (os quadros)
	function tail(it) {
		var ext = it.ext ? '.' + it.ext : '';

		if (it.kind === 'seq') return (it.sep || '') + new Array((it.pad || 0) + 1).join('#') + ext;

		return ext;
	}

	function key(dir, full) {
		return norm(dir).toLowerCase() + '/' + norm(full).toLowerCase();
	}

	// items: [{ id, dir, name, kind, ext, sep, pad, want }] (want: o nome pedido; null = desligado)
	// others: { dir: [nomes do disco fora da lista] } → { id: { state: 'off'|'bad'|'same'|'chg'|'dup', name, suffix } }
	function resolve(items, others) {
		var owner = {}; // nome de hoje → id do item (-1: do disco, fora da lista)
		var given = {}; // nomes finais já dados
		var out = {};

		items.forEach(function (it) {
			owner[key(it.dir, it.name + tail(it))] = it.id;
		});
		Object.keys(others || {}).forEach(function (dir) {
			(others[dir] || []).forEach(function (name) {
				var k = key(dir, name);

				if (!(k in owner)) owner[k] = -1;
			});
		});

		var taken = function (k, id) {
			return given[k] || (k in owner && owner[k] !== id);
		};

		items.forEach(function (it) {
			var want = it.want == null ? null : String(it.want).trim();

			if (want == null) out[it.id] = { state: 'off', name: it.name, suffix: '' };
			else if (!want || BAD_CHARS.test(want)) out[it.id] = { state: 'bad', name: it.name, suffix: '' };
			else if (norm(want) === norm(it.name)) out[it.id] = { state: 'same', name: it.name, suffix: '' };
		});

		items.forEach(function (it) {
			if (out[it.id]) return;

			var want = String(it.want).trim();
			var name = want;
			var n = 1;

			while (taken(key(it.dir, name + tail(it)), it.id)) {
				n++;
				name = want + '_' + n;
			}
			given[key(it.dir, name + tail(it))] = true;
			out[it.id] = { state: n > 1 ? 'dup' : 'chg', name: name, suffix: n > 1 ? '_' + n : '' };
		});

		return out;
	}

	var api = { resolve: resolve, BAD_CHARS: BAD_CHARS };

	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.PAD_FILES_NAMES = api;
})(typeof window !== 'undefined' ? window : this);
