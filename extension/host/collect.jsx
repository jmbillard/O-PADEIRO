/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> coletar (botão COLETAR da barra e aba COLETAR da configuração)
---------------------------------------------------------------

Copia os arquivos usados no projeto para a pasta do projeto (a do .aep), numa árvore de pastas por
tipo, e troca os caminhos dos itens para as cópias. Sequências de imagens são copiadas inteiras (os
quadros do trecho usado), cada uma na própria subpasta.

'COLLECT' no O_PADEIRO_config.json:
  folders        → a árvore, dentro da pasta do projeto: [{ name, parent, contents: [...] }]
                   tipos: videos, sequencias, imagens, audio, dados, fontes. tipo fora da árvore: não é coletado.
                   'projeto' marca a pasta do .aep: a janela PROJETO salva ali e o coletar usa a pasta de
                   cima como a raiz da estrutura. as pastas sem tipo também são criadas (ex: 03 SAIDA)
  projectFolders → repete, dentro da pasta do tipo, as pastas do painel de projeto onde o item está
  saveAfter      → salva o projeto depois de coletar (com os caminhos novos)
Sem 'COLLECT' no arquivo: PAD_DEFAULT_COLLECT.

*/

var PAD_COLLECT_CONTENTS = ['projeto', 'videos', 'sequencias', 'imagens', 'audio', 'dados', 'fontes'];

// A estrutura padrão: o .aep em 01, os arquivos em 02 (por tipo) e as saídas em 03.
var PAD_DEFAULT_COLLECT = {
	folders: [
		{ name: '01 PROJETOS', parent: '', contents: ['projeto'] },
		{ name: '02 ARQUIVOS', parent: '', contents: [] },
		{ name: 'FONTS', parent: '02 ARQUIVOS', contents: ['fontes'] },
		{ name: 'IMAGENS', parent: '02 ARQUIVOS', contents: ['imagens', 'sequencias'] },
		{ name: 'VÍDEOS', parent: '02 ARQUIVOS', contents: ['videos'] },
		{ name: 'AUDIOS', parent: '02 ARQUIVOS', contents: ['audio'] },
		{ name: 'DADOS', parent: '02 ARQUIVOS', contents: ['dados'] },
		{ name: '03 SAIDA', parent: '', contents: [] }
	],
	projectFolders: false,
	saveAfter: true
};

