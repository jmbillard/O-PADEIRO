/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> 🖌️ layers
---------------------------------------------------------------

*/

/*

---------------------------------------------------------------
> shape layers
---------------------------------------------------------------

*/

// Cria uma camada de forma (shape layer) com um retângulo vazio (usado como null).
function shpNull() {
	var aItem = app.project.activeItem; // Obtém a composição ativa
	var shpLayer = aItem.layers.addShape(); // Cria uma nova camada de forma
	var shpGroup = shpLayer.property('ADBE Root Vectors Group'); // Obtém o grupo de vetores raiz da camada
	var shpRect = shpGroup.addProperty('ADBE Vector Shape - Rect'); // Adiciona um retângulo ao grupo
	shpRect.name = 'null'; // Nomeia o retângulo como "null"
	shpRect.property('ADBE Vector Rect Size').setValue([100, 100]); // Define o tamanho do retângulo

	return shpLayer; // Retorna a camada de forma criada
}

// Cria uma camada de ajuste (adjustment layer) como uma camada de forma.
function shpAdjustment(comp) {
	var shpLayer = comp.layers.addShape(); // Cria uma nova camada de forma
	var shpGroup = shpLayer.property('ADBE Root Vectors Group'); // Obtém o grupo de vetores raiz

	// Cria e configura o retângulo da camada de ajuste
	var shpRect = shpGroup.addProperty('ADBE Vector Shape - Rect');
	shpRect.name = 'adjustment'; // Nomeia o retângulo
	var expStr = '[thisComp.width, thisComp.height];'; // Expressão para o tamanho

	// Define o tamanho inicial e a expressão para ajustar automaticamente o tamanho
	shpRect
		.property('ADBE Vector Rect Size')
		.setValue([comp.width, comp.height]);
	shpRect.property('ADBE Vector Rect Size').expression = expStr;

	// Cria e configura o preenchimento da camada de ajuste
	var shpFill = shpGroup.addProperty('ADBE Vector Graphic - Fill');
	shpFill.property('ADBE Vector Fill Color').setValue([1, 1, 1, 1]); // Branco e opaco
	shpFill.name = 'adjustment fill'; // Nomeia o preenchimento

	return shpLayer; // Retorna a camada de ajuste criada
}

// Cria uma paleta de cores (grupo de vetores) na camada fornecida.
function shpPallet(aLayer, colorArray) {
	var s = 50; // Tamanho de cada amostra de cor
	var gap = 10; // Espaçamento entre as amostras

	// Calcula a posição vertical inicial para centralizar as amostras
	var posY = ((colorArray.length - 1) * (s + gap)) / 2;

	// Obtém o grupo de vetores raiz da camada
	var contents = aLayer.property('ADBE Root Vectors Group');

	// Cria um novo grupo de vetores para a paleta
	var pallet = contents.addProperty('ADBE Vector Group');

	// Itera sobre as cores do array
	for (var c = 0; c < colorArray.length; c++) {
		var color = hexToRGB(colorArray[c]); // Converte a cor hexadecimal para RGB
		var Hex = rgbToHEX(color); // Converte a cor RGB de volta para hexadecimal (para o nome)

		// Cria um grupo para a amostra de cor e seus elementos
		var colorGroup = pallet
			.addProperty('ADBE Vectors Group')
			.addProperty('ADBE Vector Group');

		// Cria um subgrupo para a amostra de cor
		var colorSubGroup = colorGroup.addProperty('ADBE Vectors Group');

		// Cria um retângulo para a amostra de cor
		var colorSwatch = colorSubGroup.addProperty('ADBE Vector Shape - Rect');
		colorSwatch.property('ADBE Vector Rect Size').setValue([s, s]); // Define o tamanho da amostra
		colorSwatch
			.property('ADBE Vector Rect Position')
			.setValue([0, c * (s + gap) - posY]); // Posiciona a amostra

		// Cria um preenchimento para a amostra de cor
		var colorFill = colorSubGroup.addProperty('ADBE Vector Graphic - Fill');
		colorFill.property('ADBE Vector Fill Color').setValue(color); // Define a cor da amostra
		colorFill.name = Hex; // Nomeia o preenchimento com o valor hexadecimal da cor

		// Nomeia o grupo da amostra de cor com o valor hexadecimal da cor
		colorGroup.name = Hex;
	}
	return pallet; // Retorna o grupo de vetores da paleta
}

