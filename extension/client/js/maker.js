/*

---------------------------------------------------------------
> CRIAR TEMPLATE
---------------------------------------------------------------

A comp ativa vira a comp principal, os layers
selecionados viram os layers editáveis e, ao salvar, o projeto vai para a pasta escolhida junto de
'<nome>_config.json', '<nome>_preview.png' e da pasta FONTS.

*/

(function () {
	'use strict';

	var call = PAD_BRIDGE.call;

	var DOCS_URL = 'https://github.com/jmbillard/O-PADEIRO/blob/main/docs/criador.md';
	var DEFAULT_CONFIG_NAME = 'NOME DA CONFIGURAÇÃO';
	var GLOBAL_SEPARATOR = ' - '; // mesmo separador do nome final das comps (host)

	var METHODS = [
		['textContent', 'conteúdo do texto'],
		['layerName', 'nome do layer']
	];

	var state = {
		comp: null, // { id, name, time }
		layers: [], // { id, index, name, isText, method, missing }
		outputs: [''],
		emptyConfirm: null,
		saving: false,
		busy: false
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

	function toast(kind, text) {
		PAD_UTIL.toast($('toast'), 'finder-toast', kind, text);
	}

	function normalizeBreaks(str) {
		return String(str).replace(/\r\n|\r/g, '\n');
	}

	// Mesma limpeza de nomes do host (String.replaceSpecialCharacters).
	function cleanName(str) {
		return str
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^\w\s-]/g, ' ')
			.replace(/[\s_]+/g, ' ')
			.trim();
	}

	function titleCase(str) {
		return str.toLowerCase().replace(/\s(.)/g, function (m) {
			return m.toUpperCase();
		}).replace(/^(.)/, function (m) {
			return m.toUpperCase();
		});
	}

	// Tempo de referência em frames inteiros (o After Effects guarda em segundos).
	function formatFrame(seconds, fps) {
		return 'frame ' + Math.round(Math.max(0, seconds || 0) * (fps || 30));
	}

	/* =========================================================
	   Formulário (regras do script: separador, caixa, nome final)
	   ========================================================= */

	// '\n' digitado vira quebra de linha; sem separador ou com menos de 2 layers, o texto inteiro
	// vai para um único layer ('---', como o script grava).
	function getSeparator() {
		var sep = $('f-separator').value;

		if (sep === '' || state.layers.length < 2) return '---';

		return sep.replace(/\\n|\\r/g, '\n');
	}

	function applyTextCase(str) {
		var kind = $('f-case').value;

		if (kind === 'upperCase') return str.toUpperCase();
		if (kind === 'lowerCase') return str.toLowerCase();
		if (kind === 'titleCase') return titleCase(str);

		return str;
	}

	function firstExampleBlock() {
		return normalizeBreaks($('f-example').value).split(/\n{2,}/)[0];
	}

	// Informações do exemplo, uma por layer (a mesma divisão do teste e do preenchimento).
	function exampleInputs() {
		return applyTextCase(firstExampleBlock()).split(getSeparator());
	}

	function updateNamePreview() {
		var info = exampleInputs().join(' ').replace(/[\s-]+/g, ' ').trim();
		var prefix = $('f-prefix').value.trim();
		var name = cleanName(((prefix ? prefix + GLOBAL_SEPARATOR : '') + info).toUpperCase());
		var box = $('name-preview');

		box.textContent = '';
		box.appendChild(el('span', 'cfg-preview-label', 'nome final da comp com o exemplo'));
		box.appendChild(el('strong', null, name));
	}

	function updateSeparatorState() {
		var many = state.layers.length > 1;

		$('f-separator').disabled = !many;
		$('sep-hint').textContent = many
			? 'use \\n para uma informação por linha (cada informação vai para um layer).'
			: 'com 1 layer só, o texto inteiro vai para ele (o separador fica desligado).';
	}

	/* =========================================================
	   Layers editáveis
	   ========================================================= */

	function renderLayers() {
		var list = $('layers');

		list.textContent = '';
		PAD_SORT.enable(list, '.cfg-row', function (from, to) {
			state.layers.splice(to, 0, state.layers.splice(from, 1)[0]);
			renderLayers();
		});

		if (!state.layers.length) {
			list.appendChild(el('p', 'cfg-empty', 'nenhum layer editável: selecione layers na comp principal e clique em “+ layers”.'));
		}

		updateChecklist();

		state.layers.forEach(function (layer, i) {
			var row = el('div', 'cfg-row' + (layer.missing ? ' is-missing' : ''));
			var name = el('button', 'maker-layer-name', '#' + layer.index + '  ' + layer.name);
			var selWrap = el('span', 'select select-large');
			var select = el('select');
			var options = layer.isText ? METHODS : [METHODS[1]]; // 'conteúdo' só para layers de texto

			name.type = 'button';
			name.title = layer.missing ? 'o layer não existe mais na comp' : 'clique para selecionar / desselecionar o layer na comp';
			name.addEventListener('click', function () {
				call('makerToggleLayer', { compId: state.comp.id, layerId: layer.id }).catch(function (err) {
					toast('error', err.message);
				});
			});

			options.forEach(function (o) {
				var option = el('option', null, o[1]);

				option.value = o[0];
				select.appendChild(option);
			});

			select.value = layer.method;
			selWrap.appendChild(select);
			select.addEventListener('change', function () {
				layer.method = select.value;
			});

			// puxador à esquerda (arrastar muda a ordem) e o × dentro do campo do método
			var remove = miniButton('remove', 'remover layer', function () {
				state.layers.splice(i, 1);
				renderLayers();
			});

			remove.classList.add('row-remove');
			selWrap.classList.add('has-remove');
			selWrap.appendChild(remove);

			row.appendChild(PAD_SORT.handle());
			row.appendChild(el('span', 'cfg-row-label', 'informação ' + (i + 1)));
			row.appendChild(name);
			row.appendChild(selWrap);
			list.appendChild(row);

			PAD_DROPDOWN.enhance(select);
		});

		updateSeparatorState();
		updateNamePreview();
	}

	function addLayerInfos(infos) {
		var added = 0;

		infos.forEach(function (info) {
			if (state.layers.some(function (l) { return l.id === info.id; })) return;

			state.layers.push({ id: info.id, index: info.index, name: info.name, isText: info.isText, text: info.text || '', method: info.isText ? 'textContent' : 'layerName', missing: false });
			added++;
		});

		renderLayers();

		return added;
	}

	async function addSelectedLayers() {
		if (!state.comp) return toast('error', '#PAD_025 - capture o preview com a comp principal aberta primeiro.');

		try {
			var res = await call('makerSelection', { compId: state.comp.id });

			if (!addLayerInfos(res.selected)) toast(null, 'esses layers já estão na lista.');
		} catch (err) {
			toast('error', err.message);
		}
	}

	// Nomes e posições mudam na comp: atualiza a lista (e avisa dos layers apagados).
	async function refreshLayers() {
		if (!state.comp || !state.layers.length) return;

		try {
			var res = await call('makerLayers', { compId: state.comp.id, layerIds: state.layers.map(function (l) { return l.id; }) });

			res.layers.forEach(function (info, i) {
				var layer = state.layers[i];

				layer.missing = !info;

				if (info) {
					layer.index = info.index;
					layer.name = info.name;
					layer.text = info.text || '';
				}
			});

			renderLayers();
		} catch (err) { }
	}

	// Exemplo montado com o que está nos layers agora: o texto (ou o nome, conforme o método) de cada um,
	// na ordem da lista, unidos pelo separador.
	async function exampleFromLayers() {
		if (!state.layers.length) return toast('error', '#PAD_026 - adicione os layers editáveis primeiro (“+ layers”).');

		await refreshLayers();

		var sep = getSeparator();
		var oneLine = sep.indexOf('\n') >= 0; // separador de linha: quebras dentro de um texto viram espaço
		var parts = state.layers
			.filter(function (layer) {
				return !layer.missing;
			})
			.map(function (layer) {
				var value = layer.method === 'textContent' ? normalizeBreaks(layer.text) : layer.name;

				return oneLine ? value.replace(/\s*\n+\s*/g, ' ').trim() : value;
			});
		var example = parts.join(sep === '---' ? '\n' : sep).replace(/\n{2,}/g, '\n'); // linha vazia separaria versões

		$('f-example').value = example;
		$('f-example').dispatchEvent(new Event('input'));
		toast('success', 'exemplo montado com ' + parts.length + (parts.length === 1 ? ' layer.' : ' layers.'));
	}

	/* =========================================================
	   O que falta para salvar (checklist da barra)
	   ========================================================= */

	function checks() {
		var config = $('f-config').value.trim();
		var infos = firstExampleBlock().trim() === '' ? 0 : exampleInputs().length;
		var missing = state.layers.filter(function (l) {
			return l.missing;
		}).length;
		var outputs = state.outputs.filter(function (p) {
			return p.trim() !== '';
		}).length;
		var hasPreview = !!state.comp && $('preview-card').classList.contains('has-image');

		return [
			{ key: 'preview', label: 'preview', ok: hasPreview, target: 'preview-card', tip: hasPreview ? 'preview capturado' : 'capture o preview com a comp principal aberta' },
			{ key: 'name', label: 'nome', ok: config !== '' && config !== DEFAULT_CONFIG_NAME, target: 'f-config', tip: 'nome da configuração' },
			{
				key: 'layers',
				label: 'layers',
				ok: state.layers.length > 0 && !missing,
				target: 'layers',
				tip: !state.layers.length ? 'nenhum layer editável' : missing ? plural(missing, 'layer não existe', 'layers não existem') + ' mais na comp' : plural(state.layers.length, 'layer editável', 'layers editáveis')
			},
			{
				key: 'example',
				label: 'exemplo',
				ok: infos > 0 && (state.layers.length < 2 || infos === state.layers.length),
				target: 'f-example',
				tip: infos === 0 ? 'exemplo vazio' : state.layers.length > 1 && infos !== state.layers.length ? 'o exemplo tem ' + plural(infos, 'informação', 'informações') + ' e a lista tem ' + plural(state.layers.length, 'layer', 'layers') : 'o exemplo bate com os layers'
			},
			{ key: 'output', label: 'output', ok: outputs > 0, target: 'outputs', tip: outputs ? plural(outputs, 'pasta de output', 'pastas de output') : 'nenhuma pasta de output' }
		];
	}

	function plural(n, one, many) {
		return n + ' ' + (n === 1 ? one : many);
	}

	function updateChecklist() {
		var box = $('checklist');

		if (!box) return;

		box.textContent = '';

		checks().forEach(function (item) {
			var chip = el('button', 'check-chip' + (item.ok ? ' is-ok' : ''));

			chip.type = 'button';
			chip.title = (item.ok ? '✓ ' : 'falta: ') + item.tip;
			chip.appendChild(el('span', 'check-dot'));
			chip.appendChild(el('span', 'check-label', item.label));
			chip.addEventListener('click', function () {
				goTo(item.target);
			});
			box.appendChild(chip);
		});
	}

	// Leva até o campo (ou cartão) do item e dá um destaque rápido no cartão.
	function goTo(id) {
		var target = $(id);
		var card = target.closest('.cfg-card') || target;
		var field = target.matches('input, textarea') ? target : card.querySelector('input:not([disabled]), textarea');

		card.scrollIntoView({ block: 'center', behavior: 'smooth' });
		card.classList.remove('is-pulse');
		void card.offsetWidth;
		card.classList.add('is-pulse');

		if (field && id !== 'preview-card') field.focus({ preventScroll: true });
	}

	/* =========================================================
	   Preview / comp principal
	   ========================================================= */

	function showPreview(path) {
		var img = $('preview');
		var card = $('preview-card');

		card.classList.remove('has-image');
		img.hidden = true;
		updateChecklist();

		if (!path) return;

		img.onload = function () {
			img.hidden = false;
			card.classList.add('has-image');
			updateChecklist();
		};
		img.onerror = function () {
			img.hidden = true;
			updateChecklist();
		};
		var url = PAD_UTIL.fileUrl(path);

		// o arquivo é reescrito a cada captura: o parâmetro evita a imagem antiga em cache
		img.src = /^data:/.test(url) ? url : url + '?t=' + Date.now();
	}

	function showComp() {
		var time = $('comp-time');

		$('comp-name').textContent = state.comp ? state.comp.name : '—';
		time.lastChild.textContent = state.comp ? (state.comp.time || 0).toFixed(2) + ' s (' + formatFrame(state.comp.time, state.comp.fps) + ')' : '';
		time.hidden = !state.comp;
		time.title = state.comp ? 'tempo de referência, a ' + (Math.round((state.comp.fps || 30) * 100) / 100) + ' fps' : '';
	}

	// Prévia de cada fonte: o nome e um texto fixo desenhado com ela. A fonte vem do próprio arquivo
	// (location) ou, sem ele, das fontes instaladas pelo nome PostScript; se nada carregar, avisa.
	var FONT_SAMPLE = 'Pão Quentinho ÁÉÇÕ 0123 %&@#';

	function fontLabel(font) {
		return [font.family, font.style].filter(Boolean).join(' ') || font.name || '';
	}

	function fontPreview(font, i) {
		var li = el('li', 'font-item');
		var label = el('span', 'font-name', fontLabel(font));
		var badge = el('span', 'font-badge' + (font.adobe ? ' is-adobe' : ''), font.adobe ? 'CC' : 'Tt');

		badge.title = font.adobe ? 'não instalada neste computador (provavelmente do Adobe Fonts / Creative Cloud)' : 'instalada neste computador';
		li.appendChild(badge);
		var sample = el('span', 'font-sample', FONT_SAMPLE);
		var id = 'pad-font-' + i + '-' + Date.now();
		var sources = [];

		li.title = font.name + (font.location ? '\n' + font.location : '');
		li.appendChild(label);
		li.appendChild(sample);

		if (font.location) sources.push('url("' + PAD_UTIL.fileUrl(font.location) + '")');
		if (font.name) sources.push('local("' + font.name.replace(/"/g, '') + '")');

		if (!sources.length || !window.FontFace) {
			li.classList.add('is-missing');
			return li;
		}

		var face = new FontFace(id, sources.join(', '));

		face.load().then(
			function (loaded) {
				document.fonts.add(loaded);
				sample.style.fontFamily = '"' + id + '", sans-serif';
				li.classList.add('is-ready');
			},
			function () {
				li.classList.add('is-missing');
				sample.title = 'prévia indisponível: a fonte não está instalada neste computador';
			}
		);

		return li;
	}

	async function loadFonts() {
		try {
			var res = await call('makerFonts');
			var list = $('fonts-list');

			list.textContent = '';
			// em ordem alfabética, pelo nome mostrado (família e estilo)
			res.fonts.sort(function (a, b) {
				return fontLabel(a).localeCompare(fontLabel(b), 'pt-BR', { sensitivity: 'base' });
			});
			res.fonts.forEach(function (font, i) {
				list.appendChild(fontPreview(font, i));
			});
			$('fonts').hidden = res.fonts.length === 0;
		} catch (err) { }
	}

	async function capture(silent) {
		try {
			var res = await call('makerCapture');

			if (state.comp && state.comp.id !== res.compId && state.layers.length) {
				state.layers = [];
				renderLayers();
				toast(null, 'a comp principal mudou: a lista de layers foi limpa.');
			}

			state.comp = { id: res.compId, name: res.compName, time: res.time, fps: res.frameRate };
			showComp();
			showPreview(res.preview);
			loadFonts();

			return res;
		} catch (err) {
			if (!silent) toast('error', err.message);

			throw err;
		}
	}

	/* =========================================================
	   Pastas
	   ========================================================= */

	async function pickPathInto(input, title) {
		var picked = PAD_BRIDGE.pickFolder(title, input.value);

		if (!picked) return false;

		try {
			input.value = (await call('canonicalPath', { path: picked })).path;
		} catch (err) {
			input.value = picked;
		}

		return true;
	}

	function renderOutputs() {
		var list = $('outputs');

		list.textContent = '';

		state.outputs.forEach(function (path, i) {
			var line = el('div', 'cfg-path');
			var input = el('input', 'cfg-input');
			var pick = miniButton('folder', 'escolher pasta', async function () {
				if (await pickPathInto(input, 'Selecione a pasta de output')) {
					state.outputs[i] = input.value;
					updateChecklist();
				}
			});
			var remove = miniButton('remove', 'remover output', function () {
				state.outputs.splice(i, 1);
				renderOutputs();
				updateChecklist();
			});

			input.type = 'text';
			input.value = path;
			input.placeholder = 'pasta de output';
			input.spellcheck = false;
			input.setAttribute('aria-label', 'pasta de output ' + (i + 1));
			input.addEventListener('input', function () {
				state.outputs[i] = input.value;
				updateChecklist();
			});

			remove.disabled = state.outputs.length === 1; // mantém ao menos uma pasta
			line.appendChild(input);
			line.appendChild(pick);
			line.appendChild(remove);
			list.appendChild(line);
		});
	}

	/* =========================================================
	   Testar e salvar
	   ========================================================= */

	async function testNow() {
		if (!state.comp) return toast('error', '#PAD_025 - capture o preview com a comp principal aberta primeiro.');
		if (!state.layers.length) return toast('error', '#PAD_026 - adicione pelo menos um layer editável para testar.');

		var btn = $('btn-test');

		btn.disabled = true;

		try {
			var res = await call('makerTest', {
				compId: state.comp.id,
				layers: state.layers.map(function (l) {
					return { id: l.id, method: l.method };
				}),
				inputs: exampleInputs()
			});

			state.comp = { id: res.compId, name: res.compName, time: res.time, fps: res.frameRate };
			showComp();
			showPreview(res.preview);
		} catch (err) {
			toast('error', '#PAD_027 - ' + err.message.replace(/^#PAD_027 - /, ''));
		} finally {
			btn.disabled = false;
		}
	}

	// "como criar um template": a lista abre e fecha deslizando (o <details> nativo só aparece e some)
	function animateDetails(details) {
		var summary = details.querySelector('summary');
		var body = details.querySelector('ol');
		var anim = null;

		summary.addEventListener('click', function (e) {
			e.preventDefault();

			if (!body.animate) return (details.open = !details.open);

			var opening = !details.open;
			var start = anim ? body.offsetHeight : opening ? 0 : body.offsetHeight;

			if (anim) anim.cancel();

			details.open = true;

			var end = opening ? body.scrollHeight : 0;

			anim = body.animate(
				[
					{ height: start + 'px', opacity: opening ? 0 : 1 },
					{ height: end + 'px', opacity: opening ? 1 : 0 }
				],
				{ duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }
			);
			anim.onfinish = function () {
				anim = null;
				details.open = opening;
			};
		});
	}

	function buildConfig() {
		return {
			configName: $('f-config').value.trim(),
			exemple: normalizeBreaks($('f-example').value),
			tip: normalizeBreaks($('f-tip').value),
			prefix: $('f-prefix').value.trim(),
			refTime: state.comp ? state.comp.time : 2,
			separator: getSeparator(),
			textCase: $('f-case').value,
			importPath: $('f-import').value.trim(),
			outputPath: state.outputs
				.map(function (p) {
					return p.trim();
				})
				.filter(Boolean)
		};
	}

	function setHint(text) {
		$('save-hint').textContent = text || '';
	}

	async function save() {
		if (state.saving) return;

		if (!state.comp) return toast('error', '#PAD_028 - comp principal não encontrada: abra a comp e capture o preview.');

		var cfg = buildConfig();

		if (cfg.configName === '' || cfg.configName === DEFAULT_CONFIG_NAME) {
			$('f-config').focus();
			return toast('error', '#PAD_029 - preencha o nome da configuração.');
		}

		// sem layers editáveis o template não terá inputs: pede um segundo clique
		if (!state.layers.length && !state.emptyConfirm) {
			setHint('nenhum layer editável: clique de novo para salvar mesmo assim');
			state.emptyConfirm = setTimeout(function () {
				state.emptyConfirm = null;
				setHint('');
			}, 4500);

			return;
		}

		clearTimeout(state.emptyConfirm);
		state.emptyConfirm = null;
		setHint('');

		state.saving = true;
		$('btn-save').disabled = true;
		$('btn-save').textContent = 'Salvando…';

		try {
			var res = await call('makerSave', {
				compId: state.comp.id,
				layers: state.layers.map(function (l) {
					return { id: l.id, method: l.method };
				}),
				config: cfg
			});

			if (!res.data.saved) {
				toast(null, 'salvamento cancelado.');
			} else if (res.messages.length) {
				toast('error', res.messages.join('\n'));
			} else {
				toast('success', 'template salvo: ' + res.data.path);
			}
		} catch (err) {
			toast('error', err.message);
		} finally {
			state.saving = false;
			$('btn-save').disabled = false;
			$('btn-save').textContent = 'Salvar template';
		}
	}

	/* =========================================================
	   Início
	   ========================================================= */

	function showForm(hasComp) {
		$('form').hidden = !hasComp;
		$('bar').hidden = !hasComp;
		$('state-nocomp').hidden = hasComp;
	}

	// Como o script ao abrir: captura o preview, traz os layers já selecionados e deixa um output vazio.
	async function start() {
		try {
			var st = await call('makerState');

			showForm(st.hasComp);

			if (!st.hasComp) return;

			var res = await capture(true);

			addLayerInfos(res.selected);
		} catch (err) {
			showForm(false);
		}
	}

	// Pasta de mídias (opcional, uma só): o botão "+ pasta de mídias" mostra o campo; o × esvazia e esconde.
	function showImportRow(on) {
		$('import-row').hidden = !on;
		$('btn-import-add').hidden = on;
	}

	function resetForm() {
		$('f-config').value = '';
		$('f-example').value = 'INFORMAÇÃO 1\nINFORMAÇÃO 2';
		$('f-tip').value = '';
		$('f-prefix').value = 'TARJA';
		$('f-case').value = 'upperCase';
		PAD_DROPDOWN.refresh($('f-case'));
		$('f-separator').value = '\\n';
		$('f-import').value = '';
		showImportRow(false);
		state.layers = [];
		state.outputs = [''];
		state.comp = null;
		renderLayers();
		renderOutputs();
		showComp();
		showPreview(null);
		start();
	}

	function init() {
		PAD_DROPDOWN.enhance($('f-case'));

		['f-example', 'f-prefix', 'f-separator'].forEach(function (id) {
			$(id).addEventListener('input', updateNamePreview);
		});
		['f-config', 'f-example', 'f-separator'].forEach(function (id) {
			$(id).addEventListener('input', updateChecklist);
		});
		$('f-case').addEventListener('change', updateNamePreview);
		$('btn-example').addEventListener('click', exampleFromLayers);

		PAD_KEYS.shortcuts({
			save: function () {
				if (!$('bar').hidden) save();
			}
		});
		$('f-prefix').addEventListener('change', function () {
			this.value = cleanName(this.value.trim().toUpperCase());
			updateNamePreview();
		});
		$('f-example').addEventListener('change', function () {
			this.value = this.value.replace(/[\n\r]{3,}/g, '\n\n');
		});

		$('btn-capture').addEventListener('click', async function () {
			this.disabled = true;

			try {
				await capture(false);
			} catch (err) { }

			this.disabled = false;
		});
		$('btn-layers').addEventListener('click', addSelectedLayers);
		$('btn-test').addEventListener('click', testNow);
		$('btn-output').addEventListener('click', function () {
			state.outputs.push('');
			renderOutputs();

			var inputs = $('outputs').querySelectorAll('input');

			inputs[inputs.length - 1].focus();
		});
		$('btn-import-add').addEventListener('click', function () {
			showImportRow(true);
			$('f-import').focus();
		});
		$('remove-import').addEventListener('click', function () {
			$('f-import').value = '';
			showImportRow(false);
		});
		$('pick-import').addEventListener('click', function () {
			pickPathInto($('f-import'), 'Selecione a pasta de mídias');
		});
		animateDetails(document.querySelector('.maker-help'));
		$('btn-save').addEventListener('click', save);
		$('btn-reset').addEventListener('click', resetForm);
		$('btn-retry').addEventListener('click', start);
		PAD_UTIL.bindMenu($('app-menu'), DOCS_URL);

		// ao voltar para o painel: atualiza nomes dos layers e tenta de novo se não havia comp
		window.addEventListener('focus', function () {
			if (!state.comp) start();
			else refreshLayers();
		});

		renderLayers();
		renderOutputs();
		start();
	}

	init();
})();
