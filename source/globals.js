/* eslint-disable no-prototype-builtins */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
# globais
---------------------------------------------------------------

*/

// Determina o sistema operacional atual: 'Win' para Windows, 'Mac' para macOS.
var appOs = $.os.indexOf('Win') >= 0 ? 'Win' : 'Mac';

// Versão do After Effects
var appV = parseInt(app.buildName.substring(0, 2));
var appFullV = app.buildName.split(/x/i)[0];

// Preferências de acesso à rede para scripts no After Effects
var prefSection = 'Main Pref Section'; // Seção de preferências
var prefName = 'Pref_SCRIPTING_FILE_NETWORK_SECURITY'; // Nome da preferência
var netConfigName = '"Allow Scripts to Write Files and Access Network"'; // Descrição da configuração

// --------------------- Rede GLOBO ---------------------

// Endereços de rede da GLOBO
var servidorSP = '//10.193.48.13/promo_ber/BACKUP';
var servidorRJ = '//10.228.183.165/VFX/imagem/drive_l';
var mediaLake = '//10.228.183.174/edit_in_place';

// var mamAdd = '//10.181.53.152';
// var nAdd = '//10.197.18.172/arte';

// Caminhos de rede para projetos, saída e footage
var projRJ = servidorRJ + '/Fileserver_3';
var projSP = servidorSP + '/artes';
var outRJ = mediaLake + '/PROMO/cdesign_output/C# ABERTA & INTER/ARTE RJ';
var outSP = mediaLake + '/PROMO/cdesign_output/C# ABERTA & INTER/ARTE SP';
// var outSP = servidorSP + '/artes/ARTES PARA EDICAO';
var inFtg = '//10.228.183.137/EDIT_IN_PLACE/PROMO/edit_output';

// Dados das produções
var PAD_prodArray = updateProdData(
	new File(scriptMainPath + 'O_PADEIRO_config.json'),
);
// Caminho da pasta de templates
var templatesPath = PAD_prodArray[0].templatesPath;
var templatesFolder = new Folder(PAD_prodArray[0].templatesPath); // pasta de templates.

// --------------------- Preferências ---------------------

var userPath = Folder.userData.fullName;
var AEPreferencesPath = userPath + '/Adobe/After Effects/' + appFullV;

// Caminhos para as preferências do script e pasta temporária
var scriptPreferencesPath = Folder.userData.fullName + '/O PADEIRO script';
var scriptPreferencesFolder = new Folder(scriptPreferencesPath);
if (!scriptPreferencesFolder.exists) scriptPreferencesFolder.create();

var tempPath = scriptPreferencesPath + '/temp';
var tempFolder = new Folder(tempPath);
if (!tempFolder.exists) tempFolder.create();

// --------------------- Repositório GitHub ---------------------

// URLs do repositório do GitHub
var repoURL = 'https://github.com/jmbillard/O-PADEIRO';
var docsURL = repoURL + '/blob/main/docs';
var readme = '';

// --------------------- Strings e Mensagens ---------------------

// Emojis e mensagens (opcional)
var lol = 'Σ(っ °Д °;)っ        ';
var relax = 'ヽ(✿ﾟ▽ﾟ)ノ        ';

var lClick = '◖  →  ';
var rClick = ' ◗  →  ';
var dClick = '◖◖ →  ';

// --------------------- Arrays de Dados ---------------------

// Arrays para meses, dias da semana e cores
var shortMonthArray = [
	'JAN',
	'FEV',
	'MAR',
	'ABR',
	'MAI',
	'JUN',
	'JUL',
	'AGO',
	'SET',
	'OUT',
	'NOV',
	'DEZ',
];

var fullMonthArray = [
	'JANEIRO',
	'FEVEREIRO',
	'MARÇO',
	'ABRIL',
	'MAIO',
	'JUNHO',
	'JULHO',
	'AGOSTO',
	'SETEMBRO',
	'OUTUBRO',
	'NOVEMBRO',
	'DEZEMBRO',
];

var shortWeekArray = [
	'DOM',
	'SEG',
	'TER',
	'QUA',
	'QUI',
	'SEX',
	'SÁB',
	'HJE',
	'AMN',
];

var fullWeekArray = [
	'DOMINGO',
	'SEGUNDA',
	'TERÇA',
	'QUARTA',
	'QUINTA',
	'SEXTA',
	'SÁBADO',
	'HOJE',
	'AMANHÃ',
];

