/* eslint-disable no-redeclare */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-empty */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
# general functions
---------------------------------------------------------------

*/
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
	var configContent = JSON.stringify({ PRODUCTIONS: prodDataArray }, null, '\t');
	configFile = new File(scriptMainPath + 'O_PADEIRO_config.json');

	saveTextFile(configContent, scriptMainPath + 'O_PADEIRO_config.json');

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
		prodData = JSON.parse(configContent); // Analisa o conteúdo JSON e o armazena no objeto 'prodData'
		prodData = sortProdData(prodData.PRODUCTIONS); // Ordena as produções por nome
		//
	} catch (err) {
		//Em caso de erro...
		prodData = defaultProductionDataObj.PRODUCTIONS; // Lista inicial de produções
	}

	return prodData;
}

function executeCommandID(command) {
	app.executeCommand(app.findMenuCommandId(command));
}

// gets the current value for the network permission preference...
function netAccess() {
	return app.preferences.getPrefAsLong(AE_prefSection, AE_prefName);
}

// Aplica o efeito de preenchimento (fill) com a cor especificada a várias camadas selecionadas.
function batchFill(fillName, aColor) {
	var aItem = app.project.activeItem; // Obtém a composição ativa
	var selLayers = aItem != null ? aItem.selectedLayers : []; // Obtém as camadas selecionadas

	// Verifica se há camadas selecionadas
	if (selLayers.length == 0) {
		showTabErr('Nenhuma camada selecionada'); // Exibe um alerta de erro (função showTabErr não definida aqui)
		return; // Sai da função se não houver camadas selecionadas
	}

	app.beginUndoGroup('fill'); // Inicia um grupo de desfazer (undo)

	// Itera sobre as camadas selecionadas
	for (var i = 0; i < selLayers.length; i++) {
		// Adiciona o efeito "Fill" à camada
		var palletFill = selLayers[i].property('ADBE Effect Parade').addProperty('ADBE Fill');

		palletFill.name = fillName; // Define o nome do efeito
		palletFill.property('Color').setValue(aColor); // Define a cor do preenchimento
	}

	app.endUndoGroup(); // Finaliza o grupo de desfazer
}

/*

---------------------------------------------------------------
> string functions
---------------------------------------------------------------

*/

// Quebra o texto de uma camada de texto (TextLayer) em linhas com base em um limite de caracteres.
function lineBreak(selLayer, inputLimit) {
	inputLimit = Math.floor(inputLimit); // Garante que o limite seja um número inteiro

	// Verifica se a camada é um TextLayer
	if (!(selLayer instanceof TextLayer)) return;

	// Obtém o documento de texto da camada
	var srcTxt = selLayer.property('ADBE Text Properties').property('ADBE Text Document');

	// Obtém o conteúdo de texto, substituindo múltiplos espaços por um único espaço
	var txt = getTextLayerContent(selLayer).replace(/\s+/g, ' ');
	var txt2 = '';
	var wordsArray = txt.split(/\s/); // Divide o texto em um array de palavras

	// Encontra a palavra mais longa e ajusta o limite, se necessário
	for (var i = 0; i < wordsArray.length; i++) {
		var letterCount = wordsArray[i].length;
		if (letterCount >= inputLimit) {
			inputLimit = letterCount + 1; // Garante que a palavra mais longa caiba em uma linha
		}
	}

	// Quebra o texto em linhas com base no limite
	while (txt.length > inputLimit) {
		// Enquanto o texto restante for maior que o limite
		for (var t = inputLimit; t > 0; t--) {
			// Procura por um espaço em branco para quebrar a linha
			if (txt[t] != ' ') continue; // Se não encontrar um espaço, continua procurando

			txt2 += txt.substring(0, t) + '\n'; // Adiciona a linha até o espaço encontrado em txt2
			txt = txt.substring(t + 1, txt.length).trim(); // Remove a linha adicionada e espaços em branco do início de txt
			break; // Sai do loop interno, pois já encontrou um ponto de quebra de linha
		}
	}

	// Define o novo valor do texto na camada, com as quebras de linha adicionadas
	srcTxt.setValue(txt2 + txt);
}

/*

---------------------------------------------------------------
> 🗃️ project organization and renaming
---------------------------------------------------------------

*/

// Remove pastas vazias do projeto.
function deleteEmptyProjectFolders() {
	// Itera sobre os itens do projeto em ordem reversa
	for (var i = app.project.numItems; i >= 1; i--) {
		var aItem = app.project.item(i);

		// Pula se o item não for uma pasta
		if (!(aItem instanceof FolderItem)) continue;

		// Remove a pasta se ela estiver vazia
		if (aItem.numItems == 0) aItem.remove();
	}
}

