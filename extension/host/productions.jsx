/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> editor da lista de produções (host)
---------------------------------------------------------------

A lista é o 'O_PADEIRO_GLOBAL_config.json' compartilhado pela equipe.
Como mais de uma pessoa pode editar, salvar confere se o arquivo mudou desde que o editor o leu.

*/

// A tabela de seções da configuração (regras/configuracao.js) lê e grava as seções por um adaptador: um documento
// (objeto) pelo nome do arquivo. Este é o dos arquivos do disco; o JSON fica aqui.

// Os arquivos deste computador (na pasta de dados do usuário), já lidos: relidos só quando a data muda. Ilegível: null
// (a tabela devolve o padrão da seção).
var PAD_DESTE_COMPUTADOR_CACHE = {};

function padArquivoDesteComputador(arquivo) {
	return new File(scriptPreferencesPath + '/' + arquivo);
}

function padDataDoArquivo(file) {
	try {
		return file.exists ? file.modified.getTime() : 0;
	} catch (err) {
		return 0;
	}
}

function padLerDesteComputador(arquivo) {
	var file = padArquivoDesteComputador(arquivo);
	var stamp = padDataDoArquivo(file);
	var c = PAD_DESTE_COMPUTADOR_CACHE[arquivo];

	if (!c || c.stamp != stamp) {
		c = PAD_DESTE_COMPUTADOR_CACHE[arquivo] = { stamp: stamp, data: null };

		if (stamp) {
			try {
				c.data = JSON.parse(readFileContent(file));
			} catch (err) { }
		}
	}

	return c.data;
}

// Para ler: a configuração da equipe já lida (padConfigData, relida só quando o arquivo muda; sem o arquivo ou com um
// JSON inválido, lança, e a tabela devolve o padrão da seção) e os arquivos deste computador. Grava só os deste
// computador: a da equipe se grava pelo padConfigArquivo, que confere o arquivo da rede.
var PAD_CONFIG_ADAPTADOR = {
	ler: function (arquivo) {
		return arquivo == PAD_CONFIGURACAO.EQUIPE ? padConfigData() : padLerDesteComputador(arquivo);
	},
	gravar: function (arquivo, doc) {
		if (arquivo == PAD_CONFIGURACAO.EQUIPE) throw new Error('#PAD_099 - configuração: a da equipe se grava pelo editor (saveProductions).');

		var folder = new Folder(scriptPreferencesPath);

		if (!folder.exists) folder.create();

		saveTextFile(JSON.stringify(doc, null, '\t'), padArquivoDesteComputador(arquivo).fsName);
		delete PAD_DESTE_COMPUTADOR_CACHE[arquivo];
	},
	apagar: function (arquivo) {
		var file = padArquivoDesteComputador(arquivo);

		if (file.exists) file.remove();
		delete PAD_DESTE_COMPUTADOR_CACHE[arquivo];
	}
};

// Uma seção da configuração (da equipe ou deste computador), limpa e completa (pela tabela).
function padLerSecao(nome) {
	return PAD_CONFIGURACAO.ler(PAD_CONFIG_ADAPTADOR, nome);
}

// Grava seções deste computador ({ nome: valor }): só as enviadas mudam. Lança a mensagem da limpeza sem gravar nada.
function padGravarSecoes(valores) {
	return PAD_CONFIGURACAO.gravar(PAD_CONFIG_ADAPTADOR, valores);
}

// Para gravar num arquivo (o da equipe, ou outro ao exportar): lê o arquivo de novo (não o guardado), grava o
// documento inteiro e confere o que foi gravado. Um arquivo ilegível vira um documento novo (como sempre foi).
function padConfigArquivo(file) {
	return {
		ler: function () {
			return file.exists ? JSON.parse(readFileContent(file)) : null;
		},
		gravar: function (arquivo, doc) {
			saveTextFile(JSON.stringify(doc, null, '\t'), file.fsName);
			padConfigInvalidate();

			// confere o que foi gravado
			JSON.parse(readFileContent(new File(file.fsName)));
		}
	};
}

