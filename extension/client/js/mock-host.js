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

	// a tabela de seções da configuração (regras/configuracao.js, ADR 0005): o host de teste lê e grava as seções da
	// equipe por ela, como o host. As páginas não carregam a regra (no After o painel não precisa dela): o host de
	// teste a põe logo depois de si, antes dos scripts do painel
	if (!window.PAD_CONFIGURACAO) document.write('<script src="../regras/configuracao.js"><\/script>');

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

	// a configuração da equipe do host de teste: um documento por arquivo no localStorage ('pad.mock.arquivo.<nome>'),
	// o adaptador da tabela de seções. Sem nada guardado, o arquivo da equipe começa com a semente abaixo (e a barra da
	// equipe que o host de teste guardava antes em 'pad.mock.bar', se houver: lida, e a gravação seguinte vai para o
	// arquivo)
	function mockSemente() {
		var bar = null;

		try {
			bar = JSON.parse(localStorage.getItem('pad.mock.bar') || 'null');
		} catch (err) { }

		var doc = {
			PRODUCTIONS: [
				{ name: 'DIA-A-DIA', templatesPath: '//vfx-ml-hp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_l/Fileserver_3/INSTITUCIONAL/_adm-designers/TEMPLATES/TEMPLATES PADEIRO', icon: 'tv' },
				{ name: 'Ω PASTA LOCAL', templatesPath: '~/Downloads/TEMP_PADEIRO', icon: null },
				{ name: 'Ω TESTES (vazia)', templatesPath: '//servidor/TESTES', icon: 'alvo' }
			],
			DRIVES: {
				drives: [{ letter: 'L', path: '//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_l' }, { letter: 'T', path: '//egcdesign01.servicos.corp.tvglobo.com.br/cdesign' }, { letter: 'V', path: '//vfx-ml-sp.servicos.corp.tvglobo.com.br/EDIT_IN_PLACE' }],
				shares: [{ share: 'VFX', server: 'vfx-ml-sp.servicos.corp.tvglobo.com.br' }, { share: 'promo_ber', server: '10.193.48.13' }],
				defaultServer: 'vfx-ml-sp.servicos.corp.tvglobo.com.br'
			},
			RENAME: window.PAD_CONFIGURACAO.padrao('regraDoRenomear'), // a regra do renomear da equipe, como vem de fábrica
			ORGANIZE: {
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
				commentSubfolders: true,
				fileTags: ['FUNDO', 'LOGO', 'FOTO', 'TRILHA', 'LOC']
			},
			LINKS: [
				{ name: 'apontamento de projetos', url: 'https://tvglobocorp.sharepoint.com/planilha', icon: '' },
				{ name: 'github', url: 'https://github.com/jmbillard/O-PADEIRO', icon: '' }
			],
			SEARCH: {
				url: 'https://workflows.jmbillard.com/webhook/buscar',
				caminhosFixos: [
					{ name: '#INGEST', path: '//cpp-ml-sp.servicos.corp.tvglobo.com.br/PROMO_REDE/CPP_JB_PROMO/#INGEST' },
					{ name: 'BASES VALENDO', path: '//cpp-ml-sp.servicos.corp.tvglobo.com.br/PROMO_REDE/CPP_JB_PROMO/HOME OFFICE - NAO APAGAR/BASES E VALENDO' }
				]
			}
		};

		if (bar) doc.BAR = bar;

		return doc;
	}

	var mockAdaptador = {
		ler: function (arquivo) {
			var text = localStorage.getItem('pad.mock.arquivo.' + arquivo);

			if (text == null) return arquivo === window.PAD_CONFIGURACAO.EQUIPE ? mockSemente() : null;

			return JSON.parse(text);
		},
		gravar: function (arquivo, doc) {
			localStorage.setItem('pad.mock.arquivo.' + arquivo, JSON.stringify(doc));
		}
	};

	// uma seção da configuração da equipe, limpa e completa (pela tabela)
	function mockLer(nome) {
		return window.PAD_CONFIGURACAO.ler(mockAdaptador, nome);
	}

	// preferências desta pessoa (aparência e barra), por cima do padrão da equipe
	// as categorias da atração nova (aba PROJETO), guardadas no navegador: a janela PROJETO lê as mesmas
	function mockProject() {
		var saved = null;

		try {
			saved = JSON.parse(localStorage.getItem('pad.mock.project') || 'null');
		} catch (err) { }

		return { categories: saved && saved.categories ? saved.categories : [] };
	}

	// os cards do Trello (o índice da busca, 'trello'): o designer ('des'), o status ('st') e a atração ligada no banco
	// ('atr'). J M Billard é o designer do usuário do mock (JMBILLARD): os cards dele vêm primeiro, com "seu". um sem
	// atração (vira atração nova), um de filme (o mesmo card do link do ENCANTO no webhook dos filmes), um do tipo fixo
	// (MOOD MENSAL, o mês pelo card), um antigo e um finalizado (ficam de fora)
	var MOCK_FILM_CARD = '6750aa11bb22cc33dd44ee55';

	function mockCards() {
		var at = function (days) {
			return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
		};

		return [
			{ claq: 'Premio 2026 Ch Jor Esp G5', atr: 'Prêmio Rede Globo', des: 'J M Billard', st: 'EM APROVAÇÃO', red: 'Felipe Souza', card: '6750aa11bb22cc33dd44ee01', at: at(1) },
			{ claq: 'VEM AI(2027)', atr: 'Vem Aí', des: 'J M Billard', st: 'PRODUZINDO', card: '6750aa11bb22cc33dd44ee02', at: at(2) },
			{ claq: 'RIO SUMMER BEATS 5-12', atr: '', des: 'Ana Paula Reis', st: 'PRODUZINDO', card: '6750aa11bb22cc33dd44ee03', at: at(0) },
			{ claq: 'PREMIO 2026 CH PGM LOCAL G5', atr: 'Prêmio Rede Globo', des: 'Carla Souza', st: '', card: '6750aa11bb22cc33dd44ee04', at: at(0) },
			{ claq: 'Premio 2026 Ch Jor Esp Afil', atr: 'Prêmio Rede Globo', des: 'Cristina Vianna', st: 'EM APROVAÇÃO', card: '6750aa11bb22cc33dd44ee05', at: at(2) },
			{ claq: 'Premio 2026 Ch Pgm Local Afil', atr: 'Prêmio Rede Globo', des: 'Bruno Lima', st: 'PRODUZINDO', card: '6750aa11bb22cc33dd44ee06', at: at(3) },
			{ claq: 'Premio 2026 Conteudo Rede', atr: 'Prêmio Rede Globo', des: 'Diego Prado', st: 'EM APROVAÇÃO', card: '6750aa11bb22cc33dd44ee07', at: at(4) },
			{ claq: 'TELA QUENTE ENCANTO 29-11', atr: '', fil: true, des: 'Fernanda Lima', st: 'PRODUZINDO', card: MOCK_FILM_CARD, at: at(1) },
			{ claq: 'DOMINGAO 25/11', atr: 'Domingão com Huck', des: 'Ana Paula Reis', st: 'PRODUZINDO', red: 'ANA', ed: 'BETO', card: '6750aa11bb22cc33dd44ee09', at: at(2) },
			{ claq: 'JANEIRO NA GLOBO', atr: 'MOOD MENSAL', des: 'J M Billard', st: 'PRODUZINDO', card: '6750aa11bb22cc33dd44ee10', at: at(1) },
			{ claq: 'CARNAVAL 2026 ESCOLAS', atr: 'Carnaval', des: 'Diego Prado', st: 'FINALIZADO', fim: true, card: '6750aa11bb22cc33dd44ee11', at: at(1) },
			{ claq: 'PREMIO 2025 VINHETA', atr: 'Prêmio Rede Globo', des: 'J M Billard', st: '', card: '6750aa11bb22cc33dd44ee12', at: at(30) }
		];
	}

	function mockMachine() {
		return JSON.parse(localStorage.getItem('pad.mock.machine') || 'null') || {};
	}

	function mockPrefs() {
		return JSON.parse(localStorage.getItem('pad.mock.prefs') || 'null') || { appearance: null, bar: null };
	}

	// o arquivista: o caminho relativo de um item (a pasta dele + o nome)
	function mockFilesJoin(dir, name) {
		return dir ? dir + '/' + name : name;
	}

	// o arquivista: a pasta from virou to; os de dentro (em qualquer nível) vão junto
	function mockFilesMoveDir(from, to) {
		(window.PAD_MOCK_FILES || []).forEach(function (x) {
			if (x.dir === from || x.dir.indexOf(from + '/') === 0) x.dir = to + x.dir.slice(from.length);
		});
	}

	// o índice da busca de mentira (o mesmo texto do download e da cópia). age: de quantas horas atrás
	function mockSearchIndex(age) {
		var H = 3600000;
		var iso = function (h) { return new Date(Date.now() - h * H).toISOString().replace(/\.\d+Z$/, 'Z'); };
		var srv = '//vfx-ml-sp.servicos.corp.tvglobo.com.br/EDIT_IN_PLACE/PROMO/cdesign_output/C# ABERTA & INTER';

		return JSON.stringify({
			v: 2,
			stamp: 'mock01',
			generated: iso(age || 0),
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
		});
	}

	// as comps selecionadas do etiquetador de teste: o nome, as pastas (da mais próxima para a raiz) e o comentário
	function mockComps() {
		return window.PAD_MOCK_COMPS || (window.PAD_MOCK_COMPS = [
			{ name: 'rodapé_joão silva', folders: [], comment: '' },
			{ name: 'joao silva', folders: ['RODAPES'], comment: '' },
			{ name: 'logo_globo_branco', folders: [], comment: '' },
			{ name: 'abertura', folders: [], comment: 'LOGO GLOBO v2' },
			{ name: 'CRT - AMANHA', folders: [], comment: '' },
			{ name: 'tarja_patrocínio  v2', folders: ['ASSETS'], comment: '' }
		]);
	}

	var api = {
		ping: function () {
			return { app: 'After Effects (mock)', build: '24.0x1', os: 'Mac', version: '2.0 beta9', network: mode !== 'nonet' };
		},

		productions: function (a) {
			if (!window.PAD_MOCK_LIST) {
				// o que ainda não está na tabela de seções (a configuração da equipe guardada só na memória desta janela)
				window.PAD_MOCK_LIST = {
					stamp: 1000,
					log: { mode: 'webhook', webhook: 'https://workflows.jmbillard.com/webhook/log_db_padeiro' },
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
							{ name: '03_SAIDA', parent: '', contents: ['saidas'] },
							{ name: 'PREVIEWS', parent: '03_SAIDA', contents: [] },
							{ name: '04_REFS', parent: '', contents: [] },
							{ name: '05_EXTERNOS', parent: '', contents: ['externos'] }
						]
					}
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
				drives: mockLer('mapaDeDrives'),
				rename: mockLer('regraDoRenomear'),
				organize: mockLer('organizar'),
				search: mockLer('buscaDeCaminhos'),
				links: mockLer('links'),
				project: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.project)),
				collect: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.collect)),
				fonts: Object.assign({ defaultBank: '/Volumes/VFX/imagem/drive_l/Fileserver_3/INSTITUCIONAL/_adm-designers/O PADEIRO/BANCO DE FONTES' }, JSON.parse(localStorage.getItem('pad.mock.fonts') || 'null') || { bank: '', upload: true }),
				bar: mockLer('barra'),
				personal: mockPrefs(),
				appearance: JSON.parse(localStorage.getItem('pad.mock.appearance') || 'null') || { mode: 'light', background: 'gradient', accent: '#5184f8', gradientStart: '#67b7ff', gradientEnd: '#5649e9', font: 'inter', logo: '' },
				productions: mockLer('producoes').map(function (p) {
					return Object.assign({}, p, { icon: p.icon || null, ignored: /^~(\/|$)|^\/(Users|home)\//.test(p.templatesPath || p.path || '') });
				}),
				localProductions: ((JSON.parse(localStorage.getItem('pad.mock.machine') || 'null') || {}).productions || []).slice(),
				localMode: !!(JSON.parse(localStorage.getItem('pad.mock.machine') || 'null') || {}).localMode,
				lists: (JSON.parse(localStorage.getItem('pad.mock.machine') || 'null') || {}).lists || { recents: 5, newDays: 15 }
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
			localStorage.setItem('pad.mock.machine', JSON.stringify({ user: a.user || '', projects: a.projects || '', outputs: a.outputs || '', render: a.render || { 'final': '', preview: '' }, productions: a.productions || [], log: a.log !== false, localMode: !!a.localMode, fontsUpload: a.fontsUpload !== false, fontsCheck: a.fontsCheck !== false, lists: a.lists || { recents: 5, newDays: 15 }, search: a.search || { mode: 'webhook', folders: [], foldersOnly: true, daily: true } }));

			return Object.assign({ defaultUser: 'JMBILLARD', hasConfigCopy: true, localIndex: '/mock/indice_local.json' }, JSON.parse(localStorage.getItem('pad.mock.machine')));
		},

		barLinks: function () {
			var list = window.PAD_MOCK_LIST;

			var personal = JSON.parse(localStorage.getItem('pad.mock.personalLinks') || '[{"name":"meu drive","url":"https://drive.google.com/","icon":""}]');

			var bar = mockPrefs().bar || mockLer('barra'); // as janelas do navegador não dividem o host de mentira: a configuração fica no localStorage
			var links = mockLer('links');

			return { items: bar.items, hidden: bar.hidden, stamp: (list ? list.stamp : 1) + '|' + localStorage.getItem('pad.mock.personalLinks') + '|' + JSON.stringify(bar) + '|' + JSON.stringify(links), links: links, personal: personal, localMode: !!(mockMachine().localMode || localStorage.getItem('pad.mock.offline')), localForced: !!mockMachine().localMode };
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

		saveProductions: async function (a) {
			await wait(delay);

			if (mode === 'conflict') throw new Error('#PAD_065 - a lista foi alterada por outra pessoa depois que você abriu o editor. use "recarregar" e refaça as alterações.');

			// as seções da tabela, como o host: limpas (a mensagem da limpeza sai sem gravar nada) e gravadas de uma vez;
			// as que não vierem ficam como estão
			var equipe = window.PAD_CONFIGURACAO.EQUIPE;
			var doc = window.PAD_CONFIGURACAO.aplicar(mockAdaptador.ler(equipe), { producoes: a.productions || [], mapaDeDrives: a.drives, regraDoRenomear: a.rename, organizar: a.organize, buscaDeCaminhos: a.search, links: a.links, barra: a.bar });

			mockAdaptador.gravar(equipe, doc);
			window.PAD_MOCK_LIST.stamp += 1000;
			if (a.log) window.PAD_MOCK_LIST.log = Object.assign({}, a.log);
			if (a.fonts) localStorage.setItem('pad.mock.fonts', JSON.stringify(a.fonts));
			if (a.appearance) {
				if (!['accent', 'gradientStart', 'gradientEnd'].every(function (k) { return /^#[0-9a-f]{6}$/i.test(a.appearance[k]); })) throw new Error('#PAD_088 - aparência: cor inválida (use #rrggbb).');
				localStorage.setItem('pad.mock.appearance', JSON.stringify(a.appearance));
			}
			if (a.project) {
				// como o host (padCleanProject)
				var seenCat = {};

				(a.project.categories || []).forEach(function (c, i) {
					var key = String(c.name || '').trim().toUpperCase();
					var badTok = /\{(?!(atracao|ano|mes|mes_extenso|proximo_mes|proximo_mes_num|ano_proximo_mes|tipo|categoria|letra|o_que_e|ano_producao)\})[^}]*\}/.exec(c.path || '');

					if (!key) throw new Error('#PAD_089 - projeto: preencha o nome do tipo de projeto ' + (i + 1) + '.');
					if (seenCat[key]) throw new Error('#PAD_089 - projeto: o tipo ' + key + ' aparece mais de uma vez.');
					if (!String(c.path || '').trim()) throw new Error('#PAD_089 - projeto: o tipo ' + key + ' precisa de um caminho.');
					if (badTok) throw new Error('#PAD_089 - projeto: ' + badTok[0] + ' não é um token do caminho (use {atracao}, {ano}, {mes}, {mes_extenso}, {proximo_mes}, {proximo_mes_num}, {ano_proximo_mes}, {categoria} ou {letra}).');
					if (/\{(?!(atracao|ano|mes|mes_extenso|proximo_mes|proximo_mes_num|ano_proximo_mes|tipo|categoria|letra|o_que_e|ano_producao)\})[^}]*\}/.test(c.output || '')) throw new Error('#PAD_089 - projeto: token desconhecido no output de ' + key + '.');
					seenCat[key] = true;
				});
				window.PAD_MOCK_LIST.project = { categories: (a.project.categories || []).map(function (c) {
					return { name: String(c.name).trim().toUpperCase(), path: String(c.path).trim().replace(/\\/g, '/').replace(/(.)\/+$/, '$1'), output: String(c.output || '').trim().replace(/\\/g, '/').replace(/(.)\/+$/, '$1'), file: String(c.file || '').trim(), icon: c.icon || '' };
				}) };
				localStorage.setItem('pad.mock.project', JSON.stringify(window.PAD_MOCK_LIST.project));
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

			return { stamp: window.PAD_MOCK_LIST.stamp, productions: doc.PRODUCTIONS, log: Object.assign({}, window.PAD_MOCK_LIST.log), drives: mockLer('mapaDeDrives'), rename: mockLer('regraDoRenomear'), organize: mockLer('organizar'), search: mockLer('buscaDeCaminhos'), links: mockLer('links'), project: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.project)), collect: JSON.parse(JSON.stringify(window.PAD_MOCK_LIST.collect)), bar: mockLer('barra'), appearance: JSON.parse(localStorage.getItem('pad.mock.appearance') || 'null'), configPath: '//servidor/padeiro/O_PADEIRO_GLOBAL_config.json' };
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

		// O FORNO: os presets de render do After e as comps na fila
		renderPresets: function () {
			var m = JSON.parse(localStorage.getItem('pad.mock.machine') || 'null') || {};
			var r = m.render || {};

			return { templates: ['H.264 - Match Render Settings - 15 Mbps', 'H.264 metade', 'High Quality', 'High Quality with Alpha', 'Lossless', 'ProRes 422 HQ', 'ProRes 4444 + alpha', 'XDCAM HD 50', 'Sequência PNG'], 'final': r['final'] || '', preview: r.preview || '' };
		},

		logoGlobo: async function (a) {
			await wait(200);

			return { name: 'LOGO GLOBO', comp: 'PROMO_LOGO' };
		},

		renderQueue: async function (a) {
			await wait(delay);

			if (mode === 'fail') throw new Error('#PAD_113 - render: selecione as comps no painel de projeto (ou abra uma comp).');

			return a && a.preview
				? { count: 2, folder: 'T:/PROGRAMAS/INTERPOL/03_SAIDA/PREVIEWS', local: false, preview: true, names: ['ABERTURA_prev_v03', 'VINHETA_prev_v01'], warnings: [] }
				: { count: 2, folder: 'O:/OUTPUT/INTERPOL/2026/SERVICO', local: false, preview: false, names: ['ABERTURA', 'VINHETA'], warnings: [] };
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
				{ name: '03_SAIDA', depth: 0, contents: ['saidas'] },
				{ name: 'PREVIEWS', depth: 1, contents: [] },
				{ name: '04_REFS', depth: 0, contents: [] },
				{ name: '05_EXTERNOS', depth: 0, contents: ['externos'] }
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

		// o etiquetador: a regra do renomear (regras/regra-do-renomear.js, a mesma do host) com a regra guardada (a tabela de seções) nas comps
		// de teste. data.names: os nomes que ficaram (o After só devolve a contagem)
		renameComps: async function () {
			await wait(delay);

			if (mode === 'fail') throw new Error('#PAD_032 - selecione as comps ou pastas que serão renomeadas.');

			var rule = mockLer('regraDoRenomear');
			var comps = mockComps();

			comps.forEach(function (c) {
				var r = window.PAD_REGRA_DO_RENOMEAR.rename(rule, c.name, { folders: c.folders, comment: c.comment });

				c.name = r.name;
				if (r.comment) c.comment = r.comment;
			});

			return { messages: [], data: { count: comps.length, names: comps.map(function (c) { return c.name; }) } };
		},

		renameOutputs: function () {
			return { messages: ['#PAD_033 - 1 saída(s) não foram renomeadas (já renderizadas ou bloqueadas).'] };
		},

		// ?mock=nosel: nenhuma comp selecionada nem com comentário (a barra pergunta antes de organizar)
		organizeCheck: function () {
			return mode === 'nosel' ? { comps: 6, selected: 0, tagged: 0 } : { comps: 6, selected: 2, tagged: 3 };
		},

		organizeProject: function () {
			return { messages: [], data: { count: 14 } };
		},

		// etiquetas: 3 itens selecionados e alguns comentários no projeto
		tagsSelection: function () {
			return { selection: window.PAD_MOCK_SEL == null ? 3 : window.PAD_MOCK_SEL };
		},

		tagsInfo: function () {
			var counts = window.PAD_MOCK_TAGS || (window.PAD_MOCK_TAGS = { EXPORTAR: 4, TEMPLATE: 1, EDIT: 2, RODAPE: 6, CARTAO: 2, LETTERING: 3, TARJA: 1, ASSINA: 1, FUNDO: 3, LOGO: 2, FOTO: 5, TRILHA: 1 });
			var list = function (names) {
				return names.map(function (n) {
					return { name: n, count: counts[n] || 0 };
				});
			};

			return {
				selection: window.PAD_MOCK_SEL == null ? 3 : window.PAD_MOCK_SEL,
				groups: [
					{ id: 'render', tags: list(['EXPORTAR', 'LOGO GLOBO', 'TEMPLATE']) },
					{ id: 'edit', tags: list(['EDIT']) },
					{ id: 'types', tags: list(['RODAPE', 'CARTAO', 'LETTERING', 'CONFRONTO', 'TARJA', 'PASSAGEM', 'ASSINA', 'FOTO', 'REF']) },
					{ id: 'files', tags: list(['FUNDO', 'LOGO', 'FOTO', 'TRILHA', 'LOC']) }
				],
				folders: { render: '01 COMPS', edit: '' }
			};
		},

		tagsApply: function (a) {
			var text = String(a.text || '').trim().toUpperCase();

			var tag = text.split(':')[0].trim();

			if (tag) window.PAD_MOCK_TAGS[tag] = (window.PAD_MOCK_TAGS[tag] || 0) + 3;

			return { count: 3 };
		},

		tagsClearAll: function () {
			window.PAD_MOCK_TAGS = {};

			return { count: 31 };
		},

		requestTab: function (a) {
			window.PAD_MOCK_TAB = { tab: a.tab, stamp: Date.now() };

			return { tab: a.tab };
		},

		requestedTab: function () {
			var req = window.PAD_MOCK_TAB || (/tab=texts/.test(location.search) ? { tab: 'texts', stamp: Date.now() } : { tab: null, stamp: 0 });

			return { tab: req.tab, stamp: req.stamp, now: Date.now() };
		},

		// a busca de caminhos: ?mock=v1 simula o webhook fora do ar; ?mock=lidx, o índice local (buscar); ?mock=nocopy,
		// o modo local sem cópia do índice neste computador. o modo local é o da máquina (ou a rede fora:
		// pad.mock.offline); ?mock=modolocal liga só nesta janela
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
				copia: '/tmp/busca_copia.json',
				copiaAntiga: '/tmp/busca_v2.json', // o nome de antes da cópia (lido quando não há a de agora)
				local: !!(machine.localMode || localStorage.getItem('pad.mock.offline') || mode === 'modolocal' || mode === 'nocopy'),
				platform: 'Mac',
				caminhosFixos: ((window.PAD_MOCK_LIST && mockLer('buscaDeCaminhos').caminhosFixos) || [
					{ name: '#INGEST', path: '//cpp-ml-sp/PROMO_REDE/CPP_JB_PROMO/#INGEST' },
					{ name: 'BASES VALENDO', path: '//cpp-ml-sp/PROMO_REDE/CPP_JB_PROMO/HOME OFFICE - NAO APAGAR/BASES E VALENDO' }
				]).map(function (r) {
					var m = /^\/\/([^\/]+)\/([^\/]+)/.exec(r.path);

					return { name: r.name, path: r.path, server: m ? m[1] : '', share: m ? m[2] : '' };
				})
			};
		},

		// a cópia do índice (modo local, sem o Node do painel): a de 2 dias atrás
		searchCopy: function () {
			if (/mock=nocopy/.test(location.search)) return { text: '', modified: 0 };

			return { text: mockSearchIndex(48), modified: Date.now() - 48 * 3600000 };
		},

		searchDownload: async function () {
			await new Promise(function (r) { setTimeout(r, 300); });

			if (/mock=v1/.test(location.search)) throw new Error('#PAD_058 - não foi possível carregar o índice.');

			return { downloaded: true, text: mockSearchIndex() };
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
			if (mode === 'nocollect') return { state: '', total: 0, local: 0, names: [], kinds: {}, ready: false }; // sem para onde coletar

			return mode === 'localfiles' ? { state: 'out', total: 12, local: 2, names: ['logo.png', 'trilha.wav'], kinds: { imagens: 1, audio: 1 } } : { state: 'ok', total: 12, local: 0, names: [], kinds: {} };
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

			if (mode === 'converted') return { state: 'out', why: 'convertido de uma versão antiga do After e ainda não salvo' };

			return { state: mode === 'saved' || mode === 'items' || mode === 'outside' ? 'missing' : '' };
		},

		projectCurrent: function () {
			var c = window.PAD_MOCK_CUR || (window.PAD_MOCK_CUR = mode === 'created' ? { oQueE: '', designer: 'JMBILLARD', criado: '2026-11-12', output: '/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/C# ABERTA & INTER/ARTE RJ/FILMES/TITULOS/_N_/NAO NAO OLHE', editores: [{ user: 'JMBILLARD', day: '2026-11-12' }, { user: 'TMARTA', day: '2026-11-15' }], atracao: 'Tela Quente', root: '/Volumes/VFX/imagem/drive_l/Fileserver_1/FILMES/TITULOS/_N_/NAO NAO OLHE', file: '/Volumes/VFX/imagem/drive_l/Fileserver_1/FILMES/TITULOS/_N_/NAO NAO OLHE/01 PROJETOS/NAO NAO OLHE.aep' } : null);

			// ?mock=outside: com os dados do padeiro, mas salvo na Área de Trabalho
			if (!c && mode === 'outside') return { created: false, outside: true, oQueE: 'CONVIDADOS', designer: 'JMBILLARD', defaultUser: 'JMBILLARD', atracao: 'Domingão com Huck', output: '', root: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/DOMINGAO COM HUCK/2026', file: '/Users/jmbillard/Desktop/teste.aep', fileName: 'teste.aep', hasItems: true, user: 'JMBILLARD' };
			// ?mock=converted: projeto antigo que o After converteu ao abrir (sem arquivo), com os dados do padeiro
			if (!c && mode === 'converted') return { created: false, outside: true, unsaved: true, oQueE: 'PACOTE GRAFICO', designer: 'JMBILLARD', defaultUser: 'JMBILLARD', atracao: 'Premio Multishow', criado: '2024-10-02', editores: [{ user: 'JMBILLARD', day: '2024-10-02' }], salvo: { user: 'JMBILLARD', day: '2024-10-02' }, output: '/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/PREMIO MULTISHOW', root: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/PREMIO MULTISHOW', file: '', fileName: '', modified: 0, hasItems: true, user: 'JMBILLARD' };
			if (!c && mode === 'saved' && window.PAD_MOCK_SAVED === undefined) window.PAD_MOCK_SAVED = '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/A CLINICA/01 PROJETOS/A CLINICA TESTE.aep';
			if (!c && window.PAD_MOCK_SAVED) return { created: false, oQueE: '', designer: 'JMBILLARD', defaultUser: 'JMBILLARD', atracao: '', output: '', root: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/A CLINICA', file: window.PAD_MOCK_SAVED, fileName: 'A CLINICA TESTE.aep', hasItems: true, user: 'JMBILLARD' };
			if (!c) return { created: false, oQueE: '', designer: 'JMBILLARD', defaultUser: 'JMBILLARD', atracao: '', root: '', file: '', fileName: '', hasItems: true, user: 'JMBILLARD' };

			return Object.assign({ created: true, defaultUser: 'JMBILLARD', fileName: c.file.split('/').pop(), modified: Date.now() - 47 * 60000, hasItems: true, user: 'JMBILLARD' }, c);
		},

		// as pastas de um nível (ATRAÇÃO/PASTA/… e o output): uma árvore de exemplo pelo fim do caminho
		// os quadros com a estrutura do padeiro em outros anos (o exemplo: os de 2025 na organização nova)
		projectQuadros: function (a) {
			return { names: /DOMINGAO COM HUCK$/.test(String(a.root || '')) ? ['DANÇA DOS FAMOSOS', 'QUEM VEM PRA CANTAR', 'THE WALL', 'VOCÊ DECIDE'] : [] };
		},

		projectFolders: function (a) {
			var root = String(a.path || '').replace(/\/+$/, '');

			if (!a.plain) root = root.replace(/\/0?1[ _]?PROJETOS?$/i, '');

			var TREE = {
				'DOMINGAO COM HUCK/2026': ['DANÇA DOS FAMOSOS', 'DOMINGÃO RECORD', 'QUEM QUER SER UM MILIONÁRIO', 'VIDEOSHOW', 'TE VI NA TV', 'ARQUIVO CONFIDENCIAL', 'PATRÕES'],
				'DOMINGAO COM HUCK/2026/DANÇA DOS FAMOSOS': ['ESTREIA', 'FINAL', 'SEMIFINAL'],
				'DOMINGAO COM HUCK/2026/DANÇA DOS FAMOSOS/FINAL': ['2025'],
				'CHEF DE ALTO NIVEL': ['REPESCAGEM'],
				'cdesign_output/PROGRAMAS/DOMINGAO COM HUCK/2026': ['CHAMADAS', 'DANÇA DOS FAMOSOS', 'VIRADA'],
				'cdesign_output/PROGRAMAS/DOMINGAO COM HUCK/2026/DANÇA DOS FAMOSOS': ['SEMANA 1', 'SEMANA 2'],
				// a organização nova (PROJETOS/…/{atracao}/{ano}): os quadros de outro ano viram exemplos
				'PROJETOS/PROGRAMAS/DOMINGAO COM HUCK': ['2025', '2026'],
				'PROJETOS/PROGRAMAS/DOMINGAO COM HUCK/2025': ['DANÇA DOS FAMOSOS', 'QUEM VEM PRA CANTAR', 'THE WALL', 'VOCÊ DECIDE'],
				'PROJETOS/PROGRAMAS/DOMINGAO COM HUCK/2026': ['THE WALL'],
				// o filme que já tem projeto: as pastas da estrutura (a claquete recolhe e vai para os .aep)
				'_A_/ANNA - O PERIGO TEM NOME (2019)': ['03BOARDS', '05SAIDA', '06EXTERNOS'],
				'_A_/ANNA - O PERIGO TEM NOME': ['03BOARDS', '05SAIDA', '06EXTERNOS']
			};
			var names = [];

			Object.keys(TREE).forEach(function (k) {
				if (root.slice(-k.length - 1) === '/' + k) names = TREE[k];
			});

			return { root: root, rootName: root.split('/').pop(), exists: true, folders: names.map(function (n) {
				return { name: n, path: root + '/' + n };
			}) };
		},

		// os filmes recentes (o webhook dos filmes): ?mock=nofilms, nenhum. o ENCANTO tem card no Trello (o 'trello' é
		// o link do mesmo card do mockCards: o card de filme leva a ele)
		projectFilmsRecent: function () {
			if (/mock=nofilms/.test(location.search)) return { data: { filmes: [] } };

			var day = function (n) {
				return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
			};

			return { data: { filmes: [
				{ titulo: 'Encanto', ano: 2021, exibicao: day(5), sessao: 'Tela Quente', poster: '', trello: 'https://trello.com/c/' + MOCK_FILM_CARD + '/412-tela-quente-encanto' },
				{ titulo: 'Flores de Aço', ano: 1989, exibicao: day(6), sessao: 'Sessão da Tarde', poster: '' },
				{ titulo: 'Não! Não Olhe!', ano: 2022, exibicao: '2026-12-05', sessao: 'Corujão', poster: '' },
				{ titulo: 'O Repórter da Meia-Noite', ano: 2023, exibicao: '2026-12-12', sessao: 'Supercine', poster: '' },
				{ titulo: '90 Decibéis', ano: 2025, exibicao: '2026-11-28', sessao: 'Sessão da Tarde', poster: '' },
				{ titulo: 'Nosso Lar 2: Os Mensageiros', ano: 2024, exibicao: '', sessao: '', poster: '' },
				{ titulo: 'Anna - O Perigo Tem Nome', ano: 2019, exibicao: '2026-12-19', sessao: 'Temperatura Máxima', poster: '' },
				// fora do índice da busca (cadastrado depois da última cópia): entra pelos dados do webhook
				{ titulo: 'Um Sonho de Liberdade', ano: 1994, exibicao: '2026-12-26', sessao: 'Corujão', poster: '' }
			] } };
		},

		// as pastas das letras no formato do computador (o mock devolve como veio)
		projectFilmsParents: function (a) {
			return { paths: (a.parents || []).slice() };
		},

		// a pasta de cada filme já existe? (o mock: ANNA, numa pasta antiga sem ano, e FLORES DE AÇO já têm)
		projectFilmsDone: function (a) {
			var done = (a.items || []).map(function (it) {
				return /^(ANNA|FLORES)/i.test(it.title);
			});

			return { done: done, paths: (a.items || []).map(function (it, i) {
				if (!done[i]) return '';

				return /^ANNA/i.test(it.title) ? it.parent + '/ANNA - O PERIGO TEM NOME' : it.parent + '/FLORES DE ACO (1989)';
			}) };
		},

		projectLookup: function (a) {
			var V = '/Volumes/VFX/imagem/drive_l/Fileserver_3';
			var list = [
				{ name: 'Mais Você', pat: ['MAIS VOCE'], path: '/Volumes/PROMO_BER/BACKUP/artes/PROGRAMAS GLOBO/MAIS VOCE/2021-2026' },
				{ name: 'Chef de Alto Nível', pat: ['CHEF'], path: V + '/PROGRAMAS/CHEF DE ALTO NIVEL/01 PROJETOS', out: '/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/PROGRAMAS/CHEF DE ALTO NIVEL' },
				// com card novo no Trello (os cards ficam em mockCards)
				{ name: 'Domingão com Huck', pat: ['DOMINGAO'], path: V + '/PROGRAMAS/DOMINGAO COM HUCK/2026', out: '/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/PROGRAMAS/DOMINGAO COM HUCK/2026' },
				{ name: 'Prêmio Rede Globo', pat: ['PREMIO'], path: V + '/SHOWS/PREMIO REDE GLOBO/2026', out: '/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/SHOWS/PREMIO REDE GLOBO/2026' },
				{ name: 'Vem Aí', pat: ['VEM AI'], path: '/Volumes/VFX/imagem/drive_l/Fileserver_2/PROGRAMAS/VEM AI/2026', out: '/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/PROGRAMAS/VEM AI/2026' },
				{ name: 'Carnaval', pat: ['CARNAVAL'], path: V + '/SHOWS/CARNAVAL/2026', out: '' },
				{ name: 'Chef Especial', pat: ['CHEF QUEM'], path: V + '/PROGRAMAS/CHEF ESPECIAL' },
				{ name: 'Quem Ama Cuida', pat: ['QUEM AMA'], path: V + '/NOVELAS/QUEM AMA CUIDA/01PROJETOS' },
				{ name: 'Tela Quente', pat: ['TELA', 'TELA QUENTE'], path: '/Volumes/VFX/imagem/drive_l/Fileserver_1/FILMES/TITULOS', film: true },
				{ name: 'Sessão da Tarde', pat: ['S TARDE', 'STARDE'], path: V + '/INSTITUCIONAL/ON AIR 2021/01PROJETOS' },
				{ name: 'O Mentiroso', pat: ['MENTIROSO'], path: '', out: '/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output/C# ABERTA & INTER/ARTE RJ/FILMES/TITULOS/_M_/O MENTIROSO', isFilm: true, year: '1997' }
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
			var cards = mockCards();
			// o card de uma atração (o mais novo): o tipo fixo (MOOD MENSAL) tira o mês dele
			var cardOf = function (m) {
				var c = cards.filter(function (x) {
					return x.atr && key(x.atr) === key(m.name) && !x.fim;
				})[0];

				return c ? { claq: c.claq, red: c.red || '', ed: c.ed || '', card: c.card, at: c.at, more: 0 } : null;
			};
			// cada palavra digitada é o começo de uma palavra do texto (como a claquete procura os cards)
			var hits = function (text) {
				var hw = key(text).split(' ');

				return words.filter(Boolean).length && words.filter(Boolean).every(function (w) {
					return hw.some(function (h) {
						return h.indexOf(w) === 0;
					});
				});
			};

			list.forEach(function (m) {
				var score = 0;

				m.pat.concat([m.name]).forEach(function (p) {
					var k = key(p).replace(/ /g, '');

					if (pre[k] && k.length > score) score = k.length;
				});
				// pela claquete de um card ligado a ela, como no índice de verdade ('summer' não; 'premio 2026 ch' sim)
				if (!score && cards.some(function (c) {
					return c.atr && key(c.atr) === key(m.name) && hits(c.claq);
				})) score = 1;
				if (score) out.push({ name: m.name, path: m.path, out: m.out || '', display: m.path, film: !!m.film, isFilm: !!m.isFilm, category: m.isFilm ? 'FILME · ' + m.year : '', score: score, trello: m.isFilm ? null : cardOf(m) });
			});
			out.sort(function (x, y) {
				return y.score - x.score;
			});

			return { claquete: key(a.claquete), matches: a.claquete ? out : [], cards: cards };
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
			// o nome do .aep do tipo (aba PROJETO > ARQUIVO), como no host: {o_que_e} no lugar do token, ou no fim
			var custom = String(a.fileName || '');
			var base = film ? key(a.title) : custom ? key(custom.indexOf('{o_que_e}') >= 0 ? custom.split('{o_que_e}').join(' ' + (a.what || '') + ' ') : custom + ' ' + (a.what || '')) : key((String(a.quadro || '').split('/').pop().trim() || a.atracao) + ' ' + (a.what || ''));
			var root = film ? a.filmPath || a.path + '/_N_/' + key(a.title) : a.path;
			var projectsRoot = /PROJETOS?$/i.test(root.replace(/ /g, ''));
			var H = 3600000;
			var now = Date.now();
			var existing = !film && /MAIS VOCE/.test(root) ? [
				{ name: 'MAIS VOCE CREDITOS', modified: now - 2 * H },
				{ name: 'MAIS VOCE TARJAS', ext: 'aet', modified: now - 5 * H },
				{ name: 'MAIS VOCE CONVIDADOS', modified: now - 50 * H },
				{ name: 'MAIS VOCE VINHETA', modified: now - 200 * 24 * H },
				{ name: 'MAIS VOCE CHROMA', modified: now - 26 * H },
				{ name: 'MAIS VOCE SERVICO PASCOA', modified: now - 9 * 24 * H },
				{ name: 'MAIS VOCE APRESENTACAO', modified: now - 40 * 24 * H },
				{ name: 'MAIS VOCE ABERTURA', modified: now - 400 * 24 * H },
				{ name: 'MAIS VOCE RECEITA DE NATAL', sub: 'RECEITAS', modified: now - 60 * H }
			] : !film && /PREMIO REDE GLOBO/.test(root) ? [
				// um .aep por categoria do prêmio, alguns nas subpastas da pasta de projetos (o card de cada uma destaca
				// os dele: o PREMIO 2026 CH JOR ESP G5 tem dois)
				{ name: 'PREMIO 2026 CH PGM LOCAL G5', modified: now - 2 * H },
				{ name: 'PREMIO 2026 VINHETA', modified: now - 5 * 24 * H },
				{ name: 'PREMIO 2026 CH PGM LOCAL AFIL', sub: 'AFILIADAS', modified: now - 26 * H },
				{ name: 'PREMIO 2026 CH JOR ESP AFIL', sub: 'AFILIADAS', modified: now - 50 * H },
				{ name: 'PREMIO 2026 CH JOR ESP G5', sub: 'CHAMADAS', modified: now - 74 * H },
				{ name: 'PREMIO 2026 CH JOR ESP G5 V2', sub: 'CHAMADAS', modified: now - 3 * H }
			] : /ANNA - O PERIGO/.test(root) ? [
				{ name: 'ANNA - O PERIGO TEM NOME (2019) CHAMADA', modified: now - 30 * H }
			] : /FLORES DE ACO/.test(root) ? [
				{ name: 'FLORES DE ACO (1989) CHAMADA', modified: now - 4 * 24 * H },
				{ name: 'FLORES DE ACO (1989) SERVICO', sub: 'VERSOES', modified: now - 4 * 24 * H - H }
			] : !film && /MOOD MENSAL/.test(root) ? [
				// o mood do mês já começado (o card do Trello abre ele)
				{ name: 'JANEIRO NA GLOBO', modified: now - 3 * H }
			] : [];
			return { root: projectsRoot ? root.replace(/\/[^\/]+$/, '') : root, rootName: (projectsRoot ? root.replace(/\/[^\/]+$/, '') : root).split('/').pop(), rootExists: !film || !!a.filmPath, projects: projectsRoot ? root : root + '/01 PROJETOS', projectsName: projectsRoot ? root.split('/').pop() : '01 PROJETOS', projectsExists: projectsRoot || /MAIS VOCE|MOOD MENSAL|PREMIO REDE GLOBO|ANNA - O PERIGO|FLORES DE ACO/.test(root), projectsFs: '', listed: true, fileBase: base, fileName: base + '.aep', existing: existing, exists: existing.some(function (f) { return f.name === base && f.ext !== 'aet' && !f.sub; }), user: 'JMBILLARD', output: a.output || '' };
		},

		projectCreate: function (a) {
			var plan = api.projectPlan(a);

			if (plan.exists && !a.mode) throw new Error('#PAD_092 - já existe ' + plan.fileName + '.');

			window.PAD_MOCK_CUR = { oQueE: String(a.what || '').toUpperCase(), designer: 'JMBILLARD', atracao: a.atracao, quadro: a.quadro || '', output: a.output || '' /* sem output: não grava */, root: plan.root, file: plan.projects + '/' + (a.mode === 'increment' ? plan.fileBase + ' 2.aep' : plan.fileName) };

			return { file: window.PAD_MOCK_CUR.file, root: plan.root };
		},

		projectSaveNow: function () {
			return api.projectCurrent();
		},

		// Salvar do editor: o .aep vai para a pasta de projetos da estrutura, com o nome da atração + o que é
		projectSave: function (a) {
			var base = String((String(a.quadro || '').split('/').pop().trim() || a.atracao) + ' ' + (a.what || '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

			if (!base) throw new Error('#PAD_090 - escolha a atração.');
			if (a.fileBase) base = a.fileBase;

			var old = (window.PAD_MOCK_CUR && window.PAD_MOCK_CUR.file) || window.PAD_MOCK_SAVED || (mode === 'outside' ? '/Users/jmbillard/Desktop/teste.aep' : '');
			var root = String(a.root || '').replace(/\/01 ?PROJETOS$/i, '');
			var file = root + '/01 PROJETOS/' + base + '.aep';

			window.PAD_MOCK_CUR = { oQueE: String(a.what || '').toUpperCase(), designer: String(a.designer || 'JMBILLARD').toUpperCase(), atracao: a.atracao, quadro: a.quadro || '', root: root, output: a.output || '', file: file };
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
				dests: { videos: '02_ARQUIVOS/VÍDEOS', sequencias: '02_ARQUIVOS/IMAGENS', imagens: '02_ARQUIVOS/IMAGENS', audio: '02_ARQUIVOS/AUDIOS', dados: '02_ARQUIVOS/DADOS' },
				items: [
					{ id: 11, name: 'logo_convidado.png', file: D + 'ae-estrutura-projeto.png', kind: 'imagens', state: 'local', layers: 2 },
					{ id: 12, name: 'trilha_abertura.wav', file: '/Users/jmbillard/Desktop/trilha_abertura.wav', kind: 'audio', state: 'local', layers: 1 },
					{ id: 13, name: 'fundo_estudio.mov', file: '/Volumes/EDIT_IN_PLACE/PROMO/BRUTOS/fundo_estudio.mov', kind: 'videos', state: 'net', layers: 3 },
					{ id: 14, name: 'textura_[0000-0120].png', file: D + 'ae-menu-output-module.png', kind: 'sequencias', state: 'net', layers: 1 },
					{ id: 15, name: 'arte_antiga.psd', file: window.PAD_MOCK_RELINKED ? R + '/IMAGENS/arte_antiga.psd' : '/Volumes/VFX/ANTIGO/02 ARQUIVOS/arte_antiga.psd', kind: 'imagens', state: window.PAD_MOCK_RELINKED ? 'ok' : 'missing', layers: 1 },
					{ id: 18, name: 'vinheta_2019.mov', file: '/Volumes/VFX/ANTIGO/vinheta_2019.mov', kind: 'videos', state: 'missing', layers: 1 },
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
		// a migração da pasta (O CATADOR): a pasta bagunçada de exemplo; depois de migrar, nada para mover e o
		// registro para desfazer
		// com todos os projetos (a: { all }): o que só os outros projetos usam sai dos externos
		migratePlan: async function (a) {
			var all = !!(a && a.all);

			// PAD_MOCK_SLOW (ms): a rede lenta de mentira, para ver as esperas da janela
			if (window.PAD_MOCK_SLOW) {
				await new Promise(function (r) {
					setTimeout(r, window.PAD_MOCK_SLOW);
				});
			}
			// a pasta grande de exemplo (um banco de stock): fica como está, a não ser que mandem mover
			var moveStock = !!(a && a.move && a.move.indexOf('03 EXTERNOS/STOCK') >= 0);
			var dests = [['01_PROJETOS', 0, 'projeto'], ['02_ARQUIVOS', 0, ''], ['02_ARQUIVOS/AUDIOS', 1, 'audio'], ['02_ARQUIVOS/DADOS', 1, 'dados'], ['02_ARQUIVOS/FONTS', 1, 'fontes'], ['02_ARQUIVOS/IMAGENS', 1, 'imagens'], ['02_ARQUIVOS/VÍDEOS', 1, 'videos'], ['03_SAIDA', 0, 'saidas'], ['03_SAIDA/PREVIEWS', 1, ''], ['04_REFS', 0, ''], ['05_EXTERNOS', 0, 'externos']];
			var links = window.PAD_MOCK_MIGRATED ? [] : [['01 PROJETOS', '01_PROJETOS', 'projeto', 3], ['02 ARQUIVOS', '02_ARQUIVOS/IMAGENS', 'imagens', 8], ['02 ARQUIVOS', '02_ARQUIVOS/IMAGENS', 'sequencias', 240], ['02 ARQUIVOS', '02_ARQUIVOS/VÍDEOS', 'videos', 5], ['02 ARQUIVOS', '02_ARQUIVOS/DADOS', 'dados', 2], ['02 ARQUIVOS', '05_EXTERNOS', 'externos', all ? 2 : 6], ['02 ARQUIVOS', '02_ARQUIVOS/VÍDEOS', 'videos', all ? 4 : 0], ['02_ARQUIVOS', '02_ARQUIVOS/IMAGENS', 'imagens', 6], ['02_ARQUIVOS', '02_ARQUIVOS/AUDIOS', 'audio', 3], ['02_ARQUIVOS', '02_ARQUIVOS/FONTS', 'fontes', 4], ['03 EXTERNOS', '02_ARQUIVOS/VÍDEOS', 'videos', 2], ['03 EXTERNOS', '05_EXTERNOS', 'externos', all ? 24 : 36], ['03 EXTERNOS', '02_ARQUIVOS/IMAGENS', 'imagens', all ? 12 : 0], ['03 SAIDA', '03_SAIDA', 'saidas', 19], ['04 SAIDA', '03_SAIDA', 'saidas', 12], ['03 EXTERNOS', '05_EXTERNOS', 'externos', moveStock ? 728 : 0], ['', '05_EXTERNOS', 'externos', 16], ['..', '02_ARQUIVOS/VÍDEOS', 'videos', 2]];
			var sources = {};
			var count = {};
			var total = 0;

			// as faixas do mesmo caminho e tipo somam (o exemplo de todos os projetos acrescenta a algumas)
			links = links.filter(function (l) {
				return l[3] > 0;
			}).reduce(function (list, l) {
				var same = list.filter(function (o) {
					return o[0] === l[0] && o[1] === l[1] && o[2] === l[2];
				})[0];

				if (same) same[3] += l[3];
				else list.push(l.slice());

				return list;
			}, []);

			links.forEach(function (l) {
				sources[l[0]] = (sources[l[0]] || 0) + l[3];
				count[l[1]] = (count[l[1]] || 0) + l[3];
				total += l[3];
			});

			return {
				blocked: mode === 'blocked' ? 'o .aep está salvo direto numa pasta do sistema (Área de Trabalho, Documentos, Downloads…), e a migração arruma a pasta inteira onde ele está. leve o projeto para a pasta dele (Projeto > Criar / Alterar) e use o Coletar: ele copia para lá os arquivos usados, estejam onde estiverem' : '', loose: mode === 'loose', interrupted: mode === 'interrupted' && !window.PAD_MOCK_MIGRATED && !window.PAD_MOCK_UNDONE, interruptedCount: 120,
				root: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/INTERPOL', name: 'INTERPOL', total: total, stay: window.PAD_MOCK_MIGRATED ? 362 : 4, conflicts: window.PAD_MOCK_MIGRATED ? 0 : 2, others: window.PAD_MOCK_MIGRATED ? 0 : 2, outside: window.PAD_MOCK_MIGRATED ? 0 : 2, partial: false, all: all, undo: !!window.PAD_MOCK_MIGRATED || (mode === 'interrupted' && !window.PAD_MOCK_UNDONE), kept: window.PAD_MOCK_MIGRATED || moveStock ? 0 : 728, bulk: window.PAD_MOCK_MIGRATED ? [] : [{ path: '03 EXTERNOS/STOCK', count: 728, deep: !moveStock, keep: !moveStock }],
				sources: Object.keys(sources).sort(function (a, b) {
					if (a === '..' || b === '..') return a === '..' ? 1 : -1;

					return a === '' ? 1 : b === '' ? -1 : a.localeCompare(b);
				}).map(function (k) {
					return { name: k, count: sources[k] };
				}),
				dests: dests.map(function (d) {
					return { path: d[0], depth: d[1], type: d[2], count: count[d[0]] || 0, extra: false };
				}),
				links: links.map(function (l) {
					return { from: l[0], to: l[1], type: l[2], count: l[3], names: (l[2] === 'externos' ? ['moodboard.pdf', 'print_site.png', 'referencia_01.jpg', 'roteiro_v2.docx', 'briefing.pdf', 'paleta.ase', 'storyboard.pdf', 'print_02.png', 'print_03.png', 'email_cliente.pdf', 'ref_tipografia.jpg', 'ref_cor.jpg', 'ideias.txt', 'logo_antigo.ai', 'teste_export.mov', 'outro.png'] : ['arquivo_01.' + (l[2] === 'videos' ? 'mxf' : l[2] === 'audio' ? 'wav' : 'png'), 'arquivo_02.' + (l[2] === 'videos' ? 'mxf' : l[2] === 'audio' ? 'wav' : 'png')]).slice(0, Math.min(15, l[3])) };
				})
			};
		},

		// a leitura dos outros projetos (um por vez) e, depois de mover, o religar de cada um
		// ?mock=interrupted: uma migração que parou no meio (o diário na pasta)
		migrateState: function () {
			return { interrupted: mode === 'interrupted' && !window.PAD_MOCK_UNDONE, undo: (mode === 'interrupted' && !window.PAD_MOCK_UNDONE) || !!window.PAD_MOCK_MIGRATED };
		},

		migrateReadBegin: function () {
			window.PAD_MOCK_READ_AT = 0;

			return { total: 2 };
		},

		migrateReadStep: async function () {
			await new Promise(function (r) {
				setTimeout(r, 500);
			});

			return { done: ++window.PAD_MOCK_READ_AT, total: 2, failed: 0 };
		},

		migrateReadEnd: function () {
			return { failed: [] };
		},

		migrateOthersStep: async function () {
			await new Promise(function (r) {
				setTimeout(r, 500);
			});
			window.PAD_MOCK_OTHERS_AT = (window.PAD_MOCK_OTHERS_AT || 0) + 1;

			return { done: window.PAD_MOCK_OTHERS_AT, total: 2, failed: 0 };
		},

		migrateOthersEnd: function () {
			window.PAD_MOCK_OTHERS_AT = 0;
			window.PAD_MOCK_MIGRATED = true;

			return { projects: 2, failed: [], folders: 6 };
		},

		migrateBegin: function (a) {
			window.PAD_MOCK_MIG_AT = 0;
			window.PAD_MOCK_ALL = !!(a && a.all);

			return { total: 362 };
		},

		migrateStep: async function () {
			await new Promise(function (r) {
				setTimeout(r, window.PAD_MOCK_SLOW || 90);
			});
			window.PAD_MOCK_MIG_AT = Math.min(362, window.PAD_MOCK_MIG_AT + 60);

			return { done: window.PAD_MOCK_MIG_AT, total: 362, failed: 0 };
		},

		migrateEnd: function () {
			var all = !!window.PAD_MOCK_ALL;

			if (!all) window.PAD_MOCK_MIGRATED = true;

			return { moved: 361, failed: [], relinked: 23, folders: all ? 0 : 6, queue: 2, others: all ? 2 : 0, project: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/INTERPOL/01_PROJETOS/INTERPOL_ABERTURA.aep' };
		},

		migrateUndo: async function () {
			await new Promise(function (r) {
				setTimeout(r, 600);
			});
			window.PAD_MOCK_MIGRATED = false;
			window.PAD_MOCK_UNDONE = true; // a interrompida (?mock=interrupted) também fica desfeita

			return { restored: 361, failed: [], relinked: 23, newer: mode === 'newer' ? ['INTERPOL VINHETA.aep'] : [] };
		},

		// a busca dos faltando: acha um (com outro de mesmo nome) e não acha o outro; ?mock=fail: nenhum
		collectRelinkFind: async function () {
			await new Promise(function (r) {
				setTimeout(r, 1200);
			});

			var still = [{ id: 18, name: 'vinheta_2019.mov' }];

			if (mode === 'fail' || window.PAD_MOCK_RELINKED) return { found: [], still: window.PAD_MOCK_RELINKED ? still : still.concat([{ id: 15, name: 'arte_antiga.psd' }]), partial: false };

			return { found: [{ id: 15, name: 'arte_antiga.psd', from: '/Volumes/VFX/ANTIGO/02 ARQUIVOS/arte_antiga.psd', to: '/Volumes/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/DOMINGAO COM HUCK/2026/02 ARQUIVOS/IMAGENS/arte_antiga.psd', how: 'busca', more: 1 }], still: still, partial: false };
		},

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

		projectOpenFile: function (a) {
			window.PAD_MOCK_OPENED_FILE = a.path;

			return { file: a.path };
		},

		// O ARQUIVISTA: uma pasta de exemplo (o prefixo vem do próprio nome; dois que dariam o mesmo nome)
		// A FORMINHA (?mock=nolayers: comp aberta sem layer de texto selecionado; ?mock=namelayer: com o layer de nome)
		lightRead: function () {
			var layers = mode === 'nolayers' ? [] : [{ index: 2, name: 'nome', text: 'ANA MARIA' }, { index: 3, name: 'info', text: 'APRESENTADORA' }];

			if (mode === 'onelayer') layers = layers.slice(0, 1); // ?mock=onelayer: um layer só

			return {
				comp: 'RDP - ANA MARIA',
				id: 42,
				layers: layers,
				parts: layers.length ? [{ text: 'RDP - ' }, { text: 'ANA MARIA', layer: 0 }] : [{ text: 'RDP - ANA MARIA' }],
				nameLayer: mode === 'namelayer',
				separator: ' - '
			};
		},

		lightPlan: function (a) {
			var taken = {};
			var existing = ['RDP - ANA MARIA', 'RDP - XUXA'].concat(window.PAD_MOCK_LIGHT || []);

			existing.forEach(function (n) {
				taken[n.toUpperCase()] = 1;
			});

			return {
				existing: Object.keys(taken),
				names: (a.versions || []).map(function (lines) {
					if (mode === 'namelayer') return { name: '', taken: false };

					var name = 'RDP - ' + String(lines.filter(Boolean)[0] || '').replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
					var key = name.toUpperCase();
					var was = !!taken[key];

					taken[key] = (taken[key] || 0) + 1;

					return { name: was ? name + '_' + taken[key] : name, taken: was };
				})
			};
		},

		lightFill: function (a) {
			var plan = this.lightPlan(a);
			var names = (a.versions || []).map(function (lines, i) {
				return a.names[i] || plan.names[i].name || 'RDP - ' + lines.join(' ').toUpperCase();
			});

			window.PAD_MOCK_LIGHT = (window.PAD_MOCK_LIGHT || []).concat(names);

			return { count: names.length, names: names, ids: names.map(function (n, i) {
				return 100 + window.PAD_MOCK_LIGHT.length + i;
			}), errors: [] };
		},

		lightOpen: function () {
			return true;
		},

		filesStart: function () {
			return { undo: window.PAD_MOCK_FILES_UNDO || null };
		},

		// o arquivista: a sugestão pela regra do renomear (regras/regra-do-renomear.js, suggest: a mesma do host) com a
		// regra guardada; o formato só pelo nome do item, nunca pela pasta onde ele está
		filesList: function (a) {
			var rule = mockLer('regraDoRenomear');
			var list = (window.PAD_MOCK_FILES || (window.PAD_MOCK_FILES = [
				{ dir: '', name: 'antigos', ext: '', kind: 'folder' },
				{ dir: '', name: 'Sequência fundo', ext: '', kind: 'folder' },
				{ dir: '', name: '_CRT_HOJE', ext: 'mov', kind: 'file' },
				{ dir: '', name: '_crt_amanhã', ext: 'mov', kind: 'file' },
				{ dir: '', name: 'CRT - AMANHA', ext: 'mov', kind: 'file' },
				{ dir: '', name: '_RDP_convidado João Gomes', ext: 'mov', kind: 'file' },
				{ dir: '', name: 'rodapé_anitta (final)', ext: 'mov', kind: 'file' },
				{ dir: '', name: 'LETT - VEM AI', ext: 'mov', kind: 'file' },
				{ dir: '', name: 'tarja_patrocínio  v2', ext: 'png', kind: 'file', use: true },
				{ dir: '', name: 'fundo palco', ext: 'png', kind: 'file', use: true },
				{ dir: '', name: 'ref_palco', ext: 'jpg', kind: 'file' },
				{ dir: '', name: 'logo_globo_branco', ext: 'png', kind: 'file' },
				{ dir: 'Sequência fundo', name: 'textura_ouro', ext: 'png', kind: 'seq', sep: '_', pad: 4, frames: '_[0001-0120]', count: 120, use: true },
				{ dir: 'antigos', name: '_CRT_ONTEM', ext: 'mov', kind: 'file' },
				{ dir: 'antigos', name: 'passagem glitter', ext: 'mov', kind: 'file' }
			]));
			// a pasta com um arquivo usado dentro (em qualquer nível) fica em uso, como no host
			var inside = function (folder) {
				var at = (folder.dir ? folder.dir + '/' : '') + folder.name;

				return list.some(function (x) {
					return x.use && (x.dir === at || x.dir.indexOf(at + '/') === 0);
				});
			};

			list = list.filter(function (it) {
				return a.sub || !it.dir;
			}).map(function (it) {
				if (it.kind === 'folder') it = Object.assign({}, it, { use: inside(it) });

				var s = window.PAD_REGRA_DO_RENOMEAR.suggest(rule, it.name);

				return Object.assign({ use: false }, it, { plain: s.plain, prefixed: s.prefixed });
			});

			return { path: a.path, name: String(a.path).split('/').pop(), items: list, truncated: false, undo: window.PAD_MOCK_FILES_UNDO || null };
		},

		// o registro do desfazer: as trocas de nome (ops), na ordem em que foram feitas. a pasta renomeada leva os de
		// dentro (o dir deles muda junto)
		filesRename: function (a) {
			var used = 0;
			var ops = [];
			var rename = function (it, from, to) {
				if (it.kind === 'folder') mockFilesMoveDir(mockFilesJoin(it.dir, from), mockFilesJoin(it.dir, to));
				it.name = to;
			};

			a.items.forEach(function (r) {
				window.PAD_MOCK_FILES.forEach(function (it) {
					if (it.dir === r.dir && it.name === r.name && it.ext === r.ext) {
						if (it.use) used++;
						rename(it, r.name, r.to);
						ops.push({ dir: r.dir, ext: r.ext, kind: it.kind, from: r.name, to: r.to, use: !!it.use });
					}
				});
			});
			var prev = a.append ? window.PAD_MOCK_FILES_UNDO : null;

			window.PAD_MOCK_FILES_UNDO = { count: ops.length + (prev ? prev.count : 0), folder: a.path, when: Date.now(), ops: (prev ? prev.ops : []).concat(ops) };

			return { count: ops.length, relinked: a.relink === false ? 0 : used, errors: [], ops: ops, undo: window.PAD_MOCK_FILES_UNDO };
		},

		// o religar no fim dos lotes (um passo do Ctrl+Z): conta os usados no projeto
		filesRelink: function (a) {
			return { relinked: (a.ops || []).filter(function (op) {
				return op.use;
			}).length };
		},

		// PAD_MOCK_FILES_UNDO_FAIL = n: os n primeiros itens a voltar não voltam (travados) e ficam no registro
		filesUndo: function () {
			var u = window.PAD_MOCK_FILES_UNDO;
			var fail = window.PAD_MOCK_FILES_UNDO_FAIL || 0;
			var left = [];
			var errors = [];
			var back = 0;

			if (!u) throw new Error('#PAD_114 - não há renomeação para desfazer.');
			window.PAD_MOCK_FILES_UNDO_FAIL = 0;

			u.ops.slice().reverse().forEach(function (op) {
				// a pasta de agora: as pastas renomeadas depois deste item que não voltaram (left) ainda têm o nome novo
				var dir = left.reduce(function (d, o) {
					var from = mockFilesJoin(o.dir, o.from);

					if (o.kind !== 'folder' || (d !== from && d.indexOf(from + '/') !== 0)) return d;

					return mockFilesJoin(o.dir, o.to) + d.slice(from.length);
				}, op.dir);
				var it = window.PAD_MOCK_FILES.filter(function (x) {
					return x.dir === dir && x.name === op.to && x.ext === op.ext;
				})[0];

				if (!it || fail-- > 0) {
					errors.push({ name: op.to + (op.ext ? '.' + op.ext : ''), error: it ? 'não foi possível renomear (em uso ou sem permissão)' : 'não está mais na pasta' });
					left.unshift(op);

					return;
				}
				if (it.kind === 'folder') mockFilesMoveDir(mockFilesJoin(dir, op.to), mockFilesJoin(dir, op.from));
				it.name = op.from;
				back++;
			});

			window.PAD_MOCK_FILES_UNDO = left.length ? { count: left.length, folder: u.folder, when: u.when, ops: left } : null;

			return { count: back, missing: errors.length, relinked: 0, errors: errors, folder: u.folder, undo: window.PAD_MOCK_FILES_UNDO };
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
			// as chamadas do arquivista, para os testes conferirem a ordem (ex: o religar uma vez só, no fim)
			if (/^files/.test(method)) (window.PAD_MOCK_FILES_CALLS = window.PAD_MOCK_FILES_CALLS || []).push(method);

			return api[method](args);
		}
	};
})();
