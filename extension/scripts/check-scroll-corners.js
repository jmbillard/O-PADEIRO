// A barra de rolagem não entra nas quinas curvas: toda área que rola dentro de (ou sendo) um bloco de cantos
// arredondados tem que começar e terminar antes da curva. roda as janelas no navegador (mock) e aponta as que não.
// uso: node scripts/check-scroll-corners.js
const path = require('path');
const { chromium } = require('playwright');
const { windowSize } = require('./ui-states');

const PAGES = ['index.html', 'productions.html', 'projetista.html', 'fonts.html', 'catador.html', 'finder.html', 'confeiteiro.html', 'files.html', 'light.html', 'converter.html', 'labels.html', 'versioner.html'];

function scan() {
	var out = [];

	Array.prototype.forEach.call(document.querySelectorAll('*'), function (node) {
		var cs = getComputedStyle(node);

		if (!/auto|scroll/.test(cs.overflowY) || node.tagName === 'TEXTAREA') return;
		// a rolagem escondida (barra, listas sem barra) não tem o que cortar
		if (cs.scrollbarWidth === 'none' || getComputedStyle(node, '::-webkit-scrollbar').display === 'none') return;

		var box = node.getBoundingClientRect();

		if (box.width < 2 || box.height < 2) return;

		for (var up = node; up && up !== document.documentElement; up = up.parentElement) {
			var us = getComputedStyle(up);
			var top = parseFloat(us.borderTopRightRadius) || 0;
			var bottom = parseFloat(us.borderBottomRightRadius) || 0;

			if (top < 6 && bottom < 6) continue;

			var ub = up.getBoundingClientRect();
			var right = ub.right - box.right;

			if (right < 0 || right > Math.max(top, bottom)) continue;

			var name = node.tagName.toLowerCase() + (node.id ? '#' + node.id : '') + (node.className && node.className.baseVal == null ? '.' + String(node.className).trim().split(/\s+/).join('.') : '');
			// a quina ocupa 'raio' de altura; a barra pode entrar até onde a curva ainda está a 'right' da borda
			var need = function (r) {
				return r > right ? r - Math.sqrt(Math.max(0, r * r - (r - right) * (r - right))) : 0;
			};

			if (top >= 6 && box.top - ub.top < need(top) - 1) out.push(name + ': em cima (falta ' + Math.round(need(top) - (box.top - ub.top)) + 'px)');
			if (bottom >= 6 && ub.bottom - box.bottom < need(bottom) - 1) out.push(name + ': embaixo (falta ' + Math.round(need(bottom) - (ub.bottom - box.bottom)) + 'px)');
			break;
		}
	});

	return out;
}

(async () => {
	const browser = await chromium.launch();
	const page = await (await browser.newContext({ viewport: { width: 1180, height: 760 } })).newPage();
	let bad = 0;

	const report = (where, list) => {
		list.forEach((line) => {
			bad++;
			console.log(where + ' → ' + line);
		});
	};

	for (const file of PAGES) {
		try {
			await page.setViewportSize(windowSize(file)); // o tamanho padrão da janela (manifest)
			await page.goto('file://' + path.join(__dirname, '..', 'client', file));
		} catch (err) {
			continue;
		}
		await page.waitForTimeout(1200);
		report(file, await page.evaluate(scan));

		// as abas da configuração
		if (file === 'productions.html') {
			const tabs = await page.$$eval('.tab[data-tab]', (all) => all.map((t) => t.getAttribute('data-tab')));

			for (const tab of tabs) {
				await page.click('.tab[data-tab="' + tab + '"]');
				await page.waitForTimeout(500);
				report(file + ' [' + tab + ']', await page.evaluate(scan));
			}
		}
	}

	await browser.close();
	console.log(bad ? bad + ' rolagem(ns) dentro da quina curva.' : 'nenhuma barra de rolagem dentro das quinas curvas.');
	process.exit(bad ? 1 : 0);
})();
