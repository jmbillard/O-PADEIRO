#!/usr/bin/env bash
# Instala a extensão no After Effects (macOS) para uso e desenvolvimento.
#
#   ./install-mac.sh             cria um link para esta pasta (alterações valem após recarregar o painel)
#   ./install-mac.sh --copy      copia a pasta (instalação "fixa")
#   ./install-mac.sh --uninstall remove a extensão
#
# Extensões sem assinatura (.zxp) só carregam com o PlayerDebugMode ligado; o script liga para as versões CSXS 9–12.
set -euo pipefail

src="$(cd "$(dirname "$0")/.." && pwd)"
dest="$HOME/Library/Application Support/Adobe/CEP/extensions/com.jmbillard.opadeiro.panel"

if [[ "${1:-}" == "--uninstall" ]]; then
	rm -rf "$dest"
	echo "removido: $dest"
	exit 0
fi

for v in 9 10 11 12; do
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

echo "reinicie o After Effects e abra: Window > Extensions > O PADEIRO"
