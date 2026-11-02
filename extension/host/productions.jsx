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
	padConfigInvalidate();

	// confere o que foi gravado
	JSON.parse(readFileContent(new File(file.fsName)));
}

// Grava a lista compartilhada. a: { productions, stamp } — 'stamp' é a data do arquivo quando o editor o leu.
PADX.saveProductions = function (a) {
	if (padHomeOffice()) throw new Error('#PAD_096 - home office: a configuração da equipe fica na rede. desligue o home office (configuração > computador) para editar.');
	if (padConfigIsCopy()) throw new Error('#PAD_096 - sem a rede: a configuração aberta é a cópia deste computador, só para ler. tente de novo com a rede.');

	var file = padConfigFile();

	if (!file) throw new Error(padNoSharedListError());

	var clean = padCleanProductions(a.productions);
	var log = a.log ? padCleanLog(a.log) : null;
	var drives = a.drives ? padCleanDrives(a.drives) : null;
	var rename = a.rename ? padCleanRename(a.rename) : null;
	var organize = a.organize ? padCleanOrganize(a.organize) : null;
	var search = a.search ? padCleanSearch(a.search) : null;
	var links = a.links ? padCleanLinks(a.links) : null;
	var appearance = a.appearance ? padCleanAppearance(a.appearance) : null;
	var project = a.project ? padCleanProject(a.project) : null;
	var collect = a.collect ? padCleanCollect(a.collect) : null;
	var bar = a.bar ? padCleanBar(a.bar) : null;

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
		padWriteConfig(file, { PRODUCTIONS: clean, LOG: log, DRIVES: drives, RENAME: rename, ORGANIZE: organize, SEARCH: search, LINKS: links, APPEARANCE: appearance, PROJECT: project, COLLECT: collect, BAR: bar });
	} catch (err) {
		throw new Error('#PAD_055 - não foi possível gravar a lista: ' + err.message);
	}

	padDrivesCache.stamp = -1; // relê o que foi salvo
	padDrivesCache.checked = 0;

	return { stamp: new File(file.fsName).modified.getTime(), productions: clean, log: padReadLogSettings(), drives: padReadDrives(), rename: padReadRename(), organize: padReadOrganize(), search: padReadSearch(), links: padReadLinks(), appearance: padReadTeamAppearance(), project: padReadProject(), collect: padReadCollect(), bar: padReadTeamBar(), personal: PADX.personalPrefs(), configPath: file.fsName };
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
	try {
		var data = padConfigData();

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
	padDefaultSearch();

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
	PAD_RENAME_OPTIONS = { removeSpecial: r.removeSpecial !== false, textCase: r.textCase || 'upperCase' };
	globalSeparator = r.separator || ' - '; // também o dos nomes criados pelos templates
	renameRefArray = padRenameRefs(r.types);

	PAD_ORGANIZE = padReadOrganize();

	var search = padReadSearch();
	var origin = search.source == 'file' ? 'file|' + search.file : 'webhook|' + search.webhook;

	// outra origem (webhook ou arquivo): o índice guardado é de outro lugar, então é lido de novo
	if (origin != (PS_SOURCE == 'file' ? 'file|' + PS_INDEX_FILE : 'webhook|' + PS_WEBHOOK_URL)) {
		try {
			var cache = new File(tempFolder.fsName + '/path_index.json');

			if (cache.exists) cache.remove();
		} catch (err) { }
	}

	PS_SOURCE = search.source;
	PS_INDEX_FILE = search.file;
	if (search.webhook) PS_WEBHOOK_URL = search.webhook;
	PS_CATEGORIES = search.labels;
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
	if (!PAD_DEFAULT_RENAME) PAD_DEFAULT_RENAME = JSON.parse(JSON.stringify({ types: PAD_RENAME_TYPES, fixed: PAD_RENAME_FIXED, removeSpecial: PAD_RENAME_OPTIONS.removeSpecial, textCase: PAD_RENAME_OPTIONS.textCase, separator: globalSeparator }));

	return PAD_DEFAULT_RENAME;
}

