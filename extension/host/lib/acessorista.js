// O ACESSORISTA: índice de caminhos das atrações (webhook + cache), abertura de pastas (montagem SMB no macOS)
// e conversão de caminhos Windows / macOS.

var PS_WEBHOOK_URL = 'https://workflows.jmbillard.com/webhook/path-search';

var PS_WEBHOOK_BODY = '{"origem":"after effects"}';

var PS_CACHE_TTL = 30 * 1000; // idade máxima (ms) do índice local antes de baixar de novo (caminhos do Teams mudam toda hora)

var PS_SMB = {
	sp: 'vfx-ml-sp.servicos.corp.tvglobo.com.br',
	hp: 'vfx-ml-hp.servicos.corp.tvglobo.com.br',
	cppHp: 'cpp-ml-hp.servicos.corp.tvglobo.com.br',
	cppSp: 'cpp-ml-sp.servicos.corp.tvglobo.com.br'
};

var PS_CATEGORIES = [
	{ key: 'atracoes_teams', label: 'TEAMS' },
	{ key: 'atracoes_trello', label: 'TRELLO' },
	{ key: 'atracoes', label: 'ATRAÇÕES' },
	{ key: 'filmes', label: 'FILMES' },
	{ key: 'servidor', label: 'SERVIDOR' }
];

var PS_LOCAL_SOURCES = {
	servidor: [
		{
			atracao: '#INGEST',
			mac: { caminho: '/Volumes/PROMO_REDE/CPP_JB_PROMO/#INGEST' },
			win: { caminho: '\\\\' + PS_SMB.cppSp + '\\PROMO_REDE\\CPP_JB_PROMO\\#INGEST' },
			fixedShareServer: PS_SMB.cppSp,
			fixedShare: 'PROMO_REDE'
		},
		{
			atracao: 'BASES VALENDO',
			mac: { caminho: '/Volumes/PROMO_REDE/CPP_JB_PROMO/HOME OFFICE - NAO APAGAR/BASES E VALENDO' },
			win: { caminho: '\\\\' + PS_SMB.cppSp + '\\PROMO_REDE\\CPP_JB_PROMO\\HOME OFFICE - NAO APAGAR\\BASES E VALENDO' },
			fixedShareServer: PS_SMB.cppSp,
			fixedShare: 'PROMO_REDE'
		}
	]
};

var PS_ACCENTS = {
	'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
	'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
	'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
	'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
	'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
	'ç': 'c', 'ñ': 'n'
};

function psCategoryLabel(key) {
	return key.replace(/^atracoes_/, '').replace(/_/g, ' ').toUpperCase();
}

function psCategoryList(data) {
	var list = [];
	var known = {};

	for (var i = 0; i < PS_CATEGORIES.length; i++) {
		known[PS_CATEGORIES[i].key] = true;

		if (psAsArray(data[PS_CATEGORIES[i].key]).length > 0) list.push(PS_CATEGORIES[i]);
	}

	for (var key in data) {
		if (known[key] || !(data[key] instanceof Array) || data[key].length == 0) continue;

		list.push({ key: key, label: psCategoryLabel(key) });
	}

	return list;
}

function psNormalize(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/[áàâãäéèêëíìîïóòôõöúùûüçñ]/g, function (c) {
			return PS_ACCENTS[c];
		})
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]/g, '');
}

function psSlashes(path) {
	return String(path || '').replace(/\\/g, '/');
}

