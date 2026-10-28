/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 📟 ui and layout
---------------------------------------------------------------

*/

// Ações dos botões da interface principal.
// Cada botão da estrutura 'PAD_mainGrpUiStructure' (O_PADEIRO.js) aponta para estas funções
// em 'leftClick' / 'rightClick', então a dica, o ícone e a ação de cada botão ficam juntos.
var PAD_ACTIONS = {
	abrirApontamento: function () {
		if (!netAccess()) {
			alert(lol + '#PAD_007 - sem acesso a rede...');
			return; // Encerra a função se não houver acesso à internet.
		}
		var apontamento =
			'"https://tvglobocorp.sharepoint.com/:x:/s/Planejamento-DTEN/Planejamento/EbkuFueT_DlFlUyRqlMSnJIBRpRsPPY72NSDqgKq0DvOKg?e=T7sn7i"';

		openWebSite(apontamento);
	},

	preencherTemplates: function () {
		// Verifica se há acesso à rede.
		if (!netAccess()) {
			// Se não houver acesso, exibe um alerta informando que a funcionalidade será limitada e encerra a função.
			alert(lol + '#PAD_003 - sem acesso a rede...');
			return;
		}

		// Se houver acesso à internet, chama a função padeiroTemplateDialog() para exibir a interface de templates.
		padeiroTemplateDialog();
	},

	criarTemplate: function () {
		// O editor precisa da comp principal do template aberta
		if (!(app.project.activeItem instanceof CompItem)) {
			alert(lol + '#PAD_031 - abra a comp principal do template antes de criar um novo template.');
			return;
		}

		try {
			PadMakerDialog();
			//
		} catch (err) {
			alert(lol + '#PAD_MAKER - ' + '' + err.message);
		}
	},

	instalarFontes: function () {
		// Define a função a ser executada quando o botão "Instalar Fontes" for clicado.

		// Verifica se há acesso à rede.
		if (!netAccess()) {
			alert(lol + '#PAD_004 - sem acesso a rede...');
			return;
		}

		// Obtém o caminho da pasta do template a partir dos metadados XMP do projeto.
		var folderPath = normalizeNetworkPath(getXMPData('source'));
		var templateFontsPath = folderPath + '/FONTS';

		// Se o caminho da pasta não for encontrado, a função é interrompida.
		if (folderPath == '') {
			alert(lol + '#PAD_005 - esse não foi preenchido pelo padeiro...');
			return;
		}
		// Cria um objeto "Folder" para a pasta de fontes do template.
		var templateFontsFolder = new Folder(templateFontsPath);

		// Verifica se a pasta de fontes existe.
		if (!templateFontsFolder.exists) {
			alert(lol + '#PAD_006 - a pasta de fontes não foi localizada...');
			return;
		}
		// Se a pasta de fontes existe e o sistema operacional for Windows, instala as fontes.
		if (appOs == 'Win') installWinFonts(templateFontsPath);
		if (appOs == 'Mac') installMacFonts(templateFontsPath);
	},

	coletarFontes: function () {
		// Verifica se há itens no projeto.
		if (app.project.numItems == 0) return;

		var savePath = Folder.selectDialog(); // Abre a janela de seleção de pastas

		if (savePath == null) return; // Se a janela foi cancelada, não faz nada

		var currentProjPath = decodeURI(savePath.fsName) + '/FONTS'; // caminho final do collect
		var fontsPath = fontCollect(currentProjPath);

		openFolder(fontsPath);
	},

	abrirPastaOutput: function () {
		// Verifica se há acesso à rede.
		if (!netAccess()) {
			alert(lol + '#PAD_007 - sem acesso a rede...');
			return; // Encerra a função se não houver acesso à rede.
		}

		// Verifica se há itens na fila de renderização.
		if (app.project.renderQueue.numItems < 1) {
			alert(lol + '#PAD_008 - a fila de render está vazia...');
			return;
		}
		// Obtém o último item da fila de renderização.
		var item = app.project.renderQueue.item(app.project.renderQueue.numItems);

		// Obtém o módulo de saída do item (onde o arquivo renderizado será salvo).
		var outputModule = item.outputModule(1);

		// Obtém o caminho completo da pasta de saída.
		var outputPath = normalizeNetworkPath(decodeURI(outputModule.file.path));

		// Cria um objeto "Folder" para representar a pasta de saída.
		var fld = new Folder(outputPath);

		// Verifica se a pasta de saída existe.
		if (!fld.exists) {
			alert(lol + '#PAD_009 - a pasta não foi encontrada...'); // Exibe um erro se a pasta não for acessível.
			return; // Encerra a função se a pasta não existir.
		}

		// Abre a pasta de saída no sistema operacional do usuário.
		openFolder(outputPath);
	},

	abrirConversorCaminhos: function () {

		var outputPath = '';
		// Verifica se há itens na fila de renderização.
		if (app.project.renderQueue.numItems >= 1) {

			// Obtém o último item da fila de renderização.
			var item = app.project.renderQueue.item(app.project.renderQueue.numItems);

			// Obtém o módulo de saída do item (onde o arquivo renderizado será salvo).
			var outputModule = item.outputModule(1);


			// Cria um objeto "Folder" para representar a pasta de saída.
			var fld = outputModule.file.parent;
			// Obtém o caminho completo da pasta de saída.
			if (fld.exists) {
				outputPath = fld.fsName;
			}
		}
		pathDialog(outputPath);
	},

	renomearComps: function () {
		// Verifica se há itens no projeto.
		if (app.project.numItems == 0) return; // Encerra a função se não houver itens.

		// Inicia um grupo de desfazer para que a operação de renomeação possa ser desfeita.
		app.beginUndoGroup('renomear comps');

		// Chama a função renamePromoComps para renomear as composições selecionadas.
		renamePromoComps(app.project.selection);

		// Finaliza o grupo de desfazer.
		app.endUndoGroup();
	},

	renomearOutputs: function () {
		app.beginUndoGroup('renomear outputs');

		renameOutputs(); // renomeia todas as saídas

		app.endUndoGroup();
	},

	organizarProjeto: function () {
		// Verifica se há itens no projeto.
		if (app.project.numItems == 0) return; // Encerra a função se não houver itens.

		// grupo de desfazer
		app.beginUndoGroup('organização automática do projeto');

		// Se houver itens selecionados na janela projeto
		if (app.project.selection.length > 0) {
			// Itera sobre os itens selecionados
			for (var i = 0; i < app.project.selection.length; i++) {
				var aItem = app.project.selection[i]; // item selecionado

				// Se o item selecionado for uma composição sem tag
				if (aItem instanceof CompItem && aItem.comment == '') {
					aItem.comment = 'EXPORTAR'; // Adiciona a tag 'EXPORTAR' como comentário
				}
			}
		}

		deleteProjectFolders(); // Deleta as pastas existentes
		populateProjectFolders(); // Cria as pastas novas e organiza os itens
		deleteEmptyProjectFolders(); // Deleta as pastas vazias

		app.endUndoGroup();
	},

	criarPastasProjeto: function () {
		app.beginUndoGroup('criar pastas do projeto');

		projectTemplateFolders(); // cria a estrutura de pastas do projeto

		app.endUndoGroup();
	},

	buscarTextos: function () {
		findDialog();
	},

	buscarCaminhos: function () {
		pathSearchDialog();
	}
};

