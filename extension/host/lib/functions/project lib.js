/* eslint-disable no-empty */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🗃️ organização do projeto
---------------------------------------------------------------

*/

// Organização (a aba ORGANIZAR da configuração substitui):
//   folders          → a árvore de pastas: nome, pasta pai ('' = raiz) e os tipos que ela recebe ('contents'):
//                      render (comps de render), editaveis (comps editáveis), precomps (as outras comps),
//                      videos, imagens, sequencias (sequências de imagens), audio,
//                      solidos, dados, missing (arquivos ausentes); sem tipos, só agrupa outras pastas
//   renderComments   → comentários (ou parte deles) que mandam a comp para a pasta de render
//   editComments     → comentários (ou parte deles) que mandam a comp para a pasta das editáveis
//                      (sem pasta para 'editaveis', elas ficam com as outras comps)
//   autoComment      → comentário dado às comps selecionadas sem comentário (e às criadas pelos templates)
//   dataExtensions   → extensões tratadas como arquivos de dados
//   commentSubfolders→ o comentário (antes de ':') vira subpasta
//   fileTags         → as etiquetas dos arquivos na janela de etiquetas (O CONTRARREGRA, clique direito)
var PAD_ORGANIZE = {
	folders: [
		{ name: '01 COMPS', parent: '', contents: ['render'] },
		{ name: '02 PRECOMPS', parent: '', contents: ['precomps'] },
		{ name: '03 ARQUIVOS', parent: '', contents: [] },
		{ name: 'VIDEOS', parent: '03 ARQUIVOS', contents: ['videos'] },
		{ name: 'IMAGENS', parent: '03 ARQUIVOS', contents: ['imagens', 'sequencias'] },
		{ name: 'AUDIO', parent: '03 ARQUIVOS', contents: ['audio'] },
		{ name: 'SOLIDOS', parent: '03 ARQUIVOS', contents: ['solidos'] },
		{ name: 'DADOS', parent: '03 ARQUIVOS', contents: ['dados'] },
		{ name: 'MISSING', parent: '', contents: ['missing'] }
	],
	renderComments: ['EXPORT', 'LOGO GLOBO', 'TEMPLATE'],
	editComments: ['EDIT'],
	autoComment: 'EXPORTAR',
	dataExtensions: ['.csv', '.json', '.jsx', '.mgjson', '.tsv', '.txt'],
	commentSubfolders: true,
	fileTags: ['FUNDO', 'LOGO', 'FOTO', 'TRILHA', 'LOC']
};

// Pasta da árvore pelo nome (sem diferenciar maiúsculas).
function padOrganizeFolder(name) {
	for (var i = 0; i < PAD_ORGANIZE.folders.length; i++) {
		if (PAD_ORGANIZE.folders[i].name.toUpperCase() == String(name).toUpperCase()) return PAD_ORGANIZE.folders[i];
	}

	return null;
}

// O comentário da comp manda para a pasta de render?
function padIsRenderComment(comment) {
	var c = String(comment).toUpperCase();

	for (var i = 0; i < PAD_ORGANIZE.renderComments.length; i++) {
		if (PAD_ORGANIZE.renderComments[i] != '' && c.indexOf(PAD_ORGANIZE.renderComments[i].toUpperCase()) >= 0) return true;
	}

	return false;
}

// O comentário da comp manda para a pasta das editáveis?
function padIsEditComment(comment) {
	var c = String(comment).toUpperCase();
	var list = PAD_ORGANIZE.editComments || [];

	for (var i = 0; i < list.length; i++) {
		if (list[i] != '' && c.indexOf(String(list[i]).toUpperCase()) >= 0) return true;
	}

	return false;
}

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

// Cria (ou reaproveita) uma pasta da árvore e as pastas acima dela. 'made' guarda as já criadas.
function padEnsureOrganizeFolder(def, made, depth) {
	var key = def.name.toUpperCase();

	if (made[key]) return made[key];
	if ((depth || 0) > 20) throw new Error('#PAD_084 - organizar: a árvore de pastas tem um ciclo.');

	var parentDef = def.parent ? padOrganizeFolder(def.parent) : null;
	var parent = parentDef ? padEnsureOrganizeFolder(parentDef, made, (depth || 0) + 1) : null;

	made[key] = getOrCreateFolder(def.name, parent);

	return made[key];
}

