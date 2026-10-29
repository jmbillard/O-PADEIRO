/* eslint-disable no-redeclare */
/* eslint-disable no-undef */
/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🌳 tree view functions
---------------------------------------------------------------

*/

// Lê a pasta uma única vez e monta a árvore em memória: { type, text, children | file }.
// Mesma limpeza do treeview (sem pastas vazias) e mesma otimização (pasta com uma única subpasta
// vira 'PASTA / SUBPASTA'), para que a busca possa filtrar sem acessar a rede de novo.
function buildTreeData(folder, fileTypes) {
	var root = { type: 'node', text: folder.displayName, children: readTreeData(folder.getFiles(), fileTypes) };

	for (var i = 0; i < root.children.length; i++) {
		optimizeTreeData(root.children[i]);
	}

	return root;
}

function readTreeData(array, fileTypes) {
	var children = [];

	for (var n = 0; n < array.length; n++) {
		var nodeName = array[n].displayName;

		if (array[n] instanceof Folder) {
			var subChildren = readTreeData(array[n].getFiles(), fileTypes);

			// pastas sem templates não entram na árvore
			if (subChildren.length > 0) children.push({ type: 'node', text: nodeName, children: subChildren });
		} else {
			try {
				if (fileTypes.indexOf(getFileExt(nodeName)) >= 0) children.push({ type: 'item', text: nodeName, file: array[n] });
			} catch (err) { }
		}
	}

	return children;
}

function optimizeTreeData(node) {
	if (node.type != 'node') return;

	while (node.children.length == 1 && node.children[0].type == 'node') {
		node.text += ' / ' + node.children[0].text;
		node.children = node.children[0].children;
	}

	for (var i = 0; i < node.children.length; i++) {
		optimizeTreeData(node.children[i]);
	}
}

// Texto normalizado para comparação (maiúsculas, sem acentos).
function treeSearchText(str) {
	return String(str).trim().toUpperCase().replaceSpecialCharacters();
}

// Retorna uma cópia de 'node' só com o que casa com 'query' (já normalizada por treeSearchText).
// Pasta que casa entra inteira; pasta que não casa entra só com os descendentes que casam.
function filterTreeData(node, query) {
	var children = [];

	for (var i = 0; i < node.children.length; i++) {
		var child = node.children[i];

		if (treeSearchText(child.text).indexOf(query) >= 0) {
			children.push(child);
		} else if (child.type == 'node') {
			var filtered = filterTreeData(child, query);

			if (filtered.children.length > 0) children.push(filtered);
		}
	}

	return { type: 'node', text: node.text, children: children };
}

// Recria o treeview a partir da árvore em memória.
// expandAll: expande todas as pastas (resultado de busca); senão, só a raiz e o primeiro nível.
function populateTree(tree, data, expandAll) {
	while (tree.items.length > 0) {
		tree.remove(tree.items[0]);
	}

	var root = tree.add('node', data.text);

	addTreeDataItems(root, data.children, expandAll);
	root.expanded = true;

	if (!expandAll) {
		for (var i = 0; i < root.items.length; i++) {
			if (root.items[i].type == 'node') root.items[i].expanded = true;
		}
	}

	return root;
}

function addTreeDataItems(parentNode, children, expandAll) {
	for (var i = 0; i < children.length; i++) {
		var child = children[i];

		if (child.type == 'node') {
			var nodeItem = parentNode.add('node', child.text);

			addTreeDataItems(nodeItem, child.children, expandAll);
			if (expandAll) nodeItem.expanded = true;
		} else {
			var templateItem = parentNode.add('item', child.text);

			templateItem.image = PAD_AE_ICON;
			templateItem.file = child.file;
		}
	}
}

// Primeiro item (não pasta) da árvore, em profundidade.
function firstTreeItem(node) {
	for (var i = 0; i < node.items.length; i++) {
		if (node.items[i].type != 'node') return node.items[i];

		var found = firstTreeItem(node.items[i]);

		if (found) return found;
	}

	return null;
}

function buildTree(folder, tree, fileTypes) {
	var data = buildTreeData(folder, fileTypes);

	populateTree(tree, data, false);

	return data;
}

