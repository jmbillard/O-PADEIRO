#!/usr/bin/env node
/*

---------------------------------------------------------------
> O PADEIRO — ternário encadeado no host (ExtendScript)
---------------------------------------------------------------

O ExtendScript agrupa 'a ? b : c ? d : e' como '(a ? b : c) ? d : e' (o JavaScript de verdade faz 'a ? b : (c ? d
: e)'). No navegador o código passa; no After, cai no ramo errado sem erro nenhum (foi assim que a barra dizia
"ainda sem atração" num projeto já criado). Este script acha todo ternário com outro dentro sem parênteses nos
arquivos que rodam no After (host/, o instalador e os .jsx de scripts/).

uso: node extension/scripts/check-ternary.js   (sai com 1 se achar algum)

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
		console.log('check-ternary: sem o pacote typescript para ler o código (npm i -g typescript). nada conferido.');
		process.exit(0);
	}
}

const ROOT = path.resolve(__dirname, '..');

function files(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).reduce(function (list, e) {
		const p = path.join(dir, e.name);

		if (e.isDirectory()) return list.concat(files(p));

		return /\.(jsx|js)$/.test(e.name) ? list.concat(p) : list;
	}, []);
}

const targets = files(path.join(ROOT, 'host'))
	.concat(fs.readdirSync(path.join(ROOT, 'scripts')).filter((n) => /\.jsx$/.test(n)).map((n) => path.join(ROOT, 'scripts', n)))
	.concat(fs.readdirSync(path.join(ROOT, '..')).filter((n) => /\.jsx$/.test(n)).map((n) => path.join(ROOT, '..', n)));
const found = [];
const es3 = [];

targets.forEach(function (file) {
	const text = fs.readFileSync(file, 'utf8');
	const src = ts.createSourceFile(file, text, ts.ScriptTarget.ES5, true, ts.ScriptKind.JS);

	(function walk(node) {
		if (node.kind === ts.SyntaxKind.ConditionalExpression) {
			[node.condition, node.whenTrue, node.whenFalse].forEach(function (part) {
				if (part.kind === ts.SyntaxKind.ConditionalExpression) {
					const at = src.getLineAndCharacterOfPosition(node.getStart());

					found.push(path.relative(path.join(ROOT, '..'), file) + ':' + (at.line + 1) + '  ' + text.split('\n')[at.line].trim().slice(0, 110));
				}
			});
		}
		// de passagem: sintaxe que o ExtendScript (ES3) não lê. o arquivo inteiro deixa de carregar, com um erro pouco claro
		const K = ts.SyntaxKind;
		const flags = node.kind === K.VariableDeclarationList ? node.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const) : 0;
		const modern = flags ? 'let / const'
			: node.kind === K.ArrowFunction ? 'arrow function'
			: node.kind === K.TemplateExpression || node.kind === K.NoSubstitutionTemplateLiteral ? 'template string'
			: node.kind === K.ForOfStatement ? 'for…of'
			: node.kind === K.SpreadElement || node.kind === K.SpreadAssignment ? 'spread (...)'
			: node.kind === K.ShorthandPropertyAssignment ? 'propriedade abreviada ({ a })'
			: node.kind === K.Parameter && node.initializer ? 'parâmetro com valor padrão'
			: node.kind === K.ClassDeclaration ? 'class'
			: node.kind === K.ObjectBindingPattern || node.kind === K.ArrayBindingPattern ? 'desestruturação'
			: '';

		if (modern) {
			const pos = src.getLineAndCharacterOfPosition(node.getStart());

			es3.push(path.relative(path.join(ROOT, '..'), file) + ':' + (pos.line + 1) + '  ' + modern);
		}
		ts.forEachChild(node, walk);
	})(src);
});

if (found.length) {
	console.log('ternário encadeado sem parênteses (o ExtendScript agrupa errado): use if / else ou parênteses\n');
	found.forEach((f) => console.log('  ' + f));
	process.exit(1);
}

if (es3.length) {
	console.log('sintaxe que o ExtendScript (ES3) não lê:\n');
	es3.forEach((f) => console.log('  ' + f));
	process.exit(1);
}

console.log('nenhum ternário encadeado nem sintaxe fora do ES3 no host (' + targets.length + ' arquivos).');
