/*

---------------------------------------------------------------
> A FORMINHA — o preenchimento leve
---------------------------------------------------------------

Duplica a comp aberta e preenche os layers de texto selecionados, uma duplicata por versão do input (uma linha por
layer, linha vazia separa as versões: o mesmo input do preenchimento completo). Tudo na memória: nenhum template,
nenhum arquivo. Um passo só de desfazer do After.

O nome de cada duplicata:
  - o nome digitado na janela vale como está (por cima de tudo, até do layer de nome);
  - a comp com o layer 'script_template_name' (o último, de texto) leva o texto dele, como no preenchimento completo;
  - senão, o nome da comp de hoje com os trechos que são o texto de um layer selecionado trocados pelo texto novo
    (RDP - ANA MARIA → RDP - JOAO GOMES), na regra do renomear (configuração > renomear);
  - sem nenhum trecho assim: o nome da comp + o separador + a primeira linha.

Com menos linhas que layers, o layer sem linha fica escondido; com mais, as que sobram são ignoradas (a janela avisa).

*/

// a comp aberta (a ativa), ou null
function padLightComp() {
	var item = app.project.activeItem;

	if (item instanceof CompItem) return item;

	return null;
}

// os layers de texto selecionados, na ordem da comp (de cima para baixo), sem o layer de nome
function padLightLayers(comp) {
	var picked = comp.selectedLayers;
	var nameLayer = getTemplateNameLayer(comp);
	var out = [];

	for (var i = 0; i < picked.length; i++) {
		if (!(picked[i] instanceof TextLayer)) continue;
		if (nameLayer && picked[i].index == nameLayer.index) continue;

		out.push(picked[i]);
	}

	out.sort(function (a, b) {
		return a.index - b.index;
	});

	return out;
}

