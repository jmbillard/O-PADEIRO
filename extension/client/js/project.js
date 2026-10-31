/*

---------------------------------------------------------------
> PROJETO — ID, nome, retranca, renomear e salvar
---------------------------------------------------------------

O ID e o nome ficam no próprio .aep (XMP); a sigla, só neste computador. As primeiras letras do ID
indicam a retranca (configuração > projeto), e com ela a pasta onde o projeto é salvo. A janela
acompanha o projeto aberto no After Effects (trocar de projeto troca os dados).

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/projeto.md';
	var CONFIG_PANEL_ID = 'com.jmbillard.opadeiro.productions';
	var SAVE_DEBOUNCE = 420; // ms depois da última tecla: grava no projeto
	var CONFIRM_MS = 4000; // tempo para o segundo clique de "substituir"

	var state = { info: null, timer: null, statusTimer: null, busy: false, confirmUntil: 0, collectSet: false, seq: 0 };

	function $(id) {
		return document.getElementById(id);
	}

	function status(text, kind) {
		var node = $('proj-status');

		clearTimeout(state.statusTimer);
		node.textContent = kind === 'error' ? PAD_UTIL.errorText(text) : text || '';
		node.title = node.textContent;
		node.className = 'proj-status' + (kind ? ' is-' + kind : '');

		if (text && kind !== 'error') state.statusTimer = setTimeout(status, 4200);
	}

	/* ---------------------------------------------------------------
	   mostrar os dados
	   --------------------------------------------------------------- */

	// o campo em edição não é sobrescrito (a pessoa está digitando)
	function setField(id, value) {
		var input = $(id);

		if (document.activeElement !== input && input.value !== value) input.value = value;
	}

	// caminho cortado no começo (o fim, com a pasta do projeto, é o que importa)
	function tailPath(path) {
		var line = PAD_UTIL.pathLine(path);

		line.classList.add('is-tail');
		line.querySelector('.path-text').textContent = '\u200E' + path + '\u200E'; // a ordem dos caracteres não muda com o rtl

		return line;
	}

	function render(info) {
		state.info = info;

		setField('proj-id', info.id);
		setField('proj-name', info.name);
		setField('proj-user', info.user);
		$('proj-user').placeholder = info.defaultUser || 'sigla';

		// retranca
		var code = $('proj-code');
		var title = $('proj-retranca');
		var card = $('proj-card');

		code.hidden = !info.retranca;
		code.textContent = info.retranca ? info.retranca.code : '';
		card.classList.toggle('has-retranca', !!info.retranca);

		if (info.retranca) title.textContent = info.retranca.name;
		else if (!info.hasRetrancas) title.textContent = 'sem retrancas configuradas';
		else if (info.id) title.textContent = 'nenhuma retranca para ' + info.id;
		else title.textContent = 'digite o ID do projeto';

		// destino: o projeto já salvo mostra onde está; o destino, onde vai ficar
		var target = $('proj-target');

		target.textContent = '';
		card.classList.toggle('is-saved', !!info.file);

		if (info.file) target.appendChild(tailPath(info.file));

		if (info.target && info.target + '/' + info.fileName !== info.file && info.target + '\\' + info.fileName !== info.file) {
			var next = tailPath(info.target);

			next.classList.add('is-target');
			next.title = 'salvar em: ' + info.target;
			target.appendChild(next);
		}

		if (!info.file && !info.target) target.appendChild(Object.assign(document.createElement('span'), { className: 'proj-target-empty', textContent: 'sem pasta de destino: escolha ao salvar (ou defina a pasta raiz na configuração).' }));

		$('btn-open').disabled = !info.file && !info.target;

		// nomes
		$('proj-file-name').textContent = info.fileName || '—';
		$('proj-comp-name').textContent = info.compName || '—';
		$('proj-comps-label').textContent = info.renderCount ? 'comps · ' + info.renderCount : 'comps';
		$('proj-comps-label').parentNode.title = info.renderCount ? (info.selected ? 'as comps selecionadas' : 'as comps com o comentário de render') + ' passam a se chamar assim' : 'selecione as comps de render (ou marque com o comentário de render)';

		// coletar: o padrão da configuração vale até a pessoa mexer
		if (!state.collectSet) {
			$('proj-collect-files').checked = !!info.collectFiles;
			$('proj-collect-fonts').checked = !!info.collectFonts;
		}

		var empty = !info.id && !info.name;

		$('btn-rename').disabled = empty || !info.hasItems || !info.renderCount;
		$('btn-rename').title = !info.renderCount ? 'selecione as comps de render (ou marque com o comentário de render)' : 'renomear ' + info.renderCount + (info.renderCount === 1 ? ' comp' : ' comps') + ' para: ' + info.compName;
		$('btn-save').disabled = empty;
		fitHeight();
	}

	async function refresh() {
		if (state.busy || state.timer) return;

		var seq = ++state.seq;

		try {
			var info = await call('projectInfo');

			if (seq === state.seq && !state.timer) render(info);
		} catch (err) {
			status(err.message, 'error');
		}
	}

	/* ---------------------------------------------------------------
	   editar (grava no projeto um instante depois da última tecla)
	   --------------------------------------------------------------- */

	function scheduleSave() {
		clearTimeout(state.timer);
		state.timer = setTimeout(async function () {
			state.timer = null;

			var seq = ++state.seq;

			try {
				var info = await call('projectSet', { id: $('proj-id').value, name: $('proj-name').value, user: $('proj-user').value });

				if (seq === state.seq) render(info);
			} catch (err) {
				status(err.message, 'error');
			}
		}, SAVE_DEBOUNCE);
	}

	async function flush() {
		if (!state.timer) return;

		clearTimeout(state.timer);
		state.timer = null;
		render(await call('projectSet', { id: $('proj-id').value, name: $('proj-name').value, user: $('proj-user').value }));
	}

	/* ---------------------------------------------------------------
	   ações
	   --------------------------------------------------------------- */

	async function busy(btn, label, fn) {
		if (state.busy) return;

		var text = btn.textContent;

		state.busy = true;
		btn.disabled = true;
		btn.textContent = label;

		try {
			await flush();
			await fn();
		} catch (err) {
			status(err.message, 'error');
		} finally {
			state.busy = false;
			btn.textContent = text;
			btn.disabled = false;
			refresh();
		}
	}

	function rename() {
		return busy($('btn-rename'), 'Renomeando…', async function () {
			var res = await call('projectRename');

			status(res.count + (res.count === 1 ? ' comp renomeada.' : ' comps renomeadas.'), 'success');
		});
	}

	function save(path) {
		var overwrite = Date.now() < state.confirmUntil;

		state.confirmUntil = 0;

		return busy($('btn-save'), 'Salvando…', async function () {
			var info = state.info || {};

			// sem destino: escolhe a pasta
			if (!path && !info.target) {
				path = PAD_BRIDGE.pickFolder('Pasta para salvar o projeto');

				if (!path) return;
			}

			try {
				var res = await call('projectSave', { path: path || '', collectFiles: $('proj-collect-files').checked, collectFonts: $('proj-collect-fonts').checked, overwrite: overwrite, open: true });
				var data = res.data || {};
				var extra = [];

				if (data.copied) extra.push(data.copied + (data.copied === 1 ? ' arquivo coletado' : ' arquivos coletados'));
				if (data.fonts) extra.push('fontes coletadas');

				if (res.messages && res.messages.length) status(res.messages.join('\n'), 'error');
				else status('projeto salvo' + (extra.length ? ' (' + extra.join(', ') + ')' : '') + '.', 'success');
			} catch (err) {
				// já existe: o próximo clique (logo em seguida) substitui
				if (/#PAD_092/.test(err.message)) {
					state.confirmUntil = Date.now() + CONFIRM_MS;
					status('já existe um projeto com esse nome nessa pasta: clique de novo para substituir.', 'warning');
					return;
				}

				throw err;
			}
		});
	}

	async function openFolder() {
		try {
			await flush();
			await call('projectOpenFolder');
		} catch (err) {
			status(err.message, 'error');
		}
	}

	// A janela fica com a altura do conteúdo.
	function fitHeight() {
		var height = Math.ceil($('project').getBoundingClientRect().height);

		if (Math.abs(height - window.innerHeight) > 2) PAD_BRIDGE.resizeWindow(window.innerWidth, height);
	}

	/* ---------------------------------------------------------------
	   início
	   --------------------------------------------------------------- */

	function init() {
		// ID: maiúsculas e sem espaços enquanto digita (como fica gravado)
		$('proj-id').addEventListener('input', function () {
			var pos = this.selectionStart;
			var clean = this.value.toUpperCase().replace(/\s+/g, '');

			if (clean !== this.value) {
				this.value = clean;
				this.setSelectionRange(pos, pos);
			}

			scheduleSave();
		});
		$('proj-name').addEventListener('input', scheduleSave);
		$('proj-user').addEventListener('input', function () {
			this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
			scheduleSave();
		});

		['proj-id', 'proj-name', 'proj-user'].forEach(function (id) {
			$(id).addEventListener('keydown', function (e) {
				if (e.key === 'Enter') {
					e.preventDefault();
					flush().catch(function (err) {
						status(err.message, 'error');
					});
				}
			});
		});

		['proj-collect-files', 'proj-collect-fonts'].forEach(function (id) {
			$(id).addEventListener('change', function () {
				state.collectSet = true;
			});
		});

		$('btn-rename').addEventListener('click', rename);
		$('btn-save').addEventListener('click', function () {
			save('');
		});
		$('btn-open').addEventListener('click', openFolder);

		// menu "⋯"
		var menu = $('app-menu');

		menu.addEventListener('click', async function (e) {
			var btn = e.target.closest('button[data-action]');

			if (!btn) return;

			menu.removeAttribute('open');

			var action = btn.dataset.action;

			if (action === 'docs') PAD_BRIDGE.openUrl(DOCS_URL);
			if (action === 'reload') location.reload();

			if (action === 'save-as') {
				var path = PAD_BRIDGE.pickFolder('Pasta para salvar o projeto');

				if (path) save(path);
			}

			if (action === 'config') {
				try {
					await call('requestConfigTab', { tab: 'project' });
					PAD_BRIDGE.openPanel(CONFIG_PANEL_ID);
				} catch (err) {
					status(err.message, 'error');
				}
			}
		});
		document.addEventListener('click', function (e) {
			if (!menu.contains(e.target)) menu.removeAttribute('open');
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') menu.removeAttribute('open');
		});

		// acompanha o projeto aberto (outro projeto, comps selecionadas, configuração)
		refresh();
		setInterval(function () {
			if (!document.hidden) refresh();
		}, 1500);
		window.addEventListener('focus', refresh);
		window.addEventListener('resize', fitHeight);
	}

	init();
})();
