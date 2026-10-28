/* eslint-disable no-empty */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🪟 UI dialogs - O ACESSORISTA (busca de caminhos de atrações)
---------------------------------------------------------------

*/

// Configuração -------------------------------------------------

var PS_WEBHOOK_URL = 'https://workflows.jmbillard.com/webhook/path-search';
var PS_WEBHOOK_BODY = '{"origem":"after effects"}';
var PS_CACHE_TTL = 30 * 1000; // idade máxima (ms) do índice local antes de baixar de novo (caminhos do Teams mudam toda hora)
var PS_MIN_QUERY = 2; // mínimo de caracteres para a busca
var PS_MAX_RESULTS = 12; // máximo de atrações exibidas (a janela não tem scroll)
var PS_WIDTH = 640; // largura fixa da janela (px)
var PS_MAX_PATH_CHARS = 90;

var PS_SMB = {
	sp: 'vfx-ml-sp.servicos.corp.tvglobo.com.br',
	hp: 'vfx-ml-hp.servicos.corp.tvglobo.com.br',
	cppHp: 'cpp-ml-hp.servicos.corp.tvglobo.com.br',
	cppSp: 'cpp-ml-sp.servicos.corp.tvglobo.com.br'
};

// prioridade: Teams > Trello > Atrações
var PS_CATEGORIES = [
	{ key: 'atracoes_teams', label: 'TEAMS', color: normalColor1 },
	{ key: 'atracoes_trello', label: 'TRELLO', color: normalColor1 },
	{ key: 'atracoes', label: 'ATRAÇÕES', color: normalColor1 }
];

// Registros que não vêm do webhook.
var PS_FIXED_RECORDS = [
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
];

// Texto e caminhos ---------------------------------------------

var PS_ACCENTS = {
	'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
	'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
	'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
	'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
	'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
	'ç': 'c', 'ñ': 'n'
};

// minúsculas, sem acentos e sem nada além de a-z / 0-9.
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

function psPathKey(path) {
	return psSlashes(path).replace(/\/+$/, '').toLowerCase();
}

// //servidor/share/pasta → /Volumes/share/pasta
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

