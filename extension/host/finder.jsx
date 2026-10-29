/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> O ACESSORISTA — busca de caminhos e de textos (host)
---------------------------------------------------------------

Caminhos: o índice (webhook + cache local) e a abertura de pastas usam a mesma lógica do script
ScriptUI (lib/acessorista.shared.js). Textos: o painel pede os layers de texto em lotes de comps.

*/

// Pedido de aba feito pela barra principal (o painel do acessorista acompanha o arquivo).
PADX.requestTab = function (a) {
	saveTextFile(JSON.stringify({ tab: a.tab, stamp: new Date().getTime() }), scriptPreferencesPath + '/finder_tab.json');

	return { tab: a.tab };
};

PADX.requestedTab = function () {
	var file = new File(scriptPreferencesPath + '/finder_tab.json');

	if (!file.exists) return { tab: null, stamp: 0 };

	try {
		var data = JSON.parse(readFileContent(file));

		return { tab: data.tab || null, stamp: data.stamp || 0, now: new Date().getTime() };
	} catch (err) {
		return { tab: null, stamp: 0 };
	}
};

/*

---------------------------------------------------------------
> caminhos
---------------------------------------------------------------

*/

// Índice de atrações já preparado para a plataforma atual. 'force' baixa de novo (lupa).
// a: { force }  →  { index, downloaded, platform }
PADX.pathsIndex = function (a) {
	var cacheFile = new File(tempFolder.fsName + '/path_index.json');
	var downloaded = true;

	if (a.force || !psIsFresh(cacheFile)) downloaded = psDownloadIndex(cacheFile);

	try {
		return { index: psBuildIndex(psReadJSON(cacheFile)), downloaded: downloaded, platform: appOs };
	} catch (err) {
		throw new Error('não foi possível carregar o índice. verifique a conexão e o workflow.');
	}
};

// Abre a pasta de um caminho (no macOS, monta o volume SMB se for preciso).
// a: { path, server, share }
PADX.openPath = function (a) {
	return padCollect(function () {
		psOpenFolder(a.path, a.server || '', a.share || '');
	});
};

/*

---------------------------------------------------------------
> textos dos layers
---------------------------------------------------------------

*/

// Comps do projeto: o painel lê os textos em lotes para mostrar o andamento.
PADX.textCompList = function () {
	var comps = getComps();
	var list = [];

	for (var i = 0; i < comps.length; i++) {
		list.push({ id: comps[i].id, name: comps[i].name });
	}

	return { comps: list };
};

function padTextEntry(comp, layer, label, textDoc, refTime) {
	var text = String(textDoc.text).trim();

	if (textDoc.allCaps) text = text.toUpperCase(); // o texto aparece em caixa alta na comp

	return {
		compId: comp.id,
		compName: comp.name,
		layerIndex: layer.index,
		label: label,
		text: text,
		enabled: layer.enabled,
		refTime: refTime
	};
}

// Textos dos layers de texto das comps 'ids'. Layers com keyframes de texto geram uma entrada por
// keyframe; os valores são lidos com valueAtTime (sem mover a agulha das comps).
PADX.textIndexChunk = function (a) {
	var entries = [];
	var errors = [];

	for (var n = 0; n < a.ids.length; n++) {
		var comp = app.project.itemByID(a.ids[n]);

		if (!(comp instanceof CompItem)) continue;

		try {
			for (var l = 1; l <= comp.numLayers; l++) {
				var txtLayer = comp.layer(l);

				if (!(txtLayer instanceof TextLayer)) continue;

				var doc = txtLayer.property('ADBE Text Properties').property('ADBE Text Document');
				var label = '#' + txtLayer.index + '  ' + limitNameSize(txtLayer.name, 35);

				if (doc.numKeys > 0) {
					for (var k = 1; k <= doc.numKeys; k++) {
						var keyTime = doc.keyTime(k);

						entries.push(padTextEntry(comp, txtLayer, label, doc.valueAtTime(keyTime, false), keyTime));
					}
				} else if (doc.expression != '') {
					// texto vindo de expressão: lê no meio do layer
					var refTime = comp.duration < 1 ? 0 : txtLayer.inPoint + (txtLayer.outPoint - txtLayer.inPoint) / 2;

					if (refTime > comp.duration) refTime = comp.duration - comp.frameDuration;

					entries.push(padTextEntry(comp, txtLayer, label, doc.valueAtTime(refTime, false), refTime));
				} else {
					entries.push(padTextEntry(comp, txtLayer, label, doc.value, comp.time));
				}
			}
		} catch (err) {
			errors.push('#FND_019 - comp: ' + comp.name + ' · ' + err.message);
		}
	}

	return { entries: entries, errors: errors };
};

// Abre a comp e, se houver layer, seleciona o layer no tempo em que o texto aparece.
// a: { compId, layerIndex, refTime }
PADX.openTextResult = function (a) {
	var comp = app.project.itemByID(a.compId);

	try {
		if (!(comp instanceof CompItem)) throw new Error('comp não encontrada');

		var t = comp.time;

		if (a.layerIndex) {
			var txtLayer = comp.layer(a.layerIndex);

			for (var l = 1; l <= comp.numLayers; l++) {
				comp.layer(l).selected = false;
			}

			t = a.refTime;
			comp.hideShyLayers = !txtLayer.shy;
			txtLayer.selected = true;
		}

		comp.openInViewer();
		comp.time = t;
	} catch (err) {
		throw new Error('#FND_020 - o item não existe mais. atualize a busca.');
	}

	return { ok: true };
};
