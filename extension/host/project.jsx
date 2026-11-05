/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> projeto (janela PROJETO e aba PROJETO da configuração)
---------------------------------------------------------------

A janela PROJETO cria o projeto pela atração (abaixo) e edita os dados dele (a atração, o que é, o designer e as
pastas). O collect dos
arquivos é do botão COLETAR (collect.jsx).

'PROJECT' no O_PADEIRO_GLOBAL_config.json (aba PROJETO da configuração):
  categories → [{ name, path, output, icon }]: a lista "dentro de" da atração nova. os caminhos (o do
               projeto e o do output, opcional: a pasta de output proposta na etapa CRIAR) levam tokens:
               {atracao} (obrigatório) {ano} {mes} {mes_extenso} (NOVEMBRO) {proximo_mes} (DEZEMBRO) {categoria} {letra} (a primeira letra do nome sem o
               artigo: a pasta da letra dos filmes). icon: um ícone do seletor (js/util.js)
Sem 'PROJECT' (ou no formato antigo, com raiz e retrancas): sem categorias, e o "dentro de" vem das
atrações do índice.

*/

var PAD_DEFAULT_PROJECT = { categories: [] };

var PAD_PATH_TOKENS = ['atracao', 'ano', 'mes', 'mes_extenso', 'proximo_mes', 'categoria', 'letra'];

// Caminho guardado na configuração: barras normais, sem barra no fim.
function padProjectPath(path) {
	return padTrim(path).replace(/\\/g, '/').replace(/(.)\/+$/, '$1');
}

// Valida e normaliza a seção vinda do painel. Lança Error com a mensagem.
function padCleanProject(o) {
	var clean = { categories: [] };
	var list = o && o.categories instanceof Array ? o.categories : [];
	var seen = {};

	for (var i = 0; i < list.length; i++) {
		var c = list[i] || {};
		var name = padTrim(c.name).replace(/\s+/g, ' ').toUpperCase();
		var path = padProjectPath(c.path);
		var output = padProjectPath(c.output);
		var icon = String(c.icon == null ? '' : c.icon).replace(/[^a-z0-9-]/g, '');
		var key = padAepName(name);
		var re = /\{([^}]*)\}/g;
		var m;

		if (!key) throw new Error('#PAD_089 - projeto: preencha o nome da categoria ' + (i + 1) + '.');
		if (seen[key]) throw new Error('#PAD_089 - projeto: a categoria ' + name + ' aparece mais de uma vez.');
		if (path == '') throw new Error('#PAD_089 - projeto: a categoria ' + name + ' precisa de um caminho.');

		while ((m = re.exec(path + ' ' + output)) != null) {
			if (PAD_PATH_TOKENS.indexOf(m[1]) < 0) throw new Error('#PAD_089 - projeto: {' + m[1] + '} não é um token do caminho (use {atracao}, {ano}, {mes}, {mes_extenso}, {proximo_mes}, {categoria} ou {letra}).');
		}

		if (path.indexOf('{atracao}') < 0) throw new Error('#PAD_089 - projeto: o caminho de ' + name + ' precisa do {atracao} (a pasta da atração nova).');
		if (output != '' && output.indexOf('{atracao}') < 0) throw new Error('#PAD_089 - projeto: o output de ' + name + ' precisa do {atracao} (a pasta de output da atração nova).');

		seen[key] = true;
		clean.categories.push({ name: name, path: path, output: output, icon: icon });
	}

	return clean;
}

function padReadProject() {
	try {
		var data = padConfigData();

		return data.PROJECT ? padCleanProject(data.PROJECT) : PAD_DEFAULT_PROJECT;
	} catch (err) {
		return PAD_DEFAULT_PROJECT;
	}
}

