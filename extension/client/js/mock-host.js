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
			return { app: 'After Effects (mock)', build: '24.0x1', os: 'Mac', version: '0.1.0' };
		},

		productions: function (a) {
			return {
				configPath: a.configPath || '~/O PADEIRO script/O_PADEIRO_config.json',
				error: null,
				productions: [
					{ name: 'DIA-A-DIA', templatesPath: '//servidor/TEMPLATES PADEIRO', icon: null },
					{ name: 'Ω PASTA LOCAL', templatesPath: '~/Downloads/TEMP_PADEIRO', icon: null },
					{ name: 'Ω TESTES (vazia)', templatesPath: '//servidor/TESTES', icon: null }
				]
			};
		},

		templateTree: function (a) {
			if (/TESTES/.test(a.path)) return { exists: true, path: a.path, tree: { type: 'node', text: 'TESTES', children: [] } };
			if (/TEMP_PADEIRO/.test(a.path)) return { exists: false, path: a.path, tree: null };

			return { exists: true, path: a.path, tree: tree };
		},

		templateInfo: function (a) {
			var name = a.uri.split('/').pop().replace(/\.aep$/, '');
			var cfg = configs[name];
			var info = { uri: a.uri, name: name, folder: a.uri.replace(/\/[^/]+$/, ''), preview: name === 'TARJA DUPLA' ? null : previewSvg(), hasConfig: !!cfg, hasScript: false, hasInputLayers: false, config: null, configError: null };

			if (cfg) {
				info.config = Object.assign({ prefix: 'TARJA', separator: '\n', textCase: 'upperCase', refTime: 2, inputLayers: [{ layerIndex: 1 }, { layerIndex: 2 }] }, cfg);
				info.hasInputLayers = true;
			}

			return info;
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
