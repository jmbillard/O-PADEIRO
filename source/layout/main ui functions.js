/* eslint-disable no-with */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 📟 ui and layout
---------------------------------------------------------------

*/

// Recebe a estrutura da ui 'structureObj' e um objeto para interação 'uiObj'
// Cria os controles da interface e define os eventos entre eles
function PAD_BUILD_UI(structureObj, uiObj) {
	// // Configurações da janela
	uiObj.window.margins = 4; // Margens internas
	uiObj.window.orientation = 'stack'; // Layout vertical

	uiObj.mainGrp = uiObj.window.add('group'); // Grupo principal
	uiObj.sectionGrpArray.push(uiObj.mainGrp);

	uiObj.infoGrp = uiObj.window.add('group');
	uiObj.infoGrp.spacing = 0;
	uiObj.sectionGrpArray.push(uiObj.infoGrp);

	uiObj.mainLogo = uiObj.infoGrp.add('image', undefined, LOGO_IMG.light);
	uiObj.mainLogo.maximumSize = [70, 24];
	uiObj.mainLogo.minimumSize = [50, 24];
	uiObj.mainLogo.helpTip = [
		scriptName,
		scriptVersion,
		'| Jean-Marc Billard',
	].join(' ');

	uiObj.vLab = uiObj.infoGrp.add('statictext', undefined, scriptVersion, {
		truncate: 'end',
	});
	uiObj.vLab.justify = 'center';
	uiObj.vLab.helpTip = 'ajuda | DOCS';

	uiObj.pinGrp = uiObj.window.add('group'); // Grupo de botões superior
	uiObj.pinGrp.alignment = ['center', 'top']; // Alinhamento
	uiObj.pinGrp.spacing = 16; // Espaçamento entre botões
	uiObj.sectionGrpArray.push(uiObj.pinGrp);

	uiObj.prodGrp = uiObj.pinGrp.add('group');
	uiObj.sectionGrpArray.push(uiObj.prodGrp);

	uiObj.prodIconGrp = uiObj.prodGrp.add('group');
	uiObj.prodIconGrp.orientation = 'stack'; // Layout vertical
	populateMainIcons(uiObj.prodIconGrp);

	uiObj.prodDrop = uiObj.prodGrp.add(
		'dropdownlist',
		undefined,
		getProdNames(PAD_prodArray),
	);
	uiObj.prodDrop.selection = 0; // Seleciona a produção padrão.
	uiObj.prodDrop.maximumSize = [140, 24];
	uiObj.prodDrop.minimumSize = [52, 24];
	uiObj.prodDrop.helpTip = 'PRODUÇÃO SELECIONADA'; // Dica de ajuda

	uiObj.iconBtnMainGrp = uiObj.pinGrp.add('group');

	uiObj.iconBtnGrp0 = uiObj.iconBtnMainGrp.add('group');
	uiObj.sectionGrpArray.push(uiObj.iconBtnGrp0);

	uiObj.iconBtnGrp1 = uiObj.iconBtnMainGrp.add('group');
	uiObj.sectionGrpArray.push(uiObj.iconBtnGrp1);

	var sectionCounter = 0;
	var ctrlCounter = 0;

	for (var pinSec in structureObj.pinGrp) {
		var pinSection = structureObj['pinGrp'][pinSec];

		if (sectionCounter > 0)
			uiObj.divArray.push(new themeDivider(uiObj.mainGrp));

		var pinSectionGrp = uiObj.mainGrp.add('group', undefined, {
			name: 'sectionGrp',
		}); // Grupo de botões superior
		pinSectionGrp.alignment = ['center', 'top']; // Alinhamento
		uiObj.sectionGrpArray.push(pinSectionGrp);

		for (var pinCtrl in pinSection) {
			var pinCtrlProperties = pinSection[pinCtrl];
			pinCtrlProperties.key = pinCtrl;

			if (pinCtrlProperties.labelTxt == undefined)
				pinCtrlProperties.labelTxt = pinCtrl
					.replace(/_/g, ' ')
					.toTitleCase();

			if (pinCtrlProperties.type == 'iconButton') {
				uiObj[pinCtrl] = new themeIconButton(
					uiObj['iconBtnGrp' + (ctrlCounter % 2)],
					pinCtrlProperties,
				);
				uiObj.iconButtonArray.push(uiObj[pinCtrl]);
			}
			ctrlCounter++;
		}
		sectionCounter++;
	}

	sectionCounter = 0;

	for (var sec in structureObj.mainGrp) {
		var section = structureObj['mainGrp'][sec];

		if (sectionCounter > 0)
			uiObj.divArray.push(new themeDivider(uiObj.mainGrp));

		var sectionGrp = uiObj.mainGrp.add('group', undefined, {
			name: 'sectionGrp',
		}); // Grupo de botões superior
		sectionGrp.alignment = ['center', 'top']; // Alinhamento
		uiObj.sectionGrpArray.push(sectionGrp);

		for (var ctrl in section) {
			var ctrlProperties = section[ctrl];
			ctrlProperties.key = ctrl;

			if (ctrlProperties.labelTxt == undefined)
				ctrlProperties.labelTxt = ctrl.replace(/_/g, ' ').toTitleCase();

			if (ctrlProperties.type == 'imageButton') {
				uiObj[ctrl] = new themeImageButton(sectionGrp, ctrlProperties);
				uiObj.imageButtonArray.push(uiObj[ctrl]);
			}
		}
		sectionCounter++;
	}

	uiObj.window.layout.layout(true); // Aplica o layout

	// Estilização da interface
	setCtrlHighlight(uiObj.vLab, monoColor0, highlightColor1); // Cor de destaque do texto
	setBgColor(uiObj.window, bgColor1); // Cor de fundo da janela

	// Define uma função a ser executada quando a janela é exibida ou redimensionada.
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

	if (!isRow && uiObj.window.size.width >= 70)
		iconGap = Math.ceil(uiObj.iconButtonArray.length / 2) * 28;
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
		uiObj.mainGrp.margins = isRow
			? [pinGap, 0, infoGap, 0]
			: [4, pinGap, 4, infoGap];
		uiObj.mainGrp.spacing = uiObj.window.size.height < 44 ? 24 : 16;

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
	// Adiciona um "ouvinte" de evento ao rótulo de versão (vLab).
	uiObj.vLab.addEventListener('mousedown', function () {
		// Define o URL do site de documentação.
		var siteUrl = repoURL + '/blob/main/README.md#-o-padeiro-script';
		openWebSite(siteUrl); // Abre o site de documentação em um navegador web.
	});

	uiObj.prodDrop.onChange = function () {
		var i = this.selection.index;
		changeIcon(i, uiObj.prodIconGrp);

		templatesPath = PAD_prodArray[i].templatesPath;
		templatesFolder = new Folder(PAD_prodArray[i].templatesPath); // pasta de templates.
		PAD_launchBtn.enabled = templatesFolder.exists; // Habilita / Desabilita o botão "Abrir O Padeiro".

		// Se a pasta de templates não existir.
		if (!templatesFolder.exists)
			alert(
				lol + '#PAD_002 - a pasta de templates não foi localizada...',
			);
	};

	// Define a função a ser executada quando o botão "Abrir O Padeiro" for clicado.
	uiObj.templates.leftClick.onClick = function () {
		// Verifica se há acesso à rede.
		if (!netAccess()) {
			// Se não houver acesso, exibe um alerta informando que a funcionalidade será limitada e encerra a função.
			alert(lol + '#PAD_003 - sem acesso a rede...');
			return;
		}

		// Se houver acesso à internet, chama a função padeiroTemplateDialog() para exibir a interface de templates.
		padeiroTemplateDialog();
	};

	// Adiciona um ouvinte de evento de clique ao botão "Abrir O Padeiro".
	uiObj.templates.rightClick.onClick = function () {
		if (app.project.numItems == 0) return;

		var aItem = app.project.activeItem;

		if (aItem == null) return;

		try {
			PadMakerDialog();
			//
		} catch (err) {
			alert(lol + '#PAD_MAKER - ' + '' + err.message);
		}
	};

	uiObj.fontes.leftClick.onClick = function () {
		// Define a função a ser executada quando o botão "Instalar Fontes" for clicado.

		// Verifica se há acesso à rede.
		if (!netAccess()) {
			alert(lol + '#PAD_004 - sem acesso a rede...');
			return;
		}

		// Obtém o caminho da pasta do template a partir dos metadados XMP do projeto.
		var folderPath = getXMPData('source');
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
	};

	// Adiciona um ouvinte de evento de clique ao botão "Instalar Fontes".
	uiObj.fontes.rightClick.onClick = function () {
		// Verifica se há itens no projeto.
		if (app.project.numItems == 0) return;

		var savePath = Folder.selectDialog(); // Abre a janela de seleção de pastas

		if (savePath == null) return; // Se a janela foi cancelada, não faz nada

		var currentProjPath = decodeURI(savePath.fullName) + '/FONTS'; // caminho final do collect
		var fontsPath = fontCollect(currentProjPath);

		openFolder(fontsPath);
	};

	// Define a função a ser executada quando o botão "Abrir Pasta de Saída" for clicado.
	uiObj.pastas.leftClick.onClick = function () {
		// Verifica se há acesso à internet.
		if (!netAccess()) {
			alert(lol + '#PAD_007 - sem acesso a rede...');
			return; // Encerra a função se não houver acesso à internet.
		}

		// Verifica se há itens na fila de renderização.
		if (app.project.renderQueue.numItems < 1) {
			alert(lol + '#PAD_008 - a fila de render está vazia...');
			return;
		}
		// Obtém o último item da fila de renderização.
		var item = app.project.renderQueue.item(
			app.project.renderQueue.numItems,
		);

		// Obtém o módulo de saída do item (onde o arquivo renderizado será salvo).
		var outputModule = item.outputModule(1);

		// Obtém o caminho completo da pasta de saída.
		var outputPath = decodeURI(outputModule.file.path);

		// Cria um objeto "Folder" para representar a pasta de saída.
		var fld = new Folder(outputPath);

		// Verifica se a pasta de saída existe.
		if (!fld.exists) {
			alert(lol + '#PAD_009 - a pasta não foi encontrada...'); // Exibe um erro se a pasta não for acessível.
			return; // Encerra a função se a pasta não existir.
		}

		// Abre a pasta de saída no sistema operacional do usuário.
		openFolder(outputPath);
	};

	// Adiciona um ouvinte de evento de clique ao botão "Abrir Pasta de Saída".
	uiObj.pastas.rightClick.onClick = function () {
		// Verifica se o botão clicado foi o botão direito do mouse (código 2).

		// Verifica se há acesso à internet.
		if (!netAccess()) {
			alert(lol + '#PAD_007 - sem acesso a rede...');
			return; // Encerra a função se não houver acesso à internet.
		}
		var currentProj = app.project.file;

		if (currentProj == null) {
			alert(lol + '#PAD_010 - o projeto atual ainda não foi salvo...');
			return;
		}

		var currentProjPath = decodeURI(currentProj.path);
		var fld = new Folder(currentProjPath);

		if (!fld.exists) {
			alert(lol + '#PAD_011 - a pasta não foi encontrada...');
			return;
		}
		openFolder(decodeURI(fld.fullName));
	};

	// Define a função a ser executada quando o botão "Renomear Comps" for clicado.
	uiObj.renomear.leftClick.onClick = function () {
		// Verifica se há itens no projeto.
		if (app.project.numItems == 0) return; // Encerra a função se não houver itens.

		// Inicia um grupo de desfazer para que a operação de renomeação possa ser desfeita.
		app.beginUndoGroup('renomear comps');

		// Chama a função renamePromoComps para renomear as composições selecionadas.
		renamePromoComps(app.project.selection);

		// Finaliza o grupo de desfazer.
		app.endUndoGroup();
	};

	uiObj.renomear.rightClick.onClick = function () {
		app.beginUndoGroup('renomear outputs');

		renameOutputs(); // renomeia todas as saídas

		app.endUndoGroup();
	};

	uiObj.organizar.leftClick.onClick = function () {
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
				if (aItem instanceof CompItem && aItem.comment === '') {
					aItem.comment = 'EXPORTAR'; // Adiciona a tag 'EXPORTAR' como comentário
				}
			}
		}

		deleteProjectFolders(); // Deleta as pastas existentes
		populateProjectFolders(); // Cria as pastas novas e organiza os itens
		deleteEmptyProjectFolders(); // Deleta as pastas vazias

		app.endUndoGroup();
	};

	uiObj.buscar.leftClick.onClick = function () {
		findDialog();
	};

	uiObj.organizar.rightClick.onClick = function () {
		app.beginUndoGroup('criar pastas do projeto');

		projectTemplateFolders(projectMode); // cria a estrutura de pastas do projeto

		app.endUndoGroup();
	};

	uiObj.links.leftClick.onClick = function () {
		if (!netAccess()) {
			alert(lol + '#PAD_007 - sem acesso a rede...');
			return; // Encerra a função se não houver acesso à internet.
		}
		var apontamento =
			'"https://tvglobocorp.sharepoint.com/:x:/s/Planejamento-DTEN/Planejamento/EbkuFueT_DlFlUyRqlMSnJIBRpRsPPY72NSDqgKq0DvOKg?e=T7sn7i"';

		openWebSite(apontamento);
	};
}

