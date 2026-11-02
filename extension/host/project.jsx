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

// Sigla do usuário: a deste computador (configuração > computador; padMachineUser, em api.jsx).
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

	return { settings: settings, id: id, name: name, user: user, retranca: retranca, values: values, fileBase: fileBase, target: target, file: file };
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
		fileName: s.fileBase ? s.fileBase + '.aep' : '',
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

	var folder = new Folder(padPath(target));

	if (!folder.exists) folder.create();
	if (!folder.exists) throw new Error('#PAD_091 - não foi possível criar a pasta: ' + padDisplayPath(target));

	var file = new File(folder.fsName + '/' + s.fileBase + '.aep');
	var current = app.project.file;

	if (file.exists && !a.overwrite && !(current && current.fsName == file.fsName)) {
		throw new Error('#PAD_092 - já existe um projeto com esse nome na pasta: salve de novo para substituir.');
	}

	setXMPData('creator', system.userName);
	setXMPData('date', padToday());
	app.project.save(file);

	if (a.open) openFolder(folder.fsName);

	return { file: padDisplayPath(file.fsName), folder: padDisplayPath(folder.fsName) };
};

// Abre a pasta do projeto salvo ou, sem ele, a do destino.
PADX.projectOpenFolder = function () {
	var s = padProjectState();
	var path = s.file ? s.file.parent.fsName : '';

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
