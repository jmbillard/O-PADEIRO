/*

---------------------------------------------------------------
> ponta a ponta: a janela PROMeiro · produções (jmbillard/TEXTAO#148, #149, #150)
---------------------------------------------------------------

A janela no navegador (modo de teste, mock-host.js) contra um PROMeiro de teste: o servidor do PROMeiro (o repositório
TEXTAO, só lido) sobe numa pasta temporária, com o Teable e o Trello de mentira, como nos testes dele (o mesmo jeito do
e2e-promeiro.js). Nada sai para a rede. Confere:

  - a chave pendente: a janela pede a chave e não mostra a lista, só o aviso de que falta o administrador ligar;
  - ligada: a lista com as abas Entrada, Produzindo e Minhas e a contagem de cada uma; em cada Produção, só a claquete
    e o estado ("pronto para abrir", "sem pasta", "sem atração");
  - a praça: o menu filtra a lista, e a escolhida fica lembrada ao abrir a janela de novo;
  - abrir a Produção (larga, ao lado da lista): a praça e a etapa, a claquete, a versão em código (AH), o estado, as
    artes com o número, a feita riscada e o fogo, e a contagem "1 de 2"; nada de horário de exibição;
  - estreita (320 px): a lista ou a Produção, e a seta ← volta à lista;
  - os botões (#149), contra as rotas do PROMeiro de teste e o Trello de mentira: a chave pendente não age; Abrir
    projeto pega a Produção (o aviso) e O PROJETISTA (aberta aqui pelo teste, como o Padeiro abre no After) cria
    o projeto ou abre o .aep do card, e a caixinha diz qual; Preencher templates pega e A FORMA abre na busca da
    atração; marcar e desmarcar a arte (só quem está na Produção); o fogo sobe; Entreguei com as artes que faltam
    (Cancelar, Entregar assim mesmo); a seta ← volta para a Entrada; o Desfazer (entregar e pegar); a caixinha com o
    × na ponta direita; e o que chegou ao Trello de mentira;
  - sem rede (#150): cada ação (pegar, marcar a arte, o fogo, entregar, voltar e desfazer) entra na fila com o
    identificador e a hora, a janela atualiza na hora, a caixinha diz "Sem rede: vai quando a rede voltar." e o topo
    conta as guardadas ("Dora · 4"); o Desfazer tira da fila a que ainda não foi e enfileira o desfazer da que já foi;
    com a rede de volta, a fila vai em ordem (o que chegou ao PROMeiro, com a hora certa, e ao Trello de mentira), a
    repetida não duplica e a recusada de vez (409) sai da fila e aparece na caixinha;
  - as capturas (claro e escuro, estreita e larga, pendente, o pé, a caixinha e o "falta") na pasta CAPTURAS (sem
    ela, nenhuma).

  PROMEIRO=/caminho/do/TEXTAO CAPTURAS=/uma/pasta NODE_PATH=$(npm root -g) node extension/scripts/e2e-janela.js

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
const CAPTURAS = process.env.CAPTURAS || '';
const CHEFE = 'chefe@exemplo.com';
const DIA = 86400000;
const ha = (n) => new Date(Date.now() - n * DIA).toISOString();
const card = (n) => 'c0ffee' + String(n).padStart(18, '0');
const registro = (id, fields) => ({ id, fields });

// as Produções do PROMeiro de teste: duas praças, Entrada e Produzindo, uma com a designer da chave
const PRODUCOES = [
	// Entrada, SP: a atração com a pasta do projeto (pronto para abrir), o Roteiro com a complexidade e as versões (AH)
	registro('recJanShow', { card_ID: card(1), claquete: 'SHOW DA NOITE 20/12 SP', status: '[]', designers: null, artes: 'HOJE | AMANHÃ | DOMINGO', data_entrada: ha(1), __last_modified_time: ha(1) }),
	// Entrada, SP: sem a atração no cadastro
	registro('recJanNovo', { card_ID: card(2), claquete: 'PROGRAMA NOVO 21/12 SP', status: '[]', designers: null, artes: 'LETTERING', data_entrada: ha(1.2), __last_modified_time: ha(1.2) }),
	// Produzindo, SP, com a Dora: a atração sem a pasta do projeto (sem pasta), sem Roteiro (as artes sem fogo)
	registro('recJanFesta', { card_ID: card(3), claquete: 'FESTA NA PRACA 20/12 SP', status: '["PRODUZINDO"]', designers: '["Dora Teste"]', artes: 'LETTERING | CARTÃO', data_entrada: ha(2), __last_modified_time: ha(2) }),
	// Produzindo, na rede (G5), com outro designer
	registro('recJanBaile', { card_ID: card(4), claquete: 'BAILE DA ILHA 22/12', status: '["PRODUZINDO"]', designers: '["Rui Teste"]', artes: 'LETTERING', data_entrada: ha(3), __last_modified_time: ha(3) }),
	// Entregue: fica de fora
	registro('recJanChef', { card_ID: card(5), claquete: 'CHEF 19/12 SP', status: '["FINALIZADO"]', designers: '["Dora Teste"]', entregue: true, data_entrada: ha(6), data_entrega: ha(1), __last_modified_time: ha(1) })
];
const DESIGNERS = [
	registro('recDesignerDora', { designer: 'Dora Teste', email: 'dora@exemplo.com', designer_ID: 'membroDora', status: 'ativo' }),
	registro('recDesignerRui', { designer: 'Rui Teste', email: 'rui@exemplo.com', designer_ID: 'membroRui', status: 'ativo' })
];
const ATRACOES = [
	registro('recAtrShow', { atracao: 'Show da Noite', categoria: 'Variedades', projeto_win: 'P:\\SHOW\\PROJETOS', output_win: '' }),
	registro('recAtrFesta', { atracao: 'Festa na Praca', categoria: 'Shows', projeto_win: 'cole_aqui_o_caminho', output_win: 'P:\\FESTA\\OUTPUT' })
];
const NOMES = { ARTE_producao: 'arte_producao_pg', exibicoes: 'exibicoes_pg', designers: 'designers_pg', atracoes: 'atracoes_pg', filmes: 'filmes_pg' };

// o Trello de mentira: anota cada pedido e responde ok (a janela não pode pedir nada a ele)
function trelloFalso() {
	const pedidos = [];
	const buscar = async (endereco, init = {}) => {
		const u = new URL(endereco);

		pedidos.push({ metodo: init.method || 'GET', caminho: u.pathname, lista: u.searchParams.get('idList') || u.searchParams.get('value') || '' });

		return Response.json({});
	};

	return { pedidos, buscar };
}

// um Roteiro enviado para o card (o envio liga Roteiro ↔ card), com a meta e as versões lidas
function roteiroNoCard(db, id, n, meta, versoes) {
	const em = ha(1);

	db.prepare('INSERT INTO roteiros (id, dono_email, dono_nome, meta, doc, criado_em, atualizado_em, versoes_lidas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, 'redatora@exemplo.com', 'Redatora', JSON.stringify(meta), '{}', em, em, JSON.stringify(versoes || []));
	db.prepare("INSERT INTO envios (roteiro_id, estado, card_id, em) VALUES (?, 'ok', ?, ?)").run(id, card(n), em);
}

async function subirPromeiro() {
	const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'padeiro-janela-'));
	const importar = (f) => import(pathToFileURL(path.join(TEXTAO, f)).href);
	const { abrirBanco, criarApp } = await importar('servidor/app.mjs');
	const { criarTrello } = await importar('servidor/trello.mjs');
	const { criarCadastros } = await importar('servidor/cadastros.mjs');
	const { TEABLE_FALSO, teableFalso } = await importar('tests/fixtures/teable-falso.mjs');
	const env = { CADASTRO_ADMINS: CHEFE, ...TEABLE_FALSO, TEABLE_PG_URL: 'postgres://falso', TEABLE_PG_ESQUEMA: 'bseFalso', TRELLO_KEY: 'chave-falsa', TRELLO_TOKEN: 'token-falso', TRELLO_LISTA_SP: 'entradaSP', TRELLO_SAIDA_SP: 'saidaSP' };
	const teable = teableFalso(NOMES, { registros: { ARTE_producao: PRODUCOES, exibicoes: [], designers: DESIGNERS, atracoes: ATRACOES, filmes: [] } });
	const semRede = async (url) => {
		throw new Error('o teste não sai para a rede: ' + url);
	};
	const db = abrirBanco(path.join(pasta, 'promeiro.db'));

	roteiroNoCard(db, 'roteiro-show', 1, { claquete: 'SHOW DA NOITE 20/12 SP', programa: 'Show da Noite', complexidade: { HOJE: 3, DOMINGO: 2 } }, [
		{ codigo: 'A', rotulo: 'amanhã', conhecida: true },
		{ codigo: 'H', rotulo: 'hoje', conhecida: true }
	]);

	const trello = trelloFalso();
	const app = criarApp({
		db,
		env,
		buscarNoTeable: teable,
		abrirPg: teable.abrirPg,
		buscarNoGitHub: semRede,
		cadastros: (e) => criarCadastros(e, { buscar: teable }),
		trello: (e, deps) => criarTrello(e, { ...deps, buscar: trello.buscar })
	});

	await app.tabelasProntas;
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
	const idDe = (inicio) => db.prepare('SELECT id FROM producoes WHERE claquete LIKE ?').get(inicio + '%').id;

	return {
		url,
		chefe,
		trello,
		idDe,
		padeiros: async () => (await chefe('/api/cadastros/padeiros')).padeiros,
		// a Produção como a janela lê (pela chave da designer)
		producao: async (chave, id) => (await (await fetch(url + '/api/padeiro/producoes/' + encodeURIComponent(id), { headers: { 'x-chave-do-padeiro': chave } })).json()).producao,
		// o que a janela escreveu no Trello de mentira
		escritas: () => trello.pedidos.filter((p) => p.metodo !== 'GET').map((p) => p.metodo + ' ' + p.caminho.replace(/^\/1/, '') + (p.lista ? ' ' + p.lista : '')),
		// uma ação pela rota do Padeiro, fora da janela (outro computador da designer, por exemplo)
		acao: async (chave, rota, corpo) => {
			const r = await fetch(url + '/api/padeiro/' + rota, { method: 'POST', headers: { 'content-type': 'application/json', 'x-chave-do-padeiro': chave }, body: JSON.stringify({ acao: 'e2e-' + rota + '-' + Date.now(), feitaEm: new Date().toISOString(), ...corpo }) });

			return { status: r.status, corpo: await r.json() };
		},
		// a designer da chave marca uma arte como feita (a rota que a janela vai usar no #149)
		marcar: async (chave, producao, arte) => {
			const r = await fetch(url + '/api/padeiro/arte', { method: 'POST', headers: { 'content-type': 'application/json', 'x-chave-do-padeiro': chave }, body: JSON.stringify({ acao: 'e2e-' + Date.now(), feitaEm: new Date().toISOString(), producao, arte, feita: true }) });

			assert.equal(r.status, 200, 'a arte foi marcada');
		},
		async descer() {
			await new Promise((ok) => servidor.close(ok));
			servidor.closeAllConnections();
			await app.fechar();
			db.close?.();
			fs.rmSync(pasta, { recursive: true, force: true });
		}
	};
}

// a chave guardada "no host" (no After, o promeiro.json da pasta de dados): aqui, a memória do teste, que vale entre
// uma janela e outra
async function guardarAChave(context) {
	const host = { guardada: null };

	await context.exposeFunction('padMockPromeiro', (data) => {
		if (data !== undefined) host.guardada = data && data.chave ? data : null;

		return host.guardada;
	});
	// a fila dos avisos (o promeiro-fila.json): também na memória do teste
	host.fila = [];
	await context.exposeFunction('padMockPromeiroFila', (list) => {
		if (list !== undefined) host.fila = list || [];

		return host.fila;
	});

	// as ações da janela recusadas de vez (o promeiro-recusadas.json): também na memória do teste
	host.recusadas = [];
	await context.exposeFunction('padMockPromeiroRecusadas', (list) => {
		if (list !== undefined) host.recusadas = list || [];

		return host.recusadas;
	});

	// os pedidos da janela às outras (o promeiro-pedido-<para>.json): também na memória do teste
	host.pedidos = {};
	await context.exposeFunction('padMockPedido', (para, data) => {
		if (data !== undefined) host.pedidos[para] = data;

		return host.pedidos[para] || null;
	});

	return host;
}

const ESCURO = { mode: 'dark', background: 'gradient', accent: '#5184f8', gradientStart: '#67b7ff', gradientEnd: '#5649e9', font: 'inter', logo: '' };

async function contexto(browser, promeiro, { largura, escuro }) {
	const context = await browser.newContext({ viewport: { width: largura, height: largura > 640 ? 600 : 720 }, deviceScaleFactor: 2 });

	await prepareContext(context);
	await context.addInitScript(
		(o) => {
			if (!localStorage.getItem('pad.mock.promeiroUrl')) localStorage.setItem('pad.mock.promeiroUrl', o.url);
			if (o.escuro) localStorage.setItem('pad.mock.appearance', JSON.stringify(o.escuro));
		},
		{ url: promeiro.url, escuro: escuro ? ESCURO : null }
	);

	return context;
}

async function abrirJanela(context) {
	const page = context.pages()[0] || (await context.newPage());

	if (!page.errors) {
		page.errors = [];
		page.on('pageerror', (err) => page.errors.push(err.message));
		if (process.env.DEBUG) page.on('console', (m) => console.log('  [janela] ' + m.text()));
	}

	await page.goto(CLIENT + 'promeiro.html');
	await page.waitForFunction(() => document.body.getAttribute('data-estado') && document.body.getAttribute('data-estado') !== 'lendo', null, { timeout: 15000 });
	await page.waitForTimeout(400);

	return page;
}

const texto = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ').trim();

// a lista à mostra: [claquete, estado] de cada card
async function cards(page) {
	return page.locator('.prod-card').evaluateAll((els) => els.map((e) => [e.querySelector('.prod-claquete').textContent, (e.querySelector('.pr-pronto') || { textContent: '' }).textContent]));
}

async function abas(page) {
	return page.locator('.pr-aba').evaluateAll((els) => els.map((e) => e.firstChild.textContent + ' ' + e.querySelector('.pr-conta').textContent));
}

async function aba(page, nome) {
	await page.locator('.pr-aba', { hasText: nome }).click();
	await page.waitForTimeout(150);
}

// os botões do pé da Produção: o texto (a seta ←, pelo nome da dica)
async function pe(page) {
	return page.locator('.pr-pe button').evaluateAll((els) => els.map((e) => e.textContent.trim() || '← ' + e.getAttribute('aria-label')));
}

// o topo diz quantas ações estão guardadas (a janela confere a fila logo depois da ação)
async function topoDiz(page, esperado) {
	await page.waitForFunction((t) => (document.querySelector('.pr-chave') || {}).textContent === t, esperado, { timeout: 5000 }).catch(() => { });
	assert.equal(await texto(page.locator('.pr-chave')), esperado);
}

async function caixinha(page) {
	return texto(page.locator('.pr-caixa-in'));
}

// a ação terminou: nenhum botão esperando a resposta
async function quieta(page) {
	await page.waitForFunction(() => !document.querySelector('.pr-pe [disabled], .pr-caixa [disabled], .pr-falta [disabled]') && document.querySelector('.pr-folha h2'));
	await page.waitForTimeout(150);
}

async function capturar(page, nome) {
	if (!CAPTURAS) return;

	fs.mkdirSync(CAPTURAS, { recursive: true });
	await page.waitForTimeout(300);
	await page.screenshot({ path: path.join(CAPTURAS, nome + '.png') });
}

(async () => {
	const promeiro = await subirPromeiro();
	const browser = await chromium.launch();
	let ok = 0;
	const passo = (t) => {
		ok++;
		console.log('ok   ' + t);
	};

	try {
		// 1. a chave pendente: a janela pede a chave e mostra só o aviso, sem a lista
		const largo = await contexto(browser, promeiro, { largura: 900 });
		const host = await guardarAChave(largo);
		let page = await abrirJanela(largo);

		assert.equal(await page.getAttribute('body', 'data-estado'), 'pendente');
		assert.match(await texto(page.locator('.pr-aviso')), /^Chave pendente: este Padeiro está aguardando um administrador do PROMeiro ligar a chave a você/);
		assert.equal(await page.locator('.prod-card, .pr-abas, .pr-praca').count(), 0, 'pendente: nem a lista, nem as abas, nem a praça');
		assert.equal(await texto(page.locator('.pr-chave')), 'pendente');
		const lista = await promeiro.padeiros();
		assert.equal(lista.length, 1, 'a janela pediu a chave');
		assert.equal(lista[0].estado, 'pendente');
		await capturar(page, 'pendente-largo-claro');
		passo('a chave pendente: a janela pede a chave e mostra só o aviso de que falta o administrador ligar');

		// 2. ligada: a lista, as abas e as contagens (todas as praças)
		await promeiro.chefe('/api/cadastros/padeiros/' + lista[0].id + '/ligar', { method: 'POST', body: JSON.stringify({ designer: 'recDesignerDora' }) });
		await promeiro.marcar(host.guardada.chave, promeiro.idDe('FESTA NA PRACA'), 'LETTERING');
		page = await abrirJanela(largo);
		assert.equal(await page.getAttribute('body', 'data-estado'), 'ligada');
		assert.equal(await texto(page.locator('.pr-chave')), 'Dora');
		assert.equal(await texto(page.locator('.pr-praca')), 'Todas as praças');
		await page.waitForFunction(() => /Minhas\s*1/.test(document.querySelector('.pr-aba[data-v="minhas"]').textContent));
		assert.deepEqual(await abas(page), ['Entrada 2', 'Produzindo 2', 'Minhas 1']);
		assert.deepEqual(await cards(page), [
			['SHOW DA NOITE 20/12 SP', 'pronto para abrir'],
			['PROGRAMA NOVO 21/12 SP', 'sem atração']
		]);
		assert.equal(await page.locator('.pr-pronto:not(.falta)').count(), 1, 'a bolinha cheia só no pronto para abrir');
		await aba(page, 'Produzindo');
		assert.deepEqual(await cards(page), [
			['FESTA NA PRACA 20/12 SP', 'sem pasta'],
			['BAILE DA ILHA 22/12', 'sem atração']
		]);
		await aba(page, 'Minhas');
		assert.deepEqual(await cards(page), [['FESTA NA PRACA 20/12 SP', 'sem pasta']], 'Minhas: só a Produção com a Dora (a Entregue fica de fora)');
		passo('ligada: as abas Entrada, Produzindo e Minhas com a contagem, e em cada Produção só a claquete e o estado');

		// 3. a praça: filtra e fica lembrada
		await aba(page, 'Entrada');
		await page.locator('.pr-praca').click();
		assert.deepEqual(await page.locator('.pr-menu-item').evaluateAll((els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim())), ['G51 aberta', 'SP3 abertas', 'Todas as praças']);
		// no navegador de teste, o localStorage do file:// some quando a última página dele fecha (a janela navegando
		// para ela mesma): outra página aberta segura o que foi gravado até a janela abrir de novo
		const segura = await largo.newPage();
		await segura.goto(CLIENT + 'promeiro.html?mock=janelapendente');
		await page.bringToFront();
		await page.locator('.pr-menu-item', { hasText: 'G5' }).click();
		assert.equal(await texto(page.locator('.pr-praca')), 'G5');
		assert.deepEqual(await abas(page), ['Entrada 0', 'Produzindo 1', 'Minhas 1'], 'Minhas vale para todas as praças');
		assert.equal(await texto(page.locator('.pr-nada')), 'nada na entrada!');
		// a outra página vê o que foi gravado antes de a janela abrir de novo (sem isso, a gravação às vezes não chega)
		await segura.waitForFunction(() => /G5/.test(localStorage.getItem('pad.promeiro.praca') || ''));
		page = await abrirJanela(largo);
		assert.equal(await texto(page.locator('.pr-praca')), 'G5', 'a praça escolhida fica lembrada ao abrir de novo');
		await segura.close();
		await page.locator('.pr-praca').click();
		await page.locator('.pr-menu-item', { hasText: 'SP' }).click();
		assert.deepEqual(await abas(page).then((a) => a.slice(0, 2)), ['Entrada 2', 'Produzindo 1']);
		await capturar(page, 'lista-largo-claro');
		passo('a praça: o menu filtra a lista, e a escolhida fica lembrada ao abrir a janela de novo');

		// 4. abrir a Produção, larga: ao lado da lista
		await page.locator('.prod-card', { hasText: 'SHOW DA NOITE' }).click();
		await page.waitForSelector('.pr-folha h2');
		assert.ok(await page.locator('.pr-col').isVisible(), 'larga: a lista continua ao lado');
		assert.equal(await page.locator('.prod-card[aria-current="true"] .prod-claquete').innerText(), 'SHOW DA NOITE 20/12 SP');
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · ENTRADA');
		assert.equal(await texto(page.locator('.pr-folha h2')), 'SHOW DA NOITE 20/12 SP');
		assert.equal(await texto(page.locator('.pr-versao')), '(AH)');
		assert.equal(await texto(page.locator('.pr-folha .pr-pronto')), 'pronto para abrir');
		assert.equal(await texto(page.locator('.pr-conta-artes small')), '0 de 3');
		let artes = await page.locator('.artes li').evaluateAll((els) => els.map((e) => [e.querySelector('.num').textContent, e.querySelector('.txt').textContent, e.classList.contains('feita'), (e.querySelector('.fogo') || { className: { baseVal: '' } }).className.baseVal]));
		assert.deepEqual(artes, [
			['1', 'HOJE', false, 'fogo n3'],
			['2', 'AMANHÃ', false, 'fogo n1'],
			['3', 'DOMINGO', false, 'fogo n2']
		]);
		assert.doesNotMatch(await texto(page.locator('.pr-folha')), /\d{1,2}h\d{2}|exibi/i, 'sem horário de exibição');
		assert.equal(await page.locator('.pr-folha .pr-voltar:visible').count(), 0, 'larga: sem a seta (a lista está ao lado)');
		assert.deepEqual(await pe(page), ['Preencher templates', 'Abrir projeto'], 'quem não está na Produção: só Preencher templates e Abrir projeto');
		assert.equal(await page.locator('.artes .b[data-acao]').count(), 0, 'quem não está na Produção não marca as artes');
		assert.equal(await page.locator('.artes button.cx').count(), 3, 'o fogo sobe com um clique (qualquer designer)');

		await page.locator('.prod-card', { hasText: 'PROGRAMA NOVO' }).click();
		await page.waitForFunction(() => /PROGRAMA NOVO/.test((document.querySelector('.pr-folha h2') || {}).textContent || ''));
		assert.equal(await texto(page.locator('.pr-folha .pr-pronto')), 'sem atração');
		assert.ok(await page.locator('.pr-folha .pr-pronto.falta').count(), 'sem atração: a bolinha vazada');

		await aba(page, 'Minhas');
		await page.locator('.prod-card', { hasText: 'FESTA NA PRACA' }).click();
		await page.waitForFunction(() => /FESTA/.test((document.querySelector('.pr-folha h2') || {}).textContent || ''));
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · PRODUZINDO');
		assert.equal(await page.locator('.pr-versao').count(), 0, 'sem Roteiro, sem a versão');
		assert.equal(await texto(page.locator('.pr-conta-artes small')), '1 de 2');
		artes = await page.locator('.artes li').evaluateAll((els) => els.map((e) => [e.querySelector('.txt').textContent, e.classList.contains('feita'), !!e.querySelector('.pr-risco'), !!e.querySelector('.fogo')]));
		assert.deepEqual(artes, [
			['LETTERING', true, true, false],
			['CARTÃO', false, false, false]
		], 'a feita riscada; sem Roteiro, sem fogo');
		assert.equal(await page.locator('.artes li.feita .b').getAttribute('title'), 'feita · marcada por Dora Teste · clique para voltar a fazer');
		await capturar(page, 'producao-largo-claro');
		assert.deepEqual(page.errors, []);
		passo('abrir a Produção (larga): a praça e a etapa, a claquete, (AH), o estado, as artes com o fogo e a feita riscada, "1 de 2"');

		// 5. escuro, larga
		const largoEscuro = await contexto(browser, promeiro, { largura: 900, escuro: true });
		const hostEscuro = await guardarAChave(largoEscuro);
		hostEscuro.guardada = host.guardada;
		page = await abrirJanela(largoEscuro);
		assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
		await page.locator('.prod-card', { hasText: 'SHOW DA NOITE' }).click();
		await page.waitForSelector('.pr-folha h2');
		await capturar(page, 'producao-largo-escuro');
		assert.deepEqual(page.errors, []);
		passo('o tema escuro, larga');

		// 6. estreita (320 px): a lista ou a Produção, e a seta volta
		for (const escuro of [false, true]) {
			const estreito = await contexto(browser, promeiro, { largura: 320, escuro });
			const h = await guardarAChave(estreito);
			const tema = escuro ? 'escuro' : 'claro';

			h.guardada = host.guardada;
			page = await abrirJanela(estreito);
			assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320, 'estreita: nada passa da largura');
			await capturar(page, 'lista-estreito-' + tema);
			await page.locator('.prod-card', { hasText: 'SHOW DA NOITE' }).click();
			await page.waitForSelector('.pr-folha h2');
			assert.ok(!(await page.locator('.pr-col').isVisible()), 'estreita: a Produção no lugar da lista');
			const seta = page.locator('.pr-voltar');
			assert.ok(await seta.isVisible());
			assert.equal(await texto(seta), '', 'a seta sem o nome');
			await seta.hover();
			await page.waitForTimeout(2300);
			assert.equal(await texto(page.locator('.pad-tooltip')), 'voltar à lista', 'o nome só ao passar o mouse');
			await page.mouse.move(300, 700);
			await capturar(page, 'producao-estreito-' + tema);
			await seta.click();
			await page.waitForTimeout(200);
			assert.ok(await page.locator('.pr-col').isVisible(), 'a seta volta à lista');
			assert.ok(!(await page.locator('.pr-folha').isVisible()));
			assert.deepEqual(page.errors, []);
			await estreito.close();
		}
		passo('estreita (320 px): a lista ou a Produção; a seta ← volta à lista, com o nome só na dica (claro e escuro)');

		// 7. pendente, estreita e escura (a captura)
		const pend = await contexto(browser, promeiro, { largura: 320, escuro: true });
		await guardarAChave(pend);
		page = await abrirJanela(pend);
		assert.equal(await page.getAttribute('body', 'data-estado'), 'pendente', 'outro computador: chave nova, pendente');
		await capturar(page, 'pendente-estreito-escuro');
		await pend.close();
		passo('outro computador: a chave nova fica pendente e a janela só avisa');

		const show = promeiro.idDe('SHOW DA NOITE');
		const festa = promeiro.idDe('FESTA NA PRACA');
		assert.deepEqual(promeiro.escritas(), [], 'até aqui, a janela não escreve nada no Trello');

		// 8. a chave pendente: nada age (sem o pé, sem as artes; a ação pedida mesmo assim é recusada, sem gravar nada)
		const pend2 = await contexto(browser, promeiro, { largura: 900 });
		await guardarAChave(pend2);
		page = await abrirJanela(pend2);
		assert.equal(await page.getAttribute('body', 'data-estado'), 'pendente');
		assert.equal(await page.locator('.pr-pe, .artes, .pr-caixa-in').count(), 0, 'pendente: nem o pé, nem as artes, nem a caixinha');
		const recusada = await page.evaluate((id) => PAD_PROMEIRO.windowAction('arte', { producao: id, arte: 'HOJE', feita: true }), show);
		assert.equal(recusada.estado, 'pendente', 'a chave pendente não age');
		assert.equal((await promeiro.producao(host.guardada.chave, show)).contagem.feitas, 0);
		assert.deepEqual(page.errors, []);
		await pend2.close();
		passo('a chave pendente: os botões não aparecem e a ação pedida mesmo assim é recusada');

		// 9. Abrir projeto: pega a Produção (o aviso) e O PROJETISTA cria o projeto; a caixinha diz
		page = await abrirJanela(largo);
		await aba(page, 'Entrada');
		await page.locator('.prod-card', { hasText: 'SHOW DA NOITE' }).click();
		await page.waitForSelector('.pr-pe');
		await page.click('.pr-pe [data-acao="projeto"]');
		await page.waitForSelector('.pr-caixa-in');
		assert.equal(await caixinha(page), 'Abrindo o projeto de SHOW DA NOITE 20/12 SP… Você pegou a Produção. Desfazer ×');
		// no After, o Padeiro abre O PROJETISTA; aqui, o teste
		const proj = await largo.newPage();
		proj.errors = [];
		proj.on('pageerror', (err) => proj.errors.push(err.message));
		await proj.goto(CLIENT + 'projetista.html');
		await page.waitForFunction(() => /Projeto criado/.test((document.querySelector('.pr-caixa-in') || {}).textContent || ''), null, { timeout: 20000 });
		assert.equal(await caixinha(page), 'Projeto criado: SHOW DA NOITE.aep Você pegou a Produção. Desfazer ×');
		assert.match(await proj.evaluate(() => (window.PAD_MOCK_CUR || {}).file || ''), /\/SHOWS\/SHOW DA NOITE\/2026\/01 PROJETOS\/SHOW DA NOITE\.aep$/, 'O PROJETISTA criou o projeto na pasta da atração');
		await quieta(page);
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · PRODUZINDO');
		assert.deepEqual(await pe(page), ['← voltar para a Entrada', 'Preencher templates', 'Abrir projeto', 'Entreguei']);
		assert.deepEqual((await promeiro.producao(host.guardada.chave, show)).designers, ['Dora Teste']);
		assert.deepEqual(promeiro.escritas(), ['POST /cards/' + card(1) + '/idMembers membroDora'], 'a Dora entrou no card (só ela, uma vez)');
		const cx = await page.locator('.pr-caixa-in').boundingBox();
		const fechar = await page.locator('.pr-caixa-fechar').boundingBox();
		const desfazerBox = await page.locator('.pr-caixa-desfazer').boundingBox();
		assert.ok(cx.x + cx.width - (fechar.x + fechar.width) <= 8.5, 'o × na ponta direita da caixinha');
		assert.ok(fechar.x > desfazerBox.x + desfazerBox.width, 'o × depois do Desfazer');
		await capturar(page, 'caixinha-largo-claro');
		await page.click('.pr-caixa-fechar');
		assert.equal(await page.locator('.pr-caixa-in').count(), 0, 'o × fecha a caixinha');
		assert.deepEqual(proj.errors, []);
		passo('Abrir projeto: pega a Produção (a Dora no card e na Produção) e O PROJETISTA cria; "Projeto criado: SHOW DA NOITE.aep", com o × na ponta direita');

		// 10. marcar e desmarcar a arte: o nome riscado e a contagem
		const arteB = (n) => page.locator('.artes li:nth-child(' + n + ') .b');
		await arteB(1).click();
		await quieta(page);
		assert.equal(await texto(page.locator('.pr-conta-artes small')), '1 de 3');
		assert.equal(await page.locator('.artes li:nth-child(1).feita .pr-risco').count(), 1, 'riscada');
		assert.equal((await promeiro.producao(host.guardada.chave, show)).artes[0].feita, true);
		await arteB(1).click();
		await quieta(page);
		assert.equal(await texto(page.locator('.pr-conta-artes small')), '0 de 3');
		assert.equal(await page.locator('.artes .pr-risco').count(), 0);
		assert.equal((await promeiro.producao(host.guardada.chave, show)).artes[0].feita, false);
		await arteB(1).focus();
		await page.keyboard.press('Enter');
		await quieta(page);
		assert.equal(await texto(page.locator('.pr-conta-artes small')), '1 de 3', 'o Enter na bolinha também marca');
		assert.equal(await page.locator('.pr-caixa-in').count(), 0, 'marcar não abre a caixinha');
		passo('marcar a arte: um clique risca e conta "1 de 3", outro desmarca; o PROMeiro grava');

		// 11. o fogo: um clique sobe um nível (manda o nível pedido)
		const fogoDe = (n) => page.locator('.artes li:nth-child(' + n + ') .fogo').evaluate((e) => e.className.baseVal);
		assert.equal(await fogoDe(2), 'fogo n1');
		await page.locator('.artes li:nth-child(2) button.cx').click();
		await quieta(page);
		assert.equal(await fogoDe(2), 'fogo n2');
		await page.locator('.artes li:nth-child(2) button.cx').click();
		await quieta(page);
		assert.equal(await fogoDe(2), 'fogo n3');
		assert.equal((await promeiro.producao(host.guardada.chave, show)).artes[1].fogo, 3);
		passo('o fogo: cada clique sobe um nível (vela, fogueira, incêndio) e o PROMeiro grava');

		// 12. Entreguei com artes por marcar: quais faltam; Cancelar; Entregar assim mesmo
		await page.click('.pr-pe [data-acao="entreguei"]');
		await page.waitForSelector('.pr-falta');
		assert.equal(await texto(page.locator('.pr-falta')), 'Faltam marcar 2 artes no checklist: AMANHÃ DOMINGO Entregar assim mesmo Cancelar');
		await capturar(page, 'falta-largo-claro');
		await page.click('.pr-falta [data-acao="cancelar-falta"]');
		assert.equal(await page.locator('.pr-falta').count(), 0, 'Cancelar fecha o aviso');
		assert.equal((await promeiro.producao(host.guardada.chave, show)).etapa, 'produzindo', 'nada foi entregue');
		await page.click('.pr-pe [data-acao="entreguei"]');
		await page.click('.pr-falta [data-acao="assim-mesmo"]');
		await quieta(page);
		assert.equal(await caixinha(page), 'SHOW DA NOITE 20/12 SP foi entregue. Desfazer ×');
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · ENTREGUE');
		assert.deepEqual(await pe(page), ['← voltar para a Entrada', 'Preencher templates', 'Abrir projeto'], 'a Entregue: sem o Entreguei');
		assert.equal(await page.locator('.artes .b[data-acao], .artes button.cx').count(), 0, 'a Entregue: as artes e o fogo não mudam');
		assert.deepEqual(promeiro.escritas().slice(1), ['PUT /cards/' + card(1) + ' saidaSP'], 'o card foi para a saída da praça');
		await capturar(page, 'entregue-largo-claro');
		passo('Entreguei: avisa as que faltam (AMANHÃ, DOMINGO); Cancelar não entrega; "Entregar assim mesmo" entrega e o card vai para a saída');

		// 13. o Desfazer da entrega
		await page.click('.pr-caixa-desfazer');
		await quieta(page);
		assert.equal(await caixinha(page), 'Desfeito. ×');
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · PRODUZINDO');
		assert.deepEqual(promeiro.escritas().slice(2), ['PUT /cards/' + card(1) + ' entradaSP'], 'o card voltou para a entrada');
		passo('o Desfazer da entrega: a Produção volta para Produzindo e o card para a entrada');

		// 14. a seta ←: voltar para a Entrada (com o nome só na dica)
		assert.equal(await page.locator('.pr-pe .pr-volta').getAttribute('title'), 'voltar para a Entrada');
		await page.click('.pr-pe [data-acao="devolver"]');
		await quieta(page);
		assert.equal(await caixinha(page), 'SHOW DA NOITE 20/12 SP voltou para a Entrada. Desfazer ×');
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · ENTRADA');
		assert.deepEqual(await pe(page), ['Preencher templates', 'Abrir projeto']);
		assert.deepEqual(promeiro.escritas().slice(3), ['DELETE /cards/' + card(1) + '/idMembers/membroDora'], 'a Dora saiu do card');
		passo('a seta ← volta a Produção para a Entrada (a Dora sai do card), com o Desfazer na caixinha');

		// 15. Preencher templates: pega de novo e A FORMA abre nos templates da atração; e o Desfazer do pegar
		await page.click('.pr-pe [data-acao="templates"]');
		await quieta(page);
		assert.equal(await caixinha(page), 'Abrindo A FORMA: templates de Show da Noite. Você pegou a Produção. Desfazer ×');
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · PRODUZINDO');
		const forma = await largo.newPage();
		forma.errors = [];
		forma.on('pageerror', (err) => forma.errors.push(err.message));
		await forma.goto(CLIENT + 'index.html');
		await forma.waitForFunction(() => document.getElementById('search').value === 'Show da Noite', null, { timeout: 10000 });
		assert.deepEqual(forma.errors, []);
		await forma.close();
		await page.bringToFront();
		await page.click('.pr-caixa-desfazer');
		await quieta(page);
		assert.equal(await caixinha(page), 'Desfeito. ×');
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · ENTRADA', 'o Desfazer do pegar: de volta à Entrada');
		assert.deepEqual(promeiro.escritas().slice(4), ['POST /cards/' + card(1) + '/idMembers membroDora', 'DELETE /cards/' + card(1) + '/idMembers/membroDora']);
		passo('Preencher templates: pega a Produção e A FORMA abre com a busca "Show da Noite"; o Desfazer do pegar volta tudo');

		// 16. Abrir projeto de quem já está na Produção: sem pegar de novo, O PROJETISTA abre o .aep do card
		await aba(page, 'Minhas');
		await page.locator('.prod-card', { hasText: 'FESTA NA PRACA' }).click();
		await page.waitForFunction(() => /FESTA/.test((document.querySelector('.pr-folha h2') || {}).textContent || ''));
		await page.click('.pr-pe [data-acao="projeto"]');
		await page.waitForFunction(() => /^Abrindo:/.test((document.querySelector('.pr-caixa-in') || {}).textContent || ''), null, { timeout: 20000 });
		assert.equal(await caixinha(page), 'Abrindo: FESTA NA PRACA ABERTURA.aep ×', 'já estava com ela: sem "Você pegou" e sem o Desfazer');
		assert.match(await proj.evaluate(() => window.PAD_MOCK_OPENED_FILE || ''), /FESTA NA PRACA\/01 PROJETOS\/FESTA NA PRACA ABERTURA\.aep$/);
		assert.equal(promeiro.escritas().length, 6, 'nada novo no Trello');
		assert.deepEqual(proj.errors, []);
		await proj.close();
		passo('Abrir projeto de quem já está na Produção: O PROJETISTA abre o .aep do card ("Abrindo: FESTA NA PRACA ABERTURA.aep")');

		// 17. sem rede só na rota da arte (#150): a arte fica marcada, a ação vai para a fila e segue quando a rede volta
		await quieta(page);
		await page.route('**/api/padeiro/arte', (r) => r.abort('internetdisconnected'));
		await page.locator('.artes li:nth-child(2) .b').click();
		await page.waitForFunction(() => /Sem rede/.test((document.querySelector('.pr-caixa-in') || {}).textContent || ''));
		await quieta(page);
		assert.equal(await caixinha(page), 'CARTÃO marcada. Sem rede: vai quando a rede voltar. ×');
		assert.equal(await page.locator('.pr-caixa-in .pr-bola.atencao').count(), 1);
		assert.equal(await texto(page.locator('.pr-conta-artes small')), '2 de 2', 'a janela já mostra a arte marcada');
		await topoDiz(page, 'Dora · 1');
		assert.equal(host.fila.length, 1);
		const arteGuardada = { ...host.fila[0] };
		assert.equal(arteGuardada.rota, 'arte');
		assert.deepEqual(arteGuardada.dados, { arte: 'CARTÃO', feita: true });
		assert.equal(arteGuardada.producao, festa);
		assert.match(arteGuardada.aviso, /^[\w.:-]{1,100}$/);
		assert.equal((await promeiro.producao(host.guardada.chave, festa)).artes[1].feita, false, 'nada chegou ao PROMeiro ainda');
		await capturar(page, 'sem-rede-arte-largo-claro');
		await new Promise((ok) => setTimeout(ok, 1100)); // a hora da ação fica para trás
		await page.unroute('**/api/padeiro/arte');
		await page.waitForFunction(() => (document.querySelector('.pr-chave') || {}).textContent === 'Dora', null, { timeout: 25000 });
		await quieta(page);
		assert.equal(await caixinha(page), 'A ação guardada foi ao PROMeiro. ×');
		assert.deepEqual(host.fila, [], 'a fila esvaziou');
		const cartao = (await promeiro.producao(host.guardada.chave, festa)).artes[1];
		assert.equal(cartao.feita, true, 'a rede voltou: a arte chegou');
		assert.equal(cartao.marcada.em, arteGuardada.abertoEm, 'com a hora em que foi marcada, não a do envio');
		assert.equal(await texto(page.locator('.pr-conta-artes small')), '2 de 2');
		passo('sem rede na arte: a janela marca na hora, a caixinha diz "Sem rede: vai quando a rede voltar.", o topo conta "Dora · 1" e a arte vai com a hora certa');

		// 18. só quem está na Produção marca (a do Rui, na rede)
		await page.locator('.pr-praca').click();
		await page.locator('.pr-menu-item', { hasText: 'Todas as praças' }).click();
		await aba(page, 'Produzindo');
		await page.locator('.prod-card', { hasText: 'BAILE DA ILHA' }).click();
		await page.waitForFunction(() => /BAILE/.test((document.querySelector('.pr-folha h2') || {}).textContent || ''));
		assert.equal(await page.locator('.artes .b[data-acao]').count(), 0);
		await page.locator('.artes li:nth-child(1) .b').click();
		await page.waitForTimeout(300);
		assert.equal(await texto(page.locator('.pr-conta-artes small')), '0 de 1', 'o clique não marca');
		assert.deepEqual(await pe(page), ['Preencher templates', 'Abrir projeto']);
		assert.deepEqual(page.errors, []);
		passo('só quem está na Produção marca as artes e vê o Entreguei (a do Rui não muda)');

		// 19. estreita, claro e escuro: o pé, o aviso do que falta e a caixinha
		for (const escuro of [false, true]) {
			const estreito = await contexto(browser, promeiro, { largura: 320, escuro });
			const h = await guardarAChave(estreito);
			const tema = escuro ? 'escuro' : 'claro';

			h.guardada = host.guardada;
			page = await abrirJanela(estreito);
			await page.locator('.pr-aba', { hasText: 'Minhas' }).click();
			await page.locator('.prod-card', { hasText: 'FESTA NA PRACA' }).click();
			await page.waitForSelector('.pr-pe');
			await page.locator('.artes li:nth-child(2) .b').click();
			await quieta(page);
			assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320, 'estreita: o pé não passa da largura');
			await capturar(page, 'producao-pe-estreito-' + tema);
			await page.click('.pr-pe [data-acao="entreguei"]');
			await page.waitForSelector('.pr-falta');
			assert.equal(await texto(page.locator('.pr-falta-artes')), 'CARTÃO');
			await capturar(page, 'falta-estreito-' + tema);
			await page.click('.pr-falta [data-acao="cancelar-falta"]');
			await page.locator('.artes li:nth-child(2) .b').click();
			await quieta(page);
			await page.click('.pr-pe [data-acao="entreguei"]');
			await quieta(page);
			assert.equal(await caixinha(page), 'FESTA NA PRACA 20/12 SP foi entregue. Desfazer ×', 'nada faltando: entrega direto');
			const c = await page.locator('.pr-caixa-in').boundingBox();
			const x = await page.locator('.pr-caixa-fechar').boundingBox();
			const pe1 = await page.locator('.pr-pe').boundingBox();
			assert.ok(c.x + c.width - (x.x + x.width) <= 8.5, 'estreita: o × na ponta direita');
			assert.ok(c.y + c.height <= pe1.y, 'a caixinha fica acima do pé');
			await capturar(page, 'caixinha-estreito-' + tema);
			await page.click('.pr-caixa-desfazer');
			await quieta(page);
			assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · PRODUZINDO');
			assert.deepEqual(page.errors, []);
			await estreito.close();
		}
		passo('estreita (320 px), claro e escuro: o pé, o aviso do que falta e a caixinha acima do pé, com o × na ponta direita');

		assert.deepEqual(promeiro.escritas().slice(6), ['PUT /cards/' + card(3) + ' saidaSP', 'PUT /cards/' + card(3) + ' entradaSP', 'PUT /cards/' + card(3) + ' saidaSP', 'PUT /cards/' + card(3) + ' entradaSP'], 'no Trello: só as entregas e os Desfazer da FESTA');
		// 20. sem rede de todo (#150): pegar, marcar, o fogo e entregar vão para a fila; a janela atualiza na hora
		const semRede = (r) => r.abort('internetdisconnected');
		const fila = () => host.fila.map((x) => x.rota + (x.dados && x.dados.arte ? ' ' + x.dados.arte : '') + (x.producao === show ? ' SHOW' : x.producao === festa ? ' FESTA' : ''));
		page = await abrirJanela(largo);
		await page.locator('.pr-praca').click();
		await page.locator('.pr-menu-item', { hasText: 'SP' }).click();
		// as duas lidas com a rede (sem rede, a janela abre a Produção com a última leitura)
		await aba(page, 'Minhas');
		await page.locator('.prod-card', { hasText: 'FESTA NA PRACA' }).click();
		await page.waitForFunction(() => /FESTA/.test((document.querySelector('.pr-folha h2') || {}).textContent || ''));
		await aba(page, 'Entrada');
		await page.locator('.prod-card', { hasText: 'SHOW DA NOITE' }).click();
		await page.waitForFunction(() => /SHOW/.test((document.querySelector('.pr-folha h2') || {}).textContent || ''));
		await quieta(page);
		const noTrello = promeiro.escritas().length;
		await largo.route('**/api/padeiro/**', semRede);

		await page.click('.pr-pe [data-acao="projeto"]');
		await page.waitForFunction(() => /Sem rede/.test((document.querySelector('.pr-caixa-in') || {}).textContent || ''));
		await quieta(page);
		assert.equal(await caixinha(page), 'Abrindo o projeto de SHOW DA NOITE 20/12 SP… Sem rede: vai quando a rede voltar. Desfazer ×');
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · PRODUZINDO', 'pegou: a janela já mostra como se tivesse ido');
		assert.deepEqual(await pe(page), ['← voltar para a Entrada', 'Preencher templates', 'Abrir projeto', 'Entreguei']);
		await topoDiz(page, 'Dora · 1');
		assert.equal(await page.locator('.pr-col .prod-card', { hasText: 'SHOW DA NOITE' }).count(), 0, 'na lista, saiu da Entrada');
		await aba(page, 'Produzindo');
		assert.equal(await page.locator('.pr-col .prod-card', { hasText: 'SHOW DA NOITE' }).count(), 1, 'e está em Produzindo');
		await capturar(page, 'sem-rede-pegou-largo-claro');

		await page.locator('.artes li:nth-child(2) .b').click();
		await quieta(page);
		assert.equal(await caixinha(page), 'AMANHÃ marcada. Sem rede: vai quando a rede voltar. ×');
		assert.equal(await texto(page.locator('.pr-conta-artes small')), '2 de 3');
		await page.locator('.artes li:nth-child(3) button.cx').click();
		await quieta(page);
		assert.equal(await fogoDe(3), 'fogo n3');
		assert.equal(await caixinha(page), 'DOMINGO: complexidade ALTA. Sem rede: vai quando a rede voltar. ×');
		await page.click('.pr-pe [data-acao="entreguei"]');
		await page.click('.pr-falta [data-acao="assim-mesmo"]');
		await quieta(page);
		assert.equal(await caixinha(page), 'SHOW DA NOITE 20/12 SP foi entregue. Sem rede: vai quando a rede voltar. Desfazer ×');
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · ENTREGUE');
		await topoDiz(page, 'Dora · 4');
		assert.deepEqual(fila(), ['aviso SHOW', 'arte AMANHÃ SHOW', 'fogo DOMINGO SHOW', 'entregar SHOW']);
		await capturar(page, 'sem-rede-largo-claro');

		// o Desfazer da entrega que ainda está na fila: ela só sai dela
		await page.click('.pr-caixa-desfazer');
		await quieta(page);
		assert.equal(await caixinha(page), 'Desfeito. A ação guardada saiu da fila: nada foi ao PROMeiro. ×');
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · PRODUZINDO');
		await topoDiz(page, 'Dora · 3');
		assert.deepEqual(fila(), ['aviso SHOW', 'arte AMANHÃ SHOW', 'fogo DOMINGO SHOW']);
		await page.click('.pr-pe [data-acao="entreguei"]');
		await page.click('.pr-falta [data-acao="assim-mesmo"]');
		await quieta(page);
		await topoDiz(page, 'Dora · 4');

		// a FESTA, aberta sem rede (com a última leitura): o Entreguei vai para a fila
		await aba(page, 'Minhas');
		await page.locator('.prod-card', { hasText: 'FESTA NA PRACA' }).click();
		await page.waitForFunction(() => /FESTA/.test((document.querySelector('.pr-folha h2') || {}).textContent || ''));
		await quieta(page);
		await page.click('.pr-pe [data-acao="entreguei"]');
		await quieta(page);
		assert.equal(await caixinha(page), 'FESTA NA PRACA 20/12 SP foi entregue. Sem rede: vai quando a rede voltar. Desfazer ×');
		await topoDiz(page, 'Dora · 5');
		const guardadas = JSON.parse(JSON.stringify(host.fila));
		assert.deepEqual(fila(), ['aviso SHOW', 'arte AMANHÃ SHOW', 'fogo DOMINGO SHOW', 'entregar SHOW', 'entregar FESTA']);
		assert.equal(new Set(guardadas.map((x) => x.aviso)).size, 5, 'cada ação com o seu identificador');
		assert.deepEqual(guardadas.map((x) => x.abertoEm), guardadas.map((x) => x.abertoEm).slice().sort(), 'com a hora de cada uma, em ordem');
		assert.equal(promeiro.escritas().length, noTrello, 'sem rede, nada chegou ao Trello');
		assert.equal((await promeiro.producao(host.guardada.chave, show)).etapa, 'entrada', 'nem ao PROMeiro');
		assert.deepEqual(page.errors, []);
		passo('sem rede: pegar, marcar, o fogo e entregar entram na fila com o identificador e a hora; a janela atualiza na hora e o topo conta "Dora · 5"; o Desfazer tira da fila a que não foi');

		// enquanto isso, a FESTA foi entregue por outro caminho: a entrega guardada vai ser recusada (409)
		await new Promise((ok) => setTimeout(ok, 1100)); // a hora das ações fica para trás
		assert.equal((await promeiro.acao(host.guardada.chave, 'entregar', { producao: festa })).status, 200);
		const antesDaRede = promeiro.escritas().length;

		// a rede volta: a fila vai em ordem
		await largo.unroute('**/api/padeiro/**', semRede);
		await page.waitForFunction(() => (document.querySelector('.pr-chave') || {}).textContent === 'Dora', null, { timeout: 25000 });
		await page.waitForFunction(() => /recusou/.test((document.querySelector('.pr-caixa-in') || {}).textContent || ''));
		await quieta(page);
		assert.deepEqual(host.fila, [], 'a fila esvaziou');
		assert.deepEqual(host.recusadas, [], 'a recusada foi mostrada e saiu do host');
		assert.match(await caixinha(page), /^O PROMeiro recusou entregar \(FESTA NA PRACA 20\/12 SP\)\. .*Entregue.* Saiu da fila\. ×$/);
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · ENTREGUE', 'a FESTA, como o PROMeiro diz');
		await capturar(page, 'recusa-largo-claro');
		assert.deepEqual(promeiro.escritas().slice(antesDaRede), ['POST /cards/' + card(1) + '/idMembers membroDora', 'PUT /cards/' + card(1) + ' saidaSP'], 'no Trello, em ordem: a Dora entrou no card do SHOW e ele foi para a saída');
		const showAgora = await promeiro.producao(host.guardada.chave, show);
		assert.equal(showAgora.etapa, 'entregue');
		assert.deepEqual(showAgora.designers, ['Dora Teste']);
		assert.equal(showAgora.artes[1].feita, true);
		assert.equal(showAgora.artes[1].marcada.em, guardadas[1].abertoEm, 'a arte com a hora certa');
		assert.equal(showAgora.artes[2].fogo, 3);
		await page.click('.pr-caixa-fechar');
		assert.equal(await page.locator('.pr-caixa-in').count(), 0);
		passo('a rede voltou: a fila foi em ordem (pegar, marcar, fogo, entregar), com a hora certa; a entrega da FESTA, recusada (409), saiu da fila e apareceu na caixinha');

		// o mesmo envio de novo (a resposta se perdeu): nada duplica. (o fogo fica de fora: com a Produção já Entregue,
		// a rota do fogo do PROMeiro responde 409 antes de ver que é repetido)
		host.fila = guardadas.filter((x) => x.producao === show && x.rota !== 'fogo');
		const naoDuplica = promeiro.escritas().length;
		await page.evaluate(() => PAD_PROMEIRO.flush(true));
		assert.deepEqual(host.fila, [], 'as repetidas saem da fila');
		assert.deepEqual(host.recusadas, [], 'e nenhuma é recusada');
		assert.equal(promeiro.escritas().length, naoDuplica, 'nada novo no Trello');
		assert.deepEqual(await promeiro.producao(host.guardada.chave, show), showAgora, 'nem no PROMeiro');
		passo('o mesmo envio de novo: as ações repetidas não duplicam nada');

		// o Desfazer de uma ação que já foi, sem rede: o desfazer entra na fila com o identificador dela (desfaz).
		// o SHOW, Entregue, saiu da lista: a janela abre ele pelo id (como o clique num card)
		await page.evaluate((id) => {
			const b = document.createElement('button');

			b.setAttribute('data-abrir', id);
			b.id = 'e2e-abrir';
			document.body.appendChild(b);
		}, show);
		await page.click('#e2e-abrir');
		await page.waitForFunction(() => /SHOW/.test((document.querySelector('.pr-folha h2') || {}).textContent || ''));
		await quieta(page);
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · ENTREGUE');
		await page.click('.pr-pe [data-acao="devolver"]');
		await quieta(page);
		assert.equal(await caixinha(page), 'SHOW DA NOITE 20/12 SP voltou para a Entrada. Desfazer ×');
		const voltou = promeiro.escritas().length;
		await largo.route('**/api/padeiro/**', semRede);
		await page.click('.pr-caixa-desfazer');
		await quieta(page);
		assert.equal(await caixinha(page), 'Desfeito. Sem rede: vai quando a rede voltar. ×');
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · ENTREGUE', 'a janela já mostra desfeito');
		await topoDiz(page, 'Dora · 1');
		assert.equal(host.fila[0].rota, 'desfazer');
		assert.ok(host.fila[0].dados.desfaz, 'com o identificador da ação desfeita');
		assert.equal((await promeiro.producao(host.guardada.chave, show)).etapa, 'entrada');
		await largo.unroute('**/api/padeiro/**', semRede);
		await page.waitForFunction(() => (document.querySelector('.pr-chave') || {}).textContent === 'Dora', null, { timeout: 25000 });
		await quieta(page);
		assert.equal(await caixinha(page), 'A ação guardada foi ao PROMeiro. ×');
		assert.equal((await promeiro.producao(host.guardada.chave, show)).etapa, 'entregue', 'o desfazer chegou');
		assert.equal(await texto(page.locator('.pr-rotulo')), 'SP · ENTREGUE');
		assert.ok(promeiro.escritas().length > voltou, 'e o Trello voltou também');
		assert.deepEqual(page.errors, []);
		passo('o Desfazer sem rede de uma ação que já foi: o desfazer entra na fila com o identificador dela e vai quando a rede volta');

		await largo.close();
		await largoEscuro.close();
		console.log('\n' + ok + ' passos ok');
	} catch (err) {
		console.error('FALHOU: ' + (err.stack || err.message));
		process.exitCode = 1;
	} finally {
		await browser.close();
		await promeiro.descer();
	}
})();
