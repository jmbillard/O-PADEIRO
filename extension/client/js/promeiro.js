/*

---------------------------------------------------------------
> o PROMeiro — a chave do Padeiro e as Produções (jmbillard/TEXTAO#140)
---------------------------------------------------------------

O Padeiro fala com o PROMeiro por um caminho só dele, embaixo de /api/padeiro/, com a chave do Padeiro no cabeçalho
X-Chave-Do-Padeiro (o resto do PROMeiro fica atrás do login, que o After Effects não tem):

  - na primeira vez (sem chave guardada), pede a chave: POST /api/padeiro/cadastro { usuario, computador, sistema,
    sigla } → { chave, estado: 'pendente' }. A chave fica nas configurações deste computador (host/promeiro.jsx);
  - depois, confere o estado: GET /api/padeiro/eu → { estado: pendente | ligada | revogada, designer }. A chave que o
    PROMeiro não conhece mais (401) ou revogada pede outra, que volta a ficar pendente;
  - com a chave ligada, o grupo NO TRELLO d'O PROJETISTA lê as Produções em Entrada e Produzindo:
    GET /api/padeiro/producoes → { trello: [...] }, no mesmo formato do índice do buscar (docs/webhook-trello.md).

  - o aviso do Padeiro (jmbillard/TEXTAO#141): abrir ou criar o projeto pelo card ou pela Produção do NO TRELLO, ou
    por um filme, avisa o PROMeiro (faz o mesmo que o Peguei): POST /api/padeiro/aviso { aviso, abertoEm, producao |
    card | filme }. `aviso` é o identificador (o mesmo, de novo, não grava duas vezes) e `abertoEm`, a hora da
    abertura. O aviso entra primeiro na fila deste computador (host/promeiro.jsx, promeiro-fila.json) e sai dela
    quando o PROMeiro responde; sem rede, ou com o PROMeiro fora do ar, fica para depois: a fila é reenviada ao abrir
    a barra e O PROJETISTA e, com a barra aberta, de tempos em tempos (flush). Nada disso espera a rede para seguir.

  - a janela PROMeiro · produções (#148, promeiro.html): com a chave ligada, lê a lista (a mesma rota, com o
    "pronto para abrir" de cada Produção) e a Produção aberta: GET /api/padeiro/producoes/<id>. Com a pendente, o
    PROMeiro recusa (403 { estado: 'pendente' }) e a janela mostra só o aviso.
    As ações dela (#149): pegar é o aviso (take); marcar a arte, o fogo, entregar, voltar e desfazer são
    POST /api/padeiro/<rota> { acao, feitaEm, … } (windowAction), só com a chave ligada.
    Sem rede (#150), todas elas vão pela fila dos avisos, a mesma: cada uma entra com o identificador (`acao`) e a hora
    certa (`feitaEm`) e a fila manda em ordem quando a rede volta. A resposta (200, ou a recusa de vez: 400, 401, 403,
    404, 409) tira da fila; o PROMeiro fora do ar (502, 503) ou sem rede deixa ela e o que vem depois para a próxima vez,
    para não passar à frente. A recusa de vez de uma ação da janela que ninguém está esperando fica guardada no host
    (promeiroRecusadas) para a janela mostrar ao designer.

Sem o endereço do PROMeiro na configuração (aba BUSCAR), no modo local, com a chave pendente ou com o PROMeiro fora do
ar, nada muda: o NO TRELLO continua vindo do webhook do n8n. Quem fala é o Node do painel (sem travar o After
Effects); no navegador de teste, o fetch. Nenhuma falha daqui aparece como erro: o Padeiro segue como antes.
→ window.PAD_PROMEIRO

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;
	var TIMEOUT = 8000; // o PROMeiro que não responde nesse tempo está fora do ar (vale o webhook)
	var FRESH = 60000; // o estado lido vale 1 min (o painel fica aberto o dia todo: a chave aprovada aparece sozinha)
	var cache = { state: null, at: 0, loading: null };

	function nodeRequire(name) {
		try {
			return typeof require === 'function' ? require(name) : null;
		} catch (err) {
			return null;
		}
	}

	// um pedido ao PROMeiro → { status, body } (o corpo em JSON, ou null). rejeita sem rede ou sem resposta a tempo
	function request(base, method, path, key, body) {
		// o modo de teste da janela PROMeiro · produções (mock-host.js, '?mock=janela'): o PROMeiro de mentira responde
		if (window.PAD_MOCK_PROMEIRO) {
			return new Promise(function (resolve) {
				setTimeout(resolve, 120);
			}).then(function () {
				return window.PAD_MOCK_PROMEIRO(method, path, key, body);
			});
		}

		var url = base.replace(/\/+$/, '') + path;
		var text = body ? JSON.stringify(body) : '';
		var headers = { Accept: 'application/json' };

		if (key) headers['X-Chave-Do-Padeiro'] = key;
		if (body) headers['Content-Type'] = 'application/json';

		var http = nodeRequire(/^https:/i.test(url) ? 'https' : 'http');

		if (!http) return browserRequest(url, method, headers, text);

		headers['User-Agent'] = 'O PADEIRO';
		if (body) headers['Content-Length'] = Buffer.byteLength(text);

		return new Promise(function (resolve, reject) {
			var req = http.request(url, { method: method, headers: headers, timeout: TIMEOUT }, function (res) {
				var chunks = [];

				res.on('data', function (c) {
					chunks.push(c);
				});
				res.on('error', reject);
				res.on('end', function () {
					var parsed = null;

					try {
						parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
					} catch (err) { }

					resolve({ status: res.statusCode, body: parsed });
				});
			});

			req.on('timeout', function () {
				req.destroy(new Error('tempo esgotado'));
			});
			req.on('error', reject);
			if (text) req.write(text);
			req.end();
		});
	}

	// no navegador de teste (sem o Node do painel)
	function browserRequest(url, method, headers, text) {
		var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
		var timer = ctrl ? setTimeout(function () {
			ctrl.abort();
		}, TIMEOUT) : null;

		return fetch(url, { method: method, headers: headers, body: text || undefined, signal: ctrl ? ctrl.signal : undefined }).then(function (res) {
			return res.text().then(function (t) {
				var parsed = null;

				try {
					parsed = JSON.parse(t);
				} catch (err) { }

				return { status: res.status, body: parsed };
			});
		}).finally(function () {
			clearTimeout(timer);
		});
	}

	// pede uma chave nova (a primeira, ou no lugar da que não vale mais) e guarda neste computador
	async function register(info) {
		var res = await request(info.url, 'POST', '/api/padeiro/cadastro', '', { usuario: info.usuario, computador: info.computador, sistema: info.sistema, sigla: info.sigla });

		if (res.status !== 201 || !res.body || !res.body.chave) return { estado: 'fora' };

		await call('promeiroSave', { url: info.url, chave: res.body.chave, estado: res.body.estado || 'pendente', designer: '' });

		return { estado: res.body.estado || 'pendente', chave: res.body.chave, designer: '' };
	}

	// o estado da chave deste computador, lido do PROMeiro (pede a chave quando falta ou não vale mais)
	async function load() {
		var info = await call('promeiroInfo');

		if (!info.url || info.local) return { estado: 'desligado', url: info.url || '', local: !!(info.url && info.local) };

		// sem chave: confere de novo, um instante depois, antes de pedir outra (outra janela pode estar gravando a dela
		// agora mesmo; o cadastro de novo, com a chave ligada, viraria um pedido novo, pendente)
		if (!info.chave) {
			await new Promise(function (resolve) {
				setTimeout(resolve, 700);
			});
			info = await call('promeiroInfo');
		}

		var done;

		try {
			if (!info.chave) {
				done = await register(info);
			} else {
				var res = await request(info.url, 'GET', '/api/padeiro/eu', info.chave);
				var estado = res.body && res.body.estado;

				// a chave que o PROMeiro não conhece (trocada por outro cadastro, apagada) ou revogada: pede outra
				if (res.status === 401 || (res.status === 200 && estado === 'revogada')) {
					done = await register(info);
				} else if (res.status === 200 && estado) {
					var designer = res.body.designer && res.body.designer.nome ? String(res.body.designer.nome) : '';

					if (estado !== info.estado || designer !== info.designer) await call('promeiroSave', { url: info.url, chave: info.chave, estado: estado, designer: designer });
					done = { estado: estado, chave: info.chave, designer: designer };
				} else {
					// a tela de login do Access (o caminho sem o Bypass), um erro do servidor: como fora do ar
					done = { estado: 'fora', chave: info.chave, designer: info.designer, ultimo: info.estado };
				}
			}
		} catch (err) {
			done = { estado: 'fora', chave: info.chave, designer: info.designer, ultimo: info.estado };
		}

		done.url = info.url;

		return done;
	}

	// → { estado: 'desligado' | 'pendente' | 'ligada' | 'fora', designer, url, ultimo } (ultimo: o estado guardado,
	// quando o PROMeiro não respondeu). um pedido por vez; o estado lido vale FRESH (force: lê de novo)
	function state(force) {
		if (cache.loading) return cache.loading;
		if (!force && cache.state && Date.now() - cache.at < FRESH) return Promise.resolve(cache.state);

		cache.loading = load().catch(function () {
			return { estado: 'fora', url: '' };
		}).then(function (s) {
			cache.state = s;
			cache.at = Date.now();

			return s;
		}).finally(function () {
			cache.loading = null;
		});

		return cache.loading;
	}

	// as Produções em Entrada e Produzindo, no formato `trello` do índice do buscar → a lista, ou null (sem a chave
	// ligada ou com o PROMeiro fora do ar: vale o webhook)
	async function productions() {
		var s = await state();

		if (s.estado !== 'ligada') return null;

		try {
			var res = await request(s.url, 'GET', '/api/padeiro/producoes', s.chave);

			if (res.status === 200 && res.body && res.body.trello instanceof Array) return res.body.trello;

			// a chave mudou de estado no meio do caminho (revogada, ou um cadastro novo pendente): lê de novo na próxima
			if (res.status === 401 || res.status === 403) cache.at = 0;
		} catch (err) { }

		return null;
	}

	/* ---------------------------------------------------------------
	   a janela PROMeiro · produções (jmbillard/TEXTAO#148)
	   --------------------------------------------------------------- */

	// lê uma rota da janela (a lista ou a Produção). Só a chave ligada lê: a pendente recebe 403 { estado: 'pendente' }
	// e a janela mostra só o aviso. A chave que deixou de valer (401, revogada) pede outra pelo state (volta pendente).
	// force: confere o estado da chave de novo (a pendente que foi ligada aparece sem esperar o FRESH)
	// → { estado: 'ligada', designer, corpo } | { estado: 'ligada', naoExiste: true } (404) |
	//   { estado: 'pendente' | 'desligado' | 'fora', local }
	async function read(path, force) {
		var s = await state(force);

		if (s.estado !== 'ligada') return { estado: s.estado, local: !!s.local };

		var res;

		try {
			res = await request(s.url, 'GET', path, s.chave);
		} catch (err) {
			return { estado: 'fora' };
		}

		if (res.status === 200 && res.body) return { estado: 'ligada', designer: s.designer || '', corpo: res.body };
		if (res.status === 404) return { estado: 'ligada', designer: s.designer || '', naoExiste: true };
		if (res.status === 403 && res.body && res.body.estado === 'pendente') {
			cache.at = 0;

			return { estado: 'pendente' };
		}

		if (res.status === 401 || res.status === 403) {
			var again = await state(true);

			return { estado: again.estado === 'ligada' ? 'fora' : again.estado, local: !!again.local };
		}

		return { estado: 'fora' };
	}

	/* ---------------------------------------------------------------
	   as ações da janela (jmbillard/TEXTAO#149)
	   --------------------------------------------------------------- */

	// o estado da chave para agir: a ligada, ou a última lida ligada quando o PROMeiro não responde agora (sem rede, a
	// ação vai para a fila e segue quando a rede voltar)
	function canAct(s) {
		return s.estado === 'ligada' || (s.estado === 'fora' && s.ultimo === 'ligada');
	}

	// põe a ação na fila e manda, esperando a resposta. Com outras guardadas na fila e a rede fora (o último pedido
	// não chegou), não espera: a ação fica atrás delas, sem segurar a janela. → { status, corpo } | { guardado } |
	// { enviado } (outra janela mandou: a resposta ficou com ela) | { erro }
	async function enqueue(item, semRede) {
		var added = null;
		var busy = !!flushing;

		try {
			added = await call('promeiroQueueAdd', item);
		} catch (err) { }

		if (!added || !added.queued) return { erro: 'a ação não entrou na fila deste computador.' };

		waiting[item.aviso] = true;

		try {
			if (added.itens > 1 && (semRede || offline)) {
				flush();

				return { guardado: true };
			}

			// um envio da fila já em curso (de antes desta ação) não leva ela: manda de novo
			await flush(true);
			if (busy && !answers[item.aviso]) await flush(true);

			var r = answers[item.aviso];

			delete answers[item.aviso];
			if (r) return { status: r.status, corpo: r.corpo || {} };

			var left = [];

			try {
				left = (await call('promeiroQueue')).itens || [];
			} catch (err) { }

			return left.some(function (x) {
				return x.aviso === item.aviso;
			}) ? { guardado: true } : { enviado: true };
		} finally {
			delete waiting[item.aviso];
		}
	}

	// a recusa por causa da chave (pendente, revogada, desconhecida): o estado é lido de novo
	async function keyRefused(res) {
		cache.at = 0;

		var again = await state(true);

		if (res.corpo && res.corpo.estado === 'pendente') return 'pendente';

		return again.estado === 'ligada' ? 'fora' : again.estado;
	}

	// uma ação da janela: POST /api/padeiro/<rota> (arte, fogo, entregar, voltar, desfazer), com o identificador da ação
	// e a hora, pela fila (#150). Só a chave ligada age: a pendente recebe 403 { estado: 'pendente' }. info: { claq }
	// (só para a janela dizer qual ação foi recusada, se for depois).
	// → { estado: 'ligada', status, corpo, acao } | { estado: 'ligada', guardado: true, acao } (sem rede: na fila) |
	//   { estado: 'ligada', enviado: true, acao } | { estado: 'ligada', erro } |
	//   { estado: 'pendente' | 'desligado' | 'fora' }
	async function windowAction(rota, dados, info) {
		var s = await state();

		if (!canAct(s)) return { estado: s.estado, local: !!s.local };

		var d = dados || {};
		var item = { aviso: newAvisoId(), rota: rota, abertoEm: new Date().toISOString(), producao: String(d.producao || ''), card: '', filme: '', claq: String((info && info.claq) || ''), dados: {} };

		Object.keys(d).forEach(function (k) {
			if (k !== 'producao') item.dados[k] = d[k];
		});

		var r = await enqueue(item, s.estado === 'fora');

		if (r.erro) return { estado: 'ligada', erro: r.erro };
		if (r.guardado || r.enviado) return { estado: 'ligada', guardado: !!r.guardado, enviado: !!r.enviado, acao: item.aviso };
		if ((r.status === 401 || r.status === 403) && r.corpo && r.corpo.estado) return { estado: await keyRefused(r) };
		if (r.status === 401) return { estado: await keyRefused(r) };

		return { estado: 'ligada', status: r.status, corpo: r.corpo || {}, acao: item.aviso };
	}

	// pegar pela janela (Abrir projeto, Preencher templates): o aviso do Padeiro, pela fila deste computador, como ao
	// abrir pelo card, mas esperando a resposta (a caixinha diz o que aconteceu e o Desfazer usa o identificador).
	// → { aviso, status, corpo } (o PROMeiro respondeu) | { aviso, guardado: true } (sem rede ou com o PROMeiro fora do
	// ar: o aviso ficou na fila e vai depois) | { aviso, enviado: true } | { erro } (nem entrou na fila)
	async function take(producao, info) {
		var item = { aviso: newAvisoId(), rota: 'aviso', abertoEm: new Date().toISOString(), producao: String(producao || ''), card: '', filme: '', claq: String((info && info.claq) || ''), dados: {} };
		var r = await enqueue(item);

		if (r.erro) return { erro: 'o aviso não entrou na fila deste computador.' };
		if (r.guardado || r.enviado) return { aviso: item.aviso, guardado: !!r.guardado, enviado: !!r.enviado };

		return { aviso: item.aviso, status: r.status, corpo: r.corpo || {} };
	}

	// tira uma ação da fila antes de ela ir (o Desfazer sem rede, #150). Espera o envio em curso nesta janela, para
	// não tirar a que já está a caminho. → true quando ela ainda estava na fila (nada foi ao PROMeiro)
	async function unqueue(acao) {
		if (flushing) await flushing;

		try {
			return (await call('promeiroQueueDrop', { avisos: [String(acao || '')] })).tirados > 0;
		} catch (err) {
			return false;
		}
	}

	// as ações da janela recusadas de vez quando a fila foi (e ninguém esperava a resposta): a janela mostra e limpa
	async function refused() {
		try {
			return (await call('promeiroRecusadas', { limpar: true })).itens || [];
		} catch (err) {
			return [];
		}
	}

	// quantas ações e avisos estão guardados na fila deste computador, e de quais Produções
	async function queued() {
		try {
			return (await call('promeiroQueue')).itens || [];
		} catch (err) {
			return [];
		}
	}

	// a resposta do PROMeiro a cada aviso mandado pela fila (a janela espera pela das ações dela); waiting: as ações
	// que esta janela está esperando (a recusa delas vem na resposta, e não fica guardada para depois)
	var answers = {};
	var waiting = {};
	var offline = false; // o último pedido da fila não chegou ao PROMeiro (sem rede)

	// a lista da janela: as Produções em Entrada e Produzindo, cada uma com o "pronto para abrir" (pronto, estado)
	async function windowList(force) {
		var r = await read('/api/padeiro/producoes', force);

		if (r.corpo) r.lista = r.corpo.trello instanceof Array ? r.corpo.trello : [];

		return r;
	}

	// uma Produção, como a janela mostra (a praça e a etapa, a claquete, a versão em código, o estado e as artes)
	async function windowProduction(id) {
		var r = await read('/api/padeiro/producoes/' + encodeURIComponent(String(id || '')));

		if (r.corpo) r.producao = r.corpo.producao || null;

		return r;
	}

	/* ---------------------------------------------------------------
	   o aviso do Padeiro e a fila sem rede (jmbillard/TEXTAO#141)
	   --------------------------------------------------------------- */

	// um identificador novo para o aviso (letras, números e hífen: o que o PROMeiro aceita)
	function newAvisoId() {
		var rand = '';

		try {
			rand = crypto.randomUUID();
		} catch (err) {
			for (var i = 0; i < 4; i++) rand += Math.floor(Math.random() * 0x100000000).toString(16);
		}

		return 'pad-' + Date.now().toString(36) + '-' + rand;
	}

	// avisa o PROMeiro que o projeto foi aberto ou criado. target: { producao, card, filme } (um basta). o aviso entra
	// na fila (com a hora de agora) e já vai, sem esperar a resposta. → true quando ficou na fila
	async function notify(target) {
		var t = target || {};
		var item = { aviso: newAvisoId(), abertoEm: new Date().toISOString(), producao: String(t.producao || ''), card: String(t.card || ''), filme: String(t.filme || '') };

		if (!item.producao && !item.card && !item.filme) return false;

		var added = null;

		try {
			added = await call('promeiroQueueAdd', item);
		} catch (err) { }

		if (!added || !added.queued) return false;
		flush();

		return true;
	}

	var flushing = null;

	// manda a fila ao PROMeiro (um envio por vez em cada janela; outra janela mandando o mesmo aviso ao mesmo tempo não
	// duplica: o identificador é o mesmo). force: o PROMeiro estava fora do ar há pouco, mas tenta de novo
	function flush(force) {
		if (flushing) return flushing;

		flushing = sendQueue(force).catch(function () {
			return null;
		}).finally(function () {
			flushing = null;
		});

		return flushing;
	}

	// → { sent, left } (left: o que ficou na fila para depois)
	async function sendQueue(force) {
		var list = (await call('promeiroQueue')).itens || [];

		if (!list.length) return { sent: 0, left: 0 };

		var s = await state();

		if (force && s.estado === 'fora') s = await state(true);
		if (s.estado === 'fora') offline = true;

		var done = [];
		var sent = 0;
		var refusals = [];

		// a chave pendente não avisa (o PROMeiro recusa): a fila sai (as ações da janela, como recusadas). sem o endereço
		// ou no modo local, ela fica
		if (s.estado === 'pendente') {
			done = list.map(function (x) {
				if (x.rota && !waiting[x.aviso]) refusals.push(refusalOf(x, { status: 403, body: { erro: 'A chave do Padeiro está pendente: falta um administrador do PROMeiro ligar.' } }));

				return x.aviso;
			});
		} else if (s.estado === 'ligada') {
			for (var i = 0; i < list.length; i++) {
				var x = list[i];

				// o aviso de outro endereço do PROMeiro (a configuração mudou): não vale mais
				if (x.url !== s.url) {
					done.push(x.aviso);
					continue;
				}

				var res;

				try {
					res = await request(s.url, 'POST', '/api/padeiro/' + route(x), s.chave, bodyOf(x));
				} catch (err) {
					offline = true;
					break; // sem rede (ou o PROMeiro não respondeu a tempo): esta e as seguintes ficam para depois
				}

				offline = false;

				// entregue (ou repetido: já tinha chegado), ou recusado de vez (mal feito, a Produção que não existe ou já mudou,
				// a chave que não vale para ele): sai da fila. o resto (o PROMeiro ou o Trello com problema) fica, e as
				// seguintes também, para a fila não passar à frente dela
				var settled = (res.status >= 200 && res.status < 300) || (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429);

				if (!settled) break;

				answers[x.aviso] = { status: res.status, corpo: res.body };
				done.push(x.aviso);
				if (res.status === 200) sent++;
				else if (x.rota && !waiting[x.aviso]) refusals.push(refusalOf(x, res));
				if (res.status === 401 || res.status === 403) cache.at = 0;
			}
		}

		var left = list.length - done.length;

		if (done.length) left = (await call('promeiroQueueDrop', { avisos: done, recusadas: refusals })).itens;

		return { sent: sent, left: left };
	}

	// a rota de um item da fila: o aviso (sem rota: o da abertura do projeto) ou a ação da janela (#150)
	function route(x) {
		return x.rota && x.rota !== 'aviso' ? x.rota : 'aviso';
	}

	// o corpo do pedido de um item da fila
	function bodyOf(x) {
		if (route(x) === 'aviso') return { aviso: x.aviso, abertoEm: x.abertoEm, producao: x.producao || undefined, card: x.card || undefined, filme: x.filme || undefined };

		return Object.assign({}, x.dados || {}, { acao: x.aviso, feitaEm: x.abertoEm, producao: x.producao });
	}

	// a recusa de vez de uma ação da janela, para ela mostrar depois
	function refusalOf(x, res) {
		var erro = res.body && res.body.erro ? String(res.body.erro) : 'O PROMeiro recusou (' + res.status + ').';

		return { acao: x.aviso, rota: route(x), producao: x.producao || '', claq: x.claq || '', dados: x.dados || {}, status: res.status, erro: erro };
	}

	// o texto do estado, para a configuração e o aviso da barra
	function describe(s) {
		if (!s) return '';
		if (s.estado === 'ligada') return 'ligada' + (s.designer ? ' a ' + s.designer : '') + ': o NO TRELLO d\'O PROJETISTA vem das Produções do PROMeiro.';
		if (s.estado === 'pendente') return 'pendente: falta um administrador do PROMeiro aprovar a chave deste computador. até lá, tudo funciona como antes.';
		if (s.estado === 'fora') return 'o PROMeiro não respondeu: o NO TRELLO continua vindo do webhook.';

		if (s.local) return 'no modo local, nada fala com o PROMeiro: o NO TRELLO vem do webhook (a última cópia).';

		return 'sem o endereço do PROMeiro (acima), o NO TRELLO vem do webhook.';
	}

	window.PAD_PROMEIRO = {
		state: state,
		productions: productions,
		notify: notify,
		flush: flush,
		describe: describe,
		windowList: windowList,
		windowProduction: windowProduction,
		windowAction: windowAction,
		take: take,
		unqueue: unqueue,
		refused: refused,
		queued: queued
	};
})();
