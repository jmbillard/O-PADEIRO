/*

---------------------------------------------------------------
> COLETAR — as mídias do projeto e o estado de cada uma
---------------------------------------------------------------

O clique direito no coletar (barra). Uma linha por arquivo do projeto: a miniatura (imagem, o primeiro quadro
do vídeo ou da sequência; áudio e dados com o ícone do tipo), o nome, o tipo e os layers e, à direita, o
estado: ✓ na pasta do projeto · ↑ nas pastas de projetos · ↑ amarela fora delas · ✕ faltando · – fora da árvore
do coletar. clicar mostra o item no painel Project. Coletar copia para a estrutura do projeto (a seta sobe
enquanto copia); a pasta do rodapé coleta em outra pasta; o triângulo resolve os arquivos faltando que estão
num volume não montado ou com outro sufixo (VFX-1 …): cata o caminho certo e relinka.

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;
	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/README.md#coletar';
	var STATES = {
		ok: ['✓', 'na pasta do projeto'],
		net: ['↑', 'nas pastas de projetos, fora da pasta deste projeto: o coletar copia'],
		local: ['↑', 'fora das pastas de projetos (configuração > projeto): o coletar copia'],
		missing: ['✕', 'o arquivo não existe'],
		skip: ['–', 'tipo fora da árvore do coletar (configuração > coletar)']
	};
	var KINDS = { videos: 'vídeo', imagens: 'imagem', sequencias: 'sequência', audio: 'áudio', dados: 'dados' };
	var ORDER = { missing: 0, local: 1, net: 2, skip: 3, ok: 4 };
	var IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
	var VIDEO_EXT = /\.(mp4|m4v|webm|mov)$/i;
	var FILE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><path d="M13.5 3.5V8H18" /></svg>';
	var KIND_SVG = {
		videos: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M7.5 5v14M16.5 5v14" /></svg>',
		sequencias: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="13" height="11" rx="1.5" /><path d="M4 15V5.5A1.5 1.5 0 0 1 5.5 4H16" /></svg>',
		imagens: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4.5 17.5 5-5 3.5 3.5 2.5-2.5 4 4" /></svg>',
		audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></svg>',
		dados: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6" rx="7" ry="2.5" /><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" /></svg>'
	};

	var state = { data: null, busy: false, key: '' };

	function $(id) {
		return document.getElementById(id);
	}

	function el(tag, className, text) {
		var node = document.createElement(tag);

		if (className) node.className = className;
		if (text != null) node.textContent = text;

		return node;
	}

	function status(text, kind) {
		var node = $('fw-status');

		node.textContent = kind === 'error' ? PAD_UTIL.errorText(text) : text || '';
		node.className = 'fw-status' + (kind ? ' is-' + kind : '');
		node.title = '';
	}

	function plural(n, one, many) {
		return n + ' ' + (n === 1 ? one : many);
	}

	function pending() {
		return (state.data ? state.data.items : []).filter(function (it) {
			return it.state === 'local' || it.state === 'net';
		});
	}

	async function load() {
		try {
			state.data = await call('collectList');
			render();
		} catch (err) {
			status(err.message, 'error');
		}
	}

	function render() {
		var data = state.data || { items: [] };
		var items = data.items.slice().sort(function (a, b) {
			return ORDER[a.state] - ORDER[b.state] || a.name.localeCompare(b.name);
		});
		var count = {};
		var parts = [];
		var key = JSON.stringify(items.map(function (it) {
			return it.id + ':' + it.state;
		}));

		items.forEach(function (it) {
			count[it.state] = (count[it.state] || 0) + 1;
		});
		parts.push(plural(items.length, 'arquivo', 'arquivos'));
		if (count.local) parts.push(count.local + ' fora das pastas de projetos');
		if (count.missing) parts.push(plural(count.missing, 'faltando', 'faltando'));

		$('fw-file').innerHTML = FILE_SVG;
		$('fw-file').appendChild(el('span', null, (data.project || 'projeto sem nome') + ' · ' + parts.join(' · ')));
		$('fw-empty').hidden = !!items.length;
		$('fw-empty').textContent = 'o projeto não tem arquivos (só comps, sólidos ou textos).';

		var n = pending().length;

		$('cw-go').disabled = !n || state.busy;
		$('cw-go').textContent = n ? 'Coletar: ' + n : 'Coletar';
		$('cw-relink').disabled = !count.missing || state.busy;

		if (key === state.key) return; // nada mudou: as miniaturas não recarregam

		state.key = key;

		var list = $('fw-list');

		list.textContent = '';
		items.forEach(function (it) {
			list.appendChild(row(it));
		});
	}

	// a miniatura: a imagem, o primeiro quadro do vídeo (ou da sequência) ou o ícone do tipo
	function thumb(it) {
		var box = el('span', 'cw-thumb is-' + it.kind);
		var url = PAD_UTIL.fileUrl ? PAD_UTIL.fileUrl(it.file) : 'file://' + it.file;

		box.innerHTML = KIND_SVG[it.kind] || KIND_SVG.videos;

		if (it.state === 'missing') return box;

		if (IMAGE_EXT.test(it.file)) {
			var img = new Image();

			img.onload = function () {
				box.textContent = '';
				box.appendChild(img);
			};
			img.src = url;
		} else if (VIDEO_EXT.test(it.file) && it.kind === 'videos') {
			var video = document.createElement('video');

			video.muted = true;
			video.preload = 'metadata';
			video.addEventListener('loadeddata', function () {
				box.textContent = '';
				box.appendChild(video);
			});
			video.src = url + '#t=0.1';
		}

		return box;
	}

	function row(it) {
		var box = el('div', 'fw-row cw-row');
		var head = el('button', 'fw-head');
		var text = el('span', 'fw-text');
		var st = STATES[it.state] || STATES.net;
		var dot = el('span', 'fw-state is-' + (it.state === 'local' ? 'install' : it.state === 'net' ? 'up' : it.state === 'missing' ? 'nofile' : it.state === 'skip' ? 'skip' : 'ok'));
		var folder = it.file.replace(/\\/g, '/').replace(/\/[^\/]*$/, '');

		head.type = 'button';
		head.title = it.file + '\n' + st[1] + '\n(clique: mostra no painel Project)';
		head.appendChild(thumb(it));
		text.appendChild(el('b', 'cw-name', it.name));
		text.appendChild(el('span', 'fw-name', (KINDS[it.kind] || it.kind) + (it.layers ? ' · ' + plural(it.layers, 'comp', 'comps') : ' · sem uso') + ' · …/' + folder.split('/').slice(-2).join('/')));
		head.appendChild(text);
		dot.appendChild(el('i', null, st[0]));
		dot.dataset.id = it.id;
		dot.title = st[1];
		head.appendChild(dot);
		head.addEventListener('click', function () {
			call('collectReveal', { id: it.id }).catch(function () { });
		});
		box.appendChild(head);

		return box;
	}

	// coletar: as setas dos que vão ser copiados sobem enquanto o After Effects copia
	async function collect(path) {
		if (state.busy) return;

		state.busy = true;
		render();

		var moving = Array.prototype.filter.call(document.querySelectorAll('.fw-state.is-up, .fw-state.is-install'), function () {
			return true;
		});

		moving.forEach(function (dot) {
			dot.classList.add('is-moving');
		});
		status('coletando…');

		try {
			var res = await call('collectProject', { path: path || '' });
			var d = res.data || {};
			var parts = [];

			if (d.files) parts.push(plural(d.files, 'arquivo copiado', 'arquivos copiados'));
			if (d.sequences) parts.push(plural(d.sequences, 'sequência', 'sequências') + ' (' + d.frames + ' quadros)');
			if (d.fonts) parts.push('fontes coletadas');
			if (res.messages && res.messages.length) status(res.messages.join(' · '), 'error');
			else status((parts.join(' · ') || 'nada novo para copiar') + (d.folder ? ' em ' + d.folder : '') + (d.saved ? ' · projeto salvo.' : '.'), '');
		} catch (err) {
			status(err.message, 'error');
		}

		moving.forEach(function (dot) {
			dot.classList.remove('is-moving');
		});
		state.busy = false;
		state.key = '';
		await load();
	}

	// resolver arquivos faltando: o host procura cada um no volume certo (montando o share, se precisar) e relinka
	async function relink() {
		if (state.busy) return;

		state.busy = true;
		render();

		var button = $('cw-relink');
		var searching = Array.prototype.slice.call(document.querySelectorAll('.fw-state.is-nofile'));

		button.classList.add('is-working');
		searching.forEach(function (dot) {
			dot.classList.add('is-searching');
		});
		status('procurando os arquivos faltando…');

		try {
			var res = await call('collectRelink', {});
			var parts = [];

			if (res.relinked) parts.push(plural(res.relinked, 'arquivo relinkado', 'arquivos relinkados'));
			if (res.still && res.still.length) parts.push(plural(res.still.length, 'ainda faltando', 'ainda faltando'));
			status((parts.join(' · ') || 'nada para relinkar') + '.', '');
			if (res.still && res.still.length) $('fw-status').title = res.still.join('\n');
		} catch (err) {
			status(err.message, 'error');
		}

		button.classList.remove('is-working');
		searching.forEach(function (dot) {
			dot.classList.remove('is-searching');
		});
		state.busy = false;
		state.key = '';
		await load();
	}

	function init() {
		$('cw-relink').addEventListener('click', relink);
		PAD_KEYS.primary($('cw-go')); // Cmd/Ctrl+Enter faz o botão principal
		$('cw-go').addEventListener('click', function () {
			collect('');
		});
		$('cw-other').addEventListener('click', function () {
			var path = PAD_BRIDGE.pickFolder('Coletar em qual pasta', state.data && state.data.root);

			if (path) collect(path);
		});

		var menu = $('app-menu');

		menu.addEventListener('click', async function (e) {
			var btn = e.target.closest('button[data-action]');

			if (!btn) return;

			menu.removeAttribute('open');

			try {
				if (btn.dataset.action === 'docs') PAD_BRIDGE.openUrl(DOCS_URL);
				if (btn.dataset.action === 'reload') location.reload();
				if (btn.dataset.action === 'folder') {
					if (!state.data || !state.data.root) throw new Error('#PAD_095 - o projeto ainda não foi salvo.');
					await call('openFolder', { path: state.data.root });
				}
			} catch (err) {
				status(err.message, 'error');
			}
		});

		window.addEventListener('focus', load);
		setInterval(function () {
			if (!document.hidden && !state.busy) load();
		}, 4000);
		load();
	}

	init();
})();
