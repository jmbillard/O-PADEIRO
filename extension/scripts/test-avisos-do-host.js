#!/usr/bin/env node
/*

---------------------------------------------------------------
> O PADEIRO — o teste dos avisos do host (nenhum alert)
---------------------------------------------------------------

O host nunca abre a caixa do After (alert, confirm, prompt): todo aviso volta ao painel, na resposta da chamada. No
After, o coletar d'O CATADOR abriu "#PAD_093 - arquivos ausentes (não coletados)" num alert nativo, com o kaomoji do
padeiro antigo: o desvio do alert ($.global.alert, api.jsx) não segura a caixa nativa lá. Este teste carrega a cadeia
do host/index.jsx num contexto à parte (vm), com stubs mínimos do ExtendScript e um alert falso que registra as
chamadas (como no After, o desvio do alert em api.jsx não pega aqui: o $ do teste é de mentira), e confere:

- o fim do coletar (coletarEnd, a barra; coletarProject, O CATADOR) com um arquivo ausente não chama o alert e devolve
  o aviso (data.warnings) com o nome do arquivo, sem o kaomoji;
- a lista longa mostra os primeiros nomes e "e mais N".

Roda em Node, sem dependências, sem navegador e sem After: não é teste no After de verdade.

uso: node extension/scripts/test-avisos-do-host.js   (sai com 1 se algum caso falhar)

*/

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HOST = path.resolve(__dirname, '..', 'host');

let failed = 0;
let passed = 0;

function test(name, fn) {
	try {
		fn();
		passed++;
		console.log('✓ ' + name);
	} catch (err) {
		failed++;
		console.log('✗ ' + name + '\n    ' + String(err && err.message ? err.message : err).split('\n').join('\n    '));
	}
}

function readSource(file) {
	const buf = fs.readFileSync(file);
	const text = buf[0] === 0xff && buf[1] === 0xfe ? buf.toString('utf16le') : buf.toString('utf8');

	return text.replace(/^﻿/, '');
}

// ---------------------------------------------------------------
// o ExtendScript de mentira: um Mac com um disco na memória
// ---------------------------------------------------------------

const disk = { files: {}, folders: { '/': true, '/Users': true, '/Users/designer': true } };
const alerts = []; // as caixas do After que o host abriu (deve ficar vazio)

function parentOf(p) {
	return String(p).replace(/\/[^\/]*$/, '') || '/';
}

