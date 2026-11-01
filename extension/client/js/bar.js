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
	// os desenhos ficam em js/icons.js (os mesmos da configuração)

	function svgIcon(name) {
		return PAD_ICONS.svg(name, ''); // a barra tem uma cópia de cada: os ids das máscaras ficam sem sufixo
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
		fitLabels();
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
			btn.title = link.name + (link.personal ? ' (meu link, só neste computador)' : '') + '\n' + L_CLICK + 'abrir ' + link.url.replace(/^https?:\/\//, '').slice(0, 60) + '\n2 cliques  →  editar ' + (link.personal ? 'os meus links' : 'os links');
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
			}, null, link.personal ? 'mylinks' : 'links');
			box.appendChild(btn);
		});

		placeLinksBreak();
		box.hidden = !links.length;
		$('links-divider').hidden = !links.length;
	}

	// na vertical os links vão em linhas centralizadas de 3 (só ícones: um embaixo do outro) e a incompleta fica em cima:
	// uma quebra antes do item que abre a primeira linha cheia (CSS: #links .links-break, só na vertical)
	function placeLinksBreak() {
		var box = $('links');
		var old = box.querySelector('.links-break');

		if (old) old.remove();

		var cols = document.body.classList.contains('is-icons') ? 1 : 3;
		var rest = box.children.length % cols;

		if (rest && box.children[rest]) box.insertBefore(el('i', 'links-break'), box.children[rest]); // sem linha cheia: nada
	}

	// 100% vertical: se algum nome não cabe, a barra mostra só os ícones (o nome fica na dica)
	var LIST_MEDIA = window.matchMedia('(max-aspect-ratio: 1/1) and (max-width: 159px)');

	function fitLabels() {
		var body = document.body;
		var was = body.classList.contains('is-icons');
		var cut = false;

		if (LIST_MEDIA.matches) {
			body.classList.remove('is-icons');
			cut = Array.prototype.some.call(document.querySelectorAll('#tools .bar-label'), function (label) {
				return label.scrollWidth > label.clientWidth + 1;
			});
		}
		body.classList.toggle('is-icons', cut);
		if (cut !== was) placeLinksBreak();
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
		window.addEventListener('resize', fitLabels);
		if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLabels);
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
