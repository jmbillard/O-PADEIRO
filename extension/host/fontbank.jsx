/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> banco de fontes
---------------------------------------------------------------

Uma pasta na rede (configuração > FONTES) com as fontes dos projetos abertos. Quem copia é o painel da
barra (o Node, sem travar o After Effects): o host só diz quais fontes o projeto usa, onde estão os arquivos
e onde fica a pasta de fontes do projeto; instala as que faltam (do banco) e troca uma fonte por outra no
projeto inteiro.

'FONTS' no O_PADEIRO_GLOBAL_config.json: { bank: '<pasta>', upload: true }. neste computador (meu usuário):
fontsUpload (false: as fontes deste computador não vão para o banco).

Requer o After Effects 2024 (24.0) ou mais novo (Project.usedFonts, replaceFont e app.fonts).

*/

var PAD_DEFAULT_FONTS = { bank: '', upload: true };

function padCleanFonts(o) {
	o = o || {};

	return { bank: padProjectPath(o.bank || ''), upload: o.upload !== false };
}

function padReadFonts() {
	try {
		var data = padConfigData();

		return data.FONTS ? padCleanFonts(data.FONTS) : PAD_DEFAULT_FONTS;
	} catch (err) {
		return PAD_DEFAULT_FONTS;
	}
}

// As fontes deste computador vão para o banco? (configuração > FONTES, neste computador)
function padMachineFontsUpload() {
	return padMachineData().fontsUpload !== false;
}

function padFontsSupported() {
	try {
		return !!(app.project && app.project.usedFonts !== undefined && app.fonts);
	} catch (err) {
		return false;
	}
}

// A pasta de fontes da estrutura do projeto (o coletar junta lá): a raiz gravada no projeto ou a de cima
// da pasta de projetos. '' sem o projeto salvo. mount: pode montar o share (só depois de um clique)
function padProjectFontsFolder(mount) {
	var file = app.project.file;
	var settings = padReadCollect();
	var sub = padCollectFolderPath(settings, 'fontes');
	var m = padMetaRead();
	var root = '';

	if (m.pasta) root = mount ? padMountedPath(padPath(m.pasta)) : padResolvedPath(padPath(m.pasta));
	else if (file) root = padCollectRoot(file, settings);

	return root && sub ? new Folder(root + '/' + sub).fsName : '';
}

// As fontes usadas no projeto aberto e onde ficam as pastas. leve o bastante para a barra chamar de tempos
// em tempos. → { supported, fonts: [{ name, family, style, location, missing, layers }], bank, upload,
//   machineUpload, projectFonts, project, user, machine }
PADX.fontsProject = function () {
	var cfg = padReadFonts();
	var out = {
		supported: padFontsSupported(),
		fonts: [],
		bank: cfg.bank ? padResolvedPath(padPath(cfg.bank)) : '', // a barra lê de tempos em tempos: nunca monta
		bankDisplay: cfg.bank,
		upload: cfg.upload,
		machineUpload: padMachineFontsUpload(),
		projectFonts: '',
		project: app.project.file ? decodeURI(app.project.file.name) : '',
		user: padMachineUser(),
		machine: system.machineName,
		os: appOs
	};

	if (!out.supported) return out;

	try {
		out.projectFonts = padProjectFontsFolder();
	} catch (err) { }

	var used = app.project.usedFonts;

	for (var i = 0; i < used.length; i++) {
		var font = used[i].font;

		if (!font) continue;

		var location = '';

		try {
			location = font.location ? String(font.location) : '';
		} catch (err) { }

		out.fonts.push({
			name: String(font.postScriptName),
			family: String(font.familyName || ''),
			style: String(font.styleName || ''),
			location: location && new File(location).exists ? location : '',
			missing: !!font.isSubstitute,
			layers: used[i].usedAt ? used[i].usedAt.length : 0
		});
	}

	return out;
};