// Cria uma camada de forma (shape layer) com paletas de cores.
function colorPallet() {
	var comp = app.project.activeItem; // Obtém a composição ativa
	var layer = comp.layers.addShape(); // Cria uma nova camada de forma

	// Paleta principal (monoColors)
	var pallet1 = shpPallet(layer, monoColors); // Cria a primeira paleta de cores
	var pallet1Transform = pallet1.property('ADBE Vector Transform Group'); // Obtém o grupo de transformação da paleta
	pallet1Transform
		.property('ADBE Vector Position')
		.setValue([45, comp.height / 2]); // Posiciona a paleta 1
	pallet1.name = 'pallet 1'; // Nomeia a paleta 1

	// Paleta secundária (mainColors)
	var pallet2 = shpPallet(layer, mainColors); // Cria a segunda paleta de cores
	var pallet2Transform = pallet2.property('ADBE Vector Transform Group'); // Obtém o grupo de transformação da paleta
	pallet2Transform
		.property('ADBE Vector Position')
		.setValue([comp.width * comp.pixelAspect - 45, comp.height / 2]); // Posiciona a paleta 2
	pallet2.name = 'pallet 2'; // Nomeia a paleta 2

	// Transformações da camada principal
	var transform = layer.property('ADBE Transform Group');
	transform.property('ADBE Anchor Point').expression = '// locked...\n[0,0];'; // Trava o ponto de ancoragem
	transform.property('ADBE Position').expression = '// locked...\n[0,0];'; // Trava a posição
	transform.property('ADBE Scale').expression = '// locked...\n[100,100];'; // Trava a escala
	transform.property('ADBE Rotate Z').expression = '// locked...\n0;'; // Trava a rotação
	transform.property('ADBE Opacity').expression = '// locked...\n100;'; // Trava a opacidade

	// Atributos da camada
	layer.name = 'shp_cores'; // Nome da camada
	layer.guideLayer = true; // Define como camada guia (não renderiza)
	layer.selected = false; // Desmarca a camada
	layer.locked = true; // Trava a camada

	return layer; // Retorna a camada criada
}

