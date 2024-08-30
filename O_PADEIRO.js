/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

function O_PADEIRO_UTL(thisObj) {
	// Declaração da versão do script 'O Padeiro'
	var scriptName = 'O PADEIRO';
	var scriptVersion = 'v1.4';
	var thisScriptFile = new File($.fileName);

	var libArray = [

		'source/libraries/ICON lib.js',        // Inclui ícones codificados para a interface
		'source/libraries/JSON lib.js',        // Inclui funções para trabalhar com dados JSON
		'source/libraries/FUNC lib.js',        // Inclui funções utilitárias gerais
		'source/libraries/PROT lib.js',        // Inclui funções que estendem objetos JavaScript (prototype)
		'source/globals.js',                   // Inclui variáveis globais (usadas em todo o script)
		'source/libraries/functions/color lib.js',
		'source/libraries/functions/ctrl anim lib.js',
		'source/libraries/functions/file system lib.js',
		'source/libraries/functions/layers lib.js',
		'source/libraries/functions/math num lib.js',
		'source/libraries/functions/string lib.js',
		'source/libraries/functions/treeView lib.js',
		'source/libraries/functions/metadata lib.js',
		
		// utilidades com interface
		'source/layout/main ui functions.js',  // Inclui funções para criar a interface do usuário
		'source/layout/Utils/o padeiro templates ui.js', // Sistema de templates
		'source/layout/Utils/o padeiro folders ui.js',   // Lista de pastas de produção
		'source/layout/Utils/o padeiro maker ui.js',     // Editor de templates
		'source/layout/Utils/find ui.js'                 // Busca em layers de texto
	];

	for (var l = 0; l < libArray.length; l++) {
		eval('#include \'' + thisScriptFile.parent.fullName + '/' + libArray[l] + '\';');
	}

	var lClick = '◖  →  ';
	var rClick = ' ◗  →  ';
	var dClick = '◖◖ →  ';

	// estrutura de 'ctrlProperties'
	var PAD_mainGrpUiStructure = {
		pinGrp: {
			section0: {
				links: {
					type: 'iconButton',
					labelTxt: 'Links',
					icon: PAD_LINKS_ICON,
					tips: [
						lClick + 'abrir apontamento de projetos',
					]
				}//,
				// diretorios: {
				// 	type: 'iconButton',
				// 	labelTxt: 'Diretórios',
				// 	icon: PAD_PASTA_ICON,
				// 	tips: [
				// 		lClick + 'abrir lista de diretórios da rede',
				// 	]
				// }
			}
		},
		mainGrp: {
			section1: {
				templates: {
					type: 'imageButton',
					labelTxt: 'Templates',
					icon: PAD_TEMPLATES_ICON,
					tips: [
						lClick + 'preencher templates',
						rClick + 'criar novo template'
					]
				},
				fontes: {
					type: 'imageButton',
					labelTxt: 'Fontes',
					icon: PAD_FONTES_ICON,
					tips: [
						lClick + 'instalar as fontes usadas no template',
						rClick + 'fazer o collect das fontes usadas no projeto'
					]
				}
			},
			section2: {
				pastas: {
					type: 'imageButton',
					labelTxt: 'Pastas',
					icon: PAD_PASTAS_ICON,
					tips: [
						lClick + 'abir a pasta do último item da fila de render',
						rClick + 'abir a pasta do projeto (caso esteja salvo)'
					]
				}
			},
			section3: {
				renomear: {
					type: 'imageButton',
					labelTxt: 'Renomear',
					icon: PAD_RENOMEAR_ICON,
					tips: [
						lClick + 'renomear comps selecionadas',
						rClick + 'renomear TODAS as saídas de render'
					]
				},
				organizar: {
					type: 'imageButton',
					labelTxt: 'Organizar',
					icon: PAD_ORGANIZAR_ICON,
					tips: [
						'selecione as comps que serão\nRENDERIZADAS primeiro!',
						lClick + 'organizar o projeto',
						rClick + 'criar estrutura de pastas do projeto'
					]
				}
			},
			section4: {
				buscar: {
					type: 'imageButton',
					labelTxt: 'Buscar',
					icon: PAD_BUSCAR_ICON,
					tips: [
						lClick + 'abrir a BUSCA em layers de texto'
					]
				}
			}//,
			// section5: {
			// 	atalhos: {
			// 		type: 'imageButton',
			// 		labelTxt: 'Atalhos',
			// 		icon: PAD_ATALHOS_ICON,
			// 		tips: [
			// 			lClick + 'abrir a planilha do apontamento de projetos no navegador'
			// 		]
			// 	}
			// }
		}
	};

	var PAD_prodArray = updateProdData(new File(scriptMainPath + 'O_PADEIRO_config.json')); // dados das produções
	templatesPath = PAD_prodArray[0].templatesPath;
	templatesFolder = new Folder(PAD_prodArray[0].templatesPath); // pasta de templates.

	// Recebe uma lista de produções 'prodDataArray'
	// Retorna a mesma lista 'prodDataArray' ordenada pela propriedade 'name'
	function sortProdData(prodDataArray) {
		return prodDataArray.sort(function (a, b) {
			if (a.name < b.name) return -1;
			if (a.name > b.name) return 1;

			return 0;
		});
	}

	// Recebe uma lista de produções 'prodDataArray'
	// Retorna uma lista 'prdNames' com as propriedades 'name'
	function getProdNames(prodDataArray) {
		var prdNamesArray = [];

		for (var i = 0; i < prodDataArray.length; i++) {
			prdNamesArray.push(prodDataArray[i].name);
		}
		return prdNamesArray;
	}

	// Recebe uma lista de produções 'prodDataArray'
	// Salva e retorna um arquivo JSON 'configFile' com os dados salvos
	function saveProdData(prodDataArray) {
		var prodData = { PRODUCTIONS: prodDataArray };
		var configFile = new File(scriptMainPath + 'O_PADEIRO_config.json');
		var configContent = JSON.stringify(prodData, null, '\t');
		writeFileContent(configFile, configContent);

		return configFile;
	}

	// Atualiza os dados das produções a partir de um arquivo JSON 'configFile'
	// Retorna a lista de produções 'prodData' ordenado pela propriedade 'name'
	function updateProdData(configFile) {

		var prodData;
		if (!configFile.exists) padProdFoldersDialog(defaultProductionDataObj.PRODUCTIONS); // Chama a janela de configuração das produções.

		$.sleep(300); // Espera 300ms antes de tentar ler o arquivo

		try {
			var configContent = readFileContent(configFile); // Lê o conteúdo do arquivo de configuração JSON
			prodData = JSON.parse(configContent);            // Analisa o conteúdo JSON e o armazena no objeto 'prodData'
			prodData = sortProdData(prodData.PRODUCTIONS);   // Ordena as produções por nome

		} catch (err) { //Em caso de erro...
			prodData = defaultProductionDataObj.PRODUCTIONS; // Lista inicial de produções
		}

		return prodData;
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

			} catch (err) { //Em caso de erro...
				newIcon.image = defaultProductionDataObj.PRODUCTIONS[0].icon;
			}
			newIcon.helpTip = PAD_prodArray[0].name + '\n\n' + dClick + ' para editar a lista de produções';
			newIcon.preferredSize = [24, 24];
			newIcon.visible = i == 0;

			newIcon.addEventListener('click', function (c) {

				// Verifica se aconteceu um clique duplo (detail == 2).
				if (c.detail == 2) {

					padProdFoldersDialog(PAD_prodArray); // Chama a janela de configuração.
					PAD_ui.prodDrop.removeAll(); // Limpa a lista de produções do menu.

					// atualiza os dados das produções.
					PAD_prodArray = updateProdData(new File(scriptMainPath + 'O_PADEIRO_config.json'));

					// Popula a lista de produções do menu
					populateDropdownList(getProdNames(PAD_prodArray), imagesGrp.parent.children[1]);
					populateMainIcons(imagesGrp);

					PAD_ui.prodDrop.selection = 0; // Seleciona a primeira produção.
					imagesGrp.layout.layout(true);
				}
			});
		}
	}

	// Recebe a estrutura da ui 'structureObj' e um objeto para interação 'uiObj'
	// Cria os controles da interface e define os eventos entre eles
	function PAD_BUILD_UI(structureObj, uiObj) {

		// // Configurações da janela
		uiObj.window.margins = 4;      // Margens internas
		uiObj.window.orientation = 'stack'; // Layout vertical


		uiObj.mainGrp = uiObj.window.add('group'); // Grupo principal
		uiObj.sectionGrpArray.push(uiObj.mainGrp);

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

		uiObj.pinGrp = uiObj.window.add('group'); // Grupo de botões superior
		uiObj.pinGrp.alignment = ['center', 'top']; // Alinhamento
		uiObj.pinGrp.spacing = 16; // Espaçamento entre botões
		uiObj.sectionGrpArray.push(uiObj.pinGrp);

		uiObj.prodGrp = uiObj.pinGrp.add('group');
		uiObj.sectionGrpArray.push(uiObj.prodGrp);

		uiObj.prodIconGrp = uiObj.prodGrp.add('group');
		uiObj.prodIconGrp.orientation = 'stack'; // Layout vertical
		populateMainIcons(uiObj.prodIconGrp);

		uiObj.prodDrop = uiObj.prodGrp.add('dropdownlist', undefined, getProdNames(PAD_prodArray));
		uiObj.prodDrop.selection = 0; // Seleciona a produção padrão.
		uiObj.prodDrop.maximumSize = [140, 24];
		uiObj.prodDrop.minimumSize = [52, 24];
		uiObj.prodDrop.helpTip = "PRODUÇÃO SELECIONADA"; // Dica de ajuda

		uiObj.iconBtnMainGrp = uiObj.pinGrp.add('group');

		uiObj.iconBtnGrp0 = uiObj.iconBtnMainGrp.add('group');
		uiObj.sectionGrpArray.push(uiObj.iconBtnGrp0);

		uiObj.iconBtnGrp1 = uiObj.iconBtnMainGrp.add('group');
		uiObj.sectionGrpArray.push(uiObj.iconBtnGrp1);

		var sectionCounter = 0;
		var ctrlCounter = 0;

		for (var pinSec in structureObj.pinGrp) {
			var pinSection = structureObj['pinGrp'][pinSec];

			if (sectionCounter > 0) uiObj.divArray.push(new themeDivider(uiObj.mainGrp));

			var pinSectionGrp = uiObj.mainGrp.add('group', undefined, { name: 'sectionGrp' }); // Grupo de botões superior
			pinSectionGrp.alignment = ['center', 'top']; // Alinhamento
			uiObj.sectionGrpArray.push(pinSectionGrp);

			for (var pinCtrl in pinSection) {
				var pinCtrlProperties = pinSection[pinCtrl];
				pinCtrlProperties.key = pinCtrl;

				if (pinCtrlProperties.labelTxt == undefined) pinCtrlProperties.labelTxt = pinCtrl.replace(/_/g, ' ').toTitleCase();

				if (pinCtrlProperties.type == 'iconButton') {
					uiObj[pinCtrl] = new themeIconButton(uiObj['iconBtnGrp' + ctrlCounter % 2], pinCtrlProperties);
					uiObj.iconButtonArray.push(uiObj[pinCtrl]);
				}
				ctrlCounter++;
			}
			sectionCounter++;
		}

		sectionCounter = 0;

		for (var sec in structureObj.mainGrp) {
			var section = structureObj['mainGrp'][sec];

			if (sectionCounter > 0) uiObj.divArray.push(new themeDivider(uiObj.mainGrp));

			var sectionGrp = uiObj.mainGrp.add('group', undefined, { name: 'sectionGrp' }); // Grupo de botões superior
			sectionGrp.alignment = ['center', 'top']; // Alinhamento
			uiObj.sectionGrpArray.push(sectionGrp);

			for (var ctrl in section) {
				var ctrlProperties = section[ctrl];
				ctrlProperties.key = ctrl;

				if (ctrlProperties.labelTxt == undefined) ctrlProperties.labelTxt = ctrl.replace(/_/g, ' ').toTitleCase();

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
			uiObj.mainGrp.margins = isRow ? [pinGap, 0, infoGap, 0] : [4, pinGap, 4, infoGap];;
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

		} catch (err) { alert(lol + '#PAD_layout - ' + '' + err.message); } //Em caso de erro...

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
			if (!templatesFolder.exists) alert(lol + '#PAD_002 - a pasta de templates não foi localizada...');
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
			} catch (err) { alert(lol + '#PAD_MAKER - ' + '' + err.message); }
		};

		uiObj.fontes.leftClick.onClick = function () { // Define a função a ser executada quando o botão "Instalar Fontes" for clicado.

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
				alert(lol + '#PAD_005 - esse não foi preenchido pelo padeiro...')
				return;
			}
			// Cria um objeto "Folder" para a pasta de fontes do template.
			var templateFontsFolder = new Folder(templateFontsPath);

			// Verifica se a pasta de fontes existe.
			if (!templateFontsFolder.exists) {
				alert(lol + '#PAD_006 - a pasta de fontes não foi localizada...')
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
				alert(lol + '#PAD_008 - a fila de render está vazia...')
				return;
			}
			// Obtém o último item da fila de renderização.
			var item = app.project.renderQueue.item(app.project.renderQueue.numItems);

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
			var apontamento = '"https://tvglobocorp.sharepoint.com/:x:/s/Planejamento-DTEN/Planejamento/EbkuFueT_DlFlUyRqlMSnJIBRpRsPPY72NSDqgKq0DvOKg?e=T7sn7i"';

			openWebSite(apontamento);
		};

		// Retorna o objeto da janela (PAD_w) para que ele possa ser exibido ou manipulado posteriormente.
	}

	// 'uiObj' armazena os controles da interface, grupos seus respectivos arrays
	var PAD_ui = {
		iconButtonArray: [],
		imageButtonArray: [],
		sectionGrpArray: [],
		divArray: []
	};

	function PAD_WINDOW(thisObj) {
		PAD_ui.window = thisObj;

		if (!(thisObj instanceof Panel)) PAD_ui.window = new Window('palette', scriptName); // Cria uma nova janela

		PAD_BUILD_UI(PAD_mainGrpUiStructure, PAD_ui);

		return PAD_ui.window;
	}

	// Cria a janela da interface chamando a função PAD_UI_EVENTS e passando o objeto atual como argumento. O resultado é armazenado na variável O_PADEIRO_WINDOW.
	var O_PADEIRO_WINDOW = PAD_WINDOW(thisObj);

	// Verifica o acesso à rede.
	if (!netAccess()) {
		// Se não houver acesso, exibe um alerta pedindo para habilitar o acesso à rede nas preferências.
		alert('por favor, habilite a opção ' + netConfigName + ' nas preferencias');

		// Abre a janela de preferências do After Effects na seção de scripts.
		app.executeCommand(3131);

		// Verifica novamente se há acesso à rede.
		if (!netAccess()) {
			// Se ainda não houver acesso, exibe outro alerta informando que a funcionalidade será limitada.
			alert(lol + '#PAD_012 - sem acesso a rede...');
		}
	}

	// Verifica se a interface (O_PADEIRO_WINDOW) está sendo executada como uma janela flutuante.
	if (!(O_PADEIRO_WINDOW instanceof Panel)) O_PADEIRO_WINDOW.show();
	// Retorna o objeto da janela (O_PADEIRO_WINDOW).
	return O_PADEIRO_WINDOW;
}

// Executa tudo... ヽ(✿ﾟ▽ﾟ)ノ
O_PADEIRO_UTL(this);
