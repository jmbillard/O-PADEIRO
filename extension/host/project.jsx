/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> projeto (janela PROJETO e aba PROJETO da configuração)
---------------------------------------------------------------

A janela PROJETO cria o projeto pela atração (abaixo) e edita os dados dele (a atração, o que é, o designer e as
pastas). O collect dos
arquivos é do botão COLETAR (collect.jsx).

'TIPOS_DE_PROJETO' (antes 'PROJECT') no O_PADEIRO_GLOBAL_config.json (aba TIPOS DE PROJETO da configuração), a seção 'tiposDeProjeto' da tabela de seções
(regras/configuracao.js: a limpeza, os tokens e o padrão):
  categories → [{ name, path, output, icon }]: a lista "dentro de" da atração nova. os caminhos (o do
               projeto e o do output, opcional: a pasta de output proposta no projeto novo) levam tokens:
               {atracao} (sem ele, a categoria é a própria atração: MOOD MENSAL) {ano} {mes} {mes_extenso} (NOVEMBRO) {proximo_mes} (DEZEMBRO) {proximo_mes_num} (12)
               {ano_proximo_mes} (o ano do próximo mês: em dezembro, o que vem) {categoria} {letra} (a primeira letra do nome sem o
               artigo: a pasta da letra dos filmes) {ano_producao} (o ano de produção do filme escolhido: NAO NAO OLHE
               (2022); sem ano, o token sai junto dos parênteses em volta). icon: um ícone do seletor (js/util.js)
Sem a seção (ou no formato antigo, com raiz e retrancas): sem categorias, e o "dentro de" vem das
atrações do índice.

*/

// Um caminho de output sem espaços a mais (regras/configuracao.js: semEspacosAMais). vale em todo caminho de output:
// os tipos de projeto, a janela de projeto, os dados do projeto e as pastas de output dos templates.
function padCleanSpaces(path) {
	return PAD_CONFIGURACAO.semEspacosAMais(path);
}

// Caminho guardado na configuração: barras normais, sem barra no fim (regras/configuracao.js: caminho).
function padProjectPath(path) {
	return PAD_CONFIGURACAO.caminho(path);
}

// As categorias da atração nova, cada uma dizendo se a pasta dela está acessível (o começo fixo do caminho,
// antes do primeiro token), e a pasta dos projetos deste computador, para quando não estiver (rede fora ou
// modo local; sem ela, a Área de Trabalho). → { categories: [{ name, path, icon, reachable }], fallback }
PADX.projectCategories = function () {
	var list = padLerSecao('tiposDeProjeto').categories;
	var local = padLocalMode();
	var checked = {};
	var out = [];

	for (var i = 0; i < list.length; i++) {
		var fixed = list[i].path.split('{')[0].replace(/\/[^\/]*$/, '');

		if (checked[fixed] == null) checked[fixed] = !local && fixed != '' && new Folder(resolveMacVolumePath(padPath(fixed))).exists; // VFX-1… também vale

		out.push({ name: list[i].name, path: list[i].path, output: list[i].output, file: list[i].file || '', icon: list[i].icon, reachable: checked[fixed] });
	}

	return { categories: out, fallback: padLerSecao('pastaDosProjetos') || '~/Desktop' };
};

/*

---------------------------------------------------------------
> dados do projeto aberto (metadados XMP)
---------------------------------------------------------------

Os dados do padeiro ficam num grupo próprio do XMP do projeto (padeiro:), todos texto:
  atracao    → a atração (LÁ NA MINHA TERRA)                       janela projeto
  quadro     → as pastas abaixo da atração (DANÇA DOS FAMOSOS/FINAL), opcional: o .aep é o último nível + o que é
  oQueE      → o que é (SERVIÇO): o .aep é a atração (ou o último nível) + o que é    janela projeto
  designer   → quem fez (JBILLARD)                                   projeto; o template grava se faltar
  pasta      → a raiz da estrutura (01 PROJETOS, 02 ARQUIVOS…)      janela projeto
  output     → a pasta de output                                     projeto; o template grava se faltar
  producao   → (não é mais gravado: só nos arquivos de antes) a produção do último template preenchido
  templates  → (não é mais gravado: só nos arquivos de antes) os templates usados, um por linha: nome <tab> pasta
  criado     → a data em que os dados foram gravados a primeira vez  o primeiro que gravar
  editores   → quem salvou o projeto, um por linha: sigla <tab> o último dia (AAAA-MM-DD)   a cada salvamento
  salvo      → quem salvou por último: sigla <tab> o dia                                  a cada salvamento
  versao     → a versão destes campos (para migrar no futuro)        todos
Também ficam dc:title (o nome do .aep), dc:creator (o designer) e dc:date (criado), que aparecem nas
informações do arquivo. Projeto de antes (sem padeiro:versao): os campos antigos (dc:coverage, dc:relation,
dc:publisher, dc:source, dc:identifier) são lidos aqui e, na próxima gravação, passam para os novos.

*/

var PAD_NS = 'https://github.com/jmbillard/O-PADEIRO/ns/1.0/';
var PAD_META_VERSION = '1';
var PAD_META_FIELDS = ['atracao', 'quadro', 'oQueE', 'designer', 'pasta', 'output', 'producao', 'templates', 'criado', 'editores', 'salvo'];
var PAD_META_LEGACY = ['identifier', 'coverage', 'relation', 'publisher', 'source'];
var padNsReady = false;

function padXmpMeta() {
	if (!padNsReady) {
		try {
			XMPMeta.registerNamespace(PAD_NS, 'padeiro');
		} catch (err) { }
		padNsReady = true;
	}

	return new XMPMeta(app.project.xmpPacket);
}

function padXmpProp(meta, ns, field) {
	try {
		if (meta.doesPropertyExist(ns, field)) {
			var prop = meta.getProperty(ns, field);

			if (prop && prop.value != null && String(prop.value) != '') return String(prop.value);
		}

		// dc:title / dc:creator gravados como lista
		if (meta.doesPropertyExist(ns, field + '[1]')) return String(meta.getProperty(ns, field + '[1]').value);
	} catch (err) { }

	return '';
}

// um campo do Dublin Core (dc:title…)
function padXmpGet(field) {
	try {
		return padXmpProp(padXmpMeta(), XMPConst.NS_DC, field);
	} catch (err) {
		return '';
	}
}