// Recebe um índice 'imageIndex' e um grupo de imagens 'imagesGrp'
// Altera o grupo de imagens para mostrar apenas o índice selecionado
function changeIcon(imageIndex, imagesGrp) {
	for (var i = 0; i < imagesGrp.children.length; i++) {
		imagesGrp.children[i].visible = i == imageIndex;
	}
}

// Recebe uma lista de produções 'prodDataArray' e um grupo de imagens 'imagesGrp'
// Popula o grupo de imagens com os ícones das produções
function populateMainIcons(imagesGrp) {
	while (imagesGrp.children.length > 0) {
		imagesGrp.remove(imagesGrp.children[0]);
	}

	for (var i = 0; i < PAD_prodArray.length; i++) {
		var newIcon = imagesGrp.add('image', undefined, undefined);
		try {
			newIcon.image = eval(PAD_prodArray[i].icon);
			//
		} catch (err) {
			//Em caso de erro...
			newIcon.image = defaultProductionDataObj.PRODUCTIONS[0].icon;
		}
		newIcon.helpTip =
			PAD_prodArray[0].name +
			'\n\n' +
			dClick +
			' para editar a lista de produções';
		newIcon.preferredSize = [24, 24];
		newIcon.visible = i == 0;

		newIcon.addEventListener('click', function (c) {
			// Verifica se aconteceu um clique duplo (detail == 2).
			if (c.detail == 2) {
				padProdFoldersDialog(PAD_prodArray); // Chama a janela de configuração.
				PAD_ui.prodDrop.removeAll(); // Limpa a lista de produções do menu.

				// atualiza os dados das produções.
				PAD_prodArray = updateProdData(
					new File(scriptMainPath + 'O_PADEIRO_config.json'),
				);

				// Popula a lista de produções do menu
				populateDropdownList(
					getProdNames(PAD_prodArray),
					imagesGrp.parent.children[1],
				);
				populateMainIcons(imagesGrp);

				PAD_ui.prodDrop.selection = 0; // Seleciona a primeira produção.
				imagesGrp.layout.layout(true);
			}
		});
	}
}

