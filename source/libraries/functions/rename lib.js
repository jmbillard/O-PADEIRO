/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🏷️ renomeação de comps e outputs
---------------------------------------------------------------

Os padrões ficam em 'renameRefArray' (globals.js): cada tipo tem um prefixo (ex: 'RDP'),
um comentário (ex: 'RODAPE') e os termos que o identificam (expressões regulares).

*/

// Separadores aceitos entre as palavras do nome
var RENAME_SEPARATORS = '[\\s_\\-]';

// Templates podem definir o nome final no texto do último layer ('script_template_name').
function getTemplateNameLayer(comp) {
	if (comp.numLayers == 0) return null;

	var nameLayer = comp.layer(comp.numLayers);

	if (!(nameLayer instanceof TextLayer) || nameLayer.name != 'script_template_name') return null;

	return nameLayer;
}

function templateNameValue(nameLayer) {
	return getTextLayerContent(nameLayer).toUpperCase().replaceSpecialCharacters();
}

// Aplica o nome definido pelo template. Retorna false se a comp não tiver o layer de nome.
function overwriteCompName(comp) {
	var nameLayer = getTemplateNameLayer(comp);

	if (!nameLayer) return false;

	comp.name = templateNameValue(nameLayer);

	return true;
}

// Nome normalizado para comparação: maiúsculas, sem acentos.
function renameNormalize(str) {
	return String(str).toUpperCase().replaceSpecialCharacters();
}

// Retorna o tipo (item de renameRefArray) correspondente ao nome, ou null.
// Pastas: o nome precisa COMEÇAR com o termo (ex: 'RODAPES', 'RODAPE - JOGO'), evitando falsos
// positivos como 'ASSETS' para 'ASS'. Comps: o termo pode estar em qualquer posição, como palavra.
function findMatchingPrefix(name, isFolder) {
	for (var t = 0; t < renameRefArray.length; t++) {
		var refObj = renameRefArray[t];

		for (var u = 0; u < refObj.regExpStr.length; u++) {
			var val = refObj.regExpStr[u];
			var pattern = isFolder
				? new RegExp('^(' + val + ')(' + RENAME_SEPARATORS + '|$)', 'i')
				: new RegExp('(^|' + RENAME_SEPARATORS + ')(' + val + ')(' + RENAME_SEPARATORS + '|$)', 'i');

			if (pattern.test(name)) return refObj;
		}
	}

	return null;
}

// Remove do nome todos os termos de identificação (de qualquer tipo) e prefixos já aplicados,
// deixando só a parte descritiva. ex: 'RODAPE_JOAO_SILVA' → 'JOAO SILVA'
function cleanCompName(compName, refObj) {
	var cleanName = compName;

	// primeiro: prefixos e termos de todos os tipos
	for (var p = 0; p < renameRefArray.length; p++) {
		cleanName = cleanName.replace(new RegExp('^' + renameRefArray[p].prefix + '[\\s\\-]+', 'gi'), '');
		cleanName = removeRenameTerms(cleanName, renameRefArray[p].regExpStr);
	}

	// depois: os termos do tipo encontrado, caso ainda restem (ex: termo repetido)
	cleanName = removeRenameTerms(cleanName, refObj.regExpStr);

	return cleanName.replace(/[\s_\-]+/g, ' ').trim();
}

function removeRenameTerms(name, terms) {
	for (var i = 0; i < terms.length; i++) {
		var val = terms[i];

		name = name
			.replace(new RegExp('^(' + val + RENAME_SEPARATORS + '+)', 'gi'), '') // início
			.replace(new RegExp(RENAME_SEPARATORS + '+' + val + RENAME_SEPARATORS + '+', 'gi'), ' ') // meio
			.replace(new RegExp(RENAME_SEPARATORS + '+' + val + '$', 'gi'), '') // fim
			.replace(new RegExp('^' + val + '$', 'gi'), ''); // nome inteiro
	}

	return name;
}

