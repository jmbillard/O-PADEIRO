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

*/

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

// agora, em ISO (UTC): o ExtendScript não tem o toISOString
function padPromeiroNow() {
	var d = new Date();
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
