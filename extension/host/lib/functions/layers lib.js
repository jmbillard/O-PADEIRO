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

// Cria uma paleta de cores (grupo de vetores) na camada fornecida.
// function shpPallet(aLayer, colorArray) {
// 	var s = 50; // Tamanho de cada amostra de cor
// 	var gap = 10; // Espaçamento entre as amostras

// 	// Calcula a posição vertical inicial para centralizar as amostras
// 	var posY = ((colorArray.length - 1) * (s + gap)) / 2;

// 	// Obtém o grupo de vetores raiz da camada
// 	var contents = aLayer.property('ADBE Root Vectors Group');

// 	// Cria um novo grupo de vetores para a paleta
// 	var pallet = contents.addProperty('ADBE Vector Group');

// 	// Itera sobre as cores do array
// 	for (var c = 0; c < colorArray.length; c++) {
// 		var color = hexToRgb(colorArray[c]); // Converte a cor hexadecimal para RGB
// 		var Hex = rgbToHEX(color); // Converte a cor RGB de volta para hexadecimal (para o nome)

// 		// Cria um grupo para a amostra de cor e seus elementos
// 		var colorGroup = pallet
// 			.addProperty('ADBE Vectors Group')
// 			.addProperty('ADBE Vector Group');

// 		// Cria um subgrupo para a amostra de cor
// 		var colorSubGroup = colorGroup.addProperty('ADBE Vectors Group');

// 		// Cria um retângulo para a amostra de cor
// 		var colorSwatch = colorSubGroup.addProperty('ADBE Vector Shape - Rect');
// 		colorSwatch.property('ADBE Vector Rect Size').setValue([s, s]); // Define o tamanho da amostra
// 		colorSwatch
// 			.property('ADBE Vector Rect Position')
// 			.setValue([0, c * (s + gap) - posY]); // Posiciona a amostra

// 		// Cria um preenchimento para a amostra de cor
// 		var colorFill = colorSubGroup.addProperty('ADBE Vector Graphic - Fill');
// 		colorFill.property('ADBE Vector Fill Color').setValue(color); // Define a cor da amostra
// 		colorFill.name = Hex; // Nomeia o preenchimento com o valor hexadecimal da cor

// 		// Nomeia o grupo da amostra de cor com o valor hexadecimal da cor
// 		colorGroup.name = Hex;
// 	}
// 	return pallet; // Retorna o grupo de vetores da paleta
// }

// Cria uma camada de forma (shape layer) com paletas de cores.
// function colorPallet() {
// 	var comp = app.project.activeItem; // Obtém a composição ativa
// 	var layer = comp.layers.addShape(); // Cria uma nova camada de forma

// 	// Paleta principal (monoColors)
// 	var pallet1 = shpPallet(layer, monoColors); // Cria a primeira paleta de cores
// 	var pallet1Transform = pallet1.property('ADBE Vector Transform Group'); // Obtém o grupo de transformação da paleta
// 	pallet1Transform
// 		.property('ADBE Vector Position')
// 		.setValue([45, comp.height / 2]); // Posiciona a paleta 1
// 	pallet1.name = 'pallet 1'; // Nomeia a paleta 1

// 	// Paleta secundária (mainColors)
// 	var pallet2 = shpPallet(layer, mainColors); // Cria a segunda paleta de cores
// 	var pallet2Transform = pallet2.property('ADBE Vector Transform Group'); // Obtém o grupo de transformação da paleta
// 	pallet2Transform
// 		.property('ADBE Vector Position')
// 		.setValue([comp.width * comp.pixelAspect - 45, comp.height / 2]); // Posiciona a paleta 2
// 	pallet2.name = 'pallet 2'; // Nomeia a paleta 2

// 	// Transformações da camada principal
// 	var transform = layer.property('ADBE Transform Group');
// 	transform.property('ADBE Anchor Point').expression = '// locked...\n[0,0];'; // Trava o ponto de ancoragem
// 	transform.property('ADBE Position').expression = '// locked...\n[0,0];'; // Trava a posição
// 	transform.property('ADBE Scale').expression = '// locked...\n[100,100];'; // Trava a escala
// 	transform.property('ADBE Rotate Z').expression = '// locked...\n0;'; // Trava a rotação
// 	transform.property('ADBE Opacity').expression = '// locked...\n100;'; // Trava a opacidade

// 	// Atributos da camada
// 	layer.name = 'shp_cores'; // Nome da camada
// 	layer.guideLayer = true; // Define como camada guia (não renderiza)
// 	layer.selected = false; // Desmarca a camada
// 	layer.locked = true; // Trava a camada

// 	return layer; // Retorna a camada criada
// }

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

/*

---------------------------------------------------------------
> general...
---------------------------------------------------------------

*/
