/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> editor da lista de produções (host)
---------------------------------------------------------------

A lista é o 'O_PADEIRO_config.json' compartilhado pela equipe.
Como mais de uma pessoa pode editar, salvar confere se o arquivo mudou desde que o editor o leu.

*/

// Valida e normaliza uma lista vinda do painel / de um arquivo importado. Lança Error com a mensagem.
function padCleanProductions(list) {
	if (!(list instanceof Array) || list.length == 0) throw new Error('#PAD_051 - a lista de produções não pode ficar vazia.');

	var seen = {};
	var clean = [];

	for (var i = 0; i < list.length; i++) {
		var name = String(list[i].name == null ? '' : list[i].name).replace(/^\s+|\s+$/g, '');
		var path = String(list[i].templatesPath == null ? '' : list[i].templatesPath).replace(/^\s+|\s+$/g, '');

		if (name == '') throw new Error('#PAD_052 - produção ' + (i + 1) + ': preencha o nome.');
		if (path == '') throw new Error('#PAD_053 - "' + name + '": preencha a pasta de templates.');
		if (seen[name.toUpperCase()]) throw new Error('#PAD_054 - "' + name + '": já existe uma produção com esse nome.');

		seen[name.toUpperCase()] = true;
		clean.push({ name: name, icon: list[i].icon ? String(list[i].icon) : '', templatesPath: path });
	}

	return clean; // na ordem do editor
}

// Grava as seções da configuração ({ PRODUCTIONS, LOG, DRIVES }); as que não vierem ficam como estão no arquivo.
function padWriteConfig(file, changes) {
	var data = {};

	if (file.exists) {
		try {
			data = JSON.parse(readFileContent(file)) || {};
		} catch (err) {
			data = {};
		}
	}

	for (var key in changes) {
		if (changes[key] != null) data[key] = changes[key];
	}

	saveTextFile(JSON.stringify(data, null, '\t'), file.fsName);

	// confere o que foi gravado
	JSON.parse(readFileContent(new File(file.fsName)));
}

// Grava a lista compartilhada. a: { productions, stamp } — 'stamp' é a data do arquivo quando o editor o leu.
PADX.saveProductions = function (a) {
	var file = padConfigFile();

	if (!file) throw new Error(padNoSharedListError());

	var clean = padCleanProductions(a.productions);
	var log = a.log ? padCleanLog(a.log) : null;
	var drives = a.drives ? padCleanDrives(a.drives) : null;
	var rename = a.rename ? padCleanRename(a.rename) : null;
	var organize = a.organize ? padCleanOrganize(a.organize) : null;

	if (file.exists && a.stamp && file.modified.getTime() != a.stamp) {
		throw new Error('#PAD_065 - a lista foi alterada por outra pessoa depois que você abriu o editor. use "recarregar" e refaça as alterações.');
	}

	// uma cópia da lista anterior, por segurança (lista compartilhada pela equipe)
	if (file.exists) {
		try {
			file.copy(file.fsName.replace(/\.json$/i, '') + '.bak.json');
		} catch (err) { }
	}

	try {
		padWriteConfig(file, { PRODUCTIONS: clean, LOG: log, DRIVES: drives, RENAME: rename, ORGANIZE: organize });
	} catch (err) {
		throw new Error('#PAD_055 - não foi possível gravar a lista: ' + err.message);
	}

	padDrivesCache.stamp = -1; // relê o que foi salvo
	padDrivesCache.checked = 0;

	return { stamp: new File(file.fsName).modified.getTime(), productions: clean, log: padReadLogSettings(), drives: padReadDrives(), rename: padReadRename(), organize: padReadOrganize(), configPath: file.fsName };
};

// Lê uma lista de produções de um arquivo (importar). a: { path }
PADX.readProductionsFile = function (a) {
	var file = new File(a.path);

	if (!file.exists) throw new Error('#PAD_056 - arquivo não encontrado.');

	var data;

	try {
		data = JSON.parse(readFileContent(file));
	} catch (err) {
		throw new Error('#PAD_057 - o arquivo não é uma lista de produções válida.');
	}

	return { productions: padCleanProductions(data.PRODUCTIONS) };
};

// Grava a lista em outro arquivo (exportar). a: { path, productions }
PADX.writeProductionsFile = function (a) {
	padWriteConfig(new File(a.path), { PRODUCTIONS: padCleanProductions(a.productions) });

	return { path: a.path };
};

// Caminho no formato de rede neutro ('//servidor/share/...'), como as listas existentes guardam.
PADX.canonicalPath = function (a) {
	return { path: normalizeNetworkPath(a.path, { forceWin: true, silent: true }) };
};

