/*

---------------------------------------------------------------
> o índice da busca no painel: o que o acessorista e a janela de projeto dividem
---------------------------------------------------------------

Qual índice a busca de caminhos usa (o da equipe, só a cópia no modo local, ou o índice local), quando a
configuração da busca mudou, a cópia do índice neste computador (ler, gravar e a linha com a data dela) e o
download do índice pelo Node do painel. → window.PAD_SEARCH_INDEX

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

	// a cópia para ler: a de agora (info.copia) ou, sem ela, a do nome de antes (info.copiaAntiga, busca_v2.json),
	// até o próximo download gravar a de agora
	function copyPath(fs, info) {
		try {
			if (!fs.existsSync(info.copia) && info.copiaAntiga && fs.existsSync(info.copiaAntiga)) return info.copiaAntiga;
		} catch (err) { }

		return info.copia;
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

	// o GET do índice pelo Node do painel (comprimido, com redirecionamentos), sem travar o After Effects → o texto
	function download(url, hops) {
		return new Promise(function (resolve, reject) {
			var mod = require(/^https:/i.test(url) ? 'https' : 'http');
			var req = mod.get(url, { headers: { 'Accept-Encoding': 'gzip', 'User-Agent': 'O PADEIRO' }, timeout: TIMEOUT }, function (res) {
				if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (hops || 0) < 3) {
					res.resume();
					resolve(download(new URL(res.headers.location, url).href, (hops || 0) + 1));
					return;
				}

				if (res.statusCode !== 200) {
					res.resume();
					reject(new Error('HTTP ' + res.statusCode));
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

	window.PAD_SEARCH_INDEX = {
		choice: choice,
		signature: signature,
		copyPath: copyPath,
		readCopy: readCopy,
		writeCopy: writeCopy,
		unwrap: unwrap,
		copyNote: copyNote,
		download: download
	};
})();