// Recebe a estrutura da ui 'structureObj' e um objeto para interação 'uiObj'
// Cria os controles da interface e liga as ações declaradas na estrutura
function PAD_BUILD_UI(structureObj, uiObj) {
	uiObj.window.margins = 4;
	uiObj.window.orientation = 'stack';

	// Grupo principal: seções de botões com imagem
	uiObj.mainGrp = uiObj.window.add('group');
	uiObj.sectionGrpArray.push(uiObj.mainGrp);

	// Logo e versão
	uiObj.infoGrp = uiObj.window.add('group');
	uiObj.infoGrp.spacing = 0;
	uiObj.sectionGrpArray.push(uiObj.infoGrp);

	uiObj.mainLogo = uiObj.infoGrp.add('image', undefined, LOGO_IMG.light);
	uiObj.mainLogo.maximumSize = [70, 24];
	uiObj.mainLogo.minimumSize = [50, 24];
	uiObj.mainLogo.helpTip = [scriptName, scriptVersion, '| Jean-Marc Billard'].join(' ');

	uiObj.vLab = uiObj.infoGrp.add('statictext', undefined, scriptVersion, { truncate: 'end' });
	uiObj.vLab.justify = 'center';
	uiObj.vLab.helpTip = 'ajuda | DOCS';

	// Grupo fixo: produção + botões de ícone
	uiObj.pinGrp = uiObj.window.add('group');
	uiObj.pinGrp.alignment = ['center', 'top'];
	uiObj.pinGrp.spacing = 16;
	uiObj.sectionGrpArray.push(uiObj.pinGrp);

	uiObj.prodGrp = uiObj.pinGrp.add('group');
	uiObj.sectionGrpArray.push(uiObj.prodGrp);

	uiObj.prodIconGrp = uiObj.prodGrp.add('group');
	uiObj.prodIconGrp.orientation = 'stack';

	uiObj.prodDrop = uiObj.prodGrp.add('dropdownlist', undefined, getProdNames(PAD_prodArray));
	uiObj.prodDrop.selection = 0; // Seleciona a produção padrão.
	uiObj.prodDrop.maximumSize = [140, 24];
	uiObj.prodDrop.minimumSize = [52, 24];
	uiObj.prodDrop.helpTip = 'PRODUÇÃO SELECIONADA';

	populateMainIcons(uiObj);

	// Os botões de ícone se alternam entre duas colunas (ficam em 2 x N no layout vertical)
	uiObj.iconBtnMainGrp = uiObj.pinGrp.add('group');
	uiObj.iconBtnGrp0 = uiObj.iconBtnMainGrp.add('group');
	uiObj.iconBtnGrp1 = uiObj.iconBtnMainGrp.add('group');
	uiObj.sectionGrpArray.push(uiObj.iconBtnGrp0, uiObj.iconBtnGrp1);

	var iconCount = 0;

	forEachUiCtrl(structureObj.pinGrp, null, function (key, ctrlProperties) {
		var btn = themeIconButton(uiObj['iconBtnGrp' + (iconCount % 2)], ctrlProperties);

		uiObj.iconButtonArray.push(btn);
		bindUiCtrl(uiObj, key, btn, ctrlProperties);
		iconCount++;
	});

	// Seções do grupo principal, separadas por divisores
	forEachUiCtrl(structureObj.mainGrp, function (sectionIndex) {
		if (sectionIndex > 0) uiObj.divArray.push(themeDivider(uiObj.mainGrp));

		var sectionGrp = uiObj.mainGrp.add('group', undefined, { name: 'sectionGrp' });
		sectionGrp.alignment = ['center', 'top'];
		uiObj.sectionGrpArray.push(sectionGrp);

		return sectionGrp;
	}, function (key, ctrlProperties, sectionGrp) {
		var btn = themeImageButton(sectionGrp, ctrlProperties);

		uiObj.imageButtonArray.push(btn);
		bindUiCtrl(uiObj, key, btn, ctrlProperties);
	});

	uiObj.window.layout.layout(true);

	// Estilização da interface
	setCtrlHighlight(uiObj.vLab, monoColor0, highlightColor1);
	setBgColor(uiObj.window, bgColor1);

	uiObj.window.onShow = function () {
		for (var b = 0; b < uiObj.imageButtonArray.length; b++) {
			var btn = uiObj.imageButtonArray[b];
			btn.label.preferredSize = btn.label.size;
		}

		PAD_LAYOUT(uiObj);
	};

	uiObj.window.onResizing = uiObj.window.onResize = function () {
		PAD_LAYOUT(uiObj);
	};

	PAD_UI_EVENTS(uiObj);
}