// Texto do campo → maiúsculas, sem acentos e com espaços simples.
function padRenameText(value) {
	return padTrim(value).toUpperCase().replaceSpecialCharacters().replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
}

// Valida e normaliza a tabela vinda do painel. Lança Error com a mensagem.
function padCleanRename(r) {
	var clean = {
		types: [],
		fixed: [],
		removeSpecial: r.removeSpecial !== false,
		textCase: /^(upperCase|lowerCase|titleCase|keep)$/.test(r.textCase) ? r.textCase : 'upperCase',
		separator: r.separator == null ? ' - ' : String(r.separator)
	};

	// os espaços contam (' - '); vai para nomes de comp e de arquivo
	if (clean.separator == '' || clean.separator.length > 5 || /[\\\/:*?"<>|]/.test(clean.separator)) {
		throw new Error('#PAD_082 - renomear: o separador precisa ter de 1 a 5 caracteres, sem \\ / : * ? " < > |.');
	}
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
	try {
		var data = padConfigData();

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
{ folders: [{ name, parent, contents: [...] }], renderComments: [...], editComments: [...], autoComment, dataExtensions: [...], commentSubfolders }
Sem 'ORGANIZE' no arquivo: os valores de project lib.js (os de sempre).

*/

var PAD_ORGANIZE_CONTENTS = ['render', 'editaveis', 'precomps', 'videos', 'imagens', 'audio', 'solidos', 'dados', 'missing'];
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
	var clean = { folders: [], renderComments: [], editComments: [], autoComment: '', dataExtensions: [], commentSubfolders: o.commentSubfolders !== false };
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

	var edits = o.editComments == null ? ['EDIT'] : padCommaList(o.editComments); // configurações antigas: o padrão

	for (i = 0; i < edits.length; i++) clean.editComments.push(edits[i].toUpperCase().replaceSpecialCharacters().replace(/\s+/g, ' '));

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
	try {
		var data = padConfigData();

		return data.ORGANIZE ? padCleanOrganize(data.ORGANIZE) : padDefaultOrganize();
	} catch (err) {
		return padDefaultOrganize();
	}
}

/*

---------------------------------------------------------------
> busca de caminhos (aba BUSCA da configuração)
---------------------------------------------------------------

'SEARCH' no O_PADEIRO_config.json: { source, webhook, file, labels: [{ key, label }] }.
  source  → de onde vem o índice: 'webhook' ou 'file'
  webhook → o endereço que devolve o índice de caminhos (lib/acessorista.js)
  file    → um arquivo JSON com o índice (o mesmo formato que o webhook devolve), no lugar do webhook
  labels  → nome de exibição de cada categoria (as categorias vêm do próprio índice; sem nome, o automático)
Sem 'SEARCH' no arquivo: os valores de lib/acessorista.js (os de sempre).

*/

var PAD_DEFAULT_SEARCH = null;

function padDefaultSearch() {
	if (!PAD_DEFAULT_SEARCH) PAD_DEFAULT_SEARCH = JSON.parse(JSON.stringify({ source: PS_SOURCE, webhook: PS_WEBHOOK_URL, file: PS_INDEX_FILE, labels: PS_CATEGORIES }));

	return PAD_DEFAULT_SEARCH;
}

// Valida e normaliza a busca vinda do painel. Lança Error com a mensagem.
function padCleanSearch(o) {
	var clean = { source: o.source == 'file' ? 'file' : 'webhook', webhook: padTrim(o.webhook), file: padTrim(o.file), labels: [] };
	var seen = {};
	var validHook = /^https?:\/\/[^\s"'`$\\;&|<>]+$/i.test(clean.webhook);

	// o endereço vai para a linha de comando do curl: sem espaços, aspas nem símbolos do terminal
	if (clean.source == 'webhook' && !validHook) {
		throw new Error('#PAD_086 - busca: endereço do webhook inválido (comece com http:// ou https://, sem espaços nem aspas).');
	}

	if (clean.source == 'file' && clean.file == '') throw new Error('#PAD_086 - busca: escolha o arquivo de índice.');
	if (!validHook) clean.webhook = ''; // guardado só se for válido

	for (var i = 0; i < (o.labels || []).length; i++) {
		var key = padTrim(o.labels[i].key);
		var label = padTrim(o.labels[i].label).replace(/\s+/g, ' ').toUpperCase();

		if (key == '' || label == '' || seen[key]) continue; // sem nome: o automático

		seen[key] = true;
		clean.labels.push({ key: key, label: label });
	}

	return clean;
}

function padReadSearch() {
	try {
		var data = padConfigData();

		return data.SEARCH ? padCleanSearch(data.SEARCH) : padDefaultSearch();
	} catch (err) {
		return padDefaultSearch();
	}
}

// Categorias que o índice tem agora (da cópia local; sem ela, baixa). a: { force }
// → { categories: [{ key, auto, count }], downloaded }
PADX.searchCategories = function (a) {
	var cacheFile = new File(tempFolder.fsName + '/path_index.json');
	var downloaded = false;

	if (a.force || !cacheFile.exists) downloaded = psDownloadIndex(cacheFile);

	var data = null;

	try {
		data = psReadJSON(cacheFile);
	} catch (err) { }

	if (data && typeof data == 'object' && typeof data.length == 'number') data = data[0];
	if (!data) throw new Error('#PAD_058 - não foi possível carregar o índice. verifique a conexão e o workflow.');

	var out = [];

	for (var key in data) {
		if (!(data[key] instanceof Array) || data[key].length == 0) continue;

		out.push({ key: key, auto: psCategoryLabel(key), count: data[key].length });
	}

	for (var src in PS_LOCAL_SOURCES) {
		var found = false;

		for (var j = 0; j < out.length; j++) {
			if (out[j].key == src) {
				out[j].count += PS_LOCAL_SOURCES[src].length;
				found = true;
			}
		}

		if (!found) out.push({ key: src, auto: psCategoryLabel(src), count: PS_LOCAL_SOURCES[src].length });
	}

	return { categories: out, downloaded: downloaded };
};

/*

---------------------------------------------------------------
> links da barra (aba LINKS da configuração)
---------------------------------------------------------------

'LINKS' no O_PADEIRO_config.json: [{ name, url, icon }], na ordem da barra. 'icon' é um PNG 24 x 24 (literal de
string binária, como o das produções); vazio = o favicon do site.

*/

var PAD_DEFAULT_LINKS = [
	{ name: 'apontamento de projetos', url: 'https://tvglobocorp.sharepoint.com/:x:/s/Planejamento-DTEN/Planejamento/EbkuFueT_DlFlUyRqlMSnJIBRpRsPPY72NSDqgKq0DvOKg?e=T7sn7i', icon: '' }
];

// Valida e normaliza a lista vinda do painel. Lança Error com a mensagem.
function padCleanLinks(list) {
	var clean = [];

	for (var i = 0; i < (list || []).length; i++) {
		var name = padTrim(list[i].name).replace(/\s+/g, ' ');
		var url = padTrim(list[i].url);

		if (name == '') throw new Error('#PAD_087 - links: o link ' + (i + 1) + ' precisa de um nome.');
		if (!/^https?:\/\/\S+$/i.test(url)) throw new Error('#PAD_087 - links: "' + name + '" precisa de um endereço (http:// ou https://, sem espaços).');

		clean.push({ name: name, url: url, icon: list[i].icon ? String(list[i].icon) : '' });
	}

	return clean;
}

function padReadLinks() {
	try {
		var data = padConfigData();

		return data.LINKS ? padCleanLinks(data.LINKS) : PAD_DEFAULT_LINKS;
	} catch (err) {
		return PAD_DEFAULT_LINKS;
	}
}

// Links pessoais: os do usuário, só neste computador (pasta de dados do usuário), mesma forma dos da equipe.
function padPersonalLinksFile() {
	return new File(scriptPreferencesPath + '/personal_links.json');
}

function padReadPersonalLinks() {
	var file = padPersonalLinksFile();

	if (!file.exists) return [];

	try {
		return padCleanLinks(JSON.parse(readFileContent(file)).LINKS || []);
	} catch (err) {
		return [];
	}
}

PADX.personalLinks = function () {
	return { links: padReadPersonalLinks() };
};

// a: { links }
PADX.savePersonalLinks = function (a) {
	var clean;

	try {
		clean = padCleanLinks(a.links || []);
	} catch (err) {
		throw new Error(err.message.replace('#PAD_087 - links:', '#PAD_087 - meus links:'));
	}

	saveTextFile(JSON.stringify({ LINKS: clean }, null, '\t'), padPersonalLinksFile().fsName);

	return { links: padReadPersonalLinks() };
};

/*

---------------------------------------------------------------
> ferramentas da barra (aba FERRAMENTAS da configuração)
---------------------------------------------------------------

'BAR' no O_PADEIRO_config.json: { items: [...], hidden: [...] } (aba FERRAMENTAS, vale para a equipe toda):
  items  → a ordem das ferramentas na barra; 'divider' separa os grupos. ferramentas: templates, fontes,
           projeto, coletar, pastas, renomear, organizar e buscar (as que faltarem entram no fim)
  hidden → as escondidas da barra (as mesmas chaves, e 'links' para o bloco de links)

*/

var PAD_BAR_TOOLS = ['templates', 'fontes', 'projeto', 'coletar', 'pastas', 'renomear', 'organizar', 'buscar'];
var PAD_BAR_DEFAULT_ITEMS = ['templates', 'fontes', 'divider', 'projeto', 'coletar', 'pastas', 'divider', 'renomear', 'organizar', 'divider', 'buscar'];

function padCleanBar(o) {
	var items = [];
	var hidden = [];
	var seen = {};
	var list = o && o.items instanceof Array && o.items.length ? o.items : PAD_BAR_DEFAULT_ITEMS;
	var i;

	for (i = 0; i < list.length; i++) {
		var key = padTrim(list[i]).toLowerCase();

		if (key == 'divider') {
			if (items.length && items[items.length - 1] != 'divider') items.push(key); // sem separador no começo nem dois seguidos
		} else if (PAD_BAR_TOOLS.indexOf(key) >= 0 && !seen[key]) {
			seen[key] = true;
			items.push(key);
		}
	}

	for (i = 0; i < PAD_BAR_TOOLS.length; i++) {
		if (!seen[PAD_BAR_TOOLS[i]]) items.push(PAD_BAR_TOOLS[i]); // ferramenta nova (ou esquecida): no fim
	}

	while (items.length && items[items.length - 1] == 'divider') items.pop();

	var h = o && o.hidden instanceof Array ? o.hidden : [];

	for (i = 0; i < h.length; i++) {
		var k = padTrim(h[i]).toLowerCase();

		if ((PAD_BAR_TOOLS.indexOf(k) >= 0 || k == 'links') && hidden.indexOf(k) < 0) hidden.push(k);
	}

	return { items: items, hidden: hidden };
}

// A barra da equipe (o padrão, na rede).
function padReadTeamBar() {
	try {
		var data = padConfigData();

		return padCleanBar(data.BAR || {});
	} catch (err) {
		return padCleanBar({});
	}
}

// A barra desta pessoa: a personalizada (neste computador) ou, sem ela, a da equipe.
function padReadBar() {
	var mine = padPersonalData().BAR;

	if (mine) {
		try {
			return padCleanBar(mine);
		} catch (err) { }
	}

	return padReadTeamBar();
}

// Links para a barra (os da equipe e os pessoais), com a data das duas listas (a barra só redesenha quando muda).
PADX.barLinks = function () {
	var personal = padPersonalLinksFile();
	var stamp = '';

	// a data da configuração vem do cache (padConfigData): sem perguntar de novo à rede
	try {
		padConfigData();
	} catch (err) { }

	try {
		stamp = PAD_CONFIG_CACHE.stamp + '|' + (personal.exists ? personal.modified.getTime() : 0) + '|' + padPersonalStamp();
	} catch (err) { }

	var bar = padReadBar();

	return { stamp: stamp, links: padReadLinks(), personal: padReadPersonalLinks(), items: bar.items, hidden: bar.hidden };
};

// Pedido de aba feito pela barra (2 cliques numa ferramenta): a configuração acompanha o arquivo.
PADX.requestConfigTab = function (a) {
	saveTextFile(JSON.stringify({ tab: a.tab, stamp: new Date().getTime() }), scriptPreferencesPath + '/config_tab.json');

	return { tab: a.tab };
};

PADX.requestedConfigTab = function () {
	var file = new File(scriptPreferencesPath + '/config_tab.json');

	if (!file.exists) return { tab: null, stamp: 0 };

	try {
		var data = JSON.parse(readFileContent(file));

		return { tab: data.tab || null, stamp: data.stamp || 0, now: new Date().getTime() };
	} catch (err) {
		return { tab: null, stamp: 0 };
	}
};

/*

---------------------------------------------------------------
> aparência (aba APARÊNCIA da configuração)
---------------------------------------------------------------

'APPEARANCE' no O_PADEIRO_config.json: o tema de todas as janelas (aplicado por client/js/theme.js).
  mode          → light, dark ou auto (segue o sistema)
  background    → gradient (degradê) ou solid (a cor de destaque)
  accent        → cor de destaque (#rrggbb); gradientStart / gradientEnd → as pontas do degradê
  font          → inter, system, helvetica, segoe, roboto, georgia ou mono
  logo          → PNG (literal de string binária, como o ícone das produções) no lugar do pãozinho; vazio = o pãozinho

*/

var PAD_DEFAULT_APPEARANCE = {
	mode: 'light',
	background: 'gradient',
	accent: '#5184f8',
	gradientStart: '#67b7ff',
	gradientEnd: '#5649e9',
	font: 'inter',
	logo: ''
};

// Valida e normaliza a aparência vinda do painel. Lança Error com a mensagem.
function padCleanAppearance(o) {
	var d = PAD_DEFAULT_APPEARANCE;
	var clean = {
		mode: /^(light|dark|auto)$/.test(o.mode) ? o.mode : d.mode,
		background: o.background == 'solid' ? 'solid' : 'gradient',
		accent: padTrim(o.accent).toLowerCase(),
		gradientStart: padTrim(o.gradientStart).toLowerCase(),
		gradientEnd: padTrim(o.gradientEnd).toLowerCase(),
		font: /^(inter|system|helvetica|segoe|roboto|georgia|mono)$/.test(o.font) ? o.font : d.font,
		logo: o.logo ? String(o.logo) : ''
	};
	var names = { accent: 'cor de destaque', gradientStart: 'início do degradê', gradientEnd: 'fim do degradê' };

	for (var key in names) {
		if (!/^#[0-9a-f]{6}$/.test(clean[key])) throw new Error('#PAD_088 - aparência: ' + names[key] + ' inválida (use #rrggbb).');
	}

	return clean;
}

// A aparência da equipe (o padrão, na rede).
function padReadTeamAppearance() {
	try {
		var data = padConfigData();

		return data.APPEARANCE ? padCleanAppearance(data.APPEARANCE) : PAD_DEFAULT_APPEARANCE;
	} catch (err) {
		return PAD_DEFAULT_APPEARANCE;
	}
}

// A aparência desta pessoa: a personalizada (neste computador) ou, sem ela, a da equipe.
function padReadAppearance() {
	var mine = padPersonalData().APPEARANCE;

	if (mine) {
		try {
			return padCleanAppearance(mine);
		} catch (err) { }
	}

	return padReadTeamAppearance();
}

// O tema, com a data dos arquivos (as janelas só reaplicam quando mudam).
PADX.appearance = function () {
	var stamp = 0;

	try {
		padConfigData();
	} catch (err) { }

	stamp = PAD_CONFIG_CACHE.stamp + '|' + padPersonalStamp();

	return { stamp: stamp, appearance: padReadAppearance() };
};

/*

---------------------------------------------------------------
> preferências pessoais (aparência e ferramentas, só neste computador)
---------------------------------------------------------------

'personal_config.json' na pasta de dados do usuário: { APPEARANCE, BAR }, só as que a pessoa personalizou.
Sem elas, vale o padrão da equipe (APPEARANCE e BAR do O_PADEIRO_config.json, na rede).

*/

var PAD_PERSONAL_CACHE = { stamp: -1, data: {} };

function padPersonalConfigFile() {
	return new File(scriptPreferencesPath + '/personal_config.json');
}

function padPersonalStamp() {
	var file = padPersonalConfigFile();

	try {
		return file.exists ? file.modified.getTime() : 0;
	} catch (err) {
		return 0;
	}
}

function padPersonalData() {
	var stamp = padPersonalStamp();

	if (stamp != PAD_PERSONAL_CACHE.stamp) {
		PAD_PERSONAL_CACHE.stamp = stamp;
		PAD_PERSONAL_CACHE.data = {};

		if (stamp) {
			try {
				PAD_PERSONAL_CACHE.data = JSON.parse(readFileContent(padPersonalConfigFile())) || {};
			} catch (err) { }
		}
	}

	return PAD_PERSONAL_CACHE.data;
}

// { appearance, bar }: as personalizadas (null = usa o padrão da equipe)
PADX.personalPrefs = function () {
	var d = padPersonalData();
	var out = { appearance: null, bar: null };

	try {
		if (d.APPEARANCE) out.appearance = padCleanAppearance(d.APPEARANCE);
	} catch (err) { }

	try {
		if (d.BAR) out.bar = padCleanBar(d.BAR);
	} catch (err) { }

	return out;
};

// a: { appearance, bar } (null = voltar ao padrão da equipe)
PADX.savePersonalPrefs = function (a) {
	var data = {};

	if (a.appearance) data.APPEARANCE = padCleanAppearance(a.appearance);
	if (a.bar) data.BAR = padCleanBar(a.bar);

	var folder = new Folder(scriptPreferencesPath);

	if (!folder.exists) folder.create();

	saveTextFile(JSON.stringify(data, null, '\t'), padPersonalConfigFile().fsName);
	PAD_PERSONAL_CACHE.stamp = -1;

	return PADX.personalPrefs();
};

/*

---------------------------------------------------------------
> cópia local dos templates (configuração > computador)
---------------------------------------------------------------

Copia a pasta de templates de uma produção (na rede) para a pasta dela neste computador: só os arquivos
novos ou com outra data / tamanho. Nada é apagado na cópia.

*/

function padCopyTree(from, to, stats) {
	if (!to.exists) to.create();

	var items = from.getFiles();

	for (var i = 0; i < items.length; i++) {
		var item = items[i];
		var name = decodeURI(item.name);

		if (/^\./.test(name)) continue; // .DS_Store, ocultos

		if (item instanceof Folder) {
			padCopyTree(item, new Folder(to.fsName + '/' + name), stats);
			continue;
		}

		var dest = new File(to.fsName + '/' + name);

		try {
			if (dest.exists && dest.length == item.length && dest.modified.getTime() >= item.modified.getTime()) {
				stats.same++;
				continue;
			}
		} catch (err) { }

		if (item.copy(dest.fsName)) stats.copied++;
		else stats.failed.push(name);
	}
}

// a: { name, from, to } (from: a pasta da equipe; to: a deste computador)
PADX.syncTemplates = function (a) {
	if (padHomeOffice()) throw new Error('#PAD_097 - home office: a cópia dos templates precisa da rede. desligue o home office para atualizar.');

	var from = new Folder(padPath(a.from));
	var to = new Folder(padPath(a.to));

	if (!a.to) throw new Error('#PAD_097 - ' + a.name + ': escolha a pasta deste computador antes de copiar.');
	if (!from.exists) throw new Error('#PAD_097 - ' + a.name + ': a pasta da rede não pode ser acessada: ' + padDisplayPath(from.fsName));
	if (from.fsName == to.fsName) throw new Error('#PAD_097 - ' + a.name + ': a pasta deste computador é a mesma da rede.');

	var stats = { copied: 0, same: 0, failed: [] };

	padCopyTree(from, to, stats);

	return { copied: stats.copied, same: stats.same, failed: stats.failed.slice(0, 10), to: padDisplayPath(to.fsName) };
};
