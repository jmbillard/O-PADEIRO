/*

---------------------------------------------------------------
> REGRA — o webhook do projeto (o envio ao n8n e os avisos da resposta)
---------------------------------------------------------------

A janela de projeto (O PROJETISTA) avisa o n8n, pelo webhook do projeto, quando cria o projeto de uma atração nova:
o n8n cadastra a atração no banco das atrações (e não duplica a que já existir). O formato do envio e da resposta,
com exemplos, fica em docs/webhook-projeto.md.

  envio(situacao) → { url, corpo } ou null (nada a enviar)
    situacao: { momento, url, modoLocal, versao, atracao, card, designer }
      momento  → 'criado' (o projeto criado; 'aberto' e 'alterado' ficam para o card, #50)
      url      → o webhook do projeto (configuração da equipe, aba TIPOS DE PROJETO); vazia: nada é enviado
      modoLocal→ true: nada é enviado
      versao   → a versão do padeiro
      atracao  → { nome, tipo, nova, quadro, pasta, output, aep }: pasta é a pasta do projeto e aep o caminho do
                 .aep salvo
      card     → o card do Trello de onde veio a atração ({ id, claquete }) ou null. o card só vai no envio, nunca
                 no projeto (ADR 0001). com card, o caso é o da #50: por enquanto, nada é enviado
      designer → { login, sigla }: o login da máquina e a sigla do designer
    envia só a atração nova criada sem card. o corpo leva o momento, a atração, o card, o designer e a versão.

  avisos(resposta, envio) → { avisos: [{ kind, codigo, texto }], copiaVelha }
    resposta: o que o n8n devolveu, { itens: [{ codigo, texto }] } (o objeto, o JSON em texto ou embrulhado numa
    lista pelo n8n: [{ itens: […] }]); null quando não houve resposta (o n8n fora, o tempo esgotado, o HTTP de erro).
      kind       → 'success' (o aviso verde) ou 'warn' (o amarelo)
      codigo     → o código do item (CODIGOS, abaixo; um desconhecido vira amarelo)
      texto      → o texto do n8n ou, sem ele, o padrão do código
      copiaVelha → true quando a atração entrou no banco (cadastrada ou já existia): a cópia do índice da busca fica
                   marcada como velha, para a próxima busca baixar o índice de novo
    sem resposta, ou fora do formato: um aviso amarelo só, dizendo o que não foi feito.

Regra compartilhada (ADR 0005): ES3, sem After e sem DOM. O host carrega por #include (a variável global
PAD_WEBHOOK_DO_PROJETO: o envio, no projectCreate), o painel por <script> (window.PAD_WEBHOOK_DO_PROJETO: os avisos,
n'O PROJETISTA) e o teste em Node por require: node extension/scripts/test-regras.js.

*/

(function (root) {
	function texto(value) {
		return String(value == null ? '' : value).replace(/^\s+|\s+$/g, '');
	}

	function envio(s) {
		s = s || {};

		var a = s.atracao || {};
		var d = s.designer || {};
		var url = texto(s.url);

		if (!url || s.modoLocal === true) return null;
		if (s.momento != 'criado' || a.nova !== true || s.card) return null;

		return {
			url: url,
			corpo: {
				momento: 'criado',
				atracao: { nome: texto(a.nome), tipo: texto(a.tipo), nova: true, quadro: texto(a.quadro), pasta: texto(a.pasta), output: texto(a.output), aep: texto(a.aep) },
				card: null,
				designer: { login: texto(d.login), sigla: texto(d.sigla) },
				versao: texto(s.versao)
			}
		};
	}

	// os códigos da resposta do n8n: a cor do aviso e o texto padrão (quando o n8n não manda texto). nome: o da atração
	var CODIGOS = {
		atracaoCadastrada: { kind: 'success', copiaVelha: true, texto: function (nome) { return nome + ' cadastrada no banco das atrações'; } },
		atracaoJaExistia: { kind: 'success', copiaVelha: true, texto: function (nome) { return nome + ' já estava no banco das atrações'; } },
		// o card e o designer (#50): a cor já fica certa
		cardLigado: { kind: 'success', texto: function () { return 'card ligado à atração'; } },
		designerEntrouNoCard: { kind: 'success', texto: function () { return 'você entrou no card'; } },
		designerJaEstavaNoCard: { kind: 'success', texto: function () { return 'você já estava no card'; } },
		designerNaoEncontrado: { kind: 'warn', texto: function () { return 'o n8n não achou você na tabela de designers: peça para incluírem'; } },
		erro: { kind: 'warn', texto: function () { return 'o n8n não conseguiu fazer o pedido: confira à mão'; } }
	};

	function nomeDoEnvio(e) {
		return (e && e.corpo && e.corpo.atracao && texto(e.corpo.atracao.nome)) || 'a atração';
	}

	// a lista de itens da resposta ou null (fora do formato): o objeto, o JSON em texto ou embrulhado numa lista
	function itensDe(resposta) {
		var r = resposta;

		if (typeof r == 'string') {
			try {
				r = JSON.parse(r);
			} catch (err) {
				return null;
			}
		}

		if (r instanceof Array) r = r.length == 1 ? r[0] : null;
		if (!r || typeof r != 'object' || !(r.itens instanceof Array) || !r.itens.length) return null;

		for (var i = 0; i < r.itens.length; i++) {
			if (!r.itens[i] || typeof r.itens[i] != 'object' || !texto(r.itens[i].codigo)) return null;
		}

		return r.itens;
	}

	function avisos(resposta, e) {
		var nome = nomeDoEnvio(e);
		var itens = resposta == null ? null : itensDe(resposta);
		var out = { avisos: [], copiaVelha: false };

		if (resposta == null) {
			out.avisos.push({ kind: 'warn', codigo: 'semResposta', texto: nome + ' não foi cadastrada no banco das atrações (o n8n não respondeu): o projeto foi criado; avise a equipe' });

			return out;
		}

		if (!itens) {
			out.avisos.push({ kind: 'warn', codigo: 'foraDoFormato', texto: 'não deu para confirmar o cadastro de ' + nome + ' no banco das atrações (a resposta do n8n veio fora do formato): o projeto foi criado; confira na busca' });

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
