/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> O PADEIRO — diagnóstico dos arquivos faltando (o "procurar os que faltam" do CATADOR)
---------------------------------------------------------------

Rode no After Effects, com o projeto aberto e a barra do padeiro aberta:
  File > Scripts > Run Script File… > este arquivo

Para cada arquivo faltando (até 15), mostra o caminho guardado no projeto, como o padeiro o entende neste
computador, o volume e o servidor que ele tentaria montar, e se o arquivo existe depois disso. No fim, roda a busca
do CATADOR (coletarReligarFind) e mostra o que ela achou. Pode montar um volume da rede (como o botão do CATADOR), mas
não muda nada no projeto. O resultado aparece num campo de texto para copiar.

*/

(function () {
	var out = [];

	function line(label, fn) {
		try {
			out.push(label + ': ' + fn());
		} catch (err) {
			out.push(label + ': ERRO ' + (err && err.message ? err.message : err) + (err && err.line ? ' (linha ' + err.line + ')' : ''));
		}
	}

	function json(v) {
		return typeof JSON != 'undefined' && JSON.stringify ? JSON.stringify(v) : String(v);
	}

	line('after effects', function () {
		return app.version + ' · ' + $.os;
	});
	line('host carregado', function () {
		return typeof PADX != 'undefined' && typeof PADX.coletarReligarFind == 'function' ? 'sim' : 'NÃO (abra a barra do padeiro antes)';
	});
	line('mapa de drives', function () {
		return typeof DRIVE_MAP != 'undefined' ? json(DRIVE_MAP) : '(nenhum)';
	});
	line('volumes montados', function () {
		var list = new Folder('/Volumes').getFiles() || [];
		var names = [];

		for (var v = 0; v < list.length; v++) names.push(decodeURI(list[v].name));

		return names.join(', ') || '-';
	});

	var shown = 0;

	for (var i = 1; i <= app.project.numItems && shown < 15; i++) {
		var item = app.project.item(i);

		if (!(item instanceof FootageItem) || !padFootageMissing(item)) continue;

		shown++;
		out.push('');
		out.push('— ' + item.name + ' (id ' + item.id + ')');

		(function (item) {
			var raw = '';

			line('  guardado', function () {
				raw = padFootagePath(item);

				return raw || '(sem caminho: placeholder)';
			});
			if (!raw) return;

			var norm = '';
			var clean = '';

			line('  normalizado', function () {
				norm = padReligarNormalize(raw);

				return norm;
			});
			line('  neste computador', function () {
				clean = padPath(padNoVolumeSuffix(norm)) || '';

				return clean || '(o conversor não entendeu)';
			});
			line('  existe assim', function () {
				return clean ? new File(clean).exists : '-';
			});
			line('  volume / servidor', function () {
				var m = String(clean).match(/^\/Volumes\/([^\/]+?)(?:-[1-5])?\//);

				if (!m) return '(não é um caminho de volume)';

				var vol = m[1];
				var low = vol.toLowerCase();
				var server = '';

				if (/(^|\/)edit_output(\/|$)/i.test(clean)) server = PS_SMB.cppHp;
				else if (low == 'vfx' || low == 'edit_in_place') server = PS_SMB.sp;
				else server = findServerForShare(vol) || '';

				return vol + ' / ' + (server || '(servidor desconhecido: o padeiro não monta)');
			});
			line('  no volume montado', function () {
				var p = clean ? padMountedPath(clean) : '';

				return p ? p + ' → ' + (new File(p).exists ? 'EXISTE' : 'não existe') : '-';
			});
		})(item);
	}

	if (!shown) out.push('', 'nenhum arquivo faltando no projeto aberto.');

	out.push('');
	line('busca do CATADOR (coletarReligarFind)', function () {
		var res = PADX.coletarReligarFind({});

		return json({ achados: res.found.length, faltando: res.still.length, parcial: res.partial, primeiros: res.found.slice(0, 5) });
	});

	var w = new Window('dialog', 'O PADEIRO · diagnóstico dos arquivos faltando');
	var box = w.add('edittext', undefined, out.join('\n'), { multiline: true, readonly: true });

	box.preferredSize = [820, 380];
	w.add('statictext', undefined, 'selecione tudo (Ctrl/Cmd+A), copie e mande.');
	w.add('button', undefined, 'Fechar', { name: 'ok' });
	w.show();
})();