// Move todos os itens do projeto para a pasta raiz e remove as pastas vazias.
function deleteProjectFolders() {
	// Itera sobre os itens do projeto em ordem reversa
	for (var i = app.project.numItems; i >= 1; i--) {
		var rFolder = app.project.rootFolder; // Obtém a pasta raiz do projeto
		var aItem = app.project.item(i);

		// Pula se o item não for uma pasta
		if (!(aItem instanceof FolderItem)) continue;

		// Move os itens da pasta para a raiz até que a pasta esteja vazia
		while (aItem.numItems > 0) {
			aItem.item(1).parentFolder = rFolder;
		}
	}

	// Remove as pastas que agora estão vazias
	deleteEmptyProjectFolders();
}

function getFontNames() {
	var fontNameArray = [];
	var compArray = getComps();

	for (var c = 0; c < compArray.length; c++) {
		var comp = compArray[c];

		for (var l = 1; l <= comp.numLayers; l++) {
			var aLayer = comp.layer(l);

			if (!(aLayer instanceof TextLayer)) continue;

			var textDoc = aLayer.property('ADBE Text Properties').property('ADBE Text Document').value;
			var fontName = textDoc.font;

			if (fontNameArray.indexOf(fontName) >= 0) continue;

			fontNameArray.push(fontName);
		}
	}
	return fontNameArray;
}

// Obtém um array com todas as composições (CompItem) do projeto atual.
function getComps() {
	var compArray = []; // Array para armazenar as composições

	// Itera sobre os itens do projeto
	for (var i = 1; i <= app.project.numItems; i++) {
		var comp = app.project.item(i); // Obtém o item atual

		// Verifica se o item é uma composição (CompItem)
		if (comp instanceof CompItem) compArray.push(comp); // Adiciona a composição ao array
	}

	return compArray; // Retorna o array de composições
}

// Obtém um objeto com arrays de diferentes tipos de footage e dados no projeto.
function getFootage() {
	var footage = {
		stillArray: [], // Array para armazenar imagens estáticas
		videoArray: [], // Array para armazenar vídeos
		audioArray: [], // Array para armazenar arquivos de áudio
		solidArray: [], // Array para armazenar sólidos
		missingArray: [], // Array para armazenar footage com arquivo ausente
		missingNames: [], // Array para armazenar os nomes dos footage com arquivo ausente
		dataArray: [] // Array para armazenar arquivos de dados
	};

	// Extensões de arquivos de dados suportados
	var supportedDataExtensions = ['.csv', '.json', '.jsx', '.mgjson', '.tsv', '.txt']; // Adicione outras extensões se necessário

	// Itera sobre os itens do projeto em ordem reversa
	for (var i = app.project.numItems; i >= 1; i--) {
		try {
			var aItem = app.project.item(i);

			// Pula se o item não for um FootageItem
			if (!(aItem instanceof FootageItem)) continue;

			// Adiciona o item ao array de footage com arquivo ausente
			if (aItem.footageMissing) {
				footage.missingNames.push(aItem.name);
				footage.missingArray.push(aItem);
				continue;
			}

			// Adiciona o item ao array de sólidos
			if (aItem.mainSource instanceof SolidSource) {
				footage.solidArray.push(aItem);
				continue;
			}

			// Pula se a fonte principal não for um arquivo
			if (!(aItem.mainSource instanceof FileSource)) continue;

			// Obtém a extensão do arquivo em minúsculas
			var fileExtension = getFileExt(aItem.name).toLowerCase();

			// Verifica se a extensão é suportada como arquivo de dados
			if (supportedDataExtensions.indexOf(fileExtension) >= 0) {
				footage.dataArray.push(aItem);
				continue;
			}

			// Adiciona o item ao array de imagens estáticas
			if (aItem.mainSource.isStill) {
				footage.stillArray.push(aItem);
				continue;
			}

			// Adiciona o item ao array de vídeos
			if (aItem.hasVideo) {
				footage.videoArray.push(aItem);
				continue;
			}

			// Adiciona o item ao array de áudio
			footage.audioArray.push(aItem);
			//
		} catch (err) {}
	}

	return footage; // Retorna o objeto com os arrays de footage e dados
}

