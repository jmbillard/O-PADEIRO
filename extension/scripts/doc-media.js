#!/usr/bin/env node
/*

---------------------------------------------------------------
> as imagens da documentação (telas, gifs e ícones)
---------------------------------------------------------------

Abre as janelas no navegador (modo de teste: mock-host.js responde no lugar do After Effects), põe cada uma num
estado que conta a história e grava em docs/images/:

  telas  → docs/images/<nome>.webp       a janela em 2x, com os botões e abas destacados e numerados (❶ ❷ ❸…),
                                          que o texto da documentação explica na mesma ordem
  gifs   → docs/images/anim/<nome>.webp  a janela em uso (webp animado, em loop como um gif: com o degradê das
                                          janelas, um gif fica enorme), com um cursor desenhado (o vídeo headless
                                          não tem) e um anel a cada clique (laranja no clique direito)
  ícones → docs/images/icons/<nome>.png  as ferramentas da barra, ampliadas no degradê da barra, para as tabelas

  node extension/scripts/doc-media.js                 tudo
  node extension/scripts/doc-media.js gifs            só os gifs (ou: telas, icones)
  node extension/scripts/doc-media.js gifs tour barra só esses

Precisa do Playwright e do ffmpeg. Rode de novo quando uma tela mudar: as imagens saem sempre iguais (mesmos
dados de teste, mesmos passos).

*/

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const CLIENT = 'file://' + path.join(ROOT, 'extension/client') + '/';
const OUT = path.join(ROOT, 'docs/images');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pad-doc-'));

/* =========================================================
   na página: cursor, anel do clique e os destaques numerados
   ========================================================= */

// o cursor (o vídeo do navegador sem janela não tem) e um anel a cada clique: azul no esquerdo, laranja no direito
const CURSOR = `(() => {
	const svg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 22"><path d="M1.5 1.5v16l4.3-4.2 3.1 7 3-1.4-3-6.8h6z" fill="white" stroke="#1d2340" stroke-width="1.3" stroke-linejoin="round"/></svg>');
	const c = document.createElement('div');
	c.style.cssText = 'position:fixed;left:-40px;top:-40px;width:16px;height:22px;z-index:2147483647;pointer-events:none;transition:transform .09s;filter:drop-shadow(0 2px 3px rgba(20,30,70,.35));background:url("' + svg + '") no-repeat';
	const ring = (x, y, right) => {
		const r = document.createElement('div');
		r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;left:' + (x - 14) + 'px;top:' + (y - 14) + 'px;width:28px;height:28px;border-radius:50%;border:2.5px solid ' + (right ? '#ff9f1c' : '#ffffff') + ';box-shadow:0 0 0 2px ' + (right ? 'rgba(255,159,28,.35)' : 'rgba(69,112,211,.45)') + ';transform:scale(.3);opacity:1;transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .45s ease';
		document.documentElement.appendChild(r);
		requestAnimationFrame(() => { r.style.transform = 'scale(1.25)'; r.style.opacity = '0'; });
		setTimeout(() => r.remove(), 600);
	};
	addEventListener('mousemove', (e) => { c.style.left = e.clientX - 2 + 'px'; c.style.top = e.clientY - 2 + 'px'; }, true);
	addEventListener('mousedown', (e) => { c.style.transform = 'scale(.84)'; ring(e.clientX, e.clientY, e.button === 2); }, true);
	addEventListener('mouseup', () => { c.style.transform = ''; }, true);
	addEventListener('DOMContentLoaded', () => document.documentElement.appendChild(c));
})();`;

