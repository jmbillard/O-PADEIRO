/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🪟 UI dialogs - conversor de caminhos Windows / MacOS
---------------------------------------------------------------

*/

// Limpa o caminho colado: espaços, aspas do 'copiar como caminho' do Windows e o
// formato smb:// do Finder (smb://servidor/share/pasta → //servidor/share/pasta).
function cleanPathInput(str) {
	return String(str || '')
		.replace(/^\s+|\s+$/g, '')
		.replace(/^["']+|["']+$/g, '')
		.replace(/^smb:\/\/([^@\/]+@)?/i, '//');
}

// Caminho no formato do macOS (/Volumes/SHARE/...).
function toMacPath(str) {
	var path = cleanPathInput(str);

	if (path == '') return '';

	// caminho local do Windows (C:\Users\...) → /Users/...
	if (/^[a-z]:[\\\/]/i.test(path) && !DRIVE_MAP[path.charAt(0).toUpperCase()]) {
		return path.substring(2).replace(/\\/g, '/');
	}

	return normalizeNetworkPath(path, { forceMac: true, silent: true });
}

// Caminho no formato do Windows (\\servidor\SHARE\... ou C:\...).
function toWinPath(str) {
	var path = cleanPathInput(str);

	if (path == '') return '';

	return normalizeNetworkPath(path, { forceWin: true, silent: true })
		.replace(/^\/Users\//, 'C:/Users/') // pasta do usuário no macOS → pasta do usuário no Windows
		.replace(/\//g, '\\');
}

function pathDialog(path) {
	var scriptName = 'CONVERSOR DE CAMINHOS';
	var scriptVersion = 'v2.0';

	var pathW = new Window('palette', scriptName + ' ' + scriptVersion);
	pathW.orientation = 'column';
	pathW.alignChildren = ['left', 'top'];
	pathW.spacing = 8;
	pathW.margins = 12;

	var contentWidth = PAD_SEARCH_UI_WIDTH - pathW.margins.left - pathW.margins.right;
	var labelWidth = 70;
	var copyWidth = 80;

	// Linha 'sistema: [caminho] [copiar]'
	function addPathRow(label) {
		var rowGrp = pathW.add('group');
		rowGrp.orientation = 'row';
		rowGrp.alignChildren = ['left', 'center'];
		rowGrp.spacing = 8;

		var lab = rowGrp.add('statictext', undefined, label);
		lab.preferredSize.width = labelWidth;
		setFgColor(lab, normalColor1);

		var edit = rowGrp.add('edittext', [0, 0, contentWidth - labelWidth - copyWidth - 16, 32]);

		var copyBtn = themeButton(rowGrp, {
			width: copyWidth,
			height: 32,
			labelTxt: 'copiar',
			tips: [lClick + 'copiar o caminho ' + label]
		});

		copyBtn.leftClick.onClick = function () {
			if (edit.text == '') return;

			copyToClipboard(edit.text);
			statusTxt.text = 'caminho ' + label + ' copiado.';
		};

		return edit;
	}

	var macPathTxt = addPathRow('MacOS');
	var winPathTxt = addPathRow('Windows');

	macPathTxt.helpTip = winPathTxt.helpTip = 'cole ou digite um caminho em qualquer um dos campos: o outro é convertido na hora';

	var bottomGrp = pathW.add('group');
	bottomGrp.orientation = 'row';
	bottomGrp.alignChildren = ['left', 'center'];
	bottomGrp.spacing = 12;

	var openPathBtn = themeButton(bottomGrp, {
		width: 150,
		height: 32,
		textColor: bgColor1,
		buttonColor: normalColor1,
		labelTxt: 'abrir pasta',
		tips: [lClick + 'abrir a pasta no ' + (appOs == 'Mac' ? 'Finder' : 'Explorer')]
	});

	var statusTxt = bottomGrp.add('statictext', undefined, '', { truncate: 'end' });
	statusTxt.preferredSize.width = contentWidth - 150 - 12;
	setFgColor(statusTxt, monoColor1);

	setBgColor(pathW, bgColor1);

	// ----------------------------------------------------------------------------

	// O texto definido pelo script não dispara onChanging, então um campo não realimenta o outro.
	macPathTxt.onChanging = function () {
		winPathTxt.text = toWinPath(macPathTxt.text);
		statusTxt.text = '';
	};

	winPathTxt.onChanging = function () {
		macPathTxt.text = toMacPath(winPathTxt.text);
		statusTxt.text = '';
	};

	openPathBtn.leftClick.onClick = function () {
		var fldPath = appOs == 'Mac' ? toMacPath(macPathTxt.text) : toWinPath(winPathTxt.text);

		if (fldPath == '') return;

		var folder = nearestExistingFolder(fldPath);

		if (folder == null) {
			statusTxt.text = 'pasta não encontrada (o volume / servidor está acessível?)';
			return;
		}

		if (decodeURI(folder.fsName) != decodeURI(new Folder(fldPath).fsName)) {
			statusTxt.text = 'a pasta não existe: abrindo a mais próxima.';
		}

		openFolder(folder.fsName);
	};

	// caminho inicial (pasta da última saída da fila de render)
	if (path) {
		if (appOs == 'Mac') {
			macPathTxt.text = toMacPath(path);
			winPathTxt.text = toWinPath(macPathTxt.text);
		} else {
			winPathTxt.text = toWinPath(path);
			macPathTxt.text = toMacPath(winPathTxt.text);
		}
	}

	pathW.onShow = function () {
		(appOs == 'Mac' ? macPathTxt : winPathTxt).active = true;
	};

	pathW.show();

	return pathW;
}
