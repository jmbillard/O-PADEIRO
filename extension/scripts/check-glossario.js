#!/usr/bin/env node
/*

---------------------------------------------------------------
> checagem do glossário (termos evitados)
---------------------------------------------------------------

Procura os termos que o GLOSSARY.md manda evitar (as linhas "_Avoid_: termo1, termo2 (nota)"), e o plural de cada
um, no código (extension/**, menos node_modules e a biblioteca de terceiros em client/lib), no texto visível (o HTML
e as strings dos JS) e nos documentos (README.md, extension/README.md e docs/*.md). Sem diferenciar caixa e com
fronteira de palavra: letras e dígitos fazem a palavra; o "_" e o "-" separam ({categoria} e indice_local têm o
termo; padLocalMode não tem "local").

A lista dos termos vem do próprio glossário (não se repete aqui). Nem todo termo evitado dá para procurar com uma
busca de texto: o glossário evita muitos só num sentido. A regra, termo a termo:

  - a nota "para …" ("arte, VT (para a entrega)"), "quando …", "sozinha", "sem …" ou um "para" no próprio termo
    ("projeto para a pasta"): o termo é evitado só num sentido, que uma busca não distingue. não é procurado;
  - a nota "é do X e do Y" ("local (é do modo local e do output local)"): o termo é procurado, e as expressões X e
    Y valem. as outras notas que dizem o sentido certo ("fonte (é a tipografia)") deixam o termo sem procurar;
  - o termo que é ele mesmo um termo do glossário ("projeto" é evitado para a pasta, mas é o .aep; "output" e
    "saída", um para o outro): não é procurado;
  - um termo do glossário que contém o termo evitado vale ("índice local", "output local", "modo local");
  - um apelido em maiúsculas ("A CLAQUETE") é procurado em maiúsculas: em minúsculas, "a claquete" é o texto da peça.

Cada arquivo é lido em trechos de texto (os documentos fora das crases, o texto e os atributos title, placeholder,
aria-label e alt do HTML, as strings com espaço e os comentários) e de código (os nomes, as strings sem espaço, o
código citado entre crases). No meio do texto, um nome de código (colado por _ . / -, entre aspas sem espaço ou num
{ … } de uma linha) conta como código. Isso só importa para os termos de SO_NO_TEXTO, abaixo: os outros são
procurados nos dois.

Além disso, as exceções declaradas abaixo (SENTIDO_GERAL, SO_NO_TEXTO, EXPRESSOES_PERMITIDAS, COMPATIBILIDADE e DE_FORA),
poucas e comentadas uma a uma. O próprio GLOSSARY.md não é lido (é ele que cita os termos), nem esta checagem.

uso: node extension/scripts/check-glossario.js           (sai com 1 se achar algum termo evitado)
     node extension/scripts/check-glossario.js --termos  (mostra como cada termo do glossário foi tratado)

*/

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const GLOSSARIO = path.join(RAIZ, 'GLOSSARY.md');

// ---------------------------------------------------------------
// exceções declaradas
// ---------------------------------------------------------------

// Termos evitados sem nota no glossário, mas que o glossário evita só para um conceito e que o português usa
// todo dia em outro sentido. A busca não separa um sentido do outro: o termo não é procurado.
const SENTIDO_GERAL = {
	// evitado para o designer; mas o login é "o usuário do sistema" (o próprio glossário diz assim) e a pasta do
	// usuário do sistema (~/Library, AppData) é dele
	'usuário': 'o login é o usuário do sistema, e a pasta de dados do sistema é a do usuário',
	// evitado para o quadro; mas toda pasta tem subpastas (as da estrutura padrão, as de um template)
	subpasta: 'subpasta de qualquer pasta (a estrutura padrão, a pasta de templates)',
	// evitado para o quadro; mas a configuração tem seções (a tabela de seções da regras/configuracao.js) e os
	// documentos também
	'seção': 'as seções da configuração guardada e dos documentos',
	// evitado para a sessão (TELA QUENTE); mas as faixas da migração do CATADOR e a faixa de cor (o guia de UI) são
	// outra coisa
	'faixa': 'as faixas da migração do CATADOR e a faixa de cor',
	// evitado para o template ("um modelo"); mas "o modelo da PROMO" é a organização e o stub é "modelo da página"
	modelo: 'o modelo da organização e o modelo de uma página',
	// evitado para o template e para o índice da busca; mas "com base em", "base64", a pasta "BASES VALENDO"
	base: 'com base em, base64, as BASES VALENDO',
	// evitado para a produção ("a lista"); mas toda lista da interface é uma lista (a lista dos templates, da busca)
	lista: 'as listas da interface (templates, produções, a busca)',
	// evitado para o bloco; mas a entrada de um menu, de uma tabela ou de um arquivo é outra coisa
	entrada: 'a entrada de um menu, de uma tabela ou de um arquivo',
	// evitado para o campo; mas a informação de um layer, de um aviso, é o sentido de todo dia
	'informação': 'informação no sentido de todo dia (a de um layer, a de um aviso)',
	// evitado para o índice da busca e a cópia dele; mas o cache de memória do código (as pastas já lidas, o estado
	// do coletar) e o cache de imagens do navegador são outra coisa
	cache: 'o cache de memória do código e o do navegador'
};

