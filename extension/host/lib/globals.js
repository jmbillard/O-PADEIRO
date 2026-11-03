// Constantes globais: mapa das letras de drive da rede, termos de renomeação e config padrão dos templates.

var DRIVE_MAP = {
	L: "//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_l",
	K: "//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_k",
	T: "//egcdesign01.servicos.corp.tvglobo.com.br/cdesign",
	V: "//vfx-ml-sp.servicos.corp.tvglobo.com.br/EDIT_IN_PLACE",
	Y: "//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX",
	P: "//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_p"
};

var UNC_TO_DRIVE = {};

UNC_TO_DRIVE["//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_l"] = "L:";

UNC_TO_DRIVE["//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_k"] = "K:";

UNC_TO_DRIVE["//egcdesign01.servicos.corp.tvglobo.com.br/cdesign"] = "T:";

UNC_TO_DRIVE["//vfx-ml-sp.servicos.corp.tvglobo.com.br/EDIT_IN_PLACE"] = "V:";

UNC_TO_DRIVE["//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX"] = "Y:";

UNC_TO_DRIVE["//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_p"] = "P:";

// Volumes (shares) que não têm letra de drive: share → servidor, para converter /Volumes/SHARE em //servidor/SHARE.
var PAD_SHARE_SERVERS = {
	VFX: 'vfx-ml-sp.servicos.corp.tvglobo.com.br',
	cdesign: 'egcdesign01.servicos.corp.tvglobo.com.br',
	EDIT_IN_PLACE: 'vfx-ml-hp.servicos.corp.tvglobo.com.br',
	promo_ber: '10.193.48.13'
};

// Servidor usado quando o share não está em nenhum dos mapas.
var PAD_DEFAULT_SERVER = 'vfx-ml-sp.servicos.corp.tvglobo.com.br';

// Tipos de peça para renomear (a aba RENOMEAR da configuração substitui): prefixo do nome, comentário da comp e
// os termos que identificam o tipo no nome da comp ou da pasta (palavras; o plural com S também vale).
// A ordem importa: vale o primeiro tipo encontrado.
var PAD_RENAME_TYPES = [
	{ prefix: 'RDP', comment: 'RODAPE', terms: ['RODAPE', 'RDP'] },
	{ prefix: 'CRT', comment: 'CARTAO', terms: ['CARTAO', 'CARTOES', 'CRT'] },
	{ prefix: 'LETT', comment: 'LETTERING', terms: ['LETTERING', 'LETT', 'LET'] },
	{ prefix: 'CONFRONTO', comment: 'CONFRONTO', terms: ['CONFRONTO'] },
	{ prefix: 'TARJA', comment: 'TARJA', terms: ['TARJA', 'TRJ', 'TAR'] },
	{ prefix: 'PASSAGEM', comment: 'PASSAGEM', terms: ['PASSAGEM', 'TRANSICAO', 'TRANSICOES', 'LAPADA'] },
	{ prefix: 'ASSINA', comment: 'ASSINATURA', terms: ['ASSINATURA', 'ASSINA', 'ASS'] },
	{ prefix: 'FOTO', comment: 'FOTO', terms: ['FOTO', 'IMG', 'IMAGEM', 'IMAGENS'] },
	{ prefix: 'REF', comment: 'REFERENCIA', terms: ['REFERENCIA', 'PREVIEW', 'REF', 'PREV'] }
];

// Formato do nome: removeSpecial tira acentos e símbolos; textCase: upperCase, lowerCase, titleCase ou keep (como está).
// O prefixo do tipo fica sempre como foi escrito.
var PAD_RENAME_OPTIONS = { removeSpecial: true, textCase: 'upperCase' };

// Nomes fixos: se o nome (ou o comentário) da comp contém o termo, ela passa a se chamar 'name'.
var PAD_RENAME_FIXED = [{ match: 'LOGO GLOBO', name: 'LOGO GLOBO' }];

// Montada a partir de PAD_RENAME_TYPES (padRenameRefs, em rename lib.js): { prefix, comment, regExpStr: [...] }
var renameRefArray = [];

var defaultTemplateConfigObj = {
	configName: 'NOME DA CONFIGURAÇÃO',
	exemple: 'INFORMAÇÃO 1\nINFORMAÇÃO 2',
	tip: 'instruções de preenchimento deste template. ex:\n\ndigite o texto em 1 ou 2 linhas.\nuse a quebra de linha para separar INFORMAÇÃO 1 e INFORMAÇÃO 2.\n\nuse 1 linha vazia para criar mais de 1 versão do mesmo template.',

	compName: 'COMP TEMPLATE',
	prefix: 'TARJA',
	refTime: 2,
	separator: '\n',
	textCase: 'upperCase',
	inputLayers: [],

	importPath: '~/Downloads',
	outputPath: ['~/Desktop']
};

var globalSeparator = ' - ';

var lol = 'Σ(っ °Д °;)っ        ';

var relax = 'ヽ(✿ﾟ▽ﾟ)ノ        ';