// Cria a estrutura de pastas do projeto com base no modo especificado (projectMode).
function projectTemplateFolders() {
	// Declaração das variáveis para as pastas do projeto
	var rndFolder; // Pasta de renderização
	var ftgFolder; // Pasta de footage
	var imgFolder; // Pasta de imagens
	var snoFolder; // Pasta de sons
	var solFolder; // Pasta de sólidos
	var compsFolder; // Pasta de pré-composições
	var astFolder; // Pasta de assets
	var edtFolder; // Pasta de assets editáveis
	var dataFolder; // Pasta de arquivos de dados

	// Cria a estrutura de pastas de acordo com o modo de projeto
	rndFolder = app.project.items.addFolder('01 COMPS');
	edtFolder = rndFolder;
	compsFolder = app.project.items.addFolder('02 PRECOMPS');
	astFolder = app.project.items.addFolder('03 ARQUIVOS');
	ftgFolder = app.project.items.addFolder('VIDEOS');
	ftgFolder.parentFolder = astFolder;
	imgFolder = app.project.items.addFolder('IMAGENS');
	imgFolder.parentFolder = astFolder;
	snoFolder = app.project.items.addFolder('AUDIO');
	snoFolder.parentFolder = astFolder;
	solFolder = app.project.items.addFolder('SOLIDOS');
	solFolder.parentFolder = astFolder;
	dataFolder = app.project.items.addFolder('DADOS');
	dataFolder.parentFolder = astFolder;

	// Retorna um array com as referências das pastas criadas
	return [rndFolder, ftgFolder, imgFolder, snoFolder, solFolder, compsFolder, edtFolder, dataFolder];
}

// Organiza os itens de footage em subpastas dentro da pasta 'folder' com base nos comentários dos itens.
function populateFootageItemFolders(itemArray, folder) {
	var subFoldersObj = {}; // Objeto para armazenar as subpastas criadas (chave: nome da subpasta, valor: objeto FolderItem)

	// Itera sobre os itens de footage no array
	for (var s = 0; s < itemArray.length; s++) {
		var aItem = itemArray[s]; // Obtém o item atual
		var itemComment = aItem.comment; // Obtém o comentário do item

		// Se o item não tiver comentário, move para a pasta principal e pula para o próximo item
		if (itemComment == '') {
			aItem.parentFolder = folder;
			continue;
		}

		// Extrai o nome da subpasta do comentário do item e remove caracteres especiais
		var set = itemComment.split(':')[0];
		var subFolderName = set.replaceSpecialCharacters(); // (Função replaceSpecialCharacters não definida aqui, precisa ser implementada)

		// Cria um nome de chave para o objeto de subpastas, removendo espaços
		var subFolderObjName = subFolderName.replace(/\s/g, '_');

		// Se a subpasta já existir, move o item para ela e pula para o próximo item
		if (subFoldersObj.hasOwnProperty(subFolderObjName)) {
			aItem.parentFolder = subFoldersObj[subFolderObjName];
			continue;
		}

		// Cria a subpasta se ela ainda não existir
		var subFolder = app.project.items.addFolder(subFolderName);

		// Define o parent da subpasta para a pasta principal
		subFolder.parentFolder = folder;

		// Move o item para a subpasta
		aItem.parentFolder = subFolder;

		// Armazena a referência da subpasta no objeto para uso futuro
		subFoldersObj[subFolderObjName] = subFolder;
	}
}
// Organiza as composições em pastas com base em seus comentários.
function populateCompItemFolders(comps, folders) {
	var rndFolder = folders[0]; // Pasta de renderização (render comps)
	var compsFolder = folders[5]; // Pasta de composições (precomps)
	var subFoldersObj = {}; // Objeto para armazenar as subpastas criadas
	var commentArray = [];

	for (var p = 0; p < renameRefArray.length; p++) {
		commentArray.push(renameRefArray[p].comment);
	}

	var commentRegExp = new RegExp('(' + commentArray.join('|') + ')', 'i');

	// Itera sobre as composições
	for (var c = 0; c < comps.length; c++) {
		var comp = comps[c]; // Composição atual
		var compComment = comp.comment.toUpperCase(); // Comentário da composição (em maiúsculas para comparação)

		// Verifica se o comentário da composição indica exportação direta para a pasta de renderização
		if (compComment.match(/EXPORT|LOGO GLOBO|TEMPLATE/)) {
			comp.parentFolder = rndFolder; // Move a composição para a pasta de renderização
			continue; // Pula para a próxima composição
		}

		// Verifica se o comentário da composição indica uma categoria específica
		if (compComment.match(commentRegExp)) {
			comp.parentFolder = rndFolder; // Move a composição para a pasta de renderização
			var subFolderName = compComment; // Nome da subpasta baseado no comentário da composição

			// Cria um nome de chave para o objeto de subpastas, removendo espaços
			var subFolderObjName = subFolderName.replace(/\s/g, '_');

			// Se a subpasta já existir, move a composição para ela e pula para a próxima composição
			if (subFoldersObj.hasOwnProperty(subFolderObjName)) {
				comp.parentFolder = subFoldersObj[subFolderObjName];
				continue;
			}

			// Cria a subpasta se ela não existir
			var subFolder = app.project.items.addFolder(subFolderName);

			subFolder.parentFolder = rndFolder; // Define a pasta de renderização como parent da subpasta
			comp.parentFolder = subFolder; // Move a composição para a subpasta

			// Armazena a referência da subpasta no objeto para uso futuro
			subFoldersObj[subFolderObjName] = subFolder;

			continue; // Pula para a próxima composição
		}

		// Se não for um caso de exportação ou categoria específica, move para a pasta "comps"
		comp.parentFolder = compsFolder;

		// Se o comentário estiver vazio, pula para a próxima composição
		if (compComment.trim() == '') continue;

		// Cria subpastas dentro da pasta "comps" com base nos comentários das composições
		var subFolderName = compComment; // Nome da subpasta baseado no comentário da composição
		var subFolderObjName = subFolderName.replace(/\s/g, '_');

		// Se a subpasta já existir, move a composição para ela e pula para a próxima composição
		if (subFoldersObj.hasOwnProperty(subFolderObjName)) {
			comp.parentFolder = subFoldersObj[subFolderObjName];
			continue;
		}

		// Cria a subpasta se ela não existir
		var subFolder = app.project.items.addFolder(subFolderName);

		subFolder.parentFolder = compsFolder; // Define a pasta "comps" como parent da subpasta
		comp.parentFolder = subFolder; // Move a composição para a subpasta

		// Armazena a referência da subpasta no objeto para uso futuro
		subFoldersObj[subFolderObjName] = subFolder;
	}
}

