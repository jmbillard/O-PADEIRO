/*

---------------------------------------------------------------
> ícones das ferramentas da barra (barra e configuração)
---------------------------------------------------------------

Os mesmos desenhos na barra, na aba LAYOUT (prévia da barra e blocos) e nas abas da configuração.
Ícones com máscara ou recorte (coletar, buscar) levam ids: cada cópia recebe um sufixo próprio (uid).

  PAD_ICONS.markup(nome, uid) → o conteúdo do <svg viewBox="0 0 24 24">
  PAD_ICONS.svg(nome, uid)    → o <svg> pronto

*/

(function () {
	'use strict';

	function icons(u) {
		u = u || '';

		return {
			templates: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M9 9.5v10" />',
			link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />',
			folders:
				'<g class="anim-folder"><path d="M3.5 18V7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h6.5A1.5 1.5 0 0 1 19 10v1.5" />' +
				'<path class="folder-front" d="M3.5 11.5h17V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></g>',
			organize:
				'<g class="anim-layers"><path class="layer-top" d="m12 3-8.5 4.25L12 11.5l8.5-4.25z" />' +
				'<path class="layer-mid" d="m3.5 12 8.5 4.25L20.5 12" />' +
				'<path class="layer-bottom" d="m3.5 16.5 8.5 4.25 8.5-4.25" /></g>',
			rename:
				'<g class="anim-type"><rect x="2.5" y="6.5" width="19" height="11" rx="3" />' +
				'<path class="type-char" d="M6 12h2.4" /><path class="type-char" d="M10.3 12h2.4" /><path class="type-char" d="M14.6 12h2.4" />' +
				'<path class="type-caret" d="M18.6 9.6v4.8" /></g>',
			search:
				// o vidro da lupa recorta as letras num círculo um pouco menor que o aro: sobra um contorno
				// redondo "negativo" mesmo quando a letra ocupa o espaço todo
				'<g class="anim-search"><defs><clipPath id="lens-clip' + u + '"><circle cx="10" cy="10" r="5.2" /></clipPath></defs>' +
				'<circle cx="10" cy="10" r="7.2" /><path d="m15.300 15.300 5.200 5.200" />' +
				'<g clip-path="url(#lens-clip' + u + ')"><text class="lens-letter" x="10" y="18.300" text-anchor="middle">A</text></g></g>',
			// projeto: a claquete bate
			project:
				'<g class="anim-clap"><rect x="3.5" y="10" width="17" height="9.5" rx="1.5" />' +
				'<g class="clap-top"><path d="M4.6 6h14.8a1.1 1.1 0 0 1 1.1 1.1V10h-17V7.1A1.1 1.1 0 0 1 4.6 6z" /><path d="m8.6 6-2 4M13.6 6l-2 4M18.6 6l-2 4" /></g></g>',
			// coletar: pasta cheia de arquivos; no hover os arquivos sobem
			collect:
				// duas folhas grandes, sobrepostas, que entram na pasta: a frente da pasta esconde a parte de baixo
				// delas e a folha da frente esconde a de trás (máscaras com a mesma animação). o fundo da pasta só
				// aparece fora das folhas (a aba, à esquerda)
				'<g class="anim-collect"><defs>' +
				'<mask id="collect-back' + u + '" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">' +
				'<rect x="-4" y="-4" width="32" height="32" fill="#fff" stroke="none" />' +
				'<path class="collect-file f2" d="M10 15V6.5a1 1 0 0 1 1-1h4.8l2.7 2.7V15z" fill="#000" stroke="#000" stroke-width="3.4" stroke-linejoin="round" />' +
				'<rect x="-4" y="10.7" width="32" height="17" fill="#000" stroke="none" /></mask>' +
				'<mask id="collect-front' + u + '" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">' +
				'<rect x="-4" y="-4" width="32" height="14.7" fill="#fff" stroke="none" /></mask></defs>' +
				'<path d="M3.5 18V7.6A1.5 1.5 0 0 1 5 6.1h.4" /><path d="M19.6 9.7a1.5 1.5 0 0 1 .9 1.4v.4" />' +
				'<g mask="url(#collect-back' + u + ')"><g class="collect-file f1"><path d="M6 15V4a1 1 0 0 1 1-1h4.6l2.7 2.7V15" /><path d="M11.6 3v2.7h2.7" /></g></g>' +
				'<g mask="url(#collect-front' + u + ')"><g class="collect-file f2"><path d="M10 15V6.5a1 1 0 0 1 1-1h4.8l2.7 2.7V15" /><path d="M15.8 5.5v2.7h2.7" /></g></g>' +
				'<path class="folder-front" d="M3.5 11.5h17V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /></g>',
			fonts: '<g class="anim-font"><path class="font-t" d="M5.5 7.5V5.5h13v2M12 5.5v13M9 18.5h6" /></g>'
	
		};
	}

	var count = 0;

	function markup(name, uid) {
		return icons(uid == null ? '-' + ++count : uid)[name] || '';
	}

	function svg(name, uid) {
		var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

		node.setAttribute('viewBox', '0 0 24 24');
		node.setAttribute('aria-hidden', 'true');
		node.innerHTML = markup(name, uid);

		return node;
	}

	window.PAD_ICONS = { markup: markup, svg: svg, has: function (name) { return !!icons('')[name]; } };
})();
