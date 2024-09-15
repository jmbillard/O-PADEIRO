// esse script só pode ser executado pelo padeiro... 

// Retorna o conteúdo de texto de uma camada de texto (TextLayer).
function getTextLayerContent(aLayer) {
	// Retorna vazio se a camada for nula ou não for do tipo TextLayer
	if (aLayer == null || !(aLayer instanceof TextLayer)) return '';

	return aLayer.property('ADBE Text Properties') // Obtém a propriedade de texto
		.property('ADBE Text Document')            // Obtém o documento de texto
		.value.toString()                          // Converte o valor para string
		.trim();                                   // Remove espaços em branco no início e no fim
}

var outputPathArray = templateData.outputPath;
// Redefine o arquivo de saída para cada módulo de saída.
for (var t = 0; t < newOutputsArray.length; t++) {
	var o = t % outputPathArray.length;
	var comp = newCompsArray[t];
	var pathIncrement = getTextLayerContent(comp.layer(6)).replaceSpecialCharacters();
	var newPath = outputPathArray[o] + '/' + pathIncrement;
	var newFolder = new Folder(newPath);

	if (!newFolder.exists) newPath = outputPathArray[o];

	var newOutputFile = new File(newPath +'/[compName].[fileextension]'); // -> PATROCINADORES FUT 2024_11-06 a 16-06
	newOutputsArray[t].file = newOutputFile;
}
