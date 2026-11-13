/*

---------------------------------------------------------------
> O PADEIRO — barra principal
---------------------------------------------------------------

Clique esquerdo: a ação principal da ferramenta, na hora. Clique direito: as opções dela (a gaveta), na própria
barra: tudo o que a ferramenta faz, com nome, e a configuração dela. O clique direito nunca executa nada sozinho.
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


	// A linha de status da barra: o resultado da última ação, embaixo dos botões (não cobre nenhum). Com a barra
	// baixa demais ou vertical, o CSS mostra como um aviso flutuante. Um clique no texto abre a mensagem inteira.
	// kind: 'success' | 'error' | 'warn' | null; action: { label, run } (um botão no fim, ex: "organizar assim mesmo")
	function toast(kind, text, ms, action) {
		lineMessage(); // o aviso tem a vez na linha de status: a dica do botão sai
		var box = $('toast');
		var dot = el('i', 'bar-status-dot');
		var body = el('span', 'toast-text', kind === 'error' ? PAD_UTIL.errorText(text) : text);
		var close = el('button', 'toast-close', '×');

		clearTimeout(box._timer);

		function hide() {
			clearTimeout(box._timer);
			box.hidden = true;
		}

		body.addEventListener('click', function () {
			box.classList.toggle('is-open');
		});

		close.type = 'button';
		close.setAttribute('aria-label', 'fechar aviso');
		close.addEventListener('click', hide);

		box.className = 'bar-toast' + (kind ? ' is-' + kind : '');
		box.textContent = '';
		box.appendChild(dot);
		box.appendChild(body);

		[].concat(action || []).forEach(function (a) {
			var btn = el('button', 'bar-status-action', a.label);

			btn.type = 'button';
			btn.addEventListener('click', function () {
				hide();
				a.run();
			});
			box.appendChild(btn);
		});

		box.appendChild(close);
		box.hidden = false;
		box._timer = setTimeout(hide, ms || (kind === 'error' || action ? 20000 : 8000));
	}

	/* ---------------------------------------------------------------
	   a linha de status (barra horizontal com altura para ela): embaixo dos botões, três coisas no mesmo lugar,
	   nesta ordem de vez: o aviso da última ação (toast), a dica do botão sob o mouse e, em repouso, a
	   conferência do projeto (o que as bolinhas sabem, por extenso)
	   --------------------------------------------------------------- */

	var LINE_QUERY = '(min-aspect-ratio: 1001/1000) and (min-height: 76px)'; // a mesma do bar.css
	var lineState = { hinted: null, blocked: null };

	function lineOn() {
		return !!(window.matchMedia && window.matchMedia(LINE_QUERY).matches) && !document.body.classList.contains('is-touring');
	}

	// a dica do botão (o mesmo texto do balão: NOME, ◖ → …, ◗ → … e o estado) numa linha só
	function lineHint(target, text) {
		var box = $('line-hint');
		var notes = [];

		box.textContent = '';

		String(text).split('\n').forEach(function (line, i) {
			var m = /^\s*([◖◗])\s*→\s*(.*)$/.exec(line);

			if (m) {
				var click = el('span', 'bar-line-click');

				click.appendChild(PAD_TIP.mouse(m[1] === '◖' ? 'l' : 'r'));
				click.appendChild(el('span', '', m[2]));
				box.appendChild(click);
			} else if (line.trim() && i === 0) {
				// "Renomear · O ETIQUETADOR": a função na frente; a turma vai para o fim, com o estado (corta primeiro)
				var name = line.trim().split(' · ');

				box.appendChild(el('b', 'bar-line-name', name[0]));
				if (name[1]) notes.push(name.slice(1).join(' · ').toLowerCase());
			} else if (line.trim()) {
				notes.push(line.trim());
			}
		});

		// o estado (o que a bolinha diz) antes da turma: é o que importa ler
		if (notes.length) box.appendChild(el('span', 'bar-line-note', notes.slice(1).concat(notes[0]).join(' · ')));

		lineState.hinted = target;
		$('bar').setAttribute('data-line', 'hint');
	}

	function lineClear() {
		lineState.hinted = null;
		$('bar').removeAttribute('data-line');
	}

	// um aviso novo: a dica sai e não volta para o mesmo botão até o mouse sair dele (o clique que gerou o aviso
	// deixa o mouse em cima: sem isso, a dica cobriria o resultado)
	function lineMessage() {
		lineState.blocked = lineState.hinted || lineState.blocked;
		lineClear();
	}

	// o gancho das dicas (tooltip.js): com a linha à vista, a dica vai nela e o balão não abre
	PAD_TIP.hook = function (target, text, why) {
		if (!target) {
			if (why === 'leave') lineState.blocked = null;
			else lineState.blocked = lineState.hinted || lineState.blocked; // clicou: espera o resultado
			lineClear();
			return false;
		}

		if (!lineOn() || !target.closest('#bar') || target.closest('.bar-toast')) return false;
		if (target.closest('.bar-line')) return true; // os itens da conferência já dizem o que são
		if (target === lineState.blocked && !$('toast').hidden) return true;

		lineState.blocked = null;
		lineHint(target, text);

		return true;
	};

	// a conferência do projeto: o que cada bolinha sabe (projeto, fontes, arquivos). clicar num item leva à
	// ferramenta dele; com o mouse em cima, o botão dela acende
	var check = { project: '', fonts: { state: '', tip: '' }, collect: null };

	function checkItem(kind, text, key, go) {
		var item = el('button', 'bar-check is-' + kind);

		item.type = 'button';
		item.appendChild(el('i', 'bar-status-dot'));
		item.appendChild(el('span', '', text));

		if (!go) {
			item.disabled = true;
			return item;
		}

		item.addEventListener('click', go);
		item.addEventListener('mouseenter', function () {
			var btn = $('btn-' + key);

			if (btn) btn.classList.add('is-pointed');
		});
		item.addEventListener('mouseleave', function () {
			var btn = $('btn-' + key);

			if (btn) btn.classList.remove('is-pointed');
		});

		return item;
	}

	function paintCheck() {
		var box = $('line-check');

		if (!box) return;

		var todo = [];
		var fine = [];

		if (check.project === 'ok') fine.push('projeto');
		else if (check.project) {
			todo.push(checkItem('warn', 'projeto sem atração nem pasta', 'projeto', function () {
				actions.project();
			}));
		}

		if (check.fonts.state === 'ok') fine.push('fontes');
		else if (check.fonts.state) {
			todo.push(checkItem('warn', check.fonts.tip || 'fontes faltando', 'fontes', function () {
				run($('btn-fontes'), actions.resolveFonts);
			}));
		}

		if (check.collect && check.collect.state === 'ok') fine.push('arquivos');
		else if (check.collect && check.collect.state === 'out') {
			todo.push(checkItem('warn', counted(check.collect.local, 'arquivo fora', 'arquivos fora') + ' das pastas de projetos', 'coletar', function () {
				actions.openCollect();
			}));
		}

		box.textContent = '';
		todo.forEach(function (item) {
			box.appendChild(item);
		});

		// tudo certo: uma linha só, discreta, com o que foi conferido
		if (!todo.length && fine.length) box.appendChild(checkItem('ok', 'em ordem: ' + fine.join(', ').replace(/, ([^,]*)$/, ' e $1')));
		else if (fine.length) box.appendChild(checkItem('ok', fine.join(', ').replace(/, ([^,]*)$/, ' e $1') + ' ok'));
	}

	// o "desfazer" do aviso: um botão de verdade (o atalho depende do sistema, Cmd+Z no macOS e Ctrl+Z no
	// Windows, e com o foco na barra nem sempre chega ao After Effects). name: o nome do grupo de desfazer no host
	function undoAction(name) {
		return {
			label: 'desfazer',
			run: async function () {
				try {
					await call('undo', { name: name });
					toast('success', 'desfeito.', 3000);
					setTimeout(watchCollect, 300);
				} catch (err) {
					toast('error', err.message);
				}
			}
		};
	}

	// "3 comps renomeadas", "1 comp renomeada": o número e o plural (um / vários)
	function counted(n, one, many) {
		return n + ' ' + (n === 1 ? one : many);
	}

	/* =========================================================
	   Ações
	   ========================================================= */

	// Resultado das ações do host: { messages, data }. Mensagens das libs viram o aviso.
	// action: o botão no fim do aviso (o "desfazer" das ações que dá para desfazer)
	function report(res, doneText, action) {
		var messages = res && res.messages ? res.messages : [];

		if (messages.length) {
			var failed = /^#PAD/.test(messages[0]);

			toast(failed ? 'error' : 'success', (failed ? messages.map(PAD_UTIL.errorText) : messages).join('\n'));
		}
		if (!messages.length && doneText) toast('success', doneText, 0, action);
	}

	// O CATADOR e O TIPÓGRAFO trabalhando: o nome do botão vira a contagem e a linha embaixo enche.
	// p: 0 a 1 (null: esperando, sem contagem). progressEnd: volta o nome; ok: o brilho verde
	function progress(key, text, p) {
		var btn = $('btn-' + key);

		if (!btn) return;

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

		if (!btn || !btn.classList.contains('is-running')) return;

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

		openLastOutput: async function () {
			await requireNetwork('PAD_007');
			await call('openLastOutput');
		},

		renameComps: async function () {
			var res = await call('renameComps');
			var n = res && res.data ? res.data.count : null;

			if (n === 0) report(res, 'nenhum nome mudou: as comps selecionadas já estavam no padrão.');
			else report(res, n ? counted(n, 'item renomeado', 'itens renomeados') : 'comps renomeadas', undoAction('renomear comps'));
		},

		renameOutputs: async function () {
			var res = await call('renameOutputs');
			var n = res && res.data ? res.data.count : null;

			if (n === 0) report(res, 'nenhuma saída mudou: a fila de render já estava no padrão.');
			else report(res, n ? counted(n, 'saída de render renomeada', 'saídas de render renomeadas') : 'saídas de render renomeadas', undoAction('renomear outputs'));
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
			else report(res, 'projeto organizado' + (n ? ': ' + counted(n, 'item mudou', 'itens mudaram') + ' de pasta' : ''), undoAction('organização automática do projeto'));
		},

		openLabels: function () {
			PAD_BRIDGE.openPanel(LABELS_PANEL_ID);
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
		// force: coleta mesmo com arquivos faltando (a barra avisa antes e deixa escolher)
		collect: async function (path, force) {
			var res;
			var d;

			progress('coletar', '…', null);

			try {
				var plan = await call('collectBegin', { path: path || '' });
				var total = plan.ids.length;

				if (plan.missing && plan.missing.length && force !== true) {
					progressEnd('coletar', false);
					toast('warn', counted(plan.missing.length, 'arquivo faltando não entra', 'arquivos faltando não entram') + ' na coleta: ' + plan.missing.slice(0, 3).join(', ') + (plan.missing.length > 3 ? '…' : ''), 0, [
						{
							label: 'ver a lista',
							run: actions.openCollect
						},
						{
							label: total ? 'coletar ' + counted(total, 'arquivo', 'arquivos') : 'coletar assim mesmo',
							run: function () {
								run($('btn-coletar'), function () {
									return actions.collect(path, true);
								});
							}
						}
					]);

					return;
				}

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

			report(res, parts.length ? 'coletado: ' + parts.join(', ') + (d.saved ? '. projeto salvo.' : '.') : 'nada novo para coletar' + (d.saved ? ' (projeto salvo).' : '.'));
			setTimeout(watchCollect, 300);
		},

		// a janela do coletar: as mídias do projeto (miniatura, tipo, estado) e coletar em outra pasta
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
	['openCollect', 'openFonts', 'openVersioner', 'openLabels', 'project'].forEach(function (key) {
		actions[key].opensWindow = true;
	});

	/* =========================================================
	   Estrutura da barra
	   ========================================================= */

	// As ferramentas da barra; a ordem e os grupos vêm da configuração (aba LAYOUT).
	var TOOLS = [
		{
			key: 'templates',
			menu: [
				{ label: 'preencher um template', tip: 'buscar, selecionar e preencher: cria as comps e a fila de render', run: actions.templates },
				{ label: 'criar um template', tip: 'transforma a comp aberta em um template novo', run: actions.createTemplate },
				{ label: 'produções', tip: 'configuração: as produções e as pastas de templates', config: 'prods' }
			],
			label: 'Templates',
			icon: 'templates',
			name: 'A FORMA',
			tips: [L_CLICK + 'preencher um template e criar a fila de render', R_CLICK + 'opções: criar um template, produções'],
			left: actions.templates,
			right: actions.createTemplate
		},
		{
			key: 'fontes',
			menu: [
				{ label: 'instalar as que faltam', tip: 'procura na pasta de fontes do projeto e no banco de fontes', run: actions.resolveFonts },
				{ label: 'ver as fontes do projeto', tip: 'o estado de cada fonte, trocar por outra e copiar para uma pasta', run: actions.openFonts },
				{ label: 'banco de fontes', tip: 'configuração: o banco de fontes da equipe', config: 'fonts' }
			],
			label: 'Fontes',
			icon: 'fonts',
			name: 'O TIPÓGRAFO',
			tips: [L_CLICK + 'instalar as fontes que faltam no projeto', R_CLICK + 'opções: ver as fontes do projeto, banco de fontes'],
			left: actions.resolveFonts,
			right: actions.openFonts
		},
		{
			key: 'projeto',
			menu: [
				{ label: 'novo projeto ou editar', tip: 'projeto novo pela atração; com o projeto já criado, o editor dele', run: actions.project },
				{ label: 'salvar na pasta do projeto', tip: 'salva o .aep na pasta dele (sem os dados do padeiro, abre a janela)', run: actions.saveProject },
				{ label: 'categorias e pastas', tip: 'configuração: as categorias e os caminhos das atrações', config: 'project' }
			],
			label: 'Projeto',
			icon: 'project',
			name: 'A CLAQUETE',
			tips: [L_CLICK + 'criar um projeto novo pela atração (ou editar o atual)', R_CLICK + 'opções: salvar na pasta do projeto, categorias'],
			left: actions.project,
			right: actions.saveProject
		},
		{
			key: 'coletar',
			menu: [
				{
					label: 'coletar agora', tip: 'copia os arquivos para a pasta do projeto, troca os caminhos e salva', run: function () {
						return actions.collect('');
					}
				},
				{ label: 'ver os arquivos', tip: 'cada arquivo e onde está, coletar em outra pasta e resolver os que faltam', run: actions.openCollect },
				{ label: 'pastas da coleta', tip: 'configuração: a árvore de pastas do coletar', config: 'collect' }
			],
			label: 'Coletar',
			icon: 'collect',
			name: 'O CATADOR',
			tips: [L_CLICK + 'coletar os arquivos na pasta do projeto', R_CLICK + 'opções: ver os arquivos, pastas da coleta'],
			left: function () {
				return actions.collect('');
			},
			right: actions.openCollect
		},
		{
			key: 'importar',
			menu: [
				{
					label: 'importar um projeto', tip: 'importa um .aep de qualquer versão do After no projeto aberto', run: function () {
						return actions.importAep();
					}
				},
				{ label: 'salvar em versão anterior', tip: 'salva o projeto aberto em até 3 versões mais velhas do After', run: actions.openVersioner }
			],
			label: 'Importar',
			icon: 'import',
			name: 'O VERSIONADOR',
			tips: [L_CLICK + 'importar um projeto do After de qualquer versão', R_CLICK + 'opções: salvar em versão anterior do After'],
			left: function () {
				return actions.importAep();
			},
			right: actions.openVersioner
		},
		{
			key: 'pastas',
			menu: [
				{ label: 'abrir a pasta do último render', tip: 'a pasta de saída do último item da fila de render', run: actions.openLastOutput },
				{ label: 'converter caminhos', tip: 'caminhos Windows ⇄ macOS', run: actions.convertPaths }
			],
			label: 'Pastas',
			icon: 'folders',
			name: 'O ADAPTADOR',
			tips: [L_CLICK + 'abrir a pasta do último item da fila de render', R_CLICK + 'opções: converter caminhos Windows ⇄ macOS'],
			left: actions.openLastOutput,
			right: actions.convertPaths
		},
		{
			key: 'renomear',
			menu: [
				{ label: 'comps selecionadas', tip: 'renomeia as comps (ou a pasta) selecionadas no painel Project, no padrão da equipe', run: actions.renameComps },
				{ label: 'saídas da fila de render', tip: 'renomeia os arquivos de saída de todos os itens da fila de render', run: actions.renameOutputs },
				{ label: 'regras de nomes', tip: 'configuração: os tipos, os prefixos e os termos do renomear', config: 'rename' }
			],
			label: 'Renomear',
			icon: 'rename',
			name: 'O ETIQUETADOR',
			tips: [L_CLICK + 'renomear as comps selecionadas', R_CLICK + 'opções: saídas da fila de render, regras de nomes'],
			left: actions.renameComps,
			right: actions.renameOutputs
		},
		{
			key: 'organizar',
			menu: [
				{
					label: 'organizar o projeto', tip: 'cada item na pasta dele (selecione antes as comps do render)', run: function () {
						return actions.organizeProject();
					}
				},
				{ label: 'etiquetas', tip: 'os comentários que o organizar entende, nos itens selecionados', run: actions.openLabels },
				{ label: 'pastas do projeto', tip: 'configuração: a árvore de pastas do organizar', config: 'organize' }
			],
			label: 'Organizar',
			icon: 'organize',
			name: 'O CONTRARREGRA',
			tips: [L_CLICK + 'organizar o projeto (selecione antes as comps do render)', R_CLICK + 'opções: etiquetas, pastas do projeto'],
			left: function () {
				return actions.organizeProject();
			},
			right: actions.openLabels
		},
		{
			key: 'buscar',
			menu: [
				{ label: 'caminhos', tip: 'atrações, filmes, Teams e Trello', run: actions.searchPaths },
				{ label: 'textos dos layers', tip: 'busca nos textos dos layers do projeto', run: actions.searchTexts },
				{ label: 'fontes da busca', tip: 'configuração: o índice e as pastas da busca', config: 'search' }
			],
			label: 'Buscar',
			icon: 'search',
			name: 'O ACESSORISTA',
			tips: [L_CLICK + 'buscar caminhos de atrações, filmes, Teams e Trello', R_CLICK + 'opções: textos dos layers, fontes da busca'],
			left: actions.searchPaths,
			right: actions.searchTexts
		}
	];

	// a ordem padrão segue o ciclo do projeto: começar | arrumar | entregar | achar
	var DEFAULT_ITEMS = ['projeto', 'templates', 'importar', 'divider', 'fontes', 'renomear', 'organizar', 'divider', 'coletar', 'pastas', 'divider', 'buscar'];

	function toolDef(key) {
		return TOOLS.filter(function (t) {
			return t.key === key;
		})[0] || null;
	}

	// Executa a ação do botão com feedback de "ocupado" e erro no aviso.
	async function run(btn, handler) {
		if (!handler) return;
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
	function bind(btn, left, right, def) {
		btn.addEventListener('click', function () {
			run(btn, left);
		});

		// clique direito = as opções da ferramenta (a gaveta), sem executar nada. só na barra mais estreita que
		// 72 px (sem lugar para os nomes) a segunda ação direto, como antes
		btn.addEventListener('contextmenu', function (e) {
			e.preventDefault();
			if (def && def.menu && drawerFits()) openDrawer(def, btn, false);
			else run(btn, right);
		});

		// no teclado: Shift+Enter abre as opções (o foco vai para a primeira)
		btn.addEventListener('keydown', function (e) {
			if (e.key !== 'Enter' || !e.shiftKey) return;

			e.preventDefault();
			if (def && def.menu && drawerFits()) openDrawer(def, btn, true);
			else run(btn, right);
		});
	}

	/* ---------------------------------------------------------------
	   a gaveta: as opções de uma ferramenta no lugar dos botões (clique direito). o nome da ferramenta, cada
	   coisa que ela faz num botão com o nome por extenso, a configuração dela e o × para voltar. fecha ao
	   escolher, no ×, no Esc, clicando fora ou um instante depois de o mouse sair da barra
	   --------------------------------------------------------------- */

	// barra horizontal mais estreita que o conteúdo: marca a ponta que continua (o CSS apaga ela num degradê) e
	// deixa a roda do mouse rolar de lado
	function markClipped() {
		var bar = $('bar');
		var over = bar.scrollWidth - bar.clientWidth > 1;

		bar.classList.toggle('is-clipped-start', over && bar.scrollLeft > 1);
		bar.classList.toggle('is-clipped-end', over && bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 1);
	}

	$('bar').addEventListener('scroll', markClipped);
	window.addEventListener('resize', markClipped);
	setInterval(markClipped, 1500); // links e ferramentas mudam a largura do conteúdo
	$('bar').addEventListener('wheel', function (e) {
		var bar = $('bar');

		if (bar.scrollWidth - bar.clientWidth <= 1 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

		e.preventDefault();
		bar.scrollLeft += e.deltaY;
	}, { passive: false });

	var drawer = { open: false, btn: null, timer: null };

	function drawerFits() {
		// abaixo de 72 px os nomes das opções não cabem nem quebrando: aí o clique direito faz a segunda ação
		return !(window.matchMedia && window.matchMedia('(max-aspect-ratio: 1/1) and (max-width: 71px)').matches);
	}

	function closeDrawer(refocus) {
		if (!drawer.open) return;

		clearTimeout(drawer.timer);
		drawer.open = false;
		$('bar').classList.remove('has-drawer');
		$('drawer').hidden = true;
		$('drawer').textContent = '';
		if (refocus && drawer.btn) drawer.btn.focus();
	}

	function openDrawer(def, btn, focus) {
		var box = $('drawer');
		var head = el('span', 'bar-drawer-head');
		var close = el('button', 'bar-drawer-close', '×');

		clearTimeout(drawer.timer);
		$('toast').hidden = true; // o aviso anterior sai: a linha fica para as dicas das opções
		box.textContent = '';

		head.appendChild(svgIcon(def.icon));
		head.appendChild(el('b', '', def.label));
		head.title = def.name.toLowerCase();
		box.appendChild(head);

		def.menu.forEach(function (item, i) {
			var b = el('button', 'bar-option' + (item.config ? ' is-config' : '') + (i === 0 ? ' is-main' : ''), item.label);

			b.type = 'button';
			b.title = item.tip + (i === 0 ? ' (o mesmo do clique esquerdo)' : '');
			b.addEventListener('click', function () {
				closeDrawer(false);

				if (item.config) {
					run(btn, function () {
						return actions.config(item.config);
					});
				} else {
					run(btn, item.run);
				}
			});
			box.appendChild(b);
		});

		close.type = 'button';
		close.title = 'voltar para as ferramentas';
		close.setAttribute('aria-label', 'voltar para as ferramentas');
		close.addEventListener('click', function () {
			closeDrawer(true);
		});
		box.appendChild(close);

		drawer.open = true;
		drawer.btn = btn;
		box.hidden = false;
		$('bar').classList.add('has-drawer');

		if (focus) box.querySelector('.bar-option').focus();
	}

	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && drawer.open) closeDrawer(true);
	});

	// clicar fora da gaveta (em qualquer outro lugar da barra) volta para as ferramentas
	document.addEventListener('mousedown', function (e) {
		if (drawer.open && !e.target.closest('#drawer')) closeDrawer(false);
	}, true);

	// o mouse saiu da barra: a gaveta espera um pouco e fecha (não fica uma barra "diferente" esquecida aberta)
	document.addEventListener('mouseleave', function () {
		if (!drawer.open) return;

		clearTimeout(drawer.timer);
		drawer.timer = setTimeout(function () {
			closeDrawer(false);
		}, 2500);
	});

	document.addEventListener('mouseenter', function () {
		clearTimeout(drawer.timer);
	});

	window.addEventListener('blur', function () {
		closeDrawer(false);
	});

	var toolsLayout = ''; // a ordem e as escondidas desenhadas agora (só redesenha quando mudam)

	// Monta a barra na ordem da configuração: 'divider' separa os grupos; as escondidas ficam de fora e
	// um grupo sem nenhuma ferramenta não aparece (nem a divisória dele).
	function buildTools(items, hidden) {
		var key = items.join() + '|' + hidden.join();

		if (key === toolsLayout) return;

		toolsLayout = key;
		collectSync.state = null; // os botões são refeitos: a bolinha do coletar volta na próxima leitura

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
				btn.title = def.label + ' · ' + def.name + '\n\n' + def.tips.join('\n'); // a função e a turma, uma linha em branco e os 2 cliques
				btn.setAttribute('aria-label', def.label);
				btn.appendChild(svgIcon(def.icon));
				btn.appendChild(el('span', 'bar-label', def.label));
				bind(btn, def.left, def.right, def);

				group.appendChild(btn);
			});

			tools.appendChild(group);
		});

		paintProjectDot(); // a barra montada de novo: a bolinha volta
	}

	/* ---------------------------------------------------------------
	   a bolinha do botão Projeto: verde = o projeto aberto está salvo com os dados do padeiro (atração…);
	   laranja = sem eles (salvo sem a atração, ou com itens e sem arquivo); sem bolinha = projeto vazio
	   --------------------------------------------------------------- */

	var projectState = '';

	function paintProjectDot() {
		var btn = $('btn-projeto');

		if (!btn) return;

		var dot = btn.querySelector('.bar-dot');

		check.project = projectState;
		paintCheck();

		if (!projectState) {
			if (dot) dot.remove();
			btn.removeAttribute('data-project');
			return;
		}

		if (!dot) dot = btn.appendChild(el('span', 'bar-dot'));
		dot.className = 'bar-dot is-' + projectState;
		placeProjectDot(btn, dot);
		btn.setAttribute('data-project', projectState);
		dot.title = projectState === 'ok' ? 'projeto salvo com os dados do padeiro' : 'projeto sem os dados do padeiro (atração, o que é, pastas): abra a janela PROJETO';
	}

	// a bolinha fica no canto de baixo, à direita, do ícone (na horizontal, com o rótulo embaixo, e na vertical,
	// com o rótulo ao lado)
	function placeProjectDot(btn, dot) {
		var icon = btn.querySelector('svg');

		if (!icon || !icon.getBoundingClientRect().width) return;

		var b = btn.getBoundingClientRect();
		var r = icon.getBoundingClientRect();

		dot.style.left = Math.round(r.right - b.left - 8) + 'px';
		dot.style.top = Math.round(r.bottom - b.top - 8) + 'px';
	}

	/* =========================================================
	   Banco de fontes: as fontes do projeto aberto vão sozinhas para o banco e para a pasta de fontes do
	   projeto (js/fontbank.js, pelo Node, uma por vez). A bolinha no botão de fontes: laranja quando falta algo
	   (neste computador, no banco ou na pasta do projeto), verde quando está tudo certo.
	   ========================================================= */

	var FONTS_EVERY = 10000; // ms entre as leituras do projeto
	var fontsSync = { busy: false, timer: null, state: '', tip: '' };
	var FONT_LABELS = { up: 'enviando', install: 'para instalar', nofile: 'sem arquivo' };

	// a dica do botão com o estado no fim. o texto fica no 'title' ou, depois do primeiro hover, no 'data-tip'
	// (tooltip.js troca um pelo outro): o texto de base é guardado uma vez
	function setTip(btn, note) {
		if (!btn.dataset.baseTip) btn.dataset.baseTip = btn.getAttribute('title') || btn.getAttribute('data-tip') || '';

		btn.setAttribute('title', btn.dataset.baseTip + (note ? '\n\n' + note : ''));
	}

	function paintFontsDot(state, tip) {
		var btn = $('btn-fontes');

		if (!btn) return;

		var dot = btn.querySelector('.bar-dot');

		setTip(btn, tip);
		check.fonts = { state: state, tip: state === 'ok' ? '' : tip };
		paintCheck();

		if (!state) {
			if (dot) dot.remove();
			return;
		}

		if (!dot) dot = btn.appendChild(el('span', 'bar-dot'));
		dot.className = 'bar-dot is-' + state;
		placeProjectDot(btn, dot);
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
		if (info.bank && !checked.bankOk) parts.push('banco de fontes inacessível');
		if (count.up && !(info.upload && info.machineUpload)) parts.push('envio desligado (configuração > fontes)');

		return parts.length ? 'fontes: ' + parts.join(' · ') : 'fontes ok: ' + checked.fonts.length + (checked.fonts.length === 1 ? ' fonte instalada e no banco' : ' fontes instaladas e no banco');
	}

	async function syncFonts() {
		if (fontsSync.busy || document.hidden || !window.PAD_FONTBANK || !PAD_FONTBANK.available()) return;

		// sem a rede (caiu ou modo local): o banco fica na rede, nem tenta (tocar num volume que sumiu faz o macOS
		// avisar a cada vez). volta sozinho quando a rede voltar
		if (netState === 'offline' || netState === 'forced') {
			clearTimeout(fontsSync.timer);
			fontsSync.timer = setTimeout(syncFonts, FONTS_EVERY);
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
		fontsSync.timer = setTimeout(syncFonts, FONTS_EVERY);
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

		check.collect = res || null;
		paintCheck();

		var dot = btn.querySelector('.bar-dot');
		var tip = '';

		if (res && res.state === 'ok') tip = 'arquivos: ' + (res.total === 1 ? 'o arquivo do projeto está nas pastas de projetos' : 'os ' + res.total + ' arquivos do projeto estão nas pastas de projetos');
		if (res && res.state === 'out') tip = 'arquivos: ' + res.local + ' fora das pastas de projetos' + (res.names.length ? ' (' + res.names.join(', ') + (res.local > res.names.length ? '…' : '') + ')' : '') + ': colete para levar para a pasta do projeto';
		setTip(btn, tip);

		if (!res || !res.state) {
			if (dot) dot.remove();
			return;
		}

		if (!dot) dot = btn.appendChild(el('span', 'bar-dot'));
		dot.className = 'bar-dot is-' + res.state;
		placeProjectDot(btn, dot);
	}

	async function watchCollect() {
		clearTimeout(collectSync.timer);

		if (!document.hidden) {
			try {
				var res = await call('collectStatus');
				var key = JSON.stringify(res);

				if (key !== collectSync.state) {
					collectSync.state = key;
					paintCollectDot(res);
				}
			} catch (err) { }
		}

		collectSync.timer = setTimeout(watchCollect, COLLECT_EVERY);
	}

	async function watchProject() {
		if (document.hidden) return;

		try {
			var res = await call('projectStatus');

			if (res.state !== projectState) {
				projectState = res.state;
				paintProjectDot();
			}
		} catch (err) { }
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
		watchProject();
		setInterval(watchProject, 2000); // o projeto aberto (a bolinha do Projeto): abrir, salvar, criar pela atração
		// as bolinhas (projeto, fontes, coletar) acompanham o ícone ao virar a barra
		window.addEventListener('resize', function () {
			paintProjectDot();
			Array.prototype.forEach.call(document.querySelectorAll('.bar-btn .bar-dot'), function (dot) {
				placeProjectDot(dot.parentElement, dot);
			});
		});
		window.addEventListener('focus', watchProject);
		window.addEventListener('focus', loadLinks);
		syncFonts(); // o banco de fontes (a bolinha das fontes)
		window.addEventListener('focus', syncFonts);
		watchCollect(); // os arquivos fora da rede (a bolinha do coletar)
		window.addEventListener('focus', watchCollect);

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
