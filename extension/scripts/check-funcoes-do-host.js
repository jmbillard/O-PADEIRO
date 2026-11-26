#!/usr/bin/env node
/*

---------------------------------------------------------------
> O PADEIRO — funções chamadas e não definidas no host
---------------------------------------------------------------

O ExtendScript só acusa uma função que não existe quando a linha roda: no After, no meio da ação ("Function
fontCopyTo is undefined", O CATADOR na 2.0 RC1, depois de uma renomeação em que a definição e as chamadas ficaram
com nomes diferentes). Esta checagem lê a cadeia do host/index.jsx (os arquivos dos #include, na ordem) e acha:

- toda função chamada pelo nome (f(), new F()) que não é definida em lugar nenhum do host carregado (function,
  var, parâmetro ou atribuição) nem é do JavaScript ou do ExtendScript (app, File, Folder, $, system…);
- todo PADX.nome usado (chamado ou passado adiante) sem um PADX.nome = … no host;
- todo call('nome') dos painéis (client/js/*.js) sem PADX.nome no host. O mock-host.js não conta: ele pode ter
  métodos só de teste.

Os nomes dentro de strings (as expressões do After, comp("NOME")) não contam: a leitura é pela árvore do código
(o pacote typescript), não por texto. O que é definido em qualquer lugar do host conta como definido (sem escopo):
a checagem acha o nome que não existe, não o que está fora de alcance.

uso: node extension/scripts/check-funcoes-do-host.js   (sai com 1 se achar algum)

*/

const fs = require('fs');
const path = require('path');

let ts;

try {
	ts = require('typescript');
} catch (err) {
	try {
		ts = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'typescript'));
	} catch (err2) {
		console.log('check-funcoes-do-host: sem o pacote typescript para ler o código (npm i -g typescript). nada conferido.');
		process.exit(1);
	}
}

const ROOT = path.resolve(__dirname, '..');
const HOST = path.join(ROOT, 'host');
const K = ts.SyntaxKind;

// os nomes do JavaScript (ES3) e do ExtendScript / After que o host usa sem definir
const GLOBAIS = [
	// JavaScript
	'Array', 'Boolean', 'Date', 'Error', 'EvalError', 'Function', 'Math', 'Number', 'Object', 'RangeError',
	'ReferenceError', 'RegExp', 'String', 'SyntaxError', 'TypeError', 'URIError', 'JSON', 'eval', 'isFinite',
	'isNaN', 'parseFloat', 'parseInt', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
	'escape', 'unescape', 'undefined', 'NaN', 'Infinity',
	// ExtendScript
	'$', 'app', 'system', 'File', 'Folder', 'alert', 'confirm', 'prompt', 'Window', 'ScriptUI', 'ExternalObject',
	'Socket', 'XML', 'XMLList', 'Namespace', 'QName', 'UnitValue', 'Reflection', 'localize', 'isValid', 'writeLn',
	'BridgeTalk', 'CSXSEvent',
	// a lib do XMP (new ExternalObject('lib:AdobeXMPScript'))
	'XMPMeta', 'XMPConst', 'XMPUtils', 'XMPFile',
	// After Effects
	'Shape', 'KeyframeEase', 'MarkerValue', 'TextDocument', 'ImportOptions', 'RenderQueueItem', 'OutputModule',
	'CompItem', 'FolderItem', 'FootageItem', 'AVItem', 'Item', 'Layer', 'AVLayer', 'TextLayer', 'ShapeLayer',
	'LightLayer', 'CameraLayer', 'Property', 'PropertyGroup', 'PropertyBase', 'MaskPropertyGroup',
	'SolidSource', 'FileSource', 'PlaceholderSource', 'FontObject'
];

