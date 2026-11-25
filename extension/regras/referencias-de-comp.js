/*

---------------------------------------------------------------
> REGRA — as referências de comp nas expressões (comp("NOME"))
---------------------------------------------------------------

Uma expressão do After lê outra comp pelo nome: comp("BG"). O After acha a primeira comp do projeto com esse nome
(a caixa conta). Quando o preenchimento dá um nome novo a uma comp (a precomp de um template importado que já tinha o
nome no projeto ganha _2; a precomp duplicada com a versão), as expressões que a citam são reescritas aqui.

Só conta o nome inteiro entre aspas (duplas, simples ou crases sem ${…}) logo dentro de comp(…), com ou sem espaços.
Fica como está: o nome que é só pedaço de outro, o nome fora de comp(…) (thisComp.layer("BG"), um texto, um
comentário), o nome calculado (comp(nome)) e outra função terminada em comp (mycomp("BG")).

Regra compartilhada (ADR 0005): ES3, sem After e sem DOM. O host carrega por #include (a variável global
PAD_REFERENCIAS_DE_COMP, usada no preenchimento, host/api.jsx) e o teste em Node por require (module.exports):
node extension/scripts/test-regras.js.

*/

(function (root) {
	// o que vem antes de comp (nada de letra, dígito, _, $ ou ponto: não é mycomp nem x.comp), os espaços e o
	// parêntese, o nome entre aspas e o parêntese de fechar
	var COMP_CALL = /(^|[^A-Za-z0-9_$.])comp(\s*\(\s*)("(?:[^"\\]|\\[\s\S])*"|'(?:[^'\\]|\\[\s\S])*'|`(?:[^`\\$]|\\[\s\S])*`)(\s*\))/g;

	// o nome dentro das aspas, sem os escapes (\" → ")
	function unquote(literal) {
		return literal.substring(1, literal.length - 1).replace(/\\([\s\S])/g, '$1');
	}

	// o nome entre a mesma aspa, com a barra e a aspa escapadas
	function quote(name, mark) {
		var body = String(name).replace(/\\/g, '\\\\');

		body = body.split(mark).join('\\' + mark);

		return mark + body + mark;
	}

	// a expressão com cada comp("ANTIGO") trocado por comp("NOVO"), pelo mapa { ANTIGO: 'NOVO' }; o resto igual
	function rewrite(expression, map) {
		var text = expression == null ? '' : String(expression);

		map = map || {};

		return text.replace(COMP_CALL, function (all, before, open, literal, close) {
			var name = unquote(literal);

			if (!Object.prototype.hasOwnProperty.call(map, name)) return all;

			return before + 'comp' + open + quote(map[name], literal.charAt(0)) + close;
		});
	}

	// a expressão lê a comp 'name' por comp("…")?
	function cites(expression, name) {
		var text = expression == null ? '' : String(expression);
		var found = false;

		text.replace(COMP_CALL, function (all, before, open, literal) {
			if (unquote(literal) === String(name)) found = true;

			return all;
		});

		return found;
	}

	var api = { rewrite: rewrite, cites: cites };

	// a variável global sempre (o painel do After tem window e também module, com o Node ligado); o module.exports no Node
	root.PAD_REFERENCIAS_DE_COMP = api;

	if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
