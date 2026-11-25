/*

---------------------------------------------------------------
> as telas das checagens de UI (guia de UI)
---------------------------------------------------------------

As janelas e os passos para chegar em cada estado, no modo de teste (mock-host.js). Usado pelo
check-focus-crop.js (foco cortado) e pelo check-corners.js (cantos concêntricos): tela ou etapa nova entra aqui.

*/

const fs = require('fs');
const path = require('path');

const CLIENT = 'file://' + path.resolve(__dirname, '../client') + '/';

// o tamanho padrão de cada janela, lido do manifest (o <Size> de cada <MainPath>): é com ele que o After abre a
// janela quando não há tamanho guardado, e é nele que as checagens olham cada tela
const MANIFEST = fs.readFileSync(path.resolve(__dirname, '../CSXS/manifest.xml'), 'utf8');
const SIZES = {};

MANIFEST.replace(/<MainPath>\.\/client\/([^<]+)<\/MainPath>[\s\S]*?<Size>\s*<Width>(\d+)<\/Width>\s*<Height>(\d+)<\/Height>/g, (all, page, w, h) => {
	SIZES[page] = { width: +w, height: +h };
});

// url ('projetista.html?mock=created') → { width, height } do manifest
function windowSize(url) {
	const size = SIZES[url.split('?')[0]];

	if (!size) throw new Error('a página ' + url + ' não está no manifest');

	return size;
}

// as janelas e os passos para chegar em cada estado (o mock responde)
// index.html?lists: dois fixados e um recente na lista de templates do mock
const LISTS = { 'DIA-A-DIA': { favorites: ['/mock/TARJAS/TARJA SIMPLES.aep', '/mock/RODAPES/RODAPE PLACAR.aep'], recents: ['/mock/TEMPLATES PADEIRO/LETTERING SOLTO.aep'], renderPresets: {} } };

// os tipos de projeto: um com {atracao}, o de filmes e um fixo (MOOD MENSAL: o tipo é a atração, o mês pelo card)
const TIPOS_DE_PROJETO = { tipos: [{ name: 'PROGRAMAS', path: '/Volumes/VFX/PROGRAMAS/{atracao}/{ano}', output: '/Volumes/OUT/PROGRAMAS/{atracao}', icon: 'tv' }, { name: 'FILME', path: '/Volumes/VFX/FILMES/TITULOS/_{letra}_/{atracao}', output: '/Volumes/OUT/FILMES/TITULOS/_{letra}_/{atracao}', icon: 'pelicula' }, { name: 'MOOD MENSAL', path: '/Volumes/VFX/MOOD MENSAL/{ano_proximo_mes}/{proximo_mes_num} {proximo_mes}', output: '/Volumes/OUT/MOOD MENSAL/{ano_proximo_mes}', file: '{proximo_mes} NA GLOBO {o_que_e}', icon: 'calendario' }] };

// a janela de projeto: digita no campo (como uma pessoa, para a busca responder) e escolhe a linha da lista
async function projectPick(page, text, row) {
	await page.click('#claq');
	await page.type('#claq', text, { delay: 20 });
	await page.waitForTimeout(1300);
	if (!row) return;
	await page.locator('#atr-list ' + row).first().click();
	await page.waitForTimeout(1500);
}

// O ARQUIVISTA abre vazio: a pasta é digitada no campo (o mock responde com uma pasta de exemplo)
async function filesFolder(page) {
	await page.fill('#fl-path', '/Volumes/VFX/imagem/drive_l/Fileserver_3/SHOWS/PREMIO MULTISHOW/2026/_serviço');
	await page.press('#fl-path', 'Enter');
	await page.waitForTimeout(500);
}

async function projectTo(page, screen) {
	// o campo do projeto: digita e Enter sem atração achada nem tipo no começo abre os tipos da atração nova na
	// lista (os chips, o primeiro em realce)
	await page.fill('#claq', 'TESTE NOVO');
	await page.waitForTimeout(800);
	await page.press('#claq', 'Enter');
	await page.waitForTimeout(500);
	if (screen === 'nova') return;

	// o resto da tela: Enter cria no chip em realce (a lista recolhe), o que é e a lista do output aberta
	await page.press('#claq', 'Enter');
	await page.waitForTimeout(1000);
	await page.fill('#arq-what', 'vt');
	await page.waitForTimeout(600);
	await page.click('#out-card');
	await page.waitForTimeout(400);
}

async function openTemplate(page) {
	await page.locator('.tree-row:visible', { hasText: 'LETTERING SOLTO' }).first().click();
	await page.waitForTimeout(500);
}

