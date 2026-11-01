/*

---------------------------------------------------------------
> O PADEIRO — barra principal
---------------------------------------------------------------

Clique esquerdo e direito fazem ações diferentes, e a dica de cada botão lista as duas.
Ações sem tela própria rodam no host; as outras abrem o painel correspondente.

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var TEMPLATES_PANEL_ID = 'com.jmbillard.opadeiro.panel';
	var FINDER_PANEL_ID = 'com.jmbillard.opadeiro.finder';
	var CONVERTER_PANEL_ID = 'com.jmbillard.opadeiro.converter';
	var MAKER_PANEL_ID = 'com.jmbillard.opadeiro.maker';
	var CONFIG_PANEL_ID = 'com.jmbillard.opadeiro.productions';
	var PROJECT_PANEL_ID = 'com.jmbillard.opadeiro.project';
	var DOUBLE_CLICK_MS = 260; // 2 cliques numa ferramenta: abre a configuração na aba dela
	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/README.md';

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
		// projeto: a claquete bate
		project:
			'<g class="anim-clap"><rect x="3.5" y="10" width="17" height="9.5" rx="1.5" />' +
			'<g class="clap-top"><path d="M4.6 6h14.8a1.1 1.1 0 0 1 1.1 1.1V10h-17V7.1A1.1 1.1 0 0 1 4.6 6z" /><path d="m8.6 6-2 4M13.6 6l-2 4M18.6 6l-2 4" /></g></g>',
		// coletar: pasta cheia de arquivos; no hover os arquivos sobem
		collect:
			// duas folhas grandes, sobrepostas, que entram na pasta: a frente da pasta esconde a parte de baixo
			// delas e a folha da frente esconde a de trás (máscaras com a mesma animação). o fundo da pasta só
			// aparece fora das folhas (a aba, à esquerda)
			'<g class="anim-collect"><defs>' +
			'<mask id="collect-back" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">' +
			'<rect x="-4" y="-4" width="32" height="32" fill="#fff" stroke="none" />' +
			'<path class="collect-file f2" d="M10 15V6.5a1 1 0 0 1 1-1h4.8l2.7 2.7V15z" fill="#000" stroke="#000" stroke-width="3.4" stroke-linejoin="round" />' +
			'<rect x="-4" y="10.7" width="32" height="17" fill="#000" stroke="none" /></mask>' +
			'<mask id="collect-front" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">' +
			'<rect x="-4" y="-4" width="32" height="14.7" fill="#fff" stroke="none" /></mask></defs>' +
			'<path d="M3.5 18V7.6A1.5 1.5 0 0 1 5 6.1h.4" /><path d="M19.6 9.7a1.5 1.5 0 0 1 .9 1.4v.4" />' +
			'<g mask="url(#collect-back)"><g class="collect-file f1"><path d="M6 15V4a1 1 0 0 1 1-1h4.6l2.7 2.7V15" /><path d="M11.6 3v2.7h2.7" /></g></g>' +
			'<g mask="url(#collect-front)"><g class="collect-file f2"><path d="M10 15V6.5a1 1 0 0 1 1-1h4.8l2.7 2.7V15" /><path d="M15.8 5.5v2.7h2.7" /></g></g>' +
			'<path class="folder-front" d="M3.5 11.5h17V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></g>',
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

	function toast(kind, text, ms) {
		PAD_UTIL.toast($('toast'), 'bar-toast', kind, text, ms);
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

		// coletar os arquivos do projeto na pasta dele (árvore da configuração > coletar)
		collect: async function (path) {
			var res = await call('collectProject', { path: path || '' });
			var d = res.data || {};
			var parts = [];

			if (d.files) parts.push(d.files + (d.files === 1 ? ' arquivo' : ' arquivos'));
			if (d.sequences) parts.push(d.sequences + (d.sequences === 1 ? ' sequência' : ' sequências') + ' (' + d.frames + ' quadros)');
			if (d.fonts) parts.push('fontes');

			report(res, parts.length ? 'coletado: ' + parts.join(', ') + (d.saved ? '. projeto salvo.' : '.') : 'nada novo para coletar' + (d.saved ? ' (projeto salvo).' : '.'));
		},

		collectTo: async function () {
			var path = PAD_BRIDGE.pickFolder('Pasta para coletar os arquivos do projeto');

			if (path) await actions.collect(path);
		},

		// janela do projeto: ID, nome, retranca e salvar
		project: function () {
			PAD_BRIDGE.openPanel(PROJECT_PANEL_ID);
		},

		// salvar direto na pasta da retranca (com o coletar da configuração)
		saveProject: async function () {
			var info = await call('projectInfo');

			if (!info.id && !info.name) {
				PAD_BRIDGE.openPanel(PROJECT_PANEL_ID);
				throw new Error('#PAD_090 - preencha o ID ou o nome do projeto (janela PROJETO).');
			}

			var path = '';

			if (!info.target) {
				path = PAD_BRIDGE.pickFolder('Pasta para salvar o projeto');

				if (!path) return;
			}

			var res;

			try {
				res = await call('projectSave', { path: path, open: true });
			} catch (err) {
				if (!/#PAD_092/.test(err.message)) throw err;

				PAD_BRIDGE.openPanel(PROJECT_PANEL_ID);
				throw new Error('#PAD_092 - já existe um projeto com esse nome na pasta: para substituir, salve pela janela PROJETO.');
			}

			toast('success', 'projeto salvo: ' + (res && res.file ? res.file : info.fileName));
		},

		// conversor de caminhos Windows / macOS: painel próprio, já com a pasta da última saída da fila de render
		convertPaths: async function () {
			await call('requestConverter');
			PAD_BRIDGE.openPanel(CONVERTER_PANEL_ID);
		},

		// a configuração, já na aba da ferramenta (2 cliques)
		config: async function (tab) {
			await call('requestConfigTab', { tab: tab });
			PAD_BRIDGE.openPanel(CONFIG_PANEL_ID);
		}
	};

	/* =========================================================
	   Estrutura da barra
	   ========================================================= */

	// As ferramentas da barra; a ordem e os grupos vêm da configuração (aba FERRAMENTAS).
	var TOOLS = [
		{
			key: 'templates',
			config: 'prods',
			label: 'Templates',
			icon: 'templates',
			tips: [L_CLICK + 'preencher templates', R_CLICK + 'criar novo template'],
			left: actions.templates,
			right: actions.createTemplate
		},
		{
			key: 'fontes',
			config: 'prods',
			label: 'Fontes',
			icon: 'fonts',
			tips: [L_CLICK + 'instalar as fontes usadas no template', R_CLICK + 'fazer o collect das fontes usadas no projeto'],
			left: actions.installFonts,
			right: actions.collectFonts
		},
		{
			key: 'projeto',
			config: 'project',
			label: 'Projeto',
			icon: 'project',
			tips: [L_CLICK + 'abrir o PROJETO: ID, nome, retranca e salvar', R_CLICK + 'salvar o projeto na pasta da retranca'],
			left: actions.project,
			right: actions.saveProject
		},
		{
			key: 'coletar',
			config: 'collect',
			label: 'Coletar',
			icon: 'collect',
			tips: [L_CLICK + 'coletar os arquivos do projeto na pasta dele', R_CLICK + 'coletar em outra pasta…'],
			left: function () {
				return actions.collect('');
			},
			right: actions.collectTo
		},
		{
			key: 'pastas',
			config: 'drives',
			label: 'Pastas',
			icon: 'folders',
			tips: [L_CLICK + 'abrir a pasta do último item da fila de render', R_CLICK + 'abrir o conversor de caminhos Windows/MacOs'],
			left: actions.openLastOutput,
			right: actions.convertPaths
		},
		{
			key: 'renomear',
			config: 'rename',
			label: 'Renomear',
			icon: 'rename',
			tips: [L_CLICK + 'renomear comps selecionadas', R_CLICK + 'renomear TODAS as saídas de render'],
			left: actions.renameComps,
			right: actions.renameOutputs
		},
		{
			key: 'organizar',
			config: 'organize',
			label: 'Organizar',
			icon: 'organize',
			tips: ['selecione as comps que serão\nRENDERIZADAS primeiro!', L_CLICK + 'organizar o projeto', R_CLICK + 'criar estrutura de pastas do projeto'],
			left: actions.organizeProject,
			right: actions.createProjectFolders
		},
		{
			key: 'buscar',
			config: 'search',
			label: 'Buscar',
			icon: 'search',
			tips: [L_CLICK + 'abrir O ACESSORISTA: busca de caminhos de atrações', R_CLICK + 'abrir a BUSCA em layers de texto'],
			left: actions.searchPaths,
			right: actions.searchTexts
		}
	];

	var DEFAULT_ITEMS = ['templates', 'fontes', 'divider', 'projeto', 'coletar', 'pastas', 'divider', 'renomear', 'organizar', 'divider', 'buscar'];

	function toolDef(key) {
		return TOOLS.filter(function (t) {
			return t.key === key;
		})[0] || null;
	}

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

	// 'config': aba da configuração aberta com 2 cliques. Com ela, o clique simples espera um instante
	// (para saber se vem o segundo) antes de rodar.
	function bind(btn, left, right, config) {
		var timer = null;

		btn.addEventListener('click', function () {
			if (!config) return run(btn, left);

			if (timer) {
				clearTimeout(timer);
				timer = null;
				run(btn, function () {
					return actions.config(config);
				});
				return;
			}

			timer = setTimeout(function () {
				timer = null;
				run(btn, left);
			}, DOUBLE_CLICK_MS);
		});

		// clique direito = segunda ação (sem o menu de contexto do navegador)
		btn.addEventListener('contextmenu', function (e) {
			e.preventDefault();
			run(btn, right);
		});

		// no teclado: Shift+Enter faz a segunda ação
		btn.addEventListener('keydown', function (e) {
			if (e.key !== 'Enter' || !e.shiftKey) return;

			e.preventDefault();
			run(btn, right);
		});
	}

	// Lupa: no hover, uma letra (sorteada) entra da esquerda no vidro enquanto a lupa vai para o lado e
	// para cima e volta, e tudo para; ao sair, a mesma animação roda ao contrário, como nos outros ícones.
	var LENS_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#&';
	var LENS_MS = 480;

	function bindLensLetters(btn) {
		var lens = btn.querySelector('.anim-search');
		var letter = btn.querySelector('.lens-letter');

		if (!lens.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		var timing = { duration: LENS_MS, easing: 'ease-in-out', fill: 'both' };
		var anims = [
			lens.animate(
				[
					{ transform: 'translate(0, 0) rotate(0)' },
					{ transform: 'translate(-2.5px, -2.5px) rotate(-6deg)', offset: 0.45 },
					{ transform: 'translate(0, 0) rotate(0)' }
				],
				timing
			),
			letter.animate(
				[
					{ opacity: 0, transform: 'translateX(-14px)' },
					{ opacity: 1, offset: 0.4 },
					{ opacity: 1, transform: 'translateX(0)' }
				],
				timing
			)
		];

		anims.forEach(function (anim) {
			anim.pause();
		});

		function play(rate) {
			var t = anims[0].currentTime || 0;

			anims.forEach(function (anim) {
				// play() reinicia a animação se ela já estiver na ponta para onde vai: aí só para
				if ((rate > 0 && t >= LENS_MS) || (rate < 0 && t <= 0)) return anim.pause();

				anim.playbackRate = rate;
				anim.play();
			});
		}

		btn.addEventListener('mouseenter', function () {
			// letra nova só quando ela está fora do vidro (não troca no meio da volta)
			if (anims[1].currentTime <= 0) letter.textContent = LENS_LETTERS.charAt(Math.floor(Math.random() * LENS_LETTERS.length));

			play(1);
		});

		btn.addEventListener('mouseleave', function () {
			play(-1);
		});
	}

	var toolsLayout = ''; // a ordem e as escondidas desenhadas agora (só redesenha quando mudam)

	// Monta a barra na ordem da configuração: 'divider' separa os grupos; as escondidas ficam de fora e
	// um grupo sem nenhuma ferramenta não aparece (nem a divisória dele).
	function buildTools(items, hidden) {
		var key = items.join() + '|' + hidden.join();

		if (key === toolsLayout) return;

		toolsLayout = key;

		var tools = $('tools');
		var groups = [[]];

		tools.textContent = '';

		items.forEach(function (item) {
			if (item === 'divider') groups.push([]);
			else if (hidden.indexOf(item) < 0 && toolDef(item)) groups[groups.length - 1].push(toolDef(item));
		});

		groups.filter(function (g) {
			return g.length;
		}).forEach(function (section, i) {
			if (i > 0) tools.appendChild(el('span', 'bar-divider'));

			var group = el('div', 'bar-section');

			section.forEach(function (def) {
				var btn = el('button', 'bar-btn');

				btn.type = 'button';
				btn.id = 'btn-' + def.key;
				btn.dataset.icon = def.icon;
				btn.title = def.tips.concat(['2 cliques  →  configuração']).join('\n');
				btn.setAttribute('aria-label', def.label);
				btn.appendChild(svgIcon(def.icon));
				btn.appendChild(el('span', 'bar-label', def.label));
				bind(btn, def.left, def.right, def.config);
				if (def.icon === 'search') bindLensLetters(btn);

				group.appendChild(btn);
			});

			tools.appendChild(group);
		});
	}

	/* =========================================================
	   Links (configuração > links): ícone do site (favicon) ou um
	   ícone próprio; clique abre o endereço, 2 cliques editam
	   ========================================================= */

	var linksStamp = -1;

	function faviconUrl(url) {
		var m = /^(https?:\/\/[^\/?#]+)/i.exec(url);

		return m ? m[1] + '/favicon.ico' : '';
	}

	// selo dos links pessoais: um bonequinho (cabeça e busto) num círculo branco; a base do busto é cortada
	// pela curva do círculo, com um filete branco até a borda
	var PERSON_BADGE = '<svg viewBox="0 0 11 11" aria-hidden="true"><circle class="badge-bg" cx="5.5" cy="5.5" r="5.5" /><circle cx="5.5" cy="4" r="1.5" /><path d="M2.9 9.17C3.2 7.3 4.3 6.6 5.5 6.6S7.8 7.3 8.1 9.17A4.5 4.5 0 0 1 2.9 9.17z" /></svg>';

	// os da equipe e, logo depois, os pessoais (com o selo)
	function renderLinks(team, personal) {
		var box = $('links');
		var links = team.concat(personal.map(function (l) {
			return Object.assign({ personal: true }, l);
		}));

		box.textContent = '';

		links.forEach(function (link) {
			var btn = el('button', 'bar-icon bar-link' + (link.personal ? ' is-personal' : ''));
			var img = el('img');
			var custom = PAD_UTIL.decodeIcon(link.icon);

			btn.type = 'button';
			btn.title = link.name + (link.personal ? ' (meu link, só neste computador)' : '') + '\n' + L_CLICK + 'abrir ' + link.url.replace(/^https?:\/\//, '').slice(0, 60) + '\n2 cliques  →  editar os links';
			btn.setAttribute('aria-label', link.name);
			img.alt = '';
			img.src = custom || faviconUrl(link.url);

			// sem favicon (site sem o arquivo, rede fora): o ícone de link
			img.addEventListener('error', function () {
				img.replaceWith(svgIcon('link'));
			});

			btn.appendChild(img);

			if (link.personal) {
				var badge = el('span', 'bar-link-badge');

				badge.innerHTML = PERSON_BADGE;
				btn.appendChild(badge);
			}
			bind(btn, async function () {
				await requireNetwork('PAD_007');
				PAD_BRIDGE.openUrl(link.url);
			}, null, 'links');
			box.appendChild(btn);
		});

		box.hidden = !links.length;
		$('links-divider').hidden = !links.length;
	}

	// os links também podem ser escondidos (configuração > ferramentas)
	function applyLinksHidden(hidden) {
		if (hidden.indexOf('links') < 0) return;

		$('links').hidden = true;
		$('links-divider').hidden = true;
	}

	async function loadLinks() {
		if (document.hidden) return;

		try {
			var res = await call('barLinks');

			if (res.stamp === linksStamp) return;

			linksStamp = res.stamp;
			renderLinks(res.links, res.personal || []);
			buildTools(res.items && res.items.length ? res.items : DEFAULT_ITEMS, res.hidden || []);
			applyLinksHidden(res.hidden || []);
		} catch (err) { }
	}

	/* =========================================================
	   Início
	   ========================================================= */

	// logo escolhida na configuração (aparência) no lugar do pãozinho
	function applyLogo(theme) {
		var logo = $('logo');
		var loaf = logo.querySelector('.bar-loaf');
		var img = logo.querySelector('.bar-logo-img');
		var src = theme && theme.logo ? PAD_UTIL.decodeIcon(theme.logo) : null;

		if (!src) {
			if (img) img.remove();
			loaf.style.display = '';
			return;
		}

		if (!img) {
			img = el('img', 'bar-logo-img');
			img.alt = '';
			logo.insertBefore(img, loaf);
		}

		img.src = src;
		loaf.style.display = 'none';
	}

	async function init() {

		document.addEventListener('pad-theme', function (e) {
			applyLogo(e.detail);
		});
		if (window.PAD_THEME) applyLogo(PAD_THEME.current());

		// ← → andam pela barra (logo, link e ferramentas)
		PAD_KEYS.listNav({
			root: $('bar'),
			items: '.bar-logo, .bar-icon, .bar-btn',
			horizontal: true
		});

		// a barra é montada na ordem da configuração; sem ela (rede fora), na ordem padrão
		loadLinks().then(function () {
			if (!toolsLayout) buildTools(DEFAULT_ITEMS, []);
		});
		setInterval(loadLinks, 4000); // a lista é da equipe: acompanha quem editar
		window.addEventListener('focus', loadLinks);

		$('logo').addEventListener('click', function () {
			PAD_BRIDGE.openUrl(DOCS_URL);
		});

		try {
			var info = await call('ping');

			$('version').textContent = 'v' + info.version;

			if (!info.network) {
				toast('error', '#PAD_012 - sem acesso a rede... habilite "Allow Scripts to Write Files and Access Network" em Edit > Preferences > Scripting & Expressions.', 9000);
			}
		} catch (err) {
			toast('error', err.message);
			window.addEventListener('focus', function () {
				location.reload();
			});

			return;
		}
	}

	init();
})();