// As categorias da atração nova, cada uma dizendo se a pasta dela está acessível (o começo fixo do caminho,
// antes do primeiro token), e a pasta dos projetos deste computador, para quando não estiver (rede fora ou
// modo local; sem ela, a Área de Trabalho). → { categories: [{ name, path, icon, reachable }], fallback }
PADX.projectCategories = function () {
	var list = padReadProject().categories;
	var local = padLocalMode();
	var checked = {};
	var out = [];

	for (var i = 0; i < list.length; i++) {
		var fixed = list[i].path.split('{')[0].replace(/\/[^\/]*$/, '');

		if (checked[fixed] == null) checked[fixed] = !local && fixed != '' && new Folder(resolveMacVolumePath(padPath(fixed))).exists; // VFX-1… também vale

		out.push({ name: list[i].name, path: list[i].path, output: list[i].output, icon: list[i].icon, reachable: checked[fixed] });
	}

	return { categories: out, fallback: padMachinePath(padMachineData().projects) || '~/Desktop' };
};

/*

---------------------------------------------------------------
> dados do projeto aberto (metadados XMP)
---------------------------------------------------------------

Os dados do padeiro ficam num grupo próprio do XMP do projeto (padeiro:), todos texto:
  atracao    → a atração (LÁ NA MINHA TERRA)                       janela projeto
  oQueE      → o que é (SERVIÇO): o .aep é a atração + o que é       janela projeto
  designer   → quem fez (JBILLARD)                                   projeto; o template grava se faltar
  pasta      → a raiz da estrutura (01 PROJETOS, 02 ARQUIVOS…)      janela projeto
  output     → a pasta de output                                     projeto; o template grava se faltar
  producao   → a produção do último template preenchido (DIA-A-DIA)  template
  templates  → os templates usados, um por linha: nome <tab> pasta   template (acumula; as fontes saem de lá)
  criado     → a data em que os dados foram gravados a primeira vez  o primeiro que gravar
  versao     → a versão destes campos (para migrar no futuro)        todos
Também ficam dc:title (o nome do .aep), dc:creator (o designer) e dc:date (criado), que aparecem nas
informações do arquivo. Projeto de antes (sem padeiro:versao): os campos antigos (dc:coverage, dc:relation,
dc:publisher, dc:source, dc:identifier) são lidos aqui e, na próxima gravação, passam para os novos.

*/

var PAD_NS = 'https://github.com/jmbillard/O-PADEIRO/ns/1.0/';
var PAD_META_VERSION = '1';
var PAD_META_FIELDS = ['atracao', 'oQueE', 'designer', 'pasta', 'output', 'producao', 'templates', 'criado'];
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
		return { atracao: '', oQueE: '', designer: '', pasta: '', output: '', producao: '', templates: '', criado: '', versao: '' };
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

