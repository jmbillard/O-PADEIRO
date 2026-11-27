#!/usr/bin/env node
/*

---------------------------------------------------------------
> O PADEIRO — nenhuma caixa do After no host
---------------------------------------------------------------

O host (ExtendScript) nunca abre a caixa do After: nem alert, nem confirm, nem prompt (também Window.alert…), e
nenhuma janela ScriptUI (new Window) no meio de uma ação. Todo aviso, erro ou pergunta volta ao painel, na resposta
da chamada (padAviso, globals.js; data.warnings; ou um Error('#PAD_xxx - …')), e o painel mostra. O kaomoji do
padeiro antigo também não aparece em mensagem nenhuma. No After, o coletar d'O CATADOR abriu "Σ(っ °Д °;)っ #PAD_093 -
arquivos ausentes (não coletados)" num alert nativo: o desvio do alert (api.jsx) não segura a caixa de lá.

A leitura é pela árvore do código (o pacote typescript, como no check-funcoes-do-host.js): 'alert' dentro de uma
string ou de um comentário não conta. Conta:

- toda chamada a alert, confirm ou prompt, direta (alert(…)) ou por um objeto (Window.alert(…), $.global.alert(…));
- todo uso do nome alert, confirm ou prompt como valor (var a = alert; a(…)), que contorna a regra acima. o desvio
  '$.global.alert = function …' (api.jsx) é uma atribuição, não uma chamada: não conta;
- todo new Window(…);
- o kaomoji do padeiro antigo (Σ(っ °Д °;)っ, ヽ(✿ﾟ▽ﾟ)ノ) dentro de uma string.

Confere o host/ (todos os .js e .jsx), as regras compartilhadas de regras/ e o instalador da raiz.

A exceção, a única:
- INSTALAR O PADEIRO.jsx (o instalador): é uma janela ScriptUI de propósito (roda pelo File > Scripts, fora de uma
  ação do painel). nele, só o new Window vale; alert, confirm, prompt e o kaomoji continuam proibidos.

uso: node extension/scripts/check-alertas.js   (sai com 1 se achar algum)

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
		console.log('check-alertas: sem o pacote typescript para ler o código (npm i -g typescript). nada conferido.');
		process.exit(1);
	}
}

const ROOT = path.resolve(__dirname, '..');
const K = ts.SyntaxKind;
const INSTALADOR = path.join(ROOT, '..', 'INSTALAR O PADEIRO.jsx');

// a exceção (veja o começo): o instalador pode abrir a janela dele
const PODE_ABRIR_JANELA = [INSTALADOR];

const CAIXAS = ['alert', 'confirm', 'prompt'];
const KAOMOJI = /Σ\(|っ|°Д|ヽ\(|✿/;

function files(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).reduce(function (list, e) {
		const p = path.join(dir, e.name);

		if (e.isDirectory()) return list.concat(files(p));

		return /\.(jsx|js)$/.test(e.name) ? list.concat(p) : list;
	}, []);
}

function readSource(file) {
	const buf = fs.readFileSync(file);
	const text = buf[0] === 0xff && buf[1] === 0xfe ? buf.toString('utf16le') : buf.toString('utf8');

	// os #include e #target viram linhas em branco (a contagem das linhas fica a mesma)
	return text.replace(/^﻿/, '').replace(/^#(include|target|targetengine|script).*$/gm, '');
}

const targets = files(path.join(ROOT, 'host')).concat(files(path.join(ROOT, 'regras'))).concat(fs.existsSync(INSTALADOR) ? [INSTALADOR] : []);
const problems = [];

targets.forEach(function (file) {
	const src = ts.createSourceFile(file, readSource(file), ts.ScriptTarget.ES5, true, ts.ScriptKind.JS);
	const janela = PODE_ABRIR_JANELA.indexOf(file) >= 0;

	function report(node, text) {
		problems.push(path.relative(path.join(ROOT, '..'), file) + ':' + (src.getLineAndCharacterOfPosition(node.getStart()).line + 1) + '  ' + text);
	}

	(function walk(node) {
		const p = node.parent;

		switch (node.kind) {
			case K.Identifier:
				if (CAIXAS.indexOf(node.text) < 0) break;

				// .alert de um objeto: só a chamada conta (o desvio '$.global.alert = …' não)
				if (p && p.kind === K.PropertyAccessExpression && p.name === node) {
					if (p.parent && p.parent.kind === K.CallExpression && p.parent.expression === p) report(node, p.getText(src) + '(…): a caixa do After');
					break;
				}
				// o nome de uma propriedade num objeto literal ({ alert: … }) não é a caixa
				if (p && (p.kind === K.PropertyAssignment || p.kind === K.MethodDeclaration) && p.name === node) break;

				if (p && p.kind === K.CallExpression && p.expression === node) report(node, node.text + '(…): a caixa do After');
				else report(node, node.text + ' usado como valor (contorna a regra: a caixa do After)');
				break;
			case K.NewExpression:
				if (!janela && node.expression.kind === K.Identifier && node.expression.text === 'Window') report(node, 'new Window(…): uma janela ScriptUI no host');
				break;
			case K.StringLiteral:
			case K.NoSubstitutionTemplateLiteral:
			case K.TemplateHead:
			case K.TemplateMiddle:
			case K.TemplateTail:
				if (KAOMOJI.test(node.text)) report(node, 'o kaomoji do padeiro antigo numa mensagem: ' + JSON.stringify(node.text.slice(0, 40)));
				break;
		}
		ts.forEachChild(node, walk);
	})(src);
});

if (problems.length) {
	console.log('caixas do After no host (todo aviso volta ao painel: padAviso, data.warnings ou Error(\'#PAD_xxx - …\')):\n');
	problems.forEach((p) => console.log('  ' + p));
	process.exit(1);
}

console.log('✓ nenhum alert, confirm, prompt, new Window ou kaomoji no host, nas regras e no instalador (' + targets.length + ' arquivos).');
