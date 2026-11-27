#!/usr/bin/env node
/*

---------------------------------------------------------------
> O PADEIRO — o teste da montagem dos volumes (macOS)
---------------------------------------------------------------

No Mac, montar um compartilhamento que não responde (o servidor de SP, 10.193.48.13 / promo_ber, que só abre na rede
da Globo) abre o diálogo do macOS "There was a problem connecting to the server…" e trava o After Effects até o OK.
Este teste carrega a cadeia do host/index.jsx num contexto à parte (vm), com stubs mínimos do ExtendScript (File,
Folder, $, app, system) num Mac sem nenhum volume montado, e confere:

- o que só lista ou confere (as pastas de um nível, os quadros, o plano do projeto novo, as pastas dos filmes) nunca
  monta nem testa a rede: o caminho fora dos volumes montados é "não acessível agora";
- uma ação (abrir uma pasta, abrir um .aep) testa antes se o servidor responde (nc, uns 2 s) e, sem resposta, não
  monta: o erro diz qual servidor e que ele só abre na rede da Globo; o servidor fora fica lembrado (sem testar de
  novo a cada clique);
- o painel pode avisar antes (o Node dele testa o servidor: PADX.servidorFora), e o host nem testa;
- com o servidor respondendo, monta;
- no modo local (ligado à mão), nem testa nem monta.

Roda em Node, sem dependências, sem navegador e sem After: não é teste no After de verdade.

uso: node extension/scripts/test-montagem.js   (sai com 1 se algum caso falhar)

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
// o ExtendScript de mentira: um Mac com um disco na memória e as chamadas ao sistema
// ---------------------------------------------------------------

const disk = { files: {}, folders: { '/': true, '/Volumes': true } };
const calls = [];
const reads = []; // as pastas lidas pelo host (getFiles)
const net = { reachable: false }; // o servidor responde ao nc? (fora da rede da Globo: não)

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
Folder.prototype.getFiles = function () {
	reads.push(this.fsName);
	const me = this.fsName;
	const out = [];

	Object.keys(disk.folders).forEach(function (f) { if (f != me && parentOf(f) == me) out.push(new Folder(f)); });
	Object.keys(disk.files).forEach(function (f) { if (parentOf(f) == me) out.push(new File(f)); });

	return out;
};

// as chamadas ao sistema: o mount (nada montado), o login, o teste de alcance (nc) e a montagem (osascript)
function callSystem(cmd) {
	calls.push(cmd);
	if (/^\/sbin\/mount/.test(cmd)) return '';
	if (/^id -un/.test(cmd)) return 'designer';
	if (/\bnc\b/.test(cmd)) return net.reachable ? 'ok' : 'no';
	if (/mount volume/.test(cmd)) {
		// a montagem que dá certo cria o volume
		const m = cmd.match(/@?([^@\/"]+)\/([^\/"]+)"/);

		if (net.reachable && m) {
			disk.folders['/Volumes/' + m[2]] = true;
			disk.folders['/Volumes/' + m[2] + '/PROJETOS'] = true;
		}
	}

	return '';
}

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

const ctx = vm.createContext({
	File, Folder,
	TextLayer: function () {}, CompItem: function () {}, FolderItem: function () {}, LightLayer: function () {}, CameraLayer: function () {},
	Shape: function () {}, KeyframeEase: function () {}, ExternalObject: function () {},
	PREFType: { PREF_Type_MACHINE_INDEPENDENT: 0 },
	$: { fileName: HOST + '/index.jsx', os: 'Macintosh OS 14', global: {}, hiresTimer: 1500000, sleep: function () {} },
	app: {
		version: '24.0', buildName: '24.0x1',
		project: { activeItem: anything, numItems: 0, selection: [], file: null },
		preferences: { getPrefAsString: function () { return ''; }, getPrefAsLong: function () { return 0; } },
		settings: { haveSetting: function () { return false; }, getSetting: function () { return ''; }, saveSetting: function () {} },
		executeCommand: function () {}, findMenuCommandId: function () { return 0; },
		beginUndoGroup: function () {}, endUndoGroup: function () {},
		beginSuppressDialogs: function () {}, endSuppressDialogs: function () {},
		open: function () { return null; }
	},
	system: { userName: 'designer', callSystem: callSystem },
	alert: function () {},
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

// o mapa de drives padrão (o promo_ber no 10.193.48.13), como o host aplica da configuração
vm.runInContext("DRIVE_MAP = { 'P:': '//10.193.48.13/promo_ber' };", ctx);

const PADX = ctx.PADX;

// uma chamada do painel, pelo caminho de verdade (PADX_call: a configuração aplicada, os avisos em notes)
// → { ok, data, error, notes }
function run(method, args) {
	return JSON.parse(ctx.PADX_call(method, JSON.stringify(args || {})));
}
const SP = '/Volumes/promo_ber/PROJETOS/SUMMER BEATS/2026';

function reset() {
	calls.length = 0;
	net.reachable = false;
	Object.keys(disk.folders).forEach(function (f) { if (/^\/Volumes\/./.test(f)) delete disk.folders[f]; });
	vm.runInContext('if (typeof PS_SERVIDORES != "undefined") PS_SERVIDORES = {}; PAD_MOUNT_FAILED = {};', ctx);
}

function mounts() {
	return calls.filter(function (c) { return /mount volume|open smb:/.test(c); });
}

function probes() {
	return calls.filter(function (c) { return /\bnc\b/.test(c); });
}

// ---------------------------------------------------------------

test('a cadeia do host/index.jsx carrega sem erro', function () {
	if (loadErrors.length) throw new Error(loadErrors.join('\n'));
});

// escolher um card (ou uma atração) n'O PROJETISTA lista as pastas da atração, os quadros e o plano (JÁ NA PASTA):
// nada disso monta nem testa a rede
[
	['projectFolders (as pastas de um nível)', function () { return run('projectFolders', { path: SP }); }],
	['projectQuadros (os quadros de outros anos)', function () { return run('projectQuadros', { root: '/Volumes/promo_ber/PROJETOS/SUMMER BEATS', depth: 1, here: SP }); }],
	['projectPlan (o plano do projeto novo, sem ler)', function () { return run('projectPlan', { atracao: 'SUMMER BEATS', path: SP, what: 'CHAMADA', list: false, output: '/Volumes/promo_ber/OUT/SUMMER BEATS' }); }],
	['projectPlan (o plano, o host lendo: plano B)', function () { return run('projectPlan', { atracao: 'SUMMER BEATS', path: SP, what: 'CHAMADA' }); }],
	['projectFilmsParents (as pastas das letras)', function () { return run('projectFilmsParents', { parents: ['/Volumes/promo_ber/FILMES/_S_'] }); }],
	['projectFilmsDone (as pastas dos filmes, plano B)', function () { return run('projectFilmsDone', { items: [{ parent: '/Volumes/promo_ber/FILMES/_S_', title: 'SUMMER', year: 2026 }] }); }]
].forEach(function (c) {
	test('listar não monta nem testa a rede: ' + c[0], function () {
		reset();
		c[1]();
		if (mounts().length || probes().length) throw new Error('chamou o sistema: ' + calls.join(' | '));
	});
});

// a bolinha do coletar na barra roda sozinha, de tempos em tempos: conferir a pasta gravada no projeto não monta
test('a bolinha do coletar (padColetarReady, de tempos em tempos) não monta a pasta gravada no projeto', function () {
	reset();
	vm.runInContext('var padMetaReadAntes = padMetaRead; padMetaRead = function () { return { pasta: ' + JSON.stringify(SP) + ' }; };', ctx);
	try {
		vm.runInContext('padColetarReady()', ctx);
	} finally {
		vm.runInContext('padMetaRead = padMetaReadAntes;', ctx);
	}
	if (mounts().length || probes().length) throw new Error('chamou o sistema: ' + calls.join(' | '));
});

// com o Node do painel (ADR 0003), o host só converte os caminhos: nenhuma pasta é lida por ele
test('com o Node do painel, o host não lê pastas: as de um nível (list: false e names) e os quadros (list: false)', function () {
	reset();
	disk.folders['/Volumes/promo_ber'] = true;
	disk.folders['/Volumes/promo_ber/PROJETOS'] = true;
	disk.folders['/Volumes/promo_ber/PROJETOS/SUMMER BEATS'] = true;
	disk.folders[SP] = true;
	reads.length = 0;

	const conv = run('projectFolders', { path: SP, list: false }).data;
	const lista = run('projectFolders', { path: SP, names: ['ESTREIA', '01_PROJETOS', '.DS_Store', 'Adobe After Effects Auto-Save', 'FINAL'] }).data;
	const quadros = run('projectQuadros', { root: '/Volumes/promo_ber/PROJETOS/SUMMER BEATS', depth: 1, here: SP, list: false }).data;
	const uteis = run('pastasUteis', { names: ['2025', 'OLD', '.x'], plain: true }).data;

	if (reads.length) throw new Error('o host leu: ' + reads.join(' | '));
	if (conv.listed !== false || conv.rootFs !== SP) throw new Error('conversão: ' + JSON.stringify(conv));
	if (lista.folders.map(function (f) { return f.name; }).join() !== 'ESTREIA,FINAL') throw new Error('lista: ' + JSON.stringify(lista.folders));
	if (quadros.listed !== false || quadros.rootFs !== '/Volumes/promo_ber/PROJETOS/SUMMER BEATS' || quadros.hereFs !== SP) throw new Error('quadros: ' + JSON.stringify(quadros));
	if (uteis.names.join() !== '2025') throw new Error('úteis: ' + JSON.stringify(uteis));
});

test('abrir uma pasta com o servidor fora: testa uma vez, não monta e diz qual servidor', function () {
	reset();

	const res = run('openFolder', { path: SP });
	const msg = (res.error || '') + ' ' + (res.notes || []).join(' ');

	if (mounts().length) throw new Error('montou: ' + mounts().join(' | '));
	if (probes().length !== 1) throw new Error('testes de alcance: ' + probes().length);
	if (!/10\.193\.48\.13/.test(msg) || !/promo_ber/.test(msg) || !/rede da Globo/.test(msg)) throw new Error('mensagem: ' + msg);
});

test('o servidor fora fica lembrado: o segundo clique nem testa', function () {
	reset();
	run('openFolder', { path: SP });
	calls.length = 0;
	run('openFolder', { path: SP });
	if (probes().length || mounts().length) throw new Error('chamou o sistema de novo: ' + calls.join(' | '));
});

test('abrir o .aep com o servidor fora: não monta', function () {
	reset();
	run('projectOpenFile', { path: SP + '/01_PROJETOS/SUMMER BEATS CHAMADA.aep' });
	if (mounts().length) throw new Error('montou: ' + mounts().join(' | '));
});

test('o painel avisa que o servidor está fora (o Node testou): o host nem testa', function () {
	reset();
	run('servidorFora', { servidores: ['10.193.48.13'] });
	run('openFolder', { path: SP });
	if (probes().length || mounts().length) throw new Error('chamou o sistema: ' + calls.join(' | '));
});

test('o painel pergunta quais servidores uma ação vai montar (sem montar nem testar)', function () {
	reset();

	const res = run('servidoresParaMontar', { paths: [SP, '/Volumes/promo_ber/OUT', '/Users/designer/x'] }).data || {};

	if (JSON.stringify(res.servidores) !== JSON.stringify([{ servidor: '10.193.48.13', share: 'promo_ber' }])) throw new Error(JSON.stringify(res));
	if (calls.some(function (c) { return /\bnc\b|mount volume/.test(c); })) throw new Error('chamou o sistema: ' + calls.join(' | '));
});

test('com o servidor respondendo (na rede da Globo), a ação monta', function () {
	reset();
	net.reachable = true;
	run('openFolder', { path: SP });
	if (mounts().length !== 1) throw new Error('montagens: ' + mounts().length + ' (' + calls.join(' | ') + ')');
});

test('no modo local (ligado à mão), nem testa nem monta', function () {
	reset();
	net.reachable = true;
	vm.runInContext('var padLocalForcedAntes = padLocalForced; padLocalForced = function () { return true; };', ctx);
	try {
		run('openFolder', { path: SP });
	} finally {
		vm.runInContext('padLocalForced = padLocalForcedAntes;', ctx);
	}
	if (probes().length || mounts().length) throw new Error('chamou o sistema: ' + calls.join(' | '));
});

console.log('');

if (failed) {
	console.log(failed + ' de ' + (failed + passed) + ' casos falharam na montagem dos volumes.');
	process.exit(1);
}

console.log('montagem dos volumes: ' + passed + ' casos passaram.');
