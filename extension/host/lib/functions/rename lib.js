/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🏷️ renomeação de comps e outputs (O ETIQUETADOR)
---------------------------------------------------------------

A regra do renomear mora em regras/regra-do-renomear.js (PAD_REGRA_DO_RENOMEAR, compartilhada com a prévia da
configuração e o host de teste, ADR 0005). Aqui ficam só as chamadas: a regra da equipe que o host já tem
(PAD_RENAME_FORMATS, PAD_RENAME_FIXED, PAD_RENAME_OPTIONS e PAD_RENAME_SEPARATOR, de globals.js ou da aba RENOMEAR
da configuração, padApplyConfig em productions.jsx) vai como parâmetro para o módulo, e o que depende do After (as
pastas da comp, a etiqueta, a fila de render) fica aqui.

*/

var padRenameCache = { rule: null, key: null, formats: null, fixed: null };

// A regra do renomear da equipe, como o host tem agora, preparada uma vez (compile) enquanto ela não muda.
function padRenameRule() {
	var c = padRenameCache;

	var key = [PAD_RENAME_OPTIONS.removeSpecial, PAD_RENAME_OPTIONS.textCase, PAD_RENAME_SEPARATOR].join('|');

	if (!c.rule || c.formats !== PAD_RENAME_FORMATS || c.fixed !== PAD_RENAME_FIXED || c.key !== key) {
		c.formats = PAD_RENAME_FORMATS;
		c.fixed = PAD_RENAME_FIXED;
		c.key = key;
		c.rule = PAD_REGRA_DO_RENOMEAR.compile({
			formatos: PAD_RENAME_FORMATS,
			fixed: PAD_RENAME_FIXED,
			removeSpecial: PAD_RENAME_OPTIONS.removeSpecial,
			textCase: PAD_RENAME_OPTIONS.textCase,
			separator: PAD_RENAME_SEPARATOR
		});
	}

	return c.rule;
}

// A formatação do nome (configuração > renomear): os especiais e a caixa (a forminha e o arquivista).
function padRenameFormat(text) {
	return PAD_REGRA_DO_RENOMEAR.styleText(padRenameRule(), text);
}

// Nome normalizado para comparação: maiúsculas, sem acentos (a forminha).
function renameNormalize(str) {
	return PAD_REGRA_DO_RENOMEAR.normalize(str);
}

// Os formatos da regra ('renameRefArray', globals.js): { prefix, etiqueta }, para a lista das etiquetas.
function padRenameRefs(formats) {
	var refs = [];

	for (var i = 0; i < formats.length; i++) refs.push({ prefix: formats[i].prefix, etiqueta: formats[i].etiqueta });

	return refs;
}

renameRefArray = padRenameRefs(PAD_RENAME_FORMATS);

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

// Calcula o nome padronizado de uma comp, sem alterá-la: o formato pelas pastas da comp (da mais próxima para a
// raiz) e depois pelo nome; o nome fixo pelo nome ou pela etiqueta (o comentário da comp no After).
// Retorna { name, etiqueta } — etiqueta é null quando nenhum formato foi identificado.
function getPromoRename(comp) {
	var folders = [];

	for (var folder = comp.parentFolder; folder != app.project.rootFolder; folder = folder.parentFolder) {
		folders.push(folder.name);
	}

	var r = PAD_REGRA_DO_RENOMEAR.rename(padRenameRule(), comp.name, { folders: folders, etiqueta: comp.comment });

	return { name: r.name, etiqueta: r.etiqueta };
}

// Coleta as comps de uma lista de itens; pastas entram com todo o conteúdo (e têm o nome em maiúsculas).
function coletarRenameComps(items, compArray) {
	for (var i = 0; i < items.length; i++) {
		var aItem = items[i];

		if (aItem instanceof CompItem) {
			compArray.push(aItem);
		} else if (aItem instanceof FolderItem) {
			if (PAD_RENAME_OPTIONS.textCase == 'upperCase') aItem.name = aItem.name.toUpperCase();

			var children = [];

			for (var f = 1; f <= aItem.numItems; f++) {
				children.push(aItem.item(f));
			}
			coletarRenameComps(children, compArray);
		}
	}

	return compArray;
}

// Renomeia as comps (e o conteúdo das pastas) da lista; sem lista, usa a seleção do projeto.
function renamePromoComps(items) {
	var compArray = coletarRenameComps(items || app.project.selection, []);

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
		if (rename.etiqueta) comp.comment = rename.etiqueta;
	}
}

// Caracteres que não podem existir em nomes de arquivo (Windows / macOS) viram _ (regras/regra-do-renomear.js)
function sanitizeFileName(name) {
	return PAD_REGRA_DO_RENOMEAR.fileName(name);
}

// Renomeia os outputs de toda a fila de render com o nome padronizado da comp.
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

	if (skipped > 0) alert(lol + '#PAD_033 - ' + skipped + ' output(s) da fila não foram renomeados (já renderizados ou bloqueados).');
}