// Organiza os itens do projeto (composições, footage) nas pastas corretas.
function populateProjectFolders() {
	// Obtém os arrays de composições, footage e a estrutura de pastas do projeto.
	var comps = getComps();
	var footage = getFootage();
	var folders = projectTemplateFolders();
	// Referências para as pastas específicas
	var ftgFolder = folders[1]; // Pasta de vídeos
	var imgFolder = folders[2]; // Pasta de imagens
	var snoFolder = folders[3]; // Pasta de sons
	var solFolder = folders[4]; // Pasta de sólidos
	var dataFolder = folders[7]; // Pasta de dados

	// Organiza as composições em pastas
	populateCompItemFolders(comps, folders);

	// Organiza os diferentes tipos de footage em suas respectivas pastas
	populateFootageItemFolders(footage.videoArray, ftgFolder);
	populateFootageItemFolders(footage.stillArray, imgFolder);
	populateFootageItemFolders(footage.audioArray, snoFolder);
	populateFootageItemFolders(footage.solidArray, solFolder);
	populateFootageItemFolders(footage.dataArray, dataFolder);
	// Verifica se há footage com arquivos ausentes
	var missFolder = app.project.items.addFolder('missing'); // Cria uma pasta para os arquivos ausentes
	populateFootageItemFolders(footage.missingArray, missFolder); // Move os arquivos ausentes para a pasta "missing"
}

function overwriteCompName(comp) {
	if (comp.numLayers == 0) return false;

	var overwriteLayer = comp.layer(comp.numLayers);

	if (!(overwriteLayer instanceof TextLayer)) return false;
	if (overwriteLayer.name != 'script_template_name') return false;

	comp.name = getTextLayerContent(overwriteLayer).toUpperCase().replaceSpecialCharacters();

	return true;
}

