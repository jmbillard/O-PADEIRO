/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> O ARQUIVISTA: renomear os arquivos e as pastas de um diretório
---------------------------------------------------------------

A mesma regra do renomear das comps (configuração > renomear: a caixa, os acentos, o separador e o prefixo do
tipo), aplicada aos nomes dos arquivos e das pastas de um diretório. O prefixo do tipo vem do PRÓPRIO nome
(_CRT_HOJE → CRT - HOJE), nunca da pasta de cima.

- filesStart  → se há uma renomeação para desfazer (a janela abre sempre vazia: a pessoa escolhe a pasta)
- filesList   → os itens da pasta (e das subpastas, se pedido), com a sugestão de cada um
- filesRename → renomeia (os arquivos antes das pastas, as pastas de dentro para fora), religa no projeto aberto
                o que mudou de caminho e guarda o registro para desfazer
- filesUndo   → desfaz a última renomeação (e religa de volta)

Ficam de fora: os arquivos escondidos e de sistema, as pastas de autosave e de logs do After e os projetos (.aep,
.aet e os de outros programas). Uma sequência de imagens é um item só: o nome muda, os números ficam.

ES3: sem ternário encadeado (node extension/scripts/check-ternary.js).

*/

var PAD_FILES_MAX = 3000; // itens lidos numa pasta (com as subpastas): acima disso, a lista avisa que parou
var PAD_FILES_SKIP_EXT = /\.(aep|aet|aepx|prproj|c4d|blend|ma|mb|max|drp|nk|hip|hipnc|sesx|fcpxml)$/i;
var PAD_FILES_SKIP_NAME = /^(\.|~\$)|^(thumbs\.db|desktop\.ini)$|^adobe after effects auto-save$|\.aep logs$|^tmpaetoameproject/i;
var PAD_FILES_SEQ_MIN = 3; // a partir de quantos arquivos numerados um grupo é uma sequência

function padFilesUndoFile() {
	return new File(scriptPreferencesPath + '/arquivista_desfazer.json');
}