// Grava a lista compartilhada. a: { productions, stamp } — 'stamp' é a data do arquivo quando o editor o leu.
PADX.saveProductions = function (a) {
	if (padLocalForced()) throw new Error('#PAD_096 - modo local: a configuração da equipe fica na rede. desligue o modo local (configuração > meu usuário) para editar.');
	if (padConfigIsCopy()) throw new Error('#PAD_096 - sem a rede: a configuração aberta é a cópia deste computador, só para ler. tente de novo com a rede.');

	var file = padConfigFile();

	if (!file) throw new Error(padNoSharedListError());

	var adaptador = padConfigArquivo(file);
	var doc = null;

	try {
		doc = adaptador.ler();
	} catch (err) { }

	// as seções da tabela, limpas (lança a mensagem da limpeza sem gravar nada); as que não vierem ficam como estão
	var data = PAD_CONFIGURACAO.aplicar(doc, { producoes: a.productions || [], mapaDeDrives: a.drives, regraDoRenomear: a.rename, organizar: a.organize, buscaDeCaminhos: a.search, links: a.links, barra: a.bar, registroDeUso: a.log, aparencia: a.appearance, coletar: a.collect, bancoDeFontes: a.fonts });

	// os tipos de projeto ainda não estão na tabela: a limpeza usa os tokens do caminho do host (project.jsx)
	if (a.project) data.PROJECT = padCleanProject(a.project);

	if (file.exists && a.stamp && file.modified.getTime() != a.stamp) {
		throw new Error('#PAD_065 - a lista foi alterada por outra pessoa depois que você abriu o editor. use "recarregar" e refaça as alterações.');
	}

	// uma cópia da lista anterior, por segurança (lista compartilhada pela equipe)
	if (file.exists) {
		try {
			file.copy(file.fsName.replace(/\.json$/i, '') + '.bak.json');
		} catch (err) { }
	}

	try {
		adaptador.gravar(PAD_CONFIGURACAO.EQUIPE, data);
	} catch (err) {
		throw new Error('#PAD_055 - não foi possível gravar a lista: ' + err.message);
	}

	padDrivesCache.stamp = -1; // relê o que foi salvo
	padDrivesCache.checked = 0;

	return { stamp: new File(file.fsName).modified.getTime(), productions: data.PRODUCTIONS, log: padLerSecao('registroDeUso'), drives: padLerSecao('mapaDeDrives'), rename: padLerSecao('regraDoRenomear'), organize: padLerSecao('organizar'), search: padLerSecao('buscaDeCaminhos'), links: padLerSecao('links'), appearance: padLerSecao('aparencia'), project: padReadProject(), collect: padLerSecao('coletar'), bar: padLerSecao('barra'), fonts: padReadFonts(), personal: PADX.personalPrefs(), configPath: file.fsName };
};

// Lê uma lista de produções de um arquivo (importar). a: { path }
PADX.readProductionsFile = function (a) {
	var file = new File(a.path);

	if (!file.exists) throw new Error('#PAD_056 - arquivo não encontrado.');

	var data;

	try {
		data = JSON.parse(readFileContent(file));
	} catch (err) {
		throw new Error('#PAD_057 - o arquivo não é uma lista de produções válida.');
	}

	return { productions: PAD_CONFIGURACAO.limpar('producoes', data.PRODUCTIONS) };
};

// Grava a lista em outro arquivo (exportar). a: { path, productions }
PADX.writeProductionsFile = function (a) {
	PAD_CONFIGURACAO.gravar(padConfigArquivo(new File(a.path)), { producoes: a.productions });

	return { path: a.path };
};

// Caminho no formato de rede neutro ('//servidor/share/...'), como as listas existentes guardam.
PADX.canonicalPath = function (a) {
	return { path: normalizeNetworkPath(a.path, { forceWin: true, silent: true }) };
};

