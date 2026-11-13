/*

---------------------------------------------------------------
> migração da pasta do projeto para a estrutura da configuração (O CATADOR)
---------------------------------------------------------------

O coletar COPIA para a pasta do projeto o que está fora dela. A migração ARRUMA a pasta que já existe: tudo o que
está na raiz do projeto (a pasta da atração / do quadro) vai para a estrutura de configuração > coletar, as pastas
com outra grafia (02 ARQUIVOS, 02_ARQUIVOS) se juntam e nada fica solto.

  o .aep aberto e os outros .aep da pasta      → a pasta do tipo 'projeto' (os outros, sem religar)
  os arquivos usados pelo projeto no After     → a pasta do tipo de cada um (vídeos, imagens, sequências, áudio, dados)
  o que está numa pasta de saída               → a pasta do tipo 'saidas', com as subpastas
  as fontes de uma pasta de fontes             → a pasta do tipo 'fontes'
  todo o resto                                 → a pasta do tipo 'externos', com o caminho de antes dentro dela

Os arquivos usados que estão FORA da raiz não entram: é o coletar que copia esses.

  PADX.migratePlan()   → o plano, sem mexer em nada (para o desenho: de onde sai, para onde vai, quantos, de que tipo)
  PADX.migrateBegin()  → refaz o plano, cria as pastas e guarda a lista do que mover
  PADX.migrateStep()   → move um lote
  PADX.migrateEnd()    → religa os itens, salva o .aep no lugar novo, aponta a fila de render, apaga as pastas antigas
                         que ficaram vazias e grava o registro (PAD_MIGRATION_LOG, na raiz)
  PADX.migrateUndo()   → desfaz pelo registro

Arquivo movido no disco não volta com o Ctrl+Z do After Effects: por isso o registro.

*/

var PAD_MIGRATION_LOG = '_migracao_padeiro.json';
var PAD_MIGRATION_MS = 15000; // o tempo máximo da leitura da pasta
var PAD_MIGRATION_FILES = 30000; // e o máximo de arquivos
var PAD_MIGRATION_FALLBACK = { projeto: '01_PROJETOS', saidas: '03_SAIDA', externos: '05_EXTERNOS' };
var PAD_FONT_EXT = /\.(otf|ttf|ttc|otc|woff2?|pfb|pfm|dfont)$/i;
var PAD_PROJECT_EXT = /\.(aep|aet|aepx)$/i;

var padMigration = null; // o plano da migração em andamento: { root, ops, done, failed, ... }

function padSlash(path) {
	return String(path).replace(/\\/g, '/');
}

// A pasta (relativa à raiz) que recebe o tipo; sem pasta na árvore, o padrão do tipo (ou a dos externos).
function padMigrateDest(settings, type) {
	var path = padCollectFolderPath(settings, type);

	if (path != null) return path;
	if (PAD_MIGRATION_FALLBACK[type]) return PAD_MIGRATION_FALLBACK[type];

	return padMigrateDest(settings, 'externos');
}

// Os arquivos usados pelo projeto: { chave do caminho: { id, kind, seq (o nome da subpasta da sequência), first } }.
function padMigrateUsed() {
	var used = {};

	for (var i = 1; i <= app.project.numItems; i++) {
		var item = app.project.item(i);

		if (!(item instanceof FootageItem) || padFootageMissing(item)) continue;

		var path = padFootagePath(item);

		if (!path) continue;

		var kind = padCollectKind(item);

		if (kind == 'sequencias') {
			var seq = padSequenceFrames(item);

			for (var f = 0; f < seq.files.length; f++) {
				used[padPathKey(seq.files[f].fsName)] = { id: item.id, kind: kind, seq: seq.base, first: padPathKey(seq.files[f].fsName) == padPathKey(seq.first.fsName) };
			}
		} else used[padPathKey(path)] = { id: item.id, kind: kind, seq: '', first: true };
	}

	return used;
}

