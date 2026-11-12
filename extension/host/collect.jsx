/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> coletar (botão COLETAR da barra e aba COLETAR da configuração)
---------------------------------------------------------------

Copia os arquivos usados no projeto para a pasta do projeto (a do .aep), numa árvore de pastas por
tipo, e troca os caminhos dos itens para as cópias. Sequências de imagens são copiadas inteiras (os
quadros do trecho usado), cada uma na própria subpasta.

'COLLECT' no O_PADEIRO_GLOBAL_config.json:
  folders        → a árvore, dentro da pasta do projeto: [{ name, parent, contents: [...] }]
                   tipos: videos, sequencias, imagens, audio, dados, fontes. tipo fora da árvore: não é coletado.
                   'projeto' marca a pasta do .aep: a janela PROJETO salva ali e o coletar usa a pasta de
                   cima como a raiz da estrutura. as pastas sem tipo também são criadas (ex: 03 SAIDA)
Sem 'COLLECT' no arquivo: PAD_DEFAULT_COLLECT.

*/

var PAD_COLLECT_CONTENTS = ['projeto', 'videos', 'sequencias', 'imagens', 'audio', 'dados', 'fontes'];

// A estrutura padrão: o .aep em 01, os arquivos em 02 (por tipo), as saídas em 03 (com os previews) e as referências em 04.
var PAD_DEFAULT_COLLECT = {
	folders: [
		{ name: '01_PROJETOS', parent: '', contents: ['projeto'] },
		{ name: '02_ARQUIVOS', parent: '', contents: [] },
		{ name: 'FONTS', parent: '02_ARQUIVOS', contents: ['fontes'] },
		{ name: 'IMAGENS', parent: '02_ARQUIVOS', contents: ['imagens', 'sequencias'] },
		{ name: 'VÍDEOS', parent: '02_ARQUIVOS', contents: ['videos'] },
		{ name: 'AUDIOS', parent: '02_ARQUIVOS', contents: ['audio'] },
		{ name: 'DADOS', parent: '02_ARQUIVOS', contents: ['dados'] },
		{ name: '03_SAIDA', parent: '', contents: [] },
		{ name: 'PREVIEWS', parent: '03_SAIDA', contents: [] },
		{ name: '04_REFS', parent: '', contents: [] }
	]
};

