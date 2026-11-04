/*

---------------------------------------------------------------
> PROJETO — um projeto novo pela claquete, em etapas, e o editor
---------------------------------------------------------------

Projeto sem claquete: as etapas.
  CLAQUETE → a atração (índice da busca, pelo começo da claquete)
  PASTA    → só se houver mais de uma atração, ou nenhuma (criar nova / escolher uma pasta)
  NOVA     → uma atração nova (nome + dentro de: a categoria, com o caminho de tokens)
  ARQUIVO  → o que é (o .aep é a atração + isso, sem acentos)
  CRIAR    → a estrutura (01 PROJETOS, 02 ARQUIVOS, 03 SAIDA, aproveitando a que existir) e o .aep
Projeto criado: o editor (claquete, designer, a pasta, trocar pasta e salvar).

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
	var OUTPUT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /><path d="M12 11v5M9.5 13.5 12 16l2.5-2.5" /></svg>';
	var USER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5" /></svg>';

	// o que foi escolhido até aqui
	var flow = {
		claquete: '',
		matches: [],
		pick: null, // { name, path, display } a atração
		choice: '', // na tela PASTA: o índice da atração, 'new' ou 'folder'
		output: '', // a pasta de output (a da atração no índice, ou o caminho de output da categoria): proposta na etapa CRIAR
		what: '',
		mode: '', // '', 'open', 'increment' (arquivo existente)
		history: []
	};
	var state = { screen: '', current: null, lookupTimer: null, lookupSeq: 0, busy: false, bases: [] };

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

		var focus = { claquete: 'claq', nova: 'nova-name', arquivo: 'arq-what' }[name];

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
	   CLAQUETE
	   --------------------------------------------------------------- */

	/* ---------------------------------------------------------------
	   a claquete → a atração, procurada aqui mesmo, na memória (rápido a cada tecla): as atrações do índice da
	   busca (webhook, a mesma cópia do acessorista) ou, no índice local (configuração > buscar), as pastas.
	   - completa: o nome (ou um pattern) é o começo da claquete ('MAIS VOCE' para 'MAIS VOCE 30 10');
	   - parcial: o começo da claquete é o começo do nome ('la na minha' → 'Lá na Minha Terra', 'GREP 6 11' →
	     'G REPORTER'), a partir de 3 letras.
	   a completa vem primeiro (a mais específica antes); sem o painel no AE (navegador de teste), pergunta ao host.
	   --------------------------------------------------------------- */

	var source = { info: null, list: null, stamp: '' };
	var INDEX_MAX_AGE = 10 * 60 * 1000; // a cópia do índice do webhook: baixada de novo se tiver mais de 10 min

	function nodeFs() {
		try {
			return typeof require === 'function' ? require('fs') : null;
		} catch (err) {
			return null;
		}
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

	// as atrações do índice do webhook (a cópia do acessorista; velha ou sem cópia, baixa pelo host)
	async function webhookCandidates(fs) {
		var file = source.info.cache;
		var stat = null;

		try {
			stat = fs.statSync(file);
		} catch (err) { }

		var text = '';

		if (!stat || Date.now() - stat.mtimeMs > INDEX_MAX_AGE) {
			try {
				text = (await call('searchDownload', {})).text;
				stat = fs.statSync(file);
			} catch (err) { }
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

	// O caminho da categoria com os tokens trocados: {atracao} {ano} {mes} {categoria} {letra}
	function fillPattern(pattern, name, category) {
		var d = new Date();
		var values = { atracao: aepName(name), ano: String(d.getFullYear()), mes: ('0' + (d.getMonth() + 1)).slice(-2), categoria: aepName(category), letra: letterOf(name) };

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

	function lookup() {
		clearTimeout(state.lookupTimer);

		var claq = $('claq').value.trim();
		var seq = ++state.lookupSeq;

		flow.claquete = claq;
		$('claq-next').disabled = !claq;

		if (!claq) {
			flow.matches = [];
			$('claq-found').hidden = true;
			$('claq-hint').textContent = '';
			return;
		}

		state.lookupTimer = setTimeout(async function () {
			try {
				var res = await findAttractions(claq);

				if (seq !== state.lookupSeq) return;

				flow.matches = res.matches;
				renderClaquete();
			} catch (err) {
				if (seq === state.lookupSeq) {
					flow.matches = [];
					$('claq-found').hidden = true;
					$('claq-hint').textContent = PAD_UTIL.errorText(err.message);
				}
			}
		}, LOOKUP_MS);
	}

	function renderClaquete() {
		var m = flow.matches;
		var box = $('claq-found');

		if (m.length) card(box, m[0].name, m[0].display); // preenche antes de mostrar: a animação mede a altura final
		box.hidden = !m.length;
		$('claq-other').hidden = !m.length;
		$('claq-hint').textContent = m.length > 1 ? '+ ' + (m.length - 1) + (m.length === 2 ? ' outra atração possível' : ' outras atrações possíveis') : !m.length && flow.claquete ? (source.info && source.info.mode === 'local' ? 'nenhuma pasta do índice local começa com essa claquete' : 'nenhuma atração começa com essa claquete') : '';
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
		}

		if (flow.matches.length === 1) return pickAttraction(flow.matches[0]);

		openPasta();
	}

	// PASTA: as atrações encontradas, criar nova ou escolher uma pasta (também pelo "não é essa?")
	function openPasta() {
		flow.choice = flow.matches.length ? '0' : 'new';
		renderPasta();
		show('pasta');
	}

	// a atração escolhida (a achada pela claquete ou a pasta escolhida): o que é (ARQUIVO). a mesma etapa para
	// todas, filmes também
	function pickAttraction(m) {
		flow.pick = m;
		flow.output = m.out || ''; // a pasta de output da atração (o índice), se houver
		$('arq-what').value = '';
		flow.what = '';
		planFile();
		show('arquivo');
	}

	/* ---------------------------------------------------------------
	   PASTA
	   --------------------------------------------------------------- */

	function renderPasta() {
		var list = $('pasta-list');
		var m = flow.matches;

		list.textContent = '';
		$('pasta-hint').textContent = (m.length > 1 ? 'mais de uma atração para ' : m.length ? 'escolha a atração (ou crie uma nova) para ' : 'nada encontrado para ') + aepName(flow.claquete);

		m.forEach(function (match, i) {
			list.appendChild(option(FOLDER_SVG, match.name, match.display, flow.choice === String(i), function () {
				flow.choice = String(i);
				renderPasta();
			}));
		});

		// o mesmo cartão das outras opções (com a bolinha à direita)
		list.appendChild(option(PLUS_SVG, 'criar nova', 'filme inédito, novela nova…', flow.choice === 'new', function () {
			flow.choice = 'new';
			renderPasta();
		}));

		list.appendChild(option(SEARCH_SVG, 'escolher uma pasta…', 'abre o navegador de pastas', flow.choice === 'folder', function () {
			flow.choice = 'folder';
			renderPasta();
		}));

		$('pasta-next').disabled = !flow.choice;
	}

	async function pastaNext() {
		if (flow.choice === 'new') return openNova();

		if (flow.choice === 'folder') {
			var picked = PAD_BRIDGE.pickFolder('Pasta do projeto');

			if (!picked) return;

			var name = picked.replace(/[\\\/]+$/, '').split(/[\\\/]/).pop();

			return pickAttraction({ name: name, path: picked, display: picked });
		}

		pickAttraction(flow.matches[+flow.choice]);
	}

	/* ---------------------------------------------------------------
	   NOVA
	   --------------------------------------------------------------- */

	async function openNova() {
		// o nome já vem da claquete digitada no começo, sem os números do fim (DOMINGÃO 9 11 → DOMINGÃO)
		$('nova-name').value = String($('claq').value || '').trim().split(/\s+/).filter(function (w, i, all) {
			return !all.slice(i).every(function (x) {
				return /^[\d\/\-.]+$/.test(x);
			});
		}).join(' ');

		if (!state.bases.length) {
			try {
				state.bases = await newBases();
			} catch (err) {
				state.bases = [];
			}
		}

		var select = $('nova-base');
		var free = !state.bases.length;

		// sem categorias na configuração: a pasta é livre (o botão no lugar da lista)
		select.closest('.select').hidden = free;
		$('nova-pick').hidden = !free;
		$('nova-free').hidden = !free;
		if (free) {
			state.pickedBase = null;
			$('nova-pick').querySelector('span').textContent = 'escolher a pasta…';
		}
		select.textContent = '';
		state.bases.forEach(function (b, i) {
			var opt = el('option', null, b.label);

			opt.value = String(i);
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
		renderNova();
		show('nova');
	}

	function novaBase() {
		var v = $('nova-base').value;

		if (!state.bases.length) return state.pickedBase || null;

		if (v === 'pick') return state.pickedBase || null;

		return state.bases[+v] || null;
	}

	function renderNova() {
		var base = novaBase();
		var name = aepName($('nova-name').value);

		$('nova-preview').innerHTML = '';

		if (base && base.pattern) {
			// o caminho com os tokens trocados; da pasta da atração em diante, em destaque
			var full = displayPath(fillPattern(base.pattern, name || '…', base.label));
			var head = displayPath(fillPattern(base.pattern.slice(0, base.pattern.indexOf('{atracao}')), name || '…', base.label));
			var cut = full.indexOf(head) === 0 ? head.length - 1 : full.lastIndexOf('/');

			$('nova-preview').insertAdjacentHTML('afterbegin', PAD_UTIL.categoryIcon(base.icon) || FOLDER_SVG);
			$('nova-preview').appendChild(el('span', null, full.slice(0, cut + 1)));
			$('nova-preview').appendChild(el('b', null, full.slice(cut + 1)));
			if (base.offline) $('nova-preview').appendChild(el('em', 'nova-offline', 'pasta deste computador: a da categoria não está acessível'));
		} else if (base) {
			$('nova-preview').insertAdjacentHTML('afterbegin', FOLDER_SVG);
			$('nova-preview').appendChild(el('span', null, base.display + '/'));
			$('nova-preview').appendChild(el('b', null, name || '…'));
		}

		$('nova-next').disabled = !name || !base;
	}

	// a mesma regra do host: a primeira letra do título sem o artigo, ou # para números
	function letterOf(title) {
		var words = aepName(title).split(' ');

		if (words.length > 1 && ['O', 'A', 'OS', 'AS', 'UM', 'UMA', 'UNS', 'UMAS', 'THE', 'AN'].indexOf(words[0]) >= 0) words.shift();

		var c = (words[0] || '').charAt(0);

		return /[A-Z]/.test(c) ? c : '#';
	}

	function novaNext() {
		var base = novaBase();
		var name = $('nova-name').value.trim();

		if (!base || !aepName(name)) return;

		// categoria configurada: o caminho dela com os tokens trocados
		if (base.pattern) {
			var path = fillPattern(base.pattern, name, base.label);

			flow.pick = { name: name, path: path, display: displayPath(path) };
			flow.output = base.outPattern ? fillPattern(base.outPattern, name, base.label) : '';
			$('arq-what').value = '';
			flow.what = '';
			planFile();
			show('arquivo');
			return;
		}

		flow.output = ''; // pasta livre: sem output proposto

		// atração nova: uma pasta com o nome dela dentro da escolhida
		var sep = /\\/.test(base.path) ? '\\' : '/';

		flow.pick = { name: name, path: base.path.replace(/[\\\/]+$/, '') + sep + aepName(name), display: base.display + '/' + aepName(name) };
		$('arq-what').value = '';
		flow.what = '';
		planFile();
		show('arquivo');
	}

	/* ---------------------------------------------------------------
	   ARQUIVO
	   --------------------------------------------------------------- */

	function planArgs(extra) {
		return Object.assign({ kind: 'program', atracao: flow.pick.name, path: flow.pick.path, what: flow.what, claquete: flow.claquete }, extra || {});
	}

	async function planFile() {
		var file = $('arq-file');

		file.innerHTML = FILE_SVG;
		file.appendChild(el('span', null, aepName(flow.pick.name + ' ' + flow.what) + '.aep'));

		try {
			var plan = await call('projectPlan', planArgs());

			state.plan = plan;
			renderExisting(plan);

			file.classList.toggle('is-dup', plan.exists);
			$('arq-dup').hidden = !plan.exists;
			$('arq-increment').textContent = 'salvar como ' + plan.fileBase + ' 2';
			if (!plan.exists) flow.mode = '';
			else if (!flow.mode) flow.mode = 'open';
			Array.prototype.forEach.call($('arq-dup').querySelectorAll('input'), function (input) {
				input.checked = input.value === flow.mode;
			});
			$('arq-next').textContent = plan.exists && flow.mode === 'open' ? 'Abrir' : 'Próximo';
		} catch (err) {
			status(err.message, 'error');
		}
	}

	// os .aep que já estão na pasta: o último alterado primeiro, com a data
	var EXIST_MAX = 4;

	function renderExisting(plan) {
		var box = $('arq-exist');
		var list = plan.existing || [];

		box.textContent = '';
		if (!list.length) return;

		box.appendChild(el('p', 'wz-exist-head', 'já em ' + plan.projectsName));
		list.slice(0, EXIST_MAX).forEach(function (f) {
			var row = el('div', 'wz-exist-row' + (f.name === plan.fileBase ? ' is-dup' : ''));

			row.appendChild(el('span', null, f.name));
			row.appendChild(el('time', null, when(f.modified)));
			box.appendChild(row);
		});
		if (list.length > EXIST_MAX) box.appendChild(el('p', 'wz-exist-more', '+ ' + (list.length - EXIST_MAX) + (list.length - EXIST_MAX === 1 ? ' outro' : ' outros')));
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

	async function arquivoNext() {
		if (state.plan && state.plan.exists && flow.mode === 'open') return create(planArgs({ mode: 'open' }));

		goCreate(planArgs({ mode: flow.mode }));
	}

	/* ---------------------------------------------------------------
	   CRIAR
	   --------------------------------------------------------------- */

	function treeLine(depth, html, text, cls) {
		var line = el('div', 'wz-tree-line' + (cls ? ' ' + cls : ''));

		// o arquivo: ícone e nome juntos no destaque (a pílula branca)
		var holder = cls === 'is-file' ? line.appendChild(el('span', 'wz-tree-pill')) : line;

		line.style.setProperty('--depth', depth);
		holder.insertAdjacentHTML('afterbegin', html);
		holder.appendChild(el('span', null, text));

		return line;
	}

	async function goCreate(args) {
		state.createArgs = Object.assign({ atracao: flow.pick.name, path: flow.pick.path, claquete: flow.claquete, output: flow.output || '', outputCreate: true }, args);

		try {
			var plan = await call('projectPlan', state.createArgs);
			var tree = $('criar-tree');
			var meta = $('criar-meta');

			tree.textContent = '';
			tree.appendChild(treeLine(0, FOLDER_SVG, plan.rootName + (plan.rootExists ? '' : '  ·  nova')));
			tree.appendChild(treeLine(1, FOLDER_SVG, plan.projectsName + (plan.projectsExists ? '  ·  já existe' : ''), plan.projectsExists ? 'is-old' : ''));

			var file = treeLine(2, FILE_SVG, state.createArgs.mode === 'increment' ? plan.fileBase + ' 2.aep' : plan.fileName, 'is-file');

			tree.appendChild(file);
			(plan.folders || []).forEach(function (f) {
				tree.appendChild(treeLine(f.depth + 1, FOLDER_SVG, f.name));
			});

			meta.textContent = '';
			meta.appendChild(el('span', null, aepName(flow.claquete)));
			var user = el('span');

			user.innerHTML = USER_SVG;
			user.appendChild(document.createTextNode(plan.user));
			meta.appendChild(user);
			meta.title = plan.root;
			renderCreateOptions(plan);

			show('criar');
		} catch (err) {
			status(err.message, 'error');
		}
	}

	// as propostas da etapa CRIAR, em menus radiais. a pasta de output que já existe vai para os dados do projeto
	// (metadados); a que não existe: criar (o padrão, e vai para os dados) ou pular (não cria nem grava)
	function renderCreateOptions(plan) {
		var box = $('criar-opts');

		box.textContent = '';
		box.hidden = !plan.output;

		if (!plan.output) return;

		var item = el('div', 'opt-item');
		var head = el('div', 'opt-head');

		head.innerHTML = OUTPUT_SVG;
		head.appendChild(el('b', null, 'pasta de output'));
		item.appendChild(head);

		// da pasta da atração em diante, em destaque (antes dela, só a pasta de cima)
		var path = el('p', 'opt-path');
		var full = plan.output.replace(/\\/g, '/');
		var at = full.toUpperCase().indexOf('/' + aepName(state.createArgs.title || state.createArgs.atracao) + '/');
		var split = at < 0 ? full.lastIndexOf('/') : at;
		var from = full.lastIndexOf('/', split - 1);

		path.title = plan.output;
		path.appendChild(document.createTextNode((from > 0 ? '…' : '') + full.slice(Math.max(from, 0), split + 1)));
		path.appendChild(el('b', null, full.slice(split + 1)));
		item.appendChild(path);

		if (plan.outputExists) {
			item.appendChild(el('p', 'opt-note', 'já existe: vai para os dados do projeto.'));
		} else {
			var radios = el('div', 'opt-radios');

			[['', 'pular'], ['1', 'criar a pasta']].forEach(function (o) {
				var label = el('label', 'log-radio');
				var input = el('input');

				input.type = 'radio';
				input.name = 'criar-output';
				input.checked = !!o[0] === !!state.createArgs.outputCreate;
				input.addEventListener('change', function () {
					state.createArgs.outputCreate = !!o[0];
				});
				label.appendChild(input);
				label.appendChild(el('span', 'log-radio-dot'));
				label.appendChild(el('span', 'log-radio-text', o[1]));
				radios.appendChild(label);
			});
			item.appendChild(radios);
		}

		box.appendChild(item);
	}

	async function create(args) {
		if (state.busy) return;

		state.busy = true;
		$('criar-go').disabled = true;
		$('criar-go').textContent = 'Criando…';

		try {
			var res = await call('projectCreate', args || state.createArgs);

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

	// o editor: a claquete e o designer, a atração e as pastas (o caminho no campo, a pastinha troca). um projeto
	// salvo sem os dados do padeiro (adopt) entra direto aqui, já com a atração (o nome do arquivo) e a pasta
	// dele: é só digitar a claquete e salvar.
	function renderEditor(cur, adopt) {
		var key = (adopt ? 'a|' : 'c|') + cur.file;

		state.adopt = !!adopt;
		$('ed-hint').hidden = !adopt;
		$('ed-user').placeholder = cur.defaultUser || 'designer';

		// os campos de texto só são preenchidos quando o projeto muda: a atualização a cada 1,5 s não apaga o que
		// está sendo digitado
		if (state.editorKey !== key) {
			state.editorKey = key;
			$('ed-claq').value = cur.claquete || '';
			$('ed-user').value = cur.designer;
			$('ed-atracao').value = cur.atracao || (adopt ? String(cur.fileName || '').replace(/\.aep$/i, '') : '');
		}
		pathValue($('ed-root'), cur.root || cur.file || '');
		pathValue($('ed-output'), cur.output || '');
		$('ed-root').title = cur.file || '';
		fitHeight();
	}

	// o caminho no campo, mostrando o fim (a parte que muda)
	function pathValue(input, value) {
		input.value = value;
		input.title = value;
		requestAnimationFrame(function () {
			input.scrollLeft = input.scrollWidth;
		});
	}

	async function editorOutput() {
		var picked = PAD_BRIDGE.pickFolder('Pasta de output do projeto');

		if (!picked) return;

		try {
			renderEditor(await call('projectUpdate', { output: picked }), state.adopt);
			status('pasta de output gravada no projeto.', 'success');
		} catch (err) {
			status(err.message, 'error');
		}
	}

	// salvar: grava os dados no projeto e fecha a janela
	async function editorSave() {
		if (state.adopt && !aepName($('ed-claq').value)) {
			status('digite a claquete do projeto.', 'error');
			$('ed-claq').focus();
			return;
		}

		try {
			var args = { claquete: $('ed-claq').value, designer: $('ed-user').value, atracao: $('ed-atracao').value.trim() };

			if (state.adopt) args.root = $('ed-root').value;
			renderEditor(await call('projectUpdate', args));
			PAD_BRIDGE.closePanel();
		} catch (err) {
			status(err.message, 'error');
		}
	}

	async function editorMove() {
		var picked = PAD_BRIDGE.pickFolder('Nova pasta do projeto');

		if (!picked) return;

		try {
			renderEditor(await call('projectMove', { path: picked }), state.adopt);
			status('projeto salvo na pasta nova.', 'success');
		} catch (err) {
			status(err.message, 'error');
		}
	}

	function startWizard() {
		flow.history = [];
		flow.matches = [];
		flow.pick = null;
		flow.output = '';
		state.editorKey = null;
		$('claq').value = '';
		$('claq-found').hidden = true;
		$('claq-hint').textContent = '';
		$('claq-next').disabled = true;
		show('claquete', false);
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
			// salvo, mas sem os dados do padeiro: pula as etapas (a atração é o nome do arquivo, a pasta é a dele)
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
		$('claq-next').addEventListener('click', claqueteNext);

		$('pasta-next').addEventListener('click', pastaNext);

		$('nova-name').addEventListener('input', renderNova);
		$('claq-other').addEventListener('click', openPasta);
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
		onEnter('nova-name', novaNext);
		$('nova-next').addEventListener('click', novaNext);


		$('arq-what').addEventListener('input', function () {
			flow.what = this.value;
			flow.mode = '';
			planFile();
		});
		onEnter('arq-what', arquivoNext);
		$('arq-next').addEventListener('click', arquivoNext);
		$('arq-dup').addEventListener('change', function (e) {
			flow.mode = e.target.value;
			planFile();
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
		['ed-claq', 'ed-user'].forEach(function (id) {
			onEnter(id, editorSave);
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