// Recebe um grupo 'sectionGrp' e um objeto para interação 'uiObj'
// Adiciona um divisor visual na seção 'sectionGrp'
function themeDivider(sectionGrp) {
	var newDiv = sectionGrp.add('customButton', [0, 0, 1, 1]);
	setUiCtrlColor(newDiv, divColor1);
	newDiv.onDraw = customDraw;

	return newDiv;
}

// Recebe um grupo 'sectionGrp', um objeto 'ctrlProperties'
function themeIconButton(sectionGrp, ctrlProperties) {
	var newUiCtrlObj = {};
	var tipTxt = ctrlProperties.tips.join('\n\n'); // Dica de ajuda;

	if (ctrlProperties.icon.hover == undefined)
		ctrlProperties.icon.hover = ctrlProperties.icon.normal;

	var btnGroup = sectionGrp.add('group'); // Grupo de botões superior

	var iconGroup = btnGroup.add('group'); // Grupo de botões superior
	iconGroup.orientation = 'stack'; // Alinhamento central

	newUiCtrlObj.leftClick = iconGroup.add('button', undefined, '');
	newUiCtrlObj.leftClick.size = [0, 0];
	newUiCtrlObj.leftClick.visible = false;

	newUiCtrlObj.rightClick = iconGroup.add('button', undefined, '');
	newUiCtrlObj.rightClick.size = [0, 0];
	newUiCtrlObj.rightClick.visible = false;

	var hoverImg = iconGroup.add('image', undefined, ctrlProperties.icon.hover);
	hoverImg.helpTip = tipTxt; // Dica de ajuda
	hoverImg.visible = false;

	var normalImg = iconGroup.add(
		'image',
		undefined,
		ctrlProperties.icon.normal,
	);
	normalImg.helpTip = tipTxt; // Dica de ajuda

	btnGroup.addEventListener('mouseover', function () {
		this.children[0].children[3].visible = false;
		this.children[0].children[2].visible = true;
	});

	// Ao tirar o mouse de cima
	btnGroup.addEventListener('mouseout', function () {
		this.children[0].children[2].visible = false;
		this.children[0].children[3].visible = true;
	});

	hoverImg.addEventListener('click', function (c) {
		if (c.button == 0) this.parent.children[0].notify();
	});

	hoverImg.addEventListener('click', function (c) {
		if (c.button == 2) this.parent.children[1].notify();
	});

	return newUiCtrlObj;
}

