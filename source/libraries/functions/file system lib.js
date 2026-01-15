/* eslint-disable no-empty */
/* eslint-disable no-redeclare */
/* eslint-disable no-useless-escape */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🖌️ files, folders and system
---------------------------------------------------------------

*/

/*

---------------------------------------------------------------
> command line
---------------------------------------------------------------

*/
// Define o conteúdo da área de transferência no Windows ou macOS.
function setClipboard(str) {
	var cmd;
	if (appOs == 'Win') {
		// Comando PowerShell para Windows
		var setClipboard = "Set-Clipboard -Value '" + str + "'";
		cmd = 'cmd.exe /c powershell.exe -c "' + setClipboard + '"';
		system.callSystem(cmd);
	} else if (appOs == 'Mac') {
		// Comando pbcopy para macOS
		cmd = 'echo "' + str + '" | pbcopy';
		system.callSystem(cmd);
	}
}

function setClipboardContent(str) {
	// Salva a string num arquivo temporário
	var tempFile = new File(tempPath + '/temp_clipboard.txt');
	// Abre o arquivo para escrita em modo texto
	tempFile.open('w');
	tempFile.encoding = 'UTF-8';

	// Escreve o texto no arquivo
	tempFile.write(str);
	tempFile.close();

	// Comando para ler o conteúdo do arquivo e enviar para a área de transferência
	var psCommand = 'Get-Content "' + tempFile.fsName + '" | Set-Clipboard';
	var cmd = 'cmd.exe /c powershell.exe -NoProfile -Command "' + psCommand + '"';

	system.callSystem(cmd);

	// Remove o arquivo temporário
	tempFile.remove();
}

// Abre uma pasta no sistema operacional (Windows ou macOS).
function openFolder(folderPath) {
	var folder = Folder(folderPath); // Obtém um objeto Folder representando o caminho da pasta

	if (appOs == 'Win') {
		// Comando para abrir a pasta no Windows Explorer
		system.callSystem('explorer ' + Folder.decode(folder.fsName));
	} else if (appOs == 'Mac') {
		// Comando para abrir a pasta no Finder (macOS)
		system.callSystem('open "' + Folder.decode(folder.fsName) + '"');
	}
}

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
		alert('Os arrays de URLs e destinos devem ter o mesmo tamanho.');
		return;
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

function installWinFonts(fontsPath) {
	var srcFolder = new Folder(fontsPath);
	var filesArray = [];
	var filter = ['.ttf', '.otf'];

	if (!srcFolder.exists) return;

	filesArray = srcFolder.getFiles();

	if (filesArray.length == 0) return;

	var installFontsPS =
		"Write-Host '------------- O PADEIRO script -------------'";
	installFontsPS += ' -ForegroundColor white -BackgroundColor DarkRed;';
	installFontsPS += "Write-Host '                (u.u )...zzz';";
	installFontsPS +=
		'$Destination = (New-Object -ComObject Shell.Application).Namespace(0x14);';

	for (var i = 0; i < filesArray.length; i++) {
		var aFile = filesArray[i];
		var aFileName = File.decode(aFile.displayName).toString();
		var subArray = [];

		try {
			subArray = new Folder(
				decodeURI(aFile.fullName).toString(),
			).getFiles();
			//
		} catch (err) { }

		if (subArray.length > 0) {
			installFonts(decodeURI(aFile.fullName).toString());

			continue;
		} else {
			if (filter.indexOf(getFileExt(aFileName)) >= 0) {
				var driveLetter = fontsPath.split(/\//)[1];
				var driveStr =
					driveLetter.match(/\w{1}/) && driveLetter.length == 1
						? driveLetter + ':/'
						: null;

				if (driveLetter != null)
					fontsPath = fontsPath.replace(/^\/\w\//i, driveStr);

				var aFontPath = fontsPath.replace(
					/^~/,
					'C:/Users/' + system.userName.toString(),
				);
				aFontPath = aFontPath.replace(/\//g, '\\');
				installFontsPS +=
					"$Destination.CopyHere('" +
					aFontPath +
					'\\' +
					aFileName +
					"');";
				installFontsPS +=
					"Write-Host '> installing " + aFileName + "...';";
			} else continue;
		}
	}
	var cmdStr = 'cmd.exe /c powershell.exe -c "' + installFontsPS + '"';
	system.callSystem(cmdStr);
}

/*

---------------------------------------------------------------
> folders
---------------------------------------------------------------

*/

function copyFolderContent(src, dst) {
	try {
		var f = new Folder(src).getFiles();

		for (var i = 0; i < f.length; i++)
			if (!copyFile(f[i], dst)) return false;

		return true;
		//
	} catch (err) { }
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
			copyFolderContentContent(decodeURI(aFile.fullName).toString(), dst);
		} else {
			if (!dstFolder.exists) continue;

			var cFile = new File(dst + '/' + aFileName);
			aFile.copy(cFile);
		}
	}
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

/*

---------------------------------------------------------------
> files
---------------------------------------------------------------

*/
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
		//
	} catch (err) {
		return false; // Retorna false em caso de erro
	}
}