// Renomeia composições promocionais (assinaturas, exports, etc.) de acordo com padrões específicos.
function renamePromoComps(compArray) {
	for (var a = 0; a < compArray.length; a++) {
		var aItem = compArray[a];

		// Renomeia pastas para maiúsculas e adiciona itens à lista
		if (aItem instanceof FolderItem) {
			aItem.name = aItem.name.toUpperCase();

			for (var f = 1; f <= aItem.numItems; f++) {
				if (aItem.item(f) instanceof CompItem) {
					compArray.push(aItem.item(f));
				} else if (aItem.item(f) instanceof FolderItem) {
					renamePromoComps([aItem.item(f)]); // Recursividade para subpastas
				}
			}
			continue; // Próximo item (era uma pasta)
		}

		// Pula se não for uma composição
		if (!(aItem instanceof CompItem)) continue;

		var comp = aItem;
		var compComment = comp.comment.toUpperCase();

		// ----------------------- Templates Específicos ------------------------------

		if (overwriteCompName(comp)) continue;

		// ----------------------- Padrões Gerais de Renomeação -----------------------

		var compName = comp.name.toUpperCase().replaceSpecialCharacters(); // Nome da composição
		comp.name = compName;

		// Obtém nomes das pastas ancestrais
		var compFolder = comp.parentFolder;
		var compFolderPathArray = [];
		while (compFolder != app.project.rootFolder) {
			compFolderPathArray.push(compFolder.name.toUpperCase().replaceSpecialCharacters());
			compFolder = compFolder.parentFolder;
		}

		// Procura por padrões de renomeação
		var chk = false;
		for (var m = 0; m < compFolderPathArray.length; m++) {
			var compFolderName = compFolderPathArray[m];

			for (var t = 0; t < renameRefArray.length; t++) {
				var refObj = renameRefArray[t];
				var compPrefix = refObj.prefix;
				var compComment = refObj.comment;
				var strArray = refObj.regExpStr;

				for (var u = 0; u < strArray.length; u++) {
					var val = strArray[u];

					// Expressões regulares para encontrar padrões
					var pattern1 = new RegExp(val, 'i'); // Procura em qualquer lugar
					var pattern2 = new RegExp('^(' + val + '[\\s_\\-]+)|([\\s_\\-]+' + val + ')$', 'i'); // Procura no início ou final
					var pattern3 = new RegExp('[\\s_\\-]+' + val + '[\\s_\\-]+', 'gi'); // Procura no meio

					// Se encontrar o padrão, aplica a lógica de renomeação
					if (compFolderName.match(pattern1) || compName.match(pattern1)) {
						comp.comment = compComment; // Define comentário
						compName = compName.replace(pattern3, ' ').replace(pattern2, ' ').replace(pattern3, ' ');

						if (
							(compName != compPrefix && compName != '') ||
							compFolderName == val ||
							compFolderName.match(pattern2)
						) {
							comp.name = (compPrefix + globalSeparator + compName).replace(/\s+/g, ' ');
						}
						chk = true; // Encontrou um padrão
					}
				}
				if (chk) break; // Sai do loop de termos se encontrar um padrão
			}
			if (chk) break; // Sai do loop de pastas se encontrar um padrão
		}

		// ----------------------- Renomeação para "LOGO GLOBO" -----------------------

		if (compName.match(/LOGO[\s_]*GLOBO/) || comp.comment.match(/LOGO[\s_]GLOBO/)) {
			comp.name = 'LOGO GLOBO';
		}
	}
}

