/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> projeto (janela PROJETO e aba PROJETO da configuração)
---------------------------------------------------------------

Os dados do projeto (ID e nome) ficam no XMP do .aep: dc:identifier e dc:title, os mesmos campos da
barra antiga da PROMO GNEWS (um projeto feito nela abre aqui com os dados). A sigla do usuário fica só
neste computador (pasta de dados do usuário). O collect dos arquivos é do botão COLETAR (collect.jsx).

'PROJECT' no O_PADEIRO_config.json:
  root         → pasta raiz dos projetos (na rede); vazio = escolher a pasta ao salvar
  folder       → cria uma pasta para cada projeto (com o nome do arquivo) dentro da pasta da retranca
  fileName     → nome do arquivo .aep, com as variáveis {id} {projeto} {usuario} {retranca} {data}
  retrancas    → [{ code, path }]: o começo do ID do projeto → a pasta da retranca (dentro da raiz, ou um
                 caminho completo); vale o código mais longo que combinar
Sem 'PROJECT' no arquivo: PAD_DEFAULT_PROJECT.

*/

var PAD_DEFAULT_PROJECT = {
	root: '',
	folder: true,
	fileName: '{id} {projeto}',
	retrancas: []
};

var PAD_PROJECT_TOKENS = ['id', 'projeto', 'usuario', 'retranca', 'data'];

// Caminho guardado na configuração: barras normais, sem barra no fim.
function padProjectPath(path) {
	return padTrim(path).replace(/\\/g, '/').replace(/(.)\/+$/, '$1');
}

function padProjectIsAbsolute(path) {
	return /^(\/|~|[A-Za-z]:)/.test(path);
}