// Cria (ou reaproveita) a árvore de pastas. Retorna { conteúdo: FolderItem } (render, precomps, videos...).
// A pasta dos arquivos ausentes só aparece quando há algum (populateProjectFolders). Clicar de novo não duplica.
function projectTemplateFolders() {
	var folders = {};
	var made = {};

	for (var i = 0; i < PAD_ORGANIZE.folders.length; i++) {
		var def = PAD_ORGANIZE.folders[i];

		if (def.contents.length == 1 && def.contents[0] == 'missing') continue; // só quando há arquivos ausentes

		var folder = padEnsureOrganizeFolder(def, made);

		for (var c = 0; c < def.contents.length; c++) folders[def.contents[c]] = folder;
	}

	folders._made = made;

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
		sequenceArray: [],
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

			if (PAD_ORGANIZE.dataExtensions.indexOf(getFileExt(fileName).toLowerCase()) >= 0) {
				footage.dataArray.push(aItem);
				continue;
			}

			if (aItem.mainSource.isStill) {
				footage.stillArray.push(aItem);
				continue;
			}

			// sequência de imagens (render_0001.png…): o tipo dela, não vídeo
			if (padIsSequence(aItem)) {
				footage.sequenceArray.push(aItem);
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

// Move os footages para 'folder' (sem pasta para o tipo: a raiz); o comentário (antes de ':') vira subpasta.
function populateFootageItemFolders(itemArray, folder, cache) {
	cache = cache || {};
	folder = folder || app.project.rootFolder;

	for (var s = 0; s < itemArray.length; s++) {
		var aItem = itemArray[s];
		var subFolderName = PAD_ORGANIZE.commentSubfolders ? aItem.comment.split(':')[0].replaceSpecialCharacters().trim() : '';

		aItem.parentFolder = subFolderName == '' ? folder : getCommentFolder(cache, subFolderName, folder);
	}
}

// Comps para render (comentário de render, como EXPORTAR, ou de um tipo de peça, como RODAPE) vão para a
// pasta de render; as demais para a de precomps. O comentário vira subpasta (se ligado).
function populateCompItemFolders(comps, folders, cache) {
	var renderFolder = folders.render || app.project.rootFolder;
	var precompFolder = folders.precomps || app.project.rootFolder;

	var typeComments = [];

	cache = cache || {};

	for (var p = 0; p < renameRefArray.length; p++) {
		typeComments.push(renameRefArray[p].comment);
	}

	var typeRegExp = typeComments.length ? new RegExp('(' + typeComments.join('|') + ')', 'i') : null;
	var sub = PAD_ORGANIZE.commentSubfolders;

	for (var c = 0; c < comps.length; c++) {
		var comp = comps[c];
		var compComment = comp.comment.toUpperCase().trim();

		if (padIsRenderComment(compComment)) {
			comp.parentFolder = renderFolder;
		} else if (folders.editaveis && padIsEditComment(compComment)) {
			comp.parentFolder = folders.editaveis; // a pasta já é a das editáveis: sem subpasta pelo comentário
		} else if (typeRegExp && compComment.match(typeRegExp)) {
			comp.parentFolder = sub ? getCommentFolder(cache, compComment, renderFolder) : renderFolder;
		} else if (compComment == '' || !sub) {
			comp.parentFolder = precompFolder;
		} else {
			comp.parentFolder = getCommentFolder(cache, compComment, precompFolder);
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
	populateFootageItemFolders(footage.sequenceArray, folders.sequencias, cache);
	populateFootageItemFolders(footage.audioArray, folders.audio, cache);
	populateFootageItemFolders(footage.solidArray, folders.solidos, cache);
	populateFootageItemFolders(footage.dataArray, folders.dados, cache);

	if (footage.missingArray.length > 0) {
		var missingDef = null;

		for (var m = 0; m < PAD_ORGANIZE.folders.length; m++) {
			if (PAD_ORGANIZE.folders[m].contents.indexOf('missing') >= 0) missingDef = PAD_ORGANIZE.folders[m];
		}

		populateFootageItemFolders(footage.missingArray, missingDef ? padEnsureOrganizeFolder(missingDef, folders._made) : null, cache);
	}
}

// Organização completa: desfaz as pastas atuais, organiza tudo e remove as pastas que sobrarem vazias.
// As comps selecionadas sem comentário recebem o comentário automático (ex: 'EXPORTAR', vão para a pasta de render).
function organizeProject() {
	var selection = app.project.selection;

	for (var i = 0; i < selection.length; i++) {
		if (selection[i] instanceof CompItem && selection[i].comment == '') selection[i].comment = PAD_ORGANIZE.autoComment;
	}

	deleteProjectFolders();
	populateProjectFolders();
	deleteEmptyProjectFolders();
}