// caminho com barras normais, sem barra no fim (para comparar e para montar os de dentro)
function padFilesKey(path) {
	return String(path || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

// o nome de um arquivo: { base, ext } (ext sem o ponto; pasta: ext vazio)
function padFilesSplit(name, isFolder) {
	var at = isFolder ? -1 : name.lastIndexOf('.');

	if (at <= 0) return { base: name, ext: '' };

	return { base: name.slice(0, at), ext: name.slice(at + 1) };
}

// o nome novo de um item, pela regra do renomear: { plain (só o formato), typed (com o prefixo do tipo) }
function padFilesSuggest(name) {
	var base = String(name).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
	var plain = sanitizeFileName(padRenameFormat(base.replace(/[\-]+/g, ' ')));
	var typed = plain;
	var found = findMatchingPrefix(base, false);

	if (found) {
		var clean = padRenameFormat(cleanCompName(base, found));

		typed = sanitizeFileName(clean && clean.toUpperCase() !== found.prefix ? found.prefix + globalSeparator + clean : found.prefix);
		// o nome já no padrão (CRT - HOJE) não perde o separador no formato simples
		if (padRenameFormat(base) == typed) plain = typed;
	}

	return { plain: plain || base, typed: typed || base };
}

// os arquivos que o projeto aberto usa: caminho (minúsculas, barras normais) → true
function padFilesUsed() {
	var used = {};

	for (var i = 1; i <= app.project.numItems; i++) {
		var item = app.project.item(i);

		try {
			if (item instanceof FootageItem && item.file) used[padFilesKey(item.file.fsName).toLowerCase()] = true;
		} catch (err) { }
	}

	return used;
}

// os itens de uma pasta: as pastas e os arquivos, com as sequências juntas. dir: o caminho relativo à pasta lida
function padFilesRead(folder, dir, sub, used, out, state) {
	var entries = folder.getFiles();
	var folders = [];
	var files = [];
	var i;

	for (i = 0; i < entries.length; i++) {
		var name = decodeURI(entries[i].name);

		if (PAD_FILES_SKIP_NAME.test(name)) continue;
		if (entries[i] instanceof Folder) folders.push({ name: name, ref: entries[i] });
		else if (!PAD_FILES_SKIP_EXT.test(name)) files.push(name);
	}

	folders.sort(function (a, b) {
		return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
	});
	files.sort(function (a, b) {
		return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
	});

	for (i = 0; i < folders.length; i++) {
		if (out.length >= PAD_FILES_MAX) {
			state.truncated = true;

			return;
		}

		var fs = padFilesSuggest(folders[i].name);

		out.push({ dir: dir, name: folders[i].name, ext: '', kind: 'folder', plain: fs.plain, typed: fs.plain, use: false });
	}

	// as sequências: prefixo + número (3 dígitos ou mais) + extensão, com pelo menos PAD_FILES_SEQ_MIN arquivos
	var groups = {};
	var order = [];
	var solo = [];

	for (i = 0; i < files.length; i++) {
		var parts = padFilesSplit(files[i], false);
		var m = /^(.*?)([\s._\-]*)(\d{3,})$/.exec(parts.base);

		if (m && m[1] && PAD_IMAGE_EXT.test(files[i])) {
			var key = m[1] + '\n' + m[2] + '\n' + m[3].length + '\n' + parts.ext.toLowerCase();

			if (!groups[key]) {
				groups[key] = { prefix: m[1], sep: m[2], pad: m[3].length, ext: parts.ext, nums: [], files: [] };
				order.push(key);
			}
			groups[key].nums.push(parseInt(m[3], 10));
			groups[key].files.push(files[i]);
		} else {
			solo.push(files[i]);
		}
	}

	var base = padFilesKey(folder.fsName);
	var k;

	for (k = 0; k < order.length; k++) {
		var g = groups[order[k]];

		if (g.files.length < PAD_FILES_SEQ_MIN) {
			for (i = 0; i < g.files.length; i++) solo.push(g.files[i]);
			continue;
		}

		var min = g.nums[0];
		var max = g.nums[0];
		var inUse = false;

		for (i = 0; i < g.nums.length; i++) {
			if (g.nums[i] < min) min = g.nums[i];
			if (g.nums[i] > max) max = g.nums[i];
			if (used[(base + '/' + g.files[i]).toLowerCase()]) inUse = true;
		}

		var two = function (n) {
			var s = String(n);

			while (s.length < g.pad) s = '0' + s;

			return s;
		};
		var ss = padFilesSuggest(g.prefix);

		out.push({ dir: dir, name: g.prefix, ext: g.ext, kind: 'seq', sep: g.sep, pad: g.pad, frames: g.sep + '[' + two(min) + '-' + two(max) + ']', count: g.files.length, plain: ss.plain, typed: ss.typed, use: inUse });
	}

	solo.sort(function (a, b) {
		return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
	});

	for (i = 0; i < solo.length; i++) {
		if (out.length >= PAD_FILES_MAX) {
			state.truncated = true;

			return;
		}

		var sp = padFilesSplit(solo[i], false);
		var sg = padFilesSuggest(sp.base);

		out.push({ dir: dir, name: sp.base, ext: sp.ext, kind: 'file', plain: sg.plain, typed: sg.typed, use: !!used[(base + '/' + solo[i]).toLowerCase()] });
	}

	if (!sub) return;

	for (i = 0; i < folders.length; i++) {
		if (state.truncated) return;
		padFilesRead(folders[i].ref, dir ? dir + '/' + folders[i].name : folders[i].name, true, used, out, state);
	}
}

// a janela abre sempre vazia (a pessoa escolhe a pasta): só diz se há uma renomeação para desfazer
PADX.filesStart = function () {
	return { undo: padFilesUndoInfo() };
};

// a: { path, sub } → { path, name, items, truncated, undo }
PADX.filesList = function (a) {
	var folder = new Folder(padMountedPath(padPath(a.path)));

	if (!a.path || !folder.exists) throw new Error('#PAD_113 - a pasta não foi encontrada: ' + padDisplayPath(a.path || ''));

	var out = [];
	var state = { truncated: false };

	padFilesRead(folder, '', a.sub === true, padFilesUsed(), out, state);

	return { path: padDisplayPath(folder.fsName), name: decodeURI(folder.name), items: out, truncated: state.truncated, undo: padFilesUndoInfo() };
};

// o que dá para desfazer: { count, folder, when } ou null
function padFilesUndoInfo() {
	try {
		var file = padFilesUndoFile();

		if (!file.exists) return null;

		var data = JSON.parse(readFileContent(file));

		if (!data || !(data.ops instanceof Array) || !data.ops.length) return null;

		return { count: data.count || data.ops.length, folder: padDisplayPath(data.folder || ''), when: data.when || 0 };
	} catch (err) {
		return null;
	}
}

// renomeia um arquivo ou uma pasta para o nome novo, na mesma pasta. só a caixa muda (a → A): passa por um nome
// provisório, porque nos discos que não diferenciam a caixa o nome novo "já existe". devolve '' ou o motivo
function padFilesMove(ref, parentPath, newName, isFolder) {
	var oldName = decodeURI(ref.name);

	if (oldName == newName) return '';

	var target = isFolder ? new Folder(parentPath + '/' + newName) : new File(parentPath + '/' + newName);
	var caseOnly = oldName.toLowerCase() == newName.toLowerCase();

	if (target.exists && !caseOnly) return 'já existe ' + newName;

	if (caseOnly) {
		var tmp = '__padeiro_' + new Date().getTime() + '_' + Math.floor(Math.random() * 100000);

		if (!ref.rename(tmp)) return 'não foi possível renomear (em uso ou sem permissão)';

		var mid = isFolder ? new Folder(parentPath + '/' + tmp) : new File(parentPath + '/' + tmp);

		if (!mid.rename(newName)) {
			mid.rename(oldName);

			return 'não foi possível renomear (em uso ou sem permissão)';
		}

		return '';
	}

	return ref.rename(newName) ? '' : 'não foi possível renomear (em uso ou sem permissão)';
}

// um caminho de antes → onde ele está agora, passando pelas renomeações na ordem em que foram feitas
function padFilesMap(path, ops) {
	var p = padFilesKey(path);

	for (var i = 0; i < ops.length; i++) {
		if (p == ops[i].from) p = ops[i].to;
		else if (p.indexOf(ops[i].from + '/') == 0) p = ops[i].to + p.slice(ops[i].from.length);
	}

	return p;
}

// religa no projeto aberto os arquivos que mudaram de caminho. devolve quantos foram religados
function padFilesRelink(ops) {
	var count = 0;

	for (var i = 1; i <= app.project.numItems; i++) {
		var item = app.project.item(i);

		try {
			if (!(item instanceof FootageItem) || !item.file) continue;

			var was = padFilesKey(item.file.fsName);
			var now = padFilesMap(was, ops);

			if (now == was) continue;

			var file = new File(now);

			if (!file.exists) continue;
			if (padIsSequence(item)) padReplaceSequence(item, file);
			else item.replace(file);
			count++;
		} catch (err) { }
	}

	return count;
}

// a: { path, items: [{ dir, name, ext, kind, sep, pad, to }] } → { count, relinked, errors: [{ name, error }], undo }
PADX.filesRename = function (a) {
	var root = new Folder(padMountedPath(padPath(a.path)));

	if (!a.path || !root.exists) throw new Error('#PAD_113 - a pasta não foi encontrada: ' + padDisplayPath(a.path || ''));

	var base = padFilesKey(root.fsName);
	var list = a.items instanceof Array ? a.items.slice(0) : [];
	var ops = [];
	var errors = [];
	var count = 0;
	var i;

	// os arquivos (e as sequências) antes das pastas; as pastas de dentro para fora: o caminho de cada item ainda
	// vale na hora dele
	var depth = function (it) {
		return it.dir ? String(it.dir).split('/').length : 0;
	};

	list.sort(function (x, y) {
		var fx = x.kind == 'folder' ? 1 : 0;
		var fy = y.kind == 'folder' ? 1 : 0;

		if (fx != fy) return fx - fy;

		return depth(y) - depth(x);
	});

	for (i = 0; i < list.length; i++) {
		var it = list[i];
		var to = sanitizeFileName(String(it.to == null ? '' : it.to));
		var parent = base + (it.dir ? '/' + it.dir : '');
		var why = '';

		if (!to) {
			errors.push({ name: it.name, error: 'sem nome' });
			continue;
		}

		if (it.kind == 'folder') {
			var dref = new Folder(parent + '/' + it.name);

			if (!dref.exists) why = 'não está mais na pasta';
			else why = padFilesMove(dref, parent, to, true);
			if (!why && it.name != to) ops.push({ from: parent + '/' + it.name, to: parent + '/' + to, dir: true });
		} else if (it.kind == 'seq') {
			// os quadros: o mesmo prefixo, separador, quantidade de dígitos e extensão
			var frames = new Folder(parent).getFiles();
			var done = 0;

			for (var f = 0; f < frames.length && !why; f++) {
				if (!(frames[f] instanceof File)) continue;

				var fname = decodeURI(frames[f].name);
				var fp = padFilesSplit(fname, false);
				var fm = /^(.*?)([\s._\-]*)(\d{3,})$/.exec(fp.base);

				if (!fm || fm[1] != it.name || fm[2] != (it.sep || '') || fm[3].length != it.pad || fp.ext.toLowerCase() != String(it.ext || '').toLowerCase()) continue;

				var newFrame = to + fm[2] + fm[3] + '.' + fp.ext;

				why = padFilesMove(frames[f], parent, newFrame, false);
				if (!why && fname != newFrame) {
					ops.push({ from: parent + '/' + fname, to: parent + '/' + newFrame });
					done++;
				}
			}
			if (!why && !done) why = 'não está mais na pasta';
		} else {
			var full = it.name + (it.ext ? '.' + it.ext : '');
			var fref = new File(parent + '/' + full);
			var newFull = to + (it.ext ? '.' + it.ext : '');

			if (!fref.exists) why = 'não está mais na pasta';
			else why = padFilesMove(fref, parent, newFull, false);
			if (!why && full != newFull) ops.push({ from: parent + '/' + full, to: parent + '/' + newFull });
		}

		if (why) errors.push({ name: it.name + (it.ext ? '.' + it.ext : ''), error: why });
		else count++;
	}

	var relinked = 0;

	if (ops.length) {
		relinked = padFilesRelink(ops);

		// o registro para desfazer: as renomeações na ordem em que foram feitas
		try {
			var prefs = new Folder(scriptPreferencesPath);

			if (!prefs.exists) prefs.create();
			saveTextFile(JSON.stringify({ folder: base, count: count, when: new Date().getTime(), ops: ops }), padFilesUndoFile().fsName);
		} catch (err) { }
	}

	return { count: count, relinked: relinked, errors: errors, undo: padFilesUndoInfo() };
};

// desfaz a última renomeação: de trás para a frente, cada item volta para o nome de antes (e o projeto é religado)
PADX.filesUndo = function () {
	var file = padFilesUndoFile();
	var data = null;

	try {
		data = file.exists ? JSON.parse(readFileContent(file)) : null;
	} catch (err) { }

	if (!data || !(data.ops instanceof Array) || !data.ops.length) throw new Error('#PAD_114 - não há renomeação para desfazer.');

	var back = [];
	var errors = [];

	for (var i = data.ops.length - 1; i >= 0; i--) {
		var op = data.ops[i];
		var at = op.to.lastIndexOf('/');
		var parent = op.to.slice(0, at);
		var oldName = op.from.slice(op.from.lastIndexOf('/') + 1);
		var isFolder = op.dir === true;
		var ref = isFolder ? new Folder(op.to) : new File(op.to);
		var why = '';

		if (!ref.exists) why = 'não está mais na pasta';
		else why = padFilesMove(ref, parent, oldName, isFolder);

		if (why) errors.push({ name: op.to.slice(at + 1), error: why });
		else back.push({ from: op.to, to: op.from, dir: isFolder });
	}

	var relinked = back.length ? padFilesRelink(back) : 0;

	try {
		file.remove();
	} catch (err2) { }

	return { count: back.length, relinked: relinked, errors: errors, folder: padDisplayPath(data.folder || ''), undo: null };
};