// Valida e normaliza a seção vinda do painel. Lança Error com a mensagem.
function padCleanCollect(o) {
	var clean = { folders: [] }; // 'projectFolders' e 'saveAfter' (antigos) são ignorados: o coletar sempre salva
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

// Nome de pasta para comparar: sem acentos, espaços e símbolos, em maiúsculas (01PROJETOS = 01 PROJETOS).
function padFolderKey(name) {
	return String(name || '').replaceSpecialCharacters().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Pasta que o After Effects (ou alguém) cria e não interessa nas listas: autosave, logs, as pastas sem nome
// (Adobe After Effects Auto-Save, Auto-Save, logs, New Folder, untitled folder 2, Nova pasta (3), Sem título…) e as
// que guardam o que saiu de uso (OLD, _old, NÃO VALE, nao_vale, NÃO USAR).
function padIsJunkFolder(name) {
	var n = padTrim(name);
	var key = padFolderKey(n);

	return key == 'OLD' || key == 'OLDS' || key == 'NAOVALE' || key == 'NAOUSAR' || /auto[\s._-]*save/i.test(n) || /^logs?$/i.test(n) || /^(new folder|untitled( folder)?|nova pasta|(pasta )?sem t[i\u00ED]tulo)([\s._-]*\(?\d+\)?)?$/i.test(n);
}

// Pasta de projetos com outra grafia, comum no servidor: 01 PROJETOS, 01PROJETOS, 01 PROJETO, PROJETOS.
function padIsProjectsFolderName(name) {
	return /^(0?1)?PROJETOS?$/.test(padFolderKey(name));
}

// A subpasta 'name' de 'parent', aceitando uma que já exista com outra grafia (e a do .aep, com as
// variações de PROJETOS). Cria com o nome da árvore se não houver.
function padChildFolder(parent, name, isProjects) {
	var key = padFolderKey(name);
	var items = new Folder(parent).exists ? new Folder(parent).getFiles() || [] : [];

	for (var i = 0; i < items.length; i++) {
		var other = decodeURI(items[i].name);

		// pela lista (na rede, uma pasta pode vir como File: confere pelo caminho)
		if (padFolderKey(other) != key && !(isProjects && padIsProjectsFolderName(other))) continue;
		if (items[i] instanceof Folder || new Folder(items[i].fsName).exists) return new Folder(items[i].fsName);
	}

	// a lista não achou: as grafias comuns da pasta de projetos, direto pelo caminho
	if (isProjects) {
		var found = padProjectsVariant(parent, name);

		if (found) return found;
	}

	return padEnsureFolder(new Folder(parent).fsName + '/' + name);
}

// A pasta de projetos dentro de 'parent' com outra grafia (01PROJETOS, PROJETOS…), procurada pelo caminho de cada
// uma (o nome da árvore fica de fora: se não existir, é ele que vai ser criado). → Folder ou null
function padProjectsVariant(parent, name) {
	var names = ['01PROJETOS', '01 PROJETOS', 'PROJETOS', '01 PROJETO', '01PROJETO', '1 PROJETOS', '01_PROJETOS', '01-PROJETOS'];
	var base = new Folder(parent).fsName;

	for (var i = 0; i < names.length; i++) {
		if (names[i] == name) continue;

		var f = new Folder(base + '/' + names[i]);

		if (f.exists) return f;
	}

	return null;
}

// Caminho da árvore ('02 ARQUIVOS/VÍDEOS') dentro da raiz, usando as pastas que já existem.
function padCollectResolve(root, relPath, isProjects) {
	var folder = padEnsureFolder(root);
	var parts = String(relPath || '').split('/');

	for (var p = 0; p < parts.length; p++) {
		if (parts[p] == '') continue;
		folder = padChildFolder(folder.fsName, parts[p], isProjects && p == parts.length - 1);
	}

	return folder.fsName;
}

// Cria a estrutura inteira na raiz (as pastas sem tipo também, como a de saída), sem duplicar as que
// já existem com outra grafia.
// kinds (opcional): só as pastas desses tipos (e as sem tipo, como a de saída); as outras o coletar cria
// quando precisar.
function padCollectStructure(root, settings, kinds) {
	var list = padStructureFolders(settings, kinds);

	for (var i = 0; i < list.length; i++) padCollectResolve(root, list[i].path, list[i].projects);
}

// As pastas da estrutura, pai antes dos filhos: [{ path, name, depth, projects }].
function padStructureFolders(settings, kinds) {
	var keep = {};
	var out = [];
	var i, j;

	for (i = 0; i < settings.folders.length; i++) {
		var f = settings.folders[i];
		var ok = !kinds || f.contents.length == 0;

		for (j = 0; kinds && !ok && j < f.contents.length; j++) if (padIndexOf(kinds, f.contents[j]) >= 0) ok = true;
		if (!ok) continue;

		var parts = padCollectPathOf(settings, f).split('/');

		for (j = 1; j <= parts.length; j++) {
			var path = parts.slice(0, j).join('/');

			if (!keep[path]) {
				keep[path] = true;
				out.push({ path: path, name: parts[j - 1], depth: j - 1, projects: j == parts.length && f.contents.join(',').indexOf('projeto') >= 0 });
			}
		}
	}

	return out.sort(function (a, b) {
		if (a.path < b.path) return -1;
		if (a.path > b.path) return 1;
		return 0;
	});
}

function padIndexOf(list, value) {
	for (var i = 0; i < list.length; i++) if (list[i] == value) return i;
	return -1;
}

// A raiz da estrutura de um .aep: a pasta de cima, se ele está na pasta do tipo 'projeto' (01 PROJETOS,
// com as grafias do servidor); senão, a pasta dele.
function padCollectRoot(file, settings) {
	var folder = file.parent;
	var sub = padCollectFolderPath(settings, 'projeto');

	if (!sub) return folder.fsName;

	var parts = sub.split('/');
	var cur = folder;

	for (var i = parts.length - 1; i >= 0; i--) {
		var name = cur ? decodeURI(cur.name) : '';
		var ok = i == parts.length - 1 ? padIsProjectsFolderName(name) || padFolderKey(name) == padFolderKey(parts[i]) : padFolderKey(name) == padFolderKey(parts[i]);

		if (!cur || !ok) return folder.fsName;
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

// o que o mkdir do sistema respondeu na última vez que o plano B rodou (para a mensagem de erro)
var padLastMkdir = '';

function padEnsureFolder(path) {
	var folder = new Folder(path);

	// cria direto, sem perguntar antes se existe (na rede do macOS, perguntar por uma pasta que ainda não existe
	// atrasa ela aparecer depois de criada). falhou: as pastas de cima primeiro (o Folder.create não cria as
	// intermediárias em todo sistema) e de novo
	if (!folder.create()) {
		if (folder.parent && !folder.parent.exists) padEnsureFolder(folder.parent.fsName);
		folder.create();
	}
	if (!folder.exists) folder = padWaitFolder(folder.fsName, 2000);

	// plano B: o mkdir do sistema (o Folder.create falha calado em alguns compartilhamentos de rede)
	if (!folder.exists) {
		try {
			padLastMkdir = String(system.callSystem(appOs == 'Win'
				? 'cmd.exe /c mkdir "' + folder.fsName.replace(/"/g, '') + '" 2>&1'
				: 'mkdir -p ' + psShellQuote(folder.fsName) + ' 2>&1')).replace(/^\s+|\s+$/g, '');
		} catch (err) {
			padLastMkdir = err.message;
		}
		folder = padWaitFolder(folder.fsName, 4000);
	}

	return folder;
}

// Espera a pasta aparecer: no compartilhamento de rede do macOS, uma pasta recém-criada pode demorar uns segundos
// para existir para o After Effects (o sistema guarda que ela "não existia"). listar a pasta de cima ajuda.
function padWaitFolder(path, ms) {
	var folder = new Folder(path);

	for (var waited = 0; !folder.exists && waited < ms; waited += 250) {
		if (folder.parent) folder.parent.getFiles();
		$.sleep(250);
		folder = new Folder(path);
	}

	return folder;
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

	padReplaceSequence(item, newFirst);

	return { ok: true, frames: copied };
}

// As pastas de cada tipo na árvore do coletar ({ videos: 'caminho', … }; null: o tipo fica fora).
function padCollectPaths(settings) {
	var paths = {};

	for (var i = 0; i < PAD_COLLECT_CONTENTS.length; i++) paths[PAD_COLLECT_CONTENTS[i]] = padCollectFolderPath(settings, PAD_COLLECT_CONTENTS[i]);

	return paths;
}

// Os itens que o coletar vai copiar (fora da pasta do projeto, com o tipo na árvore) e os que faltam.
// → { ids, missing: [nome] }
function padCollectQueue(root, paths) {
	var rootKey = padPathKey(root.fsName); // L:\… e \\servidor\…, VFX e VFX-1: a mesma pasta
	var out = { ids: [], missing: [] };

	for (var i = 1; i <= app.project.numItems; i++) {
		var item = app.project.item(i);

		if (!(item instanceof FootageItem) || !item.file) continue; // sólidos e placeholders não têm arquivo

		if (!item.file.exists) {
			out.missing.push(item.name);
			continue;
		}

		if (paths[padCollectKind(item)] == null) continue; // tipo fora da árvore: não é coletado
		if (padPathKey(item.file.fsName).indexOf(rootKey) == 0) continue; // já está na pasta do projeto

		out.ids.push(item.id);
	}

	return out;
}

// Copia um item para a pasta do tipo dele e troca o caminho no projeto. soma em res.
function padCollectItem(item, root, paths, res) {
	var kind = padCollectKind(item);
	var folderPath = padCollectResolve(root.fsName, paths[kind], false);

	try {
		if (kind == 'sequencias') {
			var seq = padCopySequence(item, folderPath);

			if (!seq.ok) {
				res.skipped.push(item.name);
				return;
			}

			res.sequences++;
			res.frames += seq.frames;
			return;
		}

		var folder = padEnsureFolder(folderPath);
		var dest = padFreeFile(folder.fsName, decodeURI(item.file.name), item.file);

		if (!dest.exists && !item.file.copy(dest)) {
			res.skipped.push(item.name);
			return;
		}

		item.replace(dest);
		res.files++;
	} catch (err) {
		res.skipped.push(item.name + ' (' + err.message + ')');
	}
}

// A pasta onde coletar (a escolhida ou a raiz do projeto) e a configuração, já conferidas.
function padCollectTarget(a) {
	if (app.project.numItems == 0) throw new Error('#PAD_050 - o projeto está vazio.');

	var settings = padReadCollect();
	var file = app.project.file;
	var target = '';

	// if/else em vez de ternário encadeado (o ExtendScript agrupa 'a ? b : c ? d : e' do jeito errado)
	if (a && a.path) target = padPath(a.path);
	else if (file) target = padCollectRoot(file, settings);

	if (!target) throw new Error('#PAD_095 - salve o projeto antes de coletar (os arquivos vão para a pasta dele), ou use o clique direito para escolher a pasta.');

	var hasType = false;

	for (var i = 0; i < settings.folders.length; i++) {
		if (settings.folders[i].contents.length) hasType = true;
	}

	if (!hasType) throw new Error('#PAD_094 - coletar: nenhum tipo na árvore (configuração > coletar).');

	return { target: target, settings: settings };
}

// Depois de copiar: as fontes, a estrutura, salvar (sempre) e os avisos. → os números para o painel
function padCollectFinish(target, settings, res) {
	var file = app.project.file;
	var paths = padCollectPaths(settings);

	padGroup('coletar fontes', function () {
		if (paths.fontes != null) res.fonts = fontCollect(padCollectResolve(new Folder(target).fsName, paths.fontes, false));
		padCollectStructure(target, settings); // o collect das fontes apaga a pasta delas se não houver nenhuma
	});

	// projeto sem arquivo, coletado numa pasta escolhida: salva lá (na pasta do .aep da estrutura)
	var sub = padCollectFolderPath(settings, 'projeto');

	if (file) app.project.save();
	else app.project.save(new File(new Folder(target).fsName + (sub ? '/' + sub : '') + '/' + (padAepName(padXmpGet('title')) || 'projeto') + '.aep'));

	if (res.skipped.length) alert(lol + '#PAD_093 - estes itens não puderam ser coletados:\n\n' + res.skipped.join('\n'));
	if (res.missing.length) alert(lol + '#PAD_093 - arquivos ausentes (não coletados):\n\n' + res.missing.join('\n'));

	return {
		folder: padDisplayPath(new Folder(target).fsName),
		files: res.files,
		sequences: res.sequences,
		frames: res.frames,
		fonts: res.fonts != '',
		saved: true
	};
}

// Coleta tudo numa chamada (a janela do CATADOR). a: { path } → { messages, data }
PADX.collectProject = function (a) {
	var t = padCollectTarget(a);

	return padCollect(function () {
		var root = padEnsureFolder(t.target);
		var paths = padCollectPaths(t.settings);
		var queue = padCollectQueue(root, paths);
		var res = { files: 0, sequences: 0, frames: 0, skipped: [], missing: queue.missing, fonts: '' };

		padGroup('coletar arquivos', function () {
			padCollectStructure(t.target, t.settings);

			for (var i = 0; i < queue.ids.length; i++) padCollectItem(app.project.itemByID(queue.ids[i]), root, paths, res);
		});

		return padCollectFinish(t.target, t.settings, res);
	});
};

// Coleta em partes, para a barra contar (O CATADOR): começar → copiar de lote em lote → terminar.
// collectBegin: a: { path } → { target, ids, missing }
PADX.collectBegin = function (a) {
	var t = padCollectTarget(a);
	var root = padEnsureFolder(t.target);

	padCollectStructure(t.target, t.settings);

	var queue = padCollectQueue(root, padCollectPaths(t.settings));

	return { target: t.target, ids: queue.ids, missing: queue.missing };
};

// collectStep: a: { target, ids } → { files, sequences, frames, skipped }
PADX.collectStep = function (a) {
	var settings = padReadCollect();
	var root = padEnsureFolder(a.target);
	var paths = padCollectPaths(settings);
	var res = { files: 0, sequences: 0, frames: 0, skipped: [], missing: [] };

	padGroup('coletar arquivos', function () {
		for (var i = 0; i < (a.ids || []).length; i++) {
			var item = app.project.itemByID(a.ids[i]);

			if (item && item.file && item.file.exists) padCollectItem(item, root, paths, res);
		}
	});

	return res;
};

// collectEnd: a: { target, files, sequences, frames, skipped, missing } → { messages, data }
PADX.collectEnd = function (a) {
	var settings = padReadCollect();

	return padCollect(function () {
		return padCollectFinish(a.target, settings, { files: a.files || 0, sequences: a.sequences || 0, frames: a.frames || 0, skipped: a.skipped || [], missing: a.missing || [], fonts: '' });
	});
};

/*

---------------------------------------------------------------
> estado do coletar (a bolinha da barra)
---------------------------------------------------------------

*/

// O arquivo está na rede? macOS: num volume montado (/Volumes/SHARE, menos o disco do sistema); Windows: um
// caminho de rede (\\servidor\share) ou uma letra do mapa de drives (configuração > rede).
function padIsNetworkPath(path) {
	var p = String(path || '').replace(/\\/g, '/');

	if (/^\/Volumes\/(?!Macintosh HD(\/|$))[^\/]+\//i.test(p)) return true;
	if (/^\/\/[^\/]+\/[^\/]+/.test(p)) return true;

	var drive = /^([A-Za-z]):\//.exec(p);

	return !!drive && !!(DRIVE_MAP && DRIVE_MAP[drive[1].toUpperCase()]);
}

// A chave de comparação de um caminho, a mesma no Windows e no macOS: o que está na rede vira 'share/resto'
// (sem o servidor, que muda de nome curto para completo), vindo de \\servidor\share\…, de uma letra do mapa de
// drives (configuração > rede: L:\… → \\servidor\VFX\imagem\drive_l\…) ou de /Volumes/SHARE/… (sem o sufixo
// -1 … -5). o resto fica como está. minúsculas, barras normais e com barra no fim. não vai ao disco.
function padPathKey(path) {
	var p = String(path || '').replace(/\\/g, '/').replace(/^\s+|\s+$/g, '');
	var drive = /^([a-z]):(\/|$)/i.exec(p);
	var m;

	if (drive && DRIVE_MAP && DRIVE_MAP[drive[1].toUpperCase()]) p = String(DRIVE_MAP[drive[1].toUpperCase()]).replace(/\\/g, '/').replace(/\/+$/, '') + p.substring(2);

	if ((m = /^\/\/[^\/]+\/(.*)$/.exec(p))) p = 'rede:' + m[1];
	else if ((m = /^\/Volumes\/(?!Macintosh HD(\/|$))([^\/]+?)(-[1-5])?(\/.*)?$/i.exec(p))) p = 'rede:' + m[2] + (m[4] || '');

	return p.replace(/\/+/g, '/').replace(/\/$/, '').toLowerCase() + '/';
}

// As pastas de projetos (configuração > PROJETO): o começo fixo do caminho de cada categoria, antes do
// primeiro token (…/PROGRAMAS/{atracao} → …/PROGRAMAS). [] sem categorias.
function padProjectsRoots() {
	var list = padReadProject().categories;
	var roots = [];
	var seen = {};

	for (var i = 0; i < list.length; i++) {
		var fixed = list[i].path.split('{')[0].replace(/\/[^\/]*$/, '');

		if (!fixed) continue;

		var key = padPathKey(fixed);

		if (seen[key]) continue;

		seen[key] = true;
		roots.push(key);
	}

	return roots;
}

// O arquivo está nas pastas de projetos? sem categorias na configuração, vale estar na rede.
function padInProjects(path, roots) {
	if (!roots.length) return padIsNetworkPath(path);

	var key = padPathKey(path);

	for (var i = 0; i < roots.length; i++) {
		if (key.indexOf(roots[i]) == 0) return true;
	}

	return false;
}

// Os arquivos do projeto fora das pastas de projetos (configuração > PROJETO; VFX-1 … vale como VFX). leve: só
// os caminhos dos itens. → { state: '' (sem arquivos) | 'ok' (tudo nas pastas) | 'out' (algum fora), total,
//   local (quantos fora), names }
PADX.collectStatus = function () {
	var total = 0;
	var local = 0;
	var names = [];
	var roots = padProjectsRoots();

	// o mapa de drives (as letras de rede no Windows) já vem da configuração (padApplyConfig, a cada chamada)

	for (var i = 1; i <= app.project.numItems; i++) {
		var item = app.project.item(i);

		if (!(item instanceof FootageItem) || !item.mainSource || !(item.mainSource instanceof FileSource)) continue;

		var file = item.mainSource.file;

		if (!file) continue;

		total++;

		if (!padInProjects(file.fsName, roots)) {
			local++;
			if (names.length < 3) names.push(decodeURI(file.name));
		}
	}

	return { state: total ? (local ? 'out' : 'ok') : '', total: total, local: local, names: names };
};

/*

---------------------------------------------------------------
> janela do coletar (o clique direito no coletar)
---------------------------------------------------------------

*/

// As mídias do projeto e o estado de cada uma, para a janela do coletar:
//   ok       já na pasta do projeto       local    fora das pastas de projetos (configuração > PROJETO)
//   net      nas pastas de projetos, fora da pasta do projeto      missing  o arquivo não existe
//   skip     tipo fora da árvore do coletar (configuração > coletar): não é coletado
// → { project, root, items: [{ id, name, file, kind, state, layers, frames }] }
PADX.collectList = function () {
	var settings = padReadCollect();
	var file = app.project.file;
	var root = file ? padCollectRoot(file, settings) : '';
	var rootKey = root ? padPathKey(new Folder(root).fsName) : '';
	var items = [];
	var roots = padProjectsRoots();

	for (var i = 1; i <= app.project.numItems; i++) {
		var item = app.project.item(i);

		if (!(item instanceof FootageItem)) continue;

		var path = padFootagePath(item);

		if (!path) continue; // sólidos e placeholders não têm arquivo

		var missing = padFootageMissing(item);
		var kind = missing ? padPathKind(item, path) : padCollectKind(item);
		var state;

		if (missing) state = 'missing';
		else if (rootKey && padPathKey(path).indexOf(rootKey) == 0) state = 'ok';
		else if (padCollectFolderPath(settings, kind) == null) state = 'skip';
		else if (!padInProjects(path, roots)) state = 'local';
		else state = 'net';

		var layers = 0;

		try {
			layers = item.usedIn.length;
		} catch (err) { }

		items.push({ id: item.id, name: item.name, file: path, kind: kind, state: state, layers: layers });
	}

	return { project: file ? decodeURI(file.name) : '', root: root ? padDisplayPath(root) : '', items: items };
};

// O caminho do arquivo do item, também quando ele está faltando (o After Effects 2022+ guarda o caminho
// antigo em missingFootagePath; item.file pode vir vazio). '' sem arquivo (sólido, placeholder).
function padFootagePath(item) {
	try {
		if (item.file) return String(item.file.fsName);
	} catch (err) { }

	try {
		if (item.footageMissing && item.mainSource.missingFootagePath) return String(item.mainSource.missingFootagePath);
	} catch (err) { }

	return '';
}

function padFootageMissing(item) {
	try {
		if (item.footageMissing) return true;
	} catch (err) { }

	try {
		return !!item.file && !item.file.exists;
	} catch (err) {
		return true;
	}
}

// O tipo pelo caminho, para o arquivo que falta (sem o arquivo, item.file pode não existir).
function padPathKind(item, path) {
	try {
		if (item.file) return padCollectKind(item);
	} catch (err) { }

	var name = String(path).replace(/\\/g, '/').replace(/^.*\//, '');
	var ext = getFileExt(name);
	var data = PAD_ORGANIZE.dataExtensions || [];

	for (var i = 0; i < data.length; i++) {
		if (ext == data[i]) return 'dados';
	}

	var still = true;

	try {
		still = item.mainSource.isStill;
	} catch (err) { }

	if (PAD_IMAGE_EXT.test(name)) return !still && /\d+\.[^.]+$/.test(name) ? 'sequencias' : 'imagens';

	try {
		if (item.hasAudio && !item.hasVideo) return 'audio';
	} catch (err) { }

	return 'videos';
}

// Onde o arquivo que falta está agora: o caminho no formato deste sistema, no volume que tem o caminho
// (VFX, VFX-1 … VFX-5) e, no macOS, montando o share quando nenhum volume tem (uma vez por share: 'tried').
// → o File que existe, ou null
function padRelinkCandidate(path, tried) {
	var clean = padPath(padNoVolumeSuffix(path)) || String(path);
	var file = new File(clean);

	if (file.exists) return file;

	var share = String(clean).match(/^\/Volumes\/[^\/]+\/[^\/]+/);

	if (appOs != 'Mac' || !share || tried[share[0]]) return null;

	tried[share[0]] = true;
	file = new File(padMountedPath(clean));

	return file.exists ? file : null;
}

// Resolve os arquivos faltando que estão num volume não montado ou com outro sufixo (VFX-1 …): cata o
// caminho certo e relinka (desfaz com um Ctrl+Z). a: { ids } (opcional: só esses) → { relinked, still: [nome] }
PADX.collectRelink = function (a) {
	var only = {};
	var tried = {};
	var res = { relinked: 0, still: [] };
	var i;

	for (i = 0; a && a.ids && i < a.ids.length; i++) only[a.ids[i]] = true;

	padUndoBegin('PADEIRO - relinkar arquivos');

	try {
		for (i = 1; i <= app.project.numItems; i++) {
			var item = app.project.item(i);

			if (!(item instanceof FootageItem) || (a && a.ids && !only[item.id]) || !padFootageMissing(item)) continue;

			var path = padFootagePath(item);

			if (!path) continue;

			var file = padRelinkCandidate(path, tried);

			if (!file) {
				res.still.push(item.name);
				continue;
			}

			try {
				if (padPathKind(item, path) == 'sequencias') padReplaceSequence(item, file);
				else item.replace(file);
				res.relinked++;
			} catch (err) {
				res.still.push(item.name);
			}
		}
	} finally {
		padUndoEnd();
	}

	return res;
};

// Troca pela sequência no lugar novo; a nova importação volta com a interpretação padrão: guarda e devolve a do item.
function padReplaceSequence(item, first) {
	var keep = {};
	var props = ['conformFrameRate', 'alphaMode', 'premulColor', 'invertAlpha', 'fieldSeparationType', 'removePulldown', 'loop'];
	var p;

	for (p = 0; p < props.length; p++) {
		try {
			keep[props[p]] = item.mainSource[props[p]];
		} catch (err) { }
	}

	item.replaceWithSequence(first, false);

	for (p = 0; p < props.length; p++) {
		try {
			if (keep[props[p]] !== undefined && item.mainSource[props[p]] != keep[props[p]]) item.mainSource[props[p]] = keep[props[p]];
		} catch (err) { }
	}
}

// Mostra o item no painel Project (seleciona só ele). a: { id }
PADX.collectReveal = function (a) {
	var item = app.project.itemByID(a.id);

	if (!item) return false;

	for (var i = 1; i <= app.project.numItems; i++) {
		try {
			if (app.project.item(i).selected) app.project.item(i).selected = false;
		} catch (err) { }
	}

	item.selected = true;

	return true;
};
