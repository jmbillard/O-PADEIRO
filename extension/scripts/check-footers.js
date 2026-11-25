/*

---------------------------------------------------------------
> checagem dos rodapés (guia de UI)
---------------------------------------------------------------

Abre as janelas no navegador (modo de teste, mock-host.js), passa pelas telas de ui-states.js e confere os botões
dos rodapés: o centro de cada um a --footer-center do fundo da janela (todos na mesma linha, em todas as janelas)
e o "⋯" sempre do mesmo tamanho (38 px). Lista cada botão fora da linha.

  node extension/scripts/check-footers.js

Rodapé é o bloco com "foot" ou "action-bar" / "confeiteiro-bar" no nome da classe. Os itens de um menu aberto não contam,
nem os botões fora da janela (a coluna da lista, recolhida para cima numa janela estreita).

Rodapé em duas linhas (a janela estreita: o seletor do preset na linha dos botões redondos e o Preencher na de baixo,
painel de templates): a última linha fica na linha do rodapé; cada linha de cima, logo acima dela, separada pelo gap
do rodapé (o centro a --footer-center + meia linha de baixo + gap + meia linha de cima).

Precisa do Playwright. Sai com código 1 quando acha algum botão fora.

*/

const { chromium } = require('playwright');
const { CLIENT, CHECKS, windowSize, prepareContext } = require('./ui-states');

const TOLERANCE = 1.5; // px (o hover sobe 1 px)
const MENU_SIZE = 38;

function findFooters(opts) {
	const center = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--footer-center'));
	const H = innerHeight;
	const out = [];

	const items = [];

	document.querySelectorAll('button, summary, .dropdown-trigger').forEach(function (e) {
		const foot = e.closest('[class*="foot"], .action-bar, .confeiteiro-bar');
		const r = e.getBoundingClientRect();

		if (!foot || !r.width || getComputedStyle(e).visibility === 'hidden') return;
		if (e.closest('.menu-popover, .dropdown-popover')) return;
		if (r.bottom <= 0 || r.top >= H) return; // fora da janela

		items.push({ e: e, foot: foot, r: r });
	});

	// as linhas de cada rodapé (flex-wrap): de baixo para cima, cada uma com o topo e a altura
	function rowsOf(foot) {
		const rows = [];

		items.filter(function (it) {
			return it.foot === foot;
		}).forEach(function (it) {
			const row = rows.filter(function (w) {
				return it.r.top < w.bottom && it.r.bottom > w.top;
			})[0];

			if (row) {
				row.top = Math.min(row.top, it.r.top);
				row.bottom = Math.max(row.bottom, it.r.bottom);
			} else {
				rows.push({ top: it.r.top, bottom: it.r.bottom });
			}
		});

		return rows.sort(function (a, b) {
			return b.bottom - a.bottom;
		});
	}

	items.forEach(function (it) {
		const e = it.e;
		const r = it.r;
		const foot = it.foot;
		const label = (e.id || e.getAttribute('aria-label') || e.textContent.trim().slice(0, 16) || e.className) + ' (' + String(foot.className).split(' ')[0] + ')';
		const c = H - (r.top + r.height / 2);
		const rows = rowsOf(foot);
		const gap = parseFloat(getComputedStyle(foot).rowGap) || 0;
		let want = center;

		// numa linha de cima: logo acima da de baixo, separada pelo gap
		for (let i = 1; i < rows.length && r.bottom <= rows[i - 1].top + 0.5; i++) {
			want += (rows[i - 1].bottom - rows[i - 1].top) / 2 + gap + (rows[i].bottom - rows[i].top) / 2;
		}

		if (Math.abs(c - want) > opts.tolerance) out.push(label + ': centro a ' + c.toFixed(1) + ' px do fundo (o rodapé pede ' + want + ')');
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
		await page.setViewportSize(windowSize(url)); // o tamanho padrão da janela (manifest)
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
