#!/usr/bin/env python3
"""Extrai de source/utils/o acessorista ui.js as funções e constantes SEM interface
(índice, caminhos, montagem SMB) para extension/host/lib/acessorista.shared.js."""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
lines = (root / 'source' / 'utils' / 'o acessorista ui.js').read_text(encoding='utf-8').replace('\r\n', '\n').split('\n')

FUNCTIONS = [
	'psCategoryLabel', 'psCategoryList', 'psNormalize', 'psSlashes', 'psPathKey', 'psToMac', 'psToPlatform',
	'psShellQuote', 'psLastFolderName', 'psAsArray', 'psAddUnique', 'psReadJSON', 'psIsFresh', 'psDownloadIndex',
	'psBuildIndex', 'psMountedSharePath', 'psMountShare', 'psExistingVolumeVariant', 'psResolveOnMac', 'psOpenFolder',
]
VARS = [
	'PS_WEBHOOK_URL', 'PS_WEBHOOK_BODY', 'PS_CACHE_TTL', 'PS_MIN_QUERY', 'PS_MAX_RESULTS', 'PS_SMB',
	'PS_CATEGORIES', 'PS_LOCAL_SOURCES', 'PS_ACCENTS',
]


def start_of(pattern):
	for i, line in enumerate(lines):
		if re.match(pattern, line):
			return i
	sys.exit('não encontrado em "o acessorista ui.js": ' + pattern)


def block(start, single_end):
	"""Funções terminam na primeira linha '}' (coluna 0); variáveis, na primeira linha que termina o literal."""
	if single_end(lines[start]):
		return lines[start:start + 1]

	for j in range(start + 1, len(lines)):
		if single_end(lines[j]):
			return lines[start:j + 1]

	sys.exit('bloco sem fim a partir da linha ' + str(start + 1))


out = ['// GERADO por extension/scripts/extract_acessorista.py a partir de source/utils/o acessorista ui.js — não edite.\n']

for name in VARS:
	i = start_of(r'^var ' + re.escape(name) + r'\b')
	out.append('\n'.join(block(i, lambda l: bool(re.search(r';\s*(//.*)?$', l)) and (l.startswith('var ') or re.match(r'^[\]}]+;', l)) )) + '\n')

for name in FUNCTIONS:
	i = start_of(r'^function ' + re.escape(name) + r'\(')
	out.append('\n'.join(block(i, lambda l: l == '}')) + '\n')

(root / 'extension' / 'host' / 'lib' / 'acessorista.shared.js').write_text('\n'.join(out), encoding='utf-8-sig')
print('ok  acessorista.shared.js (' + str(len(VARS)) + ' constantes, ' + str(len(FUNCTIONS)) + ' funções)')
