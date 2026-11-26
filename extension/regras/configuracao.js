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
    { novo: [antigos] }), lidos quando o nome novo não existe; e os arquivos antigos do arquivo da seção
    (ARQUIVOS_ANTIGOS, abaixo: os arquivos de antes de cada arquivo deste computador, com as mesmas chaves), lidos
    enquanto o arquivo novo não existe. A gravação seguinte grava só o nome novo; o arquivo antigo fica no lugar
    (apagá-lo fica para depois do beta).

Ler uma seção devolve sempre o valor limpo e completo; gravar grava só o nome novo e não mexe nas outras seções. O
formato guardado de cada arquivo não muda: o da equipe guarda também o que a tabela não conhece; um deste computador é
regravado inteiro a cada gravação, com todas as seções dele limpas e só elas (gravar, abaixo).

O módulo não acessa disco: recebe um adaptador que lê e grava um documento (um objeto) pelo nome do arquivo:
  { ler: function (arquivo) → objeto ou null (pode lançar), gravar: function (arquivo, objeto) }
A configuração da equipe fica num arquivo na rede (EQUIPE); a deste computador, em arquivos da pasta de dados do
usuário (COMPUTADOR, PERSONALIZADO e LINKS_DESTE_COMPUTADOR).
O host tem o adaptador com os arquivos (host/productions.jsx), o host de teste o do localStorage (client/js/mock-host.js)
e o teste em Node um em memória. O JSON fica com o adaptador.