// Lê o texto de todos os layers de texto das comps, uma única vez, para a busca filtrar em memória.
// Cada entrada: { comp, layer, label, text, enabled, refTime }. Layers com keyframes de texto geram
// uma entrada por keyframe. Os valores são lidos com valueAtTime (sem mover a agulha das comps).
function buildTextLayerIndex(compArray, progressBar) {
	var index = [];

	progressBar.maxvalue = Math.max(compArray.length, 1);
	progressBar.value = 0;

	for (var c = 0; c < compArray.length; c++) {
		var comp = compArray[c];

		try {
			for (var l = 1; l <= comp.numLayers; l++) {
				var txtLayer = comp.layer(l);

				if (!(txtLayer instanceof TextLayer)) continue;

				var doc = txtLayer.property('ADBE Text Properties').property('ADBE Text Document');
				var label = '#' + txtLayer.index + '  ' + limitNameSize(txtLayer.name, 35);

				if (doc.numKeys > 0) {
					for (var k = 1; k <= doc.numKeys; k++) {
						var keyTime = doc.keyTime(k);

						index.push(textLayerEntry(comp, txtLayer, label, doc.valueAtTime(keyTime, false), keyTime));
					}
				} else if (doc.expression != '') {
					// texto vindo de expressão: lê no meio do layer, como antes
					var refTime = comp.duration < 1 ? 0 : txtLayer.inPoint + (txtLayer.outPoint - txtLayer.inPoint) / 2;

					if (refTime > comp.duration) refTime = comp.duration - comp.frameDuration;

					index.push(textLayerEntry(comp, txtLayer, label, doc.valueAtTime(refTime, false), refTime));
				} else {
					index.push(textLayerEntry(comp, txtLayer, label, doc.value, comp.time));
				}
			}
		} catch (err) {
			alert(lol + '#FND_019 - comp: ' + comp.name + '\n' + err.message);
		}

		progressBar.value++;
	}

	return index;
}

function textLayerEntry(comp, txtLayer, label, textDoc, refTime) {
	var text = String(textDoc.text).trim();

	if (textDoc.allCaps) text = text.toUpperCase(); // o texto aparece em caixa alta na comp

	return { comp: comp, layer: txtLayer, label: label, text: text, enabled: txtLayer.enabled, refTime: refTime };
}

// Normaliza o texto conforme as opções da busca.
function normalizeSearchText(str, matchCase, matchAccent) {
	if (!matchCase) str = str.toLowerCase();
	if (!matchAccent) str = str.replaceSpecialCharacters();

	return str;
}

// Filtra o índice. obj: { sKey, vis, matchCase, matchAccent, invert }
// A busca é literal: caracteres como '(', '.', '?' são procurados como texto.
function filterTextLayerIndex(index, obj) {
	var sKey = normalizeSearchText(obj.sKey, obj.matchCase, obj.matchAccent);
	var results = [];

	for (var i = 0; i < index.length; i++) {
		var entry = index[i];

		if (obj.vis && !entry.enabled) continue; // apenas layers visíveis

		var found = normalizeSearchText(entry.text, obj.matchCase, obj.matchAccent).indexOf(sKey) >= 0;

		if (found != !!obj.invert) results.push(entry);
	}

	return results;
}

// Monta a árvore de resultados: um nó por comp com os layers encontrados.
function populateTxtSearchTree(tree, results) {
	while (tree.items.length > 0) {
		tree.remove(tree.items[0]);
	}

	var currentComp = null;
	var compItem = null;

	for (var i = 0; i < results.length; i++) {
		var entry = results[i];

		// o índice é montado comp a comp, então os resultados da mesma comp são consecutivos
		if (entry.comp !== currentComp) {
			currentComp = entry.comp;
			compItem = tree.add('node', limitNameSize(currentComp.name, 45));
			compItem.image = compTogIcon.light;
			compItem.comp = currentComp;
		}

		var txtItem = compItem.add('item', entry.label);
		txtItem.comp = entry.comp;
		txtItem.txtLayer = entry.layer;
		txtItem.refTime = entry.refTime;
	}
}

// Expande todos os nós de uma 'árvore de exibição' (tree view).
function expandNodes(nodeTree) {
	var count = 0;
	var branches = nodeTree.items; // Obtém os nodes do nó atual

	nodeTree.expanded = true; // Expande o nó atual

	// Percorre cada node
	for (var i = 0; i < branches.length; i++) {
		// Se for um node
		if (branches[i].type == 'node') count += expandNodes(branches[i]); // Chama a função recursivamente
		count++;
	}
	return count;
}
