/*

---------------------------------------------------------------
> 🥖 O PADEIRO — instalador
---------------------------------------------------------------

No After Effects: File > Scripts > Run Script File... e escolha este arquivo, direto da pasta do padeiro
na rede. Funciona no macOS e no Windows (rodando dentro do After Effects, o macOS não bloqueia).

Instalar / atualizar:
  1. copia a pasta 'extension' para a pasta de extensões CEP do usuário;
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

	function writeText(file, text) {
		file.encoding = 'UTF-8';
		file.open('w');
		file.write(text);
		file.close();
	}

	// Windows: cópia e remoção pelo próprio ExtendScript
	function copyFolder(from, to, skip) {
		var errors = [];

		if (!to.exists) to.create();

		var items = from.getFiles();

		for (var i = 0; i < items.length; i++) {
			var name = File.decode(items[i].name);

			if (items[i] instanceof Folder) {
				if (skip && skip[name]) continue;

				errors = errors.concat(copyFolder(items[i], new Folder(to.fsName + '/' + name), null));
			} else if (!items[i].copy(to.fsName + '/' + name)) {
				errors.push(items[i].fsName);
			}
		}

		return errors;
	}

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

	function installExtension() {
		removeExtension();
		new Folder(dest.parent.fsName).create();

		if (IS_MAC) {
			system.callSystem('ditto ' + quote(src.fsName) + ' ' + quote(dest.fsName));
			system.callSystem('rm -rf ' + quote(dest.fsName + '/scripts'));
			// arquivos baixados (zip do GitHub) vêm em quarentena
			system.callSystem('xattr -dr com.apple.quarantine ' + quote(dest.fsName));

			return new File(dest.fsName + '/CSXS/manifest.xml').exists ? [] : ['a cópia para ' + dest.fsName + ' falhou'];
		}

		return copyFolder(src, dest, { scripts: true });
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