function readSource(file) {
	const buf = fs.readFileSync(file);
	const text = buf[0] === 0xff && buf[1] === 0xfe ? buf.toString('utf16le') : buf.toString('utf8');

	// os #include viram linhas em branco (a contagem das linhas fica a mesma)
	return text.replace(/^﻿/, '').replace(/^#(include|target|targetengine|script).*$/gm, '');
}

function relative(file) {
	return path.relative(path.join(ROOT, '..'), file);
}

// os arquivos do host/index.jsx, na ordem dos #include (e o próprio index.jsx)
function hostFiles() {
	const index = path.join(HOST, 'index.jsx');
	const list = [index];

	fs.readFileSync(index, 'utf8').split('\n').forEach(function (line) {
		const m = line.match(/^#include\s+"([^"]+)"/);

		if (m) list.push(path.resolve(HOST, m[1]));
	});

	return list;
}

// PADX.nome ou PADX['nome'] → 'nome' (ou null)
function padxMember(node) {
	if (node.kind === K.PropertyAccessExpression && node.expression.kind === K.Identifier && node.expression.text === 'PADX') return node.name.text;
	if (node.kind === K.ElementAccessExpression && node.expression.kind === K.Identifier && node.expression.text === 'PADX' && node.argumentExpression.kind === K.StringLiteral) return node.argumentExpression.text;

	return null;
}

function isAssignmentTarget(node) {
	const p = node.parent;

	return p && p.kind === K.BinaryExpression && p.left === node && p.operatorToken.kind === K.EqualsToken;
}

// ---------------------------------------------------------------
// o host: o que é definido e o que é usado
// ---------------------------------------------------------------

const defined = {};
const padxDefined = {};
const usedFns = []; // { name, where }
const usedPadx = []; // { name, where }
const files = hostFiles();

GLOBAIS.forEach(function (n) { defined[n] = true; });

files.forEach(function (file) {
	const src = ts.createSourceFile(file, readSource(file), ts.ScriptTarget.ES5, true, ts.ScriptKind.JS);

	function where(node) {
		return relative(file) + ':' + (src.getLineAndCharacterOfPosition(node.getStart()).line + 1);
	}

	(function walk(node) {
		switch (node.kind) {
			case K.FunctionDeclaration:
			case K.FunctionExpression:
			case K.VariableDeclaration:
			case K.Parameter:
				if (node.name && node.name.kind === K.Identifier) defined[node.name.text] = true;
				break;
			case K.BinaryExpression:
				if (node.operatorToken.kind === K.EqualsToken) {
					// implícita: nome = …   $.global.nome = …   PADX.nome = …
					const left = node.left;

					if (left.kind === K.Identifier) defined[left.text] = true;
					if (left.kind === K.PropertyAccessExpression && left.expression.getText(src) === '$.global') defined[left.name.text] = true;
					if (padxMember(left)) padxDefined[padxMember(left)] = true;
				}
				break;
			case K.CallExpression:
			case K.NewExpression:
				if (node.expression.kind === K.Identifier) usedFns.push({ name: node.expression.text, where: where(node) });
				break;
			case K.PropertyAccessExpression:
			case K.ElementAccessExpression:
				if (padxMember(node) && !isAssignmentTarget(node)) usedPadx.push({ name: padxMember(node), where: where(node) });
				break;
		}
		ts.forEachChild(node, walk);
	})(src);
});

const problems = [];

usedFns.forEach(function (u) {
	if (!defined.hasOwnProperty(u.name)) problems.push(u.where + '  ' + u.name + '() chamada e não definida no host');
});

usedPadx.forEach(function (u) {
	if (!padxDefined.hasOwnProperty(u.name)) problems.push(u.where + '  PADX.' + u.name + ' usado e não definido no host');
});

// ---------------------------------------------------------------
// os painéis: call('nome') sem PADX.nome no host
// ---------------------------------------------------------------

const CLIENT = path.join(ROOT, 'client', 'js');
let panelCalls = 0;

fs.readdirSync(CLIENT).filter((n) => /\.js$/.test(n) && n !== 'mock-host.js').forEach(function (n) {
	const file = path.join(CLIENT, n);
	const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);

	(function walk(node) {
		if (node.kind === K.CallExpression && node.arguments.length && node.arguments[0].kind === K.StringLiteral) {
			const e = node.expression;
			const isCall = (e.kind === K.Identifier && e.text === 'call') || (e.kind === K.PropertyAccessExpression && e.name.text === 'call' && e.expression.getText(src) === 'PAD_BRIDGE');

			if (isCall) {
				const name = node.arguments[0].text;

				panelCalls++;
				if (!padxDefined.hasOwnProperty(name)) {
					problems.push(relative(file) + ':' + (src.getLineAndCharacterOfPosition(node.getStart()).line + 1) + "  call('" + name + "') do painel sem PADX." + name + ' no host');
				}
			}
		}
		ts.forEachChild(node, walk);
	})(src);
});

if (problems.length) {
	console.log('nomes chamados e não definidos (no After, "Function … is undefined" na hora em que a linha roda):\n');
	problems.forEach((p) => console.log('  ' + p));
	process.exit(1);
}

console.log('toda função e todo PADX.* chamados existem no host (' + files.length + ' arquivos, ' + usedFns.length + ' chamadas, ' + usedPadx.length + ' usos de PADX, ' + panelCalls + " call('…') dos painéis).");