// Os dados do padeiro no projeto aberto → { atracao, oQueE, designer, pasta, output, producao, templates, criado, versao }
function padMetaRead() {
	var out = {};
	var meta;

	try {
		meta = padXmpMeta();
	} catch (err) {
		return { atracao: '', quadro: '', oQueE: '', designer: '', pasta: '', output: '', producao: '', templates: '', criado: '', versao: '' };
	}

	for (var i = 0; i < PAD_META_FIELDS.length; i++) out[PAD_META_FIELDS[i]] = padXmpProp(meta, PAD_NS, PAD_META_FIELDS[i]);
	out.versao = padXmpProp(meta, PAD_NS, 'versao');

	if (!out.versao) {
		var dc = function (f) {
			return padXmpProp(meta, XMPConst.NS_DC, f);
		};
		var claq = padAepName(dc('identifier'));
		var atr = padAepName(dc('coverage'));

		out.atracao = dc('coverage');
		out.designer = dc('creator');
		out.pasta = dc('relation');
		out.output = dc('publisher');
		out.criado = dc('date');
		out.oQueE = atr && claq.indexOf(atr + ' ') == 0 ? claq.slice(atr.length + 1) : '';
		out.templates = dc('source') ? padTemplatesText([{ name: '', path: dc('source') }]) : '';
	}

	return out;
}

// Grava os campos passados ('' apaga), junto com os que já estavam (num projeto de antes, os antigos passam para os
// novos e saem). title: o nome do .aep (dc:title), opcional.
function padMetaWrite(fields, title) {
	var cur = padMetaRead();
	var meta = padXmpMeta();
	var dc = XMPConst.NS_DC;
	var i;

	for (var k in fields) if (fields.hasOwnProperty(k) && fields[k] != null) cur[k] = String(fields[k]);
	if (cur.output) cur.output = padCleanSpaces(cur.output);

	// toda gravação é de quem está usando: entra nos editores e no salvo por último
	var touch = padEditorsTouch(cur);

	cur.editores = touch.editores;
	cur.salvo = touch.salvo;

	for (i = 0; i < PAD_META_FIELDS.length; i++) {
		var f = PAD_META_FIELDS[i];

		meta.deleteProperty(PAD_NS, f);
		if (cur[f]) meta.setProperty(PAD_NS, f, cur[f]);
	}
	meta.deleteProperty(PAD_NS, 'versao');
	meta.setProperty(PAD_NS, 'versao', PAD_META_VERSION);
	for (i = 0; i < PAD_META_LEGACY.length; i++) meta.deleteProperty(dc, PAD_META_LEGACY[i]);

	// as cópias que aparecem nas informações do arquivo
	if (cur.designer) {
		meta.deleteProperty(dc, 'creator');
		meta.setProperty(dc, 'creator', cur.designer);
	}
	if (cur.criado) {
		meta.deleteProperty(dc, 'date');
		meta.setProperty(dc, 'date', cur.criado);
	}
	if (title) {
		meta.deleteProperty(dc, 'title');
		meta.setProperty(dc, 'title', String(title));
	}

	app.project.xmpPacket = meta.serialize();
}

/*
   quem editou e salvou: o padeiro não é avisado do salvar do After Effects (Ctrl+S, o salvar ao iniciar o render).
   a barra percebe em seguida que o arquivo foi salvo (projectStatus) e anota quem está usando, em memória; a
   anotação vai para o arquivo no salvamento seguinte. nos salvamentos do próprio padeiro, vai na hora.
   por dia: a anotação só muda (e o projeto só fica "modificado") no primeiro salvamento de cada pessoa no dia
*/

// os editores de um projeto: [{ user, day, time }], do texto 'sigla <tab> dia <tab> hora' por linha (a hora é
// opcional: HH:MM do último salvamento de quem já não é o último; a do último vem da data do arquivo)
function padEditorsList(text) {
	var out = [];
	var lines = String(text || '').split('\n');

	for (var i = 0; i < lines.length; i++) {
		var parts = lines[i].split('\t');

		if (parts[0]) out.push({ user: parts[0], day: parts[1] || '', time: parts[2] || '' });
	}

	return out;
}

// o dia (AAAA-MM-DD) e a hora (HH:MM) de uma data em ms
function padDayTime(ms) {
	var d = new Date(ms);
	var two = function (n) {
		return (n < 10 ? '0' : '') + n;
	};

	return { day: d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()), time: two(d.getHours()) + ':' + two(d.getMinutes()) };
}

// os editores e o salvo por último com quem está usando, hoje → { editores, salvo, changed }
function padEditorsTouch(cur) {
	var user = padSigla();
	var today = padToday();
	var list = padEditorsList(cur.editores);
	var before = padEditorsList(cur.salvo)[0] || null; // quem era o último, antes de agora
	var lines = [];
	var i;

	if (!user) return { editores: cur.editores || '', salvo: cur.salvo || '', changed: false };

	// outra pessoa era a última: a hora do último salvamento dela é a data que o arquivo tinha antes deste
	// salvamento (a barra guarda em PAD_SAVE_SEEN). fica na linha dela, sem gravar nada a mais depois
	var stamp = null;

	try {
		var file = app.project.file;

		if (before && before.user != user && file && PAD_SAVE_SEEN.path == file.fsName && PAD_SAVE_SEEN.time) stamp = padDayTime(PAD_SAVE_SEEN.time);
	} catch (err) { }

	// quem salva vai para o fim da lista: a ordem das linhas é a ordem em que cada um salvou por último (duas
	// pessoas no mesmo dia: a de baixo salvou depois)
	for (i = 0; i < list.length; i++) {
		if (list[i].user == user) continue;

		var time = list[i].time;

		if (stamp && list[i].user == before.user && list[i].day == stamp.day) time = stamp.time;
		lines.push(list[i].user + '\t' + list[i].day + (time ? '\t' + time : ''));
	}
	lines.push(user + '\t' + today); // a hora de quem é o último vem da data do arquivo

	var editores = lines.join('\n');
	var salvo = user + '\t' + today;

	return { editores: editores, salvo: salvo, changed: editores != (cur.editores || '') || salvo != (cur.salvo || '') };
}

// anota quem está usando nos dados do projeto (só num projeto com os dados do padeiro, e só se mudar)
function padEditorsNote() {
	try {
		var cur = padMetaRead();

		if (!cur.atracao || !padEditorsTouch(cur).changed) return false;

		padMetaWrite({});

		return true;
	} catch (err) {
		return false;
	}
}

// o último salvamento visto pela barra: { path, time }
var PAD_SAVE_SEEN = { path: '', time: 0 };