// Termos que também são palavras do inglês do código: só procurados no texto (os documentos, o texto visível do
// HTML, as strings com espaço e os comentários), não nos nomes (variáveis, arquivos, ids, classes, chaves, as
// chamadas ao host, o código citado entre crases ou aspas). Trocar esses nomes mudaria chaves guardadas e
// chamadas sem ganho para quem usa.
const SO_NO_TEXTO = {
	// o inglês do código: var local, o modo do índice ('local' | 'webhook', gravado neste computador), o estado
	// 'local' do coletar (fora das pastas de projetos), o PAD_LOCAL_INDEX e o local() das fontes no CSS
	local: 'o inglês do código (var local, o modo \'local\' do índice, o local() do CSS)',
	// o objeto global do ExtendScript ($.global), a variável global de cada regra (test-regras.js) e o arquivo da
	// configuração da equipe na rede, O_PADEIRO_GLOBAL_config.json: o instalador grava esse nome e cada computador
	// acha o arquivo por ele; trocar quebraria as instalações que já apontam para ele
	global: 'o $.global do ExtendScript e o arquivo O_PADEIRO_GLOBAL_config.json da rede'
};

// Expressões em que o termo evitado vale (além dos termos do glossário que o contêm e das notas "é do X e do Y").
const EXPRESSOES_PERMITIDAS = {
	// o comando do After (File > Dependencies > Collect Files)
	collect: ['collect files'],
	// a variável global do JavaScript (o jeito de cada regra compartilhada chegar ao host e ao painel) e a função
	// global, no mesmo sentido: as que os scripts de template (_script.js) do padeiro antigo chamam pelo nome
	// (host/lib/scripts-de-template.js)
	global: ['variável global', 'variáveis globais', 'função global', 'funções globais']
};

