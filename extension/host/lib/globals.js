// Variáveis globais: mapa das letras de drive da rede, termos de renomeação e config padrão dos templates.

// O mapa de drives, os volumes sem letra e o servidor padrão: os padrões da tabela de seções (regras/configuracao.js,
// a seção mapaDeDrives); a configuração da equipe troca (padApplyConfig, productions.jsx).
//   DRIVE_MAP          → letra do Windows → caminho de rede
//   UNC_TO_DRIVE       → caminho de rede → letra ('L:')
//   PAD_SHARE_SERVERS  → volumes (shares) sem letra: share → servidor, para converter /Volumes/SHARE em //servidor/SHARE
//   PAD_DEFAULT_SERVER → o servidor usado quando o share não está em nenhum dos mapas
var DRIVE_MAP = {};
var UNC_TO_DRIVE = {};
var PAD_SHARE_SERVERS = {};
var PAD_DEFAULT_SERVER = PAD_CONFIGURACAO.padrao('mapaDeDrives').defaultServer;

(function () {
	var d = PAD_CONFIGURACAO.padrao('mapaDeDrives');
	var i;

	for (i = 0; i < d.drives.length; i++) {
		DRIVE_MAP[d.drives[i].letter] = d.drives[i].path;
		UNC_TO_DRIVE[d.drives[i].path] = d.drives[i].letter + ':';
	}

	for (i = 0; i < d.shares.length; i++) PAD_SHARE_SERVERS[d.shares[i].share] = d.shares[i].server;
})();

// A regra do renomear (a aba RENOMEAR da configuração substitui): os padrões da tabela de seções
// (regras/configuracao.js, a seção regraDoRenomear).
//   PAD_RENAME_FORMATS   → os formatos: o prefixo do formato, a etiqueta da comp e os termos que reconhecem o formato
//                          no nome da comp ou da pasta (palavras; o plural com S também vale). vale o primeiro encontrado
//   PAD_RENAME_OPTIONS   → removeSpecial tira acentos e símbolos; textCase: upperCase, lowerCase, titleCase ou keep
//   PAD_RENAME_FIXED     → os nomes fixos: se o nome (ou a etiqueta) da comp contém o termo, ela passa a se chamar 'name'
//   PAD_RENAME_SEPARATOR → o separador entre o prefixo do formato e o resto (também o dos nomes criados pelos templates)
var PAD_RENAME_FORMATS = PAD_CONFIGURACAO.padrao('regraDoRenomear').formatos;
var PAD_RENAME_OPTIONS = { removeSpecial: PAD_CONFIGURACAO.padrao('regraDoRenomear').removeSpecial, textCase: PAD_CONFIGURACAO.padrao('regraDoRenomear').textCase };
var PAD_RENAME_FIXED = PAD_CONFIGURACAO.padrao('regraDoRenomear').fixed;

// Montada a partir de PAD_RENAME_FORMATS (padRenameRefs, em rename lib.js): { prefix, etiqueta }
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

var PAD_RENAME_SEPARATOR = PAD_CONFIGURACAO.padrao('regraDoRenomear').separator;

// os prefixos das mensagens do padeiro antigo (eram dois kaomojis): vazios. ficam definidos porque os scripts de
// template (_script.js, na rede) podem usar 'lol + texto'
var lol = '';

var relax = '';

// Um aviso para o painel, no lugar do alert() do padeiro antigo: o host nunca abre a caixa do After (alert, confirm,
// prompt). o texto entra na lista da chamada em andamento (PADX_alerts, api.jsx: res.notes, ou as messages de
// padGatherAlerts) e o painel mostra na linha de status ou no aviso da barra. fora de uma chamada, fica de fora
function padAviso(text) {
	if (typeof PADX_alerts == 'undefined' || !PADX_alerts) return;

	PADX_alerts.push(String(text).replace(/^\s+|\s+$/g, ''));
}

// Uma lista de nomes curta, para um aviso: 'a, b, c, d, e e mais 7' (max: quantos nomes mostrar; 5 sem ele)
function padListaCurta(names, max) {
	var n = max || 5;
	var shown = names.slice(0, n).join(', ');

	return names.length > n ? shown + ' e mais ' + (names.length - n) : shown;
}