// As fontes instaladas neste computador (para a troca): [{ name, family, style }]. pesado com muitas fontes:
// o painel guarda a lista e só pede de novo quando o total muda.
PADX.fontsInstalled = function (a) {
	if (!padFontsSupported()) return { count: 0, fonts: [] };

	var groups = app.fonts.allFonts;
	var count = 0;
	var g;

	for (g = 0; g < groups.length; g++) count += groups[g].length;

	if (a && a.count === count) return { count: count, same: true };

	var fonts = [];

	for (g = 0; g < groups.length; g++) {
		for (var f = 0; f < groups[g].length; f++) {
			var font = groups[g][f];

			if (font.isSubstitute) continue;

			fonts.push({ name: String(font.postScriptName), family: String(font.familyName || ''), style: String(font.styleName || '') });
		}
	}

	return { count: count, fonts: fonts };
};

// Instala as fontes da pasta de fontes do projeto (02 ARQUIVOS/FONTS): poucas e perto, a primeira tentativa do
// resolver (as já instaladas ficam como estão). → { installed, already, errors, none } (none: sem a pasta ou
// sem fontes nela; não é erro)
PADX.fontsInstallProject = function () {
	var path = padProjectFontsFolder(true);
	var folder = path ? new Folder(path) : null;
	var files = folder && folder.exists ? getFontFiles(folder, []) : [];

	if (!files.length) return { installed: 0, already: 0, errors: [], none: true };

	var res = appOs == 'Win' ? installWinFonts(files) : installMacFonts(files);

	return { installed: res.installed, already: res.already, errors: res.errors, none: false };
};

// Instala arquivos de fonte (do banco). a: { files: [caminho] } → { installed, already, errors }
PADX.fontsInstall = function (a) {
	var files = [];

	for (var i = 0; i < (a.files || []).length; i++) {
		var file = new File(a.files[i]);

		if (file.exists) files.push(file);
	}

	if (!files.length) throw new Error('#PAD_074 - banco de fontes: nenhum arquivo para instalar (o banco está acessível?).');

	var res = appOs == 'Win' ? installWinFonts(files) : installMacFonts(files);

	return { installed: res.installed, already: res.already, errors: res.errors };
};

// Depois de instalar: o After Effects enxerga as fontes novas e as camadas com fonte substituída passam para a de
// verdade (fonts lib.js). o painel chama de segundo em segundo até não faltar nada. → { supported, replaced, missing }
PADX.fontsSync = function () {
	return padFontsSync();
};

// Troca fontes no projeto inteiro (desfaz com um Ctrl+Z). a: { swaps: [{ from, to }] } (nomes PostScript)
// → { done: [{ from, to }], failed: [{ from, to, reason }] }
PADX.fontsReplace = function (a) {
	if (!padFontsSupported()) throw new Error('#PAD_073 - trocar fontes precisa do After Effects 2024 ou mais novo.');

	var used = app.project.usedFonts;
	var done = [];
	var failed = [];

	padUndoBegin('PADEIRO - trocar fontes');

	try {
		for (var s = 0; s < (a.swaps || []).length; s++) {
			var swap = a.swaps[s];
			var from = null;
			var to = app.fonts.getFontsByPostScriptName(swap.to);

			for (var u = 0; u < used.length; u++) if (used[u].font && used[u].font.postScriptName == swap.from) from = used[u].font;

			if (!from) {
				failed.push({ from: swap.from, to: swap.to, reason: 'não está mais no projeto' });
				continue;
			}

			if (!to || !to.length || to[0].isSubstitute) {
				failed.push({ from: swap.from, to: swap.to, reason: 'a fonte nova ainda não está instalada' });
				continue;
			}

			try {
				app.project.replaceFont(from, to[0]);
				done.push({ from: swap.from, to: swap.to });
			} catch (err) {
				failed.push({ from: swap.from, to: swap.to, reason: err.message });
			}
		}
	} finally {
		padUndoEnd();
	}

	return { done: done, failed: failed };
};
