/*

---------------------------------------------------------------
> a pasta do PROMeiro dos testes ponta a ponta (jmbillard/TEXTAO#183)
---------------------------------------------------------------

O e2e-promeiro.js e o e2e-janela.js sobem o servidor do PROMeiro (o repositório TEXTAO, só lido). A pasta vem de
PROMEIRO ou, sem ela, do TEXTAO ao lado desta pasta do Padeiro. Um checkout velho passava calado: os passos que
dependem de uma rota nova falhavam longe da causa. Aqui, o teste diz qual PROMeiro sobe (a pasta e o commit) e para,
com o motivo, quando a pasta não é um PROMeiro ou quando o checkout está atrás da branch que ele segue (pelo que o
git já sabe dela, sem ir à rede).

*/

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function git(pasta, args) {
	try {
		return execFileSync('git', ['-C', pasta, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
	} catch (err) {
		return '';
	}
}

// o motivo, sem a pilha, e o teste para antes de subir qualquer coisa
function parar(motivo) {
	console.error('PARADO: ' + motivo);
	process.exit(2);
}

// → a pasta do PROMeiro, conferida; para o teste, dizendo o que fazer, quando ela não serve
function pastaDoPromeiro() {
	const pasta = path.resolve(process.env.PROMEIRO || path.join(__dirname, '../../../TEXTAO'));
	const deOnde = process.env.PROMEIRO ? 'PROMEIRO' : 'sem PROMEIRO, o TEXTAO ao lado do Padeiro';

	if (!fs.existsSync(path.join(pasta, 'servidor/app.mjs'))) {
		parar('o PROMeiro de teste não está em ' + pasta + ' (' + deOnde + '): aponte PROMEIRO= para um checkout do TEXTAO');
	}

	const commit = git(pasta, ['log', '-1', '--format=%h %s']);
	const segue = git(pasta, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
	const atras = segue ? Number(git(pasta, ['rev-list', '--count', 'HEAD..@{u}'])) || 0 : 0;

	if (atras > 0) {
		parar('o PROMeiro em ' + pasta + ' (' + deOnde + ') está ' + atras + ' commit(s) atrás de ' + segue + ': atualize esse checkout ou aponte PROMEIRO= para um atualizado');
	}

	console.log('PROMeiro de teste: ' + pasta + (commit ? ' (' + commit.slice(0, 80) + ')' : ''));

	return pasta;
}

module.exports = { pastaDoPromeiro };
