/*

---------------------------------------------------------------
> PROJETO — um projeto novo pela atração, em etapas, e o editor
---------------------------------------------------------------

Projeto nunca salvo: uma tela.
  PROJETO → o caminho: o começo busca a atração no índice da busca (ou uma nova, nome + categoria, ou outra
            pasta); a cada barra (ATRAÇÃO/PASTA/…), a lista mostra as pastas daquele nível e a nova com o nome
            digitado
  O QUE É → o .aep é o último nível (ou a atração) + isso, sem acentos
  OUTPUT  → a pasta de output da atração e, com barras, as subpastas dela (as novas são criadas)
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
	var FILM_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M7.5 5v14M16.5 5v14M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4" /></svg>';
	var USER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5" /></svg>';

	// o que foi escolhido até aqui
	var flow = {
		claquete: '',
		matches: [],
		pick: null, // o destino: { name, path, display, out, quadro (as pastas abaixo da atração), segs }
		choice: '', // sem a barra: '' (nada), 'new' (atração nova) ou 'folder' (outra pasta)
		attr: null, // a atração do caminho (com a barra)
		walk: null, // as pastas do caminho (walkPath)
		what: '',
		mode: '' // '', 'open', 'increment' (arquivo existente)
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

	// a janela fica do tamanho que a pessoa deixou (nunca é redimensionada): o que não cabe rola, o rodapé fica

	function show(name) {
		state.screen = name;
		Array.prototype.forEach.call(document.querySelectorAll('.wz-screen'), function (sc) {
			sc.hidden = sc.id !== 'sc-' + name;
		});
		status('');


		var focus = { claquete: 'claq' }[name];

		if (focus) setTimeout(function () {
			$(focus).focus();
		}, 30);
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
	   projeto novo, numa tela
	   o caminho (ATRAÇÃO/PASTA/…): o começo busca a atração (ou uma nova, ou outra pasta); a cada barra, a lista
	   mostra as pastas daquele nível. o que é (o .aep é o último nível + isso) e o output (a pasta da atração e,
	   com barras, as subpastas dela). Criar projeto cria as pastas novas, a estrutura e salva o .aep
	   --------------------------------------------------------------- */

	var LIST_MAX = 4; // quantas atrações aparecem (as outras: continue digitando)
	var LEVEL_MAX = 6; // quantas pastas de um nível aparecem
	var PREF_BASE = 'pad.project.base'; // a última categoria de uma atração nova, neste computador

	function pref(key, value) {
		try {
			if (value === undefined) return localStorage.getItem(key) || '';
			localStorage.setItem(key, value);
		} catch (err) { }

		return '';
	}

	// a estrutura animada (só com o campo vazio: digitando, o resto da tela ocupa o lugar)
	async function showShape() {
		var box = $('claq-shape');
		var empty = !$('claq').value.trim();

		$('claq-clear').hidden = !$('claq').value; // o × aparece com algo digitado

		box.hidden = !empty;
		$('claq-rest').hidden = empty;
		$('claq-out').hidden = empty;
		if (!empty) return PAD_SHAPE_ANIM.stop(box);
		if (box._saTimer) return;

		if (!state.shape) {
			try {
				state.shape = (await call('projectShape')).folders;
			} catch (err) {
				state.shape = [];
			}
		}

		// só as pastas (sem o que cada uma recebe)
		if (!$('claq').value.trim() && state.screen === 'claquete') PAD_SHAPE_ANIM.mount(box, state.shape.map(function (f) {
			return { name: f.name, depth: f.depth, contents: [] };
		}), { root: '…' });
	}

	/* ---------- caminhos com barra: as pastas de cada nível ---------- */

	function sepOf(path) {
		return /\\/.test(path) ? '\\' : '/';
	}

	function joinPath(base, name) {
		return String(base).replace(/[\\\/]+$/, '') + sepOf(base) + name;
	}

	function folderName(text) {
		return String(text || '').toUpperCase().replace(/\s+/g, ' ').trim();
	}

	// as pastas de um nível (lidas na hora, uma vez por caminho). plain: o output (sem tirar a estrutura do coletar)
	async function listFolders(path, plain) {
		var cache = state.folderCache || (state.folderCache = {});
		var key = (plain ? 'p|' : 'a|') + path;

		if (!cache[key]) {
			try {
				cache[key] = await call('projectFolders', { path: path, plain: !!plain });
			} catch (err) {
				cache[key] = { root: '', rootName: '', exists: false, folders: [] };
				status(err.message, 'error');
			}
		}

		return cache[key];
	}

	function matchFolders(list, text) {
		var words = aepName(text).split(' ').filter(Boolean);

		return (list || []).filter(function (f) {
			var name = aepName(f.name);

			return words.every(function (w) {
				return name.indexOf(w) >= 0;
			});
		});
	}

	function exactFolder(list, text) {
		return (list || []).filter(function (f) {
			return aepName(f.name) === aepName(text);
		})[0] || null;
	}

	// anda pelo caminho a partir de base: parts = os níveis fechados (antes da última barra), last = o que está sendo
	// digitado. o que existe é usado; o que não existe é novo (e o que vem depois dele também).
	// → { base (a pasta de partida), here (a do último nível fechado), hereName, info (as pastas dela; null: nova),
	//     shown (as que batem com last), segs [{ name, isNew }] (com last), path (o destino, com last) }
	async function walkPath(base, parts, last, plain) {
		var info = await listFolders(base, plain);
		var here = info.root || base;
		var hereName = info.rootName || here.split(/[\\\/]/).pop();
		var segs = [];

		for (var i = 0; i < parts.length; i++) {
			var name = parts[i].trim();

			if (!name) continue;

			var hit = info ? exactFolder(info.folders, name) : null;

			if (hit) {
				here = hit.path;
				segs.push({ name: hit.name, isNew: false });
				info = await listFolders(here, plain);
			} else {
				here = joinPath(here, folderName(name));
				segs.push({ name: folderName(name), isNew: true });
				info = null;
			}
			hereName = segs[segs.length - 1].name;
		}

		var lastHit = last && info ? exactFolder(info.folders, last) : null;
		var path = !last ? here : lastHit ? lastHit.path : joinPath(here, folderName(last));
		var all = !last ? segs : segs.concat([{ name: lastHit ? lastHit.name : folderName(last), isNew: !lastHit }]);

		return { base: info && !segs.length ? info.root || base : base, here: here, hereName: hereName, info: info, shown: info ? matchFolders(info.folders, last) : [], segs: all, path: path };
	}

	// as linhas de um nível: as pastas (o clique desce nela) e, no fim, a nova com o nome digitado
	function levelRows(list, walk, last, onPick, onNew) {
		var info = walk.info;
		var hereName = (walk.hereName || '').toUpperCase();

		if (!info) list.appendChild(ATR.group('dentro da pasta nova ' + hereName));
		else {
			list.appendChild(ATR.group(!info.folders.length ? 'nenhuma pasta em ' + hereName : walk.shown.length ? 'pastas em ' + hereName : 'nenhuma pasta com esse nome'));
			walk.shown.slice(0, LEVEL_MAX).forEach(function (f) {
				list.appendChild(ATR.row(FOLDER_SVG, f.name.toUpperCase(), '', false, function () {
					onPick(f.name);
				}, f.path));
			});
		}
		list.appendChild(ATR.sep());
		list.appendChild(ATR.row(PLUS_SVG, 'nova pasta', last ? folderName(last) : 'digite depois da /', false, function () {
			if (last) onNew(folderName(last));
		}));

		var more = walk.shown.length - LEVEL_MAX;

		return more > 0 ? '+ ' + more + (more === 1 ? ' outra pasta: continue digitando' : ' outras pastas: continue digitando') : '';
	}

	// o caminho numa linha: a pasta de partida e os níveis em destaque (em negrito)
	function destLine(node, base, segs, tail) {
		node.textContent = '';
		node.classList.remove('is-hint');
		node.insertAdjacentHTML('afterbegin', FOLDER_SVG);

		var span = el('span');

		span.appendChild(document.createTextNode('‎' + String(base).replace(/\\/g, '/')));
		segs.forEach(function (s) {
			span.appendChild(document.createTextNode('/'));
			span.appendChild(el('b', null, s.name));
		});
		if (tail) span.appendChild(document.createTextNode('/' + tail));
		node.appendChild(span);
		node.title = String(base).replace(/\\/g, '/') + segs.map(function (s) {
			return '/' + s.name;
		}).join('') + (tail ? '/' + tail : '');
	}

	function hintLine(node, text) {
		node.textContent = text;
		node.title = '';
		node.classList.add('is-hint');
	}

	/* ---------- o campo do projeto: a atração e as pastas ---------- */

	function claqParts() {
		var parts = $('claq').value.split('/');

		return { first: parts[0].trim(), deep: parts.length > 1, levels: parts.slice(1, -1), last: parts[parts.length - 1].trim(), parts: parts };
	}

	function lookup() {
		clearTimeout(state.lookupTimer);
		showShape();

		var claq = $('claq').value.trim();
		var seq = ++state.lookupSeq;
		var p = claqParts();

		flow.claquete = claq;
		state.claqClosed = false;

		// a atração escolhida fica enquanto o começo do campo for o nome dela (com ou sem a barra); com a barra, as
		// pastas dela. outro texto: volta a busca das atrações
		if (p.deep) {
			if (!flow.attr && /^m\d+$/.test(flow.choice)) flow.attr = flow.matches[+flow.choice.slice(1)] || null;
			if (flow.choice !== 'new') flow.choice = '';
		} else {
			if (!(flow.attr && aepName(flow.attr.name) === aepName(p.first))) flow.attr = null;
			flow.walk = null;
		}
		if (flow.choice === 'new') $('nova-name').value = $('claq').value.trim();

		if (!claq) {
			flow.matches = [];
			flow.choice = '';
			renderAttractions();
			updatePick();
			return;
		}

		state.lookupTimer = setTimeout(async function () {
			state.lookupTimer = null;

			try {
				var res = await findAttractions(p.first);

				if (seq !== state.lookupSeq) return;

				flow.matches = await resolveFilms(res.matches);
				if (seq !== state.lookupSeq) return;

				if (p.deep) {
					// a atração do caminho: a clicada (se ainda está na lista), a de nome igual ou a única achada
					var exact = flow.matches.filter(function (m) {
						return aepName(m.name) === aepName(p.first);
					});

					// a outra pasta (do navegador) fica enquanto o começo do campo for o nome dela
					var custom = flow.attr && flow.attr.isCustom && aepName(flow.attr.name) === aepName(p.first);

					if (!custom && (!flow.attr || !flow.matches.some(function (m) {
						return m.path === flow.attr.path;
					}))) flow.attr = exact.length === 1 ? exact[0] : flow.matches.length === 1 ? flow.matches[0] : null;
					flow.walk = flow.attr ? await walkPath(flow.attr.path, p.levels, p.last, false) : null;
					if (seq !== state.lookupSeq) return;

					// escolhida na lista: sem pastas dentro, não há o que mostrar (recolhe)
					if (state.autoSettle) {
						state.autoSettle = false;
						if (flow.attr && flow.walk && !p.last && !(flow.walk.info && flow.walk.info.folders.length)) return collapseClaq(true);
					}
				}
			} catch (err) {
				if (seq !== state.lookupSeq) return;
				flow.matches = [];
				$('claq-hint').textContent = PAD_UTIL.errorText(err.message);
			}

			// nada vem marcado: Enter sem escolher fica com o nome digitado (a atração de nome igual, ou uma nova)
			if (!p.deep && !state.userChose) flow.choice = '';
			if (flow.choice === 'new') {
				await ensureBases();
				$('nova-name').value = $('claq').value.trim();
			}
			renderAttractions();
			updatePick();
		}, LOOKUP_MS);
	}

	// os filmes do índice da busca (o nome, o ano e o output): a pasta do projeto vem da categoria de filmes da
	// configuração (aba PROJETO), como numa atração nova; sem ela, os filmes ficam de fora
	function filmBase() {
		return state.bases.filter(function (b) {
			return b.pattern && /^FILMES?( |$)/.test(aepName(b.label));
		})[0] || null;
	}

	async function resolveFilms(matches) {
		if (!matches.some(function (m) {
			return m.isFilm && !m.path;
		})) return matches;

		await ensureBases();

		var base = filmBase();

		return matches.map(function (m) {
			if (!m.isFilm || m.path || !base) return m;

			var name = m.name.toUpperCase();
			var path = fillPattern(base.pattern, name, base.label);

			return Object.assign({}, m, { path: path, display: displayPath(path), out: m.out || (base.outPattern ? fillPattern(base.outPattern, name, base.label) : '') });
		}).filter(function (m) {
			return !m.isFilm || m.path;
		});
	}

	// o ícone da categoria da atração (o mesmo da aba PROJETO), ou a pasta
	function matchIcon(m) {
		if (m.isFilm) {
			var film = filmBase();

			return (film && PAD_UTIL.categoryIcon(film.icon)) || FILM_SVG;
		}

		var base = state.bases.filter(function (b) {
			return b.label && m.category && aepName(b.label) === aepName(m.category);
		})[0];

		return (base && PAD_UTIL.categoryIcon(base.icon)) || FOLDER_SVG;
	}

	// troca o fim do campo (o nível sendo digitado) por uma pasta e abre o nível de dentro dela
	// escolher na lista (clique ou Enter): entra nela (o nome e a barra) e, com pastas dentro, a lista mostra o nível de
	// dentro para seguir no clique; sem pastas, a barra sai e o campo recolhe (segue para o o que é). Tab (keepOpen):
	// completa com a barra e fica aberto
	function enterLevel(name, keepOpen) {
		var p = claqParts();

		$('claq').value = p.parts.slice(0, -1).join('/') + '/' + name + '/';
		enter(keepOpen);
	}

	function enterAttraction(match, keepOpen) {
		flow.attr = match;
		flow.choice = '';
		$('claq').value = match.name.toUpperCase() + '/';
		enter(keepOpen);
	}

	function enter(keepOpen) {
		state.autoSettle = !keepOpen;
		$('claq').focus();
		lookup();
	}

	// recolhe o campo: a lista fecha e a barra do fim sai (o caminho fica como está). next: segue para o o que é
	function collapseClaq(next) {
		var input = $('claq');

		input.value = input.value.replace(/\/+\s*$/, '');
		flow.claquete = input.value.trim();
		state.claqClosed = true;
		renderAttractions();
		updatePick();
		if (next) $('arq-what').focus();
	}

	function renderAttractions() {
		var list = $('atr-list');
		var p = claqParts();
		var hint = '';
		var novaOn = flow.choice === 'new' && !p.deep;
		var novaLabel = aepName(p.first) || 'o nome digitado';

		// a atração nova toma o lugar do campo (o nome e a categoria); a seta de voltar (ou Esc) volta para a busca
		$('claq-combo').hidden = novaOn;
		$('atr-nova').hidden = !novaOn;
		if (novaOn) {
			list.hidden = true;
			$('claq-hint').textContent = '';
			return renderNova();
		}

		var closed = state.claqClosed; // fechada: depois do Enter

		$('claq-combo').classList.toggle('is-open', !!flow.claquete && !closed);

		if (!flow.claquete || closed) {
			list.hidden = true;
			$('claq-hint').textContent = '';
			return;
		}

		ATR.resize(list, function () {
			list.textContent = '';

			if (p.deep) {
				if (!flow.attr) {
					// mais de uma atração com esse nome: escolher qual (as pastas aparecem depois)
					var found = flow.matches.slice(0, LIST_MAX);

					list.appendChild(ATR.group(found.length ? 'escolha a atração' : 'nenhuma atração com esse nome'));
					found.forEach(function (match) {
						list.appendChild(ATR.row(matchIcon(match), match.name.toUpperCase(), match.category || '', false, function () {
							$('claq').value = match.name.toUpperCase() + '/' + p.parts.slice(1).join('/');
							flow.attr = match;
							lookup();
						}, match.display));
					});
				} else {
					list.appendChild(ATR.group('atração'));
					// clicar na atração solta ela (para escolher outra)
					list.appendChild(ATR.row(matchIcon(flow.attr), flow.attr.name.toUpperCase(), flow.attr.category || '', true, function () {
						flow.attr = null;
						$('claq').value = p.first;
						lookup();
					}, flow.attr.display));
					list.appendChild(ATR.sep());
					if (!flow.walk) list.appendChild(ATR.group('procurando as pastas…'));
					else hint = levelRows(list, flow.walk, p.last, enterLevel, enterLevel);
				}
				return;
			}

			// sem a barra: as atrações (o clique entra nela: a barra e as pastas dela), a nova e outra pasta
			var m = flow.matches.slice(0, LIST_MAX);

			// o título diz o que veio: atrações, filmes ou os dois
			var films = m.filter(function (x) {
				return x.isFilm;
			}).length;
			var found = ATR.mode() === 'local' ? 'pastas' : !films ? 'atrações' : films === m.length ? 'filmes' : 'atrações e filmes';

			list.appendChild(ATR.group(m.length ? found : (ATR.mode() === 'local' ? 'nenhuma pasta do índice local com esse nome' : 'nenhuma atração ou filme com esse nome')));
			m.forEach(function (match) {
				list.appendChild(ATR.row(matchIcon(match), match.name.toUpperCase(), match.category || '', false, function () {
					enterAttraction(match);
				}, match.display));
			});
			list.appendChild(ATR.sep());
			list.appendChild(ATR.row(PLUS_SVG, 'nova atração', novaLabel, flow.choice === 'new', function () {
				chooseAttraction('new');
			}));
			list.appendChild(ATR.row(FOLDER_SVG, 'outra pasta…', 'navegador de pastas', flow.choice === 'folder', function () {
				chooseAttraction('folder');
			}));
			var more = flow.matches.length - m.length;

			hint = more > 0 ? '+ ' + more + (more === 1 ? ' outra atração: continue digitando' : ' outras atrações: continue digitando') : '';
		});
		list.hidden = false;
		$('claq-hint').textContent = hint;
	}

	// volta da atração nova para a busca (o que estava digitado fica)
	// os dois campos são um só: o mesmo texto, o cursor no fim (sem seleção) e a busca refeita com o que está lá
	function leaveNova() {
		var input = $('claq');

		flow.choice = '';
		state.userChose = false;
		input.value = $('nova-name').value;
		renderAttractions();
		input.focus();
		input.setSelectionRange(input.value.length, input.value.length);
		lookup();
	}

	async function chooseAttraction(key) {
		flow.choice = key;
		state.userChose = true;
		state.claqClosed = false;

		if (key === 'folder') {
			var picked = PAD_BRIDGE.pickFolder('Pasta do projeto');

			if (!picked) {
				flow.choice = '';
				return renderAttractions();
			}

			// a pasta escolhida vira o começo do caminho, como uma atração: com a barra, as pastas dela
			var name = picked.replace(/[\\\/]+$/, '').split(/[\\\/]/).pop();

			flow.choice = '';
			state.userChose = false;
			return enterAttraction({ name: name, path: picked, display: picked, out: '', category: 'outra pasta', isCustom: true });
		}

		if (key === 'new') {
			await ensureBases();
			$('nova-name').value = $('claq').value.trim();
		}
		renderAttractions();
		updatePick();
		if (key === 'new') {
			var input = $('nova-name');

			input.focus();
			input.setSelectionRange(input.value.length, input.value.length);
		}
	}

	// Enter no campo: com a barra, fica o caminho digitado (o que existe é usado, o resto é novo) e segue para o o que
	// é; sem a barra, a atração de nome igual (entra nela) ou, sem ela, a nova com o nome digitado
	function claqEnter() {
		var p = claqParts();

		if (!flow.claquete) return;
		if (state.lookupTimer) {
			clearTimeout(state.lookupTimer);
			state.lookupTimer = null;
			return lookupNow().then(claqEnter);
		}

		if (p.deep) {
			if (!flow.attr) return; // escolher a atração na lista
			state.claqClosed = true;
			// a barra do fim sai (o campo fica com o caminho), menos a da atração sozinha (ATRAÇÃO/: sem ela, voltaria à busca)
			var trimmed = $('claq').value.replace(/\/+\s*$/, '');

			if (trimmed.indexOf('/') >= 0) $('claq').value = trimmed;
			renderAttractions();
			updatePick();
			return $('arq-what').focus();
		}

		var exact = flow.matches.filter(function (m) {
			return aepName(m.name) === aepName(p.first);
		});

		if (exact.length === 1) return enterAttraction(exact[0]);
		if (flow.choice !== 'new') return chooseAttraction('new');
		if (novaReady()) {
			state.claqClosed = true;
			renderAttractions();
			$('arq-what').focus();
		}
	}

	// a busca de agora (o Enter não espera a pausa da digitação)
	function lookupNow() {
		return new Promise(function (resolve) {
			var wait = function () {
				if (state.lookupTimer) return setTimeout(wait, 40);
				resolve();
			};

			lookup();
			setTimeout(wait, LOOKUP_MS + 40);
		});
	}

	/* ---------- o destino: a atração (a achada, a nova ou outra pasta) e as pastas ---------- */

	function currentPick() {
		var p = claqParts();

		if (p.deep && flow.attr && flow.walk) {
			var segs = flow.walk.segs;

			return { name: flow.attr.name, path: segs.length ? flow.walk.path : flow.attr.path, display: displayPath(segs.length ? flow.walk.path : flow.attr.path), out: flow.attr.out || '', quadro: segs.map(function (s) {
				return s.name;
			}).join('/'), segs: segs, base: flow.walk.base };
		}
		// a atração escolhida, sem pastas abaixo (o campo só com o nome dela)
		if (!p.deep && flow.attr && aepName(flow.attr.name) === aepName(p.first)) return { name: flow.attr.name, path: flow.attr.path, display: displayPath(flow.attr.path), out: flow.attr.out || '', quadro: '', segs: [] };
		if (!p.deep && flow.choice === 'new' && novaReady()) return novaTarget();

		return null;
	}

	// o destino mudou: o plano (o nome do .aep, o que já existe, o output) é refeito
	function updatePick() {
		var pick = currentPick();
		var key = pick ? [pick.name, pick.path, pick.quadro || ''].join('|') : '';

		$('criar-go').disabled = !pick;
		if (key === state.pickKey) return renderDest();

		state.pickKey = key;
		flow.pick = pick;
		state.plan = null;
		flow.mode = '';
		if (!pick) {
			renderDest();
			renderFile();
			return renderOut();
		}

		// a pasta de output da atração (o índice ou a categoria): a de partida do campo do output
		if (state.outBaseFrom !== (pick.out || '')) {
			state.outBaseFrom = pick.out || '';
			state.outCustom = '';
			state.outSkip = !pick.out;
			state.outEditing = false;
			state.outOpen = false;
			$('out-in').value = '';
			state.outWalk = null;
		}
		renderDest();
		planCriar();
	}

	function renderDest() {
		var node = $('claq-dest');
		var pick = flow.pick;
		var plan = state.plan;

		if (!flow.claquete) return hintLine(node, '');
		if (!pick) return hintLine(node, claqParts().deep ? 'escolha a atração na lista' : 'escolha a atração (uma / abre as pastas dela) · Enter: atração nova');
		if (!plan) return hintLine(node, 'conferindo a pasta…');

		// a pasta da estrutura (a do projeto) com os níveis em destaque, e a de projetos dentro dela
		var segs = pick.segs || [];
		var root = String(plan.root).replace(/\\/g, '/');
		var cut = root.split('/');
		var head = cut.slice(0, cut.length - segs.length).join('/');

		// sem níveis: a pasta da atração (nova, numa atração nova)
		if (!segs.length && !plan.rootExists) {
			segs = [{ name: plan.rootName, isNew: true }];
			head = cut.slice(0, -1).join('/');
		}
		destLine(node, head, segs, plan.projectsName);
	}

	// o nome do .aep e se ele já existe, sem perguntar ao After: o último nível (ou a atração) + o que é (a mesma
	// conta do host); a lista dos .aep da pasta veio no plano. digitar o o que é não chama o host (ele lê a rede e
	// travava a digitação)
	function localFile(plan) {
		var levels = String(flow.pick.quadro || '').split('/');
		var base = aepName((levels[levels.length - 1].trim() || flow.pick.name) + ' ' + (flow.what || ''));

		plan.fileBase = base;
		plan.fileName = base + '.aep';
		plan.exists = (plan.existing || []).some(function (f) {
			return f.name === base;
		});
	}

	function planArgs(extra) {
		return Object.assign({ kind: 'program', atracao: flow.pick.name, quadro: flow.pick.quadro || '', path: flow.pick.path, what: flow.what, output: flow.pick.out || '' }, extra || {});
	}

	function planCriar() {
		clearTimeout(state.planTimer);

		if (!flow.pick) return;

		var seq = ++state.planSeq;

		state.planTimer = setTimeout(async function () {
			state.planTimer = null;
			try {
				var plan = await call('projectPlan', planArgs());

				if (seq !== state.planSeq) return;
				state.plan = plan;
				localFile(plan);
				renderPlan(plan);
			} catch (err) {
				if (seq === state.planSeq) status(err.message, 'error');
			}
		}, state.plan ? 140 : 0);
	}

	function renderPlan(plan) {
		var meta = $('criar-meta');
		var user = el('span');

		// o .aep que já existe: abrir ou salvar como … 2 (o padrão)
		if (!plan.exists) flow.mode = '';
		else if (!flow.mode) flow.mode = 'increment';

		meta.textContent = '';
		user.innerHTML = USER_SVG;
		user.appendChild(document.createTextNode(plan.user));
		meta.appendChild(user);

		renderDest();
		renderFile();
		renderExisting(plan);
		renderOut();
		$('criar-go').textContent = plan.exists && flow.mode === 'open' ? 'Abrir projeto' : 'Criar projeto';
	}

	// o nome do .aep (o último nível, ou a atração, + o que é)
	function renderFile() {
		var plan = state.plan;
		var span = $('arq-file').querySelector('span');
		var name = plan ? (plan.exists && flow.mode === 'increment' ? plan.fileBase + ' 2' : plan.fileBase) : '';

		span.textContent = '';
		span.appendChild(el('b', null, name || '\u200E…')); // a marca LTR segura o '…' antes do .aep (a linha corta pelo começo)
		span.appendChild(document.createTextNode('.aep'));
	}

	/* ---------- nova atração: as categorias da configuração (aba PROJETO) e a saída livre ---------- */

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
		preview.hidden = !(base && base.offline); // o caminho fica na linha do destino; aqui, só o aviso da pasta deste computador

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

		updatePick();
	}

	// a atração nova: o caminho da categoria com os tokens trocados, ou uma pasta com o nome dela na escolhida
	function novaTarget() {
		var base = novaBase();
		var name = $('nova-name').value.trim().toUpperCase(); // a atração nova em maiúsculas (com os acentos)

		if (base.pattern) {
			var path = fillPattern(base.pattern, name, base.label);

			return { name: name, path: path, display: displayPath(path), out: base.outPattern ? fillPattern(base.outPattern, name, base.label) : '', isNew: true };
		}

		return { name: name, path: joinPath(base.path, aepName(name)), display: base.display + '/' + aepName(name), out: '', isNew: true };
	}

	/* ---------- o .aep que já existe ---------- */

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

	/* ---------- o output: a pasta da atração e, com barras, as subpastas ---------- */

	// a pasta de partida: a escolhida no navegador ou a da atração (o caminho já montado no volume, do plano)
	function outBase() {
		return state.outCustom || (state.plan && state.plan.output) || '';
	}

	function outParts() {
		var parts = $('out-in').value.replace(/^\s*\/+/, '').split('/');

		return { levels: parts.slice(0, -1), last: parts[parts.length - 1].trim(), parts: parts };
	}

	function outLookup(open) {
		clearTimeout(state.outTimer);

		var seq = state.outSeq = (state.outSeq || 0) + 1;
		var base = outBase();

		state.outOpen = open !== false;
		if (!base || state.outSkip) {
			state.outWalk = null;
			return renderOut();
		}

		state.outTimer = setTimeout(async function () {
			var o = outParts();
			var walk = await walkPath(base, o.levels, o.last, true);

			if (seq !== state.outSeq) return;
			state.outWalk = walk;

			// escolhida na lista: sem pastas dentro, a barra sai e volta o cartão
			if (state.outAutoSettle) {
				state.outAutoSettle = false;
				if (!o.last && !(walk.info && walk.info.folders.length)) {
					$('out-in').value = $('out-in').value.replace(/\/+\s*$/, '');
					return outEdit(false);
				}
			}
			renderOut();
		}, 60);
	}

	// uma pasta da lista (clique ou Enter): entra nela e, com pastas dentro, mostra o nível de dentro; sem pastas, volta
	// o cartão. Tab (keepOpen): completa com a barra e fica aberto
	function outEnterLevel(name, keepOpen) {
		var o = outParts();

		$('out-in').value = (o.levels.length ? o.parts.slice(0, -1).join('/') + '/' : '') + name + '/';
		$('out-in').focus();
		state.outAutoSettle = !keepOpen;
		outLookup(true);
	}

	function renderOut() {
		var list = $('out-list');
		var combo = $('out-combo');
		var base = outBase();
		var o = outParts();
		var walk = state.outWalk;
		var open = !!state.outOpen && !!flow.pick;
		var hint = '';

		$('out-in').disabled = !flow.pick;
		$('out-in').placeholder = !flow.pick ? 'a pasta de output da atração' : state.outSkip ? 'sem output · clique para escolher' : base ? 'subpasta (opcional) · / para descer' : 'escolha a pasta de output';

		ATR.resize(list, function () {
			list.textContent = '';
			if (!open) return;

			if (base && !state.outSkip) {
				if (walk) hint = levelRows(list, walk, o.last, outEnterLevel, outEnterLevel);
				else list.appendChild(ATR.group('procurando as pastas…'));

				// a subpasta com o o que é (…/2026/SERVICO), de um clique
				var what = folderName(flow.what);

				if (what && !o.last && !o.levels.length) list.appendChild(ATR.row(PLUS_SVG, 'pasta com o o que é', what, false, function () {
					outEnterLevel(what);
				}));
				list.appendChild(ATR.sep());
			}
			list.appendChild(ATR.row(FOLDER_SVG, 'outra pasta…', 'navegador de pastas', false, function () {
				var picked = PAD_BRIDGE.pickFolder('Pasta de output do projeto', base);

				if (!picked) return;
				state.outCustom = picked;
				state.outSkip = false;
				$('out-in').value = '';
				outLookup(true);
			}));
			list.appendChild(ATR.row(SKIP_SVG, 'sem output', 'pular', state.outSkip, function () {
				state.outSkip = true;
				$('out-in').value = '';
				state.outWalk = null;
				outEdit(false);
			}));
		});
		list.hidden = !open;
		combo.classList.toggle('is-open', open);
		if (open && hint) list.appendChild(el('p', 'combo-group', hint));

		// mudando: o campo e a linha do destino; senão, o cartão com o escolhido
		var editing = !!state.outEditing && !!flow.pick;
		var dest = $('out-dest');
		var segs = walk && (o.last || o.levels.length) ? walk.segs : [];

		$('out-card').hidden = editing;
		combo.hidden = !editing;
		dest.hidden = !editing;

		if (!flow.pick) hintLine(dest, '');
		else if (state.outSkip) hintLine(dest, 'sem pasta de output (dá para escolher depois, no editor)');
		else if (!base) hintLine(dest, 'a atração não tem pasta de output: escolha uma (outra pasta…) ou pule');
		else destLine(dest, base, segs);

		renderOutCard(base, segs);
	}

	// o cartão do output: a pasta escolhida (e as subpastas), o caminho embaixo e o "mudar"; apagado sem output
	function renderOutCard(base, segs) {
		var card = $('out-card');
		var muted = !flow.pick || state.outSkip || !base;
		var title = !flow.pick ? 'a pasta de output da atração' : state.outSkip ? 'sem output' : !base ? 'sem pasta de output' : [base.replace(/[\\\/]+$/, '').split(/[\\\/]/).pop()].concat(segs.map(function (seg) {
			return seg.name;
		})).join(' / ');
		var path = !flow.pick ? 'escolha o projeto acima' : state.outSkip ? 'dá para escolher depois, no editor' : !base ? 'a atração não tem: clique para escolher uma, ou pule' : String(base).replace(/\\/g, '/') + segs.map(function (seg) {
			return '/' + seg.name;
		}).join('');

		card.classList.toggle('is-muted', muted);
		card.disabled = !flow.pick;
		$('out-card-icon').innerHTML = muted && flow.pick ? SKIP_SVG : OUTPUT_SVG;
		$('out-card-title').textContent = title;
		$('out-card-path').textContent = '\u200E' + path + '\u200E';
		card.title = muted ? 'escolher a pasta de output' : path;
	}

	// abre o campo do output (com a lista) e fecha de volta para o cartão
	function outEdit(on) {
		state.outEditing = on;
		state.outOpen = on;
		renderOut();
		if (on) {
			var input = $('out-in');

			input.focus();
			input.setSelectionRange(input.value.length, input.value.length);
			outLookup(true);
		}
	}

	// o output que vai para o projeto: a pasta de partida + as subpastas (as novas são criadas)
	function outTarget() {
		var o = outParts();

		if (state.outSkip || !outBase()) return { output: '', outputCreate: false };
		if (state.outWalk && (o.last || o.levels.length)) return { output: state.outWalk.path, outputCreate: true };

		return { output: outBase(), outputCreate: true };
	}

	/* ---------- criar ---------- */

	function createArgs() {
		return planArgs(Object.assign({ mode: state.plan && state.plan.exists ? flow.mode : '' }, outTarget()));
	}

	async function create(args) {
		if (state.busy) return;
		if (!flow.pick) {
			status('#PAD_090 - escolha a atração do projeto.', 'error');
			return $('claq').focus();
		}
		if (flow.pick.isNew && flow.pick.name) {
			var base = novaBase();

			if (base && base.pattern) pref(PREF_BASE, base.label); // a categoria da atração nova fica lembrada
		}

		state.busy = true;
		$('criar-go').disabled = true;
		$('criar-go').textContent = 'Criando…';

		try {
			if (!state.plan || state.planTimer) await new Promise(function (resolve) {
				setTimeout(resolve, 300);
			});

			var res = await call('projectCreate', args || createArgs());

			status(res.opened ? 'projeto aberto.' : 'projeto criado: ' + res.file.split(/[\\\/]/).pop(), 'success');
			await refresh(true);
		} catch (err) {
			status(err.message, 'error');
		} finally {
			state.busy = false;
			$('criar-go').disabled = !flow.pick;
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
			state.edAttr = null;
			state.edWalk = null;
			state.edLevelsDone = !!cur.quadro;
			state.edRoot = cur.root || '';
			state.edOutput = cur.output || '';
			$('ed-user').value = cur.designer;
			$('ed-atr-list').hidden = true;

			state.edKeep = '';
			if (cur.atracao) {
				// o que é: o gravado (padeiro:oQueE) ou, sem ele, o que vem depois da atração no nome do arquivo. um
				// nome fora desse padrão (projeto antigo) fica como está até a atração ou o que é mudarem
				// com pastas abaixo da atração: ATRAÇÃO/PASTA/… no campo, e o .aep é o último nível + o que é
				var atr = aepName(String(cur.quadro || '').split('/').pop() || cur.atracao);
				var fname = aepName(String(cur.fileName || '').replace(/\.aep$/i, ''));
				var what = cur.oQueE || (fname.indexOf(atr + ' ') === 0 ? fname.slice(atr.length + 1) : '');

				$('ed-atracao').value = cur.atracao.toUpperCase() + (cur.quadro ? '/' + cur.quadro.toUpperCase() : '');
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
	}

	// o campo da atração do editor: ATRAÇÃO ou ATRAÇÃO/PASTA/… (as pastas abaixo dela, como no projeto novo)
	function edParts() {
		var parts = $('ed-atracao').value.split('/');

		return { first: parts[0].trim(), deep: parts.length > 1, levels: parts.slice(1, -1), last: parts[parts.length - 1].trim(), parts: parts, rest: parts.slice(1).map(function (x) {
			return x.trim();
		}).filter(Boolean) };
	}

	// o nome do .aep: o último nível (ou a atração) + o que é (e o de hoje, quando muda)
	function edFile() {
		var p = edParts();
		var name = state.edKeep || aepName((p.rest.length ? p.rest[p.rest.length - 1] : p.first) + ' ' + $('ed-what').value);
		var now = state.current ? String(state.current.fileName || '').replace(/\.aep$/i, '') : '';
		var span = $('ed-file').querySelector('span');

		span.textContent = '';
		span.appendChild(el('b', null, name || '…'));
		span.appendChild(document.createTextNode('.aep' + (now && name && aepName(now) !== aepName(name) ? ' · hoje: ' + now + '.aep' : '')));
	}

	// a busca da atração no editor: os cartões logo abaixo do campo; auto (o nome do arquivo) já marca a primeira.
	// com a barra: a atração (a clicada, a de nome igual ou a única achada) e as pastas do nível digitado
	function edLookup(text, auto) {
		clearTimeout(state.edTimer);

		var seq = state.edSeq = (state.edSeq || 0) + 1;
		var p = auto ? null : edParts();
		var first = p ? p.first : text;

		if (!p || !p.deep) {
			state.edAttr = null;
			state.edWalk = null;
		}
		if (!aepName(first)) {
			state.edMatches = [];
			edRenderList();
			return;
		}

		state.edTimer = setTimeout(async function () {
			var res;

			try {
				res = await findAttractions(first);
			} catch (err) {
				res = { matches: [] };
			}

			if (seq !== state.edSeq) return;

			state.edMatches = await resolveFilms(res.matches);
			if (seq !== state.edSeq) return;

			if (p && p.deep) {
				var exact = res.matches.filter(function (m) {
					return aepName(m.name) === aepName(p.first);
				});

				if (!state.edAttr || !res.matches.some(function (m) {
					return m.path === state.edAttr.path;
				})) state.edAttr = exact.length === 1 ? exact[0] : res.matches.length === 1 ? res.matches[0] : null;
				state.edWalk = state.edAttr ? await walkPath(state.edAttr.path, p.levels, p.last, false) : null;
				if (seq !== state.edSeq) return;
				if (state.edAutoSettle) {
					state.edAutoSettle = false;
					if (!p.last && !(state.edWalk && state.edWalk.info && state.edWalk.info.folders.length) && edAcceptLevels()) return;
				}
			}

			if (auto && res.matches.length) edPick(0, text);
			else edRenderList();
		}, LOOKUP_MS);
	}

	function edRenderList() {
		var list = $('ed-atr-list');
		var m = state.edMatches.slice(0, LIST_MAX);
		var p = edParts();
		var typed = aepName(p.first);
		var open = !!typed && !state.edPicked && !state.edTyped && !(p.deep && state.edLevelsDone);

		ATR.resize(list, function () {
			list.textContent = '';

			if (p.deep) {
				if (!state.edAttr) {
					list.appendChild(ATR.group(m.length ? 'escolha a atração' : 'nenhuma atração com esse nome'));
					m.forEach(function (match) {
						list.appendChild(ATR.row(matchIcon(match), match.name.toUpperCase(), match.category || '', false, function () {
							state.edAttr = match;
							$('ed-atracao').value = match.name.toUpperCase() + '/' + p.parts.slice(1).join('/');
							edLookup($('ed-atracao').value, false);
						}, match.display));
					});
					return;
				}

				list.appendChild(ATR.group('atração'));
				list.appendChild(ATR.row(matchIcon(state.edAttr), state.edAttr.name.toUpperCase(), state.edAttr.category || '', true, function () { }, state.edAttr.display));
				list.appendChild(ATR.sep());
				if (!state.edWalk) return list.appendChild(ATR.group('procurando as pastas…'));
				levelRows(list, state.edWalk, p.last, edEnterLevel, edEnterLevel);
				return;
			}

			list.appendChild(ATR.group(m.length ? 'atrações' : 'atração não encontrada: fica como está digitado'));
			m.forEach(function (match, i) {
				list.appendChild(ATR.row(matchIcon(match), match.name.toUpperCase(), match.category || '', state.edPicked === match.path, function () {
					edPick(i);
				}, match.display));
			});
			// não achou (ou não é nenhuma dessas): o projeto novo, com o que foi digitado (nova atração, categoria e
			// pasta, como num projeto do zero)
			list.appendChild(ATR.sep());
			list.appendChild(ATR.row(PLUS_SVG, 'começar projeto novo', typed || 'nova atração', false, function () {
				startManualNew(typed);
			}));
		});
		list.hidden = !open;
		$('ed-combo').classList.toggle('is-open', open);
	}

	// uma pasta da lista (clique ou Enter): entra nela e, com pastas dentro, mostra o nível de dentro; sem pastas, a
	// barra sai e a lista recolhe. Tab (keepOpen): completa com a barra e fica aberto
	function edEnterLevel(name, keepOpen) {
		var p = edParts();

		$('ed-atracao').value = p.parts.slice(0, -1).join('/') + '/' + name + '/';
		$('ed-atracao').focus();
		state.edLevelsDone = false;
		state.edAutoSettle = !keepOpen; // decide quando as pastas do caminho novo forem lidas
		edLookup($('ed-atracao').value, false);
		edFile();
	}

	// fica o caminho digitado (o que existe é usado, o resto é novo): o .aep vai para a estrutura dentro do último
	// nível ao salvar
	function edAcceptLevels() {
		var attr = state.edAttr;
		var walk = state.edWalk;

		if (!attr || !walk) return false;

		var segs = walk.segs;

		state.edLevelsDone = true;
		state.edKeep = '';
		state.edRoot = segs.length ? walk.path : attr.path;
		pathValue($('ed-root'), displayPath(state.edRoot));
		$('ed-atracao').value = attr.name.toUpperCase() + segs.map(function (s) {
			return '/' + s.name.toUpperCase();
		}).join('');
		if (!state.edOutput && attr.out) {
			state.edOutput = attr.out;
			pathValue($('ed-output'), displayPath(attr.out));
		}
		edRenderList();
		edFile();

		return true;
	}

	// escolheu: o nome oficial, a pasta da atração (o .aep vai para a de projetos dela ao salvar) e a de output
	// dela, se o projeto ainda não tem. com o nome do arquivo (auto), o que sobra depois da atração é o o que é.
	function edPick(i, typed) {
		var match = state.edMatches[i];

		if (!match) return;

		var rest = aepName(typed || '');
		var atr = aepName(match.name);

		state.edPicked = match.path;
		state.edAttr = match; // digitando a barra depois, as pastas são desta
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
		var picked = PAD_BRIDGE.pickFolder('Pasta de output do projeto', state.edOutput || state.edRoot); // abre na de agora

		if (!picked) return;

		state.edOutput = picked;
		pathValue($('ed-output'), picked);
		status('Salvar grava a pasta de output no projeto.', '');
	}

	function editorMove() {
		var picked = PAD_BRIDGE.pickFolder('Nova pasta do projeto', state.edRoot || (state.current && state.current.file ? state.current.file.replace(/[\\\/][^\\\/]*$/, '') : '')); // abre na de agora

		if (!picked) return;

		state.edRoot = picked;
		pathValue($('ed-root'), picked);
		status('Salvar leva o .aep para essa pasta.', '');
	}

	// salvar: grava os dados, leva o .aep para a pasta dele com o nome certo e fecha a janela
	async function editorSave() {
		var p = edParts();

		// as pastas digitadas e ainda não aceitas: fica o digitado (o que existe é usado, o resto é novo)
		if (p.deep && !state.edLevelsDone) edAcceptLevels();
		p = edParts();

		var atracao = p.first;
		var quadro = p.rest.join('/');

		if (!aepName(atracao)) {
			status('#PAD_090 - escolha a atração do projeto.', 'error');
			$('ed-atracao').focus();
			return;
		}

		try {
			var cur = await call('projectSave', { atracao: atracao, quadro: quadro, what: $('ed-what').value.trim(), designer: $('ed-user').value, root: state.edRoot || $('ed-root').value, output: state.edOutput, fileBase: state.edKeep });

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

	// do editor: o fluxo de projeto novo começa à mão (a atração não foi achada), com o nome digitado. o editor
	// não volta sozinho enquanto isso (o refresh respeita o manual); '‹ voltar ao projeto' volta para ele
	function startManualNew(typed) {
		// a lista do editor fecha (na volta, o editor vem limpo)
		$('ed-atr-list').hidden = true;
		$('ed-combo').classList.remove('is-open');
		startWizard(typed);
		state.manualNew = state.currentKey;
		$('claq-back').hidden = false;
		$('claq-back-space').hidden = true;
		lookup();
	}

	// volta para o editor do projeto aberto (o refresh trata como projeto trocado: redesenha o editor)
	function leaveManualNew() {
		state.manualNew = null;
		state.currentKey = null;
		$('claq-back').hidden = true;
		$('claq-back-space').hidden = false;
		refresh(true);
	}

	function startWizard(typed) {
		flow.matches = [];
		flow.pick = null;
		flow.attr = null;
		flow.walk = null;
		flow.choice = '';
		flow.claquete = '';
		flow.what = '';
		flow.mode = '';
		state.userChose = false;
		state.claqClosed = false;
		state.pickKey = null;
		state.plan = null;
		state.outBaseFrom = null;
		state.outCustom = '';
		state.outSkip = false;
		state.outWalk = null;
		state.outOpen = false;
		state.editorKey = null;
		$('claq').value = typed || '';
		$('nova-name').value = '';
		$('arq-what').value = '';
		$('out-in').value = '';
		renderAttractions();
		updatePick();
		show('claquete');
		showShape();
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

		// começou o projeto novo à mão (do editor): fica no fluxo enquanto o projeto aberto for o mesmo
		if (state.manualNew) {
			if (state.manualNew === key && !changed) return;
			state.manualNew = null;
			$('claq-back').hidden = true;
			$('claq-back-space').hidden = false;
		}

		if (cur.created) {
			if (state.screen !== 'editor') show('editor');
			renderEditor(cur);
		} else if (cur.file && (changed || !state.screen || state.screen === 'editor')) {
			// salvo, mas sem os dados do padeiro (ou fora da pasta dele): pula as etapas (a atração é o nome do
			// arquivo, a pasta é a dele)
			if (state.screen !== 'editor') show('editor');
			renderEditor(cur, true);
		} else if (changed || !state.screen || state.screen === 'editor') {
			startWizard();
		}
	}

	/* ---------------------------------------------------------------
	   início
	   --------------------------------------------------------------- */

	// as setas andam pela lista aberta (a marcada fica em destaque); Enter escolhe a marcada; Tab completa com a
	// marcada ou, sem nenhuma, com a primeira (complete() → true quando completou). registrado antes do Enter do
	// campo: com uma marcada, o Enter do campo não roda
	function comboKeys(id, listId, complete) {
		$(id).addEventListener('keydown', function (e) {
			var list = $(listId);

			if (list.hidden) return;

			// a atração já escolhida (no topo da lista das pastas) fica fora: as setas andam pelas opções
			var items = Array.prototype.filter.call(list.querySelectorAll('.combo-item'), function (it) {
				return it.offsetParent !== null && !it.classList.contains('is-on');
			});
			var at = items.findIndex(function (it) {
				return it.classList.contains('is-hover');
			});

			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				if (!items.length) return;
				e.preventDefault();
				at = e.key === 'ArrowDown' ? Math.min(items.length - 1, at + 1) : Math.max(-1, at - 1);
				items.forEach(function (it, i) {
					it.classList.toggle('is-hover', i === at);
				});
				if (at >= 0) items[at].scrollIntoView({ block: 'nearest' });
			} else if (e.key === 'Enter' && at >= 0) {
				e.preventDefault();
				e.stopImmediatePropagation();
				items[at].click();
			} else if (e.key === 'Tab' && !e.shiftKey) {
				if (at >= 0) {
					e.preventDefault();
					items[at].click();
				} else if (complete && complete()) e.preventDefault();
			}
		});
	}

	function onEnter(id, fn) {
		$(id).addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				fn();
			}
		});
	}

	function init() {
		// setas e Tab nas listas (antes dos Enter dos campos)
		comboKeys('claq', 'atr-list', function () {
			var p = claqParts();

			if (p.deep && flow.attr && flow.walk && flow.walk.shown.length) enterLevel(flow.walk.shown[0].name, true);
			else if (!p.deep && flow.matches.length) enterAttraction(flow.matches[0], true);
			else return false;

			return true;
		});
		comboKeys('out-in', 'out-list', function () {
			if (!state.outWalk || !state.outWalk.shown.length) return false;
			outEnterLevel(state.outWalk.shown[0].name, true);

			return true;
		});
		comboKeys('ed-atracao', 'ed-atr-list', function () {
			var p = edParts();

			if (p.deep && state.edAttr && state.edWalk && state.edWalk.shown.length) edEnterLevel(state.edWalk.shown[0].name, true);
			else if (!p.deep && state.edMatches.length) edPick(0);
			else return false;

			return true;
		});

		$('claq').addEventListener('input', lookup);
		// o × no fim do campo: limpa e volta para o começo (a busca e a animação das pastas)
		$('claq-clear').addEventListener('click', function () {
			var input = $('claq');

			input.value = '';
			flow.attr = null;
			flow.choice = '';
			state.userChose = false;
			lookup();
			input.focus();
		});
		$('claq-back').addEventListener('click', leaveManualNew);
		onEnter('claq', claqEnter);
		// clique fora do campo e da lista: recolhe (a lista fecha, a barra do fim sai)
		$('claq').addEventListener('blur', function () {
			setTimeout(function () {
				if ($('claq-combo').contains(document.activeElement) || $('claq-combo').hidden || state.claqClosed || !flow.claquete) return;
				collapseClaq(false);
			}, 150);
		});
		// voltando ao campo: a lista abre de novo
		$('claq').addEventListener('focus', function () {
			if (!state.claqClosed || !flow.claquete) return;

			state.claqClosed = false;
			renderAttractions();
		});

		// nova atração: o nome é o mesmo texto do campo da busca (o que se digita num vale no outro) e a categoria
		$('nova-name').addEventListener('input', function () {
			$('claq').value = this.value;
			flow.claquete = this.value.trim();
			if (!flow.claquete) return leaveNova(); // apagou tudo: volta para a busca, vazia
			renderNova();
		});
		onEnter('nova-name', claqEnter);
		$('nova-back').addEventListener('click', leaveNova);
		$('nova-name').addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				e.preventDefault();
				leaveNova();
			}
		});
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

		// o que é (o nome do .aep muda enquanto digita) e o .aep repetido; Enter cria
		$('arq-what').addEventListener('input', function () {
			flow.what = this.value;
			flow.mode = '';
			// só o nome do .aep muda: conta aqui, sem o host (o plano é refeito quando a pasta muda)
			if (state.plan && flow.pick) {
				localFile(state.plan);
				renderPlan(state.plan);
			}
		});
		onEnter('arq-what', function () {
			create();
		});
		$('arq-dup').addEventListener('change', function (e) {
			flow.mode = e.target.value;
			if (state.plan) renderPlan(state.plan);
		});

		// o output: digitar (e as barras) abre as pastas; Enter fica com o digitado; de novo, cria
		$('out-in').addEventListener('input', function () {
			outLookup(true);
		});
		$('out-in').addEventListener('focus', function () {
			if (state.outSkip) {
				state.outSkip = false;
				$('out-dest').textContent = '';
			}
			outLookup(true);
		});
		// saindo do campo (ou Enter, ou Esc): fica o digitado e volta o cartão
		$('out-in').addEventListener('blur', function () {
			setTimeout(function () {
				if ($('out-combo').contains(document.activeElement) || !state.outEditing) return;
				outEdit(false);
			}, 150);
		});
		onEnter('out-in', function () {
			$('out-in').value = $('out-in').value.replace(/\/+\s*$/, '');
			outLookup(false);
			outEdit(false);
		});
		$('out-in').addEventListener('keydown', function (e) {
			if (e.key !== 'Escape') return;
			e.preventDefault();
			outEdit(false);
		});
		$('out-card').addEventListener('click', function () {
			outEdit(true);
		});

		$('criar-go').addEventListener('click', function () {
			create();
		});

		$('ed-save').addEventListener('click', editorSave);
		$('ed-move').addEventListener('click', editorMove);
		$('ed-output-pick').addEventListener('click', editorOutput);
		['ed-what', 'ed-user'].forEach(function (id) {
			onEnter(id, editorSave);
		});
		// a atração: digitar busca (a escolhida sai)
		$('ed-atracao').addEventListener('input', function () {
			state.edTyped = false;
			state.edLevelsDone = false;
			state.edPicked = '';
			state.edKeep = '';
			edLookup(this.value, false);
			edFile();
		});
		// Enter com a lista aberta: fica o nome digitado (escolher uma atração é com o clique); de novo, salva
		onEnter('ed-atracao', function () {
			if ($('ed-atr-list').hidden) return editorSave();

			// com a barra: fica o caminho digitado (o que existe é usado, o resto é novo)
			if (edParts().deep && edAcceptLevels()) return;

			state.edTyped = true;
			edRenderList();
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
