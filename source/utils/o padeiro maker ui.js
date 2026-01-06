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

	// Objeto de configuração temporário
	var tempConfigObj = defaultTemplateConfigObj;

	// Adiciona os layers editáveis
	function addLayers() {
		// Item selecionado no painel do projeto
		var aItem = app.project.activeItem;

		if (aItem == null) return; // Aborta se não houver item selecionado

		// Layers selecionados
		var selLayers = aItem.selectedLayers;

		if (selLayers.length == 0) return; // Aborta se não houver layers selecionados

		// Loop para cada layer selecionado
		for (var i = 0; i < selLayers.length; i++) {
			var selLayer = selLayers[i];

			// Ignora layers com o comentário 'TEMPLATE LAYER'
			if (selLayer.comment == 'TEMPLATE LAYER') continue;

			// Grupo do layer
			var layerGrp = layersMainGrp.add('group');
			layerGrp.orientation = 'row';
			layerGrp.alignChildren = ['left', 'center'];
			layerGrp.spacing = 10;

			// Rotulo do layer --> '1   Ctrl'
			var layerLab = layerGrp.add('statictext', undefined, selLayer.index + '   ' + selLayer.name, {
				selectedLayer: selLayer,
				truncate: 'end'
			});
			layerLab.preferredSize.width = 95;
			setCtrlHighlight(layerLab, normalColor2, highlightColor1); // Define o texto como link

			// Array com os métodos de preenchimento
			// Método 'nome' serve para qualquer tipo de layer
			var layerDrop_array = ['nome'];

			// Método 'conteúdo' serve para layers de texto
			if (selLayer instanceof TextLayer) layerDrop_array.push('conteúdo');

			// Lista de métodos de preenchimento
			var layerDrop = layerGrp.add('dropdownlist', undefined, layerDrop_array);
			// Define o método de preenchimento
			layerDrop.selection = selLayer instanceof TextLayer ? 1 : 0;
			layerDrop.preferredSize.width = 90;

			// Botão excluir layer
			var excludeLayerBtn = new themeIconButton(layerGrp, {
				icon: PAD_FECHAR_ICON,
				tips: [lClick + 'remover layer']
			});

			// Eventos
			layerLab.addEventListener('mousedown', function () {
				try {
					this.properties.selectedLayer.selected = !this.properties.selectedLayer.selected;
				} catch (err) {}
			});

			excludeLayerBtn.leftClick.onClick = function () {
				try {
					this.parent.parent.parent.children[0].properties.selectedLayer.comment = '';
				} catch (err) {
					alert(lol + '#PAD_024 - ' + err.message);
				}

				if (this.parent.parent.parent.parent.children.length > 4) {
					tipsText.size.height -= 18;
					exempleText.size.height -= 18;
				}

				this.parent.parent.parent.parent.remove(this.parent.parent.parent);

				PAD_MAKER_w.layout.layout(true);
				layoutMainGrp3.layout.layout(true);
				layersMainGrp.layout.layout(true);

				separatorTxt.enabled = layersMainGrp.children.length > 1;
				separatorLab.enabled = layersMainGrp.children.length > 1;
			};
			if (layersMainGrp.children.length > 4) {
				tipsText.size.height += 18;
				exempleText.size.height += 18;
			}
			selLayer.comment = 'TEMPLATE LAYER';
		}
	}

	// Adiciona uma pasta de output
	function addOutputFolder() {
		// Grupo principal da pasta de output
		var outputGrp = outputMainGrp.add('group');
		outputGrp.orientation = 'row';
		outputGrp.alignChildren = ['left', 'center'];
		outputGrp.spacing = 10;

		// Rotulo da pasta de output
		var outputPathLab = outputGrp.add('statictext', [0, 0, 190, 24], 'caminho da pasta...', {
			outputPath: '~/Desktop',
			truncate: 'middle'
		});
		outputPathLab.helpTip = 'caminho da pasta:';
		setCtrlHighlight(outputPathLab, normalColor2, highlightColor1); // Define o texto como link

		// Botão excluir pasta de output
		var excludeOutputBtn = new themeIconButton(outputGrp, {
			icon: PAD_FECHAR_ICON,
			tips: [lClick + 'remover output']
		});

		// Eventos
		outputPathLab.addEventListener('mousedown', function () {
			var newOutputFolder = new Folder(this.properties.outputPath);
			var newOutputPath = newOutputFolder.selectDlg('selecione a pasta de output');

			if (newOutputPath == null) return;

			this.properties.outputPath = newOutputPath.fullName;
			this.text = newOutputPath.fullName;
			this.helpTip = 'caminho da pasta de output:\n\n' + newOutputPath.fullName;
		});

		excludeOutputBtn.leftClick.onClick = function () {
			if (this.parent.parent.parent.parent.children.length <= 2) return;

			this.parent.parent.parent.parent.remove(this.parent.parent.parent);
			PAD_MAKER_w.layout.layout(true);
		};
	}

	// Retorna os layers editáveis e os seus métodos
	function getTemplateLayers() {
		var templateLayersArray = [];

		for (var i = 0; i < layersMainGrp.children.length; i++) {
			try {
				var layerGrp = layersMainGrp.children[i];
				var methodArray = ['layerName', 'textContent'];
				var m = layerGrp.children[1].selection.index;
				var selectedLayer = layerGrp.children[0].properties.selectedLayer;

				templateLayersArray.push([selectedLayer, methodArray[m]]);
			} catch (err) {}
		}

		return templateLayersArray;
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
preencha o os dados do formulário.\n\
posicione a agulha da timeline em um frame de referencia, e capture a imagem de preview do template.\n\
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
	caseDrop.selection = 0;
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

	var importPathLab = importMainGrp.add('statictext', [0, 0, 230, 24], 'caminho da pasta...', {
		importPath: tempConfigObj.importPath,
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
			templateLayers[i][0].comment = '';
		}

		try {
			tempPreviewFile.remove();
			//
		} catch (err) {}
	};

	PAD_MAKER_w.onShow = function () {
		var tempItem = app.project.activeItem;

		if (tempItem == null) return;

		var tempPreviewName =
			tempItem.name.toUpperCase().replaceSpecialCharacters().replace(/\s+/g, '_') + '_preview.png';

		infoText1.properties.comp = tempItem;
		infoText1.properties.ref_time = tempItem.time;

		try {
			tempPreviewFile = new File(tempPath + '/' + tempPreviewName);
			tempItem.saveFrameToPng(tempItem.time, tempPreviewFile);

			$.sleep(500);
			previewImg.image = tempPreviewFile;
			//
		} catch (err) {}

		addLayers();
		addOutputFolder();

		separatorTxt.enabled = layersMainGrp.children.length > 1;
		separatorLab.enabled = layersMainGrp.children.length > 1;

		var prefix = prefixTxt.text.trim().toUpperCase().replaceSpecialCharacters();

		var inputTxt = exempleText.text
			.split(/\n{2,}/)[0]
			.replace(/\n|\r/g, ' ')
			.split(separatorTxt.text)
			.join(' ')
			.replaceSpecialCharacters();

		var namePreview = [prefix, '-', inputTxt]
			.join(' ')
			.toUpperCase()
			.replace(/\s+/g, ' ');
		
		infoText2.text = infoText2.helpTip = namePreview;

		layersMainGrp.layout.layout(true);
		outputMainGrp.layout.layout(true);
		tipsGrp.layout.layout(true);
		exempleGrp.layout.layout(true);
		layoutMainGrp2.layout.layout(true);
		layoutMainGrp3.layout.layout(true);
		layoutMainGrp4.layout.layout(true);
		PAD_MAKER_w.layout.layout(true);
	};

	prefixTxt.onChanging = function () {
		var prefix = this.text.trim().toUpperCase().replaceSpecialCharacters();
		var inputTxt = exempleText.text
			.split(/\n{2,}/)[0]
			.replace(/\n|\r/g, ' ')
			.split(separatorTxt.text)
			.join(' ')
			.replaceSpecialCharacters();

		infoText2.text = infoText2.helpTip = [prefix, globalSeparator, inputTxt]
			.join(' ')
			.toUpperCase()
			.replace(/\s+/g, ' ');
	};

	separatorTxt.onChanging = function () {
		var prefix = prefixTxt.text.trim().toUpperCase().replaceSpecialCharacters();
		var inputTxt = exempleText.text
			.split(/\n{2,}/)[0]
			.replace(/\n|\r/g, ' ')
			.split(this.text)
			.join(' ')
			.replaceSpecialCharacters();

		infoText2.text = infoText2.helpTip = [prefix, globalSeparator, inputTxt]
			.join(' ')
			.toUpperCase()
			.replace(/\s+/g, ' ');
	};

	prefixTxt.onChange = function () {
		this.text = this.text.trim().toUpperCase().replaceSpecialCharacters();
	};

	exempleText.onChanging = function () {
		var prefix = prefixTxt.text.toUpperCase().replaceSpecialCharacters();
		var inputTxt = this.text
			.split(/\n{2,}/)[0]
			.replace(/\n|\r/g, ' ')
			.split(separatorTxt.text)
			.join(' ')
			.replaceSpecialCharacters();

		infoText2.text = infoText2.helpTip = [prefix, globalSeparator, inputTxt]
			.join(' ')
			.toUpperCase()
			.replace(/\s+/g, ' ');
	};

	captureBtn.leftClick.onClick = function () {
		var tempItem = app.project.activeItem;

		if (tempItem == null) return;

		var tempPreviewName =
			tempItem.name.toUpperCase().replaceSpecialCharacters().replace(/\s+/g, '_') + '_preview.png';

		infoText1.text = tempItem.name;

		infoText1.properties.comp = tempItem;
		infoText1.properties.ref_time = tempItem.time;

		try {
			tempPreviewFile = new File(tempPath + '/' + tempPreviewName);
			tempPreviewFile.remove();
		} catch (err) {
			alert(lol + '#PAD_025 - ' + err.message);
		}

		try {
			tempPreviewFile = new File(tempPath + '/' + tempPreviewName);
			tempItem.saveFrameToPng(tempItem.time, tempPreviewFile);

			$.sleep(300);
			previewImg.image = tempPreviewFile;
		} catch (err) {}

		PAD_MAKER_w.layout.layout(true);
	};

	selectLayersBtn.leftClick.onClick = function () {
		addLayers();

		separatorTxt.enabled = layersMainGrp.children.length > 1;
		separatorLab.enabled = layersMainGrp.children.length > 1;

		tipsGrp.layout.layout(true);
		exempleGrp.layout.layout(true);
		layoutMainGrp2.layout.layout(true);
		layersMainGrp.layout.layout(true);
		layoutMainGrp3.layout.layout(true);
		PAD_MAKER_w.layout.layout(true);
	};

	importPathLab.addEventListener('mousedown', function () {
		var newImportFolder = new Folder(this.properties.importPath);
		var newImportPath = newImportFolder.selectDlg('selecione a pasta de mídias');

		if (newImportPath == null) return;

		this.properties.importPath = newImportPath.fullName;
		this.text = newImportPath.fullName;
		this.helpTip = 'caminho da pasta de mídias:\n\n' + newImportPath.fullName;
	});

	testBtn.leftClick.onClick = function () {
		var inputTxt = exempleText.text.split(/\n{2,}/)[0];
		var txtCase = caseDrop.selection.index;
		var templateLayers = getTemplateLayers();
		var separador = separatorTxt.text.replace(/\\n|\\r/g, '\n');

		if (separatorTxt.text == '' || templateLayers.length < 2) separador = '---';

		if (txtCase == 0) inputTxt = exempleText.text = inputTxt.toUpperCase();
		if (txtCase == 1) inputTxt = exempleText.text = inputTxt.toLowerCase();
		if (txtCase == 2) inputTxt = exempleText.text = inputTxt.toTitleCase();

		var inputArray = inputTxt.split(separador);

		if (templateLayers.length == 0) return;

		app.beginUndoGroup('PADEIRO - testar preenchimento');

		for (var i = 0; i < templateLayers.length; i++) {
			var selectedLayer = templateLayers[i][0];
			var method = templateLayers[i][1];
			selectedLayer.enabled = i < inputArray.length;

			if (i > inputArray.length - 1) continue;

			if (method == 'textContent') {
				selectedLayer
					.property('ADBE Text Properties')
					.property('ADBE Text Document')
					.setValue(inputArray[i].trim());
			}
			if (method == 'layerName') {
				selectedLayer.name = inputArray[i].trim();
			}
		}
		app.endUndoGroup();
		captureBtn.leftClick.notify();
	};

	newOutputBtn.leftClick.onClick = function () {
		addOutputFolder();

		outputMainGrp.layout.layout(true);
		layoutMainGrp4.layout.layout(true);
		PAD_MAKER_w.layout.layout(true);
	};

	makeBtn.leftClick.onClick = function () {
		app.beginUndoGroup('PADEIRO - criar template');

		var templateLayers = getTemplateLayers();

		for (var i = 0; i < templateLayers.length; i++) {
			templateLayers[i][0].comment = '';
		}

		infoText1.properties.comp.comment = 'TEMPLATE';

		tempConfigObj.configName = configText.text;
		tempConfigObj.exemple = exempleText.text;
		tempConfigObj.tip = tipsText.text;
		tempConfigObj.compName = infoText1.properties.comp.name;
		tempConfigObj.prefix = prefixTxt.text;
		tempConfigObj.refTime = infoText1.properties.ref_time;

		tempConfigObj.separator = separatorTxt.text.replace(/\\n|\\r/g, '\n');
		if (separatorTxt.text == '' || templateLayers.length < 2) tempConfigObj.separator = '---';

		tempConfigObj.textCase = ['upperCase', 'lowerCase', 'titleCase', 'freeCase'][caseDrop.selection.index];
		tempConfigObj.inputLayers = [];

		for (var b = 0; b < templateLayers.length; b++) {
			try {
				tempConfigObj.inputLayers.push({
					layerIndex: templateLayers[b][0].index,
					method: templateLayers[b][1]
				});
			} catch (err) {}
		}

		tempConfigObj.importPath = importPathLab.properties.importPath;
		tempConfigObj.outputPath = [];

		for (var o = 0; o < outputMainGrp.children.length; o++) {
			try {
				var outputGrp = outputMainGrp.children[o];
				var outputPath = outputGrp.children[0].properties.outputPath;
				tempConfigObj.outputPath.push(outputPath);
			} catch (err) {}
		}
		var isSaved = app.project.saveWithDialog();

		if (!isSaved) return;

		var currentProj = app.project.file;
		var currentTemplateFolder = currentProj.parent;
		var currentProjBase = decodeURI(currentProj.fullName).replace(/\.ae[pt]/, '');

		try {
			var configContent = JSON.stringify(tempConfigObj, null, '\t');
			var templateImg = new File(currentProjBase + '_preview.png');

			tempPreviewFile.copy(templateImg);
			saveTextFile(configContent, currentProjBase + '_config.json');
			fontCollect(decodeURI(currentTemplateFolder.fullName) + '/FONTS');

			tempPreviewFile.remove();

			openFolder(decodeURI(currentTemplateFolder.fullName));
		} catch (err) {
			alert(lol + '#PAD_028 - ' + err.message);
		}
		app.endUndoGroup();
	};

	infoBtn.leftClick.onClick = function () {
		openWebSite(repoURL + '/blob/main/README.md#-criando-um-novo-template');
	};

	PAD_MAKER_w.show();
}