// As leituras de compatibilidade dos nomes antigos: o termo evitado vale numa linha que usa um destes nomes no
// código (fora do comentário), desde que a linha (ou a de cima) tenha um comentário que diga que é o nome antigo
// lido por compatibilidade. antigos, camposAntigos e arquivosAntigos são as colunas da tabela de seções
// (regras/configuracao.js), OLD_IDS são os ids das janelas que o instalador tira, TOKENS_ANTIGOS são os tokens do
// caminho com o nome antigo ({categoria} é o {tipo}), que os caminhos já salvos usam, e ICONES_ANTIGOS são os ícones
// com o nome antigo (barra-collect é o barra-coletar, client/js/util.js), que as produções e os tipos já salvos usam.
const COMPATIBILIDADE = ['antigos', 'camposAntigos', 'arquivosAntigos', 'OLD_IDS', 'TOKENS_ANTIGOS', 'ICONES_ANTIGOS'];
const COMENTARIO_DE_COMPATIBILIDADE = /(\/\/|\/\*|#).*(nome antigo|nomes antigos|compatibilidade|ids antigos|chave antiga|chaves antigas)/i;

// Os nomes que são de outro sistema, num arquivo só: o termo evitado vale naquele arquivo. { arquivo: { termo: o porquê } }
const DE_FORA = {
	// a coluna 'categoria' da tabela de atrações do PROMeiro (o Teable de teste do e2e): o servidor do PROMeiro a lê
	// pelo nome (o tipo da atração, no vocabulário dele), e o nome não é do Padeiro
	'extension/scripts/e2e-janela.js': { categoria: 'a coluna categoria das atrações do PROMeiro de teste' }
};

// fora da busca: as bibliotecas de terceiros, os ícones e imagens, e esta checagem (que cita os termos)
const FORA = /(^|\/)(node_modules|client\/lib)(\/|$)|check-glossario\.js$|\.(svg|png|jpe?g|gif|ico|ttf|otf|woff2?|aep|aet|mp4|mov|zip|debug)$/i;

// ---------------------------------------------------------------
// o glossário
// ---------------------------------------------------------------

function lerGlossario() {
	const linhas = fs.readFileSync(GLOSSARIO, 'utf8').split('\n');
	const canonicos = [];
	const termos = [];
	let atual = '';

	linhas.forEach(function (l, i) {
		const titulo = l.match(/^\*\*(.+?)\*\*/);

		if (titulo) {
			atual = titulo[1];
			canonicos.push(titulo[1].toLowerCase());
		}

		const avoid = l.match(/^_Avoid_:\s*(.+)$/);

		if (!avoid) return;
		avoid[1].split(';').forEach(function (grupo) {
			// um "para" fora dos parênteses: o grupo todo é evitado só naquele sentido ("projeto para a pasta")
			const sentido = / para /.test(grupo.replace(/\([^)]*\)/g, ''));
			const pedacos = [];
			let pendentes = [];
			let nivel = 0;
			let atualPedaco = '';

			// separa nas vírgulas de fora dos parênteses
			grupo.split('').forEach(function (c) {
				if (c === '(') nivel++;
				if (c === ')') nivel--;
				if (c === ',' && !nivel) {
					pedacos.push(atualPedaco);
					atualPedaco = '';
				} else atualPedaco += c;
			});
			pedacos.push(atualPedaco);

			pedacos.forEach(function (p) {
				const nota = (p.match(/\(([^)]*)\)/) || [])[1] || '';
				const termo = p.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
				const item = { termo: termo, nota: '', sentido: sentido, de: atual, linha: i + 1 };

				if (!termo) return;
				termos.push(item);
				if (!nota) return pendentes.push(item);
				item.nota = nota;
				// "para …", "quando …": vale para os termos de antes, sem nota ("arte, VT (para a entrega)");
				// "é …" diz o outro sentido só deste termo ("categoria, fonte (é a tipografia)")
				if (!/^é /.test(nota)) {
					pendentes.forEach(function (t) {
						t.nota = nota;
					});
				}
				pendentes = [];
			});
		});
	});

	return { canonicos: canonicos, termos: termos };
}

function escapar(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// fronteira de palavra: letras (com acento) e dígitos formam palavras; o "_" e o "-" separam
const LETRA = 'A-Za-zÀ-ÖØ-öø-ÿ0-9';

// o termo e o plural dele (local → locais, seção → seções, subpasta → subpastas, usuário → usuários)
function plural(termo) {
	if (/l$/i.test(termo)) return termo.slice(0, -1) + (termo === termo.toUpperCase() ? 'IS' : 'is');
	if (/ão$/i.test(termo)) return termo.slice(0, -2) + 'ões';
	if (/[rz]$/i.test(termo)) return termo + 'es';

	return termo + 's';
}

function regexDe(termo, caixa) {
	const palavras = termo.split(' ');
	const ultima = palavras.pop();
	const base = palavras.map(escapar).concat('(?:' + escapar(ultima) + '|' + escapar(plural(ultima)) + ')').join('\\s+');

	return new RegExp('(^|[^' + LETRA + '])(' + base + ')(?=[^' + LETRA + ']|$)', caixa ? 'g' : 'gi');
}

// cada termo do glossário: procurado ou não, e por quê
function tratar(g) {
	const vistos = {};

	return g.termos.map(function (t) {
		const r = { termo: t.termo, de: t.de, linha: t.linha, permitidas: [] };
		const baixo = t.termo.toLowerCase();
		const notaDo = t.nota.match(/^é do (.+)$/);

		if (t.sentido) r.fora = 'evitado só num sentido ("' + t.termo + ' para …")';
		else if (notaDo) r.permitidas = notaDo[1].split(/\s+e do\s+|,\s*do\s+/).map((s) => s.trim().toLowerCase());
		else if (t.nota) r.fora = 'evitado só num sentido (' + t.nota + ')';

		if (!r.fora && g.canonicos.indexOf(baixo) >= 0) r.fora = 'é também um termo do glossário (' + t.termo + ')';
		if (!r.fora && SENTIDO_GERAL[baixo]) r.fora = 'sentido geral: ' + SENTIDO_GERAL[baixo];
		if (!r.fora && vistos[baixo]) r.fora = 'repetido';
		vistos[baixo] = true;

		// os termos do glossário que contêm o termo evitado valem ("índice local")
		g.canonicos.forEach(function (c) {
			if (c !== baixo && regexDe(baixo).test(c)) r.permitidas.push(c);
		});
		r.permitidas = r.permitidas.concat(EXPRESSOES_PERMITIDAS[baixo] || []).filter((p, i, todas) => todas.indexOf(p) === i);
		r.caixa = t.termo === t.termo.toUpperCase() && /[A-Z]{2}/.test(t.termo) && t.termo.indexOf(' ') > 0;
		r.soNoTexto = !!SO_NO_TEXTO[baixo];

		return r;
	});
}

// ---------------------------------------------------------------
// os arquivos, em trechos de texto e de código
// ---------------------------------------------------------------

function arquivos() {
	const lista = [path.join(RAIZ, 'README.md'), path.join(RAIZ, 'extension', 'README.md')];

	fs.readdirSync(path.join(RAIZ, 'docs')).forEach(function (n) {
		if (/\.md$/.test(n)) lista.push(path.join(RAIZ, 'docs', n));
	});

	(function andar(dir) {
		fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
			const p = path.join(dir, e.name);
			const rel = path.relative(RAIZ, p);

			if (FORA.test(rel)) return;
			if (e.isDirectory()) return andar(p);
			if (lista.indexOf(p) < 0) lista.push(p);
		});
	})(path.join(RAIZ, 'extension'));

	// o instalador, na raiz
	fs.readdirSync(RAIZ).forEach(function (n) {
		if (/\.jsx$/.test(n)) lista.push(path.join(RAIZ, n));
	});

	return lista;
}

