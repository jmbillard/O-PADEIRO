/*

---------------------------------------------------------------
> ponta a ponta: o Padeiro e o PROMeiro (jmbillard/TEXTAO#140)
---------------------------------------------------------------

Os painéis no navegador (modo de teste, mock-host.js) contra um PROMeiro de teste: o servidor do PROMeiro (o
repositório TEXTAO, só lido) sobe numa pasta temporária, com o Teable e o Trello de mentira, como nos testes dele.
Nada sai para a rede. Confere:

  - pedir a chave: a barra, na primeira vez, se cadastra (usuário, computador, sistema e sigla) e guarda a chave;
  - pendente: o aviso da barra e o estado na configuração > buscar; o NO TRELLO da claquete continua com os cards do
    webhook (o do mock);
  - ligada (um administrador liga a chave a um designer): o NO TRELLO mostra as Produções em Entrada e Produzindo do
    PROMeiro, também a que entrou há mais de 7 dias, e não os cards do webhook;
  - revogada: o Padeiro pede outra chave sozinho, que volta a ficar pendente (e o NO TRELLO volta ao webhook);
  - o PROMeiro fora do ar: o NO TRELLO volta ao webhook, sem erro na tela.

  PROMEIRO=/caminho/do/TEXTAO NODE_PATH=$(npm root -g) node extension/scripts/e2e-promeiro.js

Sem PROMEIRO, procura o TEXTAO ao lado desta pasta do Padeiro. Precisa do Playwright com o Chromium (nunca
`playwright install`: o que já está na máquina) e do Node 22 (o servidor do PROMeiro lê TypeScript). Nomes,
claquetes e e-mails inventados.

*/

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { prepareContext } = require('./ui-states');

const CLIENT = 'file://' + path.resolve(__dirname, '../client') + '/';
const TEXTAO = path.resolve(process.env.PROMEIRO || path.join(__dirname, '../../../TEXTAO'));
const CHEFE = 'chefe@exemplo.com';
const DIA = 86400000;
const ha = (n) => new Date(Date.now() - n * DIA).toISOString();
const card = (n) => 'c0ffee' + String(n).padStart(18, '0');

// as Produções do PROMeiro de teste: duas abertas (uma entrou há 20 dias), uma Entregue e um filme (ficam de fora)
const PRODUCOES = [
	{ id: 'recPadDom', fields: { card_ID: card(1), claquete: 'DOMINGAO 26/11 SP', status: '[]', designers: null, data_entrada: ha(1), __last_modified_time: ha(1) } },
	{ id: 'recPadMais', fields: { card_ID: card(2), claquete: 'MAIS VOCE 28/11 SP', status: '["PRODUZINDO"]', designers: '["Rui Teste"]', data_entrada: ha(20), __last_modified_time: ha(2) } },
	{ id: 'recPadChef', fields: { card_ID: card(3), claquete: 'CHEF 20/11 SP', status: '["FINALIZADO"]', designers: '["Rui Teste"]', entregue: true, data_entrada: ha(6), data_entrega: ha(1), __last_modified_time: ha(1) } },
	{ id: 'recPadFilme', fields: { card_ID: '', claquete: 'TELA QUENTE 30/11', status: '["FILME"]', designers: null, filme: [{ id: 'recFilmeTeste', title: 'Filme de Teste' }], data_entrada: ha(1), __last_modified_time: ha(1) } }
];
const DESIGNERS = [{ id: 'recDesignerDora', fields: { designer: 'Dora Teste', email: 'dora@exemplo.com', designer_ID: 'membroDora', status: 'ativo' } }];