// o preset de render no rodapé do preenchimento (entre os botões redondos e o Preencher), no tamanho padrão e em
// 340 px (o seletor no vão da linha dos botões redondos, o Preencher na de baixo): aberto, com o nome longo (o curto,
// em duas linhas) e o template sem output (o seletor some)
const PRESET_LONGO = 'GLOBO PROMO - ProRes 422 HQ 1080i59 - entrega VT sem áudio';

function presetStates() {
	const out = [];

	[['', null], [' (340 px)', { width: 340, height: 760 }]].forEach(([suffix, size]) => {
		async function resize(p) {
			if (size) await p.setViewportSize(size);
		}

		out.push(['templates: preset no rodapé' + suffix, 'index.html', async (p) => {
			await resize(p);
			await openTemplate(p);
		}]);
		out.push(['templates: preset aberto' + suffix, 'index.html', async (p) => {
			await resize(p);
			await openTemplate(p);
			await p.locator('#fill-preset .dropdown-trigger').click();
			await p.waitForTimeout(300);
		}]);
		out.push(['templates: preset de nome longo' + suffix, 'index.html', async (p) => {
			await resize(p);
			await p.evaluate((name) => localStorage.setItem('padeiro.outputTemplate', name), PRESET_LONGO);
			await openTemplate(p);
		}]);
		out.push(['templates: sem output' + suffix, 'index.html', async (p) => {
			await resize(p);
			await p.locator('.tree-row:visible', { hasText: 'ASSINATURA JORNAL' }).first().click();
			await p.waitForTimeout(800);
		}]);
	});

	return out;
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
	['criador', 'confeiteiro.html', async (p) => {
		await p.click('#btn-import-add');
		await p.waitForTimeout(900); // o campo abre animado (motion.js): mede depois de aberto
		await p.click('#btn-fx'); // as variações de layout (os sufixos)
		await p.waitForTimeout(500);
	}],
	['projeto: editor', 'projetista.html?mock=created'],
	['projeto: os dados', 'projetista.html?mock=created', async (p) => {
		await p.click('#ed-info');
		await p.waitForTimeout(500);
	}],
	['projeto: atração', 'projetista.html'],
	['projeto: nova', 'projetista.html', (p) => projectTo(p, 'nova')],
	['projeto: card do trello', 'projetista.html', async (p) => {
		await p.fill('#claq', 'domingao');
		await p.waitForTimeout(1200);
	}],
	// digitando: os filmes recentes que batem (o webhook dos filmes), com o pôster; um clique escolhe o filme (o cartão)
	['projeto: filmes recentes', 'projetista.html', async (p) => {
		await p.fill('#claq', 'nao');
		await p.waitForTimeout(1200);
	}],
	['projeto: filme escolhido', 'projetista.html', async (p) => {
		await p.fill('#claq', 'nao');
		await p.waitForTimeout(1200);
		await p.locator('.film-row').first().click();
		await p.waitForTimeout(1200);
		await p.click('#arq-what');
		await p.waitForTimeout(400);
	}],
	['projeto: o que é e output', 'projetista.html', (p) => projectTo(p, 'criar')],
	['projeto: pastas da atração', 'projetista.html', async (p) => {
		await p.fill('#claq', 'domingao com huck/');
		await p.waitForTimeout(1000);
	}],
	// os três passos: os grupos (NO TRELLO com "seu" e o status, a NOVA), o card escolhido (dois .aep em destaque, o
	// chip do ano pelo card), o card sem atração (o nome sugerido e os tipos), o card de filme (o pôster) e o tipo fixo
	['projeto: no trello', 'projetista.html', (p) => projectPick(p, 'premio')],
	['projeto: card escolhido', 'projetista.html', (p) => projectPick(p, 'premio', '.card-row')],
	['projeto: card escolhido, ano trocado', 'projetista.html', async (p) => {
		await projectPick(p, 'premio', '.card-row');
		await p.click('.wz-rule');
		await p.waitForTimeout(1200);
	}],
	['projeto: card sem atração', 'projetista.html', (p) => projectPick(p, 'summer', '.card-row')],
	['projeto: card sem atração, tipo escolhido', 'projetista.html', async (p) => {
		await projectPick(p, 'summer', '.card-row');
		await p.locator('#card-nova .tipo-chip').first().click();
		await p.waitForTimeout(1500);
	}],
	['projeto: card de filme', 'projetista.html', (p) => projectPick(p, 'encanto')],
	['projeto: card de filme escolhido', 'projetista.html', (p) => projectPick(p, 'encanto', '.card-row')],
	['projeto: filmes a produzir e já tem projeto', 'projetista.html', (p) => projectPick(p, 'de')],
	['projeto: filme com subpasta', 'projetista.html', (p) => projectPick(p, 'flores', '.film-row')],
	['projeto: tipo fixo pelo card', 'projetista.html', (p) => projectPick(p, 'mood', '.card-row')],
	['projeto: editor com a lista', 'projetista.html?mock=created', async (p) => {
		await p.fill('#ed-atracao', '');
		await p.type('#ed-atracao', 'premio', { delay: 20 });
		await p.waitForTimeout(1300);
	}],
	['projeto: editor trocado por um card', 'projetista.html?mock=created', async (p) => {
		await p.fill('#ed-atracao', '');
		await p.type('#ed-atracao', 'premio', { delay: 20 });
		await p.waitForTimeout(1300);
		await p.locator('#ed-atr-list .card-row').first().click();
		await p.waitForTimeout(800);
	}],
	['busca', 'finder.html'],
	// modo local: a cópia do índice na hora (com a data em cima dos resultados), sem tentar a rede
	['busca: modo local', 'finder.html?mock=modolocal', async (p) => {
		await p.fill('#q-paths', 'globo reporter');
		await p.waitForTimeout(600);
	}],
	// modo local sem cópia do índice neste computador: o aviso no lugar dos resultados, sem tentar a rede
	['busca: modo local sem cópia', 'finder.html?mock=nocopy'],
	['conversor', 'converter.html', async (p) => {
		// a janela fica com a altura do conteúdo (fitHeight no converter.js; no navegador, o mock só registra)
		const h = await p.evaluate(() => Math.ceil(document.getElementById('converter').getBoundingClientRect().height));

		await p.setViewportSize({ width: 720, height: h });
	}],
	['fontes do projeto', 'fonts.html'],
	['coletar', 'catador.html'],
	['coletar: migração', 'catador.html', async (p) => {
		await p.setViewportSize({ width: 780, height: 660 });
		await p.click('#app-menu summary');
		await p.waitForTimeout(300);
		await p.click('[data-action="migrate"]');
		await p.waitForTimeout(900);
	}],
	['versionador', 'versioner.html'],
	['versionador: projeto não salvo', 'versioner.html?mock=unsaved'],
	['etiquetas', 'labels.html'],
	['forminha', 'light.html'],
	['forminha: sem seleção', 'light.html?mock=nolayers'],
	['arquivista: vazio', 'files.html'],
	['arquivista', 'files.html', async (p) => {
		await filesFolder(p);
	}],
	['arquivista: confirmar', 'files.html', async (p) => {
		await filesFolder(p);
		// desliga o que ganhou _2 e pede a confirmação (o botão de voltar aparece no rodapé)
		await p.locator('.fl-row.is-dup .fl-cb').first().click();
		await p.click('#fl-go');
	}],
	['arquivista: ganhou _2', 'files.html', async (p) => {
		await filesFolder(p);
		// o filtro dos que mudam: a linha com o aviso "ganhou _2" e o sufixo antes da extensão
		await p.click('.fl-chip[data-filter="chg"]');
	}],
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
	['criador: caixa de texto aberta', 'confeiteiro.html', async (p) => {
		await p.locator('.confeiteiro-glass .dropdown-trigger').first().click();
		await p.waitForTimeout(300);
	}],
	['projeto: lista de atrações', 'projetista.html', async (p) => {
		await p.fill('#claq', 'dom');
		await p.waitForTimeout(800);
	}],
	['editor de config', 'index.html', async (p) => {
		await openTemplate(p);
		const edit = p.locator('[title*="editar config"]').first();

		if (await edit.count()) await edit.click();
		await p.waitForTimeout(800);
	}]
].concat(presetStates()).concat(['prods', 'tipos-de-projeto', 'coletar', 'rename', 'organize', 'search', 'fonts', 'links', 'network', 'telemetry', 'appearance', 'tools', 'deste-computador'].map(function (tab) {
	return ['configuração: ' + tab, 'productions.html', async (p) => {
		const button = p.locator('.tab[data-tab="' + tab + '"]');

		if (await button.count()) await button.click();
		await p.waitForTimeout(500);
	}];
}));

// prepara o contexto do navegador: os tipos de projeto e, com ?lists, os fixados e recentes
async function prepareContext(context) {
	await context.addInitScript((data) => {
		// cada tela começa com as gavetas fechadas (a barra lembra a que ficou aberta: sem isto, a de uma tela
		// viria aberta na seguinte)
		localStorage.removeItem('pad.bar.drawer');
		localStorage.setItem('pad.mock.tiposDeProjeto', JSON.stringify(data.tipos));
		if (/[?&]lists/.test(location.search)) sessionStorage.setItem('mock.templateLists', JSON.stringify(data.lists));
	}, { tipos: TIPOS_DE_PROJETO, lists: LISTS });
}

module.exports = { CLIENT, TIPOS_DE_PROJETO, CHECKS, SIZES, windowSize, prepareContext };
