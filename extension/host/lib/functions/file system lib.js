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
MAC caminho:
- /Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/C# ABERTA & INTER/ARTE RJ/ESPORTES/FUTEBOL/SUPERCOPA/SUPERCOPA REI 2026/LETTERINGS APLICADOS

Windows caminho:
- //vfx-ml-hp.servicos.corp.tvglobo.com.br/EDIT_IN_PLACE/PROMO/cdesign_output/C# ABERTA & INTER/ARTE RJ/ESPORTES/FUTEBOL/SUPERCOPA/SUPERCOPA REI 2026/LETTERINGS APLICADOS

---------------------------------------------------------------
> command line
---------------------------------------------------------------

*/
// Copia um texto para a área de transferência (Windows ou macOS).
// O texto vai por um arquivo temporário em UTF-8 para acentos e caracteres como & e # passarem intactos.
function copyToClipboard(str) {
	var tempFile = new File(tempPath + '/clipboard.txt');

	tempFile.encoding = 'UTF-8';

	if (appOs == 'Win') {
		writeFileContent(tempFile, '﻿' + str);
		system.callSystem(
			'cmd.exe /c powershell.exe -NoProfile -c "Get-Content -Raw -Encoding UTF8 -LiteralPath \'' +
				tempFile.fsName.replace(/'/g, "''") +
				'\' | Set-Clipboard"'
		);
	} else {
		writeFileContent(tempFile, str);
		system.callSystem("LANG=en_US.UTF-8 pbcopy < '" + tempFile.fsName.replace(/'/g, "'\\''") + "'");
	}

	try {
		tempFile.remove();
	} catch (err) { }
}

// A pasta do caminho ou, se ela ainda não existir, a pasta pai mais próxima que existe.
// Retorna null se nada no caminho existir (ex: volume não montado).
function nearestExistingFolder(path) {
	var folder = new Folder(path);

	while (folder != null && !folder.exists) {
		folder = folder.parent;
	}

	return folder;
}

/**
 * macOS: quando um volume de rede já está montado, uma nova montagem do mesmo share
 * recebe um sufixo (/Volumes/VFX-1, /Volumes/VFX-2 ... /Volumes/VFX-5).
 * Retorna o caminho que realmente existe, testando o volume sem sufixo e as variantes -1 a -5.
 * Se nenhuma variante contém o caminho completo (ex: pasta de output ainda não criada),
 * escolhe o volume onde existe o maior trecho do caminho.
 * No Windows, ou fora de /Volumes, devolve o caminho original.
 * @param {string} pathStr - Caminho do macOS (/Volumes/SHARE/...)
 * @returns {string} Caminho existente (ou o original, se nada for encontrado)
 */
function resolveMacVolumePath(pathStr) {
	if (appOs != 'Mac' || !pathStr || typeof pathStr !== 'string') return pathStr;

	var match = pathStr.match(/^\/Volumes\/([^\/]+)(\/.*)?$/);

	if (!match) return pathStr;

	// o caminho original (ou a variante já informada) tem prioridade
	if (new Folder(pathStr).exists) return pathStr;

	var baseName = match[1].replace(/-[1-5]$/, '');
	var parts = (match[2] || '').split('/').filter(function (p) {
		return p !== '';
	});
	var candidates = [match[1]];

	for (var i = 0; i <= 5; i++) {
		var name = i == 0 ? baseName : baseName + '-' + i;

		if (name != match[1]) candidates.push(name);
	}

	var bestPath = pathStr;
	var bestDepth = -1;

	for (var c = 0; c < candidates.length; c++) {
		var current = '/Volumes/' + candidates[c];

		if (!new Folder(current).exists) continue;

		var depth = 0;

		for (var p = 0; p < parts.length; p++) {
			current += '/' + parts[p];

			if (!new Folder(current).exists) break;
			depth++;
		}

		// caminho completo encontrado
		if (depth == parts.length) return current;

		if (depth > bestDepth) {
			bestDepth = depth;
			bestPath = '/Volumes/' + candidates[c] + (parts.length > 0 ? '/' + parts.join('/') : '');
		}
	}

	return bestPath;
}

// Abre uma pasta no sistema operacional (Windows ou macOS).
function openFolder(folderPath) {
	var folder = Folder(resolveMacVolumePath(folderPath)); // Obtém um objeto Folder representando o caminho da pasta (já ajustado para o volume montado)

	if (appOs == 'Win') {
		// Comando para abrir a pasta no Windows Explorer
		system.callSystem('explorer ' + Folder.decode(folder.fsName));
	} else if (appOs == 'Mac') {
		// Comando para abrir a pasta no Finder (macOS)
		system.callSystem('open "' + Folder.decode(folder.fsName) + '"');
	}
}

function getFileExt(fileName) {
	var dotIndex = fileName.lastIndexOf('.');
	if (dotIndex === -1) return '';
	return fileName.substring(dotIndex).toLowerCase();
}
/*

---------------------------------------------------------------
> folders
---------------------------------------------------------------

*/

/*

---------------------------------------------------------------
> files
---------------------------------------------------------------

*/

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

function writeFileContent(newFile, fileContent) {
	newFile.open('w');
	newFile.write(fileContent);
	newFile.close();

	return newFile;
}

// copy all fonts used in the project...
// -------------------------------------------------------

// -------------------------------------------------------

/**
 * Converte caminho UNC do Windows para caminho do macOS
 * Exemplo:
 * //servidor/EDIT_IN_PLACE/pasta/arquivo
 * -> /Volumes/EDIT_IN_PLACE/pasta/arquivo
 */

/**
 * Normaliza caminhos de rede para o sistema atual (Windows ou macOS)
 * Compatível com After Effects ExtendScript
 * @param {string} pathStr - Caminho a ser normalizado
 * @param {Object} options - Opções de configuração
 * @param {string} options.defaultServer - Nome do servidor para conversões Mac→Win
 * @param {Object} options.serverMap - Mapa de shares para servidores específicos
 * @returns {string} Caminho normalizado ou string vazia se inválido
 * Normaliza caminhos de rede entre sistemas operacionais
 * Utiliza as globais DRIVE_MAP e UNC_TO_DRIVE definidas no arquivo de configuração
 * @param {string} pathStr - Caminho a ser normalizado
 * @param {object} options - Opções de configuração
 * @param {boolean} options.forceWin - Força conversão para formato Windows
 * @param {boolean} options.forceMac - Força conversão para formato Mac
 * @param {boolean} options.forceBackslash - Usa backslash na saída (para colar no Explorer)
 * @param {boolean} options.forceDriveLetter - Converte UNC para letra de drive quando possível
 * @param {boolean} options.silent - Não exibe alertas
 * @returns {string} Caminho normalizado
 */
function normalizeNetworkPath(pathStr, options) {
	// Validação inicial
	if (!pathStr || typeof pathStr !== "string" || pathStr === "") {
		return "";
	}

	// Configuração padrão
	var opts = options || {};
	var forceWin = opts.forceWin || false;
	var forceMac = opts.forceMac || false;
	var forceBackslash = opts.forceBackslash || false;
	var forceDriveLetter = opts.forceDriveLetter || false;
	var silent = opts.silent || false;

	// Determina o comportamento do SO (pode ser sobrescrito)
	var isMac = (appOs === 'Mac' || forceMac) && !forceWin;
	var isWin = (appOs === 'Win' || forceWin) && !forceMac;

	var path = pathStr.trim();

	// Normaliza barras inicialmente para forward slash (facilita processamento)
	var normalizedPath = path.replace(/\\/g, "/");

	// DETECÇÃO DO TIPO DE CAMINHO
	var isWindowsDrive = /^[a-zA-Z]:[\\\/]/i.test(path);
	var isUNC = /^\\\\|^\/\//.test(path);
	var isMacVolumes = /^\/Volumes\//i.test(path);

	// CONVERSÃO: DRIVE LETTER → UNC (usando DRIVE_MAP global)
	if (isWindowsDrive) {
		var driveMatch = path.match(/^([A-Z]):/i);
		if (driveMatch) {
			var driveLetter = driveMatch[1].toUpperCase();
			if (DRIVE_MAP && DRIVE_MAP[driveLetter]) {
				var uncBase = DRIVE_MAP[driveLetter];
				var subPath = normalizedPath.substring(2); // Remove "X:"
				normalizedPath = uncBase + subPath;
				isUNC = true;
				isWindowsDrive = false;
			}
		}
	}

	// CONVERSÃO: UNC → MAC /Volumes
	if (isMac && isUNC) {
		// Remove barras iniciais e divide o caminho
		var cleanPath = normalizedPath.replace(/^\/+/, "");
		var parts = cleanPath.split("/").filter(function (p) {
			return p !== "";
		});

		// Valida estrutura mínima: //servidor/share
		if (parts.length < 2) {
			if (!silent) alert("#PAD_070 - Caminho UNC inválido: estrutura mínima não encontrada");
			return "";
		}

		// parts[0] = servidor (ignorado no Mac - servidor implícito na montagem)
		// parts[1] = share (nome do volume no Mac)
		var serverName = parts[0];
		var shareName = parts[1];
		var subPathParts = parts.slice(2);

		// Monta o caminho Mac
		var macPath = "/Volumes/" + shareName;
		if (subPathParts.length > 0) {
			macPath += "/" + subPathParts.join("/");
		}

		// Usa o volume realmente montado (VOLUME, VOLUME-1 ... VOLUME-5)
		macPath = resolveMacVolumePath(macPath);

		// Escape de caracteres especiais para ExtendScript
		if (typeof escapeForExtendScript === "function") {
			macPath = escapeForExtendScript(macPath);
		}

		// Verifica se o volume está montado
		if (typeof pathExists === "function" && !pathExists(macPath.replace(/^(\/Volumes\/[^\/]+).*$/, "$1"))) {
			if (!silent && appOs === 'Mac') {
				alert("#PAD_071 - O VOLUME '" + shareName + "' NÃO ESTÁ MONTADO\n\n" +
					"Servidor: " + serverName + "\n" +
					"Monte o volume antes de continuar.");
			}
		}

		return macPath;
	}

	// CONVERSÃO: MAC /Volumes → WINDOWS UNC (usando UNC_TO_DRIVE reverso)
	if (isWin && isMacVolumes) {
		var macParts = normalizedPath.split("/").filter(function (p) {
			return p !== "";
		});

		// Valida estrutura: /Volumes/SHARE/...
		if (macParts.length < 2) {
			return applyBackslash(normalizedPath, forceBackslash);
		}

		// macParts[0] = "Volumes"
		// macParts[1] = nome do share
		var shareName = macParts[1];
		var subPathParts = macParts.slice(2);

		// Procura o servidor correto nas globais DRIVE_MAP
		var serverName = findServerForShare(shareName);

		if (!serverName) {
			if (!silent) {
				alert("#PAD_072 - Share '" + shareName + "' não encontrado no mapeamento.\n" +
					"Usando servidor padrão.");
			}
			serverName = "vfx-ml-sp.servicos.corp.tvglobo.com.br";
		}

		var winPath = "//" + serverName + "/" + shareName;

		if (subPathParts.length > 0) {
			winPath += "/" + subPathParts.join("/");
		}

		// Tenta converter para drive letter se solicitado
		if (forceDriveLetter) {
			winPath = convertToDriveLetter(winPath);
		}

		return applyBackslash(winPath, forceBackslash);
	}

	// CONVERSÃO: UNC → DRIVE LETTER (Windows, se solicitado)
	if (isWin && isUNC && forceDriveLetter) {
		normalizedPath = convertToDriveLetter(normalizedPath);
	}

	// NORMALIZAÇÃO FINAL

	// Mac: usa o volume realmente montado (VOLUME, VOLUME-1 ... VOLUME-5)
	if (isMac) normalizedPath = resolveMacVolumePath(normalizedPath);

	// Mac: sempre faz escape mesmo se não converteu
	if (isMac && typeof escapeForExtendScript === "function") {
		normalizedPath = escapeForExtendScript(normalizedPath);
	}

	// Windows com forceBackslash: converte para backslash
	if (isWin || forceBackslash) {
		normalizedPath = applyBackslash(normalizedPath, forceBackslash);
	}

	return normalizedPath;
}

/**
 * Aplica backslash ao caminho se solicitado
 * @param {string} path - Caminho com forward slashes
 * @param {boolean} apply - Se deve aplicar a conversão
 * @returns {string} Caminho com backslashes (se apply = true)
 */
function applyBackslash(path, apply) {
	if (!apply) return path;
	return path.replace(/\//g, "\\");
}

/**
 * Encontra o servidor correspondente a um share usando as globais
 * @param {string} shareName - Nome do share/volume
 * @returns {string|null} Nome do servidor ou null se não encontrado
 */
function findServerForShare(shareName) {
	if (!DRIVE_MAP) return null;

	// Procura em DRIVE_MAP por um caminho que contenha o share
	for (var drive in DRIVE_MAP) {
		if (DRIVE_MAP.hasOwnProperty(drive)) {
			var uncPath = DRIVE_MAP[drive];
			// Extrai servidor e share do UNC
			var match = uncPath.match(/^\/\/([^\/]+)\/(.+)/);
			if (match) {
				var server = match[1];
				var fullShare = match[2];

				// Verifica se o share corresponde (pode ser parte do caminho)
				if (fullShare === shareName ||
					fullShare.indexOf(shareName) === 0 ||
					fullShare.split("/").pop() === shareName) {
					return server;
				}
			}
		}
	}

	// Mapeamento adicional para shares conhecidos
	var knownShares = {
		'VFX': 'vfx-ml-sp.servicos.corp.tvglobo.com.br',
		'cdesign': 'egcdesign01.servicos.corp.tvglobo.com.br',
		'EDIT_IN_PLACE': 'vfx-ml-hp.servicos.corp.tvglobo.com.br',
		'promo_ber': '10.193.48.13'
	};

	return knownShares[shareName] || null;
}

/**
 * Converte caminho UNC para letra de drive usando UNC_TO_DRIVE global
 * @param {string} uncPath - Caminho UNC
 * @returns {string} Caminho com letra de drive ou original se não mapeado
 */
function convertToDriveLetter(uncPath) {
	if (!UNC_TO_DRIVE) return uncPath;

	// Normaliza para comparação
	var normalizedUNC = uncPath.replace(/\\/g, "/").toLowerCase();

	// Procura o UNC mais longo que corresponda ao início do caminho
	var bestMatch = null;
	var bestMatchLength = 0;

	for (var unc in UNC_TO_DRIVE) {
		if (UNC_TO_DRIVE.hasOwnProperty(unc)) {
			var normalizedKey = unc.toLowerCase();

			if (normalizedUNC.indexOf(normalizedKey) === 0) {
				if (normalizedKey.length > bestMatchLength) {
					bestMatch = unc;
					bestMatchLength = normalizedKey.length;
				}
			}
		}
	}

	if (bestMatch) {
		var driveLetter = UNC_TO_DRIVE[bestMatch]; // Ex: "L:"
		var remainder = uncPath.substring(bestMatch.length);
		return driveLetter + remainder;
	}

	return uncPath;
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