// Caminho como vem do workflow, limpo: sem espaços/quebras de linha nas pontas, sem aspas soltas no
// começo ou no fim (ex: "...\LETTERING'") e sem barra no fim.
function psCleanPath(path) {
	return String(path || '')
		.replace(/^[\s\u00A0'"`\u00B4\u2018\u2019\u201C\u201D]+|[\s\u00A0'"`\u00B4\u2018\u2019\u201C\u201D]+$/g, '')
		.replace(/(.)[\\\/]+$/, '$1');
}

// Chave para comparar caminhos: o mesmo caminho em formato Windows (//servidor/share/...) ou macOS
// (/Volumes/share/...), com barras duplas, espaços em volta das pastas, caracteres invisíveis,
// maiúsculas ou acentos compostos de jeitos diferentes (o macOS grava "Ê" como "E" + acento).
function psPathKey(path) {
	var parts = psToMac(psCleanPath(path).replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')).split('/');
	var clean = [];

	for (var i = 0; i < parts.length; i++) {
		var part = parts[i].replace(/^\s+|\s+$/g, '');

		if (part !== '') clean.push(part);
	}

	return clean
		.join('/')
		.toLowerCase()
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[áàâãäéèêëíìîïóòôõöúùûüçñ]/g, function (c) {
			return PS_ACCENTS[c];
		});
}

function psToMac(path) {
	var p = psSlashes(path);

	if (p.indexOf('//') != 0) return p;

	var parts = p.replace(/^\/+/, '').split('/');

	if (parts.length < 2) return p;

	return '/Volumes/' + parts.slice(1).join('/');
}

function psToPlatform(path) {
	return appOs == 'Mac' ? psToMac(path) : psSlashes(path).replace(/\//g, '\\');
}

function psShellQuote(text) {
	return "'" + String(text).replace(/'/g, "'\\''") + "'";
}

function psLastFolderName(path) {
	var p = psSlashes(path).replace(/\/+$/, '');

	return p.substring(p.lastIndexOf('/') + 1);
}

function psAsArray(value) {
	if (!value) return [];

	return value instanceof Array ? value : [value];
}

function psAddUnique(list, value) {
	if (!value) return;

	var key = psPathKey(value);

	for (var i = 0; i < list.length; i++) {
		if (psPathKey(list[i]) == key) return;
	}

	list.push(String(value));
}

function psReadJSON(file) {
	if (!file.exists) return null;

	var text = readFileContent(file).replace(/^﻿/, '');

	return JSON.parse(text);
}

function psIsFresh(file) {
	return file.exists && new Date().getTime() - file.modified.getTime() < PS_CACHE_TTL;
}

function psDownloadIndex(cacheFile) {
	var partFile = new File(cacheFile.fsName + '.part');
	var cmd;

	if (partFile.exists) partFile.remove();

	if (appOs == 'Win') {
		cmd =
			'cmd.exe /c curl.exe -s -L --connect-timeout 5 --max-time 25 -X POST' +
			' -H "Content-Type: application/json"' +
			' -d "' + PS_WEBHOOK_BODY.replace(/"/g, '\\"') + '"' +
			' -o "' + partFile.fsName.replace(/"/g, '') + '"' +
			' "' + PS_WEBHOOK_URL + '"';
	} else {
		cmd =
			'curl -s -L --connect-timeout 5 --max-time 25 -X POST' +
			" -H 'Content-Type: application/json'" +
			' -d ' + psShellQuote(PS_WEBHOOK_BODY) +
			' -o ' + psShellQuote(partFile.fsName) +
			' ' + psShellQuote(PS_WEBHOOK_URL);
	}

	try {
		system.callSystem(cmd);
	} catch (err) {}

	var valid = false;

	try {
		valid = psReadJSON(partFile) != null;
	} catch (err) {}

	if (!valid) {
		if (partFile.exists) partFile.remove();
		return false;
	}

	if (cacheFile.exists) cacheFile.remove();
	partFile.rename(cacheFile.name);

	return true;
}

function psBuildIndex(data) {
	// o workflow pode devolver o objeto dentro de uma lista ([ { ... } ])
	if (data && typeof data == 'object' && typeof data.length == 'number') data = data[0];

	data = data || {};

	// listas locais somadas às do webhook
	for (var src in PS_LOCAL_SOURCES) {
		data[src] = psAsArray(data[src]).concat(PS_LOCAL_SOURCES[src]);
	}

	var categories = psCategoryList(data);
	var platform = appOs == 'Mac' ? 'mac' : 'win';
	var index = [];

	for (var c = 0; c < categories.length; c++) {
		var records = psAsArray(data[categories[c].key]);
		var groups = [];
		var groupsByKey = {};

		for (var r = 0; r < records.length; r++) {
			var rec = records[r];

			if (!rec) continue;

			// sem o caminho deste sistema, usa o do outro (ex: a lista de filmes só tem 'win'); ele é
			// convertido ao mostrar e ao abrir
			var plat = rec[platform] || {};
			var other = rec[platform == 'mac' ? 'win' : 'mac'] || {};
			var projeto = psCleanPath(plat.projeto || rec.projeto || other.projeto);
			var output = psCleanPath(plat.output || rec.output || other.output);
			var caminho = psCleanPath(plat.caminho || rec.caminho || other.caminho);
			var atracao = psCleanPath(rec.atracao); // nomes também vêm com aspas soltas no fim

			var name = atracao
				? atracao
				: psLastFolderName(caminho) || psLastFolderName(projeto) || psLastFolderName(output) || 'Resultado ' + (r + 1);

			// if/else em vez de ternário encadeado: o ExtendScript avalia 'a ? b : c ? d : e'
			// como '(a ? b : c) ? d : e', o que juntava todas as atrações sem caminho num grupo só.
			var key;

			if (atracao) key = 'a:' + psNormalize(name);
			else if (caminho) key = 'c:' + psPathKey(caminho);
			else key = 'r:' + r;

			var group = groupsByKey[key];

			if (!group) {
				group = groupsByKey[key] = {
					name: name,
					projetos: [],
					outputs: [],
					caminhos: [],
					server: rec.fixedShareServer || '',
					share: rec.fixedShare || '',
					haystack: psNormalize(name)
				};
				groups.push(group);
			}

			if (rec.fixedShareServer) group.server = rec.fixedShareServer;
			if (rec.fixedShare) group.share = rec.fixedShare;

			psAddUnique(group.projetos, projeto);
			psAddUnique(group.outputs, output);
			psAddUnique(group.caminhos, caminho);

			group.haystack += '|' + psNormalize(projeto) + '|' + psNormalize(output) + '|' + psNormalize(caminho);
		}

		// sem nenhum caminho (ex: filme com output null) não há o que abrir: fica de fora
		var useful = [];

		for (var g = 0; g < groups.length; g++) {
			if (groups[g].projetos.length || groups[g].outputs.length || groups[g].caminhos.length) useful.push(groups[g]);
		}

		if (useful.length > 0) index.push({ category: categories[c], groups: useful });
	}

	return index;
}

function psMountedSharePath(server, share) {
	var output = '';

	try {
		output = system.callSystem('/sbin/mount');
	} catch (err) {
		return '';
	}

	var lines = String(output).split(/\r?\n/);
	var serverLower = server.toLowerCase();
	var shareLower = share.toLowerCase();

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		var lower = line.toLowerCase();
		var smbIndex = lower.indexOf(' (smbfs');

		if (smbIndex < 0 || lower.indexOf(serverLower) < 0) continue;

		var onIndex = lower.lastIndexOf(' on ', smbIndex);

		if (onIndex < 0) continue;

		var source = lower.substring(0, onIndex);

		if (source.substring(source.lastIndexOf('/') + 1) != shareLower) continue;

		var mountPoint = line
			.substring(onIndex + 4, smbIndex)
			.replace(/\\040/g, ' ')
			.replace(/\/+$/, '');

		if (mountPoint.indexOf('/Volumes/') == 0) return mountPoint;
	}

	return '';
}

function psMountShare(server, share) {
	var mounted = psMountedSharePath(server, share);

	if (mounted) return mounted;

	var user = '';

	try {
		user = String(system.callSystem('id -un')).replace(/^\s+|\s+$/g, '');
	} catch (err) {}

	var address = user
		? 'smb://corp%5C' + encodeURIComponent(user) + '@' + server + '/' + share
		: 'smb://' + server + '/' + share;

	try {
		system.callSystem('osascript -e ' + psShellQuote('mount volume "' + address + '"'));
	} catch (err) {}

	return psMountedSharePath(server, share);
}

function psExistingVolumeVariant(path) {
	var resolved = resolveMacVolumePath(path);

	return new Folder(resolved).exists ? resolved : '';
}

function psResolveOnMac(path, fixedServer, fixedShare) {
	var existing = psExistingVolumeVariant(path);

	if (existing) return existing;

	var match = path.match(/^\/Volumes\/([^\/]+)(\/.*)?$/);

	if (!match) return path;

	var volume = match[1].replace(/-[1-5]$/, '');
	var rest = match[2] || '';
	var server = fixedServer;
	var share = fixedShare || volume;

	if (!server) {
		var lowerVolume = volume.toLowerCase();

		if (/(^|\/)edit_output(\/|$)/i.test(path)) server = PS_SMB.cppHp; // edit_output fica no cpp-ml-hp
		else if (lowerVolume == 'vfx' || lowerVolume == 'edit_in_place') server = PS_SMB.sp; // -sp é o padrão
		else return path;
	}

	var root = psMountShare(server, share);

	if (root && new Folder(root + rest).exists) return root + rest;

	return psExistingVolumeVariant(path) || path;
}

function psOpenFolder(path, fixedServer, fixedShare) {
	if (!path) return;

	var folderPath = psToPlatform(path);

	// A montagem só é tentada depois do clique do usuário.
	if (appOs == 'Mac') folderPath = psResolveOnMac(folderPath, fixedServer, fixedShare);

	if (!new Folder(folderPath).exists) {
		alert(lol + '#PAD_PATH_001 - a pasta não foi encontrada ou não está acessível:\n' + folderPath);
		return;
	}

	try {
		openFolder(folderPath);
	} catch (err) {
		alert(lol + '#PAD_PATH_002 - não foi possível abrir a pasta:\n' + folderPath + '\n\n' + err.message);
	}
}

function cleanPathInput(str) {
	return String(str || '')
		.replace(/^\s+|\s+$/g, '')
		.replace(/^["']+|["']+$/g, '')
		.replace(/^smb:\/\/([^@\/]+@)?/i, '//');
}

function toMacPath(str) {
	var path = cleanPathInput(str);

	if (path == '') return '';

	// caminho local do Windows (C:\Users\...) → /Users/...
	if (/^[a-z]:[\\\/]/i.test(path) && !DRIVE_MAP[path.charAt(0).toUpperCase()]) {
		return path.substring(2).replace(/\\/g, '/');
	}

	return normalizeNetworkPath(path, { forceMac: true, silent: true });
}

function toWinPath(str) {
	var path = cleanPathInput(str);

	if (path == '') return '';

	return normalizeNetworkPath(path, { forceWin: true, silent: true })
		.replace(/^\/Users\//, 'C:/Users/') // pasta do usuário no macOS → pasta do usuário no Windows
		.replace(/\//g, '\\');
}
