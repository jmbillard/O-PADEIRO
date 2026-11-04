/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> projeto (janela PROJETO e aba PROJETO da configuração)
---------------------------------------------------------------

A janela PROJETO cria o projeto pela claquete (abaixo) e edita a claquete e o designer dele. O collect dos
arquivos é do botão COLETAR (collect.jsx).

'PROJECT' no O_PADEIRO_config.json (aba PROJETO da configuração):
  categories → [{ name, path, icon }]: a lista "dentro de" da atração nova. o caminho leva tokens:
               {atracao} (obrigatório) {ano} {mes} {categoria} {letra}; uma categoria com {letra} ganha a
               etapa dos parecidos (os que já existem na pasta da letra), como os filmes. icon: um ícone do
               seletor (js/util.js), ou '' = pelo nome da categoria
Sem 'PROJECT' (ou no formato antigo, com raiz e retrancas): sem categorias, e o "dentro de" vem das
atrações do índice.

*/

var PAD_DEFAULT_PROJECT = { categories: [] };

var PAD_PATH_TOKENS = ['atracao', 'ano', 'mes', 'categoria', 'letra'];

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
		var icon = String(c.icon == null ? '' : c.icon).replace(/[^a-z0-9-]/g, '');
		var key = padAepName(name);
		var re = /\{([^}]*)\}/g;
		var m;

		if (!key) throw new Error('#PAD_089 - projeto: preencha o nome da categoria ' + (i + 1) + '.');
		if (seen[key]) throw new Error('#PAD_089 - projeto: a categoria ' + name + ' aparece mais de uma vez.');
		if (path == '') throw new Error('#PAD_089 - projeto: a categoria ' + name + ' precisa de um caminho.');

		while ((m = re.exec(path)) != null) {
			if (PAD_PATH_TOKENS.indexOf(m[1]) < 0) throw new Error('#PAD_089 - projeto: {' + m[1] + '} não é um token do caminho (use {atracao}, {ano}, {mes}, {categoria} ou {letra}).');
		}

		if (path.indexOf('{atracao}') < 0) throw new Error('#PAD_089 - projeto: o caminho de ' + name + ' precisa do {atracao} (a pasta da atração nova).');

		seen[key] = true;
		clean.categories.push({ name: name, path: path, icon: icon });
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

		if (checked[fixed] == null) checked[fixed] = !local && fixed != '' && new Folder(padPath(fixed)).exists;

		out.push({ name: list[i].name, path: list[i].path, icon: list[i].icon, reachable: checked[fixed] });
	}

	return { categories: out, fallback: padMachinePath(padMachineData().projects) || '~/Desktop' };
};

/*

---------------------------------------------------------------
> dados do projeto aberto
---------------------------------------------------------------

*/

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

function padToday() {
	var d = new Date();
	var m = d.getMonth() + 1;
	var day = d.getDate();

	return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}

// As categorias das atrações do webhook (aba PROJETO > preencher pelas atrações): cada categoria na pasta
// onde está a maioria das atrações dela, com {atracao} no fim (FILMES: a pasta TITULOS e _{letra}_).
// → { categories: [{ name, path }] }
PADX.projectCategoriesFromIndex = function () {
	var file = new File(tempFolder.fsName + '/busca_v2.json');
	var data = null;

	if (!file.exists) {
		try {
			PADX.searchDownload({});
		} catch (err) { }
	}

	try {
		data = psReadJSON(file);
	} catch (err) { }

	if (!data || !(data.atracoes instanceof Array)) throw new Error('#PAD_058 - não foi possível carregar o índice das atrações. verifique a conexão e o workflow.');

	var roots = data.roots || {};
	var byCat = {};
	var names = [];

	for (var i = 0; i < data.atracoes.length; i++) {
		var a = data.atracoes[i] || {};
		var m = /^([a-z]+):(.*)$/.exec(String(a.proj || ''));
		var path = (m && roots[m[1]] ? roots[m[1]] + '/' + m[2] : String(a.proj || '')).replace(/([^\/])\/{2,}/g, '$1/'); // sem // no meio (o // do começo fica)
		var key = padAepName(a.cat);

		if (!key || !path) continue;

		var parts = path.replace(/\\/g, '/').split('/');
		var at = -1;

		for (var j = parts.length - 1; j >= 0; j--) {
			if (padAepName(parts[j]).indexOf(key) == 0) {
				at = j;
				break;
			}
		}

		if (at < 0) continue;

		var film = key == 'FILMES';
		var end = film && parts[at + 1] && padAepName(parts[at + 1]) == 'TITULOS' ? at + 1 : at;
		var base = parts.slice(0, end + 1).join('/');

		if (!byCat[key]) {
			byCat[key] = { name: String(a.cat).toUpperCase(), film: film, count: {} };
			names.push(key);
		}

		byCat[key].count[base] = (byCat[key].count[base] || 0) + 1;
	}

	names.sort();

	var out = [];

	for (var n = 0; n < names.length; n++) {
		var cat = byCat[names[n]];
		var best = '';

		for (var b in cat.count) {
			if (!best || cat.count[b] > cat.count[best]) best = b;
		}

		out.push({ name: cat.name, path: best + (cat.film ? '/_{letra}_/{atracao}' : '/{atracao}') });
	}

	return { categories: out };
};

// Abre a pasta do projeto aberto: a da estrutura (gravada ao criar) ou a de cima da de projetos.
PADX.projectOpenFolder = function () {
	var file = app.project.file;
	var path = padPath(padXmpGet('relation')) || (file ? padCollectRoot(file, padReadCollect()) : '');

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
