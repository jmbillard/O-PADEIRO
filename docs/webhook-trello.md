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
| `fim` | `true` quando o card está finalizado (FINALIZADO ou CAIU, ou arquivado). |
| `atr` | a atração ligada ao card no banco (ARTE_producao), quando tem. |
| `fil` | `true` nos cards de filme (os filmes têm a lista deles na claquete: ficam de fora). |

- **Não quebra a versão anterior:** são campos novos; o padeiro de antes ignora. O webhook continua mandando **todos**
  os cards, como hoje: a busca de caminhos (acessorista) mostra todos.
- **O filtro é do padeiro:** viram sugestão só os cards com `at` nos **últimos 7 dias** e `fim` diferente de `true`.
  Card sem `at` (o índice de antes) não sugere nada.

## card → atração

O card ligado a uma atração no banco (`atr`) vale só para ela: `FUT FEM AMIS 29/11` → **AMISTÓSOS DA SELEÇÃO
FEMININA**, não FUTEBOL. O card sem vínculo vai pelo começo da claquete, com o nome e os padrões (`pattern`) da
atração no índice, a mesma regra da busca: `DOMINGAO 25/11` → **DOMINGÃO COM HUCK** (padrão `DOMINGAO`). Card que não
bate com nenhuma atração fica de fora.

A busca também procura pela claquete dos cards novos: o card ligado a uma atração traz ela para o grupo **NO TRELLO**
mesmo que o nome dela não bata com o digitado (`fut` → o card `FUT FEM AMIS 29/11` → **AMISTÓSOS DA SELEÇÃO
FEMININA**, ao lado do FUTEBOL). O clique no card recolhe a lista direto na pasta de projetos da atração (os `.aep`
que já estão lá, em **JÁ NA PASTA**), sem mostrar as pastas de dentro, como no filme.

## criar ou abrir

O card decide **qual atração**; a regra da atração decide **a pasta e o `.aep`**; o arquivo que já existe decide
**criar ou abrir**:

1. **atração** → o vínculo do card no banco (`atr`): `JANEIRO NA GLOBO` → **MOOD MENSAL**.
2. **pasta e `.aep`** → a atração que é um tipo com regra na aba PROJETO (sem `{atracao}` no caminho: MOOD MENSAL)
   usa a regra, e **o mês escrito na claquete do card vale mais que a data de hoje** nos tokens de mês e de ano
   (`{mes}`, `{mes_extenso}`, `{proximo_mes}`, `{proximo_mes_num}`, `{ano}`, `{ano_proximo_mes}`): `JANEIRO NA GLOBO`
   → `…/MOOD MENSAL/2027/01 JANEIRO` e `JANEIRO NA GLOBO.aep` (sem o ano escrito, o próximo janeiro). Com o card de
   outro mês, a regra de sempre (o próximo mês) continua na lista, logo abaixo. A atração sem regra usa a pasta de
   projetos dela (a do banco).
3. **criar ou abrir** → o `.aep` que a regra dá ainda não existe: **Criar projeto**. Já existe: pelo card, a janela
   vem em **abrir o existente** (fora do card, o padrão continua sendo **salvar como … 2**).

O nome do card não vira nome de arquivo: ele só diz a atração e, quando a regra usa mês, qual mês.
Com vários cards da mesma atração, aparece **um card por linha** (até 5; no tipo com regra, como o MOOD MENSAL, só o mais novo). O clique marca na lista **JÁ NA PASTA** o `.aep` daquele card: cada palavra da claquete é o começo de uma palavra do nome do arquivo (`PREMIO 2026 CH JOR ESP G5` → `MELHOR CHAMADA DE JORNALISMO E ESPORTE G5.aep`), o botão vira **Abrir projeto**. Empate ou nada em comum: nada marcado.

## vindo das Produções do PROMeiro

Com o endereço do **PROMeiro** na configuração (aba **BUSCAR**, da equipe), cada computador pede a sua **chave do
Padeiro** sozinho, na primeira vez que a barra abre (`POST /api/padeiro/cadastro`, com o usuário do computador, o
nome do computador, o sistema e a sigla). A chave fica guardada neste computador (`promeiro.json`, na pasta de dados
do usuário, ao lado do `machine_config.json`) e começa **pendente**: até um administrador ligar a chave a um designer
(PROMeiro › Cadastros › Padeiros), a barra mostra um aviso ao abrir e a configuração > buscar diz que falta aprovar.

Com a chave **ligada**, o grupo **NO TRELLO** lê as Produções em Entrada e Produzindo do PROMeiro
(`GET /api/padeiro/producoes`, no mesmo formato `trello` de cima, com a chave no cabeçalho `X-Chave-Do-Padeiro`), no
lugar dos cards do webhook. Vale toda Produção aberta, sem o limite dos 7 dias (o PROMeiro já deixa de fora as
entregues); os filmes (`fil`) continuam de fora. A lista é lida ao abrir a claquete e de novo a cada minuto, em
segundo plano.

- **Sem o endereço, no modo local, com a chave pendente ou com o PROMeiro fora do ar:** tudo como antes, pelo
  webhook do n8n. Nenhuma falha do PROMeiro aparece como erro.
- **Chave revogada, ou que o PROMeiro não conhece mais:** o Padeiro pede outra sozinho, que volta a ficar pendente.
- **Quem fala com o PROMeiro** é o Node do painel (`js/promeiro.js`), sem travar o After Effects; o host
  (`host/promeiro.jsx`, ES3) só diz o usuário, o computador, o sistema e a sigla, e guarda a chave.
- **Teste:** `PROMEIRO=/caminho/do/TEXTAO NODE_PATH=$(npm root -g) node extension/scripts/e2e-promeiro.js` sobe um
  PROMeiro de teste e passa pelos painéis no navegador (mock-host): pedir a chave, pendente, ligada, revogada, fora
  do ar e sem endereço.

## onde está no código

- `extension/client/js/attractions.js`: `recentCards()` filtra os cards e `cardFor()` acha o card de cada atração;
  `findAttractions()` põe a atração com card primeiro (`trello` em cada resultado).
- `extension/client/js/project.js`: `cardRow()` desenha a linha e `cardWhen()` escreve quando o card entrou.
- `extension/client/js/mock-host.js`: o card de exemplo do Domingão (modo de teste: digite `domingao`).
- `extension/client/js/promeiro.js` e `extension/host/promeiro.jsx`: a chave do Padeiro e a lista das Produções;
  `attractions.js` troca os cards do webhook pelos do PROMeiro (`currentCards()`).
