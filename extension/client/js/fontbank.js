/*

---------------------------------------------------------------
> banco de fontes — o lado do painel (Node)
---------------------------------------------------------------

O host diz quais fontes o projeto usa (PADX.fontsProject); aqui, pelo Node do painel (sem travar o After
Effects), cada fonte é conferida e copiada para os dois lugares: o banco (a pasta da configuração > FONTES)
e a pasta de fontes do projeto (02 ARQUIVOS/FONTS).

No banco, cada fonte fica pelo nome PostScript: '<nome>.<ext>' e '<nome>.json' (família, estilo e as versões:
arquivo, md5, tamanho, data, quem enviou, de que máquina e projeto). Um arquivo diferente com o mesmo nome
(outra versão) vai ao lado, com a data no nome ('<nome>@20261106-1402.otf'); a mais recente é a que instala.
As cópias usam um nome temporário e são renomeadas no fim: ninguém vê um arquivo pela metade.

Estado de cada fonte (check):
  ok       instalada, no banco e na pasta do projeto
  up       instalada, mas falta no banco ou na pasta do projeto (o envio cuida)
  install  não está neste computador, mas está no banco (o resolver instala)
  nofile   não está neste computador nem no banco (trocar por outra)

  PAD_FONTBANK.available()           → há Node (no navegador de teste, não)
  PAD_FONTBANK.check(info)           → Promise { fonts: [fonte + { state, inBank, inProject, bankFile }], bankOk }
  PAD_FONTBANK.upload(info, fonte)   → Promise (copia para o que faltar)
  PAD_FONTBANK.bankFonts(bank)       → Promise [{ name, family, style, file }] (as fontes do banco, para a troca)

*/

