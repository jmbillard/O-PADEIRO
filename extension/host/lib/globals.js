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

var renameRefArray = [
	(RODAPE = {
		prefix: 'RDP',
		comment: 'RODAPE',
		regExpStr: ['RODAP[EÉ](S)*', 'RDP(S)*']
	}),
	(CARTAO = {
		prefix: 'CRT',
		comment: 'CARTAO',
		regExpStr: ['CART[ÃA]O', 'CART[ÕO]ES', 'CRT(S)*']
	}),
	(LETTERING = {
		prefix: 'LETT',
		comment: 'LETTERING',
		regExpStr: ['LETTERING(S)*', 'LETT(S)*', 'LET(S)*']
	}),
	(CONFRONTO = {
		prefix: 'CONFRONTO',
		comment: 'CONFRONTO',
		regExpStr: ['CONFRONTO(S)*']
	}),
	(TARJA = {
		prefix: 'TARJA',
		comment: 'TARJA',
		regExpStr: ['TARJA(S)*', 'TRJ(S)*', 'TAR(S)*']
	}),
	(PASSAGEM = {
		prefix: 'PASSAGEM',
		comment: 'PASSAGEM',
		regExpStr: ['PASSAGEM(S)*', 'TRANSI[CÇ][ÃA]O', 'TRANSI[CÇ][ÕO]ES', 'LAPADA(S)*']
	}),
	(ASSINATURA = {
		prefix: 'ASSINA',
		comment: 'ASSINATURA',
		regExpStr: ['ASSINATURA(S)*', 'ASSINA(S)*', 'ASS']
	}),
	(FOTO = {
		prefix: 'FOTO',
		comment: 'FOTO',
		regExpStr: ['FOTO(S)*', 'IMG(S)*', '(IMAGEM|IMAGENS)']
	}),
	(REFERENCIA = {
		prefix: 'REF',
		comment: 'REFERENCIA',
		regExpStr: ['REFERENCIA(S)*', 'PREVIEW(S)*', '(REF|PREV)(S)*']
	})
];

var defaultTemplateConfigObj = {
	configName: 'NOME DA CONFIGURAÇÃO',
	exemple: 'INFORMAÇÃO 1\nINFORMAÇÃO 2',
	tip: 'coloque aqui as instruções de preenchimento deste template.\nex:\
\ndigite o texto em 1 ou 2 linhas.\
\nuse a quebra de linha para separar INFORMAÇÃO 1 e INFORMAÇÃO 2.\
\nuse 1 linha vazia para criar mais de 1 versão do mesmo template.',

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
