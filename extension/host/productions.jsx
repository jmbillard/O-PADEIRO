/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> editor da lista de produções (host)
---------------------------------------------------------------

A lista é o 'O_PADEIRO_GLOBAL_config.json' compartilhado pela equipe.
Como mais de uma pessoa pode editar, salvar confere se o arquivo mudou desde que o editor o leu.

*/

// A tabela de seções da configuração (regras/configuracao.js) lê e grava as seções da equipe por um adaptador: um
// documento (objeto) pelo nome do arquivo. Este é o dos arquivos do disco; o JSON fica aqui.

// Para ler: a configuração da equipe já lida (padConfigData, relida só quando o arquivo muda). Sem o arquivo ou com um
// JSON inválido, lança, e a tabela devolve o padrão da seção.
var PAD_CONFIG_LEITURA = {
	ler: function (arquivo) {
		return arquivo == PAD_CONFIGURACAO.EQUIPE ? padConfigData() : null;
	},
	gravar: function () {
		throw new Error('#PAD_099 - configuração: o adaptador de leitura não grava.');
	}
};

// Uma seção da configuração da equipe, limpa e completa (pela tabela).
function padLerSecao(nome) {
	return PAD_CONFIGURACAO.ler(PAD_CONFIG_LEITURA, nome);
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
	var data = PAD_CONFIGURACAO.aplicar(doc, { producoes: a.productions || [], mapaDeDrives: a.drives, regraDoRenomear: a.rename, organizar: a.organize, buscaDeCaminhos: a.search, links: a.links, barra: a.bar });
	// as que ainda não estão na tabela
	var others = {
		LOG: a.log ? padCleanLog(a.log) : null,
		APPEARANCE: a.appearance ? padCleanAppearance(a.appearance) : null,
		PROJECT: a.project ? padCleanProject(a.project) : null,
		COLLECT: a.collect ? padCleanCollect(a.collect) : null,
		FONTS: a.fonts ? padCleanFonts(a.fonts) : null
	};

	for (var key in others) {
		if (others[key] != null) data[key] = others[key];
	}

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

	return { stamp: new File(file.fsName).modified.getTime(), productions: data.PRODUCTIONS, log: padReadLogSettings(), drives: padLerSecao('mapaDeDrives'), rename: padLerSecao('regraDoRenomear'), organize: padLerSecao('organizar'), search: padLerSecao('buscaDeCaminhos'), links: padLerSecao('links'), appearance: padReadTeamAppearance(), project: padReadProject(), collect: padReadCollect(), bar: padLerSecao('barra'), fonts: padReadFonts(), personal: PADX.personalPrefs(), configPath: file.fsName };
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

// Links pessoais: os do designer, só neste computador (pasta de dados do usuário), mesma forma dos da equipe.
function padPersonalLinksFile() {
	return new File(scriptPreferencesPath + '/personal_links.json');
}

function padReadPersonalLinks() {
	var file = padPersonalLinksFile();

	if (!file.exists) return [];

	try {
		return PAD_CONFIGURACAO.limpar('links', JSON.parse(readFileContent(file)).LINKS || []);
	} catch (err) {
		return [];
	}
}

PADX.personalLinks = function () {
	return { links: padReadPersonalLinks() };
};

// a: { links }
PADX.savePersonalLinks = function (a) {
	var clean;

	try {
		clean = PAD_CONFIGURACAO.limpar('links', a.links || []);
	} catch (err) {
		throw new Error(err.message.replace('#PAD_087 - links:', '#PAD_087 - meus links:'));
	}

	saveTextFile(JSON.stringify({ LINKS: clean }, null, '\t'), padPersonalLinksFile().fsName);

	return { links: padReadPersonalLinks() };
};

/*

---------------------------------------------------------------
> ferramentas da barra (aba LAYOUT da configuração)
---------------------------------------------------------------

'BAR' na configuração da equipe (a tabela de seções, regras/configuracao.js: a seção barra) e em personal_config.json
(a barra desta pessoa): { items: [...], hidden: [...] }, a mesma limpeza.

*/

function padIndexOf(list, value) {
	for (var i = 0; i < list.length; i++) {
		if (list[i] == value) return i;
	}

	return -1;
}

// A barra desta pessoa: a personalizada (neste computador) ou, sem ela, a da equipe.
function padReadBar() {
	var mine = padPersonalData().BAR;

	if (mine) {
		try {
			return PAD_CONFIGURACAO.limpar('barra', mine);
		} catch (err) { }
	}

	return padLerSecao('barra');
}

// Links para a barra (os da equipe e os pessoais), com a data das duas listas (a barra só redesenha quando muda).
PADX.barLinks = function () {
	var personal = padPersonalLinksFile();
	var stamp = '';

	// a data da configuração vem do cache (padConfigData): sem perguntar de novo à rede
	try {
		padConfigData();
	} catch (err) { }

	try {
		stamp = PAD_CONFIG_CACHE.stamp + '|' + (personal.exists ? personal.modified.getTime() : 0) + '|' + padPersonalStamp();
	} catch (err) { }

	var bar = padReadBar();

	return { stamp: stamp, links: padLerSecao('links'), personal: padReadPersonalLinks(), items: bar.items, hidden: bar.hidden, localMode: padLocalMode(), localForced: padLocalForced() };
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

'APPEARANCE' no O_PADEIRO_GLOBAL_config.json: o tema de todas as janelas (aplicado por client/js/theme.js).
  mode          → light, dark ou auto (segue o sistema)
  background    → gradient (degradê) ou solid (a cor de destaque)
  accent        → cor de destaque (#rrggbb); gradientStart / gradientEnd → as pontas do degradê
  font          → inter, system, helvetica, segoe, roboto, georgia ou mono
  logo          → PNG (literal de string binária, como o ícone das produções) no lugar do pãozinho; vazio = o pãozinho

*/

var PAD_DEFAULT_APPEARANCE = {
	mode: 'light',
	background: 'gradient',
	accent: '#5184f8',
	gradientStart: '#67b7ff',
	gradientEnd: '#5649e9',
	font: 'inter',
	logo: ''
};

// Valida e normaliza a aparência vinda do painel. Lança Error com a mensagem.
function padCleanAppearance(o) {
	var d = PAD_DEFAULT_APPEARANCE;
	var clean = {
		mode: /^(light|dark|auto)$/.test(o.mode) ? o.mode : d.mode,
		background: o.background == 'solid' ? 'solid' : 'gradient',
		accent: padTrim(o.accent).toLowerCase(),
		gradientStart: padTrim(o.gradientStart).toLowerCase(),
		gradientEnd: padTrim(o.gradientEnd).toLowerCase(),
		font: /^(inter|system|helvetica|segoe|roboto|georgia|mono)$/.test(o.font) ? o.font : d.font,
		logo: o.logo ? String(o.logo) : ''
	};
	var names = { accent: 'cor de destaque', gradientStart: 'início do degradê', gradientEnd: 'fim do degradê' };

	for (var key in names) {
		if (!/^#[0-9a-f]{6}$/.test(clean[key])) throw new Error('#PAD_088 - aparência: ' + names[key] + ' inválida (use #rrggbb).');
	}

	return clean;
}

// A aparência da equipe (o padrão, na rede).
function padReadTeamAppearance() {
	try {
		var data = padConfigData();

		return data.APPEARANCE ? padCleanAppearance(data.APPEARANCE) : PAD_DEFAULT_APPEARANCE;
	} catch (err) {
		return PAD_DEFAULT_APPEARANCE;
	}
}

// A aparência desta pessoa: a personalizada (neste computador) ou, sem ela, a da equipe.
function padReadAppearance() {
	var mine = padPersonalData().APPEARANCE;

	if (mine) {
		try {
			return padCleanAppearance(mine);
		} catch (err) { }
	}

	return padReadTeamAppearance();
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

var PAD_PERSONAL_CACHE = { stamp: -1, data: {} };

function padPersonalConfigFile() {
	return new File(scriptPreferencesPath + '/personal_config.json');
}

function padPersonalStamp() {
	var file = padPersonalConfigFile();

	try {
		return file.exists ? file.modified.getTime() : 0;
	} catch (err) {
		return 0;
	}
}

function padPersonalData() {
	var stamp = padPersonalStamp();

	if (stamp != PAD_PERSONAL_CACHE.stamp) {
		PAD_PERSONAL_CACHE.stamp = stamp;
		PAD_PERSONAL_CACHE.data = {};

		if (stamp) {
			try {
				PAD_PERSONAL_CACHE.data = JSON.parse(readFileContent(padPersonalConfigFile())) || {};
			} catch (err) { }
		}
	}

	return PAD_PERSONAL_CACHE.data;
}

// { appearance, bar }: as personalizadas (null = usa o padrão da equipe)
PADX.personalPrefs = function () {
	var d = padPersonalData();
	var out = { appearance: null, bar: null };

	try {
		if (d.APPEARANCE) out.appearance = padCleanAppearance(d.APPEARANCE);
	} catch (err) { }

	try {
		if (d.BAR) out.bar = PAD_CONFIGURACAO.limpar('barra', d.BAR);
	} catch (err) { }

	return out;
};

// a: { appearance, bar } (null = voltar ao padrão da equipe)
PADX.savePersonalPrefs = function (a) {
	var data = {};

	if (a.appearance) data.APPEARANCE = padCleanAppearance(a.appearance);
	if (a.bar) data.BAR = PAD_CONFIGURACAO.limpar('barra', a.bar);

	var folder = new Folder(scriptPreferencesPath);

	if (!folder.exists) folder.create();

	saveTextFile(JSON.stringify(data, null, '\t'), padPersonalConfigFile().fsName);
	PAD_PERSONAL_CACHE.stamp = -1;

	return PADX.personalPrefs();
};