function renameOutputs() {
	var numItems = app.project.renderQueue.numItems;

	if (numItems == 0) return;

	for (var i = 1; i <= numItems; i++) {
		var outputItem = app.project.renderQueue.item(i); // Item na fila de render
		var limit = outputItem.outputModules.length; // Quantidade de módulos de saída

		var comp = outputItem.comp; // Comp do item atual na fila de render
		var fileName = comp.name.toUpperCase().replaceSpecialCharacters(); // Nome da comp

		// Obtém nomes das pastas na hierarquia do projeto
		var compFolder = comp.parentFolder;
		var compFolderPathArray = [];
		while (compFolder != app.project.rootFolder) {
			compFolderPathArray.push(compFolder.name.toUpperCase());
			compFolder = compFolder.parentFolder;
		}

		// Procura por padrões de renomeação
		var chk = false;
		for (var m = 0; m < compFolderPathArray.length; m++) {
			var compFolderName = compFolderPathArray[m];

			for (var t = 0; t < renameRefArray.length; t++) {
				var refObj = renameRefArray[t];
				var compPrefix = refObj.prefix;
				var strArray = refObj.regExpStr;

				for (var u = 0; u < strArray.length; u++) {
					var val = strArray[u];

					var pattern1 = new RegExp(val, 'i'); // Procura em qualquer lugar
					var pattern2 = new RegExp('^(' + val + '[\\s_\\-]+)|([\\s_\\-]+' + val + ')$', 'i'); // Procura no início ou final
					var pattern3 = new RegExp('[\\s_\\-]+' + val + '[\\s_\\-]+', 'gi'); // Procura no meio

					// Se encontrar o padrão, aplica a lógica de renomeação
					if (compFolderName.match(pattern1) || fileName.match(pattern1)) {
						fileName = fileName.replace(pattern3, ' ').replace(pattern2, ' ').replace(pattern3, ' ');

						if (fileName != compPrefix && fileName != '') {
							fileName = (compPrefix + globalSeparator + fileName).replace(/\s+/g, ' ');
						}
						chk = true; // Encontrou um padrão
					}
				}
				if (chk) break; // Sai do loop de termos se encontrar um padrão
			}
			if (chk) break; // Sai do loop de pastas se encontrar um padrão
		}

		// Itera por todos os módulos de saída
		for (var j = 1; j <= limit; j++) {
			var outputModule = outputItem.outputModule(j); // Módulo de saída do item na fila de render
			var outputFile = outputModule.file; // Arquivo do módulo de saída
			var outputPath = decodeURI(outputFile.parent.path); // Caminho do arquivo
			var fileExt = getFileExt(outputFile.displayName); // Extensão do arquivo
			var renderTokens = '.[fileextension]';

			if (fileExt.match(/png|jpg|jpeg|tif|psd|tga|exr|iff|hdr|sgi|dpx/i))
				renderTokens = '_[#####].[fileextension]';

			var newOutputFile = new File(outputPath + '/' + fileName + renderTokens); // Novo arquivo renomeado

			outputModule.file = newOutputFile; // Define o novo arquivo como o módulo de saída
		}
	}
}

/*

---------------------------------------------------------------
> ⚙️ script preferences
---------------------------------------------------------------

*/

// Salva o arquivo de preferências no formato JSON.
function saveScriptPreferences() {
	var scriptFolder = new Folder(scriptPreferencesPath); // Obtém a pasta onde as preferências serão salvas

	// Cria a pasta se ela não existir
	if (!scriptFolder.exists) {
		scriptFolder.create();
	}

	// Remove propriedades extras do objeto de preferências (limpeza)
	for (var o in scriptPreferencesObj) {
		if (!defaultScriptPreferencesObj.hasOwnProperty(o)) {
			delete scriptPreferencesObj[o];
		}
	}

	// Formata o objeto de preferências em JSON
	var fileContent = JSON.stringify(scriptPreferencesObj, null, '\t');

	// Caminho completo do arquivo de preferências
	var filePath = scriptPreferencesPath + '/preferences.json';

	// Salva o arquivo de preferências (a função 'saveTextFile' deve ser definida em outro lugar)
	return saveTextFile(fileContent, filePath);
}

// Cria um objeto com as propriedades de um efeito, onde as chaves são os nomes das propriedades e os valores são os valores das propriedades.
function fxObj(fx) {
	var obj = {}; // Cria um objeto vazio para armazenar as propriedades do efeito

	// Itera sobre todas as propriedades do efeito
	for (var p = 1; p <= fx.numProperties; p++) {
		try {
			var prop = fx.property(p); // Obtém a propriedade atual
			var keyName = prop.name // Obtém o nome da propriedade
				.replaceSpecialCharacters() // Remove caracteres especiais do nome
				.replace(/\s/g, '_'); // Substitui espaços por underscores

			var val = prop.value; // Obtém o valor da propriedade

			// Ignora propriedades com valor undefined
			if (val == undefined) continue;

			// Converte arrays RGB para valores hexadecimais
			if (Array.isArray(val) && val.length > 3) {
				val = rgbToHEX(val);
			}

			// Adiciona a propriedade ao objeto
			obj[keyName] = val;
			//
		} catch (err) {} // Ignora erros em propriedades que não podem ser acessadas
	}

	return obj; // Retorna o objeto com as propriedades do efeito
}

// Constrói um objeto com informações dos efeitos da camada "ctrl_comp" da composição ativa.
function buildFxObj() {
	var aItem = app.project.activeItem; // Obtém a composição ativa
	var obj = {}; // Cria um objeto vazio para armazenar as informações dos efeitos

	try {
		var cFx = aItem.layer('ctrl_comp').property('ADBE Effect Parade'); // Obtém a propriedade "Effect Parade" da camada "ctrl_comp"

		// Itera sobre os efeitos da camada "ctrl_comp"
		for (var f = 1; f <= cFx.numProperties; f++) {
			var fx = cFx.property(f); // Obtém o efeito atual
			var keyName = fx.name // Obtém o nome do efeito
				.replaceSpecialCharacters() // Remove caracteres especiais do nome
				.replace(/\s+/g, '_'); // Substitui múltiplos espaços por underscore

			obj[keyName] = fxObj(fx); // Adiciona um objeto com as propriedades do efeito ao objeto principal, usando a função 'fxObj'
		}
		//
	} catch (err) {} // Ignora erros caso a camada "ctrl_comp" não exista ou não tenha efeitos

	return obj; // Retorna o objeto com as informações dos efeitos
}

