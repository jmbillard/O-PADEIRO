/*

---------------------------------------------------------------
> REGRA — caminhos (do caminho guardado no projeto para os lugares de hoje)
---------------------------------------------------------------

O caminho de um arquivo que falta, como o After guarda, vira a lista dos lugares onde ele pode estar hoje, do mais
provável para o menos. Não vai ao disco: quem chama confere cada um (o religar d'O CATADOR, host/coletar.jsx).

O mesmo lugar da rede aparece de muitas formas:
  - K:\3_ABERTURAS\…                                  a letra do mapa de drives;
  - \\servidor\VFX\imagem\drive_k\…                  o caminho de rede;
  - /Volumes/VFX/imagem/drive_k/…                     o Mac de hoje, com o compartilhamento VFX montado;
  - /Volumes/imagem/drive_k/… e /Volumes/drive_k/…    o projeto feito no Windows com o caminho de rede de uma
    pasta do meio (\\servidor\imagem\drive_k\…): o After do Mac troca \\servidor\x\resto por /Volumes/x/resto e a
    pasta do meio vira o nome do volume;
  - /K/… e /servidor/share/…                          o After do Mac mostrando um caminho do Windows.

O que sai, nesta ordem (sem repetir):
  1. 'direto': o próprio caminho (a letra trocada pelo caminho de rede do mapa de drives);
  2. 'mapa': o caminho de rede de cada letra do mapa de drives cujo fim é o começo do caminho guardado
     (imagem/drive_k/… → //servidor/VFX/imagem/drive_k/…). drive_<letra> fora do mapa vale pelo padrão das letras
     do mapa (drive_l → //servidor/VFX/imagem/drive_l: drive_k → //servidor/VFX/imagem/drive_k); a letra do Windows
     fora do mapa, também (K:\… → drive_k);
  3. 'compartilhamento': o caminho guardado dentro de cada compartilhamento do mapa (//servidor/VFX/imagem/…) e,
     com o nome do volume trocado, sem a primeira pasta (//servidor/VFX/drive_k/…);
  4. 'volume': no Mac, dentro dos volumes montados (volumes: os nomes em /Volumes): o volume com o nome de uma
     pasta do caminho (/Volumes/drive_k/…) e o caminho guardado dentro de cada volume.
Os caminhos de rede saem como //servidor/share/…, os de volume como /Volumes/…: o host leva para o formato do
sistema (e para o volume VFX-1 … VFX-5, se for o caso). Um caminho que não é da rede fica como está ('direto').

mapa: a seção mapaDeDrives da configuração da equipe ({ drives: [{ letter, path }], shares: [{ share, server }],
defaultServer }).

Regra compartilhada (ADR 0005): ES3, sem After e sem DOM. O host carrega por #include (a variável global
PAD_CAMINHOS, usada por host/coletar.jsx) e o teste em Node por require (module.exports):
node extension/scripts/test-regras.js.

*/

