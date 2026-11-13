/*

---------------------------------------------------------------
> LISTA DE PRODUÇÕES — editor
---------------------------------------------------------------

Edita o 'O_PADEIRO_GLOBAL_config.json' compartilhado pela equipe:
nome do menu, ícone (24 x 24 px, opcional) e pasta de templates de cada produção.
Salvar confere se o arquivo mudou desde a leitura (outra pessoa pode ter editado).

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/producoes.md';
	var ICON_SIZE = 24; // ícone da produção: 24 x 24 px

	var state = {
		rows: [], // { id, name, icon, path, exists: null | true | false, error }
		nextId: 1,
		stamp: 0,
		snapshot: '',
		discardTimer: null,
		saving: false,
		log: { mode: 'webhook', webhook: '' }, // onde cada render da fila é registrado
		drives: { drives: [], shares: [], defaultServer: '' }, // mapa de drives da rede (aba REDE)
		rename: { types: [], fixed: [], removeSpecial: true, textCase: 'upperCase', separator: ' - ' }, // aba RENOMEAR; termos editados como texto
		organize: { folders: [], renderComments: '', editComments: '', autoComment: '', dataExtensions: '', commentSubfolders: true, fileTags: '' }, // aba ORGANIZAR (folders: { name, parent, contents })
		search: { url: '', servidor: [] }, // aba BUSCAR: o webhook da busca e os caminhos fixos do servidor [{ name, path }]
		links: [], // aba LINKS: [{ name, url, icon }] (icon vazio = favicon do site)
		project: { categories: [] }, // aba PROJETO: as categorias da atração nova [{ name, path e output (com tokens), icon }]
		collect: { folders: [] }, // aba COLETAR (folders: { name, parent, contents })
		bar: { items: [], hidden: [] }, // aba LAYOUT: a ordem da barra ('divider' entre os grupos) e as escondidas
		appearance: null, // aba APARÊNCIA: o tema (a janela mostra a prévia enquanto edita)
		savedAppearance: null,
		// aparência e layout: o padrão da equipe (rede) e as desta pessoa (este computador); state.appearance
		// e state.bar apontam para o que está sendo editado (o da pessoa ou, em "editar o padrão da equipe", o da equipe)
		team: { appearance: null, bar: null },
		mine: { appearance: null, bar: null },
		editTeam: false,
		custom: { appearance: false, bar: false }, // a pessoa personalizou (senão, segue o padrão da equipe)
		prefsSnapshot: '',
		personal: [], // aba LINKS: os do usuário, só neste computador (gravados à parte, fora do arquivo da rede)
		personalSnapshot: '[]',
		machine: { user: '', projects: '', outputs: '', productions: [], log: true, localMode: false, fontsUpload: true, search: { mode: 'webhook', folders: [], foldersOnly: true, daily: true } }, // aba MEU USUÁRIO (só neste computador)
		fonts: { bank: '', upload: true }, // aba FONTES (o banco de fontes da equipe)
		machineSnapshot: '',
		defaultUser: '',
		categories: null, // categorias encontradas no índice (pedidas ao abrir a aba)
		tab: 'prods'
	};

	var LOG_HINTS = {
		csvGlobal: 'cada preenchimento vira uma nova linha no “O_PADEIRO_log.csv” da equipe (um arquivo só, na mesma pasta da lista de produções).',
		webhook: 'cada preenchimento é enviado para este endereço (data, produção, template, quantidade, usuário, máquina e projeto).',
		csv: 'cada preenchimento vira uma nova linha no “O_PADEIRO_log.csv” da produção (um arquivo só, na pasta de templates dela).',
		off: 'nada é registrado.'
	};

	/* =========================================================
	   Utilidades
	   ========================================================= */

	function $(id) {
		return document.getElementById(id);
	}

	function el(tag, className, text) {
		var node = document.createElement(tag);

		if (className) node.className = className;
		if (text != null) node.textContent = text;

		return node;
	}

	function svg(paths) {
		var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

		node.setAttribute('viewBox', '0 0 24 24');

		paths.forEach(function (d) {
			var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

			path.setAttribute('d', d);
			node.appendChild(path);
		});

		return node;
	}

	var ICONS = {
		add: ['M12 5.5v13M5.5 12h13'],
		remove: ['M6 6l12 12M18 6 6 18'],
		folder: ['M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17z']
	};

	function miniButton(icon, title, onClick) {
		var btn = el('button', 'mini-button');

		btn.type = 'button';
		btn.title = title;
		btn.setAttribute('aria-label', title);
		btn.appendChild(svg(ICONS[icon]));
		btn.addEventListener('click', onClick);

		return btn;
	}

	// A lixeira de uma linha (excluir a linha inteira): fica fora do campo, à direita da linha, para não parecer
	// que só apaga o texto. a tampa levanta um pouco ao passar o mouse.
	var TRASH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><g class="trash-lid"><path d="M4.5 7h15" /><path d="M10 7V5h4v2" /></g><path d="M6.5 7h11l-1 12.5h-9z" /><path d="M10 11v5M14 11v5" /></svg>';
	var DEL_ROWS = '.prod-row, .drive-row, .link-row, .rename-row, .index-row';

	function rowDelete(title, onClick) {
		var btn = el('button', 'row-del');

		btn.type = 'button';
		btn.title = title;
		btn.setAttribute('aria-label', title);
		btn.innerHTML = TRASH_SVG;
		btn.addEventListener('click', function () {
			collapseThen(btn.closest(DEL_ROWS), onClick);
		});

		return btn;
	}

	// Excluir uma linha: ela esmaece e, montada a lista de novo (já sem ela), tudo o que estava embaixo (as
	// linhas seguintes, o '+ novo', as outras seções) desliza da posição antiga para a nova, sem pular. a lista
	// montada de novo não repete a animação de entrada das linhas.
	var FADE_MS = 110;
	var SLIDE_MS = 220;
	var EASE_SLIDE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

	function collapseThen(row, done) {
		var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (!row || !row.animate || reduce || state.collapsing) return finish();

		var list = row.parentElement;
		var pane = row.closest('.cfg-pane') || document.body;
		var kind = row.classList[0];
		var rows = siblingsOf(list, kind);
		var index = rows.indexOf(row);
		var top0 = row.getBoundingClientRect().top;
		// as linhas de baixo (pela posição na lista) e o que vem depois da lista na folha (os mesmos elementos)
		var rowTops = rows.slice(index + 1).map(function (r) {
			return r.getBoundingClientRect().top;
		});
		var after = belowIn(pane, top0, list).concat(Array.prototype.filter.call(list.children, function (c) {
			// o que fica na lista mas não é linha (o '+ nova produção', o arquivo da lista): volta igual
			return !c.classList.contains(kind) && c.getBoundingClientRect().top > top0 + 1;
		})).map(function (node) {
			return { node: node, top: node.getBoundingClientRect().top };
		});

		state.collapsing = true;
		row.style.pointerEvents = 'none';
		row.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: 'ease-out', fill: 'forwards' }).onfinish = function () {
			state.collapsing = false;
			finish();

			// FLIP: da posição antiga para a nova
			siblingsOf(list, kind).slice(index).forEach(function (r, j) {
				slide(r, rowTops[j]);
			});
			after.forEach(function (it) {
				if (document.body.contains(it.node)) slide(it.node, it.top);
			});
		};

		function finish() {
			done();
			// as linhas novas desta lista entram já paradas (sem a animação de entrada)
			if (list) {
				Array.prototype.forEach.call(list.children, function (c) {
					c.style.animation = 'none';
				});
			}
		}
	}

	function siblingsOf(list, kind) {
		if (!list) return [];

		return Array.prototype.filter.call(list.children, function (c) {
			return c.classList.contains(kind);
		});
	}

	// os elementos da folha que estão abaixo da linha e fora da lista (filhos diretos da folha e das seções)
	function belowIn(pane, top, list) {
		var out = [];

		Array.prototype.forEach.call(pane.querySelectorAll(':scope > *, :scope > * > *'), function (node) {
			if (node === list || node.contains(list) || list.contains(node)) return;
			if (node.getBoundingClientRect().top > top + 1 && node.offsetParent) out.push(node);
		});

		// sem repetir: o filho de um elemento que já desliza vai junto com ele
		return out.filter(function (node) {
			return !out.some(function (o) {
				return o !== node && o.contains(node);
			});
		});
	}

	function slide(node, oldTop) {
		if (oldTop == null || !node.animate) return;

		var dy = oldTop - node.getBoundingClientRect().top;

		if (Math.abs(dy) < 1) return;

		node.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'translateY(0)' }], { duration: SLIDE_MS, easing: EASE_SLIDE });
	}

	// os campos criam a lixeira junto (a ordem dos argumentos não muda); quando a linha entra na página, ela vai
	// para o fim da linha, fora do campo
	function liftDeletes(root) {
		if (!root.querySelectorAll) return;

		Array.prototype.forEach.call(root.querySelectorAll('.row-del'), function (btn) {
			var row = btn.closest(DEL_ROWS);

			if (!row || btn.parentElement === row) return;

			row.classList.add('has-del');
			row.appendChild(btn);
		});
	}

	function toast(kind, text) {
		PAD_UTIL.toast($('toast'), 'finder-toast', kind, text);
	}

	/* =========================================================
	   Ícones (PNG 24 x 24 guardado como literal de string binária,
	   o formato da lista compartilhada)
	   ========================================================= */

	function bytesToLiteral(bytes) {
		var out = "'";

		for (var i = 0; i < bytes.length; i++) {
			var b = bytes[i];
			var hex = (b < 16 ? '0' : '') + b.toString(16).toUpperCase();

			if (b === 39) out += "\\'";
			else if (b === 92) out += '\\\\';
			else if (b === 10) out += '\\n';
			else if (b === 13) out += '\\r';
			else if (b === 9) out += '\\t';
			else if (b < 32) out += '\\x' + hex;
			else if (b < 127) out += String.fromCharCode(b);
			else out += '\\u00' + hex;
		}

		return out + "'";
	}

	function canvasToLiteral(canvas) {
		var base64 = canvas.toDataURL('image/png').split(',')[1];
		var raw = atob(base64);
		var bytes = new Uint8Array(raw.length);

		for (var i = 0; i < raw.length; i++) {
			bytes[i] = raw.charCodeAt(i);
		}

		return bytesToLiteral(bytes);
	}

	// Ícone padrão: o pão do logo, só o contorno, esmaecido (aparece bem na barra clara e na escura).
	function defaultIcon() {
		var canvas = document.createElement('canvas');
		var scale = 0.62; // o pão do logo ocupa 34 x 24 de 48 x 32

		canvas.width = canvas.height = ICON_SIZE;

		var ctx = canvas.getContext('2d');

		ctx.setTransform(scale, 0, 0, scale, 12 - 24 * scale, 12 - 17 * scale);
		ctx.strokeStyle = 'rgba(138,148,166,0.8)';
		ctx.lineWidth = 1.5 / scale;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke(new Path2D('M7 24C7 12.6 14.6 5 24 5s17 7.6 17 19v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z'));
		ctx.stroke(new Path2D('M7.6 23.2h32.8'));
		ctx.stroke(new Path2D('m18.2 10.8 1.4 4.2M23.4 9.4l1.3 4.6M28.6 10.8l1.4 4.2'));

		return canvasToLiteral(canvas);
	}

	// Imagem escolhida pelo usuário → PNG 24 x 24 (recorte central, sem distorcer).
	// 'logo': a imagem inteira, sem cortar, dentro de 96 x 72 px (a logo da barra), com fundo transparente
	function imageFileToIcon(path, logo) {
		return new Promise(function (resolve, reject) {
			var base64 = PAD_BRIDGE.readFileBase64(path);

			if (!base64) return reject(new Error('não foi possível ler a imagem.'));

			var mime = /\.jpe?g$/i.test(path) ? 'image/jpeg' : 'image/png';
			var img = new Image();

			img.onload = function () {
				var canvas = document.createElement('canvas');
				var side = Math.min(img.width, img.height);

				if (logo) {
					var scale = Math.min(96 / img.width, 72 / img.height, 1);

					canvas.width = Math.max(1, Math.round(img.width * scale));
					canvas.height = Math.max(1, Math.round(img.height * scale));
					canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
					return resolve(canvasToLiteral(canvas));
				}

				canvas.width = canvas.height = ICON_SIZE;
				canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, ICON_SIZE, ICON_SIZE);
				resolve(canvasToLiteral(canvas));
			};
			img.onerror = function () {
				reject(new Error('a imagem não pôde ser aberta.'));
			};
			img.src = 'data:' + mime + ';base64,' + base64;
		});
	}

	/* =========================================================
	   Estado das linhas
	   ========================================================= */

	function newRow(data) {
		return {
			id: state.nextId++,
			name: data.name || '',
			icon: data.icon || '',
			path: data.templatesPath || '',
			exists: null,
			error: false
		};
	}

	function listForSave() {
		return state.rows.map(function (r) {
			return { name: r.name.trim(), icon: r.icon, templatesPath: r.path.trim() };
		});
	}

	function logForSave() {
		return { mode: state.log.mode, webhook: state.log.webhook.trim() };
	}

	function drivesForSave() {
		var d = state.drives;

		return {
			drives: d.drives.map(function (r) {
				return { letter: r.letter.trim().replace(/:$/, '').toUpperCase(), path: r.path.trim() };
			}),
			shares: d.shares.map(function (r) {
				return { share: r.share.trim(), server: r.server.trim() };
			}),
			defaultServer: d.defaultServer.trim()
		};
	}

	function renameForSave() {
		return {
			types: state.rename.types.map(function (t) {
				return {
					prefix: t.prefix.trim(),
					comment: t.comment.trim(),
					terms: t.terms.split(',').map(function (x) {
						return x.trim();
					}).filter(Boolean)
				};
			}),
			fixed: state.rename.fixed.map(function (f) {
				return { match: f.match.trim(), name: f.name.trim() };
			}),
			removeSpecial: state.rename.removeSpecial,
			textCase: state.rename.textCase,
			separator: state.rename.separator
		};
	}

	function commaList(text) {
		return String(text).split(',').map(function (x) {
			return x.trim();
		}).filter(Boolean);
	}

	function organizeForSave() {
		var o = state.organize;

		return {
			folders: o.folders.map(function (f) {
				return { name: f.name.trim(), parent: f.parent, contents: f.contents.slice() };
			}),
			renderComments: commaList(o.renderComments),
			editComments: commaList(o.editComments),
			autoComment: o.autoComment.trim(),
			dataExtensions: commaList(o.dataExtensions),
			commentSubfolders: o.commentSubfolders,
			fileTags: commaList(o.fileTags)
		};
	}

	function searchForSave() {
		return {
			url: state.search.url.trim(),
			servidor: state.search.servidor.map(function (r) {
				return { name: r.name.trim(), path: r.path.trim() };
			})
		};
	}

	function linksForSave() {
		return state.links.map(function (l) {
			return { name: l.name.trim(), url: l.url.trim(), icon: l.icon || '' };
		});
	}

	function personalForSave() {
		return state.personal.map(function (l) {
			return { name: l.name.trim(), url: l.url.trim(), icon: l.icon || '' };
		});
	}

	function projectForSave() {
		return {
			categories: state.project.categories.map(function (c) {
				return { name: c.name.trim().toUpperCase(), path: c.path.trim(), output: (c.output || '').trim(), icon: c.icon || '' };
			})
		};
	}

	function fontsForSave() {
		return { bank: state.fonts.bank.trim(), upload: !!state.fonts.upload };
	}

	function collectForSave() {
		var c = state.collect;

		return {
			folders: c.folders.map(function (f) {
				return { name: f.name.trim(), parent: f.parent, contents: f.contents.slice() };
			})
		};
	}

	function barForSave(bar) {
		bar = bar || state.team.bar;

		return bar ? { items: bar.items.slice(), hidden: bar.hidden.slice().sort() } : null;
	}

	function appearanceForSave() {
		return state.team.appearance ? Object.assign({}, state.team.appearance) : null;
	}

	function currentSnapshot() {
		return JSON.stringify({ list: listForSave(), log: logForSave(), drives: drivesForSave(), rename: renameForSave(), organize: organizeForSave(), search: searchForSave(), links: linksForSave(), project: projectForSave(), collect: collectForSave(), bar: barForSave(), appearance: appearanceForSave(), fonts: fontsForSave() });
	}

	// os links pessoais têm o próprio estado salvo (não dependem da lista da rede)
	// as preferências pessoais: null = igual ao padrão da equipe (a pessoa não personalizou)
	function prefsForSave() {
		var m = state.mine;
		var t = state.team;

		return {
			appearance: state.custom.appearance && m.appearance ? Object.assign({}, m.appearance) : null,
			bar: state.custom.bar && m.bar ? barForSave(m.bar) : null
		};
	}

	// uma mudança feita no modo pessoal (não no padrão da equipe) personaliza a aparência / a barra
	function markCustom() {
		var m = state.mine;
		var t = state.team;

		if (state.editTeam || !m.appearance) return;
		if (JSON.stringify(m.appearance) !== JSON.stringify(t.appearance)) state.custom.appearance = true;
		if (JSON.stringify(barForSave(m.bar)) !== JSON.stringify(barForSave(t.bar))) state.custom.bar = true;
	}

	function machineForSave() {
		var m = state.machine;

		var productions = m.productions.map(function (p) {
			return { name: p.name.trim(), path: p.path.trim() };
		}).filter(function (p) {
			return p.name || p.path;
		});

		var search = {
			mode: m.search.mode,
			folders: m.search.folders.map(function (f) {
				return f.trim();
			}).filter(Boolean),
			foldersOnly: m.search.foldersOnly,
			daily: m.search.daily
		};

		return { user: m.user.trim().toUpperCase(), projects: m.projects.trim(), outputs: m.outputs.trim(), productions: productions, log: !!m.log, localMode: !!m.localMode, search: search, fontsUpload: m.fontsUpload !== false };
	}

	function personalDirty() {
		return JSON.stringify(personalForSave()) !== state.personalSnapshot || JSON.stringify(prefsForSave()) !== state.prefsSnapshot || (state.machineSnapshot !== '' && JSON.stringify(machineForSave()) !== state.machineSnapshot);
	}

	function updateDirty() {
		markCustom();

		var dirty = currentSnapshot() !== state.snapshot || personalDirty();

		$('btn-save').classList.toggle('is-dirty', dirty); // o disquete ganha um ponto com alterações não salvas
		renderScope();

		return dirty;
	}

	/* =========================================================
	   Interface
	   ========================================================= */

	function iconSrc(row) {
		return PAD_UTIL.decodeIcon(row.icon) || PAD_UTIL.decodeIcon(state.newIcon) || ''; // sem ícone: mostra o padrão (não é gravado)
	}

	// caminho deste computador (~, /Users, /home, o disco do Mac ou uma letra do Windows fora do mapa da rede):
	// a produção da equipe é ignorada (cada um cria as suas em templates, neste computador). a mesma regra do host.
	function isLocalPath(path) {
		var p = String(path || '').trim().replace(/\\/g, '/');
		var drive = /^([A-Za-z]):(\/|$)/.exec(p);

		if (/^~(\/|$)/.test(p) || /^\/(Users|home)\//i.test(p) || /^\/Volumes\/Macintosh HD(\/|$)/i.test(p)) return true;

		return !!drive && !(state.drives.drives || []).some(function (d) {
			return String(d.letter || '').replace(/:$/, '').toUpperCase() === drive[1].toUpperCase();
		});
	}

	function dotClass(row) {
		if (isLocalPath(row.path)) return 'prod-dot is-ignored';

		return 'prod-dot' + (row.exists === true ? ' is-ok' : row.exists === false ? ' is-missing' : '');
	}

	function dotTitle(row) {
		if (isLocalPath(row.path)) return 'caminho deste computador: a produção é ignorada (cada um cria as suas em produções locais, embaixo)';

		return row.exists === true ? 'pasta de templates encontrada' : row.exists === false ? 'pasta de templates não localizada' : 'verificando a pasta…';
	}

	function buildRow(row) {
		var box = el('div', 'prod-row');
		var grip = PAD_SORT.handle();
		var iconBtn = el('button', 'cat-icon prod-icon'); // o ícone dentro do campo do nome, como nas categorias
		var img = el('img');
		var nameBox = el('div', 'cat-name');
		var name = el('input', 'cfg-input');
		var pathWrap = el('div', 'prod-path');
		var path = el('input', 'cfg-input');
		var dot = el('span', dotClass(row));

		// o ícone no seletor de produção (painel de templates): um da biblioteca de ícones (pasta icons/). um ícone
		// antigo (imagem PNG) continua aparecendo até ser trocado
		iconBtn.type = 'button';
		iconBtn.title = 'ícone que aparece no seletor de produção (opcional): clique para escolher';
		if (row.icon && !/^['"]/.test(row.icon)) {
			iconBtn.innerHTML = PAD_UTIL.iconMarkup(row.icon);
		} else if (row.icon) {
			img.alt = '';
			img.src = iconSrc(row);
			iconBtn.appendChild(img);
		} else {
			iconBtn.classList.add('is-empty');
			iconBtn.innerHTML = PAD_UTIL.iconMarkup('pasta');
		}
		iconBtn.addEventListener('click', function (e) {
			e.stopPropagation();
			openIconPicker(iconBtn, row, { title: 'ícone da produção', pane: 'pane-prods', render: render, none: true });
		});

		name.type = path.type = 'text';
		name.value = row.name;
		name.placeholder = 'nome no menu';
		name.title = 'nome que aparecerá no menu';
		name.spellcheck = path.spellcheck = false;
		name.addEventListener('input', function () {
			row.name = name.value;
			box.classList.remove('has-error');
			updateDirty();
		});

		path.value = row.path;
		path.placeholder = '//servidor/share/pasta de templates';
		path.title = 'caminho da pasta de templates';
		dot.title = dotTitle(row);

		var checkTimer = null;

		path.addEventListener('input', function () {
			row.path = path.value;
			row.exists = null;
			dot.className = dotClass(row);
			dot.title = dotTitle(row);
			box.classList.toggle('is-ignored', isLocalPath(row.path));
			box.classList.remove('has-error');
			updateDirty();

			clearTimeout(checkTimer);
			checkTimer = setTimeout(function () {
				checkFolders([row]);
			}, 700);
		});

		var pick = miniButton('folder', 'escolher a pasta de templates', async function () {
			var picked = PAD_BRIDGE.pickFolder('Selecione a pasta de templates', path.value);

			if (!picked) return;

			try {
				path.value = (await call('canonicalPath', { path: picked })).path;
			} catch (err) {
				path.value = picked;
			}

			path.dispatchEvent(new Event('input'));
		});

		var remove = rowDelete('excluir a produção', function () {
			state.rows = state.rows.filter(function (r) {
				return r !== row;
			});
			render();
			updateDirty();
		});

		// o campo do caminho leva o status (à esquerda) e os botões de pasta e de excluir (à direita)
		var actions = el('div', 'prod-path-actions');

		actions.appendChild(pick);
		pathWrap.appendChild(dot);
		pathWrap.appendChild(path);
		pathWrap.appendChild(actions);

		nameBox.appendChild(iconBtn);
		nameBox.appendChild(name);
		box.appendChild(grip);
		box.appendChild(nameBox);
		box.appendChild(pathWrap);
		box.appendChild(remove);
		box.classList.add('has-del');

		row.nodes = { box: box, dot: dot, name: name, path: path };
		box.classList.toggle('is-ignored', isLocalPath(row.path));

		if (row.error) box.classList.add('has-error');

		return box;
	}

	function render() {
		var list = $('list');

		list.textContent = '';

		if (!state.rows.length) {
			list.appendChild(el('p', 'prods-empty', 'nenhuma produção: clique em “+ nova produção”.'));
			appendNewButton();
			appendFileInfo();
			return;
		}

		state.rows.forEach(function (row) {
			list.appendChild(buildRow(row));
		});

		appendNewButton();
		appendFileInfo();
		applyFilter();
	}

	// Filtro por nome ou pasta (só esconde as linhas: salvar grava a lista inteira).
	function fold(str) {
		return String(str).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	}

	function applyFilter() {
		var key = fold($('filter').value.trim());
		var shown = 0;
		var list = $('list');
		var empty = list.querySelector('.prods-nomatch');

		state.rows.forEach(function (row) {
			if (!row.nodes) return;

			// linhas novas (ainda sem nome) e com erro ficam sempre à vista
			var match = key === '' || row.name.trim() === '' || row.error || fold(row.name + ' ' + row.path).indexOf(key) >= 0;

			row.nodes.box.hidden = !match;
			if (match) shown++;
		});

		if (empty) empty.remove();

		list.classList.toggle('is-filtered', key !== '');

		if (state.rows.length && !shown) list.insertBefore(el('p', 'prods-empty prods-nomatch', 'nenhuma produção casa com “' + $('filter').value.trim() + '”.'), state.newBtn.parentNode === list ? state.newBtn : null);
	}

	// ↑ ↓ num campo vão para o mesmo campo da linha de cima / de baixo.
	function moveBetweenRows(e) {
		if ((e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || e.altKey || e.shiftKey || PAD_KEYS.isMod(e)) return;

		var input = e.target;

		if (input.tagName !== 'INPUT') return;

		var rows = Array.prototype.filter.call($('list').querySelectorAll('.prod-row'), function (box) {
			return !box.hidden;
		});
		var box = input.closest('.prod-row');
		var at = rows.indexOf(box);
		var column = Array.prototype.indexOf.call(box.querySelectorAll('input'), input);
		var next = rows[at + (e.key === 'ArrowDown' ? 1 : -1)];

		if (!next) return;

		e.preventDefault();

		var target = next.querySelectorAll('input')[column];

		target.focus();
		target.setSelectionRange(target.value.length, target.value.length);
		next.scrollIntoView({ block: 'nearest' });
	}

	// Verifica quais pastas existem (a leitura é pelo After Effects, que pode demorar na rede).
	async function checkFolders(rows) {
		try {
			var res = await call('checkFolders', {
				paths: rows.map(function (r) {
					return r.path;
				})
			});

			rows.forEach(function (row, i) {
				row.exists = res.exists[i];

				if (row.nodes) {
					row.nodes.dot.className = dotClass(row);
					row.nodes.dot.title = dotTitle(row);
				}
			});
		} catch (err) { }
	}

	// "+ nova produção": logo abaixo das produções, como o "+ novo output" do criador
	function appendNewButton() {
		state.newBtn.hidden = false;
		$('list').appendChild(state.newBtn);
	}

	// o caminho da lista fica no fim da lista de pastas
	function appendFileInfo() {
		if (state.fileInfo && !state.fileInfo.hidden) $('list').appendChild(state.fileInfo);
	}

	function showFileInfo(res) {
		var info = state.fileInfo || (state.fileInfo = el('p', 'prods-file'));

		info.textContent = '';
		info.appendChild(PAD_UTIL.pathLine(res.configPath || '—'));
		// a lista é sempre a compartilhada: a etiqueta só aparece quando ela não está acessível
		if (!res.shared) info.appendChild(el('span', 'prods-tag is-local', 'inacessível'));
		info.title = res.shared ? res.configPath : 'a lista compartilhada (junto do padeiro, na rede) não está acessível.';
		info.hidden = false;
	}

	// Sem a lista compartilhada não há o que editar: a lista é uma só para a equipe (nada de cópia local).
	function setAvailable(available) {
		state.available = available;
		['btn-import', 'btn-export'].forEach(function (id) {
			$(id).disabled = !available;
		});
		state.newBtn.disabled = !available;
		renderLog();
		renderDrives();
		renderRename();
		renderOrganize();
		renderSearch();
		renderLinks();
		renderAppearance();
		renderProject();
		renderCollect();
		renderTools();
	}

	function showUnavailable(message) {
		var list = $('list');
		var box = el('div', 'prods-unavailable');
		var retry = el('button', 'button button-primary', 'Tentar de novo');

		retry.type = 'button';
		retry.addEventListener('click', load);
		box.appendChild(el('strong', null, 'lista compartilhada inacessível'));
		box.appendChild(el('span', null, message));
		box.appendChild(retry);
		list.textContent = '';
		list.appendChild(box);
		appendFileInfo();
	}

	/* =========================================================
	   Logs
	   ========================================================= */

	function renderLog() {
		var mode = state.log.mode;
		var webhook = $('log-webhook');

		Array.prototype.forEach.call($('log-modes').querySelectorAll('input[name="log-mode"]'), function (radio) {
			radio.checked = radio.value === mode;
			radio.disabled = !state.available;
		});

		if (webhook.value !== state.log.webhook) webhook.value = state.log.webhook;
		$('log-webhook-field').hidden = mode !== 'webhook';
		webhook.disabled = !state.available;
		$('log-hint').textContent = LOG_HINTS[mode] || '';
	}

	function setLog(log) {
		state.log = { mode: (log && log.mode) || 'webhook', webhook: (log && log.webhook) || '' };
		$('log-webhook').classList.remove('has-error');
		renderLog();
	}

	function validateLog() {
		var log = logForSave();
		var bad = log.mode === 'webhook' && !/^https?:\/\/[^\s"'`$\\;&|<>]+$/i.test(log.webhook);

		$('log-webhook').classList.toggle('has-error', bad);

		return bad ? '#PAD_078 - log: endereço do webhook inválido (comece com http:// ou https://, sem espaços nem aspas).' : null;
	}

	function bindLog() {
		$('log-modes').addEventListener('change', function (e) {
			if (e.target.name !== 'log-mode') return;

			state.log.mode = e.target.value;
			$('log-webhook').classList.remove('has-error');
			renderLog();
			updateDirty();

			if (state.log.mode === 'webhook' && !state.log.webhook.trim()) $('log-webhook').focus();
		});

		$('log-webhook').addEventListener('input', function () {
			state.log.webhook = $('log-webhook').value;
			$('log-webhook').classList.remove('has-error');
			updateDirty();
		});
	}

	/* =========================================================
	   Drives da rede
	   ========================================================= */

	var SERVER_ICON = ['M5.5 4.5h13a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 9V6a1.5 1.5 0 0 1 1.5-1.5zM5.5 13.5h13a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18v-3a1.5 1.5 0 0 1 1.5-1.5z', 'M7.5 7.5h.01M7.5 16.5h.01'];
	var NETWORK_ICON = ['M5.5 6h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', 'M3.5 13h17', 'M16.5 15.5h.01M13.5 15.5h.01']; // um HD

	function setDrives(d) {
		var clone = JSON.parse(JSON.stringify(d || { drives: [], shares: [], defaultServer: '' }));

		state.drives = {
			drives: clone.drives || [],
			shares: clone.shares || [],
			defaultServer: clone.defaultServer || ''
		};
		renderDrives();
	}

	// um campo com ícone e o × de remover dentro (como os caminhos das produções)
	function driveField(value, placeholder, label, icon, onInput, onRemove) {
		var line = el('div', 'cfg-path has-field-icon no-btn');
		var input = el('input', 'cfg-input');
		var remove = rowDelete('excluir', onRemove);
		var ico = svg(icon);

		ico.setAttribute('class', 'field-icon');
		input.type = 'text';
		input.value = value;
		input.placeholder = placeholder;
		input.spellcheck = false;
		input.setAttribute('aria-label', label);
		input.disabled = !state.available;
		remove.disabled = !state.available;
		input.addEventListener('input', function () {
			onInput(input.value);

			var row = line.closest('.drive-row');

			if (row) row.classList.remove('has-error');
			updateDirty();
		});
		line.appendChild(ico);
		line.appendChild(input);
		line.appendChild(remove);

		return line;
	}

	// campo de termos em chips: a vírgula (ou Enter) fecha o termo; backspace no campo vazio apaga o último.
	// o valor continua o texto "A, B, C" (o mesmo que a configuração guarda)
	function tagField(value, placeholder, label, icon, onInput, onRemove) {
		var line = el('div', 'cfg-path has-field-icon tag-field no-btn');
		var box = el('div', 'cfg-input tag-box');
		var input = el('input', 'tag-input');
		var remove = rowDelete('excluir', onRemove);
		var ico = svg(icon);
		var tags = split(value);

		function split(text) {
			return String(text || '').split(',').map(function (x) {
				return x.trim();
			}).filter(Boolean);
		}

		function emit() {
			onInput(tags.concat(split(input.value)).join(', '));
			updateDirty();
		}

		function has(term) {
			return tags.some(function (t) {
				return t.toUpperCase() === term.toUpperCase();
			});
		}

		function commit() {
			split(input.value).forEach(function (term) {
				term = term.toUpperCase(); // como os outros campos do tipo
				if (!has(term)) tags.push(term);
			});
			input.value = '';
			draw();
			emit();
		}

		function draw() {
			Array.prototype.slice.call(box.querySelectorAll('.tag-chip')).forEach(function (c) {
				c.remove();
			});
			tags.forEach(function (term, i) {
				var chip = el('span', 'tag-chip');
				var x = el('button', 'tag-chip-x');

				chip.appendChild(el('span', null, term));
				x.type = 'button';
				x.title = 'tirar ' + term;
				x.setAttribute('aria-label', 'tirar ' + term);
				x.disabled = !state.available;
				x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" /></svg>';
				x.addEventListener('click', function (e) {
					e.stopPropagation();
					tags.splice(i, 1);
					draw();
					emit();
					input.focus();
				});
				chip.appendChild(x);
				box.insertBefore(chip, input);
			});
			input.placeholder = tags.length ? '' : placeholder;
		}

		ico.setAttribute('class', 'field-icon');
		input.type = 'text';
		input.spellcheck = false;
		input.setAttribute('aria-label', label);
		input.disabled = !state.available;
		remove.disabled = !state.available;
		input.addEventListener('input', function () {
			if (input.value.indexOf(',') >= 0) commit();
			else emit();
		});
		input.addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				commit();
			} else if (e.key === 'Backspace' && !input.value && tags.length) {
				tags.pop();
				draw();
				emit();
			}
		});
		input.addEventListener('blur', function () {
			if (input.value.trim()) commit();
		});
		box.addEventListener('mousedown', function (e) {
			if (e.target === box) {
				e.preventDefault();
				input.focus();
			}
		});
		box.appendChild(input);
		draw();
		line.appendChild(ico);
		line.appendChild(box);
		line.appendChild(remove);

		return line;
	}

	// Campo de caminho com o botão de escolher a pasta e o × à direita (sem ícone de pasta à esquerda: o botão
	// já diz o que é). onPick recebe o caminho escolhido.
	function pathField(value, placeholder, label, onInput, onPick, onRemove) {
		var line = el('div', 'cfg-path one-btn');
		var input = el('input', 'cfg-input');
		var pick = miniButton('folder', 'escolher a pasta', async function () {
			var picked = PAD_BRIDGE.pickFolder(label, input.value);

			if (!picked) return;

			try {
				picked = (await call('canonicalPath', { path: picked })).path || picked;
			} catch (err) { }

			input.value = picked;
			onPick(picked);
		});
		var remove = rowDelete('excluir', onRemove);

		input.type = 'text';
		input.value = value;
		input.placeholder = placeholder;
		input.spellcheck = false;
		input.setAttribute('aria-label', label);
		input.disabled = pick.disabled = remove.disabled = !state.available;
		input.addEventListener('input', function () {
			onInput(input.value);
			updateDirty();
		});
		line.appendChild(input);
		line.appendChild(pick);
		line.appendChild(remove);

		return line;
	}

	function renderDrives() {
		if (!state.drives) return;

		var drives = $('drive-list');
		var shares = $('share-list');

		drives.textContent = '';
		shares.textContent = '';

		state.drives.drives.forEach(function (row, i) {
			var box = el('div', 'drive-row');
			var letter = el('input', 'cfg-input drive-letter');

			letter.type = 'text';
			letter.maxLength = 2;
			letter.value = row.letter ? row.letter.replace(/:$/, '') + ':' : '';
			letter.placeholder = 'X:';
			letter.title = 'letra do drive no Windows';
			letter.setAttribute('aria-label', 'letra do drive ' + (i + 1));
			letter.disabled = !state.available;
			letter.addEventListener('input', function () {
				row.letter = letter.value.replace(/[^a-z]/gi, '').slice(0, 1).toUpperCase();
				box.classList.remove('has-error');
				updateDirty();
			});
			letter.addEventListener('blur', function () {
				letter.value = row.letter ? row.letter + ':' : '';
			});

			box.appendChild(letter);
			box.appendChild(driveField(row.path, '//servidor/share/pasta', 'caminho de rede do drive ' + (row.letter || i + 1), NETWORK_ICON, function (v) {
				row.path = v;
			}, function () {
				state.drives.drives.splice(i, 1);
				renderDrives();
				updateDirty();
			}));
			drives.appendChild(box);
		});

		state.drives.shares.forEach(function (row, i) {
			var box = el('div', 'drive-row is-share');
			var share = el('input', 'cfg-input');

			share.type = 'text';
			share.value = row.share;
			share.placeholder = 'nome do volume';
			share.title = 'nome do volume no Mac (/Volumes/NOME)';
			share.spellcheck = false;
			share.setAttribute('aria-label', 'nome do volume ' + (i + 1));
			share.disabled = !state.available;
			share.addEventListener('input', function () {
				row.share = share.value;
				box.classList.remove('has-error');
				updateDirty();
			});

			box.appendChild(share);
			box.appendChild(driveField(row.server, 'servidor.empresa.com', 'servidor do volume ' + (row.share || i + 1), SERVER_ICON, function (v) {
				row.server = v;
			}, function () {
				state.drives.shares.splice(i, 1);
				renderDrives();
				updateDirty();
			}));
			shares.appendChild(box);
		});

		var server = $('default-server');

		if (server.value !== state.drives.defaultServer) server.value = state.drives.defaultServer;
		server.disabled = !state.available;
		['btn-new-drive', 'btn-new-share'].forEach(function (id) {
			$(id).disabled = !state.available;
		});
	}

	function bindDrives() {
		$('btn-new-drive').addEventListener('click', function () {
			state.drives.drives.push({ letter: '', path: '' });
			renderDrives();
			updateDirty();
			$('drive-list').lastChild.querySelector('input').focus();
		});

		$('btn-new-share').addEventListener('click', function () {
			state.drives.shares.push({ share: '', server: '' });
			renderDrives();
			updateDirty();
			$('share-list').lastChild.querySelector('input').focus();
		});

		$('default-server').addEventListener('input', function () {
			state.drives.defaultServer = this.value;
			updateDirty();
		});
	}

	/* =========================================================
	   Renomear
	   ========================================================= */

	var TAG_ICON = ['M3.5 12.6V5A1.5 1.5 0 0 1 5 3.5h7.6l8 8a1.5 1.5 0 0 1 0 2.1l-7 7a1.5 1.5 0 0 1-2.1 0z', 'M8 8h.01'];

	function setRename(r) {
		var data = r || { types: [], fixed: [] };

		state.rename = {
			types: (data.types || []).map(function (t) {
				return { prefix: t.prefix || '', comment: t.comment || '', terms: (t.terms || []).join(', ') };
			}),
			fixed: (data.fixed || []).map(function (f) {
				return { match: f.match || '', name: f.name || '' };
			}),
			removeSpecial: data.removeSpecial !== false,
			textCase: data.textCase || 'upperCase',
			separator: data.separator == null ? ' - ' : data.separator
		};
		renderRename();
	}

	function plainInput(value, className, placeholder, label, onInput) {
		var input = el('input', 'cfg-input' + (className ? ' ' + className : ''));

		input.type = 'text';
		input.value = value;
		input.placeholder = placeholder;
		input.spellcheck = false;
		input.setAttribute('aria-label', label);
		input.disabled = !state.available;
		input.addEventListener('input', function () {
			onInput(input.value);
			updateDirty();
			testRename();
		});

		return input;
	}

	function renderRename() {
		if (!state.rename) return;

		var types = $('type-list');
		var fixed = $('fixed-list');

		types.textContent = '';
		fixed.textContent = '';

		state.rename.types.forEach(function (t, i) {
			var row = el('div', 'rename-row');

			row.appendChild(PAD_SORT.handle());
			row.appendChild(plainInput(t.prefix, 'rename-prefix', 'RDP', 'prefixo do tipo ' + (i + 1), function (v) {
				t.prefix = v;
			}));
			row.appendChild(plainInput(t.comment, null, 'RODAPE', 'comentário do tipo ' + (t.prefix || i + 1), function (v) {
				t.comment = v;
			}));

			var terms = tagField(t.terms, 'rodapé, rdp', 'termos do tipo ' + (t.prefix || i + 1), TAG_ICON, function (v) {
				t.terms = v;
				testRename();
			}, function () {
				state.rename.types.splice(i, 1);
				renderRename();
				updateDirty();
				testRename();
			});

			terms.title = 'digite um termo e a vírgula (ou Enter) para fechar; o plural com S também vale';
			row.appendChild(terms);
			types.appendChild(row);
		});

		state.rename.fixed.forEach(function (f, i) {
			var row = el('div', 'drive-row is-fixed');

			row.appendChild(plainInput(f.match, null, 'quando o nome contém… (ex: LOGO GLOBO)', 'termo do nome fixo ' + (i + 1), function (v) {
				f.match = v;
			}));
			row.appendChild(driveField(f.name, 'a comp se chama…', 'nome fixo ' + (i + 1), TAG_ICON, function (v) {
				f.name = v;
				testRename();
			}, function () {
				state.rename.fixed.splice(i, 1);
				renderRename();
				updateDirty();
				testRename();
			}));
			fixed.appendChild(row);
		});

		['btn-new-type', 'btn-new-fixed'].forEach(function (id) {
			$(id).disabled = !state.available;
		});
		$('rename-special').checked = state.rename.removeSpecial;
		$('rename-special').disabled = !state.available;
		if ($('rename-sep').value !== state.rename.separator) $('rename-sep').value = state.rename.separator;
		$('rename-sep').disabled = !state.available;
		$('rename-case').value = state.rename.textCase;
		$('rename-case').disabled = !state.available;
		PAD_DROPDOWN.refresh($('rename-case'));
		testRename();
	}

	// Prévia do renomear com a tabela em edição (a mesma regra do host, rename lib.js), só pelo nome da comp:
	// os termos aceitam acentos, e o formato (acentos e caixa) vale para a parte descritiva do nome.
	var RENAME_SEP = '[\\s_\\-]';
	var RENAME_ACCENTS = { A: 'Aaàáâãä', E: 'Eeèéêë', I: 'Iiìíîï', O: 'Ooòóôõö', U: 'Uuùúûü', C: 'Ccç', N: 'Nnñ' };

	function renameNorm(str) {
		return String(str).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, ' ').replace(/[\s_]+/g, ' ').trim();
	}

	function renameEscape(str) {
		return renameNorm(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function renameTermRegex(term) {
		var t = renameEscape(term).replace(/[\s_\-]+/g, ' ');

		return t.split('').map(function (c) {
			if (c === ' ') return RENAME_SEP + '+';

			return RENAME_ACCENTS[c] ? '[' + RENAME_ACCENTS[c] + RENAME_ACCENTS[c].toUpperCase() + ']' : c;
		}).join('') + '(S)?';
	}

	function renameFormat(text, options) {
		var t = String(text);

		if (options.removeSpecial) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, ' ');

		t = t.replace(/[\s_]+/g, ' ').trim();

		if (options.textCase === 'upperCase') return t.toUpperCase();
		if (options.textCase === 'lowerCase') return t.toLowerCase();
		if (options.textCase === 'titleCase') return t.toLowerCase().replace(/(^|\s)(\S)/g, function (m, sp, c) {
			return sp + c.toUpperCase();
		});

		return t;
	}

	function previewRename(compName) {
		var data = renameForSave();
		var raw = String(compName).replace(/\s+/g, ' ').trim();
		var types = data.types.map(function (t) {
			return {
				prefix: renameNorm(t.prefix),
				comment: renameNorm(t.comment),
				terms: t.terms.map(renameTermRegex).filter(function (x) {
					return x !== '(S)?';
				})
			};
		});
		var found = null;

		types.some(function (t) {
			return t.terms.some(function (re) {
				if (new RegExp('(^|' + RENAME_SEP + ')(' + re + ')(' + RENAME_SEP + '|$)', 'i').test(raw)) found = t;

				return !!found;
			});
		});

		var result = { name: renameFormat(raw, data), comment: null };

		if (found) {
			var clean = raw;
			var strip = function (terms) {
				terms.forEach(function (re) {
					clean = clean
						.replace(new RegExp('^(' + re + RENAME_SEP + '+)', 'gi'), '')
						.replace(new RegExp(RENAME_SEP + '+' + re + RENAME_SEP + '+', 'gi'), ' ')
						.replace(new RegExp(RENAME_SEP + '+' + re + '$', 'gi'), '')
						.replace(new RegExp('^' + re + '$', 'gi'), '');
				});
			};

			types.forEach(function (t) {
				if (t.prefix) clean = clean.replace(new RegExp('^' + t.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\-]+', 'gi'), '');
				strip(t.terms);
			});
			strip(found.terms);
			clean = renameFormat(clean.replace(/[\s_\-]+/g, ' ').trim(), data);
			result.comment = found.comment;
			result.name = clean && clean.toUpperCase() !== found.prefix ? found.prefix + data.separator + clean : found.prefix;
		}

		var norm = renameNorm(raw);

		data.fixed.some(function (f) {
			var term = renameEscape(f.match).replace(/[\s_\-]+/g, '[\\s_\\-]*');

			if (term && new RegExp(term).test(norm)) {
				result.name = renameNorm(f.name);
				return true;
			}

			return false;
		});

		return result;
	}

	function testRename() {
		var value = $('rename-test').value.trim();
		var out = $('rename-result');

		out.textContent = '';

		if (!value) return;

		var res = previewRename(value);

		out.appendChild(document.createTextNode('→ '));
		out.appendChild(el('b', null, res.name || '(vazio)'));
		out.appendChild(document.createTextNode(res.comment ? '  ·  comentário ' + res.comment : '  ·  nenhum tipo encontrado'));
	}

	function bindRename() {
		$('btn-new-type').addEventListener('click', function () {
			state.rename.types.push({ prefix: '', comment: '', terms: '' });
			renderRename();
			updateDirty();
			$('type-list').lastChild.querySelector('.rename-prefix').focus();
		});

		$('btn-new-fixed').addEventListener('click', function () {
			state.rename.fixed.push({ match: '', name: '' });
			renderRename();
			updateDirty();
			$('fixed-list').lastChild.querySelector('input').focus();
		});

		$('rename-test').addEventListener('input', testRename);

		PAD_DROPDOWN.enhance($('rename-case'), 'textCase');
		$('rename-case').addEventListener('change', function () {
			state.rename.textCase = this.value;
			updateDirty();
			testRename();
		});
		$('rename-sep').addEventListener('input', function () {
			state.rename.separator = this.value;
			updateDirty();
			testRename();
		});
		$('rename-special').addEventListener('change', function () {
			state.rename.removeSpecial = this.checked;
			updateDirty();
			testRename();
		});

		// a ordem dos tipos importa: arrastar pelo puxador reordena
		PAD_SORT.enable($('type-list'), '.rename-row', function (from, to) {
			var moved = state.rename.types.splice(from, 1)[0];

			state.rename.types.splice(to, 0, moved);
			renderRename();
			updateDirty();
		});
	}

	/* =========================================================
	   Organizar: a árvore (esquerda) e os tipos de item (direita),
	   com arrastar e soltar por eventos de mouse (o CEP não entrega
	   os de ponteiro nem o arrastar nativo)
	   ========================================================= */

	var FOLDER_PATH = 'M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z';
	var TYPES = [
		['render', 'comps de render', ['M3.5 6.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', 'M10 9.5v5l4.5-2.5z']],
		['editaveis', 'comps editáveis', ['M3.5 6.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v5', 'M3.5 6.5v11a2 2 0 0 0 2 2h5', 'M14.5 20.5v-2.6l5-5a1.8 1.8 0 0 1 2.6 2.6l-5 5z']],
		['precomps', 'outras comps', ['M3.5 6.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', 'M7.5 4.5v15M16.5 4.5v15']],
		['videos', 'vídeos', ['M4 6.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M16 10l4-2.5v9L16 14']],
		['imagens', 'imagens', ['M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'm4.5 16 4.5-4.5 4 4 2.5-2.5 4 4', 'M15 9h.01']],
		['sequencias', 'sequências de imagens', ['M8 4.5h10.5a1.5 1.5 0 0 1 1.5 1.5v10.5', 'M5.5 7h11a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19.5v-11A1.5 1.5 0 0 1 5.5 7z', 'm4.5 18 4-4 3.5 3.5 2-2 3.5 3.5']],
		['audio', 'áudio', ['M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2']],
		['solidos', 'sólidos', ['M5 5h14v14H5z']],
		['dados', 'dados', ['M4 5.5h16v13H4z', 'M4 10h16M4 14.5h16M10 5.5v13']],
		['missing', 'arquivos ausentes', ['M12 4 3 19.5h18z', 'M12 10v4.5M12 17.5h.01']]
	];

	function setOrganize(o) {
		var data = o || {};

		state.organize = {
			folders: (data.folders || []).map(function (f) {
				return { name: f.name || '', parent: f.parent || '', contents: (f.contents || (f.content ? [f.content] : [])).slice() };
			}),
			renderComments: (data.renderComments || []).join(', '),
			editComments: (data.editComments || ['EDIT']).join(', '),
			autoComment: data.autoComment || '',
			dataExtensions: (data.dataExtensions || []).join(', '),
			commentSubfolders: data.commentSubfolders !== false,
			fileTags: (data.fileTags || ['FUNDO', 'LOGO', 'FOTO', 'TRILHA', 'LOC']).join(', ')
		};
		renderOrganize();
	}

	// Árvore de pastas com tipos de item arrastáveis (organizar e coletar usam a mesma).
	// cfg: { model() → { folders }, types, treeId, typesId, paneId, newBtnId, rootLabel, rootWhere,
	//        removeTitle, rowHint(folder, depth) → nó | null, after() (depois de redesenhar) }
	function makeTree(cfg) {
		function M() {
			return cfg.model();
		}

		function renderAll() {
			render();
			if (cfg.after) cfg.after();
		}

		function typeLabel(key) {
			var t = cfg.types.filter(function (x) {
				return x[0] === key;
			})[0];

			return t ? t[1] : key;
		}

		function sameName(a, b) {
			return String(a).trim().toUpperCase() === String(b).trim().toUpperCase();
		}

		function folderByName(name) {
			return M().folders.filter(function (f) {
				return sameName(f.name, name);
			})[0] || null;
		}

		// a pasta e as que estão dentro dela (em qualquer nível)
		function subtree(folder) {
			var out = [folder];

			for (var i = 0; i < out.length; i++) {
				M().folders.forEach(function (f) {
					if (out.indexOf(f) < 0 && f.parent && sameName(f.parent, out[i].name)) out.push(f);
				});
			}

			return out;
		}

		// ordem de árvore: cada pasta logo depois da pasta pai, com a profundidade (para o recuo)
		function folderTree() {
			var folders = M().folders;
			var out = [];
			var placed = [];

			function add(parentName, depth) {
				folders.forEach(function (f) {
					if (placed.indexOf(f) >= 0) return;

					var isRoot = f.parent === '' || !folderByName(f.parent) || sameName(f.parent, f.name);

					if (parentName === null ? isRoot : sameName(f.parent, parentName)) {
						placed.push(f);
						out.push({ folder: f, depth: depth });
						if (depth < 12) add(f.name, depth + 1);
					}
				});
			}

			add(null, 0);
			folders.forEach(function (f) {
				if (placed.indexOf(f) < 0) out.push({ folder: f, depth: 0 }); // ciclo: aparece na raiz (o salvar avisa)
			});

			return out;
		}

		function folderOf(type) {
			return M().folders.filter(function (f) {
				return f.contents.indexOf(type) >= 0;
			})[0] || null;
		}

		function svgIcon(paths) {
			var node = svg(paths);

			node.setAttribute('aria-hidden', 'true');

			return node;
		}

		function chip(type, onRemove) {
			var node = el('span', 'org-chip');
			var x = el('button');

			node.setAttribute('data-type', type);
			node.appendChild(svgIcon(cfg.types.filter(function (t) {
				return t[0] === type;
			})[0][2]));
			node.appendChild(document.createTextNode(typeLabel(type)));
			x.type = 'button';
			x.title = cfg.removeTitle;
			x.setAttribute('aria-label', 'tirar ' + typeLabel(type) + ' da pasta');
			x.appendChild(svgIcon(ICONS.remove));
			x.addEventListener('click', onRemove);
			node.appendChild(x);

			return node;
		}

		// as posições das pastas (pela pasta) e dos tipos (pelo tipo) antes de redesenhar a árvore
		function flipCapture(tree) {
			var snap = { rows: new Map(), chips: {}, any: false };

			Array.prototype.forEach.call(tree.querySelectorAll('.org-folder'), function (row) {
				snap.rows.set(row._folder || 'root', row.getBoundingClientRect());
				snap.any = true;
			});
			Array.prototype.forEach.call(tree.querySelectorAll('.org-chip'), function (c) {
				snap.chips[c.getAttribute('data-type')] = c.getBoundingClientRect();
			});

			return snap;
		}

		// depois de redesenhar: o que mudou de lugar desliza do lugar antigo (como ao reordenar as listas) e o que
		// é novo entra suave. na primeira vez (a aba abrindo) nada anima
		function flipPlay(tree, snap) {
			if (!snap.any || !tree.animate) return;

			var shift = new Map(); // quanto cada pasta desliza (os tipos dentro dela já vão junto)
			var move = function (node, old, parentShift) {
				var now = node.getBoundingClientRect();
				var dx = old.left - now.left - (parentShift ? parentShift[0] : 0);
				var dy = old.top - now.top - (parentShift ? parentShift[1] : 0);

				if (!parentShift) shift.set(node, [old.left - now.left, old.top - now.top]);
				if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
				node.animate([{ transform: 'translate(' + dx + 'px, ' + dy + 'px)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2, .8, .2, 1)' });
			};
			var enter = function (node) {
				node.animate([{ opacity: 0, transform: 'translateY(-6px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2, .8, .2, 1)' });
			};

			Array.prototype.forEach.call(tree.querySelectorAll('.org-folder'), function (row) {
				var old = snap.rows.get(row._folder || 'root');

				if (old) move(row, old);
				else enter(row);
			});
			Array.prototype.forEach.call(tree.querySelectorAll('.org-chip'), function (c) {
				var old = snap.chips[c.getAttribute('data-type')];

				if (old) move(c, old, shift.get(c.closest('.org-folder')) || [0, 0]);
				else enter(c);
			});
		}

		function unassign(type) {
			M().folders.forEach(function (f) {
				var i = f.contents.indexOf(type);

				if (i >= 0) f.contents.splice(i, 1);
			});
		}

		function render() {
			if (!M()) return;

			var tree = $(cfg.treeId);
			var o = M();
			var scroll = tree.scrollTop;
			var before = flipCapture(tree);

			tree.textContent = '';

			// a raiz do projeto: recebe pastas soltas aqui e mostra os tipos que não entram em pasta nenhuma
			var root = el('div', 'org-folder is-root');
			var rootChips = el('div', 'org-chips');

			root.setAttribute('data-root', '1');
			root.appendChild(svgIcon(['M3.5 7.5A2 2 0 0 1 5.5 5.5h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', 'M3.5 9.5h17']));
			root.appendChild(el('span', 'org-root-label', cfg.rootLabel));
			cfg.types.forEach(function (t) {
				if (!folderOf(t[0])) rootChips.appendChild(chip(t[0], function () { }));
			});
			Array.prototype.forEach.call(rootChips.querySelectorAll('button'), function (b) {
				b.remove(); // na raiz não há o que tirar
			});
			rootChips.style.paddingLeft = '22px';
			root.appendChild(rootChips);
			tree.appendChild(root);

			folderTree().forEach(function (item) {
				var f = item.folder;
				var row = el('div', 'org-folder' + (item.depth ? ' is-child' : ''));
				var name = el('input', 'org-name');
				var remove = el('button', 'org-remove');
				var chips = el('div', 'org-chips');

				row.setAttribute('data-index', o.folders.indexOf(f));
				row._folder = f; // a chave da animação (a mesma pasta antes e depois)
				row.style.setProperty('--depth', item.depth + 1);
				row.appendChild(PAD_SORT.handle());
				row.appendChild(svgIcon([FOLDER_PATH]));

				name.type = 'text';
				name.value = f.name;
				name.placeholder = 'nome da pasta';
				name.spellcheck = false;
				name.disabled = !state.available;
				name.setAttribute('aria-label', 'nome da pasta');
				name.addEventListener('input', function () {
					// renomear leva as subpastas junto
					o.folders.forEach(function (child) {
						if (child !== f && child.parent && sameName(child.parent, f.name)) child.parent = name.value.trim();
					});
					f.name = name.value;
					renderTypes();
					updateDirty();
				});
				// Enter aplica o nome: sai do campo
				name.addEventListener('keydown', function (e) {
					if (e.key !== 'Enter') return;

					e.preventDefault();
					name.blur();
				});
				row.appendChild(name);

				remove.type = 'button';
				remove.title = 'excluir a pasta (as subpastas e os tipos sobem um nível)';
				remove.setAttribute('aria-label', 'excluir a pasta ' + f.name);
				remove.disabled = !state.available;
				remove.appendChild(svgIcon(ICONS.remove));
				remove.addEventListener('click', function () {
					var up = folderByName(f.parent);

					o.folders.forEach(function (child) {
						if (child !== f && sameName(child.parent, f.name)) child.parent = f.parent;
					});
					if (up) up.contents = up.contents.concat(f.contents);
					o.folders.splice(o.folders.indexOf(f), 1);
					renderAll();
					updateDirty();
				});
				row.appendChild(remove);

				f.contents.forEach(function (type) {
					chips.appendChild(chip(type, function () {
						unassign(type);
						renderAll();
						updateDirty();
					}));
				});
				row.appendChild(chips);
				tree.appendChild(row);

				if (cfg.rowHint) {
					var hintNode = cfg.rowHint(f, item.depth);

					if (hintNode) tree.appendChild(hintNode);
				}
			});

			tree.scrollTop = scroll;
			flipPlay(tree, before);
			renderTypes();

		}

		// os cartões dos tipos (direita), com o lugar de cada um
		function renderTypes() {
			var box = $(cfg.typesId);

			box.textContent = '';

			cfg.types.forEach(function (t) {
				var card = el('div', 'org-type');
				var text = el('span', 'org-type-text');
				var where = folderOf(t[0]);

				card.setAttribute('data-type', t[0]);
				card.title = 'arraste para uma pasta da árvore';
				card.appendChild(svgIcon(t[2]));
				text.appendChild(el('strong', null, t[1]));
				text.appendChild(el('span', null, where ? 'em ' + (where.name.trim() || '(sem nome)') : (cfg.whereFor && cfg.whereFor(t[0])) || cfg.rootWhere));
				card.appendChild(text);
				box.appendChild(card);
			});
		}

		/* ---------- arrastar ---------- */

		var drag = null; // { kind: 'folder' | 'type', folder, type, x, y, active, ghost, target }

		function dropTarget(x, y) {
			var hit = document.elementFromPoint(x, y);

			if (!hit) return null;

			var tree = $(cfg.treeId);
			var row = hit.closest('.org-folder');

			if (drag.kind === 'type') {
				if (row && row.hasAttribute('data-index')) return { mode: 'inside', folder: M().folders[+row.getAttribute('data-index')], row: row };
				if ((row && row.hasAttribute('data-root')) || hit.closest('.org-side') || hit.closest('.org-tree')) return { mode: 'root' };

				return null;
			}

			if (row && row.hasAttribute('data-index')) {
				var target = M().folders[+row.getAttribute('data-index')];
				var box = row.getBoundingClientRect();
				var rel = (y - box.top) / box.height;
				var mode = rel < 0.28 ? 'before' : rel > 0.72 ? 'after' : 'inside';

				if (subtree(drag.folder).indexOf(target) >= 0) return null; // não entra nela mesma

				return { mode: mode, folder: target, row: row };
			}

			if ((row && row.hasAttribute('data-root')) || (hit.closest('.org-tree') === tree)) return { mode: 'root' };

			return null;
		}

		function showTarget(t) {
			var tree = $(cfg.treeId);
			var line = tree.querySelector('.org-line');

			Array.prototype.forEach.call(tree.querySelectorAll('.is-drop-inside'), function (r) {
				r.classList.remove('is-drop-inside');
			});
			$(cfg.paneId).querySelector('.org-side').classList.toggle('is-drop-target', !!(t && t.mode === 'root' && drag.kind === 'type'));

			if (!t) {
				if (line) line.remove();
				return;
			}

			if (t.mode === 'inside') t.row.classList.add('is-drop-inside');
			if (t.mode === 'root') tree.querySelector('[data-root]').classList.add('is-drop-inside');

			if (t.mode === 'before' || t.mode === 'after') {
				if (!line) {
					line = el('div', 'org-line');
					tree.appendChild(line);
				}

				var treeBox = tree.getBoundingClientRect();
				var rowBox = t.row.getBoundingClientRect();

				line.style.left = rowBox.left - treeBox.left + 'px';
				line.style.width = rowBox.width + 'px';
				line.style.top = (t.mode === 'before' ? rowBox.top : rowBox.bottom) - treeBox.top + tree.scrollTop - 1 + 'px';
			} else if (line) {
				line.remove();
			}
		}

		function applyDrop(t) {
			var o = M();

			if (drag.kind === 'type') {
				unassign(drag.type);
				if (t.mode === 'inside') t.folder.contents.push(drag.type);
				return;
			}

			var f = drag.folder;

			o.folders.splice(o.folders.indexOf(f), 1);

			if (t.mode === 'inside') {
				f.parent = t.folder.name.trim();
				o.folders.push(f);
			} else if (t.mode === 'root') {
				f.parent = '';
				o.folders.push(f);
			} else {
				f.parent = t.folder.parent;
				o.folders.splice(o.folders.indexOf(t.folder) + (t.mode === 'after' ? 1 : 0), 0, f);
			}
		}

		function onDragMove(e) {
			if (!drag) return;

			if (!drag.active) {
				if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 5) return;

				drag.active = true;
				drag.ghost = el('div', 'org-ghost', drag.kind === 'folder' ? (drag.folder.name.trim() || 'pasta') : typeLabel(drag.type));
				document.body.appendChild(drag.ghost);
				document.body.classList.add('is-org-dragging');
			}

			e.preventDefault();
			drag.ghost.style.left = e.clientX + 'px';
			drag.ghost.style.top = e.clientY + 'px';
			drag.lastX = e.clientX;
			drag.lastY = e.clientY;
			drag.target = dropTarget(e.clientX, e.clientY);
			showTarget(drag.target);
			autoScroll();
		}

		// perto das bordas da árvore, ela rola sozinha enquanto o arrasto continua
		function autoScroll() {
			clearTimeout(drag.scrollTimer);

			var tree = $(cfg.treeId);
			var box = tree.getBoundingClientRect();
			var y = drag.lastY;
			var step = 0;

			if (drag.lastX < box.left || drag.lastX > box.right) return;
			if (y < box.top + 28 && y > box.top - 40) step = -8;
			if (y > box.bottom - 28 && y < box.bottom + 40) step = 8;
			if (!step) return;

			tree.scrollTop += step;
			drag.target = dropTarget(drag.lastX, drag.lastY);
			showTarget(drag.target);
			drag.scrollTimer = setTimeout(function () {
				if (drag && drag.active) autoScroll();
			}, 30);
		}

		function endDrag(e, cancel) {
			window.removeEventListener('mousemove', onDragMove, true);
			window.removeEventListener('mouseup', onDragUp, true);
			window.removeEventListener('keydown', onDragKey, true);

			if (!drag) return;

			var d = drag;

			clearTimeout(d.scrollTimer);
			if (d.ghost) d.ghost.remove();
			document.body.classList.remove('is-org-dragging');
			showTarget(null);
			drag = null;

			if (d.active && !cancel && d.target) {
				drag = d;
				applyDrop(d.target);
				drag = null;
				renderAll();
				updateDirty();
			}
		}

		function onDragUp(e) {
			endDrag(e, false);
		}

		function onDragKey(e) {
			if (e.key === 'Escape') {
				e.preventDefault();
				endDrag(e, true);
			}
		}

		function startDrag(e, data) {
			if (e.button !== 0 || !state.available) return;

			e.preventDefault();
			drag = Object.assign({ x: e.clientX, y: e.clientY, active: false, target: null }, data);
			window.addEventListener('mousemove', onDragMove, true);
			window.addEventListener('mouseup', onDragUp, true);
			window.addEventListener('keydown', onDragKey, true);
		}

		function bind() {
			// pastas: pelo puxador (ou pelo ícone); tipos: pelas etiquetas da árvore e pelos cartões da direita
			function onDown(e) {
				if (e.target.closest('button:not(.drag-handle), input')) return;

				var row = e.target.closest('.org-folder[data-index]');
				var tag = e.target.closest('.org-chip, .org-type');

				if (tag) return startDrag(e, { kind: 'type', type: tag.getAttribute('data-type') });
				if (row && e.target.closest('.drag-handle, svg')) startDrag(e, { kind: 'folder', folder: M().folders[+row.getAttribute('data-index')] });
			}

			$(cfg.paneId).addEventListener('mousedown', onDown);

			$(cfg.newBtnId).addEventListener('click', function () {
				var name = 'NOVA PASTA';

				for (var n = 2; folderByName(name); n++) name = 'NOVA PASTA ' + n;

				M().folders.push({ name: name, parent: '', contents: [] });
				renderAll();
				updateDirty();

				var inputs = $(cfg.treeId).querySelectorAll('.org-name');
				var last = inputs[inputs.length - 1];

				last.focus();
				last.select();
			});

		}

		return { render: renderAll, bind: bind };
	}

	var orgTree = makeTree({
		model: function () {
			return state.organize;
		},
		types: TYPES,
		treeId: 'org-tree',
		typesId: 'org-types',
		paneId: 'pane-organize',
		newBtnId: 'btn-new-folder',
		rootLabel: 'raiz do projeto',
		rootWhere: 'na raiz do projeto',
		removeTitle: 'tirar da pasta (vai para a raiz)',
		whereFor: function (type) {
			return type === 'editaveis' ? 'sem pasta: ficam com as outras comps' : null;
		},
		rowHint: function (f, depth) {
			var o = state.organize;

			// os comentários dos itens viram subpastas desta pasta (se ligado): uma subpasta "fantasma" mostra isso
			if (!o.commentSubfolders || !f.contents.length) return null;

			var sub = el('div', 'org-sub-hint');
			var example = f.contents.indexOf('render') >= 0 ? ' (RODAPE, CARTAO…)' : '';
			var icon = svg([FOLDER_PATH]);

			icon.setAttribute('aria-hidden', 'true');
			sub.style.setProperty('--depth', depth + 2);
			sub.title = 'itens com comentário ficam numa subpasta com o nome do comentário (desligue em "o comentário vira subpasta", à direita)';
			sub.appendChild(icon);
			sub.appendChild(el('span', null, 'comentários viram subpastas' + example));

			return sub;
		},
		after: organizeFields
	});

	function renderOrganize() {
		orgTree.render();
	}

	// os campos à direita (comentários de render, extensões...)
	function organizeFields() {
		var o = state.organize;
		var fields = { 'org-render': 'renderComments', 'org-edit': 'editComments', 'org-auto': 'autoComment', 'org-data': 'dataExtensions', 'org-files': 'fileTags' };

		Object.keys(fields).forEach(function (id) {
			if ($(id).value !== o[fields[id]]) $(id).value = o[fields[id]];
			$(id).disabled = !state.available;
		});
		$('org-sub').checked = o.commentSubfolders;
		$('org-sub').disabled = !state.available;
		$('btn-new-folder').disabled = !state.available;
	}

	function bindOrganize() {
		orgTree.bind();

		[['org-render', 'renderComments'], ['org-edit', 'editComments'], ['org-auto', 'autoComment'], ['org-data', 'dataExtensions'], ['org-files', 'fileTags']].forEach(function (pair) {
			$(pair[0]).addEventListener('input', function () {
				state.organize[pair[1]] = this.value;
				updateDirty();
			});
		});

		$('org-sub').addEventListener('change', function () {
			state.organize.commentSubfolders = this.checked;
			renderOrganize();
			updateDirty();
		});
	}

	/* =========================================================
	   Coletar: a árvore dentro da pasta do projeto (a mesma do
	   organizar); tipo na raiz = não é coletado
	   ========================================================= */

	var COLLECT_TYPES = [
		['projeto', 'projeto (.aep)', ['M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z', 'M13.5 3.5V8H18']],
		['videos', 'vídeos', TYPES.filter(function (t) { return t[0] === 'videos'; })[0][2]],
		['sequencias', 'sequências de imagens', TYPES.filter(function (t) { return t[0] === 'sequencias'; })[0][2]],
		['imagens', 'imagens', TYPES.filter(function (t) { return t[0] === 'imagens'; })[0][2]],
		['audio', 'áudio', TYPES.filter(function (t) { return t[0] === 'audio'; })[0][2]],
		['dados', 'dados', TYPES.filter(function (t) { return t[0] === 'dados'; })[0][2]],
		['fontes', 'fontes', ['M5 8V5.5h14V8M12 5.5v13M9 18.5h6']],
		// não são coletados: dizem para onde a migração do CATADOR leva os renders e o que o projeto não usa
		['saidas', 'saídas (renders)', ['M4 6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M10.5 8.5v4l3.5-2z', 'M8 20h8M12 16.5V20']],
		['externos', 'arquivos externos', ['M4.5 8.5 12 4.5l7.5 4v7L12 19.5l-7.5-4z', 'M4.5 8.5 12 12.5l7.5-4M12 12.5v7']]
	];

	// a estrutura padrão (a mesma do host, PAD_DEFAULT_COLLECT): o .aep em 01, os arquivos em 02, as saídas em 03
	var DEFAULT_COLLECT_FOLDERS = [
		{ name: '01_PROJETOS', parent: '', contents: ['projeto'] },
		{ name: '02_ARQUIVOS', parent: '', contents: [] },
		{ name: 'FONTS', parent: '02_ARQUIVOS', contents: ['fontes'] },
		{ name: 'IMAGENS', parent: '02_ARQUIVOS', contents: ['imagens', 'sequencias'] },
		{ name: 'VÍDEOS', parent: '02_ARQUIVOS', contents: ['videos'] },
		{ name: 'AUDIOS', parent: '02_ARQUIVOS', contents: ['audio'] },
		{ name: 'DADOS', parent: '02_ARQUIVOS', contents: ['dados'] },
		{ name: '03_SAIDA', parent: '', contents: ['saidas'] },
		{ name: 'PREVIEWS', parent: '03_SAIDA', contents: [] },
		{ name: '04_REFS', parent: '', contents: [] },
		{ name: '05_EXTERNOS', parent: '', contents: ['externos'] }
	];

	function setCollect(c) {
		var data = c || {};

		state.collect = {
			folders: (data.folders || []).map(function (f) {
				return { name: f.name || '', parent: f.parent || '', contents: (f.contents || []).slice() };
			})
		};
		renderCollect();
	}

	var colTree = makeTree({
		model: function () {
			return state.collect;
		},
		types: COLLECT_TYPES,
		treeId: 'col-tree',
		typesId: 'col-types',
		paneId: 'pane-collect',
		newBtnId: 'btn-new-col-folder',
		rootLabel: 'pasta do projeto',
		rootWhere: 'não é coletado',
		removeTitle: 'tirar da pasta (não é coletado)',
		whereFor: function (type) {
			if (type === 'saidas') return 'sem pasta: a migração usa 03_SAIDA';
			if (type === 'externos') return 'sem pasta: a migração usa 05_EXTERNOS';

			return null;
		},
		rowHint: function (f, depth) {
			var notes = [];

			if (f.contents.indexOf('projeto') >= 0) notes.push('o .aep: a janela projeto salva aqui');
			if (f.contents.indexOf('sequencias') >= 0) notes.push('uma subpasta por sequência');
			if (f.contents.indexOf('saidas') >= 0) notes.push('a migração traz os renders para cá');
			if (f.contents.indexOf('externos') >= 0) notes.push('a migração traz para cá o que o projeto não usa');
			if (!notes.length) return null;

			var sub = el('div', 'org-sub-hint');
			var icon = svg([FOLDER_PATH]);

			icon.setAttribute('aria-hidden', 'true');
			sub.style.setProperty('--depth', depth + 2);
			sub.appendChild(icon);
			sub.appendChild(el('span', null, notes.join(' · ')));

			return sub;
		},
		after: function () {
			['btn-new-col-folder', 'btn-col-default'].forEach(function (id) {
				$(id).disabled = !state.available;
			});
		}
	});

	function renderCollect() {
		colTree.render();
	}

	function bindCollect() {
		colTree.bind();

		// troca a árvore pela estrutura padrão (01_PROJETOS, 02_ARQUIVOS, 03_SAIDA, 04_REFS, 05_EXTERNOS); salvar grava
		$('btn-col-default').addEventListener('click', function () {
			state.collect.folders = JSON.parse(JSON.stringify(DEFAULT_COLLECT_FOLDERS));
			renderCollect();
			updateDirty();
			toast('success', 'estrutura padrão na árvore. salve para gravar.');
		});
	}

	/* =========================================================
	   Ferramentas: a ordem da barra (arrastar), mostrar / esconder
	   e separadores entre os grupos
	   ========================================================= */

	var DEFAULT_BAR = ['templates', 'divider', 'fontes', 'projeto', 'coletar', 'divider', 'renomear', 'organizar', 'importar', 'divider', 'pastas', 'buscar'];

	// nome, o que os cliques fazem e o ícone (o desenho da barra, em js/icons.js)
	var TOOL_INFO = {
		templates: ['Templates', 'uma gaveta: preencher templates · criar novo template', 'templates'],
		fontes: ['Fontes', 'instalar as fontes do template · collect das fontes · na barra, na gaveta Projeto', 'fonts'],
		projeto: ['Criar / Alterar', 'A CLAQUETE: criar o projeto pela atração (ou alterar os dados) · salvar o projeto · na barra, na gaveta Projeto', 'form'],
		coletar: ['Coletar', 'coletar na pasta do projeto · em outra pasta · na barra, na gaveta Projeto', 'collect'],
		importar: ['Importar', 'O VERSIONADOR: importar um projeto de qualquer versão · salvar em versões mais velhas', 'import'],
		pastas: ['Pastas', 'pasta do último output · conversor de caminhos', 'folders'],
		renomear: ['Renomear', 'renomear comps · renomear as saídas de render · na barra, na gaveta Organização', 'rename'],
		organizar: ['Organizar', 'organizar o projeto · aplicar as etiquetas · na barra, na gaveta Organização', 'organize'],
		buscar: ['Buscar', 'busca de caminhos · busca em textos', 'search']
	};

	// o padrão da equipe (rede)
	function setBar(b) {
		var data = b || {};

		state.team.bar = {
			items: (data.items && data.items.length ? data.items : DEFAULT_BAR).slice(),
			hidden: (data.hidden || []).slice()
		};
		activatePrefs();
	}

	function toggleHidden(key, show) {
		state.bar.hidden = state.bar.hidden.filter(function (k) {
			return k !== key;
		});

		if (!show) state.bar.hidden.push(key);
	}

	function svgTool(key) {
		return PAD_ICONS.svg(key === 'links' ? 'link' : (TOOL_INFO[key] || [key, '', ''])[2]);
	}

	// a barra (esquerda): só as que aparecem, na ordem, com os separadores
	function visibleItems() {
		return state.bar.items.filter(function (k) {
			return k === 'divider' || state.bar.hidden.indexOf(k) < 0;
		});
	}

	// a ferramenta (ou os links) sai da barra: vira um bloco no lado branco
	function removeFromBar(key) {
		toggleHidden(key, false);
		renderTools();
		updateDirty();
	}

	// as abas das ferramentas seguem a ordem da barra (a do layout em uso: muda junto ao arrastar)
	var BAR_TABS = { templates: 'prods', fontes: 'fonts', projeto: 'project', coletar: 'collect', renomear: 'rename', organizar: 'organize', buscar: 'search' };

	function orderToolTabs() {
		var nav = $('tabs');
		var seps = nav.querySelectorAll('.tab-sep');
		var end = seps[1];

		if (!end || !state.bar) return;

		var keys = state.bar.items.concat(DEFAULT_BAR).filter(function (k, i, all) {
			return BAR_TABS[k] && all.indexOf(k) === i;
		});

		keys.forEach(function (k) {
			var tab = nav.querySelector('.tab[data-tab="' + BAR_TABS[k] + '"]');

			if (tab) nav.insertBefore(tab, end);
		});
	}

	function renderTools() {
		orderToolTabs();
		var list = $('tool-list');

		if (!list || !state.bar) return;

		var disabled = !state.available;
		var cards = $('tool-cards');
		var linksShown = state.bar.hidden.indexOf('links') < 0;

		list.textContent = '';
		cards.textContent = '';
		$('btn-new-divider').disabled = disabled;

		function removeButton(title, onClick) {
			var btn = miniButton('remove', title, onClick);

			btn.disabled = disabled;

			return btn;
		}

		// os links, no começo (não se arrastam; o × tira)
		if (linksShown) {
			var links = el('div', 'bar-row is-links');
			links.appendChild(svgTool('links'));
			links.appendChild(el('span', 'bar-row-label', 'links'));
			links.appendChild(removeButton('tirar os links da barra', function () {
				removeFromBar('links');
			}));
			list.appendChild(links);
			list.appendChild(el('div', 'bar-row-rule'));
		}

		visibleItems().forEach(function (key, i) {
			var row = el('div', 'bar-row');

			row.setAttribute('data-index', i);
			row.appendChild(PAD_SORT.handle());

			if (key === 'divider') {
				row.classList.add('is-divider');
				row.appendChild(el('span', 'bar-row-line'));
				row.appendChild(removeButton('tirar o separador', function () {
					var at = -1;
					var seen = -1;

					// o i-ésimo item visível, na lista completa
					state.bar.items.forEach(function (k, j) {
						if (k === 'divider' || state.bar.hidden.indexOf(k) < 0) seen++;
						if (seen === i && at < 0) at = j;
					});
					if (at >= 0) state.bar.items.splice(at, 1);
					renderTools();
					updateDirty();
				}));
			} else {
				row.appendChild(svgTool(key));
				row.appendChild(el('span', 'bar-row-label', (TOOL_INFO[key] || [key])[0]));
				row.appendChild(removeButton('tirar ' + (TOOL_INFO[key] || [key])[0] + ' da barra', function () {
					removeFromBar(key);
				}));
			}

			list.appendChild(row);
		});

		// fora da barra (direita): um bloco por ferramenta tirada; o + põe de volta, no fim da barra
		var out = Object.keys(TOOL_INFO).filter(function (key) {
			return state.bar.hidden.indexOf(key) >= 0;
		});

		if (!linksShown) out.unshift('links');

		out.forEach(function (key) {
			var info = key === 'links' ? ['Links', 'os links da equipe e os seus, no começo da barra', 'link'] : TOOL_INFO[key];
			var card = el('div', 'org-type tool-card');
			var text = el('span', 'org-type-text');
			var icon = svgTool(key);
			var add = miniButton('add', '', function () { });

			card.appendChild(icon);
			text.appendChild(el('strong', null, info[0]));
			text.appendChild(el('span', null, info[1]));
			card.appendChild(text);
			add.classList.add('tool-add');
			add.title = 'pôr ' + info[0] + ' de volta na barra' + (key === 'links' ? '' : ' (no fim)');
			add.setAttribute('aria-label', add.title);
			add.disabled = disabled;
			add.addEventListener('click', function () {
				toggleHidden(key, true);

				// volta no fim da barra
				if (key !== 'links') {
					state.bar.items = state.bar.items.filter(function (k) {
						return k !== key;
					}).concat([key]);
				}

				renderTools();
				updateDirty();
			});
			card.appendChild(add);
			cards.appendChild(card);
		});

		if (!out.length) cards.appendChild(el('p', 'tool-cards-empty', 'todas as ferramentas estão na barra.'));
	}

	function bindTools() {
		// um separador novo entra no fim; arraste para o lugar
		$('btn-new-divider').addEventListener('click', function () {
			state.bar.items.push('divider');
			renderTools();
			updateDirty();
			$('tool-list').lastChild.scrollIntoView({ block: 'nearest' });
		});

		// reordena as visíveis; as escondidas ficam no fim da lista completa (voltam no fim da barra)
		PAD_SORT.enable($('tool-list'), '.bar-row:not(.is-links)', function (from, to) {
			var visible = visibleItems();
			var moved = visible.splice(from, 1)[0];

			visible.splice(to, 0, moved);
			state.bar.items = visible.concat(state.bar.items.filter(function (k) {
				return k !== 'divider' && state.bar.hidden.indexOf(k) >= 0;
			}));
			renderTools();
			updateDirty();
		});
	}

	/* =========================================================
	   Busca de caminhos
	   ========================================================= */

	function setSearch(sc) {
		var data = sc || {};

		state.search = {
			url: data.url || '',
			servidor: (data.servidor || []).map(function (r) {
				return { name: r.name || '', path: r.path || '' };
			})
		};
		renderSearch();
	}

	function renderSearch() {
		var hook = $('search-webhook');
		var list = $('servidor-list');

		if (hook.value !== state.search.url) hook.value = state.search.url;
		hook.disabled = !state.available;
		$('btn-new-servidor').disabled = !state.available;
		list.textContent = '';

		state.search.servidor.forEach(function (row, i) {
			var box = el('div', 'drive-row srv-row');
			var nameField = el('div', 'has-field-icon');
			var name = el('input', 'cfg-input');
			var icon = svg(SERVER_ICON);

			box.appendChild(PAD_SORT.handle());

			icon.setAttribute('class', 'field-icon');
			name.type = 'text';
			name.value = row.name;
			name.placeholder = 'nome (ex: #INGEST)';
			name.spellcheck = false;
			name.disabled = !state.available;
			name.setAttribute('aria-label', 'nome do caminho fixo ' + (i + 1));
			name.addEventListener('input', function () {
				row.name = name.value;
				updateDirty();
			});
			nameField.appendChild(icon);
			nameField.appendChild(name);
			box.appendChild(nameField);

			var path = pathField(row.path, '//servidor/share/pasta ou /Volumes/SHARE/pasta', 'caminho de ' + (row.name || 'caminho fixo ' + (i + 1)), function (v) {
				row.path = v;
			}, function (picked) {
				row.path = picked;
				if (!row.name) row.name = picked.replace(/[\\/]+$/, '').split(/[\\/]/).pop();
				renderSearch();
				updateDirty();
			}, function () {
				state.search.servidor.splice(i, 1);
				renderSearch();
				updateDirty();
			});

			box.appendChild(path);
			list.appendChild(box);
		});
	}

	function bindSearch() {
		$('search-webhook').addEventListener('input', function () {
			state.search.url = this.value;
			this.classList.remove('has-error');
			updateDirty();
		});

		$('btn-new-servidor').addEventListener('click', function () {
			state.search.servidor.push({ name: '', path: '' });
			renderSearch();
			updateDirty();
			$('servidor-list').lastChild.querySelector('input.cfg-input').focus();
		});

		PAD_SORT.enable($('servidor-list'), '.srv-row', function (from, to) {
			var moved = state.search.servidor.splice(from, 1)[0];

			state.search.servidor.splice(to, 0, moved);
			renderSearch();
			updateDirty();
		});
	}

	/* =========================================================
	   Links da barra
	   ========================================================= */

	var GLOBE_ICON = ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5s1.2-6.2 3.6-8.5z'];
	var LINK_ICON = ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'];

	function setLinks(list) {
		state.links = (list || []).map(function (l) {
			return { name: l.name || '', url: l.url || '', icon: l.icon || '' };
		});
		renderLinks();
	}

	function faviconUrl(url) {
		var m = /^(https?:\/\/[^\/?#]+)/i.exec(String(url).trim());

		return m ? m[1] + '/favicon.ico' : '';
	}

	// o ícone do link: o escolhido, o favicon do site ou, sem nenhum, o desenho de link
	function linkIconContent(box, link) {
		var src = PAD_UTIL.decodeIcon(link.icon) || faviconUrl(link.url);

		box.textContent = '';

		if (!src) return box.appendChild(svg(LINK_ICON));

		var img = el('img');

		img.alt = '';
		img.addEventListener('error', function () {
			box.textContent = '';
			box.appendChild(svg(LINK_ICON));
		});
		img.src = src;
		box.appendChild(img);
	}

	var PERSON_BADGE = '<svg viewBox="0 0 11 11" aria-hidden="true"><circle class="badge-bg" cx="5.5" cy="5.5" r="5.5" /><circle cx="5.5" cy="4" r="1.5" /><path d="M2.9 9.17C3.2 7.3 4.3 6.6 5.5 6.6S7.8 7.3 8.1 9.17A4.5 4.5 0 0 1 2.9 9.17z" /></svg>';

	function renderLinks() {
		renderLinkList(state.links, 'link-list', false);
		renderLinkList(state.personal, 'personal-list', true);
		$('btn-new-link').disabled = !state.available;
	}

	// 'personal': os links do usuário (editáveis mesmo sem a lista da rede)
	function renderLinkList(links, listId, personal) {
		var list = $(listId);
		var enabled = personal || state.available;

		list.textContent = '';

		links.forEach(function (link, i) {
			var row = el('div', 'link-row');
			var iconWrap = el('div', 'link-icon');
			var iconBtn = el('button', 'prod-icon');
			var name = el('input', 'cfg-input');

			iconBtn.type = 'button';
			iconBtn.title = link.icon ? 'ícone escolhido: clique para trocar' : 'ícone do site (favicon): clique para escolher outra imagem';
			iconBtn.disabled = !enabled;
			linkIconContent(iconBtn, link);
			iconBtn.addEventListener('click', async function () {
				var file = PAD_BRIDGE.pickFile('Selecione o ícone do link', ['png', 'jpg', 'jpeg']);

				if (!file) return;

				try {
					link.icon = await imageFileToIcon(file);
					renderLinks();
					updateDirty();
				} catch (err) {
					toast('error', err.message);
				}
			});
			iconWrap.appendChild(iconBtn);

			if (personal) {
				var badge = el('span', 'link-badge');

				badge.innerHTML = PERSON_BADGE;
				iconWrap.appendChild(badge);
			}

			if (link.icon) {
				var reset = el('button', 'link-reset', '↺');

				reset.type = 'button';
				reset.title = 'voltar para o ícone do site';
				reset.setAttribute('aria-label', 'voltar para o ícone do site');
				reset.addEventListener('click', function () {
					link.icon = '';
					renderLinks();
					updateDirty();
				});
				iconWrap.appendChild(reset);
			}

			name.type = 'text';
			name.value = link.name;
			name.placeholder = 'nome (aparece na dica)';
			name.spellcheck = false;
			name.disabled = !enabled;
			name.setAttribute('aria-label', 'nome do link ' + (i + 1));
			name.addEventListener('input', function () {
				link.name = name.value;
				updateDirty();
			});

			var url = driveField(link.url, 'https://site.com/pagina', 'endereço do link ' + (link.name || i + 1), GLOBE_ICON, function (v) {
				link.url = v;
				if (!link.icon) linkIconContent(iconBtn, link); // o favicon acompanha o endereço
			}, function () {
				links.splice(i, 1);
				renderLinks();
				updateDirty();
			});

			if (personal) {
				url.querySelector('input').disabled = false;
				url.querySelector('.row-del').disabled = false; // os meus links: editáveis mesmo sem a lista da rede
			}

			row.appendChild(PAD_SORT.handle());
			row.appendChild(iconWrap);
			row.appendChild(name);
			row.appendChild(url);
			list.appendChild(row);
		});
	}

	function bindLinks() {
		[['btn-new-link', 'link-list', 'links'], ['btn-new-personal', 'personal-list', 'personal']].forEach(function (k) {
			$(k[0]).addEventListener('click', function () {
				state[k[2]].push({ name: '', url: '', icon: '' });
				renderLinks();
				updateDirty();
				$(k[1]).lastChild.querySelector('input.cfg-input').focus();
			});

			PAD_SORT.enable($(k[1]), '.link-row', function (from, to) {
				var moved = state[k[2]].splice(from, 1)[0];

				state[k[2]].splice(to, 0, moved);
				renderLinks();
				updateDirty();
			});
		});
	}

	/* =========================================================
	   Computador (sigla, pastas padrão e modo local)
	   ========================================================= */

	function setMachine(m) {
		var ms = m.search || {};

		state.machine = {
			user: m.user || '',
			projects: m.projects || '',
			outputs: m.outputs || '',
			productions: (m.productions || []).map(function (p) {
				return { name: p.name || '', path: p.path || '' };
			}),
			log: m.log !== false,
			localMode: !!m.localMode,
			fontsUpload: m.fontsUpload !== false,
			search: { mode: ms.mode === 'local' ? 'local' : 'webhook', folders: (ms.folders || []).slice(), foldersOnly: ms.foldersOnly !== false, daily: ms.daily !== false }
		};
		state.localIndexFile = m.localIndex || '';
		state.offline = !!m.offline;
		state.defaultUser = m.defaultUser || '';
		state.machineSnapshot = JSON.stringify(machineForSave());
		renderMachine();
	}

	function renderMachine() {
		var m = state.machine;

		[['machine-user', 'user'], ['machine-projects', 'projects'], ['machine-outputs', 'outputs']].forEach(function (pair) {
			if (document.activeElement !== $(pair[0])) $(pair[0]).value = m[pair[1]];
		});
		$('machine-user').placeholder = state.defaultUser;
		$('machine-projects').placeholder = '~/Desktop';
		$('machine-local').checked = m.localMode;
		$('machine-log').checked = m.log;
		$('machine-fonts').checked = m.fontsUpload !== false;
		$('machine-offline').hidden = !state.offline;
		renderMachineTemplates();
		renderMachineIndex();
	}

	// busca de caminhos neste computador: webhook ou índice local (as pastas, as opções e o "indexar agora")
	function renderMachineIndex() {
		var ms = state.machine.search;
		var list = $('machine-index-list');

		Array.prototype.forEach.call(document.querySelectorAll('input[name="machine-search-mode"]'), function (radio) {
			radio.checked = radio.value === ms.mode;
		});
		$('machine-index').hidden = ms.mode !== 'local';
		$('machine-index-folders-only').checked = ms.foldersOnly;
		$('machine-index-daily').checked = ms.daily;
		list.textContent = '';

		ms.folders.forEach(function (folder, i) {
			var row = pathField(folder, '/Volumes/SHARE/pasta ou \\\\servidor\\share\\pasta', 'pasta para indexar ' + (i + 1), function (v) {
				ms.folders[i] = v;
			}, function (picked) {
				ms.folders[i] = picked;
				updateDirty();
			}, function () {
				ms.folders.splice(i, 1);
				renderMachineIndex();
				updateDirty();
			});

			row.classList.add('index-row');
			list.appendChild(row);
		});

		renderIndexStatus();
	}

	function renderIndexStatus(progress) {
		var box = $('machine-index-status');
		var L = window.PAD_LOCAL_INDEX;

		box.textContent = '';

		if (progress != null) {
			box.appendChild(el('b', null, 'indexando… '));
			box.appendChild(document.createTextNode(progress.toLocaleString('pt-BR') + ' itens lidos'));
			return;
		}

		var info = L && state.localIndexFile ? L.info(state.localIndexFile) : { exists: false };

		if (!info.exists) {
			box.appendChild(document.createTextNode(state.machine.search.folders.length ? 'ainda não indexado: clique em indexar agora (ou abra a busca).' : 'escolha as pastas para indexar.'));
			return;
		}

		var kb = info.bytes / 1024;

		box.appendChild(el('b', null, 'última indexação: '));
		box.appendChild(document.createTextNode(PAD_UTIL.when ? PAD_UTIL.when(info.generated) : new Date(info.generated).toLocaleString('pt-BR')));
		box.appendChild(document.createTextNode(' · ' + (info.count || 0).toLocaleString('pt-BR') + ' itens · ' + (kb > 1024 ? (kb / 1024).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(kb)) + ' KB') + ' neste computador'));
	}

	async function indexNow() {
		var L = window.PAD_LOCAL_INDEX;
		var btn = $('btn-index-now');
		var folders = state.machine.search.folders.map(function (f) {
			return f.trim();
		}).filter(Boolean);

		if (!L || !L.available()) {
			toast('error', 'o índice local precisa da configuração aberta no After Effects.');
			return;
		}

		if (!folders.length) {
			toast('error', 'escolha pelo menos uma pasta para indexar.');
			return;
		}

		btn.disabled = true;
		renderIndexStatus(0);

		try {
			var res = await L.build(state.localIndexFile, folders, {
				foldersOnly: state.machine.search.foldersOnly,
				onProgress: function (count) {
					renderIndexStatus(count);
				}
			});

			var unsaved = JSON.stringify(machineForSave()) !== state.machineSnapshot;

			toast('success', res.count.toLocaleString('pt-BR') + ' itens indexados.' + (unsaved ? ' clique no disquete para a busca usar o índice local.' : ' a busca já usa o índice novo.'));
		} catch (err) {
			toast('error', 'não foi possível indexar: ' + err.message);
		} finally {
			btn.disabled = false;
			renderIndexStatus();
		}
	}

	// produções locais (só deste computador, independentes das da equipe): pontinhos, ícone com o bonequinho,
	// nome e pasta. aparecem no seletor do painel de templates depois das da equipe.
	function renderMachineTemplates() {
		var list = $('machine-templates');

		if (!list) return;

		list.textContent = '';

		state.machine.productions.forEach(function (row, i) {
			var box = el('div', 'drive-row local-prod-row');
			var badge = el('span', 'local-prod-icon');
			var name = el('input', 'cfg-input');

			box.appendChild(PAD_SORT.handle());
			badge.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14v13H5z" /><path d="M5 9.5h14M9 9.5v9" /></svg>';
			badge.title = 'produção só deste computador';
			box.appendChild(badge);

			name.type = 'text';
			name.value = row.name;
			name.placeholder = 'nome (ex: MEUS TEMPLATES)';
			name.spellcheck = false;
			name.setAttribute('aria-label', 'nome da produção local ' + (i + 1));
			name.addEventListener('input', function () {
				row.name = name.value;
				updateDirty();
			});
			box.appendChild(name);

			var path = pathField(row.path, 'a pasta de templates neste computador', 'pasta da produção ' + (row.name || i + 1), function (v) {
				row.path = v;
			}, function (picked) {
				row.path = picked;
				if (!row.name.trim()) {
					row.name = picked.replace(/[\\/]+$/, '').split(/[\\/]/).pop().toUpperCase();
					renderMachineTemplates();
				}
				updateDirty();
			}, function () {
				state.machine.productions.splice(i, 1);
				renderMachineTemplates();
				updateDirty();
			});

			// é deste computador: vale mesmo sem a rede (os campos não dependem da configuração da equipe)
			Array.prototype.forEach.call(path.querySelectorAll('input, button'), function (n) {
				n.disabled = false;
			});
			box.appendChild(path);
			list.appendChild(box);
		});
	}

	async function loadMachine() {
		try {
			setMachine(await call('machinePrefs'));
		} catch (err) { }

		updateDirty();
	}

	function bindMachine() {
		[['machine-user', 'user'], ['machine-projects', 'projects'], ['machine-outputs', 'outputs']].forEach(function (pair) {
			$(pair[0]).addEventListener('input', function () {
				if (pair[1] === 'user') this.value = this.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9._-]/g, '');
				state.machine[pair[1]] = this.value;
				updateDirty();
			});
		});

		$('machine-local').addEventListener('change', function () {
			state.machine.localMode = this.checked;
			updateDirty();
		});

		$('machine-log').addEventListener('change', function () {
			state.machine.log = this.checked;
			updateDirty();
		});

		$('machine-fonts').addEventListener('change', function () {
			state.machine.fontsUpload = this.checked;
			updateDirty();
		});

		$('btn-new-local-prod').addEventListener('click', function () {
			state.machine.productions.push({ name: '', path: '' });
			renderMachineTemplates();
			updateDirty();
			$('machine-templates').lastChild.querySelector('input').focus();
		});

		PAD_SORT.enable($('machine-templates'), '.local-prod-row', function (from, to) {
			var moved = state.machine.productions.splice(from, 1)[0];

			state.machine.productions.splice(to, 0, moved);
			renderMachineTemplates();
			updateDirty();
		});

		$('machine-search-mode').addEventListener('change', function (e) {
			if (e.target.name !== 'machine-search-mode') return;

			state.machine.search.mode = e.target.value;
			renderMachineIndex();
			updateDirty();
		});
		[['machine-index-folders-only', 'foldersOnly'], ['machine-index-daily', 'daily']].forEach(function (k) {
			$(k[0]).addEventListener('change', function () {
				state.machine.search[k[1]] = this.checked;
				updateDirty();
			});
		});
		$('btn-new-index-folder').addEventListener('click', function () {
			state.machine.search.folders.push('');
			renderMachineIndex();
			updateDirty();
			$('machine-index-list').lastChild.querySelector('input').focus();
		});
		$('btn-index-now').addEventListener('click', indexNow);

		[['machine-projects-pick', 'projects', 'Pasta dos projetos neste computador'], ['machine-outputs-pick', 'outputs', 'Pasta de saída neste computador']].forEach(function (k) {
			$(k[0]).addEventListener('click', async function () {
				var picked = PAD_BRIDGE.pickFolder(k[2], state.machine[k[1]]);

				if (!picked) return;

				try {
					picked = (await call('canonicalPath', { path: picked })).path || picked;
				} catch (err) { }

				state.machine[k[1]] = picked;
				renderMachine();
				updateDirty();
			});
		});
	}

	async function loadPersonal() {
		loadMachine();

		try {
			state.personal = (await call('personalLinks')).links.map(function (l) {
				return { name: l.name || '', url: l.url || '', icon: l.icon || '' };
			});
		} catch (err) {
			state.personal = [];
		}

		state.personalSnapshot = JSON.stringify(personalForSave());
		renderLinks();
		updateDirty();
	}

	// grava os links pessoais (à parte da lista da rede). Lança o erro do host.
	// grava o que é só desta pessoa (links pessoais e preferências), neste computador. Lança o erro do host.
	async function savePersonal() {
		var saved = false;

		if (JSON.stringify(personalForSave()) !== state.personalSnapshot) {
			var res = await call('savePersonalLinks', { links: personalForSave() });

			state.personal = res.links.map(function (l) {
				return { name: l.name, url: l.url, icon: l.icon || '' };
			});
			state.personalSnapshot = JSON.stringify(personalForSave());
			renderLinks();
			saved = true;
		}

		var prefs = prefsForSave();

		if (JSON.stringify(prefs) !== state.prefsSnapshot) {
			await call('savePersonalPrefs', prefs);
			state.prefsSnapshot = JSON.stringify(prefs);
			saved = true;
		}

		var machine = machineForSave();

		if (state.machineSnapshot !== '' && JSON.stringify(machine) !== state.machineSnapshot) {
			var wasLocal = JSON.parse(state.machineSnapshot).localMode;

			setMachine(await call('saveMachinePrefs', machine));
			saved = true;

			// o modo local troca de onde vem a configuração da equipe (rede ou a cópia deste computador)
			if (wasLocal !== state.machine.localMode) setTimeout(load, 0);
		}

		renderScope();

		return saved;
	}

	/* =========================================================
	   Aparência
	   ========================================================= */

	// o padrão da equipe (rede)
	function setAppearance(a) {
		state.team.appearance = Object.assign({}, PAD_THEME.defaults, a || {});
		state.savedAppearance = Object.assign({}, state.team.appearance);
		activatePrefs();
	}

	// as desta pessoa (este computador): sem personalização, uma cópia do padrão da equipe
	function setPersonal(p) {
		var data = p || {};

		state.custom = { appearance: !!data.appearance, bar: !!data.bar };
		state.mine.appearance = Object.assign({}, PAD_THEME.defaults, data.appearance || state.team.appearance || {});
		state.mine.bar = JSON.parse(JSON.stringify(data.bar || state.team.bar || { items: DEFAULT_BAR.slice(), hidden: [] }));
		state.prefsSnapshot = JSON.stringify(prefsForSave());
		activatePrefs();
	}

	// aponta state.appearance / state.bar para o que se edita agora e redesenha
	function activatePrefs() {
		// sem personalização, a pessoa vê (e começa a editar) o padrão da equipe atual
		if (state.mine.appearance && !state.custom.appearance && state.team.appearance) state.mine.appearance = Object.assign({}, state.team.appearance);
		if (state.mine.bar && !state.custom.bar && state.team.bar) state.mine.bar = JSON.parse(JSON.stringify(state.team.bar));

		var src = state.editTeam || !state.mine.appearance ? state.team : state.mine;

		state.appearance = src.appearance;
		state.bar = src.bar || state.team.bar || state.bar;
		if (state.appearance) {
			renderAppearance();
			PAD_THEME.apply(state.appearance);
		}
		renderTools();
		renderScope();
	}

	// cada mudança vira prévia nesta janela; as outras mudam ao salvar
	// hex ↔ HSV (matiz 0-360, saturação e brilho 0-100), para os sliders das amostras
	function hexToHsv(hex) {
		var r = parseInt(hex.substr(1, 2), 16) / 255;
		var g = parseInt(hex.substr(3, 2), 16) / 255;
		var b = parseInt(hex.substr(5, 2), 16) / 255;
		var max = Math.max(r, g, b);
		var d = max - Math.min(r, g, b);
		var h = 0;

		if (d) {
			if (max === r) h = ((g - b) / d) % 6;
			else if (max === g) h = (b - r) / d + 2;
			else h = (r - g) / d + 4;
			h = (h * 60 + 360) % 360;
		}

		return { h: h, s: max ? (d / max) * 100 : 0, v: max * 100 };
	}

	function hsvToHex(h, sat, val) {
		var s = sat / 100;
		var v = val / 100;
		var c = v * s;
		var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
		var m = v - c;
		var rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];

		return '#' + rgb.map(function (n) {
			var t = Math.round((n + m) * 255);

			return (t < 16 ? '0' : '') + t.toString(16);
		}).join('');
	}

	// a matiz de cada amostra fica guardada: com saturação ou brilho em zero, a cor não tem matiz
	var swatchHue = {};

	function hueOf(key, hex) {
		var hsv = hexToHsv(hex);

		if (hsv.s > 0 && hsv.v > 0) swatchHue[key] = hsv.h;

		return swatchHue[key] != null ? swatchHue[key] : hsv.h;
	}

	// a saturação de cada amostra também fica guardada: com brilho zero a cor perde a saturação
	var swatchSatMem = {};

	function swatchSat(key) {
		var hsv = hexToHsv(state.appearance[key]);

		if (hsv.v > 0) swatchSatMem[key] = hsv.s;

		return swatchSatMem[key] != null ? swatchSatMem[key] : hsv.s;
	}

	function mixHex(a, b) {
		var out = '#';

		for (var i = 1; i < 7; i += 2) {
			var v = Math.round((parseInt(a.substr(i, 2), 16) + parseInt(b.substr(i, 2), 16)) / 2);

			out += (v < 16 ? '0' : '') + v.toString(16);
		}

		return out;
	}

	// as duas amostras: a 1 é o início do degradê (no sólido, a cor do fundo: 'accent'); a 2, o fim
	function slotKey(slot) {
		if (String(slot) === '2') return 'gradientEnd';

		return state.appearance && state.appearance.background === 'solid' ? 'accent' : 'gradientStart';
	}

	function changeAppearance(key, value) {
		var a = state.appearance;

		// a cor 1 é a mesma nos dois modos: ao trocar, passa de um campo para o outro
		if (key === 'background' && value !== a.background) {
			if (value === 'solid') a.accent = a.gradientStart;
			else a.gradientStart = a.accent;
		}

		a[key] = value;

		// no degradê só há início e fim: o destaque (botões, realces) é o tom do meio entre os dois
		if (state.appearance.background !== 'solid' && (key === 'gradientStart' || key === 'gradientEnd')) {
			state.appearance.accent = mixHex(state.appearance.gradientStart, state.appearance.gradientEnd);
		}
		PAD_THEME.apply(state.appearance);
		renderAppearance();
		updateDirty();
	}

	function renderAppearance() {
		var a = state.appearance;

		if (!a) return;

		[['app-mode', 'mode'], ['app-bg', 'background']].forEach(function (pair) {
			$(pair[0]).value = a[pair[1]];
			$(pair[0]).disabled = !state.available;
			PAD_DROPDOWN.refresh($(pair[0]));
		});

		var solid = a.background === 'solid';

		['1', '2'].forEach(function (slot) {
			var key = slotKey(slot);
			var dot = document.querySelector('.swatch-dot[data-slot="' + slot + '"]');
			var hex = document.querySelector('[data-hex="' + slot + '"]');
			var row = hex.closest('.swatch-row');
			var hsv = hexToHsv(a[key]);
			var h = hueOf(key, a[key]);
			var val = row.querySelector('[data-val]');
			var off = slot === '2' && solid; // sólido: a segunda cor fica desabilitada (não some)

			dot.style.setProperty('--dot', a[key]);
			dot.classList.toggle('is-disabled', off);
			placeSwatchDot(dot, h, swatchSat(key));
			if (document.activeElement !== hex) hex.value = a[key];
			hex.disabled = !state.available || off;
			row.style.setProperty('--dot', a[key]);
			row.classList.toggle('is-disabled', off);
			row.querySelector('.swatch-name').textContent = slot === '2' ? 'fim' : solid ? 'cor' : 'início';

			// os trilhos mostram o que cada slider faz com esta cor
			if (document.activeElement !== val) val.value = Math.round(hsv.v);
			val.disabled = !state.available || off;
			val.style.setProperty('--track', 'linear-gradient(to right, #000, ' + hsvToHex(h, hsv.s, 100) + ')');
		});

		ensureSwatchOpen();
		updateSwatchWheel();

		$('app-font').value = a.font;
		$('app-font').disabled = !state.available;
		PAD_DROPDOWN.refresh($('app-font'));

		var box = $('app-logo-box');
		var logo = a.logo ? PAD_UTIL.decodeIcon(a.logo) : null;
		var img = box.querySelector('img');

		box.querySelector('.appearance-loaf').style.display = logo ? 'none' : '';
		if (logo && !img) {
			img = el('img');
			img.alt = '';
			box.appendChild(img);
		}
		if (img) {
			if (logo) img.src = logo;
			else img.remove();
		}

		['app-logo-pick', 'app-logo-reset', 'app-defaults'].forEach(function (id) {
			$(id).disabled = !state.available;
		});
		$('app-logo-reset').hidden = !a.logo;
	}

	// a amostra anda pelo miolo todo: o ângulo em volta do centro é a matiz (0° em cima, sentido horário) e a
	// distância do centro é a saturação (no centro, 0; na borda, 100). a distância é medida "em quadrado" (o
	// maior entre x e y), para a saturação máxima ser a borda inteira, cantos incluídos.
	// SWATCH_SPAN: do centro até onde a amostra encosta na borda do miolo (metade do miolo, 62.5px, menos o
	// raio dela, 15px): num canto, ela fica concêntrica com o canto arredondado do miolo
	var SWATCH_SPAN = 47.5;

	// a partir do centro (o css centraliza a amostra em 50% / 50%): funciona com a aba ainda escondida
	function placeSwatchDot(dot, hue, sat) {
		var a = hue * Math.PI / 180;
		var sx = Math.sin(a);
		var sy = -Math.cos(a);
		var k = SWATCH_SPAN * Math.max(0, Math.min(100, sat)) / 100 / Math.max(Math.abs(sx), Math.abs(sy));

		dot.style.left = 'calc(50% + ' + (k * sx).toFixed(1) + 'px)';
		dot.style.top = 'calc(50% + ' + (k * sy).toFixed(1) + 'px)';
	}

	// arrastar uma amostra (ou clicar/arrastar no quadradinho, para a linha aberta) muda a matiz e a saturação;
	// o CEP não entrega pointer events: mouse events
	function bindSwatchDrag() {
		var tile = document.querySelector('.swatch-tile');
		var drag = null;

		if (!tile) return;

		// o ponto do mouse (preso ao miolo) → matiz e saturação
		function pointAt(e) {
			var box = tile.getBoundingClientRect();
			var dx = Math.max(-SWATCH_SPAN, Math.min(SWATCH_SPAN, e.clientX - (box.left + box.width / 2)));
			var dy = Math.max(-SWATCH_SPAN, Math.min(SWATCH_SPAN, e.clientY - (box.top + box.height / 2)));

			return {
				h: dx || dy ? (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360 : null,
				s: Math.max(Math.abs(dx), Math.abs(dy)) / SWATCH_SPAN * 100
			};
		}

		function apply(e) {
			var key = slotKey(drag.slot);
			var hsv = hexToHsv(state.appearance[key]);
			var pt = pointAt(e);
			var h = pt.h == null ? hueOf(key, state.appearance[key]) : pt.h;

			swatchHue[key] = h;
			// sem brilho nenhuma cor aparece: volta a ter brilho
			changeAppearance(key, hsvToHex(h, pt.s, hsv.v < 8 ? 80 : hsv.v));
		}

		function move(e) {
			if (!drag) return;
			if (!drag.moved && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 4) return;
			drag.moved = true;
			tile.classList.add('is-dragging');
			drag.dot.classList.add('is-dragging');
			apply(e);
		}

		function up() {
			if (!drag) return;
			document.removeEventListener('mousemove', move);
			document.removeEventListener('mouseup', up);
			tile.classList.remove('is-dragging');
			drag.dot.classList.remove('is-dragging');
			// arrastou: o clique que vem depois não abre o seletor de cor
			if (drag.moved) {
				var swallow = function (e) {
					e.preventDefault();
					e.stopPropagation();
				};

				tile.addEventListener('click', swallow, true);
				setTimeout(function () {
					tile.removeEventListener('click', swallow, true);
				}, 0);
			}
			drag = null;
		}

		tile.addEventListener('mousedown', function (e) {
			var dot = e.target.closest('.swatch-dot');
			var open = document.querySelector('.swatch-row.is-open:not(.is-disabled)');

			if (e.button !== 0 || !state.available) return;
			if (!dot && !open) return;
			if (!dot) dot = tile.querySelector('.swatch-dot[data-slot="' + open.getAttribute('data-slot') + '"]');
			if (!dot || dot.classList.contains('is-disabled')) return;

			drag = { dot: dot, slot: dot.getAttribute('data-slot'), x: e.clientX, y: e.clientY, moved: false };
			openSwatchRow(document.querySelector('.swatch-row[data-slot="' + drag.slot + '"]'));
			document.addEventListener('mousemove', move);
			document.addEventListener('mouseup', up);

			// no fundo do quadradinho o clique já leva a amostra até ali
			if (!e.target.closest('.swatch-dot')) {
				e.preventDefault();
				drag.moved = true;
				tile.classList.add('is-dragging');
				dot.classList.add('is-dragging');
				apply(e);
			}
		});
	}

	// o miolo do quadradinho mostra as cores no brilho da cor ativa (a da linha aberta)
	function updateSwatchWheel() {
		var tile = document.querySelector('.swatch-tile');
		var row = document.querySelector('.swatch-row.is-open');
		var a = state.appearance;

		if (!tile || !row || !a) return;

		var slot = row.getAttribute('data-slot');
		var hsv = hexToHsv(a[slotKey(slot)]);
		var stops = [];

		// a amostra ativa fica por cima da outra
		Array.prototype.forEach.call(tile.querySelectorAll('.swatch-dot'), function (dot) {
			dot.classList.toggle('is-active', dot.getAttribute('data-slot') === slot);
		});

		// as matizes em volta, saturadas na borda e indo para o cinza no centro (a saturação), no brilho da cor ativa
		var gray = hsvToHex(0, 0, hsv.v);
		var g = parseInt(gray.substr(1, 2), 16);

		for (var h = 0; h <= 360; h += 30) stops.push(hsvToHex(h % 360, 100, hsv.v));
		tile.style.setProperty('--wheel', 'radial-gradient(circle at center, ' + gray + ' 0, ' + gray + ' 6%, rgba(' + g + ',' + g + ',' + g + ',0) 72%), conic-gradient(' + stops.join(', ') + ')');
	}

	function openSwatchRow(row) {
		Array.prototype.forEach.call(document.querySelectorAll('.swatch-row'), function (r) {
			var on = r === row;

			r.classList.toggle('is-open', on);
			r.querySelector('.swatch-head').setAttribute('aria-expanded', on ? 'true' : 'false');
			r.querySelector('.swatch-sliders').hidden = !on;
		});
		updateSwatchWheel();
	}

	// sempre uma linha aberta (e não a desabilitada): a primeira, se for preciso
	function ensureSwatchOpen() {
		var rows = Array.prototype.slice.call(document.querySelectorAll('.swatch-row'));
		var open = rows.filter(function (r) {
			return r.classList.contains('is-open') && !r.classList.contains('is-disabled');
		});

		if (!open.length && rows.length) openSwatchRow(rows[0]);
	}

	function bindAppearance() {

		[['app-mode', 'mode'], ['app-bg', 'background']].forEach(function (pair) {
			PAD_DROPDOWN.enhance($(pair[0]), pair[0] === 'app-mode' ? 'mode' : 'background');
			$(pair[0]).addEventListener('change', function () {
				changeAppearance(pair[1], $(pair[0]).value);
			});
		});

		bindSwatchDrag();

		// brilho: muda a cor da amostra mantendo a matiz e a saturação (as do quadradinho)
		Array.prototype.forEach.call(document.querySelectorAll('[data-val]'), function (range) {
			range.addEventListener('input', function () {
				var key = slotKey(range.getAttribute('data-val'));
				var h = hueOf(key, state.appearance[key]);

				changeAppearance(key, hsvToHex(h, swatchSat(key), +range.value));
			});
		});

		// clicar na linha (amostra, nome, hex) abre os sliders dela; sempre uma aberta (a do quadradinho alinha com ela)
		Array.prototype.forEach.call(document.querySelectorAll('.swatch-head'), function (head) {
			function toggle() {
				var row = head.closest('.swatch-row');

				if (!row.classList.contains('is-disabled')) openSwatchRow(row);
			}

			head.addEventListener('click', function (e) {
				if (e.target.matches('input') && head.closest('.swatch-row').classList.contains('is-open')) return; // editando o hex
				toggle();
			});
			head.addEventListener('keydown', function (e) {
				if ((e.key === 'Enter' || e.key === ' ') && e.target === head) {
					e.preventDefault();
					toggle();
				}
			});
		});

		Array.prototype.forEach.call(document.querySelectorAll('[data-hex]'), function (hex) {
			hex.addEventListener('input', function () {
				var v = hex.value.trim().toLowerCase();

				if (/^#?[0-9a-f]{6}$/.test(v)) changeAppearance(slotKey(hex.getAttribute('data-hex')), v.charAt(0) === '#' ? v : '#' + v);
			});
			hex.addEventListener('blur', renderAppearance);
		});

		PAD_DROPDOWN.enhance($('app-font'), 'font');
		$('app-font').addEventListener('change', function () {
			changeAppearance('font', this.value);
		});

		$('app-logo-pick').addEventListener('click', async function () {
			var file = PAD_BRIDGE.pickFile('Selecione a logo da barra', ['png', 'jpg', 'jpeg']);

			if (!file) return;

			try {
				changeAppearance('logo', await imageFileToIcon(file, true));
			} catch (err) {
				toast('error', err.message);
			}
		});

		$('app-logo-reset').addEventListener('click', function () {
			changeAppearance('logo', '');
		});

		$('app-defaults').addEventListener('click', function () {
			Object.assign(state.appearance, PAD_THEME.defaults); // o mesmo objeto (o da pessoa ou o da equipe)
			PAD_THEME.apply(state.appearance);
			renderAppearance();
			updateDirty();
		});
	}

	/* =========================================================
	   Fontes: o banco de fontes (a pasta na rede e o envio)
	   ========================================================= */

	function setFonts(f) {
		f = f || {};
		state.fonts = { bank: f.bank || '', upload: f.upload !== false };
		renderFonts();
	}

	function renderFonts() {
		if (document.activeElement !== $('fonts-bank')) $('fonts-bank').value = state.fonts.bank;
		$('fonts-bank').title = state.fonts.bank;
		$('fonts-upload').checked = state.fonts.upload;
		countBank();
	}

	// quantas fontes já estão no banco (os .json, um por fonte): lido pelo Node, sem o After Effects
	function countBank() {
		var box = $('fonts-count');
		var fs = null;

		try {
			fs = typeof require === 'function' ? require('fs') : null;
		} catch (err) { }

		box.textContent = '';
		if (!fs || !state.fonts.bank) return;

		// no volume realmente montado (o caminho é guardado sem o sufixo -1 … -5)
		fs.readdir(PAD_BRIDGE.mountedPath(state.fonts.bank.replace(/^~(?=\/)/, require('os').homedir())), function (err, names) {
			if (err) {
				box.textContent = 'a pasta do banco não está acessível agora.';
				return;
			}

			var total = names.filter(function (n) {
				return /\.json$/i.test(n) && n.charAt(0) !== '_';
			}).length;

			box.textContent = total ? total + (total === 1 ? ' fonte no banco.' : ' fontes no banco.') : 'o banco ainda está vazio.';
		});
	}

	function bindFonts() {
		$('fonts-bank').addEventListener('input', function () {
			state.fonts.bank = this.value;
			updateDirty();
		});
		$('fonts-bank').addEventListener('change', countBank);
		$('fonts-bank-pick').addEventListener('click', function () {
			var picked = PAD_BRIDGE.pickFolder('Pasta do banco de fontes', state.fonts.bank);

			if (!picked) return;

			state.fonts.bank = picked;
			renderFonts();
			updateDirty();
		});
		$('fonts-upload').addEventListener('change', function () {
			state.fonts.upload = this.checked;
			updateDirty();
		});
	}

	/* =========================================================
	   Projeto (janela PROJETO): as categorias da atração nova
	   ========================================================= */

	// cada categoria: o nome (a lista "dentro de"), o caminho da pasta da atração nova com tokens e o ícone
	// (do seletor, ou '' = o automático pelo nome). uma categoria com {letra} ganha a etapa dos parecidos.
	var PATH_TOKENS = ['atracao', 'ano', 'mes', 'mes_extenso', 'proximo_mes', 'categoria', 'letra'];
	var MONTHS = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
	var CAT_FOLDER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></svg>';

	function setProject(p) {
		var data = JSON.parse(JSON.stringify(p || {}));

		state.project = {
			categories: (data.categories || []).map(function (c) {
				return { name: c.name || '', path: c.path || '', output: c.output || '', icon: c.icon || '' };
			})
		};
		renderProject();
	}

	function catIcon(row) {
		return PAD_UTIL.categoryIcon(row.icon) || CAT_FOLDER_SVG;
	}

	// a prévia de um caminho (key: 'path', o do projeto, ou 'output'): os tokens trocados por um exemplo, em
	// destaque (o começo fica de fora)
	function catPreview(row, key) {
		var d = new Date();
		var path = String(row[key] || '').trim().replace(/\\/g, '/');
		// o exemplo: a palavra ATRACAO no lugar do nome da atração nova
		var sample = { atracao: 'ATRACAO', ano: String(d.getFullYear()), mes: ('0' + (d.getMonth() + 1)).slice(-2), mes_extenso: MONTHS[d.getMonth()], proximo_mes: MONTHS[(d.getMonth() + 1) % 12], categoria: row.name.trim().toUpperCase() || 'CATEGORIA', letra: 'A' };
		var at = path.indexOf('{');
		var head = at < 0 ? path : path.slice(0, at);
		var cut = head.lastIndexOf('/', head.length - 2);
		var shown = (cut > 0 ? '…' + path.slice(cut) : path).replace(/[&<>]/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
		});

		if (!path) return '';

		return '→ ' + shown.replace(/\{(\w+)\}/g, function (all, k) {
			return PATH_TOKENS.indexOf(k) >= 0 ? '<b>' + sample[k] + '</b>' : '<i>' + all + '</i>';
		});
	}

	// cada categoria num cartão: NOME (com o ícone dentro do campo; a lixeira, que exclui a categoria, fica fora
	// dele), PROJETO e OUTPUT, os dois com a prévia embaixo
	function renderProject() {
		var list = $('cat-list');
		var cats = state.project.categories;

		if (!list) return;

		list.textContent = '';
		$('cat-empty').hidden = cats.length > 0;
		$('btn-new-cat').disabled = !state.available;

		cats.forEach(function (row, i) {
			var card = el('div', 'cat-card');
			var body = el('div', 'cat-body');
			var nameLine = el('div', 'cat-line');
			var nameBox = el('div', 'cat-name');
			var iconBtn = el('button', 'cat-icon');
			var name = el('input', 'cfg-input');
			var remove = el('button', 'cat-del');
			var previews = {};

			card.appendChild(PAD_SORT.handle());

			iconBtn.type = 'button';
			iconBtn.title = 'trocar o ícone';
			iconBtn.disabled = !state.available;
			iconBtn.innerHTML = catIcon(row);
			iconBtn.addEventListener('click', function (e) {
				e.stopPropagation();
				openIconPicker(iconBtn, row);
			});

			name.type = 'text';
			name.value = row.name;
			name.placeholder = 'nome (ex: PROGRAMAS)';
			name.spellcheck = false;
			name.disabled = !state.available;
			name.setAttribute('aria-label', 'nome da categoria ' + (i + 1));
			name.addEventListener('input', function () {
				row.name = name.value;
				// {categoria} nas prévias
				previews.path.innerHTML = catPreview(row, 'path');
				previews.output.innerHTML = catPreview(row, 'output');
				updateDirty();
			});

			remove.type = 'button';
			remove.title = 'excluir a categoria';
			remove.setAttribute('aria-label', 'excluir a categoria ' + (row.name || i + 1));
			remove.disabled = !state.available;
			remove.innerHTML = TRASH_SVG;
			remove.addEventListener('click', function () {
				collapseThen(card, function () {
					state.project.categories.splice(i, 1);
					renderProject();
					updateDirty();
				});
			});

			nameBox.appendChild(iconBtn);
			nameBox.appendChild(name);
			nameLine.appendChild(el('span', 'cat-label', 'NOME'));
			nameLine.appendChild(nameBox);
			nameLine.appendChild(remove);
			body.appendChild(nameLine);

			[['path', 'PROJETO', '//servidor/share/PROGRAMAS/{atracao}'], ['output', 'OUTPUT', 'opcional: a pasta de output da atração nova']].forEach(function (k) {
				var line = el('div', 'cat-line');
				var preview = el('p', 'cat-preview');
				var field = pathField(row[k[0]], k[2], (k[0] === 'path' ? 'pasta da atração nova em ' : 'pasta de output em ') + (row.name || 'categoria ' + (i + 1)), function (v) {
					row[k[0]] = v;
					preview.innerHTML = catPreview(row, k[0]);
				}, function (picked) {
					// a pasta escolhida é a da categoria: a atração nova fica dentro dela
					row[k[0]] = picked.replace(/[\\/]+$/, '') + '/{atracao}';
					if (k[0] === 'path' && !row.name) row.name = picked.replace(/[\\/]+$/, '').split(/[\\/]/).pop().toUpperCase();
					renderProject();
					updateDirty();
				}, function () { });
				var input = field.querySelector('input');

				field.removeChild(field.lastChild); // sem o × do campo: o da categoria fica no nome

				// os tokens entram no último caminho em foco; fora dele, o campo mostra o fim do caminho
				input.addEventListener('focus', function () {
					state.catInput = { input: input, row: row, key: k[0], preview: preview };
				});
				input.addEventListener('blur', function () {
					input.scrollLeft = input.scrollWidth;
				});

				line.appendChild(el('span', 'cat-label', k[1]));
				line.appendChild(field);
				line.appendChild(el('span')); // a coluna da lixeira (os campos alinham com o do nome)
				body.appendChild(line);
				preview.innerHTML = catPreview(row, k[0]);
				previews[k[0]] = preview;
				body.appendChild(preview);
			});

			card.appendChild(body);
			list.appendChild(card);
		});

		requestAnimationFrame(catPathsToEnd);
	}

	// o fim de cada caminho (a parte que muda de uma categoria para outra). também ao abrir a aba: montada
	// escondida, o campo ainda não tem largura e fica no começo
	function catPathsToEnd() {
		pathsToEnd($('cat-list'));
	}

	// o fim de cada caminho (campos com a pasta: os de caminho e os de rede), menos o que está sendo editado
	function pathsToEnd(root) {
		if (!root) return;

		Array.prototype.forEach.call(root.querySelectorAll('.cfg-path input.cfg-input, .prod-path input.cfg-input'), function (input) {
			if (document.activeElement !== input && /[\\\/]/.test(input.value)) input.scrollLeft = input.scrollWidth;
		});
	}

	// põe o token no caminho em foco (ou no do projeto da última categoria), onde está o cursor
	function insertToken(token) {
		var target = state.catInput;

		if (!target || !document.body.contains(target.input)) {
			var cards = $('cat-list').querySelectorAll('.cat-card');
			var rows = state.project.categories;

			if (!cards.length) return toast(null, 'crie uma categoria antes (+ nova categoria).');

			var last = cards[cards.length - 1];

			target = { input: last.querySelector('.cfg-path input'), row: rows[rows.length - 1], key: 'path', preview: last.querySelector('.cat-preview') };
		}

		var input = target.input;
		var start = input.selectionStart == null ? input.value.length : input.selectionStart;
		var end = input.selectionEnd == null ? start : input.selectionEnd;
		var text = '{' + token + '}';

		input.value = input.value.slice(0, start) + text + input.value.slice(end);
		target.row[target.key] = input.value;
		target.preview.innerHTML = catPreview(target.row, target.key);
		input.focus();
		input.setSelectionRange(start + text.length, start + text.length);
		updateDirty();
	}

	// o seletor de ícones: os desenhos do padeiro (estáticos)
	// o seletor de ícones (a biblioteca da pasta icons/): categorias (aba PROJETO) e produções (aba TEMPLATES).
	// opts: { title, pane, render, none } (none: mostra o "sem ícone")
	function openIconPicker(anchor, row, opts) {
		closeIconPicker();

		opts = opts || { title: 'ícone da categoria', pane: 'pane-project', render: renderProject };

		var pop = el('div', 'icon-pop');
		var grid = el('div', 'icon-grid');
		var choose = function (key) {
			row.icon = key;
			closeIconPicker();
			opts.render();
			updateDirty();
		};

		pop.appendChild(el('p', null, opts.title));
		if (opts.none) {
			var none = el('button', 'icon-none' + (!row.icon ? ' is-on' : ''), 'sem ícone');

			none.type = 'button';
			none.addEventListener('click', function () {
				choose('');
			});
			grid.appendChild(none);
		}
		PAD_UTIL.iconLibrary().forEach(function (it) {
			var current = row.icon && PAD_UTIL.iconEntry(row.icon); // um nome antigo aponta para o ícone de agora
			var b = el('button', current && current.key === it.key ? 'is-on' : '');

			b.type = 'button';
			b.title = it.label;
			b.setAttribute('aria-label', it.label);
			b.innerHTML = it.svg;
			b.addEventListener('click', function () {
				choose(it.key);
			});
			grid.appendChild(b);
		});
		pop.appendChild(grid);
		pop.addEventListener('click', function (e) {
			e.stopPropagation();
		});

		// abaixo do botão (ou acima, sem espaço embaixo), dentro da folha
		var pane = $(opts.pane);
		var a = anchor.getBoundingClientRect();
		var box = pane.getBoundingClientRect();

		pane.appendChild(pop);

		var top = a.bottom - box.top + pane.scrollTop + 6;

		if (a.bottom + pop.offsetHeight + 12 > window.innerHeight) top = a.top - box.top + pane.scrollTop - pop.offsetHeight - 6;

		pop.style.top = top + 'px';
		pop.style.left = Math.max(8, a.left - box.left) + 'px';
		state.iconPop = pop;
	}

	function closeIconPicker() {
		if (state.iconPop) state.iconPop.remove();
		state.iconPop = null;
	}

	function bindProject() {
		$('btn-new-cat').addEventListener('click', function () {
			state.project.categories.push({ name: '', path: '', output: '', icon: 'pasta' });
			renderProject();
			updateDirty();
			$('cat-list').lastChild.querySelector('.cat-name input').focus();
		});

		Array.prototype.forEach.call($('cat-tokens').querySelectorAll('[data-token]'), function (btn) {
			// sem roubar o foco do caminho (o token entra onde está o cursor)
			btn.addEventListener('mousedown', function (e) {
				e.preventDefault();
			});
			btn.addEventListener('click', function () {
				insertToken(btn.dataset.token);
			});
		});

		document.addEventListener('click', closeIconPicker);
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') closeIconPicker();
		});

		PAD_SORT.enable($('cat-list'), '.cat-card', function (from, to) {
			var moved = state.project.categories.splice(from, 1)[0];

			state.project.categories.splice(to, 0, moved);
			renderProject();
			updateDirty();
		});

	}

	/* =========================================================
	   Pedido de aba (2 cliques numa ferramenta da barra)
	   ========================================================= */

	var CONFIG_TAB_TTL = 15000; // pedido mais velho que isso não vale ao abrir
	var TAB_NAMES = ['prods', 'project', 'collect', 'rename', 'organize', 'search', 'fonts', 'links', 'network', 'telemetry', 'appearance', 'tools', 'machine'];
	// os nomes antigos (pedidos pela barra ou por um erro) → a aba de agora e a seção dela
	var TAB_ALIASES = { logs: ['telemetry', ''], drives: ['network', 'drives-section'], mylinks: ['links', 'mylinks-section'], localprods: ['prods', 'prods-local'] };
	var MINE_TABS = ['appearance', 'tools', 'machine']; // local (este computador); as outras, da equipe (rede)
	var SPLIT_TABS = ['prods', 'project', 'search', 'fonts', 'links', 'telemetry']; // da equipe, com a parte 'neste computador' embaixo

	async function watchRequestedTab(initial) {
		if (document.hidden && !initial) return;

		try {
			var req = await call('requestedConfigTab');

			if (!req.stamp || req.stamp <= (state.lastTabStamp || 0)) return;

			state.lastTabStamp = req.stamp;

			if (initial && req.now - req.stamp > CONFIG_TAB_TTL) return;
			if (TAB_NAMES.indexOf(req.tab) >= 0 || TAB_ALIASES[req.tab]) showTab(req.tab);
		} catch (err) { }
	}

	/* =========================================================
	   Abas
	   ========================================================= */

	/* ---------- onde a aba é salva (a faixa no topo da folha) ---------- */

	var SCOPE_GLOBE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5s1.2-6.2 3.6-8.5z" /></svg>';
	var SCOPE_PERSON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5" /></svg>';

	// a pessoa personalizou (difere do padrão da equipe)?
	function isPersonalized(tab) {

		return tab === 'appearance' ? state.custom.appearance : tab === 'tools' ? state.custom.bar : false;
	}

	function scopeButton(text, onClick) {
		var btn = el('button', 'scope-action', text);

		btn.type = 'button';
		btn.addEventListener('click', onClick);

		return btn;
	}

	function renderScope() {
		var box = $('scope-note');
		var tab = state.tab;

		if (!box) return;

		var mine = MINE_TABS.indexOf(tab) >= 0;
		var team = !mine || (state.editTeam && tab !== 'machine');
		var text = el('span', 'scope-text');

		box.textContent = '';
		box.className = 'scope-note ' + (team ? 'is-team' : 'is-mine') + (mine && team ? ' is-editing-team' : '');
		box.insertAdjacentHTML('afterbegin', team ? SCOPE_GLOBE : SCOPE_PERSON);

		var split = SPLIT_TABS.indexOf(tab) >= 0 ? ' · embaixo, <b>neste computador</b>' : '';

		if (!mine && (state.machine.localMode || state.fromCopy)) {
			text.innerHTML = '<b>equipe</b> · modo local' + (state.machine.localMode ? '' : ' (sem a rede)') + ': a cópia guardada neste computador, só para ler' + split;
		} else if (!mine) {
			text.innerHTML = '<b>equipe</b> · salvo na rede, vale para todo mundo' + split;
		} else if (team) {
			text.innerHTML = '<b>padrão da equipe</b> · salvo na rede, para quem não personalizou';
		} else if (tab === 'machine') {
			text.innerHTML = '<b>local</b> · salvo neste computador, não muda nada para os outros' + (tab === 'machine' && (state.machine.localMode || state.offline) ? ' · <b>modo local</b>' : '');
		} else {
			text.innerHTML = '<b>local</b> · salvo neste computador · ' + (isPersonalized(tab) ? 'personalizado' : 'usando o padrão da equipe');
		}

		box.appendChild(text);

		// alterações não salvas: o aviso fica aqui no topo, à direita (o disquete também ganha o ponto)
		if ($('btn-save') && $('btn-save').classList.contains('is-dirty')) box.appendChild(el('span', 'prods-dirty', 'alterações não salvas'));

		if (mine && team) {
			box.appendChild(scopeButton('voltar às minhas preferências', function () {
				setEditTeam(false);
			}));
		} else if (mine && tab !== 'machine' && isPersonalized(tab)) {
			box.appendChild(scopeButton('voltar ao padrão da equipe', function () {
				if (tab === 'appearance') state.custom.appearance = false;
				if (tab === 'tools') state.custom.bar = false;
				activatePrefs();
				updateDirty();
			}));
		}
	}

	// "editar o padrão da equipe" (menu ⋯): aparência e layout passam a editar o da rede
	function setEditTeam(on) {
		state.editTeam = on;
		$('menu-team').textContent = on ? 'Voltar às minhas preferências' : 'Editar o padrão da equipe';
		activatePrefs();
		if (on && MINE_TABS.indexOf(state.tab) < 0) showTab('appearance');
		if (on) toast(null, 'editando o padrão da equipe (aparência e layout): vale para quem não personalizou.');
	}

	// Ícone de cada aba: o da ferramenta da barra, quando há uma (js/icons.js, com as animações de css/icons.css);
	// as outras têm desenho próprio, com a animação em productions.css (.ti-*).
	var TAB_TOOL_ICONS = { prods: 'templates', rename: 'rename', organize: 'organize', collect: 'collect', search: 'search', project: 'project', fonts: 'fonts' };

	var TAB_ICONS = {
		machine: '<g class="ti-user"><circle class="ti-head" cx="12" cy="8.5" r="3.5" /><path class="ti-body" d="M5 19.5c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5" /></g>',
		network: '<g class="ti-server"><g class="ti-rack ti-k1"><rect x="4" y="4.5" width="16" height="6" rx="1.5" /><path class="ti-led" d="M7.5 7.5h.01" /></g><g class="ti-rack ti-k2"><rect x="4" y="13.5" width="16" height="6" rx="1.5" /><path class="ti-led" d="M7.5 16.5h.01" /></g></g>',
		links: '<g class="ti-link"><path class="ti-link-a" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path class="ti-link-b" d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></g>',
		logs: '<g class="ti-log"><rect x="4.5" y="3.5" width="15" height="17" rx="2.5" /><path class="ti-line" d="M8 8.5h8" /><path class="ti-line" d="M8 12h8" /><path class="ti-line" d="M8 15.5h5" /></g>',
		telemetry: '<g class="ti-pulse"><path d="M3 12h4l2.5-6 5 12 2.5-6H21" /></g>',
		appearance: '<g class="ti-theme"><circle cx="12" cy="12" r="8" /><path class="ti-half" d="M12 4a8 8 0 0 1 0 16z" /></g>',
		tools: '<g class="ti-list"><g class="ti-row ti-r1"><path d="M9 6h11" /><path d="M4 5.5h.01M4 6.5h.01M5 5.5h.01M5 6.5h.01" /></g><g class="ti-row ti-r2"><path d="M9 12h11" /><path d="M4.5 11v2" /></g><g class="ti-row ti-r3"><path d="M9 18h11" /><path d="M4.5 17v2" /></g></g>'
	};

	function decorateTabs() {
		Array.prototype.forEach.call($('tabs').querySelectorAll('.tab'), function (tab) {
			var key = tab.getAttribute('data-tab');
			var icon = TAB_TOOL_ICONS[key] ? PAD_ICONS.has(TAB_TOOL_ICONS[key]) : TAB_ICONS[key];

			if (!icon || tab.querySelector('svg')) return;

			var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			var label = el('span', 'tab-label', tab.textContent.trim());

			node.setAttribute('viewBox', '0 0 24 24');
			node.setAttribute('aria-hidden', 'true');
			node.innerHTML = icon;
			if (TAB_TOOL_ICONS[key]) node = PAD_ICONS.svg(TAB_TOOL_ICONS[key]); // o da biblioteca (svg ou Lottie)
			tab.textContent = '';
			tab.appendChild(node);
			tab.appendChild(label);
		});
	}

	function showTab(name) {
		var alias = TAB_ALIASES[name];

		if (alias) {
			name = alias[0];
			if (alias[1]) {
				setTimeout(function () {
					var section = $(alias[1]);

					if (section && section.scrollIntoView) section.scrollIntoView({ block: 'start', behavior: 'smooth' });
				}, 60);
			}
		}

		state.tab = name;
		renderScope();


		Array.prototype.forEach.call($('tabs').querySelectorAll('.tab'), function (tab) {
			var on = tab.getAttribute('data-tab') === name;

			tab.setAttribute('aria-selected', on ? 'true' : 'false');

			// janela estreita: a aba escolhida (pela barra, por exemplo) aparece na fila que rola
			if (on && tab.scrollIntoView) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		});
		TAB_NAMES.forEach(function (key) {
			$('pane-' + key).hidden = key !== name;
		});
		// os caminhos da aba mostram o fim (a parte que muda): montados com a aba escondida, ficavam no começo
		requestAnimationFrame(function () {
			pathsToEnd($('pane-' + name));
		});

		// as categorias da busca são lidas do índice na primeira vez que a aba abre


	}

	// erro do host numa seção: abre a aba dela
	function tabForError(message) {
		if (/#PAD_078/.test(message)) return 'telemetry'; // o registro de uso
		if (/#PAD_0(79|80|81)/.test(message)) return 'drives'; // aba rede, na seção dos drives
		if (/#PAD_08[23]/.test(message)) return 'rename';
		if (/#PAD_08[45]/.test(message)) return 'organize';
		if (/#PAD_086/.test(message)) return 'search';
		if (/#PAD_087/.test(message)) return 'links';
		if (/#PAD_088/.test(message)) return 'appearance';
		if (/#PAD_089/.test(message)) return 'project';
		if (/#PAD_094/.test(message)) return 'collect';
		if (/#PAD_098/.test(message)) return 'localprods'; // produção local (aba templates, embaixo)

		return null;
	}

	/* =========================================================
	   Carregar / salvar
	   ========================================================= */

	async function load() {
		loadPersonal(); // os pessoais não dependem da rede
		$('list').classList.remove('is-settled'); // ao ler a lista, as linhas entram animadas de novo

		try {
			var res = await call('productions', {});

			showFileInfo(res);

			if (!res.shared) {
				state.rows = [];
				state.snapshot = currentSnapshot();
				setAvailable(false);
				updateDirty();
				showUnavailable(res.error || '');
				return;
			}

			setAvailable(true);
			setLog(res.log);
			setDrives(res.drives);
			setRename(res.rename);
			setOrganize(res.organize);
			setSearch(res.search);
			setLinks(res.links);
			setProject(res.project);
			setCollect(res.collect);
			setBar(res.bar);
			setAppearance(res.appearance);
			setFonts(res.fonts);
			setPersonal(res.personal);
			state.stamp = res.stamp;
			state.rows = res.productions.map(newRow);
			state.snapshot = currentSnapshot();
			state.fromCopy = !!res.fromCopy;
			renderMachine();

			if (res.error) toast('error', res.error);
			else if (res.fromCopy && !res.localForced) toast('error', 'sem a rede: o padeiro entrou no modo local (a configuração da equipe é a cópia deste computador, só para ler).');
		} catch (err) {
			state.rows = [];
			setAvailable(false);
			showFileInfo({ configPath: '', shared: false });
			showUnavailable(err.message);
			return;
		}

		render();
		updateDirty();
		checkFolders(state.rows);
	}

	function validate() {
		var names = {};
		var problems = [];

		state.rows.forEach(function (row) {
			var key = row.name.trim().toUpperCase();

			row.error = false;

			if (row.name.trim() === '') {
				row.error = true;
				problems.push('#PAD_052 - preencha o nome de todas as produções.');
			} else if (names[key]) {
				row.error = true;
				problems.push('#PAD_054 - "' + row.name.trim() + '": já existe uma produção com esse nome.');
			}

			names[key] = true;

			if (row.path.trim() === '') {
				row.error = true;
				problems.push('#PAD_053 - ' + (row.name.trim() ? '"' + row.name.trim() + '": ' : '') + 'preencha a pasta de templates.');
			}
		});

		render();

		return problems;
	}

	async function save() {
		if (state.saving) return;

		// só os links pessoais mudaram (ou a lista da rede está inacessível): grava só eles, no computador
		if (!state.available || currentSnapshot() === state.snapshot) {
			if (!personalDirty()) {
				if (!state.available) return;
			} else {
				try {
					await savePersonal();
					updateDirty();
					toast('success', 'salvo: local (neste computador).');
				} catch (err) {
					if (tabForError(err.message)) showTab(/#PAD_087/.test(err.message) ? 'mylinks' : tabForError(err.message));
					toast('error', err.message);
				}

				return;
			}
		}

		if (!state.rows.length) return toast('error', '#PAD_051 - a lista de produções não pode ficar vazia.');

		var problems = validate();

		if (problems.length) return toast('error', problems[0]);

		var logProblem = validateLog();

		if (logProblem) {
			showTab('telemetry');
			$('log-webhook').focus();
			return toast('error', logProblem);
		}

		state.saving = true;
		$('btn-save').disabled = true;
		$('btn-save').classList.add('is-busy');

		try {
			var res = await call('saveProductions', { productions: listForSave(), log: logForSave(), drives: drivesForSave(), rename: renameForSave(), organize: organizeForSave(), search: searchForSave(), links: linksForSave(), project: projectForSave(), collect: collectForSave(), bar: barForSave(), appearance: appearanceForSave(), fonts: fontsForSave(), stamp: state.stamp });

			state.stamp = res.stamp;
			if (res.log) setLog(res.log);
			if (res.drives) setDrives(res.drives);
			if (res.rename) setRename(res.rename);
			if (res.organize) setOrganize(res.organize);
			if (res.search) setSearch(res.search);
			if (res.links) setLinks(res.links);
			if (res.project) setProject(res.project);
			if (res.collect) setCollect(res.collect);
			if (res.bar) setBar(res.bar);
			setAppearance(res.appearance || state.team.appearance);
			state.rows = res.productions.map(newRow);
			state.snapshot = currentSnapshot();
			render();
			updateDirty();
			checkFolders(state.rows);
			var mine = false;

			try {
				mine = await savePersonal();
			} catch (err) {
				if (tabForError(err.message)) showTab(/#PAD_087/.test(err.message) ? 'mylinks' : tabForError(err.message));
				toast('error', err.message);
				return;
			}

			updateDirty();
			toast('success', 'salvo: equipe (na rede)' + (mine ? ' e local (neste computador)' : '') + '. os painéis atualizam sozinhos.');
		} catch (err) {
			if (tabForError(err.message)) showTab(tabForError(err.message));
			toast('error', err.message);
		} finally {
			state.saving = false;
			$('btn-save').disabled = false;
			$('btn-save').classList.remove('is-busy');
		}
	}

	// Descartar alterações pede um segundo clique (sem o confirm() nativo, pouco confiável no CEP).
	function confirmDiscard(action) {
		if (!updateDirty() || state.discardTimer) {
			clearTimeout(state.discardTimer);
			state.discardTimer = null;
			return action();
		}

		toast(null, 'há alterações não salvas: clique de novo para descartar.');
		state.discardTimer = setTimeout(function () {
			state.discardTimer = null;
		}, 3500);
	}

	async function importList() {
		var file = PAD_BRIDGE.pickFile('Selecione a lista de produções', ['json']);

		if (!file) return;

		try {
			var res = await call('readProductionsFile', { path: file });

			state.rows = res.productions.map(newRow);
			render();
			updateDirty();
			checkFolders(state.rows);
			toast('success', 'lista importada: ' + state.rows.length + ' produções. clique no disquete para salvar.');
		} catch (err) {
			toast('error', err.message);
		}
	}

	async function exportList() {
		var problems = validate();

		if (problems.length) return toast('error', problems[0]);

		var file = PAD_BRIDGE.pickSaveFile('Salvar a lista de produções', 'O_PADEIRO_GLOBAL_config.json', ['json']);

		if (!file) return;

		try {
			await call('writeProductionsFile', { path: file, productions: listForSave() });
			toast('success', 'lista exportada: ' + file);
		} catch (err) {
			toast('error', err.message);
		}
	}

	function clearFilter() {
		$('filter').value = '';
		$('filter-clear').hidden = true;
		applyFilter();
	}

	function addRow() {
		clearFilter();

		var row = newRow({ name: '', icon: state.newIcon, templatesPath: '' });

		state.rows.push(row);
		render();
		updateDirty();
		row.nodes.name.focus();
		row.nodes.box.scrollIntoView({ block: 'nearest' });
	}

	/* =========================================================
	   Início
	   ========================================================= */

	function init() {
		state.newIcon = defaultIcon();

		// a lixeira das linhas sai do campo assim que a linha entra na página (ver liftDeletes)
		new MutationObserver(function (records) {
			records.forEach(function (r) {
				Array.prototype.forEach.call(r.addedNodes, function (n) {
					if (n.nodeType === 1) liftDeletes(n.parentElement || n);
				});
			});
		}).observe(document.body, { childList: true, subtree: true });

		// a janela não tem mais layout compacto (manifest: 940 × 800, mínimo 940 × 600): quem já tinha a
		// janela menor ganha o tamanho novo uma vez
		try {
			if (PAD_BRIDGE.inCep() && !localStorage.getItem('pad.productions.size940')) {
				localStorage.setItem('pad.productions.size940', '1');
				if (window.innerWidth < 940 || window.innerHeight < 800) PAD_BRIDGE.resizeWindow(Math.max(window.innerWidth, 940), Math.max(window.innerHeight, 800));
			}
		} catch (err) { }
		bindLog();
		bindDrives();
		bindRename();
		bindOrganize();
		bindSearch();
		bindLinks();
		bindAppearance();
		bindProject();
		bindMachine();
		bindFonts();
		bindCollect();
		bindTools();

		decorateTabs();

		$('tabs').addEventListener('click', function (e) {
			var tab = e.target.closest('.tab');

			if (tab) showTab(tab.getAttribute('data-tab'));
		});

		// ↑ ↓ (e ← →, na fila estreita) andam pelas abas
		$('tabs').addEventListener('keydown', function (e) {
			var step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
			var tabs = Array.prototype.slice.call($('tabs').querySelectorAll('.tab'));
			var at = tabs.indexOf(document.activeElement);

			if (!step || at < 0) return;

			var next = tabs[(at + step + tabs.length) % tabs.length];

			e.preventDefault();
			showTab(next.getAttribute('data-tab'));
			next.focus();
		});
		showTab('prods');

		// a barra pode ter pedido uma aba (2 cliques numa ferramenta): ao abrir e enquanto a janela está aberta
		watchRequestedTab(true);
		setInterval(watchRequestedTab, 1000);

		state.newBtn = $('btn-new'); // a lista é redesenhada: o botão é guardado e reposto no fim dela
		state.newBtn.addEventListener('click', addRow);
		$('btn-save').addEventListener('click', save);
		$('btn-import').addEventListener('click', importList);
		$('btn-export').addEventListener('click', exportList);
		PAD_UTIL.bindMenu($('app-menu'), DOCS_URL);
		$('menu-team').addEventListener('click', function () {
			setEditTeam(!state.editTeam);
		});

		$('btn-reload').addEventListener('click', function () {
			confirmDiscard(load);
		});

		var filter = $('filter');

		filter.addEventListener('input', function () {
			$('filter-clear').hidden = filter.value === '';
			applyFilter();
		});
		filter.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && filter.value) {
				e.preventDefault();
				clearFilter();
			}

			// ↓ no filtro vai para o nome da primeira produção visível
			if (e.key === 'ArrowDown') {
				var first = $('list').querySelector('.prod-row:not([hidden]) input');

				if (first) {
					e.preventDefault();
					first.focus();
				}
			}
		});
		$('filter-clear').addEventListener('click', function () {
			clearFilter();
			filter.focus();
		});

		$('list').addEventListener('keydown', moveBetweenRows);

		// arrastar pelo puxador muda a ordem da lista (a ordem do menu na barra)
		PAD_SORT.enable($('list'), '.prod-row', function (from, to) {
			var moved = state.rows.splice(from, 1)[0];

			state.rows.splice(to, 0, moved);
			$('list').classList.add('is-settled'); // sem a animação de entrada ao redesenhar
			render();
			updateDirty();
		});

		PAD_KEYS.shortcuts({
			save: save,
			find: function () {
				PAD_KEYS.focusSearch(filter);
			},
			escape: function () {
				if (!filter.value) return false;

				clearFilter();

				return true;
			}
		});

		// a rede voltou? ao voltar para o painel, tenta ler a lista compartilhada de novo
		window.addEventListener('focus', function () {
			if (state.available === false) load();
		});

		load();
	}

	init();
})();
