/*

---------------------------------------------------------------
> render: as comps na fila de render, na pasta certa (O FORNO)
---------------------------------------------------------------

Um botão da barra, sem janela:

  clique          → o render FINAL: na pasta de output do projeto (a que A CLAQUETE grava), com o nome da comp
  clique direito  → um PREVIEW: na pasta de previews das saídas do projeto (03_SAIDA/PREVIEWS), com a versão no nome
                    (COMP_prev_v01, _v02…: um preview nunca substitui o anterior)

As comps: as selecionadas no painel de projeto; sem seleção, a comp aberta. Só põe na fila: não renderiza.

Os presets (os templates de output do After) são de cada um, deste computador (configuração > projeto > neste
computador): cada pessoa tem a sua lista. Sem preset escolhido, a comp entra na fila com o padrão do After.

Se a pasta não puder ser acessada (rede fora, modo local, projeto sem output ou ainda não salvo), o render vai para
a pasta de saída deste computador (configuração > produções > neste computador; vazia: a Área de Trabalho).

  PADX.renderPresets()            → { templates: [nome], final, preview } (a lista do After e os dois escolhidos)
  PADX.renderQueue({ preview })   → { count, folder, local, names, warnings }

*/

// Os dois presets deste computador → { final, preview }
function padMachineRender(d) {
	var r = d && d.render ? d.render : {};

	return { 'final': padTrim(r['final'] || ''), preview: padTrim(r.preview || '') };
}

// A pasta dos previews, relativa à raiz do projeto: a pasta PREVIEWS da estrutura (configuração > coletar); sem
// ela, PREVIEWS dentro da pasta das saídas.
function padRenderPreviewPath(settings) {
	var folders = padStructureFolders(settings);

	for (var i = 0; i < folders.length; i++) {
		if (/^\d*PREVIEWS?$/.test(padFolderKey(folders[i].path.replace(/^.*\//, '')))) return folders[i].path;
	}

	return padMigrateDest(settings, 'saidas') + '/PREVIEWS';
}

// A próxima versão do preview da comp na pasta: olha os arquivos que já estão lá e os que já estão na fila.
function padRenderNextVersion(folder, base) {
	var max = 0;
	var prefix = (base + '_prev_v').toLowerCase();
	var names = [];
	var list = [];
	var i;

	try {
		list = new Folder(folder).getFiles() || [];
	} catch (err) { }

	for (i = 0; i < list.length; i++) names.push(decodeURI(list[i].name));

	for (i = 1; i <= app.project.renderQueue.numItems; i++) {
		var item = app.project.renderQueue.item(i);

		for (var m = 1; m <= item.numOutputModules; m++) {
			try {
				if (item.outputModule(m).file) names.push(decodeURI(item.outputModule(m).file.name));
			} catch (err) { }
		}
	}

	for (i = 0; i < names.length; i++) {
		var name = names[i].toLowerCase();

		if (name.indexOf(prefix) != 0) continue;

		var n = parseInt(name.substring(prefix.length), 10);

		if (!isNaN(n) && n > max) max = n;
	}

	return max + 1;
}

PADX.renderPresets = function () {
	var comp = null;
	var temp = null;
	var list = [];

	for (var i = 1; i <= app.project.numItems && !comp; i++) {
		if (app.project.item(i) instanceof CompItem) comp = app.project.item(i);
	}

	// a lista dos templates só existe num item da fila: um de passagem (e uma comp de passagem, sem nenhuma)
	padUndoBegin('O PADEIRO: ler os presets de render');

	try {
		if (!comp) temp = comp = app.project.items.addComp('_padeiro', 16, 16, 1, 1, 1);

		var rq = app.project.renderQueue.items.add(comp);

		try {
			var all = rq.outputModule(1).templates;

			for (var t = 0; t < all.length; t++) {
				if (!String(all[t]).match(/^_HIDDEN\s/)) list.push(String(all[t]));
			}
		} finally {
			rq.remove();
		}
	} finally {
		if (temp) temp.remove();
		padUndoEnd();
	}

	var presets = padMachineRender(padMachineData());

	return { templates: list, 'final': presets['final'], preview: presets.preview };
};

// a: { preview }
PADX.renderQueue = function (a) {
	var preview = !!(a && a.preview);
	var comps = [];
	var sel = app.project.selection || [];
	var i;

	for (i = 0; i < sel.length; i++) {
		if (sel[i] instanceof CompItem) comps.push(sel[i]);
	}
	if (!comps.length && app.project.activeItem instanceof CompItem) comps.push(app.project.activeItem);
	if (!comps.length) throw new Error('#PAD_111 - render: selecione as comps no painel de projeto (ou abra uma comp).');

	var machine = padMachineData();
	var preset = padMachineRender(machine)[preview ? 'preview' : 'final'];
	var warnings = [];
	var folder = '';
	var local = false;

	if (preview) {
		if (app.project.file) {
			var settings = padReadCollect();

			folder = padCollectRoot(app.project.file, settings) + '/' + padRenderPreviewPath(settings);
		} else warnings.push('o projeto ainda não foi salvo: o preview vai para a pasta de saída deste computador.');
	} else if (padLocalMode()) {
		warnings.push('modo local: o render vai para a pasta de saída deste computador.');
	} else {
		var output = padMetaRead().output;

		if (output) folder = padMountedPath(padPath(output));
		else warnings.push('o projeto não tem pasta de output (A CLAQUETE grava): o render vai para a pasta de saída deste computador.');
	}

	// a pasta que ainda não existe é criada (na rede, só dentro de um volume montado de verdade)
	if (folder && !new Folder(folder).exists) {
		if (preview || padShareReachable(folder)) {
			try {
				padEnsureFolder(folder);
			} catch (err) { }
		}

		if (!new Folder(folder).exists) {
			warnings.push('#PAD_019 - a pasta não pode ser acessada (vai para a pasta de saída deste computador): ' + padDisplayPath(folder));
			folder = '';
		}
	}

	if (!folder) {
		local = true;
		folder = padPath(padMachinePath(machine.outputs) || '~/Desktop');
		padEnsureFolder(folder);
	}

	if (!preset) warnings.push('sem preset de ' + (preview ? 'preview' : 'render final') + ' escolhido (configuração > projeto > neste computador): a fila usa o padrão do After.');

	var names = [];
	var badPreset = false;

	padUndoBegin(preview ? 'O PADEIRO: preview na fila de render' : 'O PADEIRO: render final na fila de render');

	try {
		for (i = 0; i < comps.length; i++) {
			var item = app.project.renderQueue.items.add(comps[i]);
			var om = item.outputModule(1);
			var name = '[compName]';

			if (preview) {
				var base = sanitizeFileName(comps[i].name);
				var version = padRenderNextVersion(folder, base);

				name = base + '_prev_v' + (version < 10 ? '0' : '') + version;
			}

			var file = new File(folder + '/' + name + '.[fileextension]');

			om.file = file;

			if (preset) {
				try {
					om.applyTemplate(preset);
				} catch (err) {
					badPreset = true;
				}
				om.file = file; // o template não pode trocar a pasta
			}

			names.push(preview ? name : comps[i].name);
		}
	} finally {
		padUndoEnd();
	}

	if (badPreset) warnings.push('o preset "' + preset + '" não existe mais no After: escolha outro em configuração > projeto > neste computador.');

	return { count: comps.length, folder: padDisplayPath(folder), local: local, preview: preview, names: names, warnings: warnings };
};