// Cria uma camada de forma (shape layer) em forma de seta, com corpo e cabeça personalizáveis.
function shpArrow(body, head) {
	var rootVGrp = 'ADBE Root Vectors Group';
	var vGrp = 'ADBE Vector Group';
	var vsGrp = 'ADBE Vectors Group';
	var exp = '';

	var shpLayer = app.project.activeItem.layers.addShape();
	var contents = shpLayer.property(rootVGrp);

	// body
	var bodyGrp = contents.addProperty(vGrp);
	var bodyShp = bodyGrp
		.property(vsGrp)
		.addProperty('ADBE Vector Shape - Group');
	bodyShp.property('ADBE Vector Shape').setValue(body);
	bodyShp.name = 'body path';
	var bodyStk = bodyGrp
		.property(vsGrp)
		.addProperty('ADBE Vector Graphic - Stroke');

	exp = 'effect("arrow rig")("body stroke size").value;'; // Largura do traçado do corpo da seta, vindo de um efeito chamado "arrow rig"
	bodyStk.property('ADBE Vector Stroke Width').expression = exp;
	bodyStk.property('ADBE Vector Stroke Line Cap').setValue(2);

	exp = 'effect("arrow rig")("color").value;'; // Cor do traçado (stroke) da seta, vindo de um efeito chamado "arrow rig"
	bodyStk.property('ADBE Vector Stroke Color').expression = exp;

	exp = 'value * effect("arrow rig")("show body").value;'; // Opacidade do corpo da seta, multiplicada por um valor de um efeito chamado "arrow rig"
	bodyGrp.property('ADBE Vector Transform Group').opacity.expression = exp;
	bodyGrp.name = 'body';

	// round corners
	var roundCorners = contents.addProperty('ADBE Vector Filter - RC');
	exp = 'effect("arrow rig")("round corners").value;'; // Valor para o raio dos cantos arredondados, vindo de um efeito chamado "arrow rig"
	roundCorners.property('ADBE Vector RoundCorner Radius').expression = exp;

	// trim paths
	var trimPath = contents.addProperty('ADBE Vector Filter - Trim');
	exp = 'effect("arrow rig")("path").value;'; // Valor do Trim Paths, vindo de um efeito chamado "arrow rig"
	trimPath.property('ADBE Vector Trim End').expression = exp;

	// head
	var headGrp = contents.addProperty(vGrp);
	var headShp = headGrp
		.property(vsGrp)
		.addProperty('ADBE Vector Shape - Group');
	headShp.property('ADBE Vector Shape').setValue(head);
	headShp.name = 'head path';
	var headStk = headGrp
		.property(vsGrp)
		.addProperty('ADBE Vector Graphic - Stroke');
	exp = 'var w = effect("arrow rig")("head stroke size").value;\n'; // Variável que define a largura do traçado (stroke) da cabeça da seta
	exp += 'var s = effect("arrow rig")("head scale").value / 100;\n\n'; // Variável que define a escala da cabeça da seta
	exp += 'w / s;'; // Cálculo da largura do traçado dividida pela escala
	headStk.property('ADBE Vector Stroke Width').expression = exp;

	headStk.property('ADBE Vector Stroke Line Cap').setValue(2);

	exp = 'effect("arrow rig")("color").value;'; // Cor do traçado (stroke) da cabeça da seta, vindo do mesmo efeito do corpo, chamado "arrow rig"
	headStk.property('ADBE Vector Stroke Color').expression = exp;

	exp = 'var progress = content("Trim Paths 1").end / 100;\n'; // Variável que define o progresso do Trim Paths
	exp += 'var pathShp = content("body").content("body path").path;\n\n'; // Variável que recebe o caminho do corpo da seta
	exp += 'pathShp.pointOnPath(progress);'; // Calcula o ponto no caminho do corpo da seta com base no progresso do Trim Paths
	headGrp.property('ADBE Vector Transform Group').position.expression = exp; // Posição da cabeça da seta baseada no ponto calculado anteriormente

	exp = 'var s = effect("arrow rig")("head scale").value;\n\n'; // Variável que define a escala da cabeça da seta
	exp += '[s, s];'; // Array com a escala em x e y
	headGrp.property('ADBE Vector Transform Group').scale.expression = exp;

	exp = 'var orientChk = effect("arrow rig")("auto orient").value;\n'; // Variável que checa se a orientação automática da cabeça da seta está ativa
	exp += 'var pathShp = content("body").content("body path").path;\n'; // Variável que recebe o caminho do corpo da seta
	exp += 'var progress = content("Trim Paths 1").end / 100;\n'; // Variável que define o progresso do Trim Paths
	exp += 'var pathTan = pathShp.tangentOnPath(progress);\n\n'; // Variável que recebe a tangente no caminho do corpo da seta
	exp +=
		'value + (radiansToDegrees(Math.atan2(pathTan[1],pathTan[0])) * orientChk);'; // Cálculo da rotação da cabeça da seta (em graus)
	headGrp.property('ADBE Vector Transform Group').rotation.expression = exp;

	exp = 'value * effect("arrow rig")("show head").value;'; // Opacidade da cabeça da seta, multiplicada por um valor de um efeito chamado "arrow rig"
	headGrp.property('ADBE Vector Transform Group').opacity.expression = exp;
	headGrp.name = 'head';

	return shpLayer; // Retorna a camada criada
}

