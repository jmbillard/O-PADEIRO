/*

---------------------------------------------------------------
> PROJETO — um projeto novo pela atração, em etapas, e o editor
---------------------------------------------------------------

Projeto nunca salvo: as etapas.
  ATRAÇÃO → digita o começo (ou um padrão, ex: MAIS VOCE 30 10) e escolhe a atração do índice da busca, uma
            nova (nome + categoria) ou outra pasta
  CRIAR   → o que é (o .aep é a atração + isso, sem acentos), a estrutura e a pasta de output
Projeto salvo: o editor (atração buscada, designer, o que é, as pastas e Salvar, que leva o .aep para a pasta de
projetos com o nome certo).

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/projeto.md';
	var LOOKUP_MS = 90; // espera depois da última tecla para procurar a atração (a busca é na memória)
	var FOLDER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></svg>';
	var FILE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><path d="M13.5 3.5V8H18" /></svg>';
	var PLUS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>';
	var SEARCH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>';
	var SKIP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="m7 17 10-10" /></svg>';
	var OUTPUT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /><path d="M12 11v5M9.5 13.5 12 16l2.5-2.5" /></svg>';
	var CHEVRON_SVG = '<svg class="out-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>';
	var USER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5" /></svg>';

	// o que foi escolhido até aqui
	var flow = {
		claquete: '',
		matches: [],
		pick: null, // { name, path, display } a atração
		choice: '', // na tela ATRAÇÃO: 'm0'… (a atração da lista), 'new' ou 'folder'
		output: '', // a pasta de output (a da atração no índice, ou o caminho de output da categoria): proposta na etapa CRIAR
		what: '',
		mode: '', // '', 'open', 'increment' (arquivo existente)
		history: []
	};
	var state = { screen: '', current: null, lookupTimer: null, lookupSeq: 0, planTimer: null, planSeq: 0, busy: false, bases: [] };

	function $(id) {
		return document.getElementById(id);
	}

	function el(tag, className, text) {
		var node = document.createElement(tag);

		if (className) node.className = className;
		if (text != null) node.textContent = text;

		return node;
	}

	function status(text, kind) {
		var node = $('proj-status');

		clearTimeout(state.statusTimer);
		node.textContent = kind === 'error' ? PAD_UTIL.errorText(text) : text || '';
		node.title = node.textContent;
		node.className = 'proj-status' + (kind ? ' is-' + kind : '');

		if (text && kind !== 'error') state.statusTimer = setTimeout(status, 4200);
	}

	// nome de arquivo: sem acentos e símbolos, em maiúsculas (o mesmo do host)
	function aepName(text) {
		return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
	}

	/* ---------------------------------------------------------------
	   telas
	   --------------------------------------------------------------- */

	// A altura da janela: a de padrão (410) ou a que a etapa precisa para caber tudo (a estrutura da etapa CRIAR,
	// o editor), até 90% da tela. a largura fica a que a pessoa deixou.
	var BASE_HEIGHT = 410;

	function fitHeight() {
		requestAnimationFrame(function () {
			var screen = document.querySelector('.wz-screen:not([hidden])');

			if (!screen) return;

			var cs = getComputedStyle(screen);
			var kids = Array.prototype.filter.call(screen.children, function (k) {
				return !k.hidden && getComputedStyle(k).display !== 'none';
			});
			var natural = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + (kids.length - 1) * (parseFloat(cs.rowGap) || 0);

			kids.forEach(function (k) {
				natural += k.getBoundingClientRect().height;
			});

			var need = Math.ceil(window.innerHeight - screen.clientHeight + natural + 4);
			var target = Math.max(BASE_HEIGHT, Math.min(need, Math.round((window.screen.availHeight || 900) * 0.9)));

			if (Math.abs(target - window.innerHeight) > 4) PAD_BRIDGE.resizeWindow(window.innerWidth, target);
		});
	}

	function show(name, push) {
		if (push !== false && state.screen && state.screen !== name && state.screen !== 'editor') flow.history.push(state.screen);

		state.screen = name;
		Array.prototype.forEach.call(document.querySelectorAll('.wz-screen'), function (sc) {
			sc.hidden = sc.id !== 'sc-' + name;
		});
		status('');

		fitHeight();

		var focus = { claquete: 'claq', criar: 'arq-what' }[name];

		if (focus) setTimeout(function () {
			$(focus).focus();
		}, 30);
	}

	function back() {
		var prev = flow.history.pop();

		if (prev) show(prev, false);
	}

	function card(box, title, path) {
		box.textContent = '';
		box.appendChild(el('div', 'proj-card-head')).appendChild(el('span', 'proj-retranca', title));
		box.appendChild(el('div', 'proj-target', '\u200E' + path + '\u200E')); // as marcas LTR seguram as barras no lugar (o texto corta pelo começo)
		box.title = path;
	}

	// uma opção em cartão: ícone, título, caminho e a bolinha
	function option(icon, title, path, selected, onPick, extraClass) {
		var item = el('button', 'wz-opt' + (selected ? ' is-selected' : '') + (extraClass ? ' ' + extraClass : ''));
		var text = el('span', 'wz-opt-text');

		item.type = 'button';
		item.setAttribute('role', 'radio');
		item.setAttribute('aria-checked', String(!!selected));
		item.insertAdjacentHTML('afterbegin', icon);
		text.appendChild(el('b', null, title));
		if (path) text.appendChild(el('small', /[\\\/]/.test(path) ? 'is-path' : null, /[\\\/]/.test(path) ? '\u200E' + path + '\u200E' : path));
		item.appendChild(text);
		if (!extraClass) item.appendChild(el('i', 'wz-radio'));
		// dica só para o caminho (que aparece cortado): um texto que já está inteiro no cartão não ganha balão
		if (path && /[\\\/]/.test(path)) item.title = path;
		item.addEventListener('click', onPick);
		item.addEventListener('dblclick', function () {
			onPick();
			var next = item.closest('.wz-screen').querySelector('.button-primary');

			if (next && !next.disabled) next.click();
		});

		return item;
	}

	/* ---------------------------------------------------------------
	   a busca das atrações e as categorias: js/attractions.js (a mesma do criador de templates)
	   --------------------------------------------------------------- */

	var ATR = window.PAD_ATTRACTIONS;
	var findAttractions = ATR.find;
	var candidates = ATR.candidates;
	var displayPath = ATR.displayPath;
	var newBases = ATR.categories;
	var fillPattern = ATR.fillPattern;

	/* ---------------------------------------------------------------
	   1 · ATRAÇÃO
	   a busca já lista as atrações (a primeira vem marcada); no fim, "nova atração" (o nome e a categoria abrem
	   embaixo, na mesma tela) e "outra pasta…". Enter = Próximo
	   --------------------------------------------------------------- */

	var LIST_MAX = 4; // quantas atrações aparecem (as outras: continue digitando)
	var PREF_OUT = 'pad.project.out'; // a escolha do output (atração, subpasta ou pular), neste computador
	var PREF_BASE = 'pad.project.base'; // a última categoria de uma atração nova, neste computador

	function pref(key, value) {
		try {
			if (value === undefined) return localStorage.getItem(key) || '';
			localStorage.setItem(key, value);
		} catch (err) { }

		return '';
	}

	function lookup() {
		clearTimeout(state.lookupTimer);

		var claq = $('claq').value.trim();
		var seq = ++state.lookupSeq;

		flow.claquete = claq;
		$('claq-next').disabled = !claq;
		if (flow.choice === 'new' && !state.novaEdited) $('nova-name').value = typedName();

		if (!claq) {
			flow.matches = [];
			flow.choice = '';
			renderAttractions();
			return;
		}

		state.lookupTimer = setTimeout(async function () {
			state.lookupTimer = null;

			try {
				var res = await findAttractions(claq);

				if (seq !== state.lookupSeq) return;

				flow.matches = res.matches;
			} catch (err) {
				if (seq !== state.lookupSeq) return;
				flow.matches = [];
				$('claq-hint').textContent = PAD_UTIL.errorText(err.message);
			}

			// a primeira atração vem marcada (sem nenhuma, a "nova atração"); o que a pessoa escolheu fica
			if (!state.userChose || /^m/.test(flow.choice)) flow.choice = flow.matches.length ? 'm0' : 'new';
			if (flow.choice === 'new') {
				await ensureBases();
				if (!state.novaEdited) $('nova-name').value = typedName();
			}
			renderAttractions();
		}, LOOKUP_MS);
	}

	// o nome da atração nova: o que foi digitado, sem os números do fim (DOMINGÃO 9 11 → DOMINGÃO)
	function typedName() {
		return String($('claq').value || '').trim().split(/\s+/).filter(function (w, i, all) {
			return !all.slice(i).every(function (x) {
				return /^[\d\/\-.]+$/.test(x);
			});
		}).join(' ');
	}

	// o ícone da categoria da atração (o mesmo da aba PROJETO), ou a pasta
	function matchIcon(m) {
		var base = state.bases.filter(function (b) {
			return b.label && m.category && aepName(b.label) === aepName(m.category);
		})[0];

		return (base && PAD_UTIL.categoryIcon(base.icon)) || FOLDER_SVG;
	}

	function renderAttractions() {
		var list = $('atr-list');
		var nova = state.novaBox || (state.novaBox = $('atr-nova')); // o bloco fica (só os cartões são refeitos)
		var m = flow.matches.slice(0, LIST_MAX);

		$('claq-combo').classList.toggle('is-open', !!flow.claquete);

		if (!flow.claquete) {
			list.hidden = true;
			$('claq-hint').textContent = '';
			fitHeight();
			return;
		}

		// a lista com busca: as atrações, a nova (o nome e a categoria abrem logo abaixo) e outra pasta
		var novaLabel = aepName($('nova-name').value || typedName()) || 'o nome digitado'; // antes de tirar o bloco da lista

		ATR.resize(list, function () {
			list.textContent = '';
			list.appendChild(ATR.group(m.length ? (ATR.mode() === 'local' ? 'pastas' : 'atrações') : (ATR.mode() === 'local' ? 'nenhuma pasta do índice local com esse nome' : 'nenhuma atração com esse nome')));
			m.forEach(function (match, i) {
				list.appendChild(ATR.row(matchIcon(match), match.name.toUpperCase(), match.category || '', flow.choice === 'm' + i, function () {
					chooseAttraction('m' + i);
				}, match.display));
			});
			list.appendChild(ATR.sep());
			list.appendChild(ATR.row(PLUS_SVG, 'nova atração', novaLabel, flow.choice === 'new', function () {
				chooseAttraction('new');
			}));
			list.appendChild(nova);
			list.appendChild(ATR.row(FOLDER_SVG, 'outra pasta…', 'navegador de pastas', flow.choice === 'folder', function () {
				chooseAttraction('folder');
			}));
			nova.classList.toggle('is-open', flow.choice === 'new');
		});
		list.hidden = false;

		var more = flow.matches.length - m.length;

		$('claq-hint').textContent = more > 0 ? '+ ' + more + (more === 1 ? ' outra atração: continue digitando' : ' outras atrações: continue digitando') : ''; // sem nenhuma: o próprio título da lista diz
		if (flow.choice === 'new') renderNova();
		$('claq-next').disabled = !flow.claquete || (flow.choice === 'new' && !novaReady());
		setTimeout(fitHeight, 300);
	}

	async function chooseAttraction(key) {
		flow.choice = key;
		state.userChose = true;
		if (key === 'new') {
			await ensureBases();
			if (!state.novaEdited) $('nova-name').value = typedName();
		}
		renderAttractions();
		if (key === 'new') $('nova-name').focus();
	}

	async function claqueteNext() {
		if (!flow.claquete) return;

		// a busca ainda não respondeu: espera ela
		if (state.lookupTimer) {
			clearTimeout(state.lookupTimer);
			state.lookupTimer = null;

			try {
				flow.matches = (await findAttractions(flow.claquete)).matches;
			} catch (err) {
				flow.matches = [];
			}
			if (!state.userChose) flow.choice = flow.matches.length ? 'm0' : 'new';
		}

		if (/^m\d+$/.test(flow.choice)) return pickAttraction(flow.matches[+flow.choice.slice(1)]);
		if (flow.choice === 'new') return novaNext();

		if (flow.choice === 'folder') {
			var picked = PAD_BRIDGE.pickFolder('Pasta do projeto');

			if (!picked) return;

			pickAttraction({ name: picked.replace(/[\\\/]+$/, '').split(/[\\\/]/).pop(), path: picked, display: picked });
		}
	}

	// a atração escolhida (a achada, a nova ou a pasta): segue para CRIAR
	function pickAttraction(m) {
		flow.pick = m;
		flow.output = m.out || ''; // a pasta de output da atração (o índice), se houver
		openCriar();
	}

	/* nova atração: as categorias da configuração (aba PROJETO) e a saída livre */

	async function ensureBases() {
		if (state.basesLoaded) return;

		try {
			state.bases = await newBases();
		} catch (err) {
			state.bases = [];
		}
		state.basesLoaded = true;
		buildBaseSelect();
	}

	function buildBaseSelect() {
		var select = $('nova-base');
		var free = !state.bases.length;
		var last = pref(PREF_BASE);

		// sem categorias na configuração: a pasta é livre (o botão no lugar da lista)
		select.closest('.select').hidden = free;
		$('nova-pick').hidden = !free;
		$('nova-free').hidden = !free;
		select.textContent = '';
		state.bases.forEach(function (b, i) {
			var opt = el('option', null, b.label);

			opt.value = String(i);
			if (b.label === last) opt.selected = true; // a última categoria usada
			select.appendChild(opt);
		});

		var other = el('option', null, 'nenhuma destas: escolher a pasta…'); // sempre: a saída livre, quando nenhuma categoria serve

		other.value = 'pick';
		select.appendChild(other);
		PAD_DROPDOWN.enhance(select, function (value) {
			var base = state.bases[+value];
			var icon = value === 'pick' ? SEARCH_SVG : (base && PAD_UTIL.categoryIcon(base.icon)) || FOLDER_SVG; // o ícone escolhido para a categoria (aba PROJETO)

			return icon.replace('<svg', '<svg class="dropdown-svg"');
		});
		PAD_DROPDOWN.refresh(select);
	}

	function novaBase() {
		var v = $('nova-base').value;

		if (!state.bases.length || v === 'pick') return state.pickedBase || null;

		return state.bases[+v] || null;
	}

	function novaReady() {
		return !!(aepName($('nova-name').value) && novaBase());
	}

	function renderNova() {
		var base = novaBase();
		var name = aepName($('nova-name').value);
		var preview = $('nova-preview');

		preview.innerHTML = '';

		if (base && base.pattern) {
			// o caminho com os tokens trocados; da pasta da atração em diante, em destaque
			var full = displayPath(fillPattern(base.pattern, name || '…', base.label));
			var head = displayPath(fillPattern(base.pattern.slice(0, base.pattern.indexOf('{atracao}')), name || '…', base.label));
			var cut = full.indexOf(head) === 0 ? head.length - 1 : full.lastIndexOf('/');

			preview.appendChild(el('span', null, full.slice(0, cut + 1)));
			preview.appendChild(el('b', null, full.slice(cut + 1)));
			if (base.offline) preview.appendChild(el('em', 'nova-offline', 'pasta deste computador: a da categoria não está acessível'));
		} else if (base) {
			preview.appendChild(el('span', null, base.display + '/'));
			preview.appendChild(el('b', null, name || '…'));
		}

		$('claq-next').disabled = !flow.claquete || !novaReady();
	}

	function novaNext() {
		var base = novaBase();
		var name = $('nova-name').value.trim().toUpperCase(); // a atração nova em maiúsculas (com os acentos)

		if (!base || !aepName(name)) return;
		if (base.pattern) pref(PREF_BASE, base.label);

		// categoria configurada: o caminho dela com os tokens trocados
		if (base.pattern) {
			var path = fillPattern(base.pattern, name, base.label);

			return pickAttraction({ name: name, path: path, display: displayPath(path), out: base.outPattern ? fillPattern(base.outPattern, name, base.label) : '' });
		}

		// pasta livre: uma pasta com o nome dela dentro da escolhida (sem output proposto)
		var sep = /\\/.test(base.path) ? '\\' : '/';

		pickAttraction({ name: name, path: base.path.replace(/[\\\/]+$/, '') + sep + aepName(name), display: base.display + '/' + aepName(name) });
	}

	/* ---------------------------------------------------------------
	   2 · CRIAR
	   o que é no topo (o nome do .aep, a claquete e a árvore mudam enquanto digita), o .aep que já existe ali
	   mesmo e a pasta de output numa linha só. Enter = Criar projeto
	   --------------------------------------------------------------- */

	function openCriar() {
		flow.what = '';
		flow.mode = '';
		state.outOpen = false;
		state.outChoice = '';
		state.outUserChose = false;
		state.otherOutput = '';
		state.plan = null;
		$('arq-what').value = '';
		$('criar-tree').textContent = '';
		$('criar-opts').textContent = '';
		show('criar');
		planCriar();
	}

	function planArgs(extra) {
		return Object.assign({ kind: 'program', atracao: flow.pick.name, path: flow.pick.path, what: flow.what, output: flow.output || '' }, extra || {});
	}

	function planCriar() {
		clearTimeout(state.planTimer);

		var seq = ++state.planSeq;

		state.planTimer = setTimeout(async function () {
			try {
				var plan = await call('projectPlan', planArgs());

				if (seq !== state.planSeq) return;
				state.plan = plan;
				renderCriar(plan);
			} catch (err) {
				if (seq === state.planSeq) status(err.message, 'error');
			}
		}, state.plan ? 140 : 0);
	}

	function treeLine(depth, html, text, cls) {
		var line = el('div', 'wz-tree-line' + (cls ? ' ' + cls : ''));

		// o arquivo: ícone e nome juntos no destaque (a pílula branca)
		var holder = cls === 'is-file' ? line.appendChild(el('span', 'wz-tree-pill')) : line;

		line.style.setProperty('--depth', depth);
		holder.insertAdjacentHTML('afterbegin', html);
		holder.appendChild(el('span', null, text));

		return line;
	}

	function renderCriar(plan) {
		var tree = $('criar-tree');
		var meta = $('criar-meta');
		var user = el('span');

		// o .aep que já existe: abrir ou salvar como … 2 (o padrão)
		if (!plan.exists) flow.mode = '';
		else if (!flow.mode) flow.mode = 'increment';

		var fileName = plan.exists && flow.mode === 'increment' ? plan.fileBase + ' 2.aep' : plan.fileName;

		meta.textContent = '';
		meta.appendChild(el('span', null, aepName(flow.pick.name)));
		user.innerHTML = USER_SVG;
		user.appendChild(document.createTextNode(plan.user));
		meta.appendChild(user);
		meta.title = plan.root;

		tree.textContent = '';
		tree.appendChild(treeLine(0, FOLDER_SVG, plan.rootName + (plan.rootExists ? '' : '  ·  nova')));
		tree.appendChild(treeLine(1, FOLDER_SVG, plan.projectsName + (plan.projectsExists ? '  ·  já existe' : ''), plan.projectsExists ? 'is-old' : ''));
		tree.appendChild(treeLine(2, FILE_SVG, fileName, 'is-file'));
		(plan.folders || []).forEach(function (f) {
			tree.appendChild(treeLine(f.depth + 1, FOLDER_SVG, f.name));
		});

		renderExisting(plan);
		renderOutput(plan);
		$('criar-go').textContent = plan.exists && flow.mode === 'open' ? 'Abrir projeto' : 'Criar projeto';
		fitHeight();
	}

	// os .aep que já estão na pasta, numa linha (o último alterado primeiro); o repetido ganha as duas saídas
	function renderExisting(plan) {
		var line = $('arq-exist');
		var dup = $('arq-dup');
		var list = (plan.existing || []).filter(function (f) {
			return f.name !== plan.fileBase;
		});
		var same = (plan.existing || []).filter(function (f) {
			return f.name === plan.fileBase;
		})[0];

		line.textContent = '';
		line.hidden = !list.length || plan.exists;
		if (list.length && !plan.exists) {
			line.appendChild(document.createTextNode('já na pasta: '));
			line.appendChild(el('b', null, list[0].name + '.aep'));
			line.appendChild(document.createTextNode(' · ' + when(list[0].modified) + (list.length > 1 ? ' · +' + (list.length - 1) : '')));
		}

		dup.hidden = !plan.exists;
		if (plan.exists) {
			var note = $('arq-dup-note');

			note.textContent = '';
			note.appendChild(el('b', null, plan.fileName));
			note.appendChild(document.createTextNode(' já existe' + (same && same.modified ? ' (' + when(same.modified) + ')' : '')));
			$('arq-increment').textContent = 'salvar como … 2';
			Array.prototype.forEach.call(dup.querySelectorAll('input'), function (input) {
				input.checked = input.value === flow.mode;
			});
		}
	}

	// hoje 14:32 · ontem 09:10 · 28/10 · 28/10/2025
	function when(ms) {
		if (!ms) return '';

		var d = new Date(ms);
		var now = new Date();
		var pad = function (n) {
			return (n < 10 ? '0' : '') + n;
		};
		var time = pad(d.getHours()) + ':' + pad(d.getMinutes());
		var day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

		if (ms >= day) return 'hoje ' + time;
		if (ms >= day - 86400000) return 'ontem ' + time;

		return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + (d.getFullYear() === now.getFullYear() ? '' : '/' + d.getFullYear());
	}

	// a pasta de output numa linha (a escolhida e o caminho); o clique abre as opções embaixo: a da atração, a
	// subpasta do "o que é" (…/2026/SERVICO), pular e outra pasta… (o campo com a pastinha). cada uma diz se já
	// existe ou é nova (a nova é criada junto). a escolha (menos a outra pasta) fica lembrada neste computador
	function renderOutput(plan) {
		var box = $('criar-opts');
		var base = plan.output || '';
		var atracao = aepName(flow.pick.name);
		var choices = [];

		// o caminho mostrado a partir da pasta de cima da atração (o começo fica no "…")
		var shortPath = function (full) {
			var path = String(full).replace(/\\/g, '/');
			var at = path.toUpperCase().indexOf('/' + atracao + '/');
			var from = path.lastIndexOf('/', (at < 0 ? path.lastIndexOf('/') : at) - 1);

			return (from > 0 ? '…' : '') + path.slice(Math.max(from, 0));
		};

		if (base) choices.push({ key: 'main', label: shortPath(base), title: base.replace(/\\/g, '/').split('/').pop(), note: plan.outputExists ? 'já existe' : 'nova', output: base });
		if (plan.outputSub) choices.push({ key: 'sub', label: shortPath(plan.outputSub), title: plan.outputSub.replace(/\\/g, '/').split('/').pop(), note: plan.outputSubExists ? 'já existe' : 'nova', output: plan.outputSub });
		choices.push({ key: 'skip', label: 'pular', title: 'pular', note: 'não grava', output: '' });
		choices.push({ key: 'other', label: 'outra pasta…', title: state.otherOutput ? state.otherOutput.replace(/[\\\/]+$/, '').split(/[\\\/]/).pop() : 'outra pasta', note: '', output: state.otherOutput || '' });

		// a escolhida: a desta vez, a lembrada (se valer aqui) ou, nessa ordem, a subpasta, a da atração, pular
		var has = function (key) {
			return choices.some(function (c) {
				return c.key === key;
			});
		};

		// sem escolha da pessoa nesta vez, a sugestão é refeita a cada "o que é" (a subpasta só existe com ele)
		if (!state.outUserChose || !has(state.outChoice)) state.outChoice = has(pref(PREF_OUT)) ? pref(PREF_OUT) : has('sub') ? 'sub' : has('main') ? 'main' : 'skip';

		var current = choices.filter(function (c) {
			return c.key === state.outChoice;
		})[0];

		state.createOut = { output: current.key === 'other' ? state.otherOutput || '' : current.output, outputCreate: current.key !== 'skip' };

		box.textContent = '';

		var line = el('button', 'out-line' + (state.outOpen ? ' is-open' : ''));
		var text = el('span', 'out-line-text');

		line.type = 'button';
		line.setAttribute('aria-expanded', String(!!state.outOpen));
		line.insertAdjacentHTML('afterbegin', OUTPUT_SVG);
		text.appendChild(el('b', null, 'pasta de output · ' + (current.key === 'skip' ? 'pular' : current.title + (current.note ? ' · ' + current.note : ''))));
		text.appendChild(el('span', null, current.key === 'skip' ? 'não cria nem grava nada (dá para escolher depois, no editor)' : current.key === 'other' && !state.otherOutput ? 'escolha a pasta' : '‎' + current.label.replace(/^…/, '…') + '‎'));
		line.appendChild(text);
		line.insertAdjacentHTML('beforeend', CHEVRON_SVG);
		line.addEventListener('click', function () {
			state.outOpen = !state.outOpen;
			renderOutput(plan);
		});
		box.appendChild(line);

		// as opções (abrem embaixo da linha, animadas)
		var opts = el('div', 'out-opts' + (state.outOpen ? ' is-open' : ''));
		var inner = el('div', 'out-opts-inner');

		choices.forEach(function (c) {
			var row = el('label', 'out-opt' + (c.key === state.outChoice ? ' is-on' : ''));
			var input = el('input');

			input.type = 'radio';
			input.name = 'out-choice';
			input.checked = c.key === state.outChoice;
			row.addEventListener('click', function (e) {
				if (e.target.closest('.opt-pick')) return;
				e.preventDefault();
				state.outChoice = c.key;
				state.outUserChose = true;
				if (c.key !== 'other') pref(PREF_OUT, c.key);
				status('');
				if (c.key === 'other' && !state.otherOutput) pickOther();
				renderOutput(plan);
			});
			row.appendChild(input);
			row.appendChild(el('span', 'out-dot'));
			row.appendChild(el('span', 'out-opt-label', c.key === 'other' && state.otherOutput ? state.otherOutput : c.label));
			if (c.note) row.appendChild(el('small', null, c.note));
			if (c.key === 'other') {
				var pick = el('button', 'mini-button opt-pick');

				pick.type = 'button';
				pick.title = 'escolher a pasta de output';
				pick.setAttribute('aria-label', pick.title);
				pick.innerHTML = FOLDER_SVG;
				pick.addEventListener('click', function (e) {
					e.preventDefault();
					pickOther();
				});
				row.appendChild(pick);
			}
			inner.appendChild(row);
		});
		opts.appendChild(inner);
		box.appendChild(opts);
		setTimeout(fitHeight, 300);

		function pickOther() {
			var picked = PAD_BRIDGE.pickFolder('Pasta de output do projeto', state.otherOutput || base);

			if (!picked) return;
			state.otherOutput = picked;
			state.outChoice = 'other';
			state.outUserChose = true;
			renderOutput(plan);
		}
	}

	function createArgs() {
		return planArgs(Object.assign({ mode: state.plan && state.plan.exists ? flow.mode : '' }, state.createOut || {}));
	}

	async function create(args) {
		if (state.busy) return;
		if (!args && state.outChoice === 'other' && !state.otherOutput) {
			status('#PAD_091 - escolha a outra pasta de output (ou pule).', 'error');
			return;
		}
		if (!flow.pick) return;

		state.busy = true;
		$('criar-go').disabled = true;
		$('criar-go').textContent = 'Criando…';

		try {
			var res = await call('projectCreate', args || createArgs());

			flow.history = [];
			status(res.opened ? 'projeto aberto.' : 'projeto criado: ' + res.file.split(/[\\\/]/).pop(), 'success');
			await refresh(true);
		} catch (err) {
			status(err.message, 'error');
		} finally {
			state.busy = false;
			$('criar-go').disabled = false;
			$('criar-go').textContent = 'Criar projeto';
		}
	}

	/* ---------------------------------------------------------------
	   editor (projeto criado)
	   --------------------------------------------------------------- */

	// o editor: a atração (buscada como na etapa ATRAÇÃO) e o designer, o que é, e as pastas (o caminho no campo,
	// a pastinha troca). Salvar grava os dados e leva o .aep para a pasta de projetos da estrutura, com o nome da
	// atração + o que é. um projeto salvo sem os dados do padeiro (adopt) entra direto aqui: a busca roda sozinha
	// com o nome do arquivo e a primeira atração achada já vem marcada (o resto do nome vai para o o que é).
	function renderEditor(cur, adopt) {
		var key = (adopt ? 'a|' : 'c|') + cur.file;

		state.adopt = !!adopt;
		$('ed-hint').hidden = !adopt;
		// com os dados, mas salvo fora da pasta dele (ex: "salvar como" na Área de Trabalho): Salvar leva o .aep de volta
		$('ed-hint').textContent = cur.outside
			? 'o projeto está salvo fora da pasta dele: Salvar leva o .aep para a pasta abaixo.'
			: 'projeto salvo sem os dados do padeiro: confira a atração, o que é e as pastas e salve.';
		$('ed-user').placeholder = cur.defaultUser || 'designer';

		// os campos só são preenchidos quando o projeto muda: a atualização a cada 1,5 s não apaga o que está
		// sendo digitado (nem a pasta escolhida e ainda não salva)
		if (state.editorKey !== key) {
			state.editorKey = key;
			state.edMatches = [];
			state.edPicked = '';
			state.edRoot = cur.root || '';
			state.edOutput = cur.output || '';
			$('ed-user').value = cur.designer;
			$('ed-atr-list').hidden = true;

			state.edKeep = '';
			if (cur.atracao) {
				// o que é: o gravado (padeiro:oQueE) ou, sem ele, o que vem depois da atração no nome do arquivo. um
				// nome fora desse padrão (projeto antigo) fica como está até a atração ou o que é mudarem
				var atr = aepName(cur.atracao);
				var fname = aepName(String(cur.fileName || '').replace(/\.aep$/i, ''));
				var what = cur.oQueE || (fname.indexOf(atr + ' ') === 0 ? fname.slice(atr.length + 1) : '');

				$('ed-atracao').value = cur.atracao.toUpperCase();
				$('ed-what').value = what;
				if (!cur.oQueE && fname && fname !== atr && fname.indexOf(atr + ' ') !== 0) state.edKeep = String(cur.fileName).replace(/\.aep$/i, '');
			} else {
				var base = String(cur.fileName || '').replace(/\.aep$/i, '');

				$('ed-atracao').value = base.toUpperCase();
				$('ed-what').value = '';
				if (base) edLookup(base, true);
			}
		}
		pathValue($('ed-root'), state.edRoot || cur.file || '');
		pathValue($('ed-output'), state.edOutput);
		$('ed-root').title = cur.file || '';
		edFile();
		fitHeight();
	}

	// o nome do .aep: a atração + o que é (e o de hoje, quando muda)
	function edFile() {
		var name = state.edKeep || aepName($('ed-atracao').value + ' ' + $('ed-what').value);
		var now = state.current ? String(state.current.fileName || '').replace(/\.aep$/i, '') : '';
		var span = $('ed-file').querySelector('span');

		span.textContent = '';
		span.appendChild(el('b', null, name || '…'));
		span.appendChild(document.createTextNode('.aep' + (now && name && aepName(now) !== aepName(name) ? ' · hoje: ' + now + '.aep' : '')));
	}

	// a busca da atração no editor: os cartões logo abaixo do campo; auto (o nome do arquivo) já marca a primeira
	function edLookup(text, auto) {
		clearTimeout(state.edTimer);

		var seq = state.edSeq = (state.edSeq || 0) + 1;

		if (!aepName(text)) {
			state.edMatches = [];
			edRenderList();
			return;
		}

		state.edTimer = setTimeout(async function () {
			var res;

			try {
				res = await findAttractions(text);
			} catch (err) {
				res = { matches: [] };
			}

			if (seq !== state.edSeq) return;

			state.edMatches = res.matches;
			if (auto && res.matches.length) edPick(0, text);
			else edRenderList();
		}, LOOKUP_MS);
	}

	function edRenderList() {
		var list = $('ed-atr-list');
		var m = state.edMatches.slice(0, LIST_MAX);
		var typed = aepName($('ed-atracao').value);
		var open = !!typed && !state.edPicked;

		ATR.resize(list, function () {
			list.textContent = '';
			list.appendChild(ATR.group(m.length ? 'atrações' : 'atração não encontrada: fica como está digitado'));
			m.forEach(function (match, i) {
				list.appendChild(ATR.row(matchIcon(match), match.name.toUpperCase(), match.category || '', state.edPicked === match.path, function () {
					edPick(i);
				}, match.display));
			});
		});
		list.hidden = !open;
		$('ed-combo').classList.toggle('is-open', open);
		setTimeout(fitHeight, 300);
	}

	// escolheu: o nome oficial, a pasta da atração (o .aep vai para a de projetos dela ao salvar) e a de output
	// dela, se o projeto ainda não tem. com o nome do arquivo (auto), o que sobra depois da atração é o o que é.
	function edPick(i, typed) {
		var match = state.edMatches[i];

		if (!match) return;

		var rest = aepName(typed || '');
		var atr = aepName(match.name);

		state.edPicked = match.path;
		state.edKeep = '';
		$('ed-atracao').value = match.name.toUpperCase();
		if (typed && !$('ed-what').value && rest.indexOf(atr + ' ') === 0) $('ed-what').value = rest.slice(atr.length + 1);
		if (match.path) {
			state.edRoot = match.path;
			pathValue($('ed-root'), displayPath(match.path));
		}
		if (!state.edOutput && match.out) {
			state.edOutput = match.out;
			pathValue($('ed-output'), displayPath(match.out));
		}
		edRenderList();
		edFile();
	}

	// o caminho no campo, mostrando o fim (a parte que muda)
	function pathValue(input, value) {
		input.value = value;
		input.title = value;
		requestAnimationFrame(function () {
			input.scrollLeft = input.scrollWidth;
		});
	}

	// as pastas escolhidas só valem ao salvar
	function editorOutput() {
		var picked = PAD_BRIDGE.pickFolder('Pasta de output do projeto');

		if (!picked) return;

		state.edOutput = picked;
		pathValue($('ed-output'), picked);
		status('Salvar grava a pasta de output no projeto.', '');
	}

	function editorMove() {
		var picked = PAD_BRIDGE.pickFolder('Nova pasta do projeto');

		if (!picked) return;

		state.edRoot = picked;
		pathValue($('ed-root'), picked);
		status('Salvar leva o .aep para essa pasta.', '');
	}

	// salvar: grava os dados, leva o .aep para a pasta dele com o nome certo e fecha a janela
	async function editorSave() {
		var atracao = $('ed-atracao').value.trim();

		if (!aepName(atracao)) {
			status('#PAD_090 - escolha a atração do projeto.', 'error');
			$('ed-atracao').focus();
			return;
		}

		try {
			var cur = await call('projectSave', { atracao: atracao, what: $('ed-what').value.trim(), designer: $('ed-user').value, root: state.edRoot || $('ed-root').value, output: state.edOutput, fileBase: state.edKeep });

			state.editorKey = null;
			state.current = cur;
			renderEditor(cur);
			// salvo com outro nome ou em outro lugar: o arquivo antigo continua lá (a janela fica aberta para avisar)
			if (cur.moved) status('salvo como ' + cur.fileName + '. o arquivo antigo continua em ' + cur.moved + '.', 'success');
			else PAD_BRIDGE.closePanel();
		} catch (err) {
			status(err.message, 'error');
		}
	}

	function startWizard() {
		flow.history = [];
		flow.matches = [];
		flow.pick = null;
		flow.output = '';
		flow.choice = '';
		flow.claquete = '';
		state.userChose = false;
		state.novaEdited = false;
		state.outChoice = '';
		state.otherOutput = '';
		state.editorKey = null;
		$('claq').value = '';
		$('nova-name').value = '';
		$('claq-next').disabled = true;
		renderAttractions();
		show('claquete', false);
		ensureBases();
		// o índice já carrega ao abrir a etapa: a primeira tecla não espera por ele
		candidates().catch(function () { });
	}

	/* ---------------------------------------------------------------
	   acompanha o projeto aberto
	   --------------------------------------------------------------- */

	async function refresh(force) {
		if (state.busy && !force) return;

		var cur;

		try {
			cur = await call('projectCurrent');
		} catch (err) {
			return;
		}

		var key = cur.created ? 'c|' + cur.file : 'n|' + cur.file;
		var changed = !state.current || state.currentKey !== key;

		state.current = cur;
		state.currentKey = key;

		if (cur.created) {
			if (state.screen !== 'editor') show('editor', false);
			renderEditor(cur);
		} else if (cur.file && (changed || !state.screen || state.screen === 'editor')) {
			// salvo, mas sem os dados do padeiro (ou fora da pasta dele): pula as etapas (a atração é o nome do
			// arquivo, a pasta é a dele)
			if (state.screen !== 'editor') show('editor', false);
			renderEditor(cur, true);
		} else if (changed || !state.screen || state.screen === 'editor') {
			startWizard();
		}
	}

	/* ---------------------------------------------------------------
	   início
	   --------------------------------------------------------------- */

	function onEnter(id, fn) {
		$(id).addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				fn();
			}
		});
	}

	function init() {
		$('claq').addEventListener('input', lookup);
		onEnter('claq', claqueteNext);
		// duplo clique num item da lista: escolhe e segue (Próximo)
		$('atr-list').addEventListener('dblclick', function (e) {
			if (e.target.closest('.combo-item') && !$('claq-next').disabled) claqueteNext();
		});
		$('claq-next').addEventListener('click', claqueteNext);

		// nova atração: o nome (digitado à mão, para de seguir a busca) e a categoria
		$('nova-name').addEventListener('input', function () {
			state.novaEdited = true;
			renderNova();
		});
		onEnter('nova-name', claqueteNext);
		$('nova-pick').addEventListener('click', function () {
			var picked = PAD_BRIDGE.pickFolder('Dentro de qual pasta');

			if (picked) state.pickedBase = { label: picked.split(/[\\\/]/).pop(), path: picked, display: picked };
			$('nova-pick').querySelector('span').textContent = state.pickedBase ? state.pickedBase.display : 'escolher a pasta…';
			renderNova();
		});
		$('nova-base').addEventListener('change', function () {
			if (this.value === 'pick') {
				var picked = PAD_BRIDGE.pickFolder('Dentro de qual pasta');

				state.pickedBase = picked ? { label: picked.split(/[\\\/]/).pop(), path: picked, display: picked } : null;
			}

			renderNova();
		});

		// CRIAR: o que é (a árvore e o nome mudam enquanto digita) e o .aep repetido
		$('arq-what').addEventListener('input', function () {
			flow.what = this.value;
			flow.mode = '';
			planCriar();
		});
		onEnter('arq-what', function () {
			if (state.plan && !state.planTimer) create();
			else setTimeout(function () {
				create();
			}, 250);
		});
		$('arq-dup').addEventListener('change', function (e) {
			flow.mode = e.target.value;
			if (state.plan) renderCriar(state.plan);
		});

		$('criar-go').addEventListener('click', function () {
			create();
		});

		Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (btn) {
			btn.addEventListener('click', back);
		});

		$('ed-save').addEventListener('click', editorSave);
		$('ed-move').addEventListener('click', editorMove);
		$('ed-output-pick').addEventListener('click', editorOutput);
		['ed-what', 'ed-user'].forEach(function (id) {
			onEnter(id, editorSave);
		});
		// a atração: digitar busca (a escolhida sai); Enter escolhe a primeira da lista
		$('ed-atracao').addEventListener('input', function () {
			state.edPicked = '';
			state.edKeep = '';
			edLookup(this.value, false);
			edFile();
		});
		onEnter('ed-atracao', function () {
			if (!$('ed-atr-list').hidden && state.edMatches.length) edPick(0);
			else editorSave();
		});
		$('ed-what').addEventListener('input', function () {
			state.edKeep = '';
			edFile();
		});
		$('ed-user').addEventListener('input', function () {
			this.value = this.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9._-]/g, '');
		});

		// menu "⋯" do editor
		var menu = $('app-menu');

		menu.addEventListener('click', async function (e) {
			var btn = e.target.closest('button[data-action]');

			if (!btn) return;

			menu.removeAttribute('open');

			var action = btn.dataset.action;

			if (action === 'docs') PAD_BRIDGE.openUrl(DOCS_URL);
			if (action === 'reload') location.reload();
			if (action === 'new') startWizard();

			if (action === 'open') {
				try {
					await call('projectOpenFolder');
				} catch (err) {
					status(err.message, 'error');
				}
			}
		});
		document.addEventListener('click', function (e) {
			if (!menu.contains(e.target)) menu.removeAttribute('open');
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				menu.removeAttribute('open');
				if (state.screen !== 'claquete' && state.screen !== 'editor') back();
			}
		});

		refresh();
		setInterval(function () {
			if (!document.hidden) refresh();
		}, 1500);
		window.addEventListener('focus', function () {
			refresh();
		});
	}

	init();
})();
