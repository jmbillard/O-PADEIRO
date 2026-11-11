/*

---------------------------------------------------------------
> FONTES DO PROJETO — o estado de cada fonte e a troca
---------------------------------------------------------------

Uma linha por fonte usada no projeto: ✓ ok · ↑ enviando · ↓ falta instalar (está no banco) · ✕ sem arquivo.
Clicar numa linha abre a troca: a lista com busca (a mesma da atração) com as sugestões (a mesma família, a troca
que a equipe já usou), as do banco e as instaladas, só os nomes, e embaixo a prévia da fonte marcada. A que não
tem arquivo já abre assim, com a sugestão. Resolver instala as que faltam (e as escolhidas que estão só no
banco) e troca as escolhidas no projeto inteiro (um Ctrl+Z desfaz).

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;
	var FB = window.PAD_FONTBANK;
	var ATR = window.PAD_ATTRACTIONS;
	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/fontes.md';
	var SAMPLE = 'Pão Quentinho ÁÉÇÕ 0123';
	var LIST_MAX = 40; // instaladas mostradas de uma vez (continue digitando para achar outras)
	var STATES = {
		ok: ['✓', 'ok'],
		up: ['↑', 'enviando'],
		install: ['↓', 'instala do banco'],
		nofile: ['✕', 'sem arquivo']
	};
	var FONT_SVG = '<svg class="field-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h12M12 5v14M9.5 19h5" /></svg>';
	var ROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h12M12 5v14M9.5 19h5" /></svg>';
	var FILE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><path d="M13.5 3.5V8H18" /></svg>';
	var BANK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M5 19.5h14" /></svg>';

	var state = { info: null, fonts: [], open: {}, choices: {}, installed: null, bank: [], swaps: {}, busy: false, key: '', uploading: false };

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
	}

	function norm(text) {
		return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
	}

	/* ---------------------------------------------------------------
	   as fontes: do projeto, as instaladas (guardadas neste computador) e as do banco
	   --------------------------------------------------------------- */

	var INSTALLED_KEY = 'pad.fonts.installed';

	async function loadInstalled() {
		var cached = null;

		try {
			cached = JSON.parse(localStorage.getItem(INSTALLED_KEY) || 'null');
		} catch (err) { }

		state.installed = cached ? cached.fonts : [];

		// o After Effects só manda a lista quando o total muda (com muitas fontes, ela demora)
		try {
			var res = await call('fontsInstalled', { count: cached ? cached.count : -1 });

			if (!res.same) {
				state.installed = res.fonts;
				try {
					localStorage.setItem(INSTALLED_KEY, JSON.stringify(res));
				} catch (err) { }
			}
		} catch (err) { }
	}

	async function load() {
		try {
			var info = await call('fontsProject');

			state.info = info;

			if (!info.supported) {
				state.fonts = [];
				render('o banco de fontes precisa do After Effects 2024 ou mais novo.');
				return;
			}

			var checked = FB.available() ? await FB.check(info) : { fonts: info.fonts }; // no navegador de teste, o estado vem pronto

			state.fonts = checked.fonts;
			preselect();

			if (FB.available() && info.bank) {
				// as do banco e as trocas da equipe chegam depois: as sugestões são refeitas
				Promise.all([FB.bankFonts(info.bank), FB.readSwaps(info.bank)]).then(function (res) {
					var changed = JSON.stringify(res) !== JSON.stringify([state.bank, state.swaps]);

					state.bank = res[0];
					state.swaps = res[1];
					if (changed && !document.querySelector('.combo.is-open')) {
						state.key = '';
						render();
					}
				});
			}

			render();
			uploadPending(checked);
		} catch (err) {
			status(err.message, 'error');
		}
	}

	/* o andamento: a seta do estado anima enquanto o arquivo vai (para cima: copiando para o banco e a pasta do
	   projeto) ou vem (para baixo: instalando do banco) */
	function setMoving(names, dir) {
		[].concat(names).forEach(function (name) {
			Array.prototype.forEach.call(document.querySelectorAll('.fw-state'), function (dot) {
				if (dot.dataset.font !== name) return;

				dot.classList.toggle('is-moving', !!dir);
				dot.classList.toggle('is-down', dir === 'down');
				if (dir) dot.firstChild.textContent = dir === 'down' ? '↓' : '↑';
			});
		});
	}

	// com a janela aberta, ela mesma envia (e mostra o andamento); a barra faz o mesmo com ela fechada
	async function uploadPending(checked) {
		var info = state.info;

		if (state.uploading || !FB.available() || !info.upload || !info.machineUpload) return;

		var pending = checked.fonts.filter(function (f) {
			return f.state === 'up';
		});

		if (!pending.length) return;

		state.uploading = true;

		for (var i = 0; i < pending.length; i++) {
			setMoving(pending[i].name, 'up');
			try {
				await FB.upload(info, pending[i], checked);
			} catch (err) {
				status('#PAD_074 - não foi possível enviar ' + pending[i].name + ': ' + err.message, 'error');
			}
			setMoving(pending[i].name, null);
		}

		state.uploading = false;
		state.key = '';
		load();
	}

	// sem arquivo: a troca já abre, com a sugestão escolhida (dá para trocar ou apagar)
	function preselect() {
		state.fonts.forEach(function (f) {
			if (f.state !== 'nofile') return;
			if (state.open[f.name] == null) state.open[f.name] = true;
			if (state.choices[f.name] === undefined && state.installed && state.installed.length) {
				var sg = suggestions(f)[0];

				state.choices[f.name] = sg ? { name: sg.font.name, file: isInstalled(sg.font.name) ? '' : sg.font.file || '' } : null;
			}
		});
	}

	/* ---------------------------------------------------------------
	   as linhas
	   --------------------------------------------------------------- */

	function render(emptyText) {
		var list = $('fw-list');
		var info = state.info || {};
		var key = state.fonts.map(function (f) {
			return f.name + ':' + f.state;
		}).join('|') + '|' + Object.keys(state.open).filter(function (k) {
			return state.open[k];
		}).join(',') + '|' + JSON.stringify(state.choices);

		var layers = state.fonts.reduce(function (n, f) {
			return n + (f.layers || 0);
		}, 0);

		$('fw-file').innerHTML = FILE_SVG;
		$('fw-file').appendChild(el('span', null, (info.project || 'projeto sem nome') + ' · ' + state.fonts.length + (state.fonts.length === 1 ? ' fonte' : ' fontes') + (layers ? ' em ' + layers + (layers === 1 ? ' layer' : ' layers') : '')));
		$('fw-empty').hidden = !!state.fonts.length;
		$('fw-empty').textContent = emptyText || 'o projeto não usa nenhuma fonte.';
		updateGo();

		// a lista só é refeita quando algo muda (a busca aberta não perde o que está sendo digitado)
		if (key === state.key) return;

		state.key = key;
		list.textContent = '';
		state.fonts.forEach(function (font) {
			list.appendChild(row(font));
		});
	}

	// a linha da fonte: o selo, o nome e os layers, a amostra escrita na própria fonte e o estado (só o ícone,
	// o texto no balão); clicar abre a troca embaixo
	function layersText(n) {
		return n ? n + (n === 1 ? ' layer' : ' layers') : '';
	}

	function row(font) {
		var box = el('div', 'fw-row');
		var head = el('button', 'fw-head');
		var st = STATES[font.state] || STATES.ok;
		var text = el('span', 'fw-text');
		var title = el('span', 'fw-name');
		var sample = el('span', 'fw-sample', SAMPLE);
		var dot = el('span', 'fw-state is-' + font.state);

		dot.appendChild(el('i', null, st[0]));
		dot.dataset.font = font.name;

		function line() {
			var choice = state.choices[font.name];

			title.textContent = '';
			title.appendChild(el('b', null, font.name));
			if (font.layers) title.appendChild(document.createTextNode(' · ' + layersText(font.layers)));
			if (choice && !state.open[font.name]) title.appendChild(el('em', 'fw-to', ' → ' + choice.name));
		}

		head.type = 'button';
		head.title = (font.family ? font.family + ' ' + font.style + '\n' : '') + st[1] + (font.location ? '\n' + font.location : '');
		head.appendChild(el('span', 'fw-badge' + (font.missing ? ' is-missing' : ''), font.missing ? '?' : 'Tt'));
		text.appendChild(title);
		text.appendChild(sample);
		head.appendChild(text);
		dot.title = st[1];
		head.appendChild(dot);
		line();
		showPreview(sample, font.missing ? null : { name: font.name, file: font.location }, true);
		head.addEventListener('click', function () {
			state.open[font.name] = !state.open[font.name];
			swap.hidden = !state.open[font.name];
			line();
			if (!swap.hidden) swap.querySelector('input').focus();
		});
		box.appendChild(head);

		var swap = swapBox(font);

		swap.hidden = !state.open[font.name];
		box.appendChild(swap);

		return box;
	}

	/* ---------------------------------------------------------------
	   a troca: a lista com busca (só os nomes) e a prévia da marcada
	   --------------------------------------------------------------- */

	// o peso pelo nome do estilo (Black, Bold…), para pôr a mais parecida primeiro
	var WEIGHTS = [['thin', 100], ['hairline', 100], ['extralight', 200], ['ultralight', 200], ['light', 300], ['book', 400], ['regular', 400], ['roman', 400], ['normal', 400], ['medium', 500], ['semibold', 600], ['demibold', 600], ['extrabold', 800], ['ultrabold', 800], ['bold', 700], ['heavy', 900], ['black', 900], ['ultra', 950]];

	function weightOf(style) {
		var s = norm(style);

		for (var i = 0; i < WEIGHTS.length; i++) if (s.indexOf(WEIGHTS[i][0]) >= 0) return WEIGHTS[i][1];

		return 400;
	}

	// as sugestões: a troca que a equipe já usou e a mesma família em outro estilo (o peso mais perto primeiro)
	function suggestions(font) {
		var out = [];
		var seen = {};
		var all = state.installed.concat(state.bank);
		var fam = norm(font.family || font.name.split('-')[0]);

		function add(name, why) {
			if (!name || seen[name] || name === font.name) return;

			var hit = all.filter(function (f) {
				return f.name === name;
			})[0];

			if (!hit) return;

			seen[name] = true;
			out.push({ font: hit, why: why });
		}

		add(state.swaps[font.name], 'a equipe usou');

		var w = weightOf(font.style || font.name.split('-').slice(1).join(' '));
		var italic = /italic|oblique/i.test(font.style || font.name);

		all.filter(function (f) {
			return fam && (norm(f.family) === fam || norm(f.name.split('-')[0]) === fam);
		}).sort(function (a, b) {
			var ia = /italic|oblique/i.test(a.style) !== italic ? 1000 : 0;
			var ib = /italic|oblique/i.test(b.style) !== italic ? 1000 : 0;

			return ia + Math.abs(weightOf(a.style) - w) - (ib + Math.abs(weightOf(b.style) - w));
		}).forEach(function (f) {
			add(f.name, 'mesma família');
		});

		return out.slice(0, 4);
	}

	function isInstalled(name) {
		return state.installed.some(function (f) {
			return f.name === name;
		});
	}

	function swapBox(font) {
		var wrap = el('div', 'fw-swap');
		var combo = el('div', 'combo');
		var field = el('div', 'has-field-icon combo-field');
		var input = el('input', 'cfg-input');
		var panel = el('div', 'combo-panel fw-panel');
		var items = el('div', 'fw-items');
		var preview = el('p', 'fw-preview');
		var marked = null;
		var sugg = suggestions(font);
		var choice = state.choices[font.name];

		input.type = 'text';
		input.spellcheck = false;
		input.autocomplete = 'off';
		input.placeholder = 'trocar por…';
		input.setAttribute('aria-label', 'trocar ' + font.name + ' por');
		input.value = choice ? choice.name : '';
		field.insertAdjacentHTML('afterbegin', FONT_SVG);
		field.appendChild(input);
		panel.hidden = true;
		combo.appendChild(field);
		combo.appendChild(panel);
		wrap.appendChild(el('span', 'fw-label', 'substituir por'));
		wrap.appendChild(combo);

		function mark(f) {
			marked = f;
			showPreview(preview, f);
		}

		function pick(f) {
			state.choices[font.name] = { name: f.name, file: isInstalled(f.name) ? '' : f.file || '' };
			input.value = f.name;
			close();
			state.key = '';
			render();
		}

		function close() {
			panel.hidden = true;
			combo.classList.remove('is-open');
		}

		function fill() {
			var current = state.choices[font.name];
			var q = current && input.value === current.name ? '' : norm(input.value); // a escolhida no campo: a lista inteira
			var words = q ? [q] : [];
			var match = function (f) {
				return !words.length || norm(f.name).indexOf(q) >= 0 || norm(f.family + f.style).indexOf(q) >= 0;
			};
			var suggested = {};

			sugg.forEach(function (sg) {
				suggested[sg.font.name] = true;
			});

			var inBank = state.bank.filter(function (f) {
				return !isInstalled(f.name) && !suggested[f.name] && match(f);
			});
			var inst = state.installed.filter(function (f) {
				return !suggested[f.name] && match(f);
			});
			var first = null;

			ATR.resize(panel, function () {
				panel.textContent = '';
				items.textContent = '';
				panel.appendChild(items);

				function item(f, meta, icon) {
					var on = choice && choice.name === f.name;
					var it = ATR.row(icon || ROW_SVG, f.name, meta, on, function () {
						pick(f);
					});

					it.addEventListener('mouseenter', function () {
						mark(f);
					});
					if (!first) first = f;
					items.appendChild(it);
				}

				var sg = sugg.filter(function (s) {
					return match(s.font);
				});

				if (sg.length) {
					items.appendChild(ATR.group('sugestões'));
					sg.forEach(function (s) {
						item(s.font, s.why);
					});
				}

				if (inBank.length) {
					items.appendChild(ATR.group('no banco'));
					inBank.slice(0, 12).forEach(function (f) {
						item(f, 'instala ao trocar', BANK_SVG);
					});
				}

				items.appendChild(ATR.group(inst.length ? 'instaladas' : 'nenhuma fonte com esse nome'));
				inst.slice(0, LIST_MAX).forEach(function (f) {
					item(f, '');
				});
				if (inst.length > LIST_MAX) items.appendChild(ATR.group('+ ' + (inst.length - LIST_MAX) + ' · continue digitando'));
				panel.appendChild(preview);
			});

			mark(first);
			panel.hidden = false;
			combo.classList.add('is-open');
			setTimeout(function () {
				combo.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); // a lista aberta fica à vista (acima do rodapé)
			}, 240);
		}

		input.addEventListener('focus', function () {
			input.select(); // digitar troca o nome que está lá
			fill();
		});
		input.addEventListener('input', function () {
			if (!input.value.trim() && state.choices[font.name]) {
				state.choices[font.name] = null; // apagou: sem troca
				updateGo();
			}
			fill();
		});
		input.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') close();
			if (e.key === 'Enter' && marked) {
				e.preventDefault();
				pick(marked);
			}
		});
		combo.addEventListener('focusout', function () {
			setTimeout(function () {
				if (!combo.contains(document.activeElement)) close();
			}, 120);
		});

		return wrap;
	}

	// a prévia: a fonte marcada escrita nela mesma (instalada: pelo nome; do banco: pelo arquivo)
	var faces = {};

	function showPreview(node, f, inRow) {
		var base = inRow ? 'fw-sample' : 'fw-preview';

		node.className = base;
		node.style.fontFamily = '';
		node.textContent = SAMPLE;

		if (!f) {
			if (inRow) {
				node.className = base + ' is-missing';
				node.textContent = 'prévia indisponível'; // a fonte não está neste computador
			} else {
				node.textContent = '';
			}
			return;
		}

		if (!window.FontFace) return;

		var id = 'pad-fw-' + norm(f.name);

		if (!faces[id]) {
			var sources = [];

			if (f.file && (inRow || !isInstalled(f.name))) sources.push('url("' + PAD_UTIL.fileUrl(f.file) + '")');
			sources.push('local("' + f.name.replace(/"/g, '') + '")');
			faces[id] = new FontFace(id, sources.join(', ')).load().then(function (face) {
				document.fonts.add(face);

				return true;
			}, function () {
				return false;
			});
		}

		faces[id].then(function (ok) {
			if (ok) {
				node.style.fontFamily = '"' + id + '", sans-serif';
			} else {
				node.className = base + ' is-missing';
				node.textContent = 'prévia indisponível';
			}
		});
	}

	/* ---------------------------------------------------------------
	   resolver: instala (do banco) e troca
	   --------------------------------------------------------------- */

	function plan() {
		var install = [];
		var swaps = [];

		state.fonts.forEach(function (f) {
			var c = state.choices[f.name];

			if (c) {
				swaps.push({ from: f.name, to: c.name });
				if (c.file) install.push(c.file);
			} else if (f.state === 'install' && f.bankFile) {
				install.push(f.bankFile);
			}
		});

		return { install: install, swaps: swaps };
	}

	function updateGo() {
		var p = plan();
		var n = p.install.length + p.swaps.length;
		var missing = state.fonts.some(function (f) {
			return f.missing;
		});

		// faltando alguma, Resolver tenta também a pasta de fontes do projeto (mesmo sem nada do banco)
		$('fw-go').disabled = (!n && !missing) || state.busy;
		$('fw-go').textContent = n ? 'Resolver: ' + n : 'Resolver';
	}

	async function resolve() {
		var p = plan();

		if (state.busy) return;

		state.busy = true;
		updateGo();
		status('resolvendo…');

		try {
			var parts = [];

			// primeiro a pasta de fontes do projeto (poucas e perto); o banco só para o que ainda faltar
			var fromProject = state.fonts.some(function (f) {
				return f.missing;
			}) ? await call('fontsInstallProject').catch(function () {
				return { none: true, installed: 0 };
			}) : { none: true, installed: 0 };

			if (fromProject.installed) {
				parts.push(fromProject.installed + (fromProject.installed === 1 ? ' fonte instalada da pasta do projeto' : ' fontes instaladas da pasta do projeto'));
				status('esperando o After Effects enxergar as fontes…');
				await PAD_UTIL.syncFonts(call, 8);

				var after = await call('fontsProject');
				var nowOk = {};

				after.fonts.forEach(function (f) {
					if (!f.missing) nowOk[f.name] = true;
				});
				// as que a pasta do projeto resolveu saem do que vem do banco
				p.install = p.install.filter(function (file) {
					return !state.fonts.some(function (f) {
						return f.bankFile === file && nowOk[f.name];
					});
				});
			}

			if (p.install.length) {
				var going = state.fonts.filter(function (f) {
					var c = state.choices[f.name];

					return (c && c.file) || (!c && f.state === 'install');
				}).map(function (f) {
					return f.name;
				});

				setMoving(going, 'down');

				var inst = await call('fontsInstall', { files: p.install });

				setMoving(going, null);

				parts.push((inst.installed + inst.already) + (p.install.length === 1 ? ' fonte instalada' : ' fontes instaladas'));
				if (inst.errors.length) parts.push('não foi possível instalar: ' + inst.errors.join(', '));
			}

			if (p.swaps.length) {
				// a fonte recém-instalada pode demorar um instante para o After Effects enxergar
				if (p.install.length) await PAD_UTIL.syncFonts(call, 8);

				var rep = await call('fontsReplace', { swaps: p.swaps });

				if (rep.done.length) parts.push(rep.done.length + (rep.done.length === 1 ? ' fonte trocada' : ' fontes trocadas'));
				rep.failed.forEach(function (f) {
					parts.push(f.from + ': ' + f.reason);
				});
				if (FB.available() && state.info && state.info.bank && rep.done.length) await FB.rememberSwaps(state.info.bank, rep.done);
				rep.done.forEach(function (d) {
					delete state.choices[d.from];
					delete state.open[d.from];
				});
			}

			// o After Effects enxerga as instaladas e as camadas com a fonte substituída passam para elas (o texto redesenha)
			if (p.install.length && !p.swaps.length) {
				status('esperando o After Effects enxergar as fontes…');
				await PAD_UTIL.syncFonts(call, 15);
			}

			status(parts.join(' · '), '');
			state.key = '';
			await loadInstalled();
			await load();
		} catch (err) {
			status(err.message, 'error');
		}

		state.busy = false;
		updateGo();
	}

	/* ---------------------------------------------------------------
	   início
	   --------------------------------------------------------------- */

	function init() {
		$('fw-go').addEventListener('click', resolve);

		// copiar todas as fontes do projeto para uma pasta qualquer (o collect das fontes)
		$('fw-collect').addEventListener('click', async function () {
			var path = PAD_BRIDGE.pickFolder('Pasta para copiar as fontes do projeto');

			if (!path) return;

			try {
				var res = await call('collectFonts', { path: path });

				status(res.data && res.data.path ? 'fontes copiadas para ' + res.data.path : 'nenhuma fonte pôde ser copiada.', '');
			} catch (err) {
				status(err.message, 'error');
			}
		});

		var menu = $('app-menu');

		menu.addEventListener('click', async function (e) {
			var btn = e.target.closest('button[data-action]');

			if (!btn) return;

			menu.removeAttribute('open');

			var action = btn.dataset.action;

			try {
				if (action === 'docs') PAD_BRIDGE.openUrl(DOCS_URL);
				if (action === 'reload') location.reload();
				if (action === 'bank') {
					if (!state.info || !state.info.bank) throw new Error('#PAD_074 - nenhuma pasta de banco de fontes na configuração (aba FONTES).');
					await call('openFolder', { path: state.info.bank });
				}

			} catch (err) {
				status(err.message, 'error');
			}
		});

		window.addEventListener('focus', load);
		setInterval(function () {
			if (!document.hidden && !document.querySelector('.combo.is-open')) load();
		}, 5000);

		loadInstalled().then(function () {
			preselect();
			state.key = '';
			render();
		});
		load();
	}

	init();
})();