async function subirPromeiro() {
	const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'padeiro-promeiro-'));
	const importar = (f) => import(pathToFileURL(path.join(TEXTAO, f)).href);
	const { abrirBanco, criarApp } = await importar('servidor/app.mjs');
	const { criarTrello } = await importar('servidor/trello.mjs');
	const { TEABLE_FALSO, teableFalso } = await importar('tests/fixtures/teable-falso.mjs');
	const env = { CADASTRO_ADMINS: CHEFE, ...TEABLE_FALSO, TEABLE_PG_URL: 'postgres://falso', TEABLE_PG_ESQUEMA: 'bseFalso', TRELLO_KEY: 'chave-falsa', TRELLO_TOKEN: 'token-falso', TRELLO_LISTA_SP: 'entradaSP', TRELLO_SAIDA_SP: 'saidaSP' };
	const teable = teableFalso({ ARTE_producao: 'arte_producao_pg', exibicoes: 'exibicoes_pg', designers: 'designers_pg' }, { registros: { ARTE_producao: PRODUCOES, exibicoes: [], designers: DESIGNERS } });
	const semRede = async (url) => {
		throw new Error('o teste não sai para a rede: ' + url);
	};
	const db = abrirBanco(path.join(pasta, 'promeiro.db'));
	const app = criarApp({ db, env, buscarNoTeable: teable, abrirPg: teable.abrirPg, buscarNoGitHub: semRede, trello: (e, deps) => criarTrello(e, { ...deps, buscar: semRede }) });
	await app.releituraPronta;
	await app.pessoasProntas;

	// o painel de teste abre do disco (file://): o PROMeiro de teste responde ao navegador (no After, quem pede é o Node
	// do painel, sem essa conta). só aqui, em volta do servidor
	const servidor = http.createServer((req, res) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', 'content-type, x-chave-do-padeiro');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
		if (req.method === 'OPTIONS') {
			res.writeHead(204);
			res.end();
			return;
		}
		app(req, res);
	});
	await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
	const url = 'http://127.0.0.1:' + servidor.address().port;
	const chefe = async (caminho, init = {}) => {
		const r = await fetch(url + caminho, { ...init, headers: { 'cf-access-authenticated-user-email': CHEFE, 'content-type': 'application/json' } });
		return r.json();
	};

	return {
		url,
		chefe,
		padeiros: async () => (await chefe('/api/cadastros/padeiros')).padeiros,
		async fora() {
			await new Promise((ok) => servidor.close(ok));
			servidor.closeAllConnections();
		},
		async descer() {
			if (servidor.listening) await this.fora();
			await app.fechar();
			db.close?.();
			fs.rmSync(pasta, { recursive: true, force: true });
		}
	};
}

// uma aba só por contexto, que vai de uma janela para a outra
const PAGES = new WeakMap();

// a chave guardada "no host": no After é o promeiro.json da pasta de dados; aqui, a memória do teste (o localStorage do
// file:// não é confiável entre uma janela e outra no Chromium de teste)
async function guardarAChave(context) {
	let guardada = null;

	await context.exposeFunction('padMockPromeiro', (data) => {
		if (data !== undefined) guardada = data && data.chave ? data : null;

		return guardada;
	});
}

async function pagina(context) {
	let page = PAGES.get(context);

	if (!page) {
		page = await context.newPage();
		page.errors = [];
		page.on('pageerror', (err) => page.errors.push(err.message));
		if (process.env.DEBUG) page.on('console', (m) => console.log('  [painel] ' + m.text()));
		PAGES.set(context, page);
	}
	page.errors.length = 0;

	return page;
}

// a claquete: digita e devolve as linhas do NO TRELLO (a claquete de cada card), ou [] sem o grupo
async function noTrello(context, typed) {
	const page = await pagina(context);
	const errors = page.errors;

	await page.goto(CLIENT + 'project.html');
	await page.waitForTimeout(1200);
	await page.fill('#claq', typed);
	await page.waitForTimeout(2200);

	const rows = await page.locator('.card-row .combo-title').allTextContents();

	assert.deepEqual(errors, [], 'a claquete abre sem erro');

	return { rows };
}

async function aviso(context) {
	const page = await pagina(context);

	await page.goto(CLIENT + 'bar.html');
	await page.waitForTimeout(2500);

	const box = page.locator('#toast');
	const text = (await box.isVisible()) ? (await box.innerText()).replace(/\s+/g, ' ').replace(/ ×$/, '') : '';

	assert.deepEqual(page.errors, [], 'a barra abre sem erro');

	return text;
}

async function estadoNaConfiguracao(context) {
	const page = await pagina(context);

	await page.goto(CLIENT + 'productions.html');
	await page.waitForTimeout(1200);
	await page.locator('.tab[data-tab="search"]').click();
	await page.waitForTimeout(1500);

	const text = (await page.locator('#machine-promeiro').innerText()).replace(/\s+/g, ' ');

	assert.deepEqual(page.errors, [], 'a configuração abre sem erro');

	return text;
}

