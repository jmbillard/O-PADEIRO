/*

---------------------------------------------------------------
> REGRA — o lugar do arquivo (neste computador ou na rede)
---------------------------------------------------------------

O CATADOR separa os arquivos que estão fora da pasta do projeto em dois: os deste computador (a etiqueta "neste
computador") e os da rede ("na rede"). Esta regra diz de que lado fica um caminho. Não vai ao disco: quem chama passa o
que o sistema disse (host/coletar.jsx: o mount no Mac, o net use no Windows).

É da rede:
  - o caminho de rede, \\servidor\share\… ou //servidor/share/…;
  - no Windows, a letra do mapa de drives (K:\…) ou uma letra mapeada para a rede neste computador (o net use: M:\…
    mapeado para \\cpp-ml-sp…\PROMO_REDE). As outras (C:\, D:\, o pendrive) são deste computador;
  - no Mac, /Volumes/X quando X é um volume da rede montado (o mount: smbfs, afpfs, nfs, webdav…), um compartilhamento
    do mapa de drives (VFX, EDIT_IN_PLACE…) ou uma pasta dos caminhos do mapa (/Volumes/imagem/drive_k/…, o projeto
    feito no Windows). VFX-1 … VFX-5 (o mesmo share montado de novo) vale como VFX.
É deste computador: o disco do Mac (/Users, ~, /Volumes/Macintosh HD, as outras pastas da raiz) e o volume montado
que não é da rede (o SSD externo).

Sem saber o que está montado (o mount não respondeu: volumesDaRede ausente), o volume fora do mapa conta como da rede:
na dúvida, o arquivo não ganha a etiqueta "neste computador".

contexto: { mapa: a seção mapaDeDrives da configuração ({ drives: [{ letter, path }], shares: [{ share }] }),
            volumesDaRede: ['VFX', 'PROMO_SP'] (Mac; volumesDaRede(saída do mount)),
            letrasDaRede: ['M'] (Windows; letrasDaRede(saída do net use)) }

Regra compartilhada (ADR 0005): ES3, sem After e sem DOM. O host carrega por #include (a variável global
PAD_LUGAR_DO_ARQUIVO, usada por host/coletar.jsx) e o teste em Node por require: node extension/scripts/test-regras.js.

*/

(function (root) {
	// as pastas do disco do Mac na raiz (fora de /Volumes)
	var VOLUME = /^\/Volumes\/([^\/]+)(\/|$)/i;
	var SYSTEM_VOLUME = /^Macintosh HD$/i;
	var VOLUME_SUFFIX = /-[1-5]$/;
	// os tipos de montagem da rede no mount do macOS
	var NETWORK_MOUNT = /^(.*) on (\/Volumes\/.+) \((smbfs|afpfs|nfs|webdav|cifs|ftp)[,)]/i;

	function slashes(path) {
		return String(path == null ? '' : path).replace(/\\/g, '/').replace(/^\s+|\s+$/g, '');
	}

	function has(list, name) {
		var key = String(name).toLowerCase();

		for (var i = 0; list && i < list.length; i++) {
			if (String(list[i]).toLowerCase() == key) return true;
		}

		return false;
	}

	// os nomes que um volume da rede pode ter, pelo mapa de drives: cada compartilhamento e cada pasta dos caminhos das
	// letras (//servidor/VFX/imagem/drive_k → VFX, imagem, drive_k)
	function mapaNames(mapa) {
		var out = [];
		var i;

		if (!mapa) return out;

		for (i = 0; mapa.shares && i < mapa.shares.length; i++) out.push(mapa.shares[i].share);

		for (i = 0; mapa.drives && i < mapa.drives.length; i++) {
			var parts = slashes(mapa.drives[i].path).replace(/^\/+/, '').split('/');

			for (var p = 1; p < parts.length; p++) {
				if (parts[p]) out.push(parts[p]);
			}
		}

		return out;
	}

	function mapaLetter(mapa, letter) {
		for (var i = 0; mapa && mapa.drives && i < mapa.drives.length; i++) {
			if (String(mapa.drives[i].letter).toUpperCase() == letter) return true;
		}

		return false;
	}

	// O caminho é deste computador? false para o que é da rede (e para o caminho vazio).
	function desteComputador(path, contexto) {
		var c = contexto || {};
		var p = slashes(path);
		var m;

		if (!p) return false;
		if (/^\/\/[^\/]/.test(p)) return false; // \\servidor\share

		if ((m = /^([A-Za-z]):(\/|$)/.exec(p))) {
			var letter = m[1].toUpperCase();

			return !mapaLetter(c.mapa, letter) && !has(c.letrasDaRede, letter);
		}

		if ((m = VOLUME.exec(p))) {
			var name = m[1];
			var base = name.replace(VOLUME_SUFFIX, '');

			if (SYSTEM_VOLUME.test(name)) return true;
			if (has(c.volumesDaRede, name) || has(c.volumesDaRede, base)) return false;
			if (has(mapaNames(c.mapa), base)) return false;

			return !!c.volumesDaRede; // sem saber o que está montado: da rede
		}

		return true; // ~, /Users, /private… o disco do Mac
	}

	// Os volumes da rede montados no Mac, pela saída do /sbin/mount: ['VFX', 'PROMO_SP'] (o \040 vira espaço).
	function volumesDaRede(saidaDoMount) {
		var lines = String(saidaDoMount || '').split(/\r?\n/);
		var out = [];

		for (var i = 0; i < lines.length; i++) {
			var m = NETWORK_MOUNT.exec(lines[i]);

			if (!m) continue;

			var point = m[2].replace(/\\040/g, ' ').replace(/\/+$/, '');

			out.push(point.substring('/Volumes/'.length));
		}

		return out;
	}

	// As letras mapeadas para a rede no Windows, pela saída do net use: ['M', 'N'] (as indisponíveis também).
	function letrasDaRede(saidaDoNetUse) {
		var lines = String(saidaDoNetUse || '').split(/\r?\n/);
		var out = [];

		for (var i = 0; i < lines.length; i++) {
			var m = /^\s*\S*\s+([A-Za-z]):\s+(\\\\|\/\/)/.exec(lines[i]);

			if (m && !has(out, m[1].toUpperCase())) out.push(m[1].toUpperCase());
		}

		return out;
	}

	var api = { desteComputador: desteComputador, volumesDaRede: volumesDaRede, letrasDaRede: letrasDaRede };

	// a variável global sempre (o painel do After tem window e também module, com o Node ligado); o module.exports no Node
	root.PAD_LUGAR_DO_ARQUIVO = api;

	if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
