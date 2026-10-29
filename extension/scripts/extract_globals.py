#!/usr/bin/env python3
"""Extrai de source/globals.js (UTF-16) os blocos compartilhados com a extensão
e grava em extension/host/lib/globals.shared.js (UTF-8)."""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
text = (root / 'source' / 'globals.js').read_bytes().decode('utf-16').replace('\r\n', '\n').lstrip('﻿')

NAMES = ['DRIVE_MAP', 'UNC_TO_DRIVE', 'renameRefArray', 'defaultTemplateConfigObj', 'globalSeparator', 'lol', 'relax']


def block(name):
	m = re.search(r'^var ' + re.escape(name) + r'\b', text, re.M)
	if not m:
		sys.exit('bloco não encontrado em globals.js: ' + name)
	depth, i, in_str = 0, m.start(), None
	while i < len(text):
		c = text[i]
		if in_str:
			if c == '\\':
				i += 1
			elif c == in_str:
				in_str = None
		elif c in '\'"':
			in_str = c
		elif c in '{[(':
			depth += 1
		elif c in '}])':
			depth -= 1
		elif c == ';' and depth == 0:
			return text[m.start():i + 1]
		i += 1
	sys.exit('bloco sem fim: ' + name)


out = ['// GERADO por extension/scripts/extract_globals.py a partir de source/globals.js — não edite.\n']
for n in NAMES:
	out.append(block(n) + '\n')
	if n == 'UNC_TO_DRIVE':
		out.extend(l + '\n' for l in text.split('\n') if l.startswith('UNC_TO_DRIVE['))

(root / 'extension' / 'host' / 'lib' / 'globals.shared.js').write_text('\n'.join(out), encoding='utf-8-sig')
print('ok  globals.shared.js (' + ', '.join(NAMES) + ')')
