#!/usr/bin/env node
/*

---------------------------------------------------------------
> O PADEIRO — o teste do preenchimento (fillBegin → fillStep → fillFinish)
---------------------------------------------------------------

Carrega a cadeia do host/index.jsx num contexto à parte (vm), com um modelo mínimo do projeto do After na memória
(app.project, CompItem, FolderItem, FootageItem, as layers, as propriedades com expressão, duplicate, replaceSource,
remove, importFile, que traz os itens do template numa pasta com o nome do .aep), e preenche templates pelo caminho de
verdade (PADX.fillBegin, PADX.fillStep, PADX.fillFinish), como o painel faz.

Os cenários:
  - as precomps de nome repetido (dois templates com "BG"; o mesmo template duas vezes): a precomp nova ganha _2 e as
    expressões do template novo que citam comp("BG") passam a citar a dela;
  - a precomp que lê a comp principal pelo nome: cada versão ganha a sua, lendo a própria versão;
  - a comp principal procurada só entre os itens desta importação (uma comp TEMPLATE antiga de mesmo nome fica);
  - a organização só dos itens desta rodada: as pastas e os itens do designer ficam como estavam.

O modelo é o mínimo que o preenchimento usa: não é o After. Roda em Node, sem dependências, sem navegador e sem
After: não é teste no After de verdade.

uso: node extension/scripts/test-preenchimento.js   (sai com 1 se algum caso falhar)

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
		console.log('✗ ' + name + '\n    ' + String(err && err.stack ? err.stack.split('\n').slice(0, 3).join('\n') : err).split('\n').join('\n    '));
	}
}

function eq(got, want, msg) {
	const a = JSON.stringify(got);
	const b = JSON.stringify(want);

	if (a !== b) throw new Error((msg ? msg + ': ' : '') + 'veio ' + a + ', esperado ' + b);
}

function ok(cond, msg) {
	if (!cond) throw new Error(msg);
}

// lê um arquivo do host como o ExtendScript: UTF-8 ou UTF-16 (o JSON lib.js), sem o BOM
function readSource(file) {
	const buf = fs.readFileSync(file);
	const text = buf[0] === 0xff && buf[1] === 0xfe ? buf.toString('utf16le') : buf.toString('utf8');

	return text.replace(/^﻿/, '');
}

// ---------------------------------------------------------------
// o disco de mentira (o .aep e o _config.json dos templates)
// ---------------------------------------------------------------

const disk = { files: {}, folders: { '/': true } };

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
Folder.prototype.getFiles = function () { return []; };

// ---------------------------------------------------------------
// o projeto do After de mentira
// ---------------------------------------------------------------

const PropertyType = { PROPERTY: 6212, INDEXED_GROUP: 6213, NAMED_GROUP: 6214 };

let nextId = 1;
let project = null;

// uma propriedade (com expressão, quando dá)
function Prop(matchName, value, canSetExpression) {
	this.name = matchName;
	this.matchName = matchName;
	this.propertyType = PropertyType.PROPERTY;
	this.canSetExpression = canSetExpression !== false;
	this.expression = '';
	this.numKeys = 0;
	this.value = value === undefined ? 0 : value;
}
Prop.prototype.setValue = function (v) { this.value = v; };
Prop.prototype.clone = function () {
	const p = new Prop(this.matchName, JSON.parse(JSON.stringify(this.value)), this.canSetExpression);

	p.expression = this.expression;

	return p;
};

// um grupo de propriedades (transformação, efeitos, máscaras, texto); a layer também é um
function Group(matchName, type) {
	this.name = matchName;
	this.matchName = matchName;
	this.propertyType = type || PropertyType.NAMED_GROUP;
	this.children = [];
}
Object.defineProperty(Group.prototype, 'numProperties', { get() { return this.children.length; } });
Group.prototype.property = function (x) {
	if (typeof x === 'number') return this.children[x - 1] || null;

	for (const c of this.children) if (c.name === x || c.matchName === x) return c;

	return null;
};
// o grupo (ou a propriedade) no caminho 'A/B/C', criado se faltar (o último pedaço é a propriedade)
Group.prototype.at = function (route) {
	const parts = route.split('/');
	let g = this;

	for (let i = 0; i < parts.length - 1; i++) {
		let next = g.property(parts[i]);

		if (!next) {
			next = new Group(parts[i], /Parade$/.test(parts[i]) ? PropertyType.INDEXED_GROUP : PropertyType.NAMED_GROUP);
			g.children.push(next);
		}
		g = next;
	}

	const last = parts[parts.length - 1];
	let p = g.property(last);

	if (!p) {
		p = new Prop(last);
		g.children.push(p);
	}

	return p;
};
Group.prototype.cloneInto = function (g) {
	for (const c of this.children) {
		if (c instanceof Prop) {
			g.children.push(c.clone());
		} else {
			const sub = new Group(c.matchName, c.propertyType);

			c.cloneInto(sub);
			g.children.push(sub);
		}
	}

	return g;
};

function AVLayer(name, source) {
	Group.call(this, 'layer');
	this.name = name;
	this.source = source || null;
	this.enabled = true;
	// toda layer tem transformação (com expressão ou não) e o marcador, que não aceita expressão
	this.at('ADBE Transform Group/ADBE Opacity').value = 100;
	this.children.push(new Prop('ADBE Marker', null, false));
}
AVLayer.prototype = Object.create(Group.prototype);
AVLayer.prototype.constructor = AVLayer;
AVLayer.prototype.replaceSource = function (src, fixExpressions) {
	this.source = src;
	this.fixedExpressions = fixExpressions;
};

function TextLayer(name, text) {
	AVLayer.call(this, name, null);
	this.at('ADBE Text Properties/ADBE Text Document').value = { text: text || '' };
}
TextLayer.prototype = Object.create(AVLayer.prototype);
TextLayer.prototype.constructor = TextLayer;

function LightLayer() {}
function CameraLayer() {}

function Item(name) {
	this.id = nextId++;
	this.name = name;
	this.comment = '';
	this._parent = null;
	project._items.push(this);
}
Object.defineProperty(Item.prototype, 'parentFolder', {
	get() { return this._parent || project.rootFolder; },
	set(f) { this._parent = f === project.rootFolder ? null : f; }
});
Item.prototype.remove = function () {
	const i = project._items.indexOf(this);

	if (i >= 0) project._items.splice(i, 1);
	this.removed = true;
};

function FolderItem(name, isRoot) {
	if (isRoot) {
		this.id = 0;
		this.name = 'Root';
		return;
	}
	Item.call(this, name);
}
FolderItem.prototype = Object.create(Item.prototype);
FolderItem.prototype.constructor = FolderItem;
FolderItem.prototype.children = function () {
	const me = this;

	return project._items.filter(function (it) { return it.parentFolder === me; });
};
Object.defineProperty(FolderItem.prototype, 'numItems', { get() { return this.children().length; } });
FolderItem.prototype.item = function (i) { return this.children()[i - 1]; };
FolderItem.prototype.remove = function () {
	this.children().forEach(function (c) { c.remove(); }); // o After apaga a pasta com o que tem dentro
	Item.prototype.remove.call(this);
};

function CompItem(name) {
	Item.call(this, name);
	this._layers = [];
	this.time = 0;
}
CompItem.prototype = Object.create(Item.prototype);
CompItem.prototype.constructor = CompItem;
Object.defineProperty(CompItem.prototype, 'numLayers', { get() { return this._layers.length; } });
CompItem.prototype.layer = function (x) {
	if (typeof x === 'number') return this._layers[x - 1];

	return this._layers.find(function (l) { return l.name === x; });
};
CompItem.prototype.addLayer = function (layer) {
	this._layers.push(layer);
	layer.containingComp = this;

	return layer;
};
// a comp duplicada: o nome com " 2" (como o After), a mesma pasta e a mesma etiqueta, as layers com as mesmas fontes
CompItem.prototype.duplicate = function () {
	const c = new CompItem(this.name + ' 2');

	c.comment = this.comment;
	c.parentFolder = this.parentFolder;

	for (const l of this._layers) {
		const copy = l instanceof TextLayer ? Object.create(TextLayer.prototype) : Object.create(AVLayer.prototype);

		Group.call(copy, 'layer');
		copy.name = l.name;
		copy.source = l.source;
		copy.enabled = l.enabled;
		l.cloneInto(copy);
		c.addLayer(copy);
	}

	return c;
};
Object.defineProperty(CompItem.prototype, 'usedIn', {
	get() {
		const me = this;

		return project._items.filter(function (it) {
			return it instanceof CompItem && it._layers.some(function (l) { return l.source === me; });
		});
	}
});
CompItem.prototype.openInViewer = function () {};

function FileSource() {}
function SolidSource() {}

function FootageItem(name, still) {
	Item.call(this, name);
	this.footageMissing = false;
	this.mainSource = new FileSource();
	this.mainSource.isStill = !!still;
	this.hasVideo = !still;
	this.file = { displayName: name };
}
FootageItem.prototype = Object.create(Item.prototype);
FootageItem.prototype.constructor = FootageItem;

function ImportOptions(file) {
	this.file = file;
}

// o que cada .aep traz (montado na importação): { caminho: function () { cria os itens } }
const TEMPLATES = {};

function newProject() {
	project = {
		_items: [],
		rootFolder: new FolderItem(null, true),
		get numItems() { return this._items.length; },
		item(i) { return this._items[i - 1]; },
		itemByID(id) { return this._items.find(function (it) { return it.id === id; }) || null; },
		items: {
			addFolder(name) { return new FolderItem(name); },
			addComp(name) { return new CompItem(name); }
		},
		// o .aep entra numa pasta com o nome do arquivo, na raiz, com as pastas dele dentro
		importFile(opts) {
			const folder = new FolderItem(opts.file.name);
			const made = TEMPLATES[opts.file.fsName]();

			made.forEach(function (it) {
				if (it.parentFolder === project.rootFolder) it.parentFolder = folder;
			});

			return folder;
		},
		renderQueue: {
			numItems: 0,
			items: { add() { return { outputModule() { return { templates: ['H.264 - Match Render Settings - 15 Mbps'] }; }, remove() {} }; } }
		},
		setDefaultImportFolder() {},
		selection: [],
		activeItem: null,
		xmpPacket: '',
		bitsPerChannel: 8, expressionEngine: 'javascript-1.0', linearBlending: true, timeDisplayType: 0
	};
	ctx.app.project = project;

	return project;
}

// ---------------------------------------------------------------
// a cadeia do host
// ---------------------------------------------------------------

const ctx = vm.createContext({
	File, Folder, TextLayer, AVLayer, CompItem, FolderItem, FootageItem, LightLayer, CameraLayer, FileSource, SolidSource,
	ImportOptions, PropertyType,
	TimeDisplayType: { TIMECODE: 0 },
	Shape: function () {}, KeyframeEase: function () {}, ExternalObject: function () {},
	PREFType: { PREF_Type_MACHINE_INDEPENDENT: 0 },
	$: { fileName: HOST + '/index.jsx', os: 'Macintosh OS 14', global: {}, hiresTimer: 1500000, sleep: function () {} },
	app: {
		version: '24.0', buildName: '24.0x1',
		project: null,
		preferences: { getPrefAsString: function () { return ''; }, getPrefAsLong: function () { return 0; } },
		executeCommand: function () {},
		findMenuCommandId: function (name) { return 'id:' + name; },
		beginUndoGroup: function () {}, endUndoGroup: function () {},
		beginSuppressDialogs: function () {}, endSuppressDialogs: function () {}
	},
	system: { userName: 'x', machineName: 'mac', callSystem: function () { return ''; } },
	alert: function () {},
	console
});
ctx.Folder.userData = new Folder('/userdata');
ctx.Folder.temp = new Folder('/tmp');
ctx.Folder.desktop = new Folder('/desk');
ctx.Folder.myDocuments = new Folder('/docs');
newProject();

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

// a produção escolhida (o preenchimento anota a do template)
ctx.PADX.selectedProduction = function () { return { name: 'PRODUCAO' }; };

// ---------------------------------------------------------------
// os templates
// ---------------------------------------------------------------

const PASTA = '/rede/templates';

// um template na rede: o .aep, o _config.json e o que a importação traz
function template(name, config, build) {
	const aep = PASTA + '/' + name + '/' + name + '.aep';

	disk.files[aep] = '';
	disk.files[PASTA + '/' + name + '/' + name + '_config.json'] = JSON.stringify(Object.assign({
		configName: name,
		compName: name,
		prefix: 'RDP',
		separator: '',
		textCase: 'upperCase',
		refTime: 0,
		inputLayers: [{ layerIndex: 1, method: 'textContent' }],
		importPath: '/import',
		outputPath: ['/saida']
	}, config || {}));
	TEMPLATES[aep] = build;

	return aep;
}

function comp(name, comment, layers, folder) {
	const c = new CompItem(name);

	c.comment = comment || '';
	if (folder) c.parentFolder = folder;
	(layers || []).forEach(function (l) { c.addLayer(l); });

	return c;
}

// uma layer com expressões: { 'caminho da propriedade': 'expressão' }
function layer(name, source, exprs, text) {
	const l = text != null ? new TextLayer(name, text) : new AVLayer(name, source);

	Object.keys(exprs || {}).forEach(function (route) { l.at(route).expression = exprs[route]; });

	return l;
}

const OPACIDADE = 'ADBE Transform Group/ADBE Opacity';
const POSICAO = 'ADBE Transform Group/ADBE Position';
const EFEITO = 'ADBE Effect Parade/Brilho/ADBE Slider Control-0001';
const MASCARA = 'ADBE Mask Parade/Mascara 1/ADBE Mask Shape';
const TEXTO = 'ADBE Text Properties/ADBE Text Document';

// RODAPE: a principal lê a precomp "BG" (na transformação, no efeito, na máscara e no texto) e a "BG FUNDO"
const RODAPE = template('RODAPE', {}, function () {
	const pastaComps = new FolderItem('COMPS');
	const bg = comp('BG', '', [layer('COR', null, { [EFEITO]: 'comp("BG").layer("COR").transform.opacity' })], pastaComps);
	const bgFundo = comp('BG FUNDO', '', [layer('LISO')], pastaComps);
	const foto = new FootageItem('foto_rodape.png', true);
	const principal = comp('RODAPE', 'TEMPLATE', [
		layer('TITULO', null, { [TEXTO]: 'value' }, 'EXEMPLO'),
		layer('FUNDO', bg, { [OPACIDADE]: "comp('BG').layer('COR').transform.opacity", [POSICAO]: 'comp( "BG FUNDO" ).width' }),
		layer('MASCARADO', bgFundo, { [MASCARA]: 'comp("BG").layer(1).mask(1).maskPath' }),
		layer('LEGENDA', null, { [TEXTO]: 'comp("BG").name + " / BG"' }, 'x'),
		layer('FOTO', foto)
	], pastaComps);

	return [pastaComps, bg, bgFundo, foto, principal];
});

// CARTELA: a principal tem a precomp MEIO, que tem a TXT (lê o título da principal pelo nome) e a LOGO (não lê)
const CARTELA = template('CARTELA', {}, function () {
	const txt = comp('TXT', '', [layer('ESPELHO', null, { [TEXTO]: 'comp("CARTELA").layer("TITULO").text.sourceText' }, '')]);
	const logo = comp('LOGO', '', [layer('MARCA', null, { [OPACIDADE]: 'thisComp.layer(1).transform.opacity' })]);
	const meio = comp('MEIO', '', [layer('TEXTO', txt), layer('MARCA', logo)]);
	const principal = comp('CARTELA', 'TEMPLATE', [
		layer('TITULO', null, {}, 'EXEMPLO'),
		layer('MEIO', meio),
		layer('ECO', null, { [OPACIDADE]: 'comp("CARTELA").layer("TITULO").transform.opacity' })
	]);

	return [txt, logo, meio, principal];
});

// preenche como o painel: o começo, um passo por versão e o fim → { versions: [CompItem], begin, finish }
function preencher(aep, text) {
	const begin = ctx.PADX.fillBegin({ uri: aep, text: text, quiet: true });
	const versions = [];

	for (let i = 0; i < begin.total; i++) {
		const step = ctx.PADX.fillStep({ index: i });

		versions.push(ctx.PADX_run.newComps[ctx.PADX_run.newComps.length - 1]);
		ok(versions[i].name === step.name, 'o passo devolveu outro nome');
	}

	const finish = ctx.PADX.fillFinish();

	return { versions: versions, begin: begin, finish: finish };
}

function comps(name) {
	return project._items.filter(function (it) { return it instanceof CompItem && it.name === name; });
}

function one(name) {
	const list = comps(name);

	ok(list.length === 1, 'esperada 1 comp "' + name + '", há ' + list.length);

	return list[0];
}

function expr(c, layerName, route) {
	return c.layer(layerName).at(route).expression;
}

// todas as expressões de todas as comps do projeto
function allExpressions() {
	const out = [];

	function walk(g, where) {
		for (const c of g.children) {
			if (c instanceof Prop) {
				if (c.expression) out.push({ where: where, expression: c.expression });
			} else {
				walk(c, where);
			}
		}
	}

	project._items.forEach(function (it) {
		if (it instanceof CompItem) it._layers.forEach(function (l) { walk(l, it.name + ' > ' + l.name); });
	});

	return out;
}

function pathOf(item) {
	const parts = [];

	for (let f = item.parentFolder; f !== project.rootFolder; f = f.parentFolder) parts.unshift(f.name);

	return '/' + parts.join('/');
}

// ---------------------------------------------------------------
// os cenários
// ---------------------------------------------------------------

test('a cadeia do host/index.jsx carrega sem erro', function () {
	if (loadErrors.length) throw new Error(loadErrors.join('\n'));
});

test('dois templates com "BG": a "BG" nova ganha _2 e as expressões do template novo citam a dela', function () {
	newProject();

	// a "BG" de outro template, já no projeto, com a própria expressão
	const antiga = comp('BG', 'OUTRO', [layer('COR ANTIGA', null, { [OPACIDADE]: 'comp("BG").layer(1).transform.opacity' })]);
	const r = preencher(RODAPE, 'ANA');
	const v = r.versions[0];

	eq(antiga.name, 'BG', 'a antiga continua BG');
	eq(expr(antiga, 'COR ANTIGA', OPACIDADE), 'comp("BG").layer(1).transform.opacity', 'a expressão da antiga');

	const nova = one('BG_2');

	ok(v.layer('FUNDO').source === nova, 'a layer FUNDO da versão usa a BG nova');
	eq(expr(v, 'FUNDO', OPACIDADE), "comp('BG_2').layer('COR').transform.opacity", 'transformação');
	eq(expr(v, 'MASCARADO', MASCARA), 'comp("BG_2").layer(1).mask(1).maskPath', 'máscara');
	eq(expr(v, 'LEGENDA', TEXTO), 'comp("BG_2").name + " / BG"', 'texto (o "BG" fora de comp() fica)');
	eq(expr(nova, 'COR', EFEITO), 'comp("BG_2").layer("COR").transform.opacity', 'efeito, na própria precomp');
	eq(expr(v, 'FUNDO', POSICAO), 'comp( "BG FUNDO" ).width', 'a BG FUNDO não tinha nome repetido: fica');
	one('BG FUNDO');
});

test('o mesmo template duas vezes: cada rodada lê a sua "BG"', function () {
	newProject();

	const r1 = preencher(RODAPE, 'ANA');
	const r2 = preencher(RODAPE, 'BIA');
	const bg1 = one('BG');
	const bg2 = one('BG_2');

	ok(r1.versions[0].layer('FUNDO').source === bg1, 'a 1ª rodada usa a BG');
	ok(r2.versions[0].layer('FUNDO').source === bg2, 'a 2ª rodada usa a BG_2');
	eq(expr(r1.versions[0], 'FUNDO', OPACIDADE), "comp('BG').layer('COR').transform.opacity", '1ª rodada');
	eq(expr(r2.versions[0], 'FUNDO', OPACIDADE), "comp('BG_2').layer('COR').transform.opacity", '2ª rodada');
	eq(expr(bg1, 'COR', EFEITO), 'comp("BG").layer("COR").transform.opacity', 'a BG da 1ª');
	eq(expr(bg2, 'COR', EFEITO), 'comp("BG_2").layer("COR").transform.opacity', 'a BG da 2ª');
	ok(r1.versions[0].name !== r2.versions[0].name, 'as versões com nomes diferentes');
});

test('a precomp que lê a principal: 3 versões, cada uma com a sua precomp lendo a própria versão', function () {
	newProject();

	const r = preencher(CARTELA, 'ANA\n\nBIA\n\nCAIO');
	const logo = one('LOGO');
	const meios = [];
	const txts = [];

	eq(r.versions.length, 3, 'versões');

	r.versions.forEach(function (v) {
		const meio = v.layer('MEIO').source;
		const txt = meio.layer('TEXTO').source;

		ok(meio && !meio.removed && meio.name !== 'MEIO', 'a MEIO da versão ' + v.name + ' é a dela (' + (meio && meio.name) + ')');
		ok(txt && !txt.removed && txt.name !== 'TXT', 'a TXT da versão ' + v.name + ' é a dela');
		eq(expr(txt, 'ESPELHO', TEXTO), 'comp("' + v.name + '").layer("TITULO").text.sourceText', 'a TXT de ' + v.name);
		eq(expr(v, 'ECO', OPACIDADE), 'comp("' + v.name + '").layer("TITULO").transform.opacity', 'a própria versão');
		ok(meio.layer('MARCA').source === logo, 'a LOGO (sem expressão da principal) é a mesma em todas');
		meios.push(meio);
		txts.push(txt);
	});

	ok(new Set(meios).size === 3 && new Set(txts).size === 3, 'uma MEIO e uma TXT por versão');

	// a principal saiu: nenhuma expressão cita CARTELA, e as precomps de antes (sem uso) saíram com ela
	const quebradas = allExpressions().filter(function (e) { return /comp\("CARTELA"\)/.test(e.expression); });

	eq(quebradas, [], 'expressões citando a principal apagada');
	eq(comps('CARTELA').length, 0, 'a principal saiu');
	eq(comps('MEIO').length + comps('TXT').length, 0, 'as precomps de antes, sem uso, saíram');
});

test('uma comp TEMPLATE antiga de mesmo nome: o preenchimento usa a desta importação e não apaga a antiga', function () {
	newProject();

	const antiga = comp('RODAPE', 'TEMPLATE', [layer('ANTIGO', null, {}, 'VELHO')]);
	const r = preencher(RODAPE, 'ANA');
	const v = r.versions[0];

	ok(!antiga.removed && project._items.indexOf(antiga) >= 0, 'a antiga foi apagada');
	eq(antiga.name, 'RODAPE', 'a antiga continua com o nome');
	eq(antiga.layer(1).at(TEXTO).value.text, 'VELHO', 'a antiga não foi preenchida');
	ok(v.layer('FUNDO'), 'a versão veio da comp nova (tem a layer FUNDO)');
	eq(v.layer('TITULO').at(TEXTO).value.text, 'ANA', 'a versão preenchida');
	eq(comps('RODAPE').length, 1, 'só a antiga com o nome (a nova saiu no fim)');
});

test('as pastas do designer ficam intactas: só os itens desta rodada vão para as pastas configuradas', function () {
	newProject();

	const minhas = new FolderItem('MINHAS COISAS');
	const vazia = new FolderItem('VAZIA');
	const sub = new FolderItem('SUB');

	sub.parentFolder = minhas;

	const minhaComp = comp('MINHA COMP', '', [], sub);
	const minhaFoto = new FootageItem('minha_foto.png', true);

	minhaFoto.parentFolder = minhas;

	const solta = comp('SOLTA', 'EXPORTAR');
	const comps01 = new FolderItem('01 COMPS');
	const jaExistia = comp('JA EXISTIA', '', [], comps01);
	const antes = project._items.map(function (it) { return it.id + ' ' + pathOf(it) + ' ' + it.name; });

	const r = preencher(RODAPE, 'ANA');
	const depois = antes.filter(function (line) {
		const id = Number(line.split(' ')[0]);
		const it = project.itemByID(id);

		return !it || it.id + ' ' + pathOf(it) + ' ' + it.name !== line;
	});

	eq(depois, [], 'itens do designer que mudaram de pasta, de nome ou sumiram');
	ok(vazia.numItems === 0 && project._items.indexOf(vazia) >= 0, 'a pasta VAZIA do designer ficou');
	ok(solta.parentFolder === project.rootFolder && jaExistia.parentFolder === comps01 && minhaComp.parentFolder === sub, 'os itens do designer no lugar');

	eq(pathOf(r.versions[0]), '/01 COMPS', 'a versão na pasta de render');
	ok(r.versions[0].parentFolder === comps01, 'a 01 COMPS que já existia, reaproveitada');
	eq(pathOf(one('BG')), '/02 PRECOMPS', 'a precomp nova');
	eq(pathOf(project._items.find(function (it) { return it.name === 'foto_rodape.png'; })), '/03 ARQUIVOS/IMAGENS', 'a imagem nova');
	eq(project._items.filter(function (it) { return it instanceof FolderItem && /\.aep$/.test(it.name); }).length, 0, 'a pasta do .aep saiu');
	eq(project._items.filter(function (it) { return it instanceof FolderItem && it.name === 'COMPS'; }).length, 0, 'a pasta de dentro do .aep saiu');

	const vaziasNovas = project._items.filter(function (it) { return it instanceof FolderItem && it !== vazia && it.numItems === 0; });

	eq(vaziasNovas.map(function (f) { return f.name; }), [], 'pastas vazias criadas pelo preenchimento');
});

console.log('');

if (failed) {
	console.log(failed + ' de ' + (failed + passed) + ' casos falharam no preenchimento.');
	process.exit(1);
}

console.log('preenchimento: ' + passed + ' casos passaram.');