// Percorre 'sections' ({ secao: { controle: propriedades } }) na ordem em que foram declaradas.
// onSection(indice) é chamada no início de cada seção e o retorno dela é repassado a onCtrl.
function forEachUiCtrl(sections, onSection, onCtrl) {
	var sectionIndex = 0;

	for (var sec in sections) {
		var section = sections[sec];
		var sectionData = onSection ? onSection(sectionIndex) : null;

		for (var key in section) {
			var ctrlProperties = section[key];

			ctrlProperties.key = key;
			if (ctrlProperties.labelTxt == undefined) ctrlProperties.labelTxt = key.replace(/_/g, ' ').toTitleCase();

			onCtrl(key, ctrlProperties, sectionData);
		}
		sectionIndex++;
	}
}

// Registra o botão em 'uiObj[key]' e liga as ações declaradas na estrutura.
function bindUiCtrl(uiObj, key, btn, ctrlProperties) {
	uiObj[key] = btn;

	if (ctrlProperties.leftClick) btn.leftClick.onClick = ctrlProperties.leftClick;
	if (ctrlProperties.rightClick) btn.rightClick.onClick = ctrlProperties.rightClick;
}

// Recebe uma janela 'window' e um objeto para interação 'uiObj'
// Aplica o layout dos controles dependendo das dimensões da janela
function PAD_LAYOUT(uiObj) {
	var isRow = uiObj.window.size.width > uiObj.window.size.height;
	var grpOrientation = isRow ? 'row' : 'column';
	var btnOrientation = isRow ? 'column' : 'row';
	var iconOrientation = uiObj.window.size.width < 70 ? 'column' : 'row';
	var pinGap = isRow ? 190 : 80;
	var infoGap = isRow ? 110 : 56;
	var iconGap = uiObj.iconButtonArray.length * 28;

	if (!isRow && uiObj.window.size.width >= 70) iconGap = Math.ceil(uiObj.iconButtonArray.length / 2) * 28;
	pinGap += iconGap;

	try {
		for (var s = 0; s < uiObj.sectionGrpArray.length; s++) {
			var sectionGrp = uiObj.sectionGrpArray[s];
			sectionGrp.orientation = grpOrientation;
			sectionGrp.spacing = uiObj.window.size.height < 72 ? 24 : 8;
		}
		for (var d = 0; d < uiObj.divArray.length; d++) {
			var div = uiObj.divArray[d];
			div.size = [1, 1];
			div.alignment = isRow ? ['center', 'fill'] : ['fill', 'center'];
		}
		for (var b = 0; b < uiObj.imageButtonArray.length; b++) {
			var btn = uiObj.imageButtonArray[b];
			btn.btnGroup.orientation = btnOrientation;
			btn.btnGroup.spacing = isRow ? 0 : 8; // Espaçamento entre botões

			btn.normalImg.size = btn.hoverImg.size = [32, 32];

			btn.label.justify = isRow ? 'center' : 'left'; // Alinhamento central
			btn.label.size = [uiObj.window.size.width - 60, 18];

			if (uiObj.window.size.width < 88 || uiObj.window.size.height < 72) {
				btn.btnGroup.spacing = 0;
				btn.label.size = [0, 0];
			}

			if (uiObj.window.size.height < 44) {
				btn.btnGroup.spacing = 0;
				btn.hoverImg.size = btn.normalImg.size = [0, 0];
				btn.label.size = btn.label.preferredSize;
			}
		}
		uiObj.mainGrp.spacing = uiObj.window.size.height < 44 ? 24 : 16;

		// + spacing: mantém a posição das seções igual à versão anterior, que tinha um grupo vazio
		// antes da primeira seção
		pinGap += uiObj.mainGrp.spacing;
		uiObj.mainGrp.margins = isRow ? [pinGap, 0, infoGap, 0] : [4, pinGap, 4, infoGap];

		uiObj.pinGrp.alignment = isRow ? 'left' : 'top';
		uiObj.pinGrp.spacing = 20;

		uiObj.prodGrp.spacing = 4;

		uiObj.iconBtnMainGrp.orientation = iconOrientation;
		uiObj.iconBtnMainGrp.spacing = 4; // Espaçamento entre botões
		uiObj.iconBtnGrp0.spacing = 4;
		uiObj.iconBtnGrp1.spacing = 4;

		uiObj.infoGrp.alignment = isRow ? 'right' : 'bottom';
		uiObj.infoGrp.spacing = 0;

		uiObj.prodDrop.size.width = uiObj.window.size.width - 10;
		uiObj.mainLogo.size.width = uiObj.window.size.width - 10;
		//
	} catch (err) {
		alert(lol + '#PAD_layout - ' + '' + err.message);
	} //Em caso de erro...

	uiObj.window.layout.layout(true);
	uiObj.window.layout.resize();
}

