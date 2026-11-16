/*

---------------------------------------------------------------
> checagem do foco: nada cortado (guia de UI)
---------------------------------------------------------------

Abre as janelas no navegador (modo de teste, mock-host.js), foca cada campo (input, textarea, seletor) e confere
se a folga do contorno do foco (3 px em volta: 1 px a 2 px de distância) cabe inteira no primeiro bloco de cima que corta o que passa dele
(overflow diferente de visible: o que rola ou recolhe). Lista cada campo cortado, o bloco que corta e de que lado.

  node extension/scripts/check-focus-crop.js

Precisa do Playwright (npm i -D playwright, ou o que já estiver instalado na máquina). Sai com código 1 quando
acha algum corte. As transições ficam desligadas: o contorno é medido já no tamanho final.

Não cobre os campos que só aparecem depois de uma ação que não está nos passos de ui-states.js (ex: uma linha nova):
quando criar um passo novo numa janela, acrescente lá.

*/

const { chromium } = require('playwright');
const { CLIENT, CHECKS, prepareContext } = require('./ui-states');
const RING = 3; // :focus-visible { outline: 1px solid …; outline-offset: 2px } (guia de UI: foco)

// roda na página: foca cada campo visível e procura o primeiro bloco de cima que corta a folga do foco
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

(async () => {
	const browser = await chromium.launch();
	const context = await browser.newContext({ viewport: { width: 1100, height: 1000 } });
	let found = 0;

	await prepareContext(context);

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
	console.log(found ? '\n' + found + ' campo(s) com o foco cortado.' : '\nnenhum foco cortado.');
	process.exit(found ? 1 : 0);
})();
