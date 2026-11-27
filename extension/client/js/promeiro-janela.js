/*

---------------------------------------------------------------
> PROMeiro · produções — a janela das Produções no After (jmbillard/TEXTAO#148)
---------------------------------------------------------------

Uma versão compacta da tela de produções do PROMeiro, com o visual dele (css/promeiro.css). A fila sem rede vem
depois (jmbillard/TEXTAO#150): por ora, sem rede, a caixinha mostra o erro e nada trava.

  - a lista: a praça no topo (lembrada por designer, neste computador), as abas Entrada, Produzindo e Minhas, cada
    uma com a contagem, e em cada Produção só a claquete e o estado: "pronto para abrir" (bolinha cheia), "sem pasta"
    ou "sem atração" (bolinha vazada, em laranja);
  - a Produção aberta: a praça e a etapa, a claquete, a versão da chamada só como o código (AH), o estado e as artes
    (a bolinha laranja com o número, o nome, a feita riscada e o fogo da complexidade), com a contagem "1 de 3". A
    seta ← volta à lista (o nome só na dica). Sem horário de exibição;
  - estreita (até 640 px), a lista ou a Produção; larga, as duas lado a lado;
  - só a chave ligada lê: com a pendente, a janela não mostra a lista, só o aviso de que falta o administrador ligar.

Os botões (jmbillard/TEXTAO#149), no pé da Produção: a seta ← (voltar para a Entrada, só de quem está nela ou da
Entregue; o nome só na dica), Preencher templates, Abrir projeto e Entreguei (só de quem está nela):
  - Abrir projeto e Preencher templates pegam a Produção (o aviso do Padeiro, js/promeiro.js take) e pedem à janela
    PROJETO (abrir ou criar o projeto, como pelo card do NO TRELLO: js/project.js) ou à A FORMA (os templates da
    atração: js/app.js) pelo host (promeiroPedir). A caixinha diz "Você pegou a Produção" e, quando a janela PROJETO
    responde, "Projeto criado: …" ou "Abrindo: …";
  - a arte: um clique na bolinha marca ou desmarca (só quem está na Produção); o fogo: um clique sobe um nível (manda
    o nível pedido, à prova de repetição), menos na Entregue;
  - Entreguei com artes por marcar avisa quais faltam, com "Entregar assim mesmo" e "Cancelar";
  - a caixinha: o que aconteceu, o Desfazer (pegar, entregar e voltar) e o × na ponta direita.

As Produções vêm do PROMeiro pelo caminho do Padeiro (js/promeiro.js: a chave, o endereço e o pedido). A lista é lida
de novo de tempos em tempos e quando a janela volta à frente.

"Minhas": a lista do PROMeiro (GET /api/padeiro/producoes) não diz quem está em cada Produção; a Produção aberta diz
(`comVoce`). Até a lista trazer isso (`comVoce` ou `designers` em cada item, que a janela já usa quando vier), a
janela lê a Produção de cada uma em Produzindo (é onde o designer fica) para saber quais são suas.

*/

