/*

---------------------------------------------------------------
> 🥖 O PADEIRO — instalador
---------------------------------------------------------------

No After Effects: File > Scripts > Run Script File... e escolha este arquivo, direto da pasta do padeiro
na rede. Funciona no macOS e no Windows (rodando dentro do After Effects, o macOS não bloqueia).

O código do padeiro continua na rede: a máquina recebe só um carregador (o manifest e uma página por
painel que abre a página de verdade, na pasta 'extension' da rede). Para atualizar o padeiro, basta trocar
os arquivos na rede e reabrir o painel; o instalador só precisa rodar de novo quando o manifest mudar
(um painel novo, por exemplo).

Instalar / atualizar:
  1. grava o carregador na pasta de extensões CEP do usuário;
  2. liga o PlayerDebugMode (extensões sem assinatura só carregam com ele);
  3. grava onde está a lista de produções compartilhada (O_PADEIRO_config.json, ao lado deste arquivo);
  4. remove a versão antiga (o script 'O PADEIRO.jsx' das pastas ScriptUI Panels).

Remover: apaga a extensão instalada.

*/

(function () {
	var EXT_ID = 'com.jmbillard.opadeiro.panel';
	var IS_MAC = $.os.indexOf('Win') < 0;

	var here = new File($.fileName).parent;
	var src = new Folder(here.fsName + '/extension');
	var sharedList = new File(here.fsName + '/O_PADEIRO_config.json');
	var userData = Folder.userData.fsName; // macOS: ~/Library/Application Support | Windows: %APPDATA%
	var dest = new Folder(userData + '/Adobe/CEP/extensions/' + EXT_ID);
	var prefsFolder = new Folder(userData + '/O PADEIRO script');

	// "Allow Scripts to Write Files and Access Network": sem ela o instalador não grava nada
	function canWriteFiles() {
		try {
			return app.preferences.getPrefAsLong('Main Pref Section', 'Pref_SCRIPTING_FILE_NETWORK_SECURITY') == 1;
		} catch (err) {
			return true; // versões que não expõem a preferência: tenta assim mesmo
		}
	}

	function quote(path) {
		return '"' + String(path).replace(/"/g, '\\"') + '"';
	}

	function readText(file) {
		file.encoding = 'UTF-8';
		file.open('r');

		var text = file.read();

		file.close();

		return text;
	}

	// literal de string JavaScript (o ExtendScript antigo não tem JSON)
	function jsString(str) {
		return '"' + String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
	}

	function writeText(file, text) {
		file.encoding = 'UTF-8';
		file.open('w');
		file.write(text);
		file.close();
	}

	// Windows: remoção pelo próprio ExtendScript
	function removeFolder(folder) {
		var items = folder.getFiles();

		for (var i = 0; i < items.length; i++) {
			if (items[i] instanceof Folder) removeFolder(items[i]);
			else items[i].remove();
		}

		folder.remove();
	}

	function removeExtension() {
		if (IS_MAC) {
			// 'rm' sem barra no fim apaga só o link, se a instalação de desenvolvimento for um link
			system.callSystem('rm -rf ' + quote(dest.fsName));
		} else if (dest.exists) {
			removeFolder(dest);
		}
	}

	// O carregador: o manifest da rede e, para cada painel, uma página que abre a página de verdade na rede.
	function installExtension() {
		var manifest = new File(src.fsName + '/CSXS/manifest.xml');
		var stub = new File(src.fsName + '/loader/stub.html');

		if (!manifest.exists || !stub.exists) return ['arquivos da extensão não encontrados em ' + src.fsName];

		var xml = readText(manifest);
		var template = readText(stub);
		var pages = xml.match(/<MainPath>\.\/client\/[^<]+<\/MainPath>/g) || [];

		removeExtension();
		new Folder(dest.fsName + '/CSXS').create();
		new Folder(dest.fsName + '/client').create();
		writeText(new File(dest.fsName + '/CSXS/manifest.xml'), xml);

		var debug = new File(src.fsName + '/.debug');

		if (debug.exists) debug.copy(dest.fsName + '/.debug');

		for (var i = 0; i < pages.length; i++) {
			var page = pages[i].replace(/^<MainPath>\.\/client\//, '').replace(/<\/MainPath>$/, '');
			var html = template
				.replace(/__PADEIRO_ROOT__/g, function () {
					return jsString(src.fsName);
				})
				.replace(/__PADEIRO_PAGE__/g, function () {
					return jsString(page);
				});

			writeText(new File(dest.fsName + '/client/' + page), html);
		}

		return new File(dest.fsName + '/CSXS/manifest.xml').exists ? [] : ['não foi possível gravar em ' + dest.fsName];
	}

	function enableDebugMode() {
		for (var v = 9; v <= 12; v++) {
			if (IS_MAC) system.callSystem('defaults write com.adobe.CSXS.' + v + ' PlayerDebugMode 1');
			else system.callSystem('reg add "HKCU\\Software\\Adobe\\CSXS.' + v + '" /v PlayerDebugMode /t REG_SZ /d 1 /f');
		}
	}

	function saveSharedListPath() {
		if (!sharedList.exists) return false;

		if (!prefsFolder.exists) prefsFolder.create();

		writeText(new File(prefsFolder.fsName + '/shared_config.txt'), sharedList.fsName);

		return true;
	}

	// a versão antiga instalava 'O PADEIRO.jsx' nas preferências de cada versão do After Effects
	function removeOldScript() {
		var aeFolder = new Folder((IS_MAC ? userData.replace(/Application Support$/, 'Preferences') : userData) + '/Adobe/After Effects');
		var removed = 0;

		if (!aeFolder.exists) return 0;

		var versions = aeFolder.getFiles();

		for (var i = 0; i < versions.length; i++) {
			if (!(versions[i] instanceof Folder)) continue;

			var old = new File(versions[i].fsName + '/Scripts/ScriptUI Panels/O PADEIRO.jsx');

			if (old.exists && old.remove()) removed++;
		}

		return removed;
	}

	function install() {
		var errors = installExtension();

		if (errors.length) {
			alert('O PADEIRO\n\nnão foi possível copiar a extensão:\n\n' + errors.slice(0, 5).join('\n'));
			return;
		}

		enableDebugMode();

		var shared = saveSharedListPath();
		var old = removeOldScript();
		var msg = 'O PADEIRO instalado!\n\nreinicie o After Effects e abra:\nWindow > Extensions > O PADEIRO';

		if (old) msg += '\n\na versão antiga (script) foi removida.';
		if (!shared) msg += '\n\natenção: não achei a lista de produções (O_PADEIRO_config.json) ao lado deste instalador. instale a partir da pasta do padeiro na rede.';

		alert(msg);
	}

	function uninstall() {
		removeExtension();
		alert('O PADEIRO removido.\n\nreinicie o After Effects.');
	}

	// ---------------------------------------------------------------

	if (!canWriteFiles()) {
		alert(
			'O PADEIRO\n\nantes de instalar, habilite em:\nEdit > Preferences > Scripting & Expressions...\n\n' +
				'"Allow Scripts to Write Files and Access Network"\n\ne rode o instalador de novo.'
		);
		return;
	}

	if (!src.exists) {
		alert('O PADEIRO\n\nnão achei a pasta "extension" ao lado deste instalador:\n' + here.fsName);
		return;
	}

	var win = new Window('dialog', 'O PADEIRO');
	var installed = dest.exists;

	win.alignChildren = ['fill', 'top'];
	win.spacing = 14;
	win.margins = 20;

	win.add('statictext', undefined, 'O PADEIRO').graphics.font = ScriptUI.newFont('Arial', 'BOLD', 18);
	win.add('statictext', undefined, installed ? 'a extensão já está instalada neste computador.' : 'instala a extensão neste computador.', { multiline: true });

	var buttons = win.add('group');

	buttons.alignment = 'right';

	var removeBtn = buttons.add('button', undefined, 'Remover');
	var cancelBtn = buttons.add('button', undefined, 'Cancelar', { name: 'cancel' });
	var installBtn = buttons.add('button', undefined, installed ? 'Atualizar' : 'Instalar', { name: 'ok' });

	removeBtn.enabled = installed;

	var action = null;

	installBtn.onClick = function () {
		action = install;
		win.close();
	};
	removeBtn.onClick = function () {
		action = uninstall;
		win.close();
	};
	cancelBtn.onClick = function () {
		win.close();
	};

	win.show();

	if (action) action();
})();