// Recebe um grupo 'sectionGrp' e um objeto 'ctrlProperties'
// as propriedades 'ctrlProperties' estão definidas na estrutura da ui 'structureObj'
function themeImageButton(sectionGrp, ctrlProperties) {
	var newUiCtrlObj = {};
	var newBtn = (newUiCtrlObj[ctrlProperties.key] = {});
	var tipTxt =
		ctrlProperties.labelTxt + ':\n\n' + ctrlProperties.tips.join('\n\n'); // Dica de ajuda;

	if (ctrlProperties.icon.hover == undefined)
		ctrlProperties.icon.hover = ctrlProperties.icon.normal;

	newBtn.btnGroup = sectionGrp.add('group'); // Grupo de botões superior

	newBtn.iconGroup = newBtn.btnGroup.add('group'); // Grupo de botões superior
	newBtn.iconGroup.orientation = 'stack'; // Alinhamento central

	newBtn.leftClick = newBtn.iconGroup.add('button', undefined, '');
	newBtn.leftClick.size = [0, 0];
	newBtn.leftClick.visible = false;

	newBtn.rightClick = newBtn.iconGroup.add('button', undefined, '');
	newBtn.rightClick.size = [0, 0];
	newBtn.rightClick.visible = false;

	newBtn.hoverImg = newBtn.iconGroup.add(
		'image',
		undefined,
		ctrlProperties.icon.hover,
	);
	newBtn.hoverImg.helpTip = tipTxt; // Dica de ajuda
	newBtn.hoverImg.visible = false;

	newBtn.normalImg = newBtn.iconGroup.add(
		'image',
		undefined,
		ctrlProperties.icon.normal,
	);
	newBtn.normalImg.helpTip = tipTxt; // Dica de ajuda

	newBtn.label = newBtn.btnGroup.add(
		'statictext',
		undefined,
		ctrlProperties.labelTxt,
		{ truncate: 'end' },
	); // Texto do botão
	newBtn.label.maximumSize = [60, 18]; // Dica de ajuda
	newBtn.label.helpTip = tipTxt; // Dica de ajuda

	setFgColor(newBtn.label, normalColor1); // Cor de destaque do texto

	newBtn.btnGroup.addEventListener('mouseover', function () {
		setFgColor(this.children[1], highlightColor1);
		this.children[0].children[3].visible = false;
		this.children[0].children[2].visible = true;
	});

	newBtn.btnGroup.addEventListener('mouseout', function () {
		setFgColor(this.children[1], normalColor1);
		this.children[0].children[2].visible = false;
		this.children[0].children[3].visible = true;
	});

	newBtn.label.addEventListener('click', function (c) {
		if (c.button == 0) this.parent.children[0].children[0].notify();
	});

	newBtn.label.addEventListener('click', function (c) {
		if (c.button == 2) this.parent.children[0].children[1].notify();
	});

	newBtn.hoverImg.addEventListener('click', function (c) {
		if (c.button == 0) this.parent.children[0].notify();
	});

	newBtn.hoverImg.addEventListener('click', function (c) {
		if (c.button == 2) this.parent.children[1].notify();
	});

	return newBtn;
}

