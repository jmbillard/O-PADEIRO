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

		res = { ok: true, data: PADX[method](args) };
	} catch (err) {
		var msg = err.message || String(err);

		// todo erro chega ao painel com um código: os sem código são inesperados
		res = { ok: false, error: /^#PAD_/.test(msg) ? msg : '#PAD_099 - erro inesperado: ' + msg };
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
	return normalizeNetworkPath(pathStr, { silent: true });
}

function padSortProductions(list) {
	return list.sort(function (a, b) {
		if (a.name < b.name) return -1;
		if (a.name > b.name) return 1;

		return 0;
	});
}

// Lista de produções COMPARTILHADA ('O_PADEIRO_config.json'): fica na pasta do padeiro na rede,
// ao lado da pasta da extensão. Procura, nesta ordem:
//   1. o caminho gravado pelo instalador em 'shared_config.txt' (pasta de dados do usuário);
//   2. o arquivo na pasta que contém a pasta da extensão.
// Caminho esperado da lista compartilhada: o que o instalador gravou ou, sem ele, o arquivo ao lado da extensão.
function padSharedConfigPath() {
	var pointer = new File(scriptPreferencesPath + '/shared_config.txt');

	if (pointer.exists) {
		try {
			var path = readFileContent(pointer).replace(/^\s+|\s+$/g, '');

			if (path != '') return path;
		} catch (err) { }
	}

	return new Folder(PADX_HOST_PATH).parent.parent.fsName + '/O_PADEIRO_config.json';
}

function padSharedConfigFile() {
	var pointer = new File(scriptPreferencesPath + '/shared_config.txt');

	if (pointer.exists) {
		try {
			var path = readFileContent(pointer).replace(/^\s+|\s+$/g, '');

			if (path != '' && new File(path).exists) return new File(path);
		} catch (err) { }
	}

	var sibling = new File(new Folder(PADX_HOST_PATH).parent.parent.fsName + '/O_PADEIRO_config.json');

	return sibling.exists ? sibling : null;
}

// Arquivo da lista de produções: sempre o compartilhado na rede (todos usam a lista mais atual).
// Sem ele não há lista: nada de cópia local, que ficaria desatualizada.
function padConfigFile() {
	return padSharedConfigFile();
}

function padNoSharedListError() {
	return '#PAD_064 - lista de produções compartilhada não encontrada: ' + padSharedConfigPath() + '. verifique a conexão com a rede (o arquivo fica junto do padeiro).';
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

function padGroup(name, fn) {
	app.beginUndoGroup(name);

	try {
		return fn();
	} finally {
		app.endUndoGroup();
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
		network: netAccess()
	};
};

// Lista de produções (nome, pasta de templates e ícone).
PADX.productions = function () {
	var configFile = padConfigFile();
	var list;
	var error = null;

	if (!configFile) return { configPath: padSharedConfigPath(), shared: false, stamp: 0, productions: [], error: padNoSharedListError() };

	try {
		list = padSortProductions(JSON.parse(readFileContent(configFile)).PRODUCTIONS);
	} catch (err) {
		error = configFile.exists ? err.message : 'arquivo de produções não encontrado';
		list = [];
	}

	var productions = [];

	for (var i = 0; i < list.length; i++) {
		productions.push({
			name: list[i].name,
			templatesPath: list[i].templatesPath,
			icon: list[i].icon || null // literal de string binária (PNG); decodificado no painel
		});
	}

	return {
		configPath: configFile.fsName,
		shared: true,
		stamp: configFile.exists ? configFile.modified.getTime() : 0,
		productions: productions,
		error: error
	};
};

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
// ({ "<produção>": { favorites: [uri], recents: [uri] } }). A lista de produções é que é compartilhada.
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

	return { favorites: item.favorites || [], recents: item.recents || [] };
};

// a: { production, favorites, recents }
PADX.saveTemplateLists = function (a) {
	var all = padReadTemplateLists();

	all[a.production] = { favorites: a.favorites || [], recents: a.recents || [] };
	saveTextFile(JSON.stringify(all, null, '\t'), padTemplateListsFile().fsName);

	return { ok: true };
};

PADX.openFolder = function (a) {
	var folder = new Folder(padPath(a.path));

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

	if (!folder.exists) return { exists: false, path: path, name: '', entries: [] };

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

	return { exists: true, path: path, name: folder.displayName, entries: entries };
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
	return { path: padPath(a.path) };
};

// Grava o '_config.json' do template (cria o arquivo se ele ainda não existir).
// a: { uri, config }
PADX.saveTemplateConfig = function (a) {
	var projectFile = new File(a.uri);

	if (!projectFile.exists) throw new Error('#PAD_018 - arquivo do template não encontrado');

	var cfg = a.config;
	var cases = ['upperCase', 'lowerCase', 'titleCase', 'freeCase'];

	if (!cfg || typeof cfg !== 'object') throw new Error('#PAD_044 - configuração inválida');
	if (String(cfg.configName).trim() == '') throw new Error('#PAD_044 - preencha o nome da configuração');
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
				var location = groups[g][k].location;

				if (location) names[File.decode(new File(location).name).toLowerCase()] = true;
			}
		}
	} catch (err) { } // After Effects antes da versão 24 não tem app.fonts

	return names;
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

		if (!installed[name.toLowerCase()]) missing.push(name);
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

		setXMPData('source', decodeURI(projectFile.path).toString());
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
					.setValue(job.f + 1);
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
			template.comment = 'EXPORTAR'; // Comentário para organização do projeto

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
			app.project.setDefaultImportFolder(new Folder(run.templateData.importPath));
		} catch (err) { }

		// Organização do projeto
		deleteProjectFolders();
		populateProjectFolders();
		deleteEmptyProjectFolders();

		// Metadados XMP indicando o caminho do template
		try {
			setXMPData('source', decodeURI(run.projectFile.path).toString());
		} catch (err) {
			warnings.push('metadados: ' + err.message);
		}
	});

	// Registro de dados (log) — falha silenciosa: não pode atrapalhar o trabalho
	try {
		var dt = new Date();
		var pad2 = function (n) {
			return n < 10 ? '0' + n : String(n);
		};

		sendToWebhookWithCurl(
			{
				template: run.templateData.configName,
				quantidade: run.count,
				user: system.userName,
				work_station: system.machineName.replaceSpecialCharacters(),
				data: [dt.getFullYear(), pad2(dt.getMonth() + 1), pad2(dt.getDate())].join('-') + ' ' + pad2(dt.getHours()) + ':' + pad2(dt.getMinutes()),
				caminho: run.projectFile.fsName
			},
			'https://workflows.jmbillard.com/webhook/log_db_padeiro'
		);
	} catch (err) { }

	return {
		count: run.count,
		renderTemplates: run.renderTemplates,
		outputPath: run.templateData.outputPath,
		warnings: warnings
	};
};

