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

	// Seletor de pasta do CEP. Retorna o caminho ou null.
	function pickFolder(title, startPath) {
		if (!cep || !window.cep || !window.cep.fs) return null;

		var res = window.cep.fs.showOpenDialogEx(false, true, title, startPath || '');

		return res && res.err === 0 && res.data && res.data.length ? res.data[0] : null;
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

	// Redimensiona a própria janela (só janelas Modeless; painéis acoplados ignoram).
	function resizeWindow(width, height) {
		if (cep && cep.resizeContent) cep.resizeContent(Math.round(width), Math.round(height));
		else console.log('[mock] redimensionar janela', width, height);
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

	window.PAD_BRIDGE = { call: call, inCep: inCep, pickFile: pickFile, pickFolder: pickFolder, pickSaveFile: pickSaveFile, readFileBase64: readFileBase64, openPanel: openPanel, closePanel: closePanel, resizeWindow: resizeWindow, openUrl: openUrl };
})();