function PAD_UI_EVENTS(uiObj) {
	// Rótulo da versão abre a documentação
	uiObj.vLab.addEventListener('mousedown', function () {
		openWebSite(repoURL + '/blob/main/README.md#-o-padeiro-script');
	});

	uiObj.prodDrop.onChange = function () {
		if (this.selection == null) return;

		var i = this.selection.index;
		changeIcon(i, uiObj.prodIconGrp);

		templatesPath = normalizeNetworkPath(PAD_prodArray[i].templatesPath);
		templatesFolder = new Folder(templatesPath); // pasta de templates.

		// Se a pasta de templates não existir.
		if (!templatesFolder.exists) alert(lol + '#PAD_002 - pasta de templates não localizada...');
	};
}

// Recebe um índice 'imageIndex' e um grupo de imagens 'imagesGrp'
// Altera o grupo de imagens para mostrar apenas o índice selecionado
function changeIcon(imageIndex, imagesGrp) {
	for (var i = 0; i < imagesGrp.children.length; i++) {
		imagesGrp.children[i].visible = i == imageIndex;
	}
}

// Popula o grupo de ícones das produções (um ícone por produção, só o selecionado fica visível).
// Clique duplo no ícone abre o editor da lista de produções.
function populateMainIcons(uiObj) {
	var imagesGrp = uiObj.prodIconGrp;

	while (imagesGrp.children.length > 0) {
		imagesGrp.remove(imagesGrp.children[0]);
	}

	var selected = uiObj.prodDrop.selection == null ? 0 : uiObj.prodDrop.selection.index;

	for (var i = 0; i < PAD_prodArray.length; i++) {
		var newIcon = imagesGrp.add('image', undefined, undefined);

		try {
			newIcon.image = eval(PAD_prodArray[i].icon);
		} catch (err) {
			newIcon.image = defaultProductionDataObj.PRODUCTIONS[0].icon;
		}
		newIcon.helpTip = PAD_prodArray[i].name + '\n\n' + dClick + ' para editar a lista de produções';
		newIcon.preferredSize = [24, 24];
		newIcon.visible = i == selected;

		newIcon.addEventListener('click', function (c) {
			if (c.detail == 2) editProductions(uiObj); // clique duplo
		});
	}
}

