/*

---------------------------------------------------------------
> índice local da busca de caminhos (configuração > buscar, neste computador)
---------------------------------------------------------------

Lê as pastas escolhidas e todas as subpastas pelo Node do painel (sem travar o After Effects) e guarda o
índice neste computador. Usado pelo acessorista (busca), pela janela PROJETO (claquete) e pela configuração
(indexar agora).

Arquivo (indice_local.json, na pasta de dados do usuário):
  { v: 'local', generated, roots: [caminho, ...], count, n: [[pai, nome, arquivo?], ...] }
  cada item aponta para o pai pela posição na lista (-1 = é uma das pastas escolhidas, com o caminho
  completo no nome): o caminho de cada um é montado subindo pelos pais.

PAD_LOCAL_INDEX.available()                    → o Node está disponível (no navegador de teste, não)
PAD_LOCAL_INDEX.build(file, folders, opts)     → Promise { count }   opts: { foldersOnly, onProgress(count, path) }
PAD_LOCAL_INDEX.load(file)                     → { generated, count, roots, items: [{ name, path, depth, file }] } ou null
PAD_LOCAL_INDEX.info(file)                     → { exists, generated, count, bytes } (sem montar os caminhos)
PAD_LOCAL_INDEX.building(file)                 → já tem uma indexação em andamento (de outra janela)

*/

(function () {
	'use strict';

	var CONCURRENCY = 8; // pastas lidas ao mesmo tempo (servidor de rede: poucas por vez)
	var LOCK_AGE = 10 * 60 * 1000; // um .part mais velho que isso é de uma indexação que não terminou

	function node() {
		try {
			return typeof require === 'function' ? { fs: require('fs'), path: require('path') } : null;
		} catch (err) {
			return null;
		}
	}

	// pastas do sistema e escondidas ficam de fora
	function skip(name) {
		return /^[.$~]/.test(name) || /^(#recycle|#snapshot|@eaDir|System Volume Information|RECYCLER|\$RECYCLE\.BIN|lost\+found)$/i.test(name);
	}

	function available() {
		return !!node();
	}

	function building(file) {
		var api = node();

		try {
			var st = api.fs.statSync(file + '.part');

			return Date.now() - st.mtimeMs < LOCK_AGE;
		} catch (err) {
			return false;
		}
	}

	// /Volumes/VFX/... → o volume (VFX, VFX-1 … VFX-5) onde a pasta existe; sem nenhum, o caminho como está
	function mountedDir(api, dir) {
		var m = /^\/Volumes\/([^\/]+)(\/.*)?$/.exec(dir);

		if (!m) return dir;

		for (var i = 0; i <= 5; i++) {
			var candidate = '/Volumes/' + m[1] + (i ? '-' + i : '') + (m[2] || '');

			try {
				if (api.fs.statSync(candidate).isDirectory()) return candidate;
			} catch (err) { }
		}

		return dir;
	}

	function build(file, folders, opts) {
		var api = node();

		opts = opts || {};

		if (!api) return Promise.reject(new Error('o índice local precisa do painel no After Effects'));

		var nodes = [];
		var queue = [];
		var running = 0;
		var lastReport = 0;

		(folders || []).forEach(function (root) {
			var clean = String(root || '').trim();

			clean = clean.replace(/[\\/]+$/, '') || clean; // sem a barra do fim (a raiz '/' fica)

			if (!clean) return;

			// gravado sem o sufixo do volume (/Volumes/VFX-1 → VFX); lido no volume onde a pasta existe
			clean = clean.replace(/^(\/Volumes\/[^\/]+?)-[1-5](?=\/|$)/i, '$1');
			nodes.push([-1, clean, 0]);
			queue.push({ dir: mountedDir(api, clean), index: nodes.length - 1 });
		});

		return new Promise(function (resolve, reject) {
			function report(path) {
				if (opts.onProgress && nodes.length - lastReport >= 250) {
					lastReport = nodes.length;
					opts.onProgress(nodes.length, path);
				}
			}

			function finish() {
				var text = JSON.stringify({ v: 'local', generated: new Date().toISOString(), roots: folders, count: nodes.length, n: nodes });

				try {
					api.fs.writeFileSync(file + '.part', text, 'utf8');
					api.fs.renameSync(file + '.part', file);
				} catch (err) {
					reject(err);
					return;
				}

				if (opts.onProgress) opts.onProgress(nodes.length, '');
				resolve({ count: nodes.length });
			}

			function next() {
				if (!queue.length && !running) {
					finish();
					return;
				}

				while (running < CONCURRENCY && queue.length) {
					var job = queue.shift();

					running++;
					api.fs.readdir(job.dir, { withFileTypes: true }, (function (job) {
						return function (err, entries) {
							running--;

							if (!err) {
								entries.forEach(function (entry) {
									if (skip(entry.name)) return;

									if (entry.isDirectory()) {
										nodes.push([job.index, entry.name, 0]);
										queue.push({ dir: api.path.join(job.dir, entry.name), index: nodes.length - 1 });
									} else if (!opts.foldersOnly && entry.isFile()) {
										nodes.push([job.index, entry.name, 1]);
									}
								});
								report(job.dir);
							}

							next();
						};
					})(job));
				}
			}

			// marca que está indexando (outra janela não começa outra ao mesmo tempo)
			try {
				api.fs.writeFileSync(file + '.part', '', 'utf8');
			} catch (err) { }

			next();
		});
	}

	function read(file) {
		var api = node();

		if (!api) return null;

		try {
			var data = JSON.parse(api.fs.readFileSync(file, 'utf8'));

			return data && data.v === 'local' ? data : null;
		} catch (err) {
			return null;
		}
	}

	function load(file) {
		var data = read(file);

		if (!data) return null;

		var paths = new Array(data.n.length);
		var depths = new Array(data.n.length);
		var items = [];

		data.n.forEach(function (n, i) {
			var parent = n[0];

			paths[i] = parent < 0 ? n[1] : paths[parent] + '/' + n[1];
			depths[i] = parent < 0 ? 0 : depths[parent] + 1;
			items.push({ name: parent < 0 ? n[1].replace(/[\\/]+$/, '').split(/[\\/]/).pop() : n[1], path: paths[i].replace(/\\/g, '/'), depth: depths[i], file: n[2] === 1 });
		});

		return { generated: data.generated, count: data.count, roots: data.roots || [], items: items };
	}

	function info(file) {
		var api = node();

		if (!api) return { exists: false };

		try {
			var st = api.fs.statSync(file);
			var data = read(file);

			return { exists: true, generated: data ? data.generated : st.mtime.toISOString(), count: data ? data.count : 0, bytes: st.size };
		} catch (err) {
			return { exists: false };
		}
	}

	// o navegador de teste (mock-host) pode trazer um índice de mentira
	if (!window.PAD_LOCAL_INDEX) window.PAD_LOCAL_INDEX = { available: available, build: build, load: load, info: info, building: building };
})();