// padeiro:templates: uma linha por template, nome <tab> pasta
function padTemplatesList(text) {
	var out = [];
	var lines = String(text || '').split('\n');

	for (var i = 0; i < lines.length; i++) {
		var parts = lines[i].split('\t');
		var path = parts.length > 1 ? parts[1] : parts[0];

		if (path) out.push({ name: parts.length > 1 ? parts[0] : '', path: path });
	}

	return out;
}

function padTemplatesText(list) {
	var lines = [];

	for (var i = 0; i < list.length; i++) lines.push(String(list[i].name || '').replace(/[\t\n]/g, ' ') + '\t' + list[i].path);

	return lines.join('\n');
}

// Preenchimento e importação de templates: info: { name, path, producao, output }
function padRegisterTemplateUse(info) {
	// o arquivo que sai de um preenchimento não é um projeto: o template e a produção não são mais gravados nele (vão
	// para o registro de uso / webhook). fica só a pasta de output do template, se ainda não houver uma: é para ela
	// que o Render e o Pastas da barra apontam
	try {
		if (info.output && !padMetaRead().output) padMetaWrite({ output: padDisplayPath(padPath(info.output)) });
	} catch (err) { }
}

function padToday() {
	var d = new Date();
	var m = d.getMonth() + 1;
	var day = d.getDate();

	return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}

// Abre a pasta do projeto aberto: a da estrutura (gravada ao criar) ou a de cima da de projetos.
PADX.projectOpenFolder = function () {
	var file = app.project.file;
	var path = padMountedPath(padPath(padMetaRead().pasta)) || (file ? padCollectRoot(file, padLerSecao('coletar')) : '');

	if (!path || !new Folder(path).exists) throw new Error('#PAD_091 - o projeto ainda não foi salvo.');

	openFolder(path);

	return { path: padDisplayPath(path) };
};

/*

---------------------------------------------------------------
> novo projeto pela claquete (janela PROJETO, numa tela)
---------------------------------------------------------------

A claquete (ex: MAIS VOCE 30 10, TELA 9 11) acha a atração no índice da busca: pelo começo dela,
comparado com os padrões da atração ('pattern' no índice) e com o nome. A pasta da atração recebe a
estrutura do coletar (01_PROJETOS, 02_ARQUIVOS, 03_SAIDA…), aproveitando a que já existir.
  - o .aep é o nome da atração + o que é (MAIS VOCE SERVICO), em todas as categorias (filmes também: a
    pasta da letra é só o token {letra} do caminho da categoria)
No projeto ficam os dados do padeiro (padeiro:, em 'dados do projeto aberto'): a atração, o que é, o designer,
a pasta da estrutura e a de output (a da categoria ou a da atração no índice, quando ela existe ou é criada com
o projeto: sem output, não grava).

*/

// Para nomes de arquivo e pastas: sem acentos e símbolos, em maiúsculas (NÃO! NÃO OLHE! → NAO NAO OLHE).
// Os tokens de data num caminho de output de template ({ano}, {mes}, {mes_extenso}, {proximo_mes},
// {proximo_mes_num}, {ano_proximo_mes}) e o {atracao} (a atração do template): …/BBB/BBB {ano} vale todo ano. o
// que não é token fica como está.
var PAD_MONTHS = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

function padFillDateTokens(path, atracao) {
	var d = new Date();
	var m = d.getMonth();
	var two = function (n) {
		return (n < 10 ? '0' : '') + n;
	};
	var values = {
		ano: String(d.getFullYear()),
		mes: two(m + 1),
		mes_extenso: PAD_MONTHS[m],
		proximo_mes: PAD_MONTHS[(m + 1) % 12],
		proximo_mes_num: two((m + 1) % 12 + 1),
		ano_proximo_mes: String(d.getFullYear() + (m == 11 ? 1 : 0)),
		atracao: atracao ? padAepName(atracao) : null
	};

	// depois dos tokens: um token vazio não deixa dois espaços (nem um espaço na ponta) no caminho de output
	return padCleanSpaces(String(path || '').replace(/\{(\w+)\}/g, function (all, key) {
		return values[key] != null ? values[key] : all;
	}));
}

// O nome do .aep: como o padAepName, mas o ano de produção de um filme fica entre parênteses (NAO NAO OLHE (2022)
// CHAMADA). só um ano de 4 algarismos sozinho nos parênteses; o resto dos parênteses sai como qualquer símbolo
function padAepFileName(text) {
	var rest = String(text == null ? '' : text);
	var re = /\((\d{4})\)/;
	var out = [];
	var m;

	// um ano por vez (o split com grupo não é confiável no ExtendScript)
	while ((m = re.exec(rest)) != null) {
		var before = padAepName(rest.substring(0, m.index));

		if (before) out.push(before);
		out.push('(' + m[1] + ')');
		rest = rest.substring(m.index + m[0].length);
	}

	rest = padAepName(rest);
	if (rest) out.push(rest);

	return out.join(' ');
}

function padAepName(text) {
	return String(text == null ? '' : text).replaceSpecialCharacters().toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/^\s+|\s+$/g, '');
}

// Palavras da claquete, para comparar com os padrões (S.TARDE 3/11 → S TARDE 3 11).
function padClaqueteWords(text) {
	var key = padAepName(text);

	return key ? key.split(' ') : [];
}

function padCompact(text) {
	return padAepName(text).replace(/\s+/g, '');
}

// O índice da busca (a cópia guardada; baixa de novo se estiver velha e houver rede).
// As atrações do índice da busca, no formato que a janela usa:
// [{ category, groups: [{ name, projetos, outputs, caminhos, patterns }] }]. A cópia é a mesma do acessorista
// (psCopyToRead): baixada de novo se tiver mais de 30 s (no modo local, só a cópia).
function padIndexGroups() {
	var copy = psCopyToRead();
	var text = '';

	if (!(padLocalMode() && copy.exists) && !psCopyIsFresh(copy)) {
		try {
			text = PADX.searchDownload({}).text;
		} catch (err) { }
	}

	if (!text && copy.exists) {
		try {
			text = readFileContent(copy);
		} catch (err) { }
	}

	var data = null;

	try {
		data = JSON.parse(text);
		if (typeof data == 'string') data = JSON.parse(data); // o JSON mandado como texto
		// embrulhado pelo n8n: [{ indice: '<o JSON em texto>' }]
		if (data instanceof Array && data[0] && typeof data[0].indice == 'string') data = JSON.parse(data[0].indice);
	} catch (err) { }

	// o 'v' é um campo do JSON da equipe (o índice montado no n8n)
	if (!data || data.v != 2) throw new Error('#PAD_058 - não foi possível carregar o índice das atrações. verifique a conexão e o workflow.');

	var roots = data.roots || {};
	var full = function (path) {
		var m = /^([a-z]+):(.*)$/.exec(path || '');

		return m && roots[m[1]] ? roots[m[1]] + '/' + m[2] : path || '';
	};
	var groups = [];
	var list = data.atracoes || [];

	for (var i = 0; i < list.length; i++) {
		var a = list[i];

		if (!a || !a.name) continue;

		groups.push({
			name: a.name,
			projetos: a.proj ? [full(a.proj)] : [],
			outputs: a.out ? [full(a.out)] : [],
			caminhos: [],
			patterns: a.pattern || []
		});
	}

	return [{ category: { key: 'atracoes', label: 'ATRAÇÕES' }, groups: groups }];
}


