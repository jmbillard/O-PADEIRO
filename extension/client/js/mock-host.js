/*

---------------------------------------------------------------
> host de mentira (só para desenvolver o painel no navegador)
---------------------------------------------------------------

Só entra em ação fora do After Effects (sem window.__adobe_cep__). Abra
client/index.html no navegador para ajustar o visual e o fluxo sem o AE.
Use '?mock=slow' para respostas mais lentas e '?mock=fail' para simular erros.

*/

(function () {
	'use strict';

	if (window.__adobe_cep__) return;

	var mode = (location.search.match(/mock=(\w+)/) || [])[1] || '';

	// índice local de mentira (o de verdade lê as pastas pelo Node): guardado no localStorage
	{
		window.PAD_LOCAL_INDEX = {
			available: function () { return true; },
			building: function () { return false; },
			load: function () {
				var d = JSON.parse(localStorage.getItem('pad.mock.lidx') || 'null');

				return d ? { generated: d.generated, count: d.items.length, roots: d.roots, items: d.items } : null;
			},
			info: function () {
				var d = JSON.parse(localStorage.getItem('pad.mock.lidx') || 'null');

				return d ? { exists: true, generated: d.generated, count: d.items.length, bytes: d.items.length * 38 } : { exists: false };
			},
			build: function (file, folders, opts) {
				var names = ['JORNALISMO', 'GLOBO REPORTER', 'G REPORTER', 'REPORTER RECORD', 'REPORTER ESPECIAL', 'NOVELAS', 'A NOBREZA DO AMOR', 'SHOWS', 'FESTIVAL DE INVERNO', 'FILMES', 'TITULOS', '_N_', 'NAO NAO OLHE', 'PROGRAMAS', 'MAIS VOCE', '2026', '01 PROJETOS', 'LETTERINGS'];
				var items = [];

				folders.forEach(function (root) {
					items.push({ name: root.split('/').pop(), path: root, depth: 0, file: false });
					names.forEach(function (n, i) {
						var parent = i % 3 === 0 ? root : root + '/' + names[Math.max(0, i - 1)];

						items.push({ name: n, path: parent + '/' + n, depth: parent === root ? 1 : 2, file: false });
					});
				});

				return new Promise(function (resolve) {
					var n = 0;
					var t = setInterval(function () {
						n += 6;
						if (opts && opts.onProgress) opts.onProgress(Math.min(n, items.length), '');
						if (n < items.length) return;
						clearInterval(t);
						localStorage.setItem('pad.mock.lidx', JSON.stringify({ generated: new Date().toISOString(), roots: folders, items: items }));
						resolve({ count: items.length });
					}, 120);
				});
			}
		};
	}
	var delay = mode === 'slow' ? 900 : 260;

	function wait(ms) {
		return new Promise(function (resolve) {
			setTimeout(resolve, ms);
		});
	}

	function previewSvg() {
		var svg =
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
			'<stop offset="0" stop-color="#67b7ff"/><stop offset="1" stop-color="#5649e9"/></linearGradient></defs>' +
			'<rect width="640" height="360" fill="url(#g)"/><rect x="60" y="230" width="520" height="70" rx="12" fill="#fff" opacity=".92"/>' +
			'<text x="90" y="276" font-family="Arial" font-weight="700" font-size="34" fill="#202636">NOME DO PROGRAMA</text></svg>';

		return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
	}

	// a data de criação: dois templates novos (dos últimos 15 dias), o resto antigo
	var DAY = 86400000;
	var NEW = { 'TARJA JOGO': 2, 'CARTAO ENTREVISTADO': 6 };
	var tpl = function (name, folder, extra) {
		return Object.assign({ type: 'item', text: name + '.aep', uri: '/mock/' + folder + '/' + name + '.aep', fsName: '/mock/' + folder + '/' + name + '.aep', created: Date.now() - (NEW[name] || 90) * DAY }, extra || {});
	};

	var tree = {
		type: 'node',
		text: 'TEMPLATES PADEIRO',
		children: [
			{ type: 'node', text: 'TARJAS', children: [tpl('TARJA SIMPLES', 'TARJAS'), tpl('TARJA DUPLA', 'TARJAS'), tpl('TARJA JOGO', 'TARJAS')] },
			{ type: 'node', text: 'RODAPES / ESPORTES', children: [tpl('RODAPE PLACAR', 'RODAPES'), tpl('RODAPE ESCALACAO', 'RODAPES')] },
			{ type: 'node', text: 'CARTOES', children: [tpl('CARTAO DE VISITA', 'CARTOES'), tpl('CARTAO ENTREVISTADO', 'CARTOES')] },
			tpl('LETTERING SOLTO', 'TEMPLATES PADEIRO'),
			tpl('ASSINATURA JORNAL', 'TEMPLATES PADEIRO')
		]
	};

	(function tag(node, prefix) {
		node.__id = prefix;

		node.children.forEach(function (child, i) {
			if (child.type === 'node') tag(child, prefix + '/' + i);
		});
	})(tree, 'node:');

	var configs = {
		'TARJA SIMPLES': {
			configName: 'TARJA SIMPLES',
			exemple: 'JOÃO BOSCO\nREPÓRTER\n\nMARIA SOUZA\nEDITORA',
			tip: 'digite o nome e o cargo em 2 linhas.\nuse 1 linha vazia para criar mais de 1 versão do mesmo template.',
			outputPath: ['//servidor/EDIT_IN_PLACE/PROMO/OUTPUT/TARJAS']
		},
		'TARJA DUPLA': { configName: 'TARJA DUPLA', exemple: 'TÍTULO\nSUBTÍTULO', tip: 'título na 1ª linha, subtítulo na 2ª.', outputPath: ['~/Desktop'] },
		'LETTERING SOLTO': { configName: 'LETTERING', exemple: 'TEXTO', tip: 'digite o texto do lettering.', outputPath: ['~/Desktop'] }
	};

	var run = null;

	// preferências desta pessoa (aparência e barra), por cima do padrão da equipe
	// as categorias da atração nova (aba PROJETO), guardadas no navegador: a janela PROJETO lê as mesmas
	function mockProject() {
		var saved = null;

		try {
			saved = JSON.parse(localStorage.getItem('pad.mock.project') || 'null');
		} catch (err) { }

		return { categories: saved && saved.categories ? saved.categories : [] };
	}

	function mockMachine() {
		return JSON.parse(localStorage.getItem('pad.mock.machine') || 'null') || {};
	}

	function mockPrefs() {
		return JSON.parse(localStorage.getItem('pad.mock.prefs') || 'null') || { appearance: null, bar: null };
	}

	function mockBar() {
		return JSON.parse(localStorage.getItem('pad.mock.bar') || 'null') || { items: ['templates', 'divider', 'fontes', 'projeto', 'coletar', 'divider', 'renomear', 'organizar', 'importar', 'divider', 'pastas', 'buscar'], hidden: [] };
	}

	var api = {
		ping: function () {
			return { app: 'After Effects (mock)', build: '24.0x1', os: 'Mac', version: '2.0 beta7', network: mode !== 'nonet' };
		},

		productions: function (a) {
			if (!window.PAD_MOCK_LIST) {
				window.PAD_MOCK_LIST = {
					stamp: 1000,
					log: { mode: 'webhook', webhook: 'https://workflows.jmbillard.com/webhook/log_db_padeiro' },
					drives: {
						drives: [{ letter: 'L', path: '//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_l' }, { letter: 'T', path: '//egcdesign01.servicos.corp.tvglobo.com.br/cdesign' }, { letter: 'V', path: '//vfx-ml-sp.servicos.corp.tvglobo.com.br/EDIT_IN_PLACE' }],
						shares: [{ share: 'VFX', server: 'vfx-ml-sp.servicos.corp.tvglobo.com.br' }, { share: 'promo_ber', server: '10.193.48.13' }],
						defaultServer: 'vfx-ml-sp.servicos.corp.tvglobo.com.br'
					},
					rename: {
						types: [
							{ prefix: 'RDP', comment: 'RODAPE', terms: ['RODAPE', 'RDP'] },
							{ prefix: 'CRT', comment: 'CARTAO', terms: ['CARTAO', 'CARTOES', 'CRT'] },
							{ prefix: 'LETT', comment: 'LETTERING', terms: ['LETTERING', 'LETT', 'LET'] },
							{ prefix: 'TARJA', comment: 'TARJA', terms: ['TARJA', 'TRJ', 'TAR'] },
							{ prefix: 'ASSINA', comment: 'ASSINATURA', terms: ['ASSINATURA', 'ASSINA', 'ASS'] }
						],
						fixed: [{ match: 'LOGO GLOBO', name: 'LOGO GLOBO' }]
					},
					organize: {
						folders: [
							{ name: '01 COMPS', parent: '', content: 'render' },
							{ name: '02 PRECOMPS', parent: '', content: 'precomps' },
							{ name: '03 ARQUIVOS', parent: '', content: '' },
							{ name: 'VIDEOS', parent: '03 ARQUIVOS', content: 'videos' },
							{ name: 'IMAGENS', parent: '03 ARQUIVOS', contents: ['imagens', 'sequencias'] },
							{ name: 'AUDIO', parent: '03 ARQUIVOS', content: 'audio' },
							{ name: 'SOLIDOS', parent: '03 ARQUIVOS', content: 'solidos' },
							{ name: 'DADOS', parent: '03 ARQUIVOS', content: 'dados' },
							{ name: 'MISSING', parent: '', content: 'missing' }
						],
						renderComments: ['EXPORT', 'LOGO GLOBO', 'TEMPLATE'],
						autoComment: 'EXPORTAR',
						dataExtensions: ['.csv', '.json', '.jsx', '.mgjson', '.tsv', '.txt'],
						commentSubfolders: true
					},
					links: [
						{ name: 'apontamento de projetos', url: 'https://tvglobocorp.sharepoint.com/planilha', icon: '' },
						{ name: 'github', url: 'https://github.com/jmbillard/O-PADEIRO', icon: '' }
					],
					search: {
						url: 'https://workflows.jmbillard.com/webhook/buscar',
						servidor: [
							{ name: '#INGEST', path: '//cpp-ml-sp.servicos.corp.tvglobo.com.br/PROMO_REDE/CPP_JB_PROMO/#INGEST' },
							{ name: 'BASES VALENDO', path: '//cpp-ml-sp.servicos.corp.tvglobo.com.br/PROMO_REDE/CPP_JB_PROMO/HOME OFFICE - NAO APAGAR/BASES E VALENDO' }
						]
					},
					project: mockProject(), // as categorias (aba PROJETO): guardadas no navegador, para a janela PROJETO ler
					collect: {
						folders: [
							{ name: '01_PROJETOS', parent: '', contents: ['projeto'] },
							{ name: '02_ARQUIVOS', parent: '', contents: [] },
							{ name: 'FONTS', parent: '02_ARQUIVOS', contents: ['fontes'] },
							{ name: 'IMAGENS', parent: '02_ARQUIVOS', contents: ['imagens', 'sequencias'] },
							{ name: 'VÍDEOS', parent: '02_ARQUIVOS', contents: ['videos'] },
							{ name: 'AUDIOS', parent: '02_ARQUIVOS', contents: ['audio'] },
							{ name: 'DADOS', parent: '02_ARQUIVOS', contents: ['dados'] },
							{ name: '03_SAIDA', parent: '', contents: [] },
							{ name: 'PREVIEWS', parent: '03_SAIDA', contents: [] },
							{ name: '04_REFS', parent: '', contents: [] }
						]
					},
					items: [
						{ name: 'DIA-A-DIA', templatesPath: '//vfx-ml-hp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_l/Fileserver_3/INSTITUCIONAL/_adm-designers/TEMPLATES/TEMPLATES PADEIRO', icon: 'tv' },
						{ name: 'Ω PASTA LOCAL', templatesPath: '~/Downloads/TEMP_PADEIRO', icon: null },
						{ name: 'Ω TESTES (vazia)', templatesPath: '//servidor/TESTES', icon: 'alvo' }
					]
				};
			}

			// ?mock=local: a lista compartilhada não está acessível (rede fora)
			if (mode === 'local' && !window.PAD_MOCK_NETBACK) {
				return { configPath: '//servidor/padeiro/O_PADEIRO_GLOBAL_config.json', shared: false, stamp: 0, productions: [], error: '#PAD_064 - lista de produções compartilhada não encontrada: //servidor/padeiro/O_PADEIRO_GLOBAL_config.json. verifique a conexão com a rede (o arquivo fica junto do padeiro).' };
			}

			return {
				configPath: '//servidor/padeiro/O_PADEIRO_GLOBAL_config.json',
				shared: true,
				stamp: window.PAD_MOCK_LIST.stamp,
				error: null,
				log: Object.assign({}, window.PAD_MOCK_LIST.log),
				drives: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.drives)),
				rename: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.rename)),
				organize: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.organize)),
				search: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.search)),
				links: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.links)),
				project: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.project)),
				collect: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.collect)),
				fonts: JSON.parse(localStorage.getItem('pad.mock.fonts') || 'null') || { bank: '/Volumes/VFX/imagem/drive_l/Fileserver_3/BANCO DE FONTES', upload: true },
				bar: mockBar(),
				personal: mockPrefs(),
				appearance: JSON.parse(localStorage.getItem('pad.mock.appearance') || 'null') || { mode: 'light', background: 'gradient', accent: '#5184f8', gradientStart: '#67b7ff', gradientEnd: '#5649e9', font: 'inter', logo: '' },
				productions: window.PAD_MOCK_LIST.items.map(function (p) {
					return Object.assign({}, p, { ignored: /^~(\/|$)|^\/(Users|home)\//.test(p.templatesPath || p.path || '') });
				}),
				localProductions: ((JSON.parse(localStorage.getItem('pad.mock.machine') || 'null') || {}).productions || []).slice(),
				localMode: !!(JSON.parse(localStorage.getItem('pad.mock.machine') || 'null') || {}).localMode
			};
		},

		appearance: function () {
			var stored = JSON.parse(localStorage.getItem('pad.mock.appearance') || 'null');
			var mine = mockPrefs().appearance;

			return { stamp: (localStorage.getItem('pad.mock.appearance') || 'padrão') + '|' + localStorage.getItem('pad.mock.prefs'), appearance: mine || stored || { mode: 'light', background: 'gradient', accent: '#5184f8', gradientStart: '#67b7ff', gradientEnd: '#5649e9', font: 'inter', logo: '' } };
		},

		personalPrefs: function () {
			return mockPrefs();
		},

		savePersonalPrefs: function (a) {
			localStorage.setItem('pad.mock.prefs', JSON.stringify({ appearance: a.appearance || null, bar: a.bar || null }));

			return mockPrefs();
		},

		machinePrefs: function () {
			var m = JSON.parse(localStorage.getItem('pad.mock.machine') || 'null') || { user: '', projects: '', outputs: '', localMode: false, productions: [], log: true };

			return Object.assign({ defaultUser: 'JMBILLARD', hasConfigCopy: true, templates: {}, localIndex: '/mock/indice_local.json' }, m);
		},

		saveMachinePrefs: function (a) {
			(a.productions || []).forEach(function (p, i) {
				if (!p.name !== !p.path) throw new Error('#PAD_098 - produção local ' + (i + 1) + ': precisa de um nome e de uma pasta.');
			});
			localStorage.setItem('pad.mock.machine', JSON.stringify({ user: a.user || '', projects: a.projects || '', outputs: a.outputs || '', productions: a.productions || [], log: a.log !== false, localMode: !!a.localMode, fontsUpload: a.fontsUpload !== false, search: a.search || { mode: 'webhook', folders: [], foldersOnly: true, daily: true } }));

			return Object.assign({ defaultUser: 'JMBILLARD', hasConfigCopy: true, localIndex: '/mock/indice_local.json' }, JSON.parse(localStorage.getItem('pad.mock.machine')));
		},

		barLinks: function () {
			var list = window.PAD_MOCK_LIST;

			var personal = JSON.parse(localStorage.getItem('pad.mock.personalLinks') || '[{"name":"meu drive","url":"https://drive.google.com/","icon":""}]');

			var bar = mockPrefs().bar || mockBar(); // as janelas do navegador não dividem o host de mentira: a barra fica no localStorage

			return { items: bar.items, hidden: bar.hidden, stamp: (list ? list.stamp : 1) + '|' + localStorage.getItem('pad.mock.personalLinks') + '|' + JSON.stringify(bar), links: list ? JSON.parse(JSON.stringify(list.links)) : [{ name: 'apontamento de projetos', url: 'https://tvglobocorp.sharepoint.com/planilha', icon: '' }, { name: 'github', url: 'https://github.com/jmbillard/O-PADEIRO', icon: '' }], personal: personal, localMode: !!(mockMachine().localMode || localStorage.getItem('pad.mock.offline')), localForced: !!mockMachine().localMode };
		},

		personalLinks: function () {
			return { links: JSON.parse(localStorage.getItem('pad.mock.personalLinks') || '[{"name":"meu drive","url":"https://drive.google.com/","icon":""}]') };
		},

		savePersonalLinks: function (a) {
			var bad = a.links.filter(function (l) { return !l.name || !/^https?:\/\/\S+$/.test(l.url); })[0];

			if (bad) throw new Error('#PAD_087 - meus links: "' + (bad.name || '?') + '" precisa de nome e de um endereço (http:// ou https://).');
			localStorage.setItem('pad.mock.personalLinks', JSON.stringify(a.links));

			return { links: a.links };
		},

		requestConfigTab: function (a) {
			localStorage.setItem('pad.mock.configTab', JSON.stringify({ tab: a.tab, stamp: Date.now() }));

			return { tab: a.tab };
		},

		requestedConfigTab: function () {
			var req = JSON.parse(localStorage.getItem('pad.mock.configTab') || '{"tab":null,"stamp":0}');

			req.now = Date.now();

			return req;
		},

		searchCategories: async function (a) {
			await wait(a.force ? 900 : 300);

			return {
				downloaded: !!a.force,
				categories: [
					{ key: 'atracoes_teams', auto: 'TEAMS', count: 412 },
					{ key: 'atracoes_trello', auto: 'TRELLO', count: 128 },
					{ key: 'filmes', auto: 'FILMES', count: 57 },
					{ key: 'esportes_ao_vivo', auto: 'ESPORTES AO VIVO', count: 9 },
					{ key: 'servidor', auto: 'SERVIDOR', count: 2 }
				]
			};
		},

		saveProductions: async function (a) {
			await wait(delay);

			if (mode === 'conflict') throw new Error('#PAD_065 - a lista foi alterada por outra pessoa depois que você abriu o editor. use "recarregar" e refaça as alterações.');

			window.PAD_MOCK_LIST.items = a.productions.slice();
			window.PAD_MOCK_LIST.stamp += 1000;
			if (a.log) window.PAD_MOCK_LIST.log = Object.assign({}, a.log);
			if (a.drives) {
				var bad = a.drives.drives.filter(function (d) { return !/^[A-Z]$/.test(d.letter) || !/^\/\/[^/]+\/.+/.test(d.path.replace(/\\/g, '/')); })[0];

				if (bad) throw new Error('#PAD_080 - drives: o caminho de ' + (bad.letter || '?') + ': precisa ser de rede (//servidor/share/...).');
				window.PAD_MOCK_LIST.drives = JSON.parse(JSON.stringify(a.drives));
			}
			if (a.rename) {
				var noTerms = a.rename.types.filter(function (t) { return !t.prefix || !t.comment || !t.terms.length; })[0];

				if (noTerms) throw new Error('#PAD_082 - renomear: "' + (noTerms.prefix || '?') + '" precisa de prefixo, comentário e ao menos um termo.');
				window.PAD_MOCK_LIST.rename = JSON.parse(JSON.stringify(a.rename));
			}
			if (a.organize) window.PAD_MOCK_LIST.organize = JSON.parse(JSON.stringify(a.organize));
			if (a.fonts) localStorage.setItem('pad.mock.fonts', JSON.stringify(a.fonts));
			if (a.appearance) {
				if (!['accent', 'gradientStart', 'gradientEnd'].every(function (k) { return /^#[0-9a-f]{6}$/i.test(a.appearance[k]); })) throw new Error('#PAD_088 - aparência: cor inválida (use #rrggbb).');
				localStorage.setItem('pad.mock.appearance', JSON.stringify(a.appearance));
			}
			if (a.links) {
				var badLink = a.links.filter(function (l) { return !l.name || !/^https?:\/\/\S+$/.test(l.url); })[0];

				if (badLink) throw new Error('#PAD_087 - links: "' + (badLink.name || '?') + '" precisa de nome e de um endereço (http:// ou https://).');
				window.PAD_MOCK_LIST.links = JSON.parse(JSON.stringify(a.links));
			}
			if (a.project) {
				// como o host (padCleanProject)
				var seenCat = {};

				(a.project.categories || []).forEach(function (c, i) {
					var key = String(c.name || '').trim().toUpperCase();
					var badTok = /\{(?!(atracao|ano|mes|mes_extenso|proximo_mes|categoria|letra)\})[^}]*\}/.exec(c.path || '');

					if (!key) throw new Error('#PAD_089 - projeto: preencha o nome da categoria ' + (i + 1) + '.');
					if (seenCat[key]) throw new Error('#PAD_089 - projeto: a categoria ' + key + ' aparece mais de uma vez.');
					if (!String(c.path || '').trim()) throw new Error('#PAD_089 - projeto: a categoria ' + key + ' precisa de um caminho.');
					if (badTok) throw new Error('#PAD_089 - projeto: ' + badTok[0] + ' não é um token do caminho (use {atracao}, {ano}, {mes}, {mes_extenso}, {proximo_mes}, {categoria} ou {letra}).');
					if (String(c.path).indexOf('{atracao}') < 0) throw new Error('#PAD_089 - projeto: o caminho de ' + key + ' precisa do {atracao} (a pasta da atração nova).');
					if (String(c.output || '').trim() && String(c.output).indexOf('{atracao}') < 0) throw new Error('#PAD_089 - projeto: o output de ' + key + ' precisa do {atracao} (a pasta de output da atração nova).');
					if (/\{(?!(atracao|ano|mes|mes_extenso|proximo_mes|categoria|letra)\})[^}]*\}/.test(c.output || '')) throw new Error('#PAD_089 - projeto: token desconhecido no output de ' + key + '.');
					seenCat[key] = true;
				});
				window.PAD_MOCK_LIST.project = { categories: (a.project.categories || []).map(function (c) {
					return { name: String(c.name).trim().toUpperCase(), path: String(c.path).trim().replace(/\\/g, '/').replace(/(.)\/+$/, '$1'), output: String(c.output || '').trim().replace(/\\/g, '/').replace(/(.)\/+$/, '$1'), icon: c.icon || '' };
				}) };
				localStorage.setItem('pad.mock.project', JSON.stringify(window.PAD_MOCK_LIST.project));
			}
			if (a.bar) {
				// como o host: sem separador no começo, no fim ou dois seguidos
				var items = a.bar.items.filter(function (k, i, all) {
					return k !== 'divider' || (i > 0 && all[i - 1] !== 'divider');
				});

				while (items[items.length - 1] === 'divider') items.pop();
				localStorage.setItem('pad.mock.bar', JSON.stringify({ items: items, hidden: a.bar.hidden }));
			}
			if (a.collect) {
				var seenType = {};

				a.collect.folders.forEach(function (f) {
					if (!f.name) throw new Error('#PAD_094 - coletar: toda pasta precisa de um nome.');
					f.contents.forEach(function (t) {
						if (seenType[t]) throw new Error('#PAD_094 - coletar: duas pastas recebem o mesmo tipo.');
						seenType[t] = true;
					});
				});
				window.PAD_MOCK_LIST.collect = JSON.parse(JSON.stringify(a.collect));
			}
			if (a.search) {
				if (a.search.url && !/^https?:\/\/\S+$/.test(a.search.url)) throw new Error('#PAD_086 - busca: endereço do webhook inválido (comece com http:// ou https://, sem espaços nem aspas).');
				a.search.servidor.forEach(function (r, i) {
					if (!r.name !== !r.path) throw new Error('#PAD_086 - busca: o caminho fixo ' + (i + 1) + ' precisa de um nome e de um caminho.');
				});
				window.PAD_MOCK_LIST.search = JSON.parse(JSON.stringify(a.search));
			}

			return { stamp: window.PAD_MOCK_LIST.stamp, productions: window.PAD_MOCK_LIST.items, log: Object.assign({}, window.PAD_MOCK_LIST.log), drives: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.drives)), rename: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.rename)), organize: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.organize)), search: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.search)), links: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.links)), project: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.project)), collect: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.collect)), bar: mockBar(), appearance: JSON.parse(localStorage.getItem('pad.mock.appearance') || 'null'), configPath: '//servidor/padeiro/O_PADEIRO_GLOBAL_config.json' };
		},

		// TARJA DUPLA tem duas fontes faltando (até "instalar")
		templateFonts: async function (a) {
			await wait(120);

			var missing = /DUPLA/.test(a.uri) && !window.PAD_MOCK_FONTS ? ['GlobotipoTexto-BoldItalic.otf', 'GlobotipoTexto-ThinItalic.otf'] : [];

			return { hasFolder: true, total: 3, missing: missing };
		},

		installTemplateFonts: async function (a) {
			await wait(delay * 2);
			window.PAD_MOCK_FONTS = true;

			return { messages: [], data: { hasFolder: true, total: 3, missing: [] } };
		},

		templateLists: function (a) {
			var all = JSON.parse(sessionStorage.getItem('mock.templateLists') || '{}');

			return all[a.production] || { favorites: [], recents: [], renderPresets: {} };
		},

		templateTreeCache: function (a) {
			return { text: sessionStorage.getItem('mock.tree.' + a.production) || '' };
		},

		saveTemplateTreeCache: function (a) {
			sessionStorage.setItem('mock.tree.' + a.production, a.text);

			return { ok: true };
		},

		saveTemplateLists: function (a) {
			var all = JSON.parse(sessionStorage.getItem('mock.templateLists') || '{}');

			all[a.production] = { favorites: a.favorites, recents: a.recents, renderPresets: a.renderPresets || {} };
			sessionStorage.setItem('mock.templateLists', JSON.stringify(all));

			return { ok: true };
		},

		readProductionsFile: function () {
			return { productions: [{ name: 'IMPORTADA 1', icon: '', templatesPath: '//servidor/IMP1' }, { name: 'IMPORTADA 2', icon: '', templatesPath: '//servidor/IMP2' }] };
		},

		writeProductionsFile: function (a) {
			return { path: a.path };
		},

		canonicalPath: function (a) {
			return { path: a.path };
		},

		checkFolders: async function (a) {
			await wait(150);

			return {
				exists: a.paths.map(function (p) {
					return !/TESTES|inexistente/.test(p);
				})
			};
		},

		setProduction: function (a) {
			window.PAD_MOCK_PRODUCTION = a.name;

			return { name: a.name };
		},

		openLastOutput: function () {
			return { messages: [], data: { path: '/mock/output' } };
		},

		projectShape: function () {
			return { folders: [
				{ name: '01_PROJETOS', depth: 0, contents: ['projeto'] },
				{ name: '02_ARQUIVOS', depth: 0, contents: [] },
				{ name: 'AUDIOS', depth: 1, contents: ['audio'] },
				{ name: 'DADOS', depth: 1, contents: ['dados'] },
				{ name: 'FONTS', depth: 1, contents: ['fontes'] },
				{ name: 'IMAGENS', depth: 1, contents: ['imagens', 'sequencias'] },
				{ name: 'VÍDEOS', depth: 1, contents: ['videos'] },
				{ name: '03_SAIDA', depth: 0, contents: [] },
				{ name: 'PREVIEWS', depth: 1, contents: [] },
				{ name: '04_REFS', depth: 0, contents: [] }
			] };
		},

		// voltar e desfazer (fila de render): o projeto como antes de preencher
		fillUndo: async function () {
			await wait(500);

			return { removed: 4 };
		},

		// depois de instalar: o After Effects enxerga as novas e as camadas passam para elas (no teste: nada faltando)
		fontsSync: function () {
			return { supported: true, replaced: 0, missing: [] };
		},

		installFonts: async function () {
			await wait(delay);

			return { messages: ['3 fonte(s) enviadas para instalação.'] };
		},

		collectFonts: async function () {
			await wait(delay);

			return { messages: [], data: { path: '/mock/FONTS' } };
		},

		renameComps: async function () {
			await wait(delay);

			if (mode === 'fail') throw new Error('#PAD_032 - selecione as comps ou pastas que serão renomeadas.');

			return { messages: [] };
		},

		renameOutputs: function () {
			return { messages: ['#PAD_033 - 1 saída(s) não foram renomeadas (já renderizadas ou bloqueadas).'] };
		},

		organizeProject: function () {
			return { messages: [] };
		},

		requestTab: function (a) {
			window.PAD_MOCK_TAB = { tab: a.tab, stamp: Date.now() };

			return { tab: a.tab };
		},

		requestedTab: function () {
			var req = window.PAD_MOCK_TAB || (/tab=texts/.test(location.search) ? { tab: 'texts', stamp: Date.now() } : { tab: null, stamp: 0 });

			return { tab: req.tab, stamp: req.stamp, now: Date.now() };
		},

		// busca nova (v2): ?mock=v1 simula o webhook novo fora do ar; ?mock=lidx, o índice local (buscar)
		searchInfo: function () {
			var machine = JSON.parse(localStorage.getItem('pad.mock.machine') || 'null') || {};
			var ms = machine.search || (/mock=lidx/.test(location.search) ? { mode: 'local', folders: ['/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/C# ABERTA & INTER/ARTE RJ', '/Volumes/VFX/imagem/drive_l/Fileserver_3'], foldersOnly: true, daily: true } : { mode: 'webhook', folders: [], foldersOnly: true, daily: true });

			return {
				mode: ms.mode,
				folders: ms.folders,
				foldersOnly: ms.foldersOnly,
				daily: ms.daily,
				localIndex: '/mock/indice_local.json',
				url: 'https://workflows.jmbillard.com/webhook/buscar',
				cache: '/tmp/busca_v2.json',
				local: false,
				platform: 'Mac',
				servidor: ((window.PAD_MOCK_LIST && window.PAD_MOCK_LIST.search.servidor) || [
					{ name: '#INGEST', path: '//cpp-ml-sp/PROMO_REDE/CPP_JB_PROMO/#INGEST' },
					{ name: 'BASES VALENDO', path: '//cpp-ml-sp/PROMO_REDE/CPP_JB_PROMO/HOME OFFICE - NAO APAGAR/BASES E VALENDO' }
				]).map(function (r) {
					var m = /^\/\/([^\/]+)\/([^\/]+)/.exec(r.path);

					return { name: r.name, path: r.path, server: m ? m[1] : '', share: m ? m[2] : '' };
				}),
				labels: { atracoes_teams: 'TEAMS', atracoes_trello: 'TRELLO', atracoes: 'ATRAÇÕES', filmes: 'FILMES', servidor: 'SERVIDOR' }
			};
		},

		searchDownload: async function () {
			await new Promise(function (r) { setTimeout(r, 300); });

			if (/mock=v1/.test(location.search)) throw new Error('#PAD_058 - não foi possível carregar o índice.');

			var H = 3600000;
			var iso = function (h) { return new Date(Date.now() - h * H).toISOString().replace(/\.\d+Z$/, 'Z'); };
			var srv = '//vfx-ml-sp.servicos.corp.tvglobo.com.br/EDIT_IN_PLACE/PROMO/cdesign_output/C# ABERTA & INTER';

			return {
				downloaded: true,
				text: JSON.stringify({
					v: 2,
					stamp: 'mock01',
					generated: iso(0),
					teams: [
						{ at: iso(1), msg: '1793719190975', chat: '19:71c26c3266a7442394fac2e6fd73e284@thread.v2', from: 'Jean Billard', role: 'DESIGNER III', path: srv + '/ARTE SP/FAVELA POTENCIA/DUPLAS' },
						{ at: iso(2), msg: '1793719049291', chat: '19:48b78d8f31f64d99a1ea36ae91d84840@thread.v2', from: 'Marcelo Nathan', role: 'DESIGNER I', path: srv + '/ARTE RJ/JORNALISMO/GLOBO REPORTER/2026/LETTERINGS/G REPORTER 6 11' },
						{ at: iso(3), msg: '1793718145025', chat: '19:48b78d8f31f64d99a1ea36ae91d84840@thread.v2', from: 'Thiago Fornari', role: 'EDITOR MIDIAS AUDIOVISUAIS III', path: '//cpp-ml-hp.servicos.corp.tvglobo.com.br/EDIT_IN_PLACE/PROMO/edit_output/_C# ABERTA & INTER/PARA_CDESIGN/EDIT_RJ/G REPORTER 6-11 N' },
						{ at: iso(50), msg: '1793670338781', chat: '19:48b78d8f31f64d99a1ea36ae91d84840@thread.v2', from: 'Victor Mendes', role: 'DESIGNER III', path: '/Volumes/EDIT_IN_PLACE-2/PROMO/cdesign_output/C# ABERTA & INTER/ARTE RJ/PROGRAMAS/AUDITORIO/CALDEIRAO/2026/NA ORDEM CERTA' },
						{ at: iso(30), msg: '1793670338780', chat: '19:48b78d8f31f64d99a1ea36ae91d84840@thread.v2', from: 'Victor Mendes', role: 'DESIGNER III', path: '/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/C# ABERTA & INTER/ARTE RJ/SHOWS/POR DENTRO_NEY MATOGROSSO' }
					],
					trello: [
						{ claq: 'G REPORTER 6 11', red: 'Felipe Salgado Souza', ed: 'Manuel Victor', card: '6a234fa81e187570432a5c12' },
						{ claq: 'G REPORTER ESP 13 11', red: 'Renata Alves', ed: 'Bruno Teixeira', card: '693365db28fe6d3ed097f363' },
						{ claq: 'G REPORTER 30 10', red: 'Felipe Salgado Souza', card: '692791339e921ddf5ca3dc4d' },
						{ claq: 'Encontro 8/6', red: 'Juliana Amorim', ed: 'Bruno Regis', card: '6927932650d09a079178dcff' },
						{ claq: 'VERT(G REPORTER/FUT) 4/11', card: '6927932650d09a079178dd00' },
						{ claq: 'G REPORTER(Prologo) 31/10', red: 'Mila Teixeira', card: '6927932650d09a079178dd01' },
						{ claq: 'G REPORTER 29/10', red: 'Mila Teixeira', ed: 'Alan Csouza', card: '6927932650d09a079178dd02' },
						{ claq: 'G REPORTER 3/11 C-C', ed: 'Luiz Dutra', card: '6927932650d09a079178dd03' },
						{ claq: 'G REPORTER(Prologo) 28/10', red: 'Mila Teixeira', card: '6927932650d09a079178dd04' },
						{ claq: 'G REPORTER 27/10', red: 'Mila Teixeira', ed: 'Elisa Varajão', card: '6927932650d09a079178dd05' }
					],
					atracoes: [
						{ name: 'Globo Repórter', cat: 'JORNALISMO', pattern: ['G REPORTER', 'GLOBO REPORTER'], proj: '//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_l/Fileserver_1/JORNALISMO/GLOBO REPORTER/2021-2026/01 PROJETOS', out: srv + '/ARTE RJ/JORNALISMO/GLOBO REPORTER/2026' },
						{ name: 'Festival de Inverno', cat: 'SHOWS', pattern: ['FESTIVAL'], proj: '//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_l/Fileserver_3/SHOWS/FESTIVAL DE INVERNO/2026/01PROJETOS', out: srv + '/ARTE RJ/SHOWS/FESTIVAL DE INVERNO RIO/2026' }
					],
					filmes: [
						{ name: 'ANNA - O PERIGO TEM NOME', year: '2019', out: srv + '/ARTE RJ/FILMES/TITULOS/_A_/ANNA - O PERIGO TEM NOME' },
						{ name: 'KING’S MAN: A ORIGEM', year: '2023', out: srv + '/ARTE RJ/FILMES/TITULOS/_K_/KINGSMAN - A ORIGEM' },
						{ name: 'NÃO! NÃO OLHE!', year: '2022', out: srv + '/ARTE RJ/FILMES/TITULOS/_N_/NAO NAO OLHE' },
						{ name: '90 DECIBÉIS', year: '2025', out: srv + '/ARTE RJ/FILMES/TITULOS/_#_/90 DECIBEIS' },
						{ name: 'O REPÓRTER DA MEIA-NOITE', year: '2023', out: srv + '/ARTE RJ/FILMES/TITULOS/_R_/O REPORTER DA MEIA NOITE' }
					]
				})
			};
		},

		pathsIndex: async function (a) {
			await wait(delay * 2);

			function group(name, extra) {
				var g = Object.assign({ name: name, projetos: [], outputs: [], caminhos: [], server: '', share: '' }, extra);

				g.haystack = [name].concat(g.projetos, g.outputs, g.caminhos).join('|').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9|]/g, '');

				return g;
			}

			return {
				downloaded: true,
				platform: 'Mac',
				index: [
					{
						category: { key: 'atracoes_teams', label: 'TEAMS' },
						groups: [
							group('Domingo com Huck', { projetos: ['/Volumes/VFX/projetos/DOMINGO COM HUCK'], outputs: ['/Volumes/EDIT_IN_PLACE/PROMO/OUTPUT/HUCK'], caminhos: ['/Volumes/VFX/imagem/drive_l/Fileserver_3/INSTITUCIONAL/_adm-designers/PROGRAMAS/DOMINGO COM HUCK/2026/OUTUBRO/Chamadas'] }),
							group('Encontro com Patrícia Poeta', { projetos: ['/Volumes/VFX/projetos/ENCONTRO'], outputs: ['/Volumes/EDIT_IN_PLACE/PROMO/OUTPUT/ENCONTRO'], caminhos: [] }),
							group('Fantástico', { projetos: ['/Volumes/VFX/projetos/FANTASTICO'], outputs: [], caminhos: [] })
						]
					},
					{
						category: { key: 'atracoes_trello', label: 'TRELLO' },
						groups: [group('Fantástico — pauta de domingo', { caminhos: ['/Volumes/VFX/trello/FANTASTICO/PAUTA DE DOMINGO'] })]
					},
					{
						category: { key: 'filmes', label: 'FILMES' },
						groups: [group('O PROTETOR: CAPÍTULO FINAL', { outputs: ['//vfx-ml-sp.servicos.corp.tvglobo.com.br/EDIT_IN_PLACE/PROMO/cdesign_output/C# ABERTA & INTER/ARTE RJ/FILMES/TITULOS/_P_/O PROTETOR 3 - CAPITULO FINAL'] })]
					},
					{
						category: { key: 'servidor', label: 'SERVIDOR' },
						groups: [group('#INGEST', { caminhos: ['/Volumes/PROMO_REDE/CPP_JB_PROMO/#INGEST'], server: 'cpp-ml-sp', share: 'PROMO_REDE' }), group('BASES VALENDO', { caminhos: ['/Volumes/PROMO_REDE/CPP_JB_PROMO/HOME OFFICE - NAO APAGAR/BASES E VALENDO'], server: 'cpp-ml-sp', share: 'PROMO_REDE' })]
					}
				]
			};
		},

		openPath: async function (a) {
			await wait(150);

			return { messages: a.path.indexOf('INGEST') >= 0 ? ['#PAD_PATH_001 - a pasta não foi encontrada ou não está acessível:\n' + a.path] : [] };
		},

		textCompList: function () {
			if (/nocomp/.test(location.search)) return { comps: [] };

			return { comps: [{ id: 1, name: 'RDP - CONVIDADO' }, { id: 2, name: 'TARJA - JOAO BOSCO' }, { id: 3, name: 'LETTERING AMAZÔNIA' }, { id: 4, name: 'FUNDO' }, { id: 5, name: 'ASSINATURA' }] };
		},

		textIndexChunk: async function (a) {
			await wait(delay);

			var all = {
				1: [{ label: '#2  nome', text: 'Cássio Gabus Mendes\nAtor', enabled: true, refTime: 2 }, { label: '#3  info', text: 'AMAZÔNIA: a floresta que respira', enabled: false, refTime: 2 }],
				2: [{ label: '#1  nome', text: 'João Bosco', enabled: true, refTime: 1 }, { label: '#2  cargo', text: 'Repórter', enabled: true, refTime: 1 }],
				3: [{ label: '#1  titulo', text: 'Amazonia Viva', enabled: true, refTime: 3 }],
				4: [],
				5: [{ label: '#1  assina', text: 'Globo Repórter — sexta, 22h30', enabled: true, refTime: 0 }]
			};
			var names = { 1: 'RDP - CONVIDADO', 2: 'TARJA - JOAO BOSCO', 3: 'LETTERING AMAZÔNIA', 4: 'FUNDO', 5: 'ASSINATURA' };
			var entries = [];

			a.ids.forEach(function (id) {
				all[id].forEach(function (e, i) {
					entries.push(Object.assign({ compId: id, compName: names[id], layerIndex: i + 1 }, e));
				});
			});

			return { entries: entries, errors: [] };
		},

		makerReady: function () {
			if (/nocomp/.test(location.search)) throw new Error('#PAD_031 - abra a comp principal do template antes de criar um novo template.');

			return { ok: true };
		},

		makerState: function () {
			if (/nocomp/.test(location.search) && !window.PAD_MOCK_COMP) return { hasComp: false };

			return { hasComp: true, compId: 7, compName: 'TARJA TEMPLATE', time: 2, frameRate: 29.97, selected: [{ id: 101, index: 1, name: 'nome', isText: true, text: 'Cássio Gabus\rMendes' }, { id: 102, index: 2, name: 'cargo', isText: true, text: 'Ator' }] };
		},

		makerCapture: async function () {
			await wait(delay);
			window.PAD_MOCK_COMP = true;

			return { compId: 7, compName: 'TARJA TEMPLATE', time: 2, frameRate: 29.97, preview: previewSvg(), selected: [{ id: 101, index: 1, name: 'nome', isText: true, text: 'Cássio Gabus\rMendes' }, { id: 102, index: 2, name: 'cargo', isText: true, text: 'Ator' }, { id: 103, index: 3, name: 'fundo', isText: false, text: '' }] };
		},

		makerFonts: async function () {
			await wait(delay);

			return {
				fonts: [
					{ name: 'Georgia-Bold', family: 'Georgia', style: 'Bold', location: window.PAD_MOCK_FONT_FILE || '/Library/Fonts/Georgia Bold.ttf', source: 'local' },
					{ name: 'Gotham-Book', family: 'Gotham', style: 'Book', location: '', source: 'adobe' },
					{ name: 'GloboSans-Condensed', family: 'Globo Sans', style: 'Condensed', location: '', source: 'missing' }
				]
			};
		},

		makerSelection: function () {
			return { hasComp: true, selected: [{ id: 101, index: 1, name: 'nome', isText: true, text: 'Cássio Gabus\rMendes' }, { id: 103, index: 3, name: 'fundo', isText: false, text: '' }] };
		},

		// banco de fontes: as fontes do projeto (o estado vem pronto: no navegador não há Node para conferir)
		fontsProject: function () {
			return window.PAD_MOCK_FONTS || {
				supported: true, bank: '/Volumes/VFX/BANCO DE FONTES', upload: true, machineUpload: true, projectFonts: '/Volumes/VFX/PROGRAMAS/DOMINGAO/02 ARQUIVOS/FONTS', project: 'DOMINGAO COM HUCK SERVICO.aep', user: 'JMBILLARD', machine: 'MAC',
				fonts: [
					{ name: 'GloboSans-Bold', family: 'Globo Sans', style: 'Bold', location: '/Library/Fonts/GloboSans-Bold.otf', missing: false, layers: 4, state: 'ok' },
					{ name: 'GothamBook', family: 'Gotham', style: 'Book', location: '', missing: true, layers: 2, state: 'install', bankFile: '/Volumes/VFX/BANCO DE FONTES/GothamBook.otf' },
					{ name: 'GloboTipoCondensada-Black', family: 'GloboTipo Condensada', style: 'Black', location: '', missing: true, layers: 1, state: 'nofile' }
				]
			};
		},

		fontsInstalled: function () {
			if (window.PAD_MOCK_INSTALLED) return window.PAD_MOCK_INSTALLED;

			var fonts = [['Globo Sans', ['Regular', 'Bold', 'Black']], ['GloboTipo Condensada', ['Regular', 'Bold', 'Heavy']], ['GloboTipo Texto', ['Regular', 'Bold', 'Black']], ['Inter', ['Regular', 'Medium', 'Bold']], ['Montserrat', ['Regular', 'Black']], ['Georgia', ['Regular', 'Bold']]];
			var out = [];

			fonts.forEach(function (f) {
				f[1].forEach(function (st) {
					out.push({ name: f[0].replace(/\s+/g, '') + '-' + st, family: f[0], style: st });
				});
			});

			return { count: out.length, fonts: out };
		},

		// ?mock=localfiles: o projeto com arquivos neste computador (a bolinha do coletar fica laranja)
		collectStatus: function () {
			return mode === 'localfiles' ? { state: 'out', total: 12, local: 2, names: ['logo.png', 'trilha.wav'] } : { state: 'ok', total: 12, local: 0, names: [] };
		},

		fontsInstallProject: function () {
			return { installed: 0, already: 0, errors: [], none: true };
		},

		fontsInstall: function (a) {
			return { installed: a.files.length, already: 0, errors: [] };
		},

		fontsReplace: function (a) {
			return { done: a.swaps, failed: [] };
		},

		// ?mock=nofx: nada selecionado no Effect Controls; ?mock=fxcount: o total de opções não pôde ser lido;
		// ?mock=fxcheck: um Checkbox Control (desligado e ligado)
		makerPickEffect: function () {
			if (mode === 'nofx') throw new Error('#PAD_097 - selecione no Effect Controls da comp principal o efeito do layout (Dropdown Menu Control ou Checkbox Control).');
			if (mode === 'fxcheck') return { layerId: 104, layerIndex: 4, layerName: 'CTRL', fxName: 'com logo', optionIndex: 1, count: 2, kind: 'checkbox' };

			return { layerId: 104, layerIndex: 4, layerName: 'CTRL', fxName: 'layout', optionIndex: 1, count: mode === 'fxcount' ? 0 : 2, kind: 'menu' };
		},

		makerToggleLayer: function () {
			return { selected: true };
		},

		makerLayers: function (a) {
			return { layers: a.layerIds.map(function (id) { return id === 103 && /missing/.test(location.search) ? null : { id: id, index: id - 100, name: 'layer ' + id, isText: id !== 103, text: { 101: 'Cássio Gabus\rMendes', 102: 'Ator' }[id] || '' }; }) };
		},

		makerTest: async function () {
			await wait(delay);

			return { compId: 7, compName: 'TARJA TEMPLATE', time: 2, frameRate: 29.97, preview: previewSvg(), selected: [] };
		},

		makerSave: async function (a) {
			await wait(delay);

			if (/cancel/.test(location.search)) return { messages: [], data: { saved: false } };

			window.PAD_MOCK_SAVED = a;

			return { messages: [], data: { saved: true, path: '/mock/TARJA/TARJA TEMPLATE_config.json', base: '/mock/TARJA/TARJA TEMPLATE', folder: '/mock/TARJA' } };
		},

		makerRenderPreview: async function (a) {
			await wait(delay * 4); // a renderização leva um tempo

			return { path: a.base + '_preview.mp4' };
		},

		requestConverter: function () {
			window.PAD_MOCK_CONVERTER = { stamp: Date.now(), path: '/Volumes/EDIT_IN_PLACE/PROMO/OUTPUT/TARJAS' };

			return { path: window.PAD_MOCK_CONVERTER.path };
		},

		requestedConverter: function () {
			if (!window.PAD_MOCK_CONVERTER && /path=/.test(location.search)) {
				window.PAD_MOCK_CONVERTER = { stamp: Date.now(), path: decodeURIComponent(location.search.split('path=')[1]) };
			}

			var req = window.PAD_MOCK_CONVERTER || { stamp: 0, path: '' };

			return { stamp: req.stamp, path: req.path, now: Date.now() };
		},

		convertPaths: function (a) {
			var text = String(a.text).trim().replace(/^["']+|["']+$/g, '');

			if (a.from === 'mac') {
				var parts = text.replace(/^\/Volumes\//, '').split('/');

				return { mac: text, win: '\\\\vfx-ml-sp.servicos.corp.tvglobo.com.br\\' + parts.join('\\'), os: 'Mac' };
			}

			return { win: text, mac: '/Volumes/' + text.replace(/^\\\\[^\\]+\\/, '').replace(/\\/g, '/'), os: 'Mac' };
		},

		openConvertedPath: function (a) {
			if (/naoexiste/.test(a.text)) throw new Error('pasta não encontrada (o volume / servidor está acessível?)');

			return { exact: !/parcial/.test(a.text), path: a.text };
		},

		copyText: function () {
			return { ok: true };
		},

		openTextResult: function () {
			return { ok: true };
		},

		selectedProduction: function () {
			return { name: window.PAD_MOCK_PRODUCTION || 'DIA-A-DIA', stamp: mode === 'local' && !window.PAD_MOCK_NETBACK ? 0 : window.PAD_MOCK_LIST ? window.PAD_MOCK_LIST.stamp : 1000 };
		},

		listDir: async function (a) {
			await wait(mode === 'slow' ? 350 : 220);

			function find(node, id) {
				if (node.__id === id) return node;

				for (var i = 0; i < (node.children || []).length; i++) {
					var found = node.children[i].type === 'node' ? find(node.children[i], id) : null;

					if (found) return found;
				}

				return null;
			}

			var node;

			if ((mode === 'unmounted' || mode === 'slowmount') && !window.PAD_MOCK_MOUNTED && !a.uri) return { exists: false, path: a.path, name: '', entries: [] };
			if (a.uri) node = find(tree, a.uri);
			else if (/TESTES/.test(a.path)) node = { type: 'node', text: 'TESTES', children: [] };
			else if (/TEMP_PADEIRO/.test(a.path)) return { exists: false, path: a.path, name: '', entries: [] };
			else node = tree;

			return {
				exists: true,
				path: a.path || a.uri,
				name: node.text,
				entries: node.children.map(function (child) {
					return child.type === 'node' ? { type: 'folder', name: child.text, uri: child.__id } : { type: 'item', name: child.text, uri: child.uri, fsName: child.fsName, created: child.created };
				})
			};
		},

		// ?mock=unmounted: a pasta de templates no volume desmontado; monta depois de um tempo
		mountInfo: function () {
			return { mountable: true, volume: 'VFX' };
		},

		// ?mock=slowmount: monta, mas o volume só aparece uns segundos depois (o host responde que não montou)
		mountPath: async function () {
			await wait(1600);

			if (mode === 'slowmount') {
				setTimeout(function () {
					window.PAD_MOCK_MOUNTED = true;
				}, 3500);

				return { mounted: false };
			}

			window.PAD_MOCK_MOUNTED = true;

			return { mounted: true };
		},

		templateTree: function (a) {
			if (/TESTES/.test(a.path)) return { exists: true, path: a.path, tree: { type: 'node', text: 'TESTES', children: [] } };
			if (/TEMP_PADEIRO/.test(a.path)) return { exists: false, path: a.path, tree: null };

			return { exists: true, path: a.path, tree: tree };
		},

		templateInfo: async function (a) {
			await wait(mode === 'slow' ? 1600 : 80);

			var name = a.uri.split('/').pop().replace(/\.aep$/, '');
			var cfg = configs[name];
			var info = { uri: a.uri, name: name, folder: a.uri.replace(/\/[^/]+$/, ''), preview: name === 'TARJA DUPLA' ? null : previewSvg(), video: window.PAD_MOCK_VIDEO && name === 'TARJA SIMPLES' ? window.PAD_MOCK_VIDEO : null, hasConfig: !!cfg, hasScript: false, hasInputLayers: false, defaults: { configName: 'NOME DA CONFIGURAÇÃO', exemple: 'INFORMAÇÃO 1\nINFORMAÇÃO 2', tip: 'coloque aqui as instruções de preenchimento deste template.', compName: 'COMP TEMPLATE', prefix: 'TARJA', refTime: 2, separator: '\n', textCase: 'upperCase', inputLayers: [], importPath: '~/Downloads', outputPath: ['~/Desktop'] }, config: null, configError: null };

			if (cfg) {
				info.config = Object.assign({ compName: 'COMP TEMPLATE', prefix: 'TARJA', separator: '\n', textCase: 'upperCase', refTime: 2, importPath: '~/Downloads', inputLayers: [{ layerIndex: 1, method: 'textContent' }, { layerIndex: 2, method: 'textContent' }] }, JSON.parse(JSON.stringify(cfg)));
				info.hasInputLayers = true;
			}

			return info;
		},

		normalizePath: function (a) {
			return { path: a.path };
		},

		saveTemplateConfig: async function (a) {
			await wait(delay);

			if (mode === 'fail') throw new Error('não foi possível gravar o arquivo de configuração: sem permissão');

			configs[a.uri.split('/').pop().replace(/\.aep$/, '')] = a.config;

			return { path: a.uri.replace(/\.aep$/, '_config.json') };
		},

		importTemplate: function (a) {
			return { name: a.uri.split('/').pop() };
		},

		fillBegin: function (a) {
			var items = String(a.text).split(/[\n\r]{2,}/);
			var jobs = items.map(function (t, n) {
				return { n: n, f: 0, label: t.split(/[\n\r]+/).join(' / ') };
			});

			run = { jobs: jobs, names: jobs.map(function (j) { return 'TARJA - ' + j.label.replace(/ \/ /g, ' ').toUpperCase(); }) };

			return { total: jobs.length, jobs: jobs, templateName: 'TARJA SIMPLES.aep' };
		},

		fillStep: async function (a) {
			await wait(delay);

			if (mode === 'fail' && a.index === 1) throw new Error('#PAD_021 - layer 2 não encontrado no template');

			return { name: run.names[a.index] };
		},

		fillFinish: function () {
			return { count: run.jobs.length, renderTemplates: ['H264 - Match Source', 'ProRes 422 HQ', 'ProRes 4444 (alpha)', 'DNxHR HQX'], outputPath: ['//servidor/EDIT_IN_PLACE/PROMO/OUTPUT/TARJAS', '~/Desktop'], warnings: [] };
		},

		queueBegin: function (a) {
			run.template = a.outputTemplate;

			return { total: run.jobs.length, outputs: ['/Volumes/EDIT_IN_PLACE/PROMO/OUTPUT/TARJAS', '~/Desktop'], warnings: mode === 'fail' ? ['#PAD_019 - output não pode ser acessado: /Volumes/EDIT_IN_PLACE/PROMO/OUTPUT/TARJAS'] : [] };
		},

		queueStep: async function (a) {
			await wait(delay / 2);

			return { name: run.names[a.index], outputs: ['/Volumes/EDIT_IN_PLACE/PROMO/OUTPUT/TARJAS', '~/Desktop'] };
		},

		runEnd: function () {
			run = null;

			return { script: null };
		},

		// ?mock=nooutput: a pasta de output não pode ser acessada (aparece 2 vezes, como na rede)
		openOutputs: function (a) {
			if (mode === 'nooutput') return { opened: 0, missing: a.paths.map(function (p) { return p.replace(/^\/\/[^\/]+/, '/Volumes'); }) };

			return { opened: 1, missing: [] };
		},

		// janela PROJETO (?mock=noproj: projeto sem ID nem nome; ?mock=nort: sem retrancas)
		projectCategories: function () {
			return {
				categories: mockProject().categories.map(function (c) {
					return Object.assign({ reachable: !/^~|^\/Users\//.test(c.path) && !/OFFLINE/i.test(c.path) }, c);
				}),
				fallback: (JSON.parse(localStorage.getItem('pad.mock.machine') || 'null') || {}).projects || '~/Desktop'
			};
		},

		projectInfo: function () {
			if (!window.PAD_MOCK_LIST) api.productions();

			var p = window.PAD_MOCK_PROJECT || (window.PAD_MOCK_PROJECT = mode === 'noproj' ? { id: '', name: '', user: '' } : { id: 'EMP123456', name: 'História ao Vivo', user: '' });
			var s = window.PAD_MOCK_LIST.project;
			var retrancas = mode === 'nort' ? [] : s.retrancas;
			var user = p.user || 'JMBILLARD';
			var found = null;

			retrancas.forEach(function (r) {
				if (p.id.indexOf(r.code) === 0 && (!found || r.code.length > found.code.length)) found = r;
			});

			var name = p.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
			var values = { id: p.id, projeto: name, usuario: user, retranca: found ? found.path.split('/').pop() : '', data: '2026-10-31' };
			var fill = function (pattern) {
				return pattern.replace(/\{(\w+)\}/g, function (all, t) {
					return values[t] != null ? values[t] : '';
				}).replace(/\s+/g, ' ').replace(/^[\s\-_]+|[\s\-_]+$/g, '');
			};
			var fileBase = fill(s.fileName);
			var base = found ? s.root + '/' + found.path : s.root;
			var target = base ? (s.folder && fileBase ? base + '/' + fileBase : base) : '';
			var toMac = function (x) {
				return x.replace(/^\/\/[^\/]+/, '/Volumes');
			};

			return {
				id: p.id,
				name: p.name,
				user: p.user || 'JMBILLARD',
				defaultUser: 'JMBILLARD',
				hasItems: true,
				file: window.PAD_MOCK_SAVED || '',
				retranca: found ? { code: found.code, name: found.path.split('/').pop() } : null,
				hasRetrancas: retrancas.length > 0,
				target: target ? toMac(target) : '',
				fileName: fileBase ? fileBase + '.aep' : '',
				saved: !!window.PAD_MOCK_SAVED
			};
		},

		projectSet: function (a) {
			var p = window.PAD_MOCK_PROJECT || {};

			window.PAD_MOCK_PROJECT = { id: (a.id || '').toUpperCase().replace(/\s+/g, ''), name: (a.name || '').trim(), user: a.user === 'JMBILLARD' ? '' : a.user || '' };
			if (p.id !== window.PAD_MOCK_PROJECT.id) window.PAD_MOCK_SAVED = '';

			return api.projectInfo();
		},

		projectSave: function (a) {
			var info = api.projectInfo();

			if (!a.overwrite && !info.file && window.PAD_MOCK_EXISTS) throw new Error('#PAD_092 - já existe um projeto com esse nome na pasta: salve de novo para substituir.');

			window.PAD_MOCK_EXISTS = true;
			window.PAD_MOCK_SAVED = (a.path || info.target) + '/' + info.fileName;

			return { file: window.PAD_MOCK_SAVED, folder: a.path || info.target };
		},

		// janela PROJETO em etapas (?mock=created: projeto já criado)
		// ?mock=saved: projeto salvo sem os dados do padeiro
		projectStatus: function () {
			if (window.PAD_MOCK_CUR || mode === 'created') return { state: 'ok' };

			return { state: mode === 'saved' || mode === 'items' || mode === 'outside' ? 'missing' : '' };
		},

		projectCurrent: function () {
			var c = window.PAD_MOCK_CUR || (window.PAD_MOCK_CUR = mode === 'created' ? { oQueE: '', designer: 'JMBILLARD', atracao: 'Tela Quente', root: '/Volumes/VFX/imagem/drive_l/Fileserver_1/FILMES/TITULOS/_N_/NAO NAO OLHE', file: '/Volumes/VFX/imagem/drive_l/Fileserver_1/FILMES/TITULOS/_N_/NAO NAO OLHE/01 PROJETOS/NAO NAO OLHE.aep' } : null);

			// ?mock=outside: com os dados do padeiro, mas salvo na Área de Trabalho
			if (!c && mode === 'outside') return { created: false, outside: true, oQueE: 'CONVIDADOS', designer: 'JMBILLARD', defaultUser: 'JMBILLARD', atracao: 'Domingão com Huck', output: '', root: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/DOMINGAO COM HUCK/2026', file: '/Users/jmbillard/Desktop/teste.aep', fileName: 'teste.aep', hasItems: true, user: 'JMBILLARD' };
			if (!c && mode === 'saved' && window.PAD_MOCK_SAVED === undefined) window.PAD_MOCK_SAVED = '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/A CLINICA/01 PROJETOS/A CLINICA TESTE.aep';
			if (!c && window.PAD_MOCK_SAVED) return { created: false, oQueE: '', designer: 'JMBILLARD', defaultUser: 'JMBILLARD', atracao: '', output: '', root: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/A CLINICA', file: window.PAD_MOCK_SAVED, fileName: 'A CLINICA TESTE.aep', hasItems: true, user: 'JMBILLARD' };
			if (!c) return { created: false, oQueE: '', designer: 'JMBILLARD', defaultUser: 'JMBILLARD', atracao: '', root: '', file: '', fileName: '', hasItems: true, user: 'JMBILLARD' };

			return Object.assign({ created: true, defaultUser: 'JMBILLARD', fileName: c.file.split('/').pop(), hasItems: true, user: 'JMBILLARD' }, c);
		},

		projectLookup: function (a) {
			var V = '/Volumes/VFX/imagem/drive_l/Fileserver_3';
			var list = [
				{ name: 'Mais Você', pat: ['MAIS VOCE'], path: '/Volumes/PROMO_BER/BACKUP/artes/PROGRAMAS GLOBO/MAIS VOCE/2021-2026' },
				{ name: 'Chef de Alto Nível', pat: ['CHEF'], path: V + '/PROGRAMAS/CHEF DE ALTO NIVEL/01 PROJETOS', out: '/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/PROGRAMAS/CHEF DE ALTO NIVEL' },
				{ name: 'Domingão com Huck', pat: ['DOMINGAO'], path: V + '/PROGRAMAS/DOMINGAO COM HUCK/2026', out: '/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/PROGRAMAS/DOMINGAO COM HUCK/2026' },
				{ name: 'Chef Especial', pat: ['CHEF QUEM'], path: V + '/PROGRAMAS/CHEF ESPECIAL' },
				{ name: 'Quem Ama Cuida', pat: ['QUEM AMA'], path: V + '/NOVELAS/QUEM AMA CUIDA/01PROJETOS' },
				{ name: 'Tela Quente', pat: ['TELA', 'TELA QUENTE'], path: '/Volumes/VFX/imagem/drive_l/Fileserver_1/FILMES/TITULOS', film: true },
				{ name: 'Sessão da Tarde', pat: ['S TARDE', 'STARDE'], path: V + '/INSTITUCIONAL/ON AIR 2021/01PROJETOS' }
			];
			var key = function (t) {
				return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
			};
			var words = key(a.claquete).split(' ');
			var pre = {};
			var acc = '';

			words.forEach(function (w) {
				acc += w;
				pre[acc] = true;
			});

			var out = [];

			list.forEach(function (m) {
				var score = 0;

				m.pat.concat([m.name]).forEach(function (p) {
					var k = key(p).replace(/ /g, '');

					if (pre[k] && k.length > score) score = k.length;
				});
				if (score) out.push({ name: m.name, path: m.path, out: m.out || '', display: m.path, film: !!m.film, score: score });
			});
			out.sort(function (x, y) {
				return y.score - x.score;
			});

			return { claquete: key(a.claquete), matches: a.claquete ? out : [] };
		},

		projectBases: function () {
			var V = '/Volumes/VFX/imagem/drive_l/Fileserver_3';

			return { bases: [{ label: 'FILMES', path: '/Volumes/VFX/imagem/drive_l/Fileserver_1/FILMES/TITULOS', display: '…/FILMES/TITULOS', film: true }, { label: 'NOVELAS', path: V + '/NOVELAS', display: '…/Fileserver_3/NOVELAS', film: false }, { label: 'PROGRAMAS', path: V + '/PROGRAMAS', display: '…/Fileserver_3/PROGRAMAS', film: false }, { label: 'SHOWS', path: V + '/SHOWS', display: '…/Fileserver_3/SHOWS', film: false }] };
		},

		projectPlan: function (a) {
			var key = function (t) {
				return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
			};
			var film = a.kind === 'film';
			var base = film ? key(a.title) : key(a.atracao + ' ' + (a.what || ''));
			var root = film ? a.filmPath || a.path + '/_N_/' + key(a.title) : a.path;
			var projectsRoot = /PROJETOS?$/i.test(root.replace(/ /g, ''));
			var H = 3600000;
			var now = Date.now();
			var existing = !film && /MAIS VOCE/.test(root) ? [
				{ name: 'MAIS VOCE CREDITOS', modified: now - 2 * H },
				{ name: 'MAIS VOCE CHROMA', modified: now - 26 * H },
				{ name: 'MAIS VOCE SERVICO PASCOA', modified: now - 9 * 24 * H },
				{ name: 'MAIS VOCE APRESENTACAO', modified: now - 40 * 24 * H },
				{ name: 'MAIS VOCE ABERTURA', modified: now - 400 * 24 * H }
			] : [];
			var folders = [{ name: '02_ARQUIVOS', depth: 0 }, { name: 'FONTS', depth: 1 }, { name: 'IMAGENS', depth: 1 }, { name: 'VÍDEOS', depth: 1 }, { name: '03_SAIDA', depth: 0 }];

			return { root: projectsRoot ? root.replace(/\/[^\/]+$/, '') : root, rootName: (projectsRoot ? root.replace(/\/[^\/]+$/, '') : root).split('/').pop(), rootExists: !film || !!a.filmPath, projects: projectsRoot ? root : root + '/01 PROJETOS', projectsName: projectsRoot ? root.split('/').pop() : '01 PROJETOS', projectsExists: projectsRoot || /MAIS VOCE/.test(root), fileBase: base, fileName: base + '.aep', existing: existing, exists: existing.some(function (f) { return f.name === base; }), folders: folders, user: 'JMBILLARD', output: a.output || '', outputExists: !!a.output && /ARTE RJ\/PROGRAMAS/.test(a.output), outputSub: a.output && a.what ? a.output + '/' + String(a.what).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim() : '', outputSubExists: false };
		},

		projectCreate: function (a) {
			var plan = api.projectPlan(a);

			if (plan.exists && !a.mode) throw new Error('#PAD_092 - já existe ' + plan.fileName + '.');

			window.PAD_MOCK_CUR = { oQueE: String(a.what || '').toUpperCase(), designer: 'JMBILLARD', atracao: a.atracao, output: a.output && (a.outputCreate || plan.outputExists) ? a.output : '' /* pular: não grava */, root: plan.root, file: plan.projects + '/' + (a.mode === 'increment' ? plan.fileBase + ' 2.aep' : plan.fileName) };

			return { file: window.PAD_MOCK_CUR.file, root: plan.root, opened: a.mode === 'open' };
		},

		projectSaveNow: function () {
			return api.projectCurrent();
		},

		// Salvar do editor: o .aep vai para a pasta de projetos da estrutura, com o nome da atração + o que é
		projectSave: function (a) {
			var base = String(a.atracao + ' ' + (a.what || '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

			if (!base) throw new Error('#PAD_090 - escolha a atração.');
			if (a.fileBase) base = a.fileBase;

			var old = (window.PAD_MOCK_CUR && window.PAD_MOCK_CUR.file) || window.PAD_MOCK_SAVED || (mode === 'outside' ? '/Users/jmbillard/Desktop/teste.aep' : '');
			var root = String(a.root || '').replace(/\/01 ?PROJETOS$/i, '');
			var file = root + '/01 PROJETOS/' + base + '.aep';

			window.PAD_MOCK_CUR = { oQueE: String(a.what || '').toUpperCase(), designer: String(a.designer || 'JMBILLARD').toUpperCase(), atracao: a.atracao, root: root, output: a.output || '', file: file };
			window.PAD_MOCK_SAVED = null;

			var cur = api.projectCurrent();

			if (old && old !== file) cur.moved = old;

			return cur;
		},

		// ?mock=unsaved: projeto ainda não salvo
		// a janela do coletar: as mídias do projeto (as imagens da documentação servem de miniatura)
		collectList: function () {
			var D = location.pathname.replace(/\/extension\/client\/[^\/]*$/, '') + '/docs/images/';
			var R = '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/DOMINGAO COM HUCK/2026/02 ARQUIVOS';

			return {
				project: 'DOMINGAO COM HUCK SERVICO.aep',
				root: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/DOMINGAO COM HUCK/2026',
				items: [
					{ id: 11, name: 'logo_convidado.png', file: D + 'ae-estrutura-projeto.png', kind: 'imagens', state: 'local', layers: 2 },
					{ id: 12, name: 'trilha_abertura.wav', file: '/Users/jmbillard/Desktop/trilha_abertura.wav', kind: 'audio', state: 'local', layers: 1 },
					{ id: 13, name: 'fundo_estudio.mov', file: '/Volumes/EDIT_IN_PLACE/PROMO/BRUTOS/fundo_estudio.mov', kind: 'videos', state: 'net', layers: 3 },
					{ id: 14, name: 'textura_[0000-0120].png', file: D + 'ae-menu-output-module.png', kind: 'sequencias', state: 'net', layers: 1 },
					{ id: 15, name: 'arte_antiga.psd', file: '/Volumes/VFX/arte_antiga.psd', kind: 'imagens', state: window.PAD_MOCK_RELINKED ? 'net' : 'missing', layers: 1 },
					{ id: 16, name: 'placar.csv', file: R + '/DADOS/placar.csv', kind: 'dados', state: 'ok', layers: 1 },
					{ id: 17, name: 'barra.webp', file: D + 'barra-vertical.webp', kind: 'imagens', state: 'ok', layers: 0 }
				]
			};
		},

		// ?mock=nosetup: a primeira vez (sem a configuração da equipe): a barra abre o tour
		setupStatus: function () {
			return { needed: mode === 'nosetup' && !window.PAD_MOCK_SETUP, expected: '//servidor/padeiro/O_PADEIRO_GLOBAL_config.json', user: 'JMBILLARD' };
		},

		setupUseConfig: async function (a) {
			await new Promise(function (r) {
				setTimeout(r, 700);
			});

			if (!/O_PADEIRO(_GLOBAL)?_config\.json$/.test(a.path)) throw new Error('#PAD_101 - primeira vez: escolha o O_PADEIRO_GLOBAL_config.json (a configuração da equipe).');

			window.PAD_MOCK_SETUP = true;

			return { productions: 6, links: 8, drives: ['L', 'K', 'T', 'V', 'Y', 'P'], folder: '/Volumes/VFX/imagem/O PADEIRO' };
		},

		setupCreateConfig: function () {
			window.PAD_MOCK_SETUP = true;

			return { productions: 0, links: 0, drives: [], folder: '/Volumes/VFX/imagem/O PADEIRO', existed: false };
		},

		setupLocal: function () {
			window.PAD_MOCK_SETUP = true;

			return { local: true };
		},

		aeVersion: function () {
			return { major: 25, version: '25.2x45' };
		},

		importAep: function (a) {
			return { name: a.name };
		},

		// O VERSIONADOR: ?mock=unsaved simula um projeto nunca salvo
		versionInfo: function () {
			if (mode === 'unsaved') return { major: 25, version: '25.2x45', path: '', name: '', folder: '', dirty: true };

			return { major: 25, version: '25.2x45', path: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/DOMINGAO COM HUCK/2026/01 PROJETOS/DOMINGAO COM HUCK SERVICO.aep', name: 'DOMINGAO COM HUCK SERVICO.aep', folder: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/DOMINGAO COM HUCK/2026/01 PROJETOS', dirty: false };
		},

		versionSave: function () {
			return { path: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/DOMINGAO COM HUCK/2026/01 PROJETOS/DOMINGAO COM HUCK SERVICO.aep' };
		},

		collectReveal: function () {
			return true;
		},

		// resolver faltando: acha o arte_antiga.psd no VFX-1 (?mock=fail: não acha)
		collectRelink: async function () {
			await new Promise(function (r) {
				setTimeout(r, 1400);
			});

			if (mode === 'fail') return { relinked: 0, still: ['arte_antiga.psd'] };

			window.PAD_MOCK_RELINKED = true;

			return { relinked: 1, still: [] };
		},

		// o coletar da barra, em partes (O CATADOR conta um a um)
		collectBegin: function () {
			return { target: '/Volumes/VFX/PROGRAMAS/DOMINGAO COM HUCK/2026', ids: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], missing: [] };
		},

		collectStep: async function (a) {
			await new Promise(function (r) {
				setTimeout(r, 350);
			});

			return { files: a.ids.length, sequences: 0, frames: 0, skipped: [] };
		},

		collectEnd: async function (a) {
			await new Promise(function (r) {
				setTimeout(r, 500);
			});

			return { messages: [], data: { folder: a.target, files: a.files, sequences: 0, frames: 0, fonts: true, saved: true } };
		},

		collectProject: function (a) {
			if (mode === 'unsaved' && !a.path) throw new Error('#PAD_095 - salve o projeto antes de coletar (os arquivos vão para a pasta dele), ou use o clique direito para escolher a pasta.');

			return { messages: mode === 'fail' ? ['#PAD_093 - arquivos ausentes (não coletados):\n\nsumiu.mov'] : [], data: { folder: a.path || '/Volumes/cdesign/PROMO/JORNAIS/em ponto/EMP123456 historia ao vivo', files: 14, sequences: 2, frames: 480, fonts: true, saved: true } };
		},

		projectOpenFolder: function () {
			return { path: '/Volumes/cdesign' };
		},

		projectRetrancasFromIndex: function () {
			return {
				retrancas: [
					{ code: 'INS', path: '//egcdesign01.servicos.corp.tvglobo.com.br/cdesign/JORNALISMO/GLOBONEWS/PROMO/CANAL/institucional' },
					{ code: 'EMP', path: '//egcdesign01.servicos.corp.tvglobo.com.br/cdesign/JORNALISMO/GLOBONEWS/PROMO/JORNAIS/em ponto' },
					{ code: 'MAC', path: '//egcdesign01.servicos.corp.tvglobo.com.br/cdesign/JORNALISMO/GLOBONEWS/PROMO/MARCA E COMUNICACAO' }
				]
			};
		},

		openFolder: function (a) {
			(window.PAD_MOCK_OPENED = window.PAD_MOCK_OPENED || []).push(a.path);

			return true;
		},

		openUrl: function () {
			return true;
		}
	};

	window.PAD_MOCK_HOST = {
		call: async function (method, args) {
			await wait(80);

			if (typeof api[method] !== 'function') throw new Error('método desconhecido: ' + method);

			return api[method](args);
		}
	};
})();
