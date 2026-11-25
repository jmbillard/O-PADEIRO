/*

---------------------------------------------------------------
> ATRAÇÕES — a busca e a atração nova (O PROJETISTA e O CONFEITEIRO)
---------------------------------------------------------------

A busca das atrações (o índice do webhook, a mesma cópia do acessorista, ou o índice local da configuração >
buscar), os tipos da aba TIPOS DE PROJETO (para uma atração nova) e o seletor: o campo, os cartões das atrações
achadas e a "nova atração" (nome + tipo), abrindo embaixo. → window.PAD_ATTRACTIONS

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	// nome de arquivo: sem acentos e símbolos, em maiúsculas (o mesmo do host)
	function aepName(text) {
		return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
	}

	// o nome do .aep: o mesmo, mas o ano de produção de um filme fica entre parênteses (NAO NAO OLHE (2022) CHAMADA),
	// como no host (padAepFileName)
	function aepFileName(text) {
		return String(text || '').split(/\((\d{4})\)/).map(function (piece, i) {
			return i % 2 ? '(' + piece + ')' : aepName(piece);
		}).filter(Boolean).join(' ');
	}

	/* ---------------------------------------------------------------
	   a claquete → a atração, procurada aqui mesmo, na memória (rápido a cada tecla): as atrações do índice da
	   busca (webhook, a mesma cópia do acessorista) ou, no índice local (configuração > buscar), as pastas.
	   - completa: o nome (ou um pattern) é o começo da claquete ('MAIS VOCE' para 'MAIS VOCE 30 10');
	   - parcial: o começo da claquete é o começo do nome ('la na minha' → 'Lá na Minha Terra', 'GREP 6 11' →
	     'G REPORTER'), a partir de 3 letras.
	   a completa vem primeiro (a mais específica antes); sem o painel no AE (navegador de teste), pergunta ao host.
	   --------------------------------------------------------------- */

	var SEARCH_INDEX = window.PAD_SEARCH_INDEX; // qual índice, a cópia e o download (js/search-index.js)
	// copyNote: no modo local, a linha com a data da cópia em uso ('' fora dele)
	var source = { info: null, list: null, stamp: '', refreshing: null, cards: [], copyNote: '' };
	var CARD_DAYS = 7; // os cards do Trello que viram sugestão n'O PROJETISTA: os que entraram nos últimos 7 dias
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

		var info = source.info;

		source.refreshing = SEARCH_INDEX.download(info.url).then(function (text) {
			SEARCH_INDEX.unwrap(JSON.parse(text)); // confere antes de trocar a cópia
			SEARCH_INDEX.writeCopy(fs, info, text);
		}).finally(function () {
			source.refreshing = null;
		});

		return source.refreshing;
	}

	// a pasta da atração no caminho do projeto, como mais um nome de busca: …/PROGRAMAS/BBB/BBB 2026/01 PROJETOS →
	// BBB 2026 (sem a pasta de projetos; só ano, a de cima). BBB acha o BIG BROTHER BRASIL
	function folderKeys(path) {
		var parts = String(path || '').replace(/\\/g, '/').split('/').filter(Boolean);

		while (parts.length && /^\d*[\s_-]*PROJETOS?$/i.test(aepName(parts[parts.length - 1]).replace(/^(\d+)\s*/, '$1'))) parts.pop();
		while (parts.length && /^[\d\s_-]+$/.test(parts[parts.length - 1])) parts.pop();

		var last = parts[parts.length - 1] || '';

		return last && !/^(FILESERVER|PROGRAMAS|NOVELAS|SHOWS|ESPORTES|JORNALISMO|INSTITUCIONAL|FILMES|TITULOS)/i.test(aepName(last)) ? [wordKey(last)] : [];
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

	// Pelo começo do nome (scoreKey) ou, sem ele, a partir de uma palavra do meio ('brasileiro' acha CAMPEONATO
	// BRASILEIRO MASCULINO): esses vêm depois dos que começam com o digitado e nunca contam como a claquete inteira
	function scoreAny(key, words) {
		var score = scoreKey(key, words);

		if (score || !words.length || words.join('').length < 3) return score;

		for (var i = 1; i < key.s.length; i++) {
			if (key.s.charAt(i) !== '1') continue;

			var mid = scoreKey({ f: key.f.slice(i), s: key.s.slice(i) }, words);

			if (mid) return 1 + (mid % 1000) / 100;
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
	// cópia nenhuma o host baixa (plano B). no modo local, só a cópia: nada de rede.
	async function webhookCandidates(fs) {
		var copyOnly = SEARCH_INDEX.choice(source.info) === 'copia';
		var file = SEARCH_INDEX.copyPath(fs, source.info);
		var stat = null;

		try {
			stat = fs.statSync(file);
		} catch (err) { }

		var text = '';

		if (copyOnly) {
			if (!stat) throw new Error('#PAD_058 - modo local: não há cópia do índice da busca neste computador. com a rede da equipe, desligue o modo local; ou escolha o índice local em configuração > buscar.');
		} else if (!stat) {
			try {
				await refreshIndex(fs);
				file = SEARCH_INDEX.copyPath(fs, source.info);
				stat = fs.statSync(file);
			} catch (err) {
				try {
					text = (await call('searchDownload', {})).text;
					file = SEARCH_INDEX.copyPath(fs, source.info);
					stat = fs.statSync(file);
				} catch (err2) { }
			}
		} else if (Date.now() - stat.mtimeMs > INDEX_MAX_AGE) {
			refreshIndex(fs).catch(function () { });
		}

		var stamp = 'webhook|' + file + '|' + (stat ? stat.mtimeMs : 0);

		if (source.list && source.stamp === stamp) return source.list;

		try {
			if (!text) text = fs.readFileSync(file, 'utf8');
		} catch (err) {
			throw new Error('#PAD_058 - não foi possível carregar o índice das atrações. verifique a conexão e o workflow.');
		}

		var data = SEARCH_INDEX.unwrap(JSON.parse(text));
		var roots = data.roots || {};
		var full = function (p) {
			var m = /^([a-z]+):(.*)$/.exec(p || '');

			return m && roots[m[1]] ? roots[m[1]] + '/' + m[2] : p || '';
		};

		source.stamp = stamp;
		source.copyNote = copyOnly ? SEARCH_INDEX.copyNote(data.generated, stat ? stat.mtimeMs : 0) : '';
		source.cards = recentCards(data.trello);
		source.list = (data.atracoes || []).filter(function (a) {
			return a && a.name && (a.proj || a.out);
		}).map(function (a) {
			return {
				name: a.name,
				cat: a.cat || '',
				path: full(a.proj) || full(a.out),
				out: full(a.out),
				depth: 0,
				keys: [wordKey(a.name)].concat((a.pattern || []).map(wordKey), folderKeys(full(a.proj))).filter(function (k) {
					return k.f;
				})
			};
		}).concat((data.filmes || []).filter(function (f) {
			return f && f.name;
		}).map(function (f) {
			// os filmes: o nome, o ano e o output; a pasta do projeto vem do tipo de filmes (janela de projeto)
			return { name: f.name, cat: 'FILME', year: f.year ? String(f.year) : '', isFilm: true, path: '', out: full(f.out), depth: 1, keys: [wordKey(f.name)].filter(function (k) {
				return k.f;
			}) };
		}));
		guessCardAttractions(source.cards, source.list);

		return source.list;
	}

	// o card sem vínculo no banco (sem 'atr') aponta a atração pelo começo da claquete, com o nome e os padrões dela
	// (DOMINGAO 25/11 → DOMINGÃO COM HUCK, padrão DOMINGAO). sem nenhuma, o card fica sem atração (vira atração nova
	// na claquete). o de filme ('fil') vai pelo filme (o link do card no webhook dos filmes)
	function guessCardAttractions(cards, list) {
		(cards || []).forEach(function (c) {
			if (c.atr || c.fil) return;

			var it = (list || []).filter(function (x) {
				return !x.isFilm && x.keys.some(function (k) {
					return scoreKey(k, c.words) >= 1000;
				});
			})[0];

			if (it) {
				c.atr = aepName(it.name);
				c.guess = true;
			}
		});
	}

	/* ---------------------------------------------------------------
	   os filmes recentes: os criados na base nos últimos dias (o webhook dos filmes, searchInfo.films). O PROJETISTA
	   mostra com o campo vazio, a produzir primeiro. baixados uma vez por janela aberta, pelo Node do painel (sem
	   travar o After); sem o Node (navegador de teste), o host responde.
	   → [{ name, year, exib, sessao, poster }]
	   --------------------------------------------------------------- */

	var films = { list: null, loading: null };

	// a resposta do webhook: { filmes: [...] }, a lista direto ou embrulhada pelo n8n ([{ filmes: [...] }] ou um item
	// por filme: [{ json: {...} }]). os campos em português (titulo, ano, exibicao) ou em inglês (name, year)
	function parseFilms(data) {
		if (typeof data === 'string') data = JSON.parse(data);

		var list = data && data.filmes ? data.filmes : data instanceof Array && data.length === 1 && data[0] && data[0].filmes ? data[0].filmes : data;

		if (!(list instanceof Array)) return [];

		return list.map(function (f) {
			f = f && f.json ? f.json : f;
			if (!f) return null;

			var year = String(f.ano || f.year || '').trim();
			var exib = String(f.exibicao || f.exib || '').trim();
			var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(exib);

			return {
				name: String(f.titulo || f.name || '').trim(),
				year: /^\d{4}$/.test(year) ? year : '',
				exib: iso ? iso[3] + '/' + iso[2] : exib, // 2026-12-05 → 05/12
				exibIso: iso ? iso[0] : '', // para pôr em ordem (a exibição mais próxima em cima)
				sessao: String(f.sessao || '').trim(),
				poster: /^https?:\/\//i.test(String(f.poster || '')) ? String(f.poster) : '',
				trello: String(f.trello || '').trim() // o link do card do filme no Trello (o card de filme leva a ele)
			};
		}).filter(function (f) {
			return f && f.name;
		});
	}

	function fetchJson(url) {
		return new Promise(function (resolve, reject) {
			var https = require(/^https:/i.test(url) ? 'https' : 'http');
			var req = https.get(url, { headers: { 'User-Agent': 'O PADEIRO', Accept: 'application/json' }, timeout: 15000 }, function (res) {
				if (res.statusCode !== 200) {
					res.resume();
					reject(new Error('HTTP ' + res.statusCode));
					return;
				}

				var chunks = [];

				res.on('data', function (c) {
					chunks.push(c);
				});
				res.on('error', reject);
				res.on('end', function () {
					try {
						resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
					} catch (err) {
						reject(err);
					}
				});
			});

			req.on('timeout', function () {
				req.destroy(new Error('tempo esgotado'));
			});
			req.on('error', reject);
		});
	}

	// os filmes recentes (uma vez por janela; uma falha não trava a claquete: a lista fica vazia e tenta de novo
	// na próxima vez que a janela pedir)
	function recentFilms() {
		// a lista vale 10 min (o painel fica aberto o dia todo: os filmes novos e os pôsteres, com link que expira)
		if (films.list && Date.now() - films.at < 600000) return Promise.resolve(films.list);
		if (films.loading) return films.loading;

		films.loading = (async function () {
			if (!source.info) source.info = await call('searchInfo');

			var data = null;

			if (nodeFs() && source.info.films) data = await fetchJson(source.info.films);
			else data = (await call('projectFilmsRecent', {})).data;

			films.list = parseFilms(data);
			films.at = Date.now();

			return films.list;
		})().catch(function () {
			return [];
		}).finally(function () {
			films.loading = null;
		});

		return films.loading;
	}

	/* ---------------------------------------------------------------
	   os cards do Trello: o grupo NO TRELLO d'O PROJETISTA (um card por linha, com o designer e o status) e a
	   referência para abrir o projeto da atração. só os cards que entraram nos últimos 7 dias ('at', a data) e não
	   estão finalizados ('fim'). o índice de antes (sem 'at') não sugere nada. os de filme ('fil') vêm marcados: O
	   PROJETISTA liga cada um ao filme pelo link do card (o 'trello' do webhook dos filmes).
	   → [{ claq, red, ed, des (o designer), st (o status: PRODUZINDO, EM APROVAÇÃO…), card, at, time, atr, fil, words }]
	   --------------------------------------------------------------- */

	function recentCards(list) {
		var since = Date.now() - CARD_DAYS * 86400000;

		return (list || []).filter(function (c) {
			var at = c && c.at ? Date.parse(String(c.at)) : NaN;

			return c && c.claq && !c.fim && !isNaN(at) && at >= since && at <= Date.now() + 86400000;
		}).map(function (c) {
			return { claq: String(c.claq), red: c.red || '', ed: c.ed || '', des: String(c.des || '').trim(), st: String(c.st || '').trim(), card: String(c.card || ''), at: String(c.at), time: Date.parse(String(c.at)), atr: c.atr ? aepName(c.atr) : '', fil: !!c.fil, words: aepName(c.claq).split(' ').filter(Boolean) };
		}).sort(function (a, b) {
			return b.time - a.time; // o mais novo primeiro
		});
	}

	// o card mais novo de uma atração → { claq, red, ed, card, at, more } ou null. o card ligado a uma atração no banco
	// ('atr') vale só para ela (Fut Fem Amis → AMISTOSOS DA SELECAO FEMININA, não FUTEBOL); o card sem vínculo, pelas
	// chaves dela (o nome e os padrões) no começo da claquete
	function cardFor(it, cards) {
		var name = aepName(it.name);
		var hits = (cards || []).filter(function (c) {
			if (c.fil) return false; // o card de filme leva ao filme, não a uma atração
			if (c.atr) return c.atr === name;

			return it.keys.some(function (k) {
				return scoreKey(k, c.words) >= 1000;
			});
		});

		if (!hits.length) return null;

		// all: todos os cards dela (o mais novo primeiro): O PROJETISTA mostra um por linha (o prêmio com um card por categoria)
		return { claq: hits[0].claq, red: hits[0].red, ed: hits[0].ed, card: hits[0].card, at: hits[0].at, more: hits.length - 1, all: hits.map(function (h) {
			return { claq: h.claq, red: h.red, ed: h.ed, card: h.card, at: h.at };
		}) };
	}

	// a configuração da busca mudou com a janela aberta (js/search-index.js)? ao voltar para a janela, a próxima busca
	// usa a origem nova (sem chamar o host a cada tecla)
	async function watchSearchSource() {
		if (document.hidden || !source.info) return;

		try {
			var info = await call('searchInfo');

			if (SEARCH_INDEX.signature(info) === SEARCH_INDEX.signature(source.info)) return;

			source.info = info;
			source.list = null;
			source.stamp = '';
			source.copyNote = '';
		} catch (err) { }
	}

	window.addEventListener('focus', watchSearchSource);

	async function candidates() {
		if (!source.info) source.info = await call('searchInfo');

		var fs = nodeFs();
		var local = SEARCH_INDEX.choice(source.info) === 'indiceLocal';
		var canLocal = local && window.PAD_LOCAL_INDEX && PAD_LOCAL_INDEX.available();

		if (local ? !canLocal : !fs) return null; // navegador de teste: o host responde

		return local ? localCandidates() : await webhookCandidates(fs);
	}

	// sem o Node do painel (navegador de teste), no modo local: a data da cópia que o host usa, lida uma vez
	async function hostCopyNote() {
		if (source.copyNote || SEARCH_INDEX.choice(source.info) !== 'copia') return;

		try {
			var copy = await call('searchCopy');

			if (copy.text) source.copyNote = SEARCH_INDEX.copyNote(SEARCH_INDEX.unwrap(JSON.parse(copy.text)).generated, copy.modified);
		} catch (err) { }
	}

	// → { claquete, matches: [{ name, tipo, path, out, display, score }], cards } (o mesmo formato do host). cards:
	// os cards recentes do Trello (todos: O PROJETISTA escolhe os que batem com o digitado, js/projetista.js)
	async function findAttractions(claq) {
		var list = await candidates();

		if (!list) {
			// navegador de teste (ou sem o Node): o host responde; os cards passam pelo mesmo filtro dos do índice
			var res = await call('projectLookup', { claquete: claq });

			await hostCopyNote();

			return { claquete: res.claquete, matches: res.matches || [], cards: recentCards(res.cards) };
		}

		var local = SEARCH_INDEX.choice(source.info) === 'indiceLocal';
		var words = aepName(claq).split(' ').filter(Boolean);
		var found = [];

		list.forEach(function (it) {
			var score = 0;

			it.keys.forEach(function (k) {
				score = Math.max(score, scoreAny(k, words));
			});

			if (score) found.push({ it: it, score: score, card: local || it.isFilm ? null : cardFor(it, source.cards) });
		});

		// pela claquete dos cards novos: o card ligado a uma atração no banco traz ela, mesmo que o nome dela não bata com
		// o digitado (fut → o card FUT FEM AMIS 29/11 → AMISTÓSOS DA SELEÇÃO FEMININA, ao lado do FUTEBOL)
		if (!local) {
			(source.cards || []).forEach(function (c) {
				if (!c.atr || c.fil || !scoreAny(wordKey(c.claq), words)) return;

				var it = list.filter(function (x) {
					return !x.isFilm && aepName(x.name) === c.atr;
				})[0];

				if (!it) return;

				var had = found.filter(function (f) {
					return f.it === it;
				})[0];

				if (had) had.viaCard = true;
				else found.push({ it: it, score: 1000, card: cardFor(it, source.cards), viaCard: true });
			});
		}

		// achou pela claquete completa: as parciais saem (senão a claquete inteira cairia na etapa PASTA); as que vieram
		// por um card ficam
		if (found.some(function (f) {
			return f.score >= 1000;
		})) {
			found = found.filter(function (f) {
				return f.score >= 1000 || f.viaCard;
			});
		}

		var seen = {};
		var matches = found.sort(function (a, b) {
			// a atração com card novo no Trello primeiro (a referência para abrir o projeto dela)
			return (b.card ? 1 : 0) - (a.card ? 1 : 0) || b.score - a.score || a.it.depth - b.it.depth || a.it.name.length - b.it.name.length;
		}).filter(function (f) {
			var key = local ? f.it.path : (f.it.isFilm ? 'f|' : '') + aepName(f.it.name);

			if (seen[key]) return false;

			seen[key] = true;
			return true;
		}).slice(0, 40).map(function (f) {
			return { name: f.it.name, tipo: local ? 'PASTAS' : f.it.isFilm ? 'FILME' + (f.it.year ? ' · ' + f.it.year : '') : f.it.cat || 'ATRAÇÕES', path: f.it.path, out: f.it.out || '', display: displayPath(f.it.path), score: f.score, isFilm: !!f.it.isFilm, year: f.it.year || '', trello: f.card };
		});

		return { claquete: aepName(claq), matches: matches, cards: local ? [] : source.cards || [] };
	}

	// Os tipos de projeto (configuração > PROJETO): o caminho de cada um, com tokens. o que não pode ser
	// acessada (rede fora ou modo local) vai para a pasta dos projetos deste computador: {categoria}/{atracao}
	function tipoBase(c, fallback) {
		var pattern = c.reachable ? c.path : String(fallback || '~/Desktop').replace(/[\\\/]+$/, '') + '/{tipo}/{atracao}';
		var fixed = pattern.split('{')[0].replace(/[\\\/][^\\\/]*$/, '');

		return { label: c.name, icon: c.icon, pattern: pattern, outPattern: c.reachable ? c.output || '' : '', filePattern: c.file || '', path: fixed, display: displayPath(fixed), offline: !c.reachable };
	}

	// O caminho do tipo com os tokens trocados: {atracao} {ano} {mes} {mes_extenso} {proximo_mes} {proximo_mes_num}
	// {ano_proximo_mes} (o ano do próximo mês, ou o escolhido n'O PROJETISTA) {categoria}
	// {letra}. os meses por extenso como os nomes de pasta: em maiúsculas, sem acento (MARCO)
	var MONTHS = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

	// o ano do projeto: o de agora, ou o escolhido n'O PROJETISTA (o BBB do ano que vem começa antes)
	var yearOverride = 0;

	function projectYear() {
		return yearOverride || new Date().getFullYear();
	}

	function setYear(y) {
		yearOverride = y && +y !== new Date().getFullYear() ? +y : 0;
	}

	// um caminho que já existe (o do índice) no ano escolhido: 2026 → 2027 e, num nome de pasta, 26 → 27 (BBB 26)
	function shiftYear(path) {
		var now = new Date().getFullYear();
		var to = projectYear();

		if (!path || to === now) return path;

		return String(path).split(/([\\\/])/).map(function (seg) {
			return seg.replace(new RegExp('(^|[^0-9])' + now + '(?![0-9])', 'g'), '$1' + to).replace(new RegExp('(^|[\\s_\\-])' + String(now).slice(2) + '(?![0-9A-Za-z])', 'g'), '$1' + String(to).slice(2));
		}).join('');
	}

	// year: o ano de produção do filme ({ano_producao}); sem ele, o token sai junto dos parênteses (e do espaço antes)
	// month: o mês do card do Trello ({ index: 0-11, year }), que vale mais que a data de hoje (monthOf): JANEIRO NA
	// GLOBO → os tokens de mês e de ano são os de janeiro (o próximo)
	function fillPattern(pattern, name, tipo, year, month) {
		var d = new Date();

		year = /^\d{4}$/.test(String(year || '')) ? String(year) : '';
		if (!year) pattern = String(pattern || '').replace(/\s*[\(\[]\s*\{ano_producao\}\s*[\)\]]/g, '').replace(/\s*\{ano_producao\}/g, '');

		var values = { atracao: aepName(name), ano: String(projectYear()), mes: ('0' + (d.getMonth() + 1)).slice(-2), mes_extenso: MONTHS[d.getMonth()], proximo_mes: MONTHS[(d.getMonth() + 1) % 12], proximo_mes_num: ('0' + ((d.getMonth() + 1) % 12 + 1)).slice(-2), ano_proximo_mes: String(yearOverride || d.getFullYear() + (d.getMonth() === 11 ? 1 : 0)), tipo: aepName(tipo), categoria: aepName(tipo), letra: letterOf(name), ano_producao: year };

		if (month && month.index >= 0) {
			var num = ('0' + (month.index + 1)).slice(-2);

			values.ano = values.ano_proximo_mes = String(month.year);
			values.mes = values.proximo_mes_num = num;
			values.mes_extenso = values.proximo_mes = MONTHS[month.index];
		}

		return pattern.replace(/\{(\w+)\}/g, function (all, key) {
			return values[key] != null ? values[key] : all;
		});
	}

	// os tipos de projeto da equipe (configuração > PROJETO); sem nenhum, a pasta é livre (escolher a pasta…)
	async function newBases() {
		var cfg = null;

		try {
			cfg = await call('projectTypes');
		} catch (err) { }

		return (cfg && cfg.tipos || []).map(function (c) {
			return tipoBase(c, cfg.fallback);
		});
	}

	// o mês escrito numa claquete (JANEIRO NA GLOBO, MOOD MARÇO 2027) → { index, year } ou null. sem o ano escrito, o
	// próximo daquele mês: em dezembro, JANEIRO é o do ano que vem; o mês de agora (ou o anterior) é deste ano
	function monthOf(text) {
		var words = aepName(text).split(' ');
		var index = -1;

		words.some(function (w) {
			index = MONTHS.indexOf(w);
			return index >= 0;
		});
		if (index < 0) return null;

		var typed = /\b(20\d\d)\b/.exec(aepName(text));
		var now = new Date();
		var year = now.getFullYear() + (index < now.getMonth() - 1 ? 1 : 0);

		return { index: index, year: typed ? Number(typed[1]) : year };
	}

	// a mesma regra do host: a primeira letra do título sem o artigo, ou # para números
	function letterOf(title) {
		var words = aepName(title).split(' ');

		if (words.length > 1 && ['O', 'A', 'OS', 'AS', 'UM', 'UMA', 'UNS', 'UMAS', 'THE', 'AN'].indexOf(words[0]) >= 0) words.shift();

		var c = (words[0] || '').charAt(0);

		return /[A-Z]/.test(c) ? c : '#';
	}


	/* ---------------------------------------------------------------
	   a atração nova: o caminho do tipo com os tokens trocados (sem tipo: dentro da pasta escolhida)
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

	// o ícone do tipo da atração (aba TIPOS DE PROJETO), ou a pasta
	function iconFor(match, bases) {
		var base = (bases || []).filter(function (b) {
			return b.label && match.tipo && aepName(b.label) === aepName(match.tipo);
		})[0];

		return (base && PAD_UTIL.tipoIcon(base.icon)) || ICONS.folder;
	}

	/* ---------------------------------------------------------------
	   o seletor: o campo, os cartões (as achadas e a "nova atração") e a nova (nome + tipo) embaixo.
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
	var PREF_BASE = 'pad.project.base'; // o último tipo de uma atração nova (o mesmo da janela de projeto)

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
		select.setAttribute('aria-label', 'Tipo de projeto');
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
					var icon = value === 'pick' ? ICONS.search : (base && PAD_UTIL.tipoIcon(base.icon)) || ICONS.folder;

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
					list.appendChild(comboRow(iconFor(m, st.bases), m.name.toUpperCase(), m.tipo || '', st.choice === 'm' + i, function () {
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
		aepFileName: aepFileName,
		recentFilms: recentFilms,
		nodeFs: nodeFs,
		displayPath: displayPath,
		find: findAttractions,
		candidates: candidates,
		tipos: newBases,
		fillPattern: fillPattern,
		monthOf: monthOf,
		projectYear: projectYear,
		setYear: setYear,
		shiftYear: shiftYear,
		letterOf: letterOf,
		resolveNew: resolveNew,
		iconFor: iconFor,
		LIST_MAX: LIST_MAX,
		PREF_BASE: PREF_BASE,
		pref: pref,
		row: comboRow,
		group: group,
		sep: sep,
		resize: resize,
		pathTail: pathTail,
		mode: function () {
			return source.info ? source.info.mode : '';
		},
		// no modo local: 'modo local · cópia do índice de …' (a cópia em uso na última busca); fora dele, ''
		copyNote: function () {
			return source.copyNote;
		},
		picker: picker
	};
})();