Regra compartilhada (ADR 0005): ES3, sem After e sem DOM. O host carrega por #include (a variável global PAD_CONFIGURACAO), o
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

	// o endereço de um webhook (a busca, o registro de uso, o webhook do projeto): http(s), sem espaços, aspas nem os
	// símbolos do terminal (o endereço também vai para a linha de comando do curl, o plano B do host)
	var URL_DO_WEBHOOK = /^https?:\/\/[^\s"'`$\\;&|<>]+$/i;

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
	// regra do renomear ('RENAME'): { formatos: [{ prefix, etiqueta, terms }], fixed: [{ match, name }], removeSpecial,
	// textCase, separator }
	//   formatos → na ordem em que são procurados (vale o primeiro encontrado): o prefixo do formato, a etiqueta da
	//              comp e os termos que reconhecem o formato no nome
	//   fixed → os nomes fixos: a comp que contém 'match' (no nome ou na etiqueta) passa a se chamar 'name'
	// os nomes antigos (#46): 'types' (camposAntigos, na tabela) e o 'comment' de cada formato (CAMPOS_ANTIGOS_DO_FORMATO)
	//   removeSpecial tira acentos e símbolos; textCase: upperCase, lowerCase, titleCase ou keep; separator: ' - '
	// ---------------------------------------------------------------------------------------------------------

	var PADRAO_RENOMEAR = {
		formatos: [
			{ prefix: 'RDP', etiqueta: 'RODAPE', terms: ['RODAPE', 'RDP'] },
			{ prefix: 'CRT', etiqueta: 'CARTAO', terms: ['CARTAO', 'CARTOES', 'CRT'] },
			{ prefix: 'LETT', etiqueta: 'LETTERING', terms: ['LETTERING', 'LETT', 'LET'] },
			{ prefix: 'CONFRONTO', etiqueta: 'CONFRONTO', terms: ['CONFRONTO'] },
			{ prefix: 'TARJA', etiqueta: 'TARJA', terms: ['TARJA', 'TRJ', 'TAR'] },
			{ prefix: 'PASSAGEM', etiqueta: 'PASSAGEM', terms: ['PASSAGEM', 'TRANSICAO', 'TRANSICOES', 'LAPADA'] },
			{ prefix: 'ASSINA', etiqueta: 'ASSINATURA', terms: ['ASSINATURA', 'ASSINA', 'ASS'] },
			{ prefix: 'FOTO', etiqueta: 'FOTO', terms: ['FOTO', 'IMG', 'IMAGEM', 'IMAGENS'] },
			{ prefix: 'REF', etiqueta: 'REFERENCIA', terms: ['REFERENCIA', 'PREVIEW', 'REF', 'PREV'] }
		],
		fixed: [{ match: 'LOGO GLOBO', name: 'LOGO GLOBO' }],
		removeSpecial: true,
		textCase: 'upperCase',
		separator: ' - '
	};

	// o campo antigo de dentro de cada formato, lido quando o novo não existe (a gravação grava só o novo)
	var CAMPOS_ANTIGOS_DO_FORMATO = { etiqueta: 'comment' };

	function campoDoFormato(t, campo) {
		return t[campo] != null ? t[campo] : t[CAMPOS_ANTIGOS_DO_FORMATO[campo]];
	}

	function limparRenomear(r) {
		r = r || {};

		var clean = {
			formatos: [],
			fixed: [],
			removeSpecial: r.removeSpecial !== false,
			textCase: /^(upperCase|lowerCase|titleCase|keep)$/.test(r.textCase) ? r.textCase : 'upperCase',
			separator: r.separator == null ? ' - ' : String(r.separator)
		};
		var formatos = isArray(r.formatos) ? r.formatos : [];
		var fixed = isArray(r.fixed) ? r.fixed : [];
		var seen = {};
		var i;

		// os espaços contam (' - '); vai para nomes de comp e de arquivo
		if (clean.separator == '' || clean.separator.length > 5 || /[\\\/:*?"<>|]/.test(clean.separator)) {
			throw new Error('#PAD_082 - renomear: o separador precisa ter de 1 a 5 caracteres, sem \\ / : * ? " < > |.');
		}

		for (i = 0; i < formatos.length; i++) {
			var t = formatos[i] || {};
			var prefix = termo(t.prefix);
			var etiqueta = termo(campoDoFormato(t, 'etiqueta'));
			var list = isArray(t.terms) ? t.terms : String(t.terms == null ? '' : t.terms).split(',');
			var terms = [];

			for (var j = 0; j < list.length; j++) {
				var term = termo(list[j]);

				if (term != '') terms.push(term);
			}

			if (prefix == '') throw new Error('#PAD_082 - renomear: o formato ' + (i + 1) + ' precisa de um prefixo.');
			if (etiqueta == '') throw new Error('#PAD_082 - renomear: "' + prefix + '" precisa de uma etiqueta.');
			if (!terms.length) throw new Error('#PAD_082 - renomear: "' + prefix + '" precisa de ao menos um termo.');
			if (seen[prefix]) throw new Error('#PAD_082 - renomear: o prefixo "' + prefix + '" aparece mais de uma vez.');

			seen[prefix] = true;
			clean.formatos.push({ prefix: prefix, etiqueta: etiqueta, terms: terms });
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

	function etiquetaLimpa(value) {
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

		for (i = 0; i < comments.length; i++) clean.renderComments.push(etiquetaLimpa(comments[i]));

		if (!clean.renderComments.length) throw new Error('#PAD_085 - organizar: informe ao menos uma etiqueta de render.');

		var edits = o.editComments == null ? ['EDIT'] : listaDeVirgulas(o.editComments); // configurações antigas: o padrão

		for (i = 0; i < edits.length; i++) clean.editComments.push(etiquetaLimpa(edits[i]));

		clean.autoComment = etiquetaLimpa(o.autoComment);

		var matches = false;

		for (i = 0; i < clean.renderComments.length; i++) {
			if (clean.autoComment.indexOf(clean.renderComments[i]) >= 0) matches = true;
		}

		if (clean.autoComment == '' || !matches) throw new Error('#PAD_085 - organizar: a etiqueta automática precisa conter uma das etiquetas de render.');

		var exts = listaDeVirgulas(o.dataExtensions);

		for (i = 0; i < exts.length; i++) clean.dataExtensions.push('.' + exts[i].replace(/^\*?\.+/, '').toLowerCase());

		// as etiquetas dos arquivos (janela de etiquetas); configurações antigas: as do padrão
		var tags = o.fileTags == null ? PADRAO_ORGANIZAR.fileTags : listaDeVirgulas(o.fileTags);

		for (i = 0; i < tags.length; i++) {
			var tag = etiquetaLimpa(tags[i]);

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
		if (!URL_DO_WEBHOOK.test(clean.url)) {
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
	// registro de uso da equipe ('LOG'): { mode, webhook }
	//   mode → webhook (envia a linha para o webhook), csv (na pasta de templates da produção usada), csvEquipe (ao
	//          lado da configuração da equipe; antes 'csvGlobal', ainda lido) ou off
	// ---------------------------------------------------------------------------------------------------------

	var PADRAO_REGISTRO = { mode: 'webhook', webhook: 'https://workflows.jmbillard.com/webhook/log_db_padeiro' };

	function limparRegistro(o) {
		var clean = copiar(PADRAO_REGISTRO);

		if (!o) return clean;

		if (o.mode == 'csvGlobal') o.mode = 'csvEquipe'; // o nome antigo
		clean.mode = /^(csv|csvEquipe|off)$/.test(o.mode) ? o.mode : 'webhook';
		clean.webhook = trim(o.webhook);

		// sem aspas, espaços e símbolos do terminal: o endereço vai para a linha de comando do curl
		if (clean.mode == 'webhook' && !URL_DO_WEBHOOK.test(clean.webhook)) {
			throw new Error('#PAD_078 - log: endereço do webhook inválido (comece com http:// ou https://, sem espaços nem aspas).');
		}

		return clean;
	}

	// ---------------------------------------------------------------------------------------------------------
	// aparência ('APPEARANCE', da equipe e desta pessoa): o tema de todas as janelas (client/js/theme.js)
	//   mode → light, dark ou auto; background → gradient ou solid; accent, gradientStart, gradientEnd → #rrggbb;
	//   font → inter, system, helvetica, segoe, roboto, georgia ou mono; logo → PNG no lugar do pãozinho ('' = ele)
	// ---------------------------------------------------------------------------------------------------------

	var PADRAO_APARENCIA = { mode: 'light', background: 'gradient', accent: '#5184f8', gradientStart: '#67b7ff', gradientEnd: '#5649e9', font: 'inter', logo: '' };

	function limparAparencia(o) {
		o = o || {};

		var clean = {
			mode: /^(light|dark|auto)$/.test(o.mode) ? o.mode : PADRAO_APARENCIA.mode,
			background: o.background == 'solid' ? 'solid' : 'gradient',
			accent: trim(o.accent).toLowerCase(),
			gradientStart: trim(o.gradientStart).toLowerCase(),
			gradientEnd: trim(o.gradientEnd).toLowerCase(),
			font: /^(inter|system|helvetica|segoe|roboto|georgia|mono)$/.test(o.font) ? o.font : PADRAO_APARENCIA.font,
			logo: o.logo ? String(o.logo) : ''
		};
		var names = { accent: 'cor de destaque', gradientStart: 'início do degradê', gradientEnd: 'fim do degradê' };

		for (var key in names) {
			if (names.hasOwnProperty(key) && !/^#[0-9a-f]{6}$/.test(clean[key])) throw new Error('#PAD_088 - aparência: ' + names[key] + ' inválida (use #rrggbb).');
		}

		return clean;
	}

	// ---------------------------------------------------------------------------------------------------------
	// coletar ('COLETAR'; a chave antiga, em antigos na tabela): { folders: [{ name, parent, contents }] }, a árvore dentro da pasta do projeto
	//   tipos: projeto (a pasta do .aep), videos, sequencias, imagens, audio, dados, fontes, saidas e externos (esses
	//   dois não são coletados: dizem para onde a migração leva cada coisa). 'projectFolders' e 'saveAfter' (antigos)
	//   são ignorados
	// ---------------------------------------------------------------------------------------------------------

	var COLETAR_CONTEUDOS = ['projeto', 'videos', 'sequencias', 'imagens', 'audio', 'dados', 'fontes', 'saidas', 'externos'];

	// o .aep em 01, os arquivos em 02 (por tipo), as saídas em 03 (com os previews), as referências em 04 e, em 05, o
	// que não é do projeto (os arquivos externos)
	var PADRAO_COLETAR = {
		folders: [
			{ name: '01_PROJETOS', parent: '', contents: ['projeto'] },
			{ name: '02_ARQUIVOS', parent: '', contents: [] },
			{ name: 'FONTS', parent: '02_ARQUIVOS', contents: ['fontes'] },
			{ name: 'IMAGENS', parent: '02_ARQUIVOS', contents: ['imagens', 'sequencias'] },
			{ name: 'VIDEOS', parent: '02_ARQUIVOS', contents: ['videos'] },
			{ name: 'AUDIOS', parent: '02_ARQUIVOS', contents: ['audio'] },
			{ name: 'DADOS', parent: '02_ARQUIVOS', contents: ['dados'] },
			{ name: '03_SAIDA', parent: '', contents: ['saidas'] },
			{ name: 'PREVIEWS', parent: '03_SAIDA', contents: [] },
			{ name: '04_REFS', parent: '', contents: [] },
			{ name: '05_EXTERNOS', parent: '', contents: ['externos'] }
		]
	};

	function limparColetar(o) {
		var clean = { folders: [] };
		var folders = o && isArray(o.folders) ? o.folders : [];
		var names = {};
		var owner = {};
		var i;

		for (i = 0; i < folders.length; i++) {
			var row = folders[i] || {};
			var name = trim(row.name).replace(/\s+/g, ' ');
			var list = isArray(row.contents) ? row.contents : [];
			var kept = [];

			if (name == '') throw new Error('#PAD_094 - coletar: a pasta ' + (i + 1) + ' precisa de um nome.');
			if (/[\\\/:*?"<>|]/.test(name)) throw new Error('#PAD_094 - coletar: "' + name + '" não pode ter \\ / : * ? " < > |.');
			if (names[name.toUpperCase()]) throw new Error('#PAD_094 - coletar: a pasta "' + name + '" aparece mais de uma vez.');

			for (var t = 0; t < list.length; t++) {
				var content = trim(list[t]);

				if (content == '') continue;
				if (indexOf(COLETAR_CONTEUDOS, content) < 0) throw new Error('#PAD_094 - coletar: tipo desconhecido em "' + name + '".');
				if (owner[content]) throw new Error('#PAD_094 - coletar: "' + name + '" e "' + owner[content] + '" recebem o mesmo tipo.');

				owner[content] = name;
				kept.push(content);
			}

			names[name.toUpperCase()] = true;
			clean.folders.push({ name: name, parent: trim(row.parent), contents: kept });
		}

		for (i = 0; i < clean.folders.length; i++) {
			var f = clean.folders[i];

			if (f.parent != '' && !names[f.parent.toUpperCase()]) throw new Error('#PAD_094 - coletar: a pasta pai de "' + f.name + '" não existe.');

			// grafia da pasta pai e ciclos
			var seen = {};
			var cur = f;

			while (cur && cur.parent != '') {
				if (seen[cur.name.toUpperCase()]) throw new Error('#PAD_094 - coletar: "' + f.name + '" está dentro dela mesma.');

				seen[cur.name.toUpperCase()] = true;

				var next = null;

				for (var k = 0; k < clean.folders.length; k++) {
					if (clean.folders[k].name.toUpperCase() == cur.parent.toUpperCase()) next = clean.folders[k];
				}

				if (cur == f && next) f.parent = next.name;
				cur = next;
			}
		}

		return clean;
	}

	// ---------------------------------------------------------------------------------------------------------
	// banco de fontes ('FONTS'): { bank, upload }. bank '' = a pasta BANCO DE FONTES ao lado da pasta 'extension'
	// na rede (o host sabe qual é); upload false: as fontes não vão para o banco
	// ---------------------------------------------------------------------------------------------------------

	// um caminho digitado: barras normais, sem barra no fim
	function caminho(value) {
		return trim(value).replace(/\\/g, '/').replace(/(.)\/+$/, '$1');
	}

	function limparBancoDeFontes(o) {
		o = o || {};

		return { bank: caminho(o.bank || ''), upload: o.upload !== false };
	}

	// ---------------------------------------------------------------------------------------------------------
	// tipos de projeto ('TIPOS_DE_PROJETO', antes 'PROJECT'; aba TIPOS DE PROJETO): { tipos: [{ name, path, output,
	// file, icon }] }, a lista "dentro de" da atração nova (host/project.jsx). 'categories': o nome antigo de 'tipos'
	// (camposAntigos, na tabela; #46)
	//   path   → a pasta do projeto, com os tokens do caminho (TOKENS_DO_CAMINHO); sem {atracao}, o tipo é a atração
	//   output → a pasta de output proposta no projeto novo (opcional, com tokens); file → o nome do .aep (opcional,
	//            com tokens); icon → um ícone do seletor (client/js/util.js)
	// sem a seção (ou no formato antigo, com raiz e retrancas): sem tipos
	// ---------------------------------------------------------------------------------------------------------

	var TOKENS_DO_CAMINHO = ['atracao', 'ano', 'mes', 'mes_extenso', 'proximo_mes', 'proximo_mes_num', 'ano_proximo_mes', 'tipo', 'letra', 'o_que_e', 'ano_producao', 'designer'];
	// os tokens com o nome antigo, lidos por compatibilidade nos caminhos já salvos (antigo → novo)
	var TOKENS_ANTIGOS = { categoria: 'tipo', usuario: 'designer' };

	for (var tokenAntigo in TOKENS_ANTIGOS) TOKENS_DO_CAMINHO.push(tokenAntigo);

	// um caminho de output sem espaços a mais: dois ou mais espaços seguidos viram um, e somem os espaços em volta das
	// barras e nas pontas ("ARTE RJ /SHOWS  2026 " → "ARTE RJ/SHOWS 2026"). Vale em todo caminho de output (o host usa
	// a mesma: padCleanSpaces). Um token vazio ou um nome digitado com espaço sobrando criaria uma pasta quase igual à
	// certa, que ninguém acha depois
	function semEspacosAMais(path) {
		return String(path == null ? '' : path).replace(/[ \t\u00A0]{2,}/g, ' ').replace(/ *([\\\/]) */g, '$1').replace(/^ +| +$/g, '');
	}

	// o nome comparável de um tipo (o mesmo do nome do .aep, padAepName do host): sem acentos nem símbolos
	function chaveDoTipo(name) {
		return trim(semEspeciais(name).toUpperCase().replace(/[^A-Z0-9]+/g, ' '));
	}

	function limparTiposDeProjeto(o) {
		var clean = { tipos: [] };
		var list = o && isArray(o.tipos) ? o.tipos : [];
		var seen = {};

		for (var i = 0; i < list.length; i++) {
			var c = list[i] || {};
			var name = trim(c.name).replace(/\s+/g, ' ').toUpperCase();
			var path = caminho(c.path);
			var output = semEspacosAMais(caminho(c.output));
			// o nome do .aep do tipo (opcional, com tokens): MOOD MENSAL → {proximo_mes} NA GLOBO
			var fileName = trim(c.file).replace(/[\\\/:*?"<>|]+/g, ' ');
			var icon = String(c.icon == null ? '' : c.icon).replace(/[^a-z0-9-]/g, '');
			var key = chaveDoTipo(name);
			var re = /\{([^}]*)\}/g;
			var m;

			if (!key) throw new Error('#PAD_089 - tipos de projeto: preencha o nome do tipo de projeto ' + (i + 1) + '.');
			if (seen[key]) throw new Error('#PAD_089 - tipos de projeto: o tipo ' + name + ' aparece mais de uma vez.');
			if (path == '') throw new Error('#PAD_089 - tipos de projeto: o tipo ' + name + ' precisa de um caminho.');

			// {o_que_e} (o que se digita na janela de projeto, depois da atração): só no output e no nome do arquivo. A
			// pasta do projeto é decidida antes de o "o que é" existir
			if (path.indexOf('{o_que_e}') >= 0) throw new Error('#PAD_089 - tipos de projeto: o tipo ' + name + ' usa {o_que_e} na pasta do PROJETO. ele só vale no OUTPUT e no ARQUIVO.');

			while ((m = re.exec(path + ' ' + output + ' ' + fileName)) != null) {
				if (indexOf(TOKENS_DO_CAMINHO, m[1]) < 0) throw new Error('#PAD_089 - tipos de projeto: {' + m[1] + '} não é um token do caminho (use {atracao}, {ano}, {mes}, {mes_extenso}, {proximo_mes}, {proximo_mes_num}, {ano_proximo_mes}, {tipo}, {letra}, {o_que_e}, {ano_producao} ou {designer}).');
			}

			seen[key] = true;
			clean.tipos.push({ name: name, path: path, output: output, file: fileName, icon: icon });
		}

		return clean;
	}

	// ---------------------------------------------------------------------------------------------------------
	// o webhook do projeto ('WEBHOOK_DO_PROJETO'; aba TIPOS DE PROJETO): { url }, o webhook do n8n que a janela de
	// projeto avisa ao criar ou abrir um projeto (regras/webhook-do-projeto.js; docs/webhook-projeto.md)
	//   url → o padrão é o workflow da equipe (https://workflows.jmbillard.com/webhook/projeto); vazia: nada é
	//         enviado. a validação é a da URL do registro de uso: o
	//         endereço também vai para a linha de comando do curl (o plano B do host, sem o Node do painel)
	// ---------------------------------------------------------------------------------------------------------

	function limparWebhookDoProjeto(o) {
		var url = trim(o && o.url);

		if (url && !URL_DO_WEBHOOK.test(url)) {
			throw new Error('#PAD_089 - tipos de projeto: endereço do webhook do projeto inválido (comece com http:// ou https://, sem espaços nem aspas; vazio: nada é enviado).');
		}

		return { url: url };
	}

	// ---------------------------------------------------------------------------------------------------------
	// deste computador ('computador_config.json', antes 'machine_config.json', na pasta de dados do usuário)
	//   designer    → a sigla do designer (antes 'user') ({designer} nos caminhos dos tipos de projeto, antes {usuario}); vazia: a do login
	//   projects    → a pasta dos projetos neste computador (a atração nova vai para ela quando a do tipo não
	//                 pode ser acessada: rede fora ou modo local)
	//   outputs     → o output local (vale quando o output do template não pode ser acessado)
	//   render      → os presets de render { final, preview }
	//   productions → as produções deste computador [{ name, path }] (configuração > templates)
	//   localMode   → o modo local ligado à mão
	//   log         → o registro de uso ligado neste computador (ligado: segue o da equipe)
	//   search      → o índice local { mode: webhook | local, folders, foldersOnly, daily }
	//   lists       → a lista de templates { recents (0 a 30), newDays (0 a 90) }
	//   fontsUpload → as fontes deste computador vão para o banco; fontsCheck → a barra confere as fontes sozinha
	// ---------------------------------------------------------------------------------------------------------

	var COMPUTADOR = 'computador_config.json';
	var PERSONALIZADO = 'computador_personalizado.json'; // a aparência e a barra deste computador: só as personalizadas
	var LINKS_DESTE_COMPUTADOR = 'computador_links.json';
	// os arquivos de antes de cada arquivo deste computador (arquivo novo → [antigos], na ordem de leitura), lidos
	// enquanto o novo não existe; a gravação seguinte grava o novo e deixa o antigo no lugar (apagar fica para depois
	// do beta). Os nomes de antes do #45 e, da sigla, o project_user.json, ainda mais antigo (só com 'user')
	var ARQUIVOS_ANTIGOS = {};

	ARQUIVOS_ANTIGOS[COMPUTADOR] = ['machine_config.json', 'project_user.json'];
	ARQUIVOS_ANTIGOS[PERSONALIZADO] = ['personal_config.json'];
	ARQUIVOS_ANTIGOS[LINKS_DESTE_COMPUTADOR] = ['personal_links.json'];

	// o designer: letras, números, ponto, hífen e sublinhado, em maiúsculas (a mesma limpeza vale para o login)
	function limparSigla(value) {
		return semEspeciais(value == null ? '' : value).replace(/[^A-Za-z0-9._-]/g, '').substring(0, 24).toUpperCase();
	}

	// uma pasta deste computador: barras normais, sem barra no fim e sem o -1 a -5 de um volume montado de novo
	function limparPasta(value) {
		return caminho(value).replace(/^(\/Volumes\/[^\/]+?)-[1-5](?=\/|$)/i, '$1');
	}

	function limparPresetsDeRender(o) {
		o = o || {};

		return { 'final': trim(o['final'] || ''), preview: trim(o.preview || '') };
	}

	// sem nome, sem pasta ou com o nome repetido: fica de fora
	function limparProducoesDesteComputador(list) {
		var out = [];
		var seen = {};

		list = isArray(list) ? list : [];

		for (var i = 0; i < list.length; i++) {
			var row = list[i] || {};
			var name = trim(row.name).replace(/\s+/g, ' ');
			var path = limparPasta(row.path);

			if (!name || !path || seen[name.toUpperCase()]) continue;

			seen[name.toUpperCase()] = true;
			out.push({ name: name, path: path });
		}

		return out;
	}

	function limparIndiceLocal(o) {
		o = o && typeof o == 'object' ? o : {};

		var folders = [];
		var list = isArray(o.folders) ? o.folders : [];

		for (var i = 0; i < list.length; i++) {
			var path = limparPasta(list[i]);

			if (path) folders.push(path);
		}

		return { mode: o.mode == 'local' ? 'local' : 'webhook', folders: folders, foldersOnly: o.foldersOnly !== false, daily: o.daily !== false };
	}

	function numero(v, def, max) {
		var n = parseInt(v, 10);

		if (isNaN(n)) return def;
		if (n < 0) return 0;

		return n > max ? max : n;
	}

	function limparListaDosTemplates(o) {
		o = o && typeof o == 'object' ? o : {};

		return { recents: numero(o.recents, 5, 30), newDays: numero(o.newDays, 15, 90) };
	}

	function ligado(v) {
		return v !== false;
	}

	function vazio() {
		return null;
	}

	// ---------------------------------------------------------------------------------------------------------
	// a cópia do índice da busca (na pasta temp deste computador). Não é uma seção: é o índice inteiro, grande,
	// gravado e lido também pelo Node do painel (client/js/search-index.js) direto do disco, sem chave nem limpeza.
	// Fica aqui só o nome dela e o de antes, lido enquanto não há a de agora (paraLer).
	// ---------------------------------------------------------------------------------------------------------

	var COPIA_DA_BUSCA = { arquivo: 'busca_copia.json', arquivosAntigos: ['busca_v2.json'] };

	// o arquivo para ler: o de agora ou, sem ele, o primeiro antigo que existir (existe: function (nome) → bool)
	function paraLer(arquivo, existe) {
		if (existe(arquivo.arquivo)) return arquivo.arquivo;

		for (var i = 0; arquivo.arquivosAntigos && i < arquivo.arquivosAntigos.length; i++) {
			if (existe(arquivo.arquivosAntigos[i])) return arquivo.arquivosAntigos[i];
		}

		return arquivo.arquivo;
	}

	// ---------------------------------------------------------------------------------------------------------
	// a configuração da equipe vinda do painel (saveProductions): o campo do painel → a seção da tabela
	// ---------------------------------------------------------------------------------------------------------

	var CAMPOS_DO_PAINEL = {
		productions: 'producoes', drives: 'mapaDeDrives', rename: 'regraDoRenomear', organize: 'organizar', search: 'buscaDeCaminhos', links: 'links',
		bar: 'barra', log: 'registroDeUso', appearance: 'aparencia', coletar: 'coletar', fonts: 'bancoDeFontes', tiposDeProjeto: 'tiposDeProjeto',
		webhookDoProjeto: 'webhookDoProjeto'
	};

	// { campo do painel: valor } → { seção: valor }, só com os campos que vieram (sem as produções: a lista vazia, que
	// a limpeza recusa)
	function secoesDoPainel(a) {
		var out = { producoes: (a && a.productions) || [] };

		for (var campo in CAMPOS_DO_PAINEL) {
			if (CAMPOS_DO_PAINEL.hasOwnProperty(campo) && campo != 'productions' && a && a[campo] !== undefined) out[CAMPOS_DO_PAINEL[campo]] = a[campo];
		}

		return out;
	}

	// ---------------------------------------------------------------------------------------------------------
	// a tabela
	// ---------------------------------------------------------------------------------------------------------

	var TABELA = [
		{ nome: 'producoes', onde: 'equipe', arquivo: EQUIPE, chave: 'PRODUCTIONS', padrao: function () { return []; }, limpar: limparProducoes, lerLimpo: lerProducoes },
		{ nome: 'mapaDeDrives', onde: 'equipe', arquivo: EQUIPE, chave: 'DRIVES', padrao: function () { return PADRAO_DRIVES; }, limpar: limparDrives },
		{ nome: 'regraDoRenomear', onde: 'equipe', arquivo: EQUIPE, chave: 'RENAME', camposAntigos: { formatos: ['types'] }, padrao: function () { return PADRAO_RENOMEAR; }, limpar: limparRenomear },
		{ nome: 'organizar', onde: 'equipe', arquivo: EQUIPE, chave: 'ORGANIZE', padrao: function () { return PADRAO_ORGANIZAR; }, limpar: limparOrganizar, depoisDeLer: organizarDepoisDeLer },
		{ nome: 'buscaDeCaminhos', onde: 'equipe', arquivo: EQUIPE, chave: 'SEARCH', camposAntigos: { caminhosFixos: ['servidor'] }, padrao: function () { return PADRAO_BUSCA; }, limpar: limparBusca },
		{ nome: 'links', onde: 'equipe', arquivo: EQUIPE, chave: 'LINKS', padrao: function () { return PADRAO_LINKS; }, limpar: limparLinks },
		{ nome: 'barra', onde: 'equipe', arquivo: EQUIPE, chave: 'BAR', padrao: function () { return limparBarra({}); }, limpar: limparBarra },
		{ nome: 'registroDeUso', onde: 'equipe', arquivo: EQUIPE, chave: 'LOG', padrao: function () { return PADRAO_REGISTRO; }, limpar: limparRegistro },
		{ nome: 'aparencia', onde: 'equipe', arquivo: EQUIPE, chave: 'APPEARANCE', padrao: function () { return PADRAO_APARENCIA; }, limpar: limparAparencia },
		// antigos: a chave com o nome antigo (o termo evitado pelo glossário), lida por compatibilidade
		{ nome: 'coletar', onde: 'equipe', arquivo: EQUIPE, chave: 'COLETAR', antigos: ['COLLECT'], padrao: function () { return PADRAO_COLETAR; }, limpar: limparColetar },
		{ nome: 'bancoDeFontes', onde: 'equipe', arquivo: EQUIPE, chave: 'FONTS', padrao: function () { return { bank: '', upload: true }; }, limpar: limparBancoDeFontes },
		{ nome: 'tiposDeProjeto', onde: 'equipe', arquivo: EQUIPE, chave: 'TIPOS_DE_PROJETO', antigos: ['PROJECT'], camposAntigos: { tipos: ['categories'] }, padrao: function () { return { tipos: [] }; }, limpar: limparTiposDeProjeto },
		{ nome: 'webhookDoProjeto', onde: 'equipe', arquivo: EQUIPE, chave: 'WEBHOOK_DO_PROJETO', padrao: function () { return { url: 'https://workflows.jmbillard.com/webhook/projeto' }; }, limpar: limparWebhookDoProjeto },

		// deste computador
		{ nome: 'sigla', onde: 'computador', arquivo: COMPUTADOR, chave: 'designer', antigos: ['user'], padrao: function () { return ''; }, limpar: limparSigla },
		{ nome: 'modoLocal', onde: 'computador', arquivo: COMPUTADOR, chave: 'localMode', antigos: ['homeOffice'], padrao: function () { return false; }, limpar: function (v) { return v === true; } },
		{ nome: 'registroDeUsoLigado', onde: 'computador', arquivo: COMPUTADOR, chave: 'log', padrao: function () { return true; }, limpar: ligado },
		{ nome: 'pastaDosProjetos', onde: 'computador', arquivo: COMPUTADOR, chave: 'projects', padrao: function () { return ''; }, limpar: limparPasta },
		{ nome: 'outputLocal', onde: 'computador', arquivo: COMPUTADOR, chave: 'outputs', padrao: function () { return ''; }, limpar: limparPasta },
		{ nome: 'presetsDeRender', onde: 'computador', arquivo: COMPUTADOR, chave: 'render', padrao: function () { return limparPresetsDeRender({}); }, limpar: limparPresetsDeRender },
		// sem a lista (padrão null), o host monta as produções deste computador das pastas de antes ('templates'), que
		// dependem das produções da equipe (api.jsx: padProducoesDesteComputador)
		{ nome: 'producoesDesteComputador', onde: 'computador', arquivo: COMPUTADOR, chave: 'productions', padrao: vazio, limpar: limparProducoesDesteComputador },
		{ nome: 'indiceLocal', onde: 'computador', arquivo: COMPUTADOR, chave: 'search', padrao: function () { return limparIndiceLocal({}); }, limpar: limparIndiceLocal },
		{ nome: 'listaDosTemplates', onde: 'computador', arquivo: COMPUTADOR, chave: 'lists', padrao: function () { return limparListaDosTemplates({}); }, limpar: limparListaDosTemplates },
		{ nome: 'fontesNoBanco', onde: 'computador', arquivo: COMPUTADOR, chave: 'fontsUpload', padrao: function () { return true; }, limpar: ligado },
		{ nome: 'fontesConferir', onde: 'computador', arquivo: COMPUTADOR, chave: 'fontsCheck', padrao: function () { return true; }, limpar: ligado },
		{ nome: 'linksDesteComputador', onde: 'computador', arquivo: LINKS_DESTE_COMPUTADOR, chave: 'LINKS', padrao: function () { return []; }, limpar: limparLinks },
		// sem a personalizada (padrão null): vale a da equipe
		{ nome: 'aparenciaDesteComputador', onde: 'computador', arquivo: PERSONALIZADO, chave: 'APPEARANCE', padrao: vazio, limpar: limparAparencia },
		{ nome: 'barraDesteComputador', onde: 'computador', arquivo: PERSONALIZADO, chave: 'BAR', padrao: vazio, limpar: limparBarra }
	];

	// os arquivos antigos de cada seção: os do arquivo dela, no mapa por arquivo (ARQUIVOS_ANTIGOS, acima)
	for (var t = 0; t < TABELA.length; t++) {
		if (ARQUIVOS_ANTIGOS.hasOwnProperty(TABELA[t].arquivo)) TABELA[t].arquivosAntigos = ARQUIVOS_ANTIGOS[TABELA[t].arquivo];
	}

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

		// lê uma seção: sempre o valor limpo e completo (sem nada, ou com um valor que não se aproveita: o padrão).
		// Sem o arquivo da seção (ou ilegível), procura nos arquivos antigos dele (arquivosAntigos), na mesma chave, um
		// depois do outro. Com o arquivo novo, os antigos não são mais lidos: ele foi gravado inteiro, com o que se
		// aproveitou deles, e uma seção que saiu dele (null: de volta ao padrão) não volta do antigo.
		function ler(adaptador, nome) {
			var s = secao(nome);
			var arquivos = [s.arquivo].concat(s.arquivosAntigos || []);
			var doc;

			for (var i = 0; i < arquivos.length; i++) {
				try {
					doc = adaptador.ler(arquivos[i]);
				} catch (err) {
					doc = null;
				}

				if (bruto(s, doc) != null) return lerDe(doc, nome);
				if (i == 0 && doc && typeof doc == 'object') break;
			}

			return padrao(nome);
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

		// o documento inteiro de um arquivo deste computador: todas as seções da tabela que moram nele, cada uma com o
		// valor enviado (já limpo) ou, sem ele, o lido (limpo e completo, com os nomes antigos já lidos). As sem valor
		// (padrão null e nada guardado, ou enviadas null) ficam de fora; as chaves que a tabela não conhece saem.
		function inteiro(adaptador, arquivo, limpos) {
			var out = {};
			var i, s, valor;

			for (i = 0; i < tabela.length; i++) {
				s = tabela[i];

				if (s.arquivo != arquivo) continue;

				valor = limpos.hasOwnProperty(s.nome) ? limpos[s.nome] : ler(adaptador, s.nome);

				if (valor != null) out[s.chave] = valor;
			}

			return out;
		}

		// grava as seções de 'valores' ({ nome: valor }), um documento por arquivo. Limpa todas antes de gravar a
		// primeira: um valor que não serve lança Error e nada é gravado. Devolve { nome: valor limpo }.
		//   - da equipe: só as enviadas mudam; as outras seções e as chaves de fora da tabela ficam como estão;
		//   - deste computador: o arquivo é gravado inteiro (inteiro, acima), com as enviadas e as outras seções dele
		//     como estão guardadas; null numa seção deste computador a tira do arquivo (volta ao padrão).
		// Os arquivos antigos ficam no lugar: o novo, gravado, passa a valer sozinho (ler, acima). Apagar os antigos
		// fica para depois do beta, quando ninguém mais voltar a uma versão que só conhece os nomes antigos.
		function gravar(adaptador, valores) {
			var porArquivo = {};
			var limpos = {};
			var nome, arquivo, doc, s;

			for (nome in valores) {
				if (!valores.hasOwnProperty(nome) || valores[nome] === undefined) continue;

				s = secao(nome);

				if (valores[nome] === null) {
					if (s.onde != 'computador') continue;

					limpos[nome] = null;
				} else {
					limpos[nome] = limpar(nome, valores[nome]);
				}

				if (!porArquivo[s.arquivo]) porArquivo[s.arquivo] = { computador: s.onde == 'computador', limpos: {} };
				porArquivo[s.arquivo].limpos[nome] = limpos[nome];
			}

			for (arquivo in porArquivo) {
				if (!porArquivo.hasOwnProperty(arquivo)) continue;

				if (porArquivo[arquivo].computador) {
					doc = inteiro(adaptador, arquivo, porArquivo[arquivo].limpos);
				} else {
					try {
						doc = aplicar(adaptador.ler(arquivo), porArquivo[arquivo].limpos);
					} catch (err) {
						doc = aplicar(null, porArquivo[arquivo].limpos); // ilegível: começa de novo (como antes)
					}
				}

				adaptador.gravar(arquivo, doc);
			}

			return limpos;
		}

		return {
			secao: secao, padrao: padrao, limpar: limpar, ler: ler, lerDe: lerDe, aplicar: aplicar, gravar: gravar, criar: criar, paraLer: paraLer,
			secoesDoPainel: secoesDoPainel, caminho: caminho, semEspacosAMais: semEspacosAMais,
			EQUIPE: EQUIPE, COMPUTADOR: COMPUTADOR, PERSONALIZADO: PERSONALIZADO, LINKS_DESTE_COMPUTADOR: LINKS_DESTE_COMPUTADOR, COPIA_DA_BUSCA: COPIA_DA_BUSCA
		};
	}

	var api = criar(TABELA);

	// a variável global sempre (o painel do After tem window e também module, com o Node ligado); o module.exports no Node
	root.PAD_CONFIGURACAO = api;

	if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
