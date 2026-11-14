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

// Nome do arquivo copiado. As fontes do Adobe Fonts ficam em arquivos ocultos e numerados
// ('.../CoreSync/plugins/livetype/.r/.34534.otf'): nesse caso (ou sem extensão de fonte), o arquivo leva
// o nome PostScript da fonte e a extensão do formato de verdade (lido no começo do arquivo).
function fontCollectName(file, postScriptName) {
	var name = File.decode(file.name);
	var path = file.fsName.replace(/\\/g, '/');

	if (!/^\./.test(name) && !/\/CoreSync\/plugins\/livetype\//i.test(path) && /\.(ttf|otf|ttc|otc)$/i.test(name)) return name;

	return String(postScriptName || 'fonte').replace(/[\\\/:*?"<>|]+/g, '_') + fontFileExtension(file);
}

// '.otf' (CFF: começa com 'OTTO'), '.ttc' (coleção: 'ttcf') ou '.ttf' (TrueType).
function fontFileExtension(file) {
	var magic = '';

	try {
		file.encoding = 'BINARY';
		file.open('r');
		magic = file.read(4);
		file.close();
	} catch (err) {
		try {
			file.close();
		} catch (e) { }
	}

	if (magic === 'OTTO') return '.otf';
	if (magic === 'ttcf') return '.ttc';

	return '.ttf';
}

// Copia os arquivos das fontes usadas no projeto para 'savePath'.
// Retorna o caminho da pasta, ou '' se nenhuma fonte pôde ser copiada.
function fontCollect(savePath) {
	var saveFolder = new Folder(savePath);
	var fonts = getProjectFonts();
	var copiedFiles = {};
	var failArray = [];

	if (!saveFolder.exists) padEnsureFolder(saveFolder.fsName); // na rede: com os planos B e C do padeiro

	for (var f = 0; f < fonts.length; f++) {
		var fontSrcFile = new File(fonts[f].location);

		// fontes sem arquivo local (ex: Adobe Fonts) não podem ser copiadas
		if (!fonts[f].location || !fontSrcFile.exists) {
			failArray.push(fonts[f].name);
			continue;
		}

		// estilos diferentes podem vir do mesmo arquivo
		if (copiedFiles[fontSrcFile.fsName]) continue;

		var fontFileName = fontCollectName(fontSrcFile, fonts[f].name);

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
	var copied = [];

	for (var i = 0; i < fontFiles.length; i++) {
		var destFile = new File(destFolder.fsName + '/' + fontFiles[i].displayName);

		if (destFile.exists) {
			alreadyInstalled++;
			continue;
		}

		if (fontFiles[i].copy(destFile)) {
			installed++;
			copied.push(destFile.fsName);
		} else {
			errors.push(fontFiles[i].displayName);
		}
	}

	// registra as copiadas no sistema na hora (como o Catálogo de Fontes): o macOS avisa os apps abertos e o After
	// Effects passa a enxergar a fonte sem reiniciar. (antes: 'atsutil databases -removeUser' e 'atsutil server
	// -shutdown', que apagavam o cache de fontes do usuário e só voltavam ao normal reiniciando ou relogando)
	if (copied.length) padRegisterMacFonts(copied);

	return { total: fontFiles.length, installed: installed, already: alreadyInstalled, errors: errors };
}

// macOS: CTFontManagerRegisterFontsForURL (CoreText) por um JavaScript for Automation (osascript), escopo 2: o do
// usuário, que fica. Já registrada (o macOS também registra sozinho o que entra em ~/Library/Fonts): sem efeito.
function padRegisterMacFonts(paths) {
	var lines = ['ObjC.import("CoreText");', 'ObjC.import("Foundation");', 'var paths = ['];

	for (var i = 0; i < paths.length; i++) {
		lines.push('\t"' + String(paths[i]).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"' + (i < paths.length - 1 ? ',' : ''));
	}

	lines.push('];');
	lines.push('paths.forEach(function (p) {');
	lines.push('\ttry { $.CTFontManagerRegisterFontsForURL($.NSURL.fileURLWithPath(p), 2, null); } catch (e) { }');
	lines.push('});');

	var scriptFile = new File(tempPath + '/register_fonts.js');

	try {
		scriptFile.encoding = 'UTF-8';
		writeFileContent(scriptFile, lines.join('\n'));
		system.callSystem('osascript -l JavaScript "' + scriptFile.fsName + '"');
	} catch (err) { }

	try {
		scriptFile.remove();
	} catch (err) { }
}

// Depois de instalar: o After Effects confere as pastas de fontes dele (2024.6 ou mais novo) e as camadas com uma
// fonte substituída (faltando ao abrir o projeto) passam para a fonte de verdade, se ela já aparece (o texto
// redesenha na hora). → { supported, replaced, missing: [nomes PostScript ainda substituídos] }
function padFontsSync() {
	if (!app.fonts || !app.project || app.project.usedFonts === undefined) return { supported: false, replaced: 0, missing: [] };

	try {
		if (app.fonts.pollForAndPushNonSystemFontFoldersChanges) app.fonts.pollForAndPushNonSystemFontFoldersChanges();
	} catch (err) { }

	var used = app.project.usedFonts;
	var swaps = [];
	var missing = [];
	var replaced = 0;
	var seen = {};

	for (var u = 0; u < used.length; u++) {
		var font = used[u].font;

		if (!font || !font.isSubstitute || seen[font.postScriptName]) continue;

		seen[font.postScriptName] = true;

		var real = padRealFont(font.postScriptName);

		if (real) swaps.push({ from: font, to: real });
		else missing.push(String(font.postScriptName));
	}

	if (swaps.length) {
		padUndoBegin('PADEIRO - fontes instaladas');

		try {
			for (var s = 0; s < swaps.length; s++) {
				try {
					app.project.replaceFont(swaps[s].from, swaps[s].to);
					replaced++;
				} catch (err) {
					missing.push(String(swaps[s].from.postScriptName));
				}
			}
		} finally {
			padUndoEnd();
		}
	}

	return { supported: true, replaced: replaced, missing: missing };
}

// A fonte instalada (não a substituta) com esse nome PostScript, ou null.
function padRealFont(postScriptName) {
	var list = [];

	try {
		list = app.fonts.getFontsByPostScriptName(postScriptName) || [];
	} catch (err) { }

	for (var i = 0; i < list.length; i++) {
		if (list[i] && !list[i].isSubstitute) return list[i];
	}

	return null;
}