// As pastas das letras dos filmes recentes no formato deste computador (o volume montado no Mac), sem ler nada
// dentro delas: quem lê é o Node do painel, sem travar o After. a: { parents: [...] } → { paths: [a pasta ou ''] }
PADX.projectFilmsParents = function (a) {
	var parents = a && a.parents instanceof Array ? a.parents : [];
	var paths = [];

	for (var i = 0; i < parents.length; i++) {
		var p = '';

		try {
			p = padMountedPath(padPath(parents[i] || '')) || '';
			if (p) p = new Folder(p).fsName;
		} catch (err) { p = ''; }

		paths.push(p);
	}

	return { paths: paths };
};

// Os filmes recentes (o webhook dos filmes) que já têm pasta de projeto. a: { items: [{ parent, title }] } →
// { done: [bool], paths: [a pasta achada ou ''] }. parent: a pasta onde a do filme fica (a da letra, _N_); a pasta
// conta pelo título sem acento, sem pontuação e sem o ano (NAO NAO OLHE e NAO NAO OLHE (2022) são o mesmo filme).
// cada pasta de cima é lida uma vez só, pela lista dela (sem perguntar por uma pasta que ainda não existe:
// padListedFolder)
PADX.projectFilmsDone = function (a) {
	var items = a && a.items instanceof Array ? a.items : [];
	var lists = {};
	var done = [];
	var paths = [];

	for (var i = 0; i < items.length; i++) {
		var parent = padMountedPath(padPath(items[i].parent || ''));
		var key = padAepName(String(items[i].title || '').replace(/\(\d{4}\)/g, ' '));
		var year = String(items[i].year || '');
		var found = '';

		if (parent && key) {
			if (!lists.hasOwnProperty(parent)) {
				var names = {};
				var folder = new Folder(parent);
				var files = padListedFolder(parent) ? folder.getFiles() || [] : [];

				for (var f = 0; f < files.length; f++) {
					if (!(files[f] instanceof Folder)) continue;

					var nm = decodeURI(files[f].name);
					var k = padAepName(nm.replace(/\(\d{4}\)/g, ' '));
					var y = nm.match(/\((\d{4})\)\s*$/);

					if (!names.hasOwnProperty(k)) names[k] = [];
					names[k].push({ year: y ? y[1] : '', path: files[f].fsName });
				}

				lists[parent] = names;
			}

			// a com o mesmo ano ou, sem ela, uma antiga sem ano (a de outro ano é outro filme: um remake)
			var cands = lists[parent].hasOwnProperty(key) ? lists[parent][key] : [];

			for (var c = 0; c < cands.length && !found; c++) {
				if (year && cands[c].year == year) found = cands[c].path;
			}
			for (c = 0; c < cands.length && !found; c++) {
				if (!cands[c].year || !year) found = cands[c].path;
			}
		}

		done.push(found != '');
		paths.push(found);
	}

	return { done: done, paths: paths };
};

// Atrações cuja claquete começa com um dos padrões (ou com o nome), a mais específica primeiro.
// a: { claquete } → { claquete, matches: [{ name, category, path, display }] }
PADX.projectLookup = function (a) {
	var words = padClaqueteWords(a.claquete);
	var prefixes = {};
	var acc = '';
	var i;

	for (i = 0; i < words.length; i++) {
		acc += words[i];
		prefixes[acc] = true;
	}

	if (!words.length) return { claquete: '', matches: [] };

	var index = padIndexGroups();
	var found = [];
	var seen = {};

	for (var c = 0; c < index.length; c++) {
		for (var g = 0; g < index[c].groups.length; g++) {
			var group = index[c].groups[g];
			var path = group.projetos[0] || group.caminhos[0] || '';

			if (!path) continue;

			var tries = group.patterns.concat([group.name]);
			var score = 0;

			for (var t = 0; t < tries.length; t++) {
				var key = padCompact(tries[t]);

				if (key && prefixes[key] && key.length > score) score = key.length;
			}

			if (!score || seen[padCompact(group.name)]) continue;

			seen[padCompact(group.name)] = true;
			found.push({ name: group.name, category: index[c].category.label || '', path: path, display: padDisplayPath(padPath(path)), score: score });
		}
	}

	found.sort(function (x, y) {
		return y.score - x.score;
	});

	return { claquete: padAepName(a.claquete), matches: found.slice(0, 6) };
};

// Onde fica cada coisa: a raiz da estrutura, a pasta dos .aep e o nome do arquivo.
// a: { atracao, path, what } → { root, projects, fileBase }
// No macOS, o caminho no volume certo: o mesmo share montado de novo vira VFX-1 … VFX-5 (e a pasta /Volumes/VFX
// pode sobrar vazia), então vale o volume onde existe o maior trecho do caminho (resolveMacVolumePath). se nenhum
// volume tem nem a primeira pasta, monta o share como o acessorista faz ao abrir uma pasta (lib/acessorista.js).
// Montar só depois de um clique: o que roda sozinho (as bolinhas da barra, a janela de fontes) usa
// padResolvedPath, que nunca monta. sem a rede (VPN fora), cada tentativa de montar abre um aviso do macOS: depois
// de uma que falhou, o mesmo share só é tentado de novo passado PAD_MOUNT_RETRY.
var PAD_MOUNT_RETRY = 60000;
var PAD_MOUNT_FAILED = {};

function padMountedPath(path) {
	if (appOs != 'Mac' || !path) return path;

	var match = String(path).match(/^\/Volumes\/([^\/]+?)(?:-[1-5])?\/([^\/]+)/);

	if (!match) return path;

	var resolved = resolveMacVolumePath(path);

	if (padVolumeHas(resolved, match[2])) return resolved;

	var share = match[1].toLowerCase();
	var now = new Date().getTime();

	if (PAD_MOUNT_FAILED[share] && now - PAD_MOUNT_FAILED[share] < PAD_MOUNT_RETRY) return resolved;

	psResolveOnMac(path, '', '');
	resolved = resolveMacVolumePath(path);

	if (padVolumeHas(resolved, match[2])) delete PAD_MOUNT_FAILED[share];
	else PAD_MOUNT_FAILED[share] = now;

	return resolved;
}