// os destaques: um anel laranja em volta de cada botão/aba e o número no canto (o texto explica na ordem)
function markInPage(list) {
	const old = document.getElementById('pad-doc-marks');

	if (old) old.remove();

	const layer = document.createElement('div');

	layer.id = 'pad-doc-marks';
	layer.style.cssText = 'position:fixed;inset:0;z-index:2147483640;pointer-events:none';
	list.forEach((m, i) => {
		const el = m.text ? Array.from(document.querySelectorAll(m.sel)).filter((e) => e.textContent.indexOf(m.text) >= 0).pop() : document.querySelector(m.sel);

		if (!el) return;

		const r = el.getBoundingClientRect();
		const pad = m.pad == null ? 4 : m.pad;
		const radius = m.round ? '999px' : Math.max(8, (parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0) + pad) + 'px';
		const box = document.createElement('div');
		const n = document.createElement('b');
		const left = Math.max(2, r.left - pad);
		const top = Math.max(2, r.top - pad);
		// o número fica sempre inteiro na imagem: perto da borda, ele entra no anel em vez de sair
		const nLeft = Math.max(-9, 2 - left);
		const nTop = Math.max(-9, 2 - top);

		box.style.cssText = 'position:absolute;left:' + left + 'px;top:' + top + 'px;width:' + Math.min(innerWidth - left - 2, r.width + pad * 2) + 'px;height:' + Math.min(innerHeight - top - 2, r.height + pad * 2) + 'px;border-radius:' + radius + ';border:2px solid #ff9f1c;box-shadow:0 0 0 3px rgba(255,159,28,.25),0 0 14px rgba(255,159,28,.35);box-sizing:border-box';
		n.textContent = m.n || i + 1;
		n.style.cssText = 'position:absolute;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#ff9f1c;color:#1d2340;font:800 11px/1 Inter,system-ui,sans-serif;box-shadow:0 2px 6px rgba(20,30,70,.35);border:1.5px solid #fff;' + (m.at === 'right' ? 'right:-9px;top:' + nTop + 'px' : m.at === 'bottom' ? 'left:' + nLeft + 'px;bottom:-9px' : 'left:' + nLeft + 'px;top:' + nTop + 'px');
		box.appendChild(n);
		layer.appendChild(box);
	});
	document.documentElement.appendChild(layer);
}

/* =========================================================
   o mouse
   ========================================================= */

let mouse = [0, 0];

async function glide(p, to, ms) {
	const from = mouse;
	const steps = Math.max(2, Math.round((ms || 450) / 16));

	for (let i = 1; i <= steps; i++) {
		const t = i / steps;
		const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

		await p.mouse.move(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e);
		await p.waitForTimeout(16);
	}

	mouse = to;
}

async function center(p, sel) {
	const loc = typeof sel === 'string' ? p.locator(sel).first() : sel;

	// a tela pode se refazer bem na hora (a lista relida): tenta de novo
	for (let i = 0; i < 20; i++) {
		await loc.scrollIntoViewIfNeeded({ timeout: 300 }).catch(() => { });

		const b = await loc.boundingBox({ timeout: 300 }).catch(() => null);

		if (b) return [b.x + b.width / 2, b.y + b.height / 2];

		await p.waitForTimeout(150);
	}

	throw new Error('não achei: ' + sel);
}

async function hover(p, sel, wait) {
	await glide(p, await center(p, sel));
	await p.waitForTimeout(wait == null ? 600 : wait);
}

// clica no que está lá na hora (as telas se mexem enquanto abrem)
async function tap(p, sel, o) {
	o = o || {};
	await glide(p, await center(p, sel), o.ms || 450);
	await p.waitForTimeout(120);

	const at = await center(p, sel);

	await p.mouse.move(at[0], at[1]);
	mouse = at;
	await p.mouse.down({ button: o.right ? 'right' : 'left' });
	await p.mouse.up({ button: o.right ? 'right' : 'left' });
	await p.waitForTimeout(o.wait == null ? 600 : o.wait);
}

async function type(p, text, ms) {
	for (const ch of text) {
		await p.keyboard.type(ch);
		await p.waitForTimeout(ms || 85);
	}
}

/* =========================================================
   dados de teste para as fotos
   ========================================================= */

