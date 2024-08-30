/*

---------------------------------------------------------------
> 🖌️ color and conversions
---------------------------------------------------------------

*/

// Retorna uma cor aleatória de um array de cores.
function randomColor(colorArray) {
	// Gera um índice aleatório dentro do intervalo do array e	
	// retorna a cor correspondente ao índice aleatório.
	return colorArray[randomInteger(0, colorArray.length)];
}


// Converte valores RGB (0-255) para um array normalizado [0-1].
function rgb(r, g, b) {
	// Normaliza os valores RGB dividindo por 255 (para o formato do After Effects)
	const rNormalizado = r / 255;
	const gNormalizado = g / 255;
	const bNormalizado = b / 255;

	// Retorna o array com os valores normalizados
	return [rNormalizado, gNormalizado, bNormalizado];
}


// Converte valores RGBA (0-255) para um array normalizado [0-1].
function rgba(r, g, b, a) {
	// Normaliza os valores RGBA dividindo por 255 (para o formato do After Effects)
	const rNormalizado = r / 255;
	const gNormalizado = g / 255;
	const bNormalizado = b / 255;
	const aNormalizado = a / 255;

	// Retorna o array com os valores normalizados
	return [rNormalizado, gNormalizado, bNormalizado, aNormalizado];
}

// Converte um componente de cor (0-255) para hexadecimal (00-FF).
function componentToHex(c) {
	// Converte o componente para hexadecimal.
	const hex = c.toString(16);

	// Adiciona um zero à esquerda se o hexadecimal tiver apenas um dígito.
	return hex.length === 1 ? '0' + hex : hex;
}

// Converte um array RGB normalizado [0-1] para uma string hexadecimal (ex: '#FF0000').
function rgbToHEX(rgbArray) {
	// Converte os componentes RGB normalizados de volta para valores de 0 a 255.
	const r = Math.round(rgbArray[0] * 255);
	const g = Math.round(rgbArray[1] * 255);
	const b = Math.round(rgbArray[2] * 255);

	// Converte os componentes para hexadecimal e junta em uma string.
	return ('#' + componentToHex(r) + componentToHex(g) + componentToHex(b)).toUpperCase();
}

// Converte um array RGB normalizado [0-1] para uma string hexadecimal com prefixo '0x' (ex: '0xFF0000').
function rgbToHex(rgbArray) {
	// Converte os componentes RGB normalizados de volta para valores de 0 a 255.
	const r = Math.round(rgbArray[0] * 255);
	const g = Math.round(rgbArray[1] * 255);
	const b = Math.round(rgbArray[2] * 255);
  
	// Converte os componentes para hexadecimal e junta em uma string com o prefixo '0x'.
	return '0x' + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }
  
function rgbStr(val) {
	if (val.length > 0) {
		val = rgbToHex(val);
	
	} else if (eval(val).length > 0) {
		val = rgbToHex(eval(val));
	}
	var r = (val >> 16) & 0xff;
	var g = (val >> 8) & 0xff;
	var b = val & 0xff;

	return 'rgb(' + r + ', ' + g + ', ' + b + ')';
}

// function hexToRGB(hex) {
// 	hex = hex.replace('#', '');

// 	var r = ('0x' + hex[0] + hex[1]) | 0;
// 	var g = ('0x' + hex[2] + hex[3]) | 0;
// 	var b = ('0x' + hex[4] + hex[5]) | 0;

// 	return [r / 255, g / 255, b / 255];
// }

// Converte uma string hexadecimal (com ou sem '#') para um array RGB normalizado.
function hexToRGB(hex) {
	// Remove o caractere '#' se estiver presente
	hex = hex.replace('#', '');
  
	// Extrai os componentes RGB do hexadecimal e converte para valores de 0 a 255
	var r = parseInt(hex.substring(0, 2), 16);
	var g = parseInt(hex.substring(2, 4), 16);
	var b = parseInt(hex.substring(4, 6), 16);
  
	// Retorna o array com os valores RGB normalizados
	return [r / 255, g / 255, b / 255];
  }
  