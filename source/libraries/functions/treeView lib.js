/* eslint-disable no-redeclare */
/* eslint-disable no-undef */
/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🌳 tree view functions
---------------------------------------------------------------

*/

function cleanHierarchy(nodeTree) {
	var branches = nodeTree.items;
	var itemsToRemove = [];

	for (var i = 0; i < branches.length; i++) {
		if (branches[i].type != 'node') continue;

		var wasEmpty = cleanHierarchy(branches[i]);

		if (wasEmpty) {
			itemsToRemove.push(branches[i]);
		}
	}

	for (var j = 0; j < itemsToRemove.length; j++) {
		nodeTree.remove(itemsToRemove[j]);
	}

	return nodeTree.items.length == 0 && nodeTree.parent != null;
}

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

// Constrói a árvore de resultados da busca
function buildTxtSearchTree(tree, obj, compArray, progressBar) {
	var sKey = obj.sKey; // Palavra-chave de busca
	var vis = obj.vis; // Incluir camadas ocultas? (true/false)
	var matchCase = obj.matchCase; // Diferenciar maiúsculas/minúsculas? (true/false)
	var matchAccent = obj.matchAccent; // Diferenciar acentos? (true/false)
	var invert = !obj.invert; // Inverter a busca (não incluir a palavra-chave)? (true/false)

	if (!matchCase) sKey = sKey.toLowerCase(); // Ajusta a palavra-chave para minúsculas se a opção estiver desmarcada
	if (!matchAccent) sKey = sKey.replaceSpecialCharacters(); // Remove acentos da palavra-chave se a opção estiver desmarcada

	// Remove todos os itens da árvore para começar do zero
	while (tree.items.length > 0) {
		tree.remove(tree.items[0]);
	}
	// Inicializa a barra de progresso e a contagem de itens da árvore
	progressBar.maxvalue = compArray.length;
	progressBar.value = 0;

	// Itera sobre todas as composições no projeto

	for (i = 0; i < compArray.length; i++) {
		try {
			var comp = compArray[i];
			var compName = limitNameSize(comp.name, 45); // Limita o tamanho do nome da composição
			var compItem = tree.add('node', compName); // Adiciona o item da composição na árvore

			compItem.image = compTogIcon.light;
			compItem.comp = comp;

			// Itera sobre todas as camadas em cada composição
			for (var l = 1; l <= comp.numLayers; l++) {
				var txtLayer = comp.layer(l); // Camada de texto atual

				// Pula se layer atual não for um layer de texto
				if (!(txtLayer instanceof TextLayer)) continue;

				// Ignora camadas ocultas se a opção estiver desmarcada
				if (vis && !txtLayer.enabled) continue;

				var matchResult = false;
				var doc = txtLayer
					.property('ADBE Text Properties')
					.property('ADBE Text Document'); // Propriedade de texto da camada
				var refTime =
					comp.duration < 1
						? 0
						: txtLayer.inPoint +
						(txtLayer.outPoint - txtLayer.inPoint) / 2;
				var layerName =
					'#' + txtLayer.index + '  ' + limitNameSize(txtLayer.name, 35); // Limita o tamanho do nome da camada

				if (refTime > comp.duration)
					refTime = comp.duration - comp.frameDuration;

				// Se a propriedade de texto tiver uma expressão
				if (doc.expression != '') comp.time = refTime; // Define o tempo para antes do ponto de saída da camada

				var sTxt = getTextLayerContent(txtLayer);

				if (doc.value.allCaps) sTxt = sTxt.toUpperCase(); // Ajusta a palavra-chave para maiúsculas se a opção estiver marcada
				if (!matchCase) sTxt = sTxt.toLowerCase(); // Ajusta a palavra-chave para minúsculas se a opção estiver desmarcada
				if (!matchAccent) sTxt = sTxt.replaceSpecialCharacters(); // Remove acentos da palavra-chave se a opção estiver desmarcada
				if (sTxt.match(sKey)) matchResult = true;
				if (matchResult != invert) continue; // Ignora a correspondência se a opção de inverter estiver marcada

				var txtItem = compItem.add('item', layerName);
				txtItem.comp = comp;
				txtItem.refTime = comp.time;
				txtItem.txtLayer = txtLayer;

				// Se a propriedade de texto tiver keyframes
				if (doc.numKeys > 0) {
					compItem.remove(txtItem);

					for (var k = 1; k <= doc.numKeys; k++) {
						comp.time = doc.keyTime(k); // Define o tempo da composição para o keyframe atual

						sTxt = getTextLayerContent(txtLayer);

						if (doc.value.allCaps) sTxt = sTxt.toUpperCase(); // Ajusta a palavra-chave para maiúsculas se a opção estiver marcada
						if (!matchCase) sTxt = sTxt.toLowerCase(); // Ajusta a palavra-chave para minúsculas se a opção estiver desmarcada
						if (!matchAccent) sTxt = sTxt.replaceSpecialCharacters(); // Remove acentos da palavra-chave se a opção estiver desmarcada
						if (sTxt.match(sKey)) matchResult = true;
						if (matchResult != invert) continue; // Ignora a correspondência se a opção de inverter estiver marcada

						var txtItem = compItem.add('item', layerName);
						txtItem.comp = comp;
						txtItem.refTime = comp.time;
						txtItem.txtLayer = txtLayer;
					}
				}
			}
			progressBar.value++; // Incrementa a barra de progresso
		} catch (err) {
			alert(lol + '#FND_019 - comp: ' + comp.name + '\n' + err.message);
		}
	}
	cleanHierarchy(tree);
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