// Um trecho: { ini, fim, texto } — texto é true para o que é texto (documento, texto visível, string com espaço,
// comentário) e false para o código (nomes, ids, chaves).
function trechosJs(s, base) {
	const out = [];
	let i = 0;
	let ini = 0;
	let ultimo = ''; // o último caractere significativo do código, para saber se "/" abre uma regex

	function fechar(fim, texto) {
		if (fim > ini) out.push({ ini: base + ini, fim: base + fim, texto: texto });
		ini = fim;
	}

	while (i < s.length) {
		const c = s[i];
		const d = s[i + 1];

		if (c === '/' && d === '/') {
			fechar(i, false);
			const f = s.indexOf('\n', i);

			i = f < 0 ? s.length : f;
			fechar(i, true);
		} else if (c === '/' && d === '*') {
			fechar(i, false);
			const f = s.indexOf('*/', i + 2);

			i = f < 0 ? s.length : f + 2;
			fechar(i, true);
		} else if (c === '"' || c === "'" || c === '`') {
			fechar(i, false);
			let j = i + 1;

			while (j < s.length && s[j] !== c) {
				if (s[j] === '\\') j++;
				if (c !== '`' && s[j] === '\n') break;
				j++;
			}
			const conteudo = s.slice(i + 1, j);

			if (/<[a-z!][^>]*>/i.test(conteudo)) {
				// HTML dentro da string (os ícones, os pedaços de tela): lido como HTML
				out.push.apply(out, trechosHtml(conteudo, base + i + 1));
				ini = j + 1;
			} else {
				// string com espaço é frase (texto visível, mensagem); sem espaço é nome (id, chave, classe)
				fechar(j + 1, /\s/.test(conteudo.trim()));
			}
			i = j + 1;
			ultimo = 'a';
		} else if (c === '/' && (ultimo === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(ultimo) || /(return|typeof|case)\s*$/.test(s.slice(Math.max(0, i - 8), i)))) {
			// uma regex
			let j = i + 1;
			let classe = false;

			while (j < s.length && s[j] !== '\n' && (classe || s[j] !== '/')) {
				if (s[j] === '\\') j++;
				else if (s[j] === '[') classe = true;
				else if (s[j] === ']') classe = false;
				j++;
			}
			i = j + 1;
			ultimo = 'a';
		} else {
			if (!/\s/.test(c)) ultimo = c;
			i++;
		}
	}
	fechar(s.length, false);

	return out;
}

function trechosCss(s, base) {
	const out = [];
	const re = /\/\*[\s\S]*?\*\//g;
	let ini = 0;
	let m;

	while ((m = re.exec(s))) {
		out.push({ ini: base + ini, fim: base + m.index, texto: false });
		out.push({ ini: base + m.index, fim: base + re.lastIndex, texto: true });
		ini = re.lastIndex;
	}
	out.push({ ini: base + ini, fim: base + s.length, texto: false });

	return out;
}

