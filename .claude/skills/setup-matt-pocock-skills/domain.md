# Documentos de domínio

Como as skills de engenharia devem consumir a documentação de domínio deste repositório ao explorar a base de código.

## Antes de explorar, leia isto

- **`GLOSSARY.md`** na raiz do repositório, ou
- **`GLOSSARY-MAP.md`** na raiz do repositório, se existir: ele aponta para um `GLOSSARY.md` por contexto. Leia cada um que for relevante para o assunto.
- **`docs/adr/`**: leia os ADRs que tocam a área em que você vai trabalhar. Em repositórios com vários contextos, confira também `src/<context>/docs/adr/` para decisões restritas a um contexto.

Se algum desses arquivos não existir, **siga em silêncio**. Não aponte a ausência deles; não sugira criá-los de antemão. A skill `/domain-modeling` (acessada via `/grill-with-docs` e `/improve-codebase-architecture`) os cria sob demanda, quando termos ou decisões são de fato resolvidos.

## Estrutura de arquivos

Repositório de contexto único (a maioria dos repositórios):

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Repositório com vários contextos (presença de `GLOSSARY-MAP.md` na raiz):

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## Use o vocabulário do glossário

Quando a sua saída nomear um conceito de domínio (no título de uma issue, numa proposta de refatoração, numa hipótese, no nome de um teste), use o termo como definido em `GLOSSARY.md`. Não escorregue para sinônimos que o glossário evita explicitamente.

Se o conceito de que você precisa ainda não estiver no glossário, isso é um sinal: ou você está inventando uma linguagem que o projeto não usa (reconsidere) ou há uma lacuna real (anote para a `/domain-modeling`).

## Aponte conflitos com ADRs

Se a sua saída contradisser um ADR existente, deixe isso explícito em vez de passar por cima em silêncio:

> _Contradiz o ADR-0007 (pedidos com event sourcing), mas vale reabrir porque…_
