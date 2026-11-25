#!/usr/bin/env node
/*

---------------------------------------------------------------
> O PADEIRO — o teste das regras compartilhadas (extension/regras/)
---------------------------------------------------------------

As regras puras do domínio ficam em extension/regras/, em ES3, sem After e sem DOM (ADR 0005): o host carrega por
#include, o painel por <script> e este teste por require. Roda em Node, sem dependências, sem navegador e sem After.

Cada regra é carregada de dois jeitos (e o host tem de incluí-la em host/index.jsx):
  - em Node, por require (module.exports): os casos da regra;
  - como no ExtendScript: num contexto à parte, sem module e sem os métodos do ES5 que o ExtendScript não tem
    (forEach, map, filter, indexOf, Object.keys, trim, normalize…). A regra tem de carregar, virar um global e
    responder a um caso simples.

Para acrescentar uma regra: uma entrada em REGRAS (o arquivo, o global e os casos). Para acrescentar casos: mais
uma chamada a test() dentro dos casos da regra.

uso: node extension/scripts/test-regras.js   (sai com 1 se algum caso falhar)

*/

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const DIR = path.resolve(__dirname, '..', 'regras');

let failed = 0;
let passed = 0;

function test(name, fn) {
	try {
		fn();
		passed++;
		console.log('✓ ' + name);
	} catch (err) {
		failed++;
		console.log('✗ ' + name + '\n    ' + String(err && err.message ? err.message : err).split('\n').join('\n    '));
	}
}

function eq(got, want, msg) {
	assert.deepStrictEqual(got, want, msg);
}

// carrega a regra como o ExtendScript: sem module, o global no lugar de window, sem os métodos do ES5
function loadEs3(file, globalName) {
	const ctx = vm.createContext({});

	vm.runInContext(
		[
			'delete Array.prototype.forEach; delete Array.prototype.map; delete Array.prototype.filter;',
			'delete Array.prototype.indexOf; delete Array.prototype.some; delete Array.prototype.every;',
			'delete Array.prototype.reduce; delete Array.isArray; delete Object.keys; delete Object.create;',
			'delete String.prototype.trim; delete String.prototype.normalize; delete Function.prototype.bind;'
		].join('\n'),
		ctx
	);
	vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });

	return ctx[globalName];
}

// ---------------------------------------------------------------------------------------------------------------
// as regras
// ---------------------------------------------------------------------------------------------------------------

// os itens da lista do arquivista: [dir, nome, nome pedido (null = desligado), extras]
function itens(list) {
	return list.map(function (x, i) {
		return Object.assign({ id: i, dir: x[0], name: x[1], kind: 'file', ext: 'mov', want: x[2] }, x[3] || {});
	});
}

// id → 'situação nome final'
function finais(api, list, others) {
	const out = api.resolve(itens(list), others || {});

	return list.map(function (x, i) {
		return out[i].state + ' ' + out[i].name;
	});
}

// a regra do renomear da equipe, como vem de fábrica (padDefaultRename, host/productions.jsx ← host/lib/globals.js)
const RENOMEAR_PADRAO = {
	types: [
		{ prefix: 'RDP', comment: 'RODAPE', terms: ['RODAPE', 'RDP'] },
		{ prefix: 'CRT', comment: 'CARTAO', terms: ['CARTAO', 'CARTOES', 'CRT'] },
		{ prefix: 'LETT', comment: 'LETTERING', terms: ['LETTERING', 'LETT', 'LET'] },
		{ prefix: 'CONFRONTO', comment: 'CONFRONTO', terms: ['CONFRONTO'] },
		{ prefix: 'TARJA', comment: 'TARJA', terms: ['TARJA', 'TRJ', 'TAR'] },
		{ prefix: 'PASSAGEM', comment: 'PASSAGEM', terms: ['PASSAGEM', 'TRANSICAO', 'TRANSICOES', 'LAPADA'] },
		{ prefix: 'ASSINA', comment: 'ASSINATURA', terms: ['ASSINATURA', 'ASSINA', 'ASS'] },
		{ prefix: 'FOTO', comment: 'FOTO', terms: ['FOTO', 'IMG', 'IMAGEM', 'IMAGENS'] },
		{ prefix: 'REF', comment: 'REFERENCIA', terms: ['REFERENCIA', 'PREVIEW', 'REF', 'PREV'] }
	],
	fixed: [{ match: 'LOGO GLOBO', name: 'LOGO GLOBO' }],
	removeSpecial: true,
	textCase: 'upperCase',
	separator: ' - '
};

// a regra padrão com outros ajustes (caixa, separador, especiais, nomes fixos)
function regra(changes) {
	return Object.assign(JSON.parse(JSON.stringify(RENOMEAR_PADRAO)), changes || {});
}

