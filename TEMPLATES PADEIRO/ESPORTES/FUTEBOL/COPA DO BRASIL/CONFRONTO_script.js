// esse script só pode ser executado pelo padeiro... 

var outputPathArray = templateData.outputPath;

for (var t = 0; t < newOutputsArray.length; t++) {

	var o = t % outputPathArray.length;

	var newPath = outputPathArray[o] + '/[compName].[fileextension]';

	var newOutputFile = new File(newPath);
	newOutputsArray[t].file = newOutputFile;
}
