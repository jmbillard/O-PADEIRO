/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🖌️ string manipulation
---------------------------------------------------------------

*/
// Formata um objeto JavaScript para uma string de texto legível.
function formatObjTxt(obj) {
	return JSON.stringify(obj, null, '\t') // Converte o objeto em JSON com indentação por tabulação
		.replace(/(\{[\r\n]|[\r\n]\})/g, '') // Remove chaves com quebras de linha ao redor
		.replace(/\t"/g, '\t') // Remove aspas duplas após tabulações
		.replace(/\//g, ' / ') // Adiciona espaços em torno de barras (/)
		.replace(/":/g, ' →') // Substitui dois-pontos (:) e aspas duplas por seta (→)
		.replace(/"/g, "'") // Substitui aspas duplas (") por aspas simples (')
		.replace(/,/g, ''); // Remove vírgulas (,)
}

// Formata um objeto JavaScript para uma string JSON válida e legível.
function formatObjStr(obj) {
	return JSON.stringify(obj, null, '\t') // Converte o objeto em JSON com indentação por tabulação
		.replace(/\\\\/g, '\\') // Corrige barras duplas (\\)
		.replace(/\t"/g, '\t') // Remove aspas duplas após tabulações
		.replace(/": "/g, ': ') // Remove espaços extras em torno de dois-pontos (:)
		.replace(/",[\n\r]/g, ',\n') // Adiciona quebras de linha após vírgulas (,)
		.replace(/"[\n\r]/g, '\n'); // Remove aspas duplas e adiciona quebras de linha
}

// Incrementa o número no final de um nome, se houver. Caso contrário, adiciona ' 2'.
function nameInc(aName) {
	var name = aName.replace(/\s*[0-9]+$/, ''); // Extrai a parte do nome sem o número
	var num = aName.match(/\s*[0-9]+$/); // Extrai o número no final (com espaços opcionais)

	// Se não houver número, define numStr como '2', caso contrário, incrementa o número existente
	var numStr = num == null ? 2 : parseInt(num) + 1;

	return name + ' ' + numStr.toString(); // Retorna o nome com o número incrementado
}

// Remove a extensão de um nome de arquivo (incluindo o ponto).
function deleteFileExt(str) {
	return str.replace(/\.[0-9a-z]+$/i, ''); // /\.[0-9a-z]+$/i: Encontra um ponto seguido de um ou mais caracteres alfanuméricos no final da string
}

// Obtém a extensão de um nome de arquivo (em minúsculas).
function getFileExt(str) {
	var match = str.match(/\.[0-9a-z]+$/i); // /\.[0-9a-z]+$/i: Encontra um ponto seguido de um ou mais caracteres alfanuméricos no final da string
	return match ? match[0].toLowerCase() : ''; // Retorna a extensão em minúsculas ou uma string vazia se não encontrar
}

// Converte uma string para o formato Title Case (primeira letra de cada palavra em maiúscula).
function titleCase(str) {
	// Converte para minúsculas e divide em palavras
	str = str.toLowerCase().split(' ');

	// Itera pelas palavras e coloca a primeira letra de cada palavra em maiúscula
	for (var i = 0; i < str.length; i++) {
		str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
	}

	// Junta as palavras novamente
	str = str.join(' ');

	// Divide em linhas (se houver quebras de linha)
	str = str.split(/\n|\r/);

	// Itera pelas linhas e coloca a primeira letra de cada linha em maiúscula
	for (var t = 0; t < str.length; t++) {
		str[t] = str[t].charAt(0).toUpperCase() + str[t].slice(1);
	}

	return str.join('\n'); // Retorna a string formatada com quebras de linha
}

// format short date and time → SHORT DATE TIME
function formatShortDateAndTime(str) {
	return str
		.toString()
		.trim()
		.toUpperCase()
		.toShortDate()
		.split(/\s+—\s+|[\n\r]+|\s+\|\s+/)
		.join(' ');
}

// Limita o tamanho de um nome, adicionando reticências (...) no meio se necessário.
function limitNameSize(name, limit) {
	// Se o nome já for menor ou igual ao limite, retorna o nome original
	if (name.length <= limit) {
		return name;

		// Calcula os pontos de corte para manter pelo menos 5 caracteres em cada lado das reticências
	} else {
		var meio = Math.floor(limit / 2);
		var inicio = meio - 5;
		var fim = meio + 5;

		// Extrai as partes do nome antes e depois das reticências
		var name1 = name.substring(0, inicio);
		var name2 = name.substring(name.length - fim);

		// Retorna o nome truncado com reticências no meio
		return name1 + '...' + name2;
	}
}

/**
 * Escapa caracteres especiais para uso em ExtendScript
 * @param {string} str - String a ser escapada
 * @returns {string} String escapada
 */
function escapeForExtendScript(str) {
    return str
        .replace(/#/g, "\\#")
        .replace(/&/g, "\\&")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');
}