// Cria uma camada de forma (shape layer) com a logo do Globo e animação de escala.
function LOGO_GLOBO() {
	var shp; // Variável para armazenar objetos de forma temporariamente

	// Criação da camada de forma
	var layer = app.project.activeItem.layers.addShape();

	// Criação dos grupos de vetores para a logo
	var contents = layer.property('ADBE Root Vectors Group');
	var logo_contents1 = contents.addProperty('ADBE Vector Group');
	logo_contents1.name = 'logo';
	var contents_logo2 = logo_contents1.addProperty('ADBE Vectors Group');

	// Criação da forma "bolinha"
	var bolinha_contents3 = contents_logo2.addProperty(
		'ADBE Vector Shape - Group',
	);
	bolinha_contents3.name = 'bolinha';
	shp = new Shape();
	shp.closed = true;
	shp.inTangents = [
		[55, 0],
		[0, 55],
		[-55, 0],
		[0, -55],
	];
	shp.outTangents = [
		[-55, 0],
		[0, -55],
		[55, 0],
		[0, 50],
	];
	shp.vertices = [
		[0, 100],
		[-100, 0],
		[0, -100],
		[100, 0],
	];
	bolinha_contents3.property('ADBE Vector Shape').setValue(shp);

	// Criação da forma "janela"
	var janela_contents3 = contents_logo2.addProperty(
		'ADBE Vector Shape - Group',
	);
	janela_contents3.name = 'janela';
	shp = new Shape();
	shp.closed = true;
	shp.inTangents = [
		[0, 0],
		[10, 0],
		[100, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 10],
		[0, 55],
		[0, 0],
		[0, 0],
		[0, 0],
		[-10, 0],
		[-100, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, -10],
		[0, -55],
		[0, 0],
		[0, 0],
		[0, 0],
	];
	shp.outTangents = [
		[0, 10],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[-100, 0],
		[-10, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, -55],
		[0, -10],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[100, 0],
		[10, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 0],
		[0, 55],
	];
	shp.vertices = [
		[198.66, 102.38],
		[180.8, 120.2],
		[1.57, 126.83],
		[0.63, 126.83],
		[0, 126.83],
		[-0.63, 126.83],
		[-1.58, 126.83],
		[-180.86, 120.2],
		[-198.66, 102.37],
		[-204.84, 2.79],
		[-204.84, 0],
		[-204.84, -2.79],
		[-198.66, -102.38],
		[-180.8, -120.21],
		[-1.58, -126.83],
		[-1.58, -126.83],
		[-0.63, -126.83],
		[0, -126.83],
		[0.63, -126.83],
		[1.57, -126.83],
		[1.57, -126.83],
		[180.86, -120.2],
		[198.66, -102.37],
		[204.84, -2.79],
		[204.84, -2.79],
		[204.83, -0.01],
		[204.84, 2.79],
	];
	janela_contents3.property('ADBE Vector Shape').setValue(shp);

	// Criação da forma "corpo"
	var corpo_contents3 = contents_logo2.addProperty(
		'ADBE Vector Shape - Group',
	);
	corpo_contents3.name = 'corpo';
	corpo_contents3.property('ADBE Vector Shape Direction').setValue(3);
	shp = new Shape();
	shp.closed = true;
	shp.inTangents = [
		[-140, 0],
		[0, -140],
		[140, 0],
		[0, 140],
	];
	shp.outTangents = [
		[140, 0],
		[0, 140],
		[-140, 0],
		[0, -140],
	];
	shp.vertices = [
		[0, -254],
		[254, 0],
		[0, 254],
		[-254, 0],
	];
	corpo_contents3.property('ADBE Vector Shape').setValue(shp);

	// Grupo de transformação da logo
	var transform_logo2 = logo_contents1.addProperty(
		'ADBE Vector Transform Group',
	);

	// Animação de escala da logo (keyframes e easing)
	transform_logo2
		.property('ADBE Vector Scale')
		.setValueAtTime(0.04170837504171, [740, 740]);
	transform_logo2
		.property('ADBE Vector Scale')
		.setValueAtTime(0.58391725058392, [115, 115]);
	transform_logo2
		.property('ADBE Vector Scale')
		.setValueAtTime(5.4637971304638, [80, 80]);
	// ... (código de easing para os keyframes)

	// Preenchimento da logo
	var color_contents1 = contents.addProperty('ADBE Vector Graphic - Fill');
	color_contents1.name = 'color';
	color_contents1.property('ADBE Vector Fill Color').setValue([1, 1, 1, 1]);

	// Atributos da camada
	layer.name = 'LOGO GLOBO';

	return layer; // Retorna a camada criada
}

