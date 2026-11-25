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

// Os servidores que responderam ou não ao teste de alcance: { servidor em minúsculas: { ok, at } }. o de SP
// (10.193.48.13, promo_ber) só abre na rede da Globo: fora dela (em casa, pela VPN), montar abre o diálogo do macOS
// "There was a problem connecting to the server…" e o After fica travado até o OK. o que não respondeu fica lembrado
// por uns minutos (sem testar de novo a cada clique); o que respondeu, por um minuto
var PS_SERVIDORES = {};
var PS_SERVIDOR_FORA_MS = 5 * 60 * 1000;
var PS_SERVIDOR_OK_MS = 60 * 1000;

function psServidorKey(server) {
	return String(server || '').toLowerCase();
}

// o painel testou pelo Node (sem travar o After) ou o host testou: guarda a resposta
function psMarcarServidor(server, ok) {
	if (server) PS_SERVIDORES[psServidorKey(server)] = { ok: !!ok, at: new Date().getTime() };
}

// o que já se sabe do servidor: true (responde), false (fora) ou null (não testado há pouco)
function psServidorSabido(server) {
	var known = PS_SERVIDORES[psServidorKey(server)];

	if (!known) return null;
	if (new Date().getTime() - known.at > (known.ok ? PS_SERVIDOR_OK_MS : PS_SERVIDOR_FORA_MS)) return null;

	return known.ok;
}

// O servidor responde na porta do compartilhamento (445)? o teste rápido antes de montar: o nc espera no máximo 2 s
// (plano B; o painel testa antes pelo Node quando pode: PADX.servidorFora)
function psServidorResponde(server) {
	var known = psServidorSabido(server);

	if (known !== null) return known;

	var out = '';

	try {
		out = system.callSystem('/usr/bin/nc -z -G 2 -w 2 ' + psShellQuote(server) + ' 445 >/dev/null 2>&1 && echo ok || echo no');
	} catch (err) {}

	psMarcarServidor(server, /ok/.test(String(out)));

	return psServidorSabido(server) === true;
}

// o aviso do servidor fora, uma vez por chamada, junto da resposta ao painel (PADX_alerts → res.notes)
function psAvisoServidorFora(server, share) {
	var text = 'o servidor ' + server + (share ? ' (' + share + ')' : '') + ' não responde: ele só abre na rede da Globo';

	if (typeof PADX_alerts != 'undefined' && PADX_alerts && PADX_alerts.join('\n').indexOf(text) < 0) PADX_alerts.push(text);

	return text;
}

// O servidor e o compartilhamento de um caminho do Mac (/Volumes/SHARE/…), sem montar nem testar nada:
// { server, share } ou null (fora de /Volumes, ou sem servidor no mapa de drives)
function psServidorDoCaminho(path, fixedServer, fixedShare) {
	var match = String(path || '').match(/^\/Volumes\/([^\/]+)(\/.*)?$/);

	if (!match) return null;

	var volume = match[1].replace(/-[1-5]$/, '');
	var server = fixedServer;
	var share = fixedShare || volume;

	if (!server) {
		var lowerVolume = volume.toLowerCase();

		if (/(^|\/)edit_output(\/|$)/i.test(path)) server = PS_SMB.cppHp; // edit_output fica no cpp-ml-hp
		else if (lowerVolume == 'vfx' || lowerVolume == 'edit_in_place') server = PS_SMB.sp; // -sp é o padrão
		else if (typeof findServerForShare == 'function') server = findServerForShare(volume) || ''; // os outros: o servidor do mapa de drives (configuração > rede)
	}

	return server ? { server: server, share: share, rest: match[2] || '' } : null;
}

// Monta o compartilhamento (só numa ação pedida pelo designer: abrir, criar, religar). no modo local (ligado à mão)
// nunca monta; antes de montar, o teste rápido: o servidor que não responde não é montado (o diálogo do macOS travaria
// o After) e o painel recebe o aviso
function psMountShare(server, share) {
	var mounted = psMountedSharePath(server, share);

	if (mounted) return mounted;
	if (typeof padLocalForced == 'function' && padLocalForced()) return '';
	if (!psServidorResponde(server)) {
		psAvisoServidorFora(server, share);
		return '';
	}

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

	var where = psServidorDoCaminho(path, fixedServer, fixedShare);

	if (!where) return path;

	var root = psMountShare(where.server, where.share);

	if (root && new Folder(root + where.rest).exists) return root + where.rest;

	return psExistingVolumeVariant(path) || path;
}

function psOpenFolder(path, fixedServer, fixedShare) {
	if (!path) return;

	var folderPath = psToPlatform(path);

	// no Windows, um caminho do Mac (/Volumes/SHARE/...) vira o de rede pelo mapa de drives (configuração > rede)
	if (appOs != 'Mac' && /^\/Volumes\//i.test(psSlashes(path))) folderPath = toWinPath(path);

	// A montagem só é tentada depois do clique do designer.
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