// 'nome novo · comentário do formato (ou -) · fixo'
function renomeia(api, name, opts, rule) {
	const r = api.rename(rule || RENOMEAR_PADRAO, name, opts);

	return r.name + ' · ' + (r.comment || '-') + (r.fixed ? ' · fixo' : '');
}

const REGRAS = [
	{
		arquivo: 'regra-do-renomear.js',
		global: 'PAD_REGRA_DO_RENOMEAR',
		titulo: 'a regra do renomear (o etiquetador, os outputs da fila, a prévia da configuração)',
		casos: function (api) {
			test('o termo de formato no nome vira o prefixo do formato, com o separador', function () {
				eq(renomeia(api, 'rodapé_joão silva'), 'RDP - JOAO SILVA · RODAPE');
				eq(renomeia(api, '_RDP_convidado João Gomes'), 'RDP - CONVIDADO JOAO GOMES · RODAPE');
				eq(renomeia(api, 'jogo rodapé final'), 'RDP - JOGO FINAL · RODAPE');
				eq(renomeia(api, 'tarja_patrocínio  v2'), 'TARJA - PATROCINIO V2 · TARJA');
				eq(renomeia(api, 'imagem_01'), 'FOTO - 01 · FOTO');
				eq(renomeia(api, 'preview final'), 'REF - FINAL · REFERENCIA');
			});

			test('o plural com S também vale, e o termo só vale como palavra inteira', function () {
				eq(renomeia(api, 'RODAPES jogo'), 'RDP - JOGO · RODAPE');
				eq(renomeia(api, 'assets mapa'), 'ASSETS MAPA · -');
			});

			test('só o termo: o nome fica só com o prefixo do formato', function () {
				eq(renomeia(api, 'rodape'), 'RDP · RODAPE');
				eq(renomeia(api, 'CRT'), 'CRT · CARTAO');
			});

			test('a pasta com termo dá o formato (a mais próxima primeiro, e ela vence o nome)', function () {
				eq(renomeia(api, 'joao silva', { folders: ['RODAPES'] }), 'RDP - JOAO SILVA · RODAPE');
				eq(renomeia(api, 'joao', { folders: ['X', 'CARTOES'] }), 'CRT - JOAO · CARTAO');
				eq(renomeia(api, 'rdp joao', { folders: ['CARTOES'] }), 'CRT - JOAO · CARTAO');
			});

			test('a pasta só vale quando começa com o termo (ASSETS não é ASS)', function () {
				eq(renomeia(api, 'joao silva', { folders: ['ASSETS'] }), 'JOAO SILVA · -');
			});

			test('formato só pelo nome do item (o arquivista): a pasta com termo não dá o prefixo', function () {
				eq(renomeia(api, 'joao silva', { folders: ['RODAPES'], itemOnly: true }), 'JOAO SILVA · -');
				eq(renomeia(api, 'jogo rodapé final', { folders: ['CARTOES'], itemOnly: true }), 'RDP - JOGO FINAL · RODAPE');
			});

			test('o nome fixo LOGO GLOBO vence o formato', function () {
				eq(renomeia(api, 'logo_globo_branco'), 'LOGO GLOBO · - · fixo');
				eq(renomeia(api, 'rdp logo globo'), 'LOGO GLOBO · RODAPE · fixo');
			});

			test('o nome fixo pelo comentário da comp, só quando o nome não tem formato', function () {
				eq(renomeia(api, 'abertura', { comment: 'LOGO GLOBO v2' }), 'LOGO GLOBO · - · fixo');
				eq(renomeia(api, 'rdp abertura', { comment: 'LOGO GLOBO' }), 'RDP - ABERTURA · RODAPE');
			});

			test('o nome fixo sai como está na regra (como o After grava hoje), sem normalizar', function () {
				eq(renomeia(api, 'logo globo', null, regra({ fixed: [{ match: 'LOGO GLOBO', name: 'Logo  Globo' }] })), 'Logo  Globo · - · fixo');
			});

			test('o nome já no padrão fica igual', function () {
				eq(renomeia(api, 'CRT - AMANHA'), 'CRT - AMANHA · CARTAO');
				eq(renomeia(api, 'RDP - JOAO SILVA'), 'RDP - JOAO SILVA · RODAPE');
			});

			test('a caixa: minúsculas, título e como está (o prefixo do formato fica como foi escrito)', function () {
				eq(renomeia(api, 'rdp_joão', null, regra({ textCase: 'lowerCase' })), 'RDP - joao · RODAPE');
				eq(renomeia(api, 'cartão joão da silva', null, regra({ textCase: 'titleCase' })), 'CRT - Joao Da Silva · CARTAO');
				eq(renomeia(api, 'cartão joão Da silva', null, regra({ textCase: 'keep' })), 'CRT - joao Da silva · CARTAO');
			});

			test('o separador da regra', function () {
				eq(renomeia(api, 'rodape joao', null, regra({ separator: '_' })), 'RDP_JOAO · RODAPE');
			});

			test('os especiais: tirados (acentos e símbolos) ou mantidos', function () {
				eq(renomeia(api, 'rodapé joão (final)!'), 'RDP - JOAO FINAL · RODAPE');
				eq(renomeia(api, '  !!abc!! '), 'ABC · -');
				eq(renomeia(api, 'rdp ñandu'), 'RDP - ANDU · RODAPE');
				eq(renomeia(api, 'rodapé joão (final)', null, regra({ removeSpecial: false })), 'RDP - JOÃO (FINAL) · RODAPE');
			});

			test('o formato devolvido: o prefixo e o comentário; sem formato, null', function () {
				eq(api.rename(RENOMEAR_PADRAO, 'crt hoje').format, { prefix: 'CRT', comment: 'CARTAO' });
				eq(api.rename(RENOMEAR_PADRAO, 'hoje').format, null);
			});

			test('a formatação sozinha (a forminha): especiais e caixa, sem formato', function () {
				eq(api.format(RENOMEAR_PADRAO, 'joão_da silva!'), 'JOAO DA SILVA');
				eq(api.format(regra({ textCase: 'keep', removeSpecial: false }), 'joão_da  silva'), 'joão da silva');
			});

			test('a regra preparada uma vez (compile) dá o mesmo nome', function () {
				const c = api.compile(RENOMEAR_PADRAO);

				eq(api.rename(c, 'rodapé_joão silva').name, 'RDP - JOAO SILVA');
				eq(api.format(c, 'joão'), 'JOAO');
			});

			test('o normalizar da tabela (maiúsculas, sem acentos nem símbolos), o mesmo da limpeza do host', function () {
				eq(api.normalize('  rodapé  dos jogos! '), 'RODAPE DOS JOGOS');
				eq(api.normalize('logo_globo'), 'LOGO GLOBO');
			});
		},
		es3: function (api) {
			eq(api.rename(RENOMEAR_PADRAO, 'rodapé_joão silva', { folders: ['CARTOES'] }).name, 'CRT - JOAO SILVA');
			eq(api.rename(regra({ textCase: 'titleCase' }), 'logo globo  ').name, 'LOGO GLOBO');
			eq(api.format(regra({ textCase: 'titleCase' }), 'joão da  silva'), 'Joao Da Silva');
		}
	},

	{
		arquivo: 'nomes-repetidos.js',
		global: 'PAD_NOMES_REPETIDOS',
		titulo: 'nomes repetidos do arquivista (o _2)',
		casos: function (api) {
			test('dois que dariam o mesmo nome: o que já está no padrão fica, o outro ganha _2', function () {
				eq(finais(api, [['', '_crt_amanha', 'CRT - AMANHA'], ['', 'CRT - AMANHA', 'CRT - AMANHA']]), ['dup CRT - AMANHA_2', 'same CRT - AMANHA']);
			});

			test('dois que mudam para o mesmo nome: o primeiro fica, o segundo ganha _2', function () {
				eq(finais(api, [['', 'crt hoje', 'CRT - HOJE'], ['', 'crt_hoje', 'CRT - HOJE']]), ['chg CRT - HOJE', 'dup CRT - HOJE_2']);
			});

			test('com X e X_2 já existindo, o novo vira X_3', function () {
				eq(finais(api, [['', '_crt_amanha', 'CRT - AMANHA'], ['', 'CRT - AMANHA', 'CRT - AMANHA'], ['', 'CRT - AMANHA_2', 'CRT - AMANHA_2']])[0], 'dup CRT - AMANHA_3');
			});

			test('a caixa não diferencia: o desligado conta com o nome de hoje', function () {
				eq(finais(api, [['', 'logo globo', null, { ext: 'png' }], ['', 'logo_globo_preto', 'LOGO GLOBO', { ext: 'png' }]]), ['off logo globo', 'dup LOGO GLOBO_2']);
			});

			test('os acentos: o separado do macOS (NFD) é o mesmo nome do junto (NFC)', function () {
				eq(finais(api, [['', 'CAFÉ', null], ['', 'cafe', 'CAFÉ']])[1], 'dup CAFÉ_2');
			});

			test('os nomes do disco fora da lista contam', function () {
				eq(finais(api, [['', 'a_crt hoje', 'CRT - HOJE']], { '': ['crt - hoje.mov'] }), ['dup CRT - HOJE_2']);
			});

			test('só dentro da mesma pasta: em pastas diferentes não ganha _2', function () {
				eq(finais(api, [['', 'crt hoje', 'CRT - HOJE'], ['sub', 'crt_hoje', 'CRT - HOJE']]), ['chg CRT - HOJE', 'chg CRT - HOJE']);
			});

			test('nome vazio ou com caractere inválido fica de fora, sem sufixo', function () {
				eq(finais(api, [['', 'a', 'A: B'], ['', 'b', '']]), ['bad a', 'bad b']);
			});

			test('a sequência compara pelos quadros: a de nome igual ao de outra ganha _2', function () {
				const seq = { kind: 'seq', ext: 'png', sep: '_', pad: 4 };

				eq(finais(api, [['', 'rodape_jogo', 'RDP - JOGO', seq], ['', 'RDP - JOGO', 'RDP - JOGO', seq]]), ['dup RDP - JOGO_2', 'same RDP - JOGO']);
				eq(api.tail(Object.assign({ name: 'X' }, seq)), '_####.png');
			});
		},
		es3: function (api) {
			eq(finais(api, [['', 'crt hoje', 'CRT - HOJE'], ['', 'crt_hoje', ' CRT - HOJE ']]), ['chg CRT - HOJE', 'dup CRT - HOJE_2']);
			eq(finais(api, [['', 'a', null]], { '': ['x.mov'] }), ['off a']);
		}
	}
];

