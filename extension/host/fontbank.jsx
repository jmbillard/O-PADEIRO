/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> banco de fontes
---------------------------------------------------------------

Um banco único para a equipe, na pasta do padeiro na rede ('BANCO DE FONTES', ao lado da pasta
'extension'). A barra chama PADX.fontBankSync de tempos em tempos: as fontes usadas no projeto aberto
que ainda não estão no banco são enviadas sozinhas, uma por chamada (cada cópia pela rede trava o
After Effects enquanto dura).

Cada fonte é guardada pelo nome PostScript: '<nome>.<ext>' (o arquivo) e '<nome>.json' (família,
estilo, quem enviou, de que máquina e projeto, quando). Sem um índice central, duas pessoas enviando
ao mesmo tempo não disputam o mesmo arquivo.

Requer o After Effects 2024 (24.0) ou mais novo.

*/

var FONT_BANK_FOLDER_NAME = 'BANCO DE FONTES';
var FONT_BANK_EXTENSIONS = ['otf', 'ttf', 'ttc', 'otc', 'dfont'];

function padFontBankFolder() {
	return new Folder(new Folder(PADX_HOST_PATH).parent.parent.fsName + '/' + FONT_BANK_FOLDER_NAME);
}

// Nome de arquivo a partir do nome PostScript (normalmente já é seguro).
function padFontBankKey(postScriptName) {
	return String(postScriptName).replace(/[\\\/:*?"<>|\s]+/g, '_');
}

function padFontBankFile(folder, key) {
	for (var e = 0; e < FONT_BANK_EXTENSIONS.length; e++) {
		var file = new File(folder.fsName + '/' + key + '.' + FONT_BANK_EXTENSIONS[e]);

		if (file.exists) return file;
	}

	return null;
}

// Fontes que não fazem sentido no banco: Adobe Fonts (ativadas pela Creative Cloud, sem arquivo
// copiável) e fontes do sistema do macOS (iguais em todas as máquinas).
function padFontBankSkip(font) {
	if (!font.location) return 'sem arquivo';

	var path = font.location.replace(/\\/g, '/');

	if (/^\/System\/Library\/Fonts\//i.test(path)) return 'sistema';
	if (/\/CoreSync\/plugins\/livetype\//i.test(path)) return 'Adobe Fonts';

	try {
		var info = app.fonts.getFontsByPostScriptName(font.name);

		if (info.length && info[0].isFromAdobeFonts) return 'Adobe Fonts';
	} catch (err) { }

	if (!new File(font.location).exists) return 'sem arquivo';

	return '';
}

function padFontBankDate(d) {
	function pad(n) {
		return (n < 10 ? '0' : '') + n;
	}

	return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function padFontBankUpload(folder, font) {
	var src = new File(font.location);
	var key = padFontBankKey(font.name);
	var ext = (src.name.match(/\.([a-z0-9]+)$/i) || [0, 'ttf'])[1].toLowerCase();
	var part = new File(folder.fsName + '/' + key + '.' + ext + '.part');

	// copia com outro nome e renomeia: quem consultar o banco no meio da cópia não vê um arquivo pela metade
	if (!src.copy(part)) throw new Error('#PAD_073 - não foi possível enviar a fonte "' + font.name + '" ao banco: ' + part.error);

	if (!part.rename(key + '.' + ext)) {
		part.remove(); // outra pessoa enviou a mesma fonte ao mesmo tempo
		return;
	}

	var meta = {
		postScriptName: font.name,
		family: font.family,
		style: font.style,
		file: key + '.' + ext,
		originalFile: File.decode(src.name),
		addedBy: system.userName,
		machine: system.machineName,
		project: app.project.file ? File.decode(app.project.file.name) : '',
		added: padFontBankDate(new Date())
	};

	try {
		saveTextFile(JSON.stringify(meta, null, '\t'), folder.fsName + '/' + key + '.json');
	} catch (err) { } // a fonte já está no banco; os dados são só informativos
}

function padFontBankNames(fonts, max) {
	var names = [];

	for (var n = 0; n < fonts.length && n < max; n++) names.push(fonts[n].name);

	return names;
}

// a: { upload } → { state, total, pending, pendingNames, uploaded, skipped, message }
// state: 'ok' (tudo no banco) | 'pending' (falta enviar) | 'none' (projeto sem fontes) |
//        'unsupported' (After Effects anterior ao 2024) | 'unavailable' (banco inacessível)
PADX.fontBankSync = function (a) {
	if (parseInt(app.version, 10) < 24) return { state: 'unsupported' };

	var fonts = app.project && app.project.numItems ? getProjectFonts() : [];
	var candidates = [];
	var skipped = 0;

	for (var f = 0; f < fonts.length; f++) {
		if (padFontBankSkip(fonts[f])) skipped++;
		else candidates.push(fonts[f]);
	}

	if (!candidates.length) return { state: 'none', total: 0, pending: 0, skipped: skipped };

	var folder = padFontBankFolder();

	if (!folder.exists && (!folder.parent.exists || !folder.create())) {
		return { state: 'unavailable', message: '#PAD_074 - o banco de fontes não está acessível: ' + folder.fsName };
	}

	var pending = [];

	for (var c = 0; c < candidates.length; c++) {
		if (!padFontBankFile(folder, padFontBankKey(candidates[c].name))) pending.push(candidates[c]);
	}

	var uploaded = '';

	if (a && a.upload && pending.length) {
		padFontBankUpload(folder, pending[0]);
		uploaded = pending.shift().name;
	}

	return {
		state: pending.length ? 'pending' : 'ok',
		total: candidates.length,
		pending: pending.length,
		pendingNames: padFontBankNames(pending, 6),
		uploaded: uploaded,
		skipped: skipped
	};
};