// Preenchimento e importação de templates: registra o template (nome e pasta, sem repetir) e a produção, e
// grava o que ainda faltar (o designer, a data e a pasta de output do template). o que a janela projeto gravou
// não muda. info: { name, path, producao, output }
function padRegisterTemplateUse(info) {
	try {
		var cur = padMetaRead();
		var list = padTemplatesList(cur.templates);
		var path = padDisplayPath(String(info.path || ''));
		var kept = [];

		for (var i = 0; i < list.length; i++) if (padDisplayPath(list[i].path).toLowerCase() != path.toLowerCase()) kept.push(list[i]);
		if (path) kept.push({ name: info.name || '', path: path });

		var fields = { templates: padTemplatesText(kept) };

		if (info.producao) fields.producao = info.producao;
		if (!cur.designer) fields.designer = padMachineUser();
		if (!cur.criado) fields.criado = padToday();
		if (info.output && !cur.output) fields.output = padDisplayPath(padPath(info.output));

		padMetaWrite(fields);
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
	var path = padMountedPath(padPath(padMetaRead().pasta)) || (file ? padCollectRoot(file, padReadCollect()) : '');

	if (!path || !new Folder(path).exists) throw new Error('#PAD_091 - o projeto ainda não foi salvo.');

	openFolder(path);

	return { path: padDisplayPath(path) };
};

/*

---------------------------------------------------------------
> novo projeto pela claquete (janela PROJETO em etapas)
---------------------------------------------------------------

A claquete (ex: MAIS VOCE 30 10, TELA 9 11) acha a atração no índice da busca: pelo começo dela,
comparado com os padrões da atração ('pattern' no índice) e com o nome. A pasta da atração recebe a
estrutura do coletar (01 PROJETOS, 02 ARQUIVOS, 03 SAIDA), aproveitando a que já existir.
  - o .aep é o nome da atração + o que é (MAIS VOCE SERVICO), em todas as categorias (filmes também: a
    pasta da letra é só o token {letra} do caminho da categoria)
No projeto ficam os dados do padeiro (padeiro:, em 'dados do projeto aberto'): a atração, o que é, o designer,
a pasta da estrutura e a de output (a da categoria ou a da atração no índice, quando ela existe ou é criada na
etapa CRIAR: pular não grava).

*/

// Para nomes de arquivo e pastas: sem acentos e símbolos, em maiúsculas (NÃO! NÃO OLHE! → NAO NAO OLHE).
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
// As atrações do índice da busca (webhook novo, formato v2), no formato que a janela usa:
// [{ category, groups: [{ name, projetos, outputs, caminhos, patterns }] }]. A cópia é a mesma do acessorista
// (busca_v2.json): baixada de novo se tiver mais de 30 s (no modo local, só a cópia).
function padIndexGroups() {
	var cacheFile = new File(tempFolder.fsName + '/busca_v2.json');
	var text = '';

	if (!(padLocalMode() && cacheFile.exists) && !psIsFresh(cacheFile)) {
		try {
			text = PADX.searchDownload({}).text;
		} catch (err) { }
	}

	if (!text && cacheFile.exists) {
		try {
			text = readFileContent(cacheFile);
		} catch (err) { }
	}

	var data = null;

	try {
		data = JSON.parse(text);
	} catch (err) { }

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
function padMountedPath(path) {
	if (appOs != 'Mac' || !path) return path;

	var match = String(path).match(/^\/Volumes\/[^\/]+\/([^\/]+)/);

	if (!match) return path;

	var resolved = resolveMacVolumePath(path);

	if (padVolumeHas(resolved, match[1])) return resolved;

	psResolveOnMac(path, '', '');

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
	var settings = padReadCollect();
	var sub = padCollectFolderPath(settings, 'projeto') || '01 PROJETOS';
	var root;
	var fileBase;

	fileBase = padAepName(a.atracao + ' ' + (a.what || ''));
	if (!fileBase) throw new Error('#PAD_090 - escolha a atração.');
	root = padMountedPath(padPath(a.path));

	if (!root) throw new Error('#PAD_091 - sem pasta de destino: escolha a pasta.');

	// a pasta da atração já é a de projetos (…/01PROJETOS): a estrutura fica na de cima
	var rootFolder = new Folder(root);
	var rootExists = padListedFolder(root);

	if (padIsProjectsFolderName(decodeURI(rootFolder.name))) return { settings: settings, root: rootFolder.parent.fsName, rootExists: true, projectsSub: '', projects: rootFolder.fsName, projectsExists: rootExists, fileBase: fileBase };

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

// Os .aep da pasta, o último alterado primeiro: [{ name, modified (ms) }]
function padAepList(folderPath) {
	var folder = new Folder(folderPath);
	var out = [];

	if (!folder.exists) return out;

	var items = folder.getFiles();

	for (var i = 0; i < items.length; i++) {
		var name = decodeURI(items[i].name);

		if (items[i] instanceof File && /\.aep$/i.test(name)) out.push({ name: name.replace(/\.aep$/i, ''), modified: items[i].modified ? items[i].modified.getTime() : 0 });
	}

	return out.sort(function (a, b) {
		return b.modified - a.modified;
	});
}

// As pastas criadas junto com o projeto novo: o .aep, as fontes, as imagens e os vídeos (e as sem tipo);
// áudio e dados o coletar cria quando aparecerem.
var PAD_PROJECT_KINDS = ['projeto', 'fontes', 'imagens', 'videos'];

// O que vai ser criado (para a etapa CRIAR e o aviso de arquivo existente). Não cria nada.
PADX.projectPlan = function (a) {
	var plan = padNewProjectPlan(a);
	var existing = plan.projectsExists ? padAepList(plan.projects) : [];
	var rootFolder = new Folder(plan.root);
	var exists = false;
	var folders = [];
	var list = padStructureFolders(plan.settings, PAD_PROJECT_KINDS);

	for (var i = 0; i < existing.length; i++) if (existing[i].name == plan.fileBase) exists = true;
	for (var j = 0; j < list.length; j++) if (!list[j].projects) folders.push({ name: list[j].name, depth: list[j].depth });

	var outputPath = a.output ? padMountedPath(padPath(a.output)) : '';
	// a subpasta do "o que é" dentro da de output (…/2026/SERVICO): a outra opção da etapa CRIAR, conferida de fato
	var subName = a.what ? padAepName(a.what) : '';
	var subPath = outputPath && subName ? outputPath + '/' + subName : '';

	return {
		root: padDisplayPath(plan.root),
		rootName: decodeURI(rootFolder.name),
		rootExists: plan.rootExists,
		projects: padDisplayPath(plan.projects),
		projectsName: decodeURI(new Folder(plan.projects).name),
		projectsExists: plan.projectsExists,
		fileBase: plan.fileBase,
		fileName: plan.fileBase + '.aep',
		existing: existing,
		exists: exists,
		folders: folders,
		user: padMachineUser(),
		output: outputPath ? padDisplayPath(outputPath) : '',
		outputExists: outputPath ? new Folder(outputPath).exists : false,
		outputSub: subPath ? padDisplayPath(subPath) : '',
		outputSubExists: subPath ? new Folder(subPath).exists : false
	};
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

	throw new Error('#PAD_091 - não foi possível criar a pasta ' + decodeURI(missing.name) + ' em ' + padDisplayPath(missing.parent ? missing.parent.fsName : path) + (padLastMkdir ? ' (' + padLastMkdir + ')' : ' (sem permissão ou rede fora?)') + padMacPrivacyHint() + '.' + padFolderPeek(missing.parent));
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

// Cria a estrutura e salva o .aep. a: plano + { output, outputCreate, mode: '' | 'open' | 'increment' }
PADX.projectCreate = function (a) {
	padLastMkdir = '';

	var plan = padNewProjectPlan(a);

	padCollectStructure(plan.root, plan.settings, PAD_PROJECT_KINDS);

	var projects = plan.projectsSub ? padCollectResolve(plan.root, plan.projectsSub, true) : plan.projects;
	var base = plan.fileBase;
	var file = new File(projects + '/' + base + '.aep');

	padCheckWritable(projects);

	if (file.exists && a.mode == 'open') {
		app.open(file);

		return { file: padDisplayPath(file.fsName), root: padDisplayPath(plan.root), opened: true };
	}

	if (file.exists && a.mode == 'increment') {
		for (var n = 2; file.exists && n < 100; n++) file = new File(projects + '/' + base + ' ' + n + '.aep');
	} else if (file.exists) {
		throw new Error('#PAD_092 - já existe ' + base + '.aep em ' + decodeURI(new Folder(projects).name) + '.');
	}

	// a pasta de output: criada se pedido (etapa CRIAR); vai para os metadados só a que existir (pular: não grava)
	var output = a.output ? new Folder(padMountedPath(padPath(a.output))) : null;

	if (output && !output.exists && a.outputCreate) padEnsureFolder(output.fsName);

	// os dados só ficam no projeto se ele for salvo na pasta: se salvar falhar, voltam os de antes
	var packet = app.project.xmpPacket;

	padMetaWrite({
		atracao: String(a.atracao || ''),
		oQueE: String(a.what || ''),
		designer: padMachineUser(),
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

	return { file: padDisplayPath(file.fsName), root: padDisplayPath(plan.root), opened: false };
};

// O .aep está dentro da pasta gravada no projeto (padeiro:pasta)? sem pasta gravada, vale. o volume com sufixo
// (VFX-1) conta como o mesmo.
function padInRoot(file) {
	var root = padMetaRead().pasta;

	if (!root) return true;

	var key = function (path) {
		return padDisplayPath(path).replace(/\\/g, '/').replace(/^(\/Volumes\/[^\/]+?)-[1-5](?=\/|$)/i, '$1').replace(/\/+$/, '').toLowerCase() + '/';
	};

	return key(file.fsName).indexOf(key(padPath(root))) == 0;
}

// O estado do projeto aberto para a bolinha do botão Projeto (barra): 'ok' (salvo com os dados do padeiro, na
// pasta dele), 'missing' (sem eles: salvo sem a atração, ou com itens e sem arquivo) ou '' (projeto vazio). leve: só o XMP.
PADX.projectStatus = function () {
	var file = app.project.file;

	if (file && padMetaRead().atracao && padInRoot(file)) return { state: 'ok' };

	return { state: file || app.project.numItems > 0 ? 'missing' : '' };
};

// O projeto aberto: com os dados do padeiro (a atração) ou não.
// → { created, outside, atracao, oQueE, designer, defaultUser, output, root, file, fileName, hasItems, user }
PADX.projectCurrent = function () {
	var file = app.project.file;
	var m = padMetaRead();
	var settings = padReadCollect();
	var inRoot = !!(file && m.atracao && padInRoot(file));

	return {
		created: inRoot,
		outside: !!(file && m.atracao && !inRoot), // com os dados, mas salvo fora da pasta dele (ex: na Área de Trabalho)
		atracao: m.atracao,
		oQueE: m.oQueE,
		designer: m.designer || padMachineUser(),
		defaultUser: padDefaultUser(),
		output: padNoVolumeSuffix(m.output),
		root: padNoVolumeSuffix(m.pasta) || (file ? padDisplayPath(padCollectRoot(file, settings)) : ''),
		file: file ? padDisplayPath(file.fsName) : '',
		fileName: file ? decodeURI(file.name) : '',
		hasItems: app.project.numItems > 0,
		user: padMachineUser()
	};
};

// Barra (salvar): salva o projeto aberto onde ele está.
PADX.projectSaveNow = function () {
	if (!app.project.file) throw new Error('#PAD_091 - o projeto ainda não foi salvo.');

	app.project.save();

	return PADX.projectCurrent();
};

// Editor (Salvar): grava os dados e salva o .aep onde ele deve ficar: na pasta de projetos da estrutura (criada se
// faltar; as outras pastas, o coletar cria), com o nome da atração + o que é. com outro nome ou em outro lugar, salva lá (o arquivo antigo continua onde estava).
// a: { atracao, what, designer, root, output, fileBase } → projectCurrent + { moved: caminho antigo }
// fileBase: o nome de hoje, num projeto antigo fora do padrão (a atração e o o que é não mudaram)
PADX.projectSave = function (a) {
	padLastMkdir = '';

	var file = app.project.file;
	var plan = padNewProjectPlan({ atracao: a.atracao, what: a.what, path: a.root });

	if (a.fileBase) plan.fileBase = String(a.fileBase);

	// só a pasta de projetos (para o .aep): as outras da estrutura o coletar cria quando precisar
	var projects = plan.projectsSub ? padCollectResolve(plan.root, plan.projectsSub, true) : padEnsureFolder(plan.projects).fsName;
	var dest = new File(projects + '/' + plan.fileBase + '.aep');
	var key = function (f) {
		return padDisplayPath(f.fsName).replace(/^(\/Volumes\/[^\/]+?)-[1-5](?=\/|$)/i, '$1').toLowerCase();
	};
	var same = !!file && key(file) == key(dest);

	padCheckWritable(projects);
	if (!same && dest.exists) throw new Error('#PAD_092 - já existe ' + plan.fileBase + '.aep em ' + padDisplayPath(projects) + '.');

	var packet = app.project.xmpPacket;

	padMetaWrite({
		atracao: String(a.atracao || ''),
		oQueE: String(a.what || ''),
		designer: padCleanUser(a.designer) || padMachineUser(),
		pasta: padDisplayPath(plan.root),
		output: a.output != null ? (a.output ? padDisplayPath(padPath(a.output)) : '') : null,
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

