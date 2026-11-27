/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> o PROMeiro: a chave do Padeiro deste computador (host)
---------------------------------------------------------------

O Padeiro fala com o PROMeiro por um caminho só dele (/api/padeiro/, com a chave do Padeiro no cabeçalho
X-Chave-Do-Padeiro). Quem fala é o Node do painel (js/promeiro.js), sem travar o After Effects; aqui ficam só o que
o painel não sabe sozinho (o usuário e o nome do computador, o sistema, a sigla) e a chave guardada.

A chave do Padeiro deste computador fica na configuração deste computador (a seção 'chaveDoPromeiro' da tabela,
regras/configuracao.js: 'computador_promeiro.json' na pasta de dados do usuário, ao lado do computador_config.json):
  url       → o endereço do PROMeiro em que a chave foi pedida (outro endereço na configuração: a chave não vale e
              o painel pede outra)
  chave     → a chave do Padeiro (às claras só aqui e na resposta do cadastro; o PROMeiro guarda só o hash)
  estado    → o último estado lido do PROMeiro: pendente, ligada ou revogada
  designer  → o nome do designer ligado à chave (quando ligada)
  conferido → quando o estado foi lido (ISO)
Antes, a chave ficava no 'promeiro.json' (os mesmos campos, sem a seção): enquanto não há a seção, o host lê o antigo;
a gravação seguinte grava só a seção (o antigo fica no lugar, como os outros arquivos antigos no beta; apagar a
chave apaga os dois).

O endereço do PROMeiro é da equipe: a seção 'promeiro' (configuração > buscar). Vazio, nada fala com o PROMeiro.

