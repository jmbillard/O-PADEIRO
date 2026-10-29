/* eslint-disable no-empty */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🗃️ organização do projeto
---------------------------------------------------------------

*/

// Estrutura padrão de pastas do projeto: { chave: [nome, chave da pasta pai] }
var PROJECT_FOLDERS = {
	render: ['01 COMPS', null],
	precomps: ['02 PRECOMPS', null],
	arquivos: ['03 ARQUIVOS', null],
	videos: ['VIDEOS', 'arquivos'],
	imagens: ['IMAGENS', 'arquivos'],
	audio: ['AUDIO', 'arquivos'],
	solidos: ['SOLIDOS', 'arquivos'],
	dados: ['DADOS', 'arquivos'],
	missing: ['MISSING', null]
};

// Extensões tratadas como arquivos de dados
var PROJECT_DATA_EXTENSIONS = ['.csv', '.json', '.jsx', '.mgjson', '.tsv', '.txt'];

// Comentários que mandam a comp para a pasta de render
var PROJECT_RENDER_COMMENTS = /EXPORT|LOGO GLOBO|TEMPLATE/;

// Pasta 'name' dentro de 'parent' (pasta raiz se null): reaproveita a existente ou cria uma nova.
function getOrCreateFolder(name, parent) {
	parent = parent || app.project.rootFolder;

	for (var i = 1; i <= parent.numItems; i++) {
		var item = parent.item(i);

		if (item instanceof FolderItem && item.name == name) return item;
	}

	var folder = app.project.items.addFolder(name);

	folder.parentFolder = parent;

	return folder;
}

// Cria (ou reaproveita) a estrutura padrão de pastas. Retorna { chave: FolderItem }.
// Clicar de novo não duplica as pastas.
function projectTemplateFolders() {
	var folders = {};

	// pastas raiz primeiro, para as subpastas encontrarem a pasta pai
	for (var pass = 0; pass < 2; pass++) {
		for (var key in PROJECT_FOLDERS) {
			var parentKey = PROJECT_FOLDERS[key][1];

			if (folders[key] || (pass == 0) != (parentKey == null)) continue;
			if (key == 'missing') continue; // só existe quando há arquivos ausentes

			folders[key] = getOrCreateFolder(PROJECT_FOLDERS[key][0], parentKey ? folders[parentKey] : null);
		}
	}

	return folders;
}

// Remove as pastas vazias, inclusive as que ficam vazias depois que as subpastas são removidas.
function deleteEmptyProjectFolders() {
	var removed = true;

	while (removed) {
		removed = false;

		for (var i = app.project.numItems; i >= 1; i--) {
			var aItem = app.project.item(i);

			if (aItem instanceof FolderItem && aItem.numItems == 0) {
				aItem.remove();
				removed = true;
			}
		}
	}
}

// Move todos os itens para a raiz do projeto e remove as pastas.
function deleteProjectFolders() {
	var rootFolder = app.project.rootFolder;

	for (var i = app.project.numItems; i >= 1; i--) {
		var aItem = app.project.item(i);

		if (!(aItem instanceof FolderItem)) continue;

		while (aItem.numItems > 0) {
			aItem.item(1).parentFolder = rootFolder;
		}
	}

	deleteEmptyProjectFolders();
}

// Separa os footages do projeto por tipo.
function getFootage() {
	var footage = {
		stillArray: [],
		videoArray: [],
		audioArray: [],
		solidArray: [],
		missingArray: [],
		missingNames: [],
		dataArray: []
	};

	for (var i = app.project.numItems; i >= 1; i--) {
		try {
			var aItem = app.project.item(i);

			if (!(aItem instanceof FootageItem)) continue;

			if (aItem.footageMissing) {
				footage.missingNames.push(aItem.name);
				footage.missingArray.push(aItem);
				continue;
			}

			if (aItem.mainSource instanceof SolidSource) {
				footage.solidArray.push(aItem);
				continue;
			}

			if (!(aItem.mainSource instanceof FileSource)) continue;

			// a extensão vem do arquivo: o item pode ter sido renomeado no projeto
			var fileName = aItem.file ? aItem.file.displayName : aItem.name;

			if (PROJECT_DATA_EXTENSIONS.indexOf(getFileExt(fileName)) >= 0) {
				footage.dataArray.push(aItem);
				continue;
			}

			if (aItem.mainSource.isStill) {
				footage.stillArray.push(aItem);
				continue;
			}

			if (aItem.hasVideo) {
				footage.videoArray.push(aItem);
				continue;
			}

			footage.audioArray.push(aItem);
		} catch (err) { }
	}

	return footage;
}