/*

---------------------------------------------------------------
> text layers
---------------------------------------------------------------

*/
// Retorna o conteúdo de texto de uma camada de texto (TextLayer).
function getTextLayerContent(aLayer) {
	// Retorna vazio se a camada for nula ou não for do tipo TextLayer
	if (aLayer == null || !(aLayer instanceof TextLayer)) return '';

	return aLayer
		.property('ADBE Text Properties') // Obtém a propriedade de texto
		.property('ADBE Text Document') // Obtém o documento de texto
		.value.toString() // Converte o valor para string
		.trim(); // Remove espaços em branco no início e no fim
}

// Limpa quebras de linha múltiplas e espaços consecutivos em uma camada de texto.
function cleanText(aLayer) {
	// Sai se a camada não for do tipo TextLayer
	if (!(aLayer instanceof TextLayer)) return;

	var srcTxt = aLayer
		.property('ADBE Text Properties')
		.property('ADBE Text Document'); // Documento de texto
	var lineArray = getTextLayerContent(aLayer).split(/[\n|\r]+/); // Divide o texto em linhas

	// Itera sobre as linhas e remove espaços extras
	for (var t = 0; t < lineArray.length; t++) {
		lineArray[t] = lineArray[t].replace(/\s{2,}/g, ' ').trim();
	}

	srcTxt.setValue(lineArray.join('\n')); // Define o novo valor do texto na camada
}

// Divide uma camada de texto em múltiplas colunas.
function columnText(sLayer) {
	var srcTxt = getTextLayerContent(sLayer); // Obtém o conteúdo de texto da camada
	var txt = srcTxt
		.replace(/\s*[\r\n]{1,}\s*/g, '*|*') // Substitui quebras de linha e espaços por delimitadores
		.replace(/\s*-{3,}\s*/g, '*|*')
		.replace(/\s{2,}/g, '*|*');

	// Calcula o número de colunas com base na primeira linha
	var columnsNum = srcTxt
		.split(/[\r\n]+/g)[0]
		.replace(/\s*-{3,}\s*/g, '*|*')
		.replace(/\s{2,}/g, '*|*')
		.split('*|*').length;

	var cellArray = txt.split('*|*'); // Divide o texto em células usando o delimitador

	// Sai se não houver células suficientes para criar colunas
	if (cellArray.length < 2) return [];

	var cols = []; // Array para armazenar as colunas de texto
	var colLayers = []; // Array para armazenar as camadas de texto criadas

	// Inicializa o array de colunas com arrays vazios
	for (var c = 0; c < columnsNum; c++) {
		cols.push([]);
	}

	// Distribui as células do texto nas colunas
	for (var i = 0; i < cellArray.length; i++) {
		var cI = columnsNum - ((i + 1) % columnsNum) - 1;
		cols[cI].push(cellArray[i]);
	}

	// Cria camadas de texto para cada coluna
	for (i = 0; i < columnsNum; i++) {
		var colName = cols[i][0]; // Nome da coluna (primeira célula)
		var colTxt = cols[i][0]; // Texto da coluna

		// Concatena as células da coluna em uma única string
		for (c = 1; c < cols[i].length; c++) {
			colTxt = colTxt + '\n' + cols[i][c];
		}

		// Cria uma nova camada de texto com o conteúdo da coluna
		var colLayer = app.project.activeItem.layers.addText(colTxt);
		colLayer.name = colName; // Define o nome da camada
		colLayers.push(colLayer); // Adiciona a camada ao array de camadas
	}

	return colLayers; // Retorna o array de camadas de texto criadas
}

/*

---------------------------------------------------------------
> general...
---------------------------------------------------------------

*/
// Cria uma camada null do tipo especificado (0: shape layer, 1: null layer).
function createNull(nullType) {
	var aItem = app.project.activeItem; // Obtém a composição ativa

	// Cria a camada null com base no tipo
	var nullLayer = nullType == 0 ? shpNull() : aItem.layers.addNull(); // Cria uma camada de forma (shpNull) ou uma camada null padrão

	// Configura as propriedades da camada null
	nullLayer.guideLayer = true; // Define como camada guia (não renderiza)
	nullLayer.name = nullPrefix; // Define o nome da camada (nullPrefix deve ser definido em outro lugar do script)
	nullLayer.label = 1; // Define a cor da label (1 = vermelho)

	return nullLayer; // Retorna a camada null criada
}