function readFileContent(file) {
	var fileContent;

	file.open('r');
	file.encoding = 'UTF-8'; // → file encoding
	fileContent = file.read();
	file.close();

	return fileContent.toString();
}

function saveTextFile(fileContent, filePath) {
	var newFile = new File(filePath);

	newFile.encoding = 'UTF-8'; // → file encoding
	return writeFileContent(newFile, fileContent);
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

function writeFileContent(newFile, fileContent) {
	newFile.open('w');
	newFile.write(fileContent);
	newFile.close();

	return newFile;
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

// copy all fonts used in the project...
function fontCollect(savePath) {
	var saveFolder = new Folder(savePath); // collect folder...
	var fontArray = []; // copied fonts array...
	var failArray = []; // failed copy array...
	var compArray = getComps(); // all project comps...

	if (!saveFolder.exists) saveFolder.create();

	for (var c = 0; c < compArray.length; c++) {
		var comp = compArray[c]; // current comp...

		for (var l = 1; l <= comp.numLayers; l++) {
			var aLayer = comp.layer(l); // current layer...

			if (!(aLayer instanceof TextLayer)) continue;
			// current text layer...
			var textDoc = aLayer
				.property('ADBE Text Properties')
				.property('ADBE Text Document').value;
			var fontName = textDoc.font; // font name...
			var fontSrcFile = new File(decodeURI(textDoc.fontLocation)); // font file...

			if (!fontSrcFile.exists) {
				if (failArray.indexOf(fontName) < 0) failArray.push(fontName); // no font file...
				continue;
			}
			if (fontArray.indexOf(fontName) > 0) continue; // already copied...

			var fontFileName = fontSrcFile.displayName;

			if (!fontFileName.match(/(\.ttf|\.otf)$/i))
				fontFileName = 'cc_' + fontName + '.ttf';

			var fontCopyFile = new File(savePath + '/' + fontFileName);

			fontArray.push(fontName);
			fontSrcFile.copy(fontCopyFile);
		}
	}
	if (saveFolder.getFiles().length == 0) saveFolder.remove();

	if (failArray.length > 0) alert(failArray.toString() + ' cant be copied');

	return savePath;
}

// -------------------------------------------------------

function saveLogData(aFile, dataStr) {
	var data = readFileContent(aFile);

	data += '\n' + dataStr;

	saveTextFile(data, decodeURI(aFile.fullName));
}

// -------------------------------------------------------

/**
 * Converte caminho UNC do Windows para caminho do macOS
 * Exemplo:
 * //servidor/EDIT_IN_PLACE/pasta/arquivo
 * -> /Volumes/EDIT_IN_PLACE/pasta/arquivo
 */
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

/**
 * Normaliza caminhos de rede para o sistema atual (Windows ou macOS)
 * Compatível com After Effects ExtendScript
 * 
 * SEMPRE retorna caminhos com forward slashes (/) para máxima compatibilidade
 * - Windows: //servidor/share/pasta (formato UNC com /)
 * - Mac: /Volumes/share/pasta (formato nativo Mac)
 * 
 * ExtendScript aceita ambos os formatos de barra, mas forward slash é mais portável
 * 
 * @param {string} pathStr - Caminho a ser normalizado
 * @param {Object} options - Opções de configuração
 * @param {string} options.defaultServer - Nome do servidor para conversões Mac→Win
 * @param {Object} options.serverMap - Mapa de shares para servidores específicos
 * @returns {string} Caminho normalizado ou string vazia se inválido
 * 
 * @example
 * // Windows drive letter → UNC com forward slashes
 * normalizeNetworkPath("L:\\Projetos\\2024\\arquivo.aep");
 * // Retorna: "//vfx-ml-hp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_l/Projetos/2024/arquivo.aep"
 * 
 * // Windows UNC com backslashes → forward slashes
 * normalizeNetworkPath("\\\\vfx-ml-sp.servicos.corp.tvglobo.com.br\\VFX\\renders\\output.mov");
 * // Retorna: "//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/renders/output.mov"
 * 
 * // Mac /Volumes → compatível com Windows
 * normalizeNetworkPath("/Volumes/VFX/projetos/projeto.aep");
 * // Retorna: "//smb-srvegpamvpprdpp.servicos.corp.tvglobo.com.br/VFX/projetos/projeto.aep"
 */
function normalizeNetworkPath(pathStr, options) {
	// Validação inicial
	if (!pathStr || typeof pathStr !== "string" || pathStr === "") {
		return "";
	}

	// Configuração padrão
	var opts = options || {};
	var defaultServer = opts.defaultServer || "smb-srvegpamvpprdpp.servicos.corp.tvglobo.com.br";
	var serverMap = opts.serverMap || {
		"VFX": "smb-srvegpamvpprdpp.servicos.corp.tvglobo.com.br",
		"cdesign": "egcdesign01.servicos.corp.tvglobo.com.br",
		"drive_l": "vfx-ml-hp.servicos.corp.tvglobo.com.br",
		"drive_k": "vfx-ml-hp.servicos.corp.tvglobo.com.br",
		"drive_p": "vfx-ml-sp.servicos.corp.tvglobo.com.br"
	};

	// Usa a variável global appOs definida previamente
	// var appOs = $.os.indexOf('Win') >= 0 ? 'Win' : 'Mac';
	var isMac = (appOs === 'Mac');
	var isWin = (appOs === 'Win');

	var path = pathStr.replace(/^\s+|\s+$/g, ""); // trim

	// WINDOWS: Converte drive letter → UNC
	if (isWin) {
		// Detecta drive letter: "L:" ou "L:\"
		var driveMatch = path.match(/^([A-Z]):/i);
		if (driveMatch) {
			var driveLetter = driveMatch[1].toUpperCase();
			if (DRIVE_MAP[driveLetter]) {
				var uncBase = DRIVE_MAP[driveLetter];
				var subPath = path.substring(2); // Remove "X:"
				// Normaliza barras para backslash no Windows
				subPath = subPath.replace(/\//g, "\\");
				path = uncBase + subPath;
			}
		}
	}

	// Identificação do tipo de caminho
	var isUNC = /^\\\\|^\/\//.test(path);
	var isWindowsDrive = /^[a-zA-Z]:[\\\/]/.test(path);
	var isMacVolumes = /^\/Volumes\//i.test(path);
	var isMacRoot = /^\/[^\/]/.test(path) && !isMacVolumes;

	// CONVERSÃO: WINDOWS UNC → MAC /Volumes
	if (isMac && isUNC) {
		var parts = path.replace(/^\/+/, "").split("/").filter(function (p) {
			return p !== "";
		});

		// Valida estrutura mínima: //servidor/share
		if (parts.length < 2) {
			return ""; // Caminho UNC inválido
		}

		// parts[0] = servidor (ignorado no Mac)
		// parts[1] = share (nome do volume no Mac)
		var shareName = parts[1];
		var subPath = parts.slice(2).join("/");

		var macPath = "/Volumes/" + shareName;
		if (subPath) {
			macPath += "/" + subPath;
		}

		// Escape de caracteres especiais para ExtendScript
		macPath = escapeForExtendScript(macPath);

		if (!pathExists(macPath)) alert('O VOLUME NÃO ESTÁ MONTADO');

		return macPath;
	}

	// CONVERSÃO: MAC /Volumes → WINDOWS UNC
	if (isWin && isMacVolumes) {
		var macParts = path.split("/").filter(function (p) {
			return p !== "";
		});

		// Valida estrutura: /Volumes/SHARE/...
		if (macParts.length < 2) {
			return path; // Mantém original se inválido
		}

		// macParts[0] = "Volumes"
		// macParts[1] = nome do share
		var shareName = macParts[1];

		// Determina servidor (via mapa ou padrão)
		var serverName = serverMap[shareName] || defaultServer;

		var winPath = "//" + serverName + "/" + shareName;

		// Adiciona subpastas
		for (var i = 2; i < macParts.length; i++) {
			winPath += "/" + macParts[i];
		}

		return winPath;
	}

	// NORMALIZAÇÃO SEM CONVERSÃO

	// Mac: sempre faz escape mesmo se não converteu
	if (isMac && !isWindowsDrive) {
		path = escapeForExtendScript(path);
	}

	return path;
}


/**
 * Valida se um caminho normalizado existe (ExtendScript)
 * @param {string} path - Caminho a validar
 * @returns {boolean} true se existe
 */
function pathExists(path) {
	if (!path) return false;

	try {
		var f = new File(path);
		var exists = f.exists;
		f.close();
		return exists;
	} catch (e) {
		return false;
	}
}

// ========================================
// EXEMPLO DE USO NO AFTER EFFECTS
// ========================================

/*
// ==========================================
// TESTE 1: Normalizar caminho do projeto atual
// ==========================================
if (app.project.file) {
	var projectPath = app.project.file.fsName;
	var normalized = normalizeNetworkPath(projectPath);
    
	alert("Projeto:\n" + 
		  "Original: " + projectPath + "\n" +
		  "Normalizado: " + normalized);
}

// ==========================================
// TESTE 2: Converter todos os footages
// ==========================================
function logAllFootagePaths() {
	var report = "=== CAMINHOS DE FOOTAGE ===\n\n";
    
	for (var i = 1; i <= app.project.numItems; i++) {
		var item = app.project.item(i);
	    
		if (item instanceof FootageItem && item.file) {
			var original = item.file.fsName;
			var normalized = normalizeNetworkPath(original);
		    
			report += "Item: " + item.name + "\n";
			report += "Original: " + original + "\n";
			report += "Normalizado: " + normalized + "\n";
			report += "Existe: " + (pathExists(normalized) ? "SIM" : "NÃO") + "\n";
			report += "---\n";
		}
	}
    
	// Salvar relatório em arquivo
	var reportFile = new File(Folder.desktop + "/ae_paths_report.txt");
	reportFile.open("w");
	reportFile.write(report);
	reportFile.close();
    
	alert("Relatório salvo em:\n" + reportFile.fsName);
}

// Executar
// logAllFootagePaths();

// ==========================================
// TESTE 3: Validação de conectividade
// ==========================================
function testServerConnectivity() {
	var testPaths = [
		"L:\\test",
		"K:\\test",
		"T:\\test",
		"V:\\test",
		"Y:\\test",
		"P:\\test"
	];
    
	var results = "=== TESTE DE SERVIDORES ===\n\n";
    
	for (var i = 0; i < testPaths.length; i++) {
		var testPath = testPaths[i];
		var normalized = normalizeNetworkPath(testPath);
		var accessible = false;
	    
		try {
			// Tenta acessar o caminho raiz do servidor
			var serverPath = normalized.substring(0, normalized.lastIndexOf("\\"));
			var testFolder = new Folder(serverPath);
			accessible = testFolder.exists;
		} catch(e) {
			accessible = false;
		}
	    
		results += testPath + "\n";
		results += normalized + "\n";
		results += "Status: " + (accessible ? "✓ ACESSÍVEL" : "✗ INACESSÍVEL") + "\n\n";
	}
    
	alert(results);
}

// Executar
// testServerConnectivity();

// ==========================================
// TESTE 4: Exemplo prático - Render output
// ==========================================
function setRenderOutput() {
	var comp = app.project.activeItem;
	if (!comp || !(comp instanceof CompItem)) {
		alert("Selecione uma composição primeiro!");
		return;
	}
    
	// Define output em drive letter (será convertido para UNC)
	var outputPath = "L:\\Renders\\2024\\" + comp.name + "_[####].png";
	var normalizedOutput = normalizeNetworkPath(outputPath);
    
	// Configura render queue
	var renderQueueItem = app.project.renderQueue.items.add(comp);
	var outputModule = renderQueueItem.outputModule(1);
    
	// Usa o caminho normalizado
	outputModule.file = new File(normalizedOutput);
    
	alert("Render configurado:\n" + normalizedOutput);
}

// Executar
// setRenderOutput();
*/