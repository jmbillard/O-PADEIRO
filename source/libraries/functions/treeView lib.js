/* eslint-disable no-redeclare */
/* eslint-disable no-undef */
/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🌳 tree view functions
---------------------------------------------------------------

*/

// Função para remover pastas vazias da árvore de diretórios (recursivamente)
function cleanHierarchy(nodeTree) {
	// Obtém todos os subitens (arquivos ou pastas) do nó atual
	var branches = nodeTree.items;

	// Percorre os subitens em ordem reversa para remover com segurança enquanto iteramos
	for (var i = branches.length - 1; i >= 0; i--) {
		// Se o subitem não for uma pasta ("node"), ignora e passa para o próximo
		if (branches[i].type != 'node') continue;

		// Chama a função recursivamente para limpar as subpastas
		var wasEmpty = cleanHierarchy(branches[i]);

		// Se o subitem era uma pasta e agora está vazio (ou já estava), remove-o
		if (wasEmpty) {
			nodeTree.remove(branches[i]);
		}
	}

	// Retorna se o nó atual ficou vazio após a limpeza (exceto se for a raiz)
	return nodeTree.items.length == 0 && nodeTree.parent != null;
}

// Otimiza a hierarquia da árvore, combinando pastas com apenas uma subpasta
function optimizeHierarchy(nodeTree) {
	var branches = nodeTree.items;

	for (var i = branches.length - 1; i >= 0; i--) {
		// Pula itens que não são pastas
		if (branches[i].type != 'node') continue;

		// Se a pasta tiver mais de um item, chama a função recursivamente para otimizar as subpastas
		if (branches[i].items.length > 1) {
			optimizeHierarchy(branches[i]);
		} else {
			// Se a pasta tiver apenas uma subpasta, combina os nomes e move os itens
			if (
				branches[i].items.length == 1 &&
				branches[i].items[0].type == 'node'
			) {
				var subfolder = branches[i].items[0];
				branches[i].text += ' / ' + subfolder.text; // Combina os nomes

				while (subfolder.items.length > 0) {
					var item = subfolder.items[0];
					try {
						// Move o item para a pasta pai, preservando o tipo, texto e imagem
						var newItem = branches[i].add(item.type, item.text);
						newItem.image = item.image;
						newItem.file = item.file;
						subfolder.remove(0);
						//
					} catch (err) { }
				}
				nodeTree.remove(subfolder); // Remove a subpasta agora vazia
			}
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

// refreshes the main 'tree view' node...
// Constrói a árvore de arquivos e pastas na interface do usuário
function buildTree(folder, tree, fileTypes) {
	// Remove todos os itens da árvore (limpa a árvore)
	tree.remove(tree.items[0]);

	// Obtém todos os arquivos e pastas dentro da pasta especificada
	var folderContentArray = folder.getFiles();

	// Adiciona a pasta raiz (folder) como um novo nó na árvore
	var folderNode = tree.add('node', folder.displayName);

	// Chama a função createHierarchy para popular a árvore recursivamente,
	// começando pela pasta raiz e filtrando pelos tipos de arquivo permitidos
	createHierarchy(folderContentArray, folderNode, fileTypes);

	// Remove pastas vazias da árvore (limpa a hierarquia)
	cleanHierarchy(tree);

	// A linha abaixo é opcional e pode ser utilizada para otimizar a hierarquia,
	// combinando pastas com apenas um único item
	optimizeHierarchy(tree);
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