// O caminho no volume certo (VFX, VFX-1 … VFX-5), sem nunca montar: para o que roda sozinho, de tempos em tempos.
function padResolvedPath(path) {
	if (appOs != 'Mac' || !path) return path;

	return resolveMacVolumePath(path);
}

// O volume do caminho (/Volumes/X) tem a primeira pasta dele? (um volume desmontado não tem)
function padVolumeHas(path, first) {
	var volume = String(path).match(/^\/Volumes\/[^\/]+/);

	return !!volume && new Folder(volume[0] + '/' + first).exists;
}

// A pasta existe? pela lista da pasta de cima, sem perguntar pelo nome dela: no compartilhamento de rede do macOS,
// perguntar por uma pasta que ainda não existe faz o sistema lembrar que "não existe" por uns segundos, e a pasta
// criada logo depois não aparece para o After Effects (o .aep não salva).
function padListedFolder(path) {
	var folder = new Folder(path);
	var parent = folder.parent;

	if (!parent || !parent.exists) return false;

	var items = parent.getFiles() || [];
	var name = decodeURI(folder.name).toLowerCase();

	// a lista vazia (ou que não veio) não prova nada: pergunta direto
	if (!items.length) return folder.exists;

	for (var i = 0; i < items.length; i++) {
		if (decodeURI(items[i].name).toLowerCase() == name) return items[i] instanceof Folder || new Folder(items[i].fsName).exists;
	}

	return false;
}

function padNewProjectPlan(a) {
	var settings = padLerSecao('coletar');
	var sub = padCollectFolderPath(settings, 'projeto') || '01_PROJETOS';
	var root;
	var fileBase;

	// com pastas abaixo da atração (quadro: DANÇA DOS FAMOSOS/FINAL): o último nível + o que é
	var levels = padTrim(a.quadro).split('/');

	// o nome do tipo (aba PROJETO > ARQUIVO) com {o_que_e}: o o que é entra no lugar do token, não no fim
	var custom = padTrim(a.fileName);

	if (!padTrim(levels[levels.length - 1]) && custom.indexOf('{o_que_e}') >= 0) fileBase = padAepFileName(custom.split('{o_que_e}').join(' ' + (a.what || '') + ' '));
	else fileBase = padAepFileName((padTrim(levels[levels.length - 1]) || custom.split('{o_que_e}').join(' ') || a.atracao) + ' ' + (a.what || ''));
	if (!fileBase) throw new Error('#PAD_090 - escolha a atração.');
	root = padMountedPath(padPath(a.path));

	if (!root) throw new Error('#PAD_091 - sem pasta de destino: escolha a pasta.');

	// a pasta da atração já é a de projetos (…/01PROJETOS): a estrutura fica na de cima
	var rootFolder = new Folder(root);
	var rootExists = padListedFolder(root);

	if (padIsProjectsFolderName(decodeURI(rootFolder.name))) {
		// a de projetos pedida não existe, mas há outra com outra grafia ao lado (pediu …/PROJETOS e existe
		// …/01_PROJETOS): é essa, pela estrutura da pasta de cima (nada de criar uma segunda pasta de projetos)
		if (!rootExists) return { settings: settings, root: rootFolder.parent.fsName, rootExists: padListedFolder(rootFolder.parent.fsName), projectsSub: sub, projects: rootFolder.parent.fsName + '/' + sub, projectsExists: false, fileBase: fileBase };

		return { settings: settings, root: rootFolder.parent.fsName, rootExists: true, projectsSub: '', projects: rootFolder.fsName, projectsExists: rootExists, fileBase: fileBase };
	}

	// a de projetos que já existir dentro dela (com outra grafia), sem criar nada aqui
	var projects = root + '/' + sub;
	var found = false;

	if (rootExists) {
		var items = rootFolder.getFiles() || [];

		for (var i = 0; i < items.length; i++) {
			if (padIsProjectsFolderName(decodeURI(items[i].name)) && (items[i] instanceof Folder || new Folder(items[i].fsName).exists)) {
				projects = items[i].fsName;
				found = true;
			}
		}

		// a lista não achou: as grafias comuns, direto pelo caminho
		var variant = found ? null : padProjectsVariant(root, sub);

		if (variant) {
			projects = variant.fsName;
			found = true;
		}
	}

	return { settings: settings, root: root, rootExists: rootExists, projectsSub: sub, projects: projects, projectsExists: found, fileBase: fileBase };
}

// Os .aep (e .aet) da pasta e das subpastas logo dentro dela (um nível só), o último alterado primeiro:
// [{ name, ext, sub (a subpasta, '' no topo), modified (ms) }]. as pastas de autosave, logs, OLD… ficam de fora. é
// o plano B do JÁ NA PASTA: com o Node do painel, quem lê é o painel (a rede lenta não trava o After, ADR 0003)
function padAepList(folderPath, depth) {
	var out = [];

	padAepListInto(new Folder(folderPath), '', depth || 0, out);

	return out.sort(function (a, b) {
		return b.modified - a.modified;
	});
}

function padAepListInto(folder, sub, depth, out) {
	if (!folder.exists) return;

	var items = folder.getFiles() || [];

	for (var i = 0; i < items.length; i++) {
		var name = decodeURI(items[i].name);

		if (/^\./.test(name)) continue;

		// os .aep e os .aet (ext: a lista da claquete mostra os dois; só o .aep do topo conta como nome repetido)
		if (items[i] instanceof File && /\.ae[pt]$/i.test(name)) {
			out.push({ name: name.replace(/\.ae[pt]$/i, ''), ext: /\.aet$/i.test(name) ? 'aet' : 'aep', sub: sub, modified: items[i].modified ? items[i].modified.getTime() : 0 });
		} else if (depth > 0 && items[i] instanceof Folder && !padIsJunkFolder(name)) {
			padAepListInto(items[i], name, depth - 1, out);
		}
	}
}

// As pastas criadas junto com o projeto novo: o .aep, as fontes, as imagens e os vídeos (e as sem tipo);
// áudio e dados o coletar cria quando aparecerem.
var PAD_PROJECT_KINDS = ['projeto', 'fontes', 'imagens', 'videos'];