// Todos os arquivos da pasta (para dentro, até 10 níveis): [{ path, rel, top }]. pula os escondidos e o registro.
function padMigrateScan(folder, rel, depth, state) {
	var list = [];

	try {
		list = folder.getFiles() || [];
	} catch (err) { }

	for (var i = 0; i < list.length; i++) {
		if (state.files.length >= PAD_MIGRATION_FILES || new Date().getTime() > state.until) {
			state.partial = true;
			return;
		}

		var name = decodeURI(list[i].name);

		if (name.charAt(0) == '.' || /^(thumbs\.db|desktop\.ini)$/i.test(name) || (rel == '' && name == PAD_MIGRATION_LOG)) continue;

		var here = rel == '' ? name : rel + '/' + name;
		var isFolder = list[i] instanceof Folder || (!/\.[A-Za-z0-9]{1,5}$/.test(name) && new Folder(list[i].fsName).exists);

		if (isFolder) {
			if (depth > 0) padMigrateScan(new Folder(list[i].fsName), here, depth - 1, state);
			continue;
		}

		state.files.push({ path: list[i].fsName, rel: here, top: here.indexOf('/') < 0 ? '' : here.split('/')[0] });
	}
}

// A pasta é de saída (render)? pelo nome, sem números e símbolos: SAIDA, SAIDAS, OUTPUT, RENDER(S), EXPORT…
function padIsOutputFolder(name, destKey) {
	var key = padFolderKey(name);

	return key == destKey || /^\d*(SAIDAS?|OUTPUTS?|RENDERS?|EXPORTS?|EXPORTADOS?)$/.test(key);
}

// O arquivo está dentro de uma pasta que não interessa (autosave, OLD, NÃO VALE…)?
function padMigrateInJunk(rel) {
	var parts = rel.split('/');

	for (var i = 0; i < parts.length - 1; i++) {
		if (padIsJunkFolder(parts[i])) return true;
	}

	return false;
}

function padIsFontsFolder(name) {
	return /^\d*(FONTS?|FONTES?)$/.test(padFolderKey(name));
}

