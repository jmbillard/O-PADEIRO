/*

---------------------------------------------------------------
> as telas das checagens de UI (guia de UI)
---------------------------------------------------------------

As janelas e os passos para chegar em cada estado, no modo de teste (mock-host.js). Usado pelo
check-focus-crop.js (foco cortado) e pelo check-corners.js (cantos concêntricos): tela ou etapa nova entra aqui.

*/

const path = require('path');

const CLIENT = 'file://' + path.resolve(__dirname, '../client') + '/';

// as janelas e os passos para chegar em cada estado (o mock responde)
// index.html?lists: dois fixados e um recente na lista de templates do mock
const LISTS = { 'DIA-A-DIA': { favorites: ['/mock/TARJAS/TARJA SIMPLES.aep', '/mock/RODAPES/RODAPE PLACAR.aep'], recents: ['/mock/TEMPLATES PADEIRO/LETTERING SOLTO.aep'], renderPresets: {} } };

const CATEGORIES = { categories: [{ name: 'PROGRAMAS', path: '/Volumes/VFX/PROGRAMAS/{atracao}', output: '/Volumes/OUT/PROGRAMAS/{atracao}', icon: 'tv' }, { name: 'FILME', path: '/Volumes/VFX/FILMES/TITULOS/_{letra}_/{atracao}', output: '/Volumes/OUT/FILMES/TITULOS/_{letra}_/{atracao}', icon: 'film' }] };

async function projectTo(page, screen) {
	// o campo do projeto: digita, escolhe "nova atração" (o nome e a categoria abrem embaixo)
	await page.fill('#claq', 'TESTE NOVO');
	await page.waitForTimeout(800);
	await page.locator('#atr-list .combo-item:has-text("nova atração")').click();
	await page.waitForTimeout(500);
	if (screen === 'nova') return;

	// o resto da tela: Enter fecha a lista, o que é e a lista do output aberta
	await page.press('#nova-name', 'Enter');
	await page.waitForTimeout(600);
	await page.fill('#arq-what', 'vt');
	await page.waitForTimeout(600);
	await page.click('#out-card');
	await page.waitForTimeout(400);
}

async function openTemplate(page) {
	await page.locator('.tree-row:visible', { hasText: 'LETTERING SOLTO' }).first().click();
	await page.waitForTimeout(500);
}