// Calcula o nome padronizado de uma comp, sem alterá-la.
// Retorna { name, comment } — comment é null quando nenhum tipo foi identificado.
function getPromoRename(comp) {
	var compName = renameNormalize(comp.name);
	var prefixFound = null;

	// as pastas da comp têm prioridade (da mais próxima para a raiz)
	for (var folder = comp.parentFolder; folder != app.project.rootFolder && !prefixFound; folder = folder.parentFolder) {
		prefixFound = findMatchingPrefix(renameNormalize(folder.name), true);
	}

	if (!prefixFound) prefixFound = findMatchingPrefix(compName, false);

	var result = { name: compName, comment: null };

	if (prefixFound) {
		var cleanName = cleanCompName(compName, prefixFound);

		result.comment = prefixFound.comment;
		result.name = cleanName && cleanName !== prefixFound.prefix ? prefixFound.prefix + globalSeparator + cleanName : prefixFound.prefix;
	}

	// LOGO GLOBO tem nome fixo (pelo nome da comp ou pelo comentário original)
	var originalComment = prefixFound ? '' : comp.comment;

	if (compName.match(/LOGO[\s_]*GLOBO/) || originalComment.match(/LOGO[\s_]*GLOBO/)) result.name = 'LOGO GLOBO';

	return result;
}

// Coleta as comps de uma lista de itens; pastas entram com todo o conteúdo (e têm o nome em maiúsculas).
function collectRenameComps(items, compArray) {
	for (var i = 0; i < items.length; i++) {
		var aItem = items[i];

		if (aItem instanceof CompItem) {
			compArray.push(aItem);
		} else if (aItem instanceof FolderItem) {
			aItem.name = aItem.name.toUpperCase();

			var children = [];

			for (var f = 1; f <= aItem.numItems; f++) {
				children.push(aItem.item(f));
			}
			collectRenameComps(children, compArray);
		}
	}

	return compArray;
}

// Renomeia as comps (e o conteúdo das pastas) da lista; sem lista, usa a seleção do projeto.
function renamePromoComps(items) {
	var compArray = collectRenameComps(items || app.project.selection, []);

	if (compArray.length == 0) {
		alert(lol + '#PAD_032 - selecione as comps ou pastas que serão renomeadas.');
		return;
	}

	for (var c = 0; c < compArray.length; c++) {
		var comp = compArray[c];

		// templates específicos definem o próprio nome
		if (overwriteCompName(comp)) continue;

		var rename = getPromoRename(comp);

		comp.name = rename.name;
		if (rename.comment) comp.comment = rename.comment;
	}
}

// Caracteres que não podem existir em nomes de arquivo (Windows / macOS)
function sanitizeFileName(name) {
	return name.replace(/[\\\/:\*\?"<>\|]/g, '_').replace(/\s+/g, ' ').trim();
}

// Renomeia os arquivos de saída de toda a fila de render com o nome padronizado da comp.
// Itens já renderizados ou em render não são alterados. Nomes repetidos na mesma pasta
// recebem um sufixo (_2, _3...) para um render não sobrescrever o outro.
function renameOutputs() {
	var rq = app.project.renderQueue;
	var usedNames = {};
	var skipped = 0;

	for (var i = 1; i <= rq.numItems; i++) {
		var outputItem = rq.item(i);

		if (outputItem.status == RQItemStatus.DONE || outputItem.status == RQItemStatus.RENDERING) {
			skipped++;
			continue;
		}

		var comp = outputItem.comp;
		var nameLayer = getTemplateNameLayer(comp);
		var baseName = sanitizeFileName(nameLayer ? templateNameValue(nameLayer) : getPromoRename(comp).name);

		for (var j = 1; j <= outputItem.numOutputModules; j++) {
			try {
				var outputModule = outputItem.outputModule(j);
				var outputFile = outputModule.file;
				var outputPath = decodeURI(outputFile.path); // pasta onde o arquivo já está
				var fileExt = getFileExt(outputFile.displayName);
				var isSequence = /png|jpg|jpeg|tif|psd|tga|exr|iff|hdr|sgi|dpx/i.test(fileExt);
				var renderTokens = isSequence ? '_[#####].[fileextension]' : '.[fileextension]';

				var fileName = baseName;
				var key = (outputPath + '/' + fileName + fileExt).toLowerCase();

				for (var n = 2; usedNames[key]; n++) {
					fileName = baseName + '_' + n;
					key = (outputPath + '/' + fileName + fileExt).toLowerCase();
				}
				usedNames[key] = true;

				outputModule.file = new File(outputPath + '/' + fileName + renderTokens);
			} catch (err) {
				skipped++;
			}
		}
	}

	if (skipped > 0) alert(lol + '#PAD_033 - ' + skipped + ' saída(s) não foram renomeadas (já renderizadas ou bloqueadas).');
}