function themeButton(sectionGrp, ctrlProperties) {
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
	newUiCtrlObj.label.width = ctrlProperties.width;
	newUiCtrlObj.label.height = ctrlProperties.height;
	newUiCtrlObj.label.text = ctrlProperties.labelTxt;
	newUiCtrlObj.label.buttonColor = divColor1;
	newUiCtrlObj.label.textColor = normalColor1;

	if (ctrlProperties.buttonColor != undefined)
		newUiCtrlObj.label.buttonColor = ctrlProperties.buttonColor;
	if (ctrlProperties.textColor != undefined)
		newUiCtrlObj.label.textColor = ctrlProperties.textColor;

	newUiCtrlObj.label.preferredSize = [
		newUiCtrlObj.label.width,
		newUiCtrlObj.label.height,
	];
	newUiCtrlObj.label.minimumSize = [68, 34];
	newUiCtrlObj.label.helpTip = tipTxt;

	drawThemeButton(newUiCtrlObj.label, false);

	newUiCtrlObj.label.addEventListener('mouseover', function () {
		drawThemeButton(this, true);
	});

	newUiCtrlObj.label.addEventListener('mouseout', function () {
		drawThemeButton(this, false);
	});

	newUiCtrlObj.label.onClick = function () {
		this.parent.children[0].notify();
	};

	newUiCtrlObj.label.addEventListener('click', function (c) {
		if (c.button == 2) this.parent.children[1].notify();
	});

	return newUiCtrlObj;
}

