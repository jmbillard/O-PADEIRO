// esse script só pode ser executado pelo padeiro... 

renamePromoComps(createdTemplatesArray);


var pathIncrement = [
	'/MANHA/TARJAS_DIA_HORA_MANHA/',
	'/TARDE/TARJAS_DIA_HORA_TARDE/',
	'/NOITE/TARJAS_DIA_HORA_NOITE/'
];
var outputPathArray = templateData.outputPath;

for (var t = 0; t < createdOutputModuleArray.length; t++) {

	var o = t % outputPathArray.length;
	var p = Math.floor(t / outputPathArray.length) % pathIncrement.length;

	var newPath = outputPathArray[o] + pathIncrement[p] + '[compName]_[#].[fileextension]';

	var newOutputFile = new File(newPath);
	createdOutputModuleArray[t].file = newOutputFile;
}
