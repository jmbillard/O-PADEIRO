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

	return { hasComp: true, compId: item.id, compName: item.name, time: item.time, frameRate: item.frameRate, selected: selected };
};

// Fontes usadas no projeto (a leitura pode demorar em projetos grandes): { name (PostScript), family,
// style, location (arquivo da fonte, para a prévia), source }. source: 'local' (instalada neste
// computador), 'adobe' (Adobe Fonts / Creative Cloud) ou 'missing' (não existe neste computador).
PADX.makerFonts = function () {
	var fonts = getProjectFonts();

	for (var f = 0; f < fonts.length; f++) {
		var font = fonts[f];
		var adobe = !!font.location && /\/CoreSync\/plugins\/livetype\//i.test(font.location.replace(/\\/g, '/'));

		try {
			var info = app.fonts.getFontsByPostScriptName(font.name); // After Effects 2024 ou mais novo

			if (info.length && info[0].isFromAdobeFonts) adobe = true;
		} catch (err) { }

		font.source = 'local';

		if (!font.location || !new File(font.location).exists) font.source = 'missing';
		if (adobe) font.source = 'adobe';
	}

	return { fonts: fonts };
};

// Confere se dá para criar um template agora (barra principal).
PADX.makerReady = function () {
	if (!(app.project.activeItem instanceof CompItem)) {
		throw new Error('#PAD_031 - abra a comp principal do template antes de criar um novo template.');
	}

	return { ok: true };
};

// saveFrameToPng grava o arquivo em segundo plano e volta antes de terminar: ler cedo demais dava um
// preview pela metade. Espera (até ~8 s) o PNG estar completo: terminar no bloco IEND e com o tamanho
// parado entre duas leituras.
function padPngComplete(path) {
	var file = new File(path);

	if (!file.exists || file.length < 12) return false;

	try {
		file.encoding = 'BINARY';
		file.open('r');
		file.seek(file.length - 12);

		var tail = file.read(12);

		file.close();

		return tail.indexOf('IEND') >= 0;
	} catch (err) {
		try {
			file.close();
		} catch (e) { }

		return false;
	}
}

function padWaitForPng(path) {
	var lastSize = -1;

	for (var w = 0; w < 80; w++) {
		var file = new File(path);
		var size = file.exists ? file.length : -1;

		if (size > 0 && size === lastSize && padPngComplete(path)) return true;

		lastSize = size;
		$.sleep(100);
	}

	return padPngComplete(path);
}

