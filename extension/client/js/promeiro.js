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
  - com a chave ligada, o grupo NO TRELLO da claquete lê as Produções em Entrada e Produzindo:
    GET /api/padeiro/producoes → { trello: [...] }, no mesmo formato do índice do buscar (docs/webhook-trello.md).

  - o aviso do Padeiro (jmbillard/TEXTAO#141): abrir ou criar o projeto pelo card ou pela Produção do NO TRELLO, ou
    por um filme, avisa o PROMeiro (faz o mesmo que o Peguei): POST /api/padeiro/aviso { aviso, abertoEm, producao |
    card | filme }. `aviso` é o identificador (o mesmo, de novo, não grava duas vezes) e `abertoEm`, a hora da
    abertura. O aviso entra primeiro na fila deste computador (host/promeiro.jsx, promeiro-fila.json) e sai dela
    quando o PROMeiro responde; sem rede, ou com o PROMeiro fora do ar, fica para depois: a fila é reenviada ao abrir
    a barra e a claquete e, com a barra aberta, de tempos em tempos (flush). Nada disso espera a rede para seguir.

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

		var done = [];
		var sent = 0;

		// a chave pendente não avisa (o PROMeiro recusa): a fila sai. sem o endereço ou no modo local, ela fica
		if (s.estado === 'pendente') {
			done = list.map(function (x) {
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
					res = await request(s.url, 'POST', '/api/padeiro/aviso', s.chave, { aviso: x.aviso, abertoEm: x.abertoEm, producao: x.producao || undefined, card: x.card || undefined, filme: x.filme || undefined });
				} catch (err) {
					break; // sem rede (ou o PROMeiro não respondeu a tempo): o resto fica para depois
				}

				// entregue (ou repetido: já tinha chegado), ou recusado de vez (mal feito, a Produção que não existe, a chave que
				// não vale para ele): sai da fila. o resto (o PROMeiro ou o Trello com problema) tenta de novo depois
				if (res.status === 200) sent++;
				if (res.status === 200 || res.status === 400 || res.status === 404 || res.status === 401 || res.status === 403) done.push(x.aviso);
				if (res.status === 401 || res.status === 403) cache.at = 0;
			}
		}

		var left = list.length - done.length;

		if (done.length) left = (await call('promeiroQueueDrop', { avisos: done })).itens;

		return { sent: sent, left: left };
	}

	// o texto do estado, para a configuração e o aviso da barra
	function describe(s) {
		if (!s) return '';
		if (s.estado === 'ligada') return 'ligada' + (s.designer ? ' a ' + s.designer : '') + ': o NO TRELLO da claquete vem das Produções do PROMeiro.';
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
		describe: describe
	};
})();