// Confere as variáveis de um padrão de nome. Lança Error com a mensagem.
function padCheckProjectPattern(pattern, label) {
	var re = /\{([^}]*)\}/g;
	var m;

	if (pattern == '') throw new Error('#PAD_089 - projeto: preencha o ' + label + '.');

	while ((m = re.exec(pattern)) != null) {
		var token = m[1];

		if (PAD_PROJECT_TOKENS.indexOf(token) < 0) throw new Error('#PAD_089 - projeto: {' + token + '} não é uma variável do ' + label + '.');
	}

	if (/[\\\/:*?"<>|]/.test(pattern.replace(re, ''))) throw new Error('#PAD_089 - projeto: o ' + label + ' não pode ter \\ / : * ? " < > |.');
}

// Valida e normaliza a seção vinda do painel. Lança Error com a mensagem.
function padCleanProject(o) {
	var clean = {
		root: padProjectPath(o.root),
		folder: o.folder !== false,
		fileName: padTrim(o.fileName).replace(/\s+/g, ' '),
		retrancas: []
	};
	var seen = {};

	padCheckProjectPattern(clean.fileName, 'nome do arquivo');

	for (var i = 0; i < (o.retrancas || []).length; i++) {
		var code = padTrim(o.retrancas[i].code).toUpperCase().replaceSpecialCharacters().replace(/\s+/g, '');
		var path = padProjectPath(o.retrancas[i].path);

		if (!/^[A-Z0-9]{1,12}$/.test(code)) throw new Error('#PAD_089 - projeto: o código da retranca ' + (i + 1) + ' precisa ter de 1 a 12 letras ou números.');
		if (seen[code]) throw new Error('#PAD_089 - projeto: a retranca ' + code + ' aparece mais de uma vez.');
		if (path == '') throw new Error('#PAD_089 - projeto: a retranca ' + code + ' precisa de uma pasta.');
		if (!padProjectIsAbsolute(path) && clean.root == '') throw new Error('#PAD_089 - projeto: a pasta de ' + code + ' fica dentro da raiz: preencha a pasta raiz (ou use o caminho completo).');

		seen[code] = true;
		clean.retrancas.push({ code: code, path: path });
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

/*

---------------------------------------------------------------
> dados do projeto aberto
---------------------------------------------------------------

*/

// Sigla do usuário: a deste computador (configuração > meu usuário; padMachineUser, em api.jsx).
function padProjectUser() {
	return padMachineUser();
}

function padXmpGet(field) {
	try {
		var meta = new XMPMeta(app.project.xmpPacket);
		var ns = XMPConst.NS_DC;

		if (meta.doesPropertyExist(ns, field)) {
			var prop = meta.getProperty(ns, field);

			if (prop && prop.value != null && String(prop.value) != '') return String(prop.value);
		}

		// dc:title gravado como lista de idiomas
		if (meta.doesPropertyExist(ns, field + '[1]')) return String(meta.getProperty(ns, field + '[1]').value);
	} catch (err) { }

	return '';
}

function padCleanProjectId(id) {
	return String(id == null ? '' : id).replaceSpecialCharacters().replace(/\s+/g, '').toUpperCase();
}

function padCleanProjectName(name) {
	return String(name == null ? '' : name).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
}

function padToday() {
	var d = new Date();
	var m = d.getMonth() + 1;
	var day = d.getDate();

	return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}

// A retranca do ID: o código mais longo que começa o ID.
function padProjectRetranca(settings, id) {
	var found = null;

	for (var i = 0; i < settings.retrancas.length; i++) {
		var r = settings.retrancas[i];

		if (id.indexOf(r.code) == 0 && (!found || r.code.length > found.code.length)) found = r;
	}

	if (!found) return null;

	var absolute = padProjectIsAbsolute(found.path);
	var path = absolute ? found.path : settings.root + '/' + found.path;
	var parts = path.split('/');

	return { code: found.code, path: path, name: parts[parts.length - 1], absolute: absolute };
}

function padFillPattern(pattern, values) {
	return pattern
		.replace(/\{(\w+)\}/g, function (all, token) {
			return values[token] != null ? values[token] : '';
		})
		.replace(/\s+/g, ' ')
		.replace(/^[\s\-_]+|[\s\-_]+$/g, '');
}

// Tudo o que a janela mostra: dados do XMP, retranca, destino e os nomes que serão usados.
function padProjectState() {
	var team = padReadProject();
	var home = padLocalMode();
	var localRoot = padMachinePath(padMachineData().projects);
	// a raiz: a deste computador (se houver) ou a da equipe; no modo local, sempre a daqui (ou a Área de Trabalho)
	var settings = { root: home ? localRoot || '~/Desktop' : localRoot || team.root, folder: team.folder, fileName: team.fileName, retrancas: team.retrancas };
	var id = padCleanProjectId(padXmpGet('identifier'));
	var name = padCleanProjectName(padXmpGet('title'));
	var user = padProjectUser();
	var retranca = padProjectRetranca(settings, id);

	// modo local: a pasta de uma retranca com caminho completo fica na rede; o projeto vai para a raiz local
	if (home && retranca && retranca.absolute) retranca = { code: retranca.code, path: settings.root, name: retranca.name, absolute: true, local: true };
	var values = {
		id: id,
		projeto: name ? padRenameFormat(name) : '',
		usuario: user,
		retranca: retranca ? retranca.name : '',
		data: padToday()
	};
	var fileBase = sanitizeFileName(padFillPattern(settings.fileName, values));
	var base = retranca ? retranca.path : settings.root;
	var target = base ? (settings.folder && fileBase ? base + '/' + fileBase : base) : '';
	var file = app.project.file;
	// com uma pasta para cada projeto, ela recebe a estrutura do coletar e o .aep vai na pasta do tipo
	// 'projeto' (ex: 01 PROJETOS)
	var aepSub = settings.folder ? padCollectFolderPath(padReadCollect(), 'projeto') || '' : '';

	return { settings: settings, id: id, name: name, user: user, retranca: retranca, values: values, fileBase: fileBase, target: target, aepSub: aepSub, file: file };
}

PADX.projectInfo = function () {
	var s = padProjectState();

	return {
		id: s.id,
		name: s.name,
		user: s.user,
		defaultUser: padDefaultUser(),
		hasItems: app.project.numItems > 0,
		file: s.file ? padDisplayPath(s.file.fsName) : '',
		retranca: s.retranca ? { code: s.retranca.code, name: s.retranca.name } : null,
		hasRetrancas: s.settings.retrancas.length > 0,
		target: s.target ? padDisplayPath(s.target) : '',
		fileName: s.fileBase ? (s.aepSub ? s.aepSub + '/' : '') + s.fileBase + '.aep' : '',
		saved: !!s.file,
		localMode: padLocalMode()
	};
};

// Grava ID e nome no XMP do projeto e a sigla neste computador. a: { id, name, user }
PADX.projectSet = function (a) {
	if (a.id != null && padCleanProjectId(a.id) != padCleanProjectId(padXmpGet('identifier'))) setXMPData('identifier', padCleanProjectId(a.id));
	if (a.name != null && padCleanProjectName(a.name) != padCleanProjectName(padXmpGet('title'))) setXMPData('title', padCleanProjectName(a.name));

	if (a.user != null && padCleanUser(a.user) != padMachineUser()) PADX.saveMachinePrefs({ user: a.user });

	return PADX.projectInfo();
};

function padRequireProjectData(s) {
	if (s.id == '' && s.name == '') throw new Error('#PAD_090 - preencha o ID ou o nome do projeto.');
}

// Salva o projeto na pasta da retranca (ou na escolhida). a: { path, overwrite, open }
PADX.projectSave = function (a) {
	var s = padProjectState();

	padRequireProjectData(s);

	var target = s.target;

	if (a.path) target = padProjectPath(a.path) + (s.settings.folder && s.fileBase ? '/' + s.fileBase : '');
	if (!target) throw new Error('#PAD_091 - sem pasta de destino: defina a pasta raiz dos projetos (configuração > projeto) ou escolha a pasta.');
	if (!s.fileBase) throw new Error('#PAD_091 - o nome do arquivo ficou vazio: confira o ID, o nome do projeto e o padrão do nome.');

	var root = new Folder(padPath(target));

	if (!root.exists) root.create();
	if (!root.exists) throw new Error('#PAD_091 - não foi possível criar a pasta: ' + padDisplayPath(target));

	// uma pasta para cada projeto: a estrutura do coletar (01, 02, 03...) e o .aep na pasta dele
	if (s.settings.folder) padCollectStructure(root.fsName, padReadCollect());

	var folder = new Folder(root.fsName + (s.aepSub ? '/' + s.aepSub : ''));

	if (!folder.exists) folder.create();

	var file = new File(folder.fsName + '/' + s.fileBase + '.aep');
	var current = app.project.file;

	if (file.exists && !a.overwrite && !(current && current.fsName == file.fsName)) {
		throw new Error('#PAD_092 - já existe um projeto com esse nome na pasta: salve de novo para substituir.');
	}

	setXMPData('creator', system.userName);
	setXMPData('date', padToday());
	app.project.save(file);

	if (a.open) openFolder(root.fsName);

	return { file: padDisplayPath(file.fsName), folder: padDisplayPath(root.fsName) };
};

// Abre a pasta do projeto salvo ou, sem ele, a do destino.
PADX.projectOpenFolder = function () {
	var s = padProjectState();
	var path = s.file ? padCollectRoot(s.file, padReadCollect()) : '';

	if (!path && s.target) {
		var target = new Folder(padPath(s.target));

		var near = target.exists ? target : nearestExistingFolder(target.fsName);

		path = near ? near.fsName : '';
	}

	if (!path || !new Folder(path).exists) throw new Error('#PAD_091 - o projeto ainda não foi salvo e não há pasta de destino.');

	openFolder(path);

	return { path: padDisplayPath(path) };
};

// Retrancas tiradas do índice da busca: entradas "COD - nome" com um caminho → { code, path }.
PADX.projectRetrancasFromIndex = function () {
	var cacheFile = new File(tempFolder.fsName + '/path_index.json');

	if (!cacheFile.exists) psDownloadIndex(cacheFile);

	var data = null;

	try {
		data = psReadJSON(cacheFile);
	} catch (err) { }

	if (data && typeof data == 'object' && typeof data.length == 'number') data = data[0];
	if (!data) throw new Error('#PAD_058 - não foi possível carregar o índice. verifique a conexão e o workflow.');

	var out = [];
	var seen = {};

	for (var key in data) {
		if (!(data[key] instanceof Array)) continue;

		for (var i = 0; i < data[key].length; i++) {
			var rec = data[key][i] || {};
			var m = /^\s*([A-Za-z0-9]{2,12})\s+-\s+\S/.exec(String(rec.atracao || ''));
			var win = rec.win || {};
			var mac = rec.mac || {};
			var path = psCleanPath(win.caminho || rec.caminho || mac.caminho || '');

			if (!m || path == '' || seen[m[1].toUpperCase()]) continue;

			seen[m[1].toUpperCase()] = true;
			out.push({ code: m[1].toUpperCase(), path: padProjectPath(path) });
		}
	}

	return { retrancas: out };
};

/*

---------------------------------------------------------------
> novo projeto pela claquete (janela PROJETO em etapas)
---------------------------------------------------------------

A claquete (ex: MAIS VOCE 30 10, TELA 9 11) acha a atração no índice da busca: pelo começo dela,
comparado com os padrões da atração ('pattern' no índice) e com o nome. A pasta da atração recebe a
estrutura do coletar (01 PROJETOS, 02 ARQUIVOS, 03 SAIDA), aproveitando a que já existir.
  - programas, novelas...: o .aep é o nome da atração + o que é (MAIS VOCE SERVICO)
  - filmes (atração em FILMES/TITULOS): cada filme numa pasta, dentro da pasta da letra do título sem o
    artigo (_T_ para OS TRES PATETAS, _#_ para 101 DALMATAS); o .aep é o título
No projeto (XMP) ficam a claquete (identifier), o designer (creator), a atração (coverage) e a pasta
da estrutura (relation).

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

function padIsFilmPath(path) {
	return /(^|\/)FILMES\/TITULOS$/i.test(String(path || '').replace(/\\/g, '/').replace(/\/+$/, ''));
}

// Atrações cuja claquete começa com um dos padrões (ou com o nome), a mais específica primeiro.
// a: { claquete } → { claquete, matches: [{ name, category, path, display, film }] }
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
			found.push({ name: group.name, category: index[c].category.label || '', path: path, display: padDisplayPath(padPath(path)), film: padIsFilmPath(path), score: score });
		}
	}

	found.sort(function (x, y) {
		return y.score - x.score;
	});

	return { claquete: padAepName(a.claquete), matches: found.slice(0, 6) };
};

// A pasta da letra de um filme: a primeira letra do título sem o artigo (_T_), ou _#_ para números.
var PAD_ARTICLES = ['O', 'A', 'OS', 'AS', 'UM', 'UMA', 'UNS', 'UMAS', 'THE', 'AN'];

function padFilmLetter(title) {
	var words = padClaqueteWords(title);

	if (words.length > 1 && PAD_ARTICLES.indexOf(words[0]) >= 0) words.shift();

	var first = words.length ? words[0].charAt(0) : '';

	return /[A-Z]/.test(first) ? first : '#';
}

// Quanto um nome de pasta parece com o título (palavras em comum; o começo igual pesa mais).
function padLikeness(name, title) {
	var a = padClaqueteWords(name);
	var b = padClaqueteWords(title);
	var score = 0;

	for (var i = 0; i < b.length; i++) {
		if (a.indexOf(b[i]) >= 0) score += 2;
	}

	if (padCompact(name).indexOf(padCompact(title)) == 0 || padCompact(title).indexOf(padCompact(name)) == 0) score += 3;

	return score;
}

// Os filmes parecidos com o título, na pasta da letra. a: { path (a pasta TITULOS), title }
PADX.projectFilms = function (a) {
	var letter = padFilmLetter(a.title);
	var base = new Folder(padPath(a.path));
	var letterFolder = null;
	var films = [];

	if (base.exists) {
		var items = base.getFiles();

		for (var i = 0; i < items.length; i++) {
			if (!(items[i] instanceof Folder)) continue;

			var name = decodeURI(items[i].name);

			if (name.toUpperCase() == '_' + letter + '_' || name.toUpperCase() == letter) letterFolder = items[i];
		}
	}

	if (letterFolder) {
		var list = letterFolder.getFiles();

		for (var f = 0; f < list.length; f++) {
			if (!(list[f] instanceof Folder)) continue;

			var film = decodeURI(list[f].name);
			var like = a.title ? padLikeness(film, a.title) : 1;

			if (like > 0) films.push({ name: film, path: padDisplayPath(list[f].fsName), raw: list[f].fsName, like: like });
		}
	}

	films.sort(function (x, y) {
		return y.like - x.like;
	});

	var letterPath = letterFolder ? letterFolder.fsName : base.fsName + '/_' + letter + '_';

	return { letter: '_' + letter + '_', letterPath: padDisplayPath(letterPath), films: films.slice(0, 8), newName: padAepName(a.title), newPath: padDisplayPath(letterPath + '/' + padAepName(a.title)) };
};

// Onde fica cada coisa: a raiz da estrutura, a pasta dos .aep e o nome do arquivo.
// a: { kind: 'film' | 'program', atracao, path, what, title, filmPath } → { root, projects, fileBase }
function padNewProjectPlan(a) {
	var settings = padReadCollect();
	var sub = padCollectFolderPath(settings, 'projeto') || '01 PROJETOS';
	var root;
	var fileBase;

	if (a.kind == 'film') {
		fileBase = padAepName(a.title);
		if (!fileBase) throw new Error('#PAD_090 - digite o título do filme.');

		if (a.filmPath) {
			root = padPath(a.filmPath);
		} else {
			var films = PADX.projectFilms({ path: a.path, title: a.title });

			root = padPath(films.newPath);
		}
	} else {
		fileBase = padAepName(a.atracao + ' ' + (a.what || ''));
		if (!fileBase) throw new Error('#PAD_090 - escolha a atração.');
		root = padPath(a.path);
	}

	if (!root) throw new Error('#PAD_091 - sem pasta de destino: escolha a pasta.');

	// a pasta da atração já é a de projetos (…/01PROJETOS): a estrutura fica na de cima
	var rootFolder = new Folder(root);

	if (padIsProjectsFolderName(decodeURI(rootFolder.name))) return { settings: settings, root: rootFolder.parent.fsName, projectsSub: '', projects: rootFolder.fsName, fileBase: fileBase };

	// a de projetos que já existir dentro dela (com outra grafia), sem criar nada aqui
	var projects = root + '/' + sub;

	if (rootFolder.exists) {
		var items = rootFolder.getFiles();

		for (var i = 0; i < items.length; i++) {
			if (items[i] instanceof Folder && padIsProjectsFolderName(decodeURI(items[i].name))) projects = items[i].fsName;
		}
	}

	return { settings: settings, root: root, projectsSub: sub, projects: projects, fileBase: fileBase };
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
	var existing = padAepList(plan.projects);
	var rootFolder = new Folder(plan.root);
	var exists = false;
	var folders = [];
	var list = padStructureFolders(plan.settings, PAD_PROJECT_KINDS);

	for (var i = 0; i < existing.length; i++) if (existing[i].name == plan.fileBase) exists = true;
	for (var j = 0; j < list.length; j++) if (!list[j].projects) folders.push({ name: list[j].name, depth: list[j].depth });

	return {
		root: padDisplayPath(plan.root),
		rootName: decodeURI(rootFolder.name),
		rootExists: rootFolder.exists,
		projects: padDisplayPath(plan.projects),
		projectsName: decodeURI(new Folder(plan.projects).name),
		projectsExists: new Folder(plan.projects).exists,
		fileBase: plan.fileBase,
		fileName: plan.fileBase + '.aep',
		existing: existing,
		exists: exists,
		folders: folders,
		user: padMachineUser()
	};
};

// Cria a estrutura e salva o .aep. a: plano + { claquete, mode: '' | 'open' | 'increment' }
PADX.projectCreate = function (a) {
	var plan = padNewProjectPlan(a);
	var claquete = padAepName(a.claquete);

	padCollectStructure(plan.root, plan.settings, PAD_PROJECT_KINDS);

	var projects = plan.projectsSub ? padCollectResolve(plan.root, plan.projectsSub, true) : plan.projects;
	var base = plan.fileBase;
	var file = new File(projects + '/' + base + '.aep');

	if (file.exists && a.mode == 'open') {
		app.open(file);

		return { file: padDisplayPath(file.fsName), root: padDisplayPath(plan.root), opened: true };
	}

	if (file.exists && a.mode == 'increment') {
		for (var n = 2; file.exists && n < 100; n++) file = new File(projects + '/' + base + ' ' + n + '.aep');
	} else if (file.exists) {
		throw new Error('#PAD_092 - já existe ' + base + '.aep em ' + decodeURI(new Folder(projects).name) + '.');
	}

	setXMPData('identifier', claquete);
	setXMPData('title', decodeURI(file.name).replace(/\.aep$/i, ''));
	setXMPData('creator', padMachineUser());
	setXMPData('coverage', String(a.atracao || ''));
	setXMPData('relation', padDisplayPath(plan.root));
	setXMPData('date', padToday());
	app.project.save(file);

	return { file: padDisplayPath(file.fsName), root: padDisplayPath(plan.root), opened: false };
};

// O projeto aberto: criado por este fluxo (com claquete) ou não. → { created, claquete, designer, atracao, root, file }
PADX.projectCurrent = function () {
	var file = app.project.file;
	var claquete = padXmpGet('identifier');
	var settings = padReadCollect();

	return {
		created: !!(file && claquete),
		claquete: claquete,
		designer: padXmpGet('creator') || padMachineUser(),
		defaultUser: padDefaultUser(),
		atracao: padXmpGet('coverage'),
		root: padXmpGet('relation') || (file ? padDisplayPath(padCollectRoot(file, settings)) : ''),
		file: file ? padDisplayPath(file.fsName) : '',
		fileName: file ? decodeURI(file.name) : '',
		hasItems: app.project.numItems > 0,
		user: padMachineUser()
	};
};

// Editor: muda a claquete e o designer (no projeto) e salva. a: { claquete, designer }
PADX.projectUpdate = function (a) {
	if (a.claquete != null) setXMPData('identifier', padAepName(a.claquete));
	if (a.designer != null) setXMPData('creator', padCleanUser(a.designer) || padMachineUser());
	if (app.project.file) app.project.save();

	return PADX.projectCurrent();
};

// Editor: leva o projeto para outra pasta (cria a estrutura nela e salva o .aep na de projetos). a: { path }
PADX.projectMove = function (a) {
	var file = app.project.file;

	if (!file) throw new Error('#PAD_091 - o projeto ainda não foi salvo.');

	var settings = padReadCollect();
	var target = padPath(a.path);
	var sub = padCollectFolderPath(settings, 'projeto') || '01 PROJETOS';
	var root = padIsProjectsFolderName(decodeURI(new Folder(target).name)) ? new Folder(target).parent.fsName : target;

	padCollectStructure(root, settings, PAD_PROJECT_KINDS);

	var projects = padIsProjectsFolderName(decodeURI(new Folder(target).name)) ? target : padCollectResolve(root, sub, true);
	var dest = new File(projects + '/' + decodeURI(file.name));

	if (dest.exists && dest.fsName != file.fsName) throw new Error('#PAD_092 - já existe ' + decodeURI(file.name) + ' nessa pasta.');

	setXMPData('relation', padDisplayPath(root));
	app.project.save(dest);

	return PADX.projectCurrent();
};

// As pastas onde criar uma atração nova: a de cima de cada atração do índice (NOVELAS, PROGRAMAS, SHOWS…)
// e a dos filmes (FILMES/TITULOS). → [{ label, path, display, film }]
PADX.projectBases = function () {
	var index = padIndexGroups();
	var out = [];
	var seen = {};

	for (var c = 0; c < index.length; c++) {
		for (var g = 0; g < index[c].groups.length; g++) {
			var path = String(index[c].groups[g].projetos[0] || '').replace(/\\/g, '/').replace(/\/+$/, '');

			if (!path) continue;

			var film = padIsFilmPath(path);
			var parts = path.split('/');

			// a pasta da atração (ou a 01 PROJETOS dela) sai: fica a de cima
			if (!film) {
				if (padIsProjectsFolderName(parts[parts.length - 1])) parts.pop();
				parts.pop();
			}

			var base = parts.join('/');
			var key = padCompact(base);

			if (!base || seen[key]) continue;

			seen[key] = true;
			out.push({ label: film ? 'FILMES' : parts[parts.length - 1], path: base, display: padDisplayPath(padPath(base)), film: film });
		}
	}

	// sem ternário encadeado (o ExtendScript agrupa 'a ? b : c ? d : e' do jeito errado)
	out.sort(function (x, y) {
		if (x.label < y.label) return -1;
		if (x.label > y.label) return 1;

		return 0;
	});

	return { bases: out };
};
