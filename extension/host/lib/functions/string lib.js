/* eslint-disable no-unused-vars */
/*

---------------------------------------------------------------
> 🖌️ string manipulation
---------------------------------------------------------------

*/

// Remove a extensão de um nome de arquivo (incluindo o ponto).
function deleteFileExt(str) {
	return str.replace(/\.[0-9a-z]+$/i, ''); // /\.[0-9a-z]+$/i: Encontra um ponto seguido de um ou mais caracteres alfanuméricos no final da string
}

// Obtém a extensão de um nome de arquivo (em minúsculas).
function getFileExt(str) {
	var match = str.match(/\.[0-9a-z]+$/i); // /\.[0-9a-z]+$/i: Encontra um ponto seguido de um ou mais caracteres alfanuméricos no final da string
	return match ? match[0].toLowerCase() : ''; // Retorna a extensão em minúsculas ou uma string vazia se não encontrar
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
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');
}