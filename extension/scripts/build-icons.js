/*

---------------------------------------------------------------
> ícones: o retrato da pasta para o modo de teste
---------------------------------------------------------------

Os ícones da biblioteca (o seletor de ícones das categorias e das produções) ficam em extension/client/icons/,
um arquivo por ícone: nome.svg (desenho) ou nome.json (animação Lottie). No After Effects o painel lê a pasta
direto (Node). No navegador (modo de teste, sem Node) ele usa o retrato gerado por este script:

  node extension/scripts/build-icons.js

Rode depois de acrescentar, trocar ou apagar um ícone, para o modo de teste ficar igual.

No icons.json: { "key", "label" } dá a ordem e o nome no seletor; { "key", "same" } faz um nome antigo apontar
para outro ícone (o que já foi escolhido com o nome antigo continua funcionando); "tint": false mantém as cores
de um Lottie.

*/

const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '../client/icons');
const OUT = path.join(DIR, '_snapshot.js');

function readList() {
	const manifest = fs.existsSync(path.join(DIR, 'icons.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'icons.json'), 'utf8')) : [];
	const files = fs.readdirSync(DIR).filter((f) => /\.(svg|json)$/i.test(f) && f !== 'icons.json' && !/^_/.test(f));
	const byKey = {};

	// um nome.json (Lottie) passa à frente do nome.svg
	files.forEach((f) => {
		const k = f.replace(/\.(svg|json)$/i, '');

		if (!byKey[k] || /\.json$/i.test(f)) byKey[k] = f;
	});

	const order = manifest.filter((m) => byKey[m.key]).concat(Object.keys(byKey).sort().filter((k) => !manifest.some((m) => m.key === k)).map((k) => ({ key: k, label: k })));

	return order.map((m) => {
		const file = byKey[m.key];
		const text = fs.readFileSync(path.join(DIR, file), 'utf8');

		return /\.json$/i.test(file)
			? { key: m.key, label: m.label || m.key, type: 'lottie', tint: m.tint !== false, data: JSON.parse(text) }
			: { key: m.key, label: m.label || m.key, type: 'svg', svg: text.replace(/<\?xml[^>]*>/, '').trim() };
	});
}

const list = readList();
const aliases = {};

(fs.existsSync(path.join(DIR, 'icons.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'icons.json'), 'utf8')) : []).forEach((m) => {
	if (m.same) aliases[m.key] = m.same;
});

fs.writeFileSync(OUT, '/* gerado por extension/scripts/build-icons.js: não edite (edite os arquivos da pasta) */\nwindow.PAD_ICON_SNAPSHOT = ' + JSON.stringify(list) + ';\nwindow.PAD_ICON_ALIASES = ' + JSON.stringify(aliases) + ';\n');
console.log(list.length + ' ícones (' + list.filter((i) => i.type === 'lottie').length + ' Lottie) → ' + path.relative(process.cwd(), OUT));
