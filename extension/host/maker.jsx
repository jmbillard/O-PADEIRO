/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> criador de templates (host)
---------------------------------------------------------------

Mesma lógica de 'o padeiro maker ui.js': a comp principal vem da comp ativa; os layers editáveis, da
seleção na comp. O painel guarda as comps / layers pelo 'id' (que não muda se a ordem dos layers mudar)
e o host resolve o índice na hora de testar e salvar.

*/

var PADX_MAKER_METHODS = { textContent: true, layerName: true };

// Caminho do preview (png) capturado mais recentemente.
var PADX_makerPreview = null;

function padMakerComp(compId) {
	var comp = app.project.itemByID(compId);

	if (!(comp instanceof CompItem)) throw new Error('#PAD_028 - comp principal não encontrada. abra a comp e capture o preview de novo.');

	return comp;
}

function padLayerById(comp, layerId) {
	for (var l = 1; l <= comp.numLayers; l++) {
		if (comp.layer(l).id == layerId) return comp.layer(l);
	}

	return null;
}

function padLayerInfo(layer) {
	var isText = layer instanceof TextLayer;
	var text = '';

	// texto atual do layer (o painel monta o exemplo de preenchimento com ele)
	if (isText) {
		try {
			text = String(layer.property('ADBE Text Properties').property('ADBE Text Document').value.text);
		} catch (err) { }
	}

	return { id: layer.id, index: layer.index, name: layer.name, isText: isText, text: text };
}

// Estado do After Effects para o painel: comp ativa e layers selecionados nela.
PADX.makerState = function () {
	var item = app.project.activeItem;

	if (!(item instanceof CompItem)) return { hasComp: false };

	var selected = [];

	for (var i = 0; i < item.selectedLayers.length; i++) {
		selected.push(padLayerInfo(item.selectedLayers[i]));
	}

	return { hasComp: true, compId: item.id, compName: item.name, time: item.time, selected: selected };
};

// Fontes usadas no projeto (a leitura pode demorar em projetos grandes).
PADX.makerFonts = function () {
	return { fonts: getFontNames() };
};

// Confere se dá para criar um template agora (barra principal).
PADX.makerReady = function () {
	if (!(app.project.activeItem instanceof CompItem)) {
		throw new Error('#PAD_031 - abra a comp principal do template antes de criar um novo template.');
	}

	return { ok: true };
};

// Salva o frame atual da comp ativa como preview e define a comp principal / tempo de referência.
PADX.makerCapture = function () {
	var comp = app.project.activeItem;

	if (!(comp instanceof CompItem)) throw new Error('#PAD_025 - abra a comp principal do template para capturar o preview.');

	var previewName = comp.name.toUpperCase().replaceSpecialCharacters().replace(/\s+/g, '_') + '_preview.png';
	var previewFile = new File(tempPath + '/' + previewName);

	if (previewFile.exists) previewFile.remove();

	comp.saveFrameToPng(comp.time, previewFile);

	// saveFrameToPng grava o arquivo em segundo plano: espera ele aparecer (até ~3 s)
	for (var w = 0; w < 30 && !previewFile.exists; w++) {
		$.sleep(100);
	}

	PADX_makerPreview = previewFile.exists ? previewFile.fsName : null;

	return {
		compId: comp.id,
		compName: comp.name,
		time: comp.time,
		preview: PADX_makerPreview,
		selected: PADX.makerState().selected
	};
};

// Layers selecionados na comp principal. a: { compId }
PADX.makerSelection = function (a) {
	var item = app.project.activeItem;

	if (!(item instanceof CompItem) || item.id != a.compId) {
		throw new Error('#PAD_023 - selecione os layers editáveis na comp principal (' + padMakerComp(a.compId).name + ').');
	}

	if (item.selectedLayers.length == 0) throw new Error('#PAD_023 - selecione os layers editáveis na comp principal.');

	return PADX.makerState();
};

// Seleciona / deseleciona um layer na comp (clique no nome do layer). a: { compId, layerId }
PADX.makerToggleLayer = function (a) {
	var comp = padMakerComp(a.compId);
	var layer = padLayerById(comp, a.layerId);

	if (!layer) throw new Error('#PAD_063 - o layer não existe mais na comp.');

	layer.selected = !layer.selected;

	return { selected: layer.selected };
};