// Quais pastas existem (para o indicador de cada produção). a: { paths }
PADX.checkFolders = function (a) {
	var result = [];

	for (var i = 0; i < a.paths.length; i++) {
		try {
			result.push(new Folder(padPath(a.paths[i])).exists);
		} catch (err) {
			result.push(false);
		}
	}

	return { exists: result };
};

/*

---------------------------------------------------------------
> drives da rede (aba DRIVES da configuração)
---------------------------------------------------------------

'DRIVES' no O_PADEIRO_config.json: { drives: [{ letter, path }], shares: [{ share, server }], defaultServer }.
  drives        → letra do Windows ↔ caminho de rede (//servidor/share/...): converte L:\... em //... e /Volumes/...
  shares        → volumes sem letra (share → servidor), para converter /Volumes/SHARE em //servidor/SHARE
  defaultServer → servidor usado quando o share não está em nenhum dos dois
Sem 'DRIVES' no arquivo: os valores de lib/globals.js (os de sempre).

*/

var PAD_DEFAULT_DRIVES = null; // cópia dos padrões, feita antes da primeira troca
var padDrivesCache = { stamp: -1, checked: 0 };

function padDefaultDrives() {
	if (!PAD_DEFAULT_DRIVES) {
		var d = { drives: [], shares: [], defaultServer: PAD_DEFAULT_SERVER };

		for (var letter in DRIVE_MAP) d.drives.push({ letter: letter, path: DRIVE_MAP[letter] });
		for (var share in PAD_SHARE_SERVERS) d.shares.push({ share: share, server: PAD_SHARE_SERVERS[share] });

		PAD_DEFAULT_DRIVES = d;
	}

	return PAD_DEFAULT_DRIVES;
}

function padTrim(value) {
	return String(value == null ? '' : value).replace(/^\s+|\s+$/g, '');
}

// Valida e normaliza o mapa vindo do painel. Lança Error com a mensagem.
function padCleanDrives(d) {
	var clean = { drives: [], shares: [], defaultServer: padTrim(d.defaultServer).replace(/^[\\\/]+|[\\\/]+$/g, '') };
	var seen = {};
	var i;

	for (i = 0; i < (d.drives || []).length; i++) {
		var letter = padTrim(d.drives[i].letter).replace(/:$/, '').toUpperCase();
		var path = padTrim(d.drives[i].path).replace(/\\/g, '/').replace(/\/+$/, '');

		if (!/^[A-Z]$/.test(letter)) throw new Error('#PAD_079 - drives: a letra do drive ' + (i + 1) + ' precisa ser uma letra de A a Z.');
		if (seen[letter]) throw new Error('#PAD_079 - drives: a letra ' + letter + ': aparece mais de uma vez.');
		if (!/^\/\/[^\/\s]+\/[^\/]+/.test(path)) throw new Error('#PAD_080 - drives: o caminho de ' + letter + ': precisa ser de rede (//servidor/share/...).');

		seen[letter] = true;
		clean.drives.push({ letter: letter, path: path });
	}

	seen = {};

	for (i = 0; i < (d.shares || []).length; i++) {
		var share = padTrim(d.shares[i].share).replace(/^[\\\/]+|[\\\/]+$/g, '');
		var server = padTrim(d.shares[i].server).replace(/^[\\\/]+|[\\\/]+$/g, '');

		if (share == '' || /[\\\/]/.test(share)) throw new Error('#PAD_081 - drives: o volume ' + (i + 1) + ' precisa de um nome, sem barras.');
		if (server == '' || /[\\\/\s]/.test(server)) throw new Error('#PAD_081 - drives: "' + share + '" precisa do servidor (só o nome, sem barras).');
		if (seen[share.toLowerCase()]) throw new Error('#PAD_081 - drives: o volume "' + share + '" aparece mais de uma vez.');

		seen[share.toLowerCase()] = true;
		clean.shares.push({ share: share, server: server });
	}

	if (/[\\\/\s]/.test(clean.defaultServer)) throw new Error('#PAD_081 - drives: o servidor padrão é só o nome, sem barras.');

	return clean;
}

function padReadDrives() {
	var file = padConfigFile();

	try {
		var data = JSON.parse(readFileContent(file));

		return data.DRIVES ? padCleanDrives(data.DRIVES) : padDefaultDrives();
	} catch (err) {
		return padDefaultDrives();
	}
}

