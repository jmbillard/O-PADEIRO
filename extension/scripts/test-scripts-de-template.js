#!/usr/bin/env node
/*

---------------------------------------------------------------
> O PADEIRO — o teste dos scripts de template (_script.js)
---------------------------------------------------------------

O script de um template (o _script.js ao lado do template, na rede) roda no host por $.evalFile, em PADX.runEnd
(host/api.jsx), depois do template processado. Esses scripts foram escritos para o padeiro antigo (ScriptUI) e
chamam as funções globais das libs dele (openWebSite, createPath, rgb, nameInc…). Elas são a interface dos scripts
que estão na rede e moram em host/lib/scripts-de-template.js.

Este teste carrega a cadeia do host/index.jsx num contexto à parte (vm), com stubs mínimos do ExtendScript (File,
Folder, $, app, system), e, para cada função, roda pelo PADX.runEnd um script de template que a chama. Confere
também que o erro de um script diz qual script falhou (#PAD_021 e o nome do arquivo).

Roda em Node, sem dependências, sem navegador e sem After: não é teste no After de verdade.

Para acrescentar uma função: uma entrada em SCRIPTS (o nome e o código do script que a chama; o script falha com
throw quando o resultado não é o esperado).

uso: node extension/scripts/test-scripts-de-template.js   (sai com 1 se algum caso falhar)

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

// lê um arquivo do host como o ExtendScript: UTF-8 ou UTF-16 (o JSON lib.js), sem o BOM
function readSource(file) {
	const buf = fs.readFileSync(file);
	const text = buf[0] === 0xff && buf[1] === 0xfe ? buf.toString('utf16le') : buf.toString('utf8');

	return text.replace(/^﻿/, '');
}

// ---------------------------------------------------------------
// o ExtendScript de mentira: um disco na memória e as chamadas ao sistema
// ---------------------------------------------------------------

const disk = { files: {}, folders: { '/': true } };
const calls = [];

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
File.prototype.open = function (mode) { this.mode = mode; if (mode == 'w') disk.files[this.fsName] = ''; return true; };
File.prototype.read = function () { return disk.files[this.fsName] || ''; };
File.prototype.write = function (t) { disk.files[this.fsName] = (disk.files[this.fsName] || '') + t; return true; };
File.prototype.close = function () { return true; };
File.prototype.copy = function (to) {
	if (!this.exists) return false;
	disk.files[typeof to == 'string' ? to : to.fsName] = disk.files[this.fsName];
	return true;
};
File.prototype.remove = function () { delete disk.files[this.fsName]; return true; };
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

// um objeto do After que aceita tudo: qualquer propriedade, chamada ou new devolve ele mesmo (as camadas, as comps)
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

function TextLayer() {}
function CompItem() {}
function FolderItem() {}
function LightLayer() {}
function CameraLayer() {}

const ctx = vm.createContext({
	File, Folder, TextLayer, CompItem, FolderItem, LightLayer, CameraLayer,
	Shape: function () {}, KeyframeEase: function () {}, ExternalObject: function () {},
	PREFType: { PREF_Type_MACHINE_INDEPENDENT: 0 },
	$: { fileName: HOST + '/index.jsx', os: 'Macintosh OS 14', global: {}, hiresTimer: 1500000, sleep: function () {} },
	app: {
		version: '24.0', buildName: '24.0x1',
		project: { activeItem: anything, numItems: 0, selection: [] },
		preferences: { getPrefAsString: function () { return ''; }, getPrefAsLong: function () { return 0; } },
		executeCommand: function (id) { calls.push('executeCommand ' + id); },
		findMenuCommandId: function (name) { return 'id:' + name; },
		beginUndoGroup: function () {}, endUndoGroup: function () {},
		beginSuppressDialogs: function () {}, endSuppressDialogs: function () {}
	},
	system: { userName: 'x', callSystem: function (cmd) { calls.push(cmd); return ''; } },
	alert: function (msg) { calls.push('alert ' + msg); },
	console
});
ctx.Folder.userData = new Folder('/userdata');
ctx.Folder.temp = new Folder('/tmp');
ctx.Folder.desktop = new Folder('/desk');
ctx.Folder.myDocuments = new Folder('/docs');

// o toSource do ExtendScript (fileToBinary usa)
vm.runInContext("String.prototype.toSource = function () { return '(new String(' + JSON.stringify(String(this)) + '))'; };", ctx);

// o $.evalFile do ExtendScript: roda o arquivo do "disco" no contexto do host
ctx.$.evalFile = function (f) {
	return vm.runInContext(disk.files[f.fsName], ctx, { filename: f.fsName });
};

// a cadeia do host/index.jsx, na ordem dos #include
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

// roda um script de template pelo caminho de verdade: o _script.js na pasta do template e o PADX.runEnd
const SCRIPT_PATH = '/rede/templates/RODAPE/_script.js';

function runTemplateScript(code) {
	disk.files[SCRIPT_PATH] = code;
	ctx.PADX_run = { files: { script: new File(SCRIPT_PATH) } };
	calls.length = 0;

	return ctx.PADX.runEnd({});
}

// ---------------------------------------------------------------
// um script de template por função (o script lança erro se o resultado não for o esperado)
// ---------------------------------------------------------------

const SCRIPTS = [
	// file system lib.js (antigo)
	['openWebSite', "openWebSite('https://exemplo');"],
	['getURLContent', "getURLContent(['https://exemplo/a.zip'], ['/tmp']);"],
	['unzipContent', "unzipContent('/tmp/a.zip', '/tmp/a');"],
	['zipContent', "zipContent('/tmp/a', '/tmp/a.zip');"],
	['createPath', "if (!createPath('/dados/a/b') || !new Folder('/dados/a/b').exists) throw new Error('não criou');"],
	['createPathFolders', "if (createPathFolders('dados2/c').fsName != '/dados2/c') throw new Error('caminho errado');"],
	['copyFile', "saveTextFile('x', '/orig/um.txt'); if (!copyFile('/orig/um.txt', '/dest') || !new File('/dest/um.txt').exists) throw new Error('não copiou');"],
	['copyFolderContent', "saveTextFile('x', '/orig2/dois.txt'); if (!copyFolderContent('/orig2', '/dest2') || !new File('/dest2/dois.txt').exists) throw new Error('não copiou');"],
	['copyFolderContentContent', "createPath('/dest3'); createPath('/orig3'); saveTextFile('x', '/orig3/tres.txt'); copyFolderContentContent('/orig3', '/dest3'); if (!new File('/dest3/tres.txt').exists) throw new Error('não copiou');"],
	['removeFolder', "createPath('/lixo/sub'); saveTextFile('x', '/lixo/sub/a.txt'); removeFolder(new Folder('/lixo')); if (new Folder('/lixo').exists) throw new Error('não apagou');"],
	['fileToBinary', "saveTextFile('ab', '/bin/a.ffx'); var s = fileToBinary(new File('/bin/a.ffx')); if (s != \"'ab'\") throw new Error(s);"],
	['createPresetFile', "if (!createPresetFile('/tmp', 'p.ffx', 'abc').exists) throw new Error('não gravou');"],
	['saveLogData', "saveTextFile('a', '/log.txt'); saveLogData(new File('/log.txt'), 'b'); if (readFileContent(new File('/log.txt')) != 'a\\nb') throw new Error('log errado');"],
	['windowsPathToMac', "if (windowsPathToMac('\\\\\\\\srv\\\\VFX\\\\a#b') != '/Volumes/VFX/a\\\\#b') throw new Error(windowsPathToMac('\\\\\\\\srv\\\\VFX\\\\a#b'));"],

	// layers lib.js (antigo)
	['shpNull', 'shpNull();'],
	['shpAdjustment', 'shpAdjustment(app.project.activeItem);'],
	['shpArrow', 'shpArrow([], []);'],
	['LOGO_GLOBO', 'LOGO_GLOBO();'],
	['cleanText', 'cleanText(app.project.activeItem);'],
	['columnText', 'columnText(app.project.activeItem);'],
	// nullPrefix nunca foi do padeiro: o script que chama createNull define o nome
	['createNull', "var nullPrefix = 'NULL'; createNull(1);"],

	// string lib.js e PROT lib.js (antigos)
	['formatObjTxt', "if (formatObjTxt({ a: 'b' }).indexOf('a →') < 0) throw new Error(formatObjTxt({ a: 'b' }));"],
	['formatObjStr', "if (formatObjStr({ a: 'b' }).indexOf('a: b') < 0) throw new Error(formatObjStr({ a: 'b' }));"],
	['nameInc', "if (nameInc('COMP 1') != 'COMP 2' || nameInc('COMP') != 'COMP 2') throw new Error(nameInc('COMP 1'));"],
	['titleCase', "if (titleCase('JOÃO DA SILVA') != 'João Da Silva') throw new Error(titleCase('JOÃO DA SILVA'));"],
	['formatShortDateAndTime', "if (formatShortDateAndTime('segunda — 21h') != 'SEG 21H') throw new Error(formatShortDateAndTime('segunda — 21h'));"],
	['String.prototype.toCamelCase', "if ('Nome Da Comp'.toCamelCase() != 'nomeDaComp') throw new Error('Nome Da Comp'.toCamelCase());"],
	['String.prototype.toShortDate', "if ('SEXTA 5 DE MARÇO'.toShortDate() != 'SEX 5 MAR') throw new Error('SEXTA 5 DE MARÇO'.toShortDate());"],

	// treeView lib.js (antigo): só os dados, sem a árvore do ScriptUI
	['buildTreeData', "createPath('/tpl/A/B'); saveTextFile('x', '/tpl/A/B/um.aep'); var d = buildTreeData(new Folder('/tpl'), ['.aep']); if (d.children[0].text != 'A / B' || d.children[0].children[0].text != 'um.aep') throw new Error(JSON.stringify(d));"],
	['readTreeData', "if (readTreeData([], ['.aep']).length != 0) throw new Error('não vazio');"],
	['optimizeTreeData', "var n = { type: 'node', text: 'A', children: [{ type: 'node', text: 'B', children: [] }] }; optimizeTreeData(n); if (n.text != 'A / B') throw new Error(n.text);"],
	['treeSearchText', "if (treeSearchText(' ação ') != 'ACAO') throw new Error(treeSearchText(' ação '));"],
	['filterTreeData', "var n = { type: 'node', text: 'R', children: [{ type: 'item', text: 'rodapé' }, { type: 'item', text: 'vinheta' }] }; if (filterTreeData(n, 'RODAPE').children.length != 1) throw new Error('filtro');"],
	['textLayerEntry', "var e = textLayerEntry(null, { enabled: true }, 'l', { text: ' a ', allCaps: true }, 0); if (e.text != 'A') throw new Error(e.text);"],
	['normalizeSearchText', "if (normalizeSearchText('Ação', false, false) != 'acao') throw new Error(normalizeSearchText('Ação', false, false));"],
	['filterTextLayerIndex', "var r = filterTextLayerIndex([{ text: 'Olá', enabled: true }, { text: 'x', enabled: true }], { sKey: 'ola', matchCase: false, matchAccent: false }); if (r.length != 1) throw new Error(r.length);"],

	// color lib.js e math num lib.js (antigos)
	['randomInteger', "var n = randomInteger(2, 5); if (n < 2 || n >= 5) throw new Error(n);"],
	['gaussRnd', "var n = gaussRnd(4); if (n < 0 || n > 1) throw new Error(n);"],
	['timer', "if (timer() != '1.50') throw new Error(timer());"],
	['randomColor', "if (randomColor(['a']) != 'a') throw new Error('cor');"],
	['rgb', "if (rgb(255, 0, 0).join() != '1,0,0') throw new Error(rgb(255, 0, 0));"],
	['rgba', "if (rgba(0, 255, 0, 255).join() != '0,1,0,1') throw new Error(rgba(0, 255, 0, 255));"],
	['componentToHex', "if (componentToHex(10) != '0a') throw new Error(componentToHex(10));"],
	['rgbToHEX', "if (rgbToHEX([1, 0, 0]) != '#FF0000') throw new Error(rgbToHEX([1, 0, 0]));"],
	['rgbToHex', "if (rgbToHex([1, 0, 0]) != '0xff0000') throw new Error(rgbToHex([1, 0, 0]));"],
	['rgbStr', "if (rgbStr([1, 0, 0]) != 'rgb(255, 0, 0)') throw new Error(rgbStr([1, 0, 0]));"],
	['hexToRgb', "if (hexToRgb('#FF0000').join() != '1,0,0') throw new Error(hexToRgb('#FF0000'));"],

	// ctrl anim lib.js (antigo)
	['lockTrmProp', 'lockTrmProp(app.project.activeItem);'],
	['cloneExpressions', 'cloneExpressions(app.project.activeItem, app.project.activeItem);'],
	['setKeys', 'setKeys(app.project.activeItem, app.project.activeItem);'],
	['cloneKeys', 'cloneKeys(app.project.activeItem, app.project.activeItem);'],
	['addPseudoEffect', "addPseudoEffect('rig', 'abc');"],
	['setHierarchy', 'setHierarchy(app.project.activeItem, app.project.activeItem);'],
	['findCenter', "if (findCenter([]).length != 3) throw new Error('centro');"],
	['applyEase', 'applyEase(app.project.activeItem);'],

	// FUNC lib.js (antigo)
	['executeCommandID', "executeCommandID('Save');"],
	// sem camada selecionada: um erro (o painel mostra como #PAD_021), nunca um alert
	['batchFill', "try { batchFill('fill', [1, 0, 0, 1]); throw new Error('sem o erro'); } catch (e) { if (e.message != 'nenhuma camada selecionada.') throw e; }"],
	['lineBreak', 'lineBreak(app.project.activeItem, 10);'],
	['fxObj', "if (typeof fxObj(app.project.activeItem) != 'object') throw new Error('fx');"],
	['buildFxObj', "if (typeof buildFxObj() != 'object') throw new Error('fx');"],
	['table1252', "if (table1252['\\u20AC'] != 128 || table1252['\\u00FF'] != 255) throw new Error('tabela');"],
	['getLabelColors', "if (getLabelColors().length != 16) throw new Error('cores');"],
	['getLabelColorNames', "if (getLabelColorNames().length != 16) throw new Error('nomes');"],
	['HEXToAscii', "if (HEXToAscii('#4142') != 'AB') throw new Error(HEXToAscii('#4142'));"],
	['asciiToHex', "if (asciiToHex('AB') != '4142') throw new Error(asciiToHex('AB'));"],
	['encodeLabelColor', "if (encodeLabelColor('#414243') != 'FF\"ABC\"') throw new Error(encodeLabelColor('#414243'));"],
	['removeItem', "if (removeItem([1, 2, 3], 1).join() != '1,3') throw new Error(removeItem([1, 2, 3], 1));"],
	['sortProdData', "if (sortProdData([{ name: 'B' }, { name: 'A' }])[0].name != 'A') throw new Error('ordem');"],
	['getProdNames', "if (getProdNames([{ name: 'A' }]).join() != 'A') throw new Error('nomes');"],

	// fonts lib.js e rename lib.js (antigos): os nomes antigos chamam os de hoje
	['getFontNames', "if (getFontNames().length != 0) throw new Error('fontes');"],
	['fontCollect', "if (fontCollect('/fontes') !== '') throw new Error(fontCollect('/fontes'));"],
	['collectRenameComps', "if (collectRenameComps([], []).length != 0) throw new Error('comps');"]
];

test('a cadeia do host/index.jsx carrega sem erro', function () {
	if (loadErrors.length) throw new Error(loadErrors.join('\n'));
});

SCRIPTS.forEach(function (s) {
	test('um script de template chama ' + s[0], function () {
		runTemplateScript(s[1]);
	});
});

test('getURLContent com listas de tamanhos diferentes: o erro chega ao painel (#PAD_021), sem alert', function () {
	let msg = '';

	try {
		runTemplateScript("getURLContent(['a', 'b'], ['c']);");
	} catch (err) {
		msg = err.message;
	}
	if (!/^#PAD_021 - .*os arrays de URLs e destinos devem ter o mesmo tamanho/.test(msg)) throw new Error('veio: ' + msg);
});

test('openWebSite abre o endereço pelo sistema (macOS: open)', function () {
	runTemplateScript("openWebSite('https://exemplo');");
	if (calls.join('|') != 'open https://exemplo') throw new Error(calls.join('|'));
});

test('o erro de um script diz qual script falhou (#PAD_021 e o nome do arquivo) e interrompe', function () {
	let msg = '';

	try {
		runTemplateScript('funcaoQueNaoExiste();');
	} catch (err) {
		msg = err.message;
	}

	if (!/#PAD_021/.test(msg) || msg.indexOf('_script.js') < 0) throw new Error('mensagem: ' + (msg || '(nenhum erro)'));
});

// as fontes do host (fontCopyTo, fonts lib.js) pelos caminhos de verdade: O TIPÓGRAFO (PADX.copyFonts) e o fim do
// coletar (PADX.coletarEnd). na 2.0 RC1, a definição e as chamadas ficaram com nomes diferentes e O CATADOR falhava
// com "Function fontCopyTo is undefined"
function withFontProject(fn) {
	const comp = new CompItem();
	const layer = new TextLayer();
	const doc = { value: { font: 'GloboTexto-Bold', fontLocation: '/sistema/fontes/GloboTexto-Bold.otf' }, numKeys: 0 };
	const project = ctx.app.project;
	const saved = { numItems: project.numItems, item: project.item, save: project.save, file: project.file };

	layer.property = function () { return { property: function () { return doc; } }; };
	comp.numLayers = 1;
	comp.layer = function () { return layer; };
	disk.files['/sistema/fontes/GloboTexto-Bold.otf'] = 'OTTO';
	project.numItems = 1;
	project.item = function () { return comp; };
	project.save = function () {};
	project.file = new File('/rede/PROJ/projeto.aep');

	try {
		fn();
	} finally {
		Object.keys(saved).forEach(function (k) { project[k] = saved[k]; });
	}
}

test('O TIPÓGRAFO copia as fontes do projeto (PADX.copyFonts → fontCopyTo)', function () {
	withFontProject(function () {
		const res = ctx.PADX.copyFonts({ path: encodeURI('/rede/PROJ') });

		if (res.data.path != '/rede/PROJ/FONTS' || !disk.files['/rede/PROJ/FONTS/GloboTexto-Bold.otf']) throw new Error(JSON.stringify(res));
	});
});

test('o fim do coletar copia as fontes (PADX.coletarEnd → fontCopyTo)', function () {
	withFontProject(function () {
		new Folder('/rede/COLETA').create();

		const res = ctx.PADX.coletarEnd({ target: '/rede/COLETA' });
		const copied = Object.keys(disk.files).filter((f) => f.indexOf('/rede/COLETA/') === 0 && /GloboTexto-Bold\.otf$/.test(f));

		if (!res.data || !res.data.fonts || copied.length != 1) throw new Error(JSON.stringify(res) + ' ' + copied.join());
	});
});

console.log('');

if (failed) {
	console.log(failed + ' de ' + (failed + passed) + ' casos falharam nos scripts de template.');
	process.exit(1);
}

console.log('scripts de template: ' + passed + ' casos passaram.');
