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

	var tpl = function (name, folder, extra) {
		return Object.assign({ type: 'item', text: name + '.aep', uri: '/mock/' + folder + '/' + name + '.aep', fsName: '/mock/' + folder + '/' + name + '.aep' }, extra || {});
	};

	var tree = {
		type: 'node',
		text: 'TEMPLATES PADEIRO',
		children: [
			{ type: 'node', text: 'TARJAS', children: [tpl('TARJA SIMPLES', 'TARJAS'), tpl('TARJA DUPLA', 'TARJAS'), tpl('TARJA JOGO', 'TARJAS')] },
			{ type: 'node', text: 'RODAPES / ESPORTES', children: [tpl('RODAPE PLACAR', 'RODAPES'), tpl('RODAPE ESCALACAO', 'RODAPES')] },
			{ type: 'node', text: 'CARTOES', children: [tpl('CARTAO DE VISITA', 'CARTOES'), tpl('CARTAO ENTREVISTADO', 'CARTOES')] },
			tpl('LETTERING SOLTO', '.'),
			tpl('ASSINATURA JORNAL', '.')
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

	var api = {
		ping: function () {
			return { app: 'After Effects (mock)', build: '24.0x1', os: 'Mac', version: '0.1.0', network: mode !== 'nonet' };
		},

		productions: function (a) {
			if (!window.PAD_MOCK_LIST) {
				window.PAD_MOCK_LIST = {
					stamp: 1000,
					items: [
						{ name: 'DIA-A-DIA', templatesPath: '//vfx-ml-hp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_l/Fileserver_3/INSTITUCIONAL/_adm-designers/TEMPLATES/TEMPLATES PADEIRO', icon: null },
						{ name: 'Ω PASTA LOCAL', templatesPath: '~/Downloads/TEMP_PADEIRO', icon: null },
						{ name: 'Ω TESTES (vazia)', templatesPath: '//servidor/TESTES', icon: null }
					]
				};
			}

			return {
				configPath: '//servidor/padeiro/O_PADEIRO_config.json',
				shared: mode !== 'local',
				stamp: window.PAD_MOCK_LIST.stamp,
				error: null,
				productions: window.PAD_MOCK_LIST.items.map(function (p) {
					return Object.assign({}, p);
				})
			};
		},

		saveProductions: async function (a) {
			await wait(delay);

			if (mode === 'conflict') throw new Error('#PAD_CONFLITO - a lista foi alterada por outra pessoa (ou pelo script) depois que você abriu o editor. use "recarregar" e refaça as alterações.');

			window.PAD_MOCK_LIST.items = a.productions.slice().sort(function (x, y) {
				return x.name < y.name ? -1 : x.name > y.name ? 1 : 0;
			});
			window.PAD_MOCK_LIST.stamp += 1000;

			return { stamp: window.PAD_MOCK_LIST.stamp, productions: window.PAD_MOCK_LIST.items, configPath: '//servidor/padeiro/O_PADEIRO_config.json' };
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

		createProjectFolders: function () {
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

			return { hasComp: true, compId: 7, compName: 'TARJA TEMPLATE', time: 2, selected: [{ id: 101, index: 1, name: 'nome', isText: true, text: 'Cássio Gabus\rMendes' }, { id: 102, index: 2, name: 'cargo', isText: true, text: 'Ator' }] };
		},

		makerCapture: async function () {
			await wait(delay);
			window.PAD_MOCK_COMP = true;

			return { compId: 7, compName: 'TARJA TEMPLATE', time: 2, preview: previewSvg(), selected: [{ id: 101, index: 1, name: 'nome', isText: true, text: 'Cássio Gabus\rMendes' }, { id: 102, index: 2, name: 'cargo', isText: true, text: 'Ator' }, { id: 103, index: 3, name: 'fundo', isText: false, text: '' }] };
		},

		makerFonts: async function () {
			await wait(delay);

			return { fonts: ['Gotham Bold', 'Gotham Book', 'Globo Sans Condensed'] };
		},

		makerSelection: function () {
			return { hasComp: true, selected: [{ id: 101, index: 1, name: 'nome', isText: true, text: 'Cássio Gabus\rMendes' }, { id: 103, index: 3, name: 'fundo', isText: false, text: '' }] };
		},

		makerToggleLayer: function () {
			return { selected: true };
		},

		makerLayers: function (a) {
			return { layers: a.layerIds.map(function (id) { return id === 103 && /missing/.test(location.search) ? null : { id: id, index: id - 100, name: 'layer ' + id, isText: id !== 103, text: { 101: 'Cássio Gabus\rMendes', 102: 'Ator' }[id] || '' }; }) };
		},

		makerTest: async function () {
			await wait(delay);

			return { compId: 7, compName: 'TARJA TEMPLATE', time: 2, preview: previewSvg(), selected: [] };
		},

		makerSave: async function (a) {
			await wait(delay);

			if (/cancel/.test(location.search)) return { messages: [], data: { saved: false } };

			window.PAD_MOCK_SAVED = a;

			return { messages: [], data: { saved: true, path: '/mock/TARJA/TARJA TEMPLATE_config.json', folder: '/mock/TARJA' } };
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

		lastOutputFolder: function () {
			return { path: '/Volumes/EDIT_IN_PLACE/PROMO/OUTPUT/TARJAS' };
		},

		copyText: function () {
			return { ok: true };
		},

		openTextResult: function () {
			return { ok: true };
		},

		selectedProduction: function () {
			return { name: window.PAD_MOCK_PRODUCTION || 'DIA-A-DIA', stamp: window.PAD_MOCK_LIST ? window.PAD_MOCK_LIST.stamp : 1000 };
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

			if (a.uri) node = find(tree, a.uri);
			else if (/TESTES/.test(a.path)) node = { type: 'node', text: 'TESTES', children: [] };
			else if (/TEMP_PADEIRO/.test(a.path)) return { exists: false, path: a.path, name: '', entries: [] };
			else node = tree;

			return {
				exists: true,
				path: a.path || a.uri,
				name: node.text,
				entries: node.children.map(function (child) {
					return child.type === 'node' ? { type: 'folder', name: child.text, uri: child.__id } : { type: 'item', name: child.text, uri: child.uri, fsName: child.fsName };
				})
			};
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

			return { total: run.jobs.length, outputs: ['/Volumes/EDIT_IN_PLACE/PROMO/OUTPUT/TARJAS', '~/Desktop'], warnings: mode === 'fail' ? ['#PAD_019 - output não pode ser acessado: //servidor/EDIT_IN_PLACE/PROMO/OUTPUT/TARJAS'] : [] };
		},

		queueStep: async function (a) {
			await wait(delay / 2);

			return { name: run.names[a.index], outputs: ['/Volumes/EDIT_IN_PLACE/PROMO/OUTPUT/TARJAS', '~/Desktop'] };
		},

		runEnd: function () {
			run = null;

			return { script: null };
		},

		openOutputs: function () {
			return { opened: 1, missing: [] };
		},

		openFolder: function () {
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