// Aplica a configuração compartilhada nas globais do host (drives e renomear). Confere o arquivo no
// máximo a cada 5 s, e só relê quando ele mudou.
function padApplyConfig() {
	var now = new Date().getTime();

	if (now - padDrivesCache.checked < 5000) return;

	padDrivesCache.checked = now;
	padDefaultDrives(); // guarda os padrões antes da primeira troca
	padDefaultRename();
	padDefaultOrganize();

	var file = padConfigFile();
	var stamp = 0;

	try {
		stamp = file && file.exists ? file.modified.getTime() : 0;
	} catch (err) { }

	if (stamp == padDrivesCache.stamp) return;

	padDrivesCache.stamp = stamp;

	var d = padReadDrives();
	var map = {};
	var reverse = {};
	var shares = {};

	for (var i = 0; i < d.drives.length; i++) {
		map[d.drives[i].letter] = d.drives[i].path;
		reverse[d.drives[i].path] = d.drives[i].letter + ':';
	}

	for (var j = 0; j < d.shares.length; j++) shares[d.shares[j].share] = d.shares[j].server;

	DRIVE_MAP = map;
	UNC_TO_DRIVE = reverse;
	PAD_SHARE_SERVERS = shares;
	PAD_DEFAULT_SERVER = d.defaultServer;

	var r = padReadRename();

	PAD_RENAME_TYPES = r.types;
	PAD_RENAME_FIXED = r.fixed;
	renameRefArray = padRenameRefs(r.types);

	PAD_ORGANIZE = padReadOrganize();
}

/*

---------------------------------------------------------------
> renomear (aba RENOMEAR da configuração)
---------------------------------------------------------------

'RENAME' no O_PADEIRO_config.json: { types: [{ prefix, comment, terms: [...] }], fixed: [{ match, name }] }.
  types → tipos de peça, na ordem em que são procurados (vale o primeiro encontrado)
  fixed → nomes fixos: a comp que contém 'match' (no nome ou no comentário) passa a se chamar 'name'
Sem 'RENAME' no arquivo: os valores de lib/globals.js (os de sempre).

*/

var PAD_DEFAULT_RENAME = null;

function padDefaultRename() {
	if (!PAD_DEFAULT_RENAME) PAD_DEFAULT_RENAME = JSON.parse(JSON.stringify({ types: PAD_RENAME_TYPES, fixed: PAD_RENAME_FIXED }));

	return PAD_DEFAULT_RENAME;
}

// Texto do campo → maiúsculas, sem acentos e com espaços simples.
function padRenameText(value) {
	return padTrim(value).toUpperCase().replaceSpecialCharacters().replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
}

// Valida e normaliza a tabela vinda do painel. Lança Error com a mensagem.
function padCleanRename(r) {
	var clean = { types: [], fixed: [] };
	var seen = {};
	var i;

	for (i = 0; i < (r.types || []).length; i++) {
		var t = r.types[i];
		var prefix = padRenameText(t.prefix);
		var comment = padRenameText(t.comment);
		var list = t.terms instanceof Array ? t.terms : String(t.terms == null ? '' : t.terms).split(',');
		var terms = [];

		for (var j = 0; j < list.length; j++) {
			var term = padRenameText(list[j]);

			if (term != '') terms.push(term);
		}

		if (prefix == '') throw new Error('#PAD_082 - renomear: o tipo ' + (i + 1) + ' precisa de um prefixo.');
		if (comment == '') throw new Error('#PAD_082 - renomear: "' + prefix + '" precisa de um comentário.');
		if (!terms.length) throw new Error('#PAD_082 - renomear: "' + prefix + '" precisa de ao menos um termo.');
		if (seen[prefix]) throw new Error('#PAD_082 - renomear: o prefixo "' + prefix + '" aparece mais de uma vez.');

		seen[prefix] = true;
		clean.types.push({ prefix: prefix, comment: comment, terms: terms });
	}

	for (i = 0; i < (r.fixed || []).length; i++) {
		var match = padRenameText(r.fixed[i].match);
		var name = padRenameText(r.fixed[i].name);

		if (match == '' || name == '') throw new Error('#PAD_083 - renomear: o nome fixo ' + (i + 1) + ' precisa do termo e do nome.');

		clean.fixed.push({ match: match, name: name });
	}

	return clean;
}

function padReadRename() {
	var file = padConfigFile();

	try {
		var data = JSON.parse(readFileContent(file));

		return data.RENAME ? padCleanRename(data.RENAME) : padDefaultRename();
	} catch (err) {
		return padDefaultRename();
	}
}

/*

---------------------------------------------------------------
> organizar (aba ORGANIZAR da configuração)
---------------------------------------------------------------

'ORGANIZE' no O_PADEIRO_config.json: a mesma forma de PAD_ORGANIZE (lib/functions/project lib.js):
{ folders: [{ name, parent, contents: [...] }], renderComments: [...], autoComment, dataExtensions: [...], commentSubfolders }
Sem 'ORGANIZE' no arquivo: os valores de project lib.js (os de sempre).

*/

