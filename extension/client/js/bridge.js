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

	// Chama PADX[method](args) no host. Resolve com os dados ou rejeita com Error.
	async function call(method, args) {
		if (window.PAD_MOCK_HOST) return window.PAD_MOCK_HOST.call(method, args || {});

		var raw = await evalScript('PADX_call(' + literal(method) + ',' + literal(JSON.stringify(args || {})) + ')');
		var res;

		try {
			res = JSON.parse(raw);
		} catch (err) {
			throw new Error('o host do After Effects não respondeu (' + String(raw).slice(0, 80) + ')');
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

	window.PAD_BRIDGE = { call: call, inCep: inCep, pickFile: pickFile, pickFolder: pickFolder, pickSaveFile: pickSaveFile, readFileBase64: readFileBase64, openPanel: openPanel, closePanel: closePanel, openUrl: openUrl };
})();
