/*

---------------------------------------------------------------
> ponte painel ↔ host (ExtendScript)
---------------------------------------------------------------

Fala com o After Effects pela API nativa do CEP (window.__adobe_cep__), sem depender
da CSInterface.js da Adobe. Fora do After Effects (navegador), js/mock-host.js
define window.PAD_MOCK_HOST e a ponte usa esse host de mentira.

*/

(function () {
	'use strict';

	var cep = window.__adobe_cep__;

	function evalScript(code) {
		return new Promise(function (resolve) {
			cep.evalScript(code, resolve);
		});
	}

	// Serializa para um literal de string seguro dentro do evalScript.
	function literal(str) {
		return JSON.stringify(str).split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
	}

	// Pasta 'host' ao lado da pasta 'client' desta página (o código vive na rede: a página foi aberta de lá).
	function hostFolder() {
		var path = decodeURIComponent(location.pathname).replace(/\/client\/[^/]*$/, '/host');

		if (location.host) return '//' + location.host + path; // Windows: \\servidor\share (file://servidor/share)
		if (/^\/[A-Za-z]:\//.test(path)) return path.slice(1); // Windows: C:/...

		return path;
	}

	// Carrega o host da rede na primeira chamada do painel, e de novo se algum arquivo dele mudou.
	var hostReady = null;

	async function loadHost() {
		var host = literal(hostFolder());
		var state = await evalScript('try{$.evalFile(new File(' + host + '+"/loader.jsx"));PADX_hostState(' + host + ')}catch(e){"erro: #PAD_067 - "+e}');

		if (state === 'load') state = await evalScript('try{$.evalFile(new File(' + host + '+"/index.jsx"));PADX_hostLoaded()}catch(e){"erro: #PAD_067 - "+e}');

		if (state !== 'ok' && state !== 'loaded') throw new Error(String(state).replace(/^erro: /, '') || '#PAD_067 - o host do After Effects não carregou');
	}

	function ensureHost() {
		if (!hostReady) {
			hostReady = loadHost().catch(function (err) {
				hostReady = null; // tenta de novo na próxima chamada (a rede pode voltar)
				throw err;
			});
		}

		return hostReady;
	}

	// Chama PADX[method](args) no host. Resolve com os dados ou rejeita com Error.
	async function call(method, args) {
		if (window.PAD_MOCK_HOST) return window.PAD_MOCK_HOST.call(method, args || {});

		await ensureHost();

		var raw = await evalScript('PADX_call(' + literal(method) + ',' + literal(JSON.stringify(args || {})) + ')');
		var res;

		try {
			res = JSON.parse(raw);
		} catch (err) {
			throw new Error('#PAD_068 - o host do After Effects não respondeu (' + String(raw).slice(0, 80) + ')');
		}

		if (!res.ok) throw new Error(res.error);

		return res.data;
	}

	function inCep() {
		return !!cep;
	}

	// Seletor de arquivo do CEP (sem Node). Retorna o caminho ou null.
	function pickFile(title, extensions) {
		if (!cep || !window.cep || !window.cep.fs) return null;

		var res = window.cep.fs.showOpenDialogEx(false, false, title, '', extensions || []);

		return res && res.err === 0 && res.data && res.data.length ? res.data[0] : null;
	}

	// Seletor de pasta do CEP. Retorna o caminho ou null. o volume vem sem o sufixo que o macOS põe ao montar o
	// mesmo share de novo (/Volumes/VFX-1 → /Volumes/VFX): os caminhos são gravados e mostrados sem ele; o host
	// acha o volume certo na hora de abrir, criar ou montar.
	// A pasta onde a janela de escolher abre: o caminho guardado (sem o sufixo do volume) no volume realmente
	// montado (VFX, VFX-1 … VFX-5) e, se a pasta ainda não existe, a mais perto que existir
	function startFolder(path) {
		var fs = null;

		path = String(path || '').replace(/\\/g, '/').replace(/\/+$/, '');
		if (!path) return '';

		try {
			fs = typeof require === 'function' ? require('fs') : null;
		} catch (err) { }

		if (!fs) return path;

		var isDir = function (p) {
			try {
				return fs.statSync(p).isDirectory();
			} catch (err) {
				return false;
			}
		};
		// a mais funda que existe
		var nearest = function (p) {
			while (p && p !== '/' && !isDir(p)) p = p.replace(/\/[^\/]*$/, '');

			return p && p !== '/' ? p : '';
		};
		var m = /^\/Volumes\/([^\/]+?)(-[1-5])?(\/.*)?$/.exec(path);

		if (!m) return nearest(path);

		var best = '';

		['', '-1', '-2', '-3', '-4', '-5'].forEach(function (suffix) {
			var found = nearest('/Volumes/' + m[1] + suffix + (m[3] || ''));

			// a que tiver mais do caminho (uma pasta /Volumes/VFX vazia, que sobrou, perde para a VFX-1 montada)
			if (found.length > best.length && found.split('/').length > 3) best = found;
		});

		return best || nearest(path);
	}

	function pickFolder(title, startPath) {
		if (!cep || !window.cep || !window.cep.fs) return null;

		var res = window.cep.fs.showOpenDialogEx(false, true, title, startFolder(startPath));

		return res && res.err === 0 && res.data && res.data.length ? noVolumeSuffix(res.data[0]) : null;
	}

	function noVolumeSuffix(path) {
		return String(path || '').replace(/^(\/Volumes\/[^\/]+?)-[1-5](?=\/|$)/i, '$1');
	}

	// Janela de salvar arquivo. Retorna o caminho escolhido ou null.
	function pickSaveFile(title, defaultName, extensions) {
		if (!cep || !window.cep || !window.cep.fs) return null;

		var res = window.cep.fs.showSaveDialogEx(title, '', extensions || [], defaultName || '', '');

		return res && res.err === 0 && res.data ? res.data : null;
	}

	// Lê um arquivo do disco como base64 (sem Node). Retorna a string base64 ou null.
	function readFileBase64(path) {
		if (!cep || !window.cep || !window.cep.fs) return null;

		var res = window.cep.fs.readFile(path, window.cep.encoding.Base64);

		return res && res.err === 0 ? res.data : null;
	}

	// Abre (ou traz para a frente) outro painel da extensão pelo Id do manifest.
	function openPanel(extensionId) {
		if (cep && cep.requestOpenExtension) {
			cep.requestOpenExtension(extensionId, '');
		} else {
			console.log('[mock] abrir painel', extensionId);
		}
	}

	// A área livre da tela onde a janela está (sem o menu e o dock / a barra de tarefas) e a moldura da janela
	// (o título do sistema: a diferença entre o tamanho de fora e o de dentro)
	var SCREEN_MARGIN = 24;

	function screenArea() {
		var sc = window.screen || {};

		return {
			left: sc.availLeft || 0,
			top: sc.availTop || 0,
			width: sc.availWidth || window.outerWidth || 1280,
			height: sc.availHeight || window.outerHeight || 800
		};
	}

	function frame() {
		return { w: Math.max(0, window.outerWidth - window.innerWidth), h: Math.max(0, window.outerHeight - window.innerHeight) };
	}

	// Centraliza a janela na tela em que ela está (com o tamanho de dentro w × h). O After Effects pode não deixar
	// mover: aí nada acontece (o resizeWindow encolhe o que passar da tela).
	function centerWindow(w, h) {
		if (!cep || isDocked()) return;

		var a = screenArea();
		var f = frame();
		var x = a.left + Math.max(0, (a.width - (w || window.innerWidth) - f.w) / 2);
		var y = a.top + Math.max(0, (a.height - (h || window.innerHeight) - f.h) / 2);

		try {
			window.moveTo(Math.round(x), Math.round(y));
		} catch (e) { }
	}

	// a barra é o único painel acoplável (Panel no manifest): ela não se move nem centraliza
	function isDocked() {
		return document.body && document.body.classList.contains('bar-page');
	}

	// Redimensiona a própria janela (só janelas Modeless; painéis acoplados ignoram) e a centraliza na tela: abre
	// e cresce sempre no meio, nunca com a parte de baixo fora da tela. O tamanho nunca passa da área livre da
	// tela (menos uma margem). O After Effects pode ignorar um pedido (por exemplo, logo que a janela abre):
	// confere um instante depois e pede de novo, até 4 vezes. Os limites do manifest (tamanho mínimo e máximo)
	// continuam valendo. Se ele não deixar mover a janela, a altura encolhe até a parte de baixo caber na tela.
	var resizeTimer = null;

	function resizeWindow(width, height) {
		var a = screenArea();
		var f = frame();
		var w = Math.round(Math.min(width, a.width - f.w - SCREEN_MARGIN * 2));
		var h = Math.round(Math.min(height, a.height - f.h - SCREEN_MARGIN * 2));
		var tries = 0;

		clearTimeout(resizeTimer);

		if (!cep || !cep.resizeContent) return console.log('[mock] redimensionar janela', w, h);

		(function attempt() {
			// crescendo, centraliza antes (para não passar da tela no meio do caminho); encolhendo, depois
			if (h > window.innerHeight || w > window.innerWidth) centerWindow(w, h);
			cep.resizeContent(w, h);
			centerWindow(w, h);

			resizeTimer = setTimeout(function () {
				// não deu para mover: a parte de baixo não pode ficar fora da tela
				var bottom = a.top + a.height - SCREEN_MARGIN;
				var over = window.screenY + window.outerHeight - bottom;

				if (over > 2 && h - over >= 200) {
					h = Math.round(h - over);
					cep.resizeContent(w, h);
				}

				if (++tries < 4 && (Math.abs(window.innerWidth - w) > 2 || Math.abs(window.innerHeight - h) > 2)) attempt();
			}, 350);
		})();
	}

	// ao abrir, toda janela (menos a barra) aparece no meio da tela
	if (cep) {
		window.addEventListener('load', function () {
			centerWindow();
		});
	}

	// Fecha o próprio painel.
	function closePanel() {
		if (cep && cep.closeExtension) {
			cep.closeExtension();
		} else {
			console.log('[mock] fechar painel');
			window.PAD_MOCK_CLOSED = true;
		}
	}

	function openUrl(url) {
		if (window.cep && window.cep.util) {
			window.cep.util.openURLInDefaultBrowser(url);
		} else {
			window.open(url, '_blank');
		}
	}

	window.PAD_BRIDGE = { mountedPath: startFolder, call: call, inCep: inCep, pickFile: pickFile, pickFolder: pickFolder, pickSaveFile: pickSaveFile, readFileBase64: readFileBase64, openPanel: openPanel, closePanel: closePanel, resizeWindow: resizeWindow, centerWindow: centerWindow, openUrl: openUrl };
})();
