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
    (forEach, map, filter, indexOf, Object.keys, trim, normalize…). A regra tem de carregar, virar uma variável global e
    responder a um caso simples.

Para acrescentar uma regra: uma entrada em REGRAS (o arquivo, a variável global e os casos). Para acrescentar casos: mais
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

// carrega a regra como o ExtendScript: sem module, a variável global no lugar de window, sem os métodos do ES5
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
	formatos: [
		{ prefix: 'RDP', etiqueta: 'RODAPE', terms: ['RODAPE', 'RDP'] },
		{ prefix: 'CRT', etiqueta: 'CARTAO', terms: ['CARTAO', 'CARTOES', 'CRT'] },
		{ prefix: 'LETT', etiqueta: 'LETTERING', terms: ['LETTERING', 'LETT', 'LET'] },
		{ prefix: 'CONFRONTO', etiqueta: 'CONFRONTO', terms: ['CONFRONTO'] },
		{ prefix: 'TARJA', etiqueta: 'TARJA', terms: ['TARJA', 'TRJ', 'TAR'] },
		{ prefix: 'PASSAGEM', etiqueta: 'PASSAGEM', terms: ['PASSAGEM', 'TRANSICAO', 'TRANSICOES', 'LAPADA'] },
		{ prefix: 'ASSINA', etiqueta: 'ASSINATURA', terms: ['ASSINATURA', 'ASSINA', 'ASS'] },
		{ prefix: 'FOTO', etiqueta: 'FOTO', terms: ['FOTO', 'IMG', 'IMAGEM', 'IMAGENS'] },
		{ prefix: 'REF', etiqueta: 'REFERENCIA', terms: ['REFERENCIA', 'PREVIEW', 'REF', 'PREV'] }
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

// 'nome novo · etiqueta do formato (ou -) · fixo'
function renomeia(api, name, opts, rule) {
	const r = api.rename(rule || RENOMEAR_PADRAO, name, opts);

	return r.name + ' · ' + (r.etiqueta || '-') + (r.fixed ? ' · fixo' : '');
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

			test('o nome fixo pela etiqueta da comp, só quando o nome não tem formato', function () {
				eq(renomeia(api, 'abertura', { etiqueta: 'LOGO GLOBO v2' }), 'LOGO GLOBO · - · fixo');
				eq(renomeia(api, 'rdp abertura', { etiqueta: 'LOGO GLOBO' }), 'RDP - ABERTURA · RODAPE');
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

			test('o formato devolvido: o prefixo e a etiqueta; sem formato, null', function () {
				eq(api.rename(RENOMEAR_PADRAO, 'crt hoje').format, { prefix: 'CRT', etiqueta: 'CARTAO' });
				eq(api.rename(RENOMEAR_PADRAO, 'hoje').format, null);
			});

			test('o texto sozinho (styleText, a forminha): especiais e caixa, sem formato', function () {
				eq(api.styleText(RENOMEAR_PADRAO, 'joão_da silva!'), 'JOAO DA SILVA');
				eq(api.styleText(regra({ textCase: 'keep', removeSpecial: false }), 'joão_da  silva'), 'joão da silva');
			});

			test('a regra preparada uma vez (compile) dá o mesmo nome', function () {
				const c = api.compile(RENOMEAR_PADRAO);

				eq(api.rename(c, 'rodapé_joão silva').name, 'RDP - JOAO SILVA');
				eq(api.styleText(c, 'joão'), 'JOAO');
			});

			test('o normalizar da tabela (maiúsculas, sem acentos nem símbolos), o mesmo da limpeza do host', function () {
				eq(api.normalize('  rodapé  dos jogos! '), 'RODAPE DOS JOGOS');
				eq(api.normalize('logo_globo'), 'LOGO GLOBO');
			});

			// --- #41: a sugestão do arquivista (suggest), com a regra padrão da equipe -------------------------------
			// 'sem o prefixo | com o prefixo do formato', as duas opções que o arquivista mostra
			function sugere(name, rule) {
				const s = api.suggest(rule || RENOMEAR_PADRAO, name);

				return s.plain + ' | ' + s.prefixed;
			}

			test('arquivista: o termo de formato no nome do item ganha o prefixo', function () {
				eq(sugere('rodapé_anitta (final)'), 'RODAPE ANITTA FINAL | RDP - ANITTA FINAL');
				eq(sugere('_CRT_HOJE'), 'CRT HOJE | CRT - HOJE');
			});

			test('arquivista: a pasta com termo no próprio nome ganha o prefixo (só o termo: só o prefixo)', function () {
				eq(sugere('rodapés jogo'), 'RODAPES JOGO | RDP - JOGO');
				eq(sugere('Cartões'), 'CARTOES | CRT');
			});

			test('arquivista: o nome fixo (LOGO GLOBO) sai igual com e sem o prefixo', function () {
				eq(sugere('logo_globo_branco'), 'LOGO GLOBO | LOGO GLOBO');
			});

			test('arquivista: o nome já no padrão fica igual, com e sem o prefixo', function () {
				eq(sugere('CRT - HOJE'), 'CRT - HOJE | CRT - HOJE');
				eq(sugere('LETT - VEM AI'), 'LETT - VEM AI | LETT - VEM AI');
			});

			test('arquivista: a caixa e o separador seguem a regra', function () {
				eq(sugere('crt hoje amanhã'), 'CRT HOJE AMANHA | CRT - HOJE AMANHA');
				eq(sugere('fundo palco'), 'FUNDO PALCO | FUNDO PALCO');
				eq(sugere('crt hoje amanhã', regra({ textCase: 'lowerCase', separator: '_' })), 'crt hoje amanha | CRT_hoje amanha');
			});

			test('arquivista: a sequência de imagens sugere pelo nome sem os quadros', function () {
				eq(sugere('rodape_jogo'), 'RODAPE JOGO | RDP - JOGO');
				eq(sugere('textura_ouro'), 'TEXTURA OURO | TEXTURA OURO');
			});


			test('arquivista: o acento separado da letra (macOS, NFD) vale como o junto', function () {
				eq(sugere('rodapé joão'), 'RODAPE JOAO | RDP - JOAO');
			});

			test('arquivista: os caracteres que o disco não aceita viram _ (especiais mantidos)', function () {
				eq(sugere('rdp a:b', regra({ removeSpecial: false })), 'RDP A_B | RDP - A_B');
			});
			// --- fim #41 ---------------------------------------------------------------------------------------------
		},
		es3: function (api) {
			eq(api.rename(RENOMEAR_PADRAO, 'rodapé_joão silva', { folders: ['CARTOES'] }).name, 'CRT - JOAO SILVA');
			eq(api.rename(regra({ textCase: 'titleCase' }), 'logo globo  ').name, 'LOGO GLOBO');
			eq(api.styleText(regra({ textCase: 'titleCase' }), 'joão da  silva'), 'Joao Da Silva');
			eq(api.suggest(RENOMEAR_PADRAO, 'rodape\u0301s jogo').prefixed, 'RDP - JOGO'); // #41
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
	},

	// ---- caminhos: o religar d'O CATADOR (do caminho guardado para os lugares de hoje) ----
	{
		arquivo: 'caminhos.js',
		global: 'PAD_CAMINHOS',
		titulo: "caminhos do religar d'O CATADOR (o caminho guardado → os lugares de hoje)",
		casos: function (api) {
			const SRV = 'vfx-ml-sp.servicos.corp.tvglobo.com.br';
			const HOJE = '//' + SRV + '/VFX/imagem/drive_k/3_ABERTURAS/4_VARIEDADES/x.mov';
			const COM_K = {
				drives: [{ letter: 'L', path: '//' + SRV + '/VFX/imagem/drive_l' }, { letter: 'K', path: '//' + SRV + '/VFX/imagem/drive_k' }, { letter: 'T', path: '//egcdesign01/cdesign' }],
				shares: [{ share: 'VFX', server: SRV }, { share: 'promo_ber', server: '10.193.48.13' }]
			};
			const SEM_K = { drives: [COM_K.drives[0], COM_K.drives[2]], shares: COM_K.shares };
			// os caminhos que saem, na ordem
			function lugares(path, mapa, volumes) {
				return api.candidatos(path, mapa, volumes).map(function (c) { return c.caminho; });
			}
			// o lugar de hoje está entre os que saem, e antes dos que só vêm dos compartilhamentos e dos volumes
			function acha(path, mapa, onde) {
				const list = api.candidatos(path, mapa, ['VFX', 'Macintosh HD']);
				const hit = list.filter(function (c) { return c.caminho.toLowerCase() === (onde || HOJE).toLowerCase(); })[0];

				assert.ok(hit, path + ' não chega em ' + (onde || HOJE) + ':\n' + list.map(function (c) { return c.como + ' ' + c.caminho; }).join('\n'));

				return hit.como;
			}

			[['com K no mapa', COM_K], ['sem K no mapa', SEM_K]].forEach(function (m) {
				test('/Volumes/imagem/drive_k/… (o compartilhamento do Windows virou o volume) → o drive_k de hoje, ' + m[0], function () {
					eq(acha('/Volumes/imagem/drive_k/3_ABERTURAS/4_VARIEDADES/x.mov', m[1]), 'mapa');
				});
				test('/Volumes/drive_k/… → o drive_k de hoje, ' + m[0], function () {
					eq(acha('/Volumes/drive_k/3_ABERTURAS/4_VARIEDADES/x.mov', m[1]), 'mapa');
				});
				test('/Volumes/VFX/imagem/drive_k/… (já o de hoje) → ele mesmo, primeiro, ' + m[0], function () {
					eq(lugares('/Volumes/VFX/imagem/drive_k/3_ABERTURAS/4_VARIEDADES/x.mov', m[1])[0], '/Volumes/VFX/imagem/drive_k/3_ABERTURAS/4_VARIEDADES/x.mov');
					eq(acha('/Volumes/VFX/imagem/drive_k/3_ABERTURAS/4_VARIEDADES/x.mov', m[1]), 'mapa');
				});
				test('K:\\… (e o /K/… do After do Mac) → o drive_k de hoje, primeiro, ' + m[0], function () {
					eq(lugares('K:\\3_ABERTURAS\\4_VARIEDADES\\x.mov', m[1])[0], HOJE);
					eq(lugares('/K/3_ABERTURAS/4_VARIEDADES/x.mov', m[1])[0], HOJE);
				});
				test('\\\\servidor\\imagem\\drive_k\\… (e /servidor/imagem/… do After do Mac) → o drive_k de hoje, ' + m[0], function () {
					eq(acha('\\\\' + SRV + '\\imagem\\drive_k\\3_ABERTURAS\\4_VARIEDADES\\x.mov', m[1]), 'mapa');
					eq(acha('/' + SRV + '/imagem/drive_k/3_ABERTURAS/4_VARIEDADES/x.mov', m[1]), 'mapa');
				});
			});

			test('o L do mapa: /Volumes/imagem/drive_l/… → //servidor/VFX/imagem/drive_l/…', function () {
				eq(acha('/Volumes/imagem/drive_l/Fileserver_5/TOOLKIT ORGANIZADO/F/02 Subtle Dust.mp4', COM_K, '//' + SRV + '/VFX/imagem/drive_l/Fileserver_5/TOOLKIT ORGANIZADO/F/02 Subtle Dust.mp4'), 'mapa');
			});

			test('o volume montado direto no drive (/Volumes/drive_l): o caminho a partir dele', function () {
				const list = lugares('/Volumes/imagem/drive_l/Fileserver_5/F/x.mp4', COM_K, ['drive_l']);

				assert.ok(list.indexOf('/Volumes/drive_l/Fileserver_5/F/x.mp4') > 0, list.join('\n'));
				assert.ok(lugares('L:\\Fileserver_5\\F\\x.mp4', COM_K, ['drive_l']).indexOf('/Volumes/drive_l/Fileserver_5/F/x.mp4') > 0);
			});

			test('o volume com outro nome: o caminho dentro dos compartilhamentos e dos volumes montados', function () {
				eq(acha('/Volumes/qualquer/imagem/drive_k/3_ABERTURAS/4_VARIEDADES/x.mov', SEM_K), 'compartilhamento');
				eq(acha('/Volumes/projetos/3_ABERTURAS/x.mov', SEM_K, '//' + SRV + '/VFX/3_ABERTURAS/x.mov'), 'compartilhamento');
				assert.ok(lugares('/Volumes/projetos/3_ABERTURAS/x.mov', SEM_K, ['VFX']).indexOf('/Volumes/VFX/projetos/3_ABERTURAS/x.mov') >= 0);
			});

			test('a letra fora do mapa e sem drive_ no mapa fica como está', function () {
				eq(lugares('K:\\a\\x.mov', { drives: [], shares: [] }), ['K:/a/x.mov']);
			});

			test('o caminho que não é da rede fica como está (só ele)', function () {
				eq(lugares('/Users/joao/Desktop/x.mov', COM_K, ['VFX']), ['/Users/joao/Desktop/x.mov']);
				eq(lugares('/Volumes/Macintosh HD/Users/x.mov', COM_K, ['VFX']), ['/Volumes/Macintosh HD/Users/x.mov']);
			});

			test('normalizar: o caminho do Windows como o After do Mac mostra', function () {
				eq(api.normalizar('/L/a/b.mov'), 'L:/a/b.mov');
				eq(api.normalizar('/srv.corp/VFX/a.mov'), '//srv.corp/VFX/a.mov');
				eq(api.normalizar('/Users/a/b.mov'), '/Users/a/b.mov');
			});
		},
		es3: function (api) {
			const mapa = { drives: [{ letter: 'L', path: '//srv/VFX/imagem/drive_l' }], shares: [{ share: 'VFX', server: 'srv' }] };
			const list = api.candidatos('/Volumes/imagem/drive_k/a/x.mov', mapa, ['VFX']);
			const caminhos = [];

			for (let i = 0; i < list.length; i++) caminhos.push(list[i].caminho);
			assert.ok(caminhos.indexOf('//srv/VFX/imagem/drive_k/a/x.mov') >= 0, caminhos.join('\n'));
		}
	}
];

// ---------------------------------------------------------------------------------------------------------------
// a tabela de seções da configuração (regras/configuracao.js), com um adaptador em memória
// ---------------------------------------------------------------------------------------------------------------

const EQUIPE = 'O_PADEIRO_GLOBAL_config.json';
// a configuração deste computador (a pasta de dados do usuário)
const COMPUTADOR = 'computador_config.json';
const PERSONALIZADO = 'computador_personalizado.json';
const LINKS_DESTE_COMPUTADOR = 'computador_links.json';
const ONDE_COMPUTADOR = {
	sigla: 'computador ' + COMPUTADOR + ' designer',
	modoLocal: 'computador ' + COMPUTADOR + ' localMode',
	registroDeUsoLigado: 'computador ' + COMPUTADOR + ' log',
	pastaDosProjetos: 'computador ' + COMPUTADOR + ' projects',
	outputLocal: 'computador ' + COMPUTADOR + ' outputs',
	presetsDeRender: 'computador ' + COMPUTADOR + ' render',
	producoesDesteComputador: 'computador ' + COMPUTADOR + ' productions',
	indiceLocal: 'computador ' + COMPUTADOR + ' search',
	listaDosTemplates: 'computador ' + COMPUTADOR + ' lists',
	fontesNoBanco: 'computador ' + COMPUTADOR + ' fontsUpload',
	fontesConferir: 'computador ' + COMPUTADOR + ' fontsCheck',
	linksDesteComputador: 'computador ' + LINKS_DESTE_COMPUTADOR + ' LINKS',
	aparenciaDesteComputador: 'computador ' + PERSONALIZADO + ' APPEARANCE',
	barraDesteComputador: 'computador ' + PERSONALIZADO + ' BAR'
};

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

			eq(r.formatos.map(function (t) { return t.prefix; }), ['RDP', 'CRT', 'LETT', 'CONFRONTO', 'TARJA', 'PASSAGEM', 'ASSINA', 'FOTO', 'REF']);
			eq(r.formatos[1], { prefix: 'CRT', etiqueta: 'CARTAO', terms: ['CARTAO', 'CARTOES', 'CRT'] });
			eq(r.fixed, [{ match: 'LOGO GLOBO', name: 'LOGO GLOBO' }]);
			eq([r.removeSpecial, r.textCase, r.separator], [true, 'upperCase', ' - ']);
		});

		test('organizar, sem nada: as pastas e as etiquetas de sempre', function () {
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
			api.ler(memoria(), 'regraDoRenomear').formatos.length = 0;
			api.padrao('organizar').folders.pop();
			eq(api.ler(memoria(), 'regraDoRenomear').formatos.length, 9);
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
			const m = memoria({ [EQUIPE]: { RENAME: { formatos: [{ prefix: ' rdp ', etiqueta: 'rodapé', terms: 'rodapé,  ,  rdp ' }], fixed: [{ match: 'logo  globo', name: 'Logo Globo' }], textCase: 'gritando' } } });

			eq(api.ler(m, 'regraDoRenomear'), { formatos: [{ prefix: 'RDP', etiqueta: 'RODAPE', terms: ['RODAPE', 'RDP'] }], fixed: [{ match: 'LOGO GLOBO', name: 'LOGO GLOBO' }], removeSpecial: true, textCase: 'upperCase', separator: ' - ' });
			lancaErro(function () { api.gravar(memoria(), { regraDoRenomear: { formatos: [{ prefix: '', etiqueta: 'X', terms: ['X'] }] } }); }, /^#PAD_082 - renomear: o formato 1 precisa de um prefixo/);
			lancaErro(function () { api.gravar(memoria(), { regraDoRenomear: { separator: '/' } }); }, /^#PAD_082/);
			lancaErro(function () { api.gravar(memoria(), { regraDoRenomear: { formatos: [{ prefix: 'X', etiqueta: ' ', terms: ['X'] }] } }); }, /^#PAD_082 - renomear: "X" precisa de uma etiqueta\.$/);
		});

		// --- #46: os nomes do glossário na regra do renomear: RENAME.types → formatos, comment → etiqueta ------------
		// a regra gravada antes da troca (os nomes antigos), com um formato a mais e outra caixa e outro separador
		const RENAME_ANTIGO = {
			types: [{ prefix: 'vht', comment: 'vinheta', terms: 'vinheta, vht' }, { prefix: 'RDP', comment: 'RODAPE', terms: ['RODAPE'] }],
			fixed: [{ match: 'logo globo', name: 'LOGO GLOBO' }],
			textCase: 'titleCase',
			separator: '_'
		};

		test('regra do renomear: a gravada antes (RENAME.types e o comment de cada formato) é lida como formatos e etiqueta', function () {
			const r = api.ler(memoria({ [EQUIPE]: { RENAME: RENAME_ANTIGO } }), 'regraDoRenomear');

			eq(r.formatos, [{ prefix: 'VHT', etiqueta: 'VINHETA', terms: ['VINHETA', 'VHT'] }, { prefix: 'RDP', etiqueta: 'RODAPE', terms: ['RODAPE'] }]);
			eq([r.types, r.textCase, r.separator], [undefined, 'titleCase', '_']);
		});

		test('regra do renomear: a gravação grava só os nomes novos (formatos e etiqueta), sem os antigos', function () {
			const m = memoria({ [EQUIPE]: { RENAME: RENAME_ANTIGO, OUTRA: 1 } });

			api.gravar(m, { regraDoRenomear: api.ler(m, 'regraDoRenomear') });
			eq(m.doc(EQUIPE).OUTRA, 1);
			eq(m.doc(EQUIPE).RENAME.types, undefined);
			eq(m.doc(EQUIPE).RENAME.formatos, [{ prefix: 'VHT', etiqueta: 'VINHETA', terms: ['VINHETA', 'VHT'] }, { prefix: 'RDP', etiqueta: 'RODAPE', terms: ['RODAPE'] }]);
		});

		test('regra do renomear: os campos novos vencem os antigos quando os dois existem', function () {
			const r = api.ler(memoria({ [EQUIPE]: { RENAME: { formatos: [{ prefix: 'A', etiqueta: 'NOVA', comment: 'VELHA', terms: ['A'] }], types: RENAME_ANTIGO.types } } }), 'regraDoRenomear');

			eq(r.formatos, [{ prefix: 'A', etiqueta: 'NOVA', terms: ['A'] }]);
		});

		// os mesmos nomes de antes da troca (literais tirados da regra antes de #46): 'nome · etiqueta (ou -)'
		test('a regra do renomear dá os mesmos nomes de antes: com a padrão e com a gravada nos nomes antigos', function () {
			const regraDoRenomear = require(path.join(DIR, 'regra-do-renomear.js'));
			const padrao = api.ler(memoria(), 'regraDoRenomear');
			const antiga = api.ler(memoria({ [EQUIPE]: { RENAME: RENAME_ANTIGO } }), 'regraDoRenomear');
			const nomes = [['rodapé_joão silva'], ['joao silva', { folders: ['RODAPES'] }], ['abertura', { etiqueta: 'LOGO GLOBO v2' }], ['CRT - AMANHA'], ['tarja_patrocínio  v2', { folders: ['ASSETS'] }], ['vinheta abertura'], ['logo_globo_branco']];

			function nomesCom(rule) {
				return nomes.map(function (n) {
					const r = regraDoRenomear.rename(rule, n[0], n[1]);

					return r.name + ' · ' + (r.etiqueta || '-');
				});
			}

			eq(nomesCom(padrao), ['RDP - JOAO SILVA · RODAPE', 'RDP - JOAO SILVA · RODAPE', 'LOGO GLOBO · -', 'CRT - AMANHA · CARTAO', 'TARJA - PATROCINIO V2 · TARJA', 'VINHETA ABERTURA · -', 'LOGO GLOBO · -']);
			eq(nomesCom(antiga), ['RDP_Joao Silva · RODAPE', 'RDP_Joao Silva · RODAPE', 'LOGO GLOBO · -', 'Crt - Amanha · -', 'Tarja Patrocinio V2 · -', 'VHT_Abertura · VINHETA', 'LOGO GLOBO · -']);
			eq(regraDoRenomear.suggest(padrao, 'rodapé_anitta (final)'), { plain: 'RODAPE ANITTA FINAL', prefixed: 'RDP - ANITTA FINAL' });
			eq(regraDoRenomear.suggest(antiga, 'vinheta hoje'), { plain: 'Vinheta Hoje', prefixed: 'VHT_Hoje' });
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
				RENAME: { formatos: [], fixed: [] },
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

		// -------------------------------------------------------------------------------------------------------
		// a configuração deste computador e as seções da equipe que ainda tinham o próprio ler/limpar
		// -------------------------------------------------------------------------------------------------------

		test('as seções deste computador moram nos arquivos da pasta de dados, cada uma na sua chave', function () {
			const onde = {};

			Object.keys(ONDE_COMPUTADOR).forEach(function (nome) {
				const s = api.secao(nome);

				onde[nome] = s.onde + ' ' + s.arquivo + ' ' + s.chave;
			});
			eq(onde, ONDE_COMPUTADOR);
		});

		test('as seções da equipe que tinham o próprio ler/limpar (registro de uso, aparência, coletar, banco de fontes)', function () {
			const onde = {};

			['registroDeUso', 'aparencia', 'coletar', 'bancoDeFontes'].forEach(function (nome) {
				onde[nome] = api.secao(nome).onde + ' ' + api.secao(nome).arquivo + ' ' + api.secao(nome).chave;
			});
			eq(onde, { registroDeUso: 'equipe ' + EQUIPE + ' LOG', aparencia: 'equipe ' + EQUIPE + ' APPEARANCE', coletar: 'equipe ' + EQUIPE + ' COLETAR', bancoDeFontes: 'equipe ' + EQUIPE + ' FONTS' });
		});

		// sem nada: o padrão
		test('deste computador, sem nada: o padrão de cada seção', function () {
			const m = memoria();
			const lido = {};

			Object.keys(ONDE_COMPUTADOR).forEach(function (nome) {
				lido[nome] = api.ler(m, nome);
			});
			eq(lido, {
				sigla: '',
				modoLocal: false,
				registroDeUsoLigado: true,
				pastaDosProjetos: '',
				outputLocal: '',
				presetsDeRender: { 'final': '', preview: '' },
				producoesDesteComputador: null, // sem a lista: o host monta a partir das pastas de antes ('templates')
				indiceLocal: { mode: 'webhook', folders: [], foldersOnly: true, daily: true },
				listaDosTemplates: { recents: 5, newDays: 15 },
				fontesNoBanco: true,
				fontesConferir: true,
				linksDesteComputador: [],
				aparenciaDesteComputador: null, // sem a personalizada: a da equipe
				barraDesteComputador: null
			});
		});

		test('da equipe, sem nada: o registro de uso pelo webhook, a aparência, a estrutura do coletar e o banco padrão', function () {
			eq(api.ler(memoria(), 'registroDeUso'), { mode: 'webhook', webhook: 'https://workflows.jmbillard.com/webhook/log_db_padeiro' });
			eq(api.ler(memoria(), 'aparencia'), { mode: 'light', background: 'gradient', accent: '#5184f8', gradientStart: '#67b7ff', gradientEnd: '#5649e9', font: 'inter', logo: '' });
			eq(api.ler(memoria(), 'coletar').folders.length, 11);
			eq(api.ler(memoria(), 'coletar').folders[0], { name: '01_PROJETOS', parent: '', contents: ['projeto'] });
			eq(api.ler(memoria(), 'bancoDeFontes'), { bank: '', upload: true });
		});

		// campos faltando ou inválidos: limpo
		test('deste computador: os valores guardados saem limpos', function () {
			const m = memoria({ [COMPUTADOR]: {
				user: 'joão.silva_ ç!', localMode: 'sim', log: 0, projects: ' C:\\proj\\ ', outputs: '/Volumes/VFX-2/out/',
				render: { 'final': ' H264 ' }, productions: [{ name: ' minha   prod ', path: '/x/' }, { name: '', path: '/y' }, { name: 'MINHA PROD', path: '/z' }],
				search: { mode: 'outro', folders: ['/a/', ' '], foldersOnly: false }, lists: { recents: 99, newDays: -3 }, fontsUpload: 'nao', fontsCheck: false
			} });

			eq(api.ler(m, 'sigla'), 'JOAOSILVAC');
			eq(api.ler(m, 'modoLocal'), false);
			eq(api.ler(m, 'registroDeUsoLigado'), true);
			eq(api.ler(m, 'pastaDosProjetos'), 'C:/proj');
			eq(api.ler(m, 'outputLocal'), '/Volumes/VFX/out');
			eq(api.ler(m, 'presetsDeRender'), { 'final': 'H264', preview: '' });
			eq(api.ler(m, 'producoesDesteComputador'), [{ name: 'minha prod', path: '/x' }]);
			eq(api.ler(m, 'indiceLocal'), { mode: 'webhook', folders: ['/a'], foldersOnly: false, daily: true });
			eq(api.ler(m, 'listaDosTemplates'), { recents: 30, newDays: 0 });
			eq(api.ler(m, 'fontesNoBanco'), true);
			eq(api.ler(m, 'fontesConferir'), false);
		});

		test('a sigla: no máximo 24 caracteres, em maiúsculas (a mesma limpeza para o login)', function () {
			eq(api.limpar('sigla', 'abcdefghijklmnopqrstuvwxyz'), 'ABCDEFGHIJKLMNOPQRSTUVWX');
			eq(api.limpar('sigla', 'j.m billard'), 'JMBILLARD');
			eq(api.limpar('sigla', null), '');
		});

		test('links deste computador: a mesma limpeza dos links da equipe; um link quebrado faz a lista voltar ao padrão (vazia)', function () {
			eq(api.ler(memoria({ [LINKS_DESTE_COMPUTADOR]: { LINKS: [{ name: ' meu ', url: ' https://meu.com ' }] } }), 'linksDesteComputador'), [{ name: 'meu', url: 'https://meu.com', icon: '' }]);
			eq(api.ler(memoria({ [LINKS_DESTE_COMPUTADOR]: { LINKS: [{ name: 'x', url: 'sem' }] } }), 'linksDesteComputador'), []);
			lancaErro(function () { api.gravar(memoria(), { linksDesteComputador: [{ name: 'x', url: 'sem' }] }); }, /^#PAD_087/);
		});

		test('a barra e a aparência deste computador: a mesma limpeza das da equipe; uma quebrada vale como não personalizada', function () {
			const m = memoria({ [PERSONALIZADO]: { BAR: { items: ['templates', 'pastas'], hidden: ['templates'] }, APPEARANCE: { mode: 'escuro', accent: '#AABBCC', gradientStart: '#000000', gradientEnd: '#ffffff', font: 'nenhuma' } } });

			eq(api.ler(m, 'barraDesteComputador'), api.limpar('barra', { items: ['templates', 'pastas'], hidden: ['templates'] }));
			eq(api.ler(m, 'barraDesteComputador').hidden, ['gaveta:templates']);
			eq(api.ler(m, 'aparenciaDesteComputador'), { mode: 'light', background: 'gradient', accent: '#aabbcc', gradientStart: '#000000', gradientEnd: '#ffffff', font: 'inter', logo: '' });
			eq(api.ler(memoria({ [PERSONALIZADO]: { APPEARANCE: { accent: 'azul' } } }), 'aparenciaDesteComputador'), null);
			lancaErro(function () { api.gravar(memoria(), { aparenciaDesteComputador: { accent: 'azul' } }); }, /^#PAD_088 - aparência: cor de destaque inválida/);
		});

		test('registro de uso, coletar e banco de fontes da equipe: limpos; o que não serve lança o erro', function () {
			eq(api.ler(memoria({ [EQUIPE]: { LOG: { mode: 'csv', webhook: ' x ' } } }), 'registroDeUso'), { mode: 'csv', webhook: 'x' });
			eq(api.ler(memoria({ [EQUIPE]: { LOG: { mode: 'webhook', webhook: 'ftp://x' } } }), 'registroDeUso').webhook, 'https://workflows.jmbillard.com/webhook/log_db_padeiro');
			lancaErro(function () { api.gravar(memoria(), { registroDeUso: { mode: 'webhook', webhook: 'a b' } }); }, /^#PAD_078/);
			eq(api.ler(memoria({ [EQUIPE]: { COLETAR: { folders: [{ name: ' 01  PROJ ', contents: ['projeto'] }, { name: 'IMGS', parent: '01 proj', contents: ['imagens', ''] }], saveAfter: true } } }), 'coletar'),
				{ folders: [{ name: '01 PROJ', parent: '', contents: ['projeto'] }, { name: 'IMGS', parent: '01 PROJ', contents: ['imagens'] }] });
			lancaErro(function () { api.gravar(memoria(), { coletar: { folders: [{ name: 'A', contents: ['x'] }] } }); }, /^#PAD_094 - coletar: tipo desconhecido/);
			eq(api.ler(memoria({ [EQUIPE]: { FONTS: { bank: ' \\\\srv\\FONTES\\ ', upload: false } } }), 'bancoDeFontes'), { bank: '//srv/FONTES', upload: false });
		});

		// nomes antigos: lidos, e a gravação seguinte só com o novo
		test('modo local: "homeOffice" (o nome antigo) é lido; gravar o modo local grava só "localMode"', function () {
			const m = memoria({ [COMPUTADOR]: { homeOffice: true, user: 'ABC' } });

			eq(api.ler(m, 'modoLocal'), true);
			api.gravar(m, { modoLocal: api.ler(m, 'modoLocal') });
			eq([m.doc(COMPUTADOR).designer, m.doc(COMPUTADOR).localMode, 'homeOffice' in m.doc(COMPUTADOR)], ['ABC', true, false]);
		});

		test('sigla: sem o arquivo deste computador, a dos arquivos antigos (machine_config.json, project_user.json); gravar grava no novo e deixa os antigos no lugar', function () {
			const antigos = { 'machine_config.json': { log: false }, 'project_user.json': { user: 'velho' } };
			const m = memoria(antigos);

			eq(api.ler(m, 'sigla'), 'VELHO'); // o primeiro antigo sem a sigla: vale o seguinte
			eq(api.ler(memoria({ 'project_user.json': { user: 'velho' } }), 'sigla'), 'VELHO');
			eq(api.ler(memoria({ [COMPUTADOR]: { user: 'NOVO' }, 'project_user.json': { user: 'velho' } }), 'sigla'), 'NOVO');
			api.gravar(m, { sigla: api.ler(m, 'sigla') });
			eq([m.doc(COMPUTADOR).log, m.doc(COMPUTADOR).designer], [false, 'VELHO']);
			eq([m.doc('machine_config.json'), m.doc('project_user.json')], [antigos['machine_config.json'], antigos['project_user.json']]);
		});

		test('com o arquivo deste computador gravado, os antigos não são mais lidos (o que saiu do novo não volta do antigo)', function () {
			const m = memoria({ [COMPUTADOR]: { log: false }, 'project_user.json': { user: 'velho' }, 'personal_config.json': { APPEARANCE: { accent: '#111111', gradientStart: '#222222', gradientEnd: '#333333' } } });

			eq(api.ler(m, 'sigla'), '');
			api.gravar(m, { aparenciaDesteComputador: { accent: '#444444', gradientStart: '#555555', gradientEnd: '#666666' } });
			api.gravar(m, { aparenciaDesteComputador: null }); // volta à da equipe
			eq(api.ler(m, 'aparenciaDesteComputador'), null);
			eq(m.doc('personal_config.json').APPEARANCE.accent, '#111111'); // o antigo fica no lugar
		});

		// #45: as chaves guardadas da configuração passam aos termos do glossário. Cada uma: a antiga é lida, a nova é
		// gravada (e a antiga sai)
		// e #46: "tipo" no lugar do nome antigo: o campo guardado 'categories' vira 'tipos'
		test('tipos de projeto: "PROJECT" e "categories" (os nomes antigos) são lidos; gravar grava só "TIPOS_DE_PROJETO.tipos"', function () {
			const tipos = { tipos: [{ name: 'NOVELA', path: '/n', output: '', file: '', icon: 'tv' }] };
			const m = memoria({ [EQUIPE]: { PROJECT: { categories: [{ name: 'novela', path: '/n/', icon: 'tv' }] }, OUTRA: 1 } });

			eq(api.secao('tiposDeProjeto').chave, 'TIPOS_DE_PROJETO');
			eq(api.ler(m, 'tiposDeProjeto'), tipos);
			api.gravar(m, { tiposDeProjeto: api.ler(m, 'tiposDeProjeto') });
			eq(m.doc(EQUIPE), { OUTRA: 1, TIPOS_DE_PROJETO: tipos });

			// só um dos nomes antigos: a chave nova com o campo antigo, e a chave antiga com o campo novo
			eq(api.ler(memoria({ [EQUIPE]: { TIPOS_DE_PROJETO: { categories: [{ name: 'novela', path: '/n/', icon: 'tv' }] } } }), 'tiposDeProjeto'), tipos);
			eq(api.ler(memoria({ [EQUIPE]: { PROJECT: { tipos: [{ name: 'novela', path: '/n/', icon: 'tv' }] } } }), 'tiposDeProjeto'), tipos);

			// os dois campos: vale o novo
			eq(api.ler(memoria({ [EQUIPE]: { TIPOS_DE_PROJETO: { tipos: [{ name: 'A', path: '/a' }], categories: [{ name: 'B', path: '/b' }] } } }), 'tiposDeProjeto').tipos.map(function (t) { return t.name; }), ['A']);
		});

		test('coletar: a chave antiga (em inglês) é lida; gravar grava só "COLETAR"', function () {
			const coletar = { folders: [{ name: '01 PROJ', parent: '', contents: ['projeto'] }] };
			const antigos = ['COLLECT']; // a chave com o nome antigo, lida por compatibilidade
			const m = memoria({ [EQUIPE]: { [antigos[0]]: coletar, OUTRA: 1 } });

			eq(api.secao('coletar').antigos, antigos);

			eq(api.ler(m, 'coletar'), coletar);
			api.gravar(m, { coletar: api.ler(m, 'coletar') });
			eq(m.doc(EQUIPE), { OUTRA: 1, COLETAR: coletar });
			eq(api.secoesDoPainel({ coletar: coletar }), { producoes: [], coletar: coletar });
		});

		test('registro de uso: o modo "csvGlobal" (o nome antigo) é lido como "csvEquipe"; gravar grava "csvEquipe"', function () {
			const m = memoria({ [EQUIPE]: { LOG: { mode: 'csvGlobal', webhook: '' } } });

			eq(api.ler(m, 'registroDeUso').mode, 'csvEquipe');
			api.gravar(m, { registroDeUso: api.ler(m, 'registroDeUso') });
			eq(m.doc(EQUIPE).LOG.mode, 'csvEquipe');
			eq(api.limpar('registroDeUso', { mode: 'csvEquipe' }).mode, 'csvEquipe');
		});

		test('o designer: "user" (o nome antigo) é lido; gravar grava só "designer"', function () {
			const m = memoria({ [COMPUTADOR]: { user: 'velho', log: false } });

			eq(api.secao('sigla').chave, 'designer');
			eq(api.ler(m, 'sigla'), 'VELHO');
			api.gravar(m, { sigla: api.ler(m, 'sigla') });
			eq([m.doc(COMPUTADOR).designer, m.doc(COMPUTADOR).log], ['VELHO', false]);
			eq('user' in m.doc(COMPUTADOR), false);
		});

		test('o arquivo deste computador: "machine_config.json" (o nome antigo) é lido; gravar grava "computador_config.json" e deixa o antigo no lugar', function () {
			const m = memoria({ 'machine_config.json': { user: 'ABC', localMode: true, projects: '/p' } });

			eq(api.COMPUTADOR, COMPUTADOR);
			eq([api.ler(m, 'sigla'), api.ler(m, 'modoLocal'), api.ler(m, 'pastaDosProjetos')], ['ABC', true, '/p']);
			api.gravar(m, { outputLocal: '/o' });
			eq([m.doc(COMPUTADOR).designer, m.doc(COMPUTADOR).localMode, m.doc(COMPUTADOR).projects, m.doc(COMPUTADOR).outputs], ['ABC', true, '/p', '/o']);
			eq(m.doc('machine_config.json'), { user: 'ABC', localMode: true, projects: '/p' });
		});

		test('a aparência e a barra deste computador: "personal_config.json" (o nome antigo) é lido; gravar grava "computador_personalizado.json" e deixa o antigo no lugar', function () {
			const barra = api.limpar('barra', { items: ['pastas'] });
			const m = memoria({ 'personal_config.json': { BAR: barra } });

			eq(api.PERSONALIZADO, PERSONALIZADO);
			eq(api.ler(m, 'barraDesteComputador'), barra);
			api.gravar(m, { aparenciaDesteComputador: { accent: '#111111', gradientStart: '#222222', gradientEnd: '#333333' } });
			eq(m.doc(PERSONALIZADO).BAR, barra);
			eq(m.doc(PERSONALIZADO).APPEARANCE.accent, '#111111');
			eq(m.doc('personal_config.json'), { BAR: barra });
		});

		test('os links deste computador: "personal_links.json" (o nome antigo) é lido; gravar grava "computador_links.json" e deixa o antigo no lugar', function () {
			const links = [{ name: 'a', url: 'https://a.com', icon: '' }];
			const m = memoria({ 'personal_links.json': { LINKS: links } });

			eq(api.LINKS_DESTE_COMPUTADOR, LINKS_DESTE_COMPUTADOR);
			eq(api.ler(m, 'linksDesteComputador'), links);
			api.gravar(m, { linksDesteComputador: links.concat([{ name: 'b', url: 'https://b.com' }]) });
			eq(m.doc(LINKS_DESTE_COMPUTADOR).LINKS.length, 2);
			eq(m.doc('personal_links.json'), { LINKS: links });
		});

		// o formato guardado deste computador não muda: cada gravação regrava o arquivo inteiro, só com o que se conhece
		test('deste computador: gravar só a sigla regrava o arquivo inteiro, limpo, sem os nomes antigos nem as chaves de fora', function () {
			const m = memoria({ [COMPUTADOR]: { homeOffice: true, projects: ' /p/ ', templates: { X: '/t' }, outra: 1 } });

			api.gravar(m, { sigla: 'abc' });
			eq(m.doc(COMPUTADOR), {
				designer: 'ABC', localMode: true, log: true, projects: '/p', outputs: '', render: { 'final': '', preview: '' },
				search: { mode: 'webhook', folders: [], foldersOnly: true, daily: true }, lists: { recents: 5, newDays: 15 }, fontsUpload: true, fontsCheck: true
			});
		});

		test('tipos de projeto: na tabela (TIPOS_DE_PROJETO da equipe), limpos; o formato antigo e o que não serve viram o padrão (sem tipos)', function () {
			const s = api.secao('tiposDeProjeto');

			eq(s.onde + ' ' + s.arquivo + ' ' + s.chave, 'equipe ' + EQUIPE + ' TIPOS_DE_PROJETO');
			eq(api.ler(memoria(), 'tiposDeProjeto'), { tipos: [] });
			eq(api.ler(memoria({ [EQUIPE]: { PROJECT: { root: '/x', retrancas: [] } } }), 'tiposDeProjeto'), { tipos: [] });
			eq(api.ler(memoria({ [EQUIPE]: { TIPOS_DE_PROJETO: { tipos: [{ name: 'a' }] } } }), 'tiposDeProjeto'), { tipos: [] });
			eq(api.limpar('tiposDeProjeto', { tipos: [{ name: ' mood   mensal ', path: '\\\\srv\\MOOD\\{ano}\\', output: ' ARTE RJ /SHOWS  {o_que_e} /', file: 'a:b{proximo_mes}', icon: 'Tv 1!' }] }),
				{ tipos: [{ name: 'MOOD MENSAL', path: '//srv/MOOD/{ano}', output: 'ARTE RJ/SHOWS {o_que_e}', file: 'a b{proximo_mes}', icon: 'v1' }] });
			lancaErro(function () { api.limpar('tiposDeProjeto', { tipos: [{ name: ' !! ', path: '/a' }] }); }, /^#PAD_089 - tipos de projeto: preencha o nome do tipo de projeto 1\./);
			lancaErro(function () { api.limpar('tiposDeProjeto', { tipos: [{ name: 'Novela', path: '/a' }, { name: 'novela!', path: '/b' }] }); }, /^#PAD_089 - tipos de projeto: o tipo NOVELA! aparece mais de uma vez\./);
			lancaErro(function () { api.limpar('tiposDeProjeto', { tipos: [{ name: 'A', path: ' ' }] }); }, /^#PAD_089 - tipos de projeto: o tipo A precisa de um caminho\./);
			lancaErro(function () { api.limpar('tiposDeProjeto', { tipos: [{ name: 'A', path: '/{o_que_e}' }] }); }, /^#PAD_089 - tipos de projeto: o tipo A usa \{o_que_e\} na pasta do PROJETO/);
			lancaErro(function () { api.limpar('tiposDeProjeto', { tipos: [{ name: 'A', path: '/a', file: '{nada}' }] }); }, /^#PAD_089 - tipos de projeto: \{nada\} não é um token do caminho/);

			// o token com o nome antigo do {tipo} continua valendo nos caminhos já salvos
			const TOKENS_ANTIGOS = ['categoria']; // o nome antigo do {tipo}, lido por compatibilidade
			const antigo = '/x/{' + TOKENS_ANTIGOS[0] + '}/{atracao}';

			eq(api.limpar('tiposDeProjeto', { tipos: [{ name: 'A', path: antigo }] }).tipos[0].path, antigo);
		});

		test('o token {designer} (a sigla do designer) vale nos caminhos; {usuario}, o nome antigo, continua aceito', function () {
			eq(api.limpar('tiposDeProjeto', { tipos: [{ name: 'A', path: '/a/{atracao}', file: '{atracao} {designer}' }] }).tipos[0].file, '{atracao} {designer}');
			eq(api.limpar('tiposDeProjeto', { tipos: [{ name: 'A', path: '/a/{atracao}', file: '{atracao} {usuario}' }] }).tipos[0].file, '{atracao} {usuario}');
			lancaErro(function () { api.limpar('tiposDeProjeto', { tipos: [{ name: 'A', path: '/a', file: '{nada}' }] }); }, /\{designer\}/); // a mensagem cita o token novo
		});

		test('os campos da configuração da equipe vindos do painel viram as seções (as que não vierem ficam de fora; sem produções, a lista vazia)', function () {
			eq(api.secoesDoPainel({ productions: [1], drives: 2, rename: 3, organize: 4, search: 5, links: 6, bar: 7, log: 8, appearance: 9, coletar: 10, fonts: 11, tiposDeProjeto: 12 }),
				{ producoes: [1], mapaDeDrives: 2, regraDoRenomear: 3, organizar: 4, buscaDeCaminhos: 5, links: 6, barra: 7, registroDeUso: 8, aparencia: 9, coletar: 10, bancoDeFontes: 11, tiposDeProjeto: 12 });
			eq(api.secoesDoPainel({ links: [] }), { producoes: [], links: [] });

			// gravar pelo painel: os tipos de projeto vão junto, limpos, e as chaves de fora ficam
			const m = memoria({ [EQUIPE]: { OUTRA: 1 } });

			m.gravar(EQUIPE, api.aplicar(m.ler(EQUIPE), api.secoesDoPainel({ productions: [{ name: 'A', templatesPath: '//a/b' }], tiposDeProjeto: { tipos: [{ name: 'novela', path: '/n/' }] } })));
			eq(m.doc(EQUIPE), { OUTRA: 1, PRODUCTIONS: [{ name: 'A', icon: '', templatesPath: '//a/b' }], TIPOS_DE_PROJETO: { tipos: [{ name: 'NOVELA', path: '/n', output: '', file: '', icon: '' }] } });
		});

		test('a aparência e a barra deste computador: gravar uma não apaga a outra; null volta à da equipe (sai do arquivo)', function () {
			const aparencia = api.limpar('aparencia', { mode: 'dark', accent: '#111111', gradientStart: '#222222', gradientEnd: '#333333' });
			const m = memoria({ [PERSONALIZADO]: { APPEARANCE: aparencia } });

			api.gravar(m, { barraDesteComputador: { items: ['pastas'] } });
			eq(m.doc(PERSONALIZADO), { APPEARANCE: aparencia, BAR: api.limpar('barra', { items: ['pastas'] }) });
			api.gravar(m, { aparenciaDesteComputador: null });
			eq(m.doc(PERSONALIZADO), { BAR: api.limpar('barra', { items: ['pastas'] }) });
			eq(api.ler(m, 'aparenciaDesteComputador'), null);
		});

		test('a cópia do índice da busca: lida pelo nome de agora e, sem ela, pelo de antes (busca_v2.json)', function () {
			eq(api.COPIA_DA_BUSCA, { arquivo: 'busca_copia.json', arquivosAntigos: ['busca_v2.json'] });
			eq(api.paraLer(api.COPIA_DA_BUSCA, function (n) { return n === 'busca_v2.json'; }), 'busca_v2.json');
			eq(api.paraLer(api.COPIA_DA_BUSCA, function () { return true; }), 'busca_copia.json');
			eq(api.paraLer(api.COPIA_DA_BUSCA, function () { return false; }), 'busca_copia.json');
		});

		// salvar uma seção não mexe nas outras
		test('deste computador: salvar uma seção não mexe nas outras seções', function () {
			const antes = {
				[COMPUTADOR]: { designer: 'ABC', projects: '/p', outputs: '/o', render: { 'final': 'F', preview: 'P' }, productions: [{ name: 'X', path: '/x' }], log: false, localMode: true, search: { mode: 'local', folders: ['/s'], foldersOnly: true, daily: false }, fontsUpload: false, fontsCheck: false, lists: { recents: 1, newDays: 2 } },
				[PERSONALIZADO]: { APPEARANCE: { mode: 'dark', background: 'gradient', accent: '#111111', gradientStart: '#222222', gradientEnd: '#333333', font: 'inter', logo: '' }, BAR: api.limpar('barra', { items: ['pastas'], hidden: [] }) }, // já limpos: o arquivo é regravado limpo
				[LINKS_DESTE_COMPUTADOR]: { LINKS: [{ name: 'a', url: 'https://a.com', icon: '' }] },
				[EQUIPE]: { LOG: { mode: 'off' } }
			};
			const novos = { sigla: 'XYZ', modoLocal: false, registroDeUsoLigado: true, pastaDosProjetos: '/np', outputLocal: '/no', presetsDeRender: { 'final': 'G' }, producoesDesteComputador: [{ name: 'Y', path: '/y' }], indiceLocal: { mode: 'webhook' }, listaDosTemplates: { recents: 9 }, fontesNoBanco: true, fontesConferir: true, linksDesteComputador: [], aparenciaDesteComputador: { mode: 'light', accent: '#444444', gradientStart: '#555555', gradientEnd: '#666666' }, barraDesteComputador: {} };

			Object.keys(ONDE_COMPUTADOR).forEach(function (nome) {
				const m = memoria(antes);
				const s = api.secao(nome);
				const esperado = copia(antes);

				api.gravar(m, { [nome]: novos[nome] });

				const depois = {};

				Object.keys(antes).forEach(function (a) {
					depois[a] = m.doc(a);
				});
				delete esperado[s.arquivo][s.chave];
				delete depois[s.arquivo][s.chave];
				eq(depois, esperado, nome + ' mexeu nas outras');
				eq(m.gravacoes, 1, nome);
				eq(m.doc(s.arquivo)[s.chave], api.limpar(nome, novos[nome]), nome);
			});
		});
	},
	// no contexto à parte, os objetos são de outro "realm": compara pela cópia em JSON
	es3: function (api) {
		eq(copia(api.ler(memoria(), 'producoes')), []);

		const m = memoria({ [EQUIPE]: { SEARCH: { url: 'https://x.com', servidor: [{ name: 'A', path: '\\\\srv\\A' }] }, ORGANIZE: { folders: [{ name: 'C', content: 'render' }], renderComments: 'export', autoComment: 'exportar' } } });

		api.gravar(m, { buscaDeCaminhos: api.ler(m, 'buscaDeCaminhos'), organizar: api.ler(m, 'organizar'), regraDoRenomear: { formatos: [{ prefix: 'rdp', etiqueta: 'rodapé', terms: 'rodapé' }] }, barra: {} });
		eq(m.doc(EQUIPE).SEARCH, { url: 'https://x.com', caminhosFixos: [{ name: 'A', path: '//srv/A' }] });
		eq(m.doc(EQUIPE).ORGANIZE.folders, [{ name: 'C', parent: '', contents: ['render'] }]);
		eq(m.doc(EQUIPE).RENAME.formatos, [{ prefix: 'RDP', etiqueta: 'RODAPE', terms: ['RODAPE'] }]);
		eq(copia(api.ler(memoria({ [EQUIPE]: { RENAME: { types: [{ prefix: 'x', comment: 'y', terms: 'x' }] } } }), 'regraDoRenomear').formatos), [{ prefix: 'X', etiqueta: 'Y', terms: ['X'] }]);
		eq(m.doc(EQUIPE).BAR.items.length, 17);

		// deste computador: os nomes antigos, a limpeza da sigla (sem os métodos do ES5) e a cópia da busca
		const c = memoria({ 'machine_config.json': { homeOffice: true }, 'project_user.json': { user: 'joão' } });

		eq(api.ler(c, 'modoLocal'), true);
		api.gravar(c, { sigla: api.ler(c, 'sigla'), modoLocal: true, aparenciaDesteComputador: { accent: '#111111', gradientStart: '#222222', gradientEnd: '#333333' } });
		eq([c.doc(COMPUTADOR).localMode, c.doc(COMPUTADOR).designer, c.doc(COMPUTADOR).homeOffice, c.doc(COMPUTADOR).user], [true, 'JOAO', undefined, undefined]);
		eq(copia(c.doc('project_user.json')), { user: 'joão' }); // o antigo fica no lugar
		eq(c.doc(PERSONALIZADO).APPEARANCE.mode, 'light');
		eq(api.paraLer(api.COPIA_DA_BUSCA, function (n) { return n === 'busca_v2.json'; }), 'busca_v2.json');
	}
});

// o preset de render: o nome curto (o rodapé do painel de templates), o H.264 preferido e a lista sem os _HIDDEN
const PRESETS_DO_AFTER = ['H.264 - Match Render Settings - 15 Mbps', 'H.264 - Match Render Settings - 40 Mbps', 'High Quality', 'Lossless with Alpha', '_HIDDEN X Factor 8 Bit', '_HIDDEN H.264 - 15 Mbps'];

REGRAS.push({
	arquivo: 'preset-de-render.js',
	global: 'PAD_PRESET_DE_RENDER',
	titulo: 'o preset de render (o nome curto, o H.264 preferido e a lista sem os ocultos)',
	casos: function (api) {
		test('o nome curto: com 3 partes ou mais, a primeira e a última', function () {
			eq(api.shortName('H.264 - Match Render Settings - 15 Mbps'), 'H.264 · 15 Mbps');
			eq(api.shortName('GLOBO PROMO - ProRes 422 HQ 1080i59 - entrega VT sem áudio'), 'GLOBO PROMO · entrega VT sem áudio');
			eq(api.shortName('A - B - C - D'), 'A · D');
		});

		test('o nome curto: com menos de 3 partes, o nome inteiro (o hífen sem espaço não separa)', function () {
			eq(api.shortName('High Quality with Alpha'), 'High Quality with Alpha');
			eq(api.shortName('ProRes - 4444'), 'ProRes - 4444');
			eq(api.shortName('H.264-Match-15'), 'H.264-Match-15');
			eq(api.shortName(''), '');
		});

		test('o nome curto não tem espaço sobrando nas pontas das partes', function () {
			eq(api.shortName('  H.264 -  Match   -   15 Mbps  '), 'H.264 · 15 Mbps');
		});

		test('a lista sem os _HIDDEN (os presets internos do After), em qualquer posição, na mesma ordem', function () {
			eq(api.withoutHidden(PRESETS_DO_AFTER), ['H.264 - Match Render Settings - 15 Mbps', 'H.264 - Match Render Settings - 40 Mbps', 'High Quality', 'Lossless with Alpha']);
			eq(api.withoutHidden(['_HIDDEN A', 'B', '_HIDDEN C', 'D']), ['B', 'D']);
			eq(api.withoutHidden([]), []);
		});

		test('o H.264 preferido: o de 15 Mbps (o padrão do After, em qualquer idioma), nunca um _HIDDEN', function () {
			eq(api.preferredH264(PRESETS_DO_AFTER), 'H.264 - Match Render Settings - 15 Mbps');
			eq(api.preferredH264(['_HIDDEN H.264 - 15 Mbps', 'H.264 - Paramètres de rendu - 15 Mbps']), 'H.264 - Paramètres de rendu - 15 Mbps');
		});

		test('o H.264 preferido: sem o de 15 Mbps no fim, qualquer H.264 de 15 Mbps; depois qualquer H.264; senão vazio', function () {
			eq(api.preferredH264(['H264 - 40 Mbps', 'Meu H.264 15 Mbps v2']), 'Meu H.264 15 Mbps v2');
			eq(api.preferredH264(['Lossless', 'H264 - 40 Mbps']), 'H264 - 40 Mbps');
			eq(api.preferredH264(['Lossless', 'High Quality']), '');
			eq(api.preferredH264([]), '');
		});
	},
	es3: function (api) {
		eq(api.shortName('H.264 - Match Render Settings - 15 Mbps'), 'H.264 · 15 Mbps');
		eq(api.withoutHidden(['_HIDDEN A', 'B']).length, 1);
		eq(api.preferredH264(PRESETS_DO_AFTER), 'H.264 - Match Render Settings - 15 Mbps');
	}
});

// as referências de comp nas expressões: comp("NOME") reescrito para o nome novo (o preenchimento, host/api.jsx)
REGRAS.push({
	arquivo: 'referencias-de-comp.js',
	global: 'PAD_REFERENCIAS_DE_COMP',
	titulo: 'as referências de comp nas expressões (comp("NOME") → o nome novo)',
	casos: function (api) {
		const MAPA = { BG: 'BG_2', 'PRINCIPAL': 'RDP - ANA' };

		test('reescreve comp("…") com aspas duplas, simples e crases', function () {
			eq(api.rewrite('comp("BG").layer(1).transform.opacity', MAPA), 'comp("BG_2").layer(1).transform.opacity');
			eq(api.rewrite("comp('BG').layer('X').position", MAPA), "comp('BG_2').layer('X').position");
			eq(api.rewrite('comp(`BG`).width', MAPA), 'comp(`BG_2`).width');
		});

		test('reescreve com espaços dentro e antes dos parênteses, sem mexer neles', function () {
			eq(api.rewrite('comp ( "BG" ) .layer(1)', MAPA), 'comp ( "BG_2" ) .layer(1)');
			eq(api.rewrite('comp(\n\t"BG"\n)', MAPA), 'comp(\n\t"BG_2"\n)');
		});

		test('reescreve todas as citações, de nomes diferentes, na mesma expressão', function () {
			eq(api.rewrite('a = comp("BG").width; b = comp(\'PRINCIPAL\').layer("BG"); c = comp("BG").height;', MAPA),
				'a = comp("BG_2").width; b = comp(\'RDP - ANA\').layer("BG"); c = comp("BG_2").height;');
		});

		test('NÃO muda: um nome que é só pedaço de outro (ou que tem outro dentro)', function () {
			eq(api.rewrite('comp("BG FUNDO").layer(1)', MAPA), 'comp("BG FUNDO").layer(1)');
			eq(api.rewrite('comp("BG_2").layer(1)', MAPA), 'comp("BG_2").layer(1)');
			eq(api.rewrite('comp("XBG")', MAPA), 'comp("XBG")');
		});

		test('NÃO muda: o nome fora de comp(…) (layer, texto, comentário, outra função)', function () {
			const casos = [
				'thisComp.layer("BG").transform.opacity',
				'"BG"',
				'// comp BG\nvalue',
				'footage("BG").sourceText',
				'mycomp("BG")',
				'thisComp("BG")',
				'comp(nome).layer(1)',
				'comp("bg").layer(1)', // o After diferencia a caixa no comp("…")
				'comp(`${n}BG`)'
			];

			casos.forEach(function (c) {
				eq(api.rewrite(c, MAPA), c);
			});
		});

		test('o nome novo com aspas ou barra é escapado para a aspa usada', function () {
			eq(api.rewrite('comp("BG")', { BG: 'D"AVILA' }), 'comp("D\\"AVILA")');
			eq(api.rewrite("comp('BG')", { BG: "D'AVILA" }), "comp('D\\'AVILA')");
			eq(api.rewrite('comp("D\\"AVILA")', { 'D"AVILA': 'X' }), 'comp("X")');
		});

		test('o mapa vazio, a expressão vazia ou nula: devolve a mesma', function () {
			eq(api.rewrite('comp("BG")', {}), 'comp("BG")');
			eq(api.rewrite('', MAPA), '');
			eq(api.rewrite(null, MAPA), '');
		});

		test('um nome como "constructor" ou "toString" não vem do protótipo do mapa', function () {
			eq(api.rewrite('comp("constructor").layer(1)', MAPA), 'comp("constructor").layer(1)');
			eq(api.rewrite('comp("toString")', { toString: 'T_2' }), 'comp("T_2")');
		});

		test('cita: a expressão lê a comp pelo nome (só dentro de comp(…), o nome inteiro)', function () {
			eq(api.cites('comp("PRINCIPAL").layer("TITULO").text.sourceText', 'PRINCIPAL'), true);
			eq(api.cites("comp( 'PRINCIPAL' )", 'PRINCIPAL'), true);
			eq(api.cites('thisComp.layer("PRINCIPAL")', 'PRINCIPAL'), false);
			eq(api.cites('comp("PRINCIPAL 2")', 'PRINCIPAL'), false);
			eq(api.cites('', 'PRINCIPAL'), false);
		});
	},
	es3: function (api) {
		eq(api.rewrite('comp("BG").layer(1); comp(\'BG FUNDO\')', { BG: 'BG_2' }), 'comp("BG_2").layer(1); comp(\'BG FUNDO\')');
		eq(api.cites('comp("A")', 'A'), true);
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

	test('carrega como no ExtendScript (ES3, variável global ' + r.global + ')', function () {
		const g = loadEs3(file, r.global);

		assert.ok(g, 'a variável global ' + r.global + ' não existe');
		r.es3(g);
	});

	// o painel do After liga o Node (--enable-nodejs --mixed-context): a página tem window e também module
	test('carrega como no painel do After (window e module juntos): vira window.' + r.global, function () {
		const ctx = vm.createContext({ module: { exports: {} } });

		vm.runInContext('var window = this;', ctx);
		vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
		assert.ok(ctx.window[r.global], 'window.' + r.global + ' não existe');
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