// ---------------------------------------------------------------------------------------------------------------
// a tabela de seções da configuração (regras/configuracao.js), com um adaptador em memória
// ---------------------------------------------------------------------------------------------------------------

const EQUIPE = 'O_PADEIRO_GLOBAL_config.json';

// o adaptador em memória: um documento por nome; guarda cópias (como um arquivo) e conta as gravações
function memoria(docs) {
	const disco = {};

	Object.keys(docs || {}).forEach(function (k) {
		disco[k] = JSON.stringify(docs[k]);
	});

	return {
		disco: disco,
		gravacoes: 0,
		ler: function (nome) {
			return disco.hasOwnProperty(nome) ? JSON.parse(disco[nome]) : null;
		},
		gravar: function (nome, doc) {
			this.gravacoes++;
			disco[nome] = JSON.stringify(doc);
		},
		doc: function (nome) {
			return disco.hasOwnProperty(nome) ? JSON.parse(disco[nome]) : null;
		}
	};
}

function copia(x) {
	return JSON.parse(JSON.stringify(x));
}

function lancaErro(fn, re) {
	assert.throws(fn, function (err) {
		return re.test(err.message);
	});
}

REGRAS.push({
	arquivo: 'configuracao.js',
	global: 'PAD_CONFIGURACAO',
	titulo: 'a tabela de seções da configuração',
	casos: function (api) {
		test('as seções da equipe moram no arquivo da equipe, cada uma na sua chave', function () {
			const onde = {};

			['producoes', 'mapaDeDrives', 'regraDoRenomear', 'organizar', 'buscaDeCaminhos', 'links', 'barra'].forEach(function (nome) {
				const s = api.secao(nome);

				onde[nome] = s.onde + ' ' + s.arquivo + ' ' + s.chave;
			});
			eq(onde, {
				producoes: 'equipe ' + EQUIPE + ' PRODUCTIONS',
				mapaDeDrives: 'equipe ' + EQUIPE + ' DRIVES',
				regraDoRenomear: 'equipe ' + EQUIPE + ' RENAME',
				organizar: 'equipe ' + EQUIPE + ' ORGANIZE',
				buscaDeCaminhos: 'equipe ' + EQUIPE + ' SEARCH',
				links: 'equipe ' + EQUIPE + ' LINKS',
				barra: 'equipe ' + EQUIPE + ' BAR'
			});
		});

		// sem nada: o padrão
		test('produções, sem nada: a lista vazia', function () {
			eq(api.ler(memoria(), 'producoes'), []);
		});

		test('sem o arquivo da equipe (o adaptador lança, como sem a rede): o padrão', function () {
			const fora = { ler: function () { throw new Error('#PAD_064 - sem a rede'); }, gravar: function () {} };

			eq(api.ler(fora, 'links').length, 1);
			eq(api.ler(fora, 'producoes'), []);
		});

		test('mapa de drives, sem nada: as letras, os volumes e o servidor de sempre', function () {
			const d = api.ler(memoria(), 'mapaDeDrives');

			eq(d.drives.map(function (x) { return x.letter; }).join(''), 'LKTVYP');
			eq(d.drives[0], { letter: 'L', path: '//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_l' });
			eq(d.shares.map(function (x) { return x.share; }), ['VFX', 'cdesign', 'EDIT_IN_PLACE', 'promo_ber']);
			eq(d.defaultServer, 'vfx-ml-sp.servicos.corp.tvglobo.com.br');
		});

		test('regra do renomear, sem nada: os 9 formatos, LOGO GLOBO, maiúsculas e " - "', function () {
			const r = api.ler(memoria(), 'regraDoRenomear');

			eq(r.types.map(function (t) { return t.prefix; }), ['RDP', 'CRT', 'LETT', 'CONFRONTO', 'TARJA', 'PASSAGEM', 'ASSINA', 'FOTO', 'REF']);
			eq(r.types[1], { prefix: 'CRT', comment: 'CARTAO', terms: ['CARTAO', 'CARTOES', 'CRT'] });
			eq(r.fixed, [{ match: 'LOGO GLOBO', name: 'LOGO GLOBO' }]);
			eq([r.removeSpecial, r.textCase, r.separator], [true, 'upperCase', ' - ']);
		});

		test('organizar, sem nada: as pastas e os comentários de sempre', function () {
			const o = api.ler(memoria(), 'organizar');

			eq(o.folders.length, 9);
			eq(o.folders[4], { name: 'IMAGENS', parent: '03 ARQUIVOS', contents: ['imagens', 'sequencias'] });
			eq([o.renderComments, o.editComments, o.autoComment, o.commentSubfolders], [['EXPORT', 'LOGO GLOBO', 'TEMPLATE'], ['EDIT'], 'EXPORTAR', true]);
			eq(o.fileTags, ['FUNDO', 'LOGO', 'FOTO', 'TRILHA', 'LOC']);
		});

		test('busca de caminhos, sem nada: o webhook e os dois caminhos fixos, com barras normais', function () {
			eq(api.ler(memoria(), 'buscaDeCaminhos'), {
				url: 'https://workflows.jmbillard.com/webhook/buscar',
				caminhosFixos: [
					{ name: '#INGEST', path: '//cpp-ml-sp.servicos.corp.tvglobo.com.br/PROMO_REDE/CPP_JB_PROMO/#INGEST' },
					{ name: 'BASES VALENDO', path: '//cpp-ml-sp.servicos.corp.tvglobo.com.br/PROMO_REDE/CPP_JB_PROMO/HOME OFFICE - NAO APAGAR/BASES E VALENDO' }
				]
			});
		});

		test('links, sem nada: o apontamento de projetos', function () {
			const l = api.ler(memoria(), 'links');

			eq(l.length, 1);
			eq(l[0].name, 'apontamento de projetos');
		});

		test('barra, sem nada: a ordem de sempre, nada escondido', function () {
			eq(api.ler(memoria(), 'barra'), {
				items: ['preencher', 'duplicar', 'criar-template', 'divider', 'projeto', 'fontes', 'coletar', 'render', 'divider', 'renomear', 'organizar', 'arquivos', 'divider', 'pastas', 'buscar', 'importar', 'logo-globo'],
				hidden: []
			});
		});

		test('o padrão devolvido é uma cópia: mexer nele não muda a próxima leitura', function () {
			api.ler(memoria(), 'regraDoRenomear').types.length = 0;
			api.padrao('organizar').folders.pop();
			eq(api.ler(memoria(), 'regraDoRenomear').types.length, 9);
			eq(api.padrao('organizar').folders.length, 9);
		});

		// campos faltando ou inválidos: limpo
		test('produções: espaços saem, o ícone vazio vira "" e a linha sem nome, sem pasta ou repetida fica de fora', function () {
			const m = memoria({ [EQUIPE]: { PRODUCTIONS: [
				{ name: ' DIA-A-DIA ', templatesPath: ' //srv/TEMPLATES ', icon: null },
				{ name: '', templatesPath: '//srv/X' },
				{ name: 'SEM PASTA' },
				{ name: 'dia-a-dia', templatesPath: '//srv/Y' },
				{ name: 'EVENTO', templatesPath: '//srv/EVENTO', icon: 'tv' }
			] } });

			eq(api.ler(m, 'producoes'), [{ name: 'DIA-A-DIA', icon: '', templatesPath: '//srv/TEMPLATES' }, { name: 'EVENTO', icon: 'tv', templatesPath: '//srv/EVENTO' }]);
		});

		test('produções: gravar uma lista vazia, sem nome, sem pasta ou com nome repetido lança o erro', function () {
			lancaErro(function () { api.gravar(memoria(), { producoes: [] }); }, /^#PAD_051/);
			lancaErro(function () { api.gravar(memoria(), { producoes: [{ name: ' ', templatesPath: '//a/b' }] }); }, /^#PAD_052/);
			lancaErro(function () { api.gravar(memoria(), { producoes: [{ name: 'A' }] }); }, /^#PAD_053/);
			lancaErro(function () { api.gravar(memoria(), { producoes: [{ name: 'A', templatesPath: '//a' }, { name: 'a', templatesPath: '//b' }] }); }, /^#PAD_054/);
		});

		test('mapa de drives: a letra com ":" e a barra invertida são limpas; um drive que não é de rede volta ao padrão', function () {
			const m = memoria({ [EQUIPE]: { DRIVES: { drives: [{ letter: 'x: ', path: '\\\\srv\\share\\pasta\\' }], shares: [{ share: '/VOL/', server: 'srv' }], defaultServer: '//srv//' } } });

			eq(api.ler(m, 'mapaDeDrives'), { drives: [{ letter: 'X', path: '//srv/share/pasta' }], shares: [{ share: 'VOL', server: 'srv' }], defaultServer: 'srv' });
			eq(api.ler(memoria({ [EQUIPE]: { DRIVES: { drives: [{ letter: 'L', path: 'C:/local' }] } } }), 'mapaDeDrives').drives.length, 6);
			lancaErro(function () { api.gravar(memoria(), { mapaDeDrives: { drives: [{ letter: 'L', path: 'C:/local' }] } }); }, /^#PAD_080/);
		});

		test('regra do renomear: termos em texto, acentos e caixa são limpos; caixa desconhecida vira maiúsculas', function () {
			const m = memoria({ [EQUIPE]: { RENAME: { types: [{ prefix: ' rdp ', comment: 'rodapé', terms: 'rodapé,  ,  rdp ' }], fixed: [{ match: 'logo  globo', name: 'Logo Globo' }], textCase: 'gritando' } } });

			eq(api.ler(m, 'regraDoRenomear'), { types: [{ prefix: 'RDP', comment: 'RODAPE', terms: ['RODAPE', 'RDP'] }], fixed: [{ match: 'LOGO GLOBO', name: 'LOGO GLOBO' }], removeSpecial: true, textCase: 'upperCase', separator: ' - ' });
			lancaErro(function () { api.gravar(memoria(), { regraDoRenomear: { types: [{ prefix: '', comment: 'X', terms: ['X'] }] } }); }, /^#PAD_082 - renomear: o formato 1 precisa de um prefixo/);
			lancaErro(function () { api.gravar(memoria(), { regraDoRenomear: { separator: '/' } }); }, /^#PAD_082/);
		});

		test('organizar: sem version, as sequências vão para a pasta das imagens; sem etiquetas, as do padrão', function () {
			const m = memoria({ [EQUIPE]: { ORGANIZE: { folders: [{ name: ' comps ', content: 'render' }, { name: 'imgs', parent: '', contents: ['imagens'] }], renderComments: 'export, template', autoComment: 'exportar', dataExtensions: '*.CSV, json' } } });

			eq(api.ler(m, 'organizar'), {
				folders: [{ name: 'comps', parent: '', contents: ['render'] }, { name: 'imgs', parent: '', contents: ['imagens', 'sequencias'] }],
				renderComments: ['EXPORT', 'TEMPLATE'],
				editComments: ['EDIT'],
				autoComment: 'EXPORTAR',
				dataExtensions: ['.csv', '.json'],
				commentSubfolders: true,
				fileTags: ['FUNDO', 'LOGO', 'FOTO', 'TRILHA', 'LOC'],
				version: 2
			});
			lancaErro(function () { api.gravar(memoria(), { organizar: { folders: [], renderComments: ['EXPORT'], autoComment: 'NADA' } }); }, /^#PAD_085/);
		});

		test('organizar: a pasta pai que não existe volta ao padrão na leitura', function () {
			eq(api.ler(memoria({ [EQUIPE]: { ORGANIZE: { folders: [{ name: 'A', parent: 'B' }], renderComments: ['EXPORT'], autoComment: 'EXPORT' } } }), 'organizar').folders.length, 9);
		});

		test('busca de caminhos: o url vazio vira o padrão, a linha vazia sai e as barras são normalizadas', function () {
			const m = memoria({ [EQUIPE]: { SEARCH: { url: ' ', caminhosFixos: [{ name: ' INGEST ', path: '\\\\srv\\INGEST\\' }, { name: '', path: '' }] } } });

			eq(api.ler(m, 'buscaDeCaminhos'), { url: 'https://workflows.jmbillard.com/webhook/buscar', caminhosFixos: [{ name: 'INGEST', path: '//srv/INGEST' }] });
			eq(api.ler(memoria({ [EQUIPE]: { SEARCH: { indice: 'formato antigo' } } }), 'buscaDeCaminhos').caminhosFixos.length, 2);
			lancaErro(function () { api.gravar(memoria(), { buscaDeCaminhos: { url: 'ftp://x', caminhosFixos: [] } }); }, /^#PAD_086/);
		});

		test('links: espaços saem; um link sem endereço volta ao padrão na leitura e lança o erro ao gravar', function () {
			eq(api.ler(memoria({ [EQUIPE]: { LINKS: [{ name: ' meu   link ', url: ' https://x.com ' }] } }), 'links'), [{ name: 'meu link', url: 'https://x.com', icon: '' }]);
			eq(api.ler(memoria({ [EQUIPE]: { LINKS: [] } }), 'links'), []);
			eq(api.ler(memoria({ [EQUIPE]: { LINKS: [{ name: 'x', url: 'sem' }] } }), 'links')[0].name, 'apontamento de projetos');
			lancaErro(function () { api.gravar(memoria(), { links: [{ name: 'x', url: 'sem' }] }); }, /^#PAD_087/);
		});

		test('barra: a ferramenta desconhecida sai, a que falta entra no fim e o escondido desconhecido sai', function () {
			const m = memoria({ [EQUIPE]: { BAR: { items: ['divider', 'buscar', 'nova', 'organizar', 'divider', 'divider', 'pastas'], hidden: ['links', 'xyz', 'gaveta:projeto'] } } });

			eq(api.ler(m, 'barra'), {
				items: ['buscar', 'organizar', 'renomear', 'arquivos', 'divider', 'pastas', 'preencher', 'duplicar', 'criar-template', 'projeto', 'fontes', 'coletar', 'render', 'importar', 'logo-globo'],
				hidden: ['links', 'gaveta:projeto']
			});
		});

		// nome antigo: lido, e a gravação seguinte usa o novo
		test('busca de caminhos: "servidor" (o nome antigo dos caminhos fixos) é lido; gravar grava só "caminhosFixos"', function () {
			const m = memoria({ [EQUIPE]: { SEARCH: { url: 'https://x.com/busca', servidor: [{ name: 'INGEST', path: '//srv/INGEST' }] } } });
			const lida = api.ler(m, 'buscaDeCaminhos');

			eq(lida, { url: 'https://x.com/busca', caminhosFixos: [{ name: 'INGEST', path: '//srv/INGEST' }] });
			api.gravar(m, { buscaDeCaminhos: lida });
			eq(m.doc(EQUIPE).SEARCH, { url: 'https://x.com/busca', caminhosFixos: [{ name: 'INGEST', path: '//srv/INGEST' }] });
		});

		test('busca de caminhos: com os dois nomes, vale o novo', function () {
			const m = memoria({ [EQUIPE]: { SEARCH: { url: 'https://x.com', servidor: [{ name: 'VELHO', path: '//a/b' }], caminhosFixos: [{ name: 'NOVO', path: '//a/c' }] } } });

			eq(api.ler(m, 'buscaDeCaminhos').caminhosFixos[0].name, 'NOVO');
		});

		test('organizar: a pasta com "content" (o campo antigo, um conteúdo só) é lida; gravar grava só "contents"', function () {
			const m = memoria({ [EQUIPE]: { ORGANIZE: { folders: [{ name: 'COMPS', parent: '', content: 'render' }], renderComments: ['EXPORT'], autoComment: 'EXPORTAR', version: 2 } } });

			api.gravar(m, { organizar: api.ler(m, 'organizar') });
			eq(m.doc(EQUIPE).ORGANIZE.folders, [{ name: 'COMPS', parent: '', contents: ['render'] }]);
		});

		test('barra: o formato antigo ("templates") é lido; gravar grava o de agora', function () {
			const m = memoria({ [EQUIPE]: { BAR: { items: ['templates', 'divider', 'pastas'], hidden: ['templates'] } } });

			api.gravar(m, { barra: api.ler(m, 'barra') });
			eq(m.doc(EQUIPE).BAR.items.slice(0, 5), ['preencher', 'duplicar', 'criar-template', 'divider', 'pastas']);
			eq(m.doc(EQUIPE).BAR.hidden, ['gaveta:templates']);
		});

		test('uma chave antiga da seção (antigos) é lida quando a nova não existe; a gravação apaga a antiga', function () {
			const t = api.criar([{ nome: 'links', onde: 'equipe', arquivo: EQUIPE, chave: 'LINKS', antigos: ['LINKS_V1'], padrao: function () { return []; }, limpar: function (v) { return v; } }]);
			const m = memoria({ [EQUIPE]: { LINKS_V1: [{ name: 'a' }], OUTRA: 1 } });

			eq(t.ler(m, 'links'), [{ name: 'a' }]);
			t.gravar(m, { links: t.ler(m, 'links') });
			eq(m.doc(EQUIPE), { OUTRA: 1, LINKS: [{ name: 'a' }] });
		});

		// salvar uma seção não mexe nas outras
		test('salvar uma seção não mexe nas outras (nem nas chaves de fora da tabela)', function () {
			const antes = {
				PRODUCTIONS: [{ name: 'DIA-A-DIA', icon: '', templatesPath: '//srv/T' }],
				LOG: { mode: 'off' },
				DRIVES: { drives: [], shares: [], defaultServer: 'srv' },
				RENAME: { types: [], fixed: [] },
				ORGANIZE: { quebrado: true },
				SEARCH: { url: 'https://x.com', servidor: [] },
				LINKS: [{ name: 'a', url: 'https://a.com', icon: '' }],
				BAR: { items: ['pastas'], hidden: [] },
				APPEARANCE: { mode: 'dark' }
			};

			['producoes', 'mapaDeDrives', 'regraDoRenomear', 'organizar', 'buscaDeCaminhos', 'links', 'barra'].forEach(function (nome) {
				const m = memoria({ [EQUIPE]: antes });
				const chave = api.secao(nome).chave;
				const esperado = copia(antes);

				api.gravar(m, { [nome]: api.padrao(nome).length === 0 ? [{ name: 'X', url: 'https://x.com', templatesPath: '//x/y' }] : api.padrao(nome) });

				const depois = m.doc(EQUIPE);

				delete esperado[chave];
				delete depois[chave];
				eq(depois, esperado, nome + ' mexeu nas outras');
				eq(m.gravacoes, 1);
			});
		});

		test('gravar várias seções grava o arquivo uma vez; um valor que não serve não grava nada', function () {
			const m = memoria({ [EQUIPE]: { LOG: { mode: 'off' } } });
			const r = api.gravar(m, { links: [{ name: ' a ', url: 'https://a.com' }], barra: {} });

			eq(m.gravacoes, 1);
			eq(r.links, [{ name: 'a', url: 'https://a.com', icon: '' }]);
			eq(Object.keys(m.doc(EQUIPE)), ['LOG', 'LINKS', 'BAR']);
			lancaErro(function () { api.gravar(m, { links: [], producoes: [] }); }, /^#PAD_051/);
			eq(m.gravacoes, 1);
		});

		test('um arquivo ilegível na gravação: começa de novo, só com a seção gravada', function () {
			const ruim = { ler: function () { throw new Error('json inválido'); }, gravar: function (n, d) { this.d = d; } };

			api.gravar(ruim, { links: [] });
			eq(ruim.d, { LINKS: [] });
		});
	},
	// no contexto à parte, os objetos são de outro "realm": compara pela cópia em JSON
	es3: function (api) {
		eq(copia(api.ler(memoria(), 'producoes')), []);

		const m = memoria({ [EQUIPE]: { SEARCH: { url: 'https://x.com', servidor: [{ name: 'A', path: '\\\\srv\\A' }] }, ORGANIZE: { folders: [{ name: 'C', content: 'render' }], renderComments: 'export', autoComment: 'exportar' } } });

		api.gravar(m, { buscaDeCaminhos: api.ler(m, 'buscaDeCaminhos'), organizar: api.ler(m, 'organizar'), regraDoRenomear: { types: [{ prefix: 'rdp', comment: 'rodapé', terms: 'rodapé' }] }, barra: {} });
		eq(m.doc(EQUIPE).SEARCH, { url: 'https://x.com', caminhosFixos: [{ name: 'A', path: '//srv/A' }] });
		eq(m.doc(EQUIPE).ORGANIZE.folders, [{ name: 'C', parent: '', contents: ['render'] }]);
		eq(m.doc(EQUIPE).RENAME.types, [{ prefix: 'RDP', comment: 'RODAPE', terms: ['RODAPE'] }]);
		eq(m.doc(EQUIPE).BAR.items.length, 17);
	}
});

// ---------------------------------------------------------------------------------------------------------------

REGRAS.forEach(function (r) {
	const file = path.join(DIR, r.arquivo);

	console.log('\n' + r.titulo + ' (regras/' + r.arquivo + ')');

	let api = null;

	test('carrega em Node (require)', function () {
		api = require(file);
		assert.ok(api && typeof api === 'object', 'sem module.exports');
	});
	if (api) r.casos(api);

	test('carrega como no ExtendScript (ES3, global ' + r.global + ')', function () {
		const g = loadEs3(file, r.global);

		assert.ok(g, 'o global ' + r.global + ' não existe');
		r.es3(g);
	});

	test('o host inclui a regra (host/index.jsx: #include "../regras/' + r.arquivo + '")', function () {
		const index = path.resolve(__dirname, '..', 'host', 'index.jsx');
		const inc = fs.readFileSync(index, 'utf8').match(/^#include\s+"([^"]+)"/gm) || [];
		const hit = inc.map(function (l) {
			return path.resolve(path.dirname(index), l.replace(/^#include\s+"|"$/g, ''));
		}).filter(function (p) {
			return p === file;
		});

		assert.ok(hit.length === 1 && fs.existsSync(hit[0]), 'index.jsx não inclui ../regras/' + r.arquivo);
	});
});

console.log('');

if (failed) {
	console.log(failed + ' de ' + (failed + passed) + ' casos falharam nas regras.');
	process.exit(1);
}

console.log('regras: ' + passed + ' casos passaram.');
