/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> API do painel
---------------------------------------------------------------

Cada método de PADX recebe um objeto (JSON) e devolve dados simples (serializáveis).
O painel chama sempre por PADX_call, que devolve '{ ok, data }' ou '{ ok: false, error }'.

O preenchimento e a criação da fila de render são divididos em passos (begin / step / finish)
para o painel mostrar o progresso e o status de cada item.

*/

var PADX = {};

// Extensões de template permitidas
var PADX_TEMPLATE_EXT = ['.aep', '.aet'];

// Estado da execução em andamento (entre as chamadas dos passos)
var PADX_run = null;

function PADX_call(method, argsJson) {
	var res;

	try {
		var args = argsJson ? JSON.parse(argsJson) : {};

		if (typeof PADX[method] !== 'function') throw new Error('#PAD_043 - método desconhecido: ' + method);

		padApplyConfig(); // drives e renomear vêm da configuração compartilhada (relida quando o arquivo muda)

		res = { ok: true, data: PADX[method](args) };
	} catch (err) {
		var msg = err.message || String(err);

		// todo erro chega ao painel com um código: os sem código são inesperados
		res = { ok: false, error: /^#PAD_/.test(msg) ? msg : '#PAD_099 - erro inesperado: ' + msg };
	} finally {
		padUndoClose(); // nenhum grupo de desfazer fica aberto entre uma chamada e outra
	}

	return JSON.stringify(res);
}

/*

---------------------------------------------------------------
> utilidades
---------------------------------------------------------------

*/

// Acesso a rede / arquivos do After Effects ('Allow Scripts to Write Files and Access Network').
function netAccess() {
	return app.preferences.getPrefAsLong('Main Pref Section', 'Pref_SCRIPTING_FILE_NETWORK_SECURITY') == 1;
}

// As libs avisam o usuário com alert(). Aqui as mensagens são recolhidas
// (sem emoticons) e devolvidas ao painel, que mostra no próprio visual.
var PADX_alerts = null;
var PADX_nativeAlert = alert;

// atribuído em $.global: o alert de todas as libs passa por aqui
$.global.alert = function (msg) {
	if (PADX_alerts === null) return PADX_nativeAlert(msg);

	PADX_alerts.push(String(msg).replace(lol, '').replace(relax, '').replace(/^\s+|\s+$/g, ''));
};

// Executa 'fn' recolhendo os alerts. Retorna { messages, data }.
function padCollect(fn) {
	var data;
	var messages;

	PADX_alerts = [];

	try {
		data = fn();
	} finally {
		messages = PADX_alerts;
		PADX_alerts = null;
	}

	return { messages: messages, data: data };
}

// Lista de comps do projeto.
function getComps() {
	var compArray = [];

	for (var i = 1; i <= app.project.numItems; i++) {
		var comp = app.project.item(i);

		if (comp instanceof CompItem) compArray.push(comp);
	}

	return compArray;
}

function padPath(pathStr) {
	var path = normalizeNetworkPath(pathStr, { silent: true });

	// no macOS, normalizeNetworkPath escapa aspas ("D\'AVILA") para outro uso: aqui o caminho vai para File/Folder
	return appOs == 'Mac' && path ? path.replace(/\\(['"])/g, '$1') : path;
}

// Caminho para MOSTRAR nas janelas: sempre no formato do sistema atual (/Volumes/... no macOS,
// \\servidor\... no Windows), qualquer que seja o formato guardado (lista, config, workflow).
// O conversor de caminhos é a exceção: ele mostra os dois formatos.
function padDisplayPath(pathStr) {
	if (!pathStr) return pathStr || '';

	var path = padPath(pathStr) || String(pathStr);
	var shown;

	try {
		shown = Folder.decode(new Folder(path).fsName);
	} catch (err) {
		shown = path;
	}

	return padNoVolumeSuffix(shown);
}

// Sem o sufixo que o macOS põe ao montar o mesmo share de novo (/Volumes/VFX-1 → /Volumes/VFX): os caminhos são
// gravados e mostrados assim; o volume certo (resolveMacVolumePath, via padPath) só entra ao abrir, criar ou montar.
function padNoVolumeSuffix(path) {
	return String(path || '').replace(/^(\/Volumes\/[^\/]+?)-[1-5](?=\/|$)/i, '$1');
}

function padDisplayPaths(list) {
	var out = [];

	for (var i = 0; i < list.length; i++) out.push(padDisplayPath(list[i]));

	return out;
}

/*

---------------------------------------------------------------
> este computador (configuração > LOCAL > computador)
---------------------------------------------------------------

'machine_config.json' na pasta de dados do usuário:
  user       → a sigla do designer ({usuario} no nome do projeto); vazia: o usuário do computador
  projects   → a pasta dos projetos neste computador: a atração nova vai para ela ({categoria}/{atracao})
               quando a pasta da categoria não pode ser acessada (rede fora ou modo local)
  outputs    → a pasta padrão de saída (render): vale quando a pasta do template não pode ser acessada
  templates  → { 'produção': pasta } a pasta de templates de cada produção neste computador
  localMode  → modo local (o mesmo que acontece quando a rede cai): nada tenta a rede. a configuração vem
               da última cópia guardada neste computador, os templates das pastas daqui, os projetos vão
               para 'projects' (ou a Área de Trabalho), os renders para 'outputs' (ou a Área de Trabalho)
               e os logs esperam a volta para a rede

*/

var PAD_MACHINE_CACHE = { stamp: -1, data: {} };

function padMachineFile() {
	return new File(scriptPreferencesPath + '/machine_config.json');
}

function padMachineData() {
	var file = padMachineFile();
	var stamp = 0;

	try {
		stamp = file.exists ? file.modified.getTime() : 0;
	} catch (err) { }

	if (stamp != PAD_MACHINE_CACHE.stamp) {
		PAD_MACHINE_CACHE.stamp = stamp;
		PAD_MACHINE_CACHE.data = {};

		if (stamp) {
			try {
				PAD_MACHINE_CACHE.data = JSON.parse(readFileContent(file)) || {};
			} catch (err) { }
		}
	}

	return PAD_MACHINE_CACHE.data;
}

// O modo local ligado à mão (configuração > meu usuário). 'homeOffice' é o nome antigo da chave.
function padLocalForced() {
	var d = padMachineData();

	return d.localMode === true || d.homeOffice === true;
}

// Modo local: ligado à mão ou a rede fora (a configuração da equipe só existe como a cópia deste
// computador). Os dois funcionam igual: nada tenta a rede.
function padLocalMode() {
	return padLocalForced() || padConfigIsCopy();
}

// Caminho de pasta digitado: barras normais, sem barra no fim.
function padMachinePath(path) {
	return padNoVolumeSuffix(String(path == null ? '' : path).replace(/^\s+|\s+$/g, '').replace(/\\/g, '/').replace(/(.)\/+$/, '$1'));
}

// o designer: letras, números, ponto, hífen e sublinhado, em maiúsculas
function padCleanUser(user) {
	return String(user == null ? '' : user).replaceSpecialCharacters().replace(/[^A-Za-z0-9._-]/g, '').substring(0, 24).toUpperCase();
}

// o padrão: o usuário do computador, completo (quem quiser uma sigla muda na configuração > meu usuário)
function padDefaultUser() {
	return padCleanUser(system.userName || '');
}

// Sigla do designer: a deste computador; sem ela, a antiga (project_user.json) ou a padrão.
function padMachineUser() {
	var user = padCleanUser(padMachineData().user);

	if (user) return user;

	var legacy = new File(scriptPreferencesPath + '/project_user.json');

	if (legacy.exists) {
		try {
			user = padCleanUser(JSON.parse(readFileContent(legacy)).user);
		} catch (err) { }
	}

	return user || padDefaultUser();
}

// Busca de caminhos neste computador: { mode: 'webhook' | 'local', folders: [], foldersOnly, daily }.
//   mode        → de onde vêm os caminhos: o webhook da equipe ou o índice local (as pastas abaixo, indexadas aqui)
//   folders     → as pastas lidas com todas as subpastas
//   foldersOnly → só pastas (sem arquivos)
//   daily       → refaz o índice uma vez por dia, ao abrir a busca
function padMachineSearch(o) {
	o = o && typeof o == 'object' ? o : {};

	var folders = [];
	var list = o.folders && typeof o.folders.length == 'number' ? o.folders : [];

	for (var i = 0; i < list.length; i++) {
		var path = padMachinePath(list[i]);

		if (path) folders.push(path);
	}

	return { mode: o.mode == 'local' ? 'local' : 'webhook', folders: folders, foldersOnly: o.foldersOnly !== false, daily: o.daily !== false };
}

PADX.machinePrefs = function () {
	var d = padMachineData();

	return {
		user: padMachineUser() == padDefaultUser() ? '' : padMachineUser(),
		defaultUser: padDefaultUser(),
		projects: padMachinePath(d.projects),
		outputs: padMachinePath(d.outputs),
		productions: padMachineProductions(d),
		log: padMachineLog(),
		localMode: padLocalForced(),
		search: padMachineSearch(d.search),
		fontsUpload: padMachineFontsUpload(),
		localIndex: scriptPreferencesPath + '/indice_local.json',
		offline: !padLocalForced() && padConfigIsCopy(), // a rede caiu: o modo local está valendo sozinho
		hasConfigCopy: padConfigCopyFile().exists
	};
};

// a: { user, projects, outputs, productions, log, localMode, search, fontsUpload } (só os campos enviados mudam)
PADX.saveMachinePrefs = function (a) {
	var d = padMachineData();
	var data = { user: padMachineUser() == padDefaultUser() ? '' : padMachineUser(), projects: padMachinePath(d.projects), outputs: padMachinePath(d.outputs), productions: padMachineProductions(d), log: padMachineLog(), localMode: padLocalForced(), search: padMachineSearch(d.search), fontsUpload: padMachineFontsUpload() };

	if (a.user != null) data.user = padCleanUser(a.user) == padDefaultUser() ? '' : padCleanUser(a.user);
	if (a.projects != null) data.projects = padMachinePath(a.projects);
	if (a.outputs != null) data.outputs = padMachinePath(a.outputs);
	if (a.log != null) data.log = a.log !== false;

	if (a.productions != null) {
		var team = [];
		var names = {};
		var p;

		try {
			team = padConfigData().PRODUCTIONS || [];
		} catch (err) { }

		for (p = 0; p < team.length; p++) if (!padIsLocalPath(team[p].templatesPath)) names[team[p].name.toUpperCase()] = true;

		for (p = 0; p < a.productions.length; p++) {
			var pname = String(a.productions[p].name || '').replace(/^\s+|\s+$/g, '');
			var ppath = String(a.productions[p].path || '').replace(/^\s+|\s+$/g, '');

			if (!pname && !ppath) continue;
			if (!pname || !ppath) throw new Error('#PAD_098 - produção local ' + (p + 1) + ': precisa de um nome e de uma pasta.');
			if (names[pname.toUpperCase()]) throw new Error('#PAD_098 - produção local "' + pname + '": já existe uma produção da equipe com esse nome.');

			names[pname.toUpperCase()] = true;
		}

		data.productions = padMachineProductions({ productions: a.productions });
	}
	if (a.localMode != null) data.localMode = a.localMode === true;
	if (a.search != null) data.search = padMachineSearch(a.search);
	if (a.fontsUpload != null) data.fontsUpload = a.fontsUpload !== false;

	if (data.localMode && !padLocalForced() && !padConfigCopyFile().exists) {
		// liga o modo local: guarda já a cópia da configuração, se a rede ainda estiver aí
		try {
			padConfigData();
		} catch (err) { }

		if (!padConfigCopyFile().exists) throw new Error('#PAD_096 - modo local: ainda não há uma cópia da configuração neste computador. abra a configuração uma vez com a rede conectada e ligue de novo.');
	}

	var folder = new Folder(scriptPreferencesPath);

	if (!folder.exists) folder.create();

	saveTextFile(JSON.stringify(data, null, '\t'), padMachineFile().fsName);
	PAD_MACHINE_CACHE.stamp = -1;
	padConfigInvalidate();

	// a sigla antiga sai: agora fica aqui
	var legacy = new File(scriptPreferencesPath + '/project_user.json');

	if (legacy.exists) legacy.remove();

	return PADX.machinePrefs();
};


// Caminho deste computador (não da rede): a pasta do usuário (~, /Users, /home), o disco do Mac
// (/Volumes/Macintosh HD) ou uma letra do Windows que não está no mapa de drives da rede (C:\...).
// Produções da equipe com caminho assim são ignoradas: cada um cria as suas em configuração > templates (neste computador).
function padIsLocalPath(path) {
	var p = String(path == null ? '' : path).replace(/^\s+|\s+$/g, '').replace(/\\/g, '/');

	if (/^~(\/|$)/.test(p) || /^\/(Users|home)\//i.test(p) || /^\/Volumes\/Macintosh HD(\/|$)/i.test(p)) return true;

	var drive = /^([A-Za-z]):(\/|$)/.exec(p);

	return !!drive && !(DRIVE_MAP && DRIVE_MAP[drive[1].toUpperCase()]);
}

// Produções locais (configuração > templates, neste computador): [{ name, path }], só deste computador, independentes das da
// equipe. Sem a lista ainda (versão anterior): as pastas deste computador escolhidas para as produções da
// equipe com caminho local (ex: Ω PASTA LOCAL) viram produções locais.
function padMachineProductions(d) {
	var out = [];
	var seen = {};
	var i;

	if (d.productions && typeof d.productions.length == 'number') {
		for (i = 0; i < d.productions.length; i++) {
			var row = d.productions[i] || {};
			var name = String(row.name == null ? '' : row.name).replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
			var path = padMachinePath(row.path);

			if (!name || !path || seen[name.toUpperCase()]) continue;

			seen[name.toUpperCase()] = true;
			out.push({ name: name, path: path });
		}

		return out;
	}

	var old = d.templates && typeof d.templates == 'object' ? d.templates : {};
	var team = [];

	try {
		team = padConfigData().PRODUCTIONS || [];
	} catch (err) { }

	for (i = 0; i < team.length; i++) {
		var local = padMachinePath(old[team[i].name]);

		if (local && padIsLocalPath(team[i].templatesPath)) out.push({ name: team[i].name, path: local });
	}

	return out;
}

// O registro de uso deste computador (configuração > meu usuário): ligado, segue o da equipe (aba rede).
function padMachineLog() {
	return padMachineData().log !== false;
}

// Cópia da configuração da equipe guardada neste computador (para o modo local).
function padConfigCopyFile() {
	return new File(scriptPreferencesPath + '/config_copy.json');
}

// Configuração da equipe COMPARTILHADA ('O_PADEIRO_GLOBAL_config.json'): fica na pasta do padeiro na rede,
// ao lado da pasta da extensão. o nome GLOBAL separa do arquivo das versões antigas ('O_PADEIRO_config.json'),
// que continuam lendo e gravando o seu sem estragar este. Procura, nesta ordem:
//   1. o caminho gravado pelo instalador em 'shared_config.txt' (pasta de dados do usuário; um caminho com o
//      nome antigo vale como a mesma pasta com o nome novo);
//   2. o arquivo na pasta que contém a pasta da extensão.
// Na primeira vez, só com o arquivo antigo na pasta: ele é copiado com o nome novo (o antigo fica).
var PAD_CONFIG_NAME = 'O_PADEIRO_GLOBAL_config.json';
var PAD_CONFIG_OLD_NAME = 'O_PADEIRO_config.json';

// a pasta do instalador (shared_config.txt) ou, sem ele, a de cima da extensão → o caminho com o nome novo
function padSharedConfigCandidates() {
	var out = [];
	var pointer = new File(scriptPreferencesPath + '/shared_config.txt');

	if (pointer.exists) {
		try {
			var path = readFileContent(pointer).replace(/^\s+|\s+$/g, '');

			if (path != '') out.push(new File(path).parent.fsName + '/' + PAD_CONFIG_NAME);
		} catch (err) { }
	}

	out.push(new Folder(PADX_HOST_PATH).parent.parent.fsName + '/' + PAD_CONFIG_NAME);

	return out;
}

// Caminho esperado da configuração da equipe: o que o instalador gravou ou, sem ele, o arquivo ao lado da extensão.
function padSharedConfigPath() {
	return padSharedConfigCandidates()[0];
}

function padSharedConfigFile() {
	var list = padSharedConfigCandidates();

	for (var i = 0; i < list.length; i++) {
		var file = new File(list[i]);

		if (file.exists) return file;

		// migração: só o arquivo antigo nesta pasta → a cópia com o nome novo
		var old = new File(file.parent.fsName + '/' + PAD_CONFIG_OLD_NAME);

		if (old.exists) {
			try {
				old.copy(file.fsName);
			} catch (err) { }

			return file.exists ? file : old;
		}
	}

	return null;
}

// Arquivo da lista de produções: o compartilhado na rede (todos usam a lista mais atual). No modo local
// ligado, a cópia guardada neste computador na última leitura da rede (sem tocar na rede).
function padConfigFile() {
	var copy = padConfigCopyFile();

	if (padLocalForced()) return copy.exists ? copy : null;

	// sem a rede: a cópia (só leitura), para o padeiro continuar funcionando
	return padSharedConfigFile() || (copy.exists ? copy : null);
}

// A configuração lida agora é a cópia deste computador (modo local ligado ou rede fora)?
// (usa a leitura guardada de padConfigData: no máximo uma ida à rede a cada 1,5 s)
function padConfigIsCopy() {
	try {
		padConfigData();
	} catch (err) { }

	return PAD_CONFIG_CACHE.path != '' && PAD_CONFIG_CACHE.path == padConfigCopyFile().fsName;
}

// Conteúdo da configuração compartilhada, já interpretado. O arquivo fica na rede e é lido por várias
// seções e janelas o tempo todo: só é lido de novo quando a data dele muda, e a data é conferida no máximo
// a cada 1,5 s. Quem usa não altera o objeto (as funções padClean* devolvem cópias).
// Lança Error se não houver arquivo ou se ele não for um JSON válido.
var PAD_CONFIG_CACHE = { path: '', stamp: -1, data: null, error: null, checked: 0 };

function padConfigData() {
	var c = PAD_CONFIG_CACHE;
	var now = new Date().getTime();

	if (now - c.checked < 1500 && c.stamp != -1) {
		if (c.error) throw c.error;

		return c.data;
	}

	c.checked = now;

	var file = padConfigFile();

	if (!file) {
		c.stamp = -1;
		c.path = '';
		throw new Error(padNoSharedListError());
	}

	var stamp = file.modified.getTime();

	if (file.fsName != c.path || stamp != c.stamp) {
		c.path = file.fsName;
		c.stamp = stamp;
		c.data = null;
		c.error = null;

		try {
			var text = readFileContent(file);

			c.data = JSON.parse(text);

			// lida da rede: guarda a cópia para o modo local (e para quando a rede cair)
			if (file.fsName != padConfigCopyFile().fsName) {
				try {
					var folder = new Folder(scriptPreferencesPath);

					if (!folder.exists) folder.create();
					saveTextFile(text, padConfigCopyFile().fsName);
				} catch (err) { }
			}
		} catch (err) {
			c.error = err;
		}
	}

	if (c.error) throw c.error;

	return c.data;
}

// Depois de gravar: a próxima leitura vai ao arquivo (a data pode não mudar em menos de 1 s na rede).
function padConfigInvalidate() {
	PAD_CONFIG_CACHE.stamp = -1;
	PAD_CONFIG_CACHE.checked = 0;
}

function padNoSharedListError() {
	if (padLocalForced()) return '#PAD_096 - modo local: não há uma cópia da configuração neste computador. desligue o modo local (configuração > meu usuário) com a rede conectada.';

	return '#PAD_064 - lista de produções compartilhada não encontrada: ' + padDisplayPath(padSharedConfigPath()) + '. verifique a conexão com a rede (o arquivo fica junto do padeiro).';
}

// Config do template: o que está no arquivo + o que falta, do padrão.
function padReadTemplateConfig(configFile) {
	var data = JSON.parse(readFileContent(configFile));

	for (var o in defaultTemplateConfigObj) {
		if (data.hasOwnProperty(o)) continue;

		data[o] = defaultTemplateConfigObj[o];
	}

	return data;
}

// Arquivos auxiliares do template (mesma base do nome do projeto).
function padTemplateFiles(projectFile) {
	var base = projectFile.path + '/' + deleteFileExt(projectFile.displayName);

	return {
		preview: new File(base + '_preview.png'),
		// vídeo de preview (opcional): '_preview.webm' ou '_preview.mp4'; sem vídeo, vale o png
		videos: [new File(base + '_preview.webm'), new File(base + '_preview.mp4')],
		config: new File(base + '_config.json'),
		script: new File(base + '_script.js')
	};
}

// Os grupos de desfazer (Ctrl+Z) do padeiro: um só por vez. um grupo dentro de outro entra no de fora (o After
// Effects reclama de grupos aninhados ou deixados abertos: "Undo group mismatch, will attempt to fix") e, no fim de
// cada chamada do painel, o que tiver ficado aberto é fechado (PADX_call).
var PAD_UNDO_DEPTH = 0;

function padUndoBegin(name) {
	if (PAD_UNDO_DEPTH++ == 0) app.beginUndoGroup(name);
}

function padUndoEnd() {
	if (PAD_UNDO_DEPTH <= 0) return;
	if (--PAD_UNDO_DEPTH == 0) app.endUndoGroup();
}

function padUndoClose() {
	if (PAD_UNDO_DEPTH > 0) {
		PAD_UNDO_DEPTH = 0;

		try {
			app.endUndoGroup();
		} catch (err) { }
	}
}

function padGroup(name, fn) {
	padUndoBegin(name);

	try {
		return fn();
	} finally {
		padUndoEnd();
	}
}

/*

---------------------------------------------------------------
> ambiente
---------------------------------------------------------------

*/

PADX.ping = function () {
	return {
		app: app.appName,
		build: app.buildName,
		os: appOs,
		version: PADX_VERSION,
		network: netAccess(),
		localMode: padLocalMode(),
		localForced: padLocalForced()
	};
};

// Lista de produções (nome, pasta de templates e ícone).
PADX.productions = function () {
	var configFile = padConfigFile();
	var list;
	var error = null;

	if (!configFile) return { configPath: padDisplayPath(padSharedConfigPath()), shared: false, stamp: 0, productions: [], error: padNoSharedListError() };

	try {
		list = padConfigData().PRODUCTIONS; // na ordem do arquivo (o editor arrasta para reordenar)
	} catch (err) {
		error = configFile.exists ? err.message : 'arquivo de produções não encontrado';
		list = [];
	}

	var productions = [];

	for (var i = 0; i < list.length; i++) {
		productions.push({
			name: list[i].name,
			templatesPath: list[i].templatesPath, // o da equipe (o editor da configuração edita este)
			path: list[i].templatesPath,
			ignored: padIsLocalPath(list[i].templatesPath), // caminho deste computador: fora do painel (cada um cria a sua)
			icon: list[i].icon || null // literal de string binária (PNG); decodificado no painel
		});
	}

	return {
		configPath: configFile.fsName,
		shared: true,
		stamp: configFile.exists ? configFile.modified.getTime() : 0,
		productions: productions,
		localProductions: padMachineProductions(padMachineData()), // as produções locais (configuração > templates, neste computador)
		localMode: padLocalMode(), // no modo local, o painel mostra só as locais
		log: padReadLogSettings(),
		drives: padReadDrives(),
		rename: padReadRename(),
		organize: padReadOrganize(),
		search: padReadSearch(),
		links: padReadLinks(),
		appearance: padReadTeamAppearance(), // o padrão da equipe (a pessoa pode personalizar: personal)
		project: padReadProject(),
		collect: padReadCollect(),
		bar: padReadTeamBar(),
		fonts: padReadFonts(),
		personal: PADX.personalPrefs(),
		localMode: padLocalMode(),
		localForced: padLocalForced(),
		fromCopy: padConfigIsCopy(),
		error: error
	};
};

/*

---------------------------------------------------------------
> log dos preenchimentos
---------------------------------------------------------------

Definido na lista de produções compartilhada ('LOG' no O_PADEIRO_GLOBAL_config.json), editável no painel de
produções: 'webhook' (envia o registro para a URL), 'csv' (uma linha em 'O_PADEIRO_log.csv', na pasta de
templates da produção usada) ou 'off' (nenhum registro). Sem 'LOG' no arquivo: o webhook de sempre.

*/

var PAD_LOG_FILE_NAME = 'O_PADEIRO_log.csv';
var PAD_LOG_COLUMNS = ['data', 'producao', 'template', 'quantidade', 'user', 'work_station', 'caminho'];

function padDefaultLog() {
	return { mode: 'webhook', webhook: 'https://workflows.jmbillard.com/webhook/log_db_padeiro' };
}

// Valida a config de log vinda do painel. Lança Error com a mensagem.
function padCleanLog(log) {
	var clean = padDefaultLog();

	if (!log) return clean;

	clean.mode = log.mode == 'csv' || log.mode == 'csvGlobal' || log.mode == 'off' ? log.mode : 'webhook';
	clean.webhook = String(log.webhook == null ? '' : log.webhook).replace(/^\s+|\s+$/g, '');

	// sem aspas, espaços e símbolos do terminal: o endereço vai para a linha de comando do curl
	if (clean.mode == 'webhook' && !/^https?:\/\/[^\s"'`$\\;&|<>]+$/i.test(clean.webhook)) {
		throw new Error('#PAD_078 - log: endereço do webhook inválido (comece com http:// ou https://, sem espaços nem aspas).');
	}

	return clean;
}

function padReadLogSettings() {
	try {
		var data = padConfigData();

		return data.LOG ? padCleanLog(data.LOG) : padDefaultLog();
	} catch (err) {
		return padDefaultLog();
	}
}

function padCsvValue(value) {
	return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
}

// Pasta de templates de uma produção da lista (onde fica o CSV do log).
function padProductionFolder(name) {
	var config = padConfigFile();

	if (!name) return null;

	var list = [];

	try {
		if (config && config.exists) list = JSON.parse(readFileContent(config)).PRODUCTIONS || [];
	} catch (err) { }

	for (var i = 0; i < list.length; i++) {
		if (list[i].name == name && !padIsLocalPath(list[i].templatesPath)) return new Folder(padPath(list[i].templatesPath));
	}

	// as produções locais (configuração > templates, neste computador)
	var personal = padMachineProductions(padMachineData());

	for (var p = 0; p < personal.length; p++) {
		if (personal[p].name == name) return new Folder(padPath(personal[p].path));
	}

	return null;
}

// Acrescenta linhas ao CSV de uma pasta (um arquivo só por produção). Devolve false se não conseguiu gravar.
function padAppendCsv(folderPath, lines) {
	var folder = new Folder(folderPath);

	if (!folder.exists) return false;

	var file = new File(folder.fsName + '/' + PAD_LOG_FILE_NAME);
	var isNew = !file.exists;

	file.encoding = 'UTF-8';
	file.lineFeed = 'Unix';

	// aberto no Excel (bloqueado) ou rede fora: fica para a próxima
	if (!file.open('a')) return false;

	// arquivo novo: BOM (o Excel reconhece os acentos) e o cabeçalho; ';' é o separador do Excel em pt-BR
	var ok = isNew ? file.write('\uFEFF' + PAD_LOG_COLUMNS.join(';') + '\n') : true;

	ok = ok && file.write(lines.join('\n') + '\n');
	file.close();

	return ok !== false;
}

// Linhas que não puderam ser gravadas, guardadas na máquina até a próxima vez: [{ folder, line }]
function padPendingLogFile() {
	return new File(scriptPreferencesPath + '/log_pendente.json');
}

function padWriteLog(record) {
	var settings = padReadLogSettings();

	if (settings.mode == 'off' || !padMachineLog()) return; // desligado pela equipe ou neste computador
	var local = padLocalMode();

	if (settings.mode == 'webhook') return local ? null : sendToWebhookWithCurl(record, settings.webhook);

	// CSV global: ao lado da lista de produções (na rede); por produção: na pasta de templates dela
	var config = local ? new File(padSharedConfigPath()) : padConfigFile();
	var folder = settings.mode == 'csvGlobal' ? (config && (local || config.exists) ? config.parent : null) : padProductionFolder(record.producao);
	var line = [];

	for (var c = 0; c < PAD_LOG_COLUMNS.length; c++) line.push(padCsvValue(record[PAD_LOG_COLUMNS[c]]));

	var pendingFile = padPendingLogFile();
	var pending = [];

	if (pendingFile.exists) {
		try {
			pending = JSON.parse(readFileContent(pendingFile)) || [];
		} catch (err) { }
	}

	if (folder) pending.push({ folder: folder.fsName, line: line.join(';') });

	// modo local: nada na rede; as linhas esperam a volta (gravadas no próximo preenchimento fora dele)
	if (local) {
		if (pending.length) saveTextFile(JSON.stringify(pending), pendingFile.fsName);

		return;
	}

	// agrupa por pasta, mantendo a ordem; o que não puder ser gravado continua pendente
	var folders = [];
	var lines = {};
	var left = [];

	for (var i = 0; i < pending.length; i++) {
		if (!lines[pending[i].folder]) {
			lines[pending[i].folder] = [];
			folders.push(pending[i].folder);
		}

		lines[pending[i].folder].push(pending[i].line);
	}

	for (var f = 0; f < folders.length; f++) {
		if (padAppendCsv(folders[f], lines[folders[f]])) continue;

		for (var l = 0; l < lines[folders[f]].length; l++) left.push({ folder: folders[f], line: lines[folders[f]][l] });
	}

	if (left.length) saveTextFile(JSON.stringify(left), pendingFile.fsName);
	else if (pendingFile.exists) pendingFile.remove();
}

// Produção escolhida na barra principal, gravada em 'selected_production.json'.
PADX.selectedProduction = function () {
	var file = new File(scriptPreferencesPath + '/selected_production.json');
	var list = padConfigFile();
	var stamp = list && list.exists ? list.modified.getTime() : 0; // a lista mudou (editor, script ou outra pessoa)?
	var name = null;

	if (file.exists) {
		try {
			name = JSON.parse(readFileContent(file)).name || null;
		} catch (err) { }
	}

	return { name: name, stamp: stamp };
};

// Grava a produção escolhida (a barra principal escolhe, o painel de templates acompanha).
PADX.setProduction = function (a) {
	saveTextFile(JSON.stringify({ name: a.name }), scriptPreferencesPath + '/selected_production.json');

	return { name: a.name };
};

// Fixados e recentes dos templates: preferência de cada máquina, num arquivo da pasta temp local
// ({ "<produção>": { favorites: [uri], recents: [uri], renderPresets: { uri: preset } } }), com o
// último preset de render usado em cada um. A lista de produções é que é compartilhada.
function padTemplateListsFile() {
	return new File(tempPath + '/template_lists.json');
}

function padReadTemplateLists() {
	var file = padTemplateListsFile();

	if (!file.exists) return {};

	try {
		var data = JSON.parse(readFileContent(file));

		return data && typeof data == 'object' ? data : {};
	} catch (err) {
		return {};
	}
}

// a: { production }
PADX.templateLists = function (a) {
	var item = padReadTemplateLists()[a.production] || {};

	return { favorites: item.favorites || [], recents: item.recents || [], renderPresets: item.renderPresets || {} };
};

// a: { production, favorites, recents, renderPresets }
PADX.saveTemplateLists = function (a) {
	var all = padReadTemplateLists();

	all[a.production] = { favorites: a.favorites || [], recents: a.recents || [], renderPresets: a.renderPresets || {} };
	saveTextFile(JSON.stringify(all, null, '\t'), padTemplateListsFile().fsName);

	return { ok: true };
};

// Cópia da última árvore de templates lida de cada produção (pasta temp local): a janela de templates
// mostra a lista na hora ao abrir e relê a pasta em segundo plano. A árvore vai e volta como texto
// (JSON feito pelo painel), sem passar pelo JSON do ExtendScript, que é lento com listas grandes.
function padTreeCacheFile(production) {
	var folder = new Folder(tempPath + '/template_trees');

	if (!folder.exists) folder.create();

	return new File(folder.fsName + '/' + String(production).replace(/[\\\/:*?"<>|]+/g, '_') + '.json');
}

// a: { production } → { text } ('' sem cópia)
PADX.templateTreeCache = function (a) {
	var file = padTreeCacheFile(a.production);

	return { text: file.exists ? readFileContent(file) : '' };
};

// a: { production, text }
PADX.saveTemplateTreeCache = function (a) {
	saveTextFile(String(a.text || ''), padTreeCacheFile(a.production).fsName);

	return { ok: true };
};

PADX.openFolder = function (a) {
	var folder = new Folder(padMountedPath(padPath(a.path))); // no volume montado (VFX-1…); monta o share se preciso

	if (!folder.exists) throw new Error('#PAD_019 - pasta não encontrada: ' + folder.fsName);

	openFolder(folder.fsName);

	return true;
};

/*

---------------------------------------------------------------
> templates
---------------------------------------------------------------

*/

// Lista UMA pasta (sem descer nas subpastas), na ordem do sistema: { exists, path, name, entries }.
// O painel percorre a árvore pasta a pasta, em chamadas curtas, para o After Effects não ficar
// ocupado por muito tempo de uma vez (o painel continua animando e mostra o andamento).
// a: { path } (caminho de uma produção, normalizado aqui) ou { uri } (subpasta já listada)
PADX.listDir = function (a) {
	var path = a.uri ? a.uri : padPath(a.path);
	var folder = new Folder(path);

	if (!folder.exists) return { exists: false, path: padDisplayPath(path), name: '', entries: [] };

	var items = folder.getFiles();
	var entries = [];

	for (var i = 0; i < items.length; i++) {
		var name = items[i].displayName;

		if (items[i] instanceof Folder) {
			entries.push({ type: 'folder', name: name, uri: items[i].absoluteURI });
		} else if (PADX_TEMPLATE_EXT.indexOf(getFileExt(name)) >= 0) {
			entries.push({ type: 'item', name: name, uri: items[i].absoluteURI, fsName: items[i].fsName });
		}
	}

	return { exists: true, path: padDisplayPath(path), name: folder.displayName, entries: entries };
};

// Preview, configuração e dicas de um template.
PADX.templateInfo = function (a) {
	var projectFile = new File(a.uri);

	if (!projectFile.exists) throw new Error('#PAD_018 - arquivo do template não encontrado');

	var files = padTemplateFiles(projectFile);
	var info = {
		uri: projectFile.absoluteURI,
		name: deleteFileExt(projectFile.displayName),
		folder: Folder.decode(projectFile.parent.fsName),
		preview: files.preview.exists ? files.preview.fsName : null,
		video: null,
		hasConfig: files.config.exists,
		hasScript: files.script.exists,
		hasInputLayers: false,
		defaults: defaultTemplateConfigObj,
		config: null,
		configError: null
	};

	for (var v = 0; v < files.videos.length; v++) {
		if (files.videos[v].exists) {
			info.video = files.videos[v].fsName;
			break;
		}
	}

	if (files.config.exists) {
		try {
			info.config = padReadTemplateConfig(files.config);
			info.hasInputLayers = info.config.inputLayers != null;
		} catch (err) {
			info.configError = '#PAD_017 - esse template não tem um arquivo de configuração válido!';
		}
	}

	return info;
};

// Caminho no formato do sistema atual (rede Windows / macOS), como o criador de templates grava.
PADX.normalizePath = function (a) {
	return { path: padNoVolumeSuffix(padPath(a.path)) };
};

// Grava o '_config.json' do template (cria o arquivo se ele ainda não existir).
// a: { uri, config }
PADX.saveTemplateConfig = function (a) {
	var projectFile = new File(a.uri);

	if (!projectFile.exists) throw new Error('#PAD_018 - arquivo do template não encontrado');

	var cfg = a.config;
	var cases = ['upperCase', 'lowerCase', 'titleCase', 'freeCase'];

	if (!cfg || typeof cfg !== 'object') throw new Error('#PAD_044 - configuração inválida');
	if (!cfg.atracao || String(cfg.atracao.name || '').trim() == '') throw new Error('#PAD_044 - escolha a atração do template');
	if (String(cfg.configName).trim() == '') throw new Error('#PAD_044 - preencha o que é (o nome do template)');
	if (String(cfg.compName).trim() == '') throw new Error('#PAD_044 - preencha o nome da comp principal');
	if (cases.indexOf(cfg.textCase) < 0) throw new Error('#PAD_044 - tipo de caixa de texto inválido: ' + cfg.textCase);
	if (typeof cfg.refTime !== 'number' || isNaN(cfg.refTime) || cfg.refTime < 0) throw new Error('#PAD_044 - tempo de referência inválido');
	if (!(cfg.inputLayers instanceof Array)) throw new Error('#PAD_044 - lista de layers inválida');
	if (!(cfg.outputPath instanceof Array) || cfg.outputPath.length == 0) throw new Error('#PAD_044 - informe ao menos uma pasta de output');

	for (var l = 0; l < cfg.inputLayers.length; l++) {
		var layer = cfg.inputLayers[l];

		if (typeof layer.layerIndex !== 'number' || layer.layerIndex < 1) throw new Error('#PAD_044 - índice de layer inválido na informação ' + (l + 1));
		if (layer.method != 'textContent' && layer.method != 'layerName') throw new Error('#PAD_044 - método inválido na informação ' + (l + 1));
	}

	// efeito de variações é opcional
	if (cfg.inputFx == null) {
		delete cfg.inputFx;
	} else if (!(cfg.inputFx.options instanceof Array) || cfg.inputFx.options.length == 0 || String(cfg.inputFx.fxName).trim() == '') {
		throw new Error('#PAD_044 - efeito de variações incompleto');
	} else if (cfg.inputFx.kind == 'checkbox' && cfg.inputFx.options.length > 2) {
		throw new Error('#PAD_044 - efeito de variações: um checkbox tem só 2 opções (desligado e ligado)');
	}

	var configFile = padTemplateFiles(projectFile).config;

	try {
		saveTextFile(JSON.stringify(cfg, null, '\t'), configFile.fsName);

		// confere o que foi gravado
		JSON.parse(readFileContent(new File(configFile.fsName)));
	} catch (err) {
		throw new Error('#PAD_045 - não foi possível gravar o arquivo de configuração: ' + err.message);
	}

	return { path: configFile.fsName };
};

/*

---------------------------------------------------------------
> fontes do template
---------------------------------------------------------------

O criador de templates copia as fontes do projeto para '<pasta do template>/FONTS'. Antes de importar,
o painel confere quais desses arquivos não estão instalados: sem isso o After Effects abre a janela
"Resolve Fonts" e troca as fontes pela padrão.

*/

// Pastas onde o sistema guarda as fontes instaladas.
function padSystemFontFolders() {
	if (appOs == 'Win') {
		var folders = [Folder.decode($.getenv('WINDIR') || 'C:/Windows') + '/Fonts'];
		var local = $.getenv('LOCALAPPDATA');

		if (local) folders.push(Folder.decode(local) + '/Microsoft/Windows/Fonts');

		return folders;
	}

	return ['~/Library/Fonts', '/Library/Fonts', '/System/Library/Fonts', '/System/Library/Fonts/Supplemental', '/Network/Library/Fonts'];
}

// Nomes (em minúsculas) dos arquivos de fonte instalados: pastas do sistema e, no After Effects 24+,
// o arquivo de cada fonte que o próprio After Effects conhece (inclui gerenciadores de fontes).
function padInstalledFontFiles() {
	var names = {};
	var folders = padSystemFontFolders();

	for (var f = 0; f < folders.length; f++) {
		var folder = new Folder(folders[f]);

		if (!folder.exists) continue;

		var files = folder.getFiles();

		for (var i = 0; i < files.length; i++) {
			if (files[i] instanceof File) names[File.decode(files[i].name).toLowerCase()] = true;
		}
	}

	try {
		var groups = app.fonts.allFonts;

		for (var g = 0; g < groups.length; g++) {
			for (var k = 0; k < groups[g].length; k++) {
				var font = groups[g][k];
				var location = '';

				try {
					if (font.isSubstitute) continue;
					location = font.location;
				} catch (err) { }

				if (location) names[File.decode(new File(location).name).toLowerCase()] = true;

				// o Adobe Fonts guarda os arquivos com nomes embaralhados, numa pasta escondida: vale o nome da fonte
				// (PostScript, e a família + o estilo), que é como o arquivo do template costuma se chamar
				try {
					names['#' + padFontKey(font.postScriptName)] = true;
					names['#' + padFontKey(font.familyName + font.styleName)] = true;
				} catch (err) { }
			}
		}
	} catch (err) { } // After Effects antes da versão 24 não tem app.fonts

	return names;
}

// O nome de uma fonte para comparar: só letras e números, em minúsculas (MyriadPro-Regular → myriadproregular)
function padFontKey(name) {
	return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// A fonte do arquivo está instalada? pelo nome do arquivo (pastas do sistema) ou, sem ele, pelo nome da fonte:
// o arquivo do template (MyriadPro-Regular.otf) com a fonte do Adobe Fonts ativa (MyriadPro-Regular)
function padFontFileInstalled(installed, fileName) {
	if (installed[fileName.toLowerCase()]) return true;

	var base = padFontKey(fileName.replace(/\.[^.]+$/, ''));

	return !!base && !!installed['#' + base];
}

function padTemplateFontsFolder(uri) {
	return new Folder(new File(uri).parent.fsName + '/FONTS');
}

// Fontes da pasta FONTS do template que não estão instaladas. a: { uri }
PADX.templateFonts = function (a) {
	var projectFile = new File(a.uri);

	if (!projectFile.exists) throw new Error('#PAD_018 - arquivo do template não encontrado');

	var folder = padTemplateFontsFolder(a.uri);

	if (!folder.exists) return { hasFolder: false, total: 0, missing: [] };

	var files = getFontFiles(folder, []);
	var installed = padInstalledFontFiles();
	var missing = [];

	for (var i = 0; i < files.length; i++) {
		var name = File.decode(files[i].name);

		if (!padFontFileInstalled(installed, name)) missing.push(name);
	}

	return { hasFolder: true, total: files.length, missing: missing };
};

// Instala as fontes da pasta FONTS do template e confere de novo. a: { uri }
PADX.installTemplateFonts = function (a) {
	var folder = padTemplateFontsFolder(a.uri);

	if (!folder.exists) throw new Error('#PAD_006 - a pasta de fontes não foi localizada...');

	var res = installFonts(folder.fsName); // Windows ou macOS, sem janelas

	return { messages: res.errors.length ? ['não foi possível instalar: ' + res.errors.join(', ')] : [], data: PADX.templateFonts(a) };
};

// Importa o projeto do template. 'quiet': a pessoa já sabe das fontes faltando, então a janela
// "Resolve Fonts" (e outros avisos da importação) não aparece.
function padImportProject(projectFile, quiet) {
	if (quiet) app.beginSuppressDialogs();

	try {
		app.project.importFile(new ImportOptions(projectFile));
	} finally {
		if (quiet) app.endSuppressDialogs(false);
	}
}

// Importa o template para o projeto e organiza (duplo clique na lista). a: { uri, quiet }
PADX.importTemplate = function (a) {
	var projectFile = new File(a.uri);

	if (!projectFile.exists) throw new Error('#PAD_022 - arquivo do template não encontrado');

	padGroup('Importar Template', function () {
		padImportProject(projectFile, a.quiet);

		deleteProjectFolders();
		populateProjectFolders();
		deleteEmptyProjectFolders();

		padRegisterTemplateUse({ name: decodeURI(projectFile.parent.name), path: decodeURI(projectFile.path) });
	});

	return { name: projectFile.displayName };
};

/*

---------------------------------------------------------------
> preenchimento
---------------------------------------------------------------

*/

// Passo 1: importa o template, prepara os itens a criar e lista os templates de render.
// a: { uri, text, quiet }
PADX.fillBegin = function (a) {
	var projectFile = new File(a.uri);
	var files = padTemplateFiles(projectFile);

	if (!projectFile.exists) throw new Error('#PAD_018 - arquivo do template não encontrado');
	if (!files.config.exists) throw new Error('#PAD_017 - esse template não tem arquivo de configuração');

	var templateData = padReadTemplateConfig(files.config);
	var text = String(a.text);

	if (text.trim() == '') throw new Error('#PAD_046 - o texto de input está vazio');

	// Ajusta a caixa do texto
	if (templateData.textCase == 'upperCase') text = text.toUpperCase();
	if (templateData.textCase == 'lowerCase') text = text.toLowerCase();
	if (templateData.textCase == 'titleCase') text = text.toTitleCase();

	var inputTextArray = text.split(/[\n\r]{2,}/);

	return padGroup('O PADEIRO: importar template', function () {
		// Define configurações do projeto
		app.project.bitsPerChannel = 8;
		app.project.expressionEngine = 'javascript-1.0';
		app.project.linearBlending = true;
		app.project.timeDisplayType = TimeDisplayType.TIMECODE;

		// Importação do arquivo de projeto
		padImportProject(projectFile, a.quiet);

		// Busca a comp original
		var templateComp = null;

		for (var i = 1; i <= app.project.numItems; i++) {
			var comp = app.project.item(i);

			if (!(comp instanceof CompItem)) continue;
			if (!comp.comment.match(/^TEMPLATE/)) continue;
			if (comp.name != templateData.compName) continue;

			templateComp = comp;
			break;
		}

		if (!templateComp) {
			throw new Error('#PAD_018 - comp "' + templateData.compName + '" (comentário TEMPLATE) não encontrada no projeto');
		}

		// Extrai e filtra a lista de templates de render
		var renderTemplates = [];
		var rqItem = app.project.renderQueue.items.add(templateComp);

		try {
			renderTemplates = rqItem.outputModule(1).templates;

			var tIndex = renderTemplates.length - 1;

			// Remove templates ocultos
			while (tIndex >= 0 && renderTemplates[tIndex].toString().match(/^_HIDDEN\s/)) {
				renderTemplates.pop();
				tIndex--;
			}
		} finally {
			rqItem.remove();
		}

		var suffixArray = templateData.inputFx != null ? templateData.inputFx.options : [''];
		var ignore = !!String(templateData.prefix || '').match(/ignore/i);
		var jobs = [];

		if (ignore) {
			// Templates com prefixo 'ignore' não são processados (podem ser manipulados por um script externo)
			jobs.push({ n: 0, f: 0, label: templateComp.name });
		} else {
			for (var n = 0; n < inputTextArray.length; n++) {
				for (var f = 0; f < suffixArray.length; f++) {
					jobs.push({ n: n, f: f, label: inputTextArray[n].split(/[\n\r]+/).join(' / ') + (suffixArray[f] ? ' · ' + suffixArray[f] : '') });
				}
			}
		}

		var renderList = [];

		for (var r = 0; r < renderTemplates.length; r++) {
			renderList.push(renderTemplates[r].toString());
		}

		PADX_run = {
			production: PADX.selectedProduction().name, // a produção do template (só dá para preencher os da produção escolhida)
			projectFile: projectFile,
			files: files,
			templateData: templateData,
			templateComp: templateComp,
			inputTextArray: inputTextArray,
			suffixArray: suffixArray,
			ignore: ignore,
			jobs: jobs,
			newComps: [],
			newOutputs: [],
			renderTemplates: renderList,
			count: 0
		};

		// Compatibilidade com scripts externos de template ('_script.js')
		$.global.templateData = templateData;
		$.global.inputTextArray = inputTextArray;
		$.global.newCompsArray = PADX_run.newComps;
		$.global.newOutputsArray = PADX_run.newOutputs;

		return { total: jobs.length, jobs: jobs, templateName: projectFile.displayName };
	});
};

// Passo 2: cria e preenche uma comp (item 'index' de jobs).
PADX.fillStep = function (a) {
	var run = PADX_run;

	if (!run) throw new Error('#PAD_047 - nenhum preenchimento em andamento');

	var job = run.jobs[a.index];
	var templateData = run.templateData;
	var template = null;

	return padGroup('O PADEIRO: preencher template', function () {
		try {
			if (run.ignore) {
				run.newComps.push(run.templateComp);
				run.templateComp.openInViewer();
				run.count++;

				return { name: run.templateComp.name };
			}

			var inputText = run.inputTextArray[job.n];
			var inputLayerList = templateData.inputLayers;
			var infoArray = [inputText];

			// Comp duplicada que será editada
			template = run.templateComp.duplicate();

			if (templateData.separator != '') {
				// Pattern de separação de informações
				var sPattern = new RegExp(templateData.separator.replace(/\s/g, '\\s'), 'i');

				if (templateData.separator == '\n') sPattern = new RegExp('[\\n\\r]', 'i');

				infoArray = inputText.split(sPattern); // ex: título e subtítulo --> ['A.X.L', 'O CÃO ROBÔ']
			}

			// Define o valor do efeito
			if (templateData.inputFx != null) {
				template
					.layer(templateData.inputFx.layerIndex)
					.property('ADBE Effect Parade')
					.property(templateData.inputFx.fxName)
					.property(templateData.inputFx.optionIndex)
					.setValue(templateData.inputFx.kind == 'checkbox' ? job.f : job.f + 1); // checkbox: 0 desligado, 1 ligado; menu: 1, 2, 3…
			}

			// Preenche a informação nos layers editáveis
			for (var l = 0; l < inputLayerList.length; l++) {
				var inputLayer = template.layer(inputLayerList[l].layerIndex);

				// Desabilita o layer se o índice dele for maior que o número de informações
				if (l >= infoArray.length) {
					inputLayer.enabled = false;
					continue;
				}

				if (infoArray[l] == '') continue;

				// Conteúdo do layer (apenas layers de texto)
				if (inputLayerList[l].method == 'textContent') {
					if (!(inputLayer instanceof TextLayer)) continue;

					infoArray[l] = infoArray[l].trim();

					var text = inputLayer.property('ADBE Text Properties');
					var textDoc = text.property('ADBE Text Document').value;

					textDoc.text = infoArray[l];
					text.property('ADBE Text Document').setValue(textDoc);
				}

				// Nome do layer (qualquer layer)
				if (inputLayerList[l].method == 'layerName') {
					inputLayer.name = infoArray[l].trim();
				}
			}

			var info = infoArray.join(' ').replace(/[\s\-]+/g, ' ');
			var suffix = run.suffixArray[job.f];

			// Define o nome do template
			if (!overwriteCompName(template)) {
				// sem prefixo, o nome é só a informação (ex: 'JOAO BOSCO D')
				var prefix = String(templateData.prefix || '').replace(/^\s+|\s+$/g, '');

				template.name = ((prefix ? prefix + globalSeparator : '') + [info, suffix].join(' ')).toUpperCase().replaceSpecialCharacters(); // --> 'RDP - JOAO BOSCO D'
			}

			template.openInViewer(); // Abre a composição preenchida
			template.time = templateData.refTime; // move a agulha da timeline para o tempo de referência
			template.comment = PAD_ORGANIZE.autoComment; // comentário de render (configuração > organizar)

			run.newComps.push(template);
			run.count++;

			return { name: template.name };
		} catch (err) {
			// não deixa uma comp pela metade no projeto
			try {
				if (template) template.remove();
			} catch (e) { }

			throw err;
		}
	});
};

// Passo 3: remove o template original, organiza o projeto, registra o log e os metadados.
PADX.fillFinish = function () {
	var run = PADX_run;

	if (!run) throw new Error('#PAD_047 - nenhum preenchimento em andamento');

	var warnings = [];

	padGroup('O PADEIRO: organizar projeto', function () {
		// Remove o template original caso o prefixo não seja 'ignore'
		if (!run.ignore) {
			try {
				run.templateComp.remove();
			} catch (err) { }
		}

		// Define a pasta de importação padrão do projeto
		try {
			app.project.setDefaultImportFolder(new Folder(padMountedPath(padPath(run.templateData.importPath)))); // no volume montado (VFX-1…)
		} catch (err) { }

		// Organização do projeto
		deleteProjectFolders();
		populateProjectFolders();
		deleteEmptyProjectFolders();

		// os dados do padeiro: o template (as fontes saem da pasta dele), a produção e o que faltar
		try {
			padRegisterTemplateUse({ name: run.templateData.configName || decodeURI(run.projectFile.parent.name), path: decodeURI(run.projectFile.path), producao: run.production || '', output: (run.templateData.outputPath || [])[0] });
		} catch (err) {
			warnings.push('metadados: ' + err.message);
		}
	});

	// Registro de dados (log), como a lista de produções define — falha silenciosa: não pode atrapalhar o trabalho
	try {
		var dt = new Date();
		var pad2 = function (n) {
			return n < 10 ? '0' + n : String(n);
		};

		padWriteLog({
			producao: run.production || '',
			template: run.templateData.configName,
			quantidade: run.count,
			user: system.userName,
			work_station: system.machineName.replaceSpecialCharacters(),
			data: [dt.getFullYear(), pad2(dt.getMonth() + 1), pad2(dt.getDate())].join('-') + ' ' + pad2(dt.getHours()) + ':' + pad2(dt.getMinutes()),
			caminho: run.projectFile.fsName
		});
	} catch (err) { }

	return {
		count: run.count,
		renderTemplates: run.renderTemplates,
		preferredTemplate: padPreferredH264(run.renderTemplates), // padrão sem preset lembrado (maker.jsx)
		outputPath: padDisplayPaths(run.templateData.outputPath),
		warnings: warnings
	};
};

/*

---------------------------------------------------------------
> fila de render
---------------------------------------------------------------

*/

// O compartilhamento do caminho está acessível? macOS: /Volumes/SHARE com a primeira pasta do caminho dentro;
// Windows: \\servidor\share (ou a letra do drive) existe.
function padShareReachable(path) {
	var p = String(path || '').replace(/\\/g, '/');
	var mac = p.match(/^\/Volumes\/[^\/]+\/([^\/]+)/);

	if (mac) return padVolumeHas(p, mac[1]);

	var unc = p.match(/^\/\/[^\/]+\/[^\/]+/);

	if (unc) return new Folder(unc[0]).exists;

	var drive = p.match(/^[A-Za-z]:\//);

	return drive ? new Folder(drive[0]).exists : false;
}

// Verifica as pastas de output. a: { outputTemplate }
PADX.queueBegin = function (a) {
	var run = PADX_run;

	if (!run) throw new Error('#PAD_047 - nenhum preenchimento em andamento');
	if (!a.outputTemplate) throw new Error('#PAD_048 - selecione um template de output');

	var warnings = [];
	var outputs = [];
	var configured = run.templateData.outputPath;

	var machine = padMachineData();
	var localMode = padLocalMode();
	var localOutput = padMachinePath(machine.outputs) || defaultTemplateConfigObj.outputPath[0];

	for (var o = 0; o < configured.length; o++) {
		// modo local: tudo na pasta de saída deste computador (sem tocar na rede)
		if (localMode) {
			outputs.push(padPath(localOutput));
			continue;
		}

		// no volume realmente montado (VFX, VFX-1 … VFX-5; sem nenhum, monta o share); a pasta que ainda não
		// existe é criada no servidor. não deu (rede fora, sem permissão): vai para a pasta deste computador
		var outputPath = padMountedPath(padPath(configured[o]));

		// só cria dentro de um volume montado de verdade (com a primeira pasta do caminho lá): nunca uma pasta
		// solta em /Volumes, que esconderia o volume da próxima vez que ele montar
		if (!new Folder(outputPath).exists && padShareReachable(outputPath)) {
			try {
				padEnsureFolder(outputPath);
			} catch (err) { }
		}

		if (!new Folder(outputPath).exists) {
			warnings.push('#PAD_019 - output não pode ser acessado (vai para a pasta deste computador): ' + padDisplayPath(outputPath));
			outputPath = padPath(localOutput);
		}

		outputs.push(outputPath);
	}

	run.outputTemplate = a.outputTemplate;
	run.outputs = outputs;

	// como no padeiro antigo: o script do template ('_script.js') recebe em templateData.outputPath os
	// caminhos já convertidos para este sistema (e a pasta padrão no lugar das inacessíveis)
	run.templateData.outputPath = outputs.slice(0);

	return { total: run.newComps.length, outputs: padDisplayPaths(outputs), warnings: warnings };
};

// Adiciona a comp 'index' à fila de render.
PADX.queueStep = function (a) {
	var run = PADX_run;

	if (!run || !run.outputs) throw new Error('#PAD_049 - fila de render não iniciada');

	return padGroup('O PADEIRO: fila de render', function () {
		// O After Effects confere a última pasta de render que ele lembra ao criar o item e ao aplicar os
		// templates; se ela não existe mais, mostra "The directory originally specified in the selected
		// output module no longer exists", mesmo que a pasta do padeiro exista. O padeiro define a pasta
		// de cada saída, então esses avisos ficam desligados durante a montagem.
		app.beginSuppressDialogs();

		try {
			var comp = run.newComps[a.index];
			var item = app.project.renderQueue.items.add(comp);

			item.applyTemplate('Best Settings');

			for (var o = 0; o < run.outputs.length; o++) {
				if (o > 0) item.outputModules.add();

				var outputModule = item.outputModule(o + 1);
				var file = new File(run.outputs[o] + '/[compName].[fileextension]');

				outputModule.file = file;
				outputModule.applyTemplate(run.outputTemplate);
				outputModule.file = file; // o template não pode trocar a pasta
				run.newOutputs.push(outputModule);
			}

			return { name: comp.name, outputs: padDisplayPaths(run.outputs) };
		} finally {
			app.endSuppressDialogs(false);
		}
	});
};

// Executa o script do template ('_script.js'), se houver, e encerra a execução.
PADX.runEnd = function (a) {
	var run = PADX_run;
	var result = { script: null };

	PADX_run = null;

	if (!run || a.skipScript || !run.files.script.exists) return result;

	result.script = run.files.script.displayName;

	try {
		$.evalFile(run.files.script);
	} catch (err) {
		throw new Error('#PAD_021 - ' + err.message);
	}

	return result;
};

// Abre as pastas de output do template atual.
PADX.openOutputs = function (a) {
	var paths = a.paths;
	var opened = 0;
	var missing = [];

	for (var o = 0; o < paths.length; o++) {
		// no volume realmente montado (EDIT_IN_PLACE-1 … -5; monta o share se não estiver): o caminho gravado
		// fica sem o sufixo
		var folder = new Folder(padMountedPath(padPath(paths[o])));
		var near = folder.exists ? folder : nearestExistingFolder(folder.fsName);

		// a pasta ainda não existe (o render cria): abre a mais perto que existir, dentro do volume
		if (near && /^\/Volumes\/[^\/]+\/.+|^\\\\[^\\]+\\[^\\]+\\.+|^[A-Za-z]:\\.+/.test(near.fsName)) {
			openFolder(near.fsName);
			opened++;
		} else {
			missing.push(padDisplayPath(folder.fsName));
		}
	}

	return { opened: opened, missing: missing };
};

/*

---------------------------------------------------------------
> ações da barra principal (as que não têm tela própria)
---------------------------------------------------------------

Mesma lógica de PAD_ACTIONS ('main ui functions.js'). Cada uma devolve { messages, data }.

*/

// Arquivo de saída do último item da fila de render que tem um (ou null).
function getLastOutputFile() {
	var rq = app.project.renderQueue;

	for (var i = rq.numItems; i >= 1; i--) {
		try {
			var outputFile = rq.item(i).outputModule(1).file;

			if (outputFile != null) return outputFile;
		} catch (err) { }
	}

	return null;
}

function padRequireNetwork(code) {
	if (!netAccess()) throw new Error('#' + code + ' - sem acesso a rede... habilite "Allow Scripts to Write Files and Access Network" nas preferências');
}

// Abre a pasta do último item da fila de render (ou a mais próxima que existe).
PADX.openLastOutput = function () {
	padRequireNetwork('PAD_007');

	var outputFile = getLastOutputFile();

	if (outputFile == null) throw new Error('#PAD_008 - a fila de render está vazia...');

	// fsName: o caminho do sistema já decodificado ('decodeURI' deixa '#' e '&' como %23 e %26: C# ABERTA & INTER);
	// padPath acha o volume realmente montado (EDIT_IN_PLACE-1 … -5)
	var outputPath = padPath(outputFile.parent.fsName);
	var folder = nearestExistingFolder(outputPath);

	if (folder == null) throw new Error('#PAD_009 - a pasta não foi encontrada: ' + padDisplayPath(outputPath));

	openFolder(folder.fsName);

	return { messages: [], data: { path: folder.fsName } };
};

// Instala as fontes do projeto: as da pasta de fontes dele (o coletar junta lá) ou, sem ela, as da pasta FONTS
// de cada template que preencheu o projeto (padeiro:templates).
PADX.installFonts = function () {
	padRequireNetwork('PAD_004');

	var m = padMetaRead();
	var settings = padReadCollect();
	var file = app.project.file;
	var folders = [];
	var root = m.pasta ? padMountedPath(padPath(m.pasta)) : file ? padCollectRoot(file, settings) : '';
	var sub = padCollectFolderPath(settings, 'fontes');
	var list = padTemplatesList(m.templates);

	if (root && sub) {
		var collected = new Folder(root + '/' + sub);

		if (collected.exists && getFontFiles(collected, []).length) folders.push(collected.fsName);
	}

	var own = folders.length > 0;

	for (var i = 0; !own && i < list.length; i++) {
		var tpl = new Folder(normalizeNetworkPath(list[i].path, { silent: true }) + '/FONTS');

		if (tpl.exists) folders.push(tpl.fsName);
	}

	if (!folders.length && !list.length) throw new Error('#PAD_005 - esse projeto não tem fontes coletadas nem foi preenchido pelo padeiro...');
	if (!folders.length) throw new Error('#PAD_006 - a pasta de fontes não foi localizada...');

	var messages = [];

	var failed = null;

	// uma pasta sem fontes não impede as outras
	for (var f = 0; f < folders.length; f++) {
		try {
			messages.push(installFontsMessage(installFonts(folders[f])));
		} catch (err) {
			failed = failed || err;
		}
	}

	if (!messages.length && failed) throw failed;

	return { messages: messages, data: null }; // Windows ou macOS, sem janelas
};

// Copia as fontes usadas no projeto para '<pasta>/FONTS' e abre a pasta. a: { path }
PADX.collectFonts = function (a) {
	if (app.project.numItems == 0) throw new Error('#PAD_050 - o projeto está vazio.');

	return padCollect(function () {
		var fontsPath = fontCollect(padPath(decodeURI(a.path)) + '/FONTS');

		if (fontsPath != '') openFolder(fontsPath);

		return { path: fontsPath };
	});
};

PADX.renameComps = function () {
	if (app.project.numItems == 0) throw new Error('#PAD_050 - o projeto está vazio.');

	return padCollect(function () {
		padGroup('renomear comps', function () {
			renamePromoComps(app.project.selection);
		});
	});
};

PADX.renameOutputs = function () {
	return padCollect(function () {
		padGroup('renomear outputs', function () {
			renameOutputs();
		});
	});
};

PADX.organizeProject = function () {
	if (app.project.numItems == 0) throw new Error('#PAD_050 - o projeto está vazio.');

	return padCollect(function () {
		try {
			padGroup('organização automática do projeto', function () {
				organizeProject(); // comps selecionadas sem comentário recebem o comentário automático
			});
		} catch (err) {
			throw new Error('#PAD_036 - ' + err.message);
		}
	});
};

PADX.createProjectFolders = function () {
	return padCollect(function () {
		padGroup('criar pastas do projeto', function () {
			projectTemplateFolders(); // cria a estrutura de pastas do projeto
		});
	});
};

/*

---------------------------------------------------------------
> importar .aep de outra versão (ferramenta importar da barra)
---------------------------------------------------------------

Quem troca a versão no cabeçalho do arquivo é o painel (js/aepversion.js, pelo Node, numa cópia); o host diz
qual versão está rodando e importa ou abre o arquivo.

*/

// A versão do After Effects que está rodando: { major } (25 no AE 2025)
PADX.aeVersion = function () {
	return { major: parseInt(app.version, 10), version: String(app.version) };
};

// Importa um .aep no projeto aberto; a pasta que a importação cria leva o nome do arquivo original.
// a: { path, name } → { name }
PADX.importAep = function (a) {
	var file = new File(a.path);

	if (!file.exists) throw new Error('#PAD_100 - importar: o arquivo não foi encontrado.');

	var folder = app.project.importFile(new ImportOptions(file));

	try {
		if (folder && a.name) folder.name = a.name;
	} catch (err) { }

	return { name: folder ? folder.name : decodeURI(file.name) };
};

// Abre um .aep no lugar do projeto atual (pergunta antes se o atual tem mudanças). a: { path } → { opened }
PADX.openAep = function (a) {
	var file = new File(a.path);

	if (!file.exists) throw new Error('#PAD_100 - importar: o arquivo não foi encontrado.');
	if (app.project && !app.project.close(CloseOptions.PROMPT_TO_SAVE_CHANGES)) return { opened: false };

	app.open(file);

	return { opened: true };
};

/*

---------------------------------------------------------------
> primeira vez (o tour da barra)
---------------------------------------------------------------

Sem a configuração da equipe (nem na rede, nem a cópia deste computador), a barra abre o tour (js/tour.js):
achar o arquivo na rede, criar um novo numa pasta ou ficar só neste computador (modo local, com os padrões).
O caminho escolhido vai para 'shared_config.txt', o mesmo arquivo que o instalador grava.

*/

// → { needed, expected, user }
PADX.setupStatus = function () {
	var file = null;

	try {
		file = padConfigFile();
	} catch (err) { }

	return { needed: !file, expected: padDisplayPath(padSharedConfigPath()), user: padMachineUser() };
};

function padSetupPointer(path) {
	var folder = new Folder(scriptPreferencesPath);

	if (!folder.exists) folder.create();

	saveTextFile(String(path), scriptPreferencesPath + '/shared_config.txt');
	padConfigInvalidate();
}

// O resumo da configuração que ficou valendo (para o balão): produções, links e letras de drive.
function padSetupSummary() {
	var data = padConfigData();
	var links = 0;
	var drives = [];
	var i;

	try {
		links = padReadLinks().length;
	} catch (err) { }

	try {
		var d = padReadDrives().drives;

		for (i = 0; i < d.length; i++) drives.push(d[i].letter);
	} catch (err) { }

	return { productions: (data.PRODUCTIONS || []).length, links: links, drives: drives, folder: padDisplayPath(PAD_CONFIG_CACHE.path).replace(/[\\\/][^\\\/]*$/, '') };
}

// Usa a configuração escolhida. a: { path } → resumo
PADX.setupUseConfig = function (a) {
	var file = new File(a.path);
	var name = decodeURI(file.name);

	if (!file.exists) throw new Error('#PAD_101 - primeira vez: o arquivo não foi encontrado.');
	if (name != PAD_CONFIG_NAME && name != PAD_CONFIG_OLD_NAME) throw new Error('#PAD_101 - primeira vez: escolha o ' + PAD_CONFIG_NAME + ' (a configuração da equipe).');

	try {
		JSON.parse(readFileContent(file));
	} catch (err) {
		throw new Error('#PAD_101 - primeira vez: ' + name + ' não é uma configuração válida (JSON).');
	}

	padSetupPointer(file.fsName);

	return padSetupSummary();
};

// Cria a configuração da equipe na pasta (com os padrões; se já houver uma lá, usa ela). a: { folder } → resumo
PADX.setupCreateConfig = function (a) {
	var folder = new Folder(a.folder);

	if (!folder.exists) throw new Error('#PAD_101 - primeira vez: a pasta não foi encontrada.');

	var file = new File(folder.fsName + '/' + PAD_CONFIG_NAME);
	var existed = file.exists;

	if (!existed) {
		saveTextFile(JSON.stringify({ PRODUCTIONS: [] }, null, '\t'), file.fsName);

		if (!new File(file.fsName).exists) throw new Error('#PAD_101 - primeira vez: não deu para gravar em ' + padDisplayPath(folder.fsName) + ' (sem permissão?).');
	}

	padSetupPointer(file.fsName);

	var res = padSetupSummary();

	res.existed = existed;

	return res;
};

// Só neste computador: a cópia local com os padrões e o modo local ligado.
PADX.setupLocal = function () {
	var copy = padConfigCopyFile();
	var folder = new Folder(scriptPreferencesPath);

	if (!folder.exists) folder.create();
	if (!copy.exists) saveTextFile(JSON.stringify({ PRODUCTIONS: [] }, null, '\t'), copy.fsName);

	PADX.saveMachinePrefs({ localMode: true });

	return { local: true };
};
