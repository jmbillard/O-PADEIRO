/*

---------------------------------------------------------------
> editor de config do template (_config.json)
---------------------------------------------------------------

Formulário que ocupa a área de trabalho no lugar do preview. Os campos são os do
'_config.json' (ver README, "criando um novo template"); chaves desconhecidas do arquivo
são preservadas ao salvar.

  PAD_CONFIG_EDITOR.mount(container, { info, pickFolder, normalizePath, onSave, onCancel })
    → { isDirty(), destroy() }

*/

(function () {
	'use strict';

	var CASES = [
		['upperCase', 'CAIXA ALTA'],
		['lowerCase', 'caixa baixa'],
		['titleCase', 'Título'],
		['freeCase', 'livre']
	];

	var METHODS = [
		['textContent', 'conteúdo do texto'],
		['layerName', 'nome do layer']
	];

	var GLOBAL_SEPARATOR = ' - '; // mesmo separador do nome final das comps (host)

	/* =========================================================
	   Utilidades
	   ========================================================= */

	function el(tag, className, text) {
		var node = document.createElement(tag);

		if (className) node.className = className;
		if (text != null) node.textContent = text;

		return node;
	}

	function svg(paths, className) {
		var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

		node.setAttribute('viewBox', '0 0 24 24');
		if (className) node.setAttribute('class', className);

		paths.forEach(function (d) {
			var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

			path.setAttribute('d', d);
			node.appendChild(path);
		});

		return node;
	}

	var ICONS = {
		up: ['m6 14 6-6 6 6'],
		down: ['m6 10 6 6 6-6'],
		remove: ['M6 6l12 12M18 6 6 18'],
		plus: ['M12 5v14M5 12h14'],
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

	function textButton(label, className, onClick) {
		var btn = el('button', 'button ' + className, label);

		btn.type = 'button';
		btn.addEventListener('click', onClick);

		return btn;
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

	/* =========================================================
	   Editor
	   ========================================================= */

	function mount(container, opts) {
		var info = opts.info;
		var base = JSON.parse(JSON.stringify(info.config || info.defaults));
		var isNew = !info.hasConfig;

		// valores iniciais de um template sem config
		if (isNew) {
			base.configName = info.name;
		}

		var layers = (base.inputLayers || []).map(function (l) {
			return { layerIndex: l.layerIndex, method: l.method };
		});
		var outputs = (base.outputPath && base.outputPath.length ? base.outputPath : info.defaults.outputPath).slice();
		var fx = base.inputFx ? JSON.parse(JSON.stringify(base.inputFx)) : null;

		var fields = {}; // controles de texto por chave
		var initial = '';
		var cancelTimer = null;
		var saving = false;

		container.textContent = '';

		/* ---------- estrutura ---------- */

		var form = el('div', 'cfg-form');
		var alertBox = el('div', 'cfg-alert');

		form.appendChild(alertBox);

		function card(title, hint) {
			var box = el('section', 'cfg-card');
			var head = el('div', 'cfg-card-head');

			head.appendChild(el('h3', 'cfg-title', title));
			if (hint) head.appendChild(el('p', 'cfg-hint', hint));

			box.appendChild(head);
			form.appendChild(box);

			return box;
		}

		function field(parent, key, label, control, hint) {
			var wrap = el('div', 'cfg-field');
			var lab = el('label', 'cfg-label', label);

			control.id = 'cfg-' + key;
			lab.htmlFor = control.id;
			wrap.appendChild(lab);
			wrap.appendChild(control);
			if (hint) wrap.appendChild(el('p', 'cfg-hint', hint));

			fields[key] = { wrap: wrap, control: control };
			control.addEventListener('input', changed);
			control.addEventListener('change', changed);
			parent.appendChild(wrap);

			return wrap;
		}

		function input(value, type) {
			var node = el('input', 'cfg-input');

			node.type = type || 'text';
			node.value = value == null ? '' : value;
			node.spellcheck = false;
			node.autocomplete = 'off';

			return node;
		}

		function select(options, value) {
			var wrap = el('span', 'select select-large');
			var node = el('select');

			options.forEach(function (o) {
				var option = el('option', null, o[1]);

				option.value = o[0];
				node.appendChild(option);
			});

			node.value = value;
			wrap.appendChild(node);
			wrap.control = node;
			PAD_DROPDOWN.enhance(node);

			return wrap;
		}

		function area(value, rows) {
			var node = el('textarea', 'cfg-input cfg-textarea');

			node.value = value == null ? '' : value;
			node.rows = rows || 4;
			node.spellcheck = false;

			return node;
		}

		/* ---------- 1. identificação ---------- */

		var idCard = card('Identificação', isNew ? 'esse template ainda não tem config: salve para criar o arquivo.' : null);
		var idGrid = el('div', 'cfg-grid');

		idCard.appendChild(idGrid);
		field(idGrid, 'configName', 'Nome da configuração', input(base.configName), 'identifica o template no log.');
		field(idGrid, 'compName', 'Nome da comp principal', input(base.compName), 'a comp do projeto (comentário TEMPLATE) que será duplicada.');

		/* ---------- 2. nome final e texto ---------- */

		var nameCard = card('Nome e texto');
		var nameGrid = el('div', 'cfg-grid');

		nameCard.appendChild(nameGrid);
		field(nameGrid, 'prefix', 'Prefixo', input(base.prefix), 'início do nome de todas as comps criadas (opcional). "ignore" não preenche, só importa o template.');
		field(nameGrid, 'refTime', 'Tempo de referência (s)', input(base.refTime, 'number'), 'momento em que todas as informações estão visíveis.');

		var caseSel = select(CASES, base.textCase);

		field(nameGrid, 'textCase', 'Caixa de texto', caseSel);
		fields.textCase.control = caseSel.control;
		caseSel.removeAttribute('id');
		caseSel.control.id = 'cfg-textCase';

		field(nameGrid, 'separator', 'Separador de informações', input(normalizeBreaks(base.separator).replace(/\n/g, '\\n')), 'use \\n para uma informação por linha. com 1 layer só, o texto inteiro vai para ele.');

		var namePreview = el('p', 'cfg-preview');

		nameCard.appendChild(namePreview);

		/* ---------- 3. exemplo e dicas ---------- */

		var textCard = card('Exemplo e dicas');
		var textGrid = el('div', 'cfg-grid');

		textCard.appendChild(textGrid);
		field(textGrid, 'exemple', 'Exemplo de preenchimento', area(normalizeBreaks(base.exemple), 5), 'linha vazia separa as versões do template.');
		field(textGrid, 'tip', 'Dicas', area(normalizeBreaks(base.tip), 5), 'cada linha vira um item da lista de dicas.');

		/* ---------- 4. layers ---------- */

		var layersCard = card('Layers editáveis', 'a 1ª informação do input vai para o 1º layer da lista, a 2ª para o 2º, e assim por diante.');
		var layersList = el('div', 'cfg-rows');

		layersCard.appendChild(layersList);

		function renderLayers() {
			layersList.textContent = '';

			if (layers.length === 0) {
				layersList.appendChild(el('p', 'cfg-empty', 'nenhum layer editável: o template será duplicado sem preencher nada.'));
			}

			layers.forEach(function (layer, i) {
				var row = el('div', 'cfg-row');
				var num = input(layer.layerIndex, 'number');
				var methodSel = select(METHODS, layer.method);

				num.min = '1';
				num.step = '1';
				num.title = 'índice do layer na comp principal';
				num.className += ' cfg-num';
				num.addEventListener('input', function () {
					layer.layerIndex = parseInt(num.value, 10);
					changed();
				});

				methodSel.control.addEventListener('change', function () {
					layer.method = methodSel.control.value;
					changed();
				});

				row.appendChild(el('span', 'cfg-row-label', 'informação ' + (i + 1)));
				row.appendChild(el('span', 'cfg-row-prefix', 'layer'));
				row.appendChild(num);
				row.appendChild(methodSel);

				var actions = el('span', 'cfg-row-actions');
				var up = miniButton('up', 'subir', function () {
					layers.splice(i - 1, 0, layers.splice(i, 1)[0]);
					renderLayers();
					changed();
				});
				var down = miniButton('down', 'descer', function () {
					layers.splice(i + 1, 0, layers.splice(i, 1)[0]);
					renderLayers();
					changed();
				});

				up.disabled = i === 0;
				down.disabled = i === layers.length - 1;

				actions.appendChild(up);
				actions.appendChild(down);
				actions.appendChild(
					miniButton('remove', 'remover layer', function () {
						layers.splice(i, 1);
						renderLayers();
						changed();
					})
				);
				row.appendChild(actions);
				layersList.appendChild(row);
			});

			updatePreview();
		}

		layersCard.appendChild(
			textButton('+ adicionar layer', 'button-secondary button-compact', function () {
				var last = layers.length ? layers[layers.length - 1].layerIndex : 0;

				layers.push({ layerIndex: (last || 0) + 1, method: 'textContent' });
				renderLayers();
				changed();
			})
		);

		/* ---------- 5. variações (inputFx) ---------- */

		var fxCard = card('Variações de layout', 'opcional: um efeito controlador na comp principal gera uma versão do template para cada sufixo.');
		var fxToggleWrap = el('label', 'cfg-switch');
		var fxToggle = el('input');

		fxToggle.type = 'checkbox';
		fxToggle.checked = !!fx;
		fxToggleWrap.appendChild(fxToggle);
		fxToggleWrap.appendChild(el('span', 'cfg-switch-track'));
		fxToggleWrap.appendChild(el('span', 'cfg-switch-label', 'usar variações'));
		fxCard.appendChild(fxToggleWrap);

		var fxBody = el('div', 'cfg-grid');

		fxCard.appendChild(fxBody);
		field(fxBody, 'fxLayerIndex', 'Layer do efeito', input(fx ? fx.layerIndex : 1, 'number'), 'índice do layer que tem o efeito.');
		field(fxBody, 'fxName', 'Nome do efeito', input(fx ? fx.fxName : ''), 'nome exato do efeito no layer.');
		field(fxBody, 'fxOptionIndex', 'Índice da opção', input(fx ? fx.optionIndex : 1, 'number'), 'posição do controle de lista dentro do efeito.');
		field(fxBody, 'fxOptions', 'Sufixos', input(fx ? fx.options.join(', ') : ''), 'separados por vírgula, na ordem das opções. ex: E, D');

		function syncFx() {
			fxBody.hidden = !fxToggle.checked;
		}

		fxToggle.addEventListener('change', function () {
			syncFx();
			changed();
		});

		/* ---------- 6. pastas ---------- */

		var pathCard = card('Pastas');
		var importRow = el('div', 'cfg-field');
		var importLine = el('div', 'cfg-path');
		var importInput = input(base.importPath);

		importInput.id = 'cfg-importPath';
		importInput.addEventListener('input', changed);
		fields.importPath = { wrap: importRow, control: importInput };
		importRow.appendChild(Object.assign(el('label', 'cfg-label', 'Pasta de importação'), { htmlFor: 'cfg-importPath' }));
		importLine.appendChild(importInput);
		importLine.appendChild(pickButton(importInput));
		importRow.appendChild(importLine);
		importRow.appendChild(el('p', 'cfg-hint', 'pasta padrão para importar novos footages no projeto.'));
		pathCard.appendChild(importRow);

		var outputsWrap = el('div', 'cfg-field');
		var outputsList = el('div', 'cfg-rows');

		outputsWrap.appendChild(el('span', 'cfg-label', 'Pastas de output'));
		outputsWrap.appendChild(outputsList);
		outputsWrap.appendChild(el('p', 'cfg-hint', 'cada pasta gera um módulo de saída na fila de render.'));
		pathCard.appendChild(outputsWrap);

		function pickButton(target) {
			var btn = miniButton('folder', 'escolher pasta', async function () {
				var picked = opts.pickFolder('Escolher pasta', target.value);

				if (!picked) return;

				try {
					target.value = (await opts.normalizePath(picked)) || picked;
				} catch (err) {
					target.value = picked;
				}

				changed();
			});

			return btn;
		}

		function renderOutputs() {
			outputsList.textContent = '';

			outputs.forEach(function (path, i) {
				var line = el('div', 'cfg-path');
				var node = input(path);

				node.setAttribute('aria-label', 'pasta de output ' + (i + 1));
				node.addEventListener('input', function () {
					outputs[i] = node.value;
					changed();
				});

				var pick = miniButton('folder', 'escolher pasta', async function () {
					var picked = opts.pickFolder('Escolher pasta de output', node.value);

					if (!picked) return;

					try {
						node.value = (await opts.normalizePath(picked)) || picked;
					} catch (err) {
						node.value = picked;
					}

					outputs[i] = node.value;
					changed();
				});
				var remove = miniButton('remove', 'remover output', function () {
					outputs.splice(i, 1);
					renderOutputs();
					changed();
				});

				remove.disabled = outputs.length === 1;
				line.appendChild(node);
				line.appendChild(pick);
				line.appendChild(remove);
				outputsList.appendChild(line);
			});
		}

		pathCard.appendChild(
			textButton('+ adicionar output', 'button-secondary button-compact', function () {
				outputs.push('');
				renderOutputs();
				changed();

				var inputs = outputsList.querySelectorAll('input');

				inputs[inputs.length - 1].focus();
			})
		);

		/* ---------- barra de ações ---------- */

		var bar = el('div', 'action-bar is-anchored');
		var cancelBtn = textButton('Cancelar', 'button-secondary', onCancelClick);
		var saveBtn = textButton(isNew ? 'Criar config' : 'Salvar config', 'button-primary', onSaveClick);

		bar.appendChild(cancelBtn);
		bar.appendChild(saveBtn);

		container.appendChild(form);
		container.appendChild(bar);

		/* ---------- leitura e validação ---------- */

		function text(key) {
			return fields[key].control.value;
		}

		function readForm() {
			var cfg = JSON.parse(JSON.stringify(base)); // chaves desconhecidas continuam no arquivo

			cfg.configName = text('configName').trim();
			cfg.compName = text('compName').trim();
			cfg.prefix = text('prefix').trim();
			cfg.refTime = parseFloat(String(text('refTime')).replace(',', '.'));
			cfg.textCase = text('textCase');
			cfg.separator = text('separator').replace(/\\n|\\r/g, '\n');
			cfg.exemple = text('exemple');
			cfg.tip = text('tip');
			cfg.importPath = importInput.value.trim();
			cfg.outputPath = outputs.map(function (p) {
				return p.trim();
			});
			cfg.inputLayers = layers.map(function (l) {
				return { layerIndex: l.layerIndex, method: l.method };
			});

			if (fxToggle.checked) {
				cfg.inputFx = {
					layerIndex: parseInt(text('fxLayerIndex'), 10),
					fxName: text('fxName').trim(),
					optionIndex: parseInt(text('fxOptionIndex'), 10),
					options: text('fxOptions')
						.split(',')
						.map(function (o) {
							return o.trim();
						})
						.filter(Boolean)
				};
			} else {
				delete cfg.inputFx;
			}

			return cfg;
		}

		function validate(cfg) {
			var errors = [];

			function bad(key, msg) {
				errors.push({ key: key, msg: msg });
			}

			if (cfg.configName === '') bad('configName', 'preencha o nome da configuração.');
			if (cfg.compName === '') bad('compName', 'preencha o nome da comp principal.');
			if (isNaN(cfg.refTime) || cfg.refTime < 0) bad('refTime', 'o tempo de referência precisa ser um número maior ou igual a 0.');

			cfg.inputLayers.forEach(function (l, i) {
				if (!(l.layerIndex >= 1)) bad(null, 'informação ' + (i + 1) + ': o índice do layer precisa ser um número maior que 0.');
			});

			if (cfg.outputPath.some(function (p) { return p === ''; })) bad(null, 'há uma pasta de output vazia.');
			if (cfg.importPath === '') bad('importPath', 'informe a pasta de importação.');

			if (cfg.inputFx) {
				if (!(cfg.inputFx.layerIndex >= 1)) bad('fxLayerIndex', 'variações: índice de layer inválido.');
				if (cfg.inputFx.fxName === '') bad('fxName', 'variações: informe o nome do efeito.');
				if (!(cfg.inputFx.optionIndex >= 1)) bad('fxOptionIndex', 'variações: índice da opção inválido.');
				if (cfg.inputFx.options.length === 0) bad('fxOptions', 'variações: informe ao menos um sufixo.');
			}

			return errors;
		}

		function showErrors(errors, message) {
			alertBox.textContent = '';

			Object.keys(fields).forEach(function (key) {
				fields[key].wrap.classList.remove('has-error');
			});

			if (!errors.length && !message) return;

			var box = el('div', 'notice is-error');
			var body = el('div', 'notice-body');

			(errors.length ? errors.map(function (e) { return e.msg; }) : [message]).forEach(function (msg) {
				body.appendChild(el('div', null, msg));
			});

			box.appendChild(body);
			alertBox.appendChild(box);

			errors.forEach(function (e) {
				if (e.key && fields[e.key]) fields[e.key].wrap.classList.add('has-error');
			});

			var first = errors.filter(function (e) { return e.key && fields[e.key]; })[0];

			if (first) fields[first.key].control.focus();
			else alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}

		/* ---------- nome final (prévia) ---------- */

		function updatePreview() {
			var sample = normalizeBreaks(text('exemple')).split(/\n{2,}/)[0];
			var sep = text('separator').replace(/\\n|\\r/g, '\n');
			var parts = [sample];

			if (sep !== '' && layers.length > 1) {
				try {
					var pattern = sep === '\n' ? /[\n\r]/i : new RegExp(sep.replace(/\s/g, '\\s'), 'i');

					parts = sample.split(pattern);
				} catch (err) { }
			}

			var info = parts.join(' ').replace(/[\s-]+/g, ' ');
			var kind = text('textCase');

			if (kind === 'upperCase') info = info.toUpperCase();
			if (kind === 'lowerCase') info = info.toLowerCase();

			var prefix = text('prefix').trim();
			var name = cleanName(((prefix ? prefix + GLOBAL_SEPARATOR : '') + info).toUpperCase());

			namePreview.textContent = '';
			namePreview.appendChild(el('span', 'cfg-preview-label', 'nome final da comp com o exemplo'));
			namePreview.appendChild(el('strong', null, name));
		}

		function changed() {
			updatePreview();

			if (alertBox.firstChild) showErrors([], null);
		}

		/* ---------- ações ---------- */

		function isDirty() {
			return JSON.stringify(readForm()) !== initial;
		}

		function onCancelClick() {
			if (saving) return;

			if (isDirty() && !cancelTimer) {
				cancelBtn.textContent = 'Descartar alterações?';
				cancelTimer = setTimeout(function () {
					cancelBtn.textContent = 'Cancelar';
					cancelTimer = null;
				}, 3500);

				return;
			}

			opts.onCancel();
		}

		async function onSaveClick() {
			if (saving) return;

			var cfg = readForm();
			var errors = validate(cfg);

			if (errors.length) return showErrors(errors, null);

			saving = true;
			saveBtn.disabled = cancelBtn.disabled = true;
			saveBtn.textContent = 'Salvando…';

			try {
				await opts.onSave(cfg);
			} catch (err) {
				saving = false;
				saveBtn.disabled = cancelBtn.disabled = false;
				saveBtn.textContent = isNew ? 'Criar config' : 'Salvar config';
				showErrors([], err.message);
			}
		}

		syncFx();
		renderLayers();
		renderOutputs();
		updatePreview();
		initial = JSON.stringify(readForm());

		return {
			isDirty: isDirty,
			destroy: function () {
				clearTimeout(cancelTimer);
				container.textContent = '';
			}
		};
	}

	window.PAD_CONFIG_EDITOR = { mount: mount };
})();