var PAD_ORGANIZE_CONTENTS = ['render', 'precomps', 'videos', 'imagens', 'audio', 'solidos', 'dados', 'missing'];
var PAD_DEFAULT_ORGANIZE = null;

function padDefaultOrganize() {
	if (!PAD_DEFAULT_ORGANIZE) PAD_DEFAULT_ORGANIZE = JSON.parse(JSON.stringify(PAD_ORGANIZE));

	return PAD_DEFAULT_ORGANIZE;
}

function padCommaList(value) {
	var list = value instanceof Array ? value : String(value == null ? '' : value).split(',');
	var out = [];

	for (var i = 0; i < list.length; i++) {
		var item = padTrim(list[i]);

		if (item != '') out.push(item);
	}

	return out;
}

// Valida e normaliza a organização vinda do painel. Lança Error com a mensagem.
function padCleanOrganize(o) {
	var clean = { folders: [], renderComments: [], autoComment: '', dataExtensions: [], commentSubfolders: o.commentSubfolders !== false };
	var names = {};
	var contents = {};
	var i;

	for (i = 0; i < (o.folders || []).length; i++) {
		var name = padTrim(o.folders[i].name).replace(/\s+/g, ' ');
		// 'contents' (lista) ou 'content' (um tipo só, como nas primeiras versões)
		var list = o.folders[i].contents instanceof Array ? o.folders[i].contents : (padTrim(o.folders[i].content) ? [padTrim(o.folders[i].content)] : []);
		var kept = [];

		if (name == '') throw new Error('#PAD_084 - organizar: a pasta ' + (i + 1) + ' precisa de um nome.');
		if (names[name.toUpperCase()]) throw new Error('#PAD_084 - organizar: a pasta "' + name + '" aparece mais de uma vez.');

		for (var t = 0; t < list.length; t++) {
			var content = padTrim(list[t]);

			if (content == '') continue;
			if (PAD_ORGANIZE_CONTENTS.indexOf(content) < 0) throw new Error('#PAD_084 - organizar: tipo desconhecido em "' + name + '".');
			if (contents[content]) throw new Error('#PAD_084 - organizar: "' + name + '" e "' + contents[content] + '" recebem o mesmo tipo.');

			contents[content] = name;
			kept.push(content);
		}

		names[name.toUpperCase()] = true;
		clean.folders.push({ name: name, parent: padTrim(o.folders[i].parent), contents: kept });
	}

	// pasta pai: precisa existir e não pode formar ciclo
	for (i = 0; i < clean.folders.length; i++) {
		var f = clean.folders[i];
		var seen = {};
		var cur = f;

		if (f.parent != '' && !names[f.parent.toUpperCase()]) throw new Error('#PAD_084 - organizar: a pasta pai de "' + f.name + '" não existe.');

		for (var c = 0; c < clean.folders.length; c++) {
			if (clean.folders[c].name.toUpperCase() == f.parent.toUpperCase()) f.parent = clean.folders[c].name; // grafia da pasta
		}

		while (cur && cur.parent != '') {
			if (seen[cur.name.toUpperCase()]) throw new Error('#PAD_084 - organizar: "' + f.name + '" está dentro dela mesma.');

			seen[cur.name.toUpperCase()] = true;

			var next = null;

			for (var k = 0; k < clean.folders.length; k++) {
				if (clean.folders[k].name.toUpperCase() == cur.parent.toUpperCase()) next = clean.folders[k];
			}

			cur = next;
		}
	}

	var comments = padCommaList(o.renderComments);

	for (i = 0; i < comments.length; i++) clean.renderComments.push(comments[i].toUpperCase().replaceSpecialCharacters().replace(/\s+/g, ' '));

	if (!clean.renderComments.length) throw new Error('#PAD_085 - organizar: informe ao menos um comentário de render.');

	clean.autoComment = padTrim(o.autoComment).toUpperCase().replaceSpecialCharacters().replace(/\s+/g, ' ');

	var matches = false;

	for (i = 0; i < clean.renderComments.length; i++) {
		if (clean.autoComment.indexOf(clean.renderComments[i]) >= 0) matches = true;
	}

	if (clean.autoComment == '' || !matches) throw new Error('#PAD_085 - organizar: o comentário automático precisa conter um dos comentários de render.');

	var exts = padCommaList(o.dataExtensions);

	for (i = 0; i < exts.length; i++) clean.dataExtensions.push('.' + exts[i].replace(/^\*?\.+/, '').toLowerCase());

	return clean;
}

function padReadOrganize() {
	var file = padConfigFile();

	try {
		var data = JSON.parse(readFileContent(file));

		return data.ORGANIZE ? padCleanOrganize(data.ORGANIZE) : padDefaultOrganize();
	} catch (err) {
		return padDefaultOrganize();
	}
}
