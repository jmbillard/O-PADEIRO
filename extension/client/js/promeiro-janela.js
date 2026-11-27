/*

---------------------------------------------------------------
> PROMeiro · produções — a janela das Produções no After (jmbillard/TEXTAO#148)
---------------------------------------------------------------

Uma versão compacta da tela de produções do PROMeiro, com o visual dele (css/promeiro.css). Nesta fatia ela só
mostra: os botões (Abrir projeto, Preencher templates, Entreguei), a marca da arte feita, o fogo que sobe e a fila
sem rede vêm depois (jmbillard/TEXTAO#149 e #150).

  - a lista: a praça no topo (lembrada por designer, neste computador), as abas Entrada, Produzindo e Minhas, cada
    uma com a contagem, e em cada Produção só a claquete e o estado: "pronto para abrir" (bolinha cheia), "sem pasta"
    ou "sem atração" (bolinha vazada, em laranja);
  - a Produção aberta: a praça e a etapa, a claquete, a versão da chamada só como o código (AH), o estado e as artes
    (a bolinha laranja com o número, o nome, a feita riscada e o fogo da complexidade), com a contagem "1 de 3". A
    seta ← volta à lista (o nome só na dica). Sem horário de exibição;
  - estreita (até 640 px), a lista ou a Produção; larga, as duas lado a lado;
  - só a chave ligada lê: com a pendente, a janela não mostra a lista, só o aviso de que falta o administrador ligar.

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
		naoExiste: false
	};

	var ic = {
		voltar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
		baixo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
		check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
	};

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

	function arte(a, k) {
		var nivel = [1, 2, 3].indexOf(a.fogo) >= 0 ? a.fogo : null;
		var nome = a.feita ? '<span class="pr-risco">' + esc(a.nome) + '<svg viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true"><path d="' + RISCOS[k % 3] + '"/></svg></span>' : esc(a.nome);
		var tip = a.feita ? 'feita' + (a.marcada && a.marcada.por ? ' · marcada por ' + a.marcada.por : '') : 'arte ' + (k + 1);
		var cx = nivel ? '<span class="cx" role="img" aria-label="complexidade ' + NIVEL[nivel] + '" title="complexidade: ' + NIVEL[nivel] + '">' + fogo(nivel) + '</span>' : '<span class="cx-vaga"></span>';

		return '<li class="' + (a.feita ? 'feita' : '') + '"><div class="arte-linha"><span class="b" title="' + esc(tip) + '"><span class="num">' + (k + 1) + '</span>' + ic.check + '</span><span class="txt"><b>' + nome + '</b></span></div>' + cx + '</li>';
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
		var conta = p.contagem || { feitas: artes.filter(function (a) { return a.feita; }).length, total: artes.length };
		var rotulo = [p.praca, ETAPA[p.etapa] || p.etapa].filter(Boolean).join(' · ');

		return '<div class="pr-folha-rolar"><div class="pr-cab">' +
			'<span class="linha">' + voltar + '<span class="pr-rotulo">' + esc(rotulo) + '</span></span>' +
			'<h2>' + esc(p.claquete) + '</h2>' +
			(p.versao ? '<span class="pr-versao" title="versão da chamada">' + esc(p.versao) + '</span>' : '') +
			estadoDe(p) +
			'</div><div><p class="pr-conta-artes">Artes <small>' + (artes.length ? conta.feitas + ' de ' + conta.total : '') + '</small></p>' +
			(artes.length ? '<ol class="artes">' + artes.map(arte).join('') + '</ol>' : '<p class="pr-nada">sem artes no roteiro</p>') +
			'</div></div>';
	}

	// redesenha a janela (a rolagem da lista fica onde estava). anima: a parte que acabou de abrir entra suave
	function render(anima) {
		var app = $('pr-app');
		var rolar = $('pr-rolar');
		var top = rolar ? rolar.scrollTop : 0;
		var folhaRolar = document.querySelector('.pr-folha-rolar');
		var folhaTop = folhaRolar && !anima ? folhaRolar.scrollTop : 0;

		app.classList.toggle('so-aviso', S.estado !== 'ligada');
		app.setAttribute('aria-busy', S.estado === 'lendo' ? 'true' : 'false');
		document.body.setAttribute('data-tela', S.aberta && S.estado === 'ligada' ? 'producao' : 'lista');
		document.body.setAttribute('data-estado', S.estado);
		$('pr-col').innerHTML = coluna();
		$('pr-folha').innerHTML = folha();

		if ($('pr-rolar')) $('pr-rolar').scrollTop = top;
		if (document.querySelector('.pr-folha-rolar')) document.querySelector('.pr-folha-rolar').scrollTop = folhaTop;

		if (anima) {
			var alvo = anima === 'lista' ? $('pr-col') : $('pr-folha');

			alvo.classList.remove('entra');
			void alvo.offsetWidth;
			alvo.classList.add('entra');
		}
	}

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
		render('lista');

		var b = document.querySelector('.prod-card');

		if (b && window.matchMedia('(max-width: 640px)').matches) b.focus({ preventScroll: true });
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
		if (e.key !== 'Escape') return;

		if (S.menu) {
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