// Abre o editor de produções e recarrega o menu e os ícones.
function editProductions(uiObj) {
	padProdFoldersDialog(PAD_prodArray);

	PAD_prodArray = updateProdData(configFile);

	uiObj.prodDrop.removeAll();
	populateDropdownList(getProdNames(PAD_prodArray), uiObj.prodDrop);
	populateMainIcons(uiObj);

	uiObj.prodDrop.selection = 0; // dispara o onChange, que atualiza a pasta de templates
	uiObj.prodIconGrp.layout.layout(true);
}

// Recebe um grupo 'sectionGrp' e um objeto para interação 'uiObj'
// Adiciona um divisor visual na seção 'sectionGrp'
function themeDivider(sectionGrp) {
	var newDiv = sectionGrp.add('customButton', [0, 0, 1, 1]);
	setUiCtrlColor(newDiv, divColor1);
	newDiv.onDraw = customDraw;

	return newDiv;
}

// Ícone com estado de hover e cliques esquerdo / direito.
// leftClick e rightClick são botões invisíveis: quem usa o componente define 'onClick' neles
// (ex: btn.leftClick.onClick = ...), e o clique na imagem chama 'notify()' do botão certo.
function themeStackIcon(parentGrp, icon, tipTxt) {
	var stackIcon = {};

	if (icon.hover == undefined) icon.hover = icon.normal;

	stackIcon.iconGroup = parentGrp.add('group');
	stackIcon.iconGroup.orientation = 'stack';

	stackIcon.leftClick = stackIcon.iconGroup.add('button', undefined, '');
	stackIcon.leftClick.size = [0, 0];
	stackIcon.leftClick.visible = false;

	stackIcon.rightClick = stackIcon.iconGroup.add('button', undefined, '');
	stackIcon.rightClick.size = [0, 0];
	stackIcon.rightClick.visible = false;

	stackIcon.hoverImg = stackIcon.iconGroup.add('image', undefined, icon.hover);
	stackIcon.hoverImg.helpTip = tipTxt;
	stackIcon.hoverImg.visible = false;

	stackIcon.normalImg = stackIcon.iconGroup.add('image', undefined, icon.normal);
	stackIcon.normalImg.helpTip = tipTxt;

	stackIcon.setHover = function (isHover) {
		stackIcon.hoverImg.visible = isHover;
		stackIcon.normalImg.visible = !isHover;
	};

	// botão 0 = esquerdo, botão 2 = direito
	stackIcon.click = function (c) {
		if (c.button == 0) stackIcon.leftClick.notify();
		if (c.button == 2) stackIcon.rightClick.notify();
	};

	stackIcon.hoverImg.addEventListener('click', stackIcon.click);

	return stackIcon;
}