// as fontes do projeto com arquivos deste computador (a prévia aparece escrita na própria fonte)
const DOC_FONTS = `(() => {
	window.PAD_MOCK_FONTS = { supported: true, bank: '/Volumes/VFX/BANCO DE FONTES', upload: true, machineUpload: true, projectFonts: '/Volumes/VFX/PROGRAMAS/DOMINGAO/02 ARQUIVOS/FONTS', project: 'DOMINGAO COM HUCK SERVICO.aep', user: 'JMBILLARD', machine: 'MAC',
		fonts: [
			{ name: 'Inter-Bold', family: 'Inter', style: 'Bold', location: '/usr/share/fonts/opentype/inter/Inter-Bold.otf', missing: false, layers: 4, state: 'ok' },
			{ name: 'JetBrainsMono-Medium', family: 'JetBrains Mono', style: 'Medium', location: '/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Medium.ttf', missing: false, layers: 2, state: 'up' },
			{ name: 'GothamBook', family: 'Gotham', style: 'Book', location: '', missing: true, layers: 2, state: 'install', bankFile: '/Volumes/VFX/BANCO DE FONTES/GothamBook.otf' },
			{ name: 'GloboTipoCondensada-Black', family: 'GloboTipo Condensada', style: 'Black', location: '', missing: true, layers: 1, state: 'nofile' }
		] };
})();`;

// O FORNINHO: as prévias dos templates (imagens de exemplo, no lugar dos '_preview.png' da rede; um template fica
// sem prévia, com o ícone) e dois fixados e um recente
const DOC_PREVIEWS = `(() => {
	try {
		sessionStorage.setItem('mock.templateLists', JSON.stringify({ 'DIA-A-DIA': { favorites: ['/mock/TARJAS/TARJA SIMPLES.aep', '/mock/RODAPES/RODAPE PLACAR.aep'], recents: ['/mock/TEMPLATES PADEIRO/LETTERING SOLTO.aep'], renderPresets: {} } }));
	} catch (e) { }

	const PALS = [['#ff7a59', '#c2185b'], ['#00c6ff', '#0072ff'], ['#f7b733', '#fc4a1a'], ['#43e97b', '#1fa2a8'], ['#a18cd1', '#5f2c82'], ['#f953c6', '#b91d73']];
	const hash = (t) => { let x = 0; for (let i = 0; i < t.length; i++) x = (x * 31 + t.charCodeAt(i)) | 0; return Math.abs(x); };
	const thumb = (name) => {
		const p = PALS[hash(name) % PALS.length];
		const k = hash(name + 'k') % 3;
		const t = name.replace(/&/g, '&amp;');
		const shape = k === 0 ? '<rect x="40" y="250" width="440" height="64" rx="10" fill="#fff" opacity=".94"/><text x="62" y="292" font-family="Arial" font-weight="800" font-size="30" fill="#1b1f2e">' + t + '</text><rect x="40" y="314" width="300" height="24" rx="6" fill="' + p[1] + '"/>'
			: k === 1 ? '<rect x="0" y="282" width="640" height="78" fill="#0d1020" opacity=".86"/><rect x="0" y="282" width="12" height="78" fill="' + p[0] + '"/><text x="34" y="331" font-family="Arial" font-weight="800" font-size="30" fill="#fff">' + t + '</text>'
			: '<circle cx="320" cy="150" r="70" fill="#fff" opacity=".22"/><text x="320" y="200" text-anchor="middle" font-family="Arial" font-weight="900" font-size="44" fill="#fff">' + t + '</text>';

		return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + p[0] + '"/><stop offset="1" stop-color="' + p[1] + '"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="560" cy="60" r="140" fill="#fff" opacity=".12"/>' + shape + '</svg>');
	};

	addEventListener('DOMContentLoaded', () => {
		const orig = PAD_UTIL.fileUrl;

		PAD_UTIL.fileUrl = (path) => {
			const m = /([^\/]+)_preview\.png$/.exec(path);

			return m && !/JOGO/.test(m[1]) ? thumb(m[1]) : orig(path);
		};
	});
})();`;