// A estrutura de pastas de um projeto (configuração > coletar), para a árvore animada do projeto novo: cada pasta
// com a profundidade e o que ela recebe. → { folders: [{ name, depth, contents: ['projeto', 'imagens', …] }] }
/*

---------------------------------------------------------------
> pastas de um nível (ATRAÇÃO/PASTA/PASTA… e o output na janela projeto)
---------------------------------------------------------------

As pastas dentro de uma pasta, lidas na hora, para a lista que abre a cada barra digitada. na pasta de uma atração
(e nas de baixo), a de cima da de projetos quando o caminho aponta para ela, e ficam de fora as da estrutura do
coletar (01_PROJETOS, 02_ARQUIVOS…, em qualquer grafia). plain (o output): só a pasta, sem tirar a estrutura. as de
autosave, logs, sem nome (New Folder…) e as escondidas nunca aparecem.

*/

// a: { path, plain } → { root, rootName, exists, folders: [{ name, path }] }
PADX.projectFolders = function (a) {
	var root = padMountedPath(padPath(a.path));

	if (!root) return { root: '', rootName: '', exists: false, folders: [] };

	var folder = new Folder(root);

	if (!a.plain && padIsProjectsFolderName(decodeURI(folder.name))) folder = folder.parent;

	var skip = {};
	var folders = [];
	var i;

	if (!a.plain) {
		var settings = padLerSecao('coletar');

		for (i = 0; i < settings.folders.length; i++) skip[padFolderKey(settings.folders[i].name)] = true;
	}

	var items = folder.exists ? folder.getFiles() || [] : [];

	for (i = 0; i < items.length; i++) {
		var name = decodeURI(items[i].name);

		if (!(items[i] instanceof Folder || new Folder(items[i].fsName).exists) || /^\./.test(name) || padIsJunkFolder(name)) continue;
		if (!a.plain && (skip[padFolderKey(name)] || padIsProjectsFolderName(name))) continue;

		folders.push({ name: name, path: padDisplayPath(items[i].fsName) });
	}

	folders.sort(function (x, y) {
		return x.name.toUpperCase() < y.name.toUpperCase() ? -1 : 1;
	});

	return { root: padDisplayPath(folder.fsName), rootName: decodeURI(folder.name), exists: folder.exists, folders: folders };
};

// Os quadros da organização nova numa atração, para os exemplos da janela: as pastas 'depth' níveis abaixo da
// atração (o {ano}: qualquer ano) que têm dentro a pasta dos projetos da estrutura (01_PROJETOS), ou seja, as que o
// padeiro criou. as pastas antigas da mesma atração ficam de fora. a: { root, depth, here (a do ano de agora) }
// → { names: [nome] }
PADX.projectQuadros = function (a) {
	var settings = padLerSecao('coletar');
	var sub = padCollectFolderPath(settings, 'projeto') || '01_PROJETOS';
	var level = [new Folder(padMountedPath(padPath(a.root)))];
	var depth = Math.max(1, Math.min(3, a.depth || 1));
	var hereKey = a.here ? padPathKey(new Folder(padMountedPath(padPath(a.here))).fsName) : '';
	var names = [];
	var seen = {};
	var reads = 0;
	var i;
	var j;

	var folders = function (f) {
		var out = [];
		var items = [];

		if (++reads > 120) return out; // pasta enorme: para (os exemplos são um atalho, não uma lista completa)

		try {
			items = f.getFiles() || [];
		} catch (err) { }

		for (var k = 0; k < items.length; k++) {
			var n = decodeURI(items[k].name);

			if (items[k] instanceof Folder && !/^\./.test(n) && !padIsJunkFolder(n)) out.push(items[k]);
		}

		return out;
	};

	for (var d = 0; d < depth; d++) {
		var next = [];

		for (i = 0; i < level.length; i++) next = next.concat(folders(level[i]));
		level = next;
	}

	for (i = 0; i < level.length; i++) {
		if (padPathKey(level[i].fsName) == hereKey) continue;

		var kids = folders(level[i]);

		for (j = 0; j < kids.length; j++) {
			var name = decodeURI(kids[j].name);
			var key = padAepName(name);

			if (!key || seen[key] || !new Folder(kids[j].fsName + '/' + sub).exists) continue;
			seen[key] = true;
			names.push(name);
		}
	}

	return { names: names };
};

PADX.projectShape = function () {
	var settings = padLerSecao('coletar');
	var list = padStructureFolders(settings, null);
	var byName = {};
	var out = [];

	for (var i = 0; i < settings.folders.length; i++) byName[settings.folders[i].name.toUpperCase()] = settings.folders[i].contents;
	for (var j = 0; j < list.length; j++) out.push({ name: list[j].name, depth: list[j].depth, contents: byName[String(list[j].name).toUpperCase()] || [] });

	return { folders: out };
};

// O que vai ser criado (a pasta, o nome do .aep, os .aep que já estão na pasta e o output). Não cria nada.
// a.list === false: o painel lê os .aep da pasta pelo Node (ADR 0003); o plano vem sem a lista (existing vazio) e
// com projectsFs, o caminho da pasta de projetos como o sistema o vê (o volume montado)
PADX.projectPlan = function (a) {
	var plan = padNewProjectPlan(a);
	var existing = plan.projectsExists && a.list !== false ? padAepList(plan.projects, 1) : [];
	var rootFolder = new Folder(plan.root);
	var exists = false;

	for (var i = 0; i < existing.length; i++) if (existing[i].name == plan.fileBase && existing[i].ext != 'aet' && !existing[i].sub) exists = true;

	var outputPath = a.output ? padMountedPath(padPath(padCleanSpaces(a.output))) : '';

	return {
		root: padDisplayPath(plan.root),
		rootName: decodeURI(rootFolder.name),
		rootExists: plan.rootExists,
		projects: padDisplayPath(plan.projects),
		projectsName: decodeURI(new Folder(plan.projects).name),
		projectsExists: plan.projectsExists,
		projectsFs: plan.projectsExists ? new Folder(plan.projects).fsName : '',
		listed: a.list !== false,
		fileBase: plan.fileBase,
		fileName: plan.fileBase + '.aep',
		existing: existing,
		exists: exists,
		user: padSigla(),
		output: outputPath ? padDisplayPath(outputPath) : ''
	};
};

// Abre um projeto que já está na pasta (a lista JÁ NA PASTA do projeto novo). a: { path } → { file }
PADX.projectOpenFile = function (a) {
	var file = new File(padMountedPath(padPath(a.path)));

	if (!file.exists) throw new Error('#PAD_112 - o projeto não foi encontrado: ' + padDisplayPath(file.fsName));

	app.open(file);

	return { file: padDisplayPath(file.fsName) };
};

