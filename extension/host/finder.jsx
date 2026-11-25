/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> O ACESSORISTA — busca de caminhos e de textos (host)
---------------------------------------------------------------

Caminhos: o painel baixa o índice da busca sozinho; aqui, o que ele pede ao host (os endereços, a cópia, o curl do
plano B). A abertura de pastas e a conversão de caminhos ficam em lib/acessorista.js. Textos: o painel pede os layers
de texto em lotes de comps.

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

// O que o painel precisa para baixar o índice sozinho. local: o modo local (só a cópia, sem a rede). copia: a cópia
// do índice (onde o painel grava); copiasAntigas: as dos nomes de antes (regras/configuracao.js: COPIA_DA_BUSCA), lidas
// enquanto não há a de agora.
// → { url, films, copia, copiasAntigas, local, platform, caminhosFixos, mode, folders, foldersOnly, daily, localIndex }
PADX.searchInfo = function () {
	var list = PS_CAMINHOS_FIXOS || PAD_CONFIGURACAO.padrao('buscaDeCaminhos').caminhosFixos;
	var caminhosFixos = [];

	// o servidor e o share saem do caminho de rede (//servidor/share/...); no Mac (/Volumes/SHARE/...), o share
	// (sem o -1 a -5 de um volume montado de novo) e o servidor pelo mapa de drives, na hora de abrir
	for (var i = 0; i < list.length; i++) {
		var path = psSlashes(list[i].path);
		var unc = path.match(/^\/\/([^\/]+)\/([^\/]+)/);
		var vol = path.match(/^\/Volumes\/([^\/]+)/i);

		var share = '';

		// if/else: o ExtendScript agrupa o ternário encadeado do jeito errado
		if (unc) share = unc[2];
		else if (vol) share = vol[1].replace(/-[1-5]$/, '');

		caminhosFixos.push({ name: list[i].name, path: path, server: unc ? unc[1] : '', share: share });
	}

	// o índice local (configuração > buscar, neste computador): as pastas deste computador, lidas pelo painel
	var search = padLerSecao('indiceLocal');

	return {
		url: PS_INDEX_URL,
		films: PS_FILMS_URL,
		copia: psCopyFile().fsName,
		copiasAntigas: psOldCopyPaths(),
		local: padLocalMode(),
		platform: appOs,
		caminhosFixos: caminhosFixos,
		mode: search.mode,
		folders: search.folders,
		foldersOnly: search.foldersOnly,
		daily: search.daily,
		localIndex: scriptPreferencesPath + '/indice_local.json'
	};
};

// Modo local, sem o Node do painel: a cópia do índice salva neste computador, sem tocar na rede.
// →  { text, modified } (text vazio: não há cópia; modified em ms)
PADX.searchCopy = function () {
	var copy = psCopyToRead();

	if (!copy.exists) return { text: '', modified: 0 };

	return { text: readFileContent(copy), modified: copy.modified.getTime() };
};

// Plano B: baixa o índice da busca pelo curl (quando o painel não conseguir sozinho) e devolve o texto.
// a: { force }  →  { text, downloaded }
PADX.searchDownload = function (a) {
	var copy = psCopyFile();
	var part = new File(copy.fsName + '.part');
	var downloaded = false;

	if (!padLocalMode()) {
		if (part.exists) part.remove();

		var cmd = appOs == 'Win'
			? 'cmd.exe /c curl.exe -s -L --compressed --connect-timeout 5 --max-time 25 -o "' + part.fsName.replace(/"/g, '') + '" "' + PS_INDEX_URL + '"'
			: 'curl -s -L --compressed --connect-timeout 5 --max-time 25 -o ' + psShellQuote(part.fsName) + ' ' + psShellQuote(PS_INDEX_URL);

		try {
			system.callSystem(cmd);
		} catch (err) { }

		if (part.exists && part.length > 0) {
			var text = readFileContent(part);

			// o "v": 2 é um campo do JSON da equipe (o índice montado no n8n), não um nome do padeiro
			if (/^\s*\{\s*"v"\s*:\s*2/.test(text)) {
				if (copy.exists) copy.remove();
				part.rename(copy.name);
				downloaded = true;
			} else {
				part.remove();
			}
		}
	}

	var read = psCopyToRead();

	if (!read.exists) throw new Error('#PAD_058 - não foi possível carregar o índice. verifique a conexão e o workflow.');

	return { text: readFileContent(read), downloaded: downloaded };
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
			errors.push('#PAD_069 - comp: ' + comp.name + ' · ' + err.message);
		}
	}

	return { entries: entries, errors: errors };
};

// Abre a comp e, se houver layer, seleciona o layer no tempo em que o texto aparece.
// a: { compId, layerIndex, refTime }
PADX.openTextResult = function (a) {
	var comp = app.project.itemByID(a.compId);

	try {
		if (!(comp instanceof CompItem)) throw new Error('#PAD_059 - comp não encontrada');

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
		throw new Error('#PAD_060 - o item não existe mais. atualize a busca.');
	}

	return { ok: true };
};

/*

---------------------------------------------------------------
> conversor de caminhos Windows / macOS
---------------------------------------------------------------

Conversão em lib/acessorista.js (cleanPathInput / toMacPath / toWinPath).

*/

// Pedido de abertura feito pela barra principal ('pastas', clique direito): o painel do conversor
// começa com a pasta do último output da fila de render.
PADX.requestConverter = function () {
	var request = { stamp: new Date().getTime(), path: '' };

	try {
		var outputFile = getLastOutputFile();

		if (outputFile != null) request.path = decodeURI(outputFile.parent.fsName);
	} catch (err) { }

	saveTextFile(JSON.stringify(request), scriptPreferencesPath + '/converter_request.json');

	return { path: request.path };
};

PADX.requestedConverter = function () {
	var file = new File(scriptPreferencesPath + '/converter_request.json');

	if (!file.exists) return { stamp: 0, path: '' };

	try {
		var data = JSON.parse(readFileContent(file));

		return { stamp: data.stamp || 0, path: data.path || '', now: new Date().getTime() };
	} catch (err) {
		return { stamp: 0, path: '' };
	}
};

// Converte o texto colado em um dos formatos e devolve os dois. a: { text, from: 'mac' | 'win' }
PADX.convertPaths = function (a) {
	var mac;
	var win;

	if (a.from == 'mac') {
		mac = a.text;
		win = toWinPath(mac);
	} else {
		win = a.text;
		mac = toMacPath(win);
	}

	return { mac: mac, win: win, os: appOs };
};

// Abre a pasta do caminho (ou a mais próxima que existe) no Finder / Explorer. a: { text }
// O texto é o do campo do sistema atual.
PADX.openConvertedPath = function (a) {
	var fldPath = appOs == 'Mac' ? toMacPath(a.text) : toWinPath(a.text);

	if (fldPath == '') throw new Error('#PAD_061 - informe um caminho.');

	var folder = nearestExistingFolder(fldPath);

	if (folder == null) throw new Error('#PAD_062 - pasta não encontrada (o volume / servidor está acessível?)');

	var exact = decodeURI(folder.fsName) == decodeURI(new Folder(fldPath).fsName);

	openFolder(folder.fsName);

	return { exact: exact, path: folder.fsName };
};

// Copia um texto para a área de transferência do sistema (quando o painel não consegue).
PADX.copyText = function (a) {
	copyToClipboard(a.text);

	return { ok: true };
};