var separator = ' - ';

var renameRefArray = [
	(RODAPE = {
		prefix: 'RDP',
		comment: 'RODAPE',
		regExpStr: ['RODAP[EÉ](S)*', 'RDP(S)*'],
	}),
	(CARTAO = {
		prefix: 'CRT',
		comment: 'CARTAO',
		regExpStr: ['CART[ÃA]O', 'CART[ÕO]ES', 'CRT(S)*'],
	}),
	(LETTERING = {
		prefix: 'LETT',
		comment: 'LETTERING',
		regExpStr: ['LETTERING(S)*', 'LETT(S)*'],
	}),
	(CONFRONTO = {
		prefix: 'CONFRONTO',
		comment: 'CONFRONTO',
		regExpStr: ['CONFRONTO(S)*'],
	}),
	(TARJA = {
		prefix: 'TARJA',
		comment: 'TARJA',
		regExpStr: ['TARJA(S)*', 'TRJ(S)*'],
	}),
	(PASSAGEM = {
		prefix: 'PASSAGEM',
		comment: 'PASSAGEM',
		regExpStr: [
			'PASSAGEM(S)*',
			'TRANSI[CÇ][ÃA]O',
			'TRANSI[CÇ][ÕO]ES',
			'LAPADA(S)*',
		],
	}),
	(ASSINATURA = {
		prefix: 'ASSINA',
		comment: 'ASSINATURA',
		regExpStr: ['ASSINATURA(S)*', 'ASSINA(S)*', 'ASS'],
	}),
	(REFERENCIA = {
		prefix: 'REF',
		comment: 'REFERENCIA',
		regExpStr: ['REFERENCIA(S)*', 'PREVIEW(S)*', '(REF|PREV)(S)*'],
	}),
];

// 'uiObj' armazena os controles da interface, grupos seus respectivos arrays
var PAD_ui = {
	iconButtonArray: [],
	imageButtonArray: [],
	sectionGrpArray: [],
	divArray: [],
};

// Cores do Style Guide GLOBO
var bgColor1 = '#0B0D0E';
var bgColor2 = '#060F13';
var divColor1 = '#002133';
var divColor2 = '#004266';
var monoColor0 = '#F2F2F2';
var monoColor1 = '#C7C8CA';
var monoColor2 = '#939598';
var monoColor3 = '#4B4C4E';
var normalColor1 = '#05A6FF';
var normalColor2 = '#80D2FF';
var highlightColor1 = '#8800f8';
var highlightColor2 = '#8640BF';

// Objeto para armazenar as preferências carregadas do arquivo JSON
var scriptPreferencesObj = {};

// Define os valores padrão das preferências do usuário.
var defaultScriptPreferencesObj = {
	color: {
		menu: {
			light: '#3E50B4',
			dark: '#8FF7A7',
		},
		controls: {
			light: '#BF3A48',
			dark: '#DA6877',
		},
		animation: {
			light: '#CB6259',
			dark: '#B7B5E4 ',
		},
		tools: {
			light: '#6EA57D',
			dark: '#E2EE96',
		},
		effects: {
			light: '#D68A69',
			dark: '#ACCDEC',
		},
		text: {
			light: '#C2B6A3',
			dark: '#F4E76E',
		},
		brand: {
			light: '#3F3F58',
			dark: '#BBBBBD',
		},
		project: {
			light: '#00B5C2',
			dark: '#7CC6FE',
		},
		shortcuts: {
			light: '#CD4548',
			dark: '#FFB398',
		},
		app: {
			light: '#6639B6',
			dark: '#FFAFB7',
		},
		dev: {
			light: '#202020',
			dark: '#F4FAFF',
		},
	},
	labels: [
		'#F44336',
		'#E81D62',
		'#9B26AF',
		'#6639B6',
		'#3E50B4',
		'#02A8F3',
		'#00BBD3',
		'#009587',
		'#8AC249',
		'#CCDB38',
		'#FEEA3A',
		'#FE9700',
		'#FF5722',
		'#785447',
		'#9D9D9D',
		'#5F7C8A',
	],
	folders: {
		// Caminho padrão para a pasta do projeto
		projPath: '~/Desktop',
	},
	selection: {
		// Preferências de seleção (tipos de camadas null e adjustment, modo de projeto)
		nullType: 0, // Tipo de camada null padrão (0: shape layer, 1: null layer)
		adjType: 0, // Tipo de camada de ajuste padrão (0: shape layer, 1: adjustment layer)
		projectMode: 0, // Modo de projeto padrão (0: legado, 1: customizado)
	},
	ignoreMissing: true, // Ignorar arquivos ausentes (padrão: não)
	devMode: false, // Modo de desenvolvedor (padrão: não)
	homeOffice: false, // Modo home office (padrão: não)
	iconTheme: 'dark', // Tema de ícones (padrão: escuro)
};

