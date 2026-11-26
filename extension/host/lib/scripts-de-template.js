/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> funções globais dos scripts de template
---------------------------------------------------------------

Funções globais que os scripts de template (_script.js) do padeiro antigo chamam; não renomear.

O script de um template roda no host por $.evalFile, em PADX.runEnd (api.jsx), e enxerga as variáveis globais e as
funções globais do host. Os scripts que estão na rede foram escritos para o padeiro antigo (ScriptUI, O_PADEIRO.js e
source/libraries) e chamam as funções das libs dele pelo nome: estas são a interface deles. Os nomes ficam IGUAIS aos
antigos, mesmo com termos em inglês ou termos que o glossário evita. O código é o de antes (só o const virou var, ES3,
e a tabela 1252 ganhou os caracteres em \u); quando a função existe hoje com outro nome, o nome antigo só chama o
nome novo.

Ficam de fora as que dependem do ScriptUI (janelas, árvores, listas, barras de progresso).

teste: node extension/scripts/test-scripts-de-template.js (um script de template por função)

*/

/*

---------------------------------------------------------------
> arquivos e pastas (file system lib.js)
---------------------------------------------------------------

*/

// Abre um URL no navegador padrão do sistema operacional (Windows ou macOS).
function openWebSite(url) {
	if (appOs == 'Win') {
		// Comando para abrir o URL no Windows Explorer (que também pode abrir URLs)
		system.callSystem('explorer ' + url);
	} else if (appOs == 'Mac') {
		// Comando para abrir o URL no navegador padrão do macOS
		system.callSystem('open ' + url);
	}
}

// Faz o download de conteúdo de URLs em um array para arquivos em um array de destinos (Windows e macOS).
function getURLContent(urlArray, dstArray) {
	// Verifica se os arrays têm o mesmo tamanho
	if (urlArray.length != dstArray.length) {
		// um erro, nunca um alert: o PADX.runEnd mostra no painel (#PAD_021)
		throw new Error('os arrays de URLs e destinos devem ter o mesmo tamanho.');
	}

	var cmd = ''; // Comando a ser executado

	if (appOs == 'Win') {
		// PowerShell (Windows)

		// Cabeçalho em destaque
		cmd +=
			"Write-Host '------------- O PADEIRO script -------------' -ForegroundColor white -BackgroundColor DarkRed;";

		// Itera sobre as URLs e prepara os comandos de download
		for (var i = 0; i < urlArray.length; i++) {
			var fileName = decodeURI(
				urlArray[i].match(/[^\\|\/]*$/i)[0],
			).replace(/[?].*$/, ''); // Extrai o nome do arquivo da URL
			cmd += "Write-Host '> baixando " + fileName + "...';"; // Mensagem de download
			cmd +=
				"curl '" +
				urlArray[i] +
				"' -OutFile '" +
				dstArray[i] +
				'/' +
				fileName +
				"';"; // Comando curl
		}

		// Executa o comando PowerShell no cmd.exe
		var cmdStr = 'cmd.exe /c powershell.exe -c "' + cmd + '"';
		system.callSystem(cmdStr);
	} else if (appOs == 'Mac') {
		// Terminal (macOS)

		// Itera sobre as URLs e prepara os comandos de download
		for (var i = 0; i < urlArray.length; i++) {
			var fileName = decodeURI(
				urlArray[i].match(/[^\\|\/]*$/i)[0],
			).replace(/[?].*$/, ''); // Extrai o nome do arquivo da URL
			cmd +=
				"curl -o '" +
				dstArray[i] +
				'/' +
				fileName +
				"' '" +
				urlArray[i] +
				"';"; // Comando curl
		}

		// Executa o comando no terminal
		system.callSystem(cmd);
	}
}

// Descompacta um arquivo ZIP em um diretório de destino (Windows e macOS).
function unzipContent(zipPath, dstPath) {
	// Extrai o nome do arquivo ZIP
	var fileName = decodeURI(zipPath.match(/[^\\|\/]*$/i)[0]).replace(
		/[?].*$/,
		'',
	);

	var cmd = ''; // Comando a ser executado

	if (appOs == 'Win') {
		// PowerShell (Windows)

		// Cabeçalho em destaque
		cmd +=
			"Write-Host '------------- O PADEIRO script -------------' -ForegroundColor white -BackgroundColor DarkRed;";

		// Mensagem de extração
		cmd += "Write-Host '> extraindo " + fileName + "...';";

		// Descompacta o arquivo ZIP usando Expand-Archive
		cmd +=
			"Expand-Archive -Path '" +
			zipPath +
			"' -DestinationPath '" +
			dstPath +
			"' -Force;";

		// Executa o comando PowerShell no cmd.exe
		var cmdStr = 'cmd.exe /c powershell.exe -c "' + cmd + '"';
		system.callSystem(cmdStr);
	} else if (appOs == 'Mac') {
		// Terminal (macOS)

		// Descompacta o arquivo ZIP usando unzip
		cmd = "unzip -o '" + zipPath + "' -d '" + dstPath + "'";

		// Executa o comando no terminal
		system.callSystem(cmd);
	}
}

