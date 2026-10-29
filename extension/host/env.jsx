/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> ambiente do host
---------------------------------------------------------------

Equivalente enxuto do 'globals.js' do script ScriptUI: só o que as libs compartilhadas
(file system, projeto, metadados...) esperam encontrar. Constantes de rede, regras de
renomeação e configuração padrão de templates vêm de lib/globals.shared.js.

*/

var scriptName = 'O PADEIRO';
var scriptVersion = 'v' + PADX_VERSION;
var repoURL = 'https://github.com/jmbillard/O-PADEIRO';

// Sistema operacional e versão do After Effects
var appOs = $.os.indexOf('Win') >= 0 ? 'Win' : 'Mac';
var appV = parseInt(app.buildName.substring(0, 2), 10);

// Pasta de dados do usuário (mesma do script ScriptUI, assim as duas versões compartilham a lista de produções)
var userPath = Folder.userData.fsName;
var scriptPreferencesPath = userPath + '/O PADEIRO script';
var scriptPreferencesFolder = new Folder(scriptPreferencesPath);
if (!scriptPreferencesFolder.exists) scriptPreferencesFolder.create();

var tempPath = scriptPreferencesPath + '/temp';
var tempFolder = new Folder(tempPath);
if (!tempFolder.exists) tempFolder.create();
