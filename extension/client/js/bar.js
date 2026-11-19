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
	var FONTS_PANEL_ID = 'com.jmbillard.opadeiro.fonts';
	var COLLECT_PANEL_ID = 'com.jmbillard.opadeiro.collect';
	var VERSIONER_PANEL_ID = 'com.jmbillard.opadeiro.versioner';
	var LABELS_PANEL_ID = 'com.jmbillard.opadeiro.labels';
	var FILES_PANEL_ID = 'com.jmbillard.opadeiro.files';
	var LIGHT_PANEL_ID = 'com.jmbillard.opadeiro.light';
	var COLLECT_BATCH = 1; // O CATADOR copia um arquivo por chamada: a barra conta cada um
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

	var UNDO_KEY = PAD_UTIL.undoKey; // Cmd+Z no Mac, Ctrl+Z no Windows

	// O aviso flutuante da barra: o resultado da última ação, com a bolinha (deu certo, atenção, erro).
	// kind: 'success' | 'error' | 'warn' | null; action: { label, run } (um botão no fim, ex: "organizar assim mesmo")
	function toast(kind, text, ms, action) {
		var box = $('toast');
		var dot = el('i', 'bar-status-dot');
		var body = el('span', 'toast-text', kind === 'error' ? PAD_UTIL.errorText(text) : text);
		var close = el('button', 'toast-close', '×');

		clearTimeout(box._timer);

		function hide() {
			clearTimeout(box._timer);
			box.hidden = true;
		}

		close.type = 'button';
		close.setAttribute('aria-label', 'fechar aviso');
		close.addEventListener('click', hide);

		box.className = 'bar-toast' + (kind ? ' is-' + kind : '');
		box.textContent = '';
		box.appendChild(dot);
		box.appendChild(body);

		if (action) {
			var btn = el('button', 'bar-status-action', action.label);

			btn.type = 'button';
			btn.addEventListener('click', function () {
				hide();
				action.run();
			});
			box.appendChild(btn);
		}

		box.appendChild(close);
		box.hidden = false;
		box._timer = setTimeout(hide, ms || (kind === 'error' || action ? 20000 : 8000));
	}

	// "3 comps renomeadas", "1 comp renomeada": o número e o plural (um / vários)
	function counted(n, one, many) {
		return n + ' ' + (n === 1 ? one : many);
	}

	/* =========================================================
	   Ações
	   ========================================================= */

	// Resultado das ações do host: { messages, data }. Mensagens das libs viram o aviso.
	function report(res, doneText) {
		var messages = res && res.messages ? res.messages : [];

		if (messages.length) {
			var failed = /^#PAD/.test(messages[0]);

			toast(failed ? 'error' : 'success', (failed ? messages.map(PAD_UTIL.errorText) : messages).join('\n'));
		}
		if (!messages.length && doneText) toast('success', doneText);
	}

	// O CATADOR e O TIPÓGRAFO trabalhando: o nome do botão vira a contagem e a linha embaixo enche.
	// p: 0 a 1 (null: esperando, sem contagem). progressEnd: volta o nome; ok: o brilho verde
	function progress(key, text, p) {
		var btn = $('btn-' + key);

		if (!btn) return;
		if (btn.dataset.group && $('drawer-' + btn.dataset.group)) progressOn($('drawer-' + btn.dataset.group), text, p);
		progressOn(btn, text, p);
	}

	function progressOn(btn, text, p) {

		var label = btn.querySelector('.bar-label');
		var line = btn.querySelector('.bar-progress');

		if (!btn.classList.contains('is-running')) {
			btn.classList.remove('is-done');
			btn.classList.add('is-running');
			btn.dataset.label = label ? label.textContent : '';
		}

		if (!line) {
			line = el('span', 'bar-progress');
			line.appendChild(el('i'));
			btn.appendChild(line);
		}

		if (label) label.textContent = text;
		line.classList.toggle('is-wait', p == null);
		line.firstChild.style.width = p == null ? '' : Math.round(Math.max(0.04, Math.min(1, p)) * 100) + '%';
	}

	function progressEnd(key, ok) {
		var btn = $('btn-' + key);

		if (!btn) return;
		if (btn.dataset.group && $('drawer-' + btn.dataset.group)) progressOff($('drawer-' + btn.dataset.group), ok);
		progressOff(btn, ok);
	}

	function progressOff(btn, ok) {
		if (!btn.classList.contains('is-running')) return;

		var label = btn.querySelector('.bar-label');
		var line = btn.querySelector('.bar-progress');

		btn.classList.remove('is-running');
		if (line) line.remove();
		if (label && btn.dataset.label) label.textContent = btn.dataset.label;

		if (ok) {
			btn.classList.add('is-done');
			setTimeout(function () {
				btn.classList.remove('is-done');
			}, 1000);
		}
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

		// resolver: instala do banco as que faltam neste computador; sobrou alguma sem arquivo em lugar nenhum,
		// abre a janela de fontes nela (para trocar). sem banco (ou sem Node), o jeito de antes: as da pasta de
		// fontes do projeto ou dos templates
		resolveFonts: async function () {
			var info = await call('fontsProject');

			// After Effects anterior ao 2024: sem a lista das fontes, o jeito de antes
			if (!info.supported) {
				await requireNetwork('PAD_004');
				report(await call('installFonts'), 'fontes enviadas para instalação.');
				return;
			}

			var missing = info.fonts.filter(function (f) {
				return f.missing;
			});

			// nada faltando: só avisa (sem erro, mesmo sem banco ou sem pasta de fontes)
			if (!missing.length) {
				toast('success', info.fonts.length ? 'fontes ok: ' + (info.fonts.length === 1 ? 'a fonte do projeto está instalada.' : 'as ' + info.fonts.length + ' fontes do projeto estão instaladas.') : 'o projeto não usa nenhuma fonte.');
				setTimeout(syncFonts, 300);
				return;
			}

			var installed = 0;

			// 1. a pasta de fontes do projeto: poucas e perto, a mais rápida
			progress('fontes', 'projeto', 0.15);

			try {
				var local = await call('fontsInstallProject');

				installed += local.installed;
			} catch (err) { }

			// 2. o que ainda falta: do banco (pelo nome PostScript). antes, o After Effects enxerga as recém-instaladas
			// (e as camadas passam para elas)
			if (installed) {
				await PAD_UTIL.syncFonts(call, 8);
				info = await call('fontsProject');
			}

			if (info.bank && PAD_FONTBANK.available() && info.fonts.some(function (f) {
				return f.missing;
			})) {
				progress('fontes', 'banco', 0.45);

				var checked = await PAD_FONTBANK.check(info);
				var files = checked.fonts.filter(function (f) {
					return f.state === 'install' && f.bankFile;
				}).map(function (f) {
					return f.bankFile;
				});

				if (files.length) {
					try {
						var res = await call('fontsInstall', { files: files });

						installed += res.installed + res.already;
					} catch (err) { }
				}
			}

			// 3. confere de novo, esperando o After Effects enxergar as novas (até ~15 s): as camadas com a fonte
			// substituída passam para a de verdade e o texto redesenha. o que ainda falta, só trocando por outra
			progress('fontes', 'conferindo', 0.8);
			if (installed) await PAD_UTIL.syncFonts(call, 15);

			var still = (await call('fontsProject')).fonts.filter(function (f) {
				return f.missing;
			});

			progressEnd('fontes', !still.length);

			if (still.length) {
				toast(installed ? 'success' : null, (installed ? 'fontes instaladas. ' : '') + (still.length === 1 ? '1 fonte não foi achada' : still.length + ' fontes não foram achadas') + ' (nem na pasta de fontes do projeto nem no banco): escolha outra na janela de fontes.');
				PAD_BRIDGE.openPanel(FONTS_PANEL_ID);
			} else {
				toast('success', missing.length === 1 ? 'a fonte que faltava foi instalada.' : 'as ' + missing.length + ' fontes que faltavam foram instaladas.');
			}

			setTimeout(syncFonts, 300);
		},

		// a janela de fontes do projeto: o estado de cada uma e a troca
		openFonts: function () {
			PAD_BRIDGE.openPanel(FONTS_PANEL_ID);
		},

		// O FORNO: as comps selecionadas (ou a aberta) na fila de render. o final, na pasta de output do projeto; o
		// preview, na pasta de previews das saídas, com a versão no nome. só põe na fila
		render: async function (preview) {
			var res = await call('renderQueue', { preview: !!preview });
			var what = preview ? counted(res.count, 'preview', 'previews') : counted(res.count, 'render final', 'renders finais');
			// só o nome da última pasta (o caminho inteiro enchia o aviso, mais ainda na barra em pé)
			var last = String(res.folder || '').replace(/[\\\/]+$/, '').split(/[\\\/]/).pop();
			var lines = [what + ' na fila de render' + (res.local ? ' · na pasta deste computador' : '') + ' · ' + UNDO_KEY + ' desfaz'];

			if (last) lines.push('na pasta ' + last);

			lines.push(res.names.join(' · '));
			// os avisos (pasta deste computador, o preset padrão) não são erro: o render está na fila
			toast(res.warnings.length ? 'warn' : 'success', lines.concat(res.warnings.map(PAD_UTIL.errorText)).join('\n'));
		},

		// o logo da Globo como shape layer na comp aberta (o mesmo do PROMO): animado ou parado
		logoGlobo: async function (animated) {
			var res = await call('logoGlobo', { animated: animated });

			if (res && res.data) toast('success', 'logo Globo ' + (animated ? 'animado' : 'parado') + ' em ' + res.data.comp + ' · ' + UNDO_KEY + ' desfaz');
		},

		openLastOutput: async function () {
			await requireNetwork('PAD_007');

			var res = await call('openLastOutput');

			if (res && res.data && res.data.note) toast('warn', res.data.note);
		},

		renameComps: async function () {
			var res = await call('renameComps');
			var n = res && res.data ? res.data.count : null;

			if (n === 0) report(res, 'nenhum nome mudou: as comps selecionadas já estavam no padrão.');
			else report(res, (n ? counted(n, 'item renomeado', 'itens renomeados') : 'comps renomeadas') + ' · ' + UNDO_KEY + ' desfaz');
		},

		renameOutputs: async function () {
			var res = await call('renameOutputs');
			var n = res && res.data ? res.data.count : null;

			if (n === 0) report(res, 'nenhuma saída mudou: a fila de render já estava no padrão.');
			else report(res, (n ? counted(n, 'saída de render renomeada', 'saídas de render renomeadas') : 'saídas de render renomeadas') + ' · ' + UNDO_KEY + ' desfaz');
		},

		// organizar: sem nenhuma comp selecionada nem com comentário, nada iria para as comps de render (tudo
		// cairia nas precomps). a barra avisa e deixa organizar assim mesmo; force pula a conferência
		organizeProject: async function (force) {
			if (force !== true) {
				var check = null;

				try {
					check = await call('organizeCheck');
				} catch (err) { } // host antigo (sem a conferência): organiza como antes

				if (check && check.comps && !check.selected && !check.tagged) {
					toast('warn', 'nenhuma comp marcada para o render: selecione no painel Project as comps que serão renderizadas e clique de novo.', 0, {
						label: 'organizar assim mesmo',
						run: function () {
							run($('btn-organizar'), function () {
								return actions.organizeProject(true);
							});
						}
					});

					return;
				}
			}

			var res = await call('organizeProject');
			var n = res && res.data ? res.data.count : null;

			if (n === 0) report(res, 'projeto já organizado: nada mudou de lugar.');
			else report(res, 'projeto organizado' + (n ? ': ' + counted(n, 'item mudou', 'itens mudaram') + ' de pasta' : '') + ' · ' + UNDO_KEY + ' desfaz');
		},

		openLabels: function () {
			PAD_BRIDGE.openPanel(LABELS_PANEL_ID);
		},

		// O ARQUIVISTA: renomear os arquivos e as pastas de um diretório. a janela abre vazia: a pasta é escolhida lá
		openFiles: function () {
			PAD_BRIDGE.openPanel(FILES_PANEL_ID);
		},

		// A FORMINHA: o preenchimento leve (duplica a comp aberta e preenche os layers de texto selecionados)
		openLight: function () {
			PAD_BRIDGE.openPanel(LIGHT_PANEL_ID);
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

		// coletar os arquivos do projeto na pasta dele (árvore da configuração > coletar): em lotes pequenos,
		// para a barra contar (e o After Effects respirar entre um e outro)
		collect: async function (path) {
			var res;
			var d;

			progress('coletar', '…', null);

			try {
				var plan = await call('collectBegin', { path: path || '' });
				var total = plan.ids.length;
				var sum = { target: plan.target, files: 0, sequences: 0, frames: 0, skipped: [], missing: plan.missing };

				for (var i = 0; i < total; i += COLLECT_BATCH) {
					progress('coletar', Math.min(total, i + 1) + '/' + total, i / total);

					var step = await call('collectStep', { target: plan.target, ids: plan.ids.slice(i, i + COLLECT_BATCH) });

					sum.files += step.files;
					sum.sequences += step.sequences;
					sum.frames += step.frames;
					sum.skipped = sum.skipped.concat(step.skipped);
				}

				progress('coletar', total ? total + '/' + total : 'salvando', total ? 1 : null);
				res = await call('collectEnd', sum);
				d = res.data || {};
			} catch (err) {
				progressEnd('coletar', false);
				throw err;
			}

			progressEnd('coletar', !(res.messages && res.messages.length));

			var parts = [];

			if (d.files) parts.push(d.files + (d.files === 1 ? ' arquivo' : ' arquivos'));
			if (d.sequences) parts.push(d.sequences + (d.sequences === 1 ? ' sequência' : ' sequências') + ' (' + d.frames + ' quadros)');
			if (d.fonts) parts.push('fontes');

			report(res, parts.length ? 'coletado: ' + parts.join(', ') + (d.saved ? '. projeto salvo.' : '. o projeto ainda não foi salvo (use Alterar).') : 'nada novo para coletar' + (d.saved ? ' (projeto salvo).' : '.'));
			setTimeout(function () {
				watchCollect(true);
			}, 300);
		},

		// a janela do coletar: as mídias do projeto (miniatura, tipo, estado), os que faltam e a migração
		openCollect: function () {
			PAD_BRIDGE.openPanel(COLLECT_PANEL_ID);
		},

		// O VERSIONADOR, clique esquerdo: importa um projeto do After (.aep / .aet) de qualquer versão no projeto aberto;
		// o de versão mais nova vira antes uma cópia na versão que está rodando (na pasta temporária)
		importAep: async function () {
			if (!PAD_AEPVERSION.available()) throw new Error('#PAD_100 - importar: este painel não tem acesso aos arquivos (Node).');

			var path = PAD_BRIDGE.pickFile('Importar um projeto do After Effects (qualquer versão)', ['aep', 'aet']);

			if (!path) return;

			var nodePath = require('path');
			var ae = await call('aeVersion');
			var res = await PAD_AEPVERSION.convert(path, ae.major, '');
			var from = res.converted ? ' (do AE ' + res.from + ' para o ' + res.to + ')' : '';
			var imported = await call('importAep', { path: res.path, name: nodePath.basename(path) });

			toast('success', 'importado' + from + ': ' + imported.name + (res.converted ? '. confira efeitos e expressões antes de usar.' : ''));
		},

		// O VERSIONADOR, clique direito: a janela para salvar o projeto em versões mais velhas do After
		openVersioner: function () {
			PAD_BRIDGE.openPanel(VERSIONER_PANEL_ID);
		},


		// janela do projeto: um projeto novo pela atração, ou o editor do atual
		project: function () {
			PAD_BRIDGE.openPanel(PROJECT_PANEL_ID);
		},

		// salvar: projeto com os dados do padeiro (na pasta dele) salva na hora; senão abre a janela PROJETO
		saveProject: async function () {
			var cur = await call('projectCurrent');

			if (!cur.created) {
				PAD_BRIDGE.openPanel(PROJECT_PANEL_ID);
				return;
			}

			await call('projectSaveNow');
			toast('success', 'projeto salvo: ' + cur.fileName);
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

	// as que só abrem uma janela (sem falar com o After Effects) rodam mesmo com o botão ocupado: o clique direito
	// do coletar abre O CATADOR enquanto uma coleta (do clique esquerdo) ainda está andando ou travou no meio
	['openCollect', 'openFonts', 'openVersioner', 'openLabels', 'project', 'openLight'].forEach(function (key) {
		actions[key].opensWindow = true;
	});

	/* =========================================================
	   Estrutura da barra
	   ========================================================= */

	// As ferramentas da barra; a ordem e os grupos vêm da configuração (aba LAYOUT).
	var TOOLS = [
		// a gaveta Templates (GROUPS): os dois cliques de antes, cada um num botão
		{ key: 'preencher', label: 'Preencher', icon: 'fill', name: 'A FORMA', tips: [L_CLICK + 'preencher um template e criar a fila de render'], left: actions.templates },
		{ key: 'duplicar', label: 'Duplicar', icon: 'duplicate', name: 'A FORMINHA', tips: [L_CLICK + 'duplicar a comp aberta e preencher os layers de texto selecionados'], left: actions.openLight },
		{ key: 'criar-template', label: 'Criar', icon: 'template-new', name: 'A FORMA', tips: [L_CLICK + 'criar um template a partir da comp aberta'], left: actions.createTemplate },
		{
			key: 'fontes',
			label: 'Fontes',
			icon: 'fonts',
			name: 'O TIPÓGRAFO',
			tips: [L_CLICK + 'instalar as fontes que faltam no projeto', R_CLICK + 'ver as fontes do projeto: trocar e copiar para uma pasta'],
			left: actions.resolveFonts,
			right: actions.openFonts
		},
		{
			key: 'projeto',
			label: 'Iniciar', // Alterar quando o projeto aberto já tem os dados do padeiro (paintProjectDot)
			icon: 'form',
			name: 'A CLAQUETE',
			tips: [L_CLICK + 'iniciar o projeto pela atração', R_CLICK + 'salvar o projeto na pasta dele'],
			left: actions.project,
			right: actions.saveProject
		},
		{
			key: 'coletar',
			label: 'Coletar',
			icon: 'collect',
			name: 'O CATADOR',
			tips: [L_CLICK + 'coletar os arquivos do projeto na pasta dele', R_CLICK + 'ver os arquivos do projeto e resolver os que faltam'],
			left: function () {
				return actions.collect('');
			},
			right: actions.openCollect
		},
		{
			key: 'render',
			label: 'Render',
			icon: 'render',
			name: 'O FORNO',
			tips: [L_CLICK + 'pôr o render final das comps na fila, na pasta de output', R_CLICK + 'pôr um preview das comps na fila, na pasta de previews'],
			left: function () {
				return actions.render(false);
			},
			right: function () {
				return actions.render(true);
			}
		},
		{
			key: 'importar',
			label: 'Importar AEP',
			icon: 'import',
			name: 'O VERSIONADOR',
			tips: [L_CLICK + 'importar um projeto do After de qualquer versão', R_CLICK + 'salvar o projeto em versões mais velhas do After'],
			left: function () {
				return actions.importAep();
			},
			right: actions.openVersioner
		},
		{
			key: 'pastas',
			label: 'Pastas',
			icon: 'folders',
			name: 'O ADAPTADOR',
			tips: [L_CLICK + 'abrir a pasta do último item da fila de render', R_CLICK + 'converter caminhos entre Windows e macOS'],
			left: actions.openLastOutput,
			right: actions.convertPaths
		},
		{
			key: 'renomear',
			label: 'Renomear',
			icon: 'rename',
			name: 'O ETIQUETADOR',
			tips: [L_CLICK + 'renomear as comps selecionadas', R_CLICK + 'renomear todas as saídas da fila de render'],
			left: actions.renameComps,
			right: actions.renameOutputs
		},
		{
			key: 'organizar',
			label: 'Organizar',
			icon: 'organize',
			name: 'O CONTRARREGRA',
			tips: [L_CLICK + 'organizar o projeto (selecione antes as comps que vão para o render)', R_CLICK + 'aplicar etiquetas (comentários) nos itens do projeto'],
			left: function () {
				return actions.organizeProject();
			},
			right: actions.openLabels
		},
		{
			key: 'arquivos',
			label: 'Arquivos',
			icon: 'files',
			name: 'O ARQUIVISTA',
			tips: [L_CLICK + 'renomear os arquivos e as pastas de uma pasta'],
			left: actions.openFiles
		},
		{
			key: 'buscar',
			label: 'Buscar',
			icon: 'search',
			name: 'O ACESSORISTA',
			tips: [L_CLICK + 'buscar caminhos de atrações, filmes, Teams e Trello', R_CLICK + 'buscar nos textos dos layers do projeto'],
			left: actions.searchPaths,
			right: actions.searchTexts
		},
		{
			key: 'logo-globo',
			label: 'Logo Globo',
			icon: 'logo-globo',
			name: 'LOGO GLOBO',
			tips: [L_CLICK + 'logo animado', R_CLICK + 'logo parado'],
			left: function () {
				return actions.logoGlobo(true);
			},
			right: function () {
				return actions.logoGlobo(false);
			}
		}
	];

	// as gavetas: as ferramentas de cada uma ficam juntas, na ordem da configuração (aba LAYOUT: arrastar dentro da
	// gaveta), com 2 ou mais à mostra; com uma só, ela fica solta; com nenhuma (ou 'gaveta:<chave>' escondida), a
	// gaveta some. o clique abre a gaveta; o clique direito faz a primeira ferramenta dela
	var GROUPS = [
		{ key: 'templates', label: 'Templates', icon: 'templates', name: 'TEMPLATES', members: PAD_UTIL.barGroups.templates },
		{ key: 'projeto', label: 'Projeto', icon: 'project', name: 'PROJETO', members: PAD_UTIL.barGroups.projeto },
		{ key: 'organizar', label: 'Organização', icon: 'organization', name: 'ORGANIZAÇÃO', members: PAD_UTIL.barGroups.organizar }
	];

	var DEFAULT_ITEMS = PAD_UTIL.barDefault;

	function toolDef(key) {
		return TOOLS.filter(function (t) {
			return t.key === key;
		})[0] || null;
	}

	// Executa a ação do botão com feedback de "ocupado" e erro no aviso.
	async function run(btn, handler) {
		if (!handler || btn.classList.contains('is-off')) return; // apagado (ex: o coletar sem projeto salvo): nenhum clique
		if (handler.opensWindow) return handler(); // abrir a janela não espera a outra ação do botão
		if (btn.classList.contains('is-busy')) return;

		btn.classList.add('is-busy');

		try {
			await handler();
		} catch (err) {
			toast('error', err.message);
		} finally {
			btn.classList.remove('is-busy');
			if (btn.classList.contains('is-running')) progressEnd(btn.id.replace(/^btn-/, ''), false); // parou no meio (erro)
		}
	}

	// clique = primeira ação, na hora (o duplo clique não abre mais a configuração: muita gente dá 2 cliques por reflexo)
	function bind(btn, left, right) {
		btn.addEventListener('click', function () {
			run(btn, left);
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

	var toolsLayout = ''; // a ordem e as escondidas desenhadas agora (só redesenha quando mudam)

	// o botão de uma ferramenta: o ícone numa caixa (a bolinha fica presa nela, no canto de baixo à direita, e anda
	// junto com o ícone em toda animação) e o nome
	function toolButton(def, id) {
		var btn = el('button', 'bar-btn');
		var ico = el('span', 'bar-ico');

		btn.type = 'button';
		btn.id = id || 'btn-' + def.key;
		btn.dataset.icon = def.icon;
		btn.dataset.baseTip = def.name + '\n\n' + def.tips.join('\n'); // NOME, uma linha em branco e os cliques
		btn.title = btn.dataset.baseTip;
		btn.setAttribute('aria-label', def.label);
		ico.appendChild(svgIcon(def.icon));
		btn.appendChild(ico);
		btn.appendChild(el('span', 'bar-label', def.label));

		return btn;
	}

	// a caixa do ícone (onde fica a bolinha)
	function iconBox(btn) {
		return btn.querySelector('.bar-ico') || btn;
	}

	/* ---------------------------------------------------------------
	   gavetas: o botão abre, ao lado (embaixo, na vertical), um contorno fino com o puxador (o ícone do grupo
	   parado no estado final do hover; no hover, a seta de recolher) e as ferramentas. uma aberta por vez;
	   fecham no puxador, no clique fora e no Esc
	   --------------------------------------------------------------- */

	var ARROW = '<path d="M19 12H5M11 6l-6 6 6 6"/>';

	// o ícone parado no estado final do hover, desenhado assim (sem as classes que o css anima)
	var STILL = {
		templates: function (svg) {
			var back = svg.querySelector('.tpl-back');
			var front = svg.querySelector('.tpl-front');

			if (back) back.setAttribute('transform', 'translate(1.3 -1.3)');
			if (front) front.setAttribute('transform', 'translate(-1 1)');
		},
		organization: function (svg) {
			var loose = svg.querySelector('.org-loose');

			if (loose) loose.removeAttribute('transform');
		},
		project: function (svg) {
			var top = svg.querySelector('.clap-top');

			if (top) top.setAttribute('transform', 'rotate(-15 3.5 10)');
		}
	};

	function stillIcon(name) {
		var svg = svgIcon(name);

		if (STILL[name]) STILL[name](svg);
		Array.prototype.forEach.call(svg.querySelectorAll('[class]'), function (n) {
			n.removeAttribute('class');
		});

		return svg;
	}

	function vertical() {
		return window.matchMedia('(max-aspect-ratio: 1/1)').matches;
	}

	// o lado do puxador é meio círculo: metade da altura da gaveta. na vertical ele fica em cima, com metade da
	// largura, até 22 px (num painel largo a gaveta tem a largura toda: meio círculo ficaria enorme)
	function roundDrawers() {
		var v = vertical();

		Array.prototype.forEach.call(document.querySelectorAll('.bar-drawer'), function (d) {
			var size = v ? Math.min(d.offsetWidth, 44) : d.offsetHeight;

			if (size) d.style.setProperty('--drawer-round', Math.round(size / 2) + 'px');
		});
		evenDrawers();
	}

	// todos os botões com um tamanho só: a largura do maior nome de gaveta (Organização), para as gavetas e as
	// ferramentas não ficarem cada uma de um tamanho (o nome que não couber ganha reticências). a conta é pelo nome, que tem a largura dele mesmo com o botão recolhido; sem
	// os nomes à vista (a barra em pé, estreita), nada muda
	function evenDrawers() {
		var bar = document.querySelector('.bar');
		var btns = document.querySelectorAll('.bar-drawer-btn');
		var plain = document.querySelector('.bar-btn:not(.bar-drawer-btn)');
		var widest = 0;

		if (!bar) return;

		Array.prototype.forEach.call(btns, function (btn) {
			var label = btn.querySelector('.bar-label');

			if (label && label.scrollWidth > widest) widest = label.scrollWidth;
		});

		// a largura mínima de um botão é lida sem o tamanho padrão aplicado (senão a conta se alimenta dela mesma)
		bar.classList.remove('has-drawer-w');

		if (!widest || btns.length < 2 || !plain) return;

		var cs = getComputedStyle(plain);
		// + 12: um respiro a mais de cada lado, para o nome mais comprido não encostar no contorno
		var w = Math.max(Math.ceil(widest + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) + 12, parseFloat(cs.minWidth) || 0);

		bar.style.setProperty('--drawer-w', w + 'px');
		bar.classList.add('has-drawer-w');
	}

	/* o resto da barra não sai do lugar quando uma gaveta abre ou fecha: o conteúdo da barra é centralizado, então
	   a gaveta crescendo empurraria tudo para os dois lados (na vertical, para cima e para baixo). o botão clicado
	   fica preso onde está na tela e só o que vem depois dele anda: a cada quadro da animação, o conteúdo é
	   deslocado (transform) o quanto o botão saiu do lugar, até onde há espaço na barra */
	var pin = { btn: null, x: 0, y: 0, tx: 0, ty: 0, raf: 0, until: 0, release: false };

	function pinStep() {
		var main = document.querySelector('.bar-main');
		var tools = $('tools');
		var links = $('links');

		if (!pin.btn || !document.contains(pin.btn)) {
			main.style.transform = '';
			pin.btn = null;
			pin.tx = pin.ty = 0;
			return;
		}

		var v = vertical();
		var r = pin.btn.getBoundingClientRect();
		// o espaço livre: entre o ícone da rede (a ponta de cima / da esquerda) e o pãozinho (a outra ponta)
		var before = document.querySelector('.bar-status').getBoundingClientRect();
		var after = document.querySelector('.bar-info').getBoundingClientRect();
		var first = (links && !links.hidden && links.offsetParent ? links : tools).getBoundingClientRect();
		var last = tools.getBoundingClientRect();
		var want;
		var lo;
		var hi;

		if (v) {
			want = pin.y - (r.top - pin.ty);
			lo = Math.min(0, before.bottom - (first.top - pin.ty));
			hi = Math.max(0, after.top - (last.bottom - pin.ty));
			pin.ty = Math.round(Math.max(lo, Math.min(hi, want)));
			pin.tx = 0;
		} else {
			want = pin.x - (r.left - pin.tx);
			lo = Math.min(0, before.right - (first.left - pin.tx));
			hi = Math.max(0, after.left - (last.right - pin.tx));
			pin.tx = Math.round(Math.max(lo, Math.min(hi, want)));
			pin.ty = 0;
		}

		main.style.transform = pin.tx || pin.ty ? 'translate(' + pin.tx + 'px, ' + pin.ty + 'px)' : '';

		if (Date.now() < pin.until) pin.raf = requestAnimationFrame(pinStep);
		else if (pin.release) {
			// fechada: a barra voltou ao lugar de antes; o que sobrar de deslocamento (faltou espaço na barra ao
			// abrir, ou trocou de gaveta) sai devagar, sem pulo
			if (pin.tx || pin.ty) {
				main.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';
				main.style.transform = '';
				setTimeout(function () {
					main.style.transition = '';
				}, 340);
			}
			pin.btn = null;
			pin.tx = pin.ty = 0;
		}
	}

	// prende o botão onde ele está agora, pela duração da animação (release: no fim, solta)
	function pinTo(btn, release) {
		// a referência é o começo do grupo do botão (o botão some com margem negativa: ele mesmo anda uns pixels)
		btn = btn.closest('.bar-section') || btn;

		var r = btn.getBoundingClientRect();

		cancelAnimationFrame(pin.raf);
		document.querySelector('.bar-main').style.transition = '';
		pin.btn = btn;
		pin.x = r.left;
		pin.y = r.top;
		pin.until = Date.now() + 520;
		pin.release = !!release;
		pin.raf = requestAnimationFrame(pinStep);
	}

	// o painel mudou de tamanho ou de sentido: o conteúdo volta ao centro
	window.addEventListener('resize', function () {
		cancelAnimationFrame(pin.raf);
		pin.btn = null;
		pin.tx = pin.ty = 0;
		document.querySelector('.bar-main').style.transform = '';
		// o tamanho medido para a animação (--btn-size) é o do sentido em que a gaveta abriu: virando a barra, a largura
		// de antes virava o limite da altura e o nome do botão saía para fora do contorno
		Array.prototype.forEach.call(document.querySelectorAll('.bar-drawer-btn'), function (btn) {
			btn.style.removeProperty('--btn-size');
		});
	});

	// a gaveta e o botão dela animam com o tamanho exato de cada um (--drawer-size e --btn-size, medidos na hora),
	// no mesmo tempo: um encolhe enquanto o outro cresce, sem um instante com os dois ocupando espaço
	function sizeDrawer(d, open) {
		var v = vertical();
		var btn = d.previousSibling;

		if (open) {
			// o tamanho de aberta, medido de verdade: abre um instante sem animação (nada é pintado), mede e volta.
			// pelo conteúdo fechado a conta saía menor quando as ferramentas quebram em mais linhas com a folga da
			// gaveta aberta: ela abria até ali, parava e só depois mostrava o resto
			btn.style.setProperty('--btn-size', (v ? btn.offsetHeight : btn.offsetWidth) + 'px');
			d.style.transition = 'none';
			d.classList.add('is-open', 'is-settled');
			d.style.setProperty('--drawer-size', (v ? d.offsetHeight : d.offsetWidth) + 'px');
			d.classList.remove('is-open', 'is-settled');
			void d.offsetWidth;
			d.style.transition = '';
		} else {
			d.style.setProperty('--drawer-size', (v ? d.offsetHeight : d.offsetWidth) + 'px');
		}

		void d.offsetWidth; // o tamanho de partida vale antes de a classe mudar (senão a animação sai do limite antigo)
	}

	function closeDrawers(except) {
		Array.prototype.forEach.call(document.querySelectorAll('.bar-drawer.is-open'), function (d) {
			if (d === except) return;

			if (!except && d.previousSibling) pinTo(d.previousSibling, true);
			clearTimeout(d.settle);
			d.classList.remove('is-settled');
			sizeDrawer(d, false);
			d.classList.remove('is-open');
			if (d.previousSibling) d.previousSibling.classList.remove('is-folded');
		});
	}

	function openDrawer(d) {
		if (!d || d.classList.contains('is-open')) return;

		// trocando de gaveta, fica preso o botão que vem primeiro na barra (o que está antes dele não anda)
		var open = document.querySelector('.bar-drawer.is-open');
		var first = open && (open.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING) ? open.previousSibling : d.previousSibling;

		pinTo(first);
		closeDrawers(d);
		sizeDrawer(d, true);
		d.classList.add('is-open');
		d.previousSibling.classList.add('is-folded');
		roundDrawers();
		// aberta: o contorno do foco dos botões pode sair da gaveta e ela acompanha o painel (sem o limite de
		// tamanho da animação); fechando, ela recolhe com o resto escondido
		d.settle = setTimeout(function () {
			d.classList.add('is-settled');
		}, 400);
	}

	// a gaveta que a pessoa deixou aberta fica lembrada (neste computador): ao reabrir o painel ela volta aberta.
	// só o que a pessoa faz conta (abrir no botão, recolher no puxador, clicar fora, Esc); o tour abre e fecha sem mexer
	var DRAWER_KEY = 'pad.bar.drawer';
	var drawerOpenedAt = 0; // quando a última gaveta foi aberta pelo botão (o clique de reflexo logo depois não fecha)

	function rememberDrawer(id) {
		try {
			if (id) localStorage.setItem(DRAWER_KEY, id);
			else localStorage.removeItem(DRAWER_KEY);
		} catch (err) { }
	}

	function restoreDrawer() {
		var id = '';

		try {
			id = localStorage.getItem(DRAWER_KEY) || '';
		} catch (err) { }

		var box = id && $(id);

		if (box && box.classList.contains('bar-drawer') && !document.body.classList.contains('is-touring')) openDrawer(box);
	}

	// key: o id (drawer-<key>); icon: o ícone do grupo; members: os botões que vão dentro
	function drawer(key, def, members) {
		var btn = toolButton(def, 'drawer-' + key);
		var box = el('span', 'bar-drawer');
		var handle = el('button', 'drawer-handle');
		var still = el('span', 'drawer-still');
		var arrow = el('span', 'drawer-arrow');

		btn.classList.add('bar-drawer-btn');
		btn.dataset.name = def.name;
		btn.setAttribute('aria-expanded', 'false');
		btn.addEventListener('click', function () {
			box.openedAt = drawerOpenedAt = Date.now();
			openDrawer(box);
			rememberDrawer(box.id);
			handle.focus({ preventScroll: true });
		});
		// o clique direito faz a primeira ferramenta da gaveta (sem abrir): o atalho de antes das gavetas
		btn.addEventListener('contextmenu', function (e) {
			e.preventDefault();
			if (members[0]) members[0].click();
		});

		handle.type = 'button';
		handle.setAttribute('aria-label', 'recolher a gaveta ' + def.label);
		still.appendChild(stillIcon(def.icon));
		arrow.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ARROW + '</svg>';
		handle.appendChild(still);
		handle.appendChild(arrow);
		handle.addEventListener('click', function () {
			// o puxador aparece onde estava o botão: o segundo clique de um duplo clique (reflexo) cairia nele e a
			// gaveta abriria e fecharia. logo depois de abrir, ele não recolhe
			if (Date.now() - (box.openedAt || 0) < 500) return;

			closeDrawers();
			rememberDrawer('');
			btn.focus({ preventScroll: true });
		});

		box.id = 'drawer-' + key + '-box';
		box.appendChild(handle);
		box.appendChild(el('i', 'drawer-sep'));
		members.forEach(function (m) {
			m.dataset.group = key;
			box.appendChild(m);
		});

		new MutationObserver(function () {
			btn.setAttribute('aria-expanded', box.classList.contains('is-open') ? 'true' : 'false');
		}).observe(box, { attributes: true, attributeFilter: ['class'] });

		// o lado redondo acompanha o tamanho da gaveta a todo momento (abrindo, o painel mudando de tamanho ou de
		// sentido): medir só ao abrir deixava o raio de um sentido valendo no outro
		if (window.ResizeObserver) new ResizeObserver(roundDrawers).observe(box);

		return [btn, box];
	}

	document.addEventListener('click', function (e) {
		// o segundo clique de um duplo clique cai onde o botão estava (ele já recolheu e o puxador ainda está
		// chegando): logo depois de abrir, um clique "fora" não fecha
		if (Date.now() - drawerOpenedAt < 500) return;

		if (!e.target.closest || !e.target.closest('.bar-drawer, .bar-drawer-btn')) {
			if (document.querySelector('.bar-drawer.is-open') && !document.body.classList.contains('is-touring')) rememberDrawer('');
			closeDrawers();
		}
	});

	// o tour: mostra a ferramenta (abre a gaveta dela; fora de uma, fecha as gavetas)
	window.PAD_BAR = {
		showTool: function (id) {
			var btn = id && $(id);
			var box = btn && btn.closest('.bar-drawer');

			if (box) openDrawer(box);
			else closeDrawers();
		}
	};
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && document.querySelector('.bar-drawer.is-open')) {
			if (!document.body.classList.contains('is-touring')) rememberDrawer('');
			closeDrawers();
		}
	});

	// Monta a barra na ordem da configuração: 'divider' separa os grupos; as escondidas ficam de fora e
	// um grupo sem nenhuma ferramenta não aparece (nem a divisória dele). as ferramentas de uma gaveta de grupo
	// (GROUPS) vão juntas para o lugar da primeira delas
	function buildTools(rawItems, rawHidden) {
		var layout = PAD_UTIL.barLayout({ items: rawItems, hidden: rawHidden }); // o formato de antes vira o de agora
		var items = layout.items;
		var hidden = layout.hidden;
		var key = items.join() + '|' + hidden.join();

		if (key === toolsLayout) return;

		toolsLayout = key;
		collectSync.state = null; // os botões são refeitos: a bolinha do coletar volta na próxima leitura

		var tools = $('tools');
		var sections = [[]];
		var shown = items.filter(function (item) {
			return item !== 'divider' && hidden.indexOf(item) < 0 && toolDef(item);
		});
		var groupOf = {};

		GROUPS.forEach(function (g) {
			// na ordem da barra (a de dentro da gaveta); a gaveta escondida inteira: nenhuma
			var members = hidden.indexOf('gaveta:' + g.key) >= 0 ? [] : shown.filter(function (m) {
				return g.members.indexOf(m) >= 0;
			});

			if (!members.length) shown = shown.filter(function (m) {
				return g.members.indexOf(m) < 0;
			});

			if (members.length > 1) members.forEach(function (m) {
				groupOf[m] = { group: g, members: members };
			});
		});

		tools.textContent = '';

		items.forEach(function (item) {
			if (item === 'divider') sections.push([]);
			else if (shown.indexOf(item) >= 0) {
				var g = groupOf[item];

				if (!g) sections[sections.length - 1].push({ tool: toolDef(item) });
				else if (g.members[0] === item) sections[sections.length - 1].push({ group: g });
			}
		});

		sections.filter(function (s) {
			return s.length;
		}).forEach(function (section, i) {
			if (i > 0) tools.appendChild(el('span', 'bar-divider'));

			var box = el('div', 'bar-section');

			section.forEach(function (entry) {
				if (entry.group) {
					var g = entry.group.group;
					var parts = drawer(g.key, { key: g.key, label: g.label, icon: g.icon, name: g.name, tips: [] }, entry.group.members.map(function (m) {
						var def = toolDef(m);
						var b = toolButton(def);

						bind(b, def.left, def.right);

						return b;
					}));

					box.appendChild(parts[0]);
					box.appendChild(parts[1]);
					return;
				}

				var def = entry.tool;

				var btn = toolButton(def);

				bind(btn, def.left, def.right);
				box.appendChild(btn);
			});

			tools.appendChild(box);
		});

		paintProjectDot(); // a barra montada de novo: a bolinha volta
		paintGroupDots();
		roundDrawers();
		restoreDrawer(); // a gaveta que estava aberta da última vez
	}

	/* ---------------------------------------------------------------
	   as bolinhas: presas à caixa do ícone (css). a do grupo mostra a pior das de dentro (laranja na frente do
	   verde) e a dica do grupo junta os avisos das de dentro
	   --------------------------------------------------------------- */

	function setDot(btn, state) {
		var box = iconBox(btn);
		var dot = box.querySelector('.bar-dot');

		if (!state) {
			if (dot) dot.remove();
			return null;
		}

		if (!dot) dot = box.appendChild(el('span', 'bar-dot'));
		dot.className = 'bar-dot is-' + state;

		return dot;
	}

	// as linhas de aviso de uma dica (as que começam com '! ')
	function warnings(btn) {
		return (btn.dataset.tip || btn.title || btn.getAttribute('data-tip') || '').split('\n').filter(function (line) {
			return /^!#? /.test(line);
		});
	}

	// a dica de uma ferramenta: a base (nome e cliques) e, depois de uma linha em branco, o estado
	function setTip(btn, note) {
		var text = btn.dataset.baseTip + (note ? '\n\n' + note : '');

		btn.dataset.tip = text;
		btn.title = text;
	}

	function paintGroupDots() {
		Array.prototype.forEach.call(document.querySelectorAll('.bar-drawer-btn'), function (gbtn) {
			var box = gbtn.nextSibling;

			if (!box || !box.classList.contains('bar-drawer')) return;

			var states = Array.prototype.map.call(box.querySelectorAll('.bar-dot'), function (d) {
				return /is-(missing|out)/.test(d.className) ? 'missing' : /is-ok/.test(d.className) ? 'ok' : '';
			});
			// a dica: o nome do grupo e as ferramentas de dentro, uma por linha; a que tem pendência, com a bolinha
			// laranja (o que falta fica na dica dela, dentro da gaveta)
			// de um lado, o que o clique direito na gaveta faz (a primeira de dentro); do outro, as que precisam abrir
			// a gaveta. a que tem pendência fica só na cor de atenção, sem bolinha (a bolinha fica na dica dela)
			var tools = Array.prototype.slice.call(box.querySelectorAll('.bar-btn'));
			var list = tools.slice(1).map(function (m) {
				return (warnings(m).length ? '~! ' : '~ ') + m.getAttribute('aria-label');
			});
			var text = gbtn.dataset.name + (tools[0] ? '\n\n' + R_CLICK + (warnings(tools[0]).length ? '! ' : '') + tools[0].getAttribute('aria-label') : '') + (list.length ? '\n' + list.join('\n') : '');

			setDot(gbtn, states.indexOf('missing') >= 0 ? 'missing' : states.indexOf('ok') >= 0 ? 'ok' : '');
			gbtn.dataset.baseTip = text;
			gbtn.dataset.tip = text;
			gbtn.title = text;
		});
	}

	/* ---------------------------------------------------------------
	   a bolinha do botão Projeto: verde = o projeto aberto está salvo com os dados do padeiro (atração…);
	   laranja = sem eles (salvo sem a atração, ou com itens e sem arquivo); sem bolinha = projeto vazio
	   --------------------------------------------------------------- */

	var projectState = '';
	var projectWhy = ''; // por que está laranja (o host diz: sem salvar, ou o arquivo sem a atração nos dados)
	var projectError = ''; // a conferência falhou: aparece na dica, em vez de a bolinha ficar parada no estado de antes

	// Iniciar (o projeto aberto não tem os dados do padeiro) ou Alterar (já tem): o nome, a dica e a bolinha
	function paintProjectDot() {
		var btn = $('btn-projeto');

		if (!btn) return;

		var has = projectState === 'ok' || projectState === 'out';
		var label = btn.querySelector('.bar-label');

		if (label && !btn.classList.contains('is-running')) label.textContent = has ? 'Alterar' : 'Iniciar';
		btn.setAttribute('aria-label', has ? 'Alterar' : 'Iniciar');
		btn.dataset.baseTip = 'A CLAQUETE\n\n' + L_CLICK + (has ? 'alterar os dados do projeto' : 'iniciar o projeto pela atração') + '\n' + R_CLICK + 'salvar o projeto na pasta dele';
		setTip(btn, projectError ? '!# Projeto:\n! não consegui conferir: ' + projectError : projectState === 'missing' ? '!# Projeto:\n! ainda sem atração: clique para iniciar' + (projectWhy ? '\n! ' + projectWhy : '') : projectState === 'out' ? '!# Projeto:\n! ' + (projectWhy ? projectWhy + ': clique para ver os dados e salvar' : 'salvo fora da pasta dele: clique e Salvar leva o .aep de volta') : '');
		setDot(btn, projectState);
		if (projectState) btn.setAttribute('data-project', projectState);
		else btn.removeAttribute('data-project');
		paintGroupDots();
	}

	/* =========================================================
	   Banco de fontes: as fontes do projeto aberto vão sozinhas para o banco e para a pasta de fontes do
	   projeto (js/fontbank.js, pelo Node, uma por vez). A bolinha no botão de fontes: laranja quando falta algo
	   (neste computador, no banco ou na pasta do projeto), verde quando está tudo certo.
	   ========================================================= */

	// a conferência das fontes: quando o projeto muda (watchProject: key) e no clique em Fontes, nunca de tempos em
	// tempos. auto: a chave deste computador (configuração > fontes)
	var fontsSync = { busy: false, timer: null, state: '', tip: '', key: null, auto: true };
	var FONT_LABELS = { up: 'enviando', install: 'para instalar', nofile: 'sem arquivo' };

	function paintFontsDot(state, tip) {
		var btn = $('btn-fontes');

		if (!btn) return;

		setTip(btn, state === 'missing' ? tip : '');
		setDot(btn, state);
		paintGroupDots();
	}

	function fontsSummary(checked, info) {
		var count = {};
		var parts = [];

		checked.fonts.forEach(function (f) {
			count[f.state] = (count[f.state] || 0) + 1;
		});
		Object.keys(FONT_LABELS).forEach(function (k) {
			if (count[k]) parts.push(count[k] + ' ' + FONT_LABELS[k]);
		});
		if (info.bank && !checked.bankOk) parts.push('banco fora do ar');
		if (count.up && !(info.upload && info.machineUpload)) parts.push('envio desligado');

		return parts.length ? '!# Fontes:\n' + parts.map(function (p) {
			return '! ' + p;
		}).join('\n') : '';
	}

	async function syncFonts() {
		if (fontsSync.busy || document.hidden || !window.PAD_FONTBANK || !PAD_FONTBANK.available()) return;

		// sem a rede (caiu ou modo local): o banco fica na rede, nem tenta (tocar num volume que sumiu faz o macOS
		// avisar a cada vez). volta sozinho quando a rede voltar
		if (netState === 'offline' || netState === 'forced') {
			fontsSync.key = ''; // confere de novo quando a rede voltar (o próximo olhar no projeto)
			return;
		}

		fontsSync.busy = true;
		clearTimeout(fontsSync.timer);

		try {
			var info = await call('fontsProject');

			if (!info.supported || !info.fonts.length) {
				paintFontsDot('', '');
			} else {
				var checked = await PAD_FONTBANK.check(info);
				var bad = checked.fonts.some(function (f) {
					return f.state !== 'ok';
				}) || (info.bank && !checked.bankOk);

				paintFontsDot(bad ? 'missing' : 'ok', fontsSummary(checked, info));

				// o envio: uma fonte por vez, até não faltar nenhuma
				if (info.upload && info.machineUpload) {
					var pending = checked.fonts.filter(function (f) {
						return f.state === 'up';
					});

					// a barra conta o envio (O TIPÓGRAFO copiando para o banco e a pasta do projeto)
					for (var i = 0; i < pending.length; i++) {
						progress('fontes', (i + 1) + '/' + pending.length, i / pending.length);

						try {
							await PAD_FONTBANK.upload(info, pending[i], checked);
						} catch (err) { }
					}

					if (pending.length) progressEnd('fontes', true);

					if (pending.length) {
						checked = await PAD_FONTBANK.check(info);
						bad = checked.fonts.some(function (f) {
							return f.state !== 'ok';
						}) || (info.bank && !checked.bankOk);
						paintFontsDot(bad ? 'missing' : 'ok', fontsSummary(checked, info));
					}
				}
			}
		} catch (err) { }

		fontsSync.busy = false;
	}

	/* =========================================================
	   Coletar: a mesma bolinha das fontes. laranja quando o projeto tem arquivo fora das pastas de projetos
	   (fora da rede), verde quando está tudo na rede; o balão diz quantos e quais
	   ========================================================= */

	var COLLECT_EVERY = 5000;
	var collectSync = { state: null, timer: null };

	function paintCollectDot(res) {
		var btn = $('btn-coletar');

		if (!btn) return;
		var tip = '';

		// sem o .aep salvo e sem a pasta do projeto nos dados não há para onde coletar: o botão fica apagado
		var off = !!res && res.ready === false;

		btn.classList.toggle('is-off', off);
		btn.setAttribute('aria-disabled', off ? 'true' : 'false');
		if (off) tip = '!# Coletar:\n! inicie ou salve o projeto: os arquivos vão para a pasta dele';
		else if (res && res.state === 'out') tip = '!# Arquivos fora:\n' + kindLines(res);
		setTip(btn, tip);
		setDot(btn, off ? '' : res && res.state);
		paintGroupDots();
	}

	// os arquivos fora, por tipo: '! 1 imagem', '! 2 áudios'… (sem os tipos, só o total)
	var KIND_NAMES = { imagens: ['imagem', 'imagens'], videos: ['vídeo', 'vídeos'], audio: ['áudio', 'áudios'], sequencias: ['sequência', 'sequências'], dados: ['dado', 'dados'] };

	function kindLines(res) {
		var lines = Object.keys(KIND_NAMES).filter(function (k) {
			return res.kinds && res.kinds[k];
		}).map(function (k) {
			return '! ' + counted(res.kinds[k], KIND_NAMES[k][0], KIND_NAMES[k][1]);
		});

		return lines.length ? lines.join('\n') : '! ' + counted(res.local, 'arquivo', 'arquivos');
	}

	// force: refaz a conta (ao abrir a barra e depois do coletar); de tempos em tempos, o host só refaz quando o
	// projeto foi salvo (ou trocado): a conta passa por todas as mídias e não roda enquanto se trabalha
	async function watchCollect(force) {
		clearTimeout(collectSync.timer);

		if (!document.hidden) {
			try {
				var res = await call('collectStatus', { force: !!force });
				var key = JSON.stringify(res);

				if (key !== collectSync.state) {
					collectSync.state = key;
					paintCollectDot(res);
				}
			} catch (err) { }
		}

		collectSync.timer = setTimeout(watchCollect, COLLECT_EVERY);
	}

	// force: confere mesmo com a barra "escondida". com outra janela do padeiro na frente (a claquete que acabou de
	// criar o projeto), o painel pode se dizer escondido e a bolinha ficava no estado de antes; por isso, escondida,
	// a barra ainda confere, só que mais devagar (1 a cada 3 vezes), e sempre que o mouse entra nela
	var projectSkips = 0;

	async function watchProject(force) {
		if (document.hidden && force !== true && ++projectSkips % 3) return;

		try {
			var res = await call('projectStatus');

			if (res.state !== projectState || (res.why || '') !== projectWhy || projectError) {
				projectState = res.state;
				projectWhy = res.why || '';
				projectError = '';
				paintProjectDot();
			}

			// as fontes: conferidas só quando o projeto muda (abrir, salvar, trocar), e só com a chave ligada
			// (configuração > fontes, neste computador). quem anima uma comp sem texto não paga nada
			fontsSync.auto = res.fontsCheck !== false;
			if (!fontsSync.auto) paintFontsDot('', '');
			if (fontsSync.auto && res.key !== fontsSync.key) {
				fontsSync.key = res.key;
				syncFonts();
			}
		} catch (err) {
			var msg = String((err && err.message) || err);

			if (msg !== projectError) {
				projectError = msg;
				paintProjectDot();
			}
		}
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
			btn.title = link.name + (link.personal ? ' (meu link, só neste computador)' : ''); // só o nome: o endereço e os 2 cliques ficam de fora
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

		var cols = ICON_MEDIA.matches ? 1 : 3;
		var rest = box.children.length % cols;

		if (rest && box.children[rest]) box.insertBefore(el('i', 'links-break'), box.children[rest]); // sem linha cheia: nada
	}

	// 100% vertical e bem estreita: só os ícones (css); a quebra dos links muda junto
	var ICON_MEDIA = window.matchMedia('(max-aspect-ratio: 1/1) and (max-width: 99px)');

	if (ICON_MEDIA.addListener) ICON_MEDIA.addListener(placeLinksBreak);

	// Rede ou modo local, no começo da barra: o servidor (rede); o servidor com o alerta amarelo (a rede não
	// está respondendo: o padeiro usa as cópias deste computador); o notebook (modo local, ligado na configuração).
	var NET_ICONS = {
		network: '<svg viewBox="0 0 24 24" aria-hidden="true" class="anim-server"><g class="rack r1"><rect x="4" y="4.5" width="16" height="6" rx="1.5" /><path class="led" d="M7.5 7.5h.01" /></g><g class="rack r2"><rect x="4" y="13.5" width="16" height="6" rx="1.5" /><path class="led" d="M7.5 16.5h.01" /></g></svg>', // o servidor (o mesmo da aba drives)
		local: '<svg viewBox="0 0 24 24" aria-hidden="true" class="anim-laptop"><rect class="lid" x="5" y="5.5" width="14" height="9.5" rx="1.8" /><path d="M3 18.5h18" /></svg>'
	};
	var WARN_BADGE = '<svg viewBox="0 0 11 11" aria-hidden="true"><circle class="badge-warn" cx="5.5" cy="5.5" r="5.5" /><path class="badge-mark" d="M5.5 2.7v3.3" /><circle class="badge-dot" cx="5.5" cy="8.1" r=".85" /></svg>';
	var netState = '';

	function applyNet(local, forced) {
		var key = local ? (forced ? 'forced' : 'offline') : 'network';
		var btn = $('net-status');

		if (key === netState) return;

		netState = key;
		btn.hidden = false;
		btn.className = 'bar-icon bar-net is-' + key;
		btn.innerHTML = NET_ICONS[key === 'forced' ? 'local' : 'network'];

		if (key === 'offline') {
			var badge = el('span', 'bar-link-badge bar-net-badge');

			badge.innerHTML = WARN_BADGE;
			btn.appendChild(badge);
		}

		var text = {
			network: 'rede: configuração, templates e busca vêm da rede',
			forced: 'modo local, ligado por você (configuração > meu usuário): nada tenta a rede',
			offline: 'modo local: a rede não está respondendo. o padeiro usa as cópias deste computador e volta sozinho quando a rede voltar'
		}[key];

		btn.title = text + '\n' + L_CLICK + (key === 'forced' ? 'configuração > meu usuário' : 'configuração > rede');
		btn.setAttribute('aria-label', text);
	}

	// os links também podem ser escondidos (configuração > layout)
	function applyLinksHidden(hidden) {
		if (hidden.indexOf('links') < 0) return;

		$('links').hidden = true;
		$('links-divider').hidden = true;
	}

	async function loadLinks() {
		if (document.hidden) return;

		try {
			var res = await call('barLinks');

			applyNet(!!res.localMode, !!res.localForced);

			if (res.stamp === linksStamp) return;

			linksStamp = res.stamp;
			renderLinks(res.links, res.personal || []);
			buildTools(res.items && res.items.length ? res.items : DEFAULT_ITEMS, res.hidden || []);
			applyLinksHidden(res.hidden || []);
		} catch (err) { }
	}

	/* =========================================================
	   O código novo: a barra é um painel que fica aberto o dia todo, e o código trocado na rede só entrava ao
	   reiniciar o After (a barra seguia com o de antes, e a bolinha do Projeto errava). ela confere a data dos
	   próprios arquivos (os da página e os do host) e se recarrega quando mudam: ao entrar o mouse (no máximo uma
	   vez a cada 30 s) e a cada 5 minutos. sem a rede, ou trabalhando (coletar, fontes, tour), espera
	   ========================================================= */

	var CODE_FILES = ['client/bar.html', 'client/js/bar.js', 'client/css/bar.css', 'client/js/bridge.js', 'client/js/util.js', 'client/js/tooltip.js', 'host/index.jsx', 'host/api.jsx', 'host/project.jsx', 'host/collect.jsx', 'host/productions.jsx'];
	var code = { stamp: null, at: 0, when: 0 };

	// a pasta extension (a de cima da client desta página), como o cep.fs a entende
	function codeRoot() {
		var path = decodeURIComponent(location.pathname).replace(/\/client\/[^/]*$/, '');

		if (location.host) return '//' + location.host + path; // Windows: \\servidor\share
		if (/^\/[A-Za-z]:\//.test(path)) return path.slice(1); // Windows: C:/...

		return path;
	}

	// as datas dos arquivos do código, ou null se algum não pôde ser lido (a rede caiu: não é hora de recarregar)
	function codeStamp() {
		if (!window.cep || !window.cep.fs || window.PAD_MOCK_HOST) return null;

		var root = codeRoot();
		var out = [];
		var last = 0;

		for (var i = 0; i < CODE_FILES.length; i++) {
			var st = window.cep.fs.stat(root + '/' + CODE_FILES[i]);

			if (!st || st.err !== 0 || !st.data) return null;

			var t = +new Date(st.data.modificationTime);

			out.push(t);
			if (t > last) last = t;
		}
		code.when = last;

		return out.join('|');
	}

	function watchCode() {
		var now = Date.now();

		if (now - code.at < 30000) return;
		code.at = now;

		var stamp;

		try {
			stamp = codeStamp();
		} catch (err) {
			return;
		}

		if (!stamp) return;
		if (code.stamp === null) {
			code.stamp = stamp;

			return paintCodeDate();
		}
		if (stamp === code.stamp) return;
		// trabalhando (a contagem do coletar, as fontes) ou no tour: espera a próxima
		if (document.querySelector('.bar-btn.is-running') || document.body.classList.contains('is-touring')) return;

		location.reload();
	}

	// a data do código em uso, na dica do pãozinho: dá para ver se a barra já pegou a atualização
	function paintCodeDate() {
		var logo = $('logo');

		if (!logo || !code.when) return;

		var d = new Date(code.when);
		var pad = function (n) {
			return (n < 10 ? '0' : '') + n;
		};
		var line = 'código de ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
		var base = String(logo.dataset.tip || logo.title || '').replace(/\n\ncódigo de [^\n]*$/, '');

		logo.dataset.tip = base + '\n\n' + line;
		logo.title = base + '\n\n' + line;
	}

	/* =========================================================
	   Início
	   ========================================================= */

	/* o pãozinho no fim do ano: o gorro de 1º a 25 de dezembro (até 23:59), os fogos de 26 a 31 e, em 1º de janeiro,
	   o de sempre. pela data do computador, conferida a cada minuto (vira sozinho à meia-noite). com a logo trocada
	   na aparência, nada muda. no navegador, ?season=xmas ou ?season=fogos mostra cada um */
	var SEASON_COLORS = ['#ffd75e', '#7cd1ff', '#ff7ac8', '#9cff9a', '#ffffff', '#ffa94d'];
	var season = { name: null, timer: null };

	function seasonNow() {
		var test = /[?&]season=(xmas|fogos)/.exec(location.search);
		var now = new Date();

		if (test) return test[1];
		if (now.getMonth() !== 11) return '';

		return now.getDate() <= 25 ? 'xmas' : 'fogos';
	}

	// um estouro: faíscas em círculo a partir de um ponto, numa cor (às vezes duas)
	function seasonBurst(fx) {
		var w = fx.clientWidth;
		var h = fx.clientHeight;

		if (!w || !h) return;

		var burst = el('div', 'bar-fx-burst');
		var c1 = SEASON_COLORS[Math.floor(Math.random() * SEASON_COLORS.length)];
		var c2 = Math.random() < 0.4 ? SEASON_COLORS[Math.floor(Math.random() * SEASON_COLORS.length)] : c1;
		var r = 14 + Math.random() * 10;

		burst.style.left = Math.round(w * (0.12 + Math.random() * 0.76)) + 'px';
		burst.style.top = Math.round(h * (0.12 + Math.random() * 0.35)) + 'px';
		for (var i = 0; i < 12; i++) {
			var a = (Math.PI * 2 * i) / 12 + Math.random() * 0.2;
			var spark = el('i', 'bar-fx-spark');

			spark.style.setProperty('--c', i % 2 ? c2 : c1);
			spark.style.setProperty('--x', (Math.cos(a) * r).toFixed(1) + 'px');
			spark.style.setProperty('--y', (Math.sin(a) * r).toFixed(1) + 'px');
			spark.style.setProperty('--d', Math.round(Math.random() * 60) + 'ms');
			burst.appendChild(spark);
		}
		fx.appendChild(burst);
		setTimeout(function () {
			burst.remove();
		}, 1400);
	}

	function paintSeason() {
		var logo = $('logo');
		var loaf = logo && logo.querySelector('.bar-loaf');
		var name = loaf && loaf.style.display !== 'none' ? seasonNow() : '';

		if (!logo || name === season.name) return;

		season.name = name;
		logo.classList.toggle('is-xmas', name === 'xmas');
		clearInterval(season.timer);

		var fx = logo.querySelector('.bar-fx');

		if (name !== 'fogos') {
			if (fx) fx.remove();
			return;
		}

		if (!fx) {
			fx = el('div', 'bar-fx');
			fx.setAttribute('aria-hidden', 'true');
			logo.appendChild(fx);
		}

		var pair = function () {
			if (document.hidden) return; // escondida, não gasta nada
			seasonBurst(fx);
			setTimeout(function () {
				seasonBurst(fx);
			}, 380);
		};

		pair();
		season.timer = setInterval(pair, 2600);
	}

	// logo escolhida na configuração (aparência) no lugar do pãozinho
	function applyLogo(theme) {
		var logo = $('logo');
		var loaf = logo.querySelector('.bar-loaf');
		var img = logo.querySelector('.bar-logo-img');
		var src = theme && theme.logo ? PAD_UTIL.decodeIcon(theme.logo) : null;

		if (!src) {
			if (img) img.remove();
			loaf.style.display = '';
			paintSeason();
			return;
		}

		if (!img) {
			img = el('img', 'bar-logo-img');
			img.alt = '';
			logo.insertBefore(img, loaf);
		}

		img.src = src;
		loaf.style.display = 'none';
		paintSeason();
	}

	async function init() {

		document.addEventListener('pad-theme', function (e) {
			applyLogo(e.detail);
		});
		if (window.PAD_THEME) applyLogo(PAD_THEME.current());
		paintSeason();
		setInterval(paintSeason, 60000); // a virada do dia (25 → 26, 31 → 1º)

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
		watchProject();
		setInterval(watchProject, 2000); // o projeto aberto (a bolinha do Projeto): abrir, salvar, criar pela atração
		// as bolinhas ficam presas ao ícone (css); ao virar a barra, o lado redondo das gavetas é medido de novo
		window.addEventListener('resize', roundDrawers);
		window.addEventListener('focus', watchProject);
		document.documentElement.addEventListener('mouseenter', function () {
			watchProject(true);
		});
		window.addEventListener('focus', loadLinks);
		watchCode();
		setInterval(watchCode, 5 * 60000);
		document.documentElement.addEventListener('mouseenter', watchCode);
		window.addEventListener('focus', syncFonts);
		watchCollect(true); // os arquivos fora da rede (a bolinha do coletar)
		window.addEventListener('focus', function () {
			watchCollect(false);
		});

		// o servidor (rede, ou rede fora) abre a aba REDE; o notebook (modo local ligado por você), MEU USUÁRIO
		$('net-status').addEventListener('click', function () {
			actions.config(netState === 'forced' ? 'machine' : 'network');
		});

		$('logo').addEventListener('click', function () {
			PAD_BRIDGE.openUrl(DOCS_URL);
		});
		// o tour da turma de novo (js/tour.js)
		$('logo').addEventListener('contextmenu', function (e) {
			e.preventDefault();
			PAD_TOUR.start({});
		});
		// o tour achou (ou criou) a configuração: a barra relê os links e as ferramentas
		document.addEventListener('pad-tour-setup', function () {
			linksStamp = null;
			loadLinks();
		});

		try {
			var info = await call('ping');

			$('version').textContent = 'v' + info.version;

			// sem a configuração da equipe (nem a cópia deste computador): a primeira vez, pelo tour
			var setup = await call('setupStatus');

			if (setup.needed) PAD_TOUR.start({ setup: true, user: setup.user });

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
