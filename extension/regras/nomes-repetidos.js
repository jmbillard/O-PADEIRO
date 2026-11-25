/*

---------------------------------------------------------------
> REGRA — nomes repetidos (o sufixo _2, _3… do arquivista)
---------------------------------------------------------------

O nome pedido de cada item (a sugestão ou o editado) vira o nome final. Um nome que ficaria repetido na mesma pasta
ganha o primeiro sufixo livre (_2, _3…) e a situação 'dup' (o aviso "ganhou _2"): continua na renomeação.

Contam como ocupados, dentro da mesma pasta: o nome de hoje de todos os itens da lista (os desligados e os que mudam:
a ordem das renomeações não importa, nada é sobrescrito), os nomes do disco que não estão na lista (others, do host)
e os nomes finais já dados. A comparação não diferencia a caixa (os discos também não) e junta o acento separado do
macOS (NFD) com o junto (NFC), do mesmo jeito em todas as comparações (onde houver normalize: o ExtendScript não tem).

Regra compartilhada (ADR 0005): ES3, sem After e sem DOM. O painel carrega por <script> (window.PAD_NOMES_REPETIDOS,
usado pelo arquivista, files.js), o host por #include (o global PAD_NOMES_REPETIDOS) e o teste em Node por require
(module.exports): node extension/scripts/test-regras.js.

*/

(function (root) {
	var BAD_CHARS = /[\\\/:*?"<>|]/;

	function norm(text) {
		var s = String(text == null ? '' : text);

		return s.normalize ? s.normalize('NFC') : s;
	}

	function trim(text) {
		return String(text).replace(/^\s+|\s+$/g, '');
	}

	// o resto do nome que não muda: a extensão; na sequência, os quadros antes dela. frames (do host, '_[0001-0120]'):
	// o que a janela mostra; sem ele (o resolve), o separador e um # por dígito, para comparar os nomes
	function tail(it) {
		var ext = it.ext ? '.' + it.ext : '';

		if (it.frames) return it.frames + ext;
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
		var i, j, it, dir, list, k, want, name, n;

		others = others || {};

		for (i = 0; i < items.length; i++) {
			it = items[i];
			owner[key(it.dir, it.name + tail(it))] = it.id;
		}
		for (dir in others) {
			if (!others.hasOwnProperty(dir)) continue;

			list = others[dir] || [];

			for (j = 0; j < list.length; j++) {
				k = key(dir, list[j]);

				if (!owner.hasOwnProperty(k)) owner[k] = -1;
			}
		}

		function taken(k, id) {
			return given[k] === true || (owner.hasOwnProperty(k) && owner[k] !== id);
		}

		for (i = 0; i < items.length; i++) {
			it = items[i];
			want = it.want == null ? null : trim(it.want);

			if (want == null) out[it.id] = { state: 'off', name: it.name, suffix: '' };
			else if (!want || BAD_CHARS.test(want)) out[it.id] = { state: 'bad', name: it.name, suffix: '' };
			else if (norm(want) === norm(it.name)) out[it.id] = { state: 'same', name: it.name, suffix: '' };
		}

		for (i = 0; i < items.length; i++) {
			it = items[i];

			if (out.hasOwnProperty(it.id)) continue;

			want = trim(it.want);
			name = want;
			n = 1;

			while (taken(key(it.dir, name + tail(it)), it.id)) {
				n++;
				name = want + '_' + n;
			}
			given[key(it.dir, name + tail(it))] = true;
			out[it.id] = { state: n > 1 ? 'dup' : 'chg', name: name, suffix: n > 1 ? '_' + n : '' };
		}

		return out;
	}

	var api = { resolve: resolve, tail: tail, BAD_CHARS: BAD_CHARS };

	// o global sempre (o painel do After tem window e também module, com o Node ligado); o module.exports no Node
	root.PAD_NOMES_REPETIDOS = api;

	if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