function zipContent(path, zipPath) {
	if (appOs == 'Win') {
		// get only the NOT '\' OR '/' at the end...
		var fileName = decodeURI(zipPath.match(/[^\\|\/]*$/i));
		// removes any character after the '?' at the end...
		fileName = fileName.replace(/[?].*$/, '');

		// powershell command string...
		// header...
		var cmd = "Write-Host '------------- O PADEIRO script -------------'";
		cmd += ' -ForegroundColor white -BackgroundColor DarkRed;';
		// current action description...
		cmd += "Write-Host '> compressing " + fileName + "...';";
		// zip file...
		cmd +=
			"Compress-Archive -Path '" +
			path +
			"' -DestinationPath '" +
			zipPath;
		cmd += "' -CompressionLevel Optimal -Force;";
		// pass the powershell command thru cmd...
		var cmdStr = 'cmd.exe /c powershell.exe -c "' + cmd + '"';

		system.callSystem(cmdStr);
	}
}

function createPath(path) {
	var folder = new Folder(path);

	if (!folder.exists) {
		var f = new Folder(folder.path);

		if (!f.exists) if (!createPath(folder.path)) return false;
		if (!folder.create()) return false;
	}
	return true;
}

function createPathFolders(path) {
	var folderNamesArray = path.split('/');
	var parentFolderName = '';

	for (var f = 0; f < folderNamesArray.length; f++) {
		parentFolderName += '/' + folderNamesArray[f];
		createPath(parentFolderName);
	}
	return new Folder(parentFolderName);
}

function removeFolder(folder) {
	if (!folder.exists) return;

	var files = folder.getFiles();

	for (var n = 0; n < files.length; n++) {
		if (files[n] instanceof File) {
			files[n].remove();
		} else {
			removeFolder(files[n]);
		}
	}
	folder.remove();
}

// Copia um arquivo para um novo caminho.
function copyFile(fullPath, newPath) {
	try {
		var file = new File(fullPath); // Cria um objeto File para o arquivo de origem
		// Verifica se o caminho original é uma pasta (length < 0 indica que é um diretório)
		if (file.length < 0) {
			// Se for uma pasta, cria o caminho de destino e copia o conteúdo recursivamente
			if (!createPath(newPath + '/' + file.name)) return false; // Cria a pasta de destino
			if (!copyFolderContent(fullPath, newPath + '/' + file.name))
				return false; // Copia o conteúdo da pasta
		} else {
			// Se o caminho original for um arquivo
			// Cria o caminho de destino e copia o arquivo
			if (!createPath(newPath)) return false; // Cria a pasta de destino
			if (!file.copy(newPath + '/' + file.name)) return false; // Copia o arquivo
		}

		return true; // Retorna true se a cópia for bem-sucedida

		// Lidar com erros
	} catch (err) {
		return false; // Retorna false em caso de erro
	}
}

function copyFolderContent(src, dst) {
	try {
		var f = new Folder(src).getFiles();

		for (var i = 0; i < f.length; i++)
			if (!copyFile(f[i], dst)) return false;

		return true;
		//
	} catch (err) { }
}

function copyFolderContentContent(src, dst) {
	var srcFolder = new Folder(src);
	var dstFolder = new Folder(dst);
	var filesArray = [];

	if (!srcFolder.exists) return;

	filesArray = srcFolder.getFiles();

	if (filesArray.length == 0) return;

	for (var i = 0; i < filesArray.length; i++) {
		var aFile = filesArray[i];
		var aFileName = File.decode(aFile.displayName).toString();
		var subArray = [];

		try {
			if (aFile instanceof Folder) subArray = aFile.getFiles();
			//
		} catch (err) { }

		if (subArray.length > 0) {
			copyFolderContentContent(decodeURI(aFile.fsName).toString(), dst);
		} else {
			if (!dstFolder.exists) continue;

			var cFile = new File(dst + '/' + aFileName);
			aFile.copy(cFile);
		}
	}
}

function fileToBinary(aFile) {
	aFile.open('r');
	aFile.encoding = 'binary';

	var bin = aFile.read();
	var strCode = bin.toSource().toString();

	strCode = strCode.substring(13, strCode.length - 3);
	aFile.close();

	return "'" + strCode.replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
}

function createPresetFile(tempFolder, fileName, strCode) {
	try {
		var aFile = new File(tempFolder + '/' + fileName);

		aFile.encoding = 'BINARY';
		writeFileContent(aFile, strCode);

		return aFile;
		//
	} catch (err) { }
}

function saveLogData(aFile, dataStr) {
	var data = readFileContent(aFile);

	data += '\n' + dataStr;

	saveTextFile(data, decodeURI(aFile.fsName));
}