// Valida e normaliza a seção vinda do painel. Lança Error com a mensagem.
function padCleanCollect(o) {
	var clean = { folders: [], projectFolders: o.projectFolders === true, saveAfter: o.saveAfter !== false };
	var names = {};
	var owner = {};
	var i;

	for (i = 0; i < (o.folders || []).length; i++) {
		var name = padTrim(o.folders[i].name).replace(/\s+/g, ' ');
		var list = o.folders[i].contents instanceof Array ? o.folders[i].contents : [];
		var kept = [];

		if (name == '') throw new Error('#PAD_094 - coletar: a pasta ' + (i + 1) + ' precisa de um nome.');
		if (/[\\\/:*?"<>|]/.test(name)) throw new Error('#PAD_094 - coletar: "' + name + '" não pode ter \\ / : * ? " < > |.');
		if (names[name.toUpperCase()]) throw new Error('#PAD_094 - coletar: a pasta "' + name + '" aparece mais de uma vez.');

		for (var t = 0; t < list.length; t++) {
			var content = padTrim(list[t]);

			if (content == '') continue;
			if (PAD_COLLECT_CONTENTS.indexOf(content) < 0) throw new Error('#PAD_094 - coletar: tipo desconhecido em "' + name + '".');
			if (owner[content]) throw new Error('#PAD_094 - coletar: "' + name + '" e "' + owner[content] + '" recebem o mesmo tipo.');

			owner[content] = name;
			kept.push(content);
		}

		names[name.toUpperCase()] = true;
		clean.folders.push({ name: name, parent: padTrim(o.folders[i].parent), contents: kept });
	}

	for (i = 0; i < clean.folders.length; i++) {
		var f = clean.folders[i];

		if (f.parent != '' && !names[f.parent.toUpperCase()]) throw new Error('#PAD_094 - coletar: a pasta pai de "' + f.name + '" não existe.');

		// grafia da pasta pai e ciclos
		var seen = {};
		var cur = f;

		while (cur && cur.parent != '') {
			if (seen[cur.name.toUpperCase()]) throw new Error('#PAD_094 - coletar: "' + f.name + '" está dentro dela mesma.');

			seen[cur.name.toUpperCase()] = true;

			var next = null;

			for (var k = 0; k < clean.folders.length; k++) {
				if (clean.folders[k].name.toUpperCase() == cur.parent.toUpperCase()) next = clean.folders[k];
			}

			if (cur == f && next) f.parent = next.name;
			cur = next;
		}
	}

	return clean;
}

function padReadCollect() {
	try {
		var data = padConfigData();

		return data.COLLECT ? padCleanCollect(data.COLLECT) : PAD_DEFAULT_COLLECT;
	} catch (err) {
		return PAD_DEFAULT_COLLECT;
	}
}

// Caminho (relativo à pasta do projeto) da pasta que recebe o tipo; null = o tipo não é coletado.
function padCollectFolderPath(settings, type) {
	var byName = {};
	var def = null;
	var i;

	for (i = 0; i < settings.folders.length; i++) {
		byName[settings.folders[i].name.toUpperCase()] = settings.folders[i];
		if (settings.folders[i].contents.indexOf(type) >= 0) def = settings.folders[i];
	}

	if (!def) return null;

	var parts = [];

	for (i = 0; def && i < 30; i++) {
		parts.unshift(def.name);
		def = def.parent ? byName[def.parent.toUpperCase()] : null;
	}

	return parts.join('/');
}

// Caminho de uma pasta da árvore (relativo à raiz do projeto).
function padCollectPathOf(settings, folder) {
	var byName = {};
	var parts = [];

	for (var i = 0; i < settings.folders.length; i++) byName[settings.folders[i].name.toUpperCase()] = settings.folders[i];

	for (var n = 0; folder && n < 30; n++) {
		parts.unshift(folder.name);
		folder = folder.parent ? byName[folder.parent.toUpperCase()] : null;
	}

	return parts.join('/');
}

// Cria a estrutura inteira na raiz (as pastas sem tipo também, como a de saída).
function padCollectStructure(root, settings) {
	for (var i = 0; i < settings.folders.length; i++) {
		var parts = padCollectPathOf(settings, settings.folders[i]).split('/');
		var path = new Folder(root).fsName;

		for (var p = 0; p < parts.length; p++) {
			path += '/' + parts[p];
			padEnsureFolder(path);
		}
	}
}

// A raiz da estrutura de um .aep: a pasta de cima, se ele está na pasta do tipo 'projeto' (01 PROJETOS);
// senão, a pasta dele.
function padCollectRoot(file, settings) {
	var folder = file.parent;
	var sub = padCollectFolderPath(settings, 'projeto');

	if (!sub) return folder.fsName;

	var parts = sub.split('/');
	var cur = folder;

	for (var i = parts.length - 1; i >= 0; i--) {
		if (!cur || decodeURI(cur.name).toUpperCase() != parts[i].toUpperCase()) return folder.fsName;
		cur = cur.parent;
	}

	return cur ? cur.fsName : folder.fsName;
}

/*

---------------------------------------------------------------
> tipos e sequências
---------------------------------------------------------------

*/

var PAD_IMAGE_EXT = /\.(png|jpe?g|tiff?|exr|dpx|tga|bmp|psd|cin|hdr|sgi|webp|gif|heic|ai|eps|pdf|svg|cr2|dng|arw|nef)$/i;

function padItemExt(item) {
	return getFileExt(decodeURI(item.file.name));
}

// Sequência de imagens: não é still, com extensão de imagem e um número no fim do nome.
function padIsSequence(item) {
	try {
		return !item.mainSource.isStill && PAD_IMAGE_EXT.test(item.file.name) && /\d+\.[^.]+$/.test(decodeURI(item.file.name));
	} catch (err) {
		return false;
	}
}

function padCollectKind(item) {
	var ext = padItemExt(item);
	var data = PAD_ORGANIZE.dataExtensions || [];

	for (var i = 0; i < data.length; i++) {
		if (ext == data[i]) return 'dados';
	}

	if (padIsSequence(item)) return 'sequencias';

	try {
		if (item.mainSource.isStill) return 'imagens';
		if (item.hasAudio && !item.hasVideo) return 'audio';
	} catch (err) { }

	return 'videos';
}

function padRegExpEscape(text) {
	return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Os quadros da sequência na pasta dela: { base, files: [File], first: File }.
// Só o trecho usado (do primeiro quadro, pela duração do item), quando a duração é conhecida.
function padSequenceFrames(item) {
	var name = decodeURI(item.file.name);
	var m = /^(.*?)(\d+)(\.[^.]+)$/.exec(name);
	var re = new RegExp('^' + padRegExpEscape(m[1]) + '(\\d+)' + padRegExpEscape(m[3]) + '$', 'i');
	var start = parseInt(m[2], 10);
	var count = 0;

	try {
		count = Math.round(item.duration * item.frameRate);
	} catch (err) { }

	var all = item.file.parent.getFiles();
	var frames = [];

	for (var i = 0; i < all.length; i++) {
		if (!(all[i] instanceof File)) continue;

		var fm = re.exec(decodeURI(all[i].name));

		if (!fm) continue;

		var n = parseInt(fm[1], 10);

		if (n < start || (count > 0 && n >= start + count)) continue;

		frames.push(all[i]);
	}

	// nome da subpasta: o começo do nome, sem separadores no fim (render_0001.png → render)
	var base = m[1].replace(/[\s._\-]+$/, '') || decodeURI(item.file.parent.name);

	return { base: sanitizeFileName(base), files: frames, first: item.file };
}

/*

---------------------------------------------------------------
> coletar
---------------------------------------------------------------

*/

// 'path' existe e é o mesmo arquivo (pelo tamanho)? Senão, um nome livre (_2, _3...).
function padFreeFile(folderPath, fileName, src) {
	var dest = new File(folderPath + '/' + fileName);

	for (var n = 2; dest.exists && dest.length != src.length; n++) {
		dest = new File(folderPath + '/' + fileName.replace(/(\.[^.]+)?$/, '_' + n + '$1'));
	}

	return dest;
}

function padEnsureFolder(path) {
	var folder = new Folder(path);

	if (!folder.exists) folder.create();

	return folder;
}

// Pastas do painel de projeto onde o item está ('a/b/'), para repetir na coleta.
function padItemProjectPath(item) {
	var sub = '';

	for (var f = item.parentFolder; f && f != app.project.rootFolder; f = f.parentFolder) sub = sanitizeFileName(f.name) + '/' + sub;

	return sub;
}

function padCopySequence(item, folderPath) {
	var seq = padSequenceFrames(item);
	var folder = padEnsureFolder(folderPath + '/' + seq.base);
	var newFirst = null;
	var copied = 0;

	for (var i = 0; i < seq.files.length; i++) {
		var src = seq.files[i];
		var dest = new File(folder.fsName + '/' + decodeURI(src.name));

		if (!(dest.exists && dest.length == src.length) && !src.copy(dest)) return { ok: false };

		copied++;
		if (src.fsName == seq.first.fsName) newFirst = dest;
	}

	if (!newFirst) return { ok: false };

	// a nova importação volta com a interpretação padrão: guarda e devolve a do item
	var source = item.mainSource;
	var keep = {};
	var props = ['conformFrameRate', 'alphaMode', 'premulColor', 'invertAlpha', 'fieldSeparationType', 'removePulldown', 'loop'];
	var p;

	for (p = 0; p < props.length; p++) {
		try {
			keep[props[p]] = source[props[p]];
		} catch (err) { }
	}

	item.replaceWithSequence(newFirst, false);

	for (p = 0; p < props.length; p++) {
		try {
			if (keep[props[p]] !== undefined && item.mainSource[props[p]] != keep[props[p]]) item.mainSource[props[p]] = keep[props[p]];
		} catch (err) { }
	}

	return { ok: true, frames: copied };
}

// Coleta os arquivos do projeto para 'target'. Retorna os números para o aviso.
function padCollectFiles(target, settings) {
	var root = padEnsureFolder(target);
	var rootKey = String(root.fsName).replace(/\\/g, '/').toLowerCase() + '/';
	var res = { files: 0, sequences: 0, frames: 0, skipped: [], missing: [], fonts: '' };
	var paths = {};
	var i;

	for (i = 0; i < PAD_COLLECT_CONTENTS.length; i++) paths[PAD_COLLECT_CONTENTS[i]] = padCollectFolderPath(settings, PAD_COLLECT_CONTENTS[i]);

	for (i = 1; i <= app.project.numItems; i++) {
		var item = app.project.item(i);

		if (!(item instanceof FootageItem) || !item.file) continue; // sólidos e placeholders não têm arquivo

		if (!item.file.exists) {
			res.missing.push(item.name);
			continue;
		}

		var kind = padCollectKind(item);

		if (paths[kind] == null) continue; // tipo fora da árvore: não é coletado
		if (String(item.file.fsName).replace(/\\/g, '/').toLowerCase().indexOf(rootKey) == 0) continue; // já está na pasta do projeto

		var folderPath = root.fsName + '/' + paths[kind];

		if (settings.projectFolders) folderPath += '/' + padItemProjectPath(item);

		folderPath = folderPath.replace(/\/+$/, '');

		try {
			if (kind == 'sequencias') {
				var seq = padCopySequence(item, folderPath);

				if (!seq.ok) {
					res.skipped.push(item.name);
					continue;
				}

				res.sequences++;
				res.frames += seq.frames;
				continue;
			}

			var folder = padEnsureFolder(folderPath);
			var dest = padFreeFile(folder.fsName, decodeURI(item.file.name), item.file);

			if (!dest.exists && !item.file.copy(dest)) {
				res.skipped.push(item.name);
				continue;
			}

			item.replace(dest);
			res.files++;
		} catch (err) {
			res.skipped.push(item.name + ' (' + err.message + ')');
		}
	}

	if (paths.fontes != null) res.fonts = fontCollect(root.fsName + '/' + paths.fontes);

	return res;
}

// a: { path } (sem 'path': a pasta do projeto salvo)
PADX.collectProject = function (a) {
	if (app.project.numItems == 0) throw new Error('#PAD_050 - o projeto está vazio.');

	var settings = padReadCollect();
	var file = app.project.file;
	var target = a.path ? padPath(a.path) : file ? padCollectRoot(file, settings) : '';

	if (!target) throw new Error('#PAD_095 - salve o projeto antes de coletar (os arquivos vão para a pasta dele), ou use o clique direito para escolher a pasta.');

	var hasType = false;

	for (var i = 0; i < settings.folders.length; i++) {
		if (settings.folders[i].contents.length) hasType = true;
	}

	if (!hasType) throw new Error('#PAD_094 - coletar: nenhum tipo na árvore (configuração > coletar).');

	return padCollect(function () {
		var res;

		padGroup('coletar arquivos', function () {
			padCollectStructure(target, settings);
			res = padCollectFiles(target, settings);
			padCollectStructure(target, settings); // o collect das fontes apaga a pasta delas se não houver nenhuma
		});

		// projeto sem arquivo, coletado numa pasta escolhida: salva lá (na pasta do .aep da estrutura)
		if (settings.saveAfter) {
			var sub = padCollectFolderPath(settings, 'projeto');

			if (file) app.project.save();
			else app.project.save(new File(new Folder(target).fsName + (sub ? '/' + sub : '') + '/' + (padProjectState().fileBase || 'projeto') + '.aep'));
		}

		if (res.skipped.length) alert(lol + '#PAD_093 - estes itens não puderam ser coletados:\n\n' + res.skipped.join('\n'));
		if (res.missing.length) alert(lol + '#PAD_093 - arquivos ausentes (não coletados):\n\n' + res.missing.join('\n'));

		return {
			folder: padDisplayPath(new Folder(target).fsName),
			files: res.files,
			sequences: res.sequences,
			frames: res.frames,
			fonts: res.fonts != '',
			saved: settings.saveAfter
		};
	});
};
