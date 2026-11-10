/*

---------------------------------------------------------------
> versão do .aep — o lado do painel (Node)
---------------------------------------------------------------

Um .aep de uma versão mais nova do After Effects não abre nem importa numa versão mais velha. A versão fica num
byte do cabeçalho RIFX (posição 33: 0x5B é o AE 20 (2020), 0x60 o AE 25 (2025), um a mais por versão): aqui o
arquivo é copiado com esse byte trocado para a versão que está rodando, e o After Effects abre a cópia. O resto do
arquivo fica igual, então efeitos ou recursos que só existem na versão nova podem faltar ou dar aviso ao abrir.
(o mesmo que o AEP-Downgrader e o AESHIFT fazem, GPL-3.0)

  PAD_AEPVERSION.available()                 → há Node (no navegador de teste, não)
  PAD_AEPVERSION.read(path)                  → { major } (a versão do arquivo)
  PAD_AEPVERSION.convert(path, major, dest)  → Promise { path, from, to, converted } (dest: a pasta da cópia;
                                               sem ela, a pasta temporária. arquivo da mesma versão ou mais velho
                                               não é copiado: path é o original). vale para .aep e .aet: a cópia
                                               fica com a mesma extensão e o sufixo _AE<versão>; já existindo, é
                                               substituída. O VERSIONADOR usa o mesmo para salvar o projeto aberto
                                               em versões mais velhas (a partir do AE 20)

*/

(function () {
	'use strict';

	var fs = null;
	var nodePath = null;
	var os = null;

	try {
		if (typeof require === 'function') {
			fs = require('fs');
			nodePath = require('path');
			os = require('os');
		}
	} catch (err) { }

	var OFFSET = 33;
	var BASE = 0x5b; // AE 20
	var FIRST = 20;

	function available() {
		return !!fs;
	}

	function headerOf(path) {
		var fd = fs.openSync(path, 'r');
		var head = Buffer.alloc(OFFSET + 1);

		try {
			fs.readSync(fd, head, 0, head.length, 0);
		} finally {
			fs.closeSync(fd);
		}

		if (head.toString('latin1', 0, 4) !== 'RIFX') throw new Error('#PAD_100 - versão: ' + nodePath.basename(path) + ' não é um projeto do After Effects (.aep / .aet).');

		return head;
	}

	function read(path) {
		var major = headerOf(path)[OFFSET] - BASE + FIRST;

		if (major < FIRST || major > 60) throw new Error('#PAD_100 - versão: não deu para ler a versão de ' + nodePath.basename(path) + '.');

		return { major: major };
	}

	async function convert(path, major, dest) {
		var from = read(path).major;
		var ext = (nodePath.extname(path) || '.aep').toLowerCase();
		var name = nodePath.basename(path, nodePath.extname(path)).replace(/_AE\d+$/i, ''); // sem o sufixo de uma conversão anterior

		if (from <= major) return { path: path, from: from, to: from, converted: false };

		var folder = dest || nodePath.join(os.tmpdir(), 'padeiro-aep');

		await fs.promises.mkdir(folder, { recursive: true });

		var out = nodePath.join(folder, name + '_AE' + major + ext);
		var data = await fs.promises.readFile(path);

		data[OFFSET] = BASE + major - FIRST;
		await fs.promises.writeFile(out + '.tmp', data);
		await fs.promises.rename(out + '.tmp', out);

		return { path: out, from: from, to: major, converted: true };
	}

	window.PAD_AEPVERSION = { available: available, read: read, convert: convert, FIRST: FIRST };
})();
