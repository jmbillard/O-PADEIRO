/*

---------------------------------------------------------------
> REGRA — a tabela de seções da configuração
---------------------------------------------------------------

Cada seção da configuração é uma linha da tabela (TABELA, abaixo), que diz:
  - onde ela mora: 'equipe' (a configuração da equipe, na rede) ou 'computador' (a deste computador), o arquivo e a
    chave dentro dele;
  - o padrão (padrao): o valor quando não há nada guardado, ou quando o guardado não se aproveita;
  - a limpeza (limpar): valida e normaliza o valor vindo do painel; lança Error com a mensagem (#PAD_…) quando ele não
    serve. Na leitura, um valor que não passa na limpeza vira o padrão (lerLimpo, quando existe, é a limpeza mais
    tolerante usada só na leitura);
  - os nomes antigos: as chaves antigas da seção (antigos) e os campos antigos de dentro dela (camposAntigos:
    { novo: [antigos] }), lidos quando o nome novo não existe. A gravação seguinte grava só o nome novo.

Ler uma seção devolve sempre o valor limpo e completo; gravar grava só o nome novo e não mexe nas outras seções.

O módulo não acessa disco: recebe um adaptador que lê e grava um documento (um objeto) pelo nome do arquivo:
  { ler: function (arquivo) → objeto ou null (pode lançar), gravar: function (arquivo, objeto) }
O host tem o adaptador com os arquivos (host/productions.jsx), o host de teste o do localStorage (client/js/mock-host.js)
e o teste em Node um em memória. O JSON fica com o adaptador.

Regra compartilhada (ADR 0005): ES3, sem After e sem DOM. O host carrega por #include (o global PAD_CONFIGURACAO), o
painel por <script> (window.PAD_CONFIGURACAO) e o teste em Node por require: node extension/scripts/test-regras.js.

Para trocar o nome de uma chave guardada (ou de um campo dela): o nome novo na linha da seção e o antigo em antigos
(ou em camposAntigos).

*/

