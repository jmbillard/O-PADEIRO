/*

---------------------------------------------------------------
> REGRA — a regra do renomear (o etiquetador, os outputs da fila, o arquivista, a prévia da configuração)
---------------------------------------------------------------

O nome novo de uma comp (ou de um arquivo) pela regra do renomear da equipe. A regra vem como parâmetro, na forma
guardada na configuração ('RENAME'): { formatos: [{ prefix, etiqueta, terms: [...] }], fixed: [{ match, name }],
removeSpecial, textCase, separator }. Nada aqui lê a configuração nem variáveis de fora.

  - o formato: o primeiro da lista com um termo no nome (como palavra; o plural com S também vale; os termos aceitam
    acento). As pastas da comp (opts.folders, da mais próxima para a raiz) vêm antes do nome e precisam COMEÇAR com o
    termo ('RODAPES', 'RODAPE - JOGO'; 'ASSETS' não é 'ASS'). opts.itemOnly: o formato só pelo nome do item, nunca
    pela pasta onde ele está (o arquivista);
  - com formato: tira do nome os prefixos e os termos de todos os formatos e abre com o prefixo do formato e o
    separador (RDP - JOAO SILVA). O prefixo do formato fica como está na regra;
  - o texto da parte descritiva (styleText): os especiais (acentos e símbolos) e a caixa;
  - o nome fixo (LOGO GLOBO) vence tudo, e sai como está na regra. Sem nome fixo no nome e sem formato, a etiqueta
    da comp (opts.etiqueta) também pode dar o nome fixo.

rename(regra, nome, opts) → { name, format: { prefix, etiqueta } | null, etiqueta (a do formato, ou null), fixed }.
A regra pode vir crua ou preparada uma vez por compile(regra) (as expressões montadas), para muitos nomes.
styleText(regra, texto) → o texto com os especiais e a caixa da regra, sem procurar o formato (a forminha).

suggest(regra, nome) → { plain, prefixed }: a sugestão do arquivista para um item (o nome sem a extensão e sem os
quadros da sequência de imagens), sem e com o prefixo do formato. Junta antes o acento separado da letra (macOS) e
devolve um nome que o disco aceita (fileName).

Regra compartilhada (ADR 0005): ES3, sem After e sem DOM. O host carrega por #include (o global
PAD_REGRA_DO_RENOMEAR, usado por rename lib.js e files.jsx), o painel por <script> (a prévia da aba renomear,
productions.js; o etiquetador e o arquivista do host de teste, mock-host.js) e o teste em Node por require: node extension/scripts/test-regras.js.

*/

