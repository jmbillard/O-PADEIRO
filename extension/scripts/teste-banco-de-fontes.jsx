/*

---------------------------------------------------------------
> teste do banco de fontes (O PADEIRO)
---------------------------------------------------------------

Para testar o banco de fontes com uma pasta de verdade. No After Effects 2024 ou mais novo:
Arquivo > Scripts > Executar arquivo de script… e escolha este arquivo.

  1. pede a pasta das fontes (.ttf, .otf, .ttc, .otc, com as subpastas) e quantas usar
  2. instala as fontes neste computador, sem janelas (macOS: ~/Library/Fonts; Windows: as fontes do usuário),
     do mesmo jeito que o padeiro instala
  3. espera o After Effects enxergar as fontes novas
  4. cria a comp TESTE BANCO DE FONTES com um layer de texto por fonte (o nome dela, escrito nela)
  5. salva o projeto: a barra do padeiro percebe o projeto salvo e envia as fontes para o banco, em segundo plano
     (o botão Fontes mostra a contagem). precisa das chaves de envio ligadas (configuração > fontes)

Nada é apagado: as fontes já instaladas ficam como estão. O projeto é um projeto novo (o aberto pede para salvar).

*/

(function () {
	var TITLE = 'O PADEIRO · teste do banco de fontes';
	var FONT_EXT = /\.(ttf|otf|ttc|otc)$/i;
	var isWin = $.os.indexOf('Windows') >= 0;

	if (!app.fonts || !app.project || app.project.usedFonts === undefined) {
		alert('Este teste precisa do After Effects 2024 (24.0) ou mais novo.', TITLE);
		return;
	}

	if (app.preferences.getPrefAsLong('Main Pref Section', 'Pref_SCRIPTING_FILE_NETWORK_SECURITY') != 1) {
		alert('Ligue "Allow Scripts to Write Files and Access Network" nas preferências (Scripting & Expressions) e rode de novo.', TITLE);
		return;
	}

	// 1. a pasta e quantas fontes
	var source = Folder.selectDialog('A pasta com as fontes para o teste');

	if (!source) return;

	var files = [];

	gather(source, 0);

	if (!files.length) {
		alert('Nenhum arquivo de fonte (.ttf, .otf, .ttc, .otc) nessa pasta.', TITLE);
		return;
	}

	var answer = prompt(files.length + ' arquivos de fonte na pasta.\nQuantos usar no teste? (um layer de texto por fonte)', String(Math.min(files.length, 100)), TITLE);

	if (answer === null) return;

	var limit = parseInt(answer, 10);

	if (isNaN(limit) || limit < 1) limit = Math.min(files.length, 100);
	files = files.slice(0, Math.min(limit, files.length));

	// 2. instalar (o mesmo jeito do padeiro: host/lib/functions/fonts lib.js)
	var installed = isWin ? installWin(files) : installMac(files);

	// 3. o After Effects enxerga as novas (até ~20 s)
	var wanted = {};

	for (var w = 0; w < files.length; w++) wanted[decodeURI(files[w].name).toLowerCase()] = true;

	var found = [];

	for (var tries = 0; tries < 40; tries++) {
		try {
			if (app.fonts.pollForAndPushNonSystemFontFoldersChanges) app.fonts.pollForAndPushNonSystemFontFoldersChanges();
		} catch (err) { }

		found = fontsFromFiles(wanted);
		if (countKeys(found.byFile) >= countKeys(wanted)) break;
		$.sleep(500);
	}

	if (!found.list.length) {
		alert('O After Effects ainda não enxerga nenhuma das fontes instaladas. Feche e abra o After Effects e rode o teste de novo (as fontes já instaladas são puladas).', TITLE);
		return;
	}

	// 4. a comp: um layer de texto por fonte, em colunas
	app.beginUndoGroup('O PADEIRO: teste do banco de fontes');

	var comp = app.project.items.addComp('TESTE BANCO DE FONTES', 1920, 1080, 1, 10, 25);
	var perColumn = 22;
	var columns = Math.ceil(found.list.length / perColumn);
	var colWidth = 1840 / Math.max(1, columns);

	for (var f = 0; f < found.list.length; f++) {
		var font = found.list[f];
		var layer = comp.layers.addText(font.postScriptName);
		var textProp = layer.property('Source Text');
		var doc = textProp.value;

		doc.font = font.postScriptName;
		doc.fontSize = columns > 3 ? 22 : 34;
		doc.applyFill = true;
		doc.fillColor = [1, 1, 1];
		doc.justification = ParagraphJustification.LEFT_JUSTIFY;
		doc.text = font.familyName + ' ' + font.styleName;
		textProp.setValue(doc);

		layer.name = font.postScriptName;
		layer.property('Transform').property('Position').setValue([40 + Math.floor(f / perColumn) * colWidth, 60 + (f % perColumn) * 46]);
	}

	comp.openInViewer();
	app.endUndoGroup();

	// 5. salvar: a barra do padeiro envia as fontes do projeto salvo para o banco
	var target = File.saveDialog('Salvar o projeto do teste (a barra do padeiro envia as fontes ao salvar)', isWin ? 'After Effects:*.aep' : function (file) {
		return file instanceof Folder || /\.aep$/i.test(file.name);
	});
	var saved = false;

	if (target) {
		if (!/\.aep$/i.test(target.name)) target = new File(target.fsName + '.aep');
		app.project.save(target);
		saved = true;
	}

	var missing = [];

	for (var k in wanted) {
		if (wanted.hasOwnProperty(k) && !found.byFile[k]) missing.push(k);
	}

	alert(
		'Fontes na pasta: ' + files.length + '\n' +
		'Instaladas agora: ' + installed.installed + ' · já estavam instaladas: ' + installed.already + (installed.errors.length ? ' · com erro: ' + installed.errors.length : '') + '\n' +
		'Layers de texto criados: ' + found.list.length + '\n' +
		(missing.length ? 'O After Effects não reconheceu ' + missing.length + ' arquivo(s): ' + missing.slice(0, 8).join(', ') + (missing.length > 8 ? '…' : '') + '\n' : '') +
		'\n' + (saved ? 'Projeto salvo. A barra do padeiro envia as fontes para o banco em alguns segundos (o botão Fontes mostra a contagem). Confira depois a pasta do banco.' : 'Projeto não salvo: salve para a barra do padeiro enviar as fontes para o banco.'),
		TITLE
	);

	/* ---------- as funções ---------- */

	// os arquivos de fonte da pasta e das subpastas (até 6 níveis), sem os escondidos
	function gather(folder, depth) {
		var list = folder.getFiles();

		for (var i = 0; i < list.length; i++) {
			var name = decodeURI(list[i].name);

			if (name.charAt(0) === '.') continue;
			if (list[i] instanceof Folder) {
				if (depth < 6) gather(list[i], depth + 1);
			} else if (FONT_EXT.test(name)) {
				files.push(list[i]);
			}
		}
	}

	function countKeys(o) {
		var n = 0;

		for (var key in o) {
			if (o.hasOwnProperty(key)) n++;
		}

		return n;
	}

	// as fontes do After Effects cujo arquivo é um dos da pasta (pelo nome do arquivo: a instalada é uma cópia).
	// um .ttc traz várias. → { list: [Font], byFile: { nome do arquivo: true } }
	function fontsFromFiles(names) {
		var out = { list: [], byFile: {} };
		var seen = {};
		var groups = app.fonts.allFonts;

		for (var g = 0; g < groups.length; g++) {
			for (var i = 0; i < groups[g].length; i++) {
				var font = groups[g][i];
				var location = '';

				try {
					location = font.location ? String(font.location) : '';
				} catch (err) { }

				if (!location || font.isSubstitute) continue;

				var base = location.replace(/\\/g, '/').replace(/^.*\//, '').toLowerCase();

				if (!names[base] || seen[font.postScriptName]) continue;

				seen[font.postScriptName] = true;
				out.byFile[base] = true;
				out.list.push(font);
			}
		}

		return out;
	}

	// macOS: copia para ~/Library/Fonts e registra no sistema (CoreText), sem pedir senha
	function installMac(list) {
		var dest = new Folder('~/Library/Fonts');
		var res = { installed: 0, already: 0, errors: [] };
		var copied = [];

		if (!dest.exists) dest.create();

		for (var i = 0; i < list.length; i++) {
			var to = new File(dest.fsName + '/' + decodeURI(list[i].name));

			if (to.exists) {
				res.already++;
				continue;
			}

			if (list[i].copy(to.fsName)) {
				res.installed++;
				copied.push(to.fsName);
			} else {
				res.errors.push(decodeURI(list[i].name));
			}
		}

		if (copied.length) {
			var lines = ['ObjC.import("CoreText");', 'ObjC.import("Foundation");', 'var paths = ['];

			for (var c = 0; c < copied.length; c++) lines.push('\t"' + copied[c].replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"' + (c < copied.length - 1 ? ',' : ''));
			lines.push('];');
			lines.push('paths.forEach(function (p) { try { $.CTFontManagerRegisterFontsForURL($.NSURL.fileURLWithPath(p), 2, null); } catch (e) { } });');

			var js = new File(Folder.temp.fsName + '/padeiro_teste_fontes.js');

			js.encoding = 'UTF-8';
			js.open('w');
			js.write(lines.join('\n'));
			js.close();
			system.callSystem('osascript -l JavaScript "' + js.fsName + '"');
			js.remove();
		}

		return res;
	}

	// Windows: a pasta especial de fontes (Shell.Application) instala para o usuário; 0x14 = sem janela e "sim para
	// todos" (a já instalada fica como está). conta como já instalada a que já está na pasta de fontes do usuário
	function installWin(list) {
		var res = { installed: 0, already: 0, errors: [] };
		var userFonts = new Folder(Folder.userData.fsName + '/../Local/Microsoft/Windows/Fonts');
		var ps = ['$fonts = (New-Object -ComObject Shell.Application).Namespace(0x14)'];

		for (var i = 0; i < list.length; i++) {
			var name = decodeURI(list[i].name);

			if (new File(userFonts.fsName + '/' + name).exists || new File(Folder.system.fsName + '/Fonts/' + name).exists) {
				res.already++;
				continue;
			}

			ps.push("$fonts.CopyHere('" + list[i].fsName.replace(/'/g, "''") + "', 0x14)");
			res.installed++;
		}

		if (ps.length > 1) {
			var script = new File(Folder.temp.fsName + '/padeiro_teste_fontes.ps1');

			script.encoding = 'UTF-8';
			script.open('w');
			script.write('﻿' + ps.join('\r\n'));
			script.close();
			system.callSystem('cmd.exe /c powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + script.fsName + '"');
			script.remove();
		}

		return res;
	}
})();
