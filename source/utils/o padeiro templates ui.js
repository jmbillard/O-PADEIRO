/* eslint-disable no-redeclare */
/* eslint-disable no-useless-escape */
/* eslint-disable no-empty */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> 🪟 UI dialogs
---------------------------------------------------------------

*/

// Função para criar a interface de usuário do 'O Padeiro'
function padeiroTemplateDialog() {
	// Título da janela
	var scriptName = 'TEMPLATES';

	var compactWidth; // Largura da janela sem a pré-visualização
	var extendedWidth; // Largura da janela com a pré-visualização
	var fileFilter = ['.aep', '.aet']; // Extensões de template permitidas
	var hasInputData = false; // Indica se há dados de input
	var hasInputLayers = false; // Template possui layers editáveis

	// Arquivos do template
	var projectFile;
	var previewFile;
	var configFile;
	var scriptFile;

	// Dados da configuração template
	var templateData;
	var tipContent = '...';
	var exemple = '...';

	// Arrays ascensíveis a um script externo
	var inputTextArray = []; // Array com os textos de input
	var newCompsArray = []; // Array de templates criados
	var newOutputsArray = []; // Array de módulos individuais de saída

	// Janela principal
	var PAD_TEMPLATES_w = new Window('dialog', scriptName + ' ' + scriptVersion);

	// Grupo principal
	var mainGrp = PAD_TEMPLATES_w.add('group');
	mainGrp.orientation = 'stack';

	// Grupo de opções e progresso
	var optionsMainGrp = mainGrp.add('group');
	optionsMainGrp.orientation = 'column';
	optionsMainGrp.spacing = 12;
	optionsMainGrp.alignment = ['left', 'top'];
	optionsMainGrp.visible = false;

	// Rótulo de informações
	var infoHeaderLab = optionsMainGrp.add(
		'statictext',
		[0, 0, 320, 18]
	);
	setFgColor(infoHeaderLab, normalColor1); // Define a cor do texto
	// Barra de progresso
	var progressBar = optionsMainGrp.add(
		'progressbar',
		[0, 0, 320, 1]
	);
	// Lista de templates de render
	var renderDrop = optionsMainGrp.add(
		'dropdownlist',
		[0, 0, 320, 24]
	);
	renderDrop.visible = false;
	renderDrop.enabled = false;

	// ----------------------------------------------------------------------------

	// Grupo da interface de templates
	var templatesMainGrp = mainGrp.add('group');
	templatesMainGrp.spacing = 12;

	// Grupo vertical esquerdo
	var vGrp1 = templatesMainGrp.add('group');
	vGrp1.orientation = 'column';
	vGrp1.alignment = ['center', 'top'];
	vGrp1.alignChildren = 'left';
	vGrp1.spacing = 12;

	// Grupo vertical direito
	var vGrp2 = templatesMainGrp.add('group');
	vGrp2.orientation = 'column';
	vGrp2.alignment = ['center', 'top'];
	vGrp2.alignChildren = 'left';
	vGrp2.spacing = 12;
	vGrp2.visible = false;

	// ----------------------------------------------------------------------------

	// Grupo para o cabeçalho
	var templatesHeaderGrp = vGrp1.add('group');
	templatesHeaderGrp.alignment = 'fill';
	templatesHeaderGrp.orientation = 'stack';

	// Grupo do rótulo da seção BUSCA
	var templateLabGrp = templatesHeaderGrp.add('group');
	templateLabGrp.alignment = 'left';

	// Cria o rótulo 'BUSCA:'
	var templateLab = templateLabGrp.add(
		'statictext',
		undefined,
		'BUSCA:'
	);
	setFgColor(templateLab, normalColor1); // Define a cor do rótulo

	// Cria um grupo para o botão de informações
	var infoGrp = templatesHeaderGrp.add('group');
	infoGrp.alignment = ['right', 'center'];

	// Botão de ajuda
	var infoBtn = new themeIconButton(
		infoGrp,
		{
			icon: PAD_INFO_ICON,
			tips: [lClick + 'ajuda | DOCS']
		}
	);

	// Grupo da árvore de templates
	var treeGrp = vGrp1.add('group');
	treeGrp.orientation = 'column';
	treeGrp.spacing = 4;

	// Cria a caixa de pesquisa
	var searchBox = treeGrp.add(
		'edittext',
		[0, 0, 320, 24],
		''
	);
	// Cria a árvore de templates
	var templateTree = treeGrp.add(
		'treeview',
		[0, 0, 320, 464]
	);
	setFgColor(templateTree, monoColor2);
	buildTree(templatesFolder, templateTree, fileFilter); // Cria a árvore de templates

	// Grupo principal de botões
	var mainBtnGrp1 = vGrp1.add('group');
	mainBtnGrp1.orientation = 'stack';
	mainBtnGrp1.alignment = 'fill';
	mainBtnGrp1.margins = [0, 8, 0, 0];

	// Grupo de botões esquerdo
	var lBtnGrp1 = mainBtnGrp1.add('group');
	lBtnGrp1.alignment = 'left';
	lBtnGrp1.spacing = 16;
	// Botão de atualizar
	var refreshBtn = new themeIconButton(
		lBtnGrp1,
		{
			icon: PAD_ATUALIZAR_ICON,
			tips: [lClick + 'atualizar lista de templates']
		}
	);
	// Botão de abrir pasta
	var openFldBtn = new themeIconButton(
		lBtnGrp1,
		{
			icon: PAD_PASTA_ICON,
			tips: [lClick + 'abrir pasta de templates']
		}
	);

	//---------------------------------------------------------

	// Grupo para o cabeçalho
	var previewHeaderGrp = vGrp2.add('group');
	previewHeaderGrp.alignment = 'fill';
	previewHeaderGrp.orientation = 'stack';

	// Grupo do rótulo da seção PREVIEW
	var previewLabGrp = previewHeaderGrp.add('group');
	previewLabGrp.alignment = 'left';

	// Rótulo PREVIEW
	var previewLab = previewLabGrp.add(
		'statictext',
		undefined,
		'PREVIEW:'
	);
	setFgColor(previewLab, normalColor1); // Define a cor do texto

	// Grupo da imagem preview
	var previewGrp = vGrp2.add('group');
	previewGrp.orientation = 'column';
	previewGrp.alignChildren = 'left';

	// Imagem de preview
	var previewImg = previewGrp.add(
		'image',
		[0, 0, 440, 250],
		no_preview
	);

	// ----------------------------------------------------------------------------

	// Divisor horizontal
	var newDiv = themeDivider(vGrp2);
	newDiv.alignment = ['fill', 'center'];

	// ----------------------------------------------------------------------------

	// Grupo principal do input
	var inputMainGrp = vGrp2.add('group');
	inputMainGrp.alignment = ['left', 'top'];
	inputMainGrp.spacing = 12;

	// Subgrupo para a caixa de texto e opções de render
	var txtInputGrp = inputMainGrp.add('group');
	txtInputGrp.orientation = 'column';
	txtInputGrp.alignment = ['left', 'top'];
	txtInputGrp.alignChildren = 'left';

	// Subgrupo para as dicas
	var tipGrp = inputMainGrp.add('group');
	tipGrp.orientation = 'column';
	tipGrp.alignment = ['left', 'top'];
	tipGrp.alignChildren = 'left';

	// ----------------------------------------------------------------------------

	// Grupo do cabeçalho da seção INPUT
	var inputHeaderGrp = txtInputGrp.add('group');
	inputHeaderGrp.alignment = 'fill'; // Ocupa todo o espaço disponível
	inputHeaderGrp.orientation = 'stack'; // Empilha os elementos verticalmente

	// Grupo do rótulo INPUT
	var inputLabGrp = inputHeaderGrp.add('group');
	inputLabGrp.alignment = 'left'; // Alinhamento à esquerda

	// Rótulo INPUT
	var inputLab = inputLabGrp.add(
		'statictext',
		undefined,
		'INPUT:'
	);
	setFgColor(inputLab, normalColor1); // Define a cor do texto

	// Caixa de texto INPUT
	var inputTxt = txtInputGrp.add(
		'edittext',
		[0, 0, 316, 192],
		'',
		{ multiline: true }
	);

	// ----------------------------------------------------------------------------

	// Grupo do cabeçalho da seção DICAS
	var tipHeaderGrp = tipGrp.add('group');
	tipHeaderGrp.alignment = 'fill';
	tipHeaderGrp.orientation = 'stack';

	// Grupo do rótulo DICAS
	var tipLabGrp = tipHeaderGrp.add('group');
	tipLabGrp.alignment = 'left';

	// Rótulo DICAS
	var tipLab = tipLabGrp.add(
		'statictext',
		undefined,
		'DICAS:'
	);
	setFgColor(tipLab, normalColor1); // Define a cor do rótulo
	// Texto com o conteúdo das dicas
	var tipTxt = tipGrp.add(
		'statictext',
		[0, 0, 180, 192],
		tipContent,
		{
			multiline: true
		}
	);
	setFgColor(tipTxt, normalColor2); // Define a cor do texto

	// ----------------------------------------------------------------------------

	// Grupo principal de botões direito
	var mainBtnGrp2 = vGrp2.add('group');
	mainBtnGrp2.orientation = 'stack';
	mainBtnGrp2.alignment = 'fill';

	// Grupo dos botões esquerdo
	var lBtnGrp2 = mainBtnGrp2.add('group');
	lBtnGrp2.alignment = 'left';
	lBtnGrp2.spacing = 16;

	// Botão de processar preenchimento
	var processBtn = new themeButton(
		lBtnGrp2,
		{
			width: 120,
			height: 32,
			textColor: bgColor1,
			buttonColor: normalColor1,
			labelTxt: 'processar: 1',
			tips: [
				lClick + 'criar e preencher o template selecionado'
			]
		}
	);

	setBgColor(PAD_TEMPLATES_w, bgColor1); // Define a cor de fundo da janela

	//---------------------------------------------------------

	PAD_TEMPLATES_w.onShow = function () {
		// Expande a raiz da árvore de templates
		templateTree.expanded = true;

		// Expande as pastas de nível 1
		var branches = templateTree.items;

		for (var i = 0; i < branches.length; i++) {
			var s = branches[i];

			if (s.type == 'node') s.expanded = true;
		}

		// Calcula e armazena as dimensões da janela
		extendedWidth = PAD_TEMPLATES_w.size.width; // Com preview
		compactWidth = extendedWidth - 520; // Sem preview

		// Oculta a área de preview  inicialmente
		vGrp2.visible = false;
		newDiv.visible = false;
		PAD_TEMPLATES_w.size.width = compactWidth;

		// Foco na caixa de pesquisa
		searchBox.active = true;
	};

	//---------------------------------------------------------

	searchBox.onEnterKey = function () {
		templateLab.active = true;
		templateTree.active = true;
	};

	//---------------------------------------------------------

	searchBox.onChange = function () {

		// Aborta se a pesquisa estiver vazia
		if (this.text.trim() == '') return;

		// Formatação do texto de pesquisa
		searchBox.text = searchBox.text
			.trim()
			.toUpperCase()
			.replaceSpecialCharacters();

		// Atualiza a árvore de templates
		buildTree(templatesFolder, templateTree, fileFilter);

		// Encontra os itens na árvore
		var items = findItem(templateTree, [], searchBox.text);

		// Aborta se nenhum item for encontrado
		if (items.length == 0) return;

		// Expande as pastas para mostrar os resultados da pesquisa
		for (var n = 0; n < items.length; n++) {

			var s = items[n];

			if (s.type == 'node') s.expanded = true;

			// Expande as pastas do item até a raiz
			while (s.parent.constructor.name != 'TreeView') {
				s.parent.expanded = true;
				s = s.parent;
			}
		}

		templateLab.active = true;
		templateTree.active = true;
	};

	//---------------------------------------------------------

	templateTree.onChange = function () {
		// Pastas na árvore não devem ser selecionáveis
		if (this.selection != null && this.selection.type == 'node') this.selection = null;

		// Caso nenhum template seja selecionado
		if (this.selection == null) {
			PAD_TEMPLATES_w.size.width = compactWidth;
			vGrp2.visible = false;
			newDiv.visible = false;

			return;
		}

		// arquivo de projeto do template
		projectFile = this.selection.file;

		// Base do nome dos arquivos template --> caminho do projeto/nome do template
		var templateBase = projectFile.path + '/' + deleteFileExt(projectFile.displayName);

		// Criação dos objetos File para os arquivos do template
		previewFile = new File(templateBase + '_preview.png');
		configFile = new File(templateBase + '_config.json');
		scriptFile = new File(templateBase + '_script.js');

		if (previewFile.exists) {
			previewImg.image = previewFile;

		} else {
			previewImg.image = no_preview;
		}

		// Mostra a área de preview
		vGrp2.visible = true;
		newDiv.visible = true;
		PAD_TEMPLATES_w.size.width = extendedWidth;

		// Preenche o conteúdo da área de preview
		try {
			hasInputLayers = false;
			exemple = lol + '\n\nesse template não pode ser editado pelo padeiro.';
			tipContent = 'clique no botão importar e edite o template manualmente.';

			// Checagem do arquivo de configuração
			if (configFile.exists) {
				exemple = relax + '\n\nesse template não possui inputs.';
				var JSONContent = readFileContent(configFile);
				templateData = JSON.parse(JSONContent);

				// Verifica as configurações
				for (var o in defaultTemplateConfigObj) {

					if (templateData.hasOwnProperty(o)) continue;

					templateData[o] = defaultTemplateConfigObj[o];
				}

				// Verifica os layers editáveis
				hasInputLayers = templateData.inputLayers != null;

				// Atualiza o exemplo e a dica
				if (hasInputLayers) {
					exemple = templateData.exemple;
					tipContent = templateData.tip;
				}
			}

			if (!hasInputData) inputTxt.text = exemple;
			tipTxt.text = tipContent;

		} catch (err) {
			alert(lol + '#PAD_017 - esse template não tem um arquivo de configuração válido!');
			return;
		}

		inputLab.enabled = hasInputLayers;
		inputTxt.enabled = hasInputLayers;

		var count = inputTxt.text.split(/[\n\r]{2,}/).length;
		processBtn.text = 'preencher: ' + count;
	};

	templateTree.onActivate = function () {

		hasInputData = inputTxt.text.trim() != '' && inputTxt.text != exemple;

		// Se não houver dados, define o texto de entrada como o exemplo
		if (!hasInputData) inputTxt.text = exemple;

		// Atualiza a interface
		inputLab.enabled = hasInputLayers;
		inputTxt.enabled = hasInputLayers;
	};

	//---------------------------------------------------------

	inputTxt.onChanging = function () {

		var count = this.text.split(/[\n\r]{2,}/).length;

		hasInputData = inputTxt.text.trim() != '';
		processBtn.enabled = hasInputData && hasInputLayers;
		processBtn.label.text = 'preencher: ' + count;
	};

	inputTxt.onChange = function () {
		this.text = this.text.replace(/[\n\r]{3,}/g, '\n\n');
	};

	//---------------------------------------------------------

	processBtn.leftClick.onClick = function () {

		// Verificações Iniciais
		if (inputTxt.text.trim() == '') return; // Aborta se não houver texto de entrada
		if (!projectFile.exists) return; // Aborta se o arquivo do template não existir
		if (!configFile.exists) return; // Aborta se o arquivo de configuração não existir

		var logCount = 0; // Contador de templates processados
		var templateComp; // Comp original
		var template; // Comp duplicada que será editada
		var renderTemplateArray; // Array de templates de render

		// Array com os textos de input
		inputTextArray = inputTxt.text.split(/[\n\r]{2,}/);

		// Preparação da Interface para o processamento
		templatesMainGrp.visible = false;
		optionsMainGrp.visible = true;
		PAD_TEMPLATES_w.size = [compactWidth, 60];
		PAD_TEMPLATES_w.text = 'IMPORTANDO ARQUIVOS...';
		infoHeaderLab.text = 'projeto:  ' + projectFile.displayName;
		PAD_TEMPLATES_w.update();
		PAD_TEMPLATES_w.center();

		// Ajusta a caixa do texto de input
		if (templateData.textCase == 'upperCase') inputTxt.text = inputTxt.text.toUpperCase();
		if (templateData.textCase == 'lowerCase') inputTxt.text = inputTxt.text.toLowerCase();
		if (templateData.textCase == 'titleCase') inputTxt.text = inputTxt.text.toTitleCase();

		// Define configurações do projeto
		app.project.bitsPerChannel = 8;
		app.project.expressionEngine = 'javascript-1.0';
		app.project.linearBlending = true;
		app.project.timeDisplayType = TimeDisplayType.TIMECODE;

		// Importação do arquivo de projeto
		try {
			var IO = new ImportOptions(projectFile);

			app.project.importFile(IO);

		} catch (err) {
			alert(lol + '#PAD_018 - ' + err.message);
			return;
		}

		// Busca e define a comp original
		var iNum = app.project.numItems;

		for (var i = 1; i <= iNum; i++) {
			var comp = app.project.item(i);

			if (!(comp instanceof CompItem)) continue;
			if (!comp.comment.match(/^TEMPLATE/)) continue;
			if (comp.name != templateData.compName) continue;
			templateComp = comp;

			break;
		}

		PAD_TEMPLATES_w.text = 'EXTRAINDO TEMPLATES RENDER...';
		progressBar.maxvalue = 3;
		progressBar.value = 0;
		PAD_TEMPLATES_w.update();

		// Extrai e filtra o array de templates de render
		try {
			var item = app.project.renderQueue.items.add(templateComp);
			renderTemplateArray = item.outputModule(1).templates;
			var tIndex = renderTemplateArray.length - 1;

			progressBar.value++;
			PAD_TEMPLATES_w.update();

			// Remove templates ocultos
			while (renderTemplateArray[tIndex].toString().match(/^_HIDDEN\s/)) {
				renderTemplateArray.pop();
				tIndex--;
			}
			progressBar.value++;
			PAD_TEMPLATES_w.update();

			populateDropdownList(renderTemplateArray, renderDrop);
			item.remove();

			progressBar.value++;
			PAD_TEMPLATES_w.update();

		} catch (err) {
			alert(lol + '#PAD_017 - ' + err.message);
			return;
		}

		// Propriedades da configuração do template
		var t = templateData.refTime; // Tempo de referencia em segundos
		var suffixArray = templateData.inputFx != null ? templateData.inputFx.options : ['']; // Array de sufixos --> ['MANHA', 'TARDE', 'NOITE']

		// Inicia o preenchimento dos templates
		PAD_TEMPLATES_w.text = 'PREENCHENDO TEMPLATES...';
		progressBar.maxvalue = inputTextArray.length * suffixArray.length;
		progressBar.value = 0;
		PAD_TEMPLATES_w.update();

		// Loop no Array de textos de input
		for (var n = 0; n < inputTextArray.length; n++) {

			// Templates com prefixo 'ignore' não são processados
			// Mas podem ser manipulados por um script externo posteriormente
			if (templateData.prefix.match(/ignore/i)) {
				newCompsArray.push(templateComp);
				break;
			}
			// Texto a ser preenchido
			var inputText = inputTextArray[n];

			// Loop no Array de efeitos
			for (var f = 0; f < suffixArray.length; f++) {

				// Comp duplicada que será editada
				template = templateComp.duplicate();

				// Array de Layers editáveis
				var inputLayerList = templateData.inputLayers;
				// Pattern de separação de informações
				var sPattern = new RegExp('[\\n\\r]' + templateData.separator + '[\\n\\r]', 'i');
				// Array de informações
				var infoArray = inputText.split(sPattern); // ex: título e subtítulo --> ['A.X.L', 'O CÃO ROBÔ']

				// Define o valor do efeito
				if (templateData.inputFx != null) {
					var ctrlLayer = template.layer(templateData.inputFx.layerIndex);

					ctrlLayer
						.property('ADBE Effect Parade')
						.property(templateData.inputFx.fxName)
						.property(templateData.inputFx.optionIndex)
						.setValue(f + 1);
				}

				// Preenche a informação no layer editável
				for (var l = 0; l < inputLayerList.length; l++) {
					// Layer editável
					var inputLayer = template.layer(inputLayerList[l].layerIndex);

					// Desabilita o layer se índice dele for maior que o numero de informações
					if (l >= infoArray.length) {
						inputLayer.enabled = false;
						continue;
					}

					if (infoArray[l] == '') continue;

					// Aplica a informação como conteúdo do layer (apenas para layers de texto)
					if (inputLayerList[l].method == 'textContent') {

						// Verifica se o layer editável é um layer de texto
						if (!(inputLayer instanceof TextLayer)) continue;

						infoArray[l] = infoArray[l].trim();
						var textContent = infoArray[l];
						var text = inputLayer.property('ADBE Text Properties');
						var textDoc = text.property('ADBE Text Document').value;

						textDoc.text = textContent;
						text.property('ADBE Text Document').setValue(textDoc);
					}

					// Aplica a informação como nome do layer (qualquer layer)
					if (inputLayerList[l].method == 'layerName') {
						var layerName = infoArray[l].trim();
						inputLayer.name = layerName;
					}
				}

				var prefix = templateData.prefix;
				var info = infoArray.join(' ');
				var suffix = suffixArray[f];

				template.name = [prefix, separator, info, suffix].join(' ')
					.trim()
					.toUpperCase()
					.replace(/^-+|-+$/g, '')
					.replaceSpecialCharacters();

				template.openInViewer(); // Abre a composição preenchida
				template.time = t; // move a agulha da timeline para o tempo de referência
				template.comment = 'EXPORTAR'; // Adiciona o comentário 'EXPORTAR' para organização
				newCompsArray.push(template); // Adiciona a comp ao array de templates criados

				logCount++; // Incrementa número de templates processados

				// Atualização da interface de progresso
				infoHeaderLab.text = 'input:  ' + template.name;
				progressBar.value++;
				PAD_TEMPLATES_w.update();
			}
		}
		// Remove o template original caso o prefixo não seja 'ignore'
		if (!templateData.prefix.match(/ignore/i)) templateComp.remove();
		// Define a pasta de importação padrão do projeto
		var importFolder = new Folder(templateData.importPath);
		app.project.setDefaultImportFolder(importFolder);

		// Atualização da interface de progresso
		PAD_TEMPLATES_w.text = 'ORGANIZANDO PROJETO...';
		PAD_TEMPLATES_w.update();

		// Organização do Projeto
		deleteProjectFolders();
		populateProjectFolders();
		deleteEmptyProjectFolders();

		// Atualização da interface de progresso
		PAD_TEMPLATES_w.text = 'SALVANDO LOG...';
		infoHeaderLab.text = logCount + ' TEMPLATES PROCESSADOS';
		progressBar.value = 0;
		PAD_TEMPLATES_w.update();

		// Registro de Dados (Log)
		// os Logs ainda não são 100% confiáveis devido a
		// variação nas configurações do sistema (formatos de data e hora)
		try {

			// Cria um objeto File para o arquivo de log na pasta de templates
			var logFile = new File(templatesPath + '/log padeiro.csv');

			// Obtém data e hora atual do sistema usando comandos do sistema operacional (Windows)
			var dateStr = system
				.callSystem('cmd.exe /c date /t')
				.replace(/[^\d\/]/gi, '')
				.trim(); // Obtém a data e remove caracteres não numéricos
			var timeStr = system
				.callSystem('cmd.exe /c time /t')
				.replace(/[^\d\:]/gi, '')
				.trim(); // Obtém a hora e remove 'AM' se presente

			// Cria um registro de log com as informações:
			// configuração usada, número de templates criados, nome do usuário, data e hora
			var logData = [
				templateData.configName,
				logCount,
				system.userName,
				dateStr,
				timeStr,
			].join(',');

			// Salva o registro de log no arquivo
			saveLogData(logFile, logData);

		} catch (err) { }

		// Atualização da interface de progresso
		PAD_TEMPLATES_w.text = 'REGISTRANDO METADADOS...';
		infoHeaderLab.text = 'SOURCE - FONTS';
		PAD_TEMPLATES_w.update();

		// Adiciona metadados XMP indicando o caminho do template
		setXMPData('source', decodeURI(projectFile.path).toString());

		PAD_TEMPLATES_w.text = 'OPÇÕES DE RENDER';
		infoHeaderLab.text = 'SELECIONE O TEMPLATE:';
		PAD_TEMPLATES_w.size = [compactWidth, 100];
		renderDrop.visible = true;
		renderDrop.enabled = true;
		renderDrop.active = true;
	};

	renderDrop.onChange = function () {

		var outputPathArray = templateData.outputPath;
		var padOutputTemplate = this.selection.toString();
		this.enabled = false;

		// Atualização da interface de progresso
		PAD_TEMPLATES_w.text = 'PROCESSANDO...';
		infoHeaderLab.text = 'AGUARDE A VERIFICAÇÃO DO CAMINHO DE OUTPUT!';
		progressBar.maxvalue = newCompsArray.length * outputPathArray.length;
		progressBar.value = 0;
		PAD_TEMPLATES_w.update();

		// Verifica as pastas de output
		for (var o = 0; o < outputPathArray.length; o++) {

			var outputFolder = new Folder(outputPathArray[o]);

			if (outputFolder.exists) continue;

			// Substitui o caminho inexistente pelo caminho padrão
			outputPathArray[o] = defaultTemplateConfigObj.outputPath[0];

			// Atualização da interface de progresso
			infoHeaderLab.text = 'PASTA NÃO ENCONTRADA...';
			PAD_TEMPLATES_w.update();

			alert(lol + '#PAD_019 - o output não pode ser acessado!');
		}

		// Atualização da interface de progresso
		PAD_TEMPLATES_w.text = 'CRIANDO FILA DE RENDER...';
		PAD_TEMPLATES_w.size = [compactWidth, 60];
		renderDrop.visible = false;
		PAD_TEMPLATES_w.update();

		// Cria a fila de render
		for (var r = 0; r < newCompsArray.length; r++) {

			if (padOutputTemplate == '') break;

			template = newCompsArray[r];
			var item = app.project.renderQueue.items.add(template);

			item.applyTemplate('Best Settings');

			for (var o = 0; o < outputPathArray.length; o++) {
				if (o > 0) item.outputModules.add();

				var outputModule = item.outputModule(o + 1);
				var outputFolder = new Folder(outputPathArray[o]);

				// Cria os arquivos de saída
				try {
					var outputFile = new File(outputPathArray[o] + '/[compName].[fileextension]');

					outputModule.file = outputFile;
					outputModule.applyTemplate(padOutputTemplate);
					newOutputsArray.push(outputModule);

				} catch (err) {
					alert(lol + '#PAD_020 - ' + err.message); // Mensagem de erro
				}
				// Atualização da interface de progresso
				infoHeaderLab.text = 'saída:  ' + outputModule.file.displayName;
				progressBar.value++;
				PAD_TEMPLATES_w.update();
			}
		}

		PAD_TEMPLATES_w.close();
	};

	PAD_TEMPLATES_w.onClose = function () {

		// Execução de Script Personalizado (se houver)
		if (!scriptFile.exists) return;

		// Atualização da interface de progresso
		PAD_TEMPLATES_w.text = 'EXECUTANDO SCRIPT EXTERNO...';
		infoHeaderLab.text = 'script:  ' + scriptFile.displayName;
		PAD_TEMPLATES_w.update();

		try {
			scriptFile.open('r');
			eval(scriptFile.read());

			scriptFile.close();

		} catch (err) {
			alert(lol + '#PAD_021 - ' + err.message);
		}
	}

	// templateTree.onDoubleClick = function () {
	// 	try {
	// 		// Tentar importar o template
	// 		var IO = new ImportOptions(projectFile); // Opções de importação

	// 		app.project.importFile(IO); // Importa o template selecionado para o projeto atual

	// 		// Organização das Pastas do Projeto
	// 		deleteProjectFolders(); // Exclui todas pastas do projeto.
	// 		populateProjectFolders(); // Organiza o projeto com os templates criados.
	// 		deleteEmptyProjectFolders(); // Exclui pastas vazias do projeto.

	// 		// Adiciona metadados XMP ao projeto indicando o caminho do template original
	// 		setXMPData('source', decodeURI(projectFile.path).toString());
	// 		//
	// 	} catch (err) {
	// 		// Captura e trata qualquer erro que ocorra durante a importação
	// 		alert(lol + '#PAD_022 - ' + err.message); // Exibe uma mensagem de alerta com a mensagem de erro
	// 		return; // Sai da função para evitar mais processamento em caso de erro
	// 	}

	// 	PAD_TEMPLATES_w.close(); // Fecha a janela da interface do 'O Padeiro'
	// };

	//---------------------------------------------------------

	refreshBtn.leftClick.onClick = function () {

		buildTree(templatesFolder, templateTree, fileFilter);

		templateTree.expanded = true;

		var branches = templateTree.items;

		for (var i = 0; i < branches.length; i++) {

			if (branches[i].type == 'node') {
				branches[i].expanded = true;
			}
		}
	};

	//---------------------------------------------------------

	openFldBtn.leftClick.onClick = function () {

		if (!templatesFolder.exists) {

			templatesFolder.create();
		}
		openFolder(templatesPath);
	};


	infoBtn.leftClick.onClick = function () {

		openWebSite(repoURL + '/blob/main/README.md#-preenchendo-templates');
	};

	// Exibe a janela
	PAD_TEMPLATES_w.show();
}