(function () {
	'use strict';

	var REFRESH = 30000; // a lista é lida de novo a cada 30 s, com a janela à vista
	var POOL = 4; // quantas Produções lidas ao mesmo tempo (as de Produzindo, para a aba Minhas)
	var PRACA_KEY = 'pad.promeiro.praca'; // a praça escolhida, por designer: { "<designer>": "SP" | "*" }
	var TODAS = '*';
	var ETAPA = { entrada: 'Entrada', produzindo: 'Produzindo', entregue: 'Entregue' };
	var NIVEL = { 1: 'BAIXA', 2: 'MÉDIA', 3: 'ALTA' };
	var NADA = { entrada: 'nada na entrada!', produzindo: 'nada em produção', minhas: 'nada com você agora' };

	var S = {
		estado: 'lendo', // lendo | ligada | pendente | desligado | fora
		local: false,
		designer: '',
		lista: [],
		comVoce: {}, // id → true / false (lido da Produção)
		praca: null, // null: ainda não escolhida (vale a lembrada)
		aba: 'entrada',
		menu: false,
		aberta: null, // o id da Produção aberta
		producao: null, // a Produção aberta, como o PROMeiro mandou
		lendoProducao: false,
		naoExiste: false,
		falta: null, // o id da Produção com o aviso das artes que faltam (o Entreguei)
		caixa: null, // a caixinha: { n, texto, sub, desfaz: { acao, producao }, atencao }
		ocupado: false // uma ação a caminho do PROMeiro: os botões esperam
	};

	var PROJECT_PANEL_ID = 'com.jmbillard.opadeiro.project';
	var TEMPLATES_PANEL_ID = 'com.jmbillard.opadeiro.panel';
	var CAIXA_MS = 10000; // a caixinha some sozinha depois disso (a nova toma o lugar)
	var PROJETO_ESPERA = 120000; // quanto a janela espera a resposta da janela PROJETO

	var ic = {
		voltar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
		baixo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
		check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
		entrada: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5.5M11 6l-6 6 6 6"/></svg>'
	};

	var call = PAD_BRIDGE.call;

	function $(id) {
		return document.getElementById(id);
	}

	function esc(v) {
		return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	/* ---------- a praça lembrada (por designer, neste computador) ---------- */

	function remembered() {
		try {
			var all = JSON.parse(localStorage.getItem(PRACA_KEY) || '{}') || {};

			return all[S.designer || ''] || TODAS;
		} catch (err) {
			return TODAS;
		}
	}

	function remember(praca) {
		try {
			var all = JSON.parse(localStorage.getItem(PRACA_KEY) || '{}') || {};

			all[S.designer || ''] = praca;
			localStorage.setItem(PRACA_KEY, JSON.stringify(all));
		} catch (err) { }
	}

	function praca() {
		return S.praca || remembered();
	}

	/* ---------- consultas ---------- */

	function id(p) {
		return String(p.producao || '');
	}

	function daPraca(p) {
		return praca() === TODAS || p.praca === praca();
	}

	function minha(p) {
		if (typeof p.comVoce === 'boolean') return p.comVoce;

		if (p.designers instanceof Array && S.designer) {
			var eu = S.designer.toLowerCase();

			return p.designers.some(function (d) {
				return String(d).toLowerCase() === eu;
			});
		}

		return !!S.comVoce[id(p)];
	}

	function listas() {
		return {
			entrada: S.lista.filter(function (p) {
				return p.etapa === 'entrada' && daPraca(p);
			}),
			produzindo: S.lista.filter(function (p) {
				return p.etapa === 'produzindo' && daPraca(p);
			}),
			minhas: S.lista.filter(function (p) {
				return p.etapa !== 'entregue' && minha(p);
			})
		};
	}

	function pracas() {
		var seen = {};

		S.lista.forEach(function (p) {
			if (p.praca) seen[p.praca] = (seen[p.praca] || 0) + 1;
		});

		if (praca() !== TODAS && !seen[praca()]) seen[praca()] = 0;

		return Object.keys(seen).sort().map(function (k) {
			return { sigla: k, abertas: seen[k] };
		});
	}

	/* ---------- o desenho ---------- */

	function estadoDe(p) {
		var texto = p.estado || (p.pronto ? 'pronto para abrir' : '');

		if (!texto) return '';

		var tip = p.pronto ? 'a pasta do projeto já está definida no PROMeiro' : 'o PROMeiro ainda não tem: ' + texto.replace(/^sem /, '');

		return '<span class="pr-pronto' + (p.pronto ? '' : ' falta') + '" title="' + esc(tip) + '"><i></i>' + esc(texto) + '</span>';
	}

	function topo() {
		var chave = '';

		if (S.estado === 'ligada') chave = '<span class="pr-chave" title="' + esc('chave ligada' + (S.designer ? ' a ' + S.designer : '')) + '"><span class="pr-bola"></span><span>' + esc(S.designer.split(' ')[0] || 'ligada') + '</span></span>';
		if (S.estado === 'pendente') chave = '<span class="pr-chave" title="chave do Padeiro pendente"><span class="pr-bola atencao"></span><span>pendente</span></span>';
		if (S.estado === 'fora') chave = '<span class="pr-chave" title="o PROMeiro não respondeu"><span class="pr-bola atencao"></span><span>sem resposta</span></span>';

		return '<div class="pr-topo"><span class="logo-app"><b>PROM</b>eiro</span><span class="pr-onde">produções</span><span class="espaco"></span>' + chave + '</div>';
	}

	function filtro() {
		var atual = praca();
		var rot = atual === TODAS ? 'Todas as praças' : atual;
		var op = function (v, t, extra) {
			return '<button type="button" class="pr-menu-item" role="menuitemradio" aria-checked="' + (atual === v) + '" data-acao="praca" data-v="' + esc(v) + '"><span>' + esc(t) + '</span>' + (extra ? '<small>' + esc(extra) + '</small>' : '') + '</button>';
		};
		var menu = S.menu ? '<div class="pr-menu" role="menu" data-menu>' + pracas().map(function (x) {
			return op(x.sigla, x.sigla, x.abertas + (x.abertas === 1 ? ' aberta' : ' abertas'));
		}).join('') + '<hr>' + op(TODAS, 'Todas as praças', '') + '</div>' : '';

		return '<div class="pr-filtro"><button type="button" class="pr-praca" id="pr-praca" data-acao="menu" aria-haspopup="menu" aria-expanded="' + S.menu + '" title="a praça">' + esc(rot) + ic.baixo + '</button>' + menu + '</div>';
	}

	function card(p, aba) {
		var sigla = (aba === 'minhas' || praca() === TODAS) && p.praca ? '<span class="pr-praca-sigla">' + esc(p.praca) + '</span>' : '';

		return '<li><button type="button" class="prod-card" data-abrir="' + esc(id(p)) + '" aria-current="' + (S.aberta === id(p)) + '"><span class="pr-card-l1"><span class="prod-claquete">' + esc(p.claq) + '</span>' + sigla + '</span>' + estadoDe(p) + '</button></li>';
	}

	function aviso() {
		if (S.estado === 'lendo') return '<p class="pr-lendo">lendo…</p>';
		if (S.estado === 'pendente') return '<p class="pr-aviso" role="status"><b>Chave pendente:</b> este Padeiro está aguardando um administrador do PROMeiro ligar a chave a você.<small>as Produções aparecem aqui sozinhas quando a chave for ligada.</small></p>';
		if (S.estado === 'fora') return '<div class="pr-aviso" role="status"><b>O PROMeiro não respondeu.</b> sem rede, ou o PROMeiro fora do ar: a janela tenta de novo sozinha. · PAD_118<br><button type="button" class="pr-de-novo" data-acao="de-novo">tentar agora</button></div>';
		if (S.local) return '<p class="pr-aviso" role="status"><b>Modo local:</b> nada fala com o PROMeiro neste computador.</p>';

		return '<p class="pr-aviso" role="status"><b>Sem o endereço do PROMeiro.</b> ponha o endereço na configuração, aba BUSCAR.</p>';
	}

	function coluna() {
		if (S.estado !== 'ligada') return topo() + aviso();

		var l = listas();
		var lista = l[S.aba];
		var aba = function (k, t) {
			return '<button type="button" class="pr-aba" role="tab" data-acao="aba" data-v="' + k + '" aria-selected="' + (S.aba === k) + '">' + t + '<span class="pr-conta">' + l[k].length + '</span></button>';
		};

		return topo() + filtro() +
			'<div class="pr-abas" role="tablist">' + aba('entrada', 'Entrada') + aba('produzindo', 'Produzindo') + aba('minhas', 'Minhas') + '</div>' +
			'<div class="pr-rolar" id="pr-rolar"><ul class="pr-cards">' + lista.map(function (p) {
				return card(p, S.aba);
			}).join('') + '</ul>' + (lista.length ? '' : '<p class="pr-nada">' + NADA[S.aba] + '</p>') + '</div>';
	}

	// o fogo da complexidade (o do editor do PROMeiro, src/ui/fogo.tsx): a vela, a fogueira e o incêndio, em traço à mão
	var FOGO = {
		1: { w: 9, x0: 0.5, vivos: ['M5.6 6.6 C 5.9 8.4, 7.6 10.2, 7.5 13 C 7.4 15.3, 6.2 16.6, 5 16.5 C 3.5 16.4, 2.6 15.1, 2.8 13.4 C 3 11.4, 4.6 9.8, 5.2 7.4'], parados: ['M5 16.9 C 5.1 17.8, 5 18.5, 5.1 19.3', 'M2.4 22.2 C 2.3 21.2, 2.3 20.4, 2.4 19.6 C 4.2 19.3, 5.9 19.4, 7.7 19.7 C 7.8 20.5, 7.7 21.4, 7.8 22.2'] },
		2: { w: 16, vivos: ['M8.5 5.2 C 9.7 8.2, 12.7 9.9, 13.3 13.4 C 13.8 16.5, 11.5 18.5, 8.2 18.4 C 4.9 18.3, 2.6 16.3, 2.9 13.4 C 3.1 11.5, 4.1 10.3, 5.1 9.3 C 5.2 10.7, 5.8 11.6, 6.7 12.1 C 6.4 9.5, 7.2 7.3, 8.7 5.6', 'M8.1 17.9 C 6.7 17.5, 6.2 16.1, 6.8 14.9 C 7.3 13.9, 8.2 13.3, 8.6 12.1 C 9.6 13.5, 10.4 14.8, 10 16.3 C 9.7 17.3, 9 17.9, 8.4 18'], parados: ['M1.4 21.7 C 5.9 20.5, 10.3 19.6, 14.7 18.8', 'M1.7 18.9 C 6.1 19.5, 10.5 20.6, 14.5 21.9'] },
		3: { w: 24, vivos: ['M2.6 20.9 C 1.3 17.7, 2 14.4, 3.9 12.1 C 4 13.8, 4.8 15, 5.9 15.5 C 5.2 11.6, 6.8 8.1, 9.3 6 C 9.6 8.5, 10.6 9.8, 11.5 10.3 C 11 6.7, 12.4 3.5, 14.7 1.4 C 15.1 4.9, 16.9 7.3, 18.1 9.2 C 18.9 8.3, 19.3 7.1, 19.2 5.6 C 21.5 8.3, 22.7 11.6, 22.5 14.6 C 22.3 17.4, 21.7 19.2, 20.9 20.9 C 15.1 21.5, 8.7 21.3, 2.2 20.6'], parados: [], hachura: 'M1.5 21 L6.5 9 L4.6 21.4 L9.6 6.2 L7.9 21.2 L12.8 3.4 L11.2 21.5 L15.9 3.6 L14.4 21.3 L19 6.4 L17.6 21.4 L22.3 9.6 L20.9 21.2' }
	};
	var nClip = 0;

	function fogo(n) {
		var f = FOGO[n];
		var clip = 'pr-fogo-' + ++nClip;
		var path = function (d) {
			return '<path d="' + d + '"/>';
		};
		var hach = f.hachura ? '<clipPath id="' + clip + '"><path d="' + f.vivos[0] + '"/></clipPath><path class="hachura" clip-path="url(#' + clip + ')" d="' + f.hachura + '"/>' : '';

		return '<svg class="fogo n' + n + '" width="' + f.w + '" height="24" viewBox="' + (f.x0 || 0) + ' 0 ' + f.w + ' 24" aria-hidden="true"><g class="chama">' + hach + f.vivos.map(path).join('') + '</g>' + f.parados.map(path).join('') + '</svg>';
	}

	// o risco à mão no meio das letras (a arte feita), um de três traços
	var RISCOS = ['M3 6 C 30 9, 60 4, 98 7', 'M2 7 C 28 5, 62 8.5, 98 5.5', 'M2 6.5 C 25 8.5, 55 4.5, 98 7'];

	// marca: quem está na Produção marca a arte (a bolinha vira botão); classifica: o fogo sobe com um clique
	function arte(a, k, marca, classifica) {
		var nivel = [1, 2, 3].indexOf(a.fogo) >= 0 ? a.fogo : null;
		var nome = a.feita ? '<span class="pr-risco">' + esc(a.nome) + '<svg viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true"><path d="' + RISCOS[k % 3] + '"/></svg></span>' : esc(a.nome);
		var tip = a.feita ? 'feita' + (a.marcada && a.marcada.por ? ' · marcada por ' + a.marcada.por : '') : 'arte ' + (k + 1);
		var b = marca ? ' data-acao="arte" data-k="' + k + '" role="button" tabindex="0" aria-pressed="' + !!a.feita + '" aria-label="' + esc(a.nome + (a.feita ? ': feita' : '')) + '"' : '';
		var cx = '<span class="cx-vaga"></span>';

		if (marca) tip += a.feita ? ' · clique para voltar a fazer' : ' · clique: feita';
		if (nivel && classifica) cx = '<button type="button" class="cx" data-acao="fogo" data-k="' + k + '" aria-label="complexidade ' + NIVEL[nivel] + ': clique sobe um nível" title="complexidade: ' + NIVEL[nivel] + ' · clique sobe um nível">' + fogo(nivel) + '</button>';
		else if (nivel) cx = '<span class="cx" role="img" aria-label="complexidade ' + NIVEL[nivel] + '" title="complexidade: ' + NIVEL[nivel] + '">' + fogo(nivel) + '</span>';

		return '<li class="' + (a.feita ? 'feita' : '') + '"><div class="arte-linha"><span class="b" title="' + esc(tip) + '"' + b + '><span class="num">' + (k + 1) + '</span>' + ic.check + '</span><span class="txt"><b>' + nome + '</b></span></div>' + cx + '</li>';
	}

	// o pé: a seta ← (voltar para a Entrada), Preencher templates, Abrir projeto e Entreguei
	function pe(p) {
		var dis = S.ocupado ? ' disabled' : '';
		var volta = '<button type="button" class="pr-volta" data-acao="devolver" title="voltar para a Entrada" aria-label="voltar para a Entrada"' + dis + '>' + ic.entrada + '</button>';
		var bts = [];

		if (p.comVoce && p.etapa === 'produzindo') bts.push(volta);
		else if (p.etapa === 'entregue') bts.push(volta);

		bts.push('<button type="button" class="botao" data-acao="templates"' + dis + '>Preencher templates</button>');
		bts.push('<button type="button" class="botao" data-acao="projeto"' + dis + '>Abrir projeto</button>');
		if (p.comVoce && p.etapa === 'produzindo') bts.push('<button type="button" class="botao primario" data-acao="entreguei"' + dis + '>Entreguei</button>');

		return '<footer class="pr-pe">' + bts.join('') + '</footer>';
	}

	// o Entreguei com artes por marcar: quais faltam, com "Entregar assim mesmo" e "Cancelar"
	function avisoFalta(p) {
		if (S.falta !== p.id) return '';

		var f = faltam(p);
		var dis = S.ocupado ? ' disabled' : '';

		return '<div class="pr-falta" role="alert"><p class="pr-falta-texto">' + (f.length === 1 ? 'Falta marcar 1 arte no checklist:' : 'Faltam marcar ' + f.length + ' artes no checklist:') + '</p><ul class="pr-falta-artes">' + f.map(function (n) {
			return '<li>' + esc(n) + '</li>';
		}).join('') + '</ul><span class="pr-falta-botoes"><button type="button" class="botao assim-mesmo" data-acao="assim-mesmo"' + dis + '>Entregar assim mesmo</button><button type="button" class="botao" data-acao="cancelar-falta">Cancelar</button></span></div>';
	}

	function faltam(p) {
		return (p.artes instanceof Array ? p.artes : []).filter(function (a) {
			return !a.feita;
		}).map(function (a) {
			return a.nome;
		});
	}

	// a caixinha: o que aconteceu, o Desfazer (quando cabe) e o × na ponta direita
	function caixinha() {
		var c = S.caixa;

		if (!c || S.estado !== 'ligada') return '';

		return '<div class="pr-caixa-in" role="status" data-n="' + c.n + '">' + (c.atencao ? '<span class="pr-bola atencao"></span>' : '') + '<span class="pr-caixa-texto">' + esc(c.texto) + (c.sub ? '<small>' + esc(c.sub) + '</small>' : '') + '</span>' +
			(c.desfaz ? '<button type="button" class="pr-caixa-desfazer" data-acao="desfazer"' + (S.ocupado ? ' disabled' : '') + '>Desfazer</button>' : '') +
			'<button type="button" class="pr-caixa-fechar" data-acao="fechar" aria-label="fechar" title="fechar">×</button></div>';
	}

	function folha() {
		if (S.estado !== 'ligada') return '';

		var voltar = '<button type="button" class="pr-voltar" data-acao="voltar" title="voltar à lista" aria-label="voltar à lista">' + ic.voltar + '</button>';

		if (!S.aberta) {
			var l = listas();

			return '<div class="pr-vazia"><b>Escolha uma Produção</b>com você: ' + l.minhas.length + ' · na entrada' + (praca() === TODAS ? '' : ' ' + esc(praca())) + ': ' + l.entrada.length + '</div>';
		}

		if (S.naoExiste) return '<div class="pr-folha-rolar"><div class="pr-cab"><span class="linha">' + voltar + '</span><p class="pr-aviso" role="status"><b>Essa Produção não está mais aberta no PROMeiro.</b> · PAD_119</p></div></div>';

		var p = S.producao && S.producao.id === S.aberta ? S.producao : null;

		if (!p) return '<div class="pr-folha-rolar"><div class="pr-cab"><span class="linha">' + voltar + '</span><p class="pr-lendo">lendo…</p></div></div>';

		var artes = p.artes instanceof Array ? p.artes : [];
		var conta = { feitas: artes.filter(function (a) { return a.feita; }).length, total: artes.length };
		var rotulo = [p.praca, ETAPA[p.etapa] || p.etapa].filter(Boolean).join(' · ');
		var marca = !!p.comVoce && p.etapa !== 'entregue';
		var classifica = p.etapa !== 'entregue';

		return '<div class="pr-folha-rolar"><div class="pr-cab">' +
			'<span class="linha">' + voltar + '<span class="pr-rotulo">' + esc(rotulo) + '</span></span>' +
			'<h2>' + esc(p.claquete) + '</h2>' +
			(p.versao ? '<span class="pr-versao" title="versão da chamada">' + esc(p.versao) + '</span>' : '') +
			estadoDe(p) +
			'</div><div><p class="pr-conta-artes">Artes <small>' + (artes.length ? conta.feitas + ' de ' + conta.total : '') + '</small></p>' +
			(artes.length ? '<ol class="artes">' + artes.map(function (a, k) {
				return arte(a, k, marca, classifica);
			}).join('') + '</ol>' : '<p class="pr-nada">sem artes no roteiro</p>') +
			'</div></div>' + avisoFalta(p) + pe(p);
	}

	// redesenha a janela (a rolagem da lista fica onde estava). anima: a parte que acabou de abrir entra suave
	function render(anima) {
		var app = $('pr-app');
		var rolar = $('pr-rolar');
		var top = rolar ? rolar.scrollTop : 0;
		var folhaRolar = document.querySelector('.pr-folha-rolar');
		var folhaTop = folhaRolar && !anima ? folhaRolar.scrollTop : 0;
		// o foco num botão da Produção (a arte, o fogo) volta para ele depois de redesenhar
		var foco = document.activeElement && document.activeElement.closest ? document.activeElement.closest('#pr-folha [data-acao], #pr-caixa [data-acao]') : null;
		var focoSel = foco ? '[data-acao="' + foco.getAttribute('data-acao') + '"]' + (foco.hasAttribute('data-k') ? '[data-k="' + foco.getAttribute('data-k') + '"]' : '') : '';

		app.classList.toggle('so-aviso', S.estado !== 'ligada');
		app.setAttribute('aria-busy', S.estado === 'lendo' ? 'true' : 'false');
		document.body.setAttribute('data-tela', S.aberta && S.estado === 'ligada' ? 'producao' : 'lista');
		document.body.setAttribute('data-estado', S.estado);
		$('pr-col').innerHTML = coluna();
		$('pr-folha').innerHTML = folha();
		$('pr-caixa').innerHTML = caixinha();

		if ($('pr-rolar')) $('pr-rolar').scrollTop = top;
		if (document.querySelector('.pr-folha-rolar')) document.querySelector('.pr-folha-rolar').scrollTop = folhaTop;
		if (focoSel && document.querySelector(focoSel)) document.querySelector(focoSel).focus({ preventScroll: true });
		placeCaixa();

		if (anima) {
			var alvo = anima === 'lista' ? $('pr-col') : $('pr-folha');

			alvo.classList.remove('entra');
			void alvo.offsetWidth;
			alvo.classList.add('entra');
		}
	}

	// a caixinha fica logo acima do pé da Produção (ou do aviso das artes que faltam), que pode quebrar em duas linhas
	function placeCaixa() {
		var box = $('pr-caixa');
		var acima = document.querySelector('.pr-falta') || document.querySelector('.pr-pe');
		var top = acima && acima.getClientRects().length ? acima.getBoundingClientRect().top : 0;

		box.style.bottom = top ? Math.max(16, Math.round(window.innerHeight - top + 8)) + 'px' : '';
	}

	window.addEventListener('resize', placeCaixa);

	/* ---------- a leitura ---------- */

	var lendoLista = null;

	// lê a lista (e, para a aba Minhas, quem está em cada Produção em Produzindo)
	function load(force) {
		if (lendoLista) return lendoLista;

		lendoLista = PAD_PROMEIRO.windowList(force).then(function (r) {
			var antes = S.estado;

			S.estado = r.estado === 'ligada' && r.lista ? 'ligada' : r.estado === 'ligada' ? 'fora' : r.estado;
			S.local = !!r.local;
			if (r.designer !== undefined) S.designer = r.designer || '';

			if (S.estado === 'ligada') {
				S.lista = r.lista;
				// a Produção aberta que saiu da lista (entregue, arquivada) continua aberta: a leitura dela diz
			} else {
				S.lista = [];
				S.aberta = null;
				S.producao = null;
			}

			render(antes !== S.estado && S.estado === 'ligada' ? 'lista' : null);
			if (S.estado === 'ligada') whoIsMine();
			if (S.estado === 'ligada' && S.aberta) loadProduction(S.aberta, true);
		}).catch(function () {
			S.estado = 'fora';
			render();
		}).finally(function () {
			lendoLista = null;
		});

		return lendoLista;
	}

	// quem está em cada Produção em Produzindo (a lista não diz): lê a Produção de cada uma, POOL por vez
	async function whoIsMine() {
		var faltam = S.lista.filter(function (p) {
			return p.etapa === 'produzindo' && typeof p.comVoce !== 'boolean' && !(p.designers instanceof Array);
		}).map(id);
		var mudou = false;
		var next = 0;

		async function worker() {
			while (next < faltam.length) {
				var pid = faltam[next++];
				var r = await PAD_PROMEIRO.windowProduction(pid).catch(function () {
					return {};
				});

				if (r.producao) {
					if (S.comVoce[pid] !== !!r.producao.comVoce) mudou = true;
					S.comVoce[pid] = !!r.producao.comVoce;
				}
			}
		}

		var workers = [];

		for (var i = 0; i < Math.min(POOL, faltam.length); i++) workers.push(worker());

		await Promise.all(workers);

		if (mudou) render();
	}

	// lê a Produção aberta. quieta: a leitura de tempos em tempos (não mostra o "lendo…" de novo)
	async function loadProduction(pid, quieta) {
		if (!quieta) {
			S.producao = null;
			S.naoExiste = false;
		}

		var r = await PAD_PROMEIRO.windowProduction(pid).catch(function () {
			return { estado: 'fora' };
		});

		if (S.aberta !== pid) return; // outra foi aberta enquanto esta lia

		if (r.estado !== 'ligada') {
			if (!quieta) load(true);

			return;
		}

		S.naoExiste = !!r.naoExiste;
		S.producao = r.producao || null;
		if (S.producao) S.comVoce[pid] = !!S.producao.comVoce;
		render();
	}

	/* ---------- as ações ---------- */

	function open(pid) {
		S.menu = false;
		S.falta = null;
		S.aberta = pid;
		S.producao = null;
		S.naoExiste = false;
		render('folha');
		loadProduction(pid);
	}

	function back() {
		if (!S.aberta) return;

		S.aberta = null;
		S.producao = null;
		S.naoExiste = false;
		S.falta = null;
		render('lista');

		var b = document.querySelector('.prod-card');

		if (b && window.matchMedia('(max-width: 640px)').matches) b.focus({ preventScroll: true });
	}

	/* ---------- os botões da Produção (jmbillard/TEXTAO#149) ---------- */

	var nCaixa = 0;
	var tCaixa = null;

	// mostra a caixinha (a nova toma o lugar da anterior). desfaz: { acao, producao } (o Desfazer), ou null
	function caixa(texto, sub, desfaz, atencao) {
		S.caixa = { n: ++nCaixa, texto: texto, sub: sub || '', desfaz: desfaz || null, atencao: !!atencao };
		clearTimeout(tCaixa);
		tCaixa = setTimeout(function () {
			S.caixa = null;
			render();
		}, CAIXA_MS);
		render();

		return S.caixa.n;
	}

	// a Produção aberta, como o PROMeiro mandou (null enquanto lê)
	function aberta() {
		return S.estado === 'ligada' && S.producao && S.producao.id === S.aberta ? S.producao : null;
	}

	// o item da lista da Produção (a atração, o card, o filme): a Produção aberta não diz
	function itemDe(pid) {
		return S.lista.filter(function (p) {
			return id(p) === pid;
		})[0] || {};
	}

	// a Produção mudou no PROMeiro: a janela fica com a que veio na resposta e lê a lista de novo
	function mudou(producao) {
		if (producao && producao.id === S.aberta) {
			S.producao = producao;
			S.comVoce[producao.id] = !!producao.comVoce;
		}
		if (S.falta && (!aberta() || !faltam(aberta()).length)) S.falta = null;
		render();
		load();
	}

	// a chave deixou de valer no meio do caminho (pendente, revogada): nada age, a janela lê o estado de novo
	function semChave(r) {
		S.estado = r.estado === 'pendente' ? 'pendente' : 'lendo';
		S.caixa = null;
		S.falta = null;
		render();
		load(true);
	}

	// a resposta de uma ação (js/promeiro.js windowAction) → true quando o PROMeiro fez (a janela já atualizou).
	// recusada ou sem rede: a caixinha diz, e a Produção é lida de novo (o que a janela já tinha mudado volta)
	function feito(r, pid) {
		if (r.estado !== 'ligada') {
			semChave(r);

			return false;
		}

		if (r.semRede) {
			caixa('Sem rede: o PROMeiro não recebeu.', 'nada mudou lá; tente de novo quando a rede voltar.', null, true);
			loadProduction(pid, true);

			return false;
		}

		if (r.status === 200) {
			mudou(r.corpo.producao);

			return true;
		}

		caixa((r.corpo && r.corpo.erro) || 'O PROMeiro recusou (' + r.status + ').', '', null, true);
		if (r.corpo && r.corpo.producao) mudou(r.corpo.producao);
		else loadProduction(pid, true);

		return false;
	}

	// uma ação de cada vez: os botões esperam a resposta
	async function busy(fn) {
		if (S.ocupado) return;

		S.ocupado = true;
		render();
		try {
			await fn();
		} finally {
			S.ocupado = false;
			render();
		}
	}

	// pegar (Abrir projeto, Preencher templates): o aviso do Padeiro, se a pessoa ainda não está na Produção
	// → { sub, desfaz, atencao } para a caixinha
	async function pegar(p) {
		if (p.comVoce) return { sub: '' };

		var r = await PAD_PROMEIRO.take(p.id);
		var c = r.corpo || {};

		if (r.guardado) return { sub: 'Sem rede: o aviso fica guardado e vai quando a rede voltar.', atencao: true };
		if (r.erro) return { sub: 'O PROMeiro não foi avisado: ' + r.erro, atencao: true };
		if (r.status === 200) {
			// a Entregue (só a abertura fica registrada) e a repetida não pegam
			if (c.repetido || !(c.eventos || []).some(function (e) {
				return e === 'designer-entrou' || e === 'etapa';
			})) return { sub: '' };

			return { sub: 'Você pegou a Produção.', desfaz: { acao: r.aviso, producao: p.id } };
		}

		if ((r.status === 401 || r.status === 403) && c.estado) {
			semChave({ estado: c.estado });

			return { sub: '' };
		}

		return { sub: (c.erro || 'O PROMeiro recusou o aviso (' + r.status + ').') + (r.status >= 500 ? ' O aviso vai de novo depois.' : ''), atencao: true };
	}

	// Abrir projeto: pega e pede à janela PROJETO (abrir o .aep do card ou criar), que responde pelo host
	function abrirProjeto() {
		var p = aberta();

		if (!p) return;

		return busy(async function () {
			var item = itemDe(p.id);
			var pg = await pegar(p);

			if (S.estado !== 'ligada') return;

			var pedido;

			try {
				pedido = await call('promeiroPedir', { para: 'projeto', dados: { producao: p.id, claq: p.claquete, atr: item.atr || '', card: item.card || '', filme: item.fil ? item.filme || '' : '' } });
				PAD_BRIDGE.openPanel(PROJECT_PANEL_ID);
			} catch (err) {
				caixa('A janela PROJETO não abriu: ' + PAD_UTIL_ERR(err), pg.sub, pg.desfaz, true);
				mudou(null);

				return;
			}

			var n = caixa('Abrindo o projeto de ' + p.claquete + '…', pg.sub, pg.desfaz, pg.atencao);

			mudou(null);
			esperarProjeto(pedido.stamp, n, pg);
		});
	}

	// a resposta da janela PROJETO (o .aep aberto ou criado): a caixinha diz qual
	async function esperarProjeto(stamp, n, pg) {
		var fim = Date.now() + PROJETO_ESPERA;

		while (Date.now() < fim) {
			await new Promise(function (resolve) {
				setTimeout(resolve, 700);
			});

			var r = null;

			try {
				r = await call('promeiroPedido', { para: 'projeto-feito' });
			} catch (err) { }

			if (!r || !r.stamp || !r.dados || r.dados.pedido !== stamp) continue;

			var d = r.dados;
			var desfaz = S.caixa && S.caixa.n === n ? S.caixa.desfaz : pg.desfaz;

			if (d.erro) caixa('O projeto não abriu: ' + d.erro, pg.sub, desfaz, true);
			else if (d.pendente) caixa('Escolha a atração na janela PROJETO.', d.pendente, desfaz, true);
			else caixa((d.criado ? 'Projeto criado: ' : 'Abrindo: ') + d.arquivo, pg.sub, desfaz, pg.atencao);

			return;
		}
	}

	// Preencher templates: pega e pede à A FORMA os templates da atração
	function preencherTemplates() {
		var p = aberta();

		if (!p) return;

		return busy(async function () {
			var item = itemDe(p.id);
			var atr = item.atr || p.claquete;
			var pg = await pegar(p);

			if (S.estado !== 'ligada') return;

			try {
				await call('promeiroPedir', { para: 'templates', dados: { atr: item.atr || '', claq: p.claquete } });
				PAD_BRIDGE.openPanel(TEMPLATES_PANEL_ID);
				caixa('Abrindo A FORMA: templates de ' + atr + '.', pg.sub, pg.desfaz, pg.atencao);
			} catch (err) {
				caixa('A FORMA não abriu: ' + PAD_UTIL_ERR(err), pg.sub, pg.desfaz, true);
			}

			mudou(null);
		});
	}

	// marcar ou desmarcar a arte (só quem está na Produção, menos na Entregue): a janela já risca, o PROMeiro confirma
	function marcarArte(k) {
		var p = aberta();
		var a = p && p.artes && p.artes[k];

		if (!a || !p.comVoce || p.etapa === 'entregue') return;

		return busy(async function () {
			var feita = !a.feita;

			a.feita = feita;
			a.marcada = feita ? { por: S.designer } : null;
			if (S.falta && !faltam(p).length) S.falta = null;
			render();
			feito(await PAD_PROMEIRO.windowAction('arte', { producao: p.id, arte: a.nome, feita: feita }), p.id);
		});
	}

	// o fogo sobe um nível (vela, fogueira, incêndio e volta): manda o nível pedido (a repetida não sobe de novo)
	function subirFogo(k) {
		var p = aberta();
		var a = p && p.artes && p.artes[k];

		if (!a || p.etapa === 'entregue' || [1, 2, 3].indexOf(a.fogo) < 0) return;

		return busy(async function () {
			var nivel = a.fogo === 3 ? 1 : a.fogo + 1;

			a.fogo = nivel;
			render();
			feito(await PAD_PROMEIRO.windowAction('fogo', { producao: p.id, arte: a.nome, nivel: nivel }), p.id);
		});
	}

	// Entreguei: com artes por marcar, o aviso das que faltam; sem, entrega
	function entreguei() {
		var p = aberta();

		if (!p) return;
		if (faltam(p).length) {
			S.falta = p.id;

			return render();
		}

		return entregar();
	}

	function entregar() {
		var p = aberta();

		if (!p) return;

		return busy(async function () {
			var r = await PAD_PROMEIRO.windowAction('entregar', { producao: p.id });

			if (!feito(r, p.id)) return;
			S.falta = null;
			caixa(p.claquete + ' foi entregue.', '', { acao: r.acao, producao: p.id });
		});
	}

	// a seta ←: a pessoa sai da Produção (sem ninguém, ela volta para a Entrada); a Entregue volta para a Entrada
	function devolver() {
		var p = aberta();

		if (!p) return;

		return busy(async function () {
			var r = await PAD_PROMEIRO.windowAction('voltar', { producao: p.id });

			if (!feito(r, p.id)) return;

			var agora = r.corpo.producao || {};

			caixa(agora.etapa === 'entrada' ? p.claquete + ' voltou para a Entrada.' : 'Você saiu de ' + p.claquete + '.', '', { acao: r.acao, producao: p.id });
		});
	}

	// o Desfazer da caixinha: a ação contrária da última (só se ninguém mudou a Produção depois)
	function desfazer() {
		var d = S.caixa && S.caixa.desfaz;

		if (!d) return;

		return busy(async function () {
			var r = await PAD_PROMEIRO.windowAction('desfazer', { producao: d.producao, desfaz: d.acao });

			if (feito(r, d.producao)) caixa('Desfeito.', '', null);
		});
	}

	// o texto do erro do host (o código #PAD_ fica)
	function PAD_UTIL_ERR(err) {
		return String((err && err.message) || err || '').replace(/^erro: /, '');
	}

	function act(el) {
		var a = el.getAttribute('data-acao');
		var v = el.getAttribute('data-v');

		if (a === 'menu') {
			S.menu = !S.menu;
		} else if (a === 'praca') {
			S.praca = v;
			S.menu = false;
			remember(v);
		} else if (a === 'aba') {
			S.aba = v;
		} else if (a === 'voltar') {
			return back();
		} else if (a === 'projeto') {
			return abrirProjeto();
		} else if (a === 'templates') {
			return preencherTemplates();
		} else if (a === 'arte') {
			return marcarArte(Number(el.getAttribute('data-k')));
		} else if (a === 'fogo') {
			return subirFogo(Number(el.getAttribute('data-k')));
		} else if (a === 'entreguei') {
			return entreguei();
		} else if (a === 'assim-mesmo') {
			return entregar();
		} else if (a === 'cancelar-falta') {
			S.falta = null;
		} else if (a === 'devolver') {
			return devolver();
		} else if (a === 'desfazer') {
			return desfazer();
		} else if (a === 'fechar') {
			clearTimeout(tCaixa);
			S.caixa = null;
		} else if (a === 'de-novo') {
			S.estado = 'lendo';
			render();

			return load(true);
		}

		render();
	}

	document.addEventListener('click', function (e) {
		if (S.menu && !e.target.closest('[data-menu], [data-acao="menu"]')) {
			S.menu = false;
			render();
		}

		var el = e.target.closest('[data-acao], [data-abrir]');

		if (!el) return;

		e.preventDefault();

		if (el.hasAttribute('data-acao')) return act(el);

		open(el.getAttribute('data-abrir'));
	});

	document.addEventListener('keydown', function (e) {
		// a bolinha da arte é um botão (role="button"): Enter e espaço marcam
		if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.b[data-acao]')) {
			e.preventDefault();

			return act(e.target);
		}

		if (e.key !== 'Escape') return;

		if (S.falta) {
			S.falta = null;
			render();
		} else if (S.menu) {
			S.menu = false;
			render();
			if ($('pr-praca')) $('pr-praca').focus();
		} else if (S.aberta) {
			back();
		}
	});

	// a chave pendente que foi ligada aparece sozinha: a pendente confere o estado de novo a cada leitura
	function tick() {
		if (document.hidden) return;

		load(S.estado !== 'ligada');
	}

	setInterval(tick, REFRESH);
	window.addEventListener('focus', tick);

	load(false);
})();
