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
	uiObj.mainLogo.helpTip = [scriptName, scriptVersion, '| Jean-Marc Billard'].join(' ');

	uiObj.vLab = uiObj.infoGrp.add('statictext', undefined, scriptVersion, {
		truncate: 'end'
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

	uiObj.prodDrop = uiObj.prodGrp.add('dropdownlist', undefined, getProdNames(PAD_prodArray));
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

		if (sectionCounter > 0) uiObj.divArray.push(new themeDivider(uiObj.mainGrp));

		var pinSectionGrp = uiObj.mainGrp.add('group', undefined, {
			name: 'sectionGrp'
		}); // Grupo de botões superior
		pinSectionGrp.alignment = ['center', 'top']; // Alinhamento
		uiObj.sectionGrpArray.push(pinSectionGrp);

		for (var pinCtrl in pinSection) {
			var pinCtrlProperties = pinSection[pinCtrl];
			pinCtrlProperties.key = pinCtrl;

			if (pinCtrlProperties.labelTxt == undefined)
				pinCtrlProperties.labelTxt = pinCtrl.replace(/_/g, ' ').toTitleCase();

			if (pinCtrlProperties.type == 'iconButton') {
				uiObj[pinCtrl] = new themeIconButton(uiObj['iconBtnGrp' + (ctrlCounter % 2)], pinCtrlProperties);
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

		var sectionGrp = uiObj.mainGrp.add('group', undefined, {
			name: 'sectionGrp'
		}); // Grupo de botões superior
		sectionGrp.alignment = ['center', 'top']; // Alinhamento
		uiObj.sectionGrpArray.push(sectionGrp);

		for (var ctrl in section) {
		
			var ctrlProperties = section[ctrl];
			ctrlProperties.key = ctrl;

			if (ctrlProperties.labelTxt == undefined) ctrlProperties.labelTxt = ctrl.replace(/_/g, ' ').toTitleCase();

			if (ctrlProperties.type == 'imageButton') {
				uiObj[ctrl] = new menuButton(sectionGrp, ctrlProperties);
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
		uiObj.mainGrp.margins = isRow ? [pinGap, 0, infoGap, 0] : [4, pinGap, 4, infoGap];
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
		newIcon.helpTip = PAD_prodArray[0].name + '\n\n' + dClick + ' para editar a lista de produções';
		newIcon.preferredSize = [24, 24];
		newIcon.visible = i == 0;

		newIcon.addEventListener('click', function (c) {
			// Verifica se aconteceu um clique duplo (detail == 2).
			if (c.detail == 2) {
				padProdFoldersDialog(PAD_prodArray); // Chama a janela de configuração.
				PAD_ui.prodDrop.removeAll(); // Limpa a lista de produções do menu.

				// atualiza os dados das produções.
				PAD_prodArray = updateProdData(configFile);

				// Popula a lista de produções do menu
				populateDropdownList(getProdNames(PAD_prodArray), imagesGrp.parent.children[1]);
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

	if (ctrlProperties.icon.hover == undefined) ctrlProperties.icon.hover = ctrlProperties.icon.normal;

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

	var normalImg = iconGroup.add('image', undefined, ctrlProperties.icon.normal);
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
		if (c.button == 2) this.parent.children[1].notify();
	});

	return newUiCtrlObj;
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
	}	catch (err) {
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

function menuButton(sectionGrp, ctrlProperties) {
	// if (ctrlProperties.buttonColor === undefined) ctrlProperties.buttonColor = divColor1;
	if (ctrlProperties.textColor === undefined) ctrlProperties.textColor = normalColor1;

	var newUiCtrlObj = {};

	newUiCtrlObj.button = sectionGrp.add('customButton');
	// newUiCtrlObj.button.size = [ctrlProperties.width, ctrlProperties.height];
	// newUiCtrlObj.button.size = [ctrlProperties.width, ctrlProperties.height];
	newUiCtrlObj.button.text = ctrlProperties.text;
	newUiCtrlObj.button.image = ctrlProperties.normalIcon;
	newUiCtrlObj.button.hoverImage = ctrlProperties.hoverIcon;
	newUiCtrlObj.button.textColor = hexToRgb(ctrlProperties.textColor);

	drawMenuButton(newUiCtrlObj.button);

	newUiCtrlObj.button.addEventListener('mouseover', function () {
		this.textColor = hexToRgb(highlightColor1);
		this.image = ctrlProperties.hoverIcon;
		drawMenuButton(this);
	});

	newUiCtrlObj.button.addEventListener('mouseout', function () {
		this.textColor = hexToRgb(ctrlProperties.textColor);
		this.image = ctrlProperties.normalIcon;
		drawMenuButton(this);
	});

	return newUiCtrlObj;
}

function drawMenuButton(button) {
	var g = button.graphics;
	var textPen = g.newPen(g.PenType.SOLID_COLOR, button.textColor, 1);
	var margin = 10;
	button.parent.layout.layout(true);

	button.onDraw = function () {
		var h = this.size.height;
		var w = this.size.width;
		var isRow = this.parent.orientation == 'row';

		this.preferredSize = isRow ? [100, 44] : [120, 32];
		this.maximumSize = isRow ? [100, 44] : [120, 32];

		var px_Img = isRow ? (w - 32) / 2 : 0;
		var py_Img = isRow ? -8 : 0;
		g.drawImage(this.image, px_Img, py_Img, 32, 32);

		if (this.text.trim() == '') return;
		// if (w < margin * 2 + 6) return;

		var textLinesArray = this.text.split('\n');
		var py_TxtInc = 12;

		for (var l = 0; l < textLinesArray.length; l++) {
			var txtW = g.measureString(textLinesArray[l]).width;

			if (txtW > w - margin * 2) {
				textLinesArray[l] = textLinesArray[l].substring(0, textLinesArray[l].length - 2);

				while (txtW > w - 6 - margin * 2) {
					var end = textLinesArray[l].length - 1;
					textLinesArray[l] = textLinesArray[l].substring(0, end);

					txtW = parseInt(g.measureString(textLinesArray[l]));
				}
				textLinesArray[l] += '...';
			}

			var px_Txt = isRow ? (w - txtW) / 2 : 36;
			var py_Txt = l == 0 ? (-(textLinesArray.length - 1) / 2) * py_TxtInc : (py_Txt += py_TxtInc);
			if (appV > 24 && l == 0) py_Txt += 8;
			if (isRow) py_Txt += 20;

			g.drawString(textLinesArray[l], textPen, px_Txt, py_Txt);
		}
	};
}
