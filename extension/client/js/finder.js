/*

---------------------------------------------------------------
> O ACESSORISTA — busca de caminhos de atrações e de textos dos layers
---------------------------------------------------------------

Aba CAMINHOS (principal): índice de atrações (webhook + cache, no host), busca a partir de 2
caracteres e abertura das pastas. Aba TEXTOS: lê os textos dos layers de texto do projeto
(em lotes de comps) e filtra enquanto você digita.

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/acessorista.md';

	var MIN_QUERY = 2; // mínimo de caracteres na busca de caminhos
	var MAX_TEXT_ROWS = 300; // máximo de textos exibidos
	var COMPS_PER_CHUNK = 4;
	var TAB_REQUEST_TTL = 15000; // ms: pedido de aba da barra considerado "recente" ao abrir o painel

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

	function yieldUi() {
		return new Promise(function (resolve) {
			setTimeout(resolve, 0);
		});
	}

	// Espera o navegador PINTAR (2 quadros) antes de uma chamada longa ao After Effects: sem isso o loader
	// pode nem aparecer, porque o host ocupado segura o painel. Com limite de tempo (painel oculto não pinta).
	function nextPaint() {
		return Promise.race([
			new Promise(function (resolve) {
				requestAnimationFrame(function () {
					requestAnimationFrame(resolve);
				});
			}),
			new Promise(function (resolve) {
				setTimeout(resolve, 160);
			})
		]);
	}

	function stripAccents(str) {
		return String(str).normalize('NFD').replace(/[̀-ͯ]/g, '');
	}

	// minúsculas, sem acentos e sem nada além de a-z / 0-9 (mesma regra do índice).
	function psNormalize(value) {
		return stripAccents(String(value || '').toLowerCase()).replace(/[^a-z0-9]/g, '');
	}

	// Texto para a busca de caminhos: só a-z / 0-9 sem acentos ('f'), com a marca de onde cada palavra começa
	// ('s': '1' no primeiro caractere de cada palavra) e, para o destaque, a posição de cada caractere no original.
	function wordIndex(text) {
		var f = '';
		var s = '';
		var origin = [];
		var prevWord = false;

		text = String(text || '');

		for (var i = 0; i < text.length; i++) {
			var norm = psNormalize(text.charAt(i));

			for (var k = 0; k < norm.length; k++) {
				f += norm.charAt(k);
				s += !prevWord && k === 0 ? '1' : '0';
				origin.push(i);
			}

			prevWord = norm.length > 0;
		}

		return { f: f, s: s, origin: origin };
	}

	// O termo da busca: o texto normalizado ('q') e onde ele quebra palavras ('b': '3/11' → q '311', b [1]).
	function makeQuery(text) {
		var parts = stripAccents(String(text || '').toLowerCase()).split(/[^a-z0-9]+/).filter(Boolean);
		var b = [];
		var n = 0;

		for (var i = 0; i < parts.length - 1; i++) {
			n += parts[i].length;
			b.push(n);
		}

		return { q: parts.join(''), b: b };
	}

	function asQueries(query) {
		var list = Array.isArray(query) ? query : query ? [query] : [];

		return list.map(function (x) {
			return typeof x === 'string' ? { q: x, b: [] } : x;
		});
	}

	// Onde o termo (ou o primeiro dos termos) aparece começando no início de uma palavra, com as quebras do termo
	// caindo em quebras do texto: '3/11' acha '3 11' (e não '31/10'), 'grep' acha 'G REPORTER' e 'nao' não acha
	// 'ANNA - O'. → { at, query } ou null
	function wordHit(idx, query) {
		var queries = asQueries(query);

		for (var q = 0; q < queries.length; q++) {
			var term = queries[q];

			if (!term.q) continue;

			for (var at = idx.f.indexOf(term.q); at >= 0; at = idx.f.indexOf(term.q, at + 1)) {
				if (idx.s.charAt(at) !== '1') continue;

				var ok = term.b.every(function (off) {
					return idx.s.charAt(at + off) === '1';
				});

				// passar para a palavra seguinte sem uma quebra no termo só vale depois de uma letra sozinha
				// ('grep' → 'G REPORTER', '311' → '3/11'), não depois de uma palavra ('nao' ✗ 'NA ORDEM')
				for (var p = at + 1; ok && p < at + term.q.length; p++) {
					if (idx.s.charAt(p) === '1' && term.b.indexOf(p - at) < 0 && idx.s.charAt(p - 1) !== '1') ok = false;
				}

				if (ok) return { at: at, query: term.q };
			}
		}

		return null;
	}

	// o texto contém o termo (no começo de uma palavra)? 'idx' pode ser o texto ou um wordIndex já pronto
	function hits(idx, query) {
		return !!wordHit(typeof idx === 'string' ? wordIndex(idx) : idx, query);
	}

	// Nome com o termo buscado destacado. A busca compara só a-z / 0-9 sem acentos:
	// cada caractere normalizado guarda a posição de origem para achar o trecho no texto original.
	function highlightNode(tag, className, text, query) {
		var node = el(tag, className);
		var idx = wordIndex(text);
		var hit = wordHit(idx, query);

		if (!hit) {
			node.textContent = text;
			return node;
		}

		var start = idx.origin[hit.at];
		var end = idx.origin[hit.at + hit.query.length - 1] + 1;

		node.appendChild(document.createTextNode(text.slice(0, start)));
		node.appendChild(el('mark', null, text.slice(start, end)));
		node.appendChild(document.createTextNode(text.slice(end)));

		return node;
	}

	// Copia um texto (área de transferência do painel; se falhar, pelo After Effects).
	async function copyText(text, label) {
		var area = el('textarea');
		var active = document.activeElement;
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
		if (active && active.focus) active.focus({ preventScroll: true });

		try {
			if (!copied) await call('copyText', { text: text });
			toast('success', label + ' copiado.');
		} catch (err) {
			toast('error', err.message);
		}
	}

	// //servidor/share/pasta → /Volumes/share/pasta (macOS); barras invertidas no Windows.
	function toPlatform(path, platform) {
		var p = String(path || '').replace(/\\/g, '/');

		if (platform === 'Mac') {
			if (p.indexOf('//') !== 0) return p;

			var parts = p.replace(/^\/+/, '').split('/');

			return parts.length < 2 ? p : '/Volumes/' + parts.slice(1).join('/');
		}

		return p.replace(/\//g, '\\');
	}

	function toast(kind, text) {
		PAD_UTIL.toast($('toast'), 'finder-toast', kind, text);
	}

	var store = {
		get: function (key) {
			try {
				return localStorage.getItem('acessorista.' + key);
			} catch (err) {
				return null;
			}
		},
		set: function (key, value) {
			try {
				localStorage.setItem('acessorista.' + key, value);
			} catch (err) { }
		}
	};

	/* =========================================================
	   Estado
	   ========================================================= */

	var state = {
		tab: null,
		paths: { ready: false, loading: false, loaded: false, platform: 'Mac', hidden: {}, error: '' }, // hidden: as categorias desligadas nos interruptores (webhook)
		texts: { entries: [], comps: 0, ready: false, loading: false, loaded: false, loadId: 0, hint: '' },
		lastTabStamp: 0
	};

	/* =========================================================
	   Abas
	   ========================================================= */

	function switchTab(tab) {
		if (tab !== 'paths' && tab !== 'texts') tab = 'paths';

		state.tab = tab;
		store.set('tab', tab);

		['paths', 'texts'].forEach(function (name) {
			var on = name === tab;

			$('tab-' + name).setAttribute('aria-selected', String(on));
			$('pane-' + name).hidden = !on;
		});

		var q = $('q-' + tab);

		q.focus();
		var refresh = document.querySelector('#pane-' + tab + ' .finder-refresh');

		refresh.title = tab === 'paths' ? 'Baixar os caminhos atualizados e buscar' : 'Ler os textos do projeto de novo';
		refresh.setAttribute('aria-label', refresh.title);

		// cada aba só carrega na primeira vez que aparece
		if (tab === 'paths' && !state.paths.loaded) loadPaths(false);
		if (tab === 'texts' && !state.texts.loaded) loadTexts();

		scheduleFit();
	}

	/* =========================================================
	   Resultados: estados e loader
	   ========================================================= */

	function showLoader(container, title, hint) {
		var loader = container.querySelector('.oven-loader');

		if (!loader) {
			container.textContent = '';
			loader = PAD_UTIL.ovenLoader(title, hint, true); // fundo branco: versão clara
			container.appendChild(loader);
		}

		loader.querySelector('.oven-title').textContent = title;
		loader.querySelector('.oven-hint').textContent = hint || '';
	}

	function showState(container, title, text, isHint) {
		var box = el('div', 'finder-state' + (isHint ? ' is-hint' : ''));

		box.appendChild(el('strong', null, title));
		if (text) box.appendChild(el('span', null, text));

		container.textContent = '';
		container.appendChild(box);
	}

	/* =========================================================
	   Aba CAMINHOS
	   ========================================================= */

	/* ---------------------------------------------------------------
	   busca nova (v2): o índice pronto do workflow PROMO - BUSCAR (GET), baixado pelo próprio painel (Node,
	   comprimido, em segundo plano: o After Effects não trava). a cópia salva aparece na hora e é trocada
	   quando a resposta chega com outro 'stamp'. sem a busca nova (e sem cópia), volta para o índice antigo.
	   --------------------------------------------------------------- */

	// as categorias da busca (a ordem é a dos resultados)
	var V2_CATS = [
		{ key: 'servidor', label: 'SERVIDOR', max: 10 },
		{ key: 'atracoes', label: 'ATRAÇÕES', max: 20 },
		{ key: 'filmes', label: 'FILMES', max: 20 },
		{ key: 'teams', label: 'TEAMS', max: 20 },
		{ key: 'trello', label: 'TRELLO', max: 24 }
	];
	// índice local (configuração > buscar, neste computador): as pastas deste computador e o servidor
	var LOCAL_CATS = [
		{ key: 'pastas', label: 'PASTAS', max: 30 },
		{ key: 'servidor', label: 'SERVIDOR', max: 10 }
	];
	var V2_TIMEOUT = 25000;

	function nodeApi() {
		try {
			if (typeof require !== 'function') return null;

			return { https: require('https'), http: require('http'), zlib: require('zlib'), fs: require('fs') };
		} catch (err) {
			return null;
		}
	}

	// GET com gzip (e redirecionamentos) pelo Node do painel
	function httpGet(api, url, hops) {
		return new Promise(function (resolve, reject) {
			var mod = /^https:/i.test(url) ? api.https : api.http;
			var req = mod.get(url, { headers: { 'Accept-Encoding': 'gzip', 'User-Agent': 'O PADEIRO' }, timeout: V2_TIMEOUT }, function (res) {
				if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (hops || 0) < 3) {
					res.resume();
					resolve(httpGet(api, new URL(res.headers.location, url).href, (hops || 0) + 1));
					return;
				}

				if (res.statusCode !== 200) {
					res.resume();
					reject(new Error('HTTP ' + res.statusCode));
					return;
				}

				var stream = /gzip/i.test(res.headers['content-encoding'] || '') ? res.pipe(api.zlib.createGunzip()) : res;
				var chunks = [];

				stream.on('data', function (c) {
					chunks.push(c);
				});
				stream.on('end', function () {
					resolve(Buffer.concat(chunks).toString('utf8'));
				});
				stream.on('error', reject);
			});

			req.on('timeout', function () {
				req.destroy(new Error('tempo esgotado'));
			});
			req.on('error', reject);
		});
	}

	function readCacheV2(api, file) {
		try {
			return api.fs.existsSync(file) ? api.fs.readFileSync(file, 'utf8') : '';
		} catch (err) {
			return '';
		}
	}

	function writeCacheV2(api, file, text) {
		try {
			api.fs.writeFileSync(file + '.part', text, 'utf8');
			api.fs.renameSync(file + '.part', file);
		} catch (err) { }
	}

	// texto do webhook → { stamp, cats: { teams: [...], ... } } com o texto de busca de cada item
	function parseV2(text, info) {
		var data = JSON.parse(text);

		if (!data || data.v !== 2) throw new Error('formato inesperado');

		var roots = data.roots || {};
		var full = function (path) {
			var m = /^([a-z]+):(.*)$/.exec(path || '');

			return m && roots[m[1]] ? roots[m[1]] + '/' + m[2] : path || '';
		};
		var hay = function (parts) {
			return wordIndex(parts.filter(Boolean).join(' | '));
		};
		var cats = {
			teams: (data.teams || []).map(function (t) {
				var path = full(t.path);

				return { from: t.from || '', role: t.role || '', at: t.at || '', chat: t.chat || '', msg: t.msg || '', path: path, hay: hay([t.from, path]) };
			}),
			trello: (data.trello || []).map(function (c) {
				return { claq: c.claq || '', red: c.red || '', ed: c.ed || '', card: c.card || '', hay: hay([c.claq, c.red, c.ed]) };
			}),
			atracoes: (data.atracoes || []).map(function (a) {
				return { name: a.name || '', cat: a.cat || '', pattern: a.pattern || [], proj: full(a.proj), out: full(a.out), hay: hay([a.name].concat(a.pattern || [], [full(a.proj), full(a.out)])) };
			}),
			filmes: (data.filmes || []).map(function (f) {
				return { name: f.name || '', year: f.year ? String(f.year) : '', out: full(f.out), hay: hay([f.name, f.year, full(f.out)]) };
			}),
			servidor: (info.servidor || []).map(function (s) {
				return { name: s.name, path: s.path, server: s.server, share: s.share, hay: hay([s.name, s.path]) };
			})
		};

		return { stamp: data.stamp || '', cats: cats };
	}

	function applyV2(parsed) {
		var p = state.paths;

		p.mode = 'v2';
		p.v2 = parsed;
		p.stamp = parsed.stamp;
		p.ready = true;
		p.loaded = true;
		p.cats = V2_CATS;
		buildCategoryFilters();
	}

	// → true quando a busca nova carregou (da cópia ou do webhook)
	async function loadPathsV2(force) {
		var p = state.paths;
		var info = p.info || (p.info = await call('searchInfo'));
		var api = nodeApi();
		var shown = false;

		p.platform = info.platform;

		// 1. a cópia salva aparece na hora (sem esperar a rede)
		if (api && !force) {
			try {
				var cached = readCacheV2(api, info.cache);

				if (cached) {
					applyV2(parseV2(cached, info));
					p.loading = false;
					searchPaths();
					shown = true;
				}
			} catch (err) { }
		}

		// 2. o webhook (pelo painel; se não der, pelo curl do After Effects)
		var text = '';

		try {
			if (!api) throw new Error('sem Node');
			text = await httpGet(api, info.url);
			parseV2(text, info); // confere antes de guardar
			writeCacheV2(api, info.cache, text);
		} catch (err) {
			try {
				var res = await call('searchDownload', { force: !!force });

				text = res.downloaded || !shown ? res.text : '';
			} catch (err2) {
				text = '';
			}
		}

		if (text) {
			var fresh = parseV2(text, info);

			if (!shown || fresh.stamp !== p.stamp) {
				applyV2(fresh);
				p.loading = false;
				searchPaths();
			}

			return true;
		}

		if (shown) toast(null, 'sem conexão com o workflow: usando o último índice salvo.');

		return shown;
	}

	async function loadPaths(force) {
		var p = state.paths;

		p.loading = true;
		p.error = '';

		if (!p.ready || force) {
			showLoader($('results-paths'), force ? 'baixando os caminhos…' : 'esquentando o índice…', 'o workflow pode demorar alguns segundos');
			await nextPaint();
		}

		var ok = false;

		try {
			if (!p.info || force) p.info = await call('searchInfo');
			ok = p.info.mode === 'local' ? await loadPathsLocal(force) : await loadPathsV2(force);
		} catch (err) {
			p.error = err.message;
		}

		p.loading = false;

		if (!ok) {
			p.ready = false;
			p.loaded = true;
			showState($('results-paths'), 'índice de caminhos indisponível', p.error && !/HTTP|tempo/.test(p.error) ? p.error : 'sem conexão com o workflow e sem cópia salva neste computador. clique em atualizar para tentar de novo.');
		}
	}

	// No lugar dos antigos interruptores: de onde vêm os caminhos (índice local) ou o andamento da indexação.
	function setSourceNote(text) {
		$('opts-paths').classList.add('finder-source');
		$('opts-paths').textContent = text || '';
	}

	// Webhook: um interruptor por categoria que tem itens (SERVIDOR, ATRAÇÕES, FILMES, TEAMS, TRELLO). a escolha
	// fica ao atualizar o índice. no índice local não há interruptores: no lugar, de onde vêm os caminhos.
	function buildCategoryFilters() {
		var box = $('opts-paths');
		var p = state.paths;

		box.classList.remove('finder-source');
		box.textContent = '';

		V2_CATS.forEach(function (cat) {
			if (!p.v2.cats[cat.key] || !p.v2.cats[cat.key].length) return;

			var chip = el('button', 'chip' + (p.hidden[cat.key] ? '' : ' is-on'));

			chip.type = 'button';
			chip.title = 'incluir ' + cat.label + ' na busca';
			chip.setAttribute('aria-pressed', String(!p.hidden[cat.key]));
			chip.appendChild(el('span', 'chip-check'));
			chip.appendChild(document.createTextNode(cat.label));
			chip.addEventListener('click', function () {
				p.hidden[cat.key] = !p.hidden[cat.key];
				chip.classList.toggle('is-on', !p.hidden[cat.key]);
				chip.setAttribute('aria-pressed', String(!p.hidden[cat.key]));
				searchPaths();
			});
			box.appendChild(chip);
		});

		fitFilters();
	}

	// os interruptores sempre numa linha só, já ao abrir (antes de qualquer busca): a janela alarga até caber
	// (nunca menos que a largura padrão; nunca estreita)
	function fitFilters() {
		var opts = $('opts-paths');

		if (!opts || !opts.children.length) return;

		requestAnimationFrame(function () {
			var natural = 0;

			Array.prototype.forEach.call(opts.children, function (chip) {
				natural += chip.getBoundingClientRect().width;
			});
			natural += Math.max(0, opts.children.length - 1) * parseFloat(getComputedStyle(opts).columnGap || 0);

			var width = Math.max(FIT_MIN_WIDTH, Math.ceil(window.innerWidth + Math.max(0, natural - opts.clientWidth) + 2));

			if (width > window.innerWidth + 1) PAD_BRIDGE.resizeWindow(width, window.innerHeight);
		});
	}

	/* ---------------------------------------------------------------
	   índice local: as pastas escolhidas em configuração > buscar (neste computador), lidas aqui (js/local-index.js).
	   aparece na hora a última indexação; refeita quando as pastas mudam, uma vez por dia (se ligado) ou no
	   botão atualizar.
	   --------------------------------------------------------------- */

	var LOCAL_MAX_AGE = 24 * 60 * 60 * 1000;

	function localNote(data) {
		return 'índice local · ' + data.count.toLocaleString('pt-BR') + (data.count === 1 ? ' item' : ' itens') + ' · ' + when(data.generated);
	}

	function applyLocal(data, info) {
		var p = state.paths;

		p.mode = 'local';
		p.cats = LOCAL_CATS;
		p.v2 = {
			cats: {
				pastas: data.items.map(function (it) {
					return { name: it.name, path: it.path, file: it.file, hay: wordIndex(it.name) };
				}),
				servidor: (info.servidor || []).map(function (s) {
					return { name: s.name, path: s.path, server: s.server, share: s.share, hay: wordIndex(s.name + ' | ' + s.path) };
				}),
				atracoes: []
			}
		};
		p.ready = true;
		p.loaded = true;
		setSourceNote(localNote(data));
	}

	async function loadPathsLocal(force) {
		var p = state.paths;
		var info = p.info;
		var L = window.PAD_LOCAL_INDEX;

		p.platform = info.platform;

		if (!L || !L.available()) throw new Error('o índice local precisa do painel aberto no After Effects.');
		if (!info.folders.length) throw new Error('índice local sem pastas: escolha as pastas em configuração > buscar.');

		var data = L.load(info.localIndex);
		var sameRoots = data && JSON.stringify(data.roots || []) === JSON.stringify(info.folders);
		var old = data && (Date.now() - Date.parse(data.generated) > LOCAL_MAX_AGE);

		if (data) {
			applyLocal(data, info);
			p.loading = false;
			searchPaths();
		}

		if (data && sameRoots && !force && !(info.daily && old)) return true;
		if (L.building(info.localIndex)) {
			setSourceNote('indexando em outra janela…');
			return !!data;
		}

		// indexa (em segundo plano: a busca continua com o índice anterior, se houver)
		if (!data) showLoader($('results-paths'), 'indexando as pastas…', 'a primeira vez pode levar alguns minutos');

		try {
			await L.build(info.localIndex, info.folders, {
				foldersOnly: info.foldersOnly,
				onProgress: function (count) {
					var text = 'indexando… ' + count.toLocaleString('pt-BR') + ' itens';

					setSourceNote(text);
					if (!state.paths.ready) showLoader($('results-paths'), 'indexando as pastas…', count.toLocaleString('pt-BR') + ' itens lidos');
				}
			});
		} catch (err) {
			if (!data) throw err;
			toast('error', 'não foi possível atualizar o índice local: ' + err.message);
			setSourceNote(localNote(data));
			return true;
		}

		var fresh = L.load(info.localIndex);

		if (!fresh) return !!data;

		applyLocal(fresh, info);
		p.loading = false;
		searchPaths();

		return true;
	}

	// Primeira pasta do caminho cujo nome contém o termo buscado.
	async function openPath(btn, path, group) {
		if (btn) btn.classList.add('is-busy');

		try {
			var res = await call('openPath', { path: path, server: group.server, share: group.share });

			if (res.messages && res.messages.length) toast('error', res.messages.join('\n'));
		} catch (err) {
			toast('error', err.message);
		} finally {
			if (btn) btn.classList.remove('is-busy');
		}
	}

	// Caminho em breadcrumb: cada pasta abre a si mesma; a que contém o termo buscado fica destacada.
	function pathCrumbs(display, query, group) {
		var nav = el('nav', 'path-crumbs');
		var unc = /^[\\/]{2}/.test(display);
		var sep = state.paths.platform === 'Mac' ? '/' : '\\';
		var prefix = state.paths.platform === 'Mac' ? '/' : unc ? '\\\\' : '';
		var parts = display.split(/[\\/]+/).filter(Boolean);

		nav.dataset.copy = display;
		nav.title = display + '\n\n' + (PAD_KEYS.mac ? 'Cmd' : 'Ctrl') + '+C copia o caminho';
		nav.appendChild(el('span', 'crumb-more', '…'));

		parts.forEach(function (name, i) {
			var target = prefix + parts.slice(0, i + 1).join(sep);
			var crumb = el('button', 'crumb' + (i === parts.length - 1 ? ' is-last' : '') + (hits(name, query) ? ' is-match' : ''), name);

			crumb.type = 'button';
			crumb.title = 'abrir ' + target;
			crumb.addEventListener('click', function () {
				openPath(null, target, group);
			});

			if (i > 0) nav.appendChild(el('span', 'crumb-sep', '›'));
			nav.appendChild(crumb);
		});

		return nav;
	}

	// Mostra todas as pastas (para medir a largura natural) ou esconde as iniciais até caber; a última
	// e a que deu match têm prioridade e só saem por último.
	function crumbsExpand(root) {
		Array.prototype.forEach.call(root.querySelectorAll('.path-crumbs'), function (nav) {
			nav.classList.remove('is-collapsed');
			Array.prototype.forEach.call(nav.children, function (child) {
				child.hidden = child.classList.contains('crumb-more');
			});
		});
	}

	function crumbsCollapse(root) {
		crumbsExpand(root);

		Array.prototype.forEach.call(root.querySelectorAll('.path-crumbs'), function (nav) {
			var crumbs = Array.prototype.filter.call(nav.children, function (c) {
				return c.classList.contains('crumb');
			});
			var order = crumbs.slice(0, -1).filter(function (c) {
				return !c.classList.contains('is-match');
			}).concat(crumbs.slice(0, -1).filter(function (c) {
				return c.classList.contains('is-match');
			}));

			nav.classList.add('is-measuring');

			for (var h = 0; nav.scrollWidth > nav.clientWidth && h < order.length; h++) {
				order[h].hidden = true;

				// o separador que vem antes da pasta (ou depois, na primeira)
				var sepNode = order[h].previousSibling && order[h].previousSibling.classList.contains('crumb-sep') ? order[h].previousSibling : order[h].nextSibling;

				if (sepNode && sepNode.classList.contains('crumb-sep')) sepNode.hidden = true;
				nav.querySelector('.crumb-more').hidden = false;
			}

			nav.classList.remove('is-measuring');
		});
	}

	function searchPaths() {
		var results = $('results-paths');

		if (state.paths.loading && !state.paths.ready) return;
		if (!state.paths.ready) {
			if (!results.querySelector('.finder-state')) showState(results, 'índice de caminhos indisponível', 'clique em atualizar para tentar de novo.');
			return;
		}

		searchPathsV2();
	}

	/* ---------------------------------------------------------------
	   busca nova: o layout de cada categoria (sem títulos: o ícone diz de onde vem)
	   --------------------------------------------------------------- */

	var V2_ICONS = {
		teams: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 5h13A2.5 2.5 0 0 1 21 7.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3.5V17h-1A2.5 2.5 0 0 1 3 14.5v-7A2.5 2.5 0 0 1 5.5 5z" /></svg>',
		trello: '<svg viewBox="0 0 24 24" aria-hidden="true" class="tr-logo"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" /><rect class="tr-bar" x="7" y="7" width="4" height="9.5" rx="1" /><rect class="tr-bar" x="13" y="7" width="4" height="5.5" rx="1" /></svg>',
		redator: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>',
		editor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6.5H7.5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2M14.5 6.5h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2" /><path d="M12 4.5v15" /></svg>',
		atracoes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8.5 3.5 3.5 4 3.5-4" /><rect x="3" y="7.5" width="18" height="13" rx="2.5" /><rect x="5.5" y="10" width="10.5" height="8" rx="2" /><path d="M18.5 11.5h.01M18.5 15h.01" /></svg>',
		filmes: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M7.500 5v14M16.500 5v14" /><path class="film-holes" d="M5.500 6v12M18.500 6v12" /></svg>',
		servidor: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4.5" width="16" height="6" rx="1.5" /><rect x="4" y="13.5" width="16" height="6" rx="1.5" /><path d="M7.5 7.5h.01M7.5 16.5h.01" /></svg>',
		pasta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></svg>',
		arquivo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><path d="M13.5 3.5V8H18" /></svg>'
	};
	var NO_GROUP = { server: '', share: '' };

	function svgNode(markup) {
		var box = document.createElement('span');

		box.innerHTML = markup;

		return box.firstChild;
	}

	var when = PAD_UTIL.when; // hoje 14:32 · ontem 09:10 · terça 16:20 · 28/10 14:32 (js/util.js)

	// o mesmo formato do "copiar link" do Teams: o id do chat como vem (19:…@thread.v2), o da mensagem e o contexto
	function teamsLink(m) {
		if (!m.chat || !m.msg) return '';

		var chat = /^[\w:@.\-]+$/.test(m.chat) ? m.chat : encodeURIComponent(m.chat);

		return 'https://teams.microsoft.com/l/message/' + chat + '/' + encodeURIComponent(m.msg) + '?context=' + encodeURIComponent('{"contextType":"chat"}');
	}

	// Teams: o balão (abre a mensagem), quem mandou - cargo, a data; embaixo, o caminho
	function teamsItem(m, query) {
		var card = el('article', 'result-card tm-card');
		var who = el('div', 'tm-who');
		var link = teamsLink(m);
		var bubble = el(link ? 'button' : 'span', 'tm-msg');

		bubble.innerHTML = V2_ICONS.teams;

		if (link) {
			bubble.type = 'button';
			bubble.title = 'abrir a mensagem no Teams';
			bubble.setAttribute('aria-label', bubble.title);
			bubble.addEventListener('click', function () {
				PAD_BRIDGE.openUrl(link);
			});
		}

		who.appendChild(bubble);
		who.appendChild(highlightNode('b', null, m.from || 'mensagem', query));
		if (m.role) who.appendChild(el('span', 'tm-role', '- ' + m.role));
		if (m.at) who.appendChild(el('time', null, when(m.at)));
		card.appendChild(who);
		card.appendChild(pathCrumbs(toPlatform(m.path, state.paths.platform), query, NO_GROUP));

		return card;
	}

	// Trello: o card (abre no Trello) com a claquete, o redator e o editor
	function trelloItem(c, query) {
		var card = el(c.card ? 'button' : 'div', 'tr-card');
		var head = el('b', 'tr-claq');

		if (c.card) {
			card.type = 'button';
			card.title = 'abrir o card no Trello';
			card.addEventListener('click', function () {
				PAD_BRIDGE.openUrl('https://trello.com/c/' + encodeURIComponent(c.card));
			});
		}

		head.appendChild(svgNode(V2_ICONS.trello));
		head.appendChild(highlightNode('i', null, c.claq, query));
		card.appendChild(head);

		[['redator', 'REDATOR', c.red], ['editor', 'EDITOR', c.ed]].forEach(function (row) {
			if (!row[2]) return;

			var line = el('span', 'tr-row');

			line.appendChild(svgNode(V2_ICONS[row[0]]));
			line.appendChild(el('em', null, row[1]));
			line.appendChild(highlightNode('i', null, row[2], query));
			card.appendChild(line);
		});

		return card;
	}

	// Atrações, filmes e servidor: o ícone e o nome; embaixo, uma linha por caminho (PROJETO, OUTPUT, CAMINHO)
	function placeItem(icon, name, lines, query, group, year) {
		var card = el('article', 'at-card');
		var head = el('div', 'at-head');

		head.appendChild(svgNode(icon));
		head.appendChild(highlightNode('b', null, name, query));
		if (year) head.appendChild(el('span', 'at-year', '(' + year + ')')); // filmes: o ano de produção
		card.appendChild(head);

		lines.forEach(function (line) {
			if (!line[1]) return;

			var row = el('div', 'at-line');

			row.appendChild(el('em', null, line[0]));
			row.appendChild(pathCrumbs(toPlatform(line[1], state.paths.platform), query, group || NO_GROUP));
			card.appendChild(row);
		});

		return card;
	}

	// O termo é o começo do nome ou de um pattern de uma atração ("grep", "g rep" → G REPORTER)? Então a busca
	// também procura os outros nomes dela (GLOBO REPORTER, G REPORTER): as mensagens, os cards e as pastas vêm junto.
	var EXPAND_MIN = 3;

	function expandQuery(typed) {
		var list = [typed];
		var also = [];

		if (typed.q.length < EXPAND_MIN) return { list: list, also: also };

		(state.paths.v2.cats.atracoes || []).forEach(function (a) {
			var terms = [a.name].concat(a.pattern).map(makeQuery).filter(function (t) {
				return t.q.length >= EXPAND_MIN;
			});
			var hit = terms.some(function (t) {
				return t.q.indexOf(typed.q) === 0;
			});

			if (!hit) return;

			terms.forEach(function (t) {
				var known = list.some(function (x) {
					return x.q === t.q;
				});

				if (!known) list.push(t);
			});
			if (makeQuery(a.name).q.indexOf(typed.q) !== 0) also.push(a.name);
		});

		return { list: list, also: also };
	}

	// Trello em colunas: quantas couberem (210 px no mínimo), cada card na coluna mais curta, na ordem da lista
	// (o mais novo em cima, à esquerda). refeito quando a janela muda de largura.
	var TR_COL_MIN = 210;
	var TR_GAP = 10;

	function layoutTrello(grid) {
		var cards = grid._cards || [];
		var n = Math.max(1, Math.min(cards.length, Math.floor((grid.clientWidth + TR_GAP) / (TR_COL_MIN + TR_GAP))));

		if (grid._cols === n && grid.children.length) return;

		grid._cols = n;
		grid.textContent = '';

		var cols = [];

		for (var c = 0; c < n; c++) cols.push(grid.appendChild(el('div', 'tr-col')));

		cards.forEach(function (card) {
			var shortest = cols[0];

			cols.forEach(function (col) {
				if (col.offsetHeight < shortest.offsetHeight) shortest = col;
			});
			shortest.appendChild(card);
		});
	}

	function relayoutTrello() {
		Array.prototype.forEach.call(document.querySelectorAll('#results-paths .tr-grid'), layoutTrello);
	}

	function searchPathsV2() {
		var p = state.paths;
		var results = $('results-paths');
		var typed = makeQuery($('q-paths').value);

		results.textContent = '';

		if (typed.q.length < MIN_QUERY) {
			showState(results, 'busca de caminhos', 'digite uma atração, claquete, pessoa, output ou caminho', true);
			return;
		}

		var expanded = expandQuery(typed);
		var query = expanded.list;
		var any = false;

		// buscando também pelos nomes da atração: avisa em cima (para não parecer resultado errado)
		if (expanded.also.length) results.appendChild(el('p', 'finder-also', 'também: ' + expanded.also.slice(0, 3).join(' · ')));

		(p.cats || V2_CATS).forEach(function (cat) {
			if (p.mode === 'v2' && p.hidden[cat.key]) return; // desligada no interruptor

			var matches = p.v2.cats[cat.key].filter(function (item) {
				return hits(item.hay, query);
			});

			if (!matches.length) return;

			any = true;

			var box = el('section', 'result-section v2-' + cat.key);
			var list = el('div', cat.key === 'trello' ? 'tr-grid' : cat.key === 'teams' ? 'tm-list' : 'at-list');

			if (cat.key === 'trello') list._cards = [];

			matches.slice(0, cat.max).forEach(function (item) {
				if (cat.key === 'teams') list.appendChild(teamsItem(item, query));
				else if (cat.key === 'trello') list._cards.push(trelloItem(item, query));
				else if (cat.key === 'atracoes') list.appendChild(placeItem(V2_ICONS.atracoes, item.name, [['PROJETO', item.proj], ['OUTPUT', item.out]], query));
				else if (cat.key === 'filmes') list.appendChild(placeItem(V2_ICONS.filmes, item.name, [['OUTPUT', item.out]], query, null, item.year));
				else if (cat.key === 'pastas') list.appendChild(placeItem(item.file ? V2_ICONS.arquivo : V2_ICONS.pasta, item.name, [['CAMINHO', item.file ? item.path.replace(/\/[^\/]+$/, '') : item.path]], query));
				else list.appendChild(placeItem(V2_ICONS.servidor, item.name, [['CAMINHO', item.path]], query, item));
			});

			box.appendChild(list);
			results.appendChild(box);
			if (cat.key === 'trello') layoutTrello(list); // já na página: dá para medir as colunas
			if (matches.length > cat.max) box.appendChild(el('p', 'finder-more', 'mais ' + (matches.length - cat.max) + ' em ' + cat.label + ' — refine a busca'));
		});

		var off = p.mode === 'v2' && Object.keys(p.hidden).some(function (k) {
			return p.hidden[k];
		});

		if (!any) showState(results, 'nenhum resultado', 'nada tem “' + $('q-paths').value.trim() + '”: tente outro termo' + (off ? ' ou ligue mais categorias' : ''));
	}


	/* =========================================================
	   Aba TEXTOS
	   ========================================================= */

	async function loadTexts() {
		var t = state.texts;
		var id = ++t.loadId;
		var results = $('results-texts');

		t.loading = true;
		t.ready = false;
		t.loaded = true;
		t.entries = [];
		showLoader(results, 'assando os textos…', 'listando as comps do projeto');
		await nextPaint();

		try {
			var comps = (await call('textCompList')).comps;

			t.comps = comps.length;

			if (!comps.length) {
				t.ready = true;
				t.loading = false;
				showState(results, 'projeto sem comps', 'abra um projeto com layers de texto', true);
				return;
			}

			var errors = [];

			for (var i = 0; i < comps.length; i += COMPS_PER_CHUNK) {
				if (id !== t.loadId) return; // uma nova leitura começou

				var ids = comps.slice(i, i + COMPS_PER_CHUNK).map(function (c) {
					return c.id;
				});
				var res = await call('textIndexChunk', { ids: ids });

				t.entries = t.entries.concat(res.entries);
				errors = errors.concat(res.errors);
				showLoader(results, 'assando os textos…', Math.min(i + COMPS_PER_CHUNK, comps.length) + ' / ' + comps.length + ' comps lidas');
				await yieldUi();
			}

			if (errors.length) toast('error', errors.slice(0, 3).join('\n'));

			t.ready = true;
		} catch (err) {
			if (id !== t.loadId) return;

			t.ready = false;
			showState(results, 'não foi possível ler o projeto', err.message);
			t.loading = false;
			return;
		}

		t.loading = false;
		searchTexts();
	}

	function textOptions() {
		return {
			visible: $('chip-vis').classList.contains('is-on'),
			ignoreAccents: $('chip-accent').classList.contains('is-on'),
			invert: $('chip-invert').classList.contains('is-on')
		};
	}

	// A busca é literal e ignora a caixa; a acentuação é ignorada conforme a opção.
	function normalizeText(str, opts) {
		var s = String(str).toLowerCase();

		return opts.ignoreAccents ? stripAccents(s) : s;
	}

	function textNode(text) {
		return document.createTextNode(text);
	}

	// Trecho do texto (em uma linha) em volta do termo, com o termo destacado.
	function snippetNode(text, key, opts, highlight) {
		var span = el('span', 'text-snippet');
		var flat = String(text).replace(/\s*[\n\r]+\s*/g, ' ⏎ ');
		var hay = normalizeText(flat, opts);
		var at = highlight && hay.length === flat.length ? hay.indexOf(key) : -1;

		if (at < 0) {
			span.textContent = flat.length > 140 ? flat.slice(0, 137) + '…' : flat;
			return span;
		}

		var start = Math.max(0, at - 36);
		var end = Math.min(flat.length, at + key.length + 80);

		if (start > 0) span.appendChild(textNode('…'));
		span.appendChild(textNode(flat.slice(start, at)));
		span.appendChild(el('mark', null, flat.slice(at, at + key.length)));
		span.appendChild(textNode(flat.slice(at + key.length, end)));
		if (end < flat.length) span.appendChild(textNode('…'));

		return span;
	}

	async function openText(entry, withLayer) {
		try {
			await call('openTextResult', {
				compId: entry.compId,
				layerIndex: withLayer ? entry.layerIndex : 0,
				refTime: entry.refTime
			});
		} catch (err) {
			toast('error', err.message);
		}
	}

	// película antes do nome da comp: no hover, as perfurações correm um quadro (CSS em finder.css)
	var COMP_ICON = '<svg class="comp-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M7.500 5v14M16.500 5v14" /><path class="film-holes" d="M5.500 6v12M18.500 6v12" /></svg>';

	function searchTexts() {
		var t = state.texts;
		var results = $('results-texts');
		var opts = textOptions();
		var raw = $('q-texts').value;
		var key = normalizeText(raw, opts);

		if (t.loading) return;

		results.textContent = '';

		if (!t.ready) {
			showState(results, 'textos não lidos', 'clique em atualizar para ler o projeto.', true);
			return;
		}

		if (raw === '') {
			showState(results, 'busca nos textos', 'digite um termo para achar os layers de texto do projeto', true);
			return;
		}

		if (t.comps === 0) {
			showState(results, 'projeto sem comps', 'abra um projeto com layers de texto', true);
			return;
		}

		var found = t.entries.filter(function (entry) {
			if (opts.visible && !entry.enabled) return false;

			return (normalizeText(entry.text, opts).indexOf(key) >= 0) !== opts.invert;
		});

		if (!found.length) {
			showState(results, 'nenhum resultado', (opts.invert ? 'todos os textos têm “' : 'nenhum texto tem “') + raw.trim() + '”: tente outro termo');
			return;
		}

		var rows = 0;
		var current = null;
		var group = null;

		for (var i = 0; i < found.length && rows < MAX_TEXT_ROWS; i++, rows++) {
			var entry = found[i];

			// as entradas da mesma comp são consecutivas (o índice é lido comp a comp)
			if (entry.compId !== current) {
				current = entry.compId;
				group = el('section', 'comp-group');

				var title = el('button', 'comp-title');

				title.type = 'button';
				title.title = 'abrir a comp';
				title.insertAdjacentHTML('beforeend', COMP_ICON);
				title.appendChild(el('span', 'comp-name', entry.compName));
				title.addEventListener('click', openText.bind(null, entry, false));
				group.appendChild(title);
				results.appendChild(group);
			}

			var row = el('button', 'text-row' + (entry.enabled ? '' : ' is-off'));

			row.type = 'button';
			row.title = entry.text + '\n\n' + (PAD_KEYS.mac ? 'Cmd' : 'Ctrl') + '+C copia o texto';
			row.dataset.copy = entry.text;
			row.appendChild(el('span', 'text-layer', entry.label));
			row.appendChild(snippetNode(entry.text, key, opts, !opts.invert));
			row.addEventListener('click', openText.bind(null, entry, true));
			group.appendChild(row);
		}

		if (found.length > rows) results.appendChild(el('p', 'finder-more', 'mais ' + (found.length - rows) + ' — refine a busca'));
	}

	/* =========================================================
	   Pedido de aba (barra principal)
	   ========================================================= */

	// a busca de caminhos mudou na configuração (webhook ↔ índice local, outro endereço, outras pastas) com esta
	// janela aberta? ao voltar para ela, recarrega da fonte nova (antes ficava na antiga até clicar em atualizar)
	function searchSignature(info) {
		return info ? [info.mode, info.url, (info.folders || []).join('|'), info.foldersOnly, JSON.stringify(info.servidor || [])].join('\n') : '';
	}

	async function watchSearchSource() {
		var p = state.paths;

		if (document.hidden || !p.info || p.loading) return;

		try {
			var info = await call('searchInfo');

			if (searchSignature(info) === searchSignature(p.info)) return;

			p.info = info;
			p.ready = false;
			await loadPaths(false);
			if (p.ready) searchPaths();
		} catch (err) { }
	}

	async function watchRequestedTab() {
		if (document.hidden) return;

		try {
			var req = await call('requestedTab');

			if (!req.stamp || req.stamp <= state.lastTabStamp) return;

			state.lastTabStamp = req.stamp;

			if (req.tab && req.tab !== state.tab) switchTab(req.tab);
		} catch (err) { }
	}

	/* =========================================================
	   Eventos e início
	   ========================================================= */

	function bindSearch(tab, onChange) {
		var q = $('q-' + tab);
		var clear = $('clear-' + tab);

		q.addEventListener('input', function () {
			clear.hidden = q.value === '';
			onChange();
		});

		q.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && q.value) {
				q.value = '';
				q.dispatchEvent(new Event('input'));
			}
		});

		clear.addEventListener('click', function () {
			q.value = '';
			q.dispatchEvent(new Event('input'));
			q.focus();
		});
	}

	function bindEvents() {
		['paths', 'texts'].forEach(function (tab) {
			$('tab-' + tab).addEventListener('click', function () {
				switchTab(tab);
			});
		});

		bindSearch('paths', searchPaths);
		bindSearch('texts', searchTexts);

		['chip-vis', 'chip-accent', 'chip-invert'].forEach(function (id) {
			$(id).addEventListener('click', function () {
				var chip = $(id);
				var on = !chip.classList.contains('is-on');

				chip.classList.toggle('is-on', on);
				chip.setAttribute('aria-pressed', String(on));
				searchTexts();
			});
		});

		Array.prototype.forEach.call(document.querySelectorAll('.finder-refresh'), function (btn) {
			btn.addEventListener('click', function () {
				if (state.tab === 'paths') loadPaths(true);
				else loadTexts();
			});
		});

		// Enter na busca de textos lê o projeto de novo se ainda não houver índice
		$('q-texts').addEventListener('keydown', function (e) {
			if (e.key === 'Enter' && !state.texts.ready && !state.texts.loading) loadTexts();
		});

		// teclado: ↑ ↓ nos resultados, Enter abre, Ctrl/Cmd+C copia, Esc volta para a busca
		['paths', 'texts'].forEach(function (tab) {
			var results = $('results-' + tab);
			var q = $('q-' + tab);

			PAD_KEYS.listNav({
				root: results,
				items: '.tm-msg, .tr-card, .crumb.is-last, .comp-title, .text-row',
				search: q,
				typeToSearch: true
			});

			results.addEventListener('keydown', function (e) {
				var target = e.target.closest('[data-copy]');

				if (e.key === 'Escape') {
					e.preventDefault();
					q.focus();
				} else if (target && PAD_KEYS.isMod(e) && e.key.toLowerCase() === 'c') {
					e.preventDefault();
					copyText(target.dataset.copy, target.classList.contains('text-row') ? 'texto' : 'caminho');
				}
			});
		});

		PAD_KEYS.listNav({ root: $('tabs'), items: '.tab', horizontal: true });

		PAD_KEYS.shortcuts({
			find: function () {
				PAD_KEYS.focusSearch($('q-' + state.tab));
			}
		});

		// menu "⋯" (um por aba)
		Array.prototype.forEach.call(document.querySelectorAll('.finder-menu'), function (menu) {
			menu.addEventListener('click', function (e) {
				var btn = e.target.closest('button[data-action]');

				if (!btn) return;

				menu.removeAttribute('open');

				if (btn.dataset.action === 'docs') PAD_BRIDGE.openUrl(DOCS_URL);
				if (btn.dataset.action === 'reload') location.reload();
			});

			document.addEventListener('click', function (e) {
				if (!menu.contains(e.target)) menu.removeAttribute('open');
			});
		});
		window.addEventListener('focus', watchRequestedTab);
		window.addEventListener('focus', watchSearchSource);
	}

	/* =========================================================
	   Altura da janela: só o suficiente para o loader e, com uma
	   busca, a altura que cabe os resultados (até um limite)
	   ========================================================= */

	var FIT_MIN_WIDTH = 720;
	var FIT_WIDE_ITEMS = '.path-crumbs, .result-name, .comp-name';
	var fitMinHeight = 150; // só o cabeçalho (busca vazia)
	var fitTimer = null;
	var refitOnResize = false;

	window.addEventListener('resize', function () {
		relayoutTrello();
		crumbsCollapse($('results-paths'));

		if (!refitOnResize) return;

		refitOnResize = false;
		scheduleFit();
	});

	function fitHeight(skipWidth) {
		var results = $('results-' + state.tab);

		if (!results || !results.children.length) return;

		// primeiro a largura (a janela só alarga, nunca estreita): os toggles numa linha só e os
		// caminhos e nomes sem reticências, até 70% da largura da tela
		crumbsExpand(results); // mede os caminhos inteiros

		var opts = $('opts-' + state.tab);
		var chips = opts.children;
		var natural = 0;

		for (var c = 0; c < chips.length; c++) natural += chips[c].getBoundingClientRect().width;

		natural += Math.max(0, chips.length - 1) * parseFloat(getComputedStyle(opts).columnGap || 0);

		var extra = Math.max(0, natural - opts.clientWidth);

		Array.prototype.forEach.call(results.querySelectorAll(FIT_WIDE_ITEMS), function (item) {
			extra = Math.max(extra, item.scrollWidth - item.clientWidth);
		});

		var maxWidth = Math.max(FIT_MIN_WIDTH, Math.round((window.screen.availWidth || 1440) * 0.7));
		var width = Math.min(maxWidth, Math.max(FIT_MIN_WIDTH, window.innerWidth + Math.ceil(extra) + (extra ? 2 : 0)));

		if (!skipWidth && width > window.innerWidth + 1) {
			// a altura é medida de novo quando a janela terminar de alargar (o cabeçalho pode perder uma linha)
			refitOnResize = true;
			PAD_BRIDGE.resizeWindow(width, window.innerHeight);

			// se o evento de resize não vier (pedido ignorado ou limitado pelo manifest), mede a altura assim mesmo
			clearTimeout(fitTimer);
			fitTimer = setTimeout(function () {
				refitOnResize = false;
				fitHeight(true);
			}, 1500);
			return;
		}

		crumbsCollapse(results); // na largura final, as pastas iniciais que não cabem saem

		// altura natural do conteúdo (a lista ocupa o espaço que sobra, então mede pelo último filho)
		var top = results.getBoundingClientRect().top;
		var bottom = top;

		Array.prototype.forEach.call(results.children, function (child) {
			bottom = Math.max(bottom, child.getBoundingClientRect().bottom);
		});

		var content = bottom - top + results.scrollTop + parseFloat(getComputedStyle(results).paddingBottom);
		var max = Math.max(600, Math.round((window.screen.availHeight || 900) * 0.85));
		var height = Math.round(Math.min(max, Math.max(fitMinHeight, window.innerHeight - results.clientHeight + content)));


		if (Math.abs(height - window.innerHeight) > 4) PAD_BRIDGE.resizeWindow(window.innerWidth, height);
	}

	// Sem busca, a folha branca sai: só o cabeçalho (loader e avisos aparecem sobre o degradê).
	function updateIdle() {
		['paths', 'texts'].forEach(function (tab) {
			var q = $('q-' + tab).value.trim();

			$('pane-' + tab).classList.toggle('is-idle', q.length < (tab === 'paths' ? MIN_QUERY : 1));
		});
	}

	function scheduleFit() {
		clearTimeout(fitTimer);
		fitTimer = setTimeout(fitHeight, 120);
	}

	async function init() {
		['paths', 'texts'].forEach(function (tab) {
			new MutationObserver(function () {
				updateIdle();
				scheduleFit();
			}).observe($('results-' + tab), { childList: true });
			$('q-' + tab).addEventListener('input', updateIdle);
		});
		updateIdle(); // o loader inicial já vem no HTML

		bindEvents();

		var tab = 'paths'; // aba principal

		try {
			await call('ping');

			// a barra pode ter pedido uma aba há pouco (o painel estava fechado)
			var req = await call('requestedTab');

			state.lastTabStamp = req.stamp || 0;

			if (req.stamp && req.now - req.stamp < TAB_REQUEST_TTL && req.tab) tab = req.tab;
		} catch (err) {
			showState($('results-paths'), 'sem conexão com o After Effects', err.message);
		}

		switchTab(tab);

		setInterval(watchRequestedTab, 1000);
	}

	init();
})();
