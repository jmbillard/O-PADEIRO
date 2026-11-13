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

	// finds: o resultado da última busca dos arquivos faltando ({ id: { to, how, more } } e os não achados), até
	// relinkar ou eles deixarem de faltar
	// filter: as situações que aparecem na lista (e que o Coletar e a busca dos faltando levam em conta). a janela
	// abre mostrando só o que precisa de atenção; o que já está no lugar fica escondido
	var state = { data: null, busy: false, key: '', finds: null, mig: null, filter: { missing: true, local: true, net: true, ok: false } };
	var FILTERS = [['missing', 'nofile', '✕', 'faltando', 'o arquivo não existe'], ['local', 'install', '↑', 'locais', 'fora das pastas de projetos (neste computador)'], ['net', 'up', '↑', 'na rede', 'nas pastas de projetos, fora da pasta deste projeto'], ['ok', 'ok', '✓', 'no lugar', 'na pasta do projeto (ou de um tipo que não é coletado)']];

	// a situação do arquivo para o filtro: os de tipo fora da árvore (não coletados) contam como no lugar
	function group(it) {
		return it.state === 'skip' ? 'ok' : it.state;
	}

	function shown(it) {
		return !!state.filter[group(it)];
	}

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
		// só os que aparecem: o filtro vale para o Coletar
		return (state.data ? state.data.items : []).filter(function (it) {
			return (it.state === 'local' || it.state === 'net') && shown(it);
		});
	}

	// os faltando que a busca achou (e ainda estão faltando)
	function found() {
		if (!state.finds || !state.data) return [];

		return state.data.items.filter(function (it) {
			return it.state === 'missing' && state.finds.to[it.id] && shown(it);
		});
	}

	async function load() {
		if (state.mig) return; // a migração está na tela: a lista espera

		try {
			state.data = await call('collectList');
			render();
		} catch (err) {
			status(err.message, 'error');
		}
	}

	// o resumo no topo: quantos arquivos em cada situação; cada etiqueta liga e desliga a situação na lista
	function renderFilter(count) {
		var box = $('cw-filter');

		box.textContent = '';
		box.hidden = !(state.data && state.data.items.length);

		FILTERS.forEach(function (f) {
			var n = count[f[0]] || 0;
			var chip = el('button', 'cw-chip' + (state.filter[f[0]] ? '' : ' is-off'));
			var dot = el('span', 'fw-state is-' + f[1]);

			chip.type = 'button';
			chip.disabled = !n;
			chip.setAttribute('aria-pressed', state.filter[f[0]] ? 'true' : 'false');
			chip.title = f[4] + (n ? '\n(clique: ' + (state.filter[f[0]] ? 'esconde' : 'mostra') + ' na lista; o Coletar só copia o que aparece)' : '');
			dot.appendChild(el('i', null, f[2]));
			chip.appendChild(dot);
			chip.appendChild(el('b', null, String(n)));
			chip.appendChild(document.createTextNode(' ' + f[3]));
			chip.addEventListener('click', function () {
				state.filter[f[0]] = !state.filter[f[0]];
				render();
			});
			box.appendChild(chip);
		});
	}

	function render() {
		var data = state.data || { items: [] };
		var items = data.items.slice().sort(function (a, b) {
			return ORDER[a.state] - ORDER[b.state] || a.name.localeCompare(b.name);
		});
		var count = {};
		var key = JSON.stringify(state.filter) + JSON.stringify(items.map(function (it) {
			return it.id + ':' + it.state + (state.finds && it.state === 'missing' ? ':' + (state.finds.to[it.id] ? state.finds.to[it.id].to : '?') : '');
		}));

		items.forEach(function (it) {
			count[group(it)] = (count[group(it)] || 0) + 1;
		});

		var visible = items.filter(shown);

		$('fw-file').innerHTML = FILE_SVG;
		$('fw-file').appendChild(el('span', null, (data.project || 'projeto sem nome') + ' · ' + plural(items.length, 'arquivo', 'arquivos')));
		$('fw-empty').hidden = !!visible.length;

		// sem nada na lista: o projeto não tem arquivos, está tudo certo, ou o filtro escondeu tudo
		if (!items.length) $('fw-empty').textContent = 'o projeto não tem arquivos (só comps, sólidos ou textos).';
		else if (!count.missing && !count.local && !count.net) $('fw-empty').textContent = 'tudo no lugar: nada faltando nem fora da pasta do projeto.';
		else $('fw-empty').textContent = 'nada para mostrar: ligue uma das situações em cima.';

		renderFilter(count);

		var n = pending().length;
		var hits = found().length;
		var missing = visible.filter(function (it) {
			return it.state === 'missing';
		}).length;

		// com arquivos achados pela busca, o botão principal relinka; sem, coleta (só o que aparece)
		$('cw-go').disabled = (!n && !hits) || state.busy;
		$('cw-go').textContent = hits ? 'Relinkar: ' + hits : n ? 'Coletar: ' + n : 'Coletar';
		$('cw-relink').disabled = !missing || state.busy;

		if (key === state.key) return; // nada mudou: as miniaturas não recarregam

		state.key = key;

		var list = $('fw-list');
		var all = (count.local || 0) + (count.net || 0);
		var sections = [
			['missing', 'FALTANDO', hits ? 'achados: o Relinkar aponta para eles' : 'o triângulo procura nas pastas'],
			['collect', 'PARA COLETAR', n < all ? 'só os que aparecem são copiados' : 'o Coletar copia para a pasta do projeto'],
			['ok', 'NA PASTA DO PROJETO', '']
		];

		list.textContent = '';
		sections.forEach(function (s) {
			var rows = visible.filter(function (it) {
				var g = group(it);

				return s[0] === 'collect' ? g === 'local' || g === 'net' : g === s[0];
			});

			if (!rows.length) return;

			var head = el('p', 'cw-sec');

			head.appendChild(document.createTextNode(s[1] + ' · ' + rows.length + (s[0] === 'collect' && rows.length < all ? ' de ' + all : '')));
			if (s[2]) head.appendChild(el('small', null, s[2]));
			list.appendChild(head);
			rows.forEach(function (it) {
				list.appendChild(row(it));
			});
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

	// o fim do caminho de uma pasta (…/as duas últimas)
	function tail(path) {
		return '…/' + String(path).replace(/\\/g, '/').replace(/\/[^\/]*$/, '').split('/').slice(-2).join('/');
	}

	// a linha: a miniatura, o nome, o tipo (o ícone na cor do tipo) com as comps, e de onde → para onde
	function row(it) {
		var box = el('div', 'fw-row cw-row');
		var head = el('button', 'fw-head');
		var text = el('span', 'fw-text');
		var st = STATES[it.state] || STATES.net;
		var hit = it.state === 'missing' && state.finds ? state.finds.to[it.id] : null;
		var searched = it.state === 'missing' && state.finds && !hit;
		var dot = el('span', 'fw-state is-' + (hit ? 'found' : it.state === 'local' ? 'install' : it.state === 'net' ? 'up' : it.state === 'missing' ? 'nofile' : it.state === 'skip' ? 'skip' : 'ok'));
		var name = el('b', 'cw-name', it.name);
		var kind = el('span', 'cw-kind');
		var where = el('span', 'cw-where');
		var dest = state.data && state.data.dests ? state.data.dests[it.kind] : '';

		// achado pela busca: a linha mostra onde (o relinkar leva para lá); procurado e não achado: avisa
		if (hit) st = ['→', 'achado em ' + hit.to + (hit.more ? '\n(há mais ' + plural(hit.more, 'arquivo', 'arquivos') + ' com esse nome: este é o do caminho mais parecido)' : '') + '\nRelinkar aponta o item para ele'];
		if (searched) st = [st[0], 'o arquivo não existe e a busca não achou outro com esse nome nas pastas do projeto'];

		box.setAttribute('data-type', it.kind); // a cor do tipo (styles.css)
		box.dataset.state = it.state;
		head.type = 'button';
		head.title = it.file + '\n' + st[1] + '\n(clique: mostra no painel Project)';
		head.appendChild(thumb(it));

		if (!it.layers) {
			box.classList.add('is-unused');
			name.appendChild(el('span', 'cw-tag', 'sem uso'));
		}
		text.appendChild(name);

		kind.innerHTML = KIND_SVG[it.kind] || KIND_SVG.videos;
		kind.appendChild(el('b', null, KINDS[it.kind] || it.kind));
		if (it.layers) kind.appendChild(document.createTextNode('· ' + plural(it.layers, 'comp', 'comps')));
		text.appendChild(kind);

		// de onde → para onde: o que vai ser coletado mostra a pasta da estrutura que o recebe
		if (hit) {
			where.appendChild(el('span', null, 'era ' + tail(it.file)));
			where.appendChild(el('i', null, '→'));
			where.appendChild(el('b', null, tail(hit.to)));
		} else if (it.state === 'missing') where.appendChild(el('span', null, 'era ' + tail(it.file)));
		else if ((it.state === 'local' || it.state === 'net') && dest) {
			where.appendChild(el('span', null, tail(it.file)));
			where.appendChild(el('i', null, '→'));
			where.appendChild(el('b', null, dest));
		} else where.appendChild(el('span', null, tail(it.file) + (it.state === 'skip' ? ' · tipo não coletado' : '')));
		text.appendChild(where);

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
			// só os que aparecem na lista (o filtro)
			var res = await call('collectProject', { path: path || '', ids: pending().map(function (it) {
				return it.id;
			}) });
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

	// resolver arquivos faltando, em dois passos: o triângulo procura (no volume certo, montando o share se
	// precisar, e pelo nome nas pastas do projeto e na pasta antiga que ainda existe) e mostra onde achou cada um;
	// o botão principal vira Relinkar e aponta os itens para os achados
	async function findMissing() {
		if (state.busy) return;

		state.busy = true;
		render();

		var button = $('cw-relink');
		var searching = Array.prototype.slice.call(document.querySelectorAll('.fw-state.is-nofile, .fw-state.is-found'));

		button.classList.add('is-working');
		searching.forEach(function (dot) {
			dot.classList.add('is-searching');
		});
		status('procurando os arquivos faltando…');

		try {
			// só os faltando que aparecem na lista
			var res = await call('collectRelinkFind', { ids: state.data.items.filter(function (it) {
				return it.state === 'missing' && shown(it);
			}).map(function (it) {
				return it.id;
			}) });
			var to = {};

			(res.found || []).forEach(function (f) {
				to[f.id] = f;
			});
			state.finds = { to: to };

			var parts = [];

			if (res.found && res.found.length) parts.push(plural(res.found.length, 'achado', 'achados'));
			if (res.still && res.still.length) parts.push(plural(res.still.length, 'não achado', 'não achados'));
			if (res.partial) parts.push('a busca parou antes do fim (pastas grandes)');
			status((parts.join(' · ') || 'nada para relinkar') + '.', '');
			if (res.still && res.still.length) {
				$('fw-status').title = res.still.map(function (s) {
					return s.name;
				}).join('\n');
			}
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

	async function relink() {
		var hits = found();

		if (state.busy || !hits.length) return;

		state.busy = true;
		render();
		status('relinkando…');

		try {
			var to = {};

			hits.forEach(function (it) {
				to[it.id] = state.finds.to[it.id].to;
			});

			var res = await call('collectRelink', { ids: hits.map(function (it) {
				return it.id;
			}), to: to });
			var parts = [];

			if (res.relinked) parts.push(plural(res.relinked, 'arquivo relinkado', 'arquivos relinkados') + ' · ' + PAD_UTIL.undoKey + ' desfaz');
			if (res.still && res.still.length) parts.push(plural(res.still.length, 'ainda faltando', 'ainda faltando'));
			status((parts.join(' · ') || 'nada para relinkar') + '.', '');
			if (res.still && res.still.length) $('fw-status').title = res.still.join('\n');
		} catch (err) {
			status(err.message, 'error');
		}

		state.finds = null;
		state.busy = false;
		state.key = '';
		await load();
	}

	/* =========================================================
	   Migração: a pasta do projeto vai para a estrutura da configuração (host/migrate.jsx). a pasta de hoje à
	   esquerda, a estrutura nova à direita e uma faixa por tipo de arquivo ligando o que vai para onde: a seta
	   na chegada, a largura pela quantidade e o degradê da cor do tipo (styles.css), do claro ao forte
	   ========================================================= */

	var TYPE_NAMES = { projeto: 'projeto', videos: 'vídeos', imagens: 'imagens', sequencias: 'sequências', audio: 'áudio', dados: 'dados', fontes: 'fontes', saidas: 'saídas', externos: 'arquivos externos' };
	var TYPE_ORDER = ['projeto', 'videos', 'imagens', 'sequencias', 'audio', 'dados', 'fontes', 'saidas', 'externos'];
	var FOLDER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></svg>';
	var NS = 'http://www.w3.org/2000/svg';
	var LIST_SIZE = [460, 620]; // a janela da lista (o manifest) e a da migração, mais larga para os dois lados
	var MIG_SIZE = [780, 660];

	// as duas cores de um tipo (o tom claro e a cor), lidas do css
	function typeColors(type) {
		var probe = el('i');

		probe.setAttribute('data-type', type);
		probe.hidden = true;
		document.body.appendChild(probe);

		var cs = getComputedStyle(probe);
		var colors = [cs.getPropertyValue('--type-soft').trim() || '#9aa3b5', cs.getPropertyValue('--type').trim() || '#6b7488'];

		probe.remove();

		return colors;
	}

	function svgNode(tag, attrs, parent) {
		var node = document.createElementNS(NS, tag);

		Object.keys(attrs).forEach(function (k) {
			node.setAttribute(k, attrs[k]);
		});
		if (parent) parent.appendChild(node);

		return node;
	}

	function migItem(id, name, count, opts) {
		var node = el('div', 'mg-item' + (opts.sub ? ' is-sub' : '') + (opts.empty ? ' is-empty' : '') + (opts.loose ? ' is-loose' : ''));

		node.dataset.key = id;
		if (opts.type) node.setAttribute('data-type', opts.type);
		if (opts.title) node.title = opts.title;
		if (!opts.loose) node.insertAdjacentHTML('beforeend', FOLDER_SVG);
		node.appendChild(el('span', null, name));
		if (count) node.appendChild(el('b', opts.type ? 'is-type' : null, String(count)));

		return node;
	}

	// as faixas: saem empilhadas no meio da altura da pasta antiga e chegam empilhadas na pasta nova
	function drawWires() {
		var box = $('mg');
		var plan = state.mig && state.mig.plan;
		var old = box.querySelector('.mg-wires');

		if (old) old.remove();
		if (!plan || !plan.links.length) return;

		// as faixas ficam por trás das pastas (o css): cada uma começa no centro da ponta redonda da pasta de hoje e
		// sai de trás dela, então o começo da faixa é o próprio arco da pasta
		var svg = svgNode('svg', { 'class': 'mg-wires', 'aria-hidden': 'true' });

		box.insertBefore(svg, box.firstChild);

		var area = box.getBoundingClientRect();
		var defs = svgNode('defs', {}, svg);
		var colors = {};
		var width = function (n) {
			return Math.max(2.5, Math.min(14, Math.sqrt(n) * 2.2));
		};
		var find = function (side, key) {
			return Array.prototype.filter.call(box.querySelectorAll('.mg-col.is-' + side + ' .mg-item'), function (n) {
				return n.dataset.key === key;
			})[0];
		};
		var sumOut = {};
		var sumIn = {};
		var offOut = {};
		var offIn = {};
		var first = box.querySelector('.mg-col.is-old .mg-item');
		var firstNew = box.querySelector('.mg-col.is-new .mg-item');

		if (!first || !firstNew) return;

		var x0 = first.getBoundingClientRect().right - area.left;
		var x9 = firstNew.getBoundingClientRect().left - area.left + 22;

		plan.links.forEach(function (l) {
			sumOut[l.from] = (sumOut[l.from] || 0) + width(l.count) + 2;
			sumIn[l.to] = (sumIn[l.to] || 0) + width(l.count) + 2;

			if (!colors[l.type]) {
				colors[l.type] = typeColors(l.type);

				var grad = svgNode('linearGradient', { id: 'mg-grad-' + l.type, gradientUnits: 'userSpaceOnUse', x1: x0, x2: x9, y1: 0, y2: 0 }, defs);

				svgNode('stop', { offset: 0, 'stop-color': colors[l.type][0] }, grad);
				svgNode('stop', { offset: 1, 'stop-color': colors[l.type][1] }, grad);
			}
		});

		// as quantidades ficam numa camada por cima de todas as faixas (uma faixa grossa não esconde o número da
		// vizinha) e cada uma num ponto diferente da sua faixa: as de uma mesma pasta, escalonadas ao longo do caminho
		var labels = [];
		var nOut = {};
		var iOut = {};

		plan.links.forEach(function (l) {
			nOut[l.from] = (nOut[l.from] || 0) + 1;
		});

		plan.links.forEach(function (l) {
			var a = find('old', l.from);
			var z = find('new', l.to);

			if (!a || !z) return;

			var ra = a.getBoundingClientRect();
			var rz = z.getBoundingClientRect();
			var w = width(l.count);
			var y1 = ra.top - area.top + ra.height / 2 - (sumOut[l.from] - 2) / 2 + (offOut[l.from] || 0) + w / 2;
			var y2 = rz.top - area.top + rz.height / 2 - (sumIn[l.to] - 2) / 2 + (offIn[l.to] || 0) + w / 2;
			var x1 = ra.right - area.left - ra.height / 2;
			var x2 = rz.left - area.left - 12;
			var mid = (x1 + x2) / 2;
			var head = Math.max(4.5, w / 2 + 2.5);
			var g = svgNode('g', { 'class': 'mg-wire' }, svg);

			offOut[l.from] = (offOut[l.from] || 0) + w + 2;
			offIn[l.to] = (offIn[l.to] || 0) + w + 2;
			g.dataset.from = l.from;
			g.dataset.to = l.to;
			svgNode('path', { 'class': 'mg-band', d: 'M' + x1 + ' ' + y1 + 'C' + mid + ' ' + y1 + ' ' + mid + ' ' + y2 + ' ' + x2 + ' ' + y2, 'stroke-width': w, stroke: 'url(#mg-grad-' + l.type + ')' }, g);
			svgNode('path', { d: 'M' + (x2 - 1) + ' ' + (y2 - head) + 'L' + (x2 + 8) + ' ' + y2 + 'L' + (x2 - 1) + ' ' + (y2 + head) + 'Z', fill: colors[l.type][1] }, g);
			// o ponto da quantidade na curva: de 30% a 70% do caminho, conforme a posição da faixa na pasta
			var i = iOut[l.from] || 0;
			var t = nOut[l.from] > 1 ? 0.3 + 0.4 * i / (nOut[l.from] - 1) : 0.5;
			var u = 1 - t;

			iOut[l.from] = i + 1;
			labels.push({
				x: u * u * u * x1 + 3 * u * u * t * mid + 3 * u * t * t * mid + t * t * t * x2,
				y: u * u * u * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y2,
				link: l
			});
		});

		labels.forEach(function (lb) {
			var text = svgNode('text', { 'class': 'mg-count', x: lb.x, y: lb.y + 3.5, 'text-anchor': 'middle', fill: colors[lb.link.type][1] }, svg);

			text.dataset.from = lb.link.from;
			text.dataset.to = lb.link.to;
			text.textContent = lb.link.count;
		});
	}

	// o mouse numa pasta acende só as faixas dela (e as pastas do outro lado)
	function migFocus(item) {
		var box = $('mg');
		var side = item.closest('.mg-col').classList.contains('is-old') ? 'from' : 'to';
		var other = side === 'from' ? 'to' : 'from';
		var on = {};

		box.classList.add('is-focus');
		Array.prototype.forEach.call(box.querySelectorAll('.mg-wire, .mg-count'), function (w) {
			var hit = w.dataset[side] === item.dataset.key;

			w.classList.toggle('is-on', hit);
			if (hit) on[w.dataset[other]] = true;
		});
		Array.prototype.forEach.call(box.querySelectorAll('.mg-item'), function (n) {
			var mine = n.closest('.mg-col').classList.contains(side === 'from' ? 'is-old' : 'is-new');

			n.classList.toggle('is-on', n === item || (!mine && !!on[n.dataset.key]));
		});
	}

	function renderMigration() {
		var plan = state.mig.plan;
		var box = $('mg');
		var oldCol = el('div', 'mg-col is-old');
		var newCol = el('div', 'mg-col is-new');
		var legend = el('div', 'mg-legend');
		var grid = el('div', 'mg-grid');
		var seen = {};
		var parts = [];

		box.textContent = '';
		oldCol.appendChild(el('p', 'mg-title', 'HOJE'));
		newCol.appendChild(el('p', 'mg-title', 'ESTRUTURA NOVA'));

		// as pastas de hoje; no fim, os arquivos soltos na raiz e os usados que estão fora da pasta do projeto ('..'),
		// que a migração copia (os originais ficam onde estão)
		plan.sources.forEach(function (s) {
			var out = s.name === '..';

			oldCol.appendChild(migItem(s.name, out ? 'fora da pasta · copiados' : s.name || 'soltos na raiz', s.count, { loose: out || !s.name, title: out ? 'arquivos usados pelo projeto que estão fora da pasta dele (outra pasta da rede, este computador): a migração copia para a pasta do tipo e aponta o projeto para a cópia. os originais ficam onde estão.' : '' }));
		});
		// sem nada fora do lugar (já migrada, ou já arrumada): o lado de hoje diz isso
		if (!plan.sources.length) oldCol.appendChild(migItem('', plan.undo ? 'tudo na estrutura nova' : 'nada fora do lugar', 0, { loose: true, empty: true }));

		plan.dests.forEach(function (d) {
			var name = d.path.split('/').pop();
			// a pasta que só tem subpastas recebendo arquivos não fica apagada
			var busy = d.count || plan.dests.some(function (o) {
				return o.count && o.path.indexOf(d.path + '/') === 0;
			});

			newCol.appendChild(migItem(d.path, name, d.count, { sub: d.depth > 0, empty: !busy, type: d.count ? d.type : '', title: d.extra ? d.path + '\nnão está na árvore de configuração > coletar: a migração cria esta pasta' : d.path }));
		});
		plan.links.forEach(function (l) {
			seen[l.type] = true;
		});
		TYPE_ORDER.forEach(function (t) {
			if (!seen[t]) return;

			var chip = el('span');
			var mark = el('i');

			mark.setAttribute('data-type', t);
			chip.appendChild(mark);
			chip.appendChild(document.createTextNode(TYPE_NAMES[t] || t));
			legend.appendChild(chip);
		});

		// com outros projetos na pasta: religar todos (o After abre cada um) ou só o aberto (o padrão)
		if (plan.others && !plan.undo) {
			var all = el('label', 'cfg-switch mg-all');
			var input = el('input');

			input.type = 'checkbox';
			input.id = 'mg-all';
			input.checked = !!state.mig.all;
			input.disabled = state.busy;
			input.addEventListener('change', function () {
				setAllProjects(input.checked);
			});
			all.title = 'ligado: o After Effects abre cada projeto da pasta para ler o que ele usa e, depois de mover, abre de novo para religar e salvar (o original de cada um fica guardado nos arquivos externos). demora mais.\ndesligado: só o projeto aberto é religado; os outros vão para a pasta dos projetos sem religar.';
			all.appendChild(input);
			all.appendChild(el('span', 'cfg-switch-track'));
			all.appendChild(el('span', 'cfg-switch-label', 'religar também ' + (plan.others === 1 ? 'o outro projeto' : 'os outros ' + plan.others + ' projetos') + ' da pasta'));
			box.appendChild(all);
		}

		grid.appendChild(oldCol);
		grid.appendChild(el('div', 'mg-gap'));
		grid.appendChild(newCol);
		box.appendChild(grid);
		if (legend.childNodes.length) box.appendChild(legend);

		Array.prototype.forEach.call(box.querySelectorAll('.mg-item'), function (item) {
			item.addEventListener('mouseenter', function () {
				migFocus(item);
			});
			item.addEventListener('mouseleave', function () {
				box.classList.remove('is-focus');
			});
		});

		parts.push(plan.name);
		if (state.mig.done) parts.push(plural(plan.total, 'arquivo migrado', 'arquivos migrados'));
		else parts.push(plan.total ? plural(plan.total, 'arquivo para mover', 'arquivos para mover') : 'nada para mover');
		if (plan.stay && !state.mig.done) parts.push(plan.stay + ' já no lugar');
		$('fw-file').innerHTML = FILE_SVG;
		$('fw-file').appendChild(el('span', null, parts.join(' · ')));

		drawWires();
		migFooter();
	}

	// o rodapé da migração: o voltar, o que vale saber antes e o botão (Migrar, ou Desfazer depois de migrada)
	function migFooter() {
		var plan = state.mig.plan;
		var go = $('cw-go');
		var notes = [];

		go.classList.toggle('button-primary', !plan.undo);
		go.disabled = state.busy || (!plan.undo && (!plan.total || plan.partial));
		go.textContent = plan.undo ? 'Desfazer a migração' : plan.total ? 'Migrar: ' + plan.total : 'Migrar';

		if (state.mig.note) return; // o resultado da última ação fica na tela
		if (plan.undo && !plan.total) {
			status('esta pasta já foi migrada: o registro na raiz dela desfaz.', '');
			return;
		}

		if (plan.partial) notes.push('a pasta é grande demais para ler de uma vez: nada pode ser movido');
		else if (plan.undo) notes.push('esta pasta já foi migrada');
		else if (plan.total) notes.push('nada foi movido ainda');
		if (plan.conflicts) notes.push(plural(plan.conflicts, 'nome repetido ganha', 'nomes repetidos ganham') + ' _2');
		if (plan.others && !plan.all) notes.push(plural(plan.others, 'outro .aep vai', 'outros .aep vão') + ' sem religar');
		if (plan.others && plan.all) notes.push(plural(plan.others, 'outro projeto é religado', 'outros projetos são religados') + ' (o After abre cada um)');
		if (state.mig.unread && state.mig.unread.length) notes.push(plural(state.mig.unread.length, 'projeto não abriu', 'projetos não abriram') + ' (vão sem religar)');
		if (plan.outside) notes.push(plural(plan.outside, 'arquivo de fora da pasta é copiado', 'arquivos de fora da pasta são copiados'));
		status(notes.join(' · ') + (notes.length ? '.' : ''), '');
		$('fw-status').title = notes.join('\n');
	}

	async function openMigration() {
		if (state.busy) return;

		state.busy = true;
		status('lendo a pasta do projeto…');

		try {
			var plan = await call('migratePlan');

			state.mig = { plan: plan, note: '', done: false, all: false, unread: [] };
			state.finds = null;
			$('fw-list').hidden = true;
			$('fw-empty').hidden = true;
			$('cw-filter').hidden = true;
			$('cw-other').hidden = true;
			$('cw-relink').hidden = true;
			$('mg-back').hidden = false;
			$('mg').hidden = false;
			document.body.classList.add('is-migrating');
			PAD_BRIDGE.resizeWindow(MIG_SIZE[0], MIG_SIZE[1]);
			state.busy = false;
			renderMigration();
		} catch (err) {
			state.busy = false;
			status(err.message, 'error');
		}
	}

	function closeMigration() {
		if (state.busy) return;

		state.mig = null;
		state.key = '';
		$('mg').hidden = true;
		$('mg').textContent = '';
		$('mg-back').hidden = true;
		$('fw-list').hidden = false;
		$('cw-other').hidden = false;
		$('cw-relink').hidden = false;
		$('cw-go').classList.add('button-primary');
		document.body.classList.remove('is-migrating');
		PAD_BRIDGE.resizeWindow(LIST_SIZE[0], LIST_SIZE[1]);
		status('');
		load();
	}

	// todos os projetos: o After abre cada outro projeto da pasta para ler o que ele usa (o plano passa a contar
	// como usado o que qualquer um usa); desligando, volta o plano só do projeto aberto
	async function setAllProjects(on) {
		if (state.busy) return;

		state.busy = true;
		state.mig.note = '';
		migFooter();

		try {
			if (on) {
				var begin = await call('migrateReadBegin');
				var step = { done: 0, total: begin.total };

				try {
					while (step.done < step.total) {
						status('lendo os projetos da pasta: ' + (step.done + 1) + '/' + step.total + '…');
						step = await call('migrateReadStep');
					}
				} finally {
					state.mig.unread = (await call('migrateReadEnd')).failed || [];
				}
			} else state.mig.unread = [];

			state.mig.all = on;
			state.mig.plan = await call('migratePlan', { all: on });
		} catch (err) {
			state.mig.all = false;
			state.busy = false;
			renderMigration();
			status(err.message, 'error');
			return;
		}

		state.busy = false;
		renderMigration();
	}

	// migra em lotes (o After Effects fica livre entre um e outro) e conta no rodapé
	async function migrate() {
		if (state.busy) return;

		state.busy = true;
		state.mig.note = '';
		migFooter();

		try {
			var begin = await call('migrateBegin', { all: !!state.mig.all });
			var step = { done: 0, total: begin.total, failed: 0 };

			while (step.done < step.total) {
				status('movendo ' + step.done + '/' + step.total + '…');
				step = await call('migrateStep', { count: 8 });
			}

			status('religando e salvando o projeto…');

			var res = await call('migrateEnd');
			var parts = [plural(res.moved + (res.project ? 1 : 0), 'arquivo migrado', 'arquivos migrados')];

			if (res.relinked) parts.push(plural(res.relinked, 'item religado', 'itens religados'));
			if (res.queue) parts.push(plural(res.queue, 'saída da fila apontada', 'saídas da fila apontadas') + ' para a pasta nova');
			if (res.folders) parts.push(plural(res.folders, 'pasta vazia apagada', 'pastas vazias apagadas'));
			if (res.failed && res.failed.length) parts.push(plural(res.failed.length, 'não pôde ser movido', 'não puderam ser movidos'));

			// todos os projetos: cada um dos outros é aberto, religado, salvo e fechado; no fim, volta o de antes
			if (res.others) {
				var others = { done: 0, total: res.others };
				var after;

				try {
					while (others.done < others.total) {
						status('religando os projetos da pasta: ' + (others.done + 1) + '/' + others.total + '…');
						others = await call('migrateOthersStep');
					}
				} finally {
					after = await call('migrateOthersEnd');
				}

				if (after.projects) parts.push(plural(after.projects, 'outro projeto religado', 'outros projetos religados'));
				if (after.failed && after.failed.length) {
					parts.push(plural(after.failed.length, 'projeto não abriu', 'projetos não abriram') + ' (movido sem religar)');
					res.failed = (res.failed || []).concat(after.failed);
				}
				if (after.folders && !res.folders) parts.push(plural(after.folders, 'pasta vazia apagada', 'pastas vazias apagadas'));
			}

			// o desenho do que foi feito fica na tela (o plano de antes), agora com o desfazer
			state.mig.plan.undo = true;
			state.mig.done = true;
			state.mig.note = parts.join(' · ') + '.';
			state.busy = false;
			renderMigration();
			status(state.mig.note, res.failed && res.failed.length ? 'error' : 'success');
			$('fw-status').title = parts.concat(res.failed || []).join('\n');
		} catch (err) {
			state.busy = false;
			migFooter();
			status(err.message, 'error');
		}
	}

	async function undoMigration() {
		if (state.busy) return;

		state.busy = true;
		state.mig.note = '';
		migFooter();
		status('desfazendo a migração…');

		try {
			var res = await call('migrateUndo');
			var parts = [plural(res.restored, 'arquivo de volta', 'arquivos de volta') + ' ao lugar de antes'];

			if (res.relinked) parts.push(plural(res.relinked, 'item religado', 'itens religados'));
			if (res.failed && res.failed.length) parts.push(plural(res.failed.length, 'não pôde voltar', 'não puderam voltar'));

			state.mig.plan = await call('migratePlan');
			state.mig.done = false;
			state.mig.note = parts.join(' · ') + '.';
			state.busy = false;
			renderMigration();
			status(state.mig.note, res.failed && res.failed.length ? 'error' : 'success');
			$('fw-status').title = parts.concat(res.failed || []).join('\n');
		} catch (err) {
			state.busy = false;
			migFooter();
			status(err.message, 'error');
		}
	}

	function init() {
		$('cw-relink').addEventListener('click', findMissing);
		PAD_KEYS.primary($('cw-go')); // Cmd/Ctrl+Enter faz o botão principal
		$('cw-go').addEventListener('click', function () {
			if (state.mig) {
				if (state.mig.plan.undo) undoMigration();
				else migrate();
			} else if (found().length) relink();
			else collect('');
		});
		$('mg-back').addEventListener('click', closeMigration);
		window.addEventListener('resize', function () {
			if (state.mig) drawWires();
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
				if (btn.dataset.action === 'migrate') {
					if (!state.data || !state.data.root) throw new Error('#PAD_104 - migrar: salve o projeto antes (a migração arruma a pasta onde ele está).');
					await openMigration();
				}
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