// Salva o frame atual da comp ativa como preview e define a comp principal / tempo de referência.
PADX.makerCapture = function () {
	var comp = app.project.activeItem;

	if (!(comp instanceof CompItem)) throw new Error('#PAD_025 - abra a comp principal do template para capturar o preview.');

	var previewName = comp.name.toUpperCase().replaceSpecialCharacters().replace(/\s+/g, '_') + '_preview.png';
	var previewFile = new File(tempPath + '/' + previewName);

	if (previewFile.exists) previewFile.remove();

	comp.saveFrameToPng(comp.time, previewFile);

	PADX_makerPreview = padWaitForPng(previewFile.fsName) ? previewFile.fsName : null;

	return {
		compId: comp.id,
		compName: comp.name,
		time: comp.time,
		frameRate: comp.frameRate,
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

// O efeito de menu selecionado no Effect Controls (o efeito inteiro ou a propriedade do menu): as variações de layout.
// → { layerId, layerIndex, layerName, fxName, optionIndex, count } (count: o total de opções do menu, 0 se não deu
// para saber)
PADX.makerPickEffect = function (a) {
	var comp = padMakerComp(a.compId);
	var props = comp.selectedProperties;
	var menu = null;

	for (var i = 0; i < props.length && !menu; i++) menu = padMenuProperty(props[i]);

	if (!menu) throw new Error('#PAD_097 - selecione no Effect Controls da comp principal o efeito de menu do layout (ex: Dropdown Menu Control).');

	var effect = menu.parentProperty;
	var layer = effect.parentProperty.parentProperty;

	return { layerId: layer.id, layerIndex: layer.index, layerName: layer.name, fxName: effect.name, optionIndex: menu.propertyIndex, count: padMenuCount(menu) };
};

// A propriedade de menu: a selecionada (direto dentro de um efeito) ou, num efeito selecionado, a primeira de menu dele
function padMenuProperty(prop) {
	var isEffect = function (p) {
		return p && p.parentProperty && p.parentProperty.matchName == 'ADBE Effect Parade';
	};
	var isMenu = function (p) {
		if (!(p instanceof Property) || p.propertyValueType != PropertyValueType.OneD) return false;

		try {
			if (p.isDropdownEffect) return true;
		} catch (err) { }

		return p.parentProperty.matchName == 'ADBE Dropdown Control';
	};

	if (prop instanceof Property) return isEffect(prop.parentProperty) && isMenu(prop) ? prop : null;
	if (!isEffect(prop)) return null;

	for (var i = 1; i <= prop.numProperties; i++) {
		if (isMenu(prop.property(i))) return prop.property(i);
	}

	return null;
}

// Quantas opções o menu tem: o valor máximo dele ou, sem ele, o maior valor que o menu aceita (volta o valor de antes)
function padMenuCount(menu) {
	try {
		if (menu.hasMax && menu.maxValue >= 1 && menu.maxValue <= 100) return Math.round(menu.maxValue);
	} catch (err) { }

	if (menu.numKeys > 0 || menu.expressionEnabled) return 0;

	var before = menu.value;
	var count = 0;

	app.beginUndoGroup('PADEIRO - opções do menu');

	try {
		for (var n = 1; n <= 50; n++) {
			try {
				menu.setValue(n);
				if (Math.round(menu.value) != n) break;
				count = n;
			} catch (err) {
				break;
			}
		}
	} finally {
		try {
			menu.setValue(before);
		} catch (err) { }
		app.endUndoGroup();
	}

	return count;
}

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
// a: { compId, layers: [{id, method}], fx: { layerId, fxName, optionIndex, options } | null, config } — 'config' sem
// 'compName' / 'inputLayers' / 'inputFx'.
PADX.makerSave = function (a) {
	var comp = padMakerComp(a.compId);
	var cfg = a.config;

	if (!cfg || String(cfg.configName).replace(/^\s+|\s+$/g, '') == '' || cfg.configName == defaultTemplateConfigObj.configName) {
		throw new Error('#PAD_029 - preencha o que é (o nome do template).');
	}

	// a atração do template (o seletor do criador: a do índice ou uma nova): { name, path, out }
	if (!cfg.atracao || String(cfg.atracao.name || '').replace(/^\s+|\s+$/g, '') == '') throw new Error('#PAD_029 - escolha a atração do template.');

	cfg.configName = String(cfg.configName).replace(/^\s+|\s+$/g, '');
	cfg.compName = comp.name;
	cfg.inputLayers = [];

	for (var i = 0; i < a.layers.length; i++) {
		var layer = padLayerById(comp, a.layers[i].id);

		if (!layer || !PADX_MAKER_METHODS[a.layers[i].method]) continue;

		cfg.inputLayers.push({ layerIndex: layer.index, method: a.layers[i].method });
	}

	// as variações de layout (o efeito de menu): o índice do layer de agora; uma comp por opção, com o sufixo
	if (a.fx && a.fx.options && a.fx.options.length) {
		var fxLayer = padLayerById(comp, a.fx.layerId);

		if (!fxLayer) throw new Error('#PAD_097 - o layer do efeito de layout não existe mais na comp: troque o efeito.');

		cfg.inputFx = { layerIndex: fxLayer.index, fxName: a.fx.fxName, optionIndex: a.fx.optionIndex, options: a.fx.options };
	} else {
		delete cfg.inputFx;
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
		// a pasta abre pelo painel, depois de gerar (ou não) o preview em vídeo

		return { saved: true, path: base + '_config.json', base: base, folder: folder };
	});
};

// O template de output H.264 preferido: o de 15 Mbps ("H.264 - Match Render Settings - 15 Mbps", o padrão
// do After Effects). O meio do nome muda com o idioma, então compara só o começo (H.264) e o fim (15 Mbps).
// Sem ele, qualquer H.264 de 15 Mbps e, por fim, qualquer H.264. '' se não houver nenhum.
function padPreferredH264(templates) {
	var rules = [/^H\.?264\b.*\b15\s*Mbps\s*$/i, /H\.?264.*15\s*Mbps/i, /H\.?264/i];

	for (var r = 0; r < rules.length; r++) {
		for (var t = 0; t < templates.length; t++) {
			if (!/^_HIDDEN/.test(templates[t]) && rules[r].test(templates[t])) return templates[t];
		}
	}

	return '';
}

// Gera o preview em vídeo do template salvo ('<template>_preview.mp4', o que a janela de templates mostra):
// renderiza a comp principal pela fila de render com um template de output H.264, em meia resolução.
// As saídas que já estavam na fila ficam de fora durante a renderização e voltam depois.
// a: { compId, base }
PADX.makerRenderPreview = function (a) {
	var comp = padMakerComp(a.compId);
	var rq = app.project.renderQueue;
	var target = new File(a.base + '_preview.mp4');

	if (rq.rendering) throw new Error('#PAD_075 - a fila de render já está renderizando: espere terminar e tente de novo.');

	var paused = [];

	for (var i = 1; i <= rq.numItems; i++) {
		try {
			if (rq.item(i).render) {
				rq.item(i).render = false;
				paused.push(rq.item(i));
			}
		} catch (err) { }
	}

	var item = rq.items.add(comp);

	app.beginSuppressDialogs();

	try {
		try {
			item.applyTemplate('Best Settings');
		} catch (err) { }

		try {
			item.setSetting('Resolution', [2, 2]); // meia resolução: o preview é pequeno na janela
		} catch (err) { }

		var om = item.outputModule(1);
		var h264 = padPreferredH264(om.templates);

		if (!h264) throw new Error('#PAD_076 - nenhum template de output H.264 no After Effects para gerar o preview em .mp4.');

		om.applyTemplate(h264);

		if (target.exists) target.remove();

		om.file = target;
		rq.render();
	} finally {
		try {
			item.remove();
		} catch (err) { }

		for (var p = 0; p < paused.length; p++) {
			try {
				paused[p].render = true;
			} catch (err) { }
		}

		app.endSuppressDialogs(false);
	}

	if (!target.exists) throw new Error('#PAD_077 - o preview em .mp4 não foi gerado.');

	return { path: target.fsName };
};