// Largura das janelas de busca (textos e caminhos), para que as duas tenham as mesmas dimensões.
var PAD_SEARCH_UI_WIDTH = 640;

// Cabeçalho padrão das janelas de busca: campo de texto + botão de lupa.
// 'width' é a largura total disponível. Retorna { grp, edit, btn }.
function themeSearchHeader(parentGrp, width, tips) {
	var header = {};

	header.grp = parentGrp.add('group');
	header.grp.orientation = 'row';
	header.grp.alignChildren = ['left', 'center'];
	header.grp.spacing = 8;
	header.grp.margins = 0;

	header.edit = header.grp.add('edittext', [0, 0, width - 40, 32]); // 40 = lupa (32) + espaçamento (8)
	header.btn = themeIconButton(header.grp, { icon: PAD_BUSCAR_ICON, tips: tips });

	return header;
}

// Botão de ícone (sem rótulo). Usado na ui principal e nas demais janelas.
function themeIconButton(sectionGrp, ctrlProperties) {
	var btnGroup = sectionGrp.add('group');
	var btn = themeStackIcon(btnGroup, ctrlProperties.icon, ctrlProperties.tips.join('\n\n'));

	btn.btnGroup = btnGroup;

	btnGroup.addEventListener('mouseover', function () {
		btn.setHover(true);
	});
	btnGroup.addEventListener('mouseout', function () {
		btn.setHover(false);
	});

	return btn;
}

