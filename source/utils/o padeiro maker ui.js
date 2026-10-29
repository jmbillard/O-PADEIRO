/* eslint-disable no-empty */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🪟 UI dialog
---------------------------------------------------------------

*/

// Editor de templates
function PadMakerDialog() {
	// Título da janela
	var scriptName = 'EDITOR DE TEMPLATES';

	// Cópia do objeto de configuração padrão: editar o original alteraria os valores
	// padrão usados pela ui de templates (ex: output de fallback) até reiniciar o AE.
	var tempConfigObj = JSON.parse(JSON.stringify(defaultTemplateConfigObj));

	var TEXT_CASES = ['upperCase', 'lowerCase', 'titleCase', 'freeCase'];
	var LAYER_METHODS = ['layerName', 'textContent'];

	// Marca usada para não adicionar o mesmo layer duas vezes
	var LAYER_MARK = 'TEMPLATE LAYER';

	// Quebras de linha do edittext variam entre \r, \n e \r\n conforme o sistema.
	function normalizeLineBreaks(str) {
		return String(str).replace(/\r\n|\r/g, '\n');
	}

	// Primeiro bloco do exemplo (os blocos são separados por linhas vazias).
	function firstExampleBlock() {
		return normalizeLineBreaks(exempleText.text).split(/\n{2,}/)[0];
	}

	// Separador como será salvo: '\n' digitado vira quebra de linha; sem separador ou
	// com apenas 1 layer editável, o texto inteiro vai para um único layer.
	function getSeparator() {
		if (separatorTxt.text == '' || layersMainGrp.children.length < 2) return '---';

		return separatorTxt.text.replace(/\\n|\\r/g, '\n');
	}

	function applyTextCase(str) {
		var textCase = TEXT_CASES[caseDrop.selection.index];

		if (textCase == 'upperCase') return str.toUpperCase();
		if (textCase == 'lowerCase') return str.toLowerCase();
		if (textCase == 'titleCase') return str.toTitleCase();

		return str;
	}

	// Mesma regra de nome usada pela ui de templates ao preencher: PREFIXO - INFO 1 INFO 2
	function updateNamePreview() {
		var prefix = prefixTxt.text.trim();
		var info = applyTextCase(firstExampleBlock())
			.split(getSeparator())
			.join(' ')
			.replace(/[\s\-]+/g, ' ')
			.trim();

		infoText2.text = infoText2.helpTip = (prefix + globalSeparator + info).toUpperCase().replaceSpecialCharacters();
	}

	function updateSeparatorState() {
		var hasManyLayers = layersMainGrp.children.length > 1;

		separatorTxt.enabled = hasManyLayers;
		separatorLab.enabled = hasManyLayers;
	}

	function refreshLayout() {
		layersMainGrp.layout.layout(true);
		outputMainGrp.layout.layout(true);
		tipsGrp.layout.layout(true);
		exempleGrp.layout.layout(true);
		layoutMainGrp2.layout.layout(true);
		layoutMainGrp3.layout.layout(true);
		layoutMainGrp4.layout.layout(true);
		PAD_MAKER_w.layout.layout(true);
	}

	// Com mais de 4 layers a coluna do meio cresce: as caixas de texto do formulário
	// acompanham para as colunas continuarem alinhadas.
	function syncFormHeight(delta) {
		if (layersMainGrp.children.length <= 4) return;

		tipsText.size.height += delta;
		exempleText.size.height += delta;
	}

	// Adiciona os layers selecionados na comp ativa como layers editáveis
	function addLayers() {
		var aItem = app.project.activeItem;

		if (!(aItem instanceof CompItem) || aItem.selectedLayers.length == 0) {
			alert(lol + '#PAD_023 - selecione os layers editáveis na comp principal.');
			return;
		}

		var selLayers = aItem.selectedLayers;

		for (var i = 0; i < selLayers.length; i++) {
			// Ignora layers que já foram adicionados
			if (selLayers[i].comment == LAYER_MARK) continue;

			addLayerRow(selLayers[i]);
		}

		updateSeparatorState();
		updateNamePreview();
	}

	function addLayerRow(selLayer) {
		var layerGrp = layersMainGrp.add('group');
		layerGrp.orientation = 'row';
		layerGrp.alignChildren = ['left', 'center'];
		layerGrp.spacing = 10;
		layerGrp.templateLayer = selLayer;

		// Rotulo do layer --> '1   Ctrl'
		var layerLab = layerGrp.add('statictext', undefined, selLayer.index + '   ' + selLayer.name, { truncate: 'end' });
		layerLab.preferredSize.width = 95;
		layerLab.helpTip = 'clique para selecionar / desselecionar o layer na comp';
		setCtrlHighlight(layerLab, normalColor2, highlightColor1); // Define o texto como link

		// Método 'nome' serve para qualquer tipo de layer, 'conteúdo' apenas para layers de texto
		var isText = selLayer instanceof TextLayer;
		var methods = isText ? ['nome', 'conteúdo'] : ['nome'];

		var layerDrop = layerGrp.add('dropdownlist', undefined, methods);
		layerDrop.selection = isText ? 1 : 0;
		layerDrop.preferredSize.width = 90;
		layerGrp.methodDrop = layerDrop;

		var excludeLayerBtn = new themeIconButton(layerGrp, {
			icon: PAD_FECHAR_ICON,
			tips: [lClick + 'remover layer']
		});

		layerLab.addEventListener('mousedown', function () {
			try {
				selLayer.selected = !selLayer.selected;
			} catch (err) { }
		});

		excludeLayerBtn.leftClick.onClick = function () {
			try {
				selLayer.comment = '';
			} catch (err) { } // o layer pode ter sido apagado da comp

			syncFormHeight(-18);
			layersMainGrp.remove(layerGrp);

			updateSeparatorState();
			updateNamePreview();
			refreshLayout();
		};

		syncFormHeight(18);
		selLayer.comment = LAYER_MARK;
	}

	// Adiciona uma pasta de output
	function addOutputFolder() {
		var outputGrp = outputMainGrp.add('group');
		outputGrp.orientation = 'row';
		outputGrp.alignChildren = ['left', 'center'];
		outputGrp.spacing = 10;
		outputGrp.outputPath = '';

		var outputPathLab = outputGrp.add('statictext', [0, 0, 190, 24], 'clique para escolher a pasta...', { truncate: 'middle' });
		outputPathLab.helpTip = 'caminho da pasta de output';
		setCtrlHighlight(outputPathLab, normalColor2, highlightColor1); // Define o texto como link

		var excludeOutputBtn = new themeIconButton(outputGrp, {
			icon: PAD_FECHAR_ICON,
			tips: [lClick + 'remover output']
		});

		outputPathLab.addEventListener('mousedown', function () {
			var startFolder = new Folder(outputGrp.outputPath || '~/Desktop');
			var newOutputFolder = startFolder.selectDlg('selecione a pasta de output');

			if (newOutputFolder == null) return;

			outputGrp.outputPath = normalizeNetworkPath(newOutputFolder.fsName);
			outputPathLab.text = outputGrp.outputPath;
			outputPathLab.helpTip = 'caminho da pasta de output:\n\n' + outputGrp.outputPath;
		});

		excludeOutputBtn.leftClick.onClick = function () {
			// mantém pelo menos uma pasta de output (o primeiro filho é o rótulo)
			if (outputMainGrp.children.length <= 2) return;

			outputMainGrp.remove(outputGrp);
			refreshLayout();
		};
	}

	// Retorna os layers editáveis e os seus métodos
	function getTemplateLayers() {
		var templateLayersArray = [];

		for (var i = 0; i < layersMainGrp.children.length; i++) {
			var layerGrp = layersMainGrp.children[i];

			try {
				templateLayersArray.push([layerGrp.templateLayer, LAYER_METHODS[layerGrp.methodDrop.selection.index]]);
			} catch (err) { }
		}

		return templateLayersArray;
	}

	function getOutputPaths() {
		var paths = [];

		for (var o = 0; o < outputMainGrp.children.length; o++) {
			if (outputMainGrp.children[o].outputPath) paths.push(outputMainGrp.children[o].outputPath);
		}

		return paths;
	}

	// Salva o frame atual da comp ativa como preview e define a comp principal / tempo de referência.
	function capturePreview() {
		var tempItem = app.project.activeItem;

		if (!(tempItem instanceof CompItem)) {
			alert(lol + '#PAD_025 - abra a comp principal do template para capturar o preview.');
			return;
		}

		infoText1.text = tempItem.name;
		infoText1.properties.comp = tempItem;
		infoText1.properties.ref_time = tempItem.time;

		var tempPreviewName = tempItem.name.toUpperCase().replaceSpecialCharacters().replace(/\s+/g, '_') + '_preview.png';

		try {
			tempPreviewFile = new File(tempPath + '/' + tempPreviewName);
			if (tempPreviewFile.exists) tempPreviewFile.remove();

			tempItem.saveFrameToPng(tempItem.time, tempPreviewFile);

			// saveFrameToPng grava o arquivo em segundo plano: espera ele aparecer (até ~3 s)
			for (var w = 0; w < 30 && !tempPreviewFile.exists; w++) {
				$.sleep(100);
			}

			if (tempPreviewFile.exists) previewImg.image = tempPreviewFile;
		} catch (err) { }

		PAD_MAKER_w.layout.layout(true);
	}

	// ----------------------------------------------------------------------------

	var tempPreviewFile; // Arquivo de preview temporário

	// ----------------------------------------------------------------------------

	// Janela principal
	var PAD_MAKER_w = new Window('palette', scriptName + ' ' + scriptVersion);
	PAD_MAKER_w.orientation = 'row';
	PAD_MAKER_w.alignChildren = ['center', 'top'];

	// ----------------------------------------------------------------------------

	var layoutMainGrp1 = PAD_MAKER_w.add('group');
	layoutMainGrp1.orientation = 'column';
	layoutMainGrp1.alignChildren = ['left', 'top'];
	layoutMainGrp1.spacing = 10;
	layoutMainGrp1.margins = 0;

	// Cria um grupo para o cabeçalho da árvore de templates
	var headerGrp1 = layoutMainGrp1.add('group');
	headerGrp1.alignment = 'fill';
	headerGrp1.orientation = 'stack';

	// Cria um grupo para o botão de informações
	var labGrp1 = headerGrp1.add('group');
	labGrp1.alignment = 'left';

	// Cria um grupo para o botão de informações
	var infoGrp = headerGrp1.add('group');
	infoGrp.alignment = 'right';

	// Rótulo de preview
	var labMain2 = labGrp1.add('statictext', undefined, 'AJUDA BÁSICA:');
	labMain2.preferredSize.height = 24;
	setFgColor(labMain2, normalColor1);

	// Cria o botão de informações
	var infoBtn = new themeIconButton(infoGrp, {
		icon: PAD_INFO_ICON,
		tips: [lClick + 'ajuda | DOCS']
	});

	var helpGrp = layoutMainGrp1.add('group');
	helpGrp.orientation = 'column';
	helpGrp.alignChildren = ['left', 'center'];
	helpGrp.spacing = 10;
	helpGrp.margins = 0;

	var instructionsTxt =
		'limpe o projeto!\nremova tudo o que não for necessário para a comp principal.\n\
preencha os dados do formulário.\n\
posicione a agulha da timeline em um frame de referência, e capture a imagem de preview do template.\n\
edite os demais parâmetros do projeto.\n\
selecione os layers editáveis do template, esses layers receberão o texto das informações preenchidas no input.\n\
caso o texto esteja em uma pre-comp, adicione a propriedade "source text" ao painel "essential graphics" e use um layer de texto na comp principal para controlar o texto.\n\
adicione as pastas de mídia e outputs necessários.\n\
em caso de dúvidas, problemas ou sugestões, mande uma mensagem pelo teams...\n\njean.billard';
	var helpLab = helpGrp.add('statictext', undefined, instructionsTxt, { multiline: true });
	setFgColor(helpLab, normalColor2); // Define a cor do texto

	// ----------------------------------------------------------------------------

	var newDiv = themeDivider(PAD_MAKER_w);
	newDiv.alignment = ['center', 'fill'];

	// ----------------------------------------------------------------------------

	var layoutMainGrp2 = PAD_MAKER_w.add('group');
	layoutMainGrp2.orientation = 'column';
	layoutMainGrp2.alignChildren = ['left', 'top'];
	layoutMainGrp2.spacing = 20;
	layoutMainGrp2.margins = 0;

	// ----------------------------------------------------------------------------

	newDiv = new themeDivider(PAD_MAKER_w);
	newDiv.alignment = ['center', 'fill'];

	// ----------------------------------------------------------------------------

	// Cria um grupo para o cabeçalho da árvore de templates
	var layoutGrp3 = PAD_MAKER_w.add('group');
	layoutGrp3.alignment = 'fill';
	layoutGrp3.orientation = 'stack';

	var layoutMainGrp3 = layoutGrp3.add('group');
	layoutMainGrp3.orientation = 'column';
	layoutMainGrp3.alignment = 'top';
	layoutMainGrp3.alignChildren = ['left', 'top'];
	layoutMainGrp3.spacing = 20;
	layoutMainGrp3.margins = 0;

	// ----------------------------------------------------------------------------

	newDiv = new themeDivider(PAD_MAKER_w);
	newDiv.alignment = ['center', 'fill'];

	// ----------------------------------------------------------------------------

	// Cria um grupo para o cabeçalho da árvore de templates
	var layoutGrp4 = PAD_MAKER_w.add('group');
	layoutGrp4.alignment = 'fill';
	layoutGrp4.orientation = 'stack';

	var layoutMainGrp4 = layoutGrp4.add('group');
	layoutMainGrp4.orientation = 'column';
	layoutMainGrp4.alignment = 'top';
	layoutMainGrp4.alignChildren = ['left', 'top'];
	layoutMainGrp4.spacing = 20;
	layoutMainGrp4.margins = 0;

	var labMain1 = layoutMainGrp2.add('statictext', undefined, 'FORMULÁRIO:');
	labMain1.preferredSize.height = 24;
	setFgColor(labMain1, normalColor1);

	var formMainGrp = layoutMainGrp2.add('group');
	formMainGrp.orientation = 'column';
	formMainGrp.alignChildren = ['left', 'center'];
	formMainGrp.spacing = 20;
	formMainGrp.margins = 0;

	// ----------------------------------------------------------------------------

	var configGrp = formMainGrp.add('group');
	configGrp.orientation = 'column';
	configGrp.alignChildren = ['left', 'center'];
	configGrp.spacing = 5;
	configGrp.margins = 0;

	var configLab = configGrp.add('statictext', undefined, 'nome da configuração:');
	configLab.preferredSize.height = 18;
	setFgColor(configLab, monoColor0);

	var configText = configGrp.add('edittext', [0, 0, 230, 24], tempConfigObj.configName);
	configText.helpTip = 'identificador da configuração.';

	var tipsGrp = formMainGrp.add('group');
	tipsGrp.orientation = 'column';
	tipsGrp.alignChildren = ['left', 'center'];
	tipsGrp.spacing = 5;
	tipsGrp.margins = 0;

	var tipsLab = tipsGrp.add('statictext', undefined, 'dicas:');
	tipsLab.preferredSize.height = 18;
	setFgColor(tipsLab, monoColor0);

	var tipsText = tipsGrp.add('edittext', [0, 0, 230, 260], tempConfigObj.tip, { multiline: true });
	tipsText.helpTip = 'as dicas para ajudar no preenchimento.';

	var exempleGrp = formMainGrp.add('group');
	exempleGrp.orientation = 'column';
	exempleGrp.alignChildren = ['left', 'center'];
	exempleGrp.spacing = 5;
	exempleGrp.margins = 0;

	var exempleLab = exempleGrp.add('statictext', undefined, 'exemplo de preenchimento:');
	exempleLab.preferredSize.height = 18;
	setFgColor(exempleLab, monoColor0);

	var exempleText = exempleGrp.add('edittext', [0, 0, 230, 90], tempConfigObj.exemple, { multiline: true });
	exempleText.helpTip = 'apenas um exemplo.';

	// ----------------------------------------------------------------------------

	var previewGrp = layoutMainGrp3.add('group');
	previewGrp.orientation = 'column';
	previewGrp.alignChildren = ['left', 'center'];
	previewGrp.spacing = 10;
	previewGrp.margins = 0;

	var labMain3 = previewGrp.add('statictext', undefined, 'PROJETO:');
	labMain3.preferredSize.height = 24;
	setFgColor(labMain3, normalColor1);

	var previewMainGrp = previewGrp.add('group');
	previewMainGrp.orientation = 'column';
	previewMainGrp.alignChildren = ['left', 'center'];
	previewMainGrp.spacing = 8;
	previewMainGrp.margins = 0;

	var previewImg = previewMainGrp.add('image', [0, 0, 230, 130], no_preview);

	var btnGrp1 = previewMainGrp.add('group');
	btnGrp1.orientation = 'row';
	btnGrp1.spacing = 10;
	btnGrp1.margins = 0;

	var captureBtn = new themeButton(btnGrp1, {
		width: 230,
		height: 32,
		labelTxt: 'capturar preview',
		tips: [lClick + 'capturar o frame de preview,\na comp principal e o\ntempo de referência']
	});

	// ----------------------------------------------------------------------------

	newDiv = new themeDivider(layoutMainGrp3);
	newDiv.alignment = ['fill', 'center'];

	// ----------------------------------------------------------------------------

	var projGrp = layoutMainGrp3.add('group', undefined);
	projGrp.orientation = 'column';
	projGrp.alignChildren = ['left', 'center'];
	projGrp.spacing = 5;
	projGrp.margins = 0;

	var projGeneralGrp = projGrp.add('group', undefined);
	projGeneralGrp.orientation = 'column';
	projGeneralGrp.alignChildren = ['left', 'center'];
	projGeneralGrp.spacing = 10;
	projGeneralGrp.margins = 0;

	var textCaseGrp = projGeneralGrp.add('group', undefined);
	textCaseGrp.orientation = 'row';
	textCaseGrp.alignChildren = ['left', 'center'];
	textCaseGrp.spacing = 10;
	textCaseGrp.margins = 0;

	var caseLab = textCaseGrp.add('statictext', undefined, 'caixa de texto:');
	caseLab.preferredSize.width = 130;
	setFgColor(caseLab, monoColor0);

	var caseDrop_array = ['alta', 'baixa', 'título', 'livre'];
	var caseDrop = textCaseGrp.add('dropdownlist', undefined, caseDrop_array);
	caseDrop.selection = Math.max(0, TEXT_CASES.indexOf(tempConfigObj.textCase));
	caseDrop.preferredSize.width = 90;

	var prefixGrp = projGeneralGrp.add('group', undefined);
	prefixGrp.alignChildren = ['left', 'center'];
	prefixGrp.spacing = 10;
	prefixGrp.margins = 0;

	var prefixLab = prefixGrp.add('statictext', undefined, 'prefixo:');
	prefixLab.preferredSize.width = 130;
	setFgColor(prefixLab, monoColor0);

	var prefixTxt = prefixGrp.add('edittext', [0, 0, 90, 24], tempConfigObj.prefix);
	prefixTxt.helpTip = 'prefixo que será inserido no nome final de todas as versões desse template.';

	var separatorGrp = projGeneralGrp.add('group', undefined);
	separatorGrp.alignChildren = ['left', 'center'];
	separatorGrp.spacing = 10;
	separatorGrp.margins = 0;

	var separatorLab = separatorGrp.add('statictext', undefined, 'separador:');
	separatorLab.preferredSize.width = 130;
	setFgColor(separatorLab, monoColor0);

	var separatorTxt = separatorGrp.add('edittext', [0, 0, 90, 24], tempConfigObj.separator.replace(/\n|\r/g, '\\n'));
	separatorTxt.helpTip = 'separador de informações\n\nuse "\\n" para colocar cada linha de texto em um layer diferente';

	// ----------------------------------------------------------------------------

	newDiv = new themeDivider(layoutMainGrp3);
	newDiv.alignment = ['fill', 'center'];

	// ----------------------------------------------------------------------------

	var layersMainGrp = layoutMainGrp3.add('group', undefined);
	layersMainGrp.orientation = 'column';
	layersMainGrp.alignChildren = ['left', 'center'];
	layersMainGrp.spacing = 10;
	layersMainGrp.margins = [0, 0, 0, 29];

	var bottomGrp3 = layoutGrp3.add('group', undefined);
	bottomGrp3.orientation = 'column';
	bottomGrp3.alignment = 'bottom';
	bottomGrp3.alignChildren = ['left', 'top'];
	bottomGrp3.spacing = 20;
	bottomGrp3.margins = 0;

	var btnGrp4 = bottomGrp3.add('group', undefined);
	btnGrp4.orientation = 'row';
	btnGrp4.spacing = 10;
	btnGrp4.margins = 0;

	var selectLayersBtn = new themeButton(btnGrp4, {
		width: 110,
		height: 32,
		labelTxt: '+ layers',
		tips: [lClick + 'adicionar layers selecionados a configuração do template']
	});

	var testBtn = new themeButton(btnGrp4, {
		width: 110,
		height: 32,
		labelTxt: 'testar agora',
		tips: [lClick + 'testar preenchimento com o exemplo']
	});

	// ----------------------------------------------------------------------------

	var labMain5 = layoutMainGrp4.add('statictext', undefined, 'CAMINHOS:');
	labMain5.preferredSize.height = 24;
	setFgColor(labMain5, normalColor1);

	var importMainGrp = layoutMainGrp4.add('group');
	importMainGrp.orientation = 'column';
	importMainGrp.alignChildren = ['left', 'center'];
	importMainGrp.spacing = 2;
	importMainGrp.margins = 0;

	var importLab = importMainGrp.add('statictext', undefined, 'pasta de mídias: (opcional)');
	importLab.preferredSize.height = 18;
	setFgColor(importLab, monoColor0);

	var importPathLab = importMainGrp.add('statictext', [0, 0, 230, 24], 'clique para escolher a pasta...', {
		importPath: '',
		truncate: 'middle'
	});
	importPathLab.helpTip = 'caminho da pasta:';
	setCtrlHighlight(importPathLab, normalColor2, highlightColor1);

	// ----------------------------------------------------------------------------

	var outputMainGrp = layoutMainGrp4.add('group');
	outputMainGrp.orientation = 'column';
	outputMainGrp.alignChildren = ['left', 'center'];
	outputMainGrp.spacing = 2;
	outputMainGrp.margins = 0;

	var outputLab = outputMainGrp.add('statictext', undefined, 'pastas de output:');
	outputLab.preferredSize.height = 18;
	setFgColor(outputLab, monoColor0);

	var btnGrp2 = layoutMainGrp4.add('group');
	btnGrp2.orientation = 'row';
	btnGrp2.alignment = 'bottom';
	btnGrp2.spacing = 10;
	btnGrp2.margins = 0;

	var newOutputBtn = new themeButton(btnGrp2, {
		width: 230,
		height: 32,
		labelTxt: '+ novo output',
		tips: [lClick + 'adicionar um novo output a configuração do template']
	});

	// ----------------------------------------------------------------------------

	newDiv = new themeDivider(layoutMainGrp4);
	newDiv.alignment = ['fill', 'center'];

	// ----------------------------------------------------------------------------

	var infoMainGrp = layoutMainGrp4.add('group');
	infoMainGrp.orientation = 'column';
	infoMainGrp.alignChildren = ['left', 'top'];
	infoMainGrp.spacing = 10;
	infoMainGrp.margins = 0;

	var infoGrp1 = infoMainGrp.add('group');
	infoGrp1.orientation = 'column';
	infoGrp1.alignChildren = ['left', 'center'];
	infoGrp1.spacing = 2;
	infoGrp1.margins = 0;

	var infoLab1 = infoGrp1.add('statictext', undefined, 'comp principal:');
	infoLab1.preferredSize.height = 18;
	setFgColor(infoLab1, monoColor0);

	var infoText1 = infoGrp1.add('statictext', [0, 0, 230, 18], app.project.activeItem.name, {
		comp: app.project.activeItem,
		ref_time: app.project.activeItem.time,
		truncate: 'end'
	});
	infoText1.helpTip = 'comp principal do template';
	setFgColor(infoText1, normalColor2);

	var infoGrp2 = infoMainGrp.add('group');
	infoGrp2.orientation = 'column';
	infoGrp2.alignChildren = ['left', 'center'];
	infoGrp2.spacing = 2;
	infoGrp2.margins = 0;

	var infoLab2 = infoGrp2.add('statictext', undefined, 'preview da nomenclatura:');
	infoLab2.preferredSize.height = 18;
	setFgColor(infoLab2, monoColor0);

	var infoText2 = infoGrp2.add('statictext', [0, 0, 230, 18], '...', { truncate: 'end' });
	setFgColor(infoText2, normalColor2);

	var infoGrp3 = infoMainGrp.add('group');
	infoGrp3.orientation = 'column';
	infoGrp3.alignChildren = ['left', 'center'];
	infoGrp3.spacing = 2;
	infoGrp3.margins = [0, 0, 0, 44];

	var infoLab3 = infoGrp3.add('statictext', undefined, 'fontes usadas:');
	infoLab3.preferredSize.height = 18;
	setFgColor(infoLab3, monoColor0);

	var fontList = getFontNames();

	for (var f = 0; f < fontList.length; f++) {
		var infoText3 = infoGrp3.add('statictext', [0, 0, 230, 18], fontList[f], { truncate: 'end' });
		infoText3.helpTip = fontList[f];
		setFgColor(infoText3, normalColor2);
	}

	var bottomGrp4 = layoutGrp4.add('group');
	bottomGrp4.orientation = 'column';
	bottomGrp4.alignment = 'bottom';
	bottomGrp4.alignChildren = ['left', 'top'];
	bottomGrp4.spacing = 20;
	bottomGrp4.margins = 0;

	var btnGrp3 = bottomGrp4.add('group');
	btnGrp3.orientation = 'row';
	btnGrp3.spacing = 10;
	btnGrp3.margins = 0;

	var makeBtn = new themeButton(btnGrp3, {
		width: 230,
		height: 32,
		textColor: bgColor1,
		buttonColor: normalColor1,
		labelTxt: 'salvar template',
		tips: [lClick + 'salvar novo template']
	});

	setBgColor(PAD_MAKER_w, bgColor1);

	// ----------------------------------------------------------------------------

	PAD_MAKER_w.onClose = function () {
		var templateLayers = getTemplateLayers();

		for (var i = 0; i < templateLayers.length; i++) {
			try {
				templateLayers[i][0].comment = '';
			} catch (err) { }
		}

		try {
			tempPreviewFile.remove();
		} catch (err) { }
	};

	PAD_MAKER_w.onShow = function () {
		capturePreview();

		// os layers já selecionados na comp entram automaticamente
		var aItem = app.project.activeItem;
		if (aItem instanceof CompItem && aItem.selectedLayers.length > 0) addLayers();

		addOutputFolder();
		updateSeparatorState();
		updateNamePreview();
		refreshLayout();
	};

	prefixTxt.onChanging = separatorTxt.onChanging = exempleText.onChanging = caseDrop.onChange = updateNamePreview;

	prefixTxt.onChange = function () {
		this.text = this.text.trim().toUpperCase().replaceSpecialCharacters();
		updateNamePreview();
	};

	captureBtn.leftClick.onClick = capturePreview;

	selectLayersBtn.leftClick.onClick = function () {
		addLayers();
		refreshLayout();
	};

	importPathLab.addEventListener('mousedown', function () {
		var startFolder = new Folder(this.properties.importPath || '~/Downloads');
		var newImportFolder = startFolder.selectDlg('selecione a pasta de mídias');

		if (newImportFolder == null) return;

		var newImportPath = normalizeNetworkPath(newImportFolder.fsName);
		this.properties.importPath = newImportPath;
		this.text = newImportPath;
		this.helpTip = 'caminho da pasta de mídias:\n\n' + newImportPath;
	});

	// Preenche os layers editáveis com o primeiro bloco do exemplo (sem alterar o exemplo digitado)
	testBtn.leftClick.onClick = function () {
		var templateLayers = getTemplateLayers();

		if (templateLayers.length == 0) {
			alert(lol + '#PAD_026 - adicione pelo menos um layer editável para testar.');
			return;
		}

		var inputArray = applyTextCase(firstExampleBlock()).split(getSeparator());

		app.beginUndoGroup('PADEIRO - testar preenchimento');

		try {
			for (var i = 0; i < templateLayers.length; i++) {
				var selectedLayer = templateLayers[i][0];
				var method = templateLayers[i][1];

				// layers sem informação correspondente ficam desligados, como no preenchimento real
				selectedLayer.enabled = i < inputArray.length;

				if (i >= inputArray.length) continue;

				if (method == 'textContent') {
					selectedLayer.property('ADBE Text Properties').property('ADBE Text Document').setValue(inputArray[i].trim());
				}
				if (method == 'layerName') selectedLayer.name = inputArray[i].trim();
			}
		} catch (err) {
			alert(lol + '#PAD_027 - ' + err.message);
		} finally {
			app.endUndoGroup();
		}

		capturePreview();
	};

	newOutputBtn.leftClick.onClick = function () {
		addOutputFolder();
		refreshLayout();
	};

	makeBtn.leftClick.onClick = function () {
		var templateComp = infoText1.properties.comp;
		var configName = configText.text.trim();

		// Validações antes de salvar
		try {
			templateComp.name; // a comp pode ter sido apagada
		} catch (err) {
			templateComp = null;
		}

		if (!(templateComp instanceof CompItem)) {
			alert(lol + '#PAD_028 - comp principal não encontrada.\nabra a comp e clique em "capturar preview".');
			return;
		}

		if (configName == '' || configName == defaultTemplateConfigObj.configName) {
			alert(lol + '#PAD_029 - preencha o nome da configuração.');
			configText.active = true;
			return;
		}

		var templateLayers = getTemplateLayers();

		if (templateLayers.length == 0 && !confirm('nenhum layer editável foi adicionado.\no template não terá inputs. continuar?')) return;

		var outputPaths = getOutputPaths();

		if (outputPaths.length == 0) outputPaths = defaultTemplateConfigObj.outputPath.slice();

		tempConfigObj.configName = configName;
		tempConfigObj.exemple = exempleText.text;
		tempConfigObj.tip = tipsText.text;
		tempConfigObj.compName = templateComp.name;
		tempConfigObj.prefix = prefixTxt.text.trim();
		tempConfigObj.refTime = infoText1.properties.ref_time;
		tempConfigObj.separator = getSeparator();
		tempConfigObj.textCase = TEXT_CASES[caseDrop.selection.index];
		tempConfigObj.importPath = importPathLab.properties.importPath || defaultTemplateConfigObj.importPath;
		tempConfigObj.outputPath = outputPaths;
		tempConfigObj.inputLayers = [];

		for (var b = 0; b < templateLayers.length; b++) {
			try {
				tempConfigObj.inputLayers.push({
					layerIndex: templateLayers[b][0].index,
					method: templateLayers[b][1]
				});
			} catch (err) { }
		}

		app.beginUndoGroup('PADEIRO - criar template');

		try {
			// as marcas dos layers não podem ir para o projeto salvo
			for (var i = 0; i < templateLayers.length; i++) {
				templateLayers[i][0].comment = '';
			}
			templateComp.comment = 'TEMPLATE';

			if (!app.project.saveWithDialog()) {
				// salvamento cancelado: restaura as marcas para continuar editando
				for (var r = 0; r < templateLayers.length; r++) {
					templateLayers[r][0].comment = LAYER_MARK;
				}
				return;
			}

			var currentProj = app.project.file;
			var currentTemplateFolder = currentProj.parent;
			var currentProjBase = decodeURI(currentProj.fsName).replace(/\.ae[pt]$/i, '');

			saveTextFile(JSON.stringify(tempConfigObj, null, '\t'), currentProjBase + '_config.json');

			if (tempPreviewFile && tempPreviewFile.exists) {
				tempPreviewFile.copy(new File(currentProjBase + '_preview.png'));
				tempPreviewFile.remove();
			}

			fontCollect(decodeURI(currentTemplateFolder.fsName) + '/FONTS');
			openFolder(decodeURI(currentTemplateFolder.fsName));
		} catch (err) {
			alert(lol + '#PAD_030 - ' + err.message);
		} finally {
			app.endUndoGroup();
		}
	};

	infoBtn.leftClick.onClick = function () {
		openWebSite(repoURL + '/blob/main/README.md#-criando-um-novo-template');
	};

	PAD_MAKER_w.show();
}