function drawThemeButton(button, hover) {
	var g = button.graphics;
	var textPen = g.newPen(
		g.PenType.SOLID_COLOR,
		hexToRGB(button.textColor),
		1,
	);
	var fillBrush = g.newBrush(
		g.BrushType.SOLID_COLOR,
		hexToRGB(button.buttonColor),
	);
	var textSize = g.measureString(button.text);

	if (hover) {
		textPen = g.newPen(g.PenType.SOLID_COLOR, [1, 1, 1, 1], 1);
		fillBrush = g.newBrush(
			g.BrushType.SOLID_COLOR,
			hexToRGB(highlightColor1),
		);
	}

	button.onDraw = function () {
		if (!this.enabled) {
			textPen = g.newPen(g.PenType.SOLID_COLOR, hexToRGB(divColor1), 1);
			fillBrush = g.newBrush(g.BrushType.SOLID_COLOR, hexToRGB(bgColor));
		}
		g.newPath();
		g.ellipsePath(0, 0, this.height, this.height);
		g.fillPath(fillBrush);
		g.ellipsePath(this.width - this.height, 0, this.height, this.height);
		g.rectPath(this.height / 2, 0, this.width - this.height, this.height);
		// g.strokePath(textPen);
		g.fillPath(fillBrush);

		g.drawString(
			this.text,
			textPen,
			(this.width - textSize.width) / 2,
			this.height / 2 - textSize.height,
		);
	};
}

