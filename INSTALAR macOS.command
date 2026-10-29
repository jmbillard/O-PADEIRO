#!/usr/bin/env bash
# Dois cliques no Finder: instala (ou atualiza) a extensão O PADEIRO no After Effects.
cd "$(dirname "$0")" || exit 1
./extension/scripts/install-mac.sh --copy
echo
read -n 1 -s -r -p "pronto! pressione qualquer tecla para fechar..."