// Botão de imagem com rótulo (seções da ui principal).
// As propriedades 'ctrlProperties' estão definidas na estrutura da ui 'structureObj'.
function themeImageButton(sectionGrp, ctrlProperties) {
	var tipTxt = ctrlProperties.labelTxt + ':\n\n' + ctrlProperties.tips.join('\n\n');
	var btnGroup = sectionGrp.add('group');
	var btn = themeStackIcon(btnGroup, ctrlProperties.icon, tipTxt);

	btn.btnGroup = btnGroup;

	btn.label = btnGroup.add('statictext', undefined, ctrlProperties.labelTxt, { truncate: 'end' });
	btn.label.maximumSize = [60, 18];
	btn.label.helpTip = tipTxt;
	setFgColor(btn.label, normalColor1);

	btnGroup.addEventListener('mouseover', function () {
		setFgColor(btn.label, highlightColor1);
		btn.setHover(true);
	});
	btnGroup.addEventListener('mouseout', function () {
		setFgColor(btn.label, normalColor1);
		btn.setHover(false);
	});

	btn.label.addEventListener('click', btn.click);

	return btn;
}

function themeButton(sectionGrp, ctrlProperties) {
	try {
		if (ctrlProperties.buttonColor === undefined) ctrlProperties.buttonColor = divColor1;
		if (ctrlProperties.textColor === undefined) ctrlProperties.textColor = normalColor1;

		var newUiCtrlObj = {};
		var tipTxt = ctrlProperties.tips.join('\n\n'); // Dica de ajuda;
		var newBtnGrp = sectionGrp.add('group');
		newBtnGrp.orientation = 'stack';

		newUiCtrlObj.leftClick = newBtnGrp.add('button', undefined, '');
		newUiCtrlObj.leftClick.size = [0, 0];
		newUiCtrlObj.leftClick.visible = false;
		newUiCtrlObj.rightClick = newBtnGrp.add('button', undefined, '');
		newUiCtrlObj.rightClick.size = [0, 0];
		newUiCtrlObj.rightClick.visible = false;

		newUiCtrlObj.label = newBtnGrp.add('customButton');
		newUiCtrlObj.label.size = [ctrlProperties.width, ctrlProperties.height];

		newUiCtrlObj.label.text = ctrlProperties.labelTxt;
		newUiCtrlObj.label.buttonColor = hexToRgb(ctrlProperties.buttonColor);
		newUiCtrlObj.label.textColor = hexToRgb(ctrlProperties.textColor);

		newUiCtrlObj.label.minimumSize = [68, 34];
		newUiCtrlObj.label.helpTip = tipTxt;

		drawThemeButton(newUiCtrlObj.label);

		newUiCtrlObj.label.addEventListener('mouseover', function () {
			this.textColor = [1, 1, 1, 1];
			this.buttonColor = hexToRgb(highlightColor1);

			drawThemeButton(this);
		});

		newUiCtrlObj.label.addEventListener('mouseout', function () {
			this.textColor = hexToRgb(ctrlProperties.textColor);
			this.buttonColor = hexToRgb(ctrlProperties.buttonColor);

			drawThemeButton(this);
		});

		newUiCtrlObj.label.onClick = function () {
			this.parent.children[0].notify();
		};

		newUiCtrlObj.label.addEventListener('click', function (c) {
			if (c.button == 2) this.parent.children[1].notify();
		});

		return newUiCtrlObj;
	} catch (err) {
		alert(err.message);
	}
}


function drawThemeButton(button) {
	var g = button.graphics;
	var textPen = g.newPen(g.PenType.SOLID_COLOR, button.textColor, 1);
	var fillBrush = g.newBrush(g.BrushType.SOLID_COLOR, button.buttonColor);

	button.onDraw = function () {
		var h = this.size.height;
		var w = this.size.width;

		g.ellipsePath(0, 0, h, h);
		g.ellipsePath(w - h, 0, h, h);
		g.rectPath(h / 2, 0, w - h, h);
		g.fillPath(fillBrush);

		var textLinesArray = this.text.split('\n');
		var pyInc = 12;

		for (var l = 0; l < textLinesArray.length; l++) {
			var textSize = g.measureString(textLinesArray[l]);
			var px = (w - textSize.width) / 2;
			var py = l == 0 ? - (textLinesArray.length - 1) / 2 * pyInc : (py += pyInc);

			if (appV > 24 && l == 0) py += 8;
			// alert(textSize.width);
			g.drawString(textLinesArray[l], textPen, px, py);
		}
	};
}

