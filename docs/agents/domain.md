# Documentos de domínio

Como as skills de engenharia leem a documentação de domínio deste repositório ao explorar o código.

## Antes de explorar, leia

- **`GLOSSARY.md`** na raiz do repositório.
- **`docs/adr/`**: as ADRs que tocam a área em que você vai mexer.

Se algum desses arquivos não existir, **siga em frente em silêncio**. Não aponte a ausência nem sugira criá-los
de antemão. A skill `/domain-modeling` (pelo `/grill-with-docs` e pelo `/improve-codebase-architecture`) cria quando
termos ou decisões forem de fato resolvidos.

## Estrutura

Contexto único (este repositório):

```
/
├── GLOSSARY.md
├── docs/adr/
└── extension/ (client/, host/, scripts/)
```

## Use o vocabulário do glossário

Quando o que você escreve nomeia um conceito do domínio (título de issue, proposta de refatoração, hipótese, nome de
teste), use o termo como está no `GLOSSARY.md`. Não troque por sinônimos que o glossário manda evitar.

Se o conceito não está no glossário, é um sinal: ou você está inventando uma linguagem que o projeto não usa
(repense) ou há uma lacuna de verdade (anote para o `/domain-modeling`).

## Aponte conflitos com ADRs

Se o que você produz contradiz uma ADR, diga isso explicitamente em vez de passar por cima em silêncio:

> _Contradiz a ADR-0001 (o card só aponta a atração), mas vale reabrir porque…_