(function (root) {
	var EQUIPE = 'O_PADEIRO_GLOBAL_config.json';

	// ---------------------------------------------------------------------------------------------------------
	// ajudantes (ES3: sem trim, indexOf de array, Object.keys, Array.isArray…)
	// ---------------------------------------------------------------------------------------------------------

	function trim(value) {
		return String(value == null ? '' : value).replace(/^\s+|\s+$/g, '');
	}

	function isArray(value) {
		return Object.prototype.toString.call(value) === '[object Array]';
	}

	function indexOf(list, value) {
		for (var i = 0; i < list.length; i++) {
			if (list[i] == value) return i;
		}

		return -1;
	}

	// cópia funda de dados (objetos, listas e valores simples), sem JSON
	function copiar(value) {
		var out, k, i;

		if (value == null || typeof value != 'object') return value;

		if (isArray(value)) {
			out = [];

			for (i = 0; i < value.length; i++) out.push(copiar(value[i]));

			return out;
		}

		out = {};

		for (k in value) {
			if (value.hasOwnProperty(k)) out[k] = copiar(value[k]);
		}

		return out;
	}

	// lista ou texto separado por vírgulas → os itens, sem espaços nas pontas e sem os vazios
	function listaDeVirgulas(value) {
		var list = isArray(value) ? value : String(value == null ? '' : value).split(',');
		var out = [];

		for (var i = 0; i < list.length; i++) {
			var item = trim(list[i]);

			if (item != '') out.push(item);
		}

		return out;
	}

	// tira os acentos e os símbolos (o mesmo resultado de String.prototype.replaceSpecialCharacters, lib/PROT lib.js)
	function semEspeciais(value) {
		return String(value)
			.replace(/[\u00C0-\u00C4]/g, 'A')
			.replace(/[\u00E0-\u00E4]/g, 'a')
			.replace(/[\u00C8-\u00CB]/g, 'E')
			.replace(/[\u00E8-\u00EB]/g, 'e')
			.replace(/[\u00CC-\u00CF\u00EE\u00EF]/g, 'I')
			.replace(/[\u00EC-\u00EF]/g, 'i')
			.replace(/[\u00D2-\u00D6]/g, 'O')
			.replace(/[\u00F2-\u00F6]/g, 'o')
			.replace(/[\u00D9-\u00DC]/g, 'U')
			.replace(/[\u00F9-\u00FC]/g, 'u')
			.replace(/\u00C7/g, 'C')
			.replace(/\u00E7/g, 'c')
			.replace(/[^\w\s-]/g, ' ')
			.replace(/[\s_]+/g, ' ')
			.replace(/^\W+|\W+$/, '')
			.replace(/^\s+|\s+$/g, '');
	}

	// um termo em maiúsculas, sem acentos e com espaços simples
	function termo(value) {
		return trim(semEspeciais(trim(value).toUpperCase()).replace(/\s+/g, ' '));
	}

	// ---------------------------------------------------------------------------------------------------------
	// produções ('PRODUCTIONS'): [{ name, icon, templatesPath }], na ordem do editor
	// ---------------------------------------------------------------------------------------------------------

	function limparProducoes(list) {
		if (!isArray(list) || list.length == 0) throw new Error('#PAD_051 - a lista de produções não pode ficar vazia.');

		var seen = {};
		var clean = [];

		for (var i = 0; i < list.length; i++) {
			var row = list[i] || {};
			var name = trim(row.name);
			var path = trim(row.templatesPath);

			if (name == '') throw new Error('#PAD_052 - produção ' + (i + 1) + ': preencha o nome.');
			if (path == '') throw new Error('#PAD_053 - "' + name + '": preencha a pasta de templates.');
			if (seen[name.toUpperCase()]) throw new Error('#PAD_054 - "' + name + '": já existe uma produção com esse nome.');

			seen[name.toUpperCase()] = true;
			clean.push({ name: name, icon: row.icon ? String(row.icon) : '', templatesPath: path });
		}

		return clean;
	}

	// na leitura, uma produção quebrada não derruba a lista: fica de fora (sem nome, sem pasta ou com o nome repetido)
	function lerProducoes(list) {
		var seen = {};
		var clean = [];

		if (!isArray(list)) return [];

		for (var i = 0; i < list.length; i++) {
			var row = list[i] || {};
			var name = trim(row.name);
			var path = trim(row.templatesPath);

			if (name == '' || path == '' || seen[name.toUpperCase()]) continue;

			seen[name.toUpperCase()] = true;
			clean.push({ name: name, icon: row.icon ? String(row.icon) : '', templatesPath: path });
		}

		return clean;
	}

	// ---------------------------------------------------------------------------------------------------------
	// mapa de drives ('DRIVES'): { drives: [{ letter, path }], shares: [{ share, server }], defaultServer }
	//   drives        → letra do Windows ↔ caminho de rede (//servidor/share/...)
	//   shares        → volumes sem letra (share → servidor), para converter /Volumes/SHARE em //servidor/SHARE
	//   defaultServer → o servidor usado quando o share não está em nenhum dos dois
	// ---------------------------------------------------------------------------------------------------------

	var PADRAO_DRIVES = {
		drives: [
			{ letter: 'L', path: '//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_l' },
			{ letter: 'K', path: '//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_k' },
			{ letter: 'T', path: '//egcdesign01.servicos.corp.tvglobo.com.br/cdesign' },
			{ letter: 'V', path: '//vfx-ml-sp.servicos.corp.tvglobo.com.br/EDIT_IN_PLACE' },
			{ letter: 'Y', path: '//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX' },
			{ letter: 'P', path: '//vfx-ml-sp.servicos.corp.tvglobo.com.br/VFX/imagem/drive_p' }
		],
		shares: [
			{ share: 'VFX', server: 'vfx-ml-sp.servicos.corp.tvglobo.com.br' },
			{ share: 'cdesign', server: 'egcdesign01.servicos.corp.tvglobo.com.br' },
			{ share: 'EDIT_IN_PLACE', server: 'vfx-ml-hp.servicos.corp.tvglobo.com.br' },
			{ share: 'promo_ber', server: '10.193.48.13' }
		],
		defaultServer: 'vfx-ml-sp.servicos.corp.tvglobo.com.br'
	};

	function limparDrives(d) {
		d = d || {};

		var clean = { drives: [], shares: [], defaultServer: trim(d.defaultServer).replace(/^[\\\/]+|[\\\/]+$/g, '') };
		var drives = isArray(d.drives) ? d.drives : [];
		var shares = isArray(d.shares) ? d.shares : [];
		var seen = {};
		var i;

		for (i = 0; i < drives.length; i++) {
			var letter = trim((drives[i] || {}).letter).replace(/:$/, '').toUpperCase();
			var path = trim((drives[i] || {}).path).replace(/\\/g, '/').replace(/\/+$/, '');

			if (!/^[A-Z]$/.test(letter)) throw new Error('#PAD_079 - drives: a letra do drive ' + (i + 1) + ' precisa ser uma letra de A a Z.');
			if (seen[letter]) throw new Error('#PAD_079 - drives: a letra ' + letter + ': aparece mais de uma vez.');
			if (!/^\/\/[^\/\s]+\/[^\/]+/.test(path)) throw new Error('#PAD_080 - drives: o caminho de ' + letter + ': precisa ser de rede (//servidor/share/...).');

			seen[letter] = true;
			clean.drives.push({ letter: letter, path: path });
		}

		seen = {};

		for (i = 0; i < shares.length; i++) {
			var share = trim((shares[i] || {}).share).replace(/^[\\\/]+|[\\\/]+$/g, '');
			var server = trim((shares[i] || {}).server).replace(/^[\\\/]+|[\\\/]+$/g, '');

			if (share == '' || /[\\\/]/.test(share)) throw new Error('#PAD_081 - drives: o volume ' + (i + 1) + ' precisa de um nome, sem barras.');
			if (server == '' || /[\\\/\s]/.test(server)) throw new Error('#PAD_081 - drives: "' + share + '" precisa do servidor (só o nome, sem barras).');
			if (seen[share.toLowerCase()]) throw new Error('#PAD_081 - drives: o volume "' + share + '" aparece mais de uma vez.');

			seen[share.toLowerCase()] = true;
			clean.shares.push({ share: share, server: server });
		}

		if (/[\\\/\s]/.test(clean.defaultServer)) throw new Error('#PAD_081 - drives: o servidor padrão é só o nome, sem barras.');

		return clean;
	}

	// ---------------------------------------------------------------------------------------------------------
	// regra do renomear ('RENAME'): { types: [{ prefix, comment, terms }], fixed: [{ match, name }], removeSpecial,
	// textCase, separator }
	//   types → os formatos, na ordem em que são procurados (vale o primeiro encontrado): o prefixo do formato, o
	//           comentário da comp e os termos que reconhecem o formato no nome
	//   fixed → os nomes fixos: a comp que contém 'match' (no nome ou no comentário) passa a se chamar 'name'
	//   removeSpecial tira acentos e símbolos; textCase: upperCase, lowerCase, titleCase ou keep; separator: ' - '
	// ---------------------------------------------------------------------------------------------------------

	var PADRAO_RENOMEAR = {
		types: [
			{ prefix: 'RDP', comment: 'RODAPE', terms: ['RODAPE', 'RDP'] },
			{ prefix: 'CRT', comment: 'CARTAO', terms: ['CARTAO', 'CARTOES', 'CRT'] },
			{ prefix: 'LETT', comment: 'LETTERING', terms: ['LETTERING', 'LETT', 'LET'] },
			{ prefix: 'CONFRONTO', comment: 'CONFRONTO', terms: ['CONFRONTO'] },
			{ prefix: 'TARJA', comment: 'TARJA', terms: ['TARJA', 'TRJ', 'TAR'] },
			{ prefix: 'PASSAGEM', comment: 'PASSAGEM', terms: ['PASSAGEM', 'TRANSICAO', 'TRANSICOES', 'LAPADA'] },
			{ prefix: 'ASSINA', comment: 'ASSINATURA', terms: ['ASSINATURA', 'ASSINA', 'ASS'] },
			{ prefix: 'FOTO', comment: 'FOTO', terms: ['FOTO', 'IMG', 'IMAGEM', 'IMAGENS'] },
			{ prefix: 'REF', comment: 'REFERENCIA', terms: ['REFERENCIA', 'PREVIEW', 'REF', 'PREV'] }
		],
		fixed: [{ match: 'LOGO GLOBO', name: 'LOGO GLOBO' }],
		removeSpecial: true,
		textCase: 'upperCase',
		separator: ' - '
	};

	function limparRenomear(r) {
		r = r || {};

		var clean = {
			types: [],
			fixed: [],
			removeSpecial: r.removeSpecial !== false,
			textCase: /^(upperCase|lowerCase|titleCase|keep)$/.test(r.textCase) ? r.textCase : 'upperCase',
			separator: r.separator == null ? ' - ' : String(r.separator)
		};
		var types = isArray(r.types) ? r.types : [];
		var fixed = isArray(r.fixed) ? r.fixed : [];
		var seen = {};
		var i;

		// os espaços contam (' - '); vai para nomes de comp e de arquivo
		if (clean.separator == '' || clean.separator.length > 5 || /[\\\/:*?"<>|]/.test(clean.separator)) {
			throw new Error('#PAD_082 - renomear: o separador precisa ter de 1 a 5 caracteres, sem \\ / : * ? " < > |.');
		}

		for (i = 0; i < types.length; i++) {
			var t = types[i] || {};
			var prefix = termo(t.prefix);
			var comment = termo(t.comment);
			var list = isArray(t.terms) ? t.terms : String(t.terms == null ? '' : t.terms).split(',');
			var terms = [];

			for (var j = 0; j < list.length; j++) {
				var term = termo(list[j]);

				if (term != '') terms.push(term);
			}

			if (prefix == '') throw new Error('#PAD_082 - renomear: o formato ' + (i + 1) + ' precisa de um prefixo.');
			if (comment == '') throw new Error('#PAD_082 - renomear: "' + prefix + '" precisa de um comentário.');
			if (!terms.length) throw new Error('#PAD_082 - renomear: "' + prefix + '" precisa de ao menos um termo.');
			if (seen[prefix]) throw new Error('#PAD_082 - renomear: o prefixo "' + prefix + '" aparece mais de uma vez.');

			seen[prefix] = true;
			clean.types.push({ prefix: prefix, comment: comment, terms: terms });
		}

		for (i = 0; i < fixed.length; i++) {
			var match = termo((fixed[i] || {}).match);
			var name = termo((fixed[i] || {}).name);

			if (match == '' || name == '') throw new Error('#PAD_083 - renomear: o nome fixo ' + (i + 1) + ' precisa do termo e do nome.');

			clean.fixed.push({ match: match, name: name });
		}

		return clean;
	}

	// ---------------------------------------------------------------------------------------------------------
	// organizar ('ORGANIZE'): { folders: [{ name, parent, contents }], renderComments, editComments, autoComment,
	// dataExtensions, commentSubfolders, fileTags, version } (a forma de PAD_ORGANIZE, lib/functions/project lib.js)
	// ---------------------------------------------------------------------------------------------------------

	var ORGANIZAR_CONTEUDOS = ['render', 'editaveis', 'precomps', 'videos', 'imagens', 'sequencias', 'audio', 'solidos', 'dados', 'missing'];

	var PADRAO_ORGANIZAR = {
		folders: [
			{ name: '01 COMPS', parent: '', contents: ['render'] },
			{ name: '02 PRECOMPS', parent: '', contents: ['precomps'] },
			{ name: '03 ARQUIVOS', parent: '', contents: [] },
			{ name: 'VIDEOS', parent: '03 ARQUIVOS', contents: ['videos'] },
			{ name: 'IMAGENS', parent: '03 ARQUIVOS', contents: ['imagens', 'sequencias'] },
			{ name: 'AUDIO', parent: '03 ARQUIVOS', contents: ['audio'] },
			{ name: 'SOLIDOS', parent: '03 ARQUIVOS', contents: ['solidos'] },
			{ name: 'DADOS', parent: '03 ARQUIVOS', contents: ['dados'] },
			{ name: 'MISSING', parent: '', contents: ['missing'] }
		],
		renderComments: ['EXPORT', 'LOGO GLOBO', 'TEMPLATE'],
		editComments: ['EDIT'],
		autoComment: 'EXPORTAR',
		dataExtensions: ['.csv', '.json', '.jsx', '.mgjson', '.tsv', '.txt'],
		commentSubfolders: true,
		fileTags: ['FUNDO', 'LOGO', 'FOTO', 'TRILHA', 'LOC']
	};

	function comentario(value) {
		return semEspeciais(trim(value).toUpperCase()).replace(/\s+/g, ' ');
	}

	function limparOrganizar(o) {
		o = o || {};

		var clean = { folders: [], renderComments: [], editComments: [], autoComment: '', dataExtensions: [], commentSubfolders: o.commentSubfolders !== false, fileTags: [], version: 2 };
		var folders = isArray(o.folders) ? o.folders : [];
		var names = {};
		var contents = {};
		var i;

		for (i = 0; i < folders.length; i++) {
			var row = folders[i] || {};
			var name = trim(row.name).replace(/\s+/g, ' ');
			// 'contents' (lista) ou 'content' (um conteúdo só, como nas primeiras versões)
			var list = isArray(row.contents) ? row.contents : (trim(row.content) ? [trim(row.content)] : []);
			var kept = [];

			if (name == '') throw new Error('#PAD_084 - organizar: a pasta ' + (i + 1) + ' precisa de um nome.');
			if (names[name.toUpperCase()]) throw new Error('#PAD_084 - organizar: a pasta "' + name + '" aparece mais de uma vez.');

			for (var t = 0; t < list.length; t++) {
				var content = trim(list[t]);

				if (content == '') continue;
				if (indexOf(ORGANIZAR_CONTEUDOS, content) < 0) throw new Error('#PAD_084 - organizar: tipo desconhecido em "' + name + '".');
				if (contents[content]) throw new Error('#PAD_084 - organizar: "' + name + '" e "' + contents[content] + '" recebem o mesmo tipo.');

				contents[content] = name;
				kept.push(content);
			}

			names[name.toUpperCase()] = true;
			clean.folders.push({ name: name, parent: trim(row.parent), contents: kept });
		}

		// pasta pai: precisa existir e não pode formar ciclo
		for (i = 0; i < clean.folders.length; i++) {
			var f = clean.folders[i];
			var seen = {};
			var cur = f;

			if (f.parent != '' && !names[f.parent.toUpperCase()]) throw new Error('#PAD_084 - organizar: a pasta pai de "' + f.name + '" não existe.');

			for (var c = 0; c < clean.folders.length; c++) {
				if (clean.folders[c].name.toUpperCase() == f.parent.toUpperCase()) f.parent = clean.folders[c].name; // grafia da pasta
			}

			while (cur && cur.parent != '') {
				if (seen[cur.name.toUpperCase()]) throw new Error('#PAD_084 - organizar: "' + f.name + '" está dentro dela mesma.');

				seen[cur.name.toUpperCase()] = true;

				var next = null;

				for (var k = 0; k < clean.folders.length; k++) {
					if (clean.folders[k].name.toUpperCase() == cur.parent.toUpperCase()) next = clean.folders[k];
				}

				cur = next;
			}
		}

		var comments = listaDeVirgulas(o.renderComments);

		for (i = 0; i < comments.length; i++) clean.renderComments.push(comentario(comments[i]));

		if (!clean.renderComments.length) throw new Error('#PAD_085 - organizar: informe ao menos um comentário de render.');

		var edits = o.editComments == null ? ['EDIT'] : listaDeVirgulas(o.editComments); // configurações antigas: o padrão

		for (i = 0; i < edits.length; i++) clean.editComments.push(comentario(edits[i]));

		clean.autoComment = comentario(o.autoComment);

		var matches = false;

		for (i = 0; i < clean.renderComments.length; i++) {
			if (clean.autoComment.indexOf(clean.renderComments[i]) >= 0) matches = true;
		}

		if (clean.autoComment == '' || !matches) throw new Error('#PAD_085 - organizar: o comentário automático precisa conter um dos comentários de render.');

		var exts = listaDeVirgulas(o.dataExtensions);

		for (i = 0; i < exts.length; i++) clean.dataExtensions.push('.' + exts[i].replace(/^\*?\.+/, '').toLowerCase());

		// as etiquetas dos arquivos (janela de etiquetas); configurações antigas: as do padrão
		var tags = o.fileTags == null ? PADRAO_ORGANIZAR.fileTags : listaDeVirgulas(o.fileTags);

		for (i = 0; i < tags.length; i++) {
			var tag = comentario(tags[i]);

			if (indexOf(clean.fileTags, tag) < 0) clean.fileTags.push(tag);
		}

		return clean;
	}

	// configurações de antes do conteúdo 'sequencias' (sem 'version'): as sequências de imagens iam com os vídeos;
	// agora vão para a pasta das imagens (como no padrão). depois de salva pela configuração, vale o que estiver lá
	function organizarDepoisDeLer(clean, raw) {
		if (raw.version >= 2) return clean;

		for (var i = 0; i < clean.folders.length; i++) {
			if (indexOf(clean.folders[i].contents, 'sequencias') >= 0) return clean;
		}

		for (i = 0; i < clean.folders.length; i++) {
			if (indexOf(clean.folders[i].contents, 'imagens') >= 0) {
				clean.folders[i].contents.push('sequencias');
				break;
			}
		}

		return clean;
	}

	// ---------------------------------------------------------------------------------------------------------
	// busca de caminhos ('SEARCH'): { url, caminhosFixos: [{ name, path }] }
	//   url           → o webhook da busca (workflow PROMO - BUSCAR): devolve o índice da busca pronto
	//   caminhosFixos → os caminhos fixos, que aparecem sempre na busca (Mac /Volumes/... ou rede //servidor/share/...)
	// sem 'url' nem os caminhos fixos (o formato de antes do índice da equipe): o padrão
	// ---------------------------------------------------------------------------------------------------------

	var PADRAO_BUSCA = {
		url: 'https://workflows.jmbillard.com/webhook/buscar',
		caminhosFixos: [
			{ name: '#INGEST', path: '//cpp-ml-sp.servicos.corp.tvglobo.com.br/PROMO_REDE/CPP_JB_PROMO/#INGEST' },
			{ name: 'BASES VALENDO', path: '//cpp-ml-sp.servicos.corp.tvglobo.com.br/PROMO_REDE/CPP_JB_PROMO/HOME OFFICE - NAO APAGAR/BASES E VALENDO' }
		]
	};

	function limparBusca(o) {
		o = o || {};

		var list = o.caminhosFixos;

		if (o.url == null && list == null) return copiar(PADRAO_BUSCA);

		var clean = { url: trim(o.url) || PADRAO_BUSCA.url, caminhosFixos: [] };
		var seen = {};

		list = isArray(list) ? list : [];

		// o endereço também vai para a linha de comando do curl (plano B): sem espaços, aspas nem símbolos do terminal
		if (!/^https?:\/\/[^\s"'`$\\;&|<>]+$/i.test(clean.url)) {
			throw new Error('#PAD_086 - busca: endereço do webhook inválido (comece com http:// ou https://, sem espaços nem aspas).');
		}

		for (var i = 0; i < list.length; i++) {
			var name = trim((list[i] || {}).name).replace(/\s+/g, ' ');
			var path = trim((list[i] || {}).path).replace(/\\/g, '/').replace(/\/+$/, '');

			if (name == '' && path == '') continue;
			if (name == '' || path == '') throw new Error('#PAD_086 - busca: o caminho fixo ' + (i + 1) + ' precisa de um nome e de um caminho.');
			if (seen[name.toUpperCase()]) throw new Error('#PAD_086 - busca: o caminho fixo "' + name + '" aparece mais de uma vez.');

			seen[name.toUpperCase()] = true;
			clean.caminhosFixos.push({ name: name, path: path });
		}

		return clean;
	}

	// ---------------------------------------------------------------------------------------------------------
	// links da barra ('LINKS'): [{ name, url, icon }], na ordem da barra. 'icon' é um PNG 24 x 24 (literal de string
	// binária, como o das produções); vazio = o favicon do site. A mesma forma dos links pessoais.
	// ---------------------------------------------------------------------------------------------------------

	var PADRAO_LINKS = [
		{ name: 'apontamento de projetos', url: 'https://tvglobocorp.sharepoint.com/:x:/s/Planejamento-DTEN/Planejamento/EbkuFueT_DlFlUyRqlMSnJIBRpRsPPY72NSDqgKq0DvOKg?e=T7sn7i', icon: '' }
	];

	function limparLinks(list) {
		var clean = [];

		list = isArray(list) ? list : [];

		for (var i = 0; i < list.length; i++) {
			var row = list[i] || {};
			var name = trim(row.name).replace(/\s+/g, ' ');
			var url = trim(row.url);

			if (name == '') throw new Error('#PAD_087 - links: o link ' + (i + 1) + ' precisa de um nome.');
			if (!/^https?:\/\/\S+$/i.test(url)) throw new Error('#PAD_087 - links: "' + name + '" precisa de um endereço (http:// ou https://, sem espaços).');

			clean.push({ name: name, url: url, icon: row.icon ? String(row.icon) : '' });
		}

		return clean;
	}

	// ---------------------------------------------------------------------------------------------------------
	// a barra ('BAR'): { items: [...], hidden: [...] } (aba LAYOUT)
	//   items  → a ordem da barra, plana; 'divider' separa os grupos. as gavetas (templates, projeto e organizar),
	//            cada uma com as de dentro juntas, na ordem de dentro; as soltas (as que faltarem entram no fim)
	//   hidden → as escondidas: as ferramentas, 'gaveta:<chave>' (a gaveta inteira) e 'links' (o bloco de links)
	// a mesma regra do painel (client/js/util.js: barLayout)
	// ---------------------------------------------------------------------------------------------------------

	var BARRA_GAVETAS = { templates: ['preencher', 'duplicar', 'criar-template'], projeto: ['projeto', 'fontes', 'coletar', 'render'], organizar: ['renomear', 'organizar', 'arquivos'] };
	var BARRA_SOLTAS = ['importar', 'pastas', 'buscar', 'logo-globo'];
	var BARRA_PADRAO = ['preencher', 'duplicar', 'criar-template', 'divider', 'projeto', 'fontes', 'coletar', 'render', 'divider', 'renomear', 'organizar', 'arquivos', 'divider', 'pastas', 'buscar', 'importar', 'logo-globo'];

	function gavetaDe(key) {
		for (var g in BARRA_GAVETAS) {
			if (BARRA_GAVETAS.hasOwnProperty(g) && indexOf(BARRA_GAVETAS[g], key) >= 0) return g;
		}

		return '';
	}

	// o formato de antes (com 'templates' e as gavetas montadas pela primeira ferramenta) vira o de agora: cada gaveta
	// no lugar da primeira ferramenta dela, com a ordem de dentro padrão
	function limparBarra(o) {
		var list = o && isArray(o.items) && o.items.length ? o.items : BARRA_PADRAO;
		var old = false;
		var items = [];
		var hidden = [];
		var seen = {};
		var i, g, m;

		for (i = 0; i < list.length; i++) {
			if (trim(list[i]).toLowerCase() == 'templates') old = true;
		}

		for (i = 0; i < list.length; i++) {
			var key = trim(list[i]).toLowerCase();

			if (key == 'divider') {
				if (items.length && items[items.length - 1] != 'divider') items.push(key); // sem separador no começo nem dois seguidos
				continue;
			}

			var group = key == 'templates' ? 'templates' : gavetaDe(key);

			if (group) {
				if (seen['gaveta:' + group]) continue;
				seen['gaveta:' + group] = true;

				// as de dentro: na ordem da lista (as que faltam, no fim da gaveta); no formato de antes, a padrão
				var mine = [];

				for (m = 0; !old && m < list.length; m++) {
					var k2 = trim(list[m]).toLowerCase();

					if (indexOf(BARRA_GAVETAS[group], k2) >= 0 && indexOf(mine, k2) < 0) mine.push(k2);
				}
				for (m = 0; m < BARRA_GAVETAS[group].length; m++) {
					if (indexOf(mine, BARRA_GAVETAS[group][m]) < 0) mine.push(BARRA_GAVETAS[group][m]);
				}
				for (m = 0; m < mine.length; m++) {
					if (!seen[mine[m]]) {
						seen[mine[m]] = true;
						items.push(mine[m]);
					}
				}
				continue;
			}

			if (indexOf(BARRA_SOLTAS, key) >= 0 && !seen[key]) {
				seen[key] = true;
				items.push(key);
			}
		}

		// gaveta ou ferramenta nova (ou esquecida): no fim
		for (g in BARRA_GAVETAS) {
			if (BARRA_GAVETAS.hasOwnProperty(g) && !seen['gaveta:' + g]) {
				for (m = 0; m < BARRA_GAVETAS[g].length; m++) items.push(BARRA_GAVETAS[g][m]);
			}
		}
		for (i = 0; i < BARRA_SOLTAS.length; i++) {
			if (!seen[BARRA_SOLTAS[i]]) items.push(BARRA_SOLTAS[i]);
		}

		while (items.length && items[items.length - 1] == 'divider') items.pop();

		var h = o && isArray(o.hidden) ? o.hidden : [];

		for (i = 0; i < h.length; i++) {
			var hk = trim(h[i]).toLowerCase();

			if (hk == 'templates') hk = 'gaveta:templates';

			var ok = hk == 'links' || indexOf(items, hk) >= 0 || (hk.indexOf('gaveta:') == 0 && BARRA_GAVETAS.hasOwnProperty(hk.substring(7)));

			if (ok && indexOf(hidden, hk) < 0) hidden.push(hk);
		}

		return { items: items, hidden: hidden };
	}

	// ---------------------------------------------------------------------------------------------------------
	// a tabela
	// ---------------------------------------------------------------------------------------------------------

	var TABELA = [
		{ nome: 'producoes', onde: 'equipe', arquivo: EQUIPE, chave: 'PRODUCTIONS', padrao: function () { return []; }, limpar: limparProducoes, lerLimpo: lerProducoes },
		{ nome: 'mapaDeDrives', onde: 'equipe', arquivo: EQUIPE, chave: 'DRIVES', padrao: function () { return PADRAO_DRIVES; }, limpar: limparDrives },
		{ nome: 'regraDoRenomear', onde: 'equipe', arquivo: EQUIPE, chave: 'RENAME', padrao: function () { return PADRAO_RENOMEAR; }, limpar: limparRenomear },
		{ nome: 'organizar', onde: 'equipe', arquivo: EQUIPE, chave: 'ORGANIZE', padrao: function () { return PADRAO_ORGANIZAR; }, limpar: limparOrganizar, depoisDeLer: organizarDepoisDeLer },
		{ nome: 'buscaDeCaminhos', onde: 'equipe', arquivo: EQUIPE, chave: 'SEARCH', camposAntigos: { caminhosFixos: ['servidor'] }, padrao: function () { return PADRAO_BUSCA; }, limpar: limparBusca },
		{ nome: 'links', onde: 'equipe', arquivo: EQUIPE, chave: 'LINKS', padrao: function () { return PADRAO_LINKS; }, limpar: limparLinks },
		{ nome: 'barra', onde: 'equipe', arquivo: EQUIPE, chave: 'BAR', padrao: function () { return limparBarra({}); }, limpar: limparBarra }
	];

	// ---------------------------------------------------------------------------------------------------------
	// ler e gravar pela tabela
	// ---------------------------------------------------------------------------------------------------------

	function criar(tabela) {
		function secao(nome) {
			for (var i = 0; i < tabela.length; i++) {
				if (tabela[i].nome == nome) return tabela[i];
			}

			throw new Error('#PAD_099 - configuração: seção desconhecida: ' + nome);
		}

		function padrao(nome) {
			return copiar(secao(nome).padrao());
		}

		function limpar(nome, valor) {
			return secao(nome).limpar(copiar(valor));
		}

		// o valor guardado da seção num documento: a chave nova ou, sem ela, a primeira antiga que existir; os campos
		// antigos de dentro viram os novos (só quando o novo não existe)
		function bruto(s, doc) {
			var valor = null;
			var i, novo, k;

			if (!doc || typeof doc != 'object') return null;

			if (doc[s.chave] != null) valor = doc[s.chave];

			for (i = 0; valor == null && s.antigos && i < s.antigos.length; i++) {
				if (doc[s.antigos[i]] != null) valor = doc[s.antigos[i]];
			}

			if (valor == null || !s.camposAntigos || typeof valor != 'object' || isArray(valor)) return valor;

			valor = copiar(valor);

			for (novo in s.camposAntigos) {
				if (!s.camposAntigos.hasOwnProperty(novo)) continue;

				for (i = 0; i < s.camposAntigos[novo].length; i++) {
					k = s.camposAntigos[novo][i];

					if (valor[novo] == null && valor[k] != null) valor[novo] = valor[k];

					delete valor[k];
				}
			}

			return valor;
		}

		// lê uma seção: sempre o valor limpo e completo (sem nada, ou com um valor que não se aproveita: o padrão)
		function ler(adaptador, nome) {
			var s = secao(nome);
			var doc = null;

			try {
				doc = adaptador.ler(s.arquivo);
			} catch (err) {
				return padrao(nome);
			}

			return lerDe(doc, nome);
		}

		// a mesma leitura, de um documento já lido
		function lerDe(doc, nome) {
			var s = secao(nome);
			var valor = bruto(s, doc);

			if (valor == null) return padrao(nome);

			try {
				var limpo = (s.lerLimpo || s.limpar)(copiar(valor));

				return s.depoisDeLer ? s.depoisDeLer(limpo, valor) : limpo;
			} catch (err) {
				return padrao(nome);
			}
		}

		// um documento novo com as seções de 'valores' ({ nome: valor }) limpas, cada uma só com o nome novo; as
		// outras chaves ficam como estão. Lança Error (a mensagem da limpeza) sem mudar nada.
		function aplicar(doc, valores) {
			var out = {};
			var limpos = {};
			var nome, k, i, s;

			for (nome in valores) {
				if (valores.hasOwnProperty(nome) && valores[nome] != null) limpos[nome] = limpar(nome, valores[nome]);
			}

			if (doc && typeof doc == 'object') {
				for (k in doc) {
					if (doc.hasOwnProperty(k)) out[k] = doc[k];
				}
			}

			for (nome in limpos) {
				if (!limpos.hasOwnProperty(nome)) continue;

				s = secao(nome);
				out[s.chave] = limpos[nome];

				for (i = 0; s.antigos && i < s.antigos.length; i++) delete out[s.antigos[i]];
			}

			return out;
		}

		// grava as seções de 'valores' ({ nome: valor }), um documento por arquivo; as outras seções ficam como estão.
		// Limpa todas antes de gravar a primeira: um valor que não serve lança Error e nada é gravado.
		// Devolve { nome: valor limpo }.
		function gravar(adaptador, valores) {
			var porArquivo = {};
			var limpos = {};
			var nome, arquivo, doc;

			for (nome in valores) {
				if (!valores.hasOwnProperty(nome) || valores[nome] == null) continue;

				limpos[nome] = limpar(nome, valores[nome]);
				arquivo = secao(nome).arquivo;

				if (!porArquivo[arquivo]) porArquivo[arquivo] = {};
				porArquivo[arquivo][nome] = limpos[nome];
			}

			for (arquivo in porArquivo) {
				if (!porArquivo.hasOwnProperty(arquivo)) continue;

				try {
					doc = adaptador.ler(arquivo);
				} catch (err) {
					doc = null; // ilegível: começa de novo (como antes)
				}

				adaptador.gravar(arquivo, aplicar(doc, porArquivo[arquivo]));
			}

			return limpos;
		}

		return { secao: secao, padrao: padrao, limpar: limpar, ler: ler, lerDe: lerDe, aplicar: aplicar, gravar: gravar, criar: criar, EQUIPE: EQUIPE };
	}

	var api = criar(TABELA);

	if (typeof module === 'object' && module && module.exports) module.exports = api;
	else root.PAD_CONFIGURACAO = api;
})(typeof window !== 'undefined' ? window : this);
