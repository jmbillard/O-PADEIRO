/*

---------------------------------------------------------------
> ícones das ferramentas da barra (barra e configuração)
---------------------------------------------------------------

Os desenhos ficam na biblioteca de ícones (pasta icons/, os arquivos barra-<nome>.svg), como os outros: dá para
editar cada um ou trocar por uma animação Lottie (barra-<nome>.json). Os svg da barra animam no hover pelo CSS
(css/icons.css, pelas classes de dentro do desenho); parados, como na biblioteca, mostram o primeiro quadro.
Ícones com máscara ou recorte (coletar) levam ids: no arquivo, '{u}' marca onde entra o sufixo de cada
cópia (uid).

  PAD_ICONS.markup(nome, uid) → o conteúdo do <svg viewBox="0 0 24 24"> ('' num Lottie)
  PAD_ICONS.svg(nome, uid)    → o <svg> pronto (num Lottie, o lugar da animação)
  PAD_ICONS.has(nome)

*/

(function () {
	'use strict';

	var count = 0;

	function entry(name) {
		return window.PAD_UTIL && PAD_UTIL.iconEntry ? PAD_UTIL.iconEntry('barra-' + name) : null;
	}

	function markup(name, uid) {
		var it = entry(name);

		if (!it || it.type !== 'svg') return '';

		var u = uid == null ? '-' + ++count : uid;

		return it.svg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\{u\}/g, u).trim();
	}

	function svg(name, uid) {
		var it = entry(name);

		if (it && it.type === 'lottie') {
			var holder = document.createElement('div');

			holder.innerHTML = PAD_UTIL.iconMarkup('barra-' + name);

			return holder.firstChild;
		}

		var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

		node.setAttribute('viewBox', '0 0 24 24');
		node.setAttribute('aria-hidden', 'true');
		node.innerHTML = markup(name, uid);

		return node;
	}

	window.PAD_ICONS = { markup: markup, svg: svg, has: function (name) { return !!entry(name); } };
})();
