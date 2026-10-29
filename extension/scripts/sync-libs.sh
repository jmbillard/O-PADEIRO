#!/usr/bin/env bash
# Copia para o host da extensão as libs ExtendScript compartilhadas com o script ScriptUI.
# Rode depois de alterar qualquer arquivo em source/libraries/ (e comite o resultado).
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
src="$root/source/libraries"
dst="$root/extension/host/lib"

libs=(
	"JSON lib.js"
	"PROT lib.js"
	"functions/string lib.js"
	"functions/file system lib.js"
	"functions/layers lib.js"
	"functions/rename lib.js"
	"functions/project lib.js"
	"functions/metadata lib.js"
	"functions/web lib.js"
	"functions/treeView lib.js"
	"functions/fonts lib.js"
)

mkdir -p "$dst/functions"

for lib in "${libs[@]}"; do
	cp "$src/$lib" "$dst/$lib"
	echo "ok  $lib"
done

cp "$root/O_PADEIRO_config.json" "$root/extension/host/data/O_PADEIRO_config.json"
echo "ok  O_PADEIRO_config.json (lista inicial de produções)"

python3 "$root/extension/scripts/extract_globals.py"
