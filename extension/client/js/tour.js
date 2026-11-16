/*

---------------------------------------------------------------
> TOUR — a primeira vez na barra
---------------------------------------------------------------

Sem a configuração da equipe (nem na rede, nem a cópia deste computador), a barra abre aqui: um balão de vidro
da altura da barra que acha a configuração (o arquivo na rede, uma nova numa pasta, ou só este computador),
pede a sigla e apresenta a turma (cada ferramenta acende com o nome e os dois cliques). Durante o tour os
cliques nas ferramentas não rodam nada: na ferramenta acesa, só acendem a linha do clique. O ◗ no pãozinho
refaz o tour da turma.

  PAD_TOUR.start({ setup, user })  → setup: começa pela configuração; sem ela, direto na turma
  PAD_TOUR.active()

Ao terminar a configuração, avisa a barra com o evento 'pad-tour-setup' (ela relê as ferramentas).

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;
	var bar = document.getElementById('bar');
	var layer = document.createElement('div');
	var card = document.createElement('div');

	layer.className = 'tour';
	layer.hidden = true;
	card.className = 'tour-card';
	layer.appendChild(card);
	document.body.appendChild(layer);

	var I = {
		next: '<svg viewBox="0 0 24 24"><path d="M5 12h13M13 7l5 5-5 5"/></svg>',
		back: '<svg viewBox="0 0 24 24"><path d="M19 12H6M11 7l-5 5 5 5"/></svg>',
		find: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/></svg>',
		create: '<svg viewBox="0 0 24 24"><path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><path d="M13.5 3.5V8H18M12 11v6M9 14h6"/></svg>',
		local: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="11" rx="2"/><path d="M8.5 19.5h7M12 15.5v4"/></svg>',
		person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5"/></svg>',
		check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
		tools: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="7" height="6" rx="1.5"/><rect x="13.5" y="5" width="7" height="6" rx="1.5"/><rect x="3.5" y="13" width="7" height="6" rx="1.5"/><rect x="13.5" y="13" width="7" height="6" rx="1.5"/></svg>'
	};
	var LOAF = '<svg class="tour-loaf" viewBox="0 0 48 32" aria-hidden="true"><path d="M7 24C7 12.6 14.6 5 24 5s17 7.6 17 19v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" fill="url(#loaf-grad)"/><path class="loaf-line" d="M7.6 23.2h32.8"/><path class="loaf-scores" d="m18.2 10.8 1.4 4.2M23.4 9.4l1.3 4.6M28.6 10.8l1.4 4.2"/></svg>';

	// cada clique com o nome de quem faz
	var TOOLS = {
		// as ferramentas de dentro das gavetas (Templates e Projeto): o tour abre a gaveta de cada uma
		preencher: { title: 'Preencher', l: ['A FORMA', 'preenche um template e cria a fila de render'] },
		'criar-template': { title: 'Criar template', l: ['A FORMA', 'cria um template a partir da comp aberta'] },
		fontes: { title: 'Fontes', l: ['O TIPÓGRAFO', 'resolve as fontes: instala as que faltam'], r: ['O TIPÓGRAFO', 'mostra cada fonte e troca por outra'] },
		projeto: { title: 'Criar / Alterar', l: ['A CLAQUETE', 'projeto novo pela atração, ou altera os dados do atual'], r: ['A CLAQUETE', 'salva o projeto na pasta dele'] },
		coletar: { title: 'Coletar', l: ['O CATADOR', 'copia os arquivos para a pasta do projeto'], r: ['O CATADOR', 'mostra os arquivos, coleta em outra pasta, resolve os que faltam'] },
		render: { title: 'Render', l: ['O FORNO', 'põe o render final das comps na fila, na pasta de output'], r: ['O FORNO', 'põe um preview na fila, na pasta de previews'] },
		importar: { title: 'Importar', l: ['O VERSIONADOR', 'importa um projeto do After de qualquer versão (o mais novo é convertido)'], r: ['O VERSIONADOR', 'salva o projeto em versões mais velhas do After'] },
		renomear: { title: 'Renomear', l: ['O ETIQUETADOR', 'renomeia as comps selecionadas'], r: ['O ETIQUETADOR', 'renomeia todas as saídas da fila de render'] },
		organizar: { title: 'Organizar', l: ['O CONTRARREGRA', 'organiza o projeto (selecione antes as comps do render)'], r: ['O CONTRARREGRA', 'aplica etiquetas (comentários) nos itens do projeto'] },
		pastas: { title: 'Pastas', l: ['O ADAPTADOR', 'abre a pasta do último render'], r: ['O ADAPTADOR', 'converte caminhos Windows ⇄ macOS'] },
		buscar: { title: 'Buscar', l: ['O ACESSORISTA', 'busca caminhos das atrações'], r: ['O ACESSORISTA', 'busca nos textos dos layers'] }
	};
	var LOGO = { id: 'logo', title: 'O pãozinho', l: ['O PADEIRO', 'ajuda e documentação'], r: ['O PADEIRO', 'refaz este tour'] };

	var state = { on: false, step: 'hello', tool: 0, tools: [], choice: '', summary: null, user: '', error: '', busy: false, setup: false };

	function $(id) {
		return document.getElementById(id);
	}

	function esc(text) {
		return String(text == null ? '' : text).replace(/[&<>"]/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
		});
	}

	// o mouse com o botão do clique cheio (esquerdo ou direito)
	function mouse(side) {
		var fill = side === 'l' ? 'M6 1.4A4.6 4.6 0 0 0 1.4 6V7H6z' : 'M6 1.4A4.6 4.6 0 0 1 10.6 6V7H6z';

		return '<svg class="tour-mouse" viewBox="0 0 12 18" aria-hidden="true"><path class="m-fill" d="' + fill + '"/><rect x="1.4" y="1.4" width="9.2" height="15.2" rx="4.6"/><path d="M6 1.4V7M1.4 7h9.2"/></svg>';
	}

	var ML = mouse('l');
	var MR = mouse('r');

	// as ferramentas que estão na barra agora, na ordem dela, e o pãozinho no fim
	function barTools() {
		var list = [];

		Array.prototype.forEach.call(bar.querySelectorAll('.bar-btn[id^="btn-"]'), function (btn) {
			var key = btn.id.replace(/^btn-/, '');

			if (TOOLS[key] && !btn.hidden && btn.offsetParent) list.push(Object.assign({ id: btn.id }, TOOLS[key]));
		});
		list.push(LOGO);

		return list;
	}

	function names(t) {
		var list = [t.l[0], t.r ? t.r[0] : ''].filter(function (n, i, all) {
			return n && all.indexOf(n) === i;
		});

		return list.length ? ' · ' + list.join(' e ') : '';
	}

	function who(c) {
		return (c[0] ? '<b class="tour-who">' + c[0] + '</b> ' : '') + c[1];
	}

	function dots(n, on) {
		var s = '<span class="tour-dots">';

		for (var i = 0; i < n; i++) s += '<b class="' + (i === on ? 'is-on' : '') + '"></b>';

		return s + '</span>';
	}

	function btn(label, action, cls, icon) {
		return '<button type="button" class="tour-btn ' + (cls || '') + '" data-go="' + action + '"' + (state.busy ? ' disabled' : '') + '>' + (icon && cls !== 'is-primary' ? icon : '') + label + (icon && cls === 'is-primary' ? icon : '') + '</button>';
	}

	function round(action, back) {
		return '<button type="button" class="tour-btn tour-round' + (back ? ' is-back' : ' is-primary') + '" data-go="' + action + '" aria-label="' + (back ? 'voltar' : 'próximo') + '"' + (state.busy ? ' disabled' : '') + '>' + (back ? I.back : I.next) + '</button>';
	}

	function opt(label, small, action, icon) {
		return '<button type="button" class="tour-btn is-option" data-go="' + action + '"' + (state.busy ? ' disabled' : '') + '><span>' + icon + label + '</span><small>' + small + '</small></button>';
	}

	function skip(label, action) {
		return '<button type="button" class="tour-skip" data-go="' + action + '">' + label + '</button>';
	}

	function summaryText(s) {
		if (!s) return '';

		var parts = [s.productions + (s.productions === 1 ? ' produção' : ' produções'), s.links + (s.links === 1 ? ' link' : ' links')];

		if (s.drives && s.drives.length) parts.push('drives ' + s.drives.join(' '));
		if (s.folder) parts.push(esc(s.folder));

		return parts.join(' · ');
	}

	var STEPS = {
		hello: function () {
			return { wide: true, lead: LOAF, cls: 'is-hello', kicker: 'primeira vez por aqui', title: 'oi! eu sou O PADEIRO.', text: 'não achei a configuração da equipe. vamos arrumar? leva 1 minuto.', actions: skip('agora não', 'later') + btn('começar', 'config', 'is-primary', I.next) };
		},
		later: function () {
			return { wide: false, lead: LOAF, kicker: 'sem a configuração da equipe', title: 'as ferramentas esperam por ela.', actions: btn('configurar', 'config', 'is-primary', I.next) };
		},
		config: function () {
			return {
				wide: true,
				lead: '<span class="tour-step-icon">' + (state.busy ? I.find : I.tools) + '</span>',
				cls: state.busy ? 'is-busy' : '',
				kicker: '1 de 3 · configuração da equipe',
				title: state.busy ? 'procurando…' : 'onde fica a configuração da equipe?',
				text: state.error ? esc(state.error) : 'o O_PADEIRO_GLOBAL_config.json, na rede: as mesmas produções e regras para todos.',
				error: !!state.error,
				actions: opt('achar na rede', 'escolher o arquivo', 'find', I.find) + opt('criar uma nova', 'numa pasta da rede', 'create', I.create) + opt('só aqui', 'modo local', 'local', I.local)
			};
		},
		found: function () {
			var t = {
				find: ['achei! O_PADEIRO_GLOBAL_config.json', summaryText(state.summary)],
				create: [state.summary && state.summary.existed ? 'já havia uma configuração nessa pasta: vale ela.' : 'configuração nova criada, com os padrões.', 'cadastre as produções em O PRODUTOR; a equipe aponta para este arquivo.'],
				local: ['ok, modo local.', 'os padrões e as produções deste computador. a rede liga depois em O PRODUTOR.']
			}[state.choice];

			return { wide: true, lead: '<span class="tour-step-icon">' + I.check + '</span>', kicker: '1 de 3 · configuração da equipe', title: t[0], text: t[1], actions: round('config', true) + btn('continuar', 'user', 'is-primary', I.next) };
		},
		user: function () {
			return { wide: true, lead: '<span class="tour-step-icon">' + I.person + '</span>', kicker: '2 de 3 · meu usuário', title: 'quem é você?', text: state.error ? esc(state.error) : 'a sigla vai nos projetos, nos logs e no banco de fontes.', error: !!state.error, actions: '<label class="tour-field">' + I.person + '<input id="tour-user" value="' + esc(state.user) + '" maxlength="24" aria-label="sigla do designer"></label>' + round('config', true) + btn('continuar', 'save-user', 'is-primary', I.next) };
		},
		ask: function () {
			return { wide: true, lead: LOAF, cls: 'is-hello', kicker: (state.setup ? '3 de 3 · ' : '') + 'a turma', title: 'quer conhecer a turma da barra?', text: 'cada ferramenta tem um nome e dois cliques: ' + ML + ' esquerdo e ' + MR + ' direito. uns 40 segundos.', actions: skip('pular', 'done') + (state.setup ? round('user', true) : '') + btn('fazer o tour', 'tool', 'is-primary', I.next) };
		},
		tool: function () {
			var t = state.tools[state.tool];
			var n = state.tools.length;

			return { spot: t.id, kicker: '<span class="tour-head">a turma ' + (state.tool + 1) + '/' + n + ' · clique na ferramenta ' + dots(n, state.tool) + '</span>', title: t.title + names(t), extra: '<span class="tour-lines"><span data-k="l"><i>' + ML + '</i><em>' + who(t.l) + '</em></span>' + (t.r ? '<span data-k="r"><i>' + MR + '</i><em>' + who(t.r) + '</em></span>' : '') + '</span>', actions: skip('sair', 'done') + round('prev', true) + round('next') };
		},
		done: function () {
			return { wide: true, lead: LOAF, cls: 'is-hello', kicker: 'pronto' + (state.user ? ', ' + esc(state.user) : '') + '!', title: 'a padaria está aberta.', text: '2 cliques numa ferramenta abrem O PRODUTOR na aba dela; ' + MR + ' no pãozinho refaz o tour.', actions: btn('começar a usar', 'close', 'is-primary', I.check) };
		}
	};

	function vertical() {
		return window.innerHeight > window.innerWidth;
	}

	function spot(id) {
		Array.prototype.forEach.call(bar.querySelectorAll('.is-spot'), function (n) {
			n.classList.remove('is-spot');
		});

		// a ferramenta dentro de uma gaveta: abre a gaveta dela (e fecha as outras)
		if (window.PAD_BAR) PAD_BAR.showTool(id);

		if (id && $(id)) {
			$(id).classList.add('is-spot');
			if ($(id).scrollIntoView) $(id).scrollIntoView({ block: 'nearest', inline: 'nearest' });
		}
	}

	// o balão do lado com mais espaço, sem nunca cobrir a ferramenta acesa (encolhe se precisar); sem
	// ferramenta, no centro. na barra vertical: embaixo da ferramenta (ou em cima, sem lugar embaixo)
	function place(id, wide) {
		var W = window.innerWidth;
		var H = window.innerHeight;

		card.classList.toggle('is-vertical', vertical());

		if (vertical()) {
			card.style.width = '';
			card.style.left = '';

			var top = 8;

			if (id && $(id)) {
				var v = $(id).getBoundingClientRect();
				var h = card.offsetHeight || 200;

				top = v.bottom + 10 + h < H ? v.bottom + 10 : Math.max(8, v.top - 10 - h);
			}

			card.style.top = top + 'px';

			return;
		}

		card.style.top = '';

		var w = Math.min(wide ? 860 : 640, W - 24);

		if (!id || !$(id)) {
			card.style.width = w + 'px';
			card.style.left = Math.round((W - w) / 2) + 'px';
			return;
		}

		var r = $(id).getBoundingClientRect();
		var left = r.left - 30;
		var right = W - r.right - 30;

		w = Math.max(160, Math.min(w, Math.max(left, right)));
		card.style.width = w + 'px';
		card.style.left = (left >= right ? r.left - 18 - w : r.right + 18) + 'px';
	}

	// sem espaço para o texto, o pãozinho / ícone da frente sai
	function fit() {
		card.classList.remove('is-tight');

		if (vertical()) return;

		var actions = card.querySelector('.tour-actions');
		var w = parseFloat(card.style.width) || card.clientWidth;

		if (actions && w - actions.offsetWidth < 300) card.classList.add('is-tight');
	}

	function relayout() {
		if (!state.on) return;

		var s = STEPS[state.step]();

		if (s.spot && $(s.spot) && !$(s.spot).classList.contains('is-spot')) spot(s.spot); // a barra refez os botões
		place(s.spot, s.wide);
		fit();
	}

	// a barra refaz os botões (configuração nova, ferramentas trocadas): o balão acompanha
	new MutationObserver(relayout).observe(document.getElementById('tools'), { childList: true });

	function render(animate) {
		var s = STEPS[state.step]();
		var paint = function () {
			card.className = 'tour-card ' + (s.cls || '');
			card.innerHTML = '<span>' + (s.lead || '') + '</span><span class="tour-body">' + (s.kicker ? '<span class="tour-kicker">' + s.kicker + '</span>' : '') + '<span class="tour-title">' + s.title + '</span>' + (s.text ? '<span class="tour-text' + (s.error ? ' is-error' : '') + '">' + s.text + '</span>' : '') + (s.extra || '') + '</span><span class="tour-actions">' + s.actions + '</span>';
			card.style.gridTemplateColumns = s.lead || vertical() ? '' : '0 minmax(0, 1fr) auto';
			spot(s.spot);
			place(s.spot, s.wide);
			fit();

			var input = $('tour-user');

			if (input) {
				input.addEventListener('input', function () {
					state.user = input.value.toUpperCase().replace(/[^A-Z0-9._-]/g, '');
				});
				input.addEventListener('keydown', function (e) {
					if (e.key === 'Enter') go('save-user');
				});
				setTimeout(function () {
					input.focus();
					input.select();
				}, 60);
			} else {
				var primary = card.querySelector('.tour-btn.is-primary');

				if (primary) primary.focus({ preventScroll: true });
			}
		};

		if (!animate) return paint();

		card.classList.add('is-fading');
		setTimeout(paint, 180);
	}

	// uma ação no host: o balão espera (botões desligados) e mostra o erro no lugar do texto
	async function work(step, fn) {
		state.busy = true;
		state.error = '';
		state.step = step;
		render(false);

		try {
			await fn();
		} catch (err) {
			state.error = PAD_UTIL.errorText ? PAD_UTIL.errorText(err.message) : err.message;
		}

		state.busy = false;
		render(true);
	}

	async function go(action) {
		if (state.busy) return;

		if (action === 'find' || action === 'create') {
			var path = action === 'find' ? PAD_BRIDGE.pickFile('Escolher a configuração da equipe (O_PADEIRO_GLOBAL_config.json)', ['json']) : PAD_BRIDGE.pickFolder('Pasta da configuração nova (na rede)');

			if (!path) return;

			return work('config', async function () {
				state.summary = await call(action === 'find' ? 'setupUseConfig' : 'setupCreateConfig', action === 'find' ? { path: path } : { folder: path });
				state.choice = action;
				state.step = 'found';
				document.dispatchEvent(new CustomEvent('pad-tour-setup'));
			});
		}

		if (action === 'local') {
			return work('config', async function () {
				await call('setupLocal');
				state.choice = 'local';
				state.step = 'found';
				document.dispatchEvent(new CustomEvent('pad-tour-setup'));
			});
		}

		if (action === 'save-user') {
			return work('user', async function () {
				var res = await call('saveMachinePrefs', { user: state.user });

				state.user = res.user || res.defaultUser || state.user;
				state.step = 'ask';
			});
		}

		state.error = '';

		if (action === 'next') {
			if (state.tool < state.tools.length - 1) state.tool++;
			else state.step = 'done';
		} else if (action === 'prev') {
			if (state.tool > 0) state.tool--;
			else state.step = 'ask';
		} else if (action === 'tool') {
			state.tools = barTools();
			state.tool = 0;
			state.step = 'tool';
		} else if (action === 'close') {
			return finish();
		} else {
			state.step = action;
		}

		render(true);
	}

	function finish() {
		card.style.opacity = '0';
		spot('');
		setTimeout(function () {
			state.on = false;
			layer.hidden = true;
			bar.classList.remove('is-touring');
			document.body.classList.remove('is-touring');
			card.style.opacity = '';
			PAD_UTIL.toast(document.getElementById('toast'), 'bar-toast', 'success', 'tudo pronto' + (state.user ? ', ' + state.user : '') + '! (clique direito no pãozinho refaz o tour)', 4000);
		}, 280);
	}

	card.addEventListener('click', function (e) {
		var b = e.target.closest('[data-go]');

		if (b && !b.disabled) go(b.dataset.go);
	});

	// durante o tour, as ferramentas não rodam nada; na acesa, o clique acende a linha dele
	function intercept(e) {
		if (!state.on || !e.target.closest('.bar-btn, .bar-icon, .bar-logo')) return;

		e.preventDefault();
		e.stopPropagation();

		if (state.step !== 'tool' || !e.target.closest('.is-spot')) return;

		var side = e.type === 'contextmenu' ? 'r' : 'l';
		var line = card.querySelector('[data-k="' + side + '"]');

		Array.prototype.forEach.call(card.querySelectorAll('.tour-lines > span'), function (n) {
			n.classList.remove('is-hit');
		});

		if (line) {
			void line.offsetWidth;
			line.classList.add('is-hit');
		}
	}

	bar.addEventListener('click', intercept, true);
	bar.addEventListener('contextmenu', intercept, true);
	bar.addEventListener('dblclick', intercept, true);
	window.addEventListener('resize', relayout);
	if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

	window.PAD_TOUR = {
		active: function () {
			return state.on;
		},
		// setup: sem a configuração (começa pelo olá); sem ele, direto na turma
		start: function (o) {
			o = o || {};
			state.on = true;
			state.setup = !!o.setup;
			state.user = o.user || state.user || '';
			state.error = '';
			state.busy = false;
			state.tool = 0;
			state.tools = barTools();
			state.step = o.setup ? 'hello' : 'ask';
			layer.hidden = false;
			bar.classList.add('is-touring');
			document.body.classList.add('is-touring');
			render(false);
		}
	};
})();
