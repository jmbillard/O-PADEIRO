# cards do Trello n'O PROJETISTA

Digitando n'**O PROJETISTA** (a janela de projeto), os **cards novos no Trello** que batem com o texto vêm primeiro, no grupo
**NO TRELLO**: um card por linha, com o **nome da atração** em destaque, a claquete embaixo (e o designer, quando o card
não é seu) e o **status** como etiqueta. Os cards do designer desta máquina vêm primeiro, marcados **seu** (a regra
está em [projeto.md](projeto.md#1--qual-atração)). O card é só a referência: o clique abre a atração (a pasta dela e
os `.aep` que já estão lá). Nem a pasta nem o arquivo levam o nome do card, e o "o que é" fica vazio.

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
| `fim` | `true` quando o card está finalizado (FINALIZADO ou CAIU, ou arquivado). |
| `atr` | a atração ligada ao card no banco (ARTE_producao), quando tem. |
| `des` | o designer do card, o nome completo (`Cristina Vianna`): O PROJETISTA mostra e compara com o login da máquina (o **seu**). |
| `st` | o status do card (`PRODUZINDO`, `EM APROVAÇÃO`…): vira a etiqueta da linha. sem status, sem etiqueta. |
| `fil` | `true` nos cards de filme: o card vai para o filme cujo `trello` (no [webhook dos filmes](webhook-filmes.md)) é o link dele; sem o filme na lista dos recentes, fica de fora. |
| `card` | o id do card no Trello: é por ele que o card de filme acha o filme (o id está no link do `trello` do filme). |

- **Não quebra a versão anterior:** são campos novos; o padeiro de antes ignora. O webhook continua mandando **todos**
  os cards, como hoje: a busca de caminhos (acessorista) mostra todos.
- **O filtro é do padeiro:** viram sugestão só os cards com `at` nos **últimos 7 dias** e `fim` diferente de `true`.
  Card sem `at` (o índice de antes) não sugere nada.

## card → atração

O card ligado a uma atração no banco (`atr`) vale só para ela: `FUT FEM AMIS 29/11` → **AMISTÓSOS DA SELEÇÃO
FEMININA**, não FUTEBOL. O card sem vínculo vai pelo começo da claquete, com o nome e os padrões (`pattern`) da
atração no índice, a mesma regra da busca: `DOMINGAO 25/11` → **DOMINGÃO COM HUCK** (padrão `DOMINGAO`). O card que
não bate com nenhuma atração aparece **sem atração** e vira uma **atração nova**: o nome sugerido é o começo da
claquete sem a data, a versão e o ano (`RIO SUMMER BEATS 5-12` → `RIO SUMMER BEATS`), editável, com os chips dos
tipos para escolher onde criar. O card de filme leva ao filme (a pasta do filme, ADR 0004), com o pôster.

A atração que tem card não aparece de novo no grupo ATRAÇÕES (no tipo fixo, só a do mês do card sai; a regra de
sempre fica), e o filme que tem card não aparece de novo em FILMES.

A busca também procura pela claquete dos cards novos: o card ligado a uma atração traz ela para o grupo **NO TRELLO**
mesmo que o nome dela não bata com o digitado (`fut` → o card `FUT FEM AMIS 29/11` → **AMISTÓSOS DA SELEÇÃO
FEMININA**, ao lado do FUTEBOL). O clique no card recolhe a lista direto na pasta de projetos da atração (os `.aep`
que já estão lá, em **JÁ NA PASTA**), sem mostrar as pastas de dentro, como no filme. Embaixo do campo, uma linha do
card fica como referência (a claquete, o designer ou **seu**, a atração e o status). Um ano escrito na claquete
(`VEM AI(2027)`) vira o ano do projeto, com a nota **pelo card** no chip do ano.

## criar ou abrir

O card decide **qual atração**; a regra da atração decide **a pasta e o `.aep`**; o arquivo que já existe decide
**criar ou abrir**:

1. **atração** → o vínculo do card no banco (`atr`): `JANEIRO NA GLOBO` → **MOOD MENSAL**.
2. **pasta e `.aep`** → a atração que é um tipo com regra na aba TIPOS DE PROJETO (sem `{atracao}` no caminho: MOOD MENSAL)
   usa a regra, e **o mês escrito na claquete do card vale mais que a data de hoje** nos tokens de mês e de ano
   (`{mes}`, `{mes_extenso}`, `{proximo_mes}`, `{proximo_mes_num}`, `{ano}`, `{ano_proximo_mes}`): `JANEIRO NA GLOBO`
   → `…/MOOD MENSAL/2027/01 JANEIRO` e `JANEIRO NA GLOBO.aep` (sem o ano escrito, o próximo janeiro). Com o card de
   outro mês, a regra de sempre (o próximo mês) continua na lista, logo abaixo. A atração sem regra usa a pasta de
   projetos dela (a do banco).
3. **criar ou abrir** → os `.aep` da pasta (e das subpastas logo dentro dela) que batem com a claquete ficam no topo
   do **JÁ NA PASTA**, em destaque (a etiqueta **CARD**): só um, ele vem marcado (**Abrir projeto**); dois ou mais,
   você escolhe; nenhum, a janela fica pronta para criar (**Criar projeto**).

O nome do card não vira nome de arquivo: ele só diz a atração e, quando a regra usa mês, qual mês.
Com vários cards da mesma atração, aparece **um card por linha** (até 4 no grupo; com mais, *+N outros: continue digitando*). O clique destaca na lista **JÁ NA PASTA** os `.aep` daquele card: cada palavra da claquete é o começo de uma palavra do nome do arquivo (`PREMIO 2026 CH JOR ESP G5` → `MELHOR CHAMADA DE JORNALISMO E ESPORTE G5.aep`); valem os que batem com mais palavras. Só um: ele vem marcado e o botão vira **Abrir projeto**. Empate: os empatados em destaque, nada marcado. Nada em comum: nada marcado.

## onde está no código

- `extension/client/js/attractions.js`: `recentCards()` filtra os cards (com `des`, `st` e `fil`),
  `guessCardAttractions()` liga o card sem `atr` pela claquete e `findAttractions()` devolve os cards junto (`cards`).
- `extension/client/js/projetista.js`: `pickGroups()` monta os grupos (as regras num ponto só, também no editor),
  `cardTarget()` diz o que o card aponta, `loginMatches()` é a regra do **seu**, `cardRow()` desenha a linha e
  `cardFiles()` acha os `.aep` do card.
- `extension/client/js/mock-host.js`: os cards de exemplo (`mockCards`: digite `premio`, `summer`, `encanto`, `vem ai`,
  `mood` ou `domingao`).