const CHECKS = [
	['barra', 'bar.html'],
	['tour', 'bar.html?mock=nosetup'],
	// o painel da barra deitado e em pé, no mínimo (86 px no menor lado)
	['barra: horizontal 86 px', 'bar.html', async (p) => {
		await p.setViewportSize({ width: 900, height: 86 });
		await p.waitForTimeout(500);
	}],
	['barra: vertical 86 px', 'bar.html', async (p) => {
		await p.setViewportSize({ width: 86, height: 720 });
		await p.waitForTimeout(500);
	}],
	// as gavetas abertas (Projeto e Templates), nos dois sentidos
	['barra: gaveta projeto, horizontal 86 px', 'bar.html?mock=localfiles', async (p) => {
		await p.setViewportSize({ width: 900, height: 86 });
		await p.waitForTimeout(800);
		await p.click('#drawer-projeto');
		await p.waitForTimeout(700);
	}],
	['barra: gaveta projeto, vertical 86 px', 'bar.html?mock=localfiles', async (p) => {
		await p.setViewportSize({ width: 86, height: 720 });
		await p.waitForTimeout(800);
		await p.click('#drawer-projeto');
		await p.waitForTimeout(700);
	}],
	['barra: gaveta organizar, horizontal 86 px', 'bar.html', async (p) => {
		await p.setViewportSize({ width: 900, height: 86 });
		await p.waitForTimeout(800);
		await p.click('#drawer-organizar');
		await p.waitForTimeout(700);
	}],
	// a vertical larga (as ferramentas em linhas): a gaveta abre para baixo do mesmo jeito
	['barra: gaveta projeto, vertical larga 200 px', 'bar.html?mock=localfiles', async (p) => {
		await p.setViewportSize({ width: 200, height: 720 });
		await p.waitForTimeout(800);
		await p.click('#drawer-projeto');
		await p.waitForTimeout(700);
	}],
	['barra: gaveta templates, vertical 86 px', 'bar.html', async (p) => {
		await p.setViewportSize({ width: 86, height: 720 });
		await p.waitForTimeout(800);
		await p.click('#drawer-templates');
		await p.waitForTimeout(700);
	}],
	['criador', 'maker.html', async (p) => {
		await p.click('#btn-import-add');
		await p.waitForTimeout(900); // o campo abre animado (motion.js): mede depois de aberto
		await p.click('#btn-fx'); // as variações de layout (os sufixos)
		await p.waitForTimeout(500);
	}],
	['projeto: editor', 'project.html?mock=created'],
	['projeto: atração', 'project.html'],
	['projeto: nova', 'project.html', (p) => projectTo(p, 'nova')],
	['projeto: o que é e output', 'project.html', (p) => projectTo(p, 'criar')],
	['projeto: pastas da atração', 'project.html', async (p) => {
		await p.fill('#claq', 'domingao com huck/');
		await p.waitForTimeout(1000);
	}],
	['busca', 'finder.html'],
	['conversor', 'converter.html', async (p) => {
		// a janela fica com a altura do conteúdo (fitHeight no converter.js; no navegador, o mock só registra)
		const h = await p.evaluate(() => Math.ceil(document.getElementById('converter').getBoundingClientRect().height));

		await p.setViewportSize({ width: 720, height: h });
	}],
	['fontes do projeto', 'fonts.html'],
	['coletar', 'collect.html'],
	['versionador', 'versioner.html'],
	['versionador: projeto não salvo', 'versioner.html?mock=unsaved'],
	['etiquetas', 'labels.html'],
	['templates', 'index.html', openTemplate],
	['templates: fixados e recentes', 'index.html?lists', async (p) => {
		await p.locator('.tree-folder > .tree-row', { hasText: 'TARJAS' }).first().click();
		await p.waitForTimeout(300);
		await p.locator('.tree-item[data-section=""]', { hasText: 'TARJA DUPLA' }).first().locator('.tree-row').click();
		await p.waitForTimeout(900);
	}],
	['templates: menu ⋯', 'index.html', async (p) => {
		await p.click('#app-menu > summary');
		await p.waitForTimeout(300);
	}],
	['templates: produção aberta', 'index.html', async (p) => {
		await p.locator('.picker-prod .dropdown-trigger').click();
		await p.waitForTimeout(300);
	}],
	['criador: caixa de texto aberta', 'maker.html', async (p) => {
		await p.locator('.maker-glass .dropdown-trigger').first().click();
		await p.waitForTimeout(300);
	}],
	['projeto: lista de atrações', 'project.html', async (p) => {
		await p.fill('#claq', 'dom');
		await p.waitForTimeout(800);
	}],
	['editor de config', 'index.html', async (p) => {
		await openTemplate(p);
		const edit = p.locator('[title*="editar config"]').first();

		if (await edit.count()) await edit.click();
		await p.waitForTimeout(800);
	}]
].concat(['prods', 'project', 'collect', 'rename', 'organize', 'search', 'fonts', 'links', 'network', 'telemetry', 'appearance', 'tools', 'machine'].map(function (tab) {
	return ['configuração: ' + tab, 'productions.html', async (p) => {
		const button = p.locator('.tab[data-tab="' + tab + '"]');

		if (await button.count()) await button.click();
		await p.waitForTimeout(500);
	}];
}));

// prepara o contexto do navegador: as categorias do projeto e, com ?lists, os fixados e recentes
async function prepareContext(context) {
	await context.addInitScript((data) => {
		localStorage.setItem('pad.mock.project', JSON.stringify(data.categories));
		if (/[?&]lists/.test(location.search)) sessionStorage.setItem('mock.templateLists', JSON.stringify(data.lists));
	}, { categories: CATEGORIES, lists: LISTS });
}

module.exports = { CLIENT, CATEGORIES, CHECKS, prepareContext };
