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