function File(p) {
	if (!(this instanceof File)) return new File(p);
	this.fsName = String(p && p.fsName ? p.fsName : p);
	this.name = this.fsName.replace(/.*\//, '');
	this.displayName = this.name;
	this.path = parentOf(this.fsName);
	this.encoding = 'UTF-8';
}
Object.defineProperty(File.prototype, 'exists', { get() { return disk.files.hasOwnProperty(this.fsName); } });
Object.defineProperty(File.prototype, 'parent', { get() { return new Folder(this.path); } });
Object.defineProperty(File.prototype, 'modified', { get() { return new Date(1000); } });
Object.defineProperty(File.prototype, 'length', { get() { return (disk.files[this.fsName] || '').length; } });
File.prototype.open = function (mode) { if (mode == 'w') disk.files[this.fsName] = ''; return true; };
File.prototype.read = function () { return disk.files[this.fsName] || ''; };
File.prototype.write = function (t) { disk.files[this.fsName] = (disk.files[this.fsName] || '') + t; return true; };
File.prototype.close = function () { return true; };
File.prototype.remove = function () { delete disk.files[this.fsName]; return true; };
File.prototype.copy = function (dest) { disk.files[String(dest.fsName || dest)] = disk.files[this.fsName] || ''; return true; };
File.decode = function (s) { return decodeURI(s); };

function Folder(p) {
	if (!(this instanceof Folder)) return new Folder(p);
	this.fsName = String(p && p.fsName ? p.fsName : p);
	this.name = this.fsName.replace(/.*\//, '');
	this.displayName = this.name;
	this.path = parentOf(this.fsName);
}
Object.defineProperty(Folder.prototype, 'exists', { get() { return disk.folders.hasOwnProperty(this.fsName); } });
Object.defineProperty(Folder.prototype, 'parent', { get() { return new Folder(this.path); } });
Folder.prototype.create = function () { disk.folders[this.fsName] = true; return true; };
Folder.prototype.remove = function () { delete disk.folders[this.fsName]; return true; };
Folder.prototype.getFiles = function () {
	const me = this.fsName;
	const out = [];

	Object.keys(disk.folders).forEach(function (f) { if (f != me && parentOf(f) == me) out.push(new Folder(f)); });
	Object.keys(disk.files).forEach(function (f) { if (parentOf(f) == me) out.push(new File(f)); });

	return out;
};
Folder.decode = function (s) { return decodeURI(s); };

const anything = new Proxy(function () {}, {
	get(target, key) {
		if (key === Symbol.toPrimitive) return function () { return 0; };
		if (key === 'length' || key === 'numProperties' || key === 'numKeys' || key === 'numLayers' || key === 'numItems') return 0;
		if (key === 'value') return [0, 0, 0];
		if (key === 'name' || key === 'expression' || key === 'matchName') return '';
		return anything;
	},
	set() { return true; },
	apply() { return anything; },
	construct() { return anything; }
});

function nativeBox(kind) {
	return function (msg) { alerts.push(kind + ': ' + msg); return false; };
}

const ctx = vm.createContext({
	File, Folder,
	TextLayer: function () {}, CompItem: function () {}, FolderItem: function () {}, LightLayer: function () {}, CameraLayer: function () {},
	Shape: function () {}, KeyframeEase: function () {}, ExternalObject: function () {},
	PREFType: { PREF_Type_MACHINE_INDEPENDENT: 0 },
	$: { fileName: HOST + '/index.jsx', os: 'Macintosh OS 14', global: {}, hiresTimer: 1500000, sleep: function () {} },
	app: {
		version: '24.0', buildName: '24.0x1',
		project: { activeItem: anything, numItems: 0, selection: [], file: null, save: function () {}, item: function () { return anything; }, itemByID: function () { return null; } },
		preferences: { getPrefAsString: function () { return ''; }, getPrefAsLong: function () { return 0; } },
		settings: { haveSetting: function () { return false; }, getSetting: function () { return ''; }, saveSetting: function () {} },
		executeCommand: function () {}, findMenuCommandId: function () { return 0; },
		beginUndoGroup: function () {}, endUndoGroup: function () {},
		beginSuppressDialogs: function () {}, endSuppressDialogs: function () {},
		open: function () { return null; }
	},
	system: { userName: 'designer', callSystem: function () { return ''; } },
	// a caixa do After: no After de verdade o desvio do alert não pega, então aqui ela fica fora do alcance dele
	alert: nativeBox('alert'),
	confirm: nativeBox('confirm'),
	prompt: nativeBox('prompt'),
	console
});
ctx.Folder.userData = new Folder('/userdata');
ctx.Folder.temp = new Folder('/tmp');
ctx.Folder.desktop = new Folder('/desk');
ctx.Folder.myDocuments = new Folder('/docs');
vm.runInContext("String.prototype.toSource = function () { return '(new String(' + JSON.stringify(String(this)) + '))'; };", ctx);

const index = readSource(path.join(HOST, 'index.jsx'));
const loadErrors = [];

index.split('\n').forEach(function (line) {
	const m = line.match(/^#include\s+"([^"]+)"/);

	if (m) {
		const file = path.resolve(HOST, m[1]);

		try {
			vm.runInContext(readSource(file).replace(/^#include.*$/gm, ''), ctx, { filename: file });
		} catch (err) {
			loadErrors.push(m[1] + ': ' + err.message);
		}
	} else if (/^var /.test(line)) {
		vm.runInContext(line, ctx);
	}
});

// uma chamada do painel, pelo caminho de verdade (PADX_call) → { ok, data, error, notes }
function run(method, args) {
	return JSON.parse(ctx.PADX_call(method, JSON.stringify(args || {})));
}

const PROJ = '/Users/designer/PROJETO';
const KAOMOJI = /Σ\(|っ|°Д|ヽ\(/;

// um projeto salvo na pasta dele, com um item cujo arquivo sumiu do disco
function reset() {
	alerts.length = 0;
	disk.folders[PROJ] = true;
	disk.files[PROJ + '/PROJETO.aep'] = '';
	ctx.app.project.file = new File(PROJ + '/PROJETO.aep');
	ctx.app.project.numItems = 1;
}

// o texto que o painel recebe: os avisos (data.warnings), as mensagens (data.messages) e as notas da chamada
function allText(res) {
	const d = res.data || {};
	const inner = d.data || {};

	return [].concat(inner.warnings || [], d.messages || [], res.notes || [], res.error || []).join('\n');
}

// ---------------------------------------------------------------

test('a cadeia do host/index.jsx carrega sem erro', function () {
	if (loadErrors.length) throw new Error(loadErrors.join('\n'));
});

test('o fim do coletar (a barra) com um arquivo ausente: nenhum alert, o aviso volta na resposta', function () {
	reset();

	const res = run('coletarEnd', { target: PROJ, files: 0, sequences: 0, frames: 0, skipped: [], missing: ['Screenshot 2026-11-23 at 15.39.02.png'] });

	if (alerts.length) throw new Error('abriu a caixa do After: ' + alerts.join(' | '));
	if (!res.ok) throw new Error('a chamada falhou: ' + res.error);

	const warnings = (res.data.data || {}).warnings || [];

	if (warnings.length !== 1) throw new Error('esperava 1 aviso em data.warnings, veio: ' + JSON.stringify(res.data));
	if (!/^#PAD_093 - /.test(warnings[0])) throw new Error('o aviso não tem o código #PAD_093: ' + warnings[0]);
	if (warnings[0].indexOf('Screenshot 2026-11-23 at 15.39.02.png') < 0) throw new Error('o aviso não traz o nome do arquivo: ' + warnings[0]);
	if (KAOMOJI.test(allText(res))) throw new Error('o kaomoji apareceu: ' + allText(res));
});

test('a lista longa de ausentes: os 5 primeiros nomes e "e mais N"', function () {
	reset();

	const names = [];

	for (let i = 1; i <= 12; i++) names.push('arquivo ' + i + '.png');

	const res = run('coletarEnd', { target: PROJ, files: 0, sequences: 0, frames: 0, skipped: [], missing: names });
	const warnings = ((res.data || {}).data || {}).warnings || [];

	if (alerts.length) throw new Error('abriu a caixa do After: ' + alerts.join(' | '));
	if (warnings[0] !== '#PAD_093 - 12 arquivos ausentes (não coletados): arquivo 1.png, arquivo 2.png, arquivo 3.png, arquivo 4.png, arquivo 5.png e mais 7.') throw new Error('veio: ' + warnings[0]);
});

test('os itens que não puderam ser copiados: aviso na resposta, sem alert', function () {
	reset();

	const res = run('coletarEnd', { target: PROJ, files: 2, sequences: 0, frames: 0, skipped: ['logo.ai (sem permissão)'], missing: [] });
	const warnings = ((res.data || {}).data || {}).warnings || [];

	if (alerts.length) throw new Error('abriu a caixa do After: ' + alerts.join(' | '));
	if (warnings[0] !== '#PAD_093 - 1 item não pôde ser coletado: logo.ai (sem permissão).') throw new Error('veio: ' + JSON.stringify(warnings));
});

test('O CATADOR (coletarProject) com um arquivo ausente: nenhum alert, o aviso volta na resposta', function () {
	reset();
	vm.runInContext('var padColetarQueueAntes = padColetarQueue; padColetarQueue = function () { return { ids: [], missing: ["Screenshot 2026-11-23 at 15.39.02.png"] }; };', ctx);

	let res;

	try {
		res = run('coletarProject', { path: PROJ });
	} finally {
		vm.runInContext('padColetarQueue = padColetarQueueAntes;', ctx);
	}

	if (alerts.length) throw new Error('abriu a caixa do After: ' + alerts.join(' | '));
	if (!res.ok) throw new Error('a chamada falhou: ' + res.error);

	const warnings = (res.data.data || {}).warnings || [];

	if (!warnings.length || warnings[0].indexOf('Screenshot 2026-11-23 at 15.39.02.png') < 0) throw new Error('sem o aviso: ' + JSON.stringify(res.data));
});

console.log('');

if (failed) {
	console.log(failed + ' de ' + (failed + passed) + ' casos falharam nos avisos do host.');
	process.exit(1);
}

console.log('avisos do host: ' + passed + ' casos passaram.');
