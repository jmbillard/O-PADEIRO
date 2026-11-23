# cards do Trello na claquete

Digitando na claquete (janela **PROJETO**), a atração com **card novo no Trello** vem primeiro, no grupo **NO
TRELLO**, com o card embaixo (`card DOMINGAO 25/11 · há 2 dias · ANA`) e a etiqueta **CARD NOVO**. O card é só a
referência: o clique abre a atração (a pasta dela e os `.aep` que já estão lá), como clicar nela na lista. Nem a pasta
nem o arquivo levam o nome do card, e o "o que é" fica vazio.

## o que muda no webhook do buscar

Os cards já vêm no índice da busca (`GET …/webhook/buscar`, o campo `trello`). Cada card ganha dois campos
**opcionais**:

```json
"trello": [
  { "claq": "DOMINGAO 25/11", "red": "ANA", "ed": "BETO", "card": "aB12cD",
    "at": "2026-11-21",
    "fim": false }
]
```

| campo | o que é |
| --- | --- |
| `at` | a data em que o card entrou, `AAAA-MM-DD` (ou data e hora ISO). |
| `fim` | `true` quando o card está finalizado (na lista de concluídos). |

- **Não quebra a versão anterior:** são campos novos; o padeiro de antes ignora. O webhook continua mandando **todos**
  os cards, como hoje: a busca de caminhos (acessorista) mostra todos.
- **O filtro é do padeiro:** viram sugestão só os cards com `at` nos **últimos 7 dias** e `fim` diferente de `true`.
  Card sem `at` (o índice de antes) não sugere nada.

## card → atração

Pelo começo da claquete do card, com o nome e os padrões (`pattern`) da atração no índice, a mesma regra da busca:
`DOMINGAO 25/11` → **DOMINGÃO COM HUCK** (padrão `DOMINGAO`). Card que não bate com nenhuma atração fica de fora.
Com vários cards da mesma atração, aparece uma linha só, com o mais novo (`+ 1 card`).

## onde está no código

- `extension/client/js/attractions.js`: `recentCards()` filtra os cards e `cardFor()` acha o card de cada atração;
  `findAttractions()` põe a atração com card primeiro (`trello` em cada resultado).
- `extension/client/js/project.js`: `cardRow()` desenha a linha e `cardWhen()` escreve quando o card entrou.
- `extension/client/js/mock-host.js`: o card de exemplo do Domingão (modo de teste: digite `domingao`).
