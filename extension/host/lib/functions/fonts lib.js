/* eslint-disable no-empty */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🔤 fontes: listar, coletar e instalar
---------------------------------------------------------------

*/

var FONT_FILE_EXTENSIONS = ['.ttf', '.otf'];

// Fontes usadas nos layers de texto de todas as comps, incluindo as que aparecem só em
// keyframes de texto. Retorna [{ name, location }] sem repetições (pelo nome da fonte).
function getProjectFonts() {
	var fonts = [];
	var seen = {};
	var compArray = getComps();

	function addFont(textDoc) {
		var fontName = textDoc.font;

		if (!fontName || seen[fontName]) return;

		seen[fontName] = true;
		fonts.push({ name: fontName, location: textDoc.fontLocation ? decodeURI(textDoc.fontLocation) : '' });
	}

	for (var c = 0; c < compArray.length; c++) {
		var comp = compArray[c];

		for (var l = 1; l <= comp.numLayers; l++) {
			var aLayer = comp.layer(l);

			if (!(aLayer instanceof TextLayer)) continue;

			try {
				var doc = aLayer.property('ADBE Text Properties').property('ADBE Text Document');

				addFont(doc.value);

				for (var k = 1; k <= doc.numKeys; k++) {
					addFont(doc.keyValue(k));
				}
			} catch (err) { }
		}
	}

	return fonts;
}

// Copia os arquivos das fontes usadas no projeto para 'savePath'.
// Retorna o caminho da pasta, ou '' se nenhuma fonte pôde ser copiada.
function fontCollect(savePath) {
	var saveFolder = new Folder(savePath);
	var fonts = getProjectFonts();
	var copiedFiles = {};
	var failArray = [];

	if (!saveFolder.exists) saveFolder.create();

	for (var f = 0; f < fonts.length; f++) {
		var fontSrcFile = new File(fonts[f].location);

		// fontes sem arquivo local (ex: Adobe Fonts) não podem ser copiadas
		if (!fonts[f].location || !fontSrcFile.exists) {
			failArray.push(fonts[f].name);
			continue;
		}

		// estilos diferentes podem vir do mesmo arquivo
		if (copiedFiles[fontSrcFile.fsName]) continue;

		var fontFileName = fontSrcFile.displayName;

		if (!fontFileName.match(/(\.ttf|\.otf)$/i)) fontFileName = 'cc_' + fonts[f].name + '.ttf';

		if (fontSrcFile.copy(new File(savePath + '/' + fontFileName))) {
			copiedFiles[fontSrcFile.fsName] = true;
		} else {
			failArray.push(fonts[f].name);
		}
	}

	if (failArray.length > 0) {
		alert(lol + '#PAD_034 - estas fontes não puderam ser copiadas:\n\n' + failArray.join('\n'));
	}

	if (saveFolder.getFiles().length == 0) {
		saveFolder.remove();
		return '';
	}

	return savePath;
}

// Arquivos de fonte (.ttf / .otf) de uma pasta e das subpastas.
function getFontFiles(folder, fileArray) {
	var items = folder.getFiles();

	for (var i = 0; i < items.length; i++) {
		if (items[i] instanceof Folder) {
			getFontFiles(items[i], fileArray);
		} else if (FONT_FILE_EXTENSIONS.indexOf(getFileExt(items[i].displayName)) >= 0) {
			fileArray.push(items[i]);
		}
	}

	return fileArray;
}

// Instala as fontes de uma pasta (e subpastas) no sistema do usuário, sem janelas: o painel mostra
// o resultado. Retorna { total, installed, already, errors: [nomes] } (no Windows, 'installed' = enviadas).
function installFonts(fontsPath) {
	var srcFolder = new Folder(fontsPath);

	if (!srcFolder.exists) throw new Error('#PAD_006 - a pasta de fontes não foi localizada...');

	var fontFiles = getFontFiles(srcFolder, []);

	if (fontFiles.length == 0) throw new Error('#PAD_035 - nenhum arquivo .ttf ou .otf na pasta de fontes.');

	return appOs == 'Win' ? installWinFonts(fontFiles) : installMacFonts(fontFiles);
}

// Resumo da instalação em uma linha (aviso da barra).
function installFontsMessage(res) {
	var msg = 'fontes instaladas: ' + res.installed;

	if (res.already > 0) msg += ' · já instaladas: ' + res.already;
	if (res.errors.length > 0) msg += ' · não foi possível instalar: ' + res.errors.join(', ');

	return msg;
}

// Windows: instala pela pasta especial de fontes (Shell.Application), que registra a fonte para o usuário.
// O comando vai num arquivo .ps1 temporário: na linha do cmd ele estoura o limite de tamanho
// quando há muitas fontes.
function installWinFonts(fontFiles) {
	var ps = [
		"Write-Host '------------- O PADEIRO -------------' -ForegroundColor white -BackgroundColor DarkRed",
		'$fonts = (New-Object -ComObject Shell.Application).Namespace(0x14)'
	];

	for (var i = 0; i < fontFiles.length; i++) {
		var fontPath = fontFiles[i].fsName.replace(/'/g, "''");
		var fontName = fontFiles[i].displayName.replace(/'/g, "''");

		ps.push("Write-Host '> instalando " + fontName + "...'");
		// 4 = sem janela de progresso, 16 = 'sim para todos' (fonte já instalada)
		ps.push("$fonts.CopyHere('" + fontPath + "', 0x14)");
	}

	var scriptFile = new File(tempPath + '/install_fonts.ps1');

	scriptFile.encoding = 'UTF-8';
	writeFileContent(scriptFile, '\uFEFF' + ps.join('\r\n'));

	system.callSystem('cmd.exe /c powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + scriptFile.fsName + '"');

	try {
		scriptFile.remove();
	} catch (err) { }

	return { total: fontFiles.length, installed: fontFiles.length, already: 0, errors: [] };
}

// macOS: copia para ~/Library/Fonts (pasta do usuário, sem pedir senha).
function installMacFonts(fontFiles) {
	var destFolder = new Folder('~/Library/Fonts');

	if (!destFolder.exists) destFolder.create();

	var installed = 0;
	var alreadyInstalled = 0;
	var errors = [];

	for (var i = 0; i < fontFiles.length; i++) {
		var destFile = new File(destFolder.fsName + '/' + fontFiles[i].displayName);

		if (destFile.exists) {
			alreadyInstalled++;
			continue;
		}

		if (fontFiles[i].copy(destFile)) {
			installed++;
		} else {
			errors.push(fontFiles[i].displayName);
		}
	}

	// atualiza o cache de fontes do sistema para os apps enxergarem as fontes novas
	if (installed > 0) {
		try {
			system.callSystem('atsutil databases -removeUser');
			system.callSystem('atsutil server -shutdown');
			system.callSystem('atsutil server -ping');
		} catch (err) { }
	}

	return { total: fontFiles.length, installed: installed, already: alreadyInstalled, errors: errors };
}