// O plano: o que vai para onde. → { root, name, project, ops, stay, conflicts, others, outside, partial, sources, ... }
// ops: [{ from, to (relativo à raiz), type, top, id (o item do After, se usado), first, project (o .aep aberto) }]
function padMigrateBuild() {
	var file = app.project.file;

	if (!file) throw new Error('#PAD_104 - migrar: salve o projeto antes (a migração arruma a pasta onde ele está).');

	var settings = padReadCollect();
	var root = new Folder(padCollectRoot(file, settings));
	var rootKey = padPathKey(root.fsName);
	var used = padMigrateUsed();
	var state = { files: [], until: new Date().getTime() + PAD_MIGRATION_MS, partial: false };
	var plan = { root: root.fsName, name: decodeURI(root.name), project: file.fsName, ops: [], stay: 0, conflicts: 0, others: 0, outside: 0, partial: false, settings: settings };
	var taken = {};
	var destSaidas = padMigrateDest(settings, 'saidas');
	var destExt = padMigrateDest(settings, 'externos');
	var saidasKey = padFolderKey(destSaidas.split('/')[0]);
	var extKey = padPathKey(root.fsName + '/' + destExt);
	var k;

	padMigrateScan(root, '', 10, state);
	plan.partial = state.partial;

	// os usados que estão fora da raiz: é o coletar que leva
	for (k in used) {
		if (used.hasOwnProperty(k) && k.indexOf(rootKey) != 0 && used[k].first) plan.outside++;
	}

	for (var i = 0; i < state.files.length; i++) {
		var f = state.files[i];
		var name = f.rel.replace(/^.*\//, '');
		var key = padPathKey(f.path);
		var u = used[key];
		var op = { from: f.rel, to: '', type: 'externos', top: f.top, id: 0, first: false, project: false };

		if (key == padPathKey(file.fsName)) {
			op.type = 'projeto';
			op.project = true;
			op.to = padMigrateDest(settings, 'projeto') + '/' + name;
		} else if (padMigrateInJunk(f.rel)) {
			// autosave, OLD, NÃO VALE…: não é do projeto de hoje; vai inteiro para os externos, com o caminho de antes
			op.to = key.indexOf(extKey) == 0 ? f.rel : destExt + '/' + f.rel;
		} else if (PAD_PROJECT_EXT.test(name)) {
			op.type = 'projeto';
			op.to = padMigrateDest(settings, 'projeto') + '/' + name;
			plan.others++;
		} else if (u && padCollectFolderPath(settings, u.kind) != null) {
			op.type = u.kind;
			op.id = u.id;
			op.first = u.first;
			op.to = padCollectFolderPath(settings, u.kind) + (u.seq ? '/' + u.seq : '') + '/' + name;
		} else if (f.top != '' && padIsOutputFolder(f.top, saidasKey)) {
			op.type = 'saidas';
			op.to = destSaidas + '/' + f.rel.split('/').slice(1).join('/');
		} else if (PAD_FONT_EXT.test(name) && f.rel.indexOf('/') >= 0 && padIsFontsFolder(f.rel.split('/').slice(-2)[0])) {
			op.type = 'fontes';
			op.to = padMigrateDest(settings, 'fontes') + '/' + name;
		} else {
			if (u) {
				op.id = u.id;
				op.first = u.first;
			}
			// o que já está na pasta dos externos fica onde está; o resto entra nela com o caminho de antes
			op.to = key.indexOf(extKey) == 0 ? f.rel : destExt + '/' + f.rel;
		}

		// já está no lugar
		if (padPathKey(root.fsName + '/' + op.to) == key) {
			taken[key] = true;
			plan.stay++;
			continue;
		}

		plan.ops.push(op);
	}

	// nomes repetidos no destino (dois arquivos com o mesmo nome, ou um que já existe lá): o segundo ganha _2, _3…
	for (var o = 0; o < plan.ops.length; o++) {
		var to = plan.ops[o].to;
		var n = 1;

		while (taken[padPathKey(root.fsName + '/' + to)] || new File(root.fsName + '/' + to).exists) {
			n++;
			to = plan.ops[o].to.replace(/(\.[^.\/]+)?$/, '_' + n + '$1');
		}

		if (n > 1) {
			plan.ops[o].to = to;
			plan.conflicts++;
		}
		taken[padPathKey(root.fsName + '/' + to)] = true;
	}

	return plan;
}

// O plano para o desenho da janela: as pastas de hoje, a estrutura nova e os fluxos entre elas.
// → { root, name, total, stay, conflicts, others, outside, partial, undo (há um registro para desfazer),
//     sources: [{ name ('' = soltos na raiz), count }], dests: [{ path, depth, type, count, extra (fora da árvore) }],
//     links: [{ from, to, type, count }] }
PADX.migratePlan = function () {
	var plan = padMigrateBuild();
	var folders = padStructureFolders(plan.settings);
	var res = { root: padDisplayPath(plan.root), name: plan.name, total: plan.ops.length, stay: plan.stay, conflicts: plan.conflicts, others: plan.others, outside: plan.outside, partial: plan.partial, undo: new File(plan.root + '/' + PAD_MIGRATION_LOG).exists, sources: [], dests: [], links: [] };
	var srcIndex = {};
	var dstIndex = {};
	var linkIndex = {};
	var i;

	for (i = 0; i < folders.length; i++) {
		dstIndex[folders[i].path] = res.dests.length;
		res.dests.push({ path: folders[i].path, depth: folders[i].depth, type: '', count: 0, extra: false });
	}

	// o tipo de cada pasta da árvore (a cor dela no desenho)
	for (i = 0; i < plan.settings.folders.length; i++) {
		var cf = plan.settings.folders[i];
		var at = dstIndex[padCollectPathOf(plan.settings, cf)];

		if (at != null && cf.contents.length) res.dests[at].type = cf.contents[0];
	}

	for (i = 0; i < plan.ops.length; i++) {
		var op = plan.ops[i];
		var parts = op.to.split('/');
		var dest = '';

		// a pasta de destino no desenho: a mais funda da árvore que contém o arquivo (ou a primeira parte do caminho)
		for (var p = parts.length - 1; p >= 1 && dest == ''; p--) {
			if (dstIndex[parts.slice(0, p).join('/')] != null) dest = parts.slice(0, p).join('/');
		}

		if (dest == '') {
			dest = parts[0];
			dstIndex[dest] = res.dests.length;
			res.dests.push({ path: dest, depth: 0, type: op.type, count: 0, extra: true });
		}

		if (srcIndex[op.top] == null) {
			srcIndex[op.top] = res.sources.length;
			res.sources.push({ name: op.top, count: 0 });
		}

		res.sources[srcIndex[op.top]].count++;
		res.dests[dstIndex[dest]].count++;
		if (res.dests[dstIndex[dest]].type == '') res.dests[dstIndex[dest]].type = op.type;

		var lk = op.top + '>' + dest + '>' + op.type;

		if (linkIndex[lk] == null) {
			linkIndex[lk] = res.links.length;
			res.links.push({ from: op.top, to: dest, type: op.type, count: 0 });
		}
		res.links[linkIndex[lk]].count++;
	}

	// os soltos na raiz por último; as pastas, por nome
	res.sources.sort(function (a, b) {
		if (a.name == '') return 1;
		if (b.name == '') return -1;
		if (a.name < b.name) return -1;
		if (a.name > b.name) return 1;
		return 0;
	});

	return res;
};

// Move um arquivo: pelo sistema (na mesma unidade é só trocar o nome: instantâneo, mesmo com vídeo grande); se não
// der, copia, confere o tamanho e apaga o original. → true se o arquivo está no lugar novo e saiu do antigo
function padMoveFile(from, to) {
	var src = new File(from);
	var dst = new File(to);

	if (!src.exists || dst.exists) return false;

	padEnsureFolder(dst.parent.fsName);

	try {
		system.callSystem(appOs == 'Win'
			? 'cmd.exe /c move /Y "' + src.fsName.replace(/"/g, '') + '" "' + dst.fsName.replace(/"/g, '') + '" 2>&1'
			: 'mv -n ' + psShellQuote(src.fsName) + ' ' + psShellQuote(dst.fsName) + ' 2>&1');
	} catch (err) { }

	src = new File(from);
	dst = new File(to);

	if (dst.exists && !src.exists) return true;
	if (dst.exists) return false; // os dois existem: algo no meio do caminho; não apaga nada

	var size = src.length;

	if (!src.copy(dst.fsName)) return false;

	dst = new File(to);
	if (!dst.exists || dst.length != size) return false;

	return src.remove();
}

// Apaga a pasta se ela ficou vazia (e as de dentro, antes); o lixo do sistema (.DS_Store, Thumbs.db) não conta.
// → quantas pastas saíram
function padRemoveEmpty(folder) {
	var list = [];
	var removed = 0;
	var left = 0;
	var i;

	if (!folder.exists) return 0;

	try {
		list = folder.getFiles() || [];
	} catch (err) {
		return 0;
	}

	for (i = 0; i < list.length; i++) {
		var name = decodeURI(list[i].name);

		if (list[i] instanceof Folder) {
			removed += padRemoveEmpty(list[i]);
			if (new Folder(list[i].fsName).exists) left++;
		} else if (!/^(\.DS_Store|\._.*|Thumbs\.db|desktop\.ini)$/i.test(name)) left++;
	}

	if (left > 0) return removed;

	for (i = 0; i < list.length; i++) {
		if (list[i] instanceof File) {
			try {
				list[i].remove();
			} catch (err) { }
		}
	}

	try {
		if (folder.remove()) removed++;
	} catch (err) { }

	return removed;
}

// Religa os itens do After que apontavam para 'fromKey → to' (o mapa { chave do caminho antigo: caminho novo }).
// → quantos itens
function padMigrateRelink(map) {
	var count = 0;

	for (var i = 1; i <= app.project.numItems; i++) {
		var item = app.project.item(i);

		if (!(item instanceof FootageItem)) continue;

		var path = padFootagePath(item);
		var to = path ? map[padPathKey(path)] : null;

		if (!to) continue;

		var file = new File(to);

		if (!file.exists) continue;

		try {
			if (padPathKind(item, path) == 'sequencias') padReplaceSequence(item, file);
			else item.replace(file);
			count++;
		} catch (err) { }
	}

	return count;
}

// A fila de render: as saídas que apontam para uma pasta que mudou passam a apontar para a nova.
// prefixes: [{ from (chave da pasta antiga), fromPath, toPath }] → [[de, para]] do que mudou
function padMigrateQueue(prefixes) {
	var changed = [];

	for (var i = 1; i <= app.project.renderQueue.numItems; i++) {
		var rq = app.project.renderQueue.item(i);

		for (var m = 1; m <= rq.numOutputModules; m++) {
			try {
				var om = rq.outputModule(m);
				var path = om.file ? om.file.fsName : '';
				var key = path ? padPathKey(path) : '';

				for (var p = 0; p < prefixes.length; p++) {
					if (key.indexOf(prefixes[p].from) != 0) continue;

					var rest = padSlash(path).substring(padSlash(prefixes[p].fromPath).length);
					var next = prefixes[p].toPath + rest;

					om.file = new File(next);
					changed.push([path, next]);
					break;
				}
			} catch (err) { }
		}
	}

	return changed;
}

// Começa: refaz o plano (a pasta pode ter mudado desde o desenho) e cria as pastas da estrutura. → { total }
PADX.migrateBegin = function () {
	var plan = padMigrateBuild();

	if (plan.partial) throw new Error('#PAD_105 - migrar: a pasta é grande demais para ler de uma vez (mais de ' + PAD_MIGRATION_FILES + ' arquivos ou muito lenta). nada foi movido.');
	if (new File(plan.root + '/' + PAD_MIGRATION_LOG).exists) throw new Error('#PAD_106 - migrar: esta pasta já foi migrada (há um registro nela). desfaça a migração antes de migrar de novo.');

	var folders = padStructureFolders(plan.settings);

	for (var i = 0; i < folders.length; i++) padEnsureFolder(plan.root + '/' + folders[i].path);

	plan.at = 0;
	plan.moved = [];
	plan.failed = [];
	padMigration = plan;

	return { total: plan.ops.length };
};

// Move um lote. a: { count } → { done, total, failed }
PADX.migrateStep = function (a) {
	var plan = padMigration;

	if (!plan) throw new Error('#PAD_107 - migrar: a migração não foi começada.');

	var end = Math.min(plan.ops.length, plan.at + Math.max(1, (a && a.count) || 10));

	for (; plan.at < end; plan.at++) {
		var op = plan.ops[plan.at];

		if (op.project) continue; // o .aep aberto: o After salva no lugar novo, no fim

		if (padMoveFile(plan.root + '/' + op.from, plan.root + '/' + op.to)) plan.moved.push(op);
		else plan.failed.push(op.from);
	}

	return { done: plan.at, total: plan.ops.length, failed: plan.failed.length };
};

// Termina: religa, salva o .aep no lugar novo, aponta a fila de render, apaga as pastas vazias e grava o registro.
// → { moved, failed: [nome], relinked, folders (apagadas), queue, project }
PADX.migrateEnd = function () {
	var plan = padMigration;

	if (!plan) throw new Error('#PAD_107 - migrar: a migração não foi começada.');

	padMigration = null;

	var map = {};
	var tops = {};
	var prefixes = [];
	var log = { version: 1, date: new Date().getTime(), project: null, moves: [], queue: [] };
	var res = { moved: plan.moved.length, failed: plan.failed, relinked: 0, folders: 0, queue: 0, project: '' };
	var destSaidas = padMigrateDest(plan.settings, 'saidas');
	var saidasKey = padFolderKey(destSaidas.split('/')[0]);
	var i;

	for (i = 0; i < plan.moved.length; i++) {
		var op = plan.moved[i];

		log.moves.push([op.from, op.to]);
		if (op.id && op.first) map[padPathKey(plan.root + '/' + op.from)] = plan.root + '/' + op.to;
		if (op.top != '') tops[op.top] = true;
	}

	padUndoBegin('PADEIRO - migrar a pasta do projeto');

	try {
		res.relinked = padMigrateRelink(map);

		// as pastas de saída antigas → a nova
		for (var top in tops) {
			if (!tops.hasOwnProperty(top) || !padIsOutputFolder(top, saidasKey) || padFolderKey(top) == padFolderKey(destSaidas)) continue;
			prefixes.push({ from: padPathKey(plan.root + '/' + top), fromPath: plan.root + '/' + top, toPath: plan.root + '/' + destSaidas });
		}

		var changed = padMigrateQueue(prefixes);

		for (i = 0; i < changed.length; i++) log.queue.push([padSlash(changed[i][0]), padSlash(changed[i][1])]);
		res.queue = changed.length;
	} finally {
		padUndoEnd();
	}

	// o .aep aberto: salva no lugar novo e, salvo, tira o antigo
	for (i = 0; i < plan.ops.length; i++) {
		if (!plan.ops[i].project) continue;

		var old = new File(plan.root + '/' + plan.ops[i].from);
		var next = new File(plan.root + '/' + plan.ops[i].to);

		padEnsureFolder(next.parent.fsName);
		app.project.save(next);

		if (new File(next.fsName).exists && padPathKey(old.fsName) != padPathKey(next.fsName)) {
			try {
				old.remove();
			} catch (err) { }
			log.project = [plan.ops[i].from, plan.ops[i].to];
			res.project = padDisplayPath(next.fsName);
		}
	}

	if (!res.project) app.project.save();

	for (var t in tops) {
		if (tops.hasOwnProperty(t)) res.folders += padRemoveEmpty(new Folder(plan.root + '/' + t));
	}

	saveTextFile(JSON.stringify(log), plan.root + '/' + PAD_MIGRATION_LOG);

	return res;
};

// Desfaz a última migração da pasta do projeto aberto, pelo registro: os arquivos voltam, os itens são religados,
// o .aep volta para o lugar de antes e a fila de render também. → { restored, failed: [nome], relinked }
PADX.migrateUndo = function () {
	var file = app.project.file;

	if (!file) throw new Error('#PAD_104 - migrar: salve o projeto antes (a migração arruma a pasta onde ele está).');

	var settings = padReadCollect();
	var root = new Folder(padCollectRoot(file, settings)).fsName;
	var logFile = new File(root + '/' + PAD_MIGRATION_LOG);

	if (!logFile.exists) throw new Error('#PAD_108 - migrar: não há um registro de migração nesta pasta para desfazer.');

	var log = JSON.parse(readFileContent(logFile));
	var res = { restored: 0, failed: [], relinked: 0 };
	var map = {};
	var dirs = {};
	var i;

	for (i = log.moves.length - 1; i >= 0; i--) {
		var from = root + '/' + log.moves[i][1];
		var to = root + '/' + log.moves[i][0];

		if (padMoveFile(from, to)) {
			res.restored++;
			map[padPathKey(from)] = to;
			dirs[log.moves[i][1].split('/')[0]] = true;
		} else res.failed.push(log.moves[i][1]);
	}

	padUndoBegin('PADEIRO - desfazer a migração');

	try {
		res.relinked = padMigrateRelink(map);

		for (i = 0; i < (log.queue || []).length; i++) {
			for (var q = 1; q <= app.project.renderQueue.numItems; q++) {
				var rq = app.project.renderQueue.item(q);

				for (var m = 1; m <= rq.numOutputModules; m++) {
					try {
						var om = rq.outputModule(m);

						if (om.file && padPathKey(om.file.fsName) == padPathKey(log.queue[i][1])) om.file = new File(log.queue[i][0]);
					} catch (err) { }
				}
			}
		}
	} finally {
		padUndoEnd();
	}

	if (log.project) {
		var back = new File(root + '/' + log.project[0]);
		var cur = new File(root + '/' + log.project[1]);

		padEnsureFolder(back.parent.fsName);
		app.project.save(back);

		if (new File(back.fsName).exists) {
			try {
				cur.remove();
			} catch (err) { }
		}
	} else app.project.save();

	// as pastas que a migração encheu e ficaram vazias saem (as da estrutura, o coletar cria de novo quando precisar)
	for (var d in dirs) {
		if (dirs.hasOwnProperty(d)) padRemoveEmpty(new Folder(root + '/' + d));
	}

	if (!res.failed.length) logFile.remove();

	return res;
};
