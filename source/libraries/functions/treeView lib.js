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

function optimizeHierarchy(nodeTree) {
	var branches = nodeTree.items;

	for (var i = 0; i < branches.length; i++) {
		if (branches[i].type != 'node') continue;

		if (branches[i].items.length > 1) {
			optimizeHierarchy(branches[i]);
		} else if (branches[i].items.length == 1 && branches[i].items[0].type == 'node') {
			var subfolder = branches[i].items[0];
			branches[i].text += ' / ' + subfolder.text;

			while (subfolder.items.length > 0) {
				var item = subfolder.items[0];
				try {
					var newItem = branches[i].add(item.type, item.text);
					newItem.image = item.image;
					newItem.file = item.file;
					subfolder.remove(0);
				} catch (err) { }
			}
			branches[i].remove(subfolder);
			optimizeHierarchy(branches[i]);
		}
	}
}

// Cria a hierarquia de arquivos e pastas na árvore da interface do usuário
function createHierarchy(array, node, fileTypes) {
	for (var n = 0; n < array.length; n++) {
		var nodeName = array[n].displayName; // Nome do item atual

		// Verifica se o item atual é uma pasta (Folder)
		if (array[n] instanceof Folder) {
			var subArray = array[n].getFiles(); // Obtém os arquivos e subpastas da pasta atual

			// Se a pasta possui conteúdo (arquivos ou subpastas)
			if (subArray.length > 0) {
				var nodeItem = node.add('node', nodeName); // Adiciona um nó de pasta na árvore
				// nodeItem.image = fldTogIcon.light;  // Opcional: define o ícone da pasta

				// Chama recursivamente a função para processar o conteúdo da pasta
				createHierarchy(subArray, nodeItem, fileTypes);
			}
		} else {
			// Se o item atual não for uma pasta (é um arquivo)
			try {
				// Filtra os arquivos com base nas extensões permitidas em fileTypes
				if (fileTypes.indexOf(getFileExt(nodeName)) >= 0) {
					var templateItem = node.add('item', nodeName); // Adiciona um nó de arquivo na árvore
					templateItem.image = PAD_AE_ICON; // Define o ícone do arquivo
					templateItem.file = array[n]; // Define o ícone do arquivo
				}
				//
			} catch (err) { }
		}
	}
}

function buildTree(folder, tree, fileTypes) {
	// Remove todos os itens
	while (tree.items.length > 0) {
		tree.remove(tree.items[0]);
	}

	var folderContentArray = folder.getFiles();
	var folderNode = tree.add('node', folder.displayName);

	createHierarchy(folderContentArray, folderNode, fileTypes);

	cleanHierarchy(folderNode);
	optimizeHierarchy(folderNode);
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

// Função recursiva que percorre uma 'árvore de exibição' (tree view)
// e adiciona os nós que contêm uma determinada string na lista de resultados
function findItem(nodeTree, list, searchTxt) {
	// Obtém os nodes do nó atual
	var branches = nodeTree.items;

	// Percorre cada node
	for (var i = 0; i < branches.length; i++) {
		// Se o node for um nó (node), chama a função recursivamente para o seu node
		if (branches[i].type == 'node') findItem(branches[i], list, searchTxt);

		// Verifica se o texto do node contém a string procurada
		if (
			branches[i].text
				.trim()
				.toUpperCase()
				.replaceSpecialCharacters()
				.match(searchTxt)
		) {
			// Adiciona o node na lista de resultados
			list.push(branches[i]);
		}
	}

	// Retorna a lista de resultados
	return list;
}
