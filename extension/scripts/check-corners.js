/*

---------------------------------------------------------------
> checagem dos cantos concêntricos (guia de UI)
---------------------------------------------------------------

Abre as janelas no navegador (modo de teste, mock-host.js), passa pelas telas de ui-states.js e confere cada
elemento arredondado que fica num canto de outro arredondado: o raio de fora tem de ser o raio de dentro + o
respiro entre os dois + a borda de fora. Lista cada par fora da conta, com o raio que o de fora deveria ter.

  node extension/scripts/check-corners.js

Conta como "arredondado" o que aparece: com fundo, borda ou contorno por dentro, e também os botões, abas e
linhas (o fundo deles aparece no hover ou no escolhido). Um elemento só "está no canto" quando o respiro é
pequeno (até 24 px) e quase igual nos dois lados do canto. Pílulas contam com o raio real (metade da altura).

Precisa do Playwright. Sai com código 1 quando acha algum canto fora da conta.

*/

const { chromium } = require('playwright');
const { CLIENT, CHECKS, prepareContext } = require('./ui-states');

const MAX_GAP = 24; // respiro máximo para contar como "no canto"
const SKEW = 3; // diferença máxima entre o respiro de cima e o do lado
const TOLERANCE = 2.5; // px de folga na conta

// roda na página: os pares de cantos fora da conta
function findCorners(opts) {
	const INTERACTIVE = 'button, summary, a, [role="tab"], .tree-row, .dropdown-item, .combo-item';

	function radius(e, rect) {
		return Math.min(parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0, rect.height / 2, rect.width / 2);
	}

	function shows(e) {
		const cs = getComputedStyle(e);
		const border = parseFloat(cs.borderTopWidth) > 0 && !/rgba\(0, 0, 0, 0\)/.test(cs.borderTopColor) && cs.borderTopStyle !== 'none';
		const fill = !/rgba\(0, 0, 0, 0\)/.test(cs.backgroundColor) || cs.backgroundImage !== 'none';

		return border || fill || /inset/.test(cs.boxShadow) || e.matches(INTERACTIVE);
	}

	function visible(e) {
		const cs = getComputedStyle(e);

		return e.getClientRects().length && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0;
	}

	function name(e) {
		const cls = String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).trim().split(/\s+/).slice(0, 2).join('.');

		return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (cls ? '.' + cls : '');
	}

	const out = [];

	document.querySelectorAll('body *').forEach(function (e) {
		if (e instanceof SVGElement || !visible(e)) return;

		const er = e.getBoundingClientRect();

		if (er.width < 16 || er.height < 16) return;

		const r = radius(e, er);

		if (r < 3 || !shows(e)) return;

		// o primeiro de fora que também aparece arredondado
		let a = e.parentElement;

		while (a && a !== document.body) {
			const ar0 = a.getBoundingClientRect();

			if (radius(a, ar0) >= 3 && shows(a)) break;
			a = a.parentElement;
		}

		if (!a || a === document.body) return;

		const ar = a.getBoundingClientRect();
		const R = radius(a, ar);
		const corners = [
			[er.left - ar.left, er.top - ar.top],
			[ar.right - er.right, er.top - ar.top],
			[er.left - ar.left, ar.bottom - er.bottom],
			[ar.right - er.right, ar.bottom - er.bottom]
		];

		for (let i = 0; i < corners.length; i++) {
			const dx = corners[i][0];
			const dy = corners[i][1];

			if (dx < 0 || dy < 0 || dx > opts.maxGap || dy > opts.maxGap || Math.abs(dx - dy) > opts.skew) continue;

			const want = r + (dx + dy) / 2;

			if (Math.abs(R - want) > opts.tolerance) {
				out.push(name(a) + ' (raio ' + R.toFixed(1) + ') ⊃ ' + name(e) + ' (raio ' + r.toFixed(1) + ', respiro ' + ((dx + dy) / 2).toFixed(1) + ') → o de fora pede ' + want.toFixed(1));
				break;
			}
		}
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

		const bad = await page.evaluate(findCorners, { maxGap: MAX_GAP, skew: SKEW, tolerance: TOLERANCE });

		found += bad.length;
		console.log((bad.length ? '✗ ' : '✓ ') + name + (bad.length ? '\n  ' + bad.join('\n  ') : ''));
		if (errors.length) console.log('  ! ' + errors.join('\n  ! '));
		await page.close();
	}

	await browser.close();
	console.log(found ? '\n' + found + ' canto(s) fora da conta.' : '\ntodos os cantos concêntricos.');
	process.exit(found ? 1 : 0);
})();