// Cria botões de cor com base em um array de cores.
function createColorButtons(colorArray, colorGrp) {
	for (var c = 0; c < colorArray.length; c++) {
		var hex = colorArray[c]; // Obtém o código hexadecimal da cor.
		var rgb = hexToRGB(hex) * 255; // Converte para RGB (0-255).

		// Cria um botão com ícone, nomeado com o código hexadecimal e estilo 'toolbutton'.
		var colorBtn = colorGrp.add('iconbutton', undefined, undefined, {
			name: hex,
			style: 'toolbutton',
		});

		colorBtn.size = [20, 20]; // Define o tamanho do botão (20x20 pixels).
		setUiCtrlColor(colorBtn, hex); // Define a cor de fundo do botão.
		colorBtn.onDraw = customDraw; // Define a função de desenho personalizado.

		// Define o texto de ajuda (tooltip) com os valores RGB e hexadecimal da cor.
		colorBtn.helpTip =
			'R: ' +
			rgb[0] +
			'\nG: ' +
			rgb[1] +
			'\nB: ' +
			rgb[2] +
			'\nHEX: ' +
			hex;
	}
}

// Função para desenhar o botão personalizado.
function customDraw() {
	with (this) {
		// Refere-se ao próprio botão (this).
		graphics.drawOSControl(); // Desenha o contorno padrão do botão.
		graphics.rectPath(0, 0, size[0], size[1]); // Define o caminho de um retângulo no tamanho do botão.
		graphics.fillPath(fillBrush); // Preenche o retângulo com a cor definida em 'fillBrush'.
	}
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
		height - y - radius / 2,
	];

	for (var i = 0; i <= coords.length - 1; i += 2) {
		if (i === 0) {
			g.moveTo(coords[i], coords[i + 1]);
		} else {
			g.lineTo(coords[i], coords[i + 1]);
		}
	}
	g.fillPath(brush);
}

// Altera a cor de fundo da janela.
function setBgColor(w, hex) {
	var color = hexToRGB(hex); // Converte a cor hexadecimal em RGB.
	var bType = w.graphics.BrushType.SOLID_COLOR; // Define o tipo do pincel como cor sólida.
	w.graphics.backgroundColor = w.graphics.newBrush(bType, color); // Aplica o pincel com a nova cor à janela.
}

// Define a cor de um botão.
function setUiCtrlColor(ctrl, hex) {
	var color = hexToRGB(hex); // Converte a cor hexadecimal em RGB.
	var bType = ctrl.graphics.BrushType.SOLID_COLOR; // Define o tipo do pincel como cor sólida.
	ctrl.fillBrush = ctrl.graphics.newBrush(bType, color); // Cria um novo pincel com a cor e o aplica ao botão.
}

// Altera a cor de um texto estático.
function setFgColor(sTxt, hex) {
	var color = hexToRGB(hex); // Converte a cor hexadecimal em RGB.
	var pType = sTxt.graphics.PenType.SOLID_COLOR; // Define o tipo da caneta como cor sólida.
	sTxt.graphics.foregroundColor = sTxt.graphics.newPen(pType, color, 1); // Cria uma nova caneta com a cor e a aplica ao texto.
}

// Adiciona efeito de destaque (highlight) ao texto estático quando o mouse passa por cima.
function setCtrlHighlight(sTxt, normalColor1, highlightColor1) {
	setFgColor(sTxt, normalColor1); // Define a cor normal do texto.

	sTxt.addEventListener('mouseover', function () {
		// Ao passar o mouse por cima do texto:
		setFgColor(sTxt, highlightColor1); // Muda para a cor de destaque.
	});
	sTxt.addEventListener('mouseout', function () {
		// Ao tirar o mouse de cima do texto:
		setFgColor(sTxt, normalColor1); // Retorna para a cor normal.
	});
}
