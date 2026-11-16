/*

---------------------------------------------------------------
> checagem dos rodapés (guia de UI)
---------------------------------------------------------------

Abre as janelas no navegador (modo de teste, mock-host.js), passa pelas telas de ui-states.js e confere os botões
dos rodapés: o centro de cada um a --footer-center do fundo da janela (todos na mesma linha, em todas as janelas)
e o "⋯" sempre do mesmo tamanho (38 px). Lista cada botão fora da linha.

  node extension/scripts/check-footers.js

Rodapé é o bloco com "foot" ou "action-bar" / "maker-bar" no nome da classe. Os itens de um menu aberto não contam.

Precisa do Playwright. Sai com código 1 quando acha algum botão fora.

*/

const { chromium } = require('playwright');
const { CLIENT, CHECKS, prepareContext } = require('./ui-states');

const TOLERANCE = 1.5; // px (o hover sobe 1 px)
const MENU_SIZE = 38;

function findFooters(opts) {
	const center = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--footer-center'));
	const H = innerHeight;
	const out = [];

	document.querySelectorAll('button, summary, .dropdown-trigger').forEach(function (e) {
		const foot = e.closest('[class*="foot"], .action-bar, .maker-bar');
		const r = e.getBoundingClientRect();

		if (!foot || !r.width || getComputedStyle(e).visibility === 'hidden') return;
		if (e.closest('.menu-popover, .dropdown-popover')) return;

		const label = (e.id || e.getAttribute('aria-label') || e.textContent.trim().slice(0, 16) || e.className) + ' (' + String(foot.className).split(' ')[0] + ')';
		const c = H - (r.top + r.height / 2);

		if (Math.abs(c - center) > opts.tolerance) out.push(label + ': centro a ' + c.toFixed(1) + ' px do fundo (o rodapé pede ' + center + ')');
		if (e.matches('.actions-menu > summary') && Math.abs(r.height - opts.menu) > 0.5) out.push(label + ': "⋯" de ' + r.height.toFixed(0) + ' px (pede ' + opts.menu + ')');
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
		await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation-duration: 0s !important; }' });

		try {
			if (prepare) await prepare(page);
		} catch (err) {
			errors.push('passo: ' + err.message.split('\n')[0]);
		}

		await page.mouse.move(0, 0); // nada em hover
		const bad = await page.evaluate(findFooters, { tolerance: TOLERANCE, menu: MENU_SIZE });

		found += bad.length;
		console.log((bad.length ? '✗ ' : '✓ ') + name + (bad.length ? '\n  ' + bad.join('\n  ') : ''));
		if (errors.length) console.log('  ! ' + errors.join('\n  ! '));
		await page.close();
	}

	await browser.close();
	console.log(found ? '\n' + found + ' botão(ões) fora da linha do rodapé.' : '\ntodos os rodapés na mesma linha.');
	process.exit(found ? 1 : 0);
})();