(function () {
	'use strict';

	var fs = null;
	var nodePath = null;
	var os = null;
	var crypto = null;

	try {
		if (typeof require === 'function') {
			fs = require('fs');
			nodePath = require('path');
			os = require('os');
			crypto = require('crypto');
		}
	} catch (err) {
		fs = null;
	}

	var FONT_EXT = ['otf', 'ttf', 'ttc', 'otc', 'dfont'];
	var md5Cache = {}; // caminho → { key: mtime|tamanho, md5 }

	function available() {
		return !!fs;
	}

	function expand(p) {
		return String(p || '').replace(/^~(?=[\\\/]|$)/, os ? os.homedir() : '~');
	}

	// o nome PostScript vira nome de arquivo (normalmente já é seguro)
	function keyOf(name) {
		return String(name).replace(/[\\\/:*?"<>|\s]+/g, '_');
	}

	function p(fn) {
		return new Promise(function (resolve, reject) {
			fn(function (err, value) {
				if (err) reject(err);
				else resolve(value);
			});
		});
	}

	function stat(file) {
		return p(function (cb) {
			fs.stat(file, cb);
		}).catch(function () {
			return null;
		});
	}

	function readJson(file) {
		return p(function (cb) {
			fs.readFile(file, 'utf8', cb);
		}).then(JSON.parse).catch(function () {
			return null;
		});
	}

	// grava com nome temporário e renomeia (ninguém lê o arquivo pela metade)
	function writeJson(file, data) {
		var part = file + '.' + process.pid + '.part';

		return p(function (cb) {
			fs.writeFile(part, JSON.stringify(data, null, '\t'), 'utf8', cb);
		}).then(function () {
			return p(function (cb) {
				fs.rename(part, file, cb);
			});
		});
	}

	function copy(src, dest) {
		var part = dest + '.' + process.pid + '.part';

		return p(function (cb) {
			fs.copyFile(src, part, cb);
		}).then(function () {
			return p(function (cb) {
				fs.rename(part, dest, cb);
			});
		}).catch(function (err) {
			fs.unlink(part, function () { });
			throw err;
		});
	}

	function mkdirs(dir) {
		return p(function (cb) {
			fs.mkdir(dir, { recursive: true }, function (err) {
				cb(err && err.code !== 'EEXIST' ? err : null);
			});
		});
	}

	function md5(file) {
		return stat(file).then(function (st) {
			if (!st) return '';

			var key = st.mtimeMs + '|' + st.size;
			var hit = md5Cache[file];

			if (hit && hit.key === key) return hit.md5;

			return p(function (cb) {
				fs.readFile(file, cb);
			}).then(function (buf) {
				var sum = crypto.createHash('md5').update(buf).digest('hex');

				md5Cache[file] = { key: key, md5: sum, size: st.size };

				return sum;
			});
		});
	}

	// a extensão do arquivo; sem uma de fonte (as do Adobe Fonts são ocultas e numeradas), lida no começo dele
	function extOf(file) {
		var ext = (nodePath.extname(file).slice(1) || '').toLowerCase();

		if (FONT_EXT.indexOf(ext) >= 0 && nodePath.basename(file).charAt(0) !== '.') return Promise.resolve(ext);

		return p(function (cb) {
			fs.open(file, 'r', cb);
		}).then(function (fd) {
			var buf = Buffer.alloc(4);

			fs.readSync(fd, buf, 0, 4, 0);
			fs.closeSync(fd);

			var tag = buf.toString('latin1');

			if (tag === 'OTTO') return 'otf';
			if (tag === 'ttcf') return 'ttc';

			return 'ttf';
		}).catch(function () {
			return FONT_EXT.indexOf(ext) >= 0 ? ext : 'ttf';
		});
	}

	// o nome na pasta do projeto: o do arquivo ou, num arquivo oculto (Adobe Fonts), o nome PostScript
	function projectName(font, ext) {
		var base = nodePath.basename(font.location);

		return base.charAt(0) === '.' || FONT_EXT.indexOf((nodePath.extname(base).slice(1) || '').toLowerCase()) < 0 ? keyOf(font.name) + '.' + ext : base;
	}

	function entryFile(bank, name) {
		return nodePath.join(bank, keyOf(name) + '.json');
	}

	// a versão que instala: a mais recente que existir
	function newestFile(bank, entry) {
		var versions = entry && entry.versions ? entry.versions.slice().reverse() : [];

		for (var i = 0; i < versions.length; i++) {
			var file = nodePath.join(bank, versions[i].file);

			if (fs.existsSync(file)) return file;
		}

		return '';
	}

	async function check(info) {
		var bank = expand(info.bank);
		var projectFonts = expand(info.projectFonts);
		var bankOk = !!(bank && (await stat(bank)));
		var out = [];

		for (var i = 0; i < info.fonts.length; i++) {
			var font = Object.assign({}, info.fonts[i]);
			var entry = bankOk ? await readJson(entryFile(bank, font.name)) : null;

			font.bankFile = entry ? newestFile(bank, entry) : '';
			font.inBank = false;
			font.inProject = !projectFonts;

			if (font.location && !font.missing) {
				var sum = await md5(font.location);
				var ext = await extOf(font.location);

				font.md5 = sum;
				font.ext = ext;
				font.inBank = !!(entry && (entry.versions || []).some(function (v) {
					return v.md5 === sum;
				}));
				if (projectFonts) {
					// na pasta do projeto: o mesmo arquivo (pelo tamanho); outra versão é trocada pela que o projeto usa
					var there = await stat(nodePath.join(projectFonts, projectName(font, ext)));

					font.inProject = !!(there && md5Cache[font.location] && there.size === md5Cache[font.location].size);
				}
				font.state = (bank && !font.inBank) || !font.inProject ? 'up' : 'ok';
			} else {
				font.state = font.bankFile ? 'install' : 'nofile';
			}

			out.push(font);
		}

		return { fonts: out, bankOk: bankOk, bank: bank, projectFonts: projectFonts };
	}

	function stamp(d) {
		var two = function (n) {
			return (n < 10 ? '0' : '') + n;
		};

		return d.getFullYear() + two(d.getMonth() + 1) + two(d.getDate()) + '-' + two(d.getHours()) + two(d.getMinutes());
	}

	// copia a fonte para o banco (versão nova se o nome já existir com outro arquivo) e para a pasta do projeto
	async function upload(info, font, checked) {
		var bank = checked.bank;
		var projectFonts = checked.projectFonts;

		if (!font.location) return;

		if (projectFonts && !font.inProject) {
			await mkdirs(projectFonts);

			await copy(font.location, nodePath.join(projectFonts, projectName(font, font.ext)));
		}

		if (bank && checked.bankOk && !font.inBank) {
			var file = entryFile(bank, font.name);
			var entry = (await readJson(file)) || { name: font.name, family: font.family, style: font.style, versions: [] };
			var now = new Date();
			var name = keyOf(font.name) + (entry.versions.length ? '@' + stamp(now) : '') + '.' + font.ext;

			await copy(font.location, nodePath.join(bank, name));

			// relê antes de gravar (outra pessoa pode ter enviado outra versão no meio)
			entry = (await readJson(file)) || entry;
			entry.family = font.family || entry.family;
			entry.style = font.style || entry.style;
			entry.versions = (entry.versions || []).concat([{ file: name, md5: font.md5, size: (md5Cache[font.location] || {}).size || 0, date: now.toISOString(), user: info.user, machine: info.machine, project: info.project }]);
			await writeJson(file, entry);
		}
	}

	// as fontes do banco (para a troca): uma por nome, a versão mais recente
	async function bankFonts(bankPath) {
		var bank = expand(bankPath);
		var names = await p(function (cb) {
			fs.readdir(bank, cb);
		}).catch(function () {
			return [];
		});
		var out = [];

		for (var i = 0; i < names.length; i++) {
			if (!/\.json$/i.test(names[i]) || names[i].charAt(0) === '_') continue;

			var entry = await readJson(nodePath.join(bank, names[i]));

			if (!entry || !entry.name) continue;

			out.push({ name: entry.name, family: entry.family || '', style: entry.style || '', file: newestFile(bank, entry) });
		}

		return out;
	}

	// as trocas que a equipe já fez (fonte que faltava → a que entrou no lugar), para a sugestão
	function swapsFile(bank) {
		return nodePath.join(expand(bank), '_trocas.json');
	}

	function readSwaps(bank) {
		return bank ? readJson(swapsFile(bank)).then(function (d) {
			return d || {};
		}) : Promise.resolve({});
	}

	async function rememberSwaps(bank, swaps) {
		if (!bank || !swaps.length) return;

		var data = await readSwaps(bank);

		swaps.forEach(function (s) {
			data[s.from] = s.to;
		});

		await writeJson(swapsFile(bank), data).catch(function () { });
	}

	window.PAD_FONTBANK = {
		available: available,
		check: check,
		upload: upload,
		bankFonts: bankFonts,
		readSwaps: readSwaps,
		rememberSwaps: rememberSwaps
	};
})();