// o texto de um layer numa linha só (as quebras viram espaço)
function padLightText(layer) {
	return getTextLayerContent(layer).replace(/[\r\n\u0003]+/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
}

// O nome da comp em partes: [{ text }] fixas e [{ text, layer }] as que são o texto de um layer selecionado (layer:
// a posição dele na seleção). a comparação ignora a caixa e os acentos
function padLightParts(name, texts) {
	var norm = renameNormalize(name);
	var found = [];
	var i, j;

	// a comparação é posição a posição: se tirar os acentos mudou o tamanho do nome, não dá para localizar
	if (norm.length != name.length) return [{ text: name }];

	for (i = 0; i < texts.length; i++) {
		var key = renameNormalize(texts[i]);

		if (key.length != texts[i].length || key == '') continue;

		var from = 0;

		while (from <= norm.length) {
			var at = norm.indexOf(key, from);

			if (at < 0) break;

			var free = true;

			for (j = 0; j < found.length; j++) {
				if (at < found[j].end && at + key.length > found[j].start) free = false;
			}

			if (free) {
				found.push({ start: at, end: at + key.length, layer: i });
				break;
			}

			from = at + 1;
		}
	}

	if (!found.length) return [{ text: name }];

	found.sort(function (a, b) {
		return a.start - b.start;
	});

	var parts = [];
	var pos = 0;

	for (i = 0; i < found.length; i++) {
		if (found[i].start > pos) parts.push({ text: name.substring(pos, found[i].start) });

		parts.push({ text: name.substring(found[i].start, found[i].end), layer: found[i].layer });
		pos = found[i].end;
	}

	if (pos < name.length) parts.push({ text: name.substring(pos) });

	return parts;
}

// O nome de uma duplicata, pelas partes do nome da comp e as linhas da versão
function padLightName(parts, compName, lines) {
	var vars = 0;
	var out = '';
	var i;

	for (i = 0; i < parts.length; i++) {
		if (parts[i].layer == null) {
			out += parts[i].text;
			continue;
		}

		vars++;
		// o layer sem linha fica escondido: o trecho dele sai do nome
		if (parts[i].layer < lines.length) out += padRenameFormat(lines[parts[i].layer]);
	}

	// o nome não tem o texto de nenhum layer: o nome da comp + a primeira linha
	if (!vars) {
		if (!lines.length) return compName;

		return compName + globalSeparator + padRenameFormat(lines[0]);
	}

	return out.replace(/\s+/g, ' ').replace(/^[\s\-_]+|[\s\-_]+$/g, '');
}

// os nomes de comp que o projeto já tem, em maiúsculas → quantas vezes
function padLightTaken() {
	var taken = {};

	for (var i = 1; i <= app.project.numItems; i++) {
		var item = app.project.item(i);

		if (!(item instanceof CompItem)) continue;

		var key = String(item.name).toUpperCase();

		taken[key] = (taken[key] || 0) + 1;
	}

	return taken;
}

// as versões do input, conferidas: [[linha, linha], …] (só texto, sem linhas vazias)
function padLightVersions(list) {
	var out = [];

	if (!(list instanceof Array)) return out;

	for (var v = 0; v < list.length; v++) {
		var lines = [];
		var src = list[v] instanceof Array ? list[v] : [];

		for (var l = 0; l < src.length; l++) {
			var text = String(src[l] == null ? '' : src[l]).replace(/^\s+|\s+$/g, '');

			if (text != '') lines.push(text);
		}

		if (lines.length) out.push(lines);
	}

	return out;
}

// A comp aberta e a seleção.
// → { comp, id, layers: [{ index, name, text }], parts: [{ text, layer }], nameLayer, separator }
// comp: '' sem comp aberta
PADX.lightRead = function () {
	var comp = padLightComp();

	if (!comp) return { comp: '', id: 0, layers: [], parts: [], nameLayer: false, separator: globalSeparator };

	var layers = padLightLayers(comp);
	var list = [];
	var texts = [];

	for (var i = 0; i < layers.length; i++) {
		var text = padLightText(layers[i]);

		list.push({ index: layers[i].index, name: layers[i].name, text: text });
		texts.push(text);
	}

	return {
		comp: comp.name,
		id: comp.id,
		layers: list,
		parts: padLightParts(comp.name, texts),
		nameLayer: !!getTemplateNameLayer(comp),
		separator: globalSeparator
	};
};

// Os nomes que as duplicatas vão ter. a: { versions } → { names: [{ name, taken }], existing }
// name: '' quando o layer de nome decide (só dá para saber depois de preencher); taken: o nome já existia e
// ganhou o sufixo; existing: os nomes de comp do projeto (maiúsculas), para conferir os digitados na janela
PADX.lightPlan = function (a) {
	var comp = padLightComp();
	var versions = padLightVersions(a && a.versions);
	var names = [];
	var existing = [];
	var taken = padLightTaken();
	var key;

	for (key in taken) {
		if (taken.hasOwnProperty(key)) existing.push(key);
	}

	if (!comp) return { names: names, existing: existing };

	var layers = padLightLayers(comp);
	var texts = [];
	var i;

	for (i = 0; i < layers.length; i++) texts.push(padLightText(layers[i]));

	var parts = padLightParts(comp.name, texts);
	var byLayer = !!getTemplateNameLayer(comp);

	for (i = 0; i < versions.length; i++) {
		if (byLayer) {
			names.push({ name: '', taken: false });
			continue;
		}

		var name = padLightName(parts, comp.name, versions[i]);
		var upper = name.toUpperCase();
		var was = !!taken[upper];

		if (was) {
			taken[upper]++;
			name += '_' + taken[upper];
		} else {
			taken[upper] = 1;
		}

		names.push({ name: name, taken: was });
	}

	return { names: names, existing: existing };
};

// Duplica e preenche. a: { id, layers: [índices], versions, names: [o nome digitado ou ''] }
// → { count, names, errors: [{ name, error }] }
PADX.lightFill = function (a) {
	var comp = padLightComp();

	if (!comp) throw new Error('#PAD_115 - a forminha: abra a comp que vai ser duplicada.');
	if (a.id && comp.id != a.id) throw new Error('#PAD_116 - a forminha: a comp aberta mudou. leia de novo a seleção.');

	var versions = padLightVersions(a.versions);
	var wanted = a.layers instanceof Array ? a.layers : [];
	var custom = a.names instanceof Array ? a.names : [];
	var texts = [];
	var i;

	if (!wanted.length) throw new Error('#PAD_115 - a forminha: selecione os layers de texto que mudam.');
	if (!versions.length) throw new Error('#PAD_115 - a forminha: digite o texto das versões.');

	for (i = 0; i < wanted.length; i++) {
		var src = wanted[i] >= 1 && wanted[i] <= comp.numLayers ? comp.layer(wanted[i]) : null;

		if (!(src instanceof TextLayer)) throw new Error('#PAD_116 - a forminha: os layers da comp mudaram. leia de novo a seleção.');

		texts.push(padLightText(src));
	}

	var parts = padLightParts(comp.name, texts);
	var taken = padLightTaken();
	var created = [];
	var errors = [];

	padGroup('A FORMINHA: duplicar e preencher', function () {
		for (var v = 0; v < versions.length; v++) {
			var lines = versions[v];
			var copy = comp.duplicate();

			for (var l = 0; l < wanted.length; l++) {
				var layer = copy.layer(wanted[l]);

				// menos linhas que layers: o layer sem linha fica escondido
				if (l >= lines.length) {
					layer.enabled = false;
					continue;
				}

				try {
					var prop = layer.property('ADBE Text Properties').property('ADBE Text Document');
					var doc = prop.value;

					doc.text = lines[l];
					if (prop.numKeys > 0) prop.setValueAtKey(1, doc);
					else prop.setValue(doc);
				} catch (err) {
					errors.push({ name: layer.name, error: err.message });
				}
			}

			// o nome: o digitado na janela (absoluto), o do layer de nome ou o da regra
			var typed = String(custom[v] == null ? '' : custom[v]).replace(/^\s+|\s+$/g, '');

			if (typed != '') {
				copy.name = typed;
			} else if (!overwriteCompName(copy)) {
				var name = padLightName(parts, comp.name, lines);
				var upper = name.toUpperCase();

				if (taken[upper]) {
					taken[upper]++;
					name += '_' + taken[upper];
				} else {
					taken[upper] = 1;
				}

				copy.name = name;
			}

			created.push(copy.name);
		}
	});

	return { count: created.length, names: created, errors: errors };
};