'promeiro-fila.json', na mesma pasta: a fila dos avisos do Padeiro ainda não entregues (jmbillard/TEXTAO#141). O
aviso entra aqui primeiro, ao abrir ou criar o projeto, e sai quando o PROMeiro responde (js/promeiro.js); sem rede,
ou com o PROMeiro fora do ar, fica para depois. Cada mudança da fila é uma chamada só ao host (lê, muda e grava de uma
vez): duas janelas abertas não perdem o aviso uma da outra. Uma lista de { aviso, abertoEm, producao, card, filme,
url }, a mais velha primeiro, com no máximo PAD_PROMEIRO_QUEUE_MAX avisos e só os dos últimos
PAD_PROMEIRO_QUEUE_DAYS dias.

A mesma fila guarda as ações da janela PROMeiro · produções (jmbillard/TEXTAO#150): pegar, marcar a arte, o fogo,
entregar, voltar e desfazer. A ação leva também a `rota` (aviso, arte, fogo, entregar, voltar ou desfazer), os `dados`
da rota (arte, feita, nivel, desfaz) e a `claq` (só para a janela dizer qual foi); `aviso` é o identificador da ação
(o `acao` da rota) e `abertoEm`, a hora em que foi feita (o `feitaEm`). O aviso sem `rota` é o da abertura do projeto.

'promeiro-recusadas.json', na mesma pasta: as ações da janela que o PROMeiro recusou de vez quando a fila foi (a
chave revogada, a Produção que já mudou: 400, 401, 403, 404, 409). Saem da fila e ficam aqui até a janela mostrar ao
designer (quem manda a fila pode ser a barra, e não a janela). { acao, rota, producao, claq, status, erro, em }, no
máximo PAD_PROMEIRO_REFUSED_MAX.

*/

var PAD_PROMEIRO_QUEUE_MAX = 100;
var PAD_PROMEIRO_QUEUE_DAYS = 30;
var PAD_PROMEIRO_REFUSED_MAX = 20;

// o arquivo de antes da seção 'chaveDoPromeiro' (lido só enquanto ela não existe)
function padPromeiroOldFile() {
	return new File(scriptPreferencesPath + '/promeiro.json');
}

// a chave guardada: a seção ou, sem ela, o promeiro.json de antes (limpo pela mesma regra) → { url, chave, … } ou {}
function padPromeiroSaved() {
	var saved = padLerSecao('chaveDoPromeiro');

	if (saved) return saved;

	var file = padPromeiroOldFile();

	if (!file.exists) return {};

	try {
		return PAD_CONFIGURACAO.limpar('chaveDoPromeiro', JSON.parse(readFileContent(file))) || {};
	} catch (err) {
		return {};
	}
}

// o endereço do PROMeiro da configuração da equipe ('' sem ele ou sem a configuração)
function padPromeiroUrl() {
	try {
		return padLerSecao('promeiro').url || '';
	} catch (err) {
		return '';
	}
}

// agora (ou agora menos 'back' ms), em ISO (UTC): o ExtendScript não tem o toISOString
function padPromeiroNow(back) {
	var d = new Date(new Date().getTime() - (back || 0));
	var two = function (n) {
		return (n < 10 ? '0' : '') + n;
	};

	return d.getUTCFullYear() + '-' + two(d.getUTCMonth() + 1) + '-' + two(d.getUTCDate()) + 'T' + two(d.getUTCHours()) + ':' + two(d.getUTCMinutes()) + ':' + two(d.getUTCSeconds()) + 'Z';
}

// o sistema do computador, como a pessoa conhece (macOS 15.1, Windows 10.0…)
function padPromeiroSystem() {
	var os = String(system.osName || '');
	var version = String(system.osVersion || '');

	if (!os) os = appOs == 'Win' ? 'Windows' : 'macOS';
	if (/mac/i.test(os)) os = 'macOS';

	return padTrim(os + ' ' + version).substring(0, 120);
}

// o nome do computador (o mesmo que aparece na rede)
function padPromeiroMachine() {
	var name = '';

	try {
		name = String(system.machineName || '');
	} catch (err) { }

	if (!name) name = String($.getenv('COMPUTERNAME') || $.getenv('HOSTNAME') || '');

	return padTrim(name).substring(0, 120);
}

// O que o painel precisa para falar com o PROMeiro (o campo do modo local valendo, no fim). A chave pedida em outro
// endereço não vale (chave e estado vazios).
// → { url, usuario, computador, sistema, sigla, chave, estado, designer, conferido, local }
PADX.promeiroInfo = function () {
	var url = padPromeiroUrl();
	var saved = padPromeiroSaved();
	var same = !!url && saved.url == url && !!saved.chave;

	return {
		url: url,
		usuario: padTrim(String(system.userName || '')).substring(0, 80),
		computador: padPromeiroMachine(),
		sistema: padPromeiroSystem(),
		sigla: padSigla(),
		chave: same ? String(saved.chave) : '',
		estado: same ? String(saved.estado || '') : '',
		designer: same ? String(saved.designer || '') : '',
		conferido: same ? String(saved.conferido || '') : '',
		local: padLocalMode()
	};
};

// Guarda a chave (a do cadastro) ou o estado lido do PROMeiro. a: { url, chave, estado, designer } (a chave vazia
// apaga o que estava guardado). → o mesmo que promeiroInfo
PADX.promeiroSave = function (a) {
	var chave = padTrim(String(a.chave == null ? '' : a.chave));

	// null tira a seção do arquivo (o antigo promeiro.json, se houver, também sai: senão voltaria a valer)
	if (!chave) {
		padGravarSecoes({ chaveDoPromeiro: null });

		var old = padPromeiroOldFile();

		if (old.exists) old.remove();

		return PADX.promeiroInfo();
	}

	padGravarSecoes({ chaveDoPromeiro: { url: a.url, chave: chave, estado: a.estado, designer: a.designer, conferido: padPromeiroNow() } });

	return PADX.promeiroInfo();
};

/* ---------------------------------------------------------------
   a fila dos avisos do Padeiro (jmbillard/TEXTAO#141)
   --------------------------------------------------------------- */

function padPromeiroQueueFile() {
	return new File(scriptPreferencesPath + '/promeiro-fila.json');
}

function padPromeiroQueueRead() {
	var file = padPromeiroQueueFile();

	if (!file.exists) return [];

	try {
		var data = JSON.parse(readFileContent(file));
		var list = [];

		if (!(data instanceof Array)) return [];

		for (var i = 0; i < data.length; i++) {
			if (data[i] && typeof data[i] == 'object' && data[i].aviso) list.push(data[i]);
		}

		return list;
	} catch (err) {
		return [];
	}
}

// grava a fila (vazia, apaga o arquivo)
function padPromeiroQueueWrite(list) {
	var file = padPromeiroQueueFile();

	if (!list.length) {
		if (file.exists) file.remove();

		return;
	}

	var folder = new Folder(scriptPreferencesPath);

	if (!folder.exists) folder.create();

	saveTextFile(JSON.stringify(list, null, '\t'), file.fsName);
}

function padPromeiroText(v, max) {
	return padTrim(String(v == null ? '' : v)).substring(0, max);
}

// A fila dos avisos ainda não entregues. → { itens: [{ aviso, abertoEm, producao, card, filme, url }] }
PADX.promeiroQueue = function () {
	return { itens: padPromeiroQueueRead() };
};

// os dados de uma ação da janela (#150), só o que as rotas usam: { arte, feita, nivel, desfaz }
function padPromeiroActionData(d) {
	var out = {};

	if (!d || typeof d != 'object') return out;
	if (d.arte != null) out.arte = padPromeiroText(d.arte, 200);
	if (d.feita === true || d.feita === false) out.feita = d.feita;
	if (d.nivel == 1 || d.nivel == 2 || d.nivel == 3) out.nivel = Number(d.nivel);
	if (d.desfaz != null) out.desfaz = padPromeiroText(d.desfaz, 100);

	return out;
}

// Põe um aviso (ou uma ação da janela, #150) na fila. a: { aviso, abertoEm, producao, card, filme } e, na ação,
// { rota, dados, claq }. Sem o endereço do PROMeiro na configuração, nada entra (ninguém para avisar). O mesmo
// identificador não entra duas vezes. → { queued, itens }
PADX.promeiroQueueAdd = function (a) {
	var url = padPromeiroUrl();
	var item = {
		aviso: padPromeiroText(a.aviso, 100),
		abertoEm: padPromeiroText(a.abertoEm, 40) || padPromeiroNow(),
		producao: padPromeiroText(a.producao, 100),
		card: padPromeiroText(a.card, 100),
		filme: padPromeiroText(a.filme, 100),
		url: url
	};
	var rota = padPromeiroText(a.rota, 20);

	if (rota) {
		if (!/^(aviso|arte|fogo|entregar|voltar|desfazer)$/.test(rota)) return { queued: false, itens: padPromeiroQueueRead().length };
		item.rota = rota;
		item.dados = padPromeiroActionData(a.dados);
		item.claq = padPromeiroText(a.claq, 120);
	}

	if (!url || !/^[\w.:-]{1,100}$/.test(item.aviso) || !(item.producao || item.card || item.filme)) return { queued: false, itens: padPromeiroQueueRead().length };

	var since = padPromeiroNow(PAD_PROMEIRO_QUEUE_DAYS * 86400000);
	var old = padPromeiroQueueRead();
	var list = [];

	for (var i = 0; i < old.length; i++) {
		if (old[i].aviso == item.aviso) return { queued: true, itens: old.length };
		// a hora em ISO (UTC) se compara como texto: o mais velho que os dias da fila sai
		if (String(old[i].abertoEm || '') >= since) list.push(old[i]);
	}

	list.push(item);
	if (list.length > PAD_PROMEIRO_QUEUE_MAX) list = list.slice(list.length - PAD_PROMEIRO_QUEUE_MAX);
	padPromeiroQueueWrite(list);

	return { queued: true, itens: list.length };
};

// Tira da fila os avisos resolvidos (entregues, repetidos ou recusados de vez). a: { avisos: [identificador],
// recusadas: [{ acao, rota, producao, claq, status, erro }] } (as recusadas da janela ficam para ela mostrar, #150)
// → { itens, tirados } (tirados: quantos estavam na fila)
PADX.promeiroQueueDrop = function (a) {
	var gone = {};
	var ids = a && a.avisos instanceof Array ? a.avisos : [];
	var old = padPromeiroQueueRead();
	var list = [];

	for (var i = 0; i < ids.length; i++) gone['#' + ids[i]] = true;

	for (var j = 0; j < old.length; j++) {
		if (!gone['#' + old[j].aviso]) list.push(old[j]);
	}

	if (list.length != old.length) padPromeiroQueueWrite(list);
	if (a && a.recusadas instanceof Array && a.recusadas.length) padPromeiroRefusedAdd(a.recusadas);

	return { itens: list.length, tirados: old.length - list.length };
};

/* ---------------------------------------------------------------
   as ações da janela recusadas de vez pelo PROMeiro (jmbillard/TEXTAO#150)
   --------------------------------------------------------------- */

function padPromeiroRefusedFile() {
	return new File(scriptPreferencesPath + '/promeiro-recusadas.json');
}

function padPromeiroRefusedRead() {
	var file = padPromeiroRefusedFile();

	if (!file.exists) return [];

	try {
		var data = JSON.parse(readFileContent(file));

		return data instanceof Array ? data : [];
	} catch (err) {
		return [];
	}
}

function padPromeiroRefusedAdd(items) {
	var list = padPromeiroRefusedRead();

	for (var i = 0; i < items.length; i++) {
		var x = items[i];

		if (!x || typeof x != 'object') continue;

		list.push({
			acao: padPromeiroText(x.acao, 100),
			rota: padPromeiroText(x.rota, 20),
			producao: padPromeiroText(x.producao, 100),
			claq: padPromeiroText(x.claq, 120),
			dados: padPromeiroActionData(x.dados),
			status: Number(x.status) || 0,
			erro: padPromeiroText(x.erro, 300),
			em: padPromeiroNow()
		});
	}

	if (list.length > PAD_PROMEIRO_REFUSED_MAX) list = list.slice(list.length - PAD_PROMEIRO_REFUSED_MAX);

	var folder = new Folder(scriptPreferencesPath);

	if (!folder.exists) folder.create();

	saveTextFile(JSON.stringify(list, null, '\t'), padPromeiroRefusedFile().fsName);
}

// As ações da janela recusadas de vez, a mais velha primeiro. a: { limpar } (true: a janela já mostrou, o arquivo
// some) → { itens }
PADX.promeiroRecusadas = function (a) {
	var list = padPromeiroRefusedRead();

	if (a && a.limpar) {
		var file = padPromeiroRefusedFile();

		if (file.exists) file.remove();
	}

	return { itens: list };
};

/* ---------------------------------------------------------------
   os pedidos da janela PROMeiro · produções às outras janelas (jmbillard/TEXTAO#149)
   --------------------------------------------------------------- */

// 'promeiro-pedido-<para>.json', na mesma pasta: o pedido de uma janela a outra, como o do conversor e o da aba da
// configuração (a janela que recebe confere de tempos em tempos e ao voltar à frente):
//   projeto       → O PROJETISTA abre (ou cria) o projeto da Produção, como pelo card: { producao, claq, atr, card }
//   templates     → A FORMA abre nos templates da atração: { atr, claq }
//   projeto-feito → a resposta d'O PROJETISTA à janela PROMeiro: { pedido, producao, arquivo, criado, erro, pendente }
// Cada pedido novo toma o lugar do anterior. { stamp, dados }

function padPromeiroRequestFile(para) {
	return new File(scriptPreferencesPath + '/promeiro-pedido-' + para + '.json');
}

function padPromeiroRequestKind(para) {
	var kind = String(para == null ? '' : para);

	if (!/^[a-z-]{1,20}$/.test(kind)) throw new Error('#PAD_123 - pedido da janela PROMeiro sem destino: ' + kind.substring(0, 20));

	return kind;
}

// Guarda o pedido. a: { para, dados } → { stamp }
PADX.promeiroPedir = function (a) {
	var kind = padPromeiroRequestKind(a && a.para);
	var folder = new Folder(scriptPreferencesPath);
	var stamp = new Date().getTime();

	if (!folder.exists) folder.create();

	saveTextFile(JSON.stringify({ stamp: stamp, dados: a.dados && typeof a.dados == 'object' ? a.dados : {} }), padPromeiroRequestFile(kind).fsName);

	return { stamp: stamp };
};

// O último pedido. a: { para } → { stamp, dados, now } (sem pedido, stamp 0)
PADX.promeiroPedido = function (a) {
	var file = padPromeiroRequestFile(padPromeiroRequestKind(a && a.para));
	var now = new Date().getTime();

	if (!file.exists) return { stamp: 0, dados: {}, now: now };

	try {
		var data = JSON.parse(readFileContent(file));

		return { stamp: data && data.stamp ? Number(data.stamp) : 0, dados: data && data.dados && typeof data.dados == 'object' ? data.dados : {}, now: now };
	} catch (err) {
		return { stamp: 0, dados: {}, now: now };
	}
};
