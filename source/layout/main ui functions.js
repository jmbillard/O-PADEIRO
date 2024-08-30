/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 📟 ui and layout
---------------------------------------------------------------

*/

// Recebe um grupo 'sectionGrp' e um objeto para interação 'uiObj'
// Adiciona um divisor visual na seção 'sectionGrp'
function themeDivider(sectionGrp) {
	var newDiv = sectionGrp.add("customButton", [0, 0, 1, 1]);
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
	var newBtn = newUiCtrlObj[ctrlProperties.key] = {};
	var tipTxt = ctrlProperties.labelTxt + ':\n\n' + ctrlProperties.tips.join('\n\n'); // Dica de ajuda;

	if (ctrlProperties.icon.hover == undefined) ctrlProperties.icon.hover = ctrlProperties.icon.normal;

	newBtn.btnGroup = sectionGrp.add('group'); // Grupo de botões superior

	newBtn.iconGroup = newBtn.btnGroup.add('group'); // Grupo de botões superior
	newBtn.iconGroup.orientation = 'stack'; // Alinhamento central

	newBtn.leftClick = newBtn.iconGroup.add('button', undefined, '');
	newBtn.leftClick.size = [0, 0];
	newBtn.leftClick.visible = false;

	newBtn.rightClick = newBtn.iconGroup.add('button', undefined, '');
	newBtn.rightClick.size = [0, 0];
	newBtn.rightClick.visible = false;

	newBtn.hoverImg = newBtn.iconGroup.add('image', undefined, ctrlProperties.icon.hover);
	newBtn.hoverImg.helpTip = tipTxt; // Dica de ajuda
	newBtn.hoverImg.visible = false;

	newBtn.normalImg = newBtn.iconGroup.add('image', undefined, ctrlProperties.icon.normal);
	newBtn.normalImg.helpTip = tipTxt; // Dica de ajuda

	newBtn.label = newBtn.btnGroup.add('statictext', undefined, ctrlProperties.labelTxt, { truncate: 'end' }); // Texto do botão
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

	if (ctrlProperties.buttonColor != undefined) newUiCtrlObj.label.buttonColor = ctrlProperties.buttonColor;
	if (ctrlProperties.textColor != undefined) newUiCtrlObj.label.textColor = ctrlProperties.textColor;

	newUiCtrlObj.label.preferredSize = [newUiCtrlObj.label.width, newUiCtrlObj.label.height];
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
	var textPen = g.newPen(g.PenType.SOLID_COLOR, hexToRGB(button.textColor), 1);
	var fillBrush = g.newBrush(g.BrushType.SOLID_COLOR, hexToRGB(button.buttonColor));
	var textSize = g.measureString(button.text);

	if (hover) {
		textPen = g.newPen(g.PenType.SOLID_COLOR, [1, 1, 1, 1], 1);
		fillBrush = g.newBrush(g.BrushType.SOLID_COLOR, hexToRGB(highlightColor1));
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

		g.drawString(this.text, textPen, (this.width - textSize.width) / 2, this.height / 2 - textSize.height);
	}
}

// Cria botões de cor com base em um array de cores.
function createColorButtons(colorArray, colorGrp) {
	for (var c = 0; c < colorArray.length; c++) {
		var hex = colorArray[c];          // Obtém o código hexadecimal da cor.
		var rgb = hexToRGB(hex) * 255;    // Converte para RGB (0-255).

		// Cria um botão com ícone, nomeado com o código hexadecimal e estilo 'toolbutton'.
		var colorBtn = colorGrp.add('iconbutton', undefined, undefined, { name: hex, style: 'toolbutton' });

		colorBtn.size = [20, 20];          // Define o tamanho do botão (20x20 pixels).
		setUiCtrlColor(colorBtn, hex);        // Define a cor de fundo do botão.
		colorBtn.onDraw = customDraw;      // Define a função de desenho personalizado.

		// Define o texto de ajuda (tooltip) com os valores RGB e hexadecimal da cor.
		colorBtn.helpTip = 'R: ' + rgb[0] + '\nG: ' + rgb[1] + '\nB: ' + rgb[2] + '\nHEX: ' + hex;
	}
}

// Função para desenhar o botão personalizado.
function customDraw() {
	// with (this) {                                  // Refere-se ao próprio botão (this).
	this.graphics.drawOSControl();                  // Desenha o contorno padrão do botão.
	this.graphics.rectPath(0, 0, size[0], size[1]); // Define o caminho de um retângulo no tamanho do botão.
	this.graphics.fillPath(fillBrush);              // Preenche o retângulo com a cor definida em 'fillBrush'.
	// }
}

function drawRoundedRect(g, brush, width, height, cornerRadius, x, y) {
	g.newPath();
	g.ellipsePath(x, y, cornerRadius, cornerRadius);
	g.fillPath(brush);
	g.ellipsePath(width - x - cornerRadius, y, cornerRadius, cornerRadius);
	g.fillPath(brush);
	g.ellipsePath(width - x - cornerRadius, height - y - cornerRadius, cornerRadius, cornerRadius);
	g.fillPath(brush);
	g.ellipsePath(x, height - y - cornerRadius, cornerRadius, cornerRadius);
	g.fillPath(brush);
	g.newPath();

	var coords = [x, y + (cornerRadius / 2),
		x + (cornerRadius / 2),
		y,
		width - x - (cornerRadius / 2),
		y,
		width - x,
		y + (cornerRadius / 2),
		width - x,
		height - y - (cornerRadius / 2),
		width - x - (cornerRadius / 2),
		height - y,
		x + (cornerRadius / 2),
		height - y,
		x,
		height - y - (cornerRadius / 2)
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
	var color = hexToRGB(hex);                    // Converte a cor hexadecimal em RGB.
	var bType = w.graphics.BrushType.SOLID_COLOR; // Define o tipo do pincel como cor sólida.
	w.graphics.backgroundColor = w.graphics.newBrush(bType, color); // Aplica o pincel com a nova cor à janela.
}

// Define a cor de um botão.
function setUiCtrlColor(ctrl, hex) {
	var color = hexToRGB(hex);                           // Converte a cor hexadecimal em RGB.
	var bType = ctrl.graphics.BrushType.SOLID_COLOR;        // Define o tipo do pincel como cor sólida.
	ctrl.fillBrush = ctrl.graphics.newBrush(bType, color); // Cria um novo pincel com a cor e o aplica ao botão.
}

// Altera a cor de um texto estático.
function setFgColor(sTxt, hex) {
	var color = hexToRGB(hex);         // Converte a cor hexadecimal em RGB.
	var pType = sTxt.graphics.PenType.SOLID_COLOR; // Define o tipo da caneta como cor sólida.
	sTxt.graphics.foregroundColor = sTxt.graphics.newPen(pType, color, 1); // Cria uma nova caneta com a cor e a aplica ao texto.
}

// Adiciona efeito de destaque (highlight) ao texto estático quando o mouse passa por cima.
function setCtrlHighlight(sTxt, normalColor1, highlightColor1) {
	setFgColor(sTxt, normalColor1);     // Define a cor normal do texto.

	sTxt.addEventListener('mouseover', function () { // Ao passar o mouse por cima do texto:
		setFgColor(sTxt, highlightColor1); // Muda para a cor de destaque.
	});
	sTxt.addEventListener('mouseout', function () {  // Ao tirar o mouse de cima do texto:
		setFgColor(sTxt, normalColor1);  // Retorna para a cor normal.
	});
}