(function (root) {
	// as pastas do macOS na raiz: /Users/… não é /servidor/share/…
	var MAC_ROOTS = /^\/(Volumes|Users|Applications|System|Library|private|tmp|var|opt|usr|bin|sbin|etc|cores|dev|Network|home)\//i;
	var SYSTEM_VOLUME = /^Macintosh HD$/i;
	var DRIVE_FOLDER = /^drive_([a-z])$/i;

	function slashes(path) {
		return String(path == null ? '' : path).replace(/\\/g, '/').replace(/^\s+|\s+$/g, '');
	}

	function split(path) {
		var parts = String(path || '').split('/');
		var out = [];

		for (var i = 0; i < parts.length; i++) {
			if (parts[i] !== '') out.push(parts[i]);
		}

		return out;
	}

	// O volume sem o sufixo que o macOS põe ao montar o mesmo compartilhamento de novo (VFX-1 → VFX).
	function noSuffix(volume) {
		return String(volume).replace(/-[1-5]$/, '');
	}

	function same(a, b) {
		return String(a).toLowerCase() == String(b).toLowerCase();
	}

	// O caminho como o After do macOS mostra um caminho do Windows, de volta ao formato do Windows: /L/… → L:/…,
	// /servidor/share/… → //servidor/share/…. barras normais.
	function normalizar(path) {
		var p = slashes(path);

		if (/^\/[A-Za-z]\//.test(p)) return p.charAt(1).toUpperCase() + ':' + p.substring(2);
		if (/^\/[^\/]+\/[^\/]+\//.test(p) && !MAC_ROOTS.test(p)) return '/' + p;

		return p;
	}

	// O caminho em partes: { letra, servidor, volume, pastas (depois do servidor ou do volume, com o share ou o volume
	// na frente) } ou null (não é da rede)
	function partes(path) {
		var p = normalizar(path);
		var m;

		if ((m = /^([A-Za-z]):(\/.*)?$/.exec(p))) return { letra: m[1].toUpperCase(), pastas: split(m[2]) };
		if ((m = /^\/\/([^\/]+)\/(.+)$/.exec(p))) return { servidor: m[1], pastas: split(m[2]) };
		if ((m = /^\/Volumes\/([^\/]+)(\/.*)?$/i.exec(p)) && !SYSTEM_VOLUME.test(m[1])) return { volume: m[1], pastas: [noSuffix(m[1])].concat(split(m[2])) };

		return null;
	}

	// As letras do mapa: [{ letra, servidor, pastas: [share, …] }]
	function raizes(mapa) {
		var drives = (mapa && mapa.drives) || [];
		var out = [];

		for (var i = 0; i < drives.length; i++) {
			var m = /^\/\/([^\/]+)\/(.+)$/.exec(slashes(drives[i].path));

			if (m) out.push({ letra: String(drives[i].letter).toUpperCase(), servidor: m[1], pastas: split(m[2]) });
		}

		return out;
	}

	// A letra pelo padrão das letras do mapa: a primeira cujo caminho termina em drive_<letra> dá o lugar das outras
	// (//servidor/VFX/imagem/drive_l → drive_k: //servidor/VFX/imagem/drive_k). → { servidor, pastas } ou null
	function pelaLetra(letra, roots) {
		for (var i = 0; i < roots.length; i++) {
			var pastas = roots[i].pastas;

			if (pastas.length && DRIVE_FOLDER.test(pastas[pastas.length - 1])) {
				return { servidor: roots[i].servidor, pastas: pastas.slice(0, pastas.length - 1).concat(['drive_' + letra.toLowerCase()]) };
			}
		}

		return null;
	}

	// Os compartilhamentos do mapa (os volumes sem letra e o share de cada letra): [{ servidor, share }]
	function compartilhamentos(mapa, roots) {
		var shares = (mapa && mapa.shares) || [];
		var out = [];
		var seen = {};
		var add = function (servidor, share) {
			var key = String(share).toLowerCase();

			if (!share || seen[key]) return;

			seen[key] = true;
			out.push({ servidor: servidor, share: share });
		};

		for (var i = 0; i < shares.length; i++) add(shares[i].server, shares[i].share);
		for (var j = 0; j < roots.length; j++) add(roots[j].servidor, roots[j].pastas[0]);

		return out;
	}

	// pastas começa com as de 'fim'?
	function startsWith(pastas, fim) {
		if (!fim.length || fim.length > pastas.length) return false;

		for (var i = 0; i < fim.length; i++) {
			if (!same(pastas[i], fim[i])) return false;
		}

		return true;
	}

	function rede(servidor, pastas) {
		return '//' + servidor + '/' + pastas.join('/');
	}

	// → [{ caminho, como: 'direto' | 'mapa' | 'compartilhamento' | 'volume' }]
	function candidatos(path, mapa, volumes) {
		var p = partes(path);
		var out = [];
		var seen = {};
		var add = function (caminho, como) {
			var key = caminho.toLowerCase();

			if (seen[key]) return;

			seen[key] = true;
			out.push({ caminho: caminho, como: como });
		};

		if (!p) {
			add(slashes(path), 'direto');
			return out;
		}

		var roots = raizes(mapa);
		var pastas = p.pastas;
		var i;
		var j;

		// 1. direto: a letra pelo mapa (ou pelo padrão das letras); o caminho de rede e o volume como estão
		if (p.letra) {
			var drive = null;

			for (i = 0; i < roots.length && !drive; i++) {
				if (roots[i].letra == p.letra) drive = roots[i];
			}

			if (!drive) drive = pelaLetra(p.letra, roots);
			if (!drive) {
				add(normalizar(path), 'direto');
				return out;
			}

			pastas = drive.pastas.concat(pastas);
			add(rede(drive.servidor, pastas), 'direto');
		} else if (p.servidor) {
			add(rede(p.servidor, pastas), 'direto');
		} else {
			add('/Volumes/' + p.volume + (pastas.length > 1 ? '/' + pastas.slice(1).join('/') : ''), 'direto');
		}

		// 2. mapa: as letras (e o padrão delas, para o drive_<letra> do caminho) cujo fim é o começo do caminho
		var all = roots.slice(0);

		for (i = 0; i < pastas.length; i++) {
			var d = DRIVE_FOLDER.exec(pastas[i]);
			var inferred = d ? pelaLetra(d[1], roots) : null;

			if (inferred) all.push(inferred);
		}

		for (i = 0; i < all.length; i++) {
			for (j = 0; j < all[i].pastas.length; j++) {
				var fim = all[i].pastas.slice(j);

				if (startsWith(pastas, fim)) {
					add(rede(all[i].servidor, all[i].pastas.slice(0, j).concat(pastas)), 'mapa');
					break;
				}
			}
		}

		// 3. compartilhamento: dentro de cada um; e sem a primeira pasta (o volume com outro nome)
		var shares = compartilhamentos(mapa, roots);

		for (i = 0; i < shares.length; i++) {
			if (!same(shares[i].share, pastas[0])) add(rede(shares[i].servidor, [shares[i].share].concat(pastas)), 'compartilhamento');
		}

		for (i = 0; i < shares.length && pastas.length > 2; i++) add(rede(shares[i].servidor, [shares[i].share].concat(pastas.slice(1))), 'compartilhamento');

		// 4. volume: os montados neste Mac
		volumes = volumes || [];

		for (i = 0; i < volumes.length; i++) {
			var v = String(volumes[i]);

			if (SYSTEM_VOLUME.test(v)) continue;

			for (j = 1; j < pastas.length - 1; j++) {
				if (same(noSuffix(v), pastas[j])) add('/Volumes/' + v + '/' + pastas.slice(j + 1).join('/'), 'volume');
			}
		}

		for (i = 0; i < volumes.length; i++) {
			if (!SYSTEM_VOLUME.test(volumes[i]) && !same(noSuffix(volumes[i]), pastas[0])) add('/Volumes/' + volumes[i] + '/' + pastas.join('/'), 'volume');
		}

		return out;
	}

	var api = { candidatos: candidatos, normalizar: normalizar };

	// a variável global sempre (o painel do After tem window e também module, com o Node ligado); o module.exports no Node
	root.PAD_CAMINHOS = api;

	if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
