/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> o PROMeiro: a chave do Padeiro deste computador (host)
---------------------------------------------------------------

O Padeiro fala com o PROMeiro por um caminho só dele (/api/padeiro/, com a chave do Padeiro no cabeçalho
X-Chave-Do-Padeiro). Quem fala é o Node do painel (js/promeiro.js), sem travar o After Effects; aqui ficam só o que
o painel não sabe sozinho (o usuário e o nome do computador, o sistema, a sigla) e a chave guardada.

'promeiro.json' na pasta de dados do usuário (ao lado do machine_config.json), só deste computador:
  url       → o endereço do PROMeiro em que a chave foi pedida (outro endereço na configuração: a chave não vale e
              o painel pede outra)
  chave     → a chave do Padeiro (às claras só aqui e na resposta do cadastro; o PROMeiro guarda só o hash)
  estado    → o último estado lido do PROMeiro: pendente, ligada ou revogada
  designer  → o nome do designer ligado à chave (quando ligada)
  conferido → quando o estado foi lido (ISO)

O endereço do PROMeiro é da equipe: configuração > buscar ('SEARCH.promeiro'). Vazio, nada fala com o PROMeiro.

'promeiro-fila.json', na mesma pasta: a fila dos avisos do Padeiro ainda não entregues (jmbillard/TEXTAO#141). O
aviso entra aqui primeiro, ao abrir ou criar o projeto, e sai quando o PROMeiro responde (js/promeiro.js); sem rede,
ou com o PROMeiro fora do ar, fica para depois. Cada mudança da fila é uma chamada só ao host (lê, muda e grava de uma
vez): duas janelas abertas não perdem o aviso uma da outra. Uma lista de { aviso, abertoEm, producao, card, filme,
url }, a mais velha primeiro, com no máximo PAD_PROMEIRO_QUEUE_MAX avisos e só os dos últimos
PAD_PROMEIRO_QUEUE_DAYS dias.

*/

var PAD_PROMEIRO_QUEUE_MAX = 100;
var PAD_PROMEIRO_QUEUE_DAYS = 30;

function padPromeiroFile() {
	return new File(scriptPreferencesPath + '/promeiro.json');
}

function padPromeiroSaved() {
	var file = padPromeiroFile();

	if (!file.exists) return {};

	try {
		var data = JSON.parse(readFileContent(file));

		return data && typeof data == 'object' ? data : {};
	} catch (err) {
		return {};
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

// O que o painel precisa para falar com o PROMeiro. → { url, usuario, computador, sistema, sigla, chave, estado,
// designer, conferido, local }. A chave pedida em outro endereço não vale (chave e estado vazios).
PADX.promeiroInfo = function () {
	var url = '';

	try {
		url = padReadSearch().promeiro || '';
	} catch (err) { }

	var saved = padPromeiroSaved();
	var same = !!url && saved.url == url && !!saved.chave;

	return {
		url: url,
		usuario: padTrim(String(system.userName || '')).substring(0, 80),
		computador: padPromeiroMachine(),
		sistema: padPromeiroSystem(),
		sigla: padMachineUser(),
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
	var folder = new Folder(scriptPreferencesPath);

	if (!folder.exists) folder.create();

	var chave = padTrim(String(a.chave == null ? '' : a.chave));

	if (!chave) {
		var file = padPromeiroFile();

		if (file.exists) file.remove();

		return PADX.promeiroInfo();
	}

	var data = {
		url: padTrim(String(a.url == null ? '' : a.url)),
		chave: chave,
		estado: padTrim(String(a.estado == null ? '' : a.estado)),
		designer: padTrim(String(a.designer == null ? '' : a.designer)),
		conferido: padPromeiroNow()
	};

	saveTextFile(JSON.stringify(data, null, '\t'), padPromeiroFile().fsName);

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

// Põe um aviso na fila. a: { aviso, abertoEm, producao, card, filme }. Sem o endereço do PROMeiro na configuração,
// nada entra (ninguém para avisar). O mesmo identificador não entra duas vezes. → { queued, itens }
PADX.promeiroQueueAdd = function (a) {
	var url = '';

	try {
		url = padReadSearch().promeiro || '';
	} catch (err) { }

	var item = {
		aviso: padPromeiroText(a.aviso, 100),
		abertoEm: padPromeiroText(a.abertoEm, 40) || padPromeiroNow(),
		producao: padPromeiroText(a.producao, 100),
		card: padPromeiroText(a.card, 100),
		filme: padPromeiroText(a.filme, 100),
		url: url
	};

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

// Tira da fila os avisos resolvidos (entregues, repetidos ou recusados de vez). a: { avisos: [identificador] }
// → { itens }
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

	return { itens: list.length };
};