//https://coolors.co/8c252f-bf3a48-cb6259-d68a69-c2b6a3-db9437-6ea57d-00b5c2-5f3691-6e489b

// Carrega as preferências do usuário a partir do arquivo 'preferences.json' ou usa os valores padrão.
function loadScriptPreferences() {
	// Tenta carregar o arquivo de preferências
	var tempFile = new File(scriptPreferencesPath + '/preferences.json');

	// Se o arquivo existir, tenta ler seu conteúdo
	if (tempFile.exists) {
		var tempFileContent = readFileContent(tempFile); // Lê o conteúdo do arquivo JSON

		try {
			scriptPreferencesObj = JSON.parse(tempFileContent); // Converte o conteúdo JSON para um objeto JavaScript
			//
		} catch (err) {
			// Exibe um alerta se houver erro ao carregar o JSON
			alert(
				'Falha ao carregar as preferências... ' +
					lol +
					'\n' +
					err.message,
			);
		}
	}

	// Preenche as preferências com os valores padrão, caso não existam
	for (var o in defaultScriptPreferencesObj) {
		if (!scriptPreferencesObj.hasOwnProperty(o))
			scriptPreferencesObj[o] = defaultScriptPreferencesObj[o];
	}
	iconTheme = scriptPreferencesObj.iconTheme; // Define o tema de ícones

	// Cria arrays de nomes de grupos e cores das abas
	// for (var t in defaultScriptPreferencesObj.color) {

	// 	if (!scriptPreferencesObj.color.hasOwnProperty(t)) scriptPreferencesObj.color[t] = defaultScriptPreferencesObj.color[t];

	// 	for (var th in defaultScriptPreferencesObj.color[t]) {

	// 		if (!scriptPreferencesObj.color[t].hasOwnProperty(th)) {
	// 			scriptPreferencesObj.color[t] = defaultScriptPreferencesObj.color[t];
	// 			break;
	// 		}
	// 	}
	// 	grpNames.push(t.toString());
	// 	tabColors.push(scriptPreferencesObj.color[t][iconTheme]);
	// }

	// // Carrega as cores dos rótulos, usando as cores padrão se houver erro
	// for (var l = 0; l < defaultScriptPreferencesObj.labels.length; l++) {

	// 	try {
	// 		labelColors.push(hexToRGB(scriptPreferencesObj.labels[l]));
	// 	//
	// } catch (err) {
	// 		labelColors.push(hexToRGB(defaultScriptPreferencesObj.labels[l]));
	// 	}
	// }

	// Define as preferências de seleção (nullType, adjType, projectMode)
	for (var s in defaultScriptPreferencesObj.selection) {
		if (!scriptPreferencesObj.selection.hasOwnProperty(s))
			scriptPreferencesObj.selection[s] =
				defaultScriptPreferencesObj.selection[s];
	}

	// Define variáveis globais com base nas preferências carregadas
	projectMode = scriptPreferencesObj.selection.projectMode;
	projPath = scriptPreferencesObj.folders.projPath;
	nullType = scriptPreferencesObj.selection.nullType;
	adjType = scriptPreferencesObj.selection.adjType;

	ignoreMissing = scriptPreferencesObj.ignoreMissing; // Ignora footage ausente
	homeOffice = scriptPreferencesObj.homeOffice; // Modo home office
	devMode = scriptPreferencesObj.devMode; // Modo de desenvolvedor
}

// Chama a função para carregar as preferências ao iniciar o script
// loadScriptPreferences();