// Subpasta de 'parent' com o nome do comentário (criada uma vez e reaproveitada pelo cache).
function getCommentFolder(cache, comment, parent) {
	var key = parent.name + '|' + comment;

	if (!cache[key]) cache[key] = getOrCreateFolder(comment, parent);

	return cache[key];
}

// Move os footages para 'folder'; o comentário (antes de ':') vira subpasta.
function populateFootageItemFolders(itemArray, folder, cache) {
	cache = cache || {};

	for (var s = 0; s < itemArray.length; s++) {
		var aItem = itemArray[s];
		var subFolderName = aItem.comment.split(':')[0].replaceSpecialCharacters().trim();

		aItem.parentFolder = subFolderName == '' ? folder : getCommentFolder(cache, subFolderName, folder);
	}
}

// Comps para render (comentário EXPORTAR / LOGO GLOBO / TEMPLATE ou de um tipo conhecido como RODAPE)
// vão para '01 COMPS'; as demais para '02 PRECOMPS'. O comentário vira subpasta.
function populateCompItemFolders(comps, folders, cache) {
	var typeComments = [];

	cache = cache || {};

	for (var p = 0; p < renameRefArray.length; p++) {
		typeComments.push(renameRefArray[p].comment);
	}

	var typeRegExp = new RegExp('(' + typeComments.join('|') + ')', 'i');

	for (var c = 0; c < comps.length; c++) {
		var comp = comps[c];
		var compComment = comp.comment.toUpperCase().trim();

		if (compComment.match(PROJECT_RENDER_COMMENTS)) {
			comp.parentFolder = folders.render;
		} else if (compComment.match(typeRegExp)) {
			comp.parentFolder = getCommentFolder(cache, compComment, folders.render);
		} else if (compComment == '') {
			comp.parentFolder = folders.precomps;
		} else {
			comp.parentFolder = getCommentFolder(cache, compComment, folders.precomps);
		}
	}
}

// Organiza comps e footages na estrutura padrão de pastas.
function populateProjectFolders() {
	var folders = projectTemplateFolders();
	var footage = getFootage();
	var cache = {};

	populateCompItemFolders(getComps(), folders, cache);

	populateFootageItemFolders(footage.videoArray, folders.videos, cache);
	populateFootageItemFolders(footage.stillArray, folders.imagens, cache);
	populateFootageItemFolders(footage.audioArray, folders.audio, cache);
	populateFootageItemFolders(footage.solidArray, folders.solidos, cache);
	populateFootageItemFolders(footage.dataArray, folders.dados, cache);

	if (footage.missingArray.length > 0) {
		populateFootageItemFolders(footage.missingArray, getOrCreateFolder(PROJECT_FOLDERS.missing[0], null), cache);
	}
}

// Organização completa: desfaz as pastas atuais, organiza tudo e remove as pastas que sobrarem vazias.
// As comps selecionadas sem comentário são marcadas como 'EXPORTAR' (vão para a pasta de render).
function organizeProject() {
	var selection = app.project.selection;

	for (var i = 0; i < selection.length; i++) {
		if (selection[i] instanceof CompItem && selection[i].comment == '') selection[i].comment = 'EXPORTAR';
	}

	deleteProjectFolders();
	populateProjectFolders();
	deleteEmptyProjectFolders();
}
