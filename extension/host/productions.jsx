/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> editor da lista de produções (host)
---------------------------------------------------------------

A lista é o 'O_PADEIRO_config.json' compartilhado pela equipe.
Como mais de uma pessoa pode editar, salvar confere se o arquivo mudou desde que o editor o leu.

*/

// Valida e normaliza uma lista vinda do painel / de um arquivo importado. Lança Error com a mensagem.
function padCleanProductions(list) {
	if (!(list instanceof Array) || list.length == 0) throw new Error('a lista de produções não pode ficar vazia.');

	var seen = {};
	var clean = [];

	for (var i = 0; i < list.length; i++) {
		var name = String(list[i].name == null ? '' : list[i].name).replace(/^\s+|\s+$/g, '');
		var path = String(list[i].templatesPath == null ? '' : list[i].templatesPath).replace(/^\s+|\s+$/g, '');

		if (name == '') throw new Error('produção ' + (i + 1) + ': preencha o nome.');
		if (path == '') throw new Error('"' + name + '": preencha a pasta de templates.');
		if (seen[name.toUpperCase()]) throw new Error('"' + name + '": já existe uma produção com esse nome.');

		seen[name.toUpperCase()] = true;
		clean.push({ name: name, icon: list[i].icon ? String(list[i].icon) : '', templatesPath: path });
	}

	return padSortProductions(clean);
}

function padWriteProductions(file, list) {
	saveTextFile(JSON.stringify({ PRODUCTIONS: list }, null, '\t'), file.fsName);

	// confere o que foi gravado
	JSON.parse(readFileContent(new File(file.fsName)));
}

// Grava a lista compartilhada. a: { productions, stamp } — 'stamp' é a data do arquivo quando o editor o leu.
PADX.saveProductions = function (a) {
	var file = padConfigFile();

	if (!file) throw new Error(padNoSharedListError());

	var clean = padCleanProductions(a.productions);

	if (file.exists && a.stamp && file.modified.getTime() != a.stamp) {
		throw new Error('#PAD_CONFLITO - a lista foi alterada por outra pessoa depois que você abriu o editor. use "recarregar" e refaça as alterações.');
	}

	// uma cópia da lista anterior, por segurança (lista compartilhada pela equipe)
	if (file.exists) {
		try {
			file.copy(file.fsName.replace(/\.json$/i, '') + '.bak.json');
		} catch (err) { }
	}

	try {
		padWriteProductions(file, clean);
	} catch (err) {
		throw new Error('não foi possível gravar a lista: ' + err.message);
	}

	return { stamp: new File(file.fsName).modified.getTime(), productions: clean, configPath: file.fsName };
};

// Lê uma lista de produções de um arquivo (importar). a: { path }
PADX.readProductionsFile = function (a) {
	var file = new File(a.path);

	if (!file.exists) throw new Error('arquivo não encontrado.');

	var data;

	try {
		data = JSON.parse(readFileContent(file));
	} catch (err) {
		throw new Error('o arquivo não é uma lista de produções válida.');
	}

	return { productions: padCleanProductions(data.PRODUCTIONS) };
};

// Grava a lista em outro arquivo (exportar). a: { path, productions }
PADX.writeProductionsFile = function (a) {
	padWriteProductions(new File(a.path), padCleanProductions(a.productions));

	return { path: a.path };
};

// Caminho no formato de rede neutro ('//servidor/share/...'), como as listas existentes guardam.
PADX.canonicalPath = function (a) {
	return { path: normalizeNetworkPath(a.path, { forceWin: true, silent: true }) };
};

// Quais pastas existem (para o indicador de cada produção). a: { paths }
PADX.checkFolders = function (a) {
	var result = [];

	for (var i = 0; i < a.paths.length; i++) {
		try {
			result.push(new Folder(padPath(a.paths[i])).exists);
		} catch (err) {
			result.push(false);
		}
	}

	return { exists: result };
};
