/*

---------------------------------------------------------------
> REGRA — o webhook do projeto (o envio ao n8n e os avisos da resposta)
---------------------------------------------------------------

A janela de projeto (O PROJETISTA) avisa o n8n, pelo webhook do projeto, toda vez que cria um projeto ou abre um .aep
pelo JÁ NA PASTA (qualquer atração: nova, conhecida, tipo fixo, filme; com ou sem card), e quando usa o Alterar para
ligar o projeto a um card: o n8n registra o projeto (o .aep, a atração, o designer e a data), cadastra a atração nova
no banco das atrações (e não duplica a que já existir), liga o card à atração nova e põe o designer no card (achado na
tabela de designers pelo login ou pela sigla). O formato do envio e da resposta, com exemplos, fica em docs/webhook-projeto.md.

Com a chave do Padeiro ligada (jmbillard/TEXTAO#144), o mesmo envio vai ao PROMeiro (POST /api/padeiro/projeto, com a
chave), no lugar do n8n, e a resposta tem o mesmo formato: quem escolhe é O PROJETISTA (js/promeiro.js), na hora de
mandar. Por isso, com o endereço do PROMeiro na configuração, o envio é montado mesmo sem a URL do n8n.

  envio(situacao) → { url, corpo } ou null (nada a enviar)
    situacao: { momento, url, modoLocal, versao, atracao, card, designer }
      momento  → 'criado' (o projeto criado), 'aberto' (o .aep aberto pelo JÁ NA PASTA) ou 'alterado' (o Alterar
                 salvou o projeto). outro (o clique num card, sem ação): nada é enviado
      url      → o webhook do projeto (configuração da equipe, aba TIPOS DE PROJETO); vazia: nada é enviado ao n8n
      promeiro → true: o endereço do PROMeiro está na configuração (aba BUSCAR). com a URL vazia, o envio é montado
                 assim mesmo (url: ''), para ir ao PROMeiro com a chave ligada; sem a URL e sem o PROMeiro, nada
      modoLocal→ true: nada é enviado
      versao   → a versão do padeiro
      atracao  → { nome, tipo, nova, quadro, pasta, output, aep, filme }: pasta é a pasta do projeto e aep o caminho do
                 .aep salvo (no aberto, o .aep aberto). no aberto e no alterado, o que se souber (o tipo pode vir vazio).
                 filme: só no filme, { ano } (o ano de produção que foi para a pasta e o .aep; '' sem ano); fora do
                 filme, a chave não vai
      card     → o card do Trello de onde veio a atração ({ id, claquete }) ou null (sem id vale como null). o card
                 só vai no envio, nunca no projeto (ADR 0001)
      designer → { login, sigla }: o login da máquina e a sigla do designer (o n8n acha o usuário do Trello por eles)
    criado: envia sempre (o registro do projeto; a atração nova também é cadastrada, e com o card o designer entra
    nele). aberto: envia sempre, e nunca cadastra (nova: false, mesmo a atração que não está no índice). alterado: só
    com o card (o designer no card), e nunca cadastra. o corpo leva o momento, a atração, o card, o designer e a versão.

  avisos(resposta, envio) → { avisos: [{ kind, codigo, texto }], copiaVelha }
    resposta: o que o n8n devolveu, { itens: [{ codigo, texto }] } (o objeto, o JSON em texto ou embrulhado numa
    lista pelo n8n: [{ itens: […] }]); null quando não houve resposta (o n8n fora, o tempo esgotado, o HTTP de erro).
      kind       → 'success' (o aviso verde) ou 'warn' (o amarelo)
      codigo     → o código do item (CODIGOS, abaixo; um desconhecido vira amarelo)
      texto      → o texto do n8n ou, sem ele, o padrão do código
      copiaVelha → true quando o banco mudou para a busca (a atração cadastrada ou que já existia, o card ligado):
                   a cópia do índice da busca fica marcada como velha, para a próxima busca baixar o índice de novo
    sem resposta, ou fora do formato: um aviso amarelo só, dizendo o que não foi feito (o cadastro, o card ou os dois;
    no envio só de registro, o registro do projeto). no envio só de registro (sem cadastro e sem card), itens vazio é
    sucesso silencioso: nenhum aviso (o n8n registrou e não tinha o que contar).

Regra compartilhada (ADR 0005): ES3, sem After e sem DOM. O host carrega por #include (a variável global
PAD_WEBHOOK_DO_PROJETO: o envio, no projectCreate), o painel por <script> (window.PAD_WEBHOOK_DO_PROJETO: os avisos,
n'O PROJETISTA) e o teste em Node por require: node extension/scripts/test-regras.js.

*/

