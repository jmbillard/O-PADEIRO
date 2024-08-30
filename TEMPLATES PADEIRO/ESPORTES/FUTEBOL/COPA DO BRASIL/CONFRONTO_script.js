// esse script só pode ser executado pelo padeiro... 

renamePromoComps(createdTemplatesArray);

var outputPathArray = templateData.outputPath;

for (var t = 0; t < createdOutputModuleArray.length; t++) {

	var o = t % outputPathArray.length;

	var newPath = outputPathArray[o] + '/[compName].[fileextension]';

	var newOutputFile = new File(newPath);
	createdOutputModuleArray[t].file = newOutputFile;
}