/*

---------------------------------------------------------------
> fila de render
---------------------------------------------------------------

*/

// Verifica as pastas de output. a: { outputTemplate }
PADX.queueBegin = function (a) {
	var run = PADX_run;

	if (!run) throw new Error('#PAD_047 - nenhum preenchimento em andamento');
	if (!a.outputTemplate) throw new Error('#PAD_048 - selecione um template de output');

	var warnings = [];
	var outputs = [];
	var configured = run.templateData.outputPath;

	for (var o = 0; o < configured.length; o++) {
		var outputPath = padPath(configured[o]);

		if (!new Folder(outputPath).exists) {
			// Substitui o caminho inexistente pelo caminho padrão
			// o caminho já convertido para este sistema (no macOS, /Volumes/...)
			warnings.push('#PAD_019 - output não pode ser acessado: ' + new Folder(outputPath).fsName);
			outputPath = defaultTemplateConfigObj.outputPath[0];
		}

		outputs.push(outputPath);
	}

	run.outputTemplate = a.outputTemplate;
	run.outputs = outputs;

	return { total: run.newComps.length, outputs: outputs, warnings: warnings };
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

			return { name: comp.name, outputs: run.outputs };
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
		var folder = new Folder(padPath(paths[o]));

		if (folder.exists) {
			openFolder(folder.fsName);
			opened++;
		} else {
			missing.push(folder.fsName);
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

	var outputPath = normalizeNetworkPath(decodeURI(outputFile.path), { silent: true });
	var folder = nearestExistingFolder(outputPath);

	if (folder == null) throw new Error('#PAD_009 - a pasta não foi encontrada: ' + outputPath);

	openFolder(folder.fsName);

	return { messages: [], data: { path: folder.fsName } };
};

// Instala as fontes da pasta FONTS do template que preencheu o projeto.
PADX.installFonts = function () {
	padRequireNetwork('PAD_004');

	var folderPath = normalizeNetworkPath(getXMPData('source'), { silent: true });

	if (folderPath == '') throw new Error('#PAD_005 - esse projeto não foi preenchido pelo padeiro...');

	var fontsPath = folderPath + '/FONTS';

	if (!new Folder(fontsPath).exists) throw new Error('#PAD_006 - a pasta de fontes não foi localizada...');

	return { messages: [installFontsMessage(installFonts(fontsPath))], data: null }; // Windows ou macOS, sem janelas
};

// Copia as fontes usadas no projeto para '<pasta>/FONTS' e abre a pasta. a: { path }
PADX.collectFonts = function (a) {
	if (app.project.numItems == 0) throw new Error('#PAD_050 - o projeto está vazio.');

	return padCollect(function () {
		var fontsPath = fontCollect(decodeURI(a.path) + '/FONTS');

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
				organizeProject(); // comps selecionadas sem comentário entram como 'EXPORTAR'
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