// Nome e posição atuais dos layers (a ordem pode ter mudado na comp). a: { compId, layerIds }
PADX.makerLayers = function (a) {
	var comp = padMakerComp(a.compId);
	var layers = [];

	for (var i = 0; i < a.layerIds.length; i++) {
		var layer = padLayerById(comp, a.layerIds[i]);

		layers.push(layer ? padLayerInfo(layer) : null);
	}

	return { layers: layers };
};

// Preenche os layers editáveis com o texto de teste, como no preenchimento real. a: { compId, layers: [{id, method}], inputs: [] }
PADX.makerTest = function (a) {
	var comp = padMakerComp(a.compId);

	if (a.layers.length == 0) throw new Error('#PAD_026 - adicione pelo menos um layer editável para testar.');

	padGroup('PADEIRO - testar preenchimento', function () {
		for (var i = 0; i < a.layers.length; i++) {
			var layer = padLayerById(comp, a.layers[i].id);

			if (!layer) continue;

			// layers sem informação correspondente ficam desligados, como no preenchimento real
			layer.enabled = i < a.inputs.length;

			if (i >= a.inputs.length) continue;

			if (a.layers[i].method == 'textContent' && layer instanceof TextLayer) {
				layer.property('ADBE Text Properties').property('ADBE Text Document').setValue(String(a.inputs[i]).replace(/^\s+|\s+$/g, ''));
			}

			if (a.layers[i].method == 'layerName') layer.name = String(a.inputs[i]).replace(/^\s+|\s+$/g, '');
		}
	});

	return PADX.makerCapture(); // o preview acompanha o teste
};

// Marca a comp como template, salva o projeto (janela do After Effects) e grava o config, o preview e as fontes.
// a: { compId, layers: [{id, method}], config } — 'config' sem 'compName' / 'inputLayers'.
PADX.makerSave = function (a) {
	var comp = padMakerComp(a.compId);
	var cfg = a.config;

	if (!cfg || String(cfg.configName).replace(/^\s+|\s+$/g, '') == '' || cfg.configName == defaultTemplateConfigObj.configName) {
		throw new Error('#PAD_029 - preencha o nome da configuração.');
	}

	cfg.configName = String(cfg.configName).replace(/^\s+|\s+$/g, '');
	cfg.compName = comp.name;
	cfg.inputLayers = [];

	for (var i = 0; i < a.layers.length; i++) {
		var layer = padLayerById(comp, a.layers[i].id);

		if (!layer || !PADX_MAKER_METHODS[a.layers[i].method]) continue;

		cfg.inputLayers.push({ layerIndex: layer.index, method: a.layers[i].method });
	}

	if (!(cfg.outputPath instanceof Array) || cfg.outputPath.length == 0) cfg.outputPath = defaultTemplateConfigObj.outputPath.slice();
	if (!cfg.importPath) cfg.importPath = defaultTemplateConfigObj.importPath;

	var previousComment = comp.comment;
	var saved = false;

	app.beginUndoGroup('PADEIRO - criar template');

	try {
		comp.comment = 'TEMPLATE';
		saved = app.project.saveWithDialog();

		if (!saved) {
			comp.comment = previousComment; // salvamento cancelado: nada mudou
			return { messages: [], data: { saved: false } };
		}
	} finally {
		app.endUndoGroup();
	}

	var project = app.project.file;
	var folder = decodeURI(project.parent.fsName);
	var base = decodeURI(project.fsName).replace(/\.ae[pt]$/i, '');

	return padCollect(function () {
		saveTextFile(JSON.stringify(cfg, null, '\t'), base + '_config.json');

		if (PADX_makerPreview && new File(PADX_makerPreview).exists) {
			new File(PADX_makerPreview).copy(new File(base + '_preview.png'));
		}

		fontCollect(folder + '/FONTS');
		openFolder(folder);

		return { saved: true, path: base + '_config.json', folder: folder };
	});
};