// A pasta existe e aceita arquivos novos? (o After Effects só diz "File couldn't be opened for writing")
// No macOS, o After Effects precisa da permissão para os volumes de rede (sem ela, não lista nem cria pastas lá)
function padMacPrivacyHint() {
	return appOs == 'Mac' ? '. confira também Ajustes do Sistema > Privacidade e Segurança > Arquivos e Pastas > After Effects > Volumes de Rede' : '';
}

// a mensagem diz qual pasta falta (a primeira que não existe no caminho) e o que o sistema respondeu
function padCheckWritable(path) {
	var folder = padWaitFolder(path, 3000);

	if (folder.exists) return;

	var missing = folder;

	while (missing.parent && !missing.parent.exists) missing = missing.parent;

	// 'pedido': o caminho inteiro que o padeiro quis usar (para o diagnóstico: de onde veio o nome da pasta)
	throw new Error('#PAD_091 - não foi possível criar a pasta ' + decodeURI(missing.name) + ' em ' + padDisplayPath(missing.parent ? missing.parent.fsName : path) + (padLastMkdir ? ' (' + padLastMkdir + ')' : ' (sem permissão ou rede fora?)') + padMacPrivacyHint() + '.' + padFolderPeek(missing.parent) + ' [pedido: ' + padDisplayPath(path) + ']');
}