// Quais pastas existem (para o indicador de cada produção). a: { paths }
PADX.checkFolders = function (a) {
	var result = [];

	for (var i = 0; i < a.paths.length; i++) {
		try {
			result.push(new Folder(padPath(a.paths[i])).exists);
		} catch (err) {
			result.push(false);
		}
	}

	return { exists: result };
};

/*

---------------------------------------------------------------
> as seções da configuração da equipe
---------------------------------------------------------------

As seções da configuração da equipe (produções, mapa de drives, regra do renomear, organizar, busca de caminhos,
links e barra) ficam na tabela de seções (regras/configuracao.js): onde cada uma mora, o padrão, a limpeza e os
nomes antigos. Aqui, o que o host faz com elas: as globais do host (padApplyConfig) e os pedidos do painel.

*/

var padDrivesCache = { stamp: -1, checked: 0 };

function padTrim(value) {
	return String(value == null ? '' : value).replace(/^\s+|\s+$/g, '');
}

// Aplica a configuração compartilhada nas globais do host (drives e renomear). Confere o arquivo no
// máximo a cada 5 s, e só relê quando ele mudou.
function padApplyConfig() {
	var now = new Date().getTime();

	if (now - padDrivesCache.checked < 5000) return;

	padDrivesCache.checked = now;

	var file = padConfigFile();
	var stamp = 0;

	try {
		stamp = file && file.exists ? file.modified.getTime() : 0;
	} catch (err) { }

	if (stamp == padDrivesCache.stamp) return;

	padDrivesCache.stamp = stamp;

	var d = padLerSecao('mapaDeDrives');
	var map = {};
	var reverse = {};
	var shares = {};

	for (var i = 0; i < d.drives.length; i++) {
		map[d.drives[i].letter] = d.drives[i].path;
		reverse[d.drives[i].path] = d.drives[i].letter + ':';
	}

	for (var j = 0; j < d.shares.length; j++) shares[d.shares[j].share] = d.shares[j].server;

	DRIVE_MAP = map;
	UNC_TO_DRIVE = reverse;
	PAD_SHARE_SERVERS = shares;
	PAD_DEFAULT_SERVER = d.defaultServer;

	var r = padLerSecao('regraDoRenomear');

	PAD_RENAME_TYPES = r.types;
	PAD_RENAME_FIXED = r.fixed;
	PAD_RENAME_OPTIONS = { removeSpecial: r.removeSpecial !== false, textCase: r.textCase || 'upperCase' };
	globalSeparator = r.separator || ' - '; // também o dos nomes criados pelos templates
	renameRefArray = padRenameRefs(r.types);

	PAD_ORGANIZE = padLerSecao('organizar');

	// busca de caminhos: o endereço do webhook da busca e os caminhos fixos
	var search = padLerSecao('buscaDeCaminhos');

	PS_INDEX_URL = search.url;
	PS_CAMINHOS_FIXOS = search.caminhosFixos;
}

// Links pessoais: os do designer, só neste computador (a seção linksPessoais: 'personal_links.json' na pasta de dados
// do usuário), mesma forma e mesma limpeza dos da equipe.
PADX.personalLinks = function () {
	return { links: padLerSecao('linksPessoais') };
};

// a: { links }
PADX.savePersonalLinks = function (a) {
	try {
		padGravarSecoes({ linksPessoais: a.links || [] });
	} catch (err) {
		throw new Error(err.message.replace('#PAD_087 - links:', '#PAD_087 - meus links:'));
	}

	return { links: padLerSecao('linksPessoais') };
};

/*

---------------------------------------------------------------
> ferramentas da barra (aba LAYOUT da configuração)
---------------------------------------------------------------

'BAR' na configuração da equipe e em personal_config.json (a barra desta pessoa): as seções barra e barraPessoal da
tabela de seções (regras/configuracao.js), { items: [...], hidden: [...] }, a mesma limpeza.

*/

function padIndexOf(list, value) {
	for (var i = 0; i < list.length; i++) {
		if (list[i] == value) return i;
	}

	return -1;
}

// A barra desta pessoa: a personalizada (neste computador) ou, sem ela, a da equipe.
function padReadBar() {
	return padLerSecao('barraPessoal') || padLerSecao('barra');
}