// Preenche uma lista suspensa (dropdown) com itens de um array.
function populateDropdownList(array, dropdown) {
	// Verifica se o array e o dropdown são válidos
	if (!Array.isArray(array) || !dropdown) return;

	// Itera sobre os itens do array e adiciona cada um ao dropdown
	for (var i = 0; i < array.length; i++) {
		dropdown.add('item', array[i]);
	}
}

/*

---------------------------------------------------------------
> ⚙️ AE preferences
---------------------------------------------------------------

*/

var table1252 = {
	'€': 128,
	'‚': 130,
	ƒ: 131,
	'„': 132,
	'…': 133,
	'†': 134,
	'‡': 135,
	ˆ: 136,
	'‰': 137,
	Š: 138,
	'‹': 139,
	Œ: 140,
	Ž: 142,
	'‘': 145,
	'’': 146,
	'“': 147,
	'”': 148,
	'•': 149,
	'–': 150,
	'—': 151,
	'˜': 152,
	'™': 153,
	š: 154,
	'›': 155,
	œ: 156,
	ž: 158,
	Ÿ: 159,
	'¡': 161,
	'¢': 162,
	'£': 163,
	'¤': 164,
	'¥': 165,
	'¦': 166,
	'§': 167,
	'¨': 168,
	'©': 169,
	ª: 170,
	'«': 171,
	'¬': 172,
	'�': 173,
	'®': 174,
	'¯': 175,
	'°': 176,
	'±': 177,
	'²': 178,
	'³': 179,
	'´': 180,
	µ: 181,
	'¶': 182,
	'·': 183,
	'¸': 184,
	'¹': 185,
	º: 186,
	'»': 187,
	'¼': 188,
	'½': 189,
	'¾': 190,
	'¿': 191,
	À: 192,
	Á: 193,
	Â: 194,
	Ã: 195,
	Ä: 196,
	Å: 197,
	Æ: 198,
	Ç: 199,
	È: 200,
	É: 201,
	Ê: 202,
	Ë: 203,
	Ì: 204,
	Í: 205,
	Î: 206,
	Ï: 207,
	Ð: 208,
	Ñ: 209,
	Ò: 210,
	Ó: 211,
	Ô: 212,
	Õ: 213,
	Ö: 214,
	'×': 215,
	Ø: 216,
	Ù: 217,
	Ú: 218,
	Û: 219,
	Ü: 220,
	Ý: 221,
	Þ: 222,
	ß: 223,
	à: 224,
	á: 225,
	â: 226,
	ã: 227,
	ä: 228,
	å: 229,
	æ: 230,
	ç: 231,
	è: 232,
	é: 233,
	ê: 234,
	ë: 235,
	ì: 236,
	í: 237,
	î: 238,
	ï: 239,
	ð: 240,
	ñ: 241,
	ò: 242,
	ó: 243,
	ô: 244,
	õ: 245,
	ö: 246,
	'÷': 247,
	ø: 248,
	ù: 249,
	ú: 250,
	û: 251,
	ü: 252,
	ý: 253,
	þ: 254,
	ÿ: 255
};