// Função para desenhar o botão personalizado.
function customDraw() {
	var g = this.graphics;

	g.drawOSControl(); // Desenha o contorno padrão do botão.
	g.rectPath(0, 0, this.size[0], this.size[1]); // Retângulo no tamanho do botão.
	g.fillPath(this.fillBrush); // Preenche com a cor definida em 'fillBrush'.
}

function drawRoundedRect(g, brush, width, height, radius, x, y) {
	g.newPath();
	g.ellipsePath(x, y, radius, radius);
	g.fillPath(brush);
	g.ellipsePath(width - x - radius, y, radius, radius);
	g.fillPath(brush);
	g.ellipsePath(width - x - radius, height - y - radius, radius, radius);
	g.fillPath(brush);
	g.ellipsePath(x, height - y - radius, radius, radius);
	g.fillPath(brush);
	g.newPath();

	var coords = [
		x,
		y + radius / 2,
		x + radius / 2,
		y,
		width - x - radius / 2,
		y,
		width - x,
		y + radius / 2,
		width - x,
		height - y - radius / 2,
		width - x - radius / 2,
		height - y,
		x + radius / 2,
		height - y,
		x,
		height - y - radius / 2
	];

	for (var i = 0; i <= coords.length - 1; i += 2) {
		if (i == 0) {
			g.moveTo(coords[i], coords[i + 1]);
		} else {
			g.lineTo(coords[i], coords[i + 1]);
		}
	}
	g.fillPath(brush);
}

// Altera a cor de fundo da janela.
function setBgColor(w, hex) {
	var color = hexToRgb(hex); // Converte a cor hexadecimal em RGB.
	var bType = w.graphics.BrushType.SOLID_COLOR; // Define o tipo do pincel como cor sólida.
	w.graphics.backgroundColor = w.graphics.newBrush(bType, color); // Aplica o pincel com a nova cor à janela.
}

// Define a cor de um botão.
function setUiCtrlColor(ctrl, hex) {
	var color = hexToRgb(hex); // Converte a cor hexadecimal em RGB.
	var bType = ctrl.graphics.BrushType.SOLID_COLOR; // Define o tipo do pincel como cor sólida.
	ctrl.fillBrush = ctrl.graphics.newBrush(bType, color); // Cria um novo pincel com a cor e o aplica ao botão.
}

// Altera a cor de um texto estático.
function setFgColor(ctrl, hex) {
	var color = hexToRgb(hex); // Converte a cor hexadecimal em RGB.
	var pType = ctrl.graphics.PenType.SOLID_COLOR; // Define o tipo da caneta como cor sólida.
	ctrl.graphics.foregroundColor = ctrl.graphics.newPen(pType, color, 1); // Cria uma nova caneta com a cor e a aplica ao texto.
}

// Adiciona efeito de destaque (highlight) ao texto estático quando o mouse passa por cima.
function setCtrlHighlight(ctrl, normalColor1, highlightColor1) {
	setFgColor(ctrl, normalColor1); // Define a cor normal do texto.

	ctrl.addEventListener('mouseover', function () {
		// Ao passar o mouse por cima do texto:
		setFgColor(ctrl, highlightColor1); // Muda para a cor de destaque.
	});
	ctrl.addEventListener('mouseout', function () {
		// Ao tirar o mouse de cima do texto:
		setFgColor(ctrl, normalColor1); // Retorna para a cor normal.
	});
}
