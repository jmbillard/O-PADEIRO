#!/usr/bin/env bash
# Instala a extensão no After Effects (macOS) para uso e desenvolvimento.
#
#   ./install-mac.sh             cria um link para esta pasta (alterações valem após recarregar o painel)
#   ./install-mac.sh --copy      copia a pasta (instalação "fixa")
#   ./install-mac.sh --uninstall remove a extensão
#
# Extensões sem assinatura (.zxp) só carregam com o PlayerDebugMode ligado; o script liga para as versões CSXS 9–13.
set -euo pipefail

src="$(cd "$(dirname "$0")/.." && pwd)"
dest="$HOME/Library/Application Support/Adobe/CEP/extensions/com.jmbillard.opadeiro.panel"

if [[ "${1:-}" == "--uninstall" ]]; then
	rm -rf "$dest"
	echo "removido: $dest"
	exit 0
fi

for v in 9 10 11 12 13; do
	defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1
done

mkdir -p "$(dirname "$dest")"
rm -rf "$dest"

if [[ "${1:-}" == "--copy" ]]; then
	cp -R "$src" "$dest"
	rm -rf "$dest/scripts"
	echo "copiado para: $dest"
else
	ln -s "$src" "$dest"
	echo "link criado: $dest -> $src"
fi

# lista de produções compartilhada: 'O_PADEIRO_config.json' na pasta do padeiro (a que contém a pasta
# da extensão). O caminho é gravado para a extensão achar o arquivo mesmo rodando de uma cópia local.
config="$(cd "$src/.." && pwd)/O_PADEIRO_config.json"
prefs="$HOME/Library/Application Support/O PADEIRO script"

if [[ -f "$config" ]]; then
	mkdir -p "$prefs"
	printf '%s' "$config" > "$prefs/shared_config.txt"
	echo "lista de produções compartilhada: $config"
else
	echo "aviso: não achei $config — sem ele não há lista de produções (instale a partir da pasta do padeiro na rede)"
fi

# versão antiga (script ScriptUI): o instalador dela gravava 'O PADEIRO.jsx' nas preferências de cada versão do AE
shopt -s nullglob
for old in "$HOME/Library/Preferences/Adobe/After Effects/"*"/Scripts/ScriptUI Panels/O PADEIRO.jsx"; do
	rm -f "$old"
	echo "versão antiga (script) removida: $old"
done
shopt -u nullglob

echo "reinicie o After Effects e abra: Window > Extensions > O PADEIRO"
