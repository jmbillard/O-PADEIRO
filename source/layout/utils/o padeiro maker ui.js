/* eslint-disable no-empty */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🪟 UI dialog
---------------------------------------------------------------

*/

function PadMakerDialog() {

	var scriptName = 'EDITOR DE TEMPLATES';
	// var scriptVersion = scriptVersion;

	var tempConfigObj = {
		configName: 'NOME DA CONFIGURAÇÃO',
		exemple: 'informação 1\ninformação 2',
		tip: 'coloque aqui as instruções de preenchimento deste template.\nex:\
\ndigite o texto em 1 ou 2 linhas.\
\nuse a quebra de linha para separar "informação" 1 e "informação 2".\
\nuse 1 linha vazia para criar mais de 1 versão do mesmo template selecionado.',

		compName: 'COMP TEMPLATE',
		prefix: 'TARJA',
		refTime: 2,
		separator: '\n',
		textCase: 'lowerCase',
		inputLayers: [],

		importPath: '~/Downloads',
		outputPath: ['~/Desktop'],
	};

	function addLayers() {

		var aItem = app.project.activeItem;

		if (aItem == null) return;

		var selLayers = aItem.selectedLayers;

		if (selLayers.length == 0) return;

		for (var i = 0; i < selLayers.length; i++) {
			var selLayer = selLayers[i];

			if (selLayer.comment == 'TEMPLATE LAYER') continue;

			var layerGrp = layersMainGrp.add('group', undefined);
			layerGrp.orientation = 'row';
			layerGrp.alignChildren = ['left', 'center'];
			layerGrp.spacing = 10;
			layerGrp.margins = 0;

			var layerLab = layerGrp.add(
				'statictext',
				undefined,
				selLayer.index + '   ' + selLayer.name,
				{ selectedLayer: selLayer, truncate: 'end' },
			);
			layerLab.preferredSize.width = 95;
			setCtrlHighlight(layerLab, normalColor2, highlightColor1); // Cor de destaque do texto

			var layerDrop_array = ['nome'];
			if (selLayer instanceof TextLayer) layerDrop_array.push('conteúdo');
			var layerDrop = layerGrp.add(
				'dropdownlist',
				undefined,
				layerDrop_array,
			);
			layerDrop.selection = selLayer instanceof TextLayer ? 1 : 0;
			layerDrop.preferredSize.width = 90;

			// var excludeLayerBtn = layerGrp.add('iconbutton', undefined, closeIcon.light, { style: 'toolbutton', selectedLayer: selLayer });
			// excludeLayerBtn.helpTip = 'excluir layer';
			// excludeLayerBtn.preferredSize = [24, 24];
			var excludeLayerBtn = new themeIconButton(layerGrp, {
				icon: PAD_FECHAR_ICON,
				tips: [lClick + 'remover layer'],
			});

			layerLab.addEventListener('mousedown', function () {
				try {
					this.properties.selectedLayer.selected =
						!this.properties.selectedLayer.selected;
					//
				} catch (err) { }
			});

			excludeLayerBtn.leftClick.onClick = function () {
				try {
					this.parent.parent.parent.children[0].properties.selectedLayer.comment = '';
					//
				} catch (err) {
					alert(lol + '#PAD_024 - ' + err.message); // Exibe uma mensagem de erro
				}

				if (this.parent.parent.parent.parent.children.length > 4) {
					tipsText.size.height -= 18;
					exempleText.size.height -= 18;
				}

				this.parent.parent.parent.parent.remove(
					this.parent.parent.parent,
				);

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

	function addOutputFolder() {

		var outputGrp = outputMainGrp.add('group', undefined);
		outputGrp.orientation = 'row';
		outputGrp.alignChildren = ['left', 'center'];
		outputGrp.spacing = 10;

		var outputPathLab = outputGrp.add(
			'statictext',
			[0, 0, 190, 24],
			'caminho da pasta...',
			{ outputPath: '~/Desktop', truncate: 'middle' },
		);
		outputPathLab.helpTip = 'caminho da pasta:';
		setCtrlHighlight(outputPathLab, normalColor2, highlightColor1); // Cor de destaque do texto

		// var excludeOutputBtn = outputGrp.add('iconbutton', undefined, closeIcon.light, { style: 'toolbutton' });
		// excludeOutputBtn.helpTip = 'excluir caminho';
		// excludeOutputBtn.preferredSize = [24, 24];
		var excludeOutputBtn = new themeIconButton(outputGrp, {
			icon: PAD_FECHAR_ICON,
			tips: [lClick + 'remover output'],
		});

		outputPathLab.addEventListener('mousedown', function () {
			var newOutputFolder = new Folder(this.properties.outputPath);
			var newOutputPath = newOutputFolder.selectDlg(
				'selecione a pasta de output',
			); // Abre a janela de seleção de pastas

			if (newOutputPath == null) return; // Se a janela foi cancelada, não faz nada

			this.properties.outputPath = newOutputPath.fullName;
			this.text = newOutputPath.fullName;
			this.helpTip = 'caminho da pasta de output:\n\n' + newOutputPath.fullName;
		});

		excludeOutputBtn.leftClick.onClick = function () {
			if (this.parent.parent.parent.parent.children.length <= 2) return;

			this.parent.parent.parent.parent.remove(this.parent.parent.parent);
			// outputMainGrp.layout.layout(true);
			PAD_MAKER_w.layout.layout(true);
		};
	}

	function getTemplateLayers() {

		var templateLayersArray = [];

		for (var i = 0; i < layersMainGrp.children.length; i++) {
			try {
				var layerGrp = layersMainGrp.children[i];
				var methodArray = ['layerName', 'textContent'];
				var m = layerGrp.children[1].selection.index;
				var selectedLayer =
					layerGrp.children[0].properties.selectedLayer;

				templateLayersArray.push([selectedLayer, methodArray[m]]);
				//
			} catch (err) { }
		}

		return templateLayersArray;
	}

	function getFontList() {

		var fontNameArray = []; // copied fonts array...
		var compArray = getComps(); // all project comps...

		for (var c = 0; c < compArray.length; c++) {
			var comp = compArray[c]; // current comp...

			for (var l = 1; l <= comp.numLayers; l++) {
				var aLayer = comp.layer(l); // current layer...

				if (!(aLayer instanceof TextLayer)) continue;
				// current text layer...
				var textDoc = aLayer
					.property('ADBE Text Properties')
					.property('ADBE Text Document').value;
				var fontName = textDoc.font; // font name...

				if (fontNameArray.indexOf(fontName) >= 0) continue; // already copied...

				fontNameArray.push(fontName);
			}
		}
		return fontNameArray;
	}

	var tempPreviewFile;

	// ==============

	var PAD_MAKER_w = new Window('palette', scriptName + ' ' + scriptVersion);
	PAD_MAKER_w.orientation = 'row';
	PAD_MAKER_w.alignChildren = ['center', 'top'];

	// ==============

	var layoutMainGrp1 = PAD_MAKER_w.add('group', undefined);
	layoutMainGrp1.orientation = 'column';
	layoutMainGrp1.alignChildren = ['left', 'top'];
	layoutMainGrp1.spacing = 10;
	layoutMainGrp1.margins = 0;

	// Cria um grupo para o cabeçalho da árvore de templates
	var headerGrp1 = layoutMainGrp1.add('group');
	headerGrp1.alignment = 'fill'; // Ocupa todo o espaço disponível
	headerGrp1.orientation = 'stack'; // Empilha os elementos verticalmente

	// Cria um grupo para o botão de informações
	var labGrp1 = headerGrp1.add('group');
	labGrp1.alignment = 'left'; // Alinhamento à esquerda

	// Cria um grupo para o botão de informações
	var infoGrp = headerGrp1.add('group');
	infoGrp.alignment = 'right'; // Alinhamento à direita

	// Rótulo de preview
	var labMain2 = labGrp1.add('statictext', undefined, 'AJUDA BÁSICA:'); // Adiciona um texto estático
	labMain2.preferredSize.height = 24;
	setFgColor(labMain2, normalColor1); // Define a cor do texto

	// Cria o botão de informações
	// var infoBtn = infoGrp.add('iconbutton', undefined, PAD_INFO_ICON.light, { style: 'toolbutton' });
	// infoBtn.helpTip = 'ajuda | DOCS'; // Define a dica da ferramenta
	var infoBtn = new themeIconButton(infoGrp, {
		icon: PAD_INFO_ICON,
		tips: [lClick + 'ajuda | DOCS'],
	});

	var helpGrp = layoutMainGrp1.add('group', undefined);
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
	var helpLab = helpGrp.add('statictext', undefined, instructionsTxt, {
		multiline: true,
	});
	setFgColor(helpLab, normalColor2);

	// ==============

	// var div = PAD_MAKER_w.add('panel', undefined, undefined);
	// 	var newDiv = themeDivider(PAD_MAKER_w);
	var newDiv = themeDivider(PAD_MAKER_w);
	newDiv.alignment = ['center', 'fill'];

	var layoutMainGrp2 = PAD_MAKER_w.add('group', undefined);
	layoutMainGrp2.orientation = 'column';
	layoutMainGrp2.alignChildren = ['left', 'top'];
	layoutMainGrp2.spacing = 20;
	layoutMainGrp2.margins = 0;

	// var div = PAD_MAKER_w.add('panel', undefined, undefined);
	// div.alignment = 'fill';
	newDiv = new themeDivider(PAD_MAKER_w);
	newDiv.alignment = ['center', 'fill'];

	// Cria um grupo para o cabeçalho da árvore de templates
	var layoutGrp3 = PAD_MAKER_w.add('group');
	layoutGrp3.alignment = 'fill'; // Ocupa todo o espaço disponível
	layoutGrp3.orientation = 'stack'; // Empilha os elementos verticalmente

	var layoutMainGrp3 = layoutGrp3.add('group', undefined);
	layoutMainGrp3.orientation = 'column';
	layoutMainGrp3.alignment = 'top';
	layoutMainGrp3.alignChildren = ['left', 'top'];
	layoutMainGrp3.spacing = 20;
	layoutMainGrp3.margins = 0;

	// var div = PAD_MAKER_w.add('panel', undefined, undefined);
	// div.alignment = 'fill';
	newDiv = new themeDivider(PAD_MAKER_w);
	newDiv.alignment = ['center', 'fill'];

	// Cria um grupo para o cabeçalho da árvore de templates
	var layoutGrp4 = PAD_MAKER_w.add('group');
	layoutGrp4.alignment = 'fill'; // Ocupa todo o espaço disponível
	layoutGrp4.orientation = 'stack'; // Empilha os elementos verticalmente

	var layoutMainGrp4 = layoutGrp4.add('group', undefined);
	layoutMainGrp4.orientation = 'column';
	layoutMainGrp4.alignment = 'top';
	layoutMainGrp4.alignChildren = ['left', 'top'];
	layoutMainGrp4.spacing = 20;
	layoutMainGrp4.margins = 0;

	var labMain1 = layoutMainGrp2.add('statictext', undefined, 'FORMULÁRIO:');
	labMain1.preferredSize.height = 24;
	setFgColor(labMain1, normalColor1);

	var formMainGrp = layoutMainGrp2.add('group', undefined);
	formMainGrp.orientation = 'column';
	formMainGrp.alignChildren = ['left', 'center'];
	formMainGrp.spacing = 20;
	formMainGrp.margins = 0;

	// ==============

	var configGrp = formMainGrp.add('group', undefined);
	configGrp.orientation = 'column';
	configGrp.alignChildren = ['left', 'center'];
	configGrp.spacing = 5;
	configGrp.margins = 0;

	var configLab = configGrp.add(
		'statictext',
		undefined,
		'nome da configuração:',
	);
	configLab.preferredSize.height = 18;
	setFgColor(configLab, monoColor0);

	var configText = configGrp.add(
		'edittext',
		[0, 0, 230, 24],
		tempConfigObj.configName,
	);
	configText.helpTip = 'identificador da configuração.';

	var tipsGrp = formMainGrp.add('group', undefined);
	tipsGrp.orientation = 'column';
	tipsGrp.alignChildren = ['left', 'center'];
	tipsGrp.spacing = 5;
	tipsGrp.margins = 0;

	var tipsLab = tipsGrp.add('statictext', undefined, 'dicas:');
	tipsLab.preferredSize.height = 18;
	setFgColor(tipsLab, monoColor0);

	var tipsText = tipsGrp.add(
		'edittext',
		[0, 0, 230, 260],
		tempConfigObj.tip,
		{ multiline: true },
	);
	tipsText.helpTip = 'as dicas para ajudar no preenchimento.';

	var exempleGrp = formMainGrp.add('group', undefined);
	exempleGrp.orientation = 'column';
	exempleGrp.alignChildren = ['left', 'center'];
	exempleGrp.spacing = 5;
	exempleGrp.margins = 0;

	var exempleLab = exempleGrp.add(
		'statictext',
		undefined,
		'exemplo de preenchimento:',
	);
	exempleLab.preferredSize.height = 18;
	setFgColor(exempleLab, monoColor0);

	var exempleText = exempleGrp.add(
		'edittext',
		[0, 0, 230, 90],
		tempConfigObj.exemple,
		{ multiline: true },
	);
	exempleText.helpTip = 'apenas um exemplo.';

	// ==============

	var previewGrp = layoutMainGrp3.add('group', undefined);
	previewGrp.orientation = 'column';
	previewGrp.alignChildren = ['left', 'center'];
	previewGrp.spacing = 10;
	previewGrp.margins = 0;

	var labMain3 = previewGrp.add('statictext', undefined, 'PROJETO:');
	labMain3.preferredSize.height = 24;
	setFgColor(labMain3, normalColor1);

	var previewMainGrp = previewGrp.add('group', undefined);
	previewMainGrp.orientation = 'column';
	previewMainGrp.alignChildren = ['left', 'center'];
	previewMainGrp.spacing = 8;
	previewMainGrp.margins = 0;

	var previewImg = previewMainGrp.add('image', [0, 0, 230, 130], no_preview); // Adiciona um elemento de imagem ao grupo de preview. 'no_preview'

	var btnGrp1 = previewMainGrp.add('group', undefined);
	btnGrp1.orientation = 'row';
	btnGrp1.spacing = 10;
	btnGrp1.margins = 0;

	// var captureBtn = btnGrp1.add('button', [0, 0, 230, 24], 'capturar preview', { ref_time: app.project.activeItem.time });
	// captureBtn.helpTip = 'captura o frame de preview,\na comp principal e o\ntempo de referência';
	var captureBtn = new themeButton(btnGrp1, {
		width: 230,
		height: 32,
		// textColor: bgColor1,
		// buttonColor: normalColor1,
		labelTxt: 'capturar preview',
		tips: [
			lClick + 'capturar o frame de preview,\na comp principal e o\ntempo de referência',
		],
	});

	// var div = layoutMainGrp3.add('panel', undefined, undefined);
	// div.alignment = 'fill';
	newDiv = new themeDivider(layoutMainGrp3);
	newDiv.alignment = ['fill', 'center'];

	// ==============

	var projGrp = layoutMainGrp3.add('group', undefined);
	projGrp.orientation = 'column';
	projGrp.alignChildren = ['left', 'center'];
	projGrp.spacing = 5;
	projGrp.margins = 0;

	// ==============

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

	var prefixTxt = prefixGrp.add(
		'edittext',
		[0, 0, 90, 24],
		tempConfigObj.prefix,
	);
	prefixTxt.helpTip =
		'prefixo que será inserido no nome final de todas as versões desse template.';

	var separatorGrp = projGeneralGrp.add('group', undefined);
	separatorGrp.alignChildren = ['left', 'center'];
	separatorGrp.spacing = 10;
	separatorGrp.margins = 0;

	var separatorLab = separatorGrp.add('statictext', undefined, 'separador:');
	separatorLab.preferredSize.width = 130;
	setFgColor(separatorLab, monoColor0);

	var separatorTxt = separatorGrp.add(
		'edittext',
		[0, 0, 90, 24],
		tempConfigObj.separator.replace(/\n|\r/g, '\\n'),
	);
	separatorTxt.helpTip =
		'separador de informações\n\nuse "\\n" para colocar cada linha de texto em um layer diferente';

	// ==============

	// var newDiv = layoutMainGrp3.add('panel', undefined, undefined);
	newDiv = new themeDivider(layoutMainGrp3);
	newDiv.alignment = ['fill', 'center'];

	// ==============

	var layersMainGrp = layoutMainGrp3.add('group', undefined);
	layersMainGrp.orientation = 'column';
	layersMainGrp.alignChildren = ['left', 'center'];
	layersMainGrp.spacing = 10;
	layersMainGrp.margins = [0, 0, 0, 29];

	// ==============

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

	// var selectLayersBtn = btnGrp4.add('button', [0, 0, 110, 24], '+ layers');
	var selectLayersBtn = new themeButton(btnGrp4, {
		width: 110,
		height: 32,
		// textColor: bgColor1,
		// buttonColor: normalColor1,
		labelTxt: '+ layers',
		tips: [
			lClick + 'adicionar layers selecionados a configuração do template',
		],
	});

	// var testBtn = btnGrp4.add('button', [0, 0, 110, 24], 'testar');
	// testBtn.helpTip = 'testar preenchimento com o exemplo';
	var testBtn = new themeButton(btnGrp4, {
		width: 110,
		height: 32,
		// textColor: bgColor1,
		// buttonColor: normalColor1,
		labelTxt: 'testar agora',
		tips: [lClick + 'testar preenchimento com o exemplo'],
	});

	// ==============

	var labMain5 = layoutMainGrp4.add('statictext', undefined, 'CAMINHOS:');
	labMain5.preferredSize.height = 24;
	setFgColor(labMain5, normalColor1);

	var importMainGrp = layoutMainGrp4.add('group', undefined);
	importMainGrp.orientation = 'column';
	importMainGrp.alignChildren = ['left', 'center'];
	importMainGrp.spacing = 2;
	importMainGrp.margins = 0;

	var importLab = importMainGrp.add(
		'statictext',
		undefined,
		'pasta de mídias: (opcional)',
	);
	importLab.preferredSize.height = 18;
	setFgColor(importLab, monoColor0);

	var importPathLab = importMainGrp.add(
		'statictext',
		[0, 0, 230, 24],
		'caminho da pasta...',
		{ importPath: tempConfigObj.importPath, truncate: 'middle' },
	);
	importPathLab.helpTip = 'caminho da pasta:';
	setCtrlHighlight(importPathLab, normalColor2, highlightColor1); // Cor de destaque do texto

	// ==============

	var outputMainGrp = layoutMainGrp4.add('group', undefined);
	outputMainGrp.orientation = 'column';
	outputMainGrp.alignChildren = ['left', 'center'];
	outputMainGrp.spacing = 2;
	outputMainGrp.margins = 0;

	var outputLab = outputMainGrp.add(
		'statictext',
		undefined,
		'pastas de output:',
	);
	outputLab.preferredSize.height = 18;
	setFgColor(outputLab, monoColor0);

	var btnGrp2 = layoutMainGrp4.add('group', undefined);
	btnGrp2.orientation = 'row';
	btnGrp2.alignment = 'bottom';
	btnGrp2.spacing = 10;
	btnGrp2.margins = 0;

	// var newOutputBtn = btnGrp2.add('button', [0, 0, 230, 24], '+ novo output');
	var newOutputBtn = new themeButton(btnGrp2, {
		width: 230,
		height: 32,
		// textColor: bgColor1,
		// buttonColor: normalColor1,
		labelTxt: '+ novo output',
		tips: [lClick + 'adicionar um novo output a configuração do template'],
	});

	// var div = layoutMainGrp4.add('panel', undefined, undefined);
	// div.alignment = 'fill';
	newDiv = new themeDivider(layoutMainGrp4);
	newDiv.alignment = ['fill', 'center'];

	var infoMainGrp = layoutMainGrp4.add('group', undefined);
	infoMainGrp.orientation = 'column';
	infoMainGrp.alignChildren = ['left', 'top'];
	infoMainGrp.spacing = 10;
	infoMainGrp.margins = 0;

	var infoGrp1 = infoMainGrp.add('group', undefined);
	infoGrp1.orientation = 'column';
	infoGrp1.alignChildren = ['left', 'center'];
	infoGrp1.spacing = 2;
	infoGrp1.margins = 0;

	var infoLab1 = infoGrp1.add('statictext', undefined, 'comp principal:');
	infoLab1.preferredSize.height = 18;
	setFgColor(infoLab1, monoColor0);

	var infoText1 = infoGrp1.add(
		'statictext',
		[0, 0, 230, 18],
		app.project.activeItem.name,
		{
			comp: app.project.activeItem,
			ref_time: app.project.activeItem.time,
			truncate: 'end',
		},
	);
	infoText1.helpTip = 'comp principal do template';
	setFgColor(infoText1, normalColor2); // Cor de destaque do texto

	var infoGrp2 = infoMainGrp.add('group', undefined);
	infoGrp2.orientation = 'column';
	infoGrp2.alignChildren = ['left', 'center'];
	infoGrp2.spacing = 2;
	infoGrp2.margins = 0;

	var infoLab2 = infoGrp2.add(
		'statictext',
		undefined,
		'preview da nomenclatura:',
	);
	infoLab2.preferredSize.height = 18;
	setFgColor(infoLab2, monoColor0);

	var infoText2 = infoGrp2.add('statictext', [0, 0, 230, 18], '...', {
		truncate: 'end',
	});
	setFgColor(infoText2, normalColor2); // Cor de destaque do texto

	var infoGrp3 = infoMainGrp.add('group', undefined);
	infoGrp3.orientation = 'column';
	infoGrp3.alignChildren = ['left', 'center'];
	infoGrp3.spacing = 2;
	infoGrp3.margins = [0, 0, 0, 44];

	var infoLab3 = infoGrp3.add('statictext', undefined, 'fontes usadas:');
	infoLab3.preferredSize.height = 18;
	setFgColor(infoLab3, monoColor0);

	var fontList = getFontList();

	for (var f = 0; f < fontList.length; f++) {
		var infoText3 = infoGrp3.add(
			'statictext',
			[0, 0, 230, 18],
			fontList[f],
			{ truncate: 'end' },
		);
		infoText3.helpTip = fontList[f];
		setFgColor(infoText3, normalColor2); // Cor de destaque do texto
	}

	var bottomGrp4 = layoutGrp4.add('group', undefined);
	bottomGrp4.orientation = 'column';
	bottomGrp4.alignment = 'bottom';
	bottomGrp4.alignChildren = ['left', 'top'];
	bottomGrp4.spacing = 20;
	bottomGrp4.margins = 0;

	var btnGrp3 = bottomGrp4.add('group', undefined);
	btnGrp3.orientation = 'row';
	btnGrp3.spacing = 10;
	btnGrp3.margins = 0;

	// var makeBtn = btnGrp3.add('button', [0, 0, 230, 24], 'criar');
	// makeBtn.helpTip = 'salvar template';
	var makeBtn = new themeButton(btnGrp3, {
		width: 230,
		height: 32,
		textColor: bgColor1,
		buttonColor: normalColor1,
		labelTxt: 'salvar template',
		tips: [lClick + 'salvar novo template'],
	});

	setBgColor(PAD_MAKER_w, bgColor1); // Cor de fundo da janela

	// ==============

	PAD_MAKER_w.onClose = function () {
		var templateLayers = getTemplateLayers();

		for (var i = 0; i < templateLayers.length; i++) {
			templateLayers[i][0].comment = '';
		}

		try {
			tempPreviewFile.remove();
			//
		} catch (err) { }
	};

	PAD_MAKER_w.onShow = function () {
		var tempItem = app.project.activeItem;

		if (tempItem == null) return;

		var tempPreviewName =
			tempItem.name
				.toUpperCase()
				.replaceSpecialCharacters()
				.replace(/\s+/g, '_') + '_preview.png';

		infoText1.properties.comp = tempItem;
		infoText1.properties.ref_time = tempItem.time;

		try {
			tempPreviewFile = new File(tempPath + '/' + tempPreviewName);
			tempItem.saveFrameToPng(tempItem.time, tempPreviewFile);

			$.sleep(500);
			previewImg.image = tempPreviewFile;
			//
		} catch (err) {
			alert(lol + '#PAD_026 - ' + err.message); // Exibe uma mensagem de erro
		}

		addLayers();
		addOutputFolder();

		separatorTxt.enabled = layersMainGrp.children.length > 1;
		separatorLab.enabled = layersMainGrp.children.length > 1;

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
		var prefix = this.text.toUpperCase().replaceSpecialCharacters();
		var inputTxt = exempleText.text.split(/\n{2,}/)[0];
		infoText2.text = infoText2.helpTip =
			prefix + ' - ' + inputTxt.toUpperCase().replaceSpecialCharacters();
	};

	prefixTxt.onChange = function () {
		this.text = this.text.toUpperCase().replaceSpecialCharacters();
	};

	exempleText.onChanging = function () {
		var prefix = prefixTxt.text.toUpperCase().replaceSpecialCharacters();
		var inputTxt = this.text.split(/\n{2,}/)[0];
		infoText2.text = infoText2.helpTip =
			prefix + ' - ' + inputTxt.toUpperCase().replaceSpecialCharacters();
	};

	captureBtn.leftClick.onClick = function () {
		// alert(0);
		var tempItem = app.project.activeItem;

		if (tempItem == null) return;

		var tempPreviewName =
			tempItem.name
				.toUpperCase()
				.replaceSpecialCharacters()
				.replace(/\s+/g, '_') + '_preview.png';

		infoText1.properties.comp = tempItem;
		infoText1.properties.ref_time = tempItem.time;

		try {
			tempPreviewFile = new File(tempPath + '/' + tempPreviewName);
			tempPreviewFile.remove();
			//
		} catch (err) {
			alert(lol + '#PAD_025 - ' + err.message); // Exibe uma mensagem de erro
		}

		try {
			tempPreviewFile = new File(tempPath + '/' + tempPreviewName);
			tempItem.saveFrameToPng(tempItem.time, tempPreviewFile);

			$.sleep(300);
			previewImg.image = tempPreviewFile;
			//
		} catch (err) {
			alert(lol + '#PAD_023 - ' + err.message); // Exibe uma mensagem de erro
		}
		// previewGrp.layout.layout(true);
		// layoutMainGrp3.layout.layout(true);
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
		var newImportPath = newImportFolder.selectDlg(
			'selecione a pasta de mídias',
		); // Abre a janela de seleção de pastas

		if (newImportPath == null) return; // Se a janela foi cancelada, não faz nada

		this.properties.importPath = newImportPath.fullName;
		this.text = newImportPath.fullName;
		this.helpTip =
			'caminho da pasta de mídias:\n\n' + newImportPath.fullName;
	});

	testBtn.leftClick.onClick = function () {
		var inputTxt = exempleText.text.split(/\n{2,}/)[0];
		var txtCase = caseDrop.selection.index;
		var templateLayers = getTemplateLayers();
		var separador = separatorTxt.text.replace(/\\n|\\r/g, '\n');

		if (separatorTxt.text == '' || templateLayers.length < 2)
			separador = '---';

		if (txtCase == 0) inputTxt = exempleText.text = inputTxt.toUpperCase(); // Converte para MAIÚSCULAS
		if (txtCase == 1) inputTxt = exempleText.text = inputTxt.toLowerCase(); // Converte para minúsculas
		if (txtCase == 2) inputTxt = exempleText.text = inputTxt.toTitleCase(); // Converte para 'Title Case'

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
					.property('ADBE Text Properties') // Obtém a propriedade de texto
					.property('ADBE Text Document') // Obtém o documento de texto
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
		if (separatorTxt.text == '' || templateLayers.length < 2)
			tempConfigObj.separator = '---';

		tempConfigObj.textCase = [
			'upperCase',
			'lowerCase',
			'titleCase',
			'freeCase',
		][caseDrop.selection.index];
		tempConfigObj.inputLayers = [];

		for (var b = 0; b < layersMainGrp.children.length; b++) {
			try {
				var layerGrp = layersMainGrp.children[b];
				var methodArray = ['layerName', 'textContent'];
				var m = layerGrp.children[1].selection.index;
				var selectedLayer =
					layerGrp.children[2].properties.selectedLayer;

				tempConfigObj.inputLayers.push({
					layerIndex: selectedLayer.index,
					method: methodArray[m],
				});
				//
			} catch (err) { }
		}

		tempConfigObj.importPath = importPathLab.properties.importPath;
		tempConfigObj.outputPath = [];

		for (var o = 0; o < outputMainGrp.children.length; o++) {
			try {
				var outputGrp = outputMainGrp.children[o];
				var outputPath = outputGrp.children[0].properties.outputPath;
				tempConfigObj.outputPath.push(outputPath);
				//
			} catch (err) { }
		}
		var isSaved = app.project.saveWithDialog();

		if (!isSaved) return;

		var currentProj = app.project.file;
		var currentTemplateFolder = currentProj.parent;
		var currentProjBase = decodeURI(currentProj.fullName).replace(
			/\.ae[pt]/,
			'',
		);

		try {
			var configContent = JSON.stringify(tempConfigObj, null, '\t');
			var templateImg = new File(currentProjBase + '_preview.png');

			tempPreviewFile.copy(templateImg);
			saveTextFile(configContent, currentProjBase + '_config.json');
			fontCollect(decodeURI(currentTemplateFolder.fullName) + '/FONTS'); // caminho final do collect

			tempPreviewFile.remove();

			openFolder(decodeURI(currentTemplateFolder.fullName));
			//
		} catch (err) {
			alert(lol + '#PAD_028 - ' + err.message); // Exibe uma mensagem de erro
		}
		app.endUndoGroup();
	};

	// Função para abrir a página de documentação quando o botão 'Informações' é clicado
	infoBtn.leftClick.onClick = function () {
		// Abre a página de documentação do script 'O Padeiro' no GitHub em um navegador web
		openWebSite(repoURL + '/blob/main/README.md#-criando-um-novo-template');
	};

	PAD_MAKER_w.show();
}
