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
		padWriteConfig(file, { PRODUCTIONS: clean, LOG: log, DRIVES: drives });
	} catch (err) {
		throw new Error('#PAD_055 - não foi possível gravar a lista: ' + err.message);
	}

	padDrivesCache.stamp = -1; // relê o mapa salvo

	return { stamp: new File(file.fsName).modified.getTime(), productions: clean, log: padReadLogSettings(), drives: padReadDrives(), configPath: file.fsName };
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

// Troca as globais do mapa (DRIVE_MAP, UNC_TO_DRIVE, PAD_SHARE_SERVERS, PAD_DEFAULT_SERVER) pelas da
// configuração. Confere o arquivo no máximo a cada 5 s, e só relê quando ele mudou.
function padApplyDrives() {
	var now = new Date().getTime();

	if (now - padDrivesCache.checked < 5000) return;

	padDrivesCache.checked = now;
	padDefaultDrives(); // guarda os padrões antes da primeira troca

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
}
