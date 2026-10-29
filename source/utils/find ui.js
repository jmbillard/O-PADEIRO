/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🪟 UI dialogs
---------------------------------------------------------------

*/

function findDialog() {
	var scriptName = 'BUSCA';
	var scriptVersion = 'v2.7';

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

	var options = themeSearchOptions(findW);

	var visCkb = options.add('APENAS VISÍVEIS', false, 'buscar apenas em layers visíveis (ligados)');
	var accentCkb = options.add('IGNORAR ACENTOS', true, '"amazonia" também encontra "Amazônia"');
	var invertCkb = options.add('INVERTER', false, 'apenas textos que NÃO possuem o termo buscado');

	options.addHelp(repoURL + '/blob/main/README.md#busca');

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
			vis: visCkb.value,
			matchCase: false, // maiúsculas e minúsculas são sempre ignoradas
			matchAccent: !accentCkb.value,
			invert: invertCkb.value
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

	visCkb.onClick = accentCkb.onClick = invertCkb.onClick = function () {
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

	findW.show();
}
