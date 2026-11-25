/*

---------------------------------------------------------------
> REGRA — o preset de render (o nome curto, o H.264 preferido e a lista sem os ocultos)
---------------------------------------------------------------

Os presets de render são os templates de output module do After (a lista de cada computador).

  shortName(nome)        → o nome curto: com 3 partes ou mais separadas por " - ", a primeira e a última
                           ("H.264 - Match Render Settings - 15 Mbps" → "H.264 · 15 Mbps"); senão o nome inteiro.
                           O seletor do rodapé do painel de templates usa quando o nome inteiro não cabe.
  withoutHidden(lista)   → a lista sem os presets internos do After ("_HIDDEN …"), na mesma ordem.
  preferredH264(lista)   → o H.264 de 15 Mbps ("H.264 - Match Render Settings - 15 Mbps", o padrão do After). O meio
                           do nome muda com o idioma, então compara só o começo (H.264) e o fim (15 Mbps). Sem ele,
                           qualquer H.264 de 15 Mbps e, por fim, qualquer H.264. '' se não houver nenhum.

Regra compartilhada (ADR 0005): ES3, sem After e sem DOM. O painel carrega por <script> (window.PAD_PRESET_DE_RENDER,
usado pelo painel de templates, app.js), o host por #include (a variável global PAD_PRESET_DE_RENDER: fillBegin,
renderPresets, fillFinish e o preview do criador) e o teste em Node por require (module.exports):
node extension/scripts/test-regras.js.

*/

(function (root) {
	var HIDDEN = /^_HIDDEN\s/;

	function trim(text) {
		return String(text).replace(/^\s+|\s+$/g, '');
	}

	function shortName(name) {
		var full = String(name == null ? '' : name);
		var parts = full.split(/\s+-\s+/);

		if (parts.length < 3) return full;

		return trim(parts[0]) + ' · ' + trim(parts[parts.length - 1]);
	}

	function withoutHidden(list) {
		var out = [];

		for (var i = 0; i < list.length; i++) {
			if (!HIDDEN.test(String(list[i]))) out.push(String(list[i]));
		}

		return out;
	}

	function preferredH264(list) {
		var rules = [/^H\.?264\b.*\b15\s*Mbps\s*$/i, /H\.?264.*15\s*Mbps/i, /H\.?264/i];
		var names = withoutHidden(list || []);

		for (var r = 0; r < rules.length; r++) {
			for (var t = 0; t < names.length; t++) {
				if (rules[r].test(names[t])) return names[t];
			}
		}

		return '';
	}

	var api = { shortName: shortName, withoutHidden: withoutHidden, preferredH264: preferredH264 };

	// a variável global sempre (o painel do After tem window e também module, com o Node ligado); o module.exports no Node
	root.PAD_PRESET_DE_RENDER = api;

	if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
