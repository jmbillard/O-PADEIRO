/*

---------------------------------------------------------------
> O PADEIRO — barra principal
---------------------------------------------------------------

Mesmos botões e ações do script ScriptUI ('main ui functions.js' e 'O_PADEIRO.js'):
clique esquerdo e direito fazem ações diferentes, e a dica de cada botão lista as duas.
Ações sem tela própria rodam no host; as que dependem de uma tela ainda não portada
aparecem como "em breve".

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var TEMPLATES_PANEL_ID = 'com.jmbillard.opadeiro.panel';
	var FINDER_PANEL_ID = 'com.jmbillard.opadeiro.finder';
	var CONVERTER_PANEL_ID = 'com.jmbillard.opadeiro.converter';
	var PRODUCTIONS_PANEL_ID = 'com.jmbillard.opadeiro.productions';
	var MAKER_PANEL_ID = 'com.jmbillard.opadeiro.maker';
	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/README.md#-o-padeiro-script';
	var APONTAMENTO_URL = 'https://tvglobocorp.sharepoint.com/:x:/s/Planejamento-DTEN/Planejamento/EbkuFueT_DlFlUyRqlMSnJIBRpRsPPY72NSDqgKq0DvOKg?e=T7sn7i';

	var L_CLICK = '◖  →  ';
	var R_CLICK = '◗  →  ';

	/* =========================================================
	   Utilidades
	   ========================================================= */

	function $(id) {
		return document.getElementById(id);
	}

	function el(tag, className, text) {
		var node = document.createElement(tag);

		if (className) node.className = className;
		if (text != null) node.textContent = text;

		return node;
	}

	// Ícones com partes animadas no hover (CSS em bar.css); os demais vêm do sprite.
	var INLINE_ICONS = {
		folders:
			'<g class="anim-folder"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h6.5A1.5 1.5 0 0 1 19 10v1.5" />' +
			'<path class="folder-front" d="M3.5 11.5h17V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></g>',
		organize:
			'<g class="anim-layers"><path class="layer-top" d="m12 3-8.5 4.25L12 11.5l8.5-4.25z" />' +
			'<path class="layer-mid" d="m3.5 12 8.5 4.25L20.5 12" />' +
			'<path class="layer-bottom" d="m3.5 16.5 8.5 4.25 8.5-4.25" /></g>',
		rename:
			'<g class="anim-type"><rect x="2.5" y="6.5" width="19" height="11" rx="3" />' +
			'<path class="type-char" d="M6 12h2.4" /><path class="type-char" d="M10.3 12h2.4" /><path class="type-char" d="M14.6 12h2.4" />' +
			'<path class="type-caret" d="M18.6 9.6v4.8" /></g>',
		search:
			// o vidro da lupa recorta as letras num círculo um pouco menor que o aro: sobra um contorno
			// redondo "negativo" mesmo quando a letra ocupa o espaço todo
			'<g class="anim-search"><defs><clipPath id="lens-clip"><circle cx="10" cy="10" r="5.2" /></clipPath></defs>' +
			'<circle cx="10" cy="10" r="7.2" /><path d="m15.300 15.300 5.200 5.200" />' +
			'<g clip-path="url(#lens-clip)"><text class="lens-letter" x="10" y="18.300" text-anchor="middle">A</text></g></g>',
		fonts: '<g class="anim-font"><path class="font-t" d="M5.5 7.5V5.5h13v2M12 5.5v13M9 18.5h6" /></g>'
	};

	function svgIcon(name) {
		var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

		svg.setAttribute('viewBox', '0 0 24 24');

		if (INLINE_ICONS[name]) {
			svg.innerHTML = INLINE_ICONS[name];
		} else {
			var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');

			use.setAttribute('href', '#i-' + name);
			svg.appendChild(use);
		}

		return svg;
	}

	var toastTimer = null;

	function toast(kind, text, ms) {
		var box = $('toast');

		clearTimeout(toastTimer);
		box.className = 'bar-toast' + (kind ? ' is-' + kind : '');
		box.textContent = text;
		box.hidden = false;
		toastTimer = setTimeout(function () {
			box.hidden = true;
		}, ms || (kind === 'error' ? 7000 : 4200));
	}

	/* =========================================================
	   Ações
	   ========================================================= */

	// Resultado das ações do host: { messages, data }. Mensagens das libs viram o aviso.
	function report(res, doneText) {
		var messages = res && res.messages ? res.messages : [];

		if (messages.length) toast(/^#PAD/.test(messages[0]) ? 'error' : 'success', messages.join('\n'));
		else if (doneText) toast('success', doneText);
	}

	function soon(label) {
		return function () {
			toast(null, label + ': ainda não disponível na extensão (em breve).');
		};
	}

	async function requireNetwork(code) {
		var info = await call('ping');

		if (!info.network) {
			throw new Error('#' + code + ' - sem acesso a rede... habilite "Allow Scripts to Write Files and Access Network" em Edit > Preferences > Scripting & Expressions.');
		}
	}

	var actions = {
		templates: async function () {
			await requireNetwork('PAD_003');
			PAD_BRIDGE.openPanel(TEMPLATES_PANEL_ID);
		},

		installFonts: async function () {
			await requireNetwork('PAD_004');
			report(await call('installFonts'), 'fontes enviadas para instalação.');
		},

		collectFonts: async function () {
			var path = PAD_BRIDGE.pickFolder('Pasta para o collect das fontes');

			if (!path) return;

			var res = await call('collectFonts', { path: path });

			report(res, res.data && res.data.path ? 'fontes coletadas em ' + res.data.path : 'nenhuma fonte pôde ser coletada.');
		},

		openLastOutput: async function () {
			await requireNetwork('PAD_007');
			await call('openLastOutput');
		},

		renameComps: async function () {
			report(await call('renameComps'), 'comps renomeadas.');
		},

		renameOutputs: async function () {
			report(await call('renameOutputs'), 'saídas de render renomeadas.');
		},

		organizeProject: async function () {
			report(await call('organizeProject'), 'projeto organizado.');
		},

		createProjectFolders: async function () {
			report(await call('createProjectFolders'), 'estrutura de pastas criada.');
		},

		// criador de templates: precisa da comp principal aberta (a comp ativa)
		createTemplate: async function () {
			await call('makerReady');
			PAD_BRIDGE.openPanel(MAKER_PANEL_ID);
		},

		// O ACESSORISTA, a busca de caminhos (esquerdo, aba principal), e a busca em layers de texto (direito):
		// um painel só, que abre na aba pedida
		searchTexts: async function () {
			await call('requestTab', { tab: 'texts' });
			PAD_BRIDGE.openPanel(FINDER_PANEL_ID);
		},

		searchPaths: async function () {
			await requireNetwork('PAD_PATH_003');
			await call('requestTab', { tab: 'paths' });
			PAD_BRIDGE.openPanel(FINDER_PANEL_ID);
		},

		// conversor de caminhos Windows / macOS: painel próprio, já com a pasta da última saída da fila de render
		convertPaths: async function () {
			await call('requestConverter');
			PAD_BRIDGE.openPanel(CONVERTER_PANEL_ID);
		},

		links: async function () {
			await requireNetwork('PAD_007');
			PAD_BRIDGE.openUrl(APONTAMENTO_URL);
		}
	};

	/* =========================================================
	   Estrutura da barra (espelha PAD_mainGrpUiStructure)
	   ========================================================= */

	var SECTIONS = [
		[
			{
				key: 'templates',
				label: 'Templates',
				icon: 'templates',
				tips: [L_CLICK + 'preencher templates', R_CLICK + 'criar novo template'],
				left: actions.templates,
				right: actions.createTemplate
			},
			{
				key: 'fontes',
				label: 'Fontes',
				icon: 'fonts',
				tips: [L_CLICK + 'instalar as fontes usadas no template', R_CLICK + 'fazer o collect das fontes usadas no projeto'],
				left: actions.installFonts,
				right: actions.collectFonts
			}
		],
		[
			{
				key: 'pastas',
				label: 'Pastas',
				icon: 'folders',
				tips: [L_CLICK + 'abrir a pasta do último item da fila de render', R_CLICK + 'abrir o conversor de caminhos Windows/MacOs'],
				left: actions.openLastOutput,
				right: actions.convertPaths
			}
		],
		[
			{
				key: 'renomear',
				label: 'Renomear',
				icon: 'rename',
				tips: [L_CLICK + 'renomear comps selecionadas', R_CLICK + 'renomear TODAS as saídas de render'],
				left: actions.renameComps,
				right: actions.renameOutputs
			},
			{
				key: 'organizar',
				label: 'Organizar',
				icon: 'organize',
				tips: ['selecione as comps que serão\nRENDERIZADAS primeiro!', L_CLICK + 'organizar o projeto', R_CLICK + 'criar estrutura de pastas do projeto'],
				left: actions.organizeProject,
				right: actions.createProjectFolders
			}
		],
		[
			{
				key: 'buscar',
				label: 'Buscar',
				icon: 'search',
				tips: [L_CLICK + 'abrir O ACESSORISTA: busca de caminhos de atrações', R_CLICK + 'abrir a BUSCA em layers de texto'],
				left: actions.searchPaths,
				right: actions.searchTexts
			}
		]
	];

	// Executa a ação do botão com feedback de "ocupado" e erro no aviso.
	async function run(btn, handler) {
		if (!handler || btn.classList.contains('is-busy')) return;

		btn.classList.add('is-busy');

		try {
			await handler();
		} catch (err) {
			toast('error', err.message);
		} finally {
			btn.classList.remove('is-busy');
		}
	}

	function bind(btn, left, right) {
		btn.addEventListener('click', function () {
			run(btn, left);
		});

		// clique direito = segunda ação (sem o menu de contexto do navegador)
		btn.addEventListener('contextmenu', function (e) {
			e.preventDefault();
			run(btn, right);
		});
	}

	// Lupa: a cada hover, letras aleatórias passam pelo vidro (uma nova a cada passada).
	var LENS_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#&';

	function bindLensLetters(btn) {
		var letter = btn.querySelector('.lens-letter');
		var timer = null;

		function pass() {
			letter.textContent = LENS_LETTERS.charAt(Math.floor(Math.random() * LENS_LETTERS.length));
			letter.classList.remove('is-passing');
			void letter.getBoundingClientRect(); // reinicia a animação
			letter.classList.add('is-passing');
		}

		btn.addEventListener('mouseenter', function () {
			pass();
			timer = setInterval(pass, 620);
		});

		btn.addEventListener('mouseleave', function () {
			clearInterval(timer);
		});
	}

	function buildTools() {
		var tools = $('tools');

		SECTIONS.forEach(function (section, i) {
			if (i > 0) tools.appendChild(el('span', 'bar-divider'));

			var group = el('div', 'bar-section');

			section.forEach(function (def) {
				var btn = el('button', 'bar-btn' + (def.soon ? ' is-soon' : ''));

				btn.type = 'button';
				btn.id = 'btn-' + def.key;
				btn.dataset.icon = def.icon;
				btn.title = def.tips.join('\n');
				btn.setAttribute('aria-label', def.label);
				btn.appendChild(svgIcon(def.icon));
				btn.appendChild(el('span', 'bar-label', def.label));
				bind(btn, def.left, def.right);
				if (def.icon === 'search') bindLensLetters(btn);

				group.appendChild(btn);
			});

			tools.appendChild(group);
		});

		var links = $('btn-links');

		links.title = L_CLICK + 'abrir apontamento de projetos';
		bind(links, actions.links, null);
	}

	/* =========================================================
	   Produção
	   ========================================================= */

	var state = { productions: [], stamp: 0 };

	function updateProdIcon(name) {
		var prod = state.productions.filter(function (p) {
			return p.name === name;
		})[0];
		var icon = $('prod-icon');
		var url = prod ? PAD_UTIL.decodeIcon(prod.icon) : null;

		icon.hidden = !url;
		icon.title = prod ? prod.name + '\n\ndois cliques: editar a lista de produções' : 'dois cliques: editar a lista de produções';
		if (url) icon.src = url;
	}

	async function loadProductions() {
		var select = $('production');
		var chosen = null;

		try {
			var list = await call('productions', {});

			state.productions = list.productions;
			state.stamp = list.stamp;
			chosen = (await call('selectedProduction')).name;
		} catch (err) {
			toast('error', err.message);
		}

		select.textContent = '';

		state.productions.forEach(function (prod) {
			var option = el('option', null, prod.name);

			option.value = prod.name;
			select.appendChild(option);
		});

		if (!state.productions.length) {
			select.appendChild(el('option', null, 'sem produções'));
			select.disabled = true;
		} else {
			select.disabled = false;
			select.value = state.productions.some(function (p) { return p.name === chosen; }) ? chosen : state.productions[0].name;
		}

		PAD_DROPDOWN.refresh(select);
		updateProdIcon(select.value);
	}

	// Acompanha mudanças feitas por fora (por exemplo, pelo script ScriptUI).
	async function watchProduction() {
		if (document.hidden || !state.productions.length) return;

		try {
			var selected = await call('selectedProduction');
			var name = selected.name;
			var select = $('production');

			// a lista foi editada (editor, script ou outra pessoa): lê de novo
			if (selected.stamp && selected.stamp !== state.stamp) return loadProductions();

			if (name && name !== select.value && state.productions.some(function (p) { return p.name === name; })) {
				select.value = name;
				PAD_DROPDOWN.refresh(select);
				updateProdIcon(name);
			}
		} catch (err) { }
	}

	/* =========================================================
	   Início
	   ========================================================= */

	async function init() {
		buildTools();

		PAD_DROPDOWN.enhance($('production'));

		$('production').addEventListener('change', async function () {
			updateProdIcon(this.value);

			try {
				await call('setProduction', { name: this.value });
			} catch (err) {
				toast('error', err.message);
			}
		});

		$('logo').addEventListener('click', function () {
			PAD_BRIDGE.openUrl(DOCS_URL);
		});

		$('prod-icon').addEventListener('dblclick', function () {
			PAD_BRIDGE.openPanel(PRODUCTIONS_PANEL_ID);
		});

		try {
			var info = await call('ping');

			$('version').textContent = 'v' + info.version;

			if (!info.network) {
				toast('error', '#PAD_012 - sem acesso a rede... habilite "Allow Scripts to Write Files and Access Network" em Edit > Preferences > Scripting & Expressions.', 9000);
			}
		} catch (err) {
			toast('error', 'sem conexão com o After Effects: ' + err.message);
			window.addEventListener('focus', function () {
				location.reload();
			});

			return;
		}

		await loadProductions();

		setInterval(watchProduction, 3000);
		window.addEventListener('focus', watchProduction);
	}

	init();
})();
