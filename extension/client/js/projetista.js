/*

---------------------------------------------------------------
> O PROJETISTA — um projeto novo pela atração, numa tela, e o editor
---------------------------------------------------------------

Projeto nunca salvo: uma tela, em três passos.
  1 QUAL ATRAÇÃO? → o campo busca no índice da busca e mostra, na mesma caixa, os grupos sempre nesta ordem: NO
            TRELLO (os cards, os do designer desta máquina primeiro), FILMES (a produzir primeiro), ATRAÇÕES, a NOVA
            (os chips dos tipos) e outra pasta… (até 4 por grupo). as regras ficam num ponto só: pickGroups()
  2 ONDE? → a pasta do projeto, com as regras automáticas em chips trocáveis (o ano, o ano do filme, o mês do tipo
            fixo); a cada barra (ATRAÇÃO/PASTA/…), as pastas daquele nível
  3 ABRIR OU CRIAR? → JÁ NA PASTA (os .aep da pasta de projetos e das subpastas dela; os do card em destaque) e o
            o que é (o .aep é o último nível, ou a atração, + isso); o output é criado junto
Projeto salvo: o editor (atração buscada, designer, o que é, as pastas e Salvar, que leva o .aep para a pasta de
projetos com o nome certo).

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/projeto.md';
	var LOOKUP_MS = 90; // espera depois da última tecla para procurar a atração (a busca é na memória)
	var SERVIDOR_FORA = /não responde: ele só abre na rede da Globo/; // o aviso do host (lib/acessorista.js) quando não monta
	var FOLDER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></svg>';
	var PLUS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>';
	var SKIP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="m7 17 10-10" /></svg>';
	var OUTPUT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /><path d="M12 11v5M9.5 13.5 12 16l2.5-2.5" /></svg>';
	var TRELLO_SVG = '<svg class="card-logo" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" /><rect x="7" y="7" width="4" height="9.5" rx="1" /><rect x="13" y="7" width="4" height="5.5" rx="1" /></svg>';
	var FILM_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M7.5 5v14M16.5 5v14M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4" /></svg>';
	var USER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5" /></svg>';

	// o que foi escolhido até aqui
	var flow = {
		claquete: '',
		matches: [],
		pick: null, // o destino: { name, path, display, out, quadro (as pastas abaixo da atração), segs }
		attr: null, // a atração do caminho (com a barra)
		walk: null, // as pastas do caminho (walkPath)
		what: ''
	};
	// card: o card do Trello escolhido (só aponta a atração: ADR 0001); cardNova: o card sem atração (a atração nova
	// com o nome tirado da claquete, { name, base }); yearBy: 'card' quando o ano do projeto veio da claquete do card
	var state = { screen: '', current: null, lookupTimer: null, lookupSeq: 0, planTimer: null, planSeq: 0, busy: false, bases: [], card: null, cardNova: null, yearBy: '' };

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

		// o servidor que só abre na rede da Globo (não respondeu: não foi montado): aviso amarelo, não erro
		if (kind === 'error' && SERVIDOR_FORA.test(String(text || ''))) {
			kind = 'warn';
			text = String(text).split('\n').filter(function (line) {
				return SERVIDOR_FORA.test(line);
			}).join(' · ');
		}
		clearTimeout(state.statusTimer);
		node.textContent = kind === 'error' ? PAD_UTIL.errorText(text) : text || '';
		node.title = node.textContent;
		node.className = 'proj-status' + (kind ? ' is-' + kind : '');

		// o verde some sozinho; o erro e o amarelo (o que não foi feito) ficam
		if (text && kind !== 'error' && kind !== 'warn') state.statusTimer = setTimeout(status, 4200);
	}

	// o aviso que o host mandou junto de uma resposta (o servidor fora da rede, que não foi montado): amarelo, no rodapé
	window.addEventListener('pad-notes', function (e) {
		var notes = e.detail && e.detail.notes ? e.detail.notes.filter(function (n) {
			return SERVIDOR_FORA.test(n);
		}) : [];

		if (!notes.length) return;
		e.preventDefault();
		status(notes.join(' · '), 'warn');
	});

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

	/* ---------------------------------------------------------------
	   a busca das atrações e os tipos: js/attractions.js (a mesma do criador de templates)
	   --------------------------------------------------------------- */

	var ATR = window.PAD_ATTRACTIONS;
	var findAttractions = ATR.find;
	var candidates = ATR.candidates;
	var displayPath = ATR.displayPath;
	var newBases = ATR.tipos;
	var fillPattern = ATR.fillPattern;

	/* ---------------------------------------------------------------
	   projeto novo, numa tela
	   o caminho (ATRAÇÃO/PASTA/…): o começo busca a atração (ou uma nova, pelos chips, ou outra pasta); a cada barra, a lista
	   mostra as pastas daquele nível. o que é (o .aep é o último nível + isso) e o output (a pasta da atração e,
	   com barras, as subpastas dela). Criar projeto cria as pastas novas, a estrutura e salva o .aep
	   --------------------------------------------------------------- */

	var LIST_MAX = ATR.LIST_MAX; // quantas atrações aparecem (as mesmas do seletor; as outras ficam de fora)
	var LEVEL_MAX = 6; // quantas pastas de um nível aparecem

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

	/* ---------- as pastas lidas pelo Node do painel (ADR 0003): o host só converte o caminho e filtra os nomes ---------- */

	var NODE_READ_MS = 5000; // a rede lenta: passou disso, a pasta fica sem as de dentro (o After nunca espera)

	function nodeFsOk() {
		var fs = ATR.nodeFs ? ATR.nodeFs() : null;

		return fs && fs.promises ? fs : null;
	}

	function withTimeout(promise, ms, late) {
		return Promise.race([promise, new Promise(function (resolve) {
			setTimeout(function () {
				resolve(late);
			}, ms);
		})]);
	}

	// as pastas logo dentro de dir, pelo Node: { exists, names } (exists false: não existe ou não está acessível;
	// slow: a rede não respondeu a tempo)
	async function nodeDirs(fs, dir) {
		if (!dir) return { exists: false, names: [] };

		var items = await withTimeout(fs.promises.readdir(dir, { withFileTypes: true }).catch(function () {
			return null;
		}), NODE_READ_MS, 'slow');

		if (items === 'slow') return { exists: false, names: [], slow: true };
		if (!items) return { exists: false, names: [] };

		return { exists: true, names: items.filter(function (d) {
			return d.isDirectory();
		}).map(function (d) {
			return d.name;
		}) };
	}

	// as pastas de um nível: com o Node, ele lê e o host só converte o caminho e tira as que não entram na lista (nada
	// de ler a rede no host, que trava o After). sem o Node (o navegador de teste), o host lê. nunca monta
	async function readFolders(path, plain) {
		var fs = nodeFsOk();

		if (fs) {
			var conv = await call('projectFolders', { path: path, plain: !!plain, list: false });

			if (conv.listed === false) {
				var dirs = await nodeDirs(fs, conv.rootFs);
				var res = dirs.names.length ? await call('projectFolders', { path: path, plain: !!plain, names: dirs.names }) : { root: conv.root, rootName: conv.rootName, folders: [] };

				return Object.assign({}, res, { exists: dirs.exists, slow: !!dirs.slow });
			}
		}

		return call('projectFolders', { path: path, plain: !!plain });
	}

	// as pastas de um nível (lidas na hora, uma vez por caminho). plain: o output (sem tirar a estrutura do coletar)
	async function listFolders(path, plain) {
		var cache = state.folderCache || (state.folderCache = {});
		var key = (plain ? 'p|' : 'a|') + path;

		if (!cache[key]) {
			try {
				cache[key] = await readFolders(path, plain);
				if (cache[key].slow) {
					var slow = cache[key];

					delete cache[key]; // a rede lenta: lê de novo da próxima vez
					return slow;
				}
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

		// o nível dos quadros (logo abaixo da atração, com os exemplos de outros anos): sem falar de ano nem de pasta
		// vazia; os quadros que já existem e, embaixo, os exemplos (escolher cria o quadro com o mesmo nome)
		if (walk.examples) {
			var examples = matchFolders(walk.examples, last).filter(function (f) {
				return !walk.shown.some(function (s) {
					return aepName(s.name) === f.name;
				});
			});
			var room = LEVEL_MAX + 2;

			if (walk.shown.length) list.appendChild(ATR.group('pastas'));
			walk.shown.slice(0, room).forEach(function (f) {
				list.appendChild(ATR.row(FOLDER_SVG, f.name.toUpperCase(), '', false, function () {
					onPick(f.name);
				}, f.path));
			});
			room -= Math.min(room, walk.shown.length);
			if (examples.length && room) {
				list.appendChild(ATR.group('exemplos do que já existe'));
				examples.slice(0, room).forEach(function (f) {
					var row = ATR.row(FOLDER_SVG, f.name, '', false, function () {
						onPick(f.name);
					}, 'já existe em outro ano: escolher cria o quadro com o mesmo nome');

					row.classList.add('is-example');
					list.appendChild(row);
				});
			}
			list.appendChild(ATR.sep());
			list.appendChild(ATR.row(PLUS_SVG, 'nova pasta', last ? folderName(last) : 'digite depois da /', false, function () {
				if (last) onNew(folderName(last));
			}));

			var rest = walk.shown.length + examples.length - (LEVEL_MAX + 2);

			return rest > 0 ? '+ ' + rest + (rest === 1 ? ' outro: continue digitando' : ' outros: continue digitando') : '';
		}

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

	// as barras do campo separam as pastas, menos a de uma data da claquete (QUEM AMA 17/11: o 17/11 fica junto)
	function splitLevels(text) {
		var parts = [''];

		for (var i = 0; i < text.length; i++) {
			var ch = text.charAt(i);

			if (ch === '/' && !(/\d/.test(text.charAt(i - 1)) && /\d/.test(text.charAt(i + 1)))) parts.push('');
			else parts[parts.length - 1] += ch;
		}

		return parts;
	}

	function claqParts() {
		var parts = splitLevels($('claq').value);

		return { first: parts[0].trim(), deep: parts.length > 1, levels: parts.slice(1, -1), last: parts[parts.length - 1].trim(), parts: parts };
	}

	function lookup() {
		clearTimeout(state.lookupTimer);
		showShape();
		loadFilms(); // os filmes recentes entram na busca (baixados uma vez; de novo depois de 10 min)

		var claq = $('claq').value.trim();
		var seq = ++state.lookupSeq;
		var p = claqParts();

		state.novaFor = aepName(p.first);
		flow.claquete = claq;
		state.claqClosed = false;

		// a atração escolhida fica enquanto o começo do campo for o nome dela (com ou sem a barra); com a barra, as
		// pastas dela. outro texto: volta a busca das atrações
		if (!p.deep) {
			if (!(flow.attr && aepName(flow.attr.name) === aepName(p.first))) flow.attr = null;
			flow.walk = null;
		}
		// o card escolhido vale enquanto o campo for a atração dele (ou o nome da atração nova tirado da claquete)
		if (state.card && !(flow.attr ? aepName(flow.attr.name) === aepName(p.first) : state.cardNova && aepName(state.cardNova.name) === aepName(p.first))) clearCard();

		if (!claq) {
			state.lookupBusy = false;
			flow.matches = [];
			renderAttractions();
			updatePick();
			return;
		}

		state.lookupBusy = true; // até a resposta desta busca chegar (o Tab espera por ela)
		state.lookupTimer = setTimeout(async function () {
			state.lookupTimer = null;

			try {
				var res = await searchAll(p.first);

				if (seq !== state.lookupSeq) return;

				flow.matches = res.matches;
				flow.cards = res.cards;

				if (p.deep) {
					// a atração do caminho: a clicada (se ainda está na lista), a de nome igual ou a única achada
					var exact = flow.matches.filter(function (m) {
						return aepName(m.name) === aepName(p.first);
					});

					// a outra pasta (do navegador) fica enquanto o começo do campo for o nome dela
					var custom = flow.attr && (flow.attr.isCustom || flow.attr.isNewAttr || flow.attr.isFixed) && aepName(flow.attr.name) === aepName(p.first);

					if (!custom && (!flow.attr || !flow.matches.some(function (m) {
						return m.path === flow.attr.path;
					}))) flow.attr = exact.length === 1 ? exact[0] : flow.matches.length === 1 ? flow.matches[0] : null;
					if (flow.attr && flow.attr.noBase) flow.attr = null; // sem tipo: escolher na lista (vira atração nova)
					flow.walk = flow.attr ? await walkPath(flow.attr.path, p.levels, p.last, false) : null;
					// o primeiro nível abaixo da atração: os quadros de outros anos, como exemplos
					if (flow.walk && !p.levels.length) flow.walk.examples = await quadroExamples(flow.attr, flow.walk.info ? flow.walk.info.folders : []);
					if (seq !== state.lookupSeq) return;

					// escolhida na lista: sem pastas dentro, não há o que mostrar (recolhe). o filme e a atração escolhida pelo
					// card do Trello recolhem sempre: o que vale são os .aep (JÁ NA PASTA), não as pastas de dentro
					if (state.autoSettle) {
						var all = state.settleAll || !!state.card; // escolhida pelo card do Trello: recolhe mesmo com pastas

						state.autoSettle = false;
						state.settleAll = false;
						// o filme e o card recolhem mesmo sem a pasta ainda (o filme novo, A PRODUZIR): ela é criada com o projeto
						if (flow.attr && !p.last && (all || flow.attr.isFilm || (flow.walk && !(flow.walk.info && flow.walk.info.folders.length)))) return collapseClaq(true);
					}
				}
			} catch (err) {
				if (seq !== state.lookupSeq) return;
				flow.matches = [];
				$('claq-hint').textContent = PAD_UTIL.errorText(err.message);
			}

			renderAttractions();
			updatePick();
			if (seq === state.lookupSeq) state.lookupBusy = false;
		}, LOOKUP_MS);
	}

	/* ---------- os filmes recentes (o webhook dos filmes): digitando, junto da busca ---------- */

	// os filmes recentes que começam com o digitado (ou com uma palavra dele) entram na busca: o filme novo ainda não
	// está no índice. o que já está ganha o ano, o pôster e a exibição
	function withRecentFilms(matches, text) {
		var q = aepName(text);
		var recent = state.films || [];

		if (q.length < 2 || !recent.length) return matches;

		var out = matches.slice();
		var add = [];

		recent.forEach(function (f) {
			var key = aepName(f.name);

			if (key.indexOf(q) !== 0 && (' ' + key).indexOf(' ' + q) < 0) return;

			var extra = filmExtra(f);
			var at = -1;

			out.forEach(function (m, i) {
				if (m.isFilm && aepName(m.name) === key) at = i;
			});

			// o filme do índice fica com o ano dele (o do índice manda); a pasta achada pelo host vale para o novo
			if (at >= 0) out[at] = Object.assign({}, out[at], extra, { year: out[at].year || f.year, tipo: 'FILME' + ((out[at].year || f.year) ? ' · ' + (out[at].year || f.year) : '') });
			else add.push(filmMatch(f));
		});

		return add.concat(out);
	}

	// o que o filme dos recentes acrescenta (o pôster, a exibição, a etiqueta e o link do card)
	function filmExtra(f) {
		return { year: f.year, poster: f.poster, exib: f.exib, exibIso: f.exibIso || '', sessao: f.sessao, done: f.done, trello: f.trello || '', recent: true };
	}

	// um filme dos recentes como uma atração achada (a pasta vem do tipo FILME: resolveFilms)
	function filmMatch(f) {
		return Object.assign({ name: f.name, tipo: 'FILME' + (f.year ? ' · ' + f.year : ''), path: f.path || '', out: '', display: f.path ? displayPath(f.path) : '', isFilm: true, score: 0 }, filmExtra(f));
	}

	// os filmes dos cards que batem com o digitado entram na busca, mesmo sem o título bater (TELA QUENTE ENCANTO →
	// ENCANTO): o card de filme leva ao filme
	function withCardFilms(matches, cards, text) {
		var out = matches.slice();

		(cards || []).forEach(function (c) {
			var f = cardFilm(c);

			if (!f || !cardHits(c, text) || out.some(function (m) {
				return m.isFilm && filmKey(m.name) === filmKey(f.name);
			})) return;
			out.push(filmMatch(f));
		});

		return out;
	}

	/* ---------- a busca, num ponto só (o projeto novo e o editor) ---------- */

	// o índice da busca (atrações, filmes e cards: js/attractions.js, ou o host no navegador de teste) e os filmes
	// recentes, com as pastas da organização nova e os tipos fixos. → { matches, cards }
	async function searchAll(text) {
		var res = await findAttractions(text);
		var cards = res.cards || [];
		var matches = withCardFilms(withRecentFilms(res.matches || [], text), cards, text);

		return { matches: withFixed(text, await toNewOrg(await resolveFilms(matches))), cards: cards };
	}

	/* ---------- os cards do Trello (o grupo NO TRELLO) ---------- */

	// o card bate com o digitado: cada palavra digitada é o começo de uma palavra da claquete, da atração ou do filme
	function cardHits(c, text) {
		var words = aepName(text).split(' ').filter(Boolean);
		var film = cardFilm(c);
		var hay = aepName([c.claq, c.atr, film ? film.name : ''].join(' ')).split(' ');

		return words.join('').length >= 2 && words.every(function (w) {
			return hay.some(function (h) {
				return h.indexOf(w) === 0;
			});
		});
	}

	// o filme do card: o 'trello' do filme no webhook dos filmes é o link do mesmo card (o id do card está nele)
	function cardFilm(c) {
		var id = String(c && c.card || '');

		if (id.length < 6) return null;

		return (state.films || []).filter(function (f) {
			return f.trello && f.trello.indexOf(id) >= 0;
		})[0] || null;
	}

	// O card é do designer desta máquina? o login (o usuário do padeiro, ex. JMBILLARD) comparado com o designer do
	// card ('des', o nome completo, ex. "J M Billard"), os dois sem acento, em maiúsculas e sem espaços nem símbolos.
	// bate se o login for: o nome todo junto (J M BILLARD → JMBILLARD; CRISTINA VIANNA → CRISTINAVIANNA), as iniciais
	// de todos menos o último + o último (JMBILLARD, CVIANNA), a inicial do primeiro + um sobrenome (CVIANNA,
	// JBILLARD), o primeiro nome + um sobrenome (CRISTINAVIANNA) ou o primeiro nome + a inicial de um sobrenome
	// (CRISTINAV). só o primeiro nome não basta (nomes repetem). sem casar: sem "seu"
	function loginMatches(login, name) {
		var user = aepName(login).replace(/ /g, '');
		var words = aepName(name).split(' ').filter(Boolean);

		if (user.length < 3 || !words.length) return false;

		var first = words[0];
		var rest = words.slice(1);
		var ways = [words.join(''), words.slice(0, -1).map(function (w) {
			return w.charAt(0);
		}).join('') + words[words.length - 1]];

		rest.forEach(function (w) {
			ways.push(first.charAt(0) + w, first + w, first + w.charAt(0));
		});

		return ways.indexOf(user) >= 0;
	}

	function isMine(c) {
		return !!(c && c.des && state.current && loginMatches(state.current.user || state.current.defaultUser, c.des));
	}

	// o nome sugerido do card sem atração: o começo da claquete, sem a data, a versão e o ano (RIO SUMMER BEATS 5-12
	// → RIO SUMMER BEATS; VEM AI(2027) → VEM AI)
	function suggestName(claq) {
		var words = String(claq || '').replace(/\([^)]*\d[^)]*\)/g, ' ').trim().split(/\s+/);
		var out = [];

		for (var i = 0; i < words.length; i++) {
			if (/\d/.test(words[i])) break;
			out.push(words[i]);
		}

		return aepName(out.join(' ')) || aepName(claq);
	}

	// o ano escrito na claquete (VEM AI(2027), PREMIO 2026 …): vira o ano do projeto, com a nota "pelo card"
	function cardYear(claq) {
		var m = /(?:^| )(20\d\d)(?: |$)/.exec(aepName(claq));

		return m ? Number(m[1]) : 0;
	}

	// o que o card aponta: o filme (pelo link do card), a atração (ligada no banco, 'atr'; o tipo fixo com o mês da
	// claquete) ou nada (o card sem atração: vira atração nova, com o nome tirado da claquete). 'skip': o card de filme
	// sem o filme na lista dos recentes (fica de fora)
	function cardTarget(c, matches) {
		var film = cardFilm(c);

		if (film) {
			return { kind: 'film', film: film, attr: (matches || []).filter(function (m) {
				return m.isFilm && filmKey(m.name) === filmKey(film.name);
			})[0] || null };
		}
		if (c.fil) return { kind: 'skip' };
		if (!c.atr) return { kind: 'nova', name: suggestName(c.claq) };

		var fixed = fixedBases().filter(function (b) {
			return aepName(b.label) === c.atr;
		})[0];

		if (fixed) return { kind: 'attr', name: fixed.label, attr: Object.assign(novaAttr(fixed.label, fixed, ATR.monthOf(c.claq)), { isNewAttr: false, isFixed: true, month: ATR.monthOf(c.claq) }) };

		var attr = (matches || []).filter(function (m) {
			return !m.isFilm && aepName(m.name) === c.atr;
		})[0] || null;

		return { kind: 'attr', name: attr ? attr.name : c.atr, attr: attr };
	}

	// a atração do card que não veio na busca (o digitado só bateu com a claquete): procura pelo nome dela
	async function cardAttr(c, target) {
		if (target.attr) return target.attr;

		try {
			var res = await searchAll(target.name);

			return res.matches.filter(function (m) {
				return !m.isFilm && aepName(m.name) === aepName(target.name);
			})[0] || null;
		} catch (err) {
			return null;
		}
	}

	// há quanto tempo (hoje, ontem, há 3 dias; mais de um mês: a data)
	function relDays(ms) {
		if (!ms) return '';

		var start = new Date();

		start.setHours(0, 0, 0, 0);
		if (ms >= start.getTime()) return 'hoje';
		if (ms >= start.getTime() - 86400000) return 'ontem';

		var days = Math.ceil((start.getTime() - ms) / 86400000);

		if (days <= 30) return 'há ' + days + ' dias';

		var d = new Date(ms);
		var pad = function (n) {
			return (n < 10 ? '0' : '') + n;
		};

		return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + (d.getFullYear() === new Date().getFullYear() ? '' : '/' + d.getFullYear());
	}

	// o status do card como etiqueta (PRODUZINDO, EM APROVAÇÃO…); sem status, sem etiqueta
	function statusTag(st) {
		var key = aepName(st);

		if (!key) return null;

		var kind = /APROVA/.test(key) ? ' is-wait' : /PRODUZ|ANDAMENTO|FAZENDO/.test(key) ? ' is-doing' : '';

		return el('span', 'card-status' + kind, String(st).toUpperCase());
	}

	// o pôster do filme (ou o ícone)
	function posterBox(f) {
		var poster = el('span', 'film-poster');

		if (f && f.poster) {
			var img = el('img');

			img.alt = '';
			img.addEventListener('error', function () {
				poster.innerHTML = FILM_SVG;
			});
			// pelo Node do painel (ATR.posterSrc: o servidor dos pôsteres não deixa o <img> do CEP abrir o endereço);
			// enquanto baixa, o ícone; sem o pôster, fica o ícone
			poster.innerHTML = FILM_SVG;
			ATR.posterSrc(f.poster).then(function (src) {
				img.src = src;
				poster.innerHTML = '';
				poster.appendChild(img);
			}, function () { });
		} else {
			poster.innerHTML = FILM_SVG;
		}

		return poster;
	}

	// um card numa linha: o nome da atração em destaque (o do filme, com o pôster; o sugerido, no card sem atração),
	// a claquete embaixo (e o designer, se não é o seu), "seu" e o status como etiqueta
	function cardRow(c, target, mine, onPick) {
		var item = el('button', 'combo-item card-row' + (target.kind === 'film' ? ' is-film' : ''));
		var text = el('span', 'film-text');
		var title = el('span', 'combo-title');
		var sub = el('span', 'film-sub', String(c.claq).toUpperCase());

		item.type = 'button';
		item.setAttribute('role', 'option');
		if (target.kind === 'film') item.appendChild(posterBox(target.film));
		else item.insertAdjacentHTML('afterbegin', '<span class="card-icon">' + TRELLO_SVG + '</span>');
		if (target.kind === 'film') {
			title.textContent = target.film.name.toUpperCase();
			if (target.film.year) title.appendChild(el('span', 'film-year', ' (' + target.film.year + ')'));
		} else if (target.kind === 'nova') {
			title.textContent = target.name;
			title.appendChild(el('span', 'card-none', ' · sem atração'));
		} else {
			title.textContent = String(target.name).toUpperCase();
		}
		if (mine) title.appendChild(el('span', 'card-mine', 'seu'));
		if (!mine && c.des) sub.appendChild(el('span', 'card-who', ' · ' + c.des));
		text.appendChild(title);
		text.appendChild(sub);
		item.appendChild(text);

		var tag = statusTag(c.st);

		if (tag) item.appendChild(tag);
		item.title = target.attr && target.attr.display ? target.attr.display : '';
		item.addEventListener('mousedown', function (e) {
			e.preventDefault(); // o campo não perde o foco (a lista não fecha antes do clique)
		});
		item.addEventListener('click', onPick);

		return item;
	}

	// os .aep da pasta que batem com a claquete do card: cada palavra da claquete é o começo de uma palavra do nome do
	// arquivo (CH JOR ESP G5 → MELHOR CHAMADA DE JORNALISMO E ESPORTE G5). valem os que batem com mais palavras (todos
	// os empatados: o PREMIO 2026 CH JOR ESP G5 e o … G5 V2); quase nada em comum, nenhum. as datas (29/11) e as
	// palavras que batem com todos não contam. → [o id de cada um: SUBPASTA/NOME.aep]
	function cardFiles(claq, files) {
		var words = aepName(String(claq || '').replace(/\b\d{1,2}[\/-]\d{1,2}([\/-]\d{2,4})?\b/g, ' ')).split(' ').filter(function (w) {
			return w.length >= 2;
		});
		var list = (files || []).filter(function (f) {
			return f.ext !== 'aet';
		});

		if (!words.length || !list.length) return [];

		var hits = list.map(function (f) {
			var fw = aepName(f.name).split(' ');

			return words.filter(function (w) {
				return fw.some(function (x) {
					return x.indexOf(w) === 0;
				});
			});
		});
		var useful = words.filter(function (w) {
			var n = hits.filter(function (h) {
				return h.indexOf(w) >= 0;
			}).length;

			return n > 0 && (n < list.length || list.length === 1);
		});

		if (!useful.length) return [];

		var scores = hits.map(function (h) {
			return h.filter(function (w) {
				return useful.indexOf(w) >= 0;
			}).length;
		});
		var best = Math.max.apply(null, scores);

		if (best < Math.min(2, useful.length)) return [];

		return list.filter(function (f, i) {
			return scores[i] === best;
		}).map(fileId);
	}

	// o id de um .aep da lista: com a subpasta antes (CHAMADAS/PREMIO 2026 CH JOR ESP G5.aep), relativo à de projetos
	function fileId(f) {
		return (f.sub ? f.sub + '/' : '') + f.name + '.' + (f.ext || 'aep');
	}

	// baixa os filmes recentes (uma vez por janela) e confere quais já têm pasta (a pasta da letra). a lista aparece na
	// hora; as etiquetas (A PRODUZIR / JÁ TEM PROJETO) chegam quando a conferência termina, sem travar o After: o
	// host só converte as pastas das letras (uma vez cada) e o Node do painel lê as pastas. sem o Node, o host lê
	async function loadFilms() {
		// a janela aberta por muito tempo: de 10 em 10 min, de novo (os filmes novos e as pastas criadas por outros)
		if (state.filmsLoading || (state.films && Date.now() - state.filmsAt < 600000)) return;

		state.filmsLoading = true;
		state.filmsAt = Date.now();

		// os filmes (ou as etiquetas) chegaram com algo digitado: a busca de novo, para eles entrarem na lista
		var redraw = function () {
			if ($('claq').value.trim() && document.activeElement === $('claq') && !state.claqClosed && !claqParts().deep) lookup();
		};

		try {
			var list = await ATR.recentFilms();

			await ensureBases();

			var base = filmBase();

			if (!base || !list.length) {
				state.films = [];
				return;
			}

			// já mostra (sem etiqueta), na ordem do webhook; na volta depois de 10 min, fica a lista de antes até conferir
			if (!state.films || !state.films.length) {
				state.films = list.slice();
				redraw();
			}

			// a pasta de cima da do filme: o caminho do tipo FILME até o {atracao} (…/TITULOS/_N_)
			var head = base.pattern.split('{atracao}')[0];
			var parents = list.map(function (f) {
				return fillPattern(head, f.name.toUpperCase(), base.label, f.year).replace(/[^\\\/]*$/, '').replace(/[\\\/]+$/, '');
			});
			var res = await filmsDone(list, parents);

			if (!res) return; // a conferência falhou: a lista fica sem etiquetas

			state.films = list.map(function (f, i) {
				return Object.assign({}, f, { done: !!res.done[i], path: res.paths[i] || '' });
			}).sort(function (a, b) {
				return (a.done ? 1 : 0) - (b.done ? 1 : 0); // a produzir primeiro (na ordem do webhook)
			});
		} catch (err) {
			if (!state.films) state.films = [];
		} finally {
			state.filmsLoading = false;
			redraw();
		}
	}

	// o título como chave da pasta: sem acento, sem pontuação e sem o ano (NAO NAO OLHE e NAO NAO OLHE (2022))
	function filmKey(text) {
		return aepName(String(text || '').replace(/\(\d{4}\)/g, ' '));
	}

	// a pasta do filme entre as de mesmo título: a com o mesmo ano ou, sem ela, uma antiga sem ano. a de outro ano é
	// outro filme (um remake: ANNA (1987) não é ANNA (2019))
	function filmFolder(folders, year) {
		var same = (folders || []).filter(function (d) {
			return year && d.year === String(year);
		})[0] || (folders || []).filter(function (d) {
			return !d.year || !year;
		})[0];

		return same ? same.path : '';
	}

	// quais filmes já têm pasta: { done: [bool], paths: [a pasta ou ''] }, ou null se não deu para conferir
	async function filmsDone(list, parents) {
		var fs = ATR.nodeFs ? ATR.nodeFs() : null;

		if (fs && fs.promises) {
			try {
				// as pastas das letras, cada uma uma vez: o host só converte o caminho (o volume montado no Mac)
				var unique = parents.filter(function (p, i) {
					return p && parents.indexOf(p) === i;
				});
				var mounted = (await call('projectFilmsParents', { parents: unique })).paths || [];
				var pathMod = require('path');
				var names = {};

				await Promise.all(unique.map(async function (p, i) {
					var dir = mounted[i];
					var found = {};

					if (dir) {
						try {
							(await fs.promises.readdir(dir, { withFileTypes: true })).forEach(function (d) {
								if (!d.isDirectory()) return;

								var key = filmKey(d.name);
								var year = (String(d.name).match(/\((\d{4})\)\s*$/) || [])[1] || '';

								(found[key] = found[key] || []).push({ year: year, path: pathMod.join(dir, d.name) });
							});
						} catch (err) { } // a pasta da letra ainda não existe: nenhum filme dela tem projeto
					}
					names[p] = found;
				}));

				var paths = list.map(function (f, i) {
					return filmFolder((names[parents[i]] || {})[filmKey(f.name)], f.year);
				});

				return { done: paths.map(Boolean), paths: paths };
			} catch (err) { } // sem a conversão pelo host: tenta o caminho de antes
		}

		try {
			return await call('projectFilmsDone', { items: list.map(function (f, i) {
				return { parent: parents[i], title: f.name, year: f.year || '' };
			}) });
		} catch (err) {
			return null;
		}
	}

	// uma linha de filme: o pôster (ou o ícone), o título com o ano, a exibição e a etiqueta
	// onPick: o clique (sem ele, a linha é só para ver: o cartão do filme escolhido)
	function filmRow(f, onPick) {
		var item = el('button', 'combo-item film-row');
		var poster = posterBox(f);
		var text = el('span', 'film-text');
		var title = el('span', 'combo-title');

		item.type = 'button';
		item.setAttribute('role', 'option');
		title.textContent = f.name.toUpperCase();
		if (f.year) title.appendChild(el('span', 'film-year', ' (' + f.year + ')'));
		text.appendChild(title);
		text.appendChild(el('span', 'film-sub', f.exib ? 'exibe ' + f.exib + (f.sessao ? ' · ' + f.sessao : '') : f.sessao || 'filme'));
		item.appendChild(poster);
		item.appendChild(text);
		if (typeof f.done === 'boolean') item.appendChild(el('span', 'film-tag' + (f.done ? ' is-done' : ''), f.done ? 'JÁ TEM PROJETO' : 'A PRODUZIR'));
		item.addEventListener('mousedown', function (e) {
			e.preventDefault(); // o campo não perde o foco (a lista não fecha antes do clique)
		});
		if (onPick) item.addEventListener('click', onPick);

		return item;
	}

	// os filmes do índice da busca (o nome, o ano e o output): a pasta do projeto vem do tipo de filmes da
	// configuração (aba TIPOS DE PROJETO), como numa atração nova; sem ela, os filmes ficam de fora
	function filmBase() {
		var base = state.bases.filter(function (b) {
			return b.pattern && /^FILMES?( |$)/.test(aepName(b.label));
		})[0] || null;

		if (!base) return null;

		// o padrão dos filmes: a pasta e o output terminam no título com o ano (NAO NAO OLHE (2022)), mesmo que a
		// configuração ainda não tenha o {ano_producao}. sem ano, os parênteses somem (fillPattern)
		var withYear = function (p) {
			return !p || /\{ano_producao\}/.test(p) ? p : String(p).replace(/\{atracao\}([\\\/]*)$/, '{atracao} ({ano_producao})$1');
		};

		return Object.assign({}, base, { pattern: withYear(base.pattern), outPattern: withYear(base.outPattern) });
	}

	async function resolveFilms(matches) {
		if (!matches.some(function (m) {
			return m.isFilm;
		})) return matches;

		await ensureBases();

		var base = filmBase();

		return matches.map(function (m) {
			if (!m.isFilm || !base) return m;

			var name = m.name.toUpperCase();
			// o .aep do filme: o nome do tipo (aba TIPOS DE PROJETO > ARQUIVO) ou o título com o ano (NAO NAO OLHE (2022))
			var file = base.filePattern ? fillPattern(base.filePattern, name, base.label, m.year) : name + (m.year ? ' (' + m.year + ')' : '');

			// a pasta já achada (o filme dos recentes que já tem projeto): fica, e o .aep leva o ano do mesmo jeito
			if (m.path) return m.filmFile ? m : Object.assign({}, m, { filmFile: file, prodYear: m.prodYear || m.year || '', out: m.out || (base.outPattern ? fillPattern(base.outPattern, name, base.label, m.year) : '') });

			var path = fillPattern(base.pattern, name, base.label, m.year);
			var known = (state.films || []).filter(function (f) {
				return f.path && filmKey(f.name) === filmKey(m.name);
			})[0];

			// o filme que já tem pasta (conferida na lista dos recentes): entra nela, mesmo que seja uma antiga sem o
			// ano (NAO NAO OLHE), em vez de criar outra ao lado com o ano
			if (known && /\{atracao\}[^\\\/]*[\\\/]*$/.test(base.pattern)) {
				var folder = String(known.path).replace(/[\\\/]+$/, '').split(/[\\\/]/).pop();

				path = path.replace(/[^\\\/]+([\\\/]*)$/, function (all, tail) {
					return folder + tail;
				});
			}

			return Object.assign({}, m, { path: path, display: displayPath(path), out: m.out || (base.outPattern ? fillPattern(base.outPattern, name, base.label, m.year) : ''), filmFile: file, prodYear: m.prodYear || m.year || '' });
		}).filter(function (m) {
			return !m.isFilm || m.path;
		});
	}

	/* ---------- a organização nova: a atração que já existe dá o nome, a pasta vem do tipo ---------- */

	// as pastas fixas do caminho do tipo, depois da raiz (PROJETOS ou o Fileserver): …/PROJETOS/ESPORTES/FUTEBOL/
	// {atracao}/{ano} → ['ESPORTES', 'FUTEBOL']. é por elas que a pasta antiga de uma atração diz de que tipo ela é
	function baseSegments(base) {
		var head = String(base.pattern || '').split('{atracao}')[0].replace(/\\/g, '/').split('/');
		var out = [];

		for (var i = 0; i < head.length; i++) {
			var seg = head[i].trim();

			if (/^(PROJETOS|FILESERVER_?\d+)$/i.test(seg)) out = [];
			else if (seg && seg.indexOf('{') < 0 && !/^\/\/|:$/.test(seg)) out.push(aepName(seg));
		}

		return out;
	}

	// o tipo de uma atração achada no índice: o que tem as pastas fixas mais parecidas com o caminho antigo
	// (…/Fileserver_3/ESPORTES/FUTEBOL/FUTEBOL 2026/… → FUTEBOL); sem nenhuma, pelo nome do tipo do índice
	function baseForMatch(m) {
		var parts = String(m.path || '').replace(/\\/g, '/').split('/').map(aepName);
		var best = null;
		var score = 0;

		state.bases.forEach(function (b) {
			if (b.offline || !b.pattern) return;

			var segs = baseSegments(b);

			if (!segs.length) return;
			for (var i = 0; i + segs.length <= parts.length; i++) {
				var hit = segs.every(function (s, k) {
					// a pasta do índice pode estar no singular ou no plural (NOVELA, NOVELAS)
					return parts[i + k] === s || parts[i + k] + 'S' === s || parts[i + k] === s + 'S';
				});

				if (hit && segs.length > score) {
					best = b;
					score = segs.length;
				}
			}
		});

		if (best) return best;

		return state.bases.filter(function (b) {
			var label = aepName(b.label);
			var tipo = aepName(m.tipo);

			return !b.offline && b.pattern && tipo && (label === tipo || label + 'S' === tipo || label === tipo + 'S');
		})[0] || null;
	}

	// as atrações achadas, com a pasta da organização nova: o caminho do tipo com os tokens (a pasta antiga fica
	// em oldPath, para os exemplos de quadros). sem tipo que sirva: noBase (escolher o tipo, como uma nova)
	async function toNewOrg(matches) {
		await ensureBases(); // também para os chips da atração nova (com ou sem atrações achadas)
		if (!matches.length) return matches;

		if (!state.bases.length) return matches; // sem tipos na configuração: o jeito de antes (a pasta do índice)

		return matches.filter(function (m) {
			return m.isCustom || m.newOrg || !isTipoFolder(m);
		}).map(function (m) {
			if (m.isCustom || m.newOrg) return m;

			var base = baseForMatch(m);
			var name = m.name.toUpperCase();

			// a atração que já tem pasta de projeto no índice: a pasta dela, como está (BBB/BBB 2026), no ano do
			// projeto; o tipo só dá o ícone e, sem output no índice, o output
			if (m.path && m.path !== m.out) {
				var here = ATR.shiftYear(m.path);
				var outHere = m.out ? ATR.shiftYear(m.out) : base && base.outPattern ? fillPattern(base.outPattern, name, base.label) : '';

				return Object.assign({}, m, { oldPath: m.path, oldOut: m.out || '', path: here, display: displayPath(here), out: outHere, base: base, tipo: base ? base.label : m.tipo, fromIndex: true });
			}

			if (!base) return Object.assign({}, m, { oldPath: m.path, path: '', display: 'escolha o tipo', noBase: true });

			var path = fillPattern(base.pattern, name, base.label);

			return Object.assign({}, m, { oldPath: m.path, path: path, display: displayPath(path), out: base.outPattern ? fillPattern(base.outPattern, name, base.label) : '', base: base, tipo: base.label, newOrg: true });
		});
	}

	// a pasta achada é a pasta de um tipo, não uma atração: a que guarda as atrações dela (INSTITUCIONAL/VTs é o
	// tipo VT; a pasta VTs, onde todos os VTs ficavam juntos, não vira a atração VTS)
	function isTipoFolder(m) {
		var parts = String(m.path || '').replace(/\\/g, '/').replace(/\/+$/, '').split('/').map(aepName);

		return state.bases.some(function (b) {
			if (b.offline || !b.pattern) return false;

			var segs = baseSegments(b);
			var tail = parts.slice(-segs.length);
			var root = parts[parts.length - segs.length - 1] || '';

			// logo depois da raiz (PROJETOS ou o Fileserver), como no caminho do tipo
			return segs.length && tail.length === segs.length && /^(PROJETOS|FILESERVER ?\d+)$/.test(root) && segs.every(function (s, k) {
				return tail[k] === s || tail[k] + 'S' === s || tail[k] === s + 'S';
			});
		});
	}

	// a atração sem tipo que sirva: vira uma atração nova com o mesmo nome (a pessoa escolhe o tipo nos chips)
	function asNew(match) {
		$('claq').value = match.name.toUpperCase();
		flow.attr = null;
		openNova(true);
	}

	// os exemplos de quadros: os que o padeiro já criou em outros anos (o nível do {ano} do tipo, qualquer valor:
	// as pastas com a estrutura dentro), sem repetir e sem os do ano de agora. só quando o caminho do tipo tem
	// pastas depois da atração ({atracao}/{ano}); as pastas antigas da atração ficam de fora
	async function quadroExamples(attr, current) {
		if (!attr || !attr.base || attr.fromIndex) return [];

		var pattern = attr.base.pattern;
		var at = pattern.indexOf('{atracao}');
		var tail = pattern.slice(at + '{atracao}'.length).split(/[\\\/]/).filter(Boolean);

		if (at < 0 || !tail.length) return [];

		var root = fillPattern(pattern.slice(0, at + '{atracao}'.length), attr.name.toUpperCase(), attr.base.label);
		var res = { names: [] };
		var seen = {};
		var out = [];

		// as pastas com a estrutura do padeiro dentro (as antigas da atração ficam de fora): com o Node, ele lê e o host
		// só converte os caminhos (ADR 0003); sem ele, o host lê
		try {
			var fs = nodeFsOk();
			var conv = fs ? await call('projectQuadros', { root: root, depth: tail.length, here: attr.path, list: false }) : null;

			res = conv && conv.listed === false ? { names: await nodeQuadros(fs, conv) } : await call('projectQuadros', { root: root, depth: tail.length, here: attr.path });
		} catch (err) { }

		(current || []).forEach(function (f) {
			seen[aepName(f.name)] = true;
		});
		(res.names || []).forEach(function (n) {
			var key = aepName(n);

			if (key && !seen[key]) {
				seen[key] = true;
				out.push({ name: key, path: '', example: true });
			}
		});

		return out.sort(function (x, y2) {
			return x.name < y2.name ? -1 : 1;
		});
	}

	// os quadros pelo Node (o mesmo do host em projectQuadros): as pastas 'depth' níveis abaixo da atração e, dentro
	// delas (menos a do ano de agora), as que têm a pasta de projetos da estrutura. no máximo 120 leituras e
	// NODE_READ_MS no total: os exemplos são um atalho, não uma lista completa
	async function nodeQuadros(fs, conv) {
		var pathMod = require('path');
		var until = Date.now() + NODE_READ_MS;
		var reads = 0;
		var key = function (p) {
			return String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
		};
		// as pastas de dentro de cada uma (só as que entram nas listas: o host filtra os nomes, sem ler nada)
		var inside = async function (list) {
			var read = await Promise.all(list.map(function (dir) {
				if (++reads > 120 || Date.now() > until) return { names: [] };

				return nodeDirs(fs, dir);
			}));
			var all = [];

			read.forEach(function (r) {
				all = all.concat(r.names);
			});

			var useful = all.length ? (await call('pastasUteis', { names: all, plain: true })).names : [];

			return list.map(function (dir, i) {
				return read[i].names.filter(function (n) {
					return useful.indexOf(n) >= 0;
				}).map(function (n) {
					return { name: n, path: pathMod.join(dir, n) };
				});
			});
		};
		var level = [conv.rootFs];

		for (var d = 0; d < conv.depth; d++) {
			level = (await inside(level)).reduce(function (all, kids) {
				return all.concat(kids.map(function (k) {
					return k.path;
				}));
			}, []);
		}

		level = level.filter(function (p) {
			return key(p) !== key(conv.hereFs);
		});

		var kids = (await inside(level)).reduce(function (all, list) {
			return all.concat(list);
		}, []);
		var names = [];

		await Promise.all(kids.map(async function (k) {
			if (Date.now() > until) return;

			var st = await withTimeout(fs.promises.stat(pathMod.join(k.path, conv.sub)).catch(function () {
				return null;
			}), Math.max(0, until - Date.now()), null);

			if (st && st.isDirectory()) names.push(k.name);
		}));

		return names;
	}

	// o ícone do tipo da atração (o mesmo da aba TIPOS DE PROJETO), ou a pasta; o filme, o do tipo de filmes
	function matchIcon(m) {
		if (m.isFilm) {
			var film = filmBase();

			return (film && PAD_UTIL.tipoIcon(film.icon)) || FILM_SVG;
		}

		return ATR.iconFor(m, state.bases);
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
		if (match.noBase) return asNew(match);
		flow.attr = match;
		flow.walk = null;
		$('claq').value = match.name.toUpperCase() + '/';
		enter(keepOpen);
		// a lista mostra já a atração escolhida ("procurando as pastas…"), não a da busca de antes: o cabeçalho da
		// atração nova com o texto velho (NOVA ATRAÇÃO · SUMM com o campo em SUMMER BEATS/) não fica parado na tela
		renderAttractions();
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

	// com a lista aberta, a tela fica só com ela: o "o que é", o arquivo, o JÁ NA PASTA e o output aparecem depois
	// de escolher (is-choosing)
	function renderAttractions() {
		renderAttractionList();
		$('sc-claquete').classList.toggle('is-choosing', !$('atr-list').hidden && !!$('claq').value.trim());
	}

	function renderAttractionList() {
		var list = $('atr-list');
		var p = claqParts();
		var hint = '';
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
						list.appendChild(ATR.row(matchIcon(match), match.name.toUpperCase(), match.tipo || '', false, function () {
							if (match.noBase) return asNew(match);
							$('claq').value = match.name.toUpperCase() + '/' + p.parts.slice(1).join('/');
							flow.attr = match;
							lookup();
						}, match.display));
					});
				} else {
					list.appendChild(ATR.group('atração'));
					// clicar na atração escolhida confirma: fica só com ela (sem pasta abaixo) e segue para o o que é.
					// para trocar de atração: o × do campo, ou apagar o nome
					list.appendChild(ATR.row(matchIcon(flow.attr), flow.attr.name.toUpperCase(), flow.attr.tipo || '', true, function () {
						$('claq').value = flow.attr.name.toUpperCase();
						flow.walk = null;
						collapseClaq(true);
					}, flow.attr.display));
					list.appendChild(ATR.sep());
					if (!flow.walk) list.appendChild(ATR.group('procurando as pastas…'));
					else hint = levelRows(list, flow.walk, p.last, enterLevel, enterLevel);
				}
				return;
			}

			// sem a barra: os grupos (NO TRELLO, FILMES, ATRAÇÕES, a NOVA e outra pasta…); o clique entra na atração (a
			// barra e as pastas dela)
			var other = null;

			state.firstPick = pickGroups(list, p.first, { matches: flow.matches, cards: flow.cards }, {
				attr: function (match, keepOpen) {
					enterAttraction(match, keepOpen);
				},
				card: pickCard,
				nova: pickNovaTipo,
				tail: function () {
					// sem tipos de projeto na configuração, a atração nova é outra pasta (e, com a barra, a pasta nova dentro)
					other = list.appendChild(ATR.row(FOLDER_SVG, 'outra pasta…', 'navegador de pastas', false, pickOtherFolder));
				}
			});

			// o Enter sem atração achada abriu os tipos: o primeiro chip (sem tipos, outra pasta…) fica em realce e o
			// Enter cria nele (as setas andam pelos outros)
			if (state.novaFocus) {
				state.novaFocus = false;
				(list.querySelector('.tipo-chip') || other).classList.add('is-hover');
			}
			hint = ''; // sem frase de ajuda: a lista já diz o que achou
		});
		list.hidden = false;
		$('claq-hint').textContent = hint;
	}

	/* ---------- os grupos da lista: as regras num ponto só, depois da busca (o projeto novo e o editor) ---------- */

	// A lista da busca, em grupos, sempre nesta ordem:
	//   NO TRELLO → os cards que batem com o digitado, um por linha: os do designer desta máquina primeiro ("seu"),
	//               depois os mais novos. o card de filme mostra o pôster e leva ao filme
	//   FILMES    → os recentes A PRODUZIR (exibição mais próxima em cima), depois os que JÁ TÊM PROJETO, depois os
	//               do índice; fora os que já estão num card
	//   ATRAÇÕES  → as do índice (e os tipos fixos), com o ícone do tipo; fora as que já estão num card
	//   NOVA      → só os chips dos tipos
	// e, no fim, o que a janela acrescenta (h.tail: outra pasta…). cada grupo mostra até LIST_MAX linhas e, se há
	// mais, "+N outros: continue digitando". h: { attr(match), card(card, target), nova(nova, base), tail() }
	// → a ação da primeira linha (o Tab completa com ela), ou null
	function pickGroups(list, text, res, h) {
		var matches = res.matches || [];
		var first = null;
		var more = function (n) {
			if (n > 0) list.appendChild(el('p', 'combo-more', '+' + n + (n === 1 ? ' outro' : ' outros') + ': continue digitando'));
		};
		var take = function (fn) {
			if (!first) first = fn;
		};

		// NO TRELLO
		var cards = (res.cards || []).filter(function (c) {
			return cardHits(c, text);
		}).map(function (c) {
			return { c: c, target: cardTarget(c, matches), mine: isMine(c) };
		}).filter(function (x) {
			return x.target.kind !== 'skip';
		}).sort(function (a, b) {
			return (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || b.c.time - a.c.time;
		});
		var carded = {}; // as atrações e os filmes que já estão num card não aparecem de novo
		var cardedFilm = {};

		cards.forEach(function (x) {
			if (x.target.kind === 'film') cardedFilm[filmKey(x.target.film.name)] = true;
			if (x.target.kind === 'attr') carded[aepName(x.target.name)] = true;
		});
		if (cards.length) {
			list.appendChild(ATR.group('no trello'));
			cards.slice(0, LIST_MAX).forEach(function (x) {
				var pick = function () {
					h.card(x.c, x.target);
				};

				take(pick);
				list.appendChild(cardRow(x.c, x.target, x.mine, pick));
			});
			more(cards.length - LIST_MAX);
		}

		// FILMES: a produzir, já tem projeto e os do índice (sem a lista dos recentes); a exibição mais próxima em cima
		var rank = function (m) {
			if (!m.recent) return 2;

			return m.done ? 1 : 0;
		};
		var films = matches.filter(function (m) {
			return m.isFilm && !cardedFilm[filmKey(m.name)];
		}).sort(function (a, b) {
			return rank(a) - rank(b) || (a.exibIso || '9999').localeCompare(b.exibIso || '9999');
		});

		if (films.length) {
			list.appendChild(ATR.group('filmes'));
			films.slice(0, LIST_MAX).forEach(function (m) {
				var pick = function () {
					h.attr(m);
				};
				var row = m.recent ? filmRow(m, pick) : ATR.row(matchIcon(m), m.name.toUpperCase(), m.tipo || '', false, pick, m.display);

				take(function () {
					h.attr(m, true);
				});
				if (m.recent) row.title = m.display || '';
				list.appendChild(row);
			});
			more(films.length - LIST_MAX);
		}

		// ATRAÇÕES (no tipo fixo, a do mês do card sai; a regra de sempre, o próximo mês, fica)
		var attrs = matches.filter(function (m) {
			return !m.isFilm && !(carded[aepName(m.name)] && (!m.isFixed || m.month));
		});

		if (attrs.length) {
			list.appendChild(ATR.group(ATR.mode() === 'local' ? 'pastas' : 'atrações'));
			attrs.slice(0, LIST_MAX).forEach(function (m) {
				var pick = function () {
					h.attr(m);
				};

				take(function () {
					h.attr(m, true); // o Tab completa e fica aberto (as pastas dela)
				});
				list.appendChild(ATR.row(matchIcon(m), m.name.toUpperCase(), m.tipo || '', false, pick, m.display));
			});
			more(attrs.length - LIST_MAX);
		}

		if (!cards.length && !films.length && !attrs.length) list.appendChild(ATR.group(ATR.mode() === 'local' ? 'nenhuma pasta do índice local com esse nome' : 'nenhuma atração ou filme com esse nome'));
		// modo local: de quando é a cópia do índice em uso (como no acessorista)
		if (ATR.copyNote()) list.appendChild(el('p', 'combo-more', ATR.copyNote()));
		list.appendChild(ATR.sep());

		// NOVA: só os chips dos tipos; o tipo digitado no começo (vt …) vem marcado
		if (state.bases.length && h.nova) {
			var nova = novaFromText(text);

			list.appendChild(ATR.group('nova atração · ' + (aepName(nova.name) || 'o nome digitado')));
			catChips(list, nova, h.nova);
			list.appendChild(ATR.sep());
		}
		if (h.tail) h.tail();

		return first;
	}

	/* ---------- a atração nova direto no tipo (os chips embaixo da lista) ---------- */

	// o tipo digitado no começo (o nome ou o plural dele, com mais alguma palavra depois) marca o chip; o nome
	// da atração é sempre o texto todo: "novela guerreiros" → NOVELA GUERREIROS, com o tipo NOVELA marcado
	function novaFromText(text) {
		var raw = String(text || '').trim();
		var words = raw.split(/\s+/);
		var best = null;

		// o nome do tipo (uma ou mais palavras: MOOD MENSAL; a última pode vir no plural) e mais alguma depois
		state.bases.forEach(function (b) {
			var label = aepName(b.label).split(' ');

			if (!b.pattern || words.length <= label.length || (best && best.size >= label.length)) return;

			var ok = label.every(function (w, i) {
				var typed = aepName(words[i]);

				return typed === w || (i === label.length - 1 && (typed === w + 'S' || typed + 'S' === w));
			});

			if (ok) best = { base: b, size: label.length };
		});

		// o tipo no começo só marca o chip: o nome da atração é o texto todo, como foi digitado (vt reunião →
		// VT REUNIAO em VT; novela guerreiros → NOVELA GUERREIROS em NOVELA)
		if (best) return { name: raw.toUpperCase(), base: best.base };

		return { name: raw.toUpperCase(), base: null };
	}

	// o tipo sem {atracao} no caminho é a própria atração (MOOD MENSAL → …/MOOD MENSAL/2026/12 DEZEMBRO): entra
	// na busca quando o digitado bate com o nome dela (cada palavra é o começo de uma palavra do nome), antes das
	// achadas e no lugar da de mesmo nome do índice
	function fixedBases() {
		return state.bases.filter(function (b) {
			return b.pattern && b.pattern.indexOf('{atracao}') < 0;
		});
	}

	function withFixed(text, matches) {
		var words = aepName(text).split(' ').filter(Boolean);

		if (!words.length) return matches;

		var fixed = fixedBases().filter(function (b) {
			var label = aepName(b.label).split(' ');

			return words.every(function (w) {
				return label.some(function (l) {
					return l.indexOf(w) === 0;
				});
			}) || matches.some(function (m) {
				return aepName(m.name) === aepName(b.label);
			});
		}).map(function (b) {
			// a atração do índice com o mesmo nome dá o card do Trello (se tem); o mês escrito no card (JANEIRO NA GLOBO)
			// vale mais que a data de hoje na regra do tipo (a pasta e o .aep)
			var same = matches.filter(function (m) {
				return aepName(m.name) === aepName(b.label);
			})[0];
			var card = same && same.trello ? same.trello : null;
			var month = card ? ATR.monthOf(card.claq) : null;

			var fixed = [Object.assign(novaAttr(b.label, b, month), { isNewAttr: false, isFixed: true, trello: card, month: month })];

			// o card é de outro mês (JANEIRO, em novembro): a regra de sempre (o próximo mês) continua na lista
			if (month && month.index !== (new Date().getMonth() + 1) % 12) fixed.push(Object.assign(novaAttr(b.label, b), { isNewAttr: false, isFixed: true }));

			return fixed;
		}).reduce(function (all, list) {
			return all.concat(list);
		}, []);

		if (!fixed.length) return matches;

		return fixed.concat(matches.filter(function (m) {
			return !fixed.some(function (f) {
				return aepName(f.name) === aepName(m.name);
			});
		}));
	}

	// a atração nova num tipo, como uma achada: o caminho com os tokens (o ano no fim), e o que vier depois da
	// barra fica dentro dele (ATRAÇÃO/2026/QUADRO)
	function novaAttr(name, base, month) {
		var path = fillPattern(base.pattern, name, base.label, '', month);

		return { name: name, path: path, display: displayPath(path), out: base.outPattern ? fillPattern(base.outPattern, name, base.label, '', month) : '', base: base, tipo: base.label, newOrg: true, isNewAttr: true };
	}

	// o caminho de um tipo para a atração nova, com a pasta da atração em diante em destaque
	function novaPathLine(node, nova, base) {
		node.textContent = '';
		if (!base) {
			node.textContent = 'escolha o tipo da atração nova';
			return;
		}

		var name = aepName(nova.name) || '…';
		var full = displayPath(fillPattern(base.pattern, name, base.label));

		if (base.pattern.indexOf('{atracao}') < 0) {
			node.appendChild(el('span', null, full.slice(0, full.lastIndexOf('/') + 1)));
			node.appendChild(el('b', null, full.slice(full.lastIndexOf('/') + 1)));
			return;
		}

		var head = displayPath(fillPattern(base.pattern.slice(0, base.pattern.indexOf('{atracao}')), name, base.label));
		var cut = full.indexOf(head) === 0 ? head.length : full.lastIndexOf('/') + 1;

		node.appendChild(el('span', null, full.slice(0, cut)));
		node.appendChild(el('b', null, full.slice(cut)));
	}

	// onPick(nova, base): o clique num chip (sem ele, cria a atração nova na claquete). keep: os chips na ordem da
	// configuração (o escolhido não sobe)
	function catChips(list, nova, onPick, keep) {
		var grid = el('div', 'tipo-chips');
		var line = el('p', 'tipo-path');
		var bases = state.bases.filter(function (b) {
			return b.pattern;
		});

		// a digitada vem primeiro
		if (nova.base && !keep) bases = [nova.base].concat(bases.filter(function (b) {
			return b !== nova.base;
		}));
		bases.forEach(function (b) {
			var chip = el('button', 'tipo-chip' + (b === nova.base ? ' is-on' : ''));

			chip.type = 'button';
			chip.innerHTML = (PAD_UTIL.tipoIcon(b.icon) || FOLDER_SVG) + '<span></span>';
			chip.lastChild.textContent = b.label;
			chip.title = b.offline ? 'a pasta do tipo não está acessível: vai para a pasta deste computador' : '';
			chip.addEventListener('mousedown', function (e) {
				e.preventDefault(); // o campo não perde o foco
			});
			chip.addEventListener('mouseenter', function () {
				novaPathLine(line, nova, b);
			});
			chip.addEventListener('mouseleave', function () {
				novaPathLine(line, nova, nova.base);
			});
			chip.addEventListener('click', function () {
				(onPick || pickNovaTipo)(nova, b);
			});
			grid.appendChild(chip);
		});
		novaPathLine(line, nova, nova.base);
		list.appendChild(grid);
		list.appendChild(line);
	}

	// escolher o tipo: a atração nova entra como uma achada (o nome e a barra; dá para seguir com os quadros)
	function pickNovaTipo(nova, base) {
		if (base.pattern.indexOf('{atracao}') < 0) return enterAttraction(Object.assign(novaAttr(base.label, base), { isNewAttr: false, isFixed: true }));

		var name = aepName(nova.name);

		if (!name) return $('claq').focus();
		ATR.pref(ATR.PREF_BASE, base.label); // o tipo da atração nova fica lembrado (o seletor dos templates usa)
		enterAttraction(novaAttr(name, base));

		var input = $('claq');

		input.focus();
		input.setSelectionRange(input.value.length, input.value.length);
	}

	// abre os tipos da atração nova na lista (a linha "nova atração" com os chips), com o primeiro em realce: o Enter
	// cria nele. again: o texto do campo mudou (a busca de novo)
	function openNova(again) {
		var input = $('claq');

		state.novaFor = aepName(claqParts().first);
		state.novaOpen = true;
		state.novaFocus = true;
		state.claqClosed = false;
		if (again) lookup();
		else renderAttractions();
		input.focus();
		input.setSelectionRange(input.value.length, input.value.length);
	}

	// outra pasta…: o navegador de pastas. a escolhida vira o começo do caminho, como uma atração: com a barra, as
	// pastas dela
	function pickOtherFolder() {
		var picked = PAD_BRIDGE.pickFolder('Pasta do projeto');

		if (!picked) return $('claq').focus();

		var name = picked.replace(/[\\\/]+$/, '').split(/[\\\/]/).pop();

		enterAttraction({ name: name, path: picked, display: picked, out: '', tipo: 'outra pasta', isCustom: true });
	}

	/* ---------- o card escolhido (passo 2): a atração, o filme ou a atração nova tirada da claquete ---------- */

	// o card só aponta (ADR 0001): a atração (o campo mostra o nome dela, nunca a claquete), o filme (a pasta do filme)
	// ou, sem atração, uma atração nova com o nome sugerido. o ano escrito na claquete vira o ano do projeto (pelo card)
	async function pickCard(c, target) {
		var y = target.kind === 'film' ? 0 : cardYear(c.claq);

		state.card = c;
		state.cardMark = true; // o primeiro plano marca o .aep do card, se só um bate
		state.cardNova = null;
		flow.what = '';
		$('arq-what').value = '';
		if (y) {
			ATR.setYear(y);
			state.yearBy = 'card';
			state.cardYear = y;
			state.folderCache = {};
		}
		if (target.kind === 'nova') return startCardNova(c, target.name);

		var seq = state.lookupSeq;
		var attr = target.kind === 'film' ? target.attr : await cardAttr(c, target);

		// o campo mudou (ou foi limpo) enquanto a atração do card era procurada: o clique não vale mais
		if (seq !== state.lookupSeq || state.card !== c) return;
		if (!attr) return startCardNova(c, target.kind === 'film' ? aepName(target.film.name) : suggestName(c.claq));
		state.settleAll = true;
		enterAttraction(atYear(attr));
	}

	// o card sem atração: a atração nova, com o nome tirado da claquete (editável) e os chips dos tipos embaixo do campo
	function startCardNova(c, name) {
		state.card = c;
		state.cardNova = { name: name, base: null };
		flow.attr = null;
		flow.walk = null;
		$('claq').value = name;
		flow.claquete = name;
		state.claqClosed = true;
		renderAttractions();
		updatePick();
		setTimeout(function () {
			var input = $('card-nova-name');

			if (input) {
				input.focus();
				input.select();
			}
		}, 30);
	}

	// o tipo da atração nova do card: entra nela como uma atração nova dos chips
	function pickCardNovaType(nova, base) {
		var cn = state.cardNova;

		if (!cn || !aepName(cn.name)) return;
		cn.base = base;
		if (base.pattern.indexOf('{atracao}') < 0) return enterAttraction(Object.assign(novaAttr(base.label, base), { isNewAttr: false, isFixed: true, fromCard: true }));
		enterAttraction(Object.assign(novaAttr(aepName(cn.name), base), { fromCard: true }));
	}

	function clearCard() {
		state.card = null;
		state.cardNova = null;
		state.cardMark = false;
		// o ano que veio da claquete do card volta para o de agora (o trocado à mão fica)
		if (state.yearBy === 'card') {
			if (ATR.projectYear() === state.cardYear) ATR.setYear(0);
			state.yearBy = '';
			state.folderCache = {};
		}
	}

	// o card escolhido, embaixo do campo, só como referência: a claquete, o designer (ou "seu"), a atração e o status.
	// o card sem atração ganha embaixo o nome sugerido (editável) e os chips dos tipos
	function renderCardInfo() {
		var box = $('card-info');
		var nova = $('card-nova');
		var c = state.card;
		var show = !!c && state.claqClosed;

		box.hidden = !show;
		nova.hidden = !(show && state.cardNova);
		if (!show) return;

		var key = [c.card, c.claq, flow.attr ? flow.attr.name : '', state.cardNova ? state.cardNova.name + '|' + (state.cardNova.base ? state.cardNova.base.label : '') : ''].join('|');

		if (box.dataset.key !== key) {
			var text = el('span', 'card-info-text');
			var sub = el('span', 'card-info-sub');
			var film = cardFilm(c);
			var what = film ? 'leva ao filme' : state.cardNova ? 'sem atração' : c.atr ? (flow.attr ? flow.attr.name : c.atr).toUpperCase() : '';

			box.dataset.key = key;
			box.textContent = '';
			box.insertAdjacentHTML('afterbegin', '<span class="card-icon">' + TRELLO_SVG + '</span>');
			text.appendChild(el('b', null, String(c.claq).toUpperCase()));
			sub.appendChild(document.createTextNode(c.des ? 'card de ' : 'card'));
			if (c.des) sub.appendChild(el('b', null, c.des));
			if (isMine(c)) sub.appendChild(el('span', 'card-mine', 'seu'));
			if (what) sub.appendChild(document.createTextNode(' · ' + what));
			text.appendChild(sub);
			box.appendChild(text);

			var tag = statusTag(c.st);

			if (tag) box.appendChild(tag);
			box.title = 'o card só aponta a atração: o nome do .aep não vem da claquete';
		}

		if (!state.cardNova) return;

		var cn = state.cardNova;
		var nkey = cn.base ? cn.base.label : '';

		// o campo do nome fica (o foco e o cursor não se perdem enquanto se digita); os chips são refeitos
		if (!nova.dataset.ready) {
			nova.dataset.ready = '1';
			nova.textContent = '';
			nova.appendChild(el('p', 'wz-title', 'NOVA ATRAÇÃO · NOME TIRADO DA CLAQUETE'));

			var field = el('div', 'has-field-icon');
			var input = el('input', 'cfg-input');

			input.id = 'card-nova-name';
			input.type = 'text';
			input.spellcheck = false;
			input.autocomplete = 'off';
			input.setAttribute('aria-label', 'Nome da atração nova');
			field.insertAdjacentHTML('afterbegin', '<svg class="field-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>');
			field.appendChild(input);
			nova.appendChild(field);
			nova.appendChild(el('div', 'card-nova-chips'));
			input.addEventListener('input', function () {
				var name = aepName(this.value);

				var base = state.cardNova ? state.cardNova.base : null;

				if (!state.cardNova) return;
				state.cardNova.name = name;
				// o tipo fixo é ele mesmo a atração: o nome não muda a pasta
				if (base && base.pattern.indexOf('{atracao}') < 0) return;
				$('claq').value = name;
				flow.claquete = name;
				// com o tipo escolhido, a pasta e o .aep acompanham o nome
				flow.attr = base && name ? Object.assign(novaAttr(name, base), { fromCard: true }) : null;
				updatePick();
			});
			input.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' && state.cardNova && state.cardNova.base) {
					e.preventDefault();
					$('arq-what').focus();
				}
			});
		}

		var nameInput = $('card-nova-name');

		if (document.activeElement !== nameInput && aepName(nameInput.value) !== aepName(cn.name)) nameInput.value = cn.name;
		if (nova.dataset.key === nkey + '|' + state.bases.length) return;
		nova.dataset.key = nkey + '|' + state.bases.length;

		var chips = nova.querySelector('.card-nova-chips');

		chips.textContent = '';
		catChips(chips, { name: cn.name, base: cn.base }, pickCardNovaType, true);
	}

	// a atração no ano do projeto (o chip do ano): a pasta do índice com o ano trocado (BBB 2026 → BBB 2027), a do
	// tipo refeita com o {ano}; o filme e outra pasta ficam como estão. a escolha não se perde
	function atYear(a) {
		if (!a || a.isFilm || a.isCustom) return a;
		if (a.isFixed && a.base) return Object.assign({}, a, novaAttr(a.base.label, a.base, a.month), { isNewAttr: false, isFixed: true });
		if (a.isNewAttr && a.base) return Object.assign({}, a, novaAttr(a.name, a.base));

		var name = a.name.toUpperCase();
		var out;

		if (a.fromIndex && a.oldPath) {
			var here = ATR.shiftYear(a.oldPath);

			out = a.oldOut ? ATR.shiftYear(a.oldOut) : a.base && a.base.outPattern ? fillPattern(a.base.outPattern, name, a.base.label) : a.out;

			return Object.assign({}, a, { path: here, display: displayPath(here), out: out });
		}
		if (a.newOrg && a.base) {
			var path = fillPattern(a.base.pattern, name, a.base.label);

			return Object.assign({}, a, { path: path, display: displayPath(path), out: a.base.outPattern ? fillPattern(a.base.outPattern, name, a.base.label) : '' });
		}

		return a;
	}

	// Enter no campo: com a barra, fica o caminho digitado (o que existe é usado, o resto é novo) e segue para o o que
	// é; sem a barra, a atração de nome igual (entra nela), a nova no tipo digitado no começo (vt reunião) ou, sem
	// nenhum dos dois, os tipos da atração nova abertos na lista (o Enter de novo cria no primeiro)
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

		var typed = state.bases.length ? novaFromText(p.first) : null;

		if (typed && typed.base && aepName(typed.name)) return pickNovaTipo(typed, typed.base);
		openNova(false);
	}

	// a busca de agora (o Enter não espera a pausa da digitação, mas espera a resposta: até 3 s)
	function lookupNow() {
		var tries = 0;

		return new Promise(function (resolve) {
			var wait = function () {
				if ((state.lookupTimer || state.lookupBusy) && ++tries < 75) return setTimeout(wait, 40);
				resolve();
			};

			lookup();
			setTimeout(wait, LOOKUP_MS + 40);
		});
	}

	/* ---------- o destino: a atração (a achada, a nova dos chips ou outra pasta) e as pastas ---------- */

	function currentPick() {
		var p = claqParts();

		if (p.deep && flow.attr && flow.walk) {
			var segs = flow.walk.segs;

			return { name: flow.attr.name, path: segs.length ? flow.walk.path : flow.attr.path, display: displayPath(segs.length ? flow.walk.path : flow.attr.path), out: flow.attr.out || '', quadro: segs.map(function (s) {
				return s.name;
			}).join('/'), segs: segs, base: flow.walk.base, fileName: attrFileName(flow.attr), trello: flow.attr.trello || null };
		}
		// a atração escolhida, sem pastas abaixo (o campo só com o nome dela)
		if (!p.deep && flow.attr && aepName(flow.attr.name) === aepName(p.first)) return { name: flow.attr.name, path: flow.attr.path, display: displayPath(flow.attr.path), out: flow.attr.out || '', quadro: '', segs: [], fileName: attrFileName(flow.attr), trello: flow.attr.trello || null };

		return null;
	}

	// o nome do .aep do tipo (aba TIPOS DE PROJETO > ARQUIVO, com tokens): na atração criada pelo tipo (a fixa, a
	// nova dos chips); a que já existe no índice fica com o nome dela
	function attrFileName(attr) {
		var filled = attr && attr.filmFile ? attr.filmFile : ''; // o filme: o título com o ano (resolveFilms)

		if (!filled && (!attr || !attr.base || !attr.base.filePattern || attr.fromIndex)) return '';
		if (!filled) filled = fillPattern(attr.base.filePattern, attr.name, attr.base.label, '', attr.month);

		// com {o_que_e}: o token fica (o o que é entra no lugar dele, em localFile e no host); o resto já normalizado
		return filled.split(WHAT_TOKEN).map(ATR.aepFileName).join(filled.indexOf(WHAT_TOKEN) >= 0 ? ' ' + WHAT_TOKEN + ' ' : '').trim();
	}

	// {o_que_e}: o que se digita depois da atração. vale no nome do .aep (aba TIPOS DE PROJETO > ARQUIVO) e na pasta de output
	var WHAT_TOKEN = '{o_que_e}';

	// a pasta de output com o o que é no lugar do token; sem o que é, o pedaço some (…/ATRACAO/{o_que_e} → …/ATRACAO)
	function fillWhat(path) {
		var p = String(path || '');

		if (p.indexOf(WHAT_TOKEN) < 0) return p;

		var lead = /^[\\\/]+/.exec(p);

		return (lead ? lead[0] : '') + p.slice(lead ? lead[0].length : 0).split(WHAT_TOKEN).join(aepName(flow.what)).split(/[\\\/]/).map(function (seg) {
			return seg.replace(/\s+/g, ' ').trim();
		}).filter(Boolean).join(p.indexOf('/') < 0 && p.indexOf('\\') >= 0 ? '\\' : '/');
	}

	// o destino mudou: o plano (o nome do .aep, o que já existe, o output) é refeito
	function updatePick() {
		var pick = currentPick();
		var key = pick ? [pick.name, pick.path, pick.quadro || ''].join('|') : '';

		$('criar-go').disabled = !pick;
		if (key === state.pickKey) return renderDest();

		state.pickKey = key;
		// o plano que ainda não voltou era da escolha de antes: não vale mais (planCriar confere)
		clearTimeout(state.planTimer);
		state.planTimer = null;
		state.planSeq++;
		state.openFile = ''; // outra pasta: o projeto marcado na lista sai
		state.openAuto = false;
		state.sameOff = '';
		state.filesAll = false;
		$('claq-rest').classList.remove('is-opening');
		flow.pick = pick;
		state.plan = null;
		// a lista JÁ NA PASTA era da pasta de antes: sai até o plano novo chegar
		$('arq-files').hidden = true;
		if (!pick) {
			renderDest();
			renderFile();
			return renderOut();
		}

		// a pasta de output da atração (o índice ou o tipo): a de partida do campo do output
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

	// o cartão do filme escolhido (o da lista dos recentes ou o achado na busca, com o campo fechado)
	function renderFilmCard() {
		var card = $('film-card');
		var attr = flow.pick && flow.attr && flow.attr.isFilm && state.claqClosed ? flow.attr : null;

		card.hidden = !attr;
		if (!attr) return;

		var key = [attr.name, attr.year, attr.poster, attr.exib, attr.done].join('|');

		if (card.dataset.key === key) return;
		card.dataset.key = key;
		card.textContent = '';

		var row = filmRow(attr);

		// só para conferir: sem clique
		row.disabled = true;
		row.tabIndex = -1;
		card.appendChild(row);
	}

	function renderDest() {
		renderFilmCard();
		renderCardInfo();
		renderPath();
		renderRules();
		// o card sem atração, antes de escolher o tipo: o resto da tela espera pelo tipo
		$('sc-claquete').classList.toggle('is-novatype', !!state.cardNova && !flow.pick && !!state.claqClosed);
	}

	function renderPath() {
		var node = $('claq-dest');
		var pick = flow.pick;
		var plan = state.plan;

		var top = $('claq-path'); // com o destino conferido, o caminho fica em cima, logo abaixo do título (e abre a pasta)

		top.hidden = true;
		node.hidden = false;
		if (!flow.claquete) return hintLine(node, '');
		if (!pick) return hintLine(node, '');
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
		destLine(top, head, segs, plan.projectsName);
		top.hidden = false;
		node.hidden = true;

		// a pasta que já existe abre no clique (a de projetos ou, sem ela ainda, a da estrutura)
		var open = plan.projectsExists ? plan.projects : plan.rootExists ? plan.root : '';

		top.disabled = !open;
		top.dataset.open = open;
		top.title = open ? 'abrir a pasta: ' + top.title : top.title + ' (ainda não existe: é criada com o projeto)';
		if (open) top.insertAdjacentHTML('beforeend', OPEN_SVG);
	}

	var OPEN_SVG = '<svg class="wz-path-open" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h9v9M18 6 7 17" /></svg>';

	// o nome do .aep e se ele já existe, sem perguntar ao After: o último nível (ou a atração) + o que é (a mesma
	// conta do host); a lista dos .aep da pasta veio no plano. digitar o o que é não chama o host (ele lê a rede e
	// travava a digitação)
	function localFile(plan) {
		if (!flow.pick) return;

		var levels = String(flow.pick.quadro || '').split('/');
		var custom = flow.pick.fileName || '';
		var base = !levels[levels.length - 1].trim() && custom.indexOf(WHAT_TOKEN) >= 0
			? ATR.aepFileName(custom.split(WHAT_TOKEN).join(' ' + (flow.what || '') + ' ')) // o o que é no lugar do token
			: ATR.aepFileName((levels[levels.length - 1].trim() || custom.split(WHAT_TOKEN).join(' ') || flow.pick.name) + ' ' + (flow.what || ''));

		plan.fileBase = base;
		plan.fileName = base + '.aep';
		plan.exists = (plan.existing || []).some(function (f) {
			return f.name === base && f.ext !== 'aet' && !f.sub; // o .aep novo vai para o topo da pasta de projetos
		});
	}

	// os .aep e .aet da pasta de projetos e das subpastas logo dentro dela (um nível só), pelo Node do painel: a leitura
	// é assíncrona e não trava o After, nem com a rede lenta (o host faria o mesmo de uma vez, parado). ficam de fora as
	// escondidas e as pastas de autosave, logs, OLD, NÃO VALE e as sem nome (como no host, padIsJunkFolder)
	var JUNK_FOLDER = /^(old|olds|nao ?vale|n[aã]o ?usar|logs?|thumbs\.db|desktop\.ini)$|auto[\s._-]*save|^(new folder|untitled( folder)?|nova pasta|(pasta )?sem t[ií]tulo)([\s._-]*\(?\d+\)?)?$/i;

	async function listAeps(fs, dir) {
		var pathMod = require('path');
		var out = [];
		var read = async function (folder, sub, depth) {
			var items;

			try {
				items = await fs.promises.readdir(folder, { withFileTypes: true });
			} catch (err) {
				return;
			}

			await Promise.all(items.map(async function (d) {
				var name = d.name;
				var full = pathMod.join(folder, name);

				if (/^\./.test(name)) return;
				if (d.isFile() && /\.ae[pt]$/i.test(name)) {
					var st = null;

					try {
						st = await fs.promises.stat(full);
					} catch (err) { }
					out.push({ name: name.replace(/\.ae[pt]$/i, ''), ext: /\.aet$/i.test(name) ? 'aet' : 'aep', sub: sub, modified: st ? st.mtimeMs : 0 });
				} else if (depth > 0 && d.isDirectory() && !JUNK_FOLDER.test(name.normalize('NFC').replace(/[_-]+/g, ' ').trim())) {
					await read(full, name, depth - 1);
				}
			}));
		};

		await read(dir, '', 1);

		return out.sort(function (a, b) {
			return b.modified - a.modified;
		});
	}

	function planArgs(extra) {
		return Object.assign({ atracao: flow.pick.name, quadro: flow.pick.quadro || '', path: flow.pick.path, what: flow.what, output: flow.pick.out || '', fileName: flow.pick.fileName || '' }, extra || {});
	}

	function planCriar() {
		clearTimeout(state.planTimer);

		if (!flow.pick) return;

		var seq = ++state.planSeq;
		var pick = flow.pick;
		// o plano vale só para a escolha de agora: a escolha mudou ou saiu (o campo limpo) enquanto o host ou o Node
		// respondia, a resposta é descartada em silêncio
		var stale = function () {
			return seq !== state.planSeq || flow.pick !== pick;
		};

		state.planTimer = setTimeout(async function () {
			state.planTimer = null;
			if (stale()) return;
			try {
				// com o Node do painel, os .aep da pasta são lidos aqui (sem travar o After: ADR 0003); sem ele, pelo host
				var fs = ATR.nodeFs ? ATR.nodeFs() : null;
				var node = !!(fs && fs.promises);
				var plan = await call('projectPlan', planArgs({ list: !node }));

				if (stale()) return;
				if (node && plan.listed === false) {
					plan.existing = plan.projectsFs ? await listAeps(fs, plan.projectsFs) : [];
					if (stale()) return;
				}
				state.plan = plan;
				// veio pelo card do Trello: os .aep que batem com a claquete ficam em destaque; só um, fica marcado (Abrir
				// projeto). nenhum: nada marcado, pronto para criar
				if (state.cardMark && state.card && flow.pick) {
					var own = cardFiles(state.card.claq, plan.existing);

					state.cardMark = false;
					if (own.length === 1 && !state.openFile) state.openFile = own[0];
				}
				localFile(plan);
				renderPlan(plan);
				followPedido();
			} catch (err) {
				if (!stale()) status(err.message, 'error');
			}
		}, state.plan ? 140 : 0);
	}

	function renderPlan(plan) {
		var meta = $('criar-meta');
		var user = el('span');

		// o nome do .aep novo já existe na pasta: ele fica marcado no JÁ NA PASTA (Abrir projeto), a não ser que a
		// pessoa tenha desmarcado esse nome; outro nome (o o que é mudou) tira a marca que veio sozinha
		if (state.openAuto && state.openFile !== plan.fileName) {
			state.openFile = '';
			state.openAuto = false;
		}
		if (plan.exists && !state.openFile && state.sameOff !== plan.fileBase) {
			state.openFile = plan.fileName;
			state.openAuto = true;
		}

		meta.textContent = '';
		user.innerHTML = USER_SVG;
		user.appendChild(document.createTextNode(plan.user));
		meta.appendChild(user);

		renderDest();
		renderFile();
		renderFiles(plan);
		renderOut();
		$('criar-go').textContent = state.openFile ? 'Abrir projeto' : 'Criar projeto';
	}

	/* ---------- as regras automáticas (passo 2): chips visíveis e trocáveis, perto do caminho ---------- */

	// o ano do projeto (o {ano} dos tipos e o ano das pastas que já existem: BBB 2026 → BBB 2027; o que começa antes
	// da virada), o ano de produção do filme (a pasta e o .aep: NAO NAO OLHE (2022)) e, no tipo fixo com mês (MOOD
	// MENSAL, ADR 0002), o mês. cada um diz de onde veio (pelo card, este ano, produção, próximo mês, trocado); o clique
	// troca sem perder a escolha
	var CAL_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /></svg>';
	var MONTHS = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
	var MONTH_TOKENS = /\{(mes|mes_extenso|proximo_mes|proximo_mes_num|ano_proximo_mes)\}/;

	function ruleChip(icon, label, note, tip, on, click) {
		var chip = el('button', 'wz-rule' + (on ? ' is-on' : ''));

		chip.type = 'button';
		chip.innerHTML = icon;
		chip.appendChild(el('b', null, label));
		chip.appendChild(el('span', null, '· ' + note));
		chip.title = tip;
		chip.addEventListener('click', click);

		return chip;
	}

	function renderRules() {
		var box = $('claq-rules');
		var attr = flow.pick && flow.attr && state.plan ? flow.attr : null;

		box.textContent = '';
		box.hidden = !attr;
		if (!attr) return;

		if (attr.isFilm) {
			var prod = Number(attr.prodYear || attr.year) || 0;
			var fy = Number(attr.year) || 0;

			if (fy) box.appendChild(ruleChip(FILM_SVG, '(' + fy + ')', fy === prod ? 'produção' : 'trocado', 'o ano de produção do filme (a pasta e o .aep): clique para trocar', fy !== prod, function () {
				var order = [prod, prod + 1, prod - 1];

				changeFilmYear(order[(order.indexOf(fy) + 1) % order.length]);
			}));

			return;
		}

		var now = new Date().getFullYear();
		var y = ATR.projectYear();
		var auto = state.yearBy === 'card' ? state.cardYear : now;
		var note = y === auto ? (state.yearBy === 'card' ? 'pelo card' : 'este ano') : 'trocado';
		var base = attr.base;
		var monthly = attr.isFixed && base && (MONTH_TOKENS.test(base.pattern) || MONTH_TOKENS.test(base.filePattern || ''));

		// no tipo fixo com mês, o ano vem do mês (o próximo janeiro): o chip do mês diz os dois
		if (!monthly) {
			box.appendChild(ruleChip(CAL_SVG, String(y), note, 'o ano do projeto: clique para trocar (o de agora, o que vem, o anterior)', note === 'trocado', function () {
				var order = [auto, auto + 1, auto - 1];

				changeYear(order[(order.indexOf(y) + 1) % order.length]);
			}));
		} else {
			var m = attr.month || nextMonth();
			var fromCard = state.card && attr.month && ATR.monthOf(state.card.claq) && ATR.monthOf(state.card.claq).index === attr.month.index;

			box.appendChild(ruleChip(CAL_SVG, MONTHS[m.index] + ' ' + m.year, fromCard ? 'pelo card' : attr.month ? 'trocado' : 'próximo mês', 'o mês do ' + base.label + ' (a pasta e o .aep): clique para o seguinte', !!attr.month && !fromCard, function () {
				changeMonth((m.index + 1) % 12);
			}));
		}
	}

	// o próximo mês (a regra de sempre do tipo fixo): { index, year }
	function nextMonth() {
		var d = new Date();

		return { index: (d.getMonth() + 1) % 12, year: d.getFullYear() + (d.getMonth() === 11 ? 1 : 0) };
	}

	// a pasta e os .aep mudam: o plano é refeito, com as pastas do caminho (os quadros) relidas
	async function rePick() {
		var p = claqParts();

		state.pickKey = null;
		if (flow.attr && p.deep && flow.walk) {
			flow.walk = await walkPath(flow.attr.path, p.levels, p.last, false);
		}
		updatePick();
	}

	function changeYear(y) {
		ATR.setYear(y);
		state.folderCache = {}; // as pastas do ano novo
		// a atração escolhida continua: só a pasta dela vai para o ano novo
		if (flow.attr) flow.attr = atYear(flow.attr);
		rePick();
	}

	// o mês do tipo fixo (o seguinte): o ano é o da próxima vez que esse mês chega
	function changeMonth(index) {
		var attr = flow.attr;
		var month = ATR.monthOf(MONTHS[index]);

		if (!attr || !attr.base) return;
		flow.attr = Object.assign({}, attr, novaAttr(attr.base.label, attr.base, month), { isNewAttr: false, isFixed: true, month: month });
		rePick();
	}

	// o ano de produção do filme: a pasta e o .aep com o outro ano; de volta ao de produção, a pasta de antes
	async function changeFilmYear(y) {
		var attr = flow.attr;
		var base = filmBase();
		var orig = attr.filmOrig || attr;

		if (!base) return;
		if (String(y) === String(orig.prodYear || orig.year)) flow.attr = orig;
		else {
			var name = attr.name.toUpperCase();
			var path = fillPattern(base.pattern, name, base.label, y);
			var file = base.filePattern ? fillPattern(base.filePattern, name, base.label, y) : name + ' (' + y + ')';

			flow.attr = Object.assign({}, orig, { year: String(y), path: path, display: displayPath(path), out: base.outPattern ? fillPattern(base.outPattern, name, base.label, y) : orig.out, filmFile: file, filmOrig: orig });
		}
		rePick();
	}

	// o nome do .aep (o último nível, ou a atração, + o que é); o que já existe e não vai ser aberto é salvo como … 2
	function renderFile() {
		var plan = state.plan;
		var span = $('arq-file').querySelector('span');
		var name = plan ? (plan.exists && !state.openFile ? plan.fileBase + ' 2' : plan.fileBase) : '';

		span.textContent = '';
		span.appendChild(el('b', null, name || '\u200E…')); // a marca LTR segura o '…' antes do .aep (a linha corta pelo começo)
		span.appendChild(document.createTextNode('.aep'));
	}

	/* ---------- os tipos de projeto da configuração (aba TIPOS DE PROJETO) ---------- */

	async function ensureBases() {
		if (state.basesLoaded) return;

		try {
			state.bases = await newBases();
		} catch (err) {
			state.bases = [];
		}
		state.basesLoaded = true;
	}

	/* ---------- o .aep que já existe ---------- */

	// os .aep / .aet que já estão na pasta de projetos e nas subpastas logo dentro dela (a subpasta escrita antes do
	// nome), do mais novo para o mais velho, com há quanto tempo à direita. vindo de um card, os que batem com a
	// claquete ficam no topo, em destaque (CARD). um clique marca um (de novo, desmarca): o botão do rodapé vira "Abrir
	// projeto". a confirmação é o próprio botão: nada abre no primeiro clique. o de nome igual ao do .aep novo vem
	// marcado sozinho (renderPlan)
	function renderFiles(plan) {
		var box = $('arq-files');
		var list = $('arq-files-list');
		var note = $('arq-files-note');
		var byCard = state.card ? cardFiles(state.card.claq, plan.existing) : [];
		var files = (plan.existing || []).slice().sort(function (a, b) {
			return (byCard.indexOf(fileId(b)) >= 0 ? 1 : 0) - (byCard.indexOf(fileId(a)) >= 0 ? 1 : 0) || (b.modified || 0) - (a.modified || 0);
		});
		var picked = '';

		box.hidden = !files.length;
		list.textContent = '';
		$('arq-files-title').textContent = 'JÁ NA PASTA · ' + files.length + (state.card ? ' · ' + byCard.length + ' com a claquete do card' : '');

		// os do card, mais 3 (os mais recentes) e o marcado, se estiver depois; o resto num "+ N"
		var rest = 0;
		var shown = state.filesAll ? files : files.filter(function (f) {
			var id = fileId(f);

			if (byCard.indexOf(id) >= 0 || state.openFile === id) return true;

			return rest++ < 3;
		});

		if (state.card && !byCard.length && files.length) list.appendChild(el('p', 'wz-files-hint', 'nenhum .aep com a claquete do card: pronto para criar.'));
		shown.forEach(function (f, i) {
			var full = fileId(f);
			var card = byCard.indexOf(full) >= 0;
			var row = el('button', 'wz-file' + (state.openFile === full ? ' is-on' : '') + (card ? ' is-card' : '') + (!f.sub && f.name === plan.fileBase && f.ext !== 'aet' ? ' is-same' : ''));
			var name = el('span', 'wz-file-name');

			// os do card separados dos outros por uma linha
			if (i && !card && byCard.indexOf(fileId(shown[i - 1])) >= 0) list.appendChild(el('hr', 'wz-files-sep'));
			row.type = 'button';
			row.setAttribute('role', 'option');
			row.setAttribute('aria-selected', String(state.openFile === full));
			row.title = (state.openFile === full ? 'clique para desmarcar' : 'clique para marcar: o botão Abrir projeto abre este') + (f.modified ? ' · ' + pdStamp(f.modified) : '');
			row.innerHTML = FILE_ROW_SVG;
			if (f.sub) name.appendChild(el('small', null, f.sub + '/'));
			name.appendChild(document.createTextNode(f.name));
			name.appendChild(el('i', null, '.' + (f.ext || 'aep')));
			row.appendChild(name);
			if (card) row.appendChild(el('em', 'wz-file-tag', 'CARD'));
			row.appendChild(el('time', null, relDays(f.modified)));
			row.addEventListener('click', function () {
				// desmarcar o de nome igual: fica desmarcado (criar com outro o que é; com o mesmo, salva como … 2)
				if (state.openFile === full && full === plan.fileName) state.sameOff = plan.fileBase;
				state.openFile = state.openFile === full ? '' : full;
				state.openAuto = false;
				renderPlan(plan);
			});
			list.appendChild(row);
			if (state.openFile === full) picked = full;
		});

		if (shown.length < files.length) {
			var more = el('button', 'wz-files-more', '+ ' + (files.length - shown.length));

			more.type = 'button';
			more.title = 'mostrar todos';
			more.addEventListener('click', function () {
				state.filesAll = true;
				renderPlan(plan);
			});
			list.appendChild(more);
		}

		// o marcado sumiu da pasta (outra atração, a lista relida): nada marcado
		if (!picked) state.openFile = '';
		list.classList.toggle('is-picking', !!picked);
		// marcado na lista (abrir), o "o que é" e o nome do arquivo novo saem: "criar um novo" volta para eles. o que
		// veio marcado pelo o que é (o nome já existe) deixa os dois à vista: é só mudar o o que é
		$('claq-rest').classList.toggle('is-opening', !!picked && !state.openAuto);
		note.hidden = !picked;
		note.textContent = '';
		if (picked) {
			var fresh = el('button', 'wz-files-new', 'criar um novo em vez de abrir');

			fresh.type = 'button';
			fresh.addEventListener('click', function () {
				if (picked === plan.fileName) state.sameOff = plan.fileBase;
				state.openFile = '';
				state.openAuto = false;
				renderPlan(plan);
				$('arq-what').focus();
			});
			if (state.openAuto) note.appendChild(document.createTextNode('esse nome já existe · '));
			note.appendChild(fresh);
		}
	}

	var FILE_ROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><path d="M13.5 3.5V8H18" /></svg>';

	/* ---------- o aviso do Padeiro (jmbillard/TEXTAO#141) ---------- */

	// o que avisa o PROMeiro ao abrir ou criar o projeto: o card do NO TRELLO escolhido (state.card: a Produção do
	// PROMeiro, ou o card do webhook) ou o filme. pego antes de a janela recomeçar; null quando não veio por nenhum
	// deles. o card vale enquanto o campo for a atração dele (lookup: clearCard)
	function avisoTarget() {
		var c = state.card;
		var pedido = state.avisoPedido;

		if (!flow.pick) return null;
		// pela janela PROMeiro · produções: ela já pegou a Produção (o aviso foi de lá)
		if (pedido && aepName(flow.pick.name) === pedido.attr) return null;
		if (c && (c.producao || c.card)) return { producao: c.producao || '', card: c.card || '' };
		if (flow.attr && flow.attr.isFilm && aepName(flow.attr.name) === aepName(flow.pick.name)) return { film: flow.attr.name };

		return null;
	}

	// o aviso vai para a fila deste computador e de lá ao PROMeiro (js/promeiro.js): sem rede, fica para depois. o
	// filme acha a Produção dele na lista do PROMeiro (sem ela, nada). nunca dá erro na tela nem segura a janela. sem
	// a chave ligada, nada sai. o webhook do projeto (startEnvio) é outra coisa: com a chave ligada, também vai ao
	// PROMeiro, no lugar do n8n (jmbillard/TEXTAO#144)
	async function avisar(target) {
		state.avisoPedido = null;
		if (!target || !window.PAD_PROMEIRO) return;

		try {
			if (target.film) {
				var producao = await ATR.filmProduction(target.film);

				if (!producao) return;
				target = { producao: producao };
			}
			await PAD_PROMEIRO.notify(target);
		} catch (err) { }
	}

	/* ---------- o pedido da janela PROMeiro · produções (jmbillard/TEXTAO#149) ---------- */

	// Abrir projeto, na janela PROMeiro: ela pega a Produção e pede (pelo host, promeiro-pedido-projeto.json) o que o
	// clique no card do NO TRELLO faz aqui (pickCard): a atração do card (ou o filme), a pasta de projetos dela e o .aep
	// do card. Achado um .aep só, abre; sem ele, cria. A resposta volta pelo host (projeto-feito): o arquivo, se foi
	// criado, ou o erro. O card sem atração (a atração nova: falta o tipo) ou que não leva a nada fica com a claquete
	// digitada e a pessoa termina aqui (pendente)
	var PEDIDO_TTL = 60000; // o pedido mais velho que isso não vale ao abrir a janela
	var pedidoVisto = 0;

	async function watchPedido(initial) {
		if (document.hidden && !initial) return;

		var req;

		try {
			req = await call('promeiroPedido', { para: 'projeto' });
		} catch (err) {
			return;
		}

		if (!req.stamp || req.stamp <= pedidoVisto) return;
		pedidoVisto = req.stamp;
		if (initial && req.now - req.stamp > PEDIDO_TTL) return;

		await fromPromeiro(req.stamp, req.dados || {});
	}

	async function fromPromeiro(stamp, d) {
		var pedido = { stamp: stamp, producao: String(d.producao || '') };
		var claq = String(d.claq || '');

		state.pedido = null;
		if (state.busy) return answerPedido(pedido, { erro: 'O PROJETISTA está ocupado: tente de novo.' });
		// o projeto aberto ainda não foi lido (a janela acabou de abrir): lê antes, para a leitura não recomeçar a tela
		if (!state.current) await refresh(true);

		startManualNew('');

		var res = null;

		try {
			res = await searchAll(claq);
		} catch (err) { }

		var matches = (res && res.matches) || [];
		// o card da Produção na lista (o mesmo do NO TRELLO) ou, fora dela, um card com o que a janela mandou
		var c = ((res && res.cards) || []).filter(function (x) {
			return (pedido.producao && x.producao === pedido.producao) || (d.card && x.card === d.card);
		})[0] || { claq: claq, red: '', ed: '', des: '', st: '', card: String(d.card || ''), at: '', time: 0, atr: d.atr ? aepName(d.atr) : '', fil: !!d.filme, producao: pedido.producao, words: aepName(claq).split(' ').filter(Boolean) };
		var target = cardTarget(c, matches);

		if (target.kind !== 'skip') {
			state.lookupSeq++; // a busca de antes (do campo vazio) não vale mais
			await pickCard(c, target);
		}

		if (target.kind === 'skip' || state.cardNova || !flow.attr) {
			if (target.kind === 'skip') {
				clearCard();
				$('claq').value = claq;
				lookup();
			}

			return answerPedido(pedido, { pendente: target.kind === 'skip' ? 'o filme: escolha na lista dos filmes.' : 'a atração da claquete não foi achada: escolha o tipo da atração nova.' });
		}

		state.avisoPedido = { attr: aepName(flow.attr.name) };
		pedido.attr = aepName(flow.attr.name);
		state.pedido = pedido;
	}

	// o plano da atração do pedido chegou: abre o .aep do card ou cria
	function followPedido() {
		var pedido = state.pedido;

		if (!pedido || !flow.pick || aepName(flow.pick.name) !== pedido.attr || state.busy) return;

		state.pedido = null;
		if (state.openFile) openPicked(pedido);
		else create(undefined, pedido);
	}

	// a resposta à janela PROMeiro (pelo host): { arquivo, criado } | { erro } | { pendente }
	function answerPedido(pedido, r) {
		if (!pedido) return;

		call('promeiroPedir', { para: 'projeto-feito', dados: Object.assign({ pedido: pedido.stamp, producao: pedido.producao }, r) }).catch(function () { });
	}

	// abre o projeto marcado na lista e encerra o fluxo (o After pergunta se salva o que está aberto). escolhido por um
	// card: o host devolve o envio ao webhook do projeto (o designer no card, momento aberto), que sai em segundo plano
	// depois de abrir; a janela fecha depois dos avisos. pedido: o da janela PROMeiro · produções, que recebe a resposta
	async function openPicked(pedido) {
		if (state.busy || !state.openFile || !state.plan) return;

		var target = avisoTarget();
		var file = state.openFile;

		state.busy = true;
		$('criar-go').disabled = true;
		$('criar-go').textContent = 'Abrindo…';
		try {
			var attr = flow.attr || {};

			await PAD_BRIDGE.prepararMontagem([state.plan.projects]);

			var res = await call('projectOpenFile', { path: String(state.plan.projects).replace(/[\\\/]+$/, '') + '/' + state.openFile, atracao: flow.pick ? flow.pick.name : '', quadro: flow.pick ? flow.pick.quadro || '' : '', tipo: attr.tipo || '', pasta: state.plan.root || '', card: cardDoEnvio(), filme: filmeDoEnvio(attr) });
			var sending = startEnvio(res);

			status('projeto aberto: ' + state.openFile, 'success');
			answerPedido(pedido, { arquivo: file, criado: false });
			await avisar(target);
			$('criar-go').textContent = 'Aberto';
			state.openFile = '';
			setTimeout(async function () {
				await waitAvisos(sending);
				PAD_BRIDGE.closePanel();
				state.busy = false;
				state.currentKey = null;
				refresh(true);
			}, 700);
		} catch (err) {
			state.busy = false;
			$('criar-go').disabled = false;
			$('criar-go').textContent = 'Abrir projeto';
			status(err.message, 'error');
			answerPedido(pedido, { erro: PAD_UTIL.errorText(err.message) });
		}
	}

	/* ---------- o output: a pasta da atração e, com barras, as subpastas ---------- */

	// a pasta de partida: a escolhida no navegador ou a da atração (o caminho já montado no volume, do plano)
	function outBase() {
		return state.outCustom || fillWhat(state.plan && state.plan.output) || '';
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

			if (seq !== state.outSeq || !flow.pick) return; // a escolha saiu enquanto as pastas eram lidas
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
		// o .aep que já existe e não foi aberto: salva como … 2. tipo, atracaoNova, card e filme: só para o envio ao
		// webhook do projeto (o host o monta junto do .aep salvo: regras/webhook-do-projeto.js). o card escolhido vai só
		// no envio, nunca no projeto (ADR 0001): o host não o grava
		var attr = flow.attr || {};

		return planArgs(Object.assign({ mode: state.plan && state.plan.exists ? 'increment' : '', tipo: attr.tipo || '', atracaoNova: attr.isNewAttr === true, card: cardDoEnvio(), filme: filmeDoEnvio(attr) }, outTarget()));
	}

	// o filme, como vai no envio ({ ano }: o ano de produção que foi para a pasta e o .aep), ou null fora do filme
	function filmeDoEnvio(attr) {
		return attr && attr.isFilm ? { ano: String(attr.year || '') } : null;
	}

	// o card escolhido, como vai no envio ({ id, claquete }), ou null. só no envio, nunca no projeto (ADR 0001)
	function cardDoEnvio(c) {
		c = c === undefined ? state.card : c;

		return c && c.card ? { id: String(c.card), claquete: String(c.claq || '') } : null;
	}

	/* ---------- o webhook do projeto: o registro, a atração nova e o card no n8n (docs/webhook-projeto.md) ----------
	   com a chave do Padeiro ligada, o mesmo envio vai ao PROMeiro (POST /api/padeiro/projeto, js/promeiro.js), no
	   lugar do n8n, com a mesma resposta (jmbillard/TEXTAO#144); sem ela, ou com o PROMeiro recusando a chave ou fora
	   do ar, o n8n, como antes */

	var WEBHOOK = window.PAD_WEBHOOK_DO_PROJETO; // o envio e os avisos (regras/webhook-do-projeto.js)
	var WEBHOOK_TIMEOUT = 8000; // ms: o n8n que não responde nisso vira o aviso amarelo
	var WEBHOOK_READ = { success: 2200, warn: 6000 }; // ms: o aviso à vista antes de a janela fechar

	// o POST do envio pelo Node do painel → o texto da resposta (rejeita no HTTP de erro, sem rede ou no tempo esgotado)
	function postJson(url, corpo) {
		return new Promise(function (resolve, reject) {
			var body = Buffer.from(JSON.stringify(corpo), 'utf8');
			var req = require(/^https:/i.test(url) ? 'https' : 'http').request(url, { method: 'POST', timeout: WEBHOOK_TIMEOUT, headers: { 'Content-Type': 'application/json', 'Content-Length': body.length, Accept: 'application/json', 'User-Agent': 'O PADEIRO' } }, function (res) {
				var chunks = [];

				res.on('data', function (c) {
					chunks.push(c);
				});
				res.on('error', reject);
				res.on('end', function () {
					if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error('HTTP ' + res.statusCode));
					resolve(Buffer.concat(chunks).toString('utf8'));
				});
			});

			req.on('timeout', function () {
				req.destroy(new Error('tempo esgotado'));
			});
			req.on('error', reject);
			req.end(body);
		});
	}

	// o envio sem para onde ir: sem a chave ligada e sem a URL do n8n (nenhum aviso)
	var NADA_ENVIADO = {};

	// envia em segundo plano: com a chave ligada, ao PROMeiro (#144); senão (ou se ele não der), ao n8n, pelo Node do
	// painel primeiro e, sem ele, pelo curl do host (o plano B, ADR 0003) → a resposta (o objeto ou o texto), null
	// (sem resposta) ou NADA_ENVIADO
	async function sendEnvio(envio) {
		var doPromeiro = null;

		if (window.PAD_PROMEIRO) {
			try {
				doPromeiro = await PAD_PROMEIRO.project(envio.corpo);
			} catch (err) {
				doPromeiro = { falhou: true };
			}

			if (doPromeiro && doPromeiro.resposta) return doPromeiro.resposta;
		}

		// sem a URL do n8n: o PROMeiro que não respondeu vira o aviso amarelo; sem a chave ligada, nada foi enviado
		if (!envio.url) return doPromeiro ? null : NADA_ENVIADO;

		try {
			if (ATR.nodeFs && ATR.nodeFs()) return await postJson(envio.url, envio.corpo);

			var res = await call('projectWebhook', { envio: envio });

			return res && res.status >= 200 && res.status < 300 ? res.texto : null;
		} catch (err) {
			return null;
		}
	}

	// o envio e a resposta virando os avisos → { avisos, copiaVelha }. a atração entrou no banco: a cópia do índice fica
	// velha (a próxima busca baixa o índice de novo e já a acha). nunca rejeita
	async function webhookDoProjeto(envio) {
		var resposta = await sendEnvio(envio);

		if (resposta === NADA_ENVIADO) return { avisos: [], copiaVelha: false };

		var lido = WEBHOOK.avisos(resposta, envio);
		var fs = ATR.nodeFs ? ATR.nodeFs() : null;

		if (lido.copiaVelha && fs) {
			try {
				window.PAD_SEARCH_INDEX.markStale(fs, await call('searchInfo'));
			} catch (err) { }
		}

		return lido;
	}

	// os avisos na linha do rodapé: verde quando todos deram certo, amarelo quando algum não. antes: um texto que fica
	// na frente (o "salvo como" do Alterar)
	function showAvisos(lido, antes) {
		var warn = lido.avisos.some(function (a) {
			return a.kind !== 'success';
		});

		status((antes ? [antes] : []).concat(lido.avisos.map(function (a) {
			return a.texto;
		})).join(' · '), warn ? 'warn' : 'success');

		return warn ? 'warn' : 'success';
	}

	// o envio que o host devolveu (criar, abrir, salvar) sai em segundo plano → a promessa dos avisos, ou null (nada a
	// enviar)
	function startEnvio(res) {
		return res && res.envio && WEBHOOK ? webhookDoProjeto(res.envio) : null;
	}

	// mostra os avisos do envio e os deixa à vista um instante (antes de a janela fechar); sem envio, ou sem aviso (o
	// registro do projeto com a resposta de itens vazio: o sucesso silencioso), não espera
	async function waitAvisos(sending, antes) {
		if (!sending) return;

		var lido = await sending;

		if (!lido.avisos.length) return;

		var kind = showAvisos(lido, antes);

		await new Promise(function (resolve) {
			setTimeout(resolve, WEBHOOK_READ[kind]);
		});
	}

	async function create(args, pedido) {
		if (state.busy) return;
		if (!flow.pick) {
			status('#PAD_090 - escolha a atração do projeto.', 'error');
			return $('claq').focus();
		}

		var done = false;

		state.busy = true;
		$('criar-go').disabled = true;
		$('criar-go').textContent = 'Criando…';

		try {
			if (!state.plan || state.planTimer) await new Promise(function (resolve) {
				setTimeout(resolve, 300);
			});

			var target = avisoTarget();
			var cargs = args || createArgs();

			await PAD_BRIDGE.prepararMontagem([cargs.path, cargs.output]);

			var res = await call('projectCreate', cargs);
			// a atração nova ou escolhida por um card: o aviso ao n8n, em segundo plano (a criação já terminou e não
			// espera por ele)
			var sending = startEnvio(res);

			// a ação final fecha a janela: a confirmação fica um instante à vista (o botão diz "Criado") e ela fecha.
			// com o envio, ela fecha depois de mostrar os avisos dele (no máximo o tempo do envio + a leitura).
			// onde não dá para fechar (o navegador de teste), a janela vira o editor do projeto criado
			done = true;
			status('projeto criado: ' + res.file.split(/[\\\/]/).pop(), 'success');
			answerPedido(pedido, { arquivo: res.file.split(/[\\\/]/).pop(), criado: true });
			$('criar-go').textContent = 'Criado';
			await avisar(target);
			setTimeout(async function () {
				await waitAvisos(sending);
				PAD_BRIDGE.closePanel();
				state.busy = false;
				$('criar-go').textContent = 'Criar projeto';
				await refresh(true);
			}, 1300);
		} catch (err) {
			status(err.message, 'error');
			answerPedido(pedido, { erro: PAD_UTIL.errorText(err.message) });
		} finally {
			if (!done) {
				state.busy = false;
				$('criar-go').disabled = !flow.pick;
				$('criar-go').textContent = 'Criar projeto';
			}
		}
	}

	/* ---------------------------------------------------------------
	   editor (projeto criado)
	   --------------------------------------------------------------- */

	// o editor: a atração (buscada como no projeto novo) e o designer, o que é, e as pastas (o caminho no campo,
	// a pastinha troca). Salvar grava os dados e leva o .aep para a pasta de projetos da estrutura, com o nome da
	// atração + o que é. um projeto salvo sem os dados do padeiro (adopt) entra direto aqui: a busca roda sozinha
	// com o nome do arquivo e a primeira atração achada já vem marcada (o resto do nome vai para o o que é).
	function renderEditor(cur, adopt) {
		var key = (adopt ? 'a|' : 'c|') + (cur.file || (cur.unsaved ? 'convertido|' + cur.atracao : ''));

		$('ed-hint').hidden = !adopt;
		// com os dados, mas salvo fora da pasta dele (ex: "salvar como" na Área de Trabalho): Salvar leva o .aep de volta
		// convertido: o After abriu um projeto antigo e converteu, sem salvar; os dados do padeiro vieram junto
		var hint = 'projeto salvo sem os dados do padeiro: confira a atração, o que é e as pastas e salve.';

		if (cur.unsaved) hint = 'projeto convertido de uma versão antiga do After, ainda não salvo: estes são os dados que ele já tinha. Salvar grava o .aep na pasta abaixo.';
		else if (cur.outside) hint = 'o projeto está salvo fora da pasta dele: Salvar leva o .aep para a pasta abaixo.';
		$('ed-hint').textContent = hint;
		$('ed-user').placeholder = cur.defaultUser || 'designer';
		edEditors(cur);

		// os campos só são preenchidos quando o projeto muda: a atualização a cada 1,5 s não apaga o que está
		// sendo digitado (nem a pasta escolhida e ainda não salva)
		if (state.editorKey !== key) {
			state.editorKey = key;
			state.edRes = null;
			// os tipos da configuração: o nome do .aep do tipo fixo (edTypeName) depende deles
			ensureBases().then(edFile);
			state.edPicked = '';
			state.edAttr = null;
			state.edCard = null;
			state.edWalk = null;
			state.edLevelsDone = !!cur.quadro;
			state.edRoot = cur.root || '';
			state.edOutput = cur.output || '';
			$('ed-user').value = cur.designer;
			$('ed-atr-list').hidden = true;
			$('ed-combo').parentNode.classList.remove('is-listing');

			state.edKeep = '';
			if (cur.atracao) {
				// o que é: o gravado (padeiro:oQueE) ou, sem ele, o que vem depois da atração no nome do arquivo. um
				// nome fora desse padrão (projeto antigo) fica como está até a atração ou o que é mudarem
				// com pastas abaixo da atração: ATRAÇÃO/PASTA/… no campo, e o .aep é o último nível + o que é
				var atr = aepName(String(cur.quadro || '').split('/').pop() || cur.atracao);
				var year = !cur.quadro && (String(cur.fileName || '').match(/\((\d{4})\)/) || [])[1];
				// o filme: o ano entre parênteses depois do título (NAO NAO OLHE (2022) CHAMADA) fica ao salvar
				var fname = aepName(String(cur.fileName || '').replace(/\.aep$/i, '').replace(/\(\d{4}\)/, ' '));

				edSetYear(year && fname.indexOf(atr) === 0 ? year : '', cur.atracao);
				var what = cur.oQueE || (fname.indexOf(atr + ' ') === 0 ? fname.slice(atr.length + 1) : '');

				$('ed-atracao').value = cur.atracao.toUpperCase() + (cur.quadro ? '/' + cur.quadro.toUpperCase() : '');
				$('ed-what').value = what;
				if (!cur.oQueE && fname && fname !== atr && fname.indexOf(atr + ' ') !== 0) state.edKeep = String(cur.fileName).replace(/\.aep$/i, '');
			} else {
				var base = String(cur.fileName || '').replace(/\.aep$/i, '');

				edSetYear('', '');
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
	/* ---------- os dados do projeto (só para ver): o que o padeiro gravou no .aep ---------- */

	var PD_FILE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><path d="M13.5 3.5V8H18" /></svg>';
	var PD_OUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /><path d="M12 11v5M9.5 13.5 12 16l2.5-2.5" /></svg>';

	// 2026-11-12 → 12/11/2026
	function pdDay(day) {
		var d = /^(\d{4})-(\d{2})-(\d{2})/.exec(day || '');

		return d ? d[3] + '/' + d[2] + '/' + d[1] : day || '';
	}

	// a data e a hora de um salvamento: 17/11/2026 14:32
	// um dia (AAAA-MM-DD) do jeito que se fala: HOJE, ONTEM ou, mais para trás, a data (sem o ano, no ano de agora)
	function pdFriendlyDay(day) {
		var d = /^(\d{4})-(\d{2})-(\d{2})/.exec(day || '');

		if (!d) return day || '';

		var now = new Date();
		var today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		var that = new Date(+d[1], +d[2] - 1, +d[3]).getTime();

		if (that === today) return 'HOJE';
		if (that === today - 86400000) return 'ONTEM';

		return d[3] + '/' + d[2] + (+d[1] === now.getFullYear() ? '' : '/' + d[1]);
	}

	// um salvamento com a hora (antes do dia): 14:32 HOJE, 09:10 ONTEM ou a hora e a data
	function pdFriendlyStamp(ms) {
		var d = new Date(ms);
		var pad = function (n) {
			return (n < 10 ? '0' : '') + n;
		};
		var day = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

		return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' ' + pdFriendlyDay(day);
	}

	function pdStamp(ms) {
		var d = new Date(ms);
		var pad = function (n) {
			return (n < 10 ? '0' : '') + n;
		};

		return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
	}

	// quem salvou, o mais recente primeiro: quem salvou por último (padeiro:salvo) em cima; depois pelo dia e, no
	// mesmo dia, pela ordem das linhas (a de baixo salvou depois)
	function pdEditors(cur) {
		var last = cur.salvo && cur.salvo.user;

		return (cur.editores || []).map(function (e, i) {
			return { user: e.user, day: e.day, time: e.time || '', at: i };
		}).sort(function (a, b) {
			if ((a.user === last) !== (b.user === last)) return a.user === last ? -1 : 1;
			if (a.day !== b.day) return a.day < b.day ? 1 : -1;

			return b.at - a.at;
		});
	}

	// um caminho que abre a pasta no clique: o fim em destaque
	function pdPath(icon, path, open) {
		var btn = el('button', 'pd-path');
		var shown = displayPath(path);
		var cut = shown.replace(/\/+$/, '').lastIndexOf('/') + 1;
		var span = el('span');

		btn.type = 'button';
		btn.title = 'abrir a pasta: ' + shown;
		btn.innerHTML = icon;
		span.appendChild(document.createTextNode('\u200E' + shown.slice(0, cut)));
		span.appendChild(el('b', null, shown.slice(cut)));
		btn.appendChild(span);
		btn.addEventListener('click', open);

		return btn;
	}

	function renderDados(cur) {
		var body = $('pd-body');
		var has = !!cur.atracao;
		var head = el('div', 'pd-head');
		var name = el('div');
		var state2 = el('span', 'pd-state' + (cur.created ? '' : ' is-warn'), cur.created ? 'NA PASTA DELE' : cur.unsaved ? 'NÃO SALVO' : cur.outside ? 'FORA DA PASTA' : 'SEM OS DADOS');
		var folder = String(cur.file || '').replace(/[\\\/][^\\\/]*$/, '');

		body.textContent = '';
		head.innerHTML = PD_FILE;
		name.appendChild(el('b', null, cur.fileName || 'projeto sem arquivo'));
		name.appendChild(el('small', null, folder ? '\u200E' + displayPath(folder) : 'ainda não foi salvo')); // a marca LTR: a linha corta pelo começo
		head.appendChild(name);
		head.appendChild(state2);
		body.appendChild(head);
		$('pd-copy').disabled = !has;

		if (!has) {
			var empty = el('div', 'pd-empty');

			empty.appendChild(el('b', null, 'Este projeto ainda não passou pel\'O PROJETISTA'));
			empty.appendChild(document.createTextNode('Sem atração, pasta nem output gravados. Volte e salve para dar os dados a ele.'));
			body.appendChild(empty);

			return;
		}

		var rows = el('div', 'pd-rows');
		// tip: a data inteira, na dica (o texto diz HOJE, ONTEM)
		var row = function (k, v, small, tip) {
			var value = el('span', 'pd-v', v);

			if (small) value.appendChild(el('small', null, small));
			if (tip) value.title = tip;
			rows.appendChild(el('span', 'pd-k', k));
			rows.appendChild(value);
		};

		body.appendChild(el('p', 'wz-title', 'PROJETO'));
		row('atração', String(cur.atracao).toUpperCase());
		if (cur.oQueE) row('o que é', String(cur.oQueE).toUpperCase());
		if (cur.designer) row('criado por', cur.designer, pdFriendlyDay(cur.criado), pdDay(cur.criado));
		// o último salvamento do arquivo, com a hora: os editores abaixo são por dia (salvar de novo no mesmo dia não
		// muda a lista), e é aqui que se vê que o projeto foi salvo agora
		if (cur.modified) row('salvo em', pdFriendlyStamp(cur.modified), '', pdStamp(cur.modified));
		body.appendChild(rows);

		var editors = pdEditors(cur);

		if (editors.length) {
			var people = el('div', 'pd-people');

			body.appendChild(el('p', 'wz-title', 'QUEM SALVOU'));
			body.appendChild(el('p', 'pd-note', 'uma linha por pessoa, com o último dia em que ela salvou.'));
			editors.forEach(function (e, i) {
				var line = el('div', 'pd-person' + (i ? '' : ' is-last'));

				line.appendChild(el('i'));
				line.appendChild(document.createTextNode(e.user));
				if (!i) line.appendChild(el('em', null, 'ÚLTIMO'));
				var friendly = pdFriendlyDay(e.day);
				var when2 = el('small');
				// a hora, à esquerda, nos de hoje: a do último vem da data do arquivo; a dos outros ficou gravada quando
				// outra pessoa salvou depois deles
				var hour = friendly !== 'HOJE' ? '' : !i && cur.modified && / HOJE$/.test(pdFriendlyStamp(cur.modified)) ? pdFriendlyStamp(cur.modified).slice(0, 5) : e.time;

				if (hour) when2.appendChild(el('b', null, hour));
				when2.appendChild(document.createTextNode(friendly));
				when2.title = pdDay(e.day) + (hour ? ' ' + hour : ''); // a data inteira, na dica
				line.appendChild(when2);
				people.appendChild(line);
			});
			body.appendChild(people);
		}

		body.appendChild(el('p', 'wz-title', 'PASTAS'));
		if (cur.root) body.appendChild(pdPath(FOLDER_SVG, cur.root, async function () {
			try {
				await call('projectOpenFolder');
			} catch (err) {
				status(err.message, 'error');
			}
		}));
		if (cur.output) body.appendChild(pdPath(PD_OUT, cur.output, async function () {
			try {
				await PAD_BRIDGE.prepararMontagem([cur.output]);

				var res = await call('openOutputs', { paths: [cur.output] });

				if (res && res.missing && res.missing.length) status('#PAD_019 - output não pode ser acessado: ' + res.missing[0], 'error');
			} catch (err) {
				status(err.message, 'error');
			}
		}));
		else body.appendChild(el('p', 'wz-hint', 'sem pasta de output'));
	}

	// os dados em texto, para colar no Teams ou num e-mail
	function dadosText(cur) {
		var lines = [cur.fileName || '', 'atração: ' + String(cur.atracao).toUpperCase()];

		if (cur.oQueE) lines.push('o que é: ' + String(cur.oQueE).toUpperCase());
		if (cur.designer) lines.push('criado por: ' + cur.designer + (cur.criado ? ' em ' + pdDay(cur.criado) : ''));

		var editors = pdEditors(cur).map(function (e) {
			return e.user + ' ' + pdDay(e.day);
		});

		if (editors.length) lines.push('salvo por: ' + editors.join(' · '));
		if (cur.modified) lines.push('último salvamento: ' + pdStamp(cur.modified));
		if (cur.root) lines.push('pasta do projeto: ' + displayPath(cur.root));
		if (cur.output) lines.push('output: ' + displayPath(cur.output));

		return lines.join('\n');
	}

	async function copyDados() {
		var text = dadosText(state.current || {});
		var area = el('textarea');
		var copied = false;

		area.value = text;
		area.setAttribute('readonly', '');
		area.style.position = 'fixed';
		area.style.opacity = '0';
		document.body.appendChild(area);
		area.select();
		try {
			copied = document.execCommand('copy');
		} catch (err) { }
		area.remove();

		try {
			if (!copied) await call('copyText', { text: text });
			status('dados do projeto copiados.');
		} catch (err2) {
			status(err2.message, 'error');
		}
	}

	function openDados() {
		if (!state.current) return;
		show('dados');
		renderDados(state.current);
	}

	// volta para o editor (o refresh redesenha)
	function closeDados() {
		state.screen = '';
		state.currentKey = null;
		refresh(true);
	}

	// quem já salvou o projeto, o mais recente primeiro: 'salvo por: TMARTA 16/11 · JMBILLARD 14/11'
	function edEditors(cur) {
		var list = pdEditors(cur);
		var text = list.map(function (e) {
			var day = pdFriendlyDay(e.day);

			return e.user + (day ? ' ' + day.toLowerCase() : '');
		}).join(' · ');

		$('ed-editors').hidden = !text;
		$('ed-editors').textContent = text ? 'salvo por: ' + text : '';
		$('ed-editors').title = text ? 'quem já salvou este projeto e o último dia de cada um' : '';
	}

	// o ano de produção do filme no nome do .aep: vale enquanto a atração do campo for o filme (sem pastas abaixo)
	function edSetYear(year, name) {
		state.edYear = year ? String(year) : '';
		state.edYearFor = year ? aepName(name) : '';
	}

	function edYearBase() {
		var p = edParts();

		if (!state.edYear || p.rest.length || aepName(p.first) !== state.edYearFor) return '';

		return ATR.aepFileName(p.first + ' (' + state.edYear + ') ' + $('ed-what').value);
	}

	// o nome do .aep pelo tipo (aba TIPOS DE PROJETO > ARQUIVO), como no projeto novo: a atração escolhida que é de um tipo com
	// ARQUIVO próprio (a nova dos chips, o tipo fixo) ou o projeto aberto de um tipo fixo (MOOD MENSAL: o mês vem do
	// nome de hoje do .aep, JANEIRO NA GLOBO, não da data de hoje). sem pastas abaixo; '' quando não vale
	function edTypeName() {
		var p = edParts();
		var what = $('ed-what').value;
		var custom = '';

		if (p.rest.length) return '';
		if (state.edAttr && aepName(state.edAttr.name) === aepName(p.first)) custom = attrFileName(state.edAttr);
		else if (!state.edAttr) {
			var cur = state.current || {};
			var base = fixedBases().filter(function (b) {
				return b.filePattern && aepName(b.label) === aepName(p.first);
			})[0];
			var month = ATR.monthOf(String(cur.fileName || '')) || ATR.monthOf(String(cur.root || ''));

			if (base) custom = attrFileName(Object.assign(novaAttr(base.label, base, month), { isNewAttr: false, isFixed: true, month: month }));
		}
		if (!custom || state.edAttr && state.edAttr.isFilm) return '';

		return custom.indexOf(WHAT_TOKEN) >= 0 ? ATR.aepFileName(custom.split(WHAT_TOKEN).join(' ' + what + ' ')) : ATR.aepFileName(custom + ' ' + what);
	}

	function edFile() {
		var p = edParts();
		var name = state.edKeep || edYearBase() || edTypeName() || aepName((p.rest.length ? p.rest[p.rest.length - 1] : p.first) + ' ' + $('ed-what').value);
		var now = state.current ? String(state.current.fileName || '').replace(/\.aep$/i, '') : '';
		var span = $('ed-file').querySelector('span');

		span.textContent = '';
		span.appendChild(el('b', null, name || '…'));
		span.appendChild(document.createTextNode('.aep' + (now && name && aepName(now) !== aepName(name) ? ' · hoje: ' + now + '.aep' : '')));
	}

	// a busca da atração no editor: a mesma do projeto novo (searchAll) e a mesma lista (pickGroups: NO TRELLO,
	// FILMES, ATRAÇÕES e a NOVA); auto (o nome do arquivo) já marca a primeira. com a barra: a atração (a clicada, a
	// de nome igual ou a única achada) e as pastas do nível digitado
	function edLookup(text, auto) {
		clearTimeout(state.edTimer);

		var seq = state.edSeq = (state.edSeq || 0) + 1;
		var p = auto ? null : edParts();
		var first = p ? p.first : text;

		if (!p || !p.deep) {
			if (!(state.edAttr && p && aepName(state.edAttr.name) === aepName(first) && state.edPicked)) state.edAttr = null;
			state.edWalk = null;
		}
		if (!aepName(first)) {
			state.edRes = { matches: [], cards: [] };
			edRenderList();
			return;
		}

		state.edTimer = setTimeout(async function () {
			var res;

			try {
				res = await searchAll(first);
			} catch (err) {
				res = { matches: [], cards: [] };
			}

			if (seq !== state.edSeq) return;

			state.edRes = res;

			if (p && p.deep) {
				var exact = res.matches.filter(function (m) {
					return aepName(m.name) === aepName(p.first);
				});
				// a atração nova (dos chips) e o tipo fixo ficam enquanto o começo do campo for o nome deles
				var custom = state.edAttr && (state.edAttr.isNewAttr || state.edAttr.isFixed || state.edAttr.isCustom) && aepName(state.edAttr.name) === aepName(p.first);

				if (!custom && (!state.edAttr || !res.matches.some(function (m) {
					return m.path === state.edAttr.path;
				}))) state.edAttr = exact.length === 1 ? exact[0] : res.matches.length === 1 ? res.matches[0] : null;
				state.edWalk = state.edAttr ? await walkPath(state.edAttr.path, p.levels, p.last, false) : null;
				if (seq !== state.edSeq) return;
				if (state.edAutoSettle) {
					state.edAutoSettle = false;
					if (!p.last && !(state.edWalk && state.edWalk.info && state.edWalk.info.folders.length) && edAcceptLevels()) return;
				}
			}

			if (auto && res.matches.length) edPick(res.matches[0], text);
			else edRenderList();
		}, LOOKUP_MS);
	}

	function edRenderList() {
		var list = $('ed-atr-list');
		var p = edParts();
		var typed = aepName(p.first);
		var open = !!typed && !state.edPicked && !state.edTyped && !(p.deep && state.edLevelsDone);
		var res = state.edRes || { matches: [], cards: [] };

		ATR.resize(list, function () {
			list.textContent = '';

			if (p.deep) {
				if (!state.edAttr) {
					var m = res.matches.slice(0, LIST_MAX);

					list.appendChild(ATR.group(m.length ? 'escolha a atração' : 'nenhuma atração com esse nome'));
					m.forEach(function (match) {
						list.appendChild(ATR.row(matchIcon(match), match.name.toUpperCase(), match.tipo || '', false, function () {
							state.edAttr = match;
							$('ed-atracao').value = match.name.toUpperCase() + '/' + p.parts.slice(1).join('/');
							edLookup($('ed-atracao').value, false);
						}, match.display));
					});
					return;
				}

				list.appendChild(ATR.group('atração'));
				list.appendChild(ATR.row(matchIcon(state.edAttr), state.edAttr.name.toUpperCase(), state.edAttr.tipo || '', true, function () { }, state.edAttr.display));
				list.appendChild(ATR.sep());
				if (!state.edWalk) return list.appendChild(ATR.group('procurando as pastas…'));
				levelRows(list, state.edWalk, p.last, edEnterLevel, edEnterLevel);
				return;
			}

			// a mesma lista do projeto novo; no fim, o projeto novo com o que foi digitado (nova atração, tipo e
			// pasta, como num projeto do zero)
			state.edFirst = pickGroups(list, p.first, res, {
				attr: function (match) {
					edPick(match);
				},
				card: edPickCard,
				nova: function (nova, base) {
					if (base.pattern.indexOf('{atracao}') < 0) return edPick(Object.assign(novaAttr(base.label, base), { isNewAttr: false, isFixed: true }));
					if (aepName(nova.name)) edPick(novaAttr(aepName(nova.name), base));
				},
				tail: function () {
					list.appendChild(ATR.row(PLUS_SVG, 'começar projeto novo', typed || 'nova atração', false, function () {
						startManualNew(typed);
					}));
				}
			});
		});
		list.hidden = !open;
		$('ed-combo').classList.toggle('is-open', open);
		$('ed-combo').parentNode.classList.toggle('is-listing', open);
	}

	// um card na lista do editor: como no projeto novo, ele só aponta a atração (o filme; sem atração, o nome sugerido
	// vai para o campo e a lista mostra os tipos da atração nova). o ano da claquete vale para a pasta. o card fica
	// guardado (edCard) só para o envio ao Salvar (o designer no card, momento alterado), enquanto a atração do campo
	// for a dele; escolher o card, sem salvar, não envia nada. o Alterar nunca cadastra a atração nova do card: só
	// liga o projeto ao card (o cadastro é só ao criar o projeto)
	async function edPickCard(c, target) {
		var picked = state.edCard = { card: cardDoEnvio(c), name: target.kind === 'nova' ? target.name : '' };

		if (target.kind === 'nova') {
			$('ed-atracao').value = target.name;
			state.edPicked = '';
			state.edTyped = false;
			state.edKeep = '';
			edLookup(target.name, false);
			edFile();
			return;
		}

		var attr = target.kind === 'film' ? target.attr : await cardAttr(c, target);
		var y = target.kind === 'film' ? 0 : cardYear(c.claq);
		var keep = ATR.projectYear();

		if (!attr) return;
		if (y) ATR.setYear(y);
		attr = atYear(attr);
		ATR.setYear(keep === new Date().getFullYear() ? 0 : keep);
		picked.name = attr.name;
		edPick(attr);
	}

	// o card do envio do Alterar: o escolhido na lista, se a atração do campo ainda é a dele; senão, null
	function edCardDoEnvio(atracao) {
		var c = state.edCard;

		return c && c.card && aepName(c.name) && aepName(c.name) === aepName(atracao) ? c.card : null;
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
	// dela, se o projeto ainda não tem. com o nome do arquivo (typed), o que sobra depois da atração é o o que é.
	function edPick(match, typed) {
		if (!match) return;

		var rest = aepName(typed || '');
		var atr = aepName(match.name);

		state.edPicked = match.path || match.name;
		state.edAttr = match; // digitando a barra depois, as pastas são desta
		state.edKeep = '';
		edSetYear(match.isFilm ? match.year : '', match.name);
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
		// os avisos do envio ainda à vista: o projeto já foi salvo
		if (state.busy) return;

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
			// o nome do .aep: o de hoje fora do padrão (edKeep), o filme com o ano ou o do tipo (MOOD MENSAL: o tipo fixo
			// mantém o nome pelo padrão dele, com o mês do nome de hoje); senão, o host faz o último nível + o que é.
			// tipo e card: só para o envio ao webhook do projeto (o card escolhido na lista: o designer no card); o host
			// não grava o card no projeto (ADR 0001)
			await PAD_BRIDGE.prepararMontagem([state.edRoot || $('ed-root').value, state.edOutput]);

			var cur = await call('projectSave', { atracao: atracao, quadro: quadro, what: $('ed-what').value.trim(), designer: $('ed-user').value, root: state.edRoot || $('ed-root').value, output: state.edOutput, fileBase: state.edKeep || edYearBase() || edTypeName(), tipo: state.edAttr ? state.edAttr.tipo || '' : '', card: edCardDoEnvio(atracao) });
			// ligado a um card: o aviso ao n8n, em segundo plano (o projeto já foi salvo)
			var sending = startEnvio(cur);
			var moved = cur.moved ? 'salvo como ' + cur.fileName + '. o arquivo antigo continua em ' + cur.moved + '.' : '';

			delete cur.envio;
			state.editorKey = null;
			state.current = cur;
			renderEditor(cur);
			// salvo com outro nome ou em outro lugar: o arquivo antigo continua lá (a janela fica aberta para avisar)
			if (moved) status(moved, 'success');
			if (sending) {
				state.busy = true; // a atualização a cada 1,5 s não redesenha enquanto os avisos estão à vista
				try {
					await waitAvisos(sending, moved);
				} finally {
					state.busy = false;
				}
			}
			if (!moved) PAD_BRIDGE.closePanel();
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
		$('ed-combo').parentNode.classList.remove('is-listing');
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
		state.avisoPedido = null;
		flow.matches = [];
		flow.pick = null;
		flow.attr = null;
		flow.walk = null;
		flow.claquete = '';
		flow.what = '';
		state.novaOpen = false;
		state.novaFocus = false;
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
		$('arq-what').value = '';
		$('out-in').value = '';
		renderAttractions();
		updatePick();
		show('claquete');
		showShape();
		ensureBases();
		// o índice já carrega ao abrir a tela: a primeira tecla não espera por ele
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

		var key = cur.created ? 'c|' + cur.file : (cur.unsaved ? 'u|' + cur.atracao : 'n|' + cur.file);
		var changed = !state.current || state.currentKey !== key;

		state.current = cur;
		state.currentKey = key;
		ATR.setDesigner(cur.user || cur.defaultUser); // o {designer} dos caminhos dos tipos de projeto

		// começou o projeto novo à mão (do editor): fica no fluxo enquanto o projeto aberto for o mesmo
		if (state.manualNew) {
			if (state.manualNew === key && !changed) return;
			state.manualNew = null;
			$('claq-back').hidden = true;
			$('claq-back-space').hidden = false;
		}

		// vendo os dados do projeto: fica na tela (atualizada) enquanto o projeto aberto for o mesmo
		if (state.screen === 'dados' && !changed) return renderDados(cur);

		if (cur.created) {
			if (state.screen !== 'editor') show('editor');
			renderEditor(cur);
		} else if ((cur.file || cur.unsaved) && (changed || !state.screen || state.screen === 'editor')) {
			// salvo, mas sem os dados do padeiro (ou fora da pasta dele): direto no editor (a atração é o nome do
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
	// pending() → true enquanto a busca do campo ainda não respondeu (a lista nem abriu): o Tab espera por ela
	function comboKeys(id, listId, complete, pending) {
		$(id).addEventListener('keydown', function (e) {
			var list = $(listId);

			if (list.hidden && !(e.key === 'Tab' && !e.shiftKey && pending && pending())) return;

			// a atração já escolhida (no topo da lista das pastas) fica fora: as setas andam pelas opções (os chips
			// dos tipos da atração nova também)
			var items = Array.prototype.filter.call(list.querySelectorAll('.combo-item, .tipo-chip'), function (it) {
				return it.offsetParent !== null && !(it.classList.contains('combo-item') && it.classList.contains('is-on'));
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
				if (at >= 0) {
					items[at].scrollIntoView({ block: 'nearest' });
					clearFooter(items[at]);
				}
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

	// o rodapé fica por cima do fim da tela: o que está atrás dele (a opção marcada pelas setas, a lista que
	// acabou de abrir) sobe até aparecer
	function clearFooter(node) {
		var screen = node.closest('.wz-screen');
		var foot = screen && screen.querySelector('.wz-foot');

		if (!foot) return;

		var over = node.getBoundingClientRect().bottom + 8 - foot.getBoundingClientRect().top;
		var scroller = screen;

		while (scroller && scroller.scrollHeight <= scroller.clientHeight + 1) scroller = scroller.parentElement;
		if (over > 0 && scroller) scroller.scrollTop += over;
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
		// a fila dos avisos do Padeiro que não foram (sem rede): vai de novo ao abrir a janela, sem esperar por ela
		if (window.PAD_PROMEIRO) setTimeout(function () {
			PAD_PROMEIRO.flush();
		}, 2000);

		// setas e Tab nas listas (antes dos Enter dos campos)
		var claqComplete = function () {
			var p = claqParts();

			// digitou e deu Tab antes de a busca responder: espera a resposta (até 3 s) e completa com o que ela achar
			if (state.lookupBusy) {
				var tries = 0;
				var wait = function () {
					if (state.lookupBusy && ++tries < 75) return setTimeout(wait, 40);
					state.lookupBusy = false;
					if (!claqComplete()) $('claq').focus(); // nada para completar: o foco fica no campo
				};

				setTimeout(wait, 40);

				return true;
			}

			if (p.deep && flow.attr && flow.walk && flow.walk.shown.length) enterLevel(flow.walk.shown[0].name, true);
			else if (!p.deep && state.firstPick && !$('atr-list').hidden) state.firstPick(); // a primeira linha da lista (o card, o filme ou a atração)
			else return false;

			return true;
		};

		comboKeys('claq', 'atr-list', claqComplete, function () {
			return !!state.lookupBusy;
		});
		comboKeys('out-in', 'out-list', function () {
			if (!state.outWalk || !state.outWalk.shown.length) return false;
			outEnterLevel(state.outWalk.shown[0].name, true);

			return true;
		});
		comboKeys('ed-atracao', 'ed-atr-list', function () {
			var p = edParts();

			if (p.deep && state.edAttr && state.edWalk && state.edWalk.shown.length) edEnterLevel(state.edWalk.shown[0].name, true);
			else if (!p.deep && state.edFirst && !$('ed-atr-list').hidden) state.edFirst();
			else return false;

			return true;
		});

		// o caminho de cada linha da lista (a atração, a pasta) aparece na linha do destino, embaixo, enquanto o
		// mouse está nela: sem balão por cima das outras linhas. roda antes do tooltip.js (que escuta no document)
		$('atr-list').addEventListener('mouseover', function (e) {
			var item = e.target.closest && e.target.closest('.combo-item');

			if (!item) return;
			if (item.hasAttribute('title')) {
				item.setAttribute('data-path', item.getAttribute('title'));
				item.removeAttribute('title');
			}

			var path = item.getAttribute('data-path');

			if (path && state.hoverPath !== path) {
				state.hoverPath = path;
				hintLine($('claq-dest'), path.length > 58 ? '…' + path.slice(-57) : path); // o fim do caminho é a parte que muda
			}
		});
		$('atr-list').addEventListener('mouseleave', function () {
			if (!state.hoverPath) return;
			state.hoverPath = '';
			renderDest();
		});

		$('claq').addEventListener('input', lookup);
		// o × no fim do campo: limpa e volta para o começo (a busca e a animação das pastas)
		$('claq-clear').addEventListener('click', function () {
			var input = $('claq');

			input.value = '';
			flow.attr = null;
			lookup();
			input.focus();
		});
		$('claq-back').addEventListener('click', leaveManualNew);
		$('ed-info').addEventListener('click', openDados);
		$('pd-back').addEventListener('click', closeDados);
		$('pd-copy').addEventListener('click', copyDados);
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && state.screen === 'dados') closeDados();
		});
		onEnter('claq', claqEnter);
		// Esc com a lista aberta: recolhe, como o clique fora (o resto da tela volta)
		$('claq').addEventListener('keydown', function (e) {
			if (e.key !== 'Escape' || $('atr-list').hidden || state.claqClosed || !flow.claquete) return;
			e.preventDefault();
			e.stopPropagation();
			collapseClaq(false);
		});
		// clique fora do campo e da lista: recolhe (a lista fecha, a barra do fim sai)
		$('claq').addEventListener('blur', function () {
			setTimeout(function () {
				if ($('claq-combo').contains(document.activeElement) || state.claqClosed || !flow.claquete) return;
				collapseClaq(false);
			}, 150);
		});
		// voltando ao campo: a lista abre de novo
		$('claq').addEventListener('focus', function () {
			// vazio: só baixa os filmes recentes (eles aparecem na busca, digitando)
			if (!flow.claquete) return loadFilms();
			if (!state.claqClosed) return;

			state.claqClosed = false;
			renderAttractions();
		});

		// o que é (o nome do .aep muda enquanto digita; o de nome repetido fica marcado no JÁ NA PASTA); Enter faz o
		// que o botão do rodapé faz (criar ou abrir)
		$('arq-what').addEventListener('input', function () {
			state.openFile = ''; // digitar o o que é é criar: o projeto marcado na lista sai
			state.openAuto = false;
			flow.what = this.value;
			// só o nome do .aep muda: conta aqui, sem o host (o plano é refeito quando a pasta muda)
			if (state.plan && flow.pick) {
				localFile(state.plan);
				renderPlan(state.plan);
			}
		});
		onEnter('arq-what', function () {
			if (state.openFile) openPicked();
			else create();
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
			// a lista do output abre no fim da tela: sobe para as últimas opções (outra pasta…, sem output) aparecerem
			setTimeout(function () {
				if (!$('out-list').hidden) clearFooter($('out-list'));
			}, 380);
		});

		$('criar-go').addEventListener('click', function () {
			if (state.openFile) openPicked();
			else create();
		});
		$('claq-path').addEventListener('click', function () {
			if (this.dataset.open) call('openFolder', { path: this.dataset.open }).catch(function (err) {
				status(err.message, 'error');
			});
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
			// o projeto novo pelo menu: como o começado à mão (o refresh não volta para o editor; '‹ voltar' volta)
			if (action === 'new') startManualNew('');

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

		// o pedido da janela PROMeiro · produções (Abrir projeto): ao abrir, de tempos em tempos e ao voltar à frente
		setTimeout(function () {
			watchPedido(true);
		}, 300);
		setInterval(watchPedido, 1000);
		window.addEventListener('focus', function () {
			watchPedido();
		});
	}

	init();
})();
