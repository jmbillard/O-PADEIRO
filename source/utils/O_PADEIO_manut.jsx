// Determina o sistema operacional atual: 'Win' para Windows, 'Mac' para macOS.
var appOs = $.os.indexOf('Win') >= 0 ? 'Win' : 'Mac';

var userPath = Folder.userData.fullName;
var localAePath = '/Adobe/After Effects';
var localScriptsPanelPath = '/Scripts/ScriptUI Panels';

// Preferências de acesso à rede para scripts no After Effects
var prefSection = 'Main Pref Section'; // Seção de preferências
var prefName = 'Pref_SCRIPTING_FILE_NETWORK_SECURITY'; // Nome da preferência
var netConfigName = '"Allow Scripts to Write Files and Access Network"'; // nome da configuração

var code = '\
try {\
	var scriptMainPath = \'//10.228.183.165/VFX/imagem/drive_l/Fileserver_3/INSTITUCIONAL/_adm-designers/SCRIPTS FREE/O_PADEIRO/\';\
	var scriptMainFile = new File(scriptMainPath + \'O_PADEIRO_SOURCE.jsxbin\');\n\
	scriptMainFile.open(\'r\');\
	eval(scriptMainFile.read());\n\
	scriptMainFile.close();\n\
} catch (err) {\
	alert(\'(っ °Д °;)っ      #PAD_001 - \' + err.message);\
}\
';

// gets the current value for the network permission preference...
function netAccess() {
	return app.preferences.getPrefAsLong(prefSection, prefName);
}

function saveTextFile(fileContent, filePath) {
	var newFile = new File(filePath);

	newFile.encoding = 'UTF-8'; // → file encoding
	return writeFileContent(newFile, fileContent);
}

function writeFileContent(newFile, fileContent) {
	newFile.open('w');
	newFile.write(fileContent);
	newFile.close();

	return newFile;
}

function manut() {

	if (appOs == 'Mac') return;

	var localAeFolder = new Folder(userPath + localAePath);
	var vFolderArray = localAeFolder.getFiles();

	for (var i = 0; i < vFolderArray.length; i++) {

		var vFolder = vFolderArray[i];

		if (!(vFolder instanceof Folder)) continue;
		if (vFolder.name.match(/logs/i)) continue;

		try {

			var scriptPanelsPath = vFolder.fullName + localScriptsPanelPath;
			var scriptPanelsFolder = new Folder(scriptPanelsPath);

			if (!scriptPanelsFolder.exists) scriptPanelsFolder.create();

			var filesArray = scriptPanelsFolder.getFiles();

			for (var j = 0; j < filesArray.length; j++) {

				var scriptFile = filesArray[j];

				if (!(scriptFile instanceof File)) continue;
				if (scriptFile.name.match(/O_PADEIRO/i)) scriptFile.remove();
			}
			saveTextFile(code, scriptPanelsFolder.fullName + '/O_PADEIRO.jsx');

		} catch (err) {
			alert(err.message);
		}
	}
}

if (!netAccess()) {
	// Se não houver acesso, exibe um alerta pedindo para habilitar o acesso à rede nas preferências.
	alert('por favor, habilite a opção ' + netConfigName + ' nas preferencias');

	// Abre a janela de preferências do After Effects na seção de scripts.
	app.executeCommand(3131);

	// Verifica novamente se há acesso à rede.
	if (!netAccess()) {
		// Se ainda não houver acesso, exibe outro alerta informando que a funcionalidade será limitada.
		alert(lol + 'não será possível rodar o script sem acesso à rede...');
	}
}

if (netAccess()) manut();