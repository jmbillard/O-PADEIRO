#!/bin/bash
# ---------------------------------------------------------------
# > mapear pastas: a árvore de pastas de um servidor, num arquivo
# ---------------------------------------------------------------
#
# Lista só as PASTAS (nenhum arquivo é aberto, copiado ou alterado), até alguns níveis para dentro, e grava um
# arquivo de texto na Área de Trabalho com uma linha por pasta:
#
#   nível   subpastas   arquivos   caminho (a partir da pasta mapeada)
#
# É o retrato para padronizar a estrutura: o que existe hoje em cada servidor, quantas pastas e arquivos há em
# cada uma e onde as grafias se repetem.
#
#   bash mapear-pastas.sh "/Volumes/VFX/imagem/drive_l"                  (4 níveis, o padrão)
#   bash mapear-pastas.sh "/Volumes/EDIT_IN_PLACE/PROMO/cdesign_output" 5  (5 níveis)
#
# Pastas escondidas (.algumacoisa) ficam de fora. Numa rede lenta pode levar alguns minutos.

RAIZ="${1%/}"
NIVEIS="${2:-4}"

if [ -z "$RAIZ" ] || [ ! -d "$RAIZ" ]; then
	echo "uso: bash mapear-pastas.sh \"/caminho/da/pasta\" [níveis]"
	echo "a pasta não existe ou o volume não está montado: $RAIZ"
	exit 1
fi

NOME="$(basename "$RAIZ" | tr ' /' '__')"
SAIDA="$HOME/Desktop/mapa_${NOME}_$(date +%Y%m%d_%H%M).tsv"
TMP="$(mktemp -d)"

echo "mapeando $RAIZ ($NIVEIS níveis)…"
echo "  pastas…"
find "$RAIZ" -maxdepth "$((NIVEIS + 1))" -name '.*' -prune -o -type d -print 2>/dev/null > "$TMP/pastas"
echo "  arquivos (só a contagem)…"
find "$RAIZ" -maxdepth "$((NIVEIS + 1))" -name '.*' -prune -o -type f -print 2>/dev/null > "$TMP/arquivos"

awk -v raiz="$RAIZ" -v niveis="$NIVEIS" -F'\t' '
	function pai(p) { sub(/\/[^\/]*$/, "", p); return p }
	FNR == NR { arquivos[pai($0)]++; next }
	{ pastas[++n] = $0; if ($0 != raiz) sub_[pai($0)]++ }
	END {
		print "nivel\tsubpastas\tarquivos\tcaminho"
		for (i = 1; i <= n; i++) {
			p = pastas[i]
			rel = substr(p, length(raiz) + 2)
			nivel = (rel == "") ? 0 : split(rel, partes, "/")
			if (nivel > niveis) continue
			printf "%d\t%d\t%d\t%s\n", nivel, sub_[p] + 0, arquivos[p] + 0, (rel == "" ? "." : rel)
		}
	}
' "$TMP/arquivos" "$TMP/pastas" | (read -r cabecalho; echo "$cabecalho"; sort -t "$(printf '\t')" -k4,4) > "$SAIDA"

TOTAL=$(($(wc -l < "$SAIDA") - 1))
rm -rf "$TMP"

echo "pronto: $TOTAL pastas"
echo "  $SAIDA"