// Objeto que armazena as propriedades padrão dos templates do Padeiro
var defaultTemplateConfigObj = {
	configName: 'default config', // Nome da configuração (usado para identificação no log)
	exemple: '', // Exemplo de texto de entrada (será mostrado na interface se o template não tiver um exemplo próprio)
	tip: '', // Dicas para o usuário sobre como usar o template

	compName: '', // Nome da composição principal do template (a composição que será duplicada e manipulada)
	prefix: '', // Prefixo que será adicionado ao nome de cada template gerado
	refTime: 0, // Tempo de referência para os templates gerados (em segundos)
	separator: '---', // Separador usado para dividir múltiplas linhas de texto em uma única entrada
	textCase: 'upperCase', // Define o formato do texto de entrada: 'upperCase' (maiúsculas), 'lowerCase' (minúsculas) ou 'titleCase' (título)
	inputLayers: null, // Array que define as camadas do template que receberão o texto de entrada (null por padrão)
	inputFx: null, // Objeto que define informações sobre efeitos aplicados às camadas de entrada (null por padrão)

	importPath: '~/Downloads', // Caminho padrão para importar novos footages
	outputPath: [
		// Lista de caminhos para salvar os renders dos templates gerados
		'~/Desktop',
	],
};

// Objeto com a lista inicial de produções
var defaultProductionDataObj = {
	PRODUCTIONS: [
		{
			name: 'nome...',
			icon: solTogIcon.dark,
			templatesPath: 'edite a pasta de templates...',
		},
	],
};

// Define tags de organização para composições e footage com ícones correspondentes.
// var tagsObj = {
// 	// Tags para composições (apenas comentários)
// 	promoTags: [
// 		['EXPORTAR', ftgTogIcon],
// 		['LOGO GLOBO', shpTogIcon],
// 		['TARJA', txtTogIcon],
// 		['LETTERING', txtTogIcon],
// 		['CARTAO', txtTogIcon],
// 		['RODAPE', txtTogIcon],
// 		['VINHETA', compTogIcon],
// 		['ASSINATURA', compTogIcon],
// 		['PASSAGEM', compTogIcon],
// 		['SERVICO', compTogIcon]
// 	],
// 	// Tags para footage (comentários) ou nomes de templates para composições
// 	multiTags: [
// 		['BG', imgTogIcon],
// 		['REF', imgTogIcon],
// 		['FOTO', imgTogIcon],
// 		['LOGO', shpTogIcon],
// 		['ICONE', shpTogIcon],
// 		['TEXTURA', matteTogIcon],
// 		['MUSICA', sonoTogIcon],
// 		['LOC', sonoTogIcon]
// 	]
// };

// Define um objeto com as cores e nomes dos rótulos do After Effects (codificados).
var labelsObj = {
	l1: {
		color: 'ÿñ=;', // FF F44336 (Vermelho)
		name: 'red',
	},
	l2: {
		color: 'ÿç\u0013c', // FF E81D62 (Rosa)
		name: 'pink',
	},
	l3: {
		color: 'ÿš(®', // FF 9B26AF (Roxo)
		name: 'purple',
	},
	l4: {
		color: 'ÿd<³', // FF 6639B6 (Roxo Escuro)
		name: 'deep purple',
	},
	l5: {
		color: 'ÿ?Q³', // FF 3E50B4 (Indigo)
		name: 'indigo',
	},
	l6: {
		color: 'ÿ)–ï', // FF 02A8F3 (Azul)
		name: 'blue',
	},
	l7: {
		color: 'ÿ\u001b©ñ', // FF 00BBD3 (Azul Claro)
		name: 'light blue',
	},
	l8: {
		color: 'ÿ\u001e¼Ó', // FF 009587 (Ciano)
		name: 'cyan',
	},
	l9: {
		color: 'ÿ\u0016–ˆ', // FF 8AC249 (Verde Azulado)
		name: 'teal',
	},
	l10: {
		color: 'ÿO¯T', // FF CCDB38 (Verde)
		name: 'green',
	},
	l11: {
		color: 'ÿŒÃQ', // FF FEEA3A (Verde Claro)
		name: 'light green',
	},
	l12: {
		color: 'ÿÌÚG', // FF FE9700 (Lima)
		name: 'lime',
	},
	l13: {
		color: 'ÿýéL', // FF FF5722 (Amarelo)
		name: 'yellow',
	},
	l14: {
		color: 'ÿû¿+', // FF 785447 (Âmbar)
		name: 'amber',
	},
	l15: {
		color: 'ÿý–#', // FF 9D9D9D (Laranja)
		name: 'orange',
	},
	l16: {
		color: 'ÿûS-', // FF 5F7C8A (Laranja Escuro)
		name: 'deep orange',
	},
};
