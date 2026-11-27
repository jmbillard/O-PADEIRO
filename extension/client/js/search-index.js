/*

---------------------------------------------------------------
> o índice da busca no painel: o que o acessorista e a janela de projeto dividem
---------------------------------------------------------------

Qual índice a busca de caminhos usa (o da equipe, só a cópia no modo local, ou o índice local), quando a
configuração da busca mudou, a cópia do índice neste computador (ler, gravar, marcar como velha e a linha com a data
dela) e o download do índice pelo Node do painel.

De onde vem o índice da equipe (jmbillard/TEXTAO#143): com a chave do Padeiro ligada (js/promeiro.js), do PROMeiro
(GET /api/padeiro/buscar, com a chave no cabeçalho X-Chave-Do-Padeiro), no mesmo formato do fluxo PROMO - BUSCAR do
n8n; sem a chave, com ela pendente ou revogada, sem o endereço do PROMeiro ou no modo local, do webhook do n8n, como
antes. O PROMeiro que não dá o índice (503: sem o cadastro das atrações ou com o Teable fora; fora do ar; a chave
recusada) também cai no webhook, e sem os dois fica a cópia que já está neste computador. → window.PAD_SEARCH_INDEX

*/

(function () {
	'use strict';

	var TIMEOUT = 25000; // ms: o download do índice da equipe

	// qual índice a busca usa (searchInfo do host), o mesmo para o acessorista e a janela de projeto:
	//   'indiceLocal' → o índice local (configuração > buscar, neste computador)
	//   'copia'       → o modo local com o índice da equipe: só a cópia salva neste computador, sem a rede
	//   'equipe'      → o índice da equipe: a cópia na hora e o índice novo baixado em segundo plano
	function choice(info) {
		if (info.mode === 'local') return 'indiceLocal';
		if (info.local) return 'copia';

		return 'equipe';
	}

	// a configuração da busca (webhook ↔ índice local, modo local, outro endereço, outras pastas, outros caminhos
	// fixos): mudou com a janela aberta → a próxima busca recarrega
	function signature(info) {
		if (!info) return '';

		return [info.mode, info.local, info.url, (info.folders || []).join('|'), info.foldersOnly, JSON.stringify(info.caminhosFixos || [])].join('\n');
	}

	// a cópia para ler: a de agora (info.copia) ou, sem ela, a primeira dos nomes de antes que existir
	// (info.copiasAntigas: o host manda, da tabela de seções), até o próximo download gravar a de agora. A escolha é a
	// da tabela de seções (regras/configuracao.js: paraLer, carregada pela página antes deste arquivo)
	function copyPath(fs, info) {
		try {
			return window.PAD_CONFIGURACAO.paraLer({ arquivo: info.copia, arquivosAntigos: info.copiasAntigas || [] }, function (p) {
				return fs.existsSync(p);
			});
		} catch (err) {
			return info.copia;
		}
	}

	// → { text, modified } (text vazio: não há cópia; modified em ms)
	function readCopy(fs, info) {
		var file = copyPath(fs, info);

		try {
			if (!fs.existsSync(file)) return { text: '', modified: 0 };

			return { text: fs.readFileSync(file, 'utf8'), modified: fs.statSync(file).mtimeMs };
		} catch (err) {
			return { text: '', modified: 0 };
		}
	}

	// grava sempre a cópia com o nome de agora (a do nome antigo fica sem uso)
	function writeCopy(fs, info, text) {
		fs.writeFileSync(info.copia + '.part', text, 'utf8');
		fs.renameSync(info.copia + '.part', info.copia);
	}

	// a cópia marcada como velha: a data dela vai um dia para trás, e a próxima busca baixa o índice de novo (a janela de
	// projeto, depois de o n8n cadastrar uma atração nova: docs/webhook-projeto.md). → true quando marcou
	function markStale(fs, info) {
		var file = copyPath(fs, info);
		var old = new Date(Date.now() - 86400000);

		try {
			if (!fs.existsSync(file)) return false;
			fs.utimesSync(file, old, old);

			return true;
		} catch (err) {
			return false;
		}
	}

	// o índice do webhook: o JSON direto ({ v: 2, … }) ou embrulhado pelo n8n ([{ indice: '<o JSON em texto>' }]).
	// o 'v' é um campo do JSON da equipe (montado no n8n), não um nome do padeiro
	function unwrap(data) {
		if (typeof data === 'string') data = JSON.parse(data); // o JSON mandado como texto ("{\"v\": 2, …}")

		var item = data instanceof Array ? data[0] : data;

		if (item && typeof item.indice === 'string') return JSON.parse(item.indice);
		if (item && item.indice && typeof item.indice === 'object') return item.indice;

		return data;
	}

	// a linha do modo local: de quando é a cópia em uso (os caminhos podem estar desatualizados)
	function copyNote(generated, modified) {
		return 'modo local · cópia do índice de ' + PAD_UTIL.when(generated || (modified ? new Date(modified).toISOString() : ''));
	}

	function hasNode() {
		try {
			return typeof require === 'function' && !!require('http');
		} catch (err) {
			return false;
		}
	}

	// o erro do download, com o HTTP (0: sem resposta)
	function httpError(status) {
		var err = new Error('HTTP ' + status);

		err.status = status;

		return err;
	}

	// o GET do índice pelo Node do painel (comprimido, com redirecionamentos), sem travar o After Effects → o texto.
	// headers: os cabeçalhos a mais (a chave do Padeiro), que só seguem o redirecionamento para o mesmo endereço
	function download(url, hops, headers) {
		return new Promise(function (resolve, reject) {
			var mod = require(/^https:/i.test(url) ? 'https' : 'http');
			var sent = Object.assign({}, headers || {}, { 'Accept-Encoding': 'gzip', 'User-Agent': 'O PADEIRO' });
			var req = mod.get(url, { headers: sent, timeout: TIMEOUT }, function (res) {
				if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (hops || 0) < 3) {
					var next = new URL(res.headers.location, url);

					res.resume();
					resolve(download(next.href, (hops || 0) + 1, next.origin === new URL(url).origin ? headers : null));
					return;
				}

				if (res.statusCode !== 200) {
					res.resume();
					reject(httpError(res.statusCode));
					return;
				}

				var stream = /gzip/i.test(res.headers['content-encoding'] || '') ? res.pipe(require('zlib').createGunzip()) : res;
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

	// no navegador de teste (sem o Node do painel): o fetch, que já descomprime → o texto
	function browserDownload(url, headers) {
		var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
		var timer = ctrl ? setTimeout(function () {
			ctrl.abort();
		}, TIMEOUT) : null;

		return fetch(url, { headers: headers || {}, signal: ctrl ? ctrl.signal : undefined }).then(function (res) {
			if (res.status !== 200) throw httpError(res.status);

			return res.text();
		}).finally(function () {
			clearTimeout(timer);
		});
	}

	// de onde vem o índice da equipe: o PROMeiro com a chave ligada (#143), senão o webhook do n8n (info.url)
	// → { url, headers, promeiro }
	async function teamSource(info) {
		var p = null;

		try {
			p = window.PAD_PROMEIRO && !info.local ? await PAD_PROMEIRO.searchSource() : null;
		} catch (err) { }

		if (p) return { url: p.url, headers: p.headers, promeiro: true };

		return { url: info.url, headers: null, promeiro: false };
	}

	// baixa o índice da equipe → o texto (o JSON do PROMeiro ou do webhook). o PROMeiro primeiro (com a chave ligada);
	// se ele não der o índice (503, fora do ar, a chave recusada, fora do formato), o webhook do n8n. sem o Node do
	// painel (o navegador de teste), só o PROMeiro, pelo fetch: o webhook fica com o host (searchDownload)
	async function downloadTeam(info) {
		var src = await teamSource(info);

		if (src.promeiro) {
			try {
				var text = hasNode() ? await download(src.url, 0, src.headers) : await browserDownload(src.url, src.headers);
				var data = unwrap(JSON.parse(text));

				if (data && data.v === 2) return text; // o 'v' do JSON da equipe
			} catch (err) {
				// a chave mudou de estado no meio do caminho (revogada, ou trocada por outro cadastro): lê de novo na próxima
				if (err && (err.status === 401 || err.status === 403) && PAD_PROMEIRO.recheck) PAD_PROMEIRO.recheck();
			}
		}

		if (!hasNode()) throw new Error('sem Node');

		return download(info.url);
	}

	window.PAD_SEARCH_INDEX = {
		choice: choice,
		signature: signature,
		copyPath: copyPath,
		readCopy: readCopy,
		writeCopy: writeCopy,
		markStale: markStale,
		unwrap: unwrap,
		copyNote: copyNote,
		download: download,
		teamSource: teamSource,
		downloadTeam: downloadTeam
	};
})();
