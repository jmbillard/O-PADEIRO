/*

---------------------------------------------------------------
> ponta a ponta: o Padeiro e o PROMeiro (jmbillard/TEXTAO#140, #141)
---------------------------------------------------------------

Os painéis no navegador (modo de teste, mock-host.js) contra um PROMeiro de teste: o servidor do PROMeiro (o
repositório TEXTAO, só lido) sobe numa pasta temporária, com o Teable e o Trello de mentira, como nos testes dele.
Nada sai para a rede. Confere:

  - pedir a chave: a barra, na primeira vez, se cadastra (usuário, computador, sistema e sigla) e guarda a chave;
  - pendente: o aviso da barra e o estado na configuração > buscar; o NO TRELLO da claquete continua com os cards do
    webhook (o do mock);
  - ligada (um administrador liga a chave a um designer): o NO TRELLO mostra as Produções em Entrada e Produzindo do
    PROMeiro, também a que entrou há mais de 7 dias, e não os cards do webhook;
  - o aviso ao abrir pelo card (#141): criar o projeto pelo card da Produção do NO TRELLO avisa o PROMeiro, que põe a
    designer da chave no card do Trello (o de mentira) e na Produção, com a origem "Padeiro";
  - a fila sem rede: abrir pelo card sem chegar ao PROMeiro guarda o aviso na fila deste computador; a barra, aberta
    depois, manda de novo, com a hora certa da abertura;
  - o aviso repetido (a resposta perdida: o mesmo aviso mandado de novo) não duplica evento nem membro no card;
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
// o Trello de mentira: anota cada pedido (sem a chave e o token) e responde ok
function trelloFalso() {
	const pedidos = [];
	const buscar = async (endereco, init = {}) => {
		const url = new URL(endereco);
		const consulta = Object.fromEntries([...url.searchParams].filter(([k]) => k !== 'key' && k !== 'token'));

		pedidos.push({ metodo: init.method || 'GET', caminho: url.pathname.replace(/^\/1/, ''), consulta });

		return Response.json({});
	};

	return { pedidos, buscar };
}
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
	const trello = trelloFalso();
	const app = criarApp({ db, env, buscarNoTeable: teable, abrirPg: teable.abrirPg, buscarNoGitHub: semRede, trello: (e, deps) => criarTrello(e, { ...deps, buscar: trello.buscar }) });
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
		trello,
		// a linha do tempo da Produção (o que o administrador vê)
		linhaDoTempo: async (id) => (await chefe('/api/linha-do-tempo?producao=' + encodeURIComponent(id))).eventos,
		// as Produções que o Padeiro vê, com a chave dele
		producoes: async (chave) => (await (await fetch(url + '/api/padeiro/producoes', { headers: { 'x-chave-do-padeiro': chave } })).json()).trello,
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
// e a fila dos avisos (no After, o promeiro-fila.json), também na memória do teste: o teste lê e mexe nela
async function guardarAChave(context) {
	const host = { guardada: null, fila: [] };

	await context.exposeFunction('padMockPromeiro', (data) => {
		if (data !== undefined) host.guardada = data && data.chave ? data : null;

		return host.guardada;
	});
	await context.exposeFunction('padMockPromeiroFila', (list) => {
		if (list !== undefined) host.fila = list || [];

		return host.fila;
	});

	return host;
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

	await page.goto(CLIENT + 'projetista.html');
	await page.waitForTimeout(1200);
	await page.fill('#claq', typed);
	await page.waitForTimeout(2200);

	// a claquete de cada card (a linha embaixo do nome da atração, sem o designer)
	const rows = await page.locator('.card-row .film-sub').evaluateAll((els) => els.map((e) => e.firstChild.textContent));

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

// abre (ou cria) o projeto pelo card do NO TRELLO: digita, clica no card e no botão do rodapé. antes do clique no card,
// antes(page) (ex: cortar a rede). → o texto do botão no fim
async function abrirPeloCard(context, typed, claq, antes) {
	const page = await pagina(context);

	await page.goto(CLIENT + 'projetista.html');
	await page.waitForTimeout(1200);
	await page.fill('#claq', typed);
	await page.waitForTimeout(2200);
	if (antes) await antes(page);
	await page.locator('.card-row', { hasText: claq }).first().click();
	await page.waitForTimeout(1500);
	await page.locator('#criar-go').click();
	await page.waitForTimeout(2500);

	const go = (await page.locator('#criar-go').innerText()).trim();

	assert.deepEqual(page.errors, [], 'a claquete abre o projeto sem erro');

	return go;
}

async function estadoNaConfiguracao(context) {
	const page = await pagina(context);

	await page.goto(CLIENT + 'productions.html');
	await page.waitForTimeout(1200);
	await page.locator('.tab[data-tab="search"]').click();
	await page.waitForTimeout(1500);

	const text = (await page.locator('#deste-computador-promeiro').innerText()).replace(/\s+/g, ' ');

	assert.deepEqual(page.errors, [], 'a configuração abre sem erro');

	return text;
}

(async () => {
	const promeiro = await subirPromeiro();
	const browser = await chromium.launch();
	const context = await browser.newContext({ viewport: { width: 520, height: 900 } });
	await prepareContext(context);
	const host = await guardarAChave(context);
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
		assert.match(await estadoNaConfiguracao(context), /^ligada a Dora Teste: o NO TRELLO d'O PROJETISTA vem das Produções do PROMeiro/);
		assert.equal(await aviso(context), '', 'ligada, a barra não avisa nada');
		passo('ligada: o NO TRELLO mostra as Produções em Entrada e Produzindo (a Entregue e o filme ficam de fora)');

		// 3a. o aviso ao abrir pelo card (#141): a Produção do NO TRELLO avisa o PROMeiro, que faz o Peguei
		const producoes = await promeiro.producoes(host.guardada.chave);
		const dom = producoes.find((p) => p.claq === 'DOMINGAO 26/11 SP');
		const mais = producoes.find((p) => p.claq === 'MAIS VOCE 28/11 SP');
		const antesDoAviso = Date.now();

		assert.match(await abrirPeloCard(context, 'domingao', 'DOMINGAO 26/11 SP'), /Criado|Aberto|Criar projeto|Abrir projeto/);
		assert.deepEqual(host.fila, [], 'o aviso foi e saiu da fila');
		assert.deepEqual(promeiro.trello.pedidos, [{ metodo: 'POST', caminho: '/cards/' + card(1) + '/idMembers', consulta: { value: 'membroDora' } }], 'a designer da chave entra no card do Trello');
		let eventos = await promeiro.linhaDoTempo(dom.producao);
		assert.deepEqual(eventos.map((e) => [e.tipo, e.antes, e.depois, e.origem]), [['etapa', 'entrada', 'produzindo', 'Padeiro'], ['designer-entrou', null, 'Dora Teste', 'Padeiro']]);
		assert.ok(Date.parse(eventos[0].quando) >= antesDoAviso - 1000 && Date.parse(eventos[0].quando) <= Date.now(), 'com a hora da abertura');
		passo('o aviso ao abrir pelo card: a Produção vai para Produzindo, com a designer no card do Trello e a origem "Padeiro"');

		// 3b. a fila sem rede: o PROMeiro some depois de a lista chegar; o aviso fica na fila e a barra manda depois
		let semRede = null;
		await abrirPeloCard(context, 'mais voce', 'MAIS VOCE 28/11 SP', async (page) => {
			semRede = page;
			await page.route(promeiro.url + '/**', (r) => r.abort('internetdisconnected'));
		});
		await semRede.unroute(promeiro.url + '/**');
		assert.equal(host.fila.length, 1, 'sem rede, o aviso fica na fila');
		const guardado = { ...host.fila[0] };
		assert.equal(guardado.producao, mais.producao);
		assert.match(guardado.aviso, /^[\w.:-]{1,100}$/);
		assert.equal(promeiro.trello.pedidos.length, 1, 'nada chegou ao Trello');
		assert.deepEqual(await promeiro.linhaDoTempo(mais.producao), []);
		await new Promise((ok) => setTimeout(ok, 1200)); // a hora da abertura fica para trás
		assert.equal(await aviso(context), '', 'a barra abre sem aviso nenhum');
		assert.deepEqual(host.fila, [], 'a barra mandou a fila');
		eventos = await promeiro.linhaDoTempo(mais.producao);
		assert.deepEqual(eventos.map((e) => [e.tipo, e.depois, e.origem]), [['designer-entrou', 'Dora Teste', 'Padeiro']], 'a designer é somada (a Produção já estava em Produzindo)');
		assert.equal(eventos[0].quando, guardado.abertoEm, 'com a hora certa da abertura, não a do envio');
		assert.deepEqual(promeiro.trello.pedidos.slice(1), [{ metodo: 'POST', caminho: '/cards/' + card(2) + '/idMembers', consulta: { value: 'membroDora' } }]);
		passo('a fila sem rede: o aviso ficou guardado e a barra mandou depois, com a hora da abertura');

		// 3c. o aviso repetido: a resposta se perdeu e o mesmo aviso vai de novo. não duplica evento nem membro
		host.fila = [guardado];
		await aviso(context);
		assert.deepEqual(host.fila, [], 'o repetido também sai da fila');
		assert.equal((await promeiro.linhaDoTempo(mais.producao)).length, 1, 'nenhum evento a mais');
		assert.equal(promeiro.trello.pedidos.length, 2, 'nenhum pedido a mais ao Trello');
		passo('o aviso repetido: o mesmo aviso de novo não duplica evento nem membro no card');

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