// Obtém as cores de rótulo (label colors) das preferências do After Effects.
function getLabelColors() {
	try {
		var labelColors = []; // Array para armazenar as cores dos rótulos
		var sectionName = 'Label Preference Color Section 5'; // Nome da seção de preferências
		var prefFile = PREFType.PREF_Type_MACHINE_INDEPENDENT; // Tipo de arquivo de preferências

		// Itera sobre as 16 cores de rótulo
		for (var c = 1; c <= 16; c++) {
			var keyName = 'Label Color ID 2 # ' + c; // Nome da chave de preferência para a cor atual

			// Obtém a cor como uma string da tabela de códigos 1252 (Windows Latin-1)
			var colorStr = app.preferences.getPrefAsString(sectionName, keyName, prefFile);
			var hex = '#';

			// Converte a string de cor em um valor hexadecimal
			for (var j = 1; j < colorStr.length; j++) {
				var charCode = colorStr.charCodeAt(j); // Obtém o código de caractere

				// Ajusta o código do caractere se for maior que 254 (fora da tabela ASCII padrão)
				if (charCode > 254) {
					charCode = table1252[colorStr[j]]; // Usa a tabela table1252 para converter o caractere
				}
				var newCode = charCode.toString(16).toUpperCase(); // Converte para hexadecimal e maiúsculas

				// Adiciona um zero à esquerda se o código hexadecimal tiver apenas um dígito
				if (newCode.length == 1) {
					newCode = '0' + newCode;
				}
				hex += newCode; // Adiciona o código hexadecimal à string 'hex'
			}
			labelColors.push(hex); // Adiciona a cor hexadecimal ao array
		}
		return labelColors; // Retorna o array com as cores dos rótulos
		//
	} catch (err) {} // Ignora erros caso não consiga obter as cores (por exemplo, se a seção de preferências não existir)
}

// Obtém os nomes das cores de rótulo (label colors) das preferências do After Effects.
function getLabelColorNames() {
	try {
		var labelColorNames = []; // Array para armazenar os nomes das cores dos rótulos
		var sectionName = 'Label Preference Text Section 7'; // Nome da seção de preferências
		var prefFile = PREFType.PREF_Type_MACHINE_INDEPENDENT; // Tipo de arquivo de preferências

		// Itera sobre as 16 cores de rótulo
		for (var c = 1; c <= 16; c++) {
			var keyName = 'Label Text ID 2 # ' + c; // Nome da chave de preferência para o nome da cor atual
			var colorName = app.preferences.getPrefAsString(sectionName, keyName, prefFile); // Obtém o nome da cor das preferências
			labelColorNames.push(colorName); // Adiciona o nome da cor ao array
		}

		return labelColorNames; // Retorna o array com os nomes das cores
		//
	} catch (err) {} // Ignora erros caso não consiga obter as cores (por exemplo, se a seção de preferências não existir)
}

// Converte uma string hexadecimal (com ou sem '#') em uma string ASCII.
function HEXToAscii(hex) {
	hex = hex.replace('#', ''); // Remove o caractere '#' se estiver presente

	var str = '';

	// Itera sobre pares de caracteres hexadecimais (dois dígitos por vez)
	for (var n = 0; n < hex.length; n += 2) {
		// Converte o par de caracteres em um código decimal e obtém o caractere ASCII correspondente
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	}

	return str; // Retorna a string ASCII
}

// Converte uma string ASCII em uma string hexadecimal.
function asciiToHex(str) {
	var hexArray = []; // Cria um array para armazenar os valores hexadecimais

	// Itera sobre cada caractere da string ASCII
	for (var n = 0; n < str.length; n++) {
		// Converte o código de caractere em decimal para hexadecimal e adiciona ao array
		var hex = str.charCodeAt(n).toString(16);
		hexArray.push(hex);
	}

	return hexArray.join(''); // Retorna a string hexadecimal concatenando os elementos do array
}

// Codifica uma cor de rótulo hexadecimal para o formato usado no After Effects.
function encodeLabelColor(hex) {
	hex = hex.replace('#', ''); // Remove o '#' se existir

	var res = '';

	// Itera sobre pares de caracteres hexadecimais (2 dígitos por vez)
	for (var i = 0; i < hex.length; i += 2) {
		var chars = hex.substr(i, 2); // Extrai um par de caracteres
		var charCode = HEXToAscii(chars).charCodeAt(0); // Converte para ASCII e obtém o código do caractere

		// Se o código do caractere for imprimível (entre 32 e 126), envolve em aspas
		if (charCode >= 32 && charCode <= 126) {
			chars = '"' + HEXToAscii(chars) + '"';
		}

		res += chars; // Adiciona os caracteres (codificados ou não) ao resultado
	}

	// Retorna a string codificada, com o prefixo 'FF' e removendo aspas duplas consecutivas
	return 'FF' + res.replace(/"{2,}/g, '');
}

function removeItem(arr, itemIndex) {
	// Verifica se o índice está dentro dos limites do array
	if (itemIndex < 0) return;
	if (itemIndex >= arr.length) return;

	var head = [];
	var tail = [];

	if (itemIndex > 0) head = arr.slice(0, itemIndex);
	if (itemIndex < arr.length - 1) tail = arr.slice(itemIndex + 1, arr.length);

	return head.concat(tail);
}