function windowsPathToMac(uncPath) {

	if (!uncPath || uncPath === "") return "";

	// Normaliza barras
	var path = uncPath.replace(/\\/g, "/")
		.replace(/^\/+/, "");

	// Separa partes
	var parts = path.split("/");

	// parts[0] = servidor
	// parts[1] = share (volume no mac)
	if (parts.length < 2) return "";

	var volumeName = parts[1];

	// Monta caminho mac
	var macPath = "/Volumes/" + volumeName;

	for (var i = 2; i < parts.length; i++) {
		macPath += "/" + parts[i];
	}

	// Escapa caracteres problemáticos no ExtendScript
	macPath = macPath
		.replace(/#/g, "\\#")
		.replace(/&/g, "\\&");

	return macPath;
}

/*

---------------------------------------------------------------
> camadas (layers lib.js)
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

/*

---------------------------------------------------------------
> texto (string lib.js e PROT lib.js)
---------------------------------------------------------------

*/

// string to camel case...
String.prototype.toCamelCase = function () {
	return this.toLowerCase()
		.replace(/\s(.)/g, function ($1) {
			return $1.toUpperCase();
		})
		.replace(/\s/g, '')
		.replace(/^(.)/, function ($1) {
			return $1.toLowerCase();
		});
};

// date shortener...
String.prototype.toShortDate = function () {
	return this.replaceSpecialCharacters()
		.replace(/SEGUNDA/, 'SEG')
		.replace(/TERCA/, 'TER')
		.replace(/QUARTA/, 'QUA')
		.replace(/QUINTA/, 'QUI')
		.replace(/SEXTA/, 'SEX')
		.replace(/SABADO/, 'SAB')
		.replace(/DOMINGO/, 'DOM')
		.replace(/DE /, '')
		.replace(/JANEIRO/, 'JAN')
		.replace(/FEVEREIRO/, 'FEV')
		.replace(/MARCO/, 'MAR')
		.replace(/ABRIL/, 'ABR')
		.replace(/MAIO/, 'MAI')
		.replace(/JUNHO/, 'JUN')
		.replace(/JULHO/, 'JUL')
		.replace(/AGOSTO/, 'AGO')
		.replace(/SETEMBRO/, 'SET')
		.replace(/OUTUBRO/, 'OUT')
		.replace(/NOVEMBRO/, 'NOV')
		.replace(/DEZEMBRO/, 'DEZ');
};

// Formata um objeto JavaScript para uma string de texto legível.
function formatObjTxt(obj) {
	return JSON.stringify(obj, null, '\t') // Converte o objeto em JSON com indentação por tabulação
		.replace(/(\{[\r\n]|[\r\n]\})/g, '') // Remove chaves com quebras de linha ao redor
		.replace(/\t"/g, '\t') // Remove aspas duplas após tabulações
		.replace(/\//g, ' / ') // Adiciona espaços em torno de barras (/)
		.replace(/":/g, ' →') // Substitui dois-pontos (:) e aspas duplas por seta (→)
		.replace(/"/g, "'") // Substitui aspas duplas (") por aspas simples (')
		.replace(/,/g, ''); // Remove vírgulas (,)
}

// Formata um objeto JavaScript para uma string JSON válida e legível.
function formatObjStr(obj) {
	return JSON.stringify(obj, null, '\t') // Converte o objeto em JSON com indentação por tabulação
		.replace(/\\\\/g, '\\') // Corrige barras duplas (\\)
		.replace(/\t"/g, '\t') // Remove aspas duplas após tabulações
		.replace(/": "/g, ': ') // Remove espaços extras em torno de dois-pontos (:)
		.replace(/",[\n\r]/g, ',\n') // Adiciona quebras de linha após vírgulas (,)
		.replace(/"[\n\r]/g, '\n'); // Remove aspas duplas e adiciona quebras de linha
}

// Incrementa o número no final de um nome, se houver. Caso contrário, adiciona ' 2'.
function nameInc(aName) {
	var name = aName.replace(/\s*[0-9]+$/, ''); // Extrai a parte do nome sem o número
	var num = aName.match(/\s*[0-9]+$/); // Extrai o número no final (com espaços opcionais)

	// Se não houver número, define numStr como '2', caso contrário, incrementa o número existente
	var numStr = num == null ? 2 : parseInt(num) + 1;

	return name + ' ' + numStr.toString(); // Retorna o nome com o número incrementado
}

// Converte uma string para o formato Title Case (primeira letra de cada palavra em maiúscula).
function titleCase(str) {
	// Converte para minúsculas e divide em palavras
	str = str.toLowerCase().split(' ');

	// Itera pelas palavras e coloca a primeira letra de cada palavra em maiúscula
	for (var i = 0; i < str.length; i++) {
		str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
	}

	// Junta as palavras novamente
	str = str.join(' ');

	// Divide em linhas (se houver quebras de linha)
	str = str.split(/\n|\r/);

	// Itera pelas linhas e coloca a primeira letra de cada linha em maiúscula
	for (var t = 0; t < str.length; t++) {
		str[t] = str[t].charAt(0).toUpperCase() + str[t].slice(1);
	}

	return str.join('\n'); // Retorna a string formatada com quebras de linha
}

// format short date and time → SHORT DATE TIME
function formatShortDateAndTime(str) {
	return str
		.toString()
		.trim()
		.toUpperCase()
		.toShortDate()
		.split(/\s+—\s+|[\n\r]+|\s+\|\s+/)
		.join(' ');
}

/*

---------------------------------------------------------------
> dados da árvore e busca nos textos (treeView lib.js, sem a árvore do ScriptUI)
---------------------------------------------------------------

*/

// Lê a pasta uma única vez e monta a árvore em memória: { type, text, children | file }.
// Mesma limpeza do treeview (sem pastas vazias) e mesma otimização (pasta com uma única subpasta
// vira 'PASTA / SUBPASTA'), para que a busca possa filtrar sem acessar a rede de novo.
function buildTreeData(folder, fileTypes) {
	var root = { type: 'node', text: folder.displayName, children: readTreeData(folder.getFiles(), fileTypes) };

	for (var i = 0; i < root.children.length; i++) {
		optimizeTreeData(root.children[i]);
	}

	return root;
}

function readTreeData(array, fileTypes) {
	var children = [];

	for (var n = 0; n < array.length; n++) {
		var nodeName = array[n].displayName;

		if (array[n] instanceof Folder) {
			var subChildren = readTreeData(array[n].getFiles(), fileTypes);

			// pastas sem templates não entram na árvore
			if (subChildren.length > 0) children.push({ type: 'node', text: nodeName, children: subChildren });
		} else {
			try {
				if (fileTypes.indexOf(getFileExt(nodeName)) >= 0) children.push({ type: 'item', text: nodeName, file: array[n] });
			} catch (err) { }
		}
	}

	return children;
}

function optimizeTreeData(node) {
	if (node.type != 'node') return;

	while (node.children.length == 1 && node.children[0].type == 'node') {
		node.text += ' / ' + node.children[0].text;
		node.children = node.children[0].children;
	}

	for (var i = 0; i < node.children.length; i++) {
		optimizeTreeData(node.children[i]);
	}
}

// Texto normalizado para comparação (maiúsculas, sem acentos).
function treeSearchText(str) {
	return String(str).trim().toUpperCase().replaceSpecialCharacters();
}

// Retorna uma cópia de 'node' só com o que casa com 'query' (já normalizada por treeSearchText).
// Pasta que casa entra inteira; pasta que não casa entra só com os descendentes que casam.
function filterTreeData(node, query) {
	var children = [];

	for (var i = 0; i < node.children.length; i++) {
		var child = node.children[i];

		if (treeSearchText(child.text).indexOf(query) >= 0) {
			children.push(child);
		} else if (child.type == 'node') {
			var filtered = filterTreeData(child, query);

			if (filtered.children.length > 0) children.push(filtered);
		}
	}

	return { type: 'node', text: node.text, children: children };
}

function textLayerEntry(comp, txtLayer, label, textDoc, refTime) {
	var text = String(textDoc.text).trim();

	if (textDoc.allCaps) text = text.toUpperCase(); // o texto aparece em caixa alta na comp

	return { comp: comp, layer: txtLayer, label: label, text: text, enabled: txtLayer.enabled, refTime: refTime };
}

// Normaliza o texto conforme as opções da busca.
function normalizeSearchText(str, matchCase, matchAccent) {
	if (!matchCase) str = str.toLowerCase();
	if (!matchAccent) str = str.replaceSpecialCharacters();

	return str;
}

// Filtra o índice. obj: { sKey, vis, matchCase, matchAccent, invert }
// A busca é literal: caracteres como '(', '.', '?' são procurados como texto.
function filterTextLayerIndex(index, obj) {
	var sKey = normalizeSearchText(obj.sKey, obj.matchCase, obj.matchAccent);
	var results = [];

	for (var i = 0; i < index.length; i++) {
		var entry = index[i];

		if (obj.vis && !entry.enabled) continue; // apenas layers visíveis

		var found = normalizeSearchText(entry.text, obj.matchCase, obj.matchAccent).indexOf(sKey) >= 0;

		if (found != !!obj.invert) results.push(entry);
	}

	return results;
}

/*

---------------------------------------------------------------
> números e cores (math num lib.js e color lib.js)
---------------------------------------------------------------

*/

// Retorna um número inteiro aleatório entre 'min' (inclusivo) e 'max' (exclusivo).
function randomInteger(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

// Retorna um número aleatório com distribuição gaussiana (normal) entre 0 e 1.
function gaussRnd(samples) {
	var r = 0;
	// Soma várias amostras de números aleatórios uniformes (0 a 1)
	for (var i = 0; i < samples; i++) {
		r += Math.random();
	}
	return r / samples; // Média das amostras, resultando em um valor próximo de 0.5, com distribuição gaussiana
}

// Retorna o tempo decorrido em segundos desde o início do script (com duas casas decimais).
function timer() {
	return ($.hiresTimer / 1000000).toFixed(2);
}

// Retorna uma cor aleatória de um array de cores.
function randomColor(colorArray) {
	// Gera um índice aleatório dentro do intervalo do array e
	// retorna a cor correspondente ao índice aleatório.
	return colorArray[randomInteger(0, colorArray.length)];
}

// Converte valores RGB (0-255) para um array normalizado [0-1].
function rgb(r, g, b) {
	// Normaliza os valores RGB dividindo por 255 (para o formato do After Effects)
	var rNormalizado = r / 255;
	var gNormalizado = g / 255;
	var bNormalizado = b / 255;

	// Retorna o array com os valores normalizados
	return [rNormalizado, gNormalizado, bNormalizado];
}

// Converte valores RGBA (0-255) para um array normalizado [0-1].
function rgba(r, g, b, a) {
	// Normaliza os valores RGBA dividindo por 255 (para o formato do After Effects)
	var rNormalizado = r / 255;
	var gNormalizado = g / 255;
	var bNormalizado = b / 255;
	var aNormalizado = a / 255;

	// Retorna o array com os valores normalizados
	return [rNormalizado, gNormalizado, bNormalizado, aNormalizado];
}

// Converte um componente de cor (0-255) para hexadecimal (00-FF).
function componentToHex(c) {
	// Converte o componente para hexadecimal.
	var hex = c.toString(16);

	// Adiciona um zero à esquerda se o hexadecimal tiver apenas um dígito.
	return hex.length == 1 ? '0' + hex : hex;
}

// Converte um array RGB normalizado [0-1] para uma string hexadecimal (ex: '#FF0000').
function rgbToHEX(rgbArray) {
	// Converte os componentes RGB normalizados de volta para valores de 0 a 255.
	var r = Math.round(rgbArray[0] * 255);
	var g = Math.round(rgbArray[1] * 255);
	var b = Math.round(rgbArray[2] * 255);

	// Converte os componentes para hexadecimal e junta em uma string.
	return (
		'#' +
		componentToHex(r) +
		componentToHex(g) +
		componentToHex(b)
	).toUpperCase();
}

// Converte um array RGB normalizado [0-1] para uma string hexadecimal com prefixo '0x' (ex: '0xFF0000').
function rgbToHex(rgbArray) {
	// Converte os componentes RGB normalizados de volta para valores de 0 a 255.
	var r = Math.round(rgbArray[0] * 255);
	var g = Math.round(rgbArray[1] * 255);
	var b = Math.round(rgbArray[2] * 255);

	// Converte os componentes para hexadecimal e junta em uma string com o prefixo '0x'.
	return '0x' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function rgbStr(val) {
	if (val.length > 0) {
		val = rgbToHex(val);
	} else if (eval(val).length > 0) {
		val = rgbToHex(eval(val));
	}
	var r = (val >> 16) & 0xff;
	var g = (val >> 8) & 0xff;
	var b = val & 0xff;

	return 'rgb(' + r + ', ' + g + ', ' + b + ')';
}

// Converte uma string hexadecimal (com ou sem '#') para um array RGB normalizado.
function hexToRgb(hex) {
	if (hex == undefined) return [Math.random(), Math.random(), Math.random()];

	// Remove o '#' se estiver presente
	hex = hex.replace('#', '');

	// Extrai os componentes RGB do hexadecimal e converte para valores de 0 a 255
	var r = parseInt(hex.substring(0, 2), 16);
	var g = parseInt(hex.substring(2, 4), 16);
	var b = parseInt(hex.substring(4, 6), 16);

	// Retorna o array com os valores RGB normalizados
	return [r / 255, g / 255, b / 255];
}

/*

---------------------------------------------------------------
> animação (ctrl anim lib.js)
---------------------------------------------------------------

*/

// Trava as propriedades de transformação de uma camada usando expressões.
function lockTrmProp(sLayer) {
	var trm = sLayer.property('ADBE Transform Group'); // Obtém o grupo de transformação da camada
	var expStr = '// locked...\n'; // String de comentário para a expressão

	// Itera sobre cada propriedade do grupo de transformação
	for (var p = 1; p <= trm.numProperties; p++) {
		var prop = trm.property(p); // Obtém a propriedade atual
		var val = prop.value; // Obtém o valor da propriedade

		// Pula propriedades que não podem ter expressão, já têm keyframes ou já possuem expressão
		if (!prop.canSetExpression || prop.numKeys > 0 || prop.expression != '')
			continue;

		// Converte o valor para string formatada para arrays, se necessário
		if (Array.isArray(val)) {
			val = '[' + val.toString() + ']';
		}

		// Define a expressão da propriedade como o valor atual, efetivamente travando-a
		prop.expression = expStr + val.toString() + ';';
	}
}

// Clona as expressões da camada de origem (sLayer) para a camada de destino (cLayer).
function cloneExpressions(sLayer, cLayer) {
	var sTrm = sLayer.property('ADBE Transform Group'); // Grupo de transformação da camada de origem
	var cTrm = cLayer.property('ADBE Transform Group'); // Grupo de transformação da camada de destino

	// Temporariamente define o parent da camada de origem como o mesmo da camada de destino
	sLayer.parent = cLayer.parent;

	// Itera sobre as propriedades do grupo de transformação da camada de origem
	for (var p = 1; p <= sTrm.numProperties; p++) {
		var prop = sTrm.property(p); // Propriedade atual da camada de origem
		var cProp = cTrm.property(p); // Propriedade correspondente na camada de destino
		var expStr = prop.expression; // Expressão da propriedade de origem

		// Ignora a propriedade Opacidade e propriedades sem expressão
		if (prop.matchName == 'ADBE Opacity' || prop.expression == '') continue;

		// Remove temporariamente a expressão da propriedade de origem
		prop.expression = '';

		// Tenta definir o valor da propriedade de destino para o valor da propriedade de origem
		try {
			cProp.setValue(prop.value);
		//
		} catch (err) {} // Ignora erros caso o valor não possa ser definido

		// Define a expressão da propriedade de destino como a expressão da propriedade de origem
		cTrm.property(p).expression = expStr;

		// Se a propriedade for Posição, restaura o valor original na camada de origem após clonar a expressão
		if (prop.matchName == 'ADBE Position') {
			prop.setValue(cProp.value);
		}
	}

	// Restaura o parent original da camada de origem
	sLayer.parent = cLayer;
}

// Copia as propriedades dos keyframes de uma propriedade de origem (prop) para uma propriedade de destino (cProp).
function setKeys(prop, cProp) {
	// Itera sobre cada keyframe da propriedade de origem
	for (var k = 1; k <= prop.numKeys; k++) {
		var t = prop.keyTime(k); // Obtém o tempo do keyframe
		var v = prop.keyValue(k); // Obtém o valor do keyframe
		cProp.setValueAtTime(t, v); // Define o valor do keyframe na propriedade de destino

		var tInTArray = prop.keyInTemporalEase(k); // Obtém a suavização temporal de entrada do keyframe
		var tOutTArray = prop.keyOutTemporalEase(k); // Obtém a suavização temporal de saída do keyframe
		cProp.setTemporalEaseAtKey(k, tInTArray, tOutTArray); // Define a suavização temporal do keyframe na propriedade de destino

		var kInIType = prop.keyInInterpolationType(k); // Obtém o tipo de interpolação de entrada do keyframe
		var kOutIType = prop.keyOutInterpolationType(k); // Obtém o tipo de interpolação de saída do keyframe
		cProp.setInterpolationTypeAtKey(k, kInIType, kOutIType); // Define o tipo de interpolação do keyframe na propriedade de destino

		// Se a propriedade for espacial (ex: Posição), copia as tangentes espaciais
		if (prop.isSpatial) {
			var kInSArray = prop.keyInSpatialTangent(k); // Obtém a tangente espacial de entrada do keyframe
			var kOutSArray = prop.keyOutSpatialTangent(k); // Obtém a tangente espacial de saída do keyframe
			cProp.setSpatialTangentsAtKey(k, kInSArray, kOutSArray); // Define as tangentes espaciais do keyframe na propriedade de destino

			var ct = prop.keySpatialContinuous(k); // Obtém o estado de continuidade espacial do keyframe
			cProp.setSpatialContinuousAtKey(k, ct); // Define a continuidade espacial do keyframe na propriedade de destino
		}
	}
}

// Clona os keyframes da camada de origem (sLayer) para a camada de destino (cLayer).
function cloneKeys(sLayer, cLayer) {
	var sLayerTrm = sLayer.property('ADBE Transform Group'); // Grupo de transformação da camada de origem
	var cLayerTrm = cLayer.property('ADBE Transform Group'); // Grupo de transformação da camada de destino

	// Temporariamente define o parent da camada de origem como o mesmo da camada de destino
	sLayer.parent = cLayer.parent;

	// Itera sobre as propriedades do grupo de transformação da camada de origem
	for (var p = 1; p <= sLayerTrm.numProperties; p++) {
		var sProp = sLayerTrm.property(p); // Propriedade atual da camada de origem
		var cProp = cLayerTrm.property(p); // Propriedade correspondente na camada de destino

		// Ignora propriedades sem keyframes e a propriedade Opacidade
		if (sProp.numKeys == 0 || sProp.matchName == 'ADBE Opacity') continue;

		// Se a propriedade tiver dimensões separadas
		if (sProp.dimensionsSeparated) {
			cProp.dimensionsSeparated = true; // Habilita dimensões separadas na propriedade de destino

			// Itera sobre as dimensões da propriedade
			for (var d = 0; d < sProp.value.length; d++) {
				var sPropD = sProp.getSeparationFollower(d); // Obtém a propriedade separada da origem
				var cPropD = cProp.getSeparationFollower(d); // Obtém a propriedade separada do destino
				setKeys(sPropD, cPropD); // Copia os keyframes
				while (sPropD.numKeys > 0) sPropD.removeKey(1); // Remove os keyframes da origem
			}
		} else {
			setKeys(sProp, cProp); // Copia os keyframes
			while (sProp.numKeys > 0) sProp.removeKey(1); // Remove os keyframes da origem
		}

		// Tenta definir o valor da propriedade de origem para o valor da propriedade de destino
		try {
			sProp.setValue(cProp.value);
		//
		} catch (err) {}
	}
	// Restaura o parent original da camada de origem
	sLayer.parent = cLayer;

	// Redefine as propriedades Posição e Escala da camada de origem
	sLayerTrm.property('ADBE Position').dimensionsSeparated = false;
	sLayerTrm.property('ADBE Position').setValue([0, 0, 0]);
	sLayerTrm.property('ADBE Scale').setValue([100, 100, 100]);
}

// Adiciona um pseudo efeito à primeira camada da composição ativa.
function addPseudoEffect(fxName, strCode) {
	// Cria um objeto com o nome e o código do pseudo efeito.
	var fx = {
		name: fxName,
		binary: [strCode],
	};

	var tempFolder = new Folder(tempPath); // Obtém a pasta temporária para armazenar o preset

	// Cria a pasta temporária se ela não existir.
	if (!tempFolder.exists) {
		tempFolder.create();
	}

	var aPreset = createPresetFile(tempPath, fx.name, fx.binary); // Cria um arquivo de preset temporário

	// Tenta aplicar o preset à primeira camada da composição ativa.
	try {
		app.project.activeItem.layer(1).applyPreset(File(aPreset));
	//
	} catch (err) {} // Ignora erros caso a aplicação do preset falhe (por exemplo, se a camada não existir)
}

// Reposiciona e parenteia uma camada (cLayer) sob outra camada (sLayer), mantendo a hierarquia e as propriedades.
function setHierarchy(sLayer, cLayer) {
	var sTrm = sLayer.property('ADBE Transform Group'); // Grupo de transformação da camada de origem (sLayer)
	var sPos = sTrm.property('ADBE Position'); // Propriedade de posição da camada de origem
	var cTrm = cLayer.property('ADBE Transform Group'); // Grupo de transformação da camada de destino (cLayer)
	var cPos = cTrm.property('ADBE Position'); // Propriedade de posição da camada de destino

	// Se a camada de origem tiver um parent, define o mesmo parent para a camada de destino
	if (sLayer.parent != null) cLayer.parent = sLayer.parent;

	// Se a camada de origem for 3D ou uma camada de luz, define a camada de destino como 3D
	if (sLayer.threeDLayer || sLayer instanceof LightLayer)
		cLayer.threeDLayer = true;

	cPos.setValue(sPos.value); // Define a posição da camada de destino como a posição da camada de origem

	// Se a camada de origem for uma camada de câmera, define a camada de destino como 3D
	if (sLayer instanceof CameraLayer) cLayer.threeDLayer = true;

	sLayer.parent = cLayer; // Define a camada de origem como parent da camada de destino

	// Itera sobre as propriedades do grupo de transformação da camada de origem
	for (var i = 1; i <= sTrm.numProperties; i++) {
		// Se a propriedade tiver dimensões separadas, define a mesma configuração na propriedade correspondente da camada de destino
		if (sTrm.property(i).dimensionsSeparated)
			cTrm.property(i).dimensionsSeparated = true;
	}
}

// Encontra o ponto central de um conjunto de camadas (lArray) com base em suas posições.
function findCenter(lArray) {
	var maxY = -Infinity; // Valor inicial mínimo para Y (negativo infinito para garantir que qualquer valor seja maior)
	var minY = Infinity; // Valor inicial máximo para Y (infinito para garantir que qualquer valor seja menor)
	var maxX = -Infinity; // Valor inicial mínimo para X
	var minX = Infinity; // Valor inicial máximo para X
	var maxZ = -Infinity; // Valor inicial mínimo para Z
	var minZ = Infinity; // Valor inicial máximo para Z

	// Itera sobre as camadas em lArray
	for (var i = 0; i < lArray.length; i++) {
		var lPos = lArray[i]
			.property('ADBE Transform Group')
			.property('ADBE Position'); // Obtém a propriedade de posição da camada

		// Atualiza os valores máximos e mínimos para cada coordenada (X, Y, Z)
		maxX = Math.max(maxX, lPos.value[0]);
		minX = Math.min(minX, lPos.value[0]);
		maxY = Math.max(maxY, lPos.value[1]);
		minY = Math.min(minY, lPos.value[1]);
		maxZ = Math.max(maxZ, lPos.value[2]);
		minZ = Math.min(minZ, lPos.value[2]);
	}

	// Calcula e retorna o ponto central como um array [X, Y, Z]
	return [
		minX + (maxX - minX) / 2,
		minY + (maxY - minY) / 2,
		minZ + (maxZ - minZ) / 2,
	];
}

// Aplica suavização (ease) aos keyframes selecionados de uma camada (sLayer).
function applyEase(sLayer) {
	var selProps = sLayer.selectedProperties; // Obtém as propriedades selecionadas da camada

	// Itera sobre as propriedades selecionadas
	for (var p = 0; p < selProps.length; p++) {
		var aProp = selProps[p]; // Propriedade atual
		var selKeys = aProp.selectedKeys; // Keyframes selecionados na propriedade

		// Itera sobre os keyframes selecionados
		for (var k = 0; k < selKeys.length; k++) {
			var aKey = selKeys[k]; // Keyframe atual

			// Cria objetos KeyframeEase para suavização de entrada e saída
			var easeOut = new KeyframeEase(0, easeOutInfluence);
			var easeIn = new KeyframeEase(0, easeInInfluence);
			var easeInArray = [easeIn]; // Array para suavização de entrada (pode ser multidimensional)
			var easeOutArray = [easeOut]; // Array para suavização de saída (pode ser multidimensional)

			// Tenta aplicar a suavização ao keyframe
			try {
				aProp.setTemporalEaseAtKey(aKey, easeInArray, easeOutArray);
			//
			} catch (err) {
				// Se a propriedade for multidimensional (ex: Posição), ajusta os arrays de suavização
				if (Array.isArray(aProp.value)) {
					for (var e = 1; e < aProp.value.length; e++) {
						easeOutArray.push(easeOut);
						easeInArray.push(easeIn);
					}
				}

				// Aplica a suavização com os arrays ajustados
				aProp.setTemporalEaseAtKey(aKey, easeInArray, easeOutArray);
			}
			// Define o tipo de interpolação do keyframe na propriedade de destino
			aProp.setInterpolationTypeAtKey(
				aKey,
				keyData.inType,
				keyData.outType,
			);
		}
	}
}

/*

---------------------------------------------------------------
> gerais (FUNC lib.js)
---------------------------------------------------------------

*/

// tabela da página de código 1252 (Windows Latin-1): caractere → código, para getLabelColors
var table1252 = {
	'\u20AC': 128,
	'\u201A': 130,
	'\u0192': 131,
	'\u201E': 132,
	'\u2026': 133,
	'\u2020': 134,
	'\u2021': 135,
	'\u02C6': 136,
	'\u2030': 137,
	'\u0160': 138,
	'\u2039': 139,
	'\u0152': 140,
	'\u017D': 142,
	'\u2018': 145,
	'\u2019': 146,
	'\u201C': 147,
	'\u201D': 148,
	'\u2022': 149,
	'\u2013': 150,
	'\u2014': 151,
	'\u02DC': 152,
	'\u2122': 153,
	'\u0161': 154,
	'\u203A': 155,
	'\u0153': 156,
	'\u017E': 158,
	'\u0178': 159,
	'\u00A1': 161,
	'\u00A2': 162,
	'\u00A3': 163,
	'\u00A4': 164,
	'\u00A5': 165,
	'\u00A6': 166,
	'\u00A7': 167,
	'\u00A8': 168,
	'\u00A9': 169,
	'\u00AA': 170,
	'\u00AB': 171,
	'\u00AC': 172,
	'\u00AD': 173,
	'\u00AE': 174,
	'\u00AF': 175,
	'\u00B0': 176,
	'\u00B1': 177,
	'\u00B2': 178,
	'\u00B3': 179,
	'\u00B4': 180,
	'\u00B5': 181,
	'\u00B6': 182,
	'\u00B7': 183,
	'\u00B8': 184,
	'\u00B9': 185,
	'\u00BA': 186,
	'\u00BB': 187,
	'\u00BC': 188,
	'\u00BD': 189,
	'\u00BE': 190,
	'\u00BF': 191,
	'\u00C0': 192,
	'\u00C1': 193,
	'\u00C2': 194,
	'\u00C3': 195,
	'\u00C4': 196,
	'\u00C5': 197,
	'\u00C6': 198,
	'\u00C7': 199,
	'\u00C8': 200,
	'\u00C9': 201,
	'\u00CA': 202,
	'\u00CB': 203,
	'\u00CC': 204,
	'\u00CD': 205,
	'\u00CE': 206,
	'\u00CF': 207,
	'\u00D0': 208,
	'\u00D1': 209,
	'\u00D2': 210,
	'\u00D3': 211,
	'\u00D4': 212,
	'\u00D5': 213,
	'\u00D6': 214,
	'\u00D7': 215,
	'\u00D8': 216,
	'\u00D9': 217,
	'\u00DA': 218,
	'\u00DB': 219,
	'\u00DC': 220,
	'\u00DD': 221,
	'\u00DE': 222,
	'\u00DF': 223,
	'\u00E0': 224,
	'\u00E1': 225,
	'\u00E2': 226,
	'\u00E3': 227,
	'\u00E4': 228,
	'\u00E5': 229,
	'\u00E6': 230,
	'\u00E7': 231,
	'\u00E8': 232,
	'\u00E9': 233,
	'\u00EA': 234,
	'\u00EB': 235,
	'\u00EC': 236,
	'\u00ED': 237,
	'\u00EE': 238,
	'\u00EF': 239,
	'\u00F0': 240,
	'\u00F1': 241,
	'\u00F2': 242,
	'\u00F3': 243,
	'\u00F4': 244,
	'\u00F5': 245,
	'\u00F6': 246,
	'\u00F7': 247,
	'\u00F8': 248,
	'\u00F9': 249,
	'\u00FA': 250,
	'\u00FB': 251,
	'\u00FC': 252,
	'\u00FD': 253,
	'\u00FE': 254,
	'\u00FF': 255
};

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

function executeCommandID(command) {
	app.executeCommand(app.findMenuCommandId(command));
}

// Aplica o efeito de preenchimento (fill) com a cor especificada a várias camadas selecionadas.
function batchFill(fillName, aColor) {
	var aItem = app.project.activeItem; // Obtém a composição ativa
	var selLayers = aItem != null ? aItem.selectedLayers : []; // Obtém as camadas selecionadas

	// Verifica se há camadas selecionadas
	if (selLayers.length == 0) {
		// um erro, nunca um alert: o PADX.runEnd mostra no painel (#PAD_021)
		throw new Error('nenhuma camada selecionada.');
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
		} catch (err) { } // Ignora erros em propriedades que não podem ser acessadas
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
	} catch (err) { } // Ignora erros caso a camada "ctrl_comp" não exista ou não tenha efeitos

	return obj; // Retorna o objeto com as informações dos efeitos
}

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
	} catch (err) { } // Ignora erros caso não consiga obter as cores (por exemplo, se a seção de preferências não existir)
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
	} catch (err) { } // Ignora erros caso não consiga obter as cores (por exemplo, se a seção de preferências não existir)
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

/*

---------------------------------------------------------------
> fontes e renomear: os nomes antigos chamam os de hoje
---------------------------------------------------------------

*/

// Nomes das fontes usadas no projeto.
function getFontNames() {
	var fonts = getProjectFonts();
	var names = [];

	for (var f = 0; f < fonts.length; f++) {
		names.push(fonts[f].name);
	}

	return names;
}

// nome antigo de fontCopyTo (fonts lib.js)
function fontCollect(savePath) {
	return fontCopyTo(savePath);
}

// nome antigo de coletarRenameComps (rename lib.js)
function collectRenameComps(items, compArray) {
	return coletarRenameComps(items, compArray);
}