const CATEGORIES = { categories: [
	{ name: 'PROGRAMA', path: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/{atracao}', output: '/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/PROGRAMAS/{atracao}', icon: 'tv' },
	{ name: 'NOVELA', path: '/Volumes/VFX/imagem/drive_l/Fileserver_3/NOVELAS/{atracao}', output: '', icon: 'mascaras' },
	{ name: 'FUTEBOL', path: '/Volumes/VFX/imagem/drive_l/Fileserver_3/ESPORTES/FUTEBOL/{ano}/{atracao}', output: '', icon: 'bola' }
] };

/* =========================================================
   telas (com os destaques)
   ========================================================= */

async function selectTemplate(p) {
	await p.locator('.tree-row:visible', { hasText: 'LETTERING SOLTO' }).first().click();
	await p.waitForTimeout(900);
}

const SHOTS = {
	barra: { w: 1100, h: 110, url: 'bar.html?mock=localfiles', marks: [
		{ sel: '#net-status' }, { sel: '#links', pad: 3 }, { sel: '#tools', pad: 2 }, { sel: '#btn-coletar .bar-dot', pad: 6, round: true, at: 'right' }, { sel: '#logo' }
	] },
	'barra-vertical': { w: 170, h: 640, url: 'bar.html' },
	'forninho-lista': { w: 560, h: 800, url: 'index.html', init: DOC_PREVIEWS, async run(p) {
		await p.locator('.tree-row', { hasText: 'RECENTES' }).first().click(); // recolhe os recentes: cabem os fixados e a pasta aberta
		await p.waitForTimeout(400);
		await p.locator('.tree-folder > .tree-row', { hasText: 'TARJAS' }).first().click();
		await p.waitForTimeout(500);
		await p.locator('.tree-item[data-section=""]', { hasText: 'TARJA DUPLA' }).first().hover();
		await p.waitForTimeout(400); // a miniatura cresce (320 ms), antes da dica (450 ms)
	}, keepMouse: true, marks: [
		{ sel: '#search' }, { sel: '.tree-item:not([data-section=""])', pad: 2 }, { sel: '.tree-item[data-section=""]:hover .tree-thumb', pad: 2 }, { sel: '#btn-refresh', round: true }, { sel: '#btn-open-templates', round: true }, { sel: '.picker-prod .dropdown-trigger, .picker-prod' }, { sel: '#app-menu summary', round: true }
	] },
	'forninho-preencher': { w: 1080, h: 860, url: 'index.html', init: DOC_PREVIEWS, run: selectTemplate, marks: [
		{ sel: '.tree-item.is-selected .tree-row' }, { sel: '#preview-card' }, { sel: '#input' }, { sel: '#tip' }, { sel: '#btn-import', round: true }, { sel: '#btn-output', round: true }, { sel: '#btn-fill' }
	] },
	forma: { w: 1180, h: 780, url: 'maker.html', marks: [
		{ sel: '#checklist' }, { sel: '#atr-picker' }, { sel: '#f-example' }, { sel: '#name-preview' }, { sel: '#preview-card' }, { sel: '#fonts' }, { sel: '#layers' }, { sel: '#fx-card' }, { sel: '#btn-test' }, { sel: '#btn-save' }
	] },
	'claquete-atracao': { w: 480, h: 520, url: 'project.html', async run(p) {
		await p.fill('#claq', 'domingao');
		await p.waitForTimeout(1200);
	}, marks: [{ sel: '#claq-combo .combo-field' }, { sel: '#atr-list .combo-item', text: 'HUCK', pad: 2 }, { sel: '#atr-list .combo-item', text: 'nova atração', pad: 2 }, { sel: '#atr-list .combo-item', text: 'outra pasta', pad: 2 }, { sel: '#claq-next' }] },
	'claquete-editor': { w: 480, h: 520, url: 'project.html?mock=created', marks: [
		{ sel: '#ed-combo .combo-field' }, { sel: '.ed-user' }, { sel: '#ed-what' }, { sel: '#ed-file', pad: 3 }, { sel: '#ed-move', round: true }, { sel: '#ed-output-pick', round: true }, { sel: '#ed-save' }
	] },
	tipografo: { w: 480, h: 760, url: 'fonts.html', init: DOC_FONTS, async run(p) {
		await p.waitForTimeout(300);
		await p.evaluate(() => { const l = document.getElementById('fw-list'); if (l) l.scrollTop = 0; window.scrollTo(0, 0); });
		await p.waitForTimeout(300);
	}, marks: [{ sel: '#fw-file', pad: 3 }, { sel: '.fw-row:nth-child(1) .fw-sample' }, { sel: '.fw-row:nth-child(1) .fw-state', round: true }, { sel: '.fw-row:nth-child(2) .fw-state', round: true }, { sel: '.fw-row:nth-child(3) .fw-state', round: true }, { sel: '.fw-row:nth-child(4) .fw-swap' }, { sel: '#fw-collect', round: true }, { sel: '#fw-go' }] },
	catador: { w: 540, h: 640, url: 'collect.html', marks: [
		{ sel: '#fw-file', pad: 3 }, { sel: '.cw-row:nth-child(1) .fw-state', round: true }, { sel: '.cw-row:nth-child(2) .fw-state', round: true }, { sel: '.cw-row:nth-child(4) .fw-state', round: true }, { sel: '.cw-row:nth-child(6) .fw-state', round: true }, { sel: '#cw-other', round: true }, { sel: '#cw-relink', round: true }, { sel: '#cw-go' }
	] },
	versionador: { w: 560, h: 540, url: 'versioner.html', async run(p) {
		await p.locator('.vs-row').nth(1).locator('.fw-head').click();
		await p.waitForTimeout(400);
	}, marks: [{ sel: '#vs-file', pad: 3 }, { sel: '#vs-list' }, { sel: '.cfg-path' }, { sel: '.vs-switch' }, { sel: '#vs-go' }] },
	'acessorista-caminhos': { w: 720, h: 620, url: 'finder.html', async run(p) {
		await p.fill('#q-paths', 'reporter');
		await p.waitForTimeout(1600);
	}, marks: [{ sel: '#tabs' }, { sel: '#q-paths' }, { sel: '#opts-paths' }, { sel: '#results-paths > *:first-child' }] },
	adaptador: { w: 560, h: 182, url: 'converter.html', async run(p) {
		await p.fill('#cv-mac', '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/DOMINGAO COM HUCK/2026');
		await p.locator('#cv-mac').dispatchEvent('input');
		await p.waitForTimeout(800);
	}, marks: [{ sel: '#cv-mac' }, { sel: '#cv-win' }, { sel: '#cv-copy-win', round: true }] },
	produtor: { w: 1100, h: 720, url: 'productions.html', marks: [
		{ sel: '.tab[data-tab="links"]' }, { sel: '.tab[data-tab="prods"]' }, { sel: '.tab[data-tab="network"]' }, { sel: '.tab[data-tab="machine"]' }, { sel: '#btn-reload', round: true }, { sel: '#btn-save', round: true }, { sel: '#scope-note', pad: 0 }
	] }
};

/* =========================================================
   gifs (a janela em uso)
   ========================================================= */

const SCENES = {
	// a barra: o mouse passa pelas ferramentas (cada ícone anima, a dica conta os dois cliques)
	barra: { w: 1000, h: 110, url: 'bar.html', async run(p) {
		mouse = [990, 100];
		for (const id of ['templates', 'fontes', 'projeto', 'coletar', 'renomear', 'organizar', 'importar', 'pastas', 'buscar']) await hover(p, '#btn-' + id, 520);
		await hover(p, '#logo', 700);
	} },

	// a primeira vez: sem a configuração, o tour (a configuração, a sigla e a turma)
	tour: { w: 1000, h: 116, url: 'bar.html?mock=nosetup', async before(p) {
		await p.evaluate(() => { PAD_BRIDGE.pickFile = () => '/Volumes/VFX/imagem/O PADEIRO/O_PADEIRO_GLOBAL_config.json'; });
	}, async run(p) {
		mouse = [980, 100];
		await p.waitForTimeout(1300);
		await tap(p, '[data-go="config"]', { wait: 1100 });
		await tap(p, '[data-go="find"]', { wait: 1700 });
		await tap(p, '[data-go="user"]', { wait: 900 });
		await p.keyboard.press('Control+A');
		await type(p, 'JMB', 140);
		await p.waitForTimeout(400);
		await tap(p, '[data-go="save-user"]', { wait: 1100 });
		await tap(p, '[data-go="tool"]', { wait: 1000 });
		await tap(p, '.is-spot', { wait: 700 });
		await tap(p, '.is-spot', { right: true, wait: 900 });
		for (let i = 0; i < 3; i++) await tap(p, '[data-go="next"]', { wait: 900, ms: 300 });
		await tap(p, '.is-spot', { right: true, wait: 1100 });
	} },

	// O CATADOR trabalhando na barra: conta arquivo por arquivo e fica verde
	progresso: { w: 760, h: 110, url: 'bar.html', fps: 20, async run(p) {
		mouse = [740, 100];
		await p.waitForTimeout(600);
		await tap(p, '#btn-coletar', { wait: 6800 });
	} },

	// O FORNINHO: os fixados em cartões, a miniatura que cresce na lista, a busca, o template escolhido e o preenchimento
	forninho: { w: 1000, h: 700, url: 'index.html', init: DOC_PREVIEWS, async run(p) {
		mouse = [960, 660];
		await p.waitForTimeout(600);
		await hover(p, '.tree-item:not([data-section=""]) .tree-row', 700);
		await tap(p, p.locator('.tree-folder > .tree-row', { hasText: 'TARJAS' }).first(), { wait: 600 });
		await hover(p, p.locator('.tree-item[data-section=""]', { hasText: 'TARJA SIMPLES' }).first(), 800);
		await hover(p, p.locator('.tree-item[data-section=""]', { hasText: 'TARJA DUPLA' }).first(), 800);
		await tap(p, '#search', { wait: 200 });
		await type(p, 'letter', 110);
		await p.waitForTimeout(700);
		await tap(p, p.locator('.tree-item[data-section=""]', { hasText: 'LETTERING SOLTO' }).first().locator('.tree-row'), { wait: 1200 });
		await tap(p, '#input', { wait: 200 });
		await p.keyboard.press('Control+A');
		await type(p, 'ANA MARIA BRAGA\nAPRESENTADORA', 55);
		await p.waitForTimeout(600);
		await hover(p, '#btn-fill', 1200);
	} },

	// A CLAQUETE: a atração pela busca, o que é e o nome do .aep
	claquete: { w: 480, h: 560, url: 'project.html', async run(p) {
		mouse = [450, 520];
		await p.waitForTimeout(500);
		await tap(p, '#claq', { wait: 200 });
		await type(p, 'domingao', 120);
		await p.waitForTimeout(900);
		await tap(p, p.locator('#atr-list .combo-item', { hasText: 'HUCK' }).first(), { wait: 900 });
		await tap(p, '#claq-next', { wait: 1000 });
		await tap(p, '#arq-what', { wait: 200 });
		await type(p, 'servico', 120);
		await p.waitForTimeout(1300);
		await hover(p, '#criar-go', 900);
	} },

	// O TIPÓGRAFO: troca a fonte que falta pela busca, com a prévia
	tipografo: { w: 480, h: 600, url: 'fonts.html', init: DOC_FONTS, async run(p) {
		mouse = [450, 560];
		await p.waitForTimeout(900);
		await hover(p, p.locator('.fw-row').nth(2).locator('.fw-head'), 700); // a que falta sem arquivo já abre com a troca
		const field = p.locator('.fw-row').nth(3).locator('.fw-swap input').first();

		if (await field.count()) {
			await tap(p, field, { wait: 200 });
			await p.keyboard.press('Control+A');
			await type(p, 'inter', 140);
			await p.waitForTimeout(900);
			const item = p.locator('.fw-row').nth(3).locator('.combo-item', { hasText: 'Inter' }).first();

			if (await item.count()) await tap(p, item, { wait: 900 });
		}

		await hover(p, '#fw-go', 1000);
	} },

	// O CATADOR (janela): resolve os faltando e coleta (as setas sobem)
	catador: { w: 540, h: 640, url: 'collect.html', async run(p) {
		mouse = [500, 600];
		await p.waitForTimeout(900);
		await hover(p, '.cw-row:nth-child(1) .fw-head', 500);
		await tap(p, '#cw-relink', { wait: 2600 });
		await tap(p, '#cw-go', { wait: 2200 });
	} },

	// O ACESSORISTA: busca de caminhos
	acessorista: { w: 720, h: 560, url: 'finder.html', async run(p) {
		mouse = [520, 520];
		await p.waitForTimeout(700);
		await tap(p, '#q-paths', { wait: 200 });
		await type(p, 'reporter', 120);
		await p.waitForTimeout(1800);
		await hover(p, '#results-paths > *:first-child', 1200);
		await tap(p, '#tab-texts', { wait: 1400 });
	} },

	// O ADAPTADOR: cola o caminho do Mac e sai o do Windows (a altura do conteúdo, como a janela)
	adaptador: { w: 560, h: 182, url: 'converter.html', async run(p) {
		mouse = [520, 160];
		await p.waitForTimeout(500);
		await tap(p, '#cv-mac', { wait: 200 });
		await p.keyboard.press('Control+A');
		await type(p, '/Volumes/VFX/imagem/drive_l/PROGRAMAS', 45);
		await p.waitForTimeout(900);
		await tap(p, '#cv-copy-win', { wait: 1200 });
	} },

	// O PRODUTOR: as abas (cada ícone anima ao passar)
	produtor: { w: 1000, h: 640, url: 'productions.html', async run(p) {
		mouse = [600, 600];
		await p.waitForTimeout(700);
		for (const tab of ['fonts', 'project', 'collect', 'tools', 'appearance', 'machine']) await tap(p, '.tab[data-tab="' + tab + '"]', { wait: 900, ms: 380 });
	} }
};

/* =========================================================
   ícones das ferramentas (no degradê da barra)
   ========================================================= */

const ICONS = ['templates', 'fonts', 'project', 'collect', 'import', 'rename', 'organize', 'folders', 'search'];

async function icons(b) {
	const dir = path.join(OUT, 'icons');

	fs.mkdirSync(dir, { recursive: true });

	const ctx = await b.newContext({ viewport: { width: 400, height: 200 }, deviceScaleFactor: 2 });
	const p = await ctx.newPage();

	await p.goto(CLIENT + 'bar.html');
	await p.waitForTimeout(1200);

	for (const name of ICONS) {
		await p.evaluate((n) => {
			document.body.innerHTML = '';
			document.body.style.cssText = 'margin:0;padding:6px;background:transparent;display:block;min-height:0';

			const tile = document.createElement('div');

			tile.id = 'tile';
			tile.style.cssText = 'width:44px;height:44px;border-radius:13px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,#67b7ff 0%,#5184f8 45%,#5649e9 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 4px 10px rgba(56,47,151,.25)';
			tile.appendChild(PAD_ICONS.svg(n, '-doc'));
			tile.firstChild.setAttribute('style', 'width:24px;height:24px;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round');
			document.body.appendChild(tile);
		}, name);
		await p.locator('#tile').screenshot({ path: path.join(dir, name + '.png'), omitBackground: true });
		console.log('· ícone', name);
	}

	await ctx.close();
}

/* =========================================================
   rodar
   ========================================================= */

function webp(png, out) {
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-c:v', 'libwebp', '-quality', '90', '-compression_level', '6', out]);
}

function probe(file) {
	return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim()) || 0;
}

