/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> O PADEIRO — carregador do host
---------------------------------------------------------------

O código vive na rede: ao abrir, cada painel pede ao After Effects para ler este arquivo e conferir se o
host (os .jsx / .js desta pasta) mudou desde a última leitura. Se mudou (ou nunca foi lido), o painel
avalia 'index.jsx' de novo. Assim, para atualizar o padeiro basta trocar os arquivos na rede e reabrir o painel.

*/

// Assinatura do host: nome e data de modificação de cada arquivo de código.
function PADX_hostSignature(folder) {
	var sig = '';
	var items = folder.getFiles();

	for (var i = 0; i < items.length; i++) {
		if (items[i] instanceof Folder) sig += PADX_hostSignature(items[i]);
		else if (/\.(jsx|js)$/i.test(items[i].name)) sig += items[i].name + ':' + items[i].modified.getTime() + ';';
	}

	return sig;
}

// 'ok' (host atual já carregado), 'load' (o painel deve avaliar index.jsx) ou 'erro: ...'.
function PADX_hostState(hostPath) {
	var folder = new Folder(hostPath);

	if (!folder.exists) return 'erro: #PAD_066 - a pasta do padeiro na rede não está acessível (' + hostPath + ')';

	$.global.PADX_PENDING_SIG = PADX_hostSignature(folder);

	if (typeof PADX_call == 'function' && $.global.PADX_HOST_SIG === $.global.PADX_PENDING_SIG) return 'ok';

	return 'load';
}

// Chamado logo depois de avaliar index.jsx.
function PADX_hostLoaded() {
	if (typeof PADX_call != 'function') return 'erro: #PAD_067 - o host não carregou';

	$.global.PADX_HOST_SIG = $.global.PADX_PENDING_SIG;

	return 'loaded';
}