(function (root) {
	// os separadores aceitos entre as palavras do nome
	var SEPARATORS = '[\\s_\\-]';

	// as letras que podem vir com acento no nome (maiúsculas e minúsculas): o termo reconhece 'rodapé' e 'RODAPE'
	var ACCENTS = {
		A: 'AÀ-Äaà-ä',
		E: 'EÈ-Ëeè-ë',
		I: 'IÌ-Ïiì-ï',
		O: 'OÒ-Öoò-ö',
		U: 'UÙ-Üuù-ü',
		C: 'CÇcç',
		N: 'NÑnñ'
	};

	function trim(text) {
		return String(text).replace(/^\s+|\s+$/g, '');
	}

	function escape(text) {
		return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	// os especiais fora: os acentos viram a letra sem acento e os símbolos viram espaço (o replaceSpecialCharacters
	// do host, PROT lib.js, tal e qual: o nome que o After grava)
	function specials(text) {
		var t = String(text)
			.replace(/À|Á|Â|Ã|Ä/g, 'A')
			.replace(/à|á|â|ã|ä/g, 'a')
			.replace(/È|É|Ê|Ë/g, 'E')
			.replace(/è|é|ê|ë/g, 'e')
			.replace(/Ì|Í|Î|Ï/g, 'I')
			.replace(/ì|í|î|ï/g, 'i')
			.replace(/Ò|Ó|Ô|Õ|Ö/g, 'O')
			.replace(/ò|ó|ô|õ|ö/g, 'o')
			.replace(/Ù|Ú|Û|Ü/g, 'U')
			.replace(/ù|ú|û|ü/g, 'u')
			.replace(/Ç/g, 'C')
			.replace(/ç/g, 'c')
			.replace(/[^\w\s-]/g, ' ')
			.replace(/[\s_]+/g, ' ')
			.replace(/^\W+|\W+$/, ''); // só a primeira ponta, como no host

		return trim(t);
	}

	// para comparar e para limpar a tabela: maiúsculas, sem acentos nem símbolos
	function normalize(text) {
		return specials(String(text).toUpperCase());
	}

	function titleCase(text) {
		return text
			.toLowerCase()
			.replace(/\s(.)/g, function (m) {
				return m.toUpperCase();
			})
			.replace(/^(.)/, function (m) {
				return m.toUpperCase();
			});
	}

	// termo (palavra) → expressão: espaços valem qualquer separador, as letras aceitam acento e o plural com S também
	// vale. Usada com a flag 'i' sobre o nome como está (com acentos). Termo vazio: null (não reconhece nada)
	function termRegex(term) {
		var t = escape(trim(normalize(term))).replace(/[\s_\-]+/g, ' ');
		var out = '';
		var i, c;

		if (t == '') return null;

		for (i = 0; i < t.length; i++) {
			c = t.charAt(i);

			if (c == ' ') out += SEPARATORS + '+';
			else if (ACCENTS.hasOwnProperty(c)) out += '[' + ACCENTS[c] + ']';
			else out += c;
		}

		return out + '(S)?';
	}

	// a regra preparada: as expressões dos termos e dos nomes fixos montadas uma vez
	function compile(rule) {
		var formatos, fixed, formats, list, terms, re, i, j, match;

		if (rule && rule.compiled === true) return rule;

		rule = rule || {};
		formatos = rule.formatos || [];
		fixed = rule.fixed || [];
		formats = [];

		for (i = 0; i < formatos.length; i++) {
			list = formatos[i].terms || [];
			terms = [];

			for (j = 0; j < list.length; j++) {
				re = termRegex(list[j]);

				if (re) terms.push(re);
			}
			formats.push({ prefix: String(formatos[i].prefix), etiqueta: String(formatos[i].etiqueta), terms: terms });
		}

		var fixedRe = [];

		for (i = 0; i < fixed.length; i++) {
			match = escape(trim(normalize(fixed[i].match))).replace(/[\s_\-]+/g, '[\\s_\\-]*');

			if (match) fixedRe.push({ re: new RegExp(match), name: fixed[i].name });
		}

		return {
			compiled: true,
			formats: formats,
			fixed: fixedRe,
			removeSpecial: rule.removeSpecial !== false,
			textCase: rule.textCase || 'upperCase',
			separator: rule.separator == null ? ' - ' : String(rule.separator)
		};
	}

	// o texto da parte descritiva do nome: os especiais e a caixa (não acha o formato do nome)
	function styleText(rule, text) {
		var r = compile(rule);
		var t = String(text);

		if (r.removeSpecial) t = specials(t);

		t = trim(t.replace(/[\s_]+/g, ' '));

		if (r.textCase == 'upperCase') return t.toUpperCase();
		if (r.textCase == 'lowerCase') return t.toLowerCase();
		if (r.textCase == 'titleCase') return titleCase(t);

		return t;
	}

	// o formato do nome, ou null. pasta: o nome precisa COMEÇAR com o termo; comp ou arquivo: o termo em qualquer
	// posição, como palavra
	function findFormat(r, name, isFolder) {
		var i, j, val, pattern;

		for (i = 0; i < r.formats.length; i++) {
			for (j = 0; j < r.formats[i].terms.length; j++) {
				val = r.formats[i].terms[j];

				if (isFolder) pattern = new RegExp('^(' + val + ')(' + SEPARATORS + '|$)', 'i');
				else pattern = new RegExp('(^|' + SEPARATORS + ')(' + val + ')(' + SEPARATORS + '|$)', 'i');

				if (pattern.test(name)) return r.formats[i];
			}
		}

		return null;
	}

	function removeTerms(name, terms) {
		var i, val;

		for (i = 0; i < terms.length; i++) {
			val = terms[i];
			name = name
				.replace(new RegExp('^(' + val + SEPARATORS + '+)', 'gi'), '') // início
				.replace(new RegExp(SEPARATORS + '+' + val + SEPARATORS + '+', 'gi'), ' ') // meio
				.replace(new RegExp(SEPARATORS + '+' + val + '$', 'gi'), '') // fim
				.replace(new RegExp('^' + val + '$', 'gi'), ''); // nome inteiro
		}

		return name;
	}

	// só a parte descritiva: sem os prefixos e os termos de todos os formatos. 'RODAPE_JOAO_SILVA' → 'JOAO SILVA'
	function describe(r, name, found) {
		var clean = name;
		var i;

		for (i = 0; i < r.formats.length; i++) {
			clean = clean.replace(new RegExp('^' + escape(r.formats[i].prefix) + '[\\s\\-]+', 'gi'), '');
			clean = removeTerms(clean, r.formats[i].terms);
		}

		// os termos do formato achado, caso ainda restem (termo repetido)
		clean = removeTerms(clean, found.terms);

		return trim(clean.replace(/[\s_\-]+/g, ' '));
	}

	// o nome fixo que o texto contém, ou null
	function fixedName(r, text) {
		var norm = normalize(text);
		var i;

		for (i = 0; i < r.fixed.length; i++) {
			if (r.fixed[i].re.test(norm)) return r.fixed[i].name;
		}

		return null;
	}

	// a regra do renomear aplicada a um nome. opts: { folders: [nomes das pastas, da mais próxima para a raiz],
	// etiqueta: a etiqueta da comp, itemOnly: o formato só pelo nome do item }
	function rename(rule, name, opts) {
		var r = compile(rule);
		var text = trim(String(name == null ? '' : name).replace(/\s+/g, ' '));
		var found = null;
		var folders, i, clean, fixed;

		opts = opts || {};
		folders = opts.itemOnly ? [] : opts.folders || [];

		for (i = 0; i < folders.length && !found; i++) found = findFormat(r, String(folders[i]), true);

		if (!found) found = findFormat(r, text, false);

		var result = { name: styleText(r, text), format: null, etiqueta: null, fixed: false };

		if (found) {
			clean = styleText(r, describe(r, text, found));
			result.format = { prefix: found.prefix, etiqueta: found.etiqueta };
			result.etiqueta = found.etiqueta;
			result.name = clean && clean.toUpperCase() !== found.prefix ? found.prefix + r.separator + clean : found.prefix;
		}

		// o nome fixo (LOGO GLOBO), pelo nome; sem ele e sem formato, pela etiqueta da comp
		fixed = fixedName(r, text);

		if (!fixed && !found && opts.etiqueta) fixed = fixedName(r, opts.etiqueta);

		if (fixed) {
			result.name = fixed;
			result.fixed = true;
		}

		return result;
	}

	// o acento separado da letra (o macOS guarda 'ã' como 'a' + '~', NFD) junto de novo na letra do português (NFC)
	var MARKS = { '̀': 'grave', '́': 'acute', '̂': 'circ', '̃': 'tilde', '̈': 'uml', '̧': 'cedil' };
	var COMPOSED = {
		grave: { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', A: 'À', E: 'È', I: 'Ì', O: 'Ò', U: 'Ù' },
		acute: { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', y: 'ý', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', Y: 'Ý' },
		circ: { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û', A: 'Â', E: 'Ê', I: 'Î', O: 'Ô', U: 'Û' },
		tilde: { a: 'ã', o: 'õ', n: 'ñ', A: 'Ã', O: 'Õ', N: 'Ñ' },
		uml: { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', A: 'Ä', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü' },
		cedil: { c: 'ç', C: 'Ç' }
	};

	function composeAccents(text) {
		return String(text).replace(/([A-Za-z])([̧̀́̂̃̈])/g, function (all, letter, mark) {
			var table = COMPOSED[MARKS[mark]];

			return table && table[letter] ? table[letter] : all;
		});
	}

	// o nome que o disco aceita (Windows e macOS): os caracteres proibidos viram _, os espaços repetidos viram um
	function fileName(text) {
		return trim(String(text).replace(/[\\\/:\*\?"<>\|]/g, '_').replace(/\s+/g, ' '));
	}

	// a sugestão do arquivista para o nome de um item (arquivo, pasta ou sequência de imagens), sem a extensão e sem
	// os quadros: { plain (sem o prefixo do formato), prefixed (com ele) }. O formato vem só do nome do item, nunca da
	// pasta onde ele está (itemOnly). O nome fixo e o nome já no padrão (CRT - HOJE) saem iguais nas duas
	function suggest(rule, name) {
		var r = compile(rule);
		var base = trim(composeAccents(String(name == null ? '' : name)).replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '));
		var plain = fileName(styleText(r, base.replace(/[\-]+/g, ' ')));
		var renamed = rename(r, base, { itemOnly: true });
		var prefixed = fileName(renamed.name);

		if (renamed.fixed) plain = prefixed;
		else if (styleText(r, base) == prefixed) plain = prefixed;

		return { plain: plain || base, prefixed: prefixed || base };
	}

	var api = {
		rename: rename,
		styleText: styleText,
		compile: compile,
		normalize: normalize,
		specials: specials,
		suggest: suggest,
		composeAccents: composeAccents,
		fileName: fileName
	};

	// o global sempre (o painel do After tem window e também module, com o Node ligado); o module.exports no Node
	root.PAD_REGRA_DO_RENOMEAR = api;

	if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
