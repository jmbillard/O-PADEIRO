/*

---------------------------------------------------------------
> 🖌️ math
---------------------------------------------------------------

*/

// Retorna um número inteiro aleatório entre 'min' (inclusivo) e 'max' (exclusivo).
function randomInteger(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

// Retorna um número aleatório com distribuição gaussiana (normal) entre 0 e 1.
function gaussRnd(samples) {
	var r = 0;
	// Soma várias amostras de números aleatórios uniformes (0 a 1)
	for (var i = 0; i < samples; i++) {
		r += Math.random();
	}
	return r / samples; // Média das amostras, resultando em um valor próximo de 0.5, com distribuição gaussiana
}

// Retorna o tempo decorrido em segundos desde o início do script (com duas casas decimais).
function timer() {
	return ($.hiresTimer / 1000000).toFixed(2);
}
