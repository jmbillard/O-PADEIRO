// O ACESSORISTA: os endereços da busca de caminhos (o índice da equipe e os filmes recentes), os caminhos fixos,
// a abertura de pastas (montagem SMB no macOS) e a conversão de caminhos Windows / macOS.

// O índice da busca (workflow PROMO - BUSCAR): pronto, num GET. O painel do acessorista baixa sozinho (sem travar o
// After Effects); o curl daqui é só o plano B.
var PS_INDEX_DEFAULT_URL = PAD_CONFIGURACAO.padrao('buscaDeCaminhos').url; // o padrão da tabela de seções (regras/configuracao.js)
var PS_INDEX_URL = PS_INDEX_DEFAULT_URL; // o da configuração > buscar (padApplyConfig)

// Os filmes criados na base nos últimos dias (O PROJETISTA mostra com o campo vazio e marca os que ainda não têm
// pasta). O workflow (PROMO: FILMES PARA O PADEIRO) responde { filmes: [{ titulo, ano, exibicao, sessao, poster, … }] }.
var PS_FILMS_URL = 'https://workflows.jmbillard.com/webhook/filmes-recentes';

var PS_CAMINHOS_FIXOS = null; // os caminhos fixos: [{ name, path }] (configuração > buscar); null = os padrão (a tabela de seções)

var PS_COPY_MAX_AGE = 30 * 1000; // idade máxima (ms) da cópia do índice antes de a janela de projeto baixar de novo

// A cópia do índice da busca neste computador, a mesma para o acessorista e a janela de projeto: o nome dela e os de
// antes (lidos enquanto não há a cópia com o nome de agora; o próximo download grava a de agora) ficam na tabela de
// seções (regras/configuracao.js: COPIA_DA_BUSCA).
var PS_COPY = PAD_CONFIGURACAO.COPIA_DA_BUSCA;

var PS_SMB = {
	sp: 'vfx-ml-sp.servicos.corp.tvglobo.com.br',
	hp: 'vfx-ml-hp.servicos.corp.tvglobo.com.br',
	cppHp: 'cpp-ml-hp.servicos.corp.tvglobo.com.br',
	cppSp: 'cpp-ml-sp.servicos.corp.tvglobo.com.br'
};

function psSlashes(path) {
	return String(path || '').replace(/\\/g, '/');
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

// A cópia do índice com o nome de agora (onde o download grava).
function psCopyFile() {
	return new File(tempFolder.fsName + '/' + PS_COPY.arquivo);
}

// os caminhos das cópias com os nomes de antes (para o painel, que lê pelo Node)
function psOldCopyPaths() {
	var out = [];

	for (var i = 0; i < PS_COPY.arquivosAntigos.length; i++) out.push(new File(tempFolder.fsName + '/' + PS_COPY.arquivosAntigos[i]).fsName);

	return out;
}

// A cópia para ler: a de agora ou, sem ela, a do nome de antes.
function psCopyToRead() {
	return new File(tempFolder.fsName + '/' + PAD_CONFIGURACAO.paraLer(PS_COPY, function (nome) {
		return new File(tempFolder.fsName + '/' + nome).exists;
	}));
}

function psCopyIsFresh(file) {
	return file.exists && new Date().getTime() - file.modified.getTime() < PS_COPY_MAX_AGE;
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
		else if (typeof findServerForShare == 'function') server = findServerForShare(volume) || ''; // os outros: o servidor do mapa de drives (configuração > rede)

		if (!server) return path;
	}

	var root = psMountShare(server, share);

	if (root && new Folder(root + rest).exists) return root + rest;

	return psExistingVolumeVariant(path) || path;
}

function psOpenFolder(path, fixedServer, fixedShare) {
	if (!path) return;

	var folderPath = psToPlatform(path);

	// no Windows, um caminho do Mac (/Volumes/SHARE/...) vira o de rede pelo mapa de drives (configuração > rede)
	if (appOs != 'Mac' && /^\/Volumes\//i.test(psSlashes(path))) folderPath = toWinPath(path);

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

	// caminho do disco do Windows (C:\Users\...) → /Users/...
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
