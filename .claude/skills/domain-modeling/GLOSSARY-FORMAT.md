# Formato do GLOSSARY.md

## Estrutura

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
{A one or two sentence description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account
```

## Regras

- **Tome partido.** Quando existirem várias palavras para o mesmo conceito, escolha a melhor e liste as outras em `_Avoid_`.
- **Mantenha as definições enxutas.** Uma ou duas frases no máximo. Defina o que a coisa É, não o que ela faz.
- **Inclua só termos específicos do contexto deste projeto.** Conceitos gerais de programação (timeouts, tipos de erro, padrões utilitários) não entram, mesmo que o projeto os use bastante. Antes de adicionar um termo, pergunte: este é um conceito exclusivo deste contexto ou um conceito geral de programação? Só o primeiro entra.
- **Agrupe os termos em subtítulos** quando surgirem grupos naturais. Se todos os termos pertencem a uma única área coesa, uma lista simples basta.

## Repositórios com um ou vários contextos

**Contexto único (a maioria dos repositórios):** Um `GLOSSARY.md` na raiz do repositório.

**Vários contextos:** Um `GLOSSARY-MAP.md` na raiz do repositório lista os contextos, onde cada um fica e como se relacionam entre si:

```md
# Glossary Map

## Contexts

- [Ordering](./src/ordering/GLOSSARY.md): receives and tracks customer orders
- [Billing](./src/billing/GLOSSARY.md): generates invoices and processes payments
- [Fulfillment](./src/fulfillment/GLOSSARY.md): manages warehouse picking and shipping

## Relationships

- **Ordering → Fulfillment**: Ordering emits `OrderPlaced` events; Fulfillment consumes them to start picking
- **Fulfillment → Billing**: Fulfillment emits `ShipmentDispatched` events; Billing consumes them to generate invoices
- **Ordering ↔ Billing**: Shared types for `CustomerId` and `Money`
```

A skill deduz qual estrutura se aplica:

- Se existir `GLOSSARY-MAP.md`, leia-o para encontrar os contextos
- Se existir só um `GLOSSARY.md` na raiz, é contexto único
- Se nenhum dos dois existir, crie um `GLOSSARY.md` na raiz sob demanda, quando o primeiro termo for resolvido

Quando houver vários contextos, deduza a qual deles o assunto atual se refere. Se não estiver claro, pergunte.