async function shots(b, names) {
	for (const name of names) {
		const s = SHOTS[name];
		const ctx = await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });

		await ctx.addInitScript((c) => {
			try {
				localStorage.clear();
				localStorage.setItem('pad.mock.project', JSON.stringify(c));
			} catch (e) { }
		}, CATEGORIES);
		if (s.init) await ctx.addInitScript(s.init);

		const p = await ctx.newPage();
		const errs = [];

		p.on('pageerror', (e) => errs.push(e.message));
		await p.goto(CLIENT + s.url);
		await p.waitForTimeout(1600);
		if (s.run) await s.run(p);
		if (!s.keepMouse) await p.mouse.move(1, 1);
		else await p.addStyleTag({ content: '.pad-tooltip { display: none !important; }' }); // o mouse fica (hover), a dica não
		await p.waitForTimeout(500);
		if (s.marks) await p.evaluate(markInPage, s.marks);
		await p.waitForTimeout(150);

		const png = path.join(TMP, name + '.png');

		await p.screenshot({ path: png });
		webp(png, path.join(OUT, name + '.webp'));
		await ctx.close();
		console.log('· tela', name, errs.length ? '← ' + errs.join(' | ') : '');
	}
}

async function gifs(b, names) {
	const dir = path.join(OUT, 'anim');

	fs.mkdirSync(dir, { recursive: true });

	for (const name of names) {
		const s = SCENES[name];
		const ctx = await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1, recordVideo: { dir: TMP, size: { width: s.w, height: s.h } } });

		await ctx.addInitScript(CURSOR);
		await ctx.addInitScript((c) => {
			try {
				localStorage.clear();
				localStorage.setItem('pad.mock.project', JSON.stringify(c));
			} catch (e) { }
		}, CATEGORIES);
		if (s.init) await ctx.addInitScript(s.init);

		const p = await ctx.newPage();
		const errs = [];

		p.on('pageerror', (e) => errs.push(e.message));
		await p.goto(CLIENT + s.url);
		await p.waitForTimeout(1400);
		if (s.before) await s.before(p);
		mouse = [s.w - 20, s.h - 20];
		await p.mouse.move(mouse[0], mouse[1]);

		const t0 = Date.now();

		await s.run(p);
		await p.waitForTimeout(500);

		const dur = (Date.now() - t0) / 1000;
		const video = await p.video().path();

		await ctx.close();

		// só a parte da cena (sem o carregamento), em webp animado: o degradê das janelas num gif vira um
		// arquivo enorme (e serrilhado); o webp fica nítido e leve, e roda em loop como um gif
		const anim = path.join(dir, name + '.webp');
		const start = Math.max(0, probe(video) - dur);

		execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(start), '-i', video, '-vf', 'fps=' + (s.fps || 16), '-c:v', 'libwebp', '-lossless', '0', '-quality', String(s.quality || 60), '-compression_level', '6', '-loop', '0', '-an', anim]);
		console.log('· anim', name.padEnd(12), (fs.statSync(anim).size / 1024).toFixed(0) + ' KB', dur.toFixed(1) + 's', errs.length ? '← ' + errs.join(' | ') : '');
	}
}

(async () => {
	const args = process.argv.slice(2);
	const kind = ['telas', 'gifs', 'icones'].indexOf(args[0]) >= 0 ? args.shift() : '';
	const b = await chromium.launch();

	try {
		if (!kind || kind === 'icones') await icons(b);
		if (!kind || kind === 'telas') await shots(b, args.length && kind ? args : Object.keys(SHOTS));
		if (!kind || kind === 'gifs') await gifs(b, args.length && kind ? args : Object.keys(SCENES));
	} finally {
		await b.close();
		fs.rmSync(TMP, { recursive: true, force: true });
	}
})();
