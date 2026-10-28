/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🪟 UI dialogs
---------------------------------------------------------------

*/

function findDialog() {
	var scriptName = 'BUSCA';
	var scriptVersion = 'v2.5';

	var findW = new Window('palette', scriptName + ' ' + scriptVersion);
	findW.orientation = 'column';
	findW.alignChildren = ['left', 'top'];
	findW.spacing = 8;
	findW.margins = 12;

	var contentWidth = PAD_SEARCH_UI_WIDTH - findW.margins.left - findW.margins.right;

	//---------------------------------------------------------

	var header = themeSearchHeader(findW, contentWidth, [lClick + 'ler os textos do projeto e buscar']);
	var findEdTxt = header.edit;
	var findBtn = header.btn;

	findEdTxt.helpTip = 'Enter lê os textos do projeto; depois a busca filtra enquanto você digita';

	//---------------------------------------------------------

	var optMainGrp = findW.add('group');
	optMainGrp.spacing = 30;

	var optGrp5 = optMainGrp.add('group');
	optGrp5.alignChildren = ['center', 'top'];
	optGrp5.spacing = 2;

	var optCkb5 = optGrp5.add('checkbox');
	optCkb5.value = false;

	var optIco5 = optGrp5.add('image', undefined, eyeOpenLabelIcon);
	optCkb5.helpTip = optIco5.helpTip = '⦿  → apenas layers visíveis';

	//---------------------------------------------------------

	var optGrp1 = optMainGrp.add('group');
	optGrp1.alignChildren = ['center', 'top'];
	optGrp1.spacing = 2;

	var optCkb1 = optGrp1.add('checkbox');
	optCkb1.value = false;

	var optTxt1 = optGrp1.add('statictext', undefined, 'Tt');
	optCkb1.helpTip = optTxt1.helpTip = '⦿  → considerar maiúsculas e minúsculas';

	//---------------------------------------------------------

	var optGrp2 = optMainGrp.add('group');
	optGrp2.alignChildren = ['center', 'top'];
	optGrp2.spacing = 2;

	var optCkb2 = optGrp2.add('checkbox');
	optCkb2.value = false;

	var optTxt2 = optGrp2.add('statictext', undefined, 'àê');
	optCkb2.helpTip = optTxt2.helpTip = '⦿  → considerar acentuação';

	//---------------------------------------------------------

	var optGrp4 = optMainGrp.add('group');
	optGrp4.alignChildren = ['center', 'top'];
	optGrp4.spacing = 2;

	var optCkb4 = optGrp4.add('checkbox');
	optCkb4.value = false;

	var optTxt4 = optGrp4.add('statictext', undefined, '!=');
	optCkb4.helpTip = optTxt4.helpTip = '⦿  → apenas textos que NÃO possuem o termo buscado';

	//---------------------------------------------------------

	var infoBtn = new themeIconButton(optMainGrp, {
		icon: PAD_INFO_ICON,
		tips: [lClick + 'ajuda | DOCS']
	});

	var findProgressBar = findW.add('progressbar', [0, 0, contentWidth, 1], undefined);
	findProgressBar.value = 100;

	var resultTree = findW.add('treeview', [0, 0, contentWidth, 0]);
	resultTree.visible = false;

	setBgColor(findW, bgColor1);

	//---------------------------------------------------------
	findW.onShow = function () {
		findEdTxt.active = true;
	};

	// Índice com o texto de todos os layers de texto (montado ao buscar com Enter / botão).
	// Enquanto a janela está aberta, digitar ou mudar as opções filtra esse índice na hora.
	var textIndex = null;

	function getSearchOptions() {
		return {
			sKey: findEdTxt.text,
			vis: optCkb5.value,
			matchCase: optCkb1.value,
			matchAccent: optCkb2.value,
			invert: optCkb4.value
		};
	}

	function showResults() {
		resultTree.visible = false;
		resultTree.size.height = 0;

		if (textIndex == null || findEdTxt.text == '') {
			findW.text = textIndex == null ? 'BUSCAR...' : 'ÍNDICE: ' + textIndex.length + ' textos';
			findW.layout.layout(true);
			return;
		}

		populateTxtSearchTree(resultTree, filterTextLayerIndex(textIndex, getSearchOptions()));

		var count = expandNodes(resultTree);

		if (count < 1) {
			findW.text = 'SEM MATCHES... (っ °Д °;)っ';
		} else {
			resultTree.visible = true;
			resultTree.size.height = count >= 16 ? 320 : count * 21 + 5;
			findW.text = 'BUSCA CONCLUÍDA...  (o °▽ °)o☆';
		}

		findW.layout.layout(true);
	}

	// Lê novamente o texto dos layers do projeto (Enter ou botão buscar).
	findEdTxt.onEnterKey = findBtn.leftClick.onClick = function () {
		if (findEdTxt.text == '' || app.project.numItems == 0) {
			findW.text = 'BUSCAR...';
			return;
		}

		findW.text = 'LENDO OS TEXTOS DO PROJETO...';
		resultTree.visible = false;
		resultTree.size.height = 0;
		findW.layout.layout(true);
		findW.update();

		textIndex = buildTextLayerIndex(getComps(), findProgressBar);
		showResults();
	};

	// Busca dinâmica sobre o índice já lido
	findEdTxt.onChanging = function () {
		if (textIndex != null) showResults();
	};

	optCkb1.onClick = optCkb2.onClick = optCkb4.onClick = optCkb5.onClick = function () {
		if (textIndex != null) showResults();
	};

	//---------------------------------------------------------

	resultTree.onChange = function () {
		var sel = resultTree.selection;

		if (sel == null) return;

		var comp = sel.comp;
		var t = comp.time;

		try {
			if (sel.type == 'item') {
				var txtLayer = sel.txtLayer;

				for (var l = 1; l <= comp.numLayers; l++) {
					comp.layer(l).selected = false;
				}

				t = sel.refTime;
				comp.hideShyLayers = !txtLayer.shy;
				txtLayer.selected = true;
			}
			comp.openInViewer();
			comp.time = t;
		} catch (err) {
			// a comp ou o layer pode ter sido apagado depois da busca
			alert(lol + '#FND_020 - o item não existe mais. busque novamente (Enter).');
		}
	};

	//---------------------------------------------------------

	infoBtn.leftClick.onClick = function () {
		openWebSite(repoURL + '/blob/main/README.md#busca');
	};

	findW.show();
}