function psTruncateMiddle(text, maxChars) {
	text = String(text || '');

	if (text.length <= maxChars) return text;

	var remaining = maxChars - 3;
	var left = Math.ceil(remaining / 2);
	var right = Math.floor(remaining / 2);

	return text.substring(0, left) + '...' + text.substring(text.length - right);
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

// Índice (webhook + cache local) -------------------------------

function psReadJSON(file) {
	if (!file.exists) return null;

	var text = readFileContent(file).replace(/^﻿/, '');

	return JSON.parse(text);
}

function psIsFresh(file) {
	return file.exists && new Date().getTime() - file.modified.getTime() < PS_CACHE_TTL;
}

// Baixa o índice para um arquivo temporário e só substitui o cache se o JSON for válido.
// Assim uma falha de rede nunca destrói o último índice bom.
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

// Prepara os registros uma única vez: caminhos da plataforma atual,
// atrações agrupadas e textos já normalizados para a busca.
function psBuildIndex(data) {
	data = data || {};
	data.atracoes = psAsArray(data.atracoes);

	var known = {};

	for (var i = 0; i < data.atracoes.length; i++) {
		if (data.atracoes[i]) known[psNormalize(data.atracoes[i].atracao)] = true;
	}

	for (var f = 0; f < PS_FIXED_RECORDS.length; f++) {
		if (!known[psNormalize(PS_FIXED_RECORDS[f].atracao)]) data.atracoes.push(PS_FIXED_RECORDS[f]);
	}

	var platform = appOs == 'Mac' ? 'mac' : 'win';
	var index = [];

	for (var c = 0; c < PS_CATEGORIES.length; c++) {
		var records = psAsArray(data[PS_CATEGORIES[c].key]);
		var groups = [];
		var groupsByKey = {};

		for (var r = 0; r < records.length; r++) {
			var rec = records[r];

			if (!rec) continue;

			var plat = rec[platform] || {};
			var projeto = plat.projeto || rec.projeto || '';
			var output = plat.output || rec.output || '';
			var caminho = plat.caminho || rec.caminho || '';

			var name = rec.atracao
				? String(rec.atracao)
				: psLastFolderName(caminho) || psLastFolderName(projeto) || psLastFolderName(output) || 'Resultado ' + (r + 1);

			// if/else em vez de ternário encadeado: o ExtendScript avalia 'a ? b : c ? d : e'
			// como '(a ? b : c) ? d : e', o que juntava todas as atrações sem caminho num grupo só.
			var key;

			if (rec.atracao) key = 'a:' + psNormalize(name);
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

		if (groups.length > 0) index.push({ category: PS_CATEGORIES[c], groups: groups });
	}

	return index;
}

// Primeira pasta do caminho cujo nome contém o termo buscado.
function psMatchingFolder(group, query) {
	var lists = [group.caminhos, group.projetos, group.outputs];

	for (var i = 0; i < lists.length; i++) {
		for (var j = 0; j < lists[i].length; j++) {
			var parts = lists[i][j].split(/([\\\/])/);
			var built = '';

			for (var k = 0; k < parts.length; k++) {
				built += parts[k];

				if (parts[k] != '\\' && parts[k] != '/' && psNormalize(parts[k]).indexOf(query) >= 0) {
					return { path: built, name: parts[k] };
				}
			}
		}
	}

	return null;
}

// Montagem SMB sob demanda (macOS) -----------------------------

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

// Caminho existente (volume com ou sem sufixo -1 a -5) ou '' se a pasta não existir.
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

// Interface ----------------------------------------------------

function pathSearchDialog() {
	var scriptName = 'O ACESSORISTA';
	var scriptVersion = 'v3.7';

	if (!netAccess()) {
		alert(lol + '#PAD_PATH_003 - sem acesso a rede...');
		return;
	}

	var cacheFile = new File(tempFolder.fsName + '/path_index.json');
	var index = [];
	var indexReady = false;

	var pathW = new Window('palette', scriptName + ' ' + scriptVersion);
	pathW.orientation = 'column';
	pathW.alignChildren = ['fill', 'top'];
	pathW.spacing = 8;
	pathW.margins = 12;
	pathW.preferredSize.width = PS_WIDTH;

	var contentWidth = PS_WIDTH - pathW.margins.left - pathW.margins.right;

	var searchGrp = pathW.add('group');
	searchGrp.alignChildren = ['fill', 'center'];

	var searchEdTxt = searchGrp.add('edittext', undefined, '');
	searchEdTxt.characters = 36;
	searchEdTxt.helpTip = 'pesquise por atração, caminho, projeto ou output';

	var refreshBtn = searchGrp.add('button', undefined, 'Atualizar');
	refreshBtn.helpTip = 'baixa o índice de caminhos novamente';
	refreshBtn.alignment = ['right', 'center'];

	var statusTxt = pathW.add('statictext', undefined, '', { truncate: 'end' });
	statusTxt.preferredSize.width = contentWidth;
	setFgColor(statusTxt, monoColor1);

	var resultsGrp;

	function newResultsGrp() {
		resultsGrp = pathW.add('group');
		resultsGrp.orientation = 'column';
		resultsGrp.alignChildren = ['fill', 'top'];
		resultsGrp.spacing = 6;
	}

	newResultsGrp();
	setBgColor(pathW, bgColor1);

	// Reajusta a altura da janela ao conteúdo: ela cresce com os resultados e volta a encolher quando eles somem.
	// O 'preferredSize' da janela guarda o maior tamanho já usado, então a altura é somada a partir dos filhos.
	function relayout() {
		pathW.layout.layout(true);

		var height = pathW.margins.top + pathW.margins.bottom + searchGrp.size.height + pathW.spacing + statusTxt.size.height;

		if (resultsGrp.children.length > 0) height += pathW.spacing + resultsGrp.preferredSize.height;

		pathW.size = [PS_WIDTH, height];
		pathW.layout.layout(true);
	}

	// Recria o grupo (em vez de esvaziá-lo) para que o tamanho preferido do conteúdo anterior não fique em cache.
	function clearResults() {
		pathW.remove(resultsGrp);
		newResultsGrp();
	}

	function addFolderBtn(parent, label, path, group) {
		var btn = parent.add('button', undefined, label);

		btn.helpTip = path;
		btn.onClick = function () {
			psOpenFolder(path, group.server, group.share);
		};
	}

	function addPathLabel(parent, path, group) {
		var displayPath = psToPlatform(path);
		var lab = parent.add('statictext', undefined, 'Caminho: ' + psTruncateMiddle(displayPath, PS_MAX_PATH_CHARS));

		lab.preferredSize.width = contentWidth;
		lab.helpTip = 'clique para abrir:\n' + displayPath;
		setCtrlHighlight(lab, monoColor1, normalColor2);

		// um único gatilho: 'click' + 'onClick' abririam a pasta duas vezes
		lab.addEventListener('click', function () {
			psOpenFolder(displayPath, group.server, group.share);
		});
	}

	function addGroupRow(parent, group, query) {
		var rowGrp = parent.add('group');
		rowGrp.orientation = 'column';
		rowGrp.alignChildren = ['fill', 'top'];
		rowGrp.spacing = 4;

		var nameTxt = rowGrp.add('statictext', undefined, group.name, { truncate: 'end' });
		nameTxt.preferredSize.width = contentWidth;
		setFgColor(nameTxt, monoColor1);

		var btnGrp = rowGrp.add('group');
		btnGrp.alignChildren = ['left', 'center'];

		if (group.projetos.length > 0) addFolderBtn(btnGrp, 'Abrir projeto', group.projetos[0], group);
		if (group.outputs.length > 0) addFolderBtn(btnGrp, 'Abrir output', group.outputs[0], group);

		var folder = psMatchingFolder(group, query);

		if (folder) addFolderBtn(btnGrp, 'Abrir: ' + folder.name, folder.path, group);

		for (var p = 0; p < group.caminhos.length; p++) {
			addPathLabel(rowGrp, group.caminhos[p], group);
		}
	}

	function doSearch() {
		clearResults();

		var query = psNormalize(searchEdTxt.text);

		if (!indexReady) {
			statusTxt.text = 'índice de caminhos indisponível. clique em "Atualizar".';
		} else if (query.length < PS_MIN_QUERY) {
			statusTxt.text = 'digite ao menos ' + PS_MIN_QUERY + ' caracteres para pesquisar.';
		} else {
			var total = 0;
			var shown = 0;
			var sections = 0;

			for (var c = 0; c < index.length; c++) {
				var matches = [];

				for (var g = 0; g < index[c].groups.length; g++) {
					if (index[c].groups[g].haystack.indexOf(query) >= 0) matches.push(index[c].groups[g]);
				}

				total += matches.length;

				if (matches.length == 0 || shown >= PS_MAX_RESULTS) continue;

				if (sections > 0) themeDivider(resultsGrp);
				sections++;

				var sectionGrp = resultsGrp.add('group');
				sectionGrp.orientation = 'column';
				sectionGrp.alignChildren = ['fill', 'top'];
				sectionGrp.spacing = 5;

				var headTxt = sectionGrp.add('statictext', undefined, index[c].category.label + ' (' + matches.length + ')');
				setFgColor(headTxt, index[c].category.color);

				for (var m = 0; m < matches.length && shown < PS_MAX_RESULTS; m++, shown++) {
					if (m > 0) themeDivider(sectionGrp);
					addGroupRow(sectionGrp, matches[m], query);
				}
			}

			if (total == 0) {
				statusTxt.text = 'nenhum resultado encontrado.';
			} else {
				statusTxt.text =
					total + (total == 1 ? ' atração encontrada' : ' atrações encontradas') +
					(total > shown ? ' (exibindo ' + shown + ', refine a busca)' : '') +
					'  |  ' + appOs.toUpperCase();
			}
		}

		relayout();
	}

	// Usa o cache local quando ele ainda é recente; 'force' baixa de novo.
	function loadIndex(force) {
		var downloaded = true;

		if (force || !psIsFresh(cacheFile)) {
			statusTxt.text = 'atualizando índice de caminhos...';
			pathW.update();
			downloaded = psDownloadIndex(cacheFile);
		}

		try {
			index = psBuildIndex(psReadJSON(cacheFile));
			indexReady = true;

			statusTxt.text = downloaded ? 'índice atualizado. digite um termo para pesquisar.' : 'sem conexão com o workflow - usando o último índice salvo.';
		} catch (err) {
			indexReady = false;
			statusTxt.text = 'não foi possível carregar o índice. verifique a conexão e o workflow.';
		}

		doSearch();
	}

	searchEdTxt.onChanging = doSearch;
	searchEdTxt.onEnterKey = doSearch;

	refreshBtn.onClick = function () {
		loadIndex(true);
		searchEdTxt.active = true;
	};

	pathW.onShow = function () {
		relayout();
		loadIndex(false);
		searchEdTxt.active = true; // por último: o carregamento do índice pode tirar o foco do campo
	};

	pathW.center();
	pathW.show();

	return pathW;
}
