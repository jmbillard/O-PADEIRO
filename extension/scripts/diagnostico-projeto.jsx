/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> O PADEIRO — diagnóstico do projeto aberto
---------------------------------------------------------------

Rode no After Effects, com o projeto aberto e a barra do padeiro aberta:
  File > Scripts > Run Script File… > este arquivo

Mostra o que o host do padeiro responde sobre o projeto aberto (o mesmo que a bolinha do botão Criar / Alterar
da barra pergunta), num campo de texto para copiar. Não muda nada no projeto.

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
	line('arquivo', function () {
		return app.project.file ? app.project.file.fsName : '(o projeto ainda não foi salvo)';
	});
	line('modificado', function () {
		return app.project.file ? String(app.project.file.modified) : '-';
	});
	line('host carregado', function () {
		return typeof PADX != 'undefined' && typeof PADX.projectStatus == 'function' ? 'sim' : 'NÃO (abra a barra do padeiro antes)';
	});
	line('assinatura do host', function () {
		var sig = String($.global.PADX_HOST_SIG || '');
		var last = 0;
		var re = /:(\d+);/g;
		var m;

		while ((m = re.exec(sig)) != null) if (+m[1] > last) last = +m[1];

		return sig ? sig.split(';').length - 1 + ' arquivos, o mais novo de ' + String(new Date(last)) : '(nenhuma)';
	});
	line('projectStatus (o que a barra recebe)', function () {
		return json(PADX.projectStatus());
	});
	line('projectStatus de novo', function () {
		return json(PADX.projectStatus());
	});
	line('projectCurrent (o que a claquete recebe)', function () {
		var c = PADX.projectCurrent();

		return json({ created: c.created, outside: c.outside, atracao: c.atracao, oQueE: c.oQueE, root: c.root, file: c.file });
	});
	line('dados no arquivo (xmp)', function () {
		var m = padMetaRead();

		return json({ atracao: m.atracao, pasta: m.pasta, versao: m.versao, criado: m.criado, editores: m.editores });
	});
	line('na pasta dele (padInRoot)', function () {
		return app.project.file ? padInRoot(app.project.file) : '-';
	});
	line('PADX_call projectStatus (o caminho da barra)', function () {
		return PADX_call('projectStatus', '{}');
	});

	var w = new Window('dialog', 'O PADEIRO · diagnóstico do projeto');
	var box = w.add('edittext', undefined, out.join('\n'), { multiline: true, readonly: true });

	box.preferredSize = [760, 320];
	w.add('statictext', undefined, 'selecione tudo (Ctrl/Cmd+A), copie e mande.');
	w.add('button', undefined, 'Fechar', { name: 'ok' });
	w.show();
})();
