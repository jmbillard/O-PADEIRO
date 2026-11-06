/*

---------------------------------------------------------------
> checagem do brilho do foco (guia de UI)
---------------------------------------------------------------

Abre as janelas no navegador (modo de teste, mock-host.js), foca cada campo (input, textarea, seletor) e confere
se o brilho azul do foco (4 px em volta) cabe inteiro no primeiro bloco de cima que corta o que passa dele
(overflow diferente de visible: o que rola ou recolhe). Lista cada campo cortado, o bloco que corta e de que lado.

  node extension/scripts/check-focus-crop.js

Precisa do Playwright (npm i -D playwright, ou o que já estiver instalado na máquina). Sai com código 1 quando
acha algum corte. As transições ficam desligadas: o brilho é medido já no tamanho final.

Não cobre os campos que só aparecem depois de uma ação que não está nos passos abaixo (ex: uma linha nova):
quando criar um passo novo numa janela, acrescente aqui.

*/

const path = require('path');
const { chromium } = require('playwright');

const CLIENT = 'file://' + path.resolve(__dirname, '../client') + '/';
const RING = 4; // .cfg-input:focus { box-shadow: 0 0 0 4px … } (panel.css)

// roda na página: foca cada campo visível e procura o primeiro bloco de cima que corta o brilho
function findCrops(ring) {
	const out = [];
	const fields = Array.from(document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, .dropdown-trigger')).filter(function (e) {
		return e.offsetParent && getComputedStyle(e).visibility !== 'hidden';
	});

	fields.forEach(function (field) {
		const r = field.getBoundingClientRect();
		const glow = { top: r.top - ring, bottom: r.bottom + ring, left: r.left - ring, right: r.right + ring };

		field.focus({ preventScroll: true });

		for (let box = field.parentElement; box && box !== document.documentElement; box = box.parentElement) {
			const cs = getComputedStyle(box);

			if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;

			const b = box.getBoundingClientRect();
			const sides = [];

			// em cima só conta com o bloco no topo (rolado, o campo pode estar escondido de propósito)
			if (glow.top < b.top - 0.5 && box.scrollTop === 0) sides.push('em cima');
			if (glow.left < b.left - 0.5) sides.push('à esquerda');
			if (glow.right > b.right + 0.5) sides.push('à direita');
			if (sides.length && glow.bottom > b.top && glow.top < b.bottom) {
				out.push((field.id || field.placeholder || field.getAttribute('aria-label') || field.className) + ' ← ' + (box.id || box.className) + ' (' + sides.join(', ') + ')');
			}
			break;
		}

		field.blur();
	});

	return Array.from(new Set(out));
}

// as janelas e os passos para chegar em cada estado (o mock responde)
const CATEGORIES = { categories: [{ name: 'PROGRAMAS', path: '/Volumes/VFX/PROGRAMAS/{atracao}', output: '/Volumes/OUT/PROGRAMAS/{atracao}', icon: 'tv' }] };

async function projectTo(page, screen) {
	// 1 · ATRAÇÃO: digita, escolhe "nova atração" (o nome e a categoria abrem embaixo)
	await page.fill('#claq', 'TESTE NOVO');
	await page.waitForTimeout(800);
	await page.locator('#atr-list .combo-item:has-text("nova atração")').click();
	await page.waitForTimeout(500);
	if (screen === 'nova') return;

	// 2 · CRIAR: o que é e as opções do output abertas
	await page.click('#claq-next');
	await page.waitForTimeout(600);
	await page.fill('#arq-what', 'vt');
	await page.waitForTimeout(600);
	await page.click('.out-line');
	await page.waitForTimeout(400);
}

async function openTemplate(page) {
	await page.locator('.tree-row:visible', { hasText: 'LETTERING SOLTO' }).first().click();
	await page.waitForTimeout(500);
}

const CHECKS = [
	['criador', 'maker.html', async (p) => {
		await p.click('#btn-import-add');
		await p.waitForTimeout(900); // o campo abre animado (motion.js): mede depois de aberto
		await p.click('#btn-fx'); // as variações de layout (os sufixos)
		await p.waitForTimeout(500);
	}],
	['projeto: editor', 'project.html?mock=created'],
	['projeto: atração', 'project.html'],
	['projeto: nova', 'project.html', (p) => projectTo(p, 'nova')],
	['projeto: criar', 'project.html', (p) => projectTo(p, 'criar')],
	['busca', 'finder.html'],
	['conversor', 'converter.html'],
	['templates', 'index.html', openTemplate],
	['editor de config', 'index.html', async (p) => {
		await openTemplate(p);
		const edit = p.locator('[title*="editar config"]').first();

		if (await edit.count()) await edit.click();
		await p.waitForTimeout(800);
	}]
].concat(['prods', 'project', 'collect', 'rename', 'organize', 'search', 'links', 'network', 'telemetry', 'appearance', 'tools', 'machine'].map(function (tab) {
	return ['configuração: ' + tab, 'productions.html', async (p) => {
		const button = p.locator('.tab[data-tab="' + tab + '"]');

		if (await button.count()) await button.click();
		await p.waitForTimeout(500);
	}];
}));

(async () => {
	const browser = await chromium.launch();
	const context = await browser.newContext({ viewport: { width: 1100, height: 1000 } });
	let found = 0;

	await context.addInitScript((categories) => {
		localStorage.setItem('pad.mock.project', JSON.stringify(categories));
	}, CATEGORIES);

	for (const [name, url, prepare] of CHECKS) {
		const page = await context.newPage();
		const errors = [];

		page.on('pageerror', (err) => errors.push(err.message));
		await page.goto(CLIENT + url);
		await page.waitForTimeout(1500);
		await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });

		try {
			if (prepare) await prepare(page);
		} catch (err) {
			errors.push('passo: ' + err.message.split('\n')[0]);
		}

		const crops = await page.evaluate(findCrops, RING);

		found += crops.length;
		console.log((crops.length ? '✗ ' : '✓ ') + name + (crops.length ? '\n  ' + crops.join('\n  ') : ''));
		if (errors.length) console.log('  ! ' + errors.join('\n  ! '));
		await page.close();
	}

	await browser.close();
	console.log(found ? '\n' + found + ' campo(s) com o brilho cortado.' : '\nnenhum brilho cortado.');
	process.exit(found ? 1 : 0);
})();