// Links para a barra (os da equipe e os pessoais), com a data das duas listas (a barra só redesenha quando muda).
PADX.barLinks = function () {
	var personal = padArquivoDesteComputador(PAD_CONFIGURACAO.LINKS_PESSOAIS);
	var stamp = '';

	// a data da configuração vem do cache (padConfigData): sem perguntar de novo à rede
	try {
		padConfigData();
	} catch (err) { }

	try {
		stamp = PAD_CONFIG_CACHE.stamp + '|' + (personal.exists ? personal.modified.getTime() : 0) + '|' + padPersonalStamp();
	} catch (err) { }

	var bar = padReadBar();

	return { stamp: stamp, links: padLerSecao('links'), personal: padLerSecao('linksPessoais'), items: bar.items, hidden: bar.hidden, localMode: padLocalMode(), localForced: padLocalForced() };
};

// Pedido de aba feito pela barra (2 cliques numa ferramenta): a configuração acompanha o arquivo.
PADX.requestConfigTab = function (a) {
	saveTextFile(JSON.stringify({ tab: a.tab, stamp: new Date().getTime() }), scriptPreferencesPath + '/config_tab.json');

	return { tab: a.tab };
};

PADX.requestedConfigTab = function () {
	var file = new File(scriptPreferencesPath + '/config_tab.json');

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
> aparência (aba APARÊNCIA da configuração)
---------------------------------------------------------------

'APPEARANCE' no O_PADEIRO_GLOBAL_config.json (a seção aparencia da tabela de seções; a desta pessoa é a
aparenciaPessoal): o tema de todas as janelas (aplicado por client/js/theme.js).
  mode          → light, dark ou auto (segue o sistema)
  background    → gradient (degradê) ou solid (a cor de destaque)
  accent        → cor de destaque (#rrggbb); gradientStart / gradientEnd → as pontas do degradê
  font          → inter, system, helvetica, segoe, roboto, georgia ou mono
  logo          → PNG (literal de string binária, como o ícone das produções) no lugar do pãozinho; vazio = o pãozinho

*/

// A aparência desta pessoa: a personalizada (neste computador) ou, sem ela, a da equipe.
function padReadAppearance() {
	return padLerSecao('aparenciaPessoal') || padLerSecao('aparencia');
}

// O tema, com a data dos arquivos (as janelas só reaplicam quando mudam).
PADX.appearance = function () {
	var stamp = 0;

	try {
		padConfigData();
	} catch (err) { }

	stamp = PAD_CONFIG_CACHE.stamp + '|' + padPersonalStamp();

	return { stamp: stamp, appearance: padReadAppearance() };
};

/*

---------------------------------------------------------------
> preferências pessoais (aparência e layout, só neste computador)
---------------------------------------------------------------

'personal_config.json' na pasta de dados do usuário: { APPEARANCE, BAR }, só as que a pessoa personalizou.
Sem elas, vale o padrão da equipe (APPEARANCE e BAR do O_PADEIRO_GLOBAL_config.json, na rede).

*/

function padPersonalStamp() {
	return padDataDoArquivo(padArquivoDesteComputador(PAD_CONFIGURACAO.PESSOAL));
}

// { appearance, bar }: as personalizadas (null = usa o padrão da equipe)
PADX.personalPrefs = function () {
	return { appearance: padLerSecao('aparenciaPessoal'), bar: padLerSecao('barraPessoal') };
};

// a: { appearance, bar } (null = voltar ao padrão da equipe). O arquivo guarda só as personalizadas: é gravado de novo
// só com as que vierem (aplicar num documento vazio), sem as de antes.
PADX.savePersonalPrefs = function (a) {
	var doc = PAD_CONFIGURACAO.aplicar({}, { aparenciaPessoal: a.appearance, barraPessoal: a.bar });

	PAD_CONFIG_ADAPTADOR.gravar(PAD_CONFIGURACAO.PESSOAL, doc);

	return PADX.personalPrefs();
};
