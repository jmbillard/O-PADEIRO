/*

---------------------------------------------------------------
> ATRAÇÕES — a busca e a atração nova (janela PROJETO e criador de templates)
---------------------------------------------------------------

A busca das atrações (o índice do webhook, a mesma cópia do acessorista, ou o índice local da configuração >
buscar), as categorias da aba PROJETO (para uma atração nova) e o seletor: o campo, os cartões das atrações
achadas e a "nova atração" (nome + categoria), abrindo embaixo. → window.PAD_ATTRACTIONS

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	// nome de arquivo: sem acentos e símbolos, em maiúsculas (o mesmo do host)
	function aepName(text) {
		return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
	}

	/* ---------------------------------------------------------------
	   a claquete → a atração, procurada aqui mesmo, na memória (rápido a cada tecla): as atrações do índice da
	   busca (webhook, a mesma cópia do acessorista) ou, no índice local (configuração > buscar), as pastas.
	   - completa: o nome (ou um pattern) é o começo da claquete ('MAIS VOCE' para 'MAIS VOCE 30 10');
	   - parcial: o começo da claquete é o começo do nome ('la na minha' → 'Lá na Minha Terra', 'GREP 6 11' →
	     'G REPORTER'), a partir de 3 letras.
	   a completa vem primeiro (a mais específica antes); sem o painel no AE (navegador de teste), pergunta ao host.
	   --------------------------------------------------------------- */

	var source = { info: null, list: null, stamp: '', refreshing: null };
	var INDEX_MAX_AGE = 10 * 60 * 1000; // a cópia do índice do webhook: baixada de novo se tiver mais de 10 min

	function nodeFs() {
		try {
			return typeof require === 'function' ? require('fs') : null;
		} catch (err) {
			return null;
		}
	}

	// baixa o índice do webhook pelo Node do painel (sem travar o After Effects) e troca a cópia. um download por vez.
	function refreshIndex(fs) {
		if (source.refreshing) return source.refreshing;

		var url = source.info.url;
		var file = source.info.cache;

		source.refreshing = new Promise(function (resolve, reject) {
			var https = require(/^https:/i.test(url) ? 'https' : 'http');
			var zlib = require('zlib');
			var req = https.get(url, { headers: { 'Accept-Encoding': 'gzip', 'User-Agent': 'O PADEIRO' }, timeout: 25000 }, function (res) {
				if (res.statusCode !== 200) {
					res.resume();
					reject(new Error('HTTP ' + res.statusCode));
					return;
				}

				var stream = /gzip/i.test(res.headers['content-encoding'] || '') ? res.pipe(zlib.createGunzip()) : res;
				var chunks = [];

				stream.on('data', function (c) {
					chunks.push(c);
				});
				stream.on('error', reject);
				stream.on('end', function () {
					try {
						var text = Buffer.concat(chunks).toString('utf8');

						JSON.parse(text); // confere antes de trocar a cópia
						fs.writeFileSync(file + '.part', text, 'utf8');
						fs.renameSync(file + '.part', file);
						resolve();
					} catch (err) {
						reject(err);
					}
				});
			});

			req.on('timeout', function () {
				req.destroy(new Error('tempo esgotado'));
			});
			req.on('error', reject);
		}).finally(function () {
			source.refreshing = null;
		});

		return source.refreshing;
	}

	function keyOf(text) {
		return aepName(text).replace(/\s+/g, '');
	}

	// caminho para mostrar: no Mac, o de rede (//servidor/share/...) vira /Volumes/share/...
	function displayPath(path) {
		var p = String(path || '').replace(/\\/g, '/');

		if (source.info && source.info.platform === 'Mac' && /^\/\/[^\/]+\/./.test(p)) return '/Volumes/' + p.replace(/^\/\/[^\/]+\//, '');
		if (source.info && source.info.platform !== 'Mac') return p.replace(/\//g, '\\');

		return p;
	}

	// o texto em palavras (sem acentos, maiúsculas): 'f' tudo junto e 's' marcando onde começa cada palavra
	function wordKey(text) {
		var f = '';
		var st = '';

		aepName(text).split(' ').filter(Boolean).forEach(function (w) {
			f += w;
			st += '1' + new Array(w.length).join('0');
		});

		return { f: f, s: st };
	}

	// A claquete (palavras) começa com este nome? → pontos (0: não)
	//   completa (o nome inteiro abre a claquete): 1000 + tamanho ('MAIS VOCE 30 10' → MAIS VOCE)
	//   parcial (o começo do nome), palavra a palavra: cada palavra digitada é uma palavra do nome, na ordem;
	//   só a última pode estar pela metade (ainda digitando) ou a que vem antes de um número ('GREP 6 11' →
	//   G REPORTER). 'a nobre dama' não acha 'A NOBREZA DO AMOR'. uma letra sozinha no nome (o G de G REPORTER)
	//   pode emendar com a palavra seguinte.
	function scoreKey(key, words) {
		var isNum = function (w) {
			return /^[0-9]/.test(w || '');
		};

		for (var kk = words.length; kk >= 1; kk--) {
			var seg = words.slice(0, kk);
			var q = seg.join('');

			if (key.f.indexOf(q) !== 0) continue;

			var bounds = {};
			var off = 0;
			var ok = true;

			for (var j = 0; j < kk - 1; j++) {
				off += seg[j].length;
				bounds[off] = true;
				if (key.s.charAt(off) !== '1') ok = false;
			}

			for (var p = 1; ok && p < q.length; p++) {
				if (key.s.charAt(p) === '1' && !bounds[p] && key.s.charAt(p - 1) !== '1') ok = false;
			}

			if (!ok) continue;
			if (q.length === key.f.length) return 1000 + q.length;
			if (q.length >= 3 && (kk === words.length || isNum(words[kk]))) return q.length;
		}

		return 0;
	}

	// as pastas do índice local
	function localCandidates() {
		var L = window.PAD_LOCAL_INDEX;
		var info = L.info(source.info.localIndex);

		if (!info.exists) return [];
		if (source.list && source.stamp === 'local|' + info.generated) return source.list;

		var data = L.load(source.info.localIndex);

		source.stamp = 'local|' + info.generated;
		source.list = (data ? data.items : []).filter(function (it) {
			return !it.file;
		}).map(function (it) {
			return { name: it.name, path: it.path, depth: it.depth, keys: [wordKey(it.name)] };
		}).filter(function (it) {
			return it.keys[0].f.length >= 2;
		});

		return source.list;
	}

	// as atrações do índice do webhook (a cópia do acessorista). a cópia que existir vale na hora; velha, uma nova
	// é baixada em segundo plano pelo Node do painel (o curl do host trava o After Effects e a digitação). só sem
	// cópia nenhuma o host baixa (plano B).
	async function webhookCandidates(fs) {
		var file = source.info.cache;
		var stat = null;

		try {
			stat = fs.statSync(file);
		} catch (err) { }

		var text = '';

		if (!stat) {
			try {
				await refreshIndex(fs);
				stat = fs.statSync(file);
			} catch (err) {
				try {
					text = (await call('searchDownload', {})).text;
					stat = fs.statSync(file);
				} catch (err2) { }
			}
		} else if (Date.now() - stat.mtimeMs > INDEX_MAX_AGE) {
			refreshIndex(fs).catch(function () { });
		}

		var stamp = 'webhook|' + (stat ? stat.mtimeMs : 0);

		if (source.list && source.stamp === stamp) return source.list;

		try {
			if (!text) text = fs.readFileSync(file, 'utf8');
		} catch (err) {
			throw new Error('#PAD_058 - não foi possível carregar o índice das atrações. verifique a conexão e o workflow.');
		}

		var data = JSON.parse(text);
		var roots = data.roots || {};
		var full = function (p) {
			var m = /^([a-z]+):(.*)$/.exec(p || '');

			return m && roots[m[1]] ? roots[m[1]] + '/' + m[2] : p || '';
		};

		source.stamp = stamp;
		source.list = (data.atracoes || []).filter(function (a) {
			return a && a.name && (a.proj || a.out);
		}).map(function (a) {
			return {
				name: a.name,
				cat: a.cat || '',
				path: full(a.proj) || full(a.out),
				out: full(a.out),
				depth: 0,
				keys: [wordKey(a.name)].concat((a.pattern || []).map(wordKey)).filter(function (k) {
					return k.f;
				})
			};
		});

		return source.list;
	}

	// a configuração da busca mudou com a janela aberta (webhook ↔ índice local, outras pastas)? ao voltar para a
	// janela, a próxima busca usa a fonte nova (sem chamar o host a cada tecla)
	async function watchSearchSource() {
		if (document.hidden || !source.info) return;

		try {
			var info = await call('searchInfo');

			if (info.mode === source.info.mode && info.url === source.info.url && String(info.folders) === String(source.info.folders)) return;

			source.info = info;
			source.list = null;
			source.stamp = '';
		} catch (err) { }
	}

	window.addEventListener('focus', watchSearchSource);

	async function candidates() {
		if (!source.info) source.info = await call('searchInfo');

		var fs = nodeFs();
		var local = source.info.mode === 'local';
		var canLocal = local && window.PAD_LOCAL_INDEX && PAD_LOCAL_INDEX.available();

		if (local ? !canLocal : !fs) return null; // navegador de teste: o host responde

		return local ? localCandidates() : await webhookCandidates(fs);
	}

	// → { claquete, matches: [{ name, category, path, out, display, score }] } (o mesmo formato do host)
	async function findAttractions(claq) {
		var list = await candidates();

		if (!list) return call('projectLookup', { claquete: claq });

		var local = source.info.mode === 'local';
		var words = aepName(claq).split(' ').filter(Boolean);
		var found = [];

		list.forEach(function (it) {
			var score = 0;

			it.keys.forEach(function (k) {
				score = Math.max(score, scoreKey(k, words));
			});

			if (score) found.push({ it: it, score: score });
		});

		// achou pela claquete completa: as parciais saem (senão a claquete inteira cairia na etapa PASTA)
		if (found.some(function (f) {
			return f.score >= 1000;
		})) {
			found = found.filter(function (f) {
				return f.score >= 1000;
			});
		}

		var seen = {};
		var matches = found.sort(function (a, b) {
			return b.score - a.score || a.it.depth - b.it.depth || a.it.name.length - b.it.name.length;
		}).filter(function (f) {
			var key = local ? f.it.path : aepName(f.it.name);

			if (seen[key]) return false;

			seen[key] = true;
			return true;
		}).slice(0, 6).map(function (f) {
			return { name: f.it.name, category: local ? 'PASTAS' : f.it.cat || 'ATRAÇÕES', path: f.it.path, out: f.it.out || '', display: displayPath(f.it.path), score: f.score };
		});

		return { claquete: aepName(claq), matches: matches };
	}

	// As categorias da aba PROJETO (configuração): o caminho de cada uma, com tokens. a que não pode ser
	// acessada (rede fora ou modo local) vai para a pasta dos projetos deste computador: {categoria}/{atracao}
	function categoryBase(c, fallback) {
		var pattern = c.reachable ? c.path : String(fallback || '~/Desktop').replace(/[\\\/]+$/, '') + '/{categoria}/{atracao}';
		var fixed = pattern.split('{')[0].replace(/[\\\/][^\\\/]*$/, '');

		return { label: c.name, icon: c.icon, pattern: pattern, outPattern: c.reachable ? c.output || '' : '', path: fixed, display: displayPath(fixed), offline: !c.reachable };
	}

	// O caminho da categoria com os tokens trocados: {atracao} {ano} {mes} {mes_extenso} {proximo_mes} {categoria}
	// {letra}. os meses por extenso como os nomes de pasta: em maiúsculas, sem acento (MARCO)
	var MONTHS = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

	function fillPattern(pattern, name, category) {
		var d = new Date();
		var values = { atracao: aepName(name), ano: String(d.getFullYear()), mes: ('0' + (d.getMonth() + 1)).slice(-2), mes_extenso: MONTHS[d.getMonth()], proximo_mes: MONTHS[(d.getMonth() + 1) % 12], categoria: aepName(category), letra: letterOf(name) };

		return pattern.replace(/\{(\w+)\}/g, function (all, key) {
			return values[key] != null ? values[key] : all;
		});
	}

	// as categorias da equipe (configuração > PROJETO); sem nenhuma, a pasta é livre (escolher a pasta…)
	async function newBases() {
		var cfg = null;

		try {
			cfg = await call('projectCategories');
		} catch (err) { }

		return (cfg && cfg.categories || []).map(function (c) {
			return categoryBase(c, cfg.fallback);
		});
	}

	// a mesma regra do host: a primeira letra do título sem o artigo, ou # para números
	function letterOf(title) {
		var words = aepName(title).split(' ');

		if (words.length > 1 && ['O', 'A', 'OS', 'AS', 'UM', 'UMA', 'UNS', 'UMAS', 'THE', 'AN'].indexOf(words[0]) >= 0) words.shift();

		var c = (words[0] || '').charAt(0);

		return /[A-Z]/.test(c) ? c : '#';
	}


	/* ---------------------------------------------------------------
	   a atração nova: o caminho da categoria com os tokens trocados (sem categoria: dentro da pasta escolhida)
	   --------------------------------------------------------------- */

	function resolveNew(base, name) {
		name = String(name || '').trim().toUpperCase(); // a atração nova em maiúsculas (com os acentos)

		if (base.pattern) {
			var path = fillPattern(base.pattern, name, base.label);

			return { name: name, path: path, display: displayPath(path), out: base.outPattern ? fillPattern(base.outPattern, name, base.label) : '', isNew: true };
		}

		var sep = /\\/.test(base.path) ? '\\' : '/';

		return { name: name, path: base.path.replace(/[\\\/]+$/, '') + sep + aepName(name), display: base.display + '/' + aepName(name), out: '', isNew: true };
	}

	// o ícone da categoria da atração (aba PROJETO), ou a pasta
	function iconFor(match, bases) {
		var base = (bases || []).filter(function (b) {
			return b.label && match.category && aepName(b.label) === aepName(match.category);
		})[0];

		return (base && PAD_UTIL.categoryIcon(base.icon)) || ICONS.folder;
	}

	/* ---------------------------------------------------------------
	   o seletor: o campo, os cartões (as achadas e a "nova atração") e a nova (nome + categoria) embaixo.
	   escolher uma achada fecha a lista; a nova fica aberta enquanto é preenchida.
	   picker(root, { onChange(atr | null) }) → { get(), set(atr), focus() }
	   atr: { name, path, out, display, isNew }
	   --------------------------------------------------------------- */

	var ICONS = {
		tv: '<svg class="field-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8.5 3.5 3.5 4 3.5-4" /><rect x="3" y="7.5" width="18" height="13" rx="2.5" /><rect x="5.5" y="10" width="10.5" height="8" rx="2" /><path d="M18.5 11.5h.01M18.5 15h.01" /></svg>',
		folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></svg>',
		plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>',
		search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>',
		file: '<svg class="field-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><path d="M13.5 3.5V8H18" /></svg>'
	};
	var LIST_MAX = 4;
	var LOOKUP_MS = 120;
	var PREF_BASE = 'pad.project.base'; // a última categoria de uma atração nova (a mesma da janela PROJETO)

	function el(tag, className, text) {
		var node = document.createElement(tag);

		if (className) node.className = className;
		if (text != null) node.textContent = text;

		return node;
	}

	/* a lista com busca (combo): o campo e, embaixo, na mesma caixa, a lista (grupos e itens de uma linha).
	   abre e fecha animada (motion.js, pelo hidden) e acompanha a altura quando o conteúdo muda. */

	// um item: o ícone, o nome e, à direita, o detalhe; o marcado fica em destaque
	function comboRow(icon, title, meta, selected, onPick, tip) {
		var item = el('button', 'combo-item' + (selected ? ' is-on' : ''));

		item.type = 'button';
		item.setAttribute('role', 'option');
		item.setAttribute('aria-selected', String(!!selected));
		if (icon) item.insertAdjacentHTML('afterbegin', icon);
		item.appendChild(el('span', 'combo-title', title));
		if (meta) item.appendChild(el('small', 'combo-meta', meta));
		if (tip) item.title = tip;
		item.addEventListener('mousedown', function (e) {
			e.preventDefault(); // o campo não perde o foco (a lista não fecha antes do clique)
		});
		item.addEventListener('click', onPick);

		return item;
	}

	function group(label) {
		return el('p', 'combo-group', label);
	}

	// separa as partes da lista (ex: as atrações achadas e a "nova atração"): uma linha que não vai de ponta a ponta
	function sep() {
		return el('hr', 'combo-sep');
	}

	// troca o conteúdo do painel animando a altura (de onde estava para onde vai)
	function resize(panel, change) {
		var open = !panel.hidden && panel.isConnected && panel.animate;
		var from = open ? panel.offsetHeight : 0;

		change();

		if (!open || panel.hidden) return;

		var to = panel.offsetHeight;

		if (Math.abs(to - from) > 1) panel.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
	}

	// o último pedaço do caminho (a pasta da atração e a de cima), para o detalhe do item
	function pathTail(path) {
		var parts = String(path || '').replace(/[\\\/]+$/, '').split(/[\\\/]/);

		return parts.slice(-2).join('/');
	}

	function pref(key, value) {
		try {
			if (value === undefined) return localStorage.getItem(key) || '';
			localStorage.setItem(key, value);
		} catch (err) { }

		return '';
	}

	function picker(root, opts) {
		opts = opts || {};

		var st = { matches: [], picked: null, choice: '', bases: null, pickedBase: null, seq: 0, timer: null, edited: false };
		var field = el('div', 'has-field-icon atr-field combo-field');
		var input = el('input', 'cfg-input');
		var list = el('div', 'combo-panel atr-list');
		var nova = el('div', 'atr-nova');
		var box = el('div', 'atr-nova-box');
		var row = el('div', 'atr-nova-row');
		var nameField = el('div', 'has-field-icon');
		var name = el('input', 'cfg-input');
		var selWrap = el('span', 'select select-large');
		var select = el('select');
		var pickBtn = el('button', 'wz-pick');
		var preview = el('p', 'wz-preview');

		input.type = 'text';
		input.spellcheck = false;
		input.autocomplete = 'off';
		input.placeholder = opts.placeholder || 'ex: DOMINGÃO';
		input.setAttribute('aria-label', 'Atração');
		field.insertAdjacentHTML('afterbegin', ICONS.tv);
		field.appendChild(input);

		name.type = 'text';
		name.spellcheck = false;
		name.autocomplete = 'off';
		name.placeholder = 'nome da atração';
		name.setAttribute('aria-label', 'Nome da atração nova');
		nameField.insertAdjacentHTML('afterbegin', ICONS.file);
		nameField.appendChild(name);
		select.setAttribute('aria-label', 'Categoria');
		selWrap.appendChild(select);
		pickBtn.type = 'button';
		pickBtn.hidden = true;
		pickBtn.innerHTML = ICONS.folder + '<span>escolher a pasta…</span>';
		row.appendChild(nameField);
		row.appendChild(selWrap);
		row.appendChild(pickBtn);
		box.appendChild(row);
		box.appendChild(preview);
		nova.appendChild(box);
		list.hidden = true;
		list.setAttribute('role', 'listbox');
		root.classList.add('combo');
		root.appendChild(field);
		root.appendChild(list);

		function emit() {
			if (opts.onChange) opts.onChange(st.picked);
		}

		async function ensureBases() {
			if (st.bases) return;

			try {
				st.bases = await newBases();
			} catch (err) {
				st.bases = [];
			}

			var last = pref(PREF_BASE);
			var free = !st.bases.length;

			selWrap.hidden = free;
			pickBtn.hidden = !free;
			select.textContent = '';
			st.bases.forEach(function (b, i) {
				var opt = el('option', null, b.label);

				opt.value = String(i);
				if (b.label === last) opt.selected = true;
				select.appendChild(opt);
			});

			var other = el('option', null, 'nenhuma destas: escolher a pasta…');

			other.value = 'pick';
			select.appendChild(other);
			if (window.PAD_DROPDOWN) {
				PAD_DROPDOWN.enhance(select, function (value) {
					var base = st.bases[+value];
					var icon = value === 'pick' ? ICONS.search : (base && PAD_UTIL.categoryIcon(base.icon)) || ICONS.folder;

					return icon.replace('<svg', '<svg class="dropdown-svg"');
				});
				PAD_DROPDOWN.refresh(select);
			}
		}

		function novaBase() {
			if (!st.bases || !st.bases.length || select.value === 'pick') return st.pickedBase;

			return st.bases[+select.value] || null;
		}

		// a nova: o caminho que ela vai ter (da pasta da atração em diante, em destaque) e a escolha
		function updateNova() {
			var base = novaBase();
			var n = aepName(name.value);

			preview.textContent = '';
			if (base && base.pattern) {
				var full = displayPath(fillPattern(base.pattern, n || '…', base.label));
				var head = displayPath(fillPattern(base.pattern.slice(0, base.pattern.indexOf('{atracao}')), n || '…', base.label));
				var cut = full.indexOf(head) === 0 ? head.length - 1 : full.lastIndexOf('/');

				preview.appendChild(el('span', null, full.slice(0, cut + 1)));
				preview.appendChild(el('b', null, full.slice(cut + 1)));
			} else if (base) {
				preview.appendChild(el('span', null, base.display + '/'));
				preview.appendChild(el('b', null, n || '…'));
			}

			st.picked = base && n ? resolveNew(base, name.value) : null;
			if (st.picked && base.pattern) pref(PREF_BASE, base.label);
			emit();
		}

		function typedName() {
			// o que foi digitado, sem os números do fim (DOMINGÃO 9 11 → DOMINGÃO)
			return input.value.trim().replace(/(\s+[0-9][^\s]*)+$/, '').toUpperCase();
		}

		function render() {
			var shown = st.matches.slice(0, LIST_MAX);
			var typed = aepName(input.value);
			var open = !!typed && !(st.picked && !st.picked.isNew && st.choice !== 'new');

			resize(list, function () {
				list.textContent = '';
				list.appendChild(group(shown.length ? 'atrações' : 'nenhuma atração com esse nome'));
				shown.forEach(function (m, i) {
					list.appendChild(comboRow(iconFor(m, st.bases), m.name.toUpperCase(), m.category || '', st.choice === 'm' + i, function () {
						choose('m' + i);
					}, m.display));
				});
				list.appendChild(sep());
				list.appendChild(comboRow(ICONS.plus, 'nova atração', aepName(name.value) || typedName() || 'o nome digitado', st.choice === 'new', function () {
					choose('new');
				}));
				list.appendChild(nova);
				nova.classList.toggle('is-open', st.choice === 'new');
			});
			list.hidden = !open;
			root.classList.toggle('is-open', open);
		}

		async function choose(key) {
			st.choice = key;

			if (key === 'new') {
				await ensureBases();
				if (!st.edited) name.value = typedName();
				render();
				updateNova();
				name.focus();
				return;
			}

			var m = st.matches[+key.slice(1)];

			st.picked = { name: m.name.toUpperCase(), path: m.path, out: m.out || '', display: m.display, isNew: false };
			input.value = st.picked.name;
			render();
			emit();
		}

		function lookup() {
			clearTimeout(st.timer);

			var text = input.value;
			var seq = ++st.seq;

			st.picked = null;
			if (st.choice !== 'new') st.choice = '';
			if (st.choice === 'new' && !st.edited) name.value = typedName();
			emit();

			if (!aepName(text)) {
				st.matches = [];
				render();
				return;
			}

			st.timer = setTimeout(async function () {
				var res;

				try {
					res = await findAttractions(text);
				} catch (err) {
					res = { matches: [] };
				}

				if (seq !== st.seq) return;

				st.matches = res.matches;
				await ensureBases();
				render();
				if (st.choice === 'new') updateNova();
			}, LOOKUP_MS);
		}

		input.addEventListener('input', function () {
			st.hover = '';
			lookup();
		});
		// fora do campo e da lista: fecha (a nova atração, sendo preenchida, fica)
		root.addEventListener('focusout', function () {
			setTimeout(function () {
				if (root.contains(document.activeElement) || st.choice === 'new') return;

				list.hidden = true;
				root.classList.remove('is-open');
			}, 120);
		});
		input.addEventListener('focus', function () {
			if (aepName(input.value) && !st.picked && st.matches.length) render();
		});
		input.addEventListener('keydown', function (e) {
			// Enter escolhe a primeira atração da lista
			var count = Math.min(st.matches.length, LIST_MAX);
			var at = /^m\d+$/.test(st.hover || '') ? +st.hover.slice(1) : -1;

			if (list.hidden) return;

			// setas: andam pela lista (a nova atração é a última); Enter escolhe a marcada (ou a primeira)
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				at = st.hover === 'new' ? count : at;
				at = Math.max(0, Math.min(count, at + (e.key === 'ArrowDown' ? 1 : -1)));
				st.hover = at === count ? 'new' : 'm' + at;
				Array.prototype.forEach.call(list.querySelectorAll('.combo-item'), function (it, i) {
					it.classList.toggle('is-hover', i === at);
				});
			}
			if (e.key === 'Enter' && st.choice !== 'new') {
				e.preventDefault();
				choose(st.hover || (count ? 'm0' : 'new'));
			}
			if (e.key === 'Escape') {
				list.hidden = true;
				root.classList.remove('is-open');
			}
		});
		name.addEventListener('input', function () {
			st.edited = true;
			updateNova();
			var items = list.querySelectorAll('.combo-item');
			var sub = items.length ? items[items.length - 1].querySelector('.combo-meta') : null;

			if (sub && st.choice === 'new') sub.textContent = aepName(name.value) || 'o nome digitado';
		});
		select.addEventListener('change', function () {
			if (select.value === 'pick') {
				var picked = PAD_BRIDGE.pickFolder('Pasta onde a atração nova vai ficar');

				if (picked) st.pickedBase = { path: picked, display: displayPath(picked) };
			}
			updateNova();
		});
		pickBtn.addEventListener('click', function () {
			var picked = PAD_BRIDGE.pickFolder('Pasta onde a atração nova vai ficar');

			if (!picked) return;

			st.pickedBase = { path: picked, display: displayPath(picked) };
			pickBtn.querySelector('span').textContent = displayPath(picked);
			updateNova();
		});

		// o índice já carrega ao abrir: a primeira tecla não espera por ele
		candidates().catch(function () { });

		return {
			get: function () {
				return st.picked;
			},
			// uma atração já gravada (ex: a config do template): fica escolhida, sem lista
			set: function (atr) {
				st.matches = [];
				st.choice = '';
				st.edited = false;
				st.picked = atr && atr.name ? { name: String(atr.name), path: atr.path || '', out: atr.out || '', display: displayPath(atr.path || ''), isNew: false } : null;
				input.value = st.picked ? st.picked.name : '';
				render();
			},
			focus: function () {
				input.focus();
			},
			input: input
		};
	}

	window.PAD_ATTRACTIONS = {
		aepName: aepName,
		displayPath: displayPath,
		find: findAttractions,
		candidates: candidates,
		categories: newBases,
		fillPattern: fillPattern,
		letterOf: letterOf,
		resolveNew: resolveNew,
		iconFor: iconFor,
		row: comboRow,
		group: group,
		sep: sep,
		resize: resize,
		pathTail: pathTail,
		mode: function () {
			return source.info ? source.info.mode : '';
		},
		picker: picker
	};
})();