(async () => {
	const promeiro = await subirPromeiro();
	const browser = await chromium.launch();
	const context = await browser.newContext({ viewport: { width: 520, height: 900 } });
	await prepareContext(context);
	await guardarAChave(context);
	let ok = 0;
	const passo = (texto) => {
		ok++;
		console.log('ok   ' + texto);
	};

	try {
		// o endereço do PROMeiro de teste na configuração > buscar (o mock guarda no navegador)
		await context.addInitScript((url) => {
			if (!localStorage.getItem('pad.mock.promeiroUrl')) localStorage.setItem('pad.mock.promeiroUrl', url);
		}, promeiro.url);

		// 1. pedir a chave: a barra se cadastra na primeira vez, e o aviso discreto diz que falta aprovar
		const pendente = await aviso(context);

		assert.match(pendente, /falta um administrador do PROMeiro aprovar a chave deste computador/);
		let lista = await promeiro.padeiros();
		assert.equal(lista.length, 1);
		assert.deepEqual({ usuario: lista[0].usuario, computador: lista[0].computador, sistema: lista[0].sistema, sigla: lista[0].sigla, estado: lista[0].estado }, { usuario: 'designer.teste', computador: 'MAC-TESTE-01', sistema: 'macOS 15.1', sigla: 'JMBILLARD', estado: 'pendente' });
		passo('pedir a chave: a barra se cadastrou (usuário, computador, sistema e sigla) e mostra o aviso de pendente');

		// a chave ficou guardada: abrir a barra de novo não pede outra
		await aviso(context);
		lista = await promeiro.padeiros();
		assert.equal(lista.length, 1, 'uma chave só');
		passo('a chave guardada vale: abrir de novo não pede outra');

		// 2. pendente: o estado na configuração e o NO TRELLO do webhook (o card do mock)
		assert.match(await estadoNaConfiguracao(context), /^pendente: falta um administrador/);
		let claquete = await noTrello(context, 'domingao');
		assert.deepEqual(claquete.rows, ['DOMINGAO 25/11']);
		passo('pendente: a configuração diz que falta aprovar, e o NO TRELLO vem do webhook (DOMINGAO 25/11)');

		// 3. ligada: o NO TRELLO vem das Produções do PROMeiro
		await promeiro.chefe('/api/cadastros/padeiros/' + lista[0].id + '/ligar', { method: 'POST', body: JSON.stringify({ designer: 'recDesignerDora' }) });
		claquete = await noTrello(context, 'domingao');
		assert.deepEqual(claquete.rows, ['DOMINGAO 26/11 SP'], 'a Produção em Entrada, no lugar do card do webhook');
		claquete = await noTrello(context, 'mais voce');
		assert.deepEqual(claquete.rows, ['MAIS VOCE 28/11 SP'], 'a Produção em Produzindo, mesmo tendo entrado há 20 dias');
		claquete = await noTrello(context, 'chef');
		assert.deepEqual(claquete.rows, [], 'a Entregue fica de fora');
		assert.match(await estadoNaConfiguracao(context), /^ligada a Dora Teste: o NO TRELLO da claquete vem das Produções do PROMeiro/);
		assert.equal(await aviso(context), '', 'ligada, a barra não avisa nada');
		passo('ligada: o NO TRELLO mostra as Produções em Entrada e Produzindo (a Entregue e o filme ficam de fora)');

		// 4. revogada: o Padeiro pede outra chave, pendente de novo
		await promeiro.chefe('/api/cadastros/padeiros/' + lista[0].id + '/revogar', { method: 'POST' });
		assert.match(await aviso(context), /falta um administrador/);
		lista = await promeiro.padeiros();
		assert.equal(lista.length, 1);
		assert.equal(lista[0].estado, 'pendente', 'o cadastro de novo troca a chave revogada e volta a pendente');
		claquete = await noTrello(context, 'domingao');
		assert.deepEqual(claquete.rows, ['DOMINGAO 25/11']);
		passo('revogada: o Padeiro pede outra chave (pendente) e o NO TRELLO volta ao webhook');

		// 5. ligada de novo e o PROMeiro fora do ar: o NO TRELLO volta ao webhook, sem erro
		await promeiro.chefe('/api/cadastros/padeiros/' + lista[0].id + '/ligar', { method: 'POST', body: JSON.stringify({ designer: 'recDesignerDora' }) });
		claquete = await noTrello(context, 'domingao');
		assert.deepEqual(claquete.rows, ['DOMINGAO 26/11 SP']);
		await promeiro.fora();
		claquete = await noTrello(context, 'domingao');
		assert.deepEqual(claquete.rows, ['DOMINGAO 25/11'], 'fora do ar: o card do webhook');
		assert.match(await estadoNaConfiguracao(context), /o PROMeiro não respondeu/);
		passo('fora do ar: o NO TRELLO volta ao webhook, e a configuração diz que o PROMeiro não respondeu');

		// 6. sem o endereço do PROMeiro: nada muda (nem pede chave)
		const limpo = await browser.newContext({ viewport: { width: 520, height: 900 } });

		await prepareContext(limpo);
		await guardarAChave(limpo);

		claquete = await noTrello(limpo, 'domingao');
		assert.deepEqual(claquete.rows, ['DOMINGAO 25/11']);
		assert.equal(await aviso(limpo), '');
		assert.match(await estadoNaConfiguracao(limpo), /sem o endereço do PROMeiro/);
		await limpo.close();
		passo('sem o endereço do PROMeiro: tudo como antes (o webhook), sem aviso');

		console.log('\n' + ok + ' passos ok');
	} catch (err) {
		console.error('FALHOU: ' + (err.stack || err.message));
		process.exitCode = 1;
	} finally {
		await browser.close();
		await promeiro.descer();
	}
})();