(function (root) {
	function texto(value) {
		return String(value == null ? '' : value).replace(/^\s+|\s+$/g, '');
	}

	// o card do envio: só o id e a claquete (o resto do card do índice fica fora); sem id, null
	function cardDo(c) {
		if (!c || typeof c != 'object' || !texto(c.id)) return null;

		return { id: texto(c.id), claquete: texto(c.claquete) };
	}

	function envio(s) {
		s = s || {};

		var a = s.atracao || {};
		var d = s.designer || {};
		var url = texto(s.url);
		var card = cardDo(s.card);
		var nova = a.nova === true;

		if ((!url && s.promeiro !== true) || s.modoLocal === true) return null;
		if (s.momento != 'criado' && s.momento != 'aberto' && s.momento != 'alterado') return null;
		// abrir e alterar nunca cadastram a atração; o Alterar sem card não tem o que enviar (criar e abrir: o registro)
		if (s.momento != 'criado') nova = false;
		if (s.momento == 'alterado' && !card) return null;

		var atracao = { nome: texto(a.nome), tipo: texto(a.tipo), nova: nova, quadro: texto(a.quadro), pasta: texto(a.pasta), output: texto(a.output), aep: texto(a.aep) };

		if (a.filme && typeof a.filme == 'object') atracao.filme = { ano: texto(a.filme.ano) };

		return {
			url: url,
			corpo: {
				momento: s.momento,
				atracao: atracao,
				card: card,
				designer: { login: texto(d.login), sigla: texto(d.sigla) },
				versao: texto(s.versao)
			}
		};
	}

	// os códigos da resposta do n8n: a cor do aviso e o texto padrão (quando o n8n não manda texto). nome: o da atração
	var CODIGOS = {
		atracaoCadastrada: { kind: 'success', copiaVelha: true, texto: function (nome) { return nome + ' cadastrada no banco das atrações'; } },
		atracaoJaExistia: { kind: 'success', copiaVelha: true, texto: function (nome) { return nome + ' já estava no banco das atrações'; } },
		// o card e o designer (#50)
		cardLigado: { kind: 'success', copiaVelha: true, texto: function () { return 'card ligado à atração'; } },
		designerEntrouNoCard: { kind: 'success', texto: function () { return 'você entrou no card'; } },
		designerJaEstavaNoCard: { kind: 'success', texto: function () { return 'você já estava no card'; } },
		designerNaoEncontrado: { kind: 'warn', texto: function () { return 'o n8n não achou você na tabela de designers: peça para incluírem'; } },
		// o registro do projeto (o envio sem cadastro e sem card)
		projetoRegistrado: { kind: 'success', texto: function () { return 'projeto registrado'; } },
		erro: { kind: 'warn', texto: function () { return 'o n8n não conseguiu fazer o pedido: confira à mão'; } }
	};

	function nomeDoEnvio(e) {
		return (e && e.corpo && e.corpo.atracao && texto(e.corpo.atracao.nome)) || 'a atração';
	}

	// o que aconteceu com o projeto, para os textos: criado, aberto (JÁ NA PASTA) ou salvo (o Alterar)
	var FEITO = { criado: 'o projeto foi criado', aberto: 'o projeto foi aberto', alterado: 'o projeto foi salvo' };

	// o que o envio pedia: o cadastro (a atração nova), o card (o designer no card), os dois ou só o registro do
	// projeto. sem envio: o cadastro. noCard: 'no card <claquete>' (para os textos), ou '' sem card. feito: o que
	// aconteceu com o projeto
	function pedidoDo(e) {
		var c = e && e.corpo ? e.corpo : null;
		var temCard = !!(c && c.card && texto(c.card.id));
		var cadastro = !c || !!(c.atracao && c.atracao.nova === true);
		var noCard = '';

		if (temCard) noCard = texto('no card ' + texto(c.card.claquete));

		return { cadastro: cadastro, noCard: noCard, soRegistro: !cadastro && !temCard, feito: c && FEITO.hasOwnProperty(c.momento) ? FEITO[c.momento] : FEITO.criado };
	}

	// o aviso amarelo sem resposta (o n8n fora): o que não foi feito
	function textoSemResposta(nome, p) {
		var semResposta = ' (o n8n não respondeu): ' + p.feito + '; ';

		if (p.soRegistro) return 'o projeto não foi registrado no banco' + semResposta + 'avise a equipe';
		if (!p.cadastro) return 'você não entrou ' + p.noCard + semResposta + 'entre no card à mão';
		if (p.noCard) return nome + ' não foi cadastrada no banco das atrações e você não entrou ' + p.noCard + semResposta + 'avise a equipe';

		return nome + ' não foi cadastrada no banco das atrações' + semResposta + 'avise a equipe';
	}

	// o aviso amarelo da resposta fora do formato: o que não deu para confirmar
	function textoForaDoFormato(nome, p) {
		var fora = ' (a resposta do n8n veio fora do formato): ' + p.feito + '; ';

		if (p.soRegistro) return 'não deu para confirmar o registro do projeto' + fora + 'avise a equipe';
		if (!p.cadastro) return 'não deu para confirmar a sua entrada ' + p.noCard + fora + 'confira no Trello';
		if (p.noCard) return 'não deu para confirmar o cadastro de ' + nome + ' no banco das atrações nem a sua entrada ' + p.noCard + fora + 'confira na busca e no Trello';

		return 'não deu para confirmar o cadastro de ' + nome + ' no banco das atrações' + fora + 'confira na busca';
	}

	// a lista de itens da resposta ou null (fora do formato): o objeto, o JSON em texto ou embrulhado numa lista.
	// vazia: só com vazioVale (o envio só de registro), senão fora do formato
	function itensDe(resposta, vazioVale) {
		var r = resposta;

		if (typeof r == 'string') {
			try {
				r = JSON.parse(r);
			} catch (err) {
				return null;
			}
		}

		if (r instanceof Array) r = r.length == 1 ? r[0] : null;
		if (!r || typeof r != 'object' || !(r.itens instanceof Array)) return null;
		if (!r.itens.length && !vazioVale) return null;

		for (var i = 0; i < r.itens.length; i++) {
			if (!r.itens[i] || typeof r.itens[i] != 'object' || !texto(r.itens[i].codigo)) return null;
		}

		return r.itens;
	}

	function avisos(resposta, e) {
		var nome = nomeDoEnvio(e);
		var pedido = pedidoDo(e);
		var itens = resposta == null ? null : itensDe(resposta, pedido.soRegistro);
		var out = { avisos: [], copiaVelha: false };

		if (resposta == null) {
			out.avisos.push({ kind: 'warn', codigo: 'semResposta', texto: textoSemResposta(nome, pedido) });

			return out;
		}

		if (!itens) {
			out.avisos.push({ kind: 'warn', codigo: 'foraDoFormato', texto: textoForaDoFormato(nome, pedido) });

			return out;
		}

		for (var i = 0; i < itens.length; i++) {
			var codigo = texto(itens[i].codigo);
			var dito = texto(itens[i].texto);
			var c = CODIGOS.hasOwnProperty(codigo) ? CODIGOS[codigo] : null;

			if (c && c.copiaVelha) out.copiaVelha = true;
			out.avisos.push({ kind: c ? c.kind : 'warn', codigo: codigo, texto: dito || (c ? c.texto(nome) : 'o n8n respondeu ' + codigo) });
		}

		return out;
	}

	var api = { envio: envio, avisos: avisos };

	// a variável global sempre (o painel do After tem window e também module, com o Node ligado); o module.exports no Node
	root.PAD_WEBHOOK_DO_PROJETO = api;

	if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
