/*

---------------------------------------------------------------
> a estrutura do projeto, animada (A CLAQUETE, etapa ATRAÇÃO)
---------------------------------------------------------------

A árvore de pastas que o projeto novo vai ter (configuração > coletar), montada em loop: a pasta da atração, as
linhas que ligam cada pasta à de cima desenhando, as pastas entrando uma a uma e, em cada uma, o que ela recebe
(o projeto, as fontes, as imagens, os vídeos, os áudios, os dados), cada um com o nome, numa linha logo abaixo
da pasta, com a pasta abrindo um pouco para receber.

  PAD_SHAPE_ANIM.mount(box, folders, opts)   → desenha e anima em 'box' (folders: [{ name, depth, contents }])
                                               opts: { root: 'ATRAÇÃO NOVA', file: 'NOME DO PROJETO.aep' }
  PAD_SHAPE_ANIM.stop(box)

*/

(function () {
	'use strict';

	var NS = 'http://www.w3.org/2000/svg';
	var ROW = 26; // altura de cada linha
	var INDENT = 22; // recuo por nível
	var ICON = 16; // o ícone da pasta
	var STEP = 170; // ms entre uma pasta e a próxima
	var KIND_STEP = 110; // ms entre um arquivo e o próximo
	var LOOP = 8200; // ms do ciclo inteiro

	var FOLDER_BACK = 'M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h7.5A1.5 1.5 0 0 1 20 10v1.5';
	var FOLDER_FRONT = 'M3.5 11.5h17V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z';
	var KINDS = {
		projeto: { file: true, label: 'projeto' },
		fontes: { d: 'M5.5 7.5V5.5h13v2M12 5.5v13M9 18.5h6', label: 'fontes' },
		imagens: { d: 'M3.5 7.5a2.5 2.5 0 0 1 2.5-2.5h12a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5zM9 8.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2M4.5 17.5l5-5 3.5 3.5 2.5-2.5 4 4', label: 'imagens' },
		sequencias: { d: 'M8.5 7h10a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 18.5 18h-10A1.5 1.5 0 0 1 7 16.5v-8A1.5 1.5 0 0 1 8.5 7M4 15V5.5A1.5 1.5 0 0 1 5.5 4H16', label: 'sequências' },
		videos: { d: 'M5.5 5h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M7.5 5v14M16.5 5v14', label: 'vídeos' },
		audio: { d: 'M9 18V6l10-2v12M6.5 15.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5M16.5 13.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5', label: 'áudios' },
		dados: { d: 'M5 6c0-1.4 3.1-2.5 7-2.5s7 1.1 7 2.5-3.1 2.5-7 2.5S5 7.4 5 6M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5', label: 'dados' }
	};
	var FILE = 'M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z';

	function node(tag, attrs, parent) {
		var n = document.createElementNS(NS, tag);

		Object.keys(attrs || {}).forEach(function (k) {
			n.setAttribute(k, attrs[k]);
		});
		if (parent) parent.appendChild(n);

		return n;
	}

	// o ícone (24 × 24) no lugar e no tamanho; a classe (e as animações) vai no grupo de dentro: o de fora fica com
	// o transform de posição (uma animação de CSS no mesmo grupo apagaria a posição)
	function icon(parent, d, x, y, cls, size) {
		var outer = node('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + (size || ICON) / 24 + ')' }, parent);
		var g = node('g', { class: cls }, outer);

		node('path', { d: d }, g);

		return g;
	}

	function delay(el, ms) {
		el.style.animationDelay = ms + 'ms';
	}

	function draw(box, folders, opts) {
		// as linhas: a pasta da atração, cada pasta e, logo abaixo dela (antes das subpastas), o que ela recebe
		var rows = [{ name: opts.root || 'ATRAÇÃO NOVA', depth: -1, contents: [] }];

		folders.forEach(function (f) {
			rows.push({ name: f.name, depth: f.depth, contents: f.contents });
			(f.contents || []).forEach(function (kind) {
				if (KINDS[kind]) rows.push({ kind: kind, depth: f.depth + 1 });
			});
		});

		var height = rows.length * ROW + 4;
		var svg = node('svg', { class: 'shape-anim', viewBox: '0 0 600 ' + height, width: 600, height: height, 'aria-hidden': 'true' });
		var lines = node('g', { class: 'sa-lines' }, svg);
		var parents = [];
		var t = 0;
		var nFolders = rows.filter(function (r) {
			return !r.kind;
		}).length;
		var at = nFolders * STEP + 250; // os itens entram depois das pastas, um a um

		box.textContent = '';
		box.appendChild(svg);

		rows.forEach(function (r, i) {
			var x = (r.depth + 1) * INDENT;
			var y = i * ROW + 4;
			var cy = y + ICON / 2 + 1;
			var when = r.kind ? at : t;

			// a linha da pasta de cima até esta: desce e vira
			if (r.depth >= 0) {
				var p = parents[r.depth];
				var px = p.x + ICON / 2;
				var line = node('path', { class: 'sa-line' + (r.kind ? ' is-item' : ''), d: 'M' + px + ' ' + (p.y + ICON + 3) + 'V' + cy + 'H' + (x - 3), pathLength: '1' }, lines);

				delay(line, when);
			}

			if (r.kind) {
				// o item: o ícone do tipo e o nome (o projeto, o .aep, no destaque); a pasta de cima abre ao receber
				var k = KINDS[r.kind];
				var g = node('g', { class: 'sa-drop sa-item' + (k.file ? ' is-file' : '') }, svg);

				icon(g, k.file ? FILE : k.d, x + 1, y + 1, k.file ? 'sa-file-icon' : 'sa-kind', 14);

				var label = node('text', { x: x + ICON + 6, y: cy + 3.5, class: k.file ? 'sa-file-name' : 'sa-item-name' }, g);

				label.textContent = k.file ? (opts.file || 'projeto.aep') : k.label;
				delay(g, at);
				delay(parents[r.depth].front, at - 60);
				parents[r.depth].front.classList.add('is-receiving');
				at += KIND_STEP;
				return;
			}

			var row = node('g', { class: 'sa-row' + (r.depth < 0 ? ' is-root' : '') }, svg);
			var folder = node('g', { transform: 'translate(' + x + ' ' + y + ')' }, row);

			icon(folder, FOLDER_BACK, 0, 0, 'sa-back');
			r.front = icon(folder, FOLDER_FRONT, 0, 0, 'sa-front');

			var text = node('text', { x: x + ICON + 7, y: cy + 3.5, class: 'sa-name' }, row);

			text.textContent = r.name;
			delay(row, t);
			r.x = x;
			r.y = y;
			parents[r.depth + 1] = r;
			parents.length = r.depth + 2;
			t += STEP;
		});

		svg.style.setProperty('--sa-loop', LOOP + 'ms');

		// em tamanho real (1 unidade = 1 px), justo no desenho: a árvore fica no meio do espaço
		var bb = svg.getBBox();

		svg.setAttribute('viewBox', [Math.floor(bb.x) - 4, Math.floor(bb.y) - 4, Math.ceil(bb.width) + 8, Math.ceil(bb.height) + 8].join(' '));
		svg.setAttribute('width', Math.ceil(bb.width) + 8);
		svg.setAttribute('height', Math.ceil(bb.height) + 8);
	}

	function mount(box, folders, opts) {
		stop(box);
		if (!folders || !folders.length) return;

		draw(box, folders, opts || {});
		box._saTimer = setInterval(function () {
			if (document.hidden || box.hidden || !box.isConnected) return;

			var svg = box.firstChild;

			if (!svg) return;

			svg.classList.remove('is-playing');
			void svg.getBoundingClientRect();
			svg.classList.add('is-playing');
		}, LOOP);
		box.firstChild.classList.add('is-playing');
	}

	function stop(box) {
		clearInterval(box._saTimer);
		box._saTimer = null;
	}

	window.PAD_SHAPE_ANIM = { mount: mount, stop: stop };
})();
