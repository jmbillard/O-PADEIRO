# O Padeiro

A extensão do After Effects da equipe de arte da Globo Promo (CEP: painéis em `extension/client`, host ExtendScript
ES3 em `extension/host`). Tudo em pt-BR: textos, comentários, commits e documentos.

Antes de subir: as 5 checagens de `extension/scripts` (`check-footers`, `check-ternary`, `check-corners`,
`check-focus-crop`, `check-scroll-corners`), com `NODE_PATH=$(npm root -g)`. O host não aceita sintaxe fora do ES3.

## Skills dos agentes (Agent skills)

As skills do Matt Pocock, traduzidas para pt-BR, ficam em `.claude/skills/` (veja `.claude/skills/README.md`).
O fluxo do dia a dia: `/grill-with-docs` (interrogatório + glossário) → `/to-spec` → `/to-tickets` → `/implement`.

### Rastreador de issues

As issues e specs ficam nas Issues do GitHub (`jmbillard/o-padeiro`). Veja `docs/agents/issue-tracker.md`.

### Rótulos de triagem

Os cinco papéis da triagem em pt-BR (`precisa-triagem`, `precisa-info`, `pronto-para-agente`, `pronto-para-humano`,
`wontfix`). Veja `docs/agents/triage-labels.md`.

### Documentos de domínio

Contexto único: `GLOSSARY.md` e `docs/adr/` na raiz. Veja `docs/agents/domain.md`.
