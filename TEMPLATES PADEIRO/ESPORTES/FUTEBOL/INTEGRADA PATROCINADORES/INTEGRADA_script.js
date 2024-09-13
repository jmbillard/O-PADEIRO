// esse script só pode ser executado pelo padeiro...
app.project.linearizeWorkingSpace = false;
app.project.compensateForSceneReferredProfiles = false;
app.project.workingSpace = 'sRGB IEC61966-2.1';

var exportComp = newCompsArray[0]; // Obtém a primeira composição criada a partir de um array de templates.
var logoArray = app.project.importFileWithDialog(); // Abre uma caixa de diálogo para o usuário selecionar os arquivos de logo.
var iNum = app.project.numItems; // Número total de itens no projeto.

// Declara uma variável para armazenar a composição de logos.
var logoComp;

// Obtém a data atual em um formato adequado para nomes de arquivo.
var date = inputTextArray[0].replace(/[\/\\\|_]/g, '-'); // -> 11-06 a 16-06
var logoFolder = app.project.items.addFolder('MARCAS ' + date); // Cria uma pasta no projeto para organizar os logos importados.

// Verifica se o usuário selecionou algum arquivo de logo.
if (logoArray != null) {
	// Procura pela composição de logos no projeto.
	for (var i = 1; i <= iNum; i++) {
		var comp = app.project.item(i);

		// Verifica se o item é uma composição e se tem o comentário "EDITAR" e se o nome é "LOGOS".
		if (!(comp instanceof CompItem)) continue;
		if (!comp.comment.match(/^EDITAR/)) continue;
		if (comp.name != 'LOGOS') continue;

		logoComp = comp; // Atribui a composição encontrada à variável logoComp.
	}

	// Verifica se a composição de logos foi encontrada.
	if (logoComp != undefined) {
		// Atualiza as camadas de logo na composição.
		for (var i = 1; i <= 8; i++) {
			var logoLayer = logoComp.layer(i);

			// Desabilita camadas extras se houver menos logos que o esperado.
			if (i > logoArray.length) {
				logoLayer.enabled = false;
			} else {
				var logoImg = logoArray[i - 1]; // novo logo

				logoImg.parentFolder = logoFolder; // Move o novo logo para a pasta criada anteriormente.
				logoLayer.replaceSource(logoImg, false); // Substitui a imagem da camada pelo novo logo.
			}
		}

		var outputPathArray = templateData.outputPath;
		// Define o arquivo de saída para cada módulo de saída.
		for (var t = 0; t < newOutputsArray.length; t++) {
			var o = t % outputPathArray.length;

			var newOutputFile = new File(
				outputPathArray[o] +
					'/PATROCINADORES FUT 2024_' +
					date +
					'.[fileextension]',
			); // -> PATROCINADORES FUT 2024_11-06 a 16-06
			newOutputsArray[t].file = newOutputFile;
		}

		// Ajusta a duração da composição com base na quantidade de logos.
		if (logoArray.length == 7) exportComp.workAreaDuration = 14 + 5 / 30; // 7 logos
		if (logoArray.length == 6) exportComp.workAreaDuration = 12 + 19 / 30; // 6 logos

		logoComp.openInViewer(); // Abre a composição de logos no visualizador.
		logoComp.time = 0; // posiciona a agulha no tempo zero.
	}

	// Tenta salvar o projeto em um caminho de rede específico.
	try {
		var savePath =
			'//10.228.183.165/vfx/imagem/drive_l/Fileserver_3/ESPORTES/FUTEBOL/FUTEBOL 2024/CHAMADA PATROCINADORES 2024';
		var projId = 'PATROCINADORES FUT 2024_' + date;

		projFile = new File(savePath + '/01 PROJETOS/' + projId);
		app.project.save(projFile);

	} catch (err) { }
}