// os atributos do HTML que a pessoa lê
const ATRIBUTOS_DE_TEXTO = /^(title|placeholder|aria-label|alt|data-tip|data-tooltip|data-title|label|content)$/i;

function trechosHtml(s, base) {
	base = base || 0;
	const out = [];
	const re = /<!--[\s\S]*?-->|<script\b[^>]*>([\s\S]*?)<\/script>|<style\b[^>]*>([\s\S]*?)<\/style>|<[^>]+>/gi;
	let ini = 0;
	let m;

	while ((m = re.exec(s))) {
		out.push({ ini: base + ini, fim: base + m.index, texto: true }); // o texto entre as tags
		if (m[0].slice(0, 4) === '<!--') out.push({ ini: base + m.index, fim: base + re.lastIndex, texto: true });
		else if (m[1] != null) out.push.apply(out, trechosJs(m[1], base + m.index + m[0].indexOf('>') + 1));
		else if (m[2] != null) out.push.apply(out, trechosCss(m[2], base + m.index + m[0].indexOf('>') + 1));
		else {
			// a tag: os atributos de texto são texto, o resto (ids, classes) é código
			const tag = m[0];
			const at = /([\w:-]+)\s*=\s*("[^"]*"|'[^']*')/g;
			let a;
			let k = 0;

			while ((a = at.exec(tag))) {
				const v = base + m.index + a.index + a[0].indexOf(a[2]);

				out.push({ ini: base + m.index + k, fim: v, texto: false });
				out.push({ ini: v, fim: v + a[2].length, texto: ATRIBUTOS_DE_TEXTO.test(a[1]) });
				k = a.index + a[0].length;
			}
			out.push({ ini: base + m.index + k, fim: base + re.lastIndex, texto: false });
		}
		ini = re.lastIndex;
	}
	out.push({ ini: base + ini, fim: base + s.length, texto: true });

	return out;
}

