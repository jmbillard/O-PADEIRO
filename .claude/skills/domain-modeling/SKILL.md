---
name: domain-modeling
description: Constrói e afia o modelo de domínio de um projeto. Use ao discutir a terminologia do código, ao escrever ou editar um GLOSSARY.md, ou ao registrar ou editar um ADR.
---

# Modelagem de domínio

Construa e afie ativamente o modelo de domínio do projeto enquanto você projeta. Esta é a disciplina *ativa*: questionar termos, inventar cenários de casos extremos e registrar o glossário e as decisões no momento em que se cristalizam. (Apenas *ler* o `GLOSSARY.md` para pegar o vocabulário não é esta skill: isso é um hábito de uma linha que qualquer skill pode ter. Esta skill é para quando você está mudando o modelo, não só consumindo.)

## Estrutura de arquivos

A maioria dos repositórios tem um único contexto:

```
/
├── GLOSSARY.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

Se existir um `GLOSSARY-MAP.md` na raiz, o repositório tem vários contextos. O mapa aponta onde cada um fica:

```
/
├── GLOSSARY-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── GLOSSARY.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── GLOSSARY.md
│       └── docs/adr/
```

Crie arquivos sob demanda: só quando tiver algo para escrever. Se não existir `GLOSSARY.md`, crie um quando o primeiro termo for resolvido. Se não existir `docs/adr/`, crie quando o primeiro ADR for necessário.

## Durante a sessão

### Confronte com o glossário

Quando o usuário usar um termo que conflita com a linguagem existente no `GLOSSARY.md`, aponte isso na hora. "Seu glossário define 'cancelamento' como X, mas você parece querer dizer Y. Qual dos dois?"

### Afie a linguagem vaga

Quando o usuário usar termos vagos ou sobrecarregados, proponha um termo canônico preciso. "Você está dizendo 'conta': quer dizer o Cliente ou o Usuário? São coisas diferentes."

### Discuta cenários concretos

Quando relações do domínio estiverem em discussão, teste-as sob pressão com cenários específicos. Invente cenários que sondem casos extremos e obriguem o usuário a ser preciso sobre as fronteiras entre os conceitos.

### Confira com o código

Quando o usuário afirmar como algo funciona, verifique se o código concorda. Se encontrar uma contradição, exponha: "Seu código cancela Pedidos inteiros, mas você acabou de dizer que cancelamento parcial é possível. Qual está certo?"

### Atualize o GLOSSARY.md na hora

Quando um termo for resolvido, atualize o `GLOSSARY.md` ali mesmo. Não acumule para depois: registre à medida que acontece. Use o formato de [GLOSSARY-FORMAT.md](./GLOSSARY-FORMAT.md).

O `GLOSSARY.md` deve ficar totalmente livre de detalhes de implementação. Não trate o `GLOSSARY.md` como especificação (spec), rascunho ou repositório de decisões de implementação. Ele é um glossário e nada mais.

### Ofereça ADRs com parcimônia

Só ofereça criar um ADR quando as três condições forem verdadeiras:

1. **Difícil de reverter**: o custo de mudar de ideia depois é significativo
2. **Surpreendente sem contexto**: um leitor futuro vai se perguntar "por que fizeram assim?"
3. **Resultado de um trade-off real**: havia alternativas genuínas e você escolheu uma por motivos específicos

Se faltar qualquer uma das três, pule o ADR. Use o formato de [ADR-FORMAT.md](./ADR-FORMAT.md).
