/*

---------------------------------------------------------------
> 🪄 prototype functions
---------------------------------------------------------------

*/

// string to camel case...
String.prototype.toCamelCase = function () {
	return this.toLowerCase()
		.replace(/\s(.)/g, function ($1) {
			return $1.toUpperCase();
		})
		.replace(/\s/g, '')
		.replace(/^(.)/, function ($1) {
			return $1.toLowerCase();
		});
};
// string to camel case...
String.prototype.toTitleCase = function () {
	return this.toLowerCase()
		.replace(/\s(.)/g, function ($1) {
			return $1.toUpperCase();
		})
		.replace(/^(.)/, function ($1) {
			return $1.toUpperCase();
		});
};

// trim...
if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/gm, '');
	};
}

/* cSpell:disable */
// replaces most of the special characters...
String.prototype.replaceSpecialCharacters = function () {
	return this.replace(/\u00C0|\u00C1|\u00C2|\u00C3|\u00C4|[ÀÁÂÃÄ]/g, 'A')
		.replace(/\u00E0|\u00E1|\u00E2|\u00E3|\u00E4|[àáâãä]/g, 'a')
		.replace(/\u00C8|\u00C9|\u00CA|\u00CB|[ÈÉÊË]/g, 'E')
		.replace(/\u00E8|\u00E9|\u00EA|\u00EB|[èéêë]/g, 'e')
		.replace(/\u00CC|\u00CD|\u00CE|\u00CF|[ÌÍîï]/g, 'I')
		.replace(/\u00EC|\u00ED|\u00EE|\u00EF|[ìíîï]/g, 'i')
		.replace(/\u00D2|\u00D3|\u00D4|\u00D5|\u00D6|[ÒÓÔÕÖ]/g, 'O')
		.replace(/\u00F2|\u00F3|\u00F4|\u00F5|\u00F6|[òóôõö]/g, 'o')
		.replace(/\u00D9|\u00DA|\u00DB|\u00DC|[ÙÚÛÜ]/g, 'U')
		.replace(/\u00F9|\u00FA|\u00FB|\u00FC|[ùúûü]/g, 'u')
		.replace(/Ç|\u00C7/g, 'C')
		.replace(/ç|\u00E7/g, 'c')
		.replace(/[^\w\s-]/g, ' ') // replaces any letter character except space...
		.replace(/[\s_]+/g, ' ') // replaces 2 or more spaces...
		.replace(/^\W+|\W+$/, '')
		.trim();
};
/* cSpell:enable */

// date shortener...
String.prototype.toShortDate = function () {
	return this.replaceSpecialCharacters()
		.replace(/SEGUNDA/, 'SEG')
		.replace(/TERCA/, 'TER')
		.replace(/QUARTA/, 'QUA')
		.replace(/QUINTA/, 'QUI')
		.replace(/SEXTA/, 'SEX')
		.replace(/SABADO/, 'SAB')
		.replace(/DOMINGO/, 'DOM')
		.replace(/DE /, '')
		.replace(/JANEIRO/, 'JAN')
		.replace(/FEVEREIRO/, 'FEV')
		.replace(/MARCO/, 'MAR')
		.replace(/ABRIL/, 'ABR')
		.replace(/MAIO/, 'MAI')
		.replace(/JUNHO/, 'JUN')
		.replace(/JULHO/, 'JUL')
		.replace(/AGOSTO/, 'AGO')
		.replace(/SETEMBRO/, 'SET')
		.replace(/OUTUBRO/, 'OUT')
		.replace(/NOVEMBRO/, 'NOV')
		.replace(/DEZEMBRO/, 'DEZ');
};

// image resize to fit dimensions...
Image.prototype.onDraw = function () {
	// 'this' is the container and 'this.image' is the graphic
	if (!this.image) return;
	var WH = this.size,
		wh = this.image.size,
		k = Math.min(WH[0] / wh[0], WH[1] / wh[1]),
		xy;
	// Resize proportionally...
	wh = [k * wh[0], k * wh[1]];
	// Center...
	xy = [(WH[0] - wh[0]) / 2, (WH[1] - wh[1]) / 2];
	this.graphics.drawImage(this.image, xy[0], xy[1], wh[0], wh[1]);
	WH = wh = xy = null;
};

// Array.isArray(obj) definition...
if (typeof Array.isArray == 'undefined') {
	Array.isArray = function (obj) {
		return Object.prototype.toString.call(obj) == '[object Array]';
	};
}

// indexOf() definition...
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function (element, startPoint) {
		var k;

		if (this == null) {
			throw new TypeError('"this" é nulo (null) ou não foi definido (undefined)');
		}
		var O = Object(this);
		var aSize = O.length >>> 0;

		if (aSize == 0) {
			return -1;
		}
		var n = +startPoint || 0;

		if (Math.abs(n) == Infinity) {
			n = 0;
		}
		if (n >= aSize) {
			return -1;
		}
		k = Math.max(n >= 0 ? n : aSize - Math.abs(n), 0);

		while (k < aSize) {
			if (k in O && O[k] == element) {
				return k;
			}
			k++;
		}
		return -1;
	};
}

if (!Array.prototype.pop) {
	Array.prototype.pop = function () {
		if (this.length == 0) {
			return undefined;
		}
		var lastElement = this[this.length - 1];
		this.length--; // Reduz o tamanho do array
		return lastElement;
	};
}

// Polyfill para Array.prototype.filter (compatível com ExtendScript)
if (!Array.prototype.filter) {
    Array.prototype.filter = function(callback, thisArg) {
        if (this == null) {
            throw new TypeError('Array.prototype.filter called on null or undefined');
        }
        if (typeof callback !== 'function') {
            throw new TypeError(callback + ' is not a function');
        }
        
        var result = [];
        var obj = Object(this);
        var len = obj.length >>> 0;
        
        for (var i = 0; i < len; i++) {
            if (i in obj) {
                var val = obj[i];
                if (callback.call(thisArg, val, i, obj)) {
                    result.push(val);
                }
            }
        }
        
        return result;
    };
}