function trechosMd(s) {
	const out = [];
	const re = /```[\s\S]*?```|`[^`\n]+`/g;
	let ini = 0;
	let m;

	// o texto fora do código pode ter HTML (as imagens do README): lido como HTML
	while ((m = re.exec(s))) {
		out.push.apply(out, trechosHtml(s.slice(ini, m.index), ini));
		out.push({ ini: m.index, fim: re.lastIndex, texto: false }); // código citado no documento
		ini = re.lastIndex;
	}
	out.push.apply(out, trechosHtml(s.slice(ini), ini));

	return out;
}

function trechos(arquivo, s) {
	if (/\.(js|jsx)$/i.test(arquivo)) return trechosJs(s, 0);
	if (/\.css$/i.test(arquivo)) return trechosCss(s, 0);
	if (/\.html?$/i.test(arquivo)) return trechosHtml(s);
	if (/\.md$/i.test(arquivo)) return trechosMd(s);

	return [{ ini: 0, fim: s.length, texto: false }];
}

// ---------------------------------------------------------------
// a busca
// ---------------------------------------------------------------

function procurar(termos) {
	const achados = [];
	const procurados = termos.filter((t) => !t.fora);
	let total = 0;

	arquivos().forEach(function (arquivo) {
		const s = fs.readFileSync(arquivo, 'utf8');
		const rel = path.relative(RAIZ, arquivo).split(path.sep).join('/');
		const partes = trechos(arquivo, s);
		const linhas = s.split('\n');
		const inicioDaLinha = [0];

		total++;
		for (let i = 0; i < s.length; i++) if (s[i] === '\n') inicioDaLinha.push(i + 1);

		function linhaDe(pos) {
			let a = 0;
			let b = inicioDaLinha.length - 1;

			while (a < b) {
				const m = (a + b + 1) >> 1;

				if (inicioDaLinha[m] <= pos) a = m;
				else b = m - 1;
			}

			return a;
		}

		function permitida(t, pos, fim) {
			const trecho = s.slice(Math.max(0, pos - 40), fim + 40).toLowerCase();
			const local = pos - Math.max(0, pos - 40);

			return t.permitidas.some(function (p) {
				const re = regexDe(p);
				let m;

				while ((m = re.exec(trecho))) {
					const a = m.index + m[1].length;

					if (a <= local && a + m[2].length >= local + (fim - pos)) return true;
				}

				return false;
			});
		}

		// no meio do texto, um nome de código: colado por _ . / - = $ \ (coletar.jsx, PAD_LOCAL_INDEX, is-local),
		// entre aspas sem espaço ('local', ou '*locais*', o texto de um botão citado no documento) ou dentro de
		// { … } numa linha só ({ mode, local, folders }), sempre
		// dentro do mesmo trecho (o mesmo comentário, a mesma string)
		function nome(p, pos, fim) {
			const antes = s[pos - 1] || '';
			const depois = s[fim] || '';
			let a = pos;
			let b = fim;

			if (/[_\/\-=$\\]/.test(antes) || /[_\/\-\\]/.test(depois)) return true;
			if (antes === '.' && /\S/.test(s[pos - 2] || '')) return true;
			if (depois === '.' && /[A-Za-z]/.test(s[fim + 1] || '')) return true;
			while (a > p.ini && /[\w.\-\/$À-ÿ]/.test(s[a - 1])) a--;
			while (b < p.fim && /[\w.\-\/$À-ÿ]/.test(s[b])) b++;
			if (a - 1 >= p.ini && b < p.fim && /['"`]/.test(s[a - 1]) && s[a - 1] === s[b]) return true;
			// o texto de um botão citado num documento, como ele aparece na tela ('*locais*'): é conferido onde nasce
			if (s.slice(a - 2, a) === "'*" && s.slice(b, b + 2) === "*'") return true;

			const ini = Math.max(p.ini, s.lastIndexOf('\n', pos) + 1);
			let f = s.indexOf('\n', fim);

			f = Math.min(p.fim, f < 0 ? s.length : f);

			const linha = s.slice(ini, f);
			const abre = linha.lastIndexOf('{', pos - ini);

			return abre >= 0 && linha.lastIndexOf('}', pos - ini) < abre && linha.indexOf('}', fim - ini) >= 0;
		}

		function compatibilidade(n) {
			const l = linhas[n];
			const codigo = l.replace(/\/\/.*$|\/\*.*$/, '');

			if (!COMPATIBILIDADE.some((c) => regexDe(c, true).test(codigo))) return false;

			return COMENTARIO_DE_COMPATIBILIDADE.test(l) || (n > 0 && COMENTARIO_DE_COMPATIBILIDADE.test(linhas[n - 1]));
		}

		partes.forEach(function (p) {
			const pedaco = s.slice(p.ini, p.fim);

			procurados.forEach(function (t) {
				const re = regexDe(t.termo, t.caixa);
				let m;

				while ((m = re.exec(pedaco))) {
					const pos = p.ini + m.index + m[1].length;
					const fim = pos + m[2].length;
					const n = linhaDe(pos);

					if (t.soNoTexto && (!p.texto || nome(p, pos, fim))) continue;
					if (permitida(t, pos, fim) || compatibilidade(n)) continue;
					if (DE_FORA[rel] && DE_FORA[rel][t.termo]) continue;
					achados.push({ termo: t, arquivo: rel, linha: n + 1, texto: linhas[n].trim() });
				}
			});
		});
	});

	return { achados: achados, total: total };
}

// ---------------------------------------------------------------

const g = lerGlossario();
const termos = tratar(g);

if (process.argv.indexOf('--termos') >= 0) {
	termos.forEach(function (t) {
		console.log((t.fora ? '  · ' : '  ✓ ') + t.termo + ' (de ' + t.de + ')' + (t.fora ? ': ' + t.fora : '') +
			(t.permitidas.length ? ' · valem: ' + t.permitidas.join(', ') : '') + (t.soNoTexto ? ' · só no texto' : '') + (t.caixa ? ' · em maiúsculas' : ''));
	});
	console.log('');
}

const r = procurar(termos);
const procurados = termos.filter((t) => !t.fora);
const porTermo = {};

r.achados.forEach(function (a) {
	(porTermo[a.termo.termo] = porTermo[a.termo.termo] || []).push(a);
});

procurados.forEach(function (t) {
	const lista = porTermo[t.termo] || [];

	console.log((lista.length ? '✗ ' : '✓ ') + t.termo + (lista.length ? ' (no lugar de: ' + t.de + ')' : ''));
	lista.forEach(function (a) {
		console.log('    ' + a.arquivo + ':' + a.linha + '  ' + a.texto.slice(0, 120));
	});
});

console.log(r.achados.length
	? '\n' + r.achados.length + ' termo(s) evitado(s) pelo glossário em ' + r.total + ' arquivos.'
	: '\nnenhum termo evitado pelo glossário (' + procurados.length + ' termos procurados em ' + r.total + ' arquivos).');
process.exit(r.achados.length ? 1 : 0);