// Para o diagnóstico: o que o After Effects e o sistema veem dentro da pasta (até 8 nomes de cada)
function padFolderPeek(folder) {
	if (!folder) return '';

	var names = [];
	var items = folder.getFiles() || [];
	var shell = '';

	for (var i = 0; i < items.length && i < 8; i++) names.push(decodeURI(items[i].name) + (items[i] instanceof Folder ? '/' : ''));

	try {
		shell = String(system.callSystem(appOs == 'Win'
			? 'cmd.exe /c dir /b "' + folder.fsName.replace(/"/g, '') + '" 2>&1'
			: 'ls -1 ' + psShellQuote(folder.fsName) + ' 2>&1 | head -8')).replace(/^\s+|\s+$/g, '').replace(/[\r\n]+/g, ', ');
	} catch (err) {
		shell = err.message;
	}

	return ' [o After Effects vê: ' + (names.join(', ') || 'nada') + ' | o sistema vê: ' + (shell || 'nada') + ']';
}

// Cria a estrutura e salva o .aep. a: plano + { output, outputCreate, mode: '' | 'increment' }
// (o .aep que já existe: 'increment' salva como … 2; sem mode, erro. abrir o existente é o projectOpenFile)
PADX.projectCreate = function (a) {
	padLastMkdir = '';

	var plan = padNewProjectPlan(a);

	padCollectStructure(plan.root, plan.settings, PAD_PROJECT_KINDS);

	var projects = plan.projectsSub ? padCollectResolve(plan.root, plan.projectsSub, true) : plan.projects;
	var base = plan.fileBase;
	var file = new File(projects + '/' + base + '.aep');

	padCheckWritable(projects);

	if (file.exists && a.mode == 'increment') {
		for (var n = 2; file.exists && n < 100; n++) file = new File(projects + '/' + base + ' ' + n + '.aep');
	} else if (file.exists) {
		throw new Error('#PAD_092 - já existe ' + base + '.aep em ' + decodeURI(new Folder(projects).name) + '.');
	}

	// a pasta de output: criada se pedido (outputCreate); vai para os metadados só a que existir (pular: não grava)
	var output = a.output ? new Folder(padMountedPath(padPath(padCleanSpaces(a.output)))) : null;

	if (output && !output.exists && a.outputCreate) padEnsureFolder(output.fsName);

	// os dados só ficam no projeto se ele for salvo na pasta: se salvar falhar, voltam os de antes
	var packet = app.project.xmpPacket;

	padMetaWrite({
		atracao: String(a.atracao || ''),
		quadro: String(a.quadro || ''),
		oQueE: String(a.what || ''),
		designer: padSigla(),
		pasta: padDisplayPath(plan.root),
		output: output && output.exists ? padDisplayPath(output.fsName) : '',
		criado: padToday()
	}, decodeURI(file.name).replace(/\.aep$/i, ''));

	try {
		try {
			app.project.save(file);
		} catch (first) {
			// a pasta recém-criada na rede pode demorar a aceitar arquivos: espera e tenta de novo
			padWaitFolder(projects, 2000);
			$.sleep(1000);
			app.project.save(file);
		}
	} catch (err) {
		app.project.xmpPacket = packet;
		throw new Error('#PAD_091 - não foi possível salvar o projeto em ' + padDisplayPath(projects) + ' (sem permissão de escrita na pasta?)' + padMacPrivacyHint() + '.');
	}

	return { file: padDisplayPath(file.fsName), root: padDisplayPath(plan.root) };
};

// O .aep está dentro da pasta gravada no projeto (padeiro:pasta)? sem pasta gravada, vale. o volume com sufixo
// (VFX-1) conta como o mesmo.
function padInRoot(file) {
	var root = padMetaRead().pasta;

	if (!root) return true;

	var key = function (path) {
		return padDisplayPath(path).replace(/\\/g, '/').replace(/^(\/Volumes\/[^\/]+?)-[1-5](?=\/|$)/i, '$1').replace(/\/+$/, '').toLowerCase() + '/';
	};

	if (key(file.fsName).indexOf(key(padPath(root))) == 0) return true;

	// o mesmo lugar escrito de outro jeito (\\servidor\… x /Volumes/…, a letra do drive): a chave da rede do coletar
	try {
		var here = padPathKey(file.fsName);

		return here.indexOf(padPathKey(root)) == 0 || here.indexOf(padPathKey(padPath(root) || root)) == 0;
	} catch (err) {
		return false;
	}
}

// O estado do projeto aberto para a bolinha do botão Projeto (barra): 'ok' (salvo com os dados do padeiro, na
// pasta dele), 'out' (com eles, mas salvo fora da pasta dele), 'missing' (sem eles: salvo sem a atração, ou com
// itens e sem arquivo) ou '' (projeto vazio). leve: só o XMP.
// state: a bolinha do Projeto. key: muda quando o projeto muda (outro projeto, ou salvo de novo): a barra confere
// as fontes só nessa hora (fontsCheck: a chave deste computador)
PADX.projectStatus = function () {
	var file = app.project.file;
	var key = '';

	try {
		key = file ? file.fsName + '|' + file.modified.getTime() : 'novo';
	} catch (err) { }

	// o arquivo aberto foi salvo de novo desde a última conferência (o Ctrl+S, o salvar do render): anota quem salvou
	try {
		var seenTime = file ? file.modified.getTime() : 0;
		var seenPath = file ? file.fsName : '';

		if (seenPath && seenPath == PAD_SAVE_SEEN.path && seenTime != PAD_SAVE_SEEN.time) padEditorsNote();
		PAD_SAVE_SEEN = { path: seenPath, time: seenTime };
	} catch (err2) { }

	var meta = padMetaRead();
	// os dados valem mesmo sem arquivo: o projeto antigo que o After converte ao abrir fica "(converted)", sem salvar
	var hasData = !!meta.atracao;
	// why: por que a bolinha está laranja, para a dica da barra (e para achar o que houve quando ela erra)
	var why = '';

	if (!hasData) {
		var fileName = '';

		try {
			fileName = file ? decodeURI(file.name) : '';
		} catch (err3) { }
		why = !file ? 'o projeto ainda não foi salvo' : fileName + ' não tem a atração nos dados do padeiro' + (meta.versao ? '' : ' (nenhum dado do padeiro no arquivo)');
	}
	// out: com os dados do padeiro, mas o .aep está fora da pasta dele (ex: "salvar como" na Área de Trabalho)
	// if/else em vez de ternário encadeado: o ExtendScript agrupa 'a ? b : c ? d : e' como '(a ? b : c) ? d : e', e
	// o projeto com a atração caía sempre em 'missing' (a barra dizia "ainda sem atração" num projeto já criado)
	var state = '';

	if (hasData) {
		if (file && padInRoot(file)) state = 'ok';
		else state = 'out';
		if (!file) why = 'convertido de uma versão antiga do After e ainda não salvo';
	}
	else if (file || app.project.numItems > 0) state = 'missing';

	return { state: state, key: key, why: why, fontsCheck: padLerSecao('fontesConferir') };
};

// a data de modificação de um arquivo, em ms (0 sem arquivo ou sem leitura)
function padFileTime(file) {
	try {
		return file && file.modified ? file.modified.getTime() : 0;
	} catch (err) {
		return 0;
	}
}

// O projeto aberto: com os dados do padeiro (a atração) ou não.
// editores: quem já salvou [{ user, day }]; salvo: o último { user, day } ou null
// → { created, outside, atracao, quadro, oQueE, designer, defaultUser, output, root, file, fileName, hasItems, user }
PADX.projectCurrent = function () {
	var file = app.project.file;
	var m = padMetaRead();
	var settings = padLerSecao('coletar');
	var inRoot = !!(file && m.atracao && padInRoot(file));

	return {
		created: inRoot,
		outside: !!(m.atracao && !inRoot), // com os dados, mas salvo fora da pasta dele (ex: na Área de Trabalho)
		unsaved: !file && !!m.atracao, // com os dados, mas sem arquivo: o After converteu o projeto antigo ao abrir
		atracao: m.atracao,
		quadro: m.quadro,
		oQueE: m.oQueE,
		designer: m.designer || padSigla(),
		criado: m.criado,
		editores: padEditorsList(m.editores),
		salvo: padEditorsList(m.salvo)[0] || null,
		defaultUser: padSiglaDoLogin(),
		output: padNoVolumeSuffix(m.output),
		root: padNoVolumeSuffix(m.pasta) || (file ? padDisplayPath(padCollectRoot(file, settings)) : ''),
		file: file ? padDisplayPath(file.fsName) : '',
		fileName: file ? decodeURI(file.name) : '',
		modified: padFileTime(file), // o último salvamento do arquivo (a hora que os editores, por dia, não guardam)
		hasItems: app.project.numItems > 0,
		user: padSigla()
	};
};

// Barra (salvar): salva o projeto aberto onde ele está.
PADX.projectSaveNow = function () {
	if (!app.project.file) throw new Error('#PAD_091 - o projeto ainda não foi salvo.');

	padEditorsNote();
	app.project.save();

	return PADX.projectCurrent();
};

// Editor (Salvar): grava os dados e salva o .aep onde ele deve ficar: na pasta de projetos da estrutura (criada se
// faltar; as outras pastas, o coletar cria), com o nome da atração + o que é. com outro nome ou em outro lugar, salva lá (o arquivo antigo continua onde estava).
// a: { atracao, quadro, what, designer, root, output, fileBase, fileName } → projectCurrent + { moved: caminho antigo }
// fileBase: o nome de hoje, num projeto antigo fora do padrão (a atração e o o que é não mudaram)
// fileName: o nome do tipo (aba PROJETO > ARQUIVO, com {o_que_e}), como no projeto novo: o tipo fixo (MOOD MENSAL)
// mantém o nome pelo padrão dele ao salvar, em vez de virar a atração + o que é
PADX.projectSave = function (a) {
	padLastMkdir = '';

	var file = app.project.file;
	var plan = padNewProjectPlan({ atracao: a.atracao, quadro: a.quadro, what: a.what, path: a.root, fileName: a.fileName });

	if (a.fileBase) plan.fileBase = String(a.fileBase);

	// só a pasta de projetos (para o .aep): as outras da estrutura o coletar cria quando precisar
	var projects = plan.projectsSub ? padCollectResolve(plan.root, plan.projectsSub, true) : padEnsureFolder(plan.projects).fsName;
	var dest = new File(projects + '/' + plan.fileBase + '.aep');
	var same = !!file && padSamePath(file.fsName, dest.fsName);

	padCheckWritable(projects);
	if (!same && dest.exists) throw new Error('#PAD_092 - já existe ' + plan.fileBase + '.aep em ' + padDisplayPath(projects) + (file ? '.' : ' (o original, da versão antiga do After): mude o "o que é" para salvar o convertido ao lado dele.'));

	var packet = app.project.xmpPacket;

	padMetaWrite({
		atracao: String(a.atracao || ''),
		quadro: String(a.quadro || ''),
		oQueE: String(a.what || ''),
		designer: PAD_CONFIGURACAO.limpar('sigla', a.designer) || padSigla(),
		pasta: padDisplayPath(plan.root),
		output: a.output != null ? (a.output ? padDisplayPath(padPath(padCleanSpaces(a.output))) : '') : null,
		criado: padMetaRead().criado || padToday()
	}, plan.fileBase);

	try {
		if (same) app.project.save();
		else app.project.save(dest);
	} catch (err) {
		app.project.xmpPacket = packet;
		throw new Error('#PAD_091 - não foi possível salvar o projeto em ' + padDisplayPath(projects) + padMacPrivacyHint() + '.');
	}

	var cur = PADX.projectCurrent();

	if (file && !same) cur.moved = padDisplayPath(file.fsName);

	return cur;
};

