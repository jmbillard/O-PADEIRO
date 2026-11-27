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

## vindo das Produções do PROMeiro

Com o endereço do **PROMeiro** na configuração (aba **BUSCAR**, da equipe: a seção `promeiro`, chave `PROMEIRO` do
`O_PADEIRO_GLOBAL_config.json`), cada computador pede a sua **chave do Padeiro** sozinho, na primeira vez que a barra
abre (`POST /api/padeiro/cadastro`, com o login, o nome do computador, o sistema e a sigla). A chave fica guardada
na configuração deste computador (a seção `chaveDoPromeiro`: `computador_promeiro.json`, na pasta de dados, ao lado
do `computador_config.json`; o `promeiro.json` de antes ainda é lido enquanto ela não existe) e começa **pendente**: até um administrador ligar a chave a um designer
(PROMeiro › Cadastros › Padeiros), a barra mostra um aviso ao abrir e a configuração > buscar diz que falta aprovar.

Com a chave **ligada**, o grupo **NO TRELLO** lê as Produções em Entrada e Produzindo do PROMeiro
(`GET /api/padeiro/producoes`, no mesmo formato `trello` de cima, com a chave no cabeçalho `X-Chave-Do-Padeiro`), no
lugar dos cards do webhook. Vale toda Produção aberta, sem o limite dos 7 dias (o PROMeiro já deixa de fora as
entregues). A Produção de filme (`fil`) entra como os cards de filme do webhook: O PROJETISTA liga ao filme pelo
card (o `trello` do filme no webhook dos filmes). A lista é lida ao abrir O PROJETISTA e de novo a cada minuto, em
segundo plano; `des` e `st` não vêm do PROMeiro (sem o **seu** e sem a etiqueta do status).

- **O webhook do projeto** (o n8n, [docs/webhook-projeto.md](webhook-projeto.md)) continua a ir com ou sem a chave:
  o registro do projeto, a atração nova e o designer no card são dele; o aviso do Padeiro é a parte do PROMeiro.

- **Sem o endereço, no modo local, com a chave pendente ou com o PROMeiro fora do ar:** tudo como antes, pelo
  webhook do n8n. Nenhuma falha do PROMeiro aparece como erro.
- **Chave revogada, ou que o PROMeiro não conhece mais:** o Padeiro pede outra sozinho, que volta a ficar pendente.
- **Quem fala com o PROMeiro** é o Node do painel (`js/promeiro.js`), sem travar o After Effects; o host
  (`host/promeiro.jsx`, ES3) só diz o login, o computador, o sistema e a sigla, e guarda a chave.
- **Teste:** `PROMEIRO=/caminho/do/TEXTAO NODE_PATH=$(npm root -g) node extension/scripts/e2e-promeiro.js` sobe um
  PROMeiro de teste e passa pelos painéis no navegador (mock-host): pedir a chave, pendente, ligada, o aviso ao abrir
  pelo card, a fila sem rede (e o reenvio), o aviso repetido, revogada, fora do ar e sem endereço.

### o aviso do Padeiro (abrir ou criar o projeto)

Abrir ou criar o projeto pelo **card** ou pela **Produção** do grupo NO TRELLO, ou por um **filme**, avisa o PROMeiro
(`POST /api/padeiro/aviso`, com a chave no cabeçalho), que faz o mesmo que o botão **Peguei** da tela de produções: o
designer da chave entra no card do Trello e na Produção, com a origem "Padeiro" na linha do tempo. O aviso leva:

- `aviso`: um identificador novo a cada abertura (`pad-…`). O mesmo aviso mandado de novo (a resposta que se perdeu,
  duas janelas mandando a fila ao mesmo tempo) não grava de novo: o PROMeiro responde `{ repetido: true }`;
- `abertoEm`: a hora em que o projeto foi aberto ou criado (ISO), e não a do envio;
- `producao` (a Produção do NO TRELLO) e `card` (o card do Trello). O card do webhook, sem a Produção, vai só com o
  `card`. O filme vai pela Produção dele na lista do PROMeiro (a de filme, com o título na atração ou no começo da
  claquete); o filme sem Produção não avisa nada.

Só o clique num card do NO TRELLO conta: digitar a atração e criar o projeto, sem o card, não avisa.

**A fila sem rede.** O aviso entra primeiro na fila deste computador (`promeiro-fila.json`, na pasta de dados, ao lado
do `computador_promeiro.json`; `host/promeiro.jsx`) e só sai dela quando o PROMeiro responde. Quem manda é o Node do painel, sem
esperar a resposta para fechar a janela nem travar o After. A fila vai de novo ao abrir a barra e O PROJETISTA e, com a
barra aberta, a cada 3 minutos. O que acontece com cada aviso:

- **entregue** (200), **repetido**, **mal feito** (400), **a Produção que não existe** (404) ou **que já mudou**
  (409): sai da fila;
- **a chave que não vale** (401, 403) ou **pendente**: sai da fila (o PROMeiro recusaria);
- **sem rede**, o PROMeiro fora do ar, um erro dele ou do Trello (502, 503): fica para depois, e os que vêm atrás dele
  também (a fila vai em ordem: nenhum passa à frente);
- **no modo local** ou sem o endereço do PROMeiro: fica até voltar; o aviso pedido em outro endereço sai;
- no máximo 100 avisos, dos últimos 30 dias.

**As ações da janela PROMeiro · produções** (jmbillard/TEXTAO#150) vão pela mesma fila: pegar (o aviso), marcar a
arte, o fogo, entregar, voltar e desfazer (`POST /api/padeiro/{aviso,arte,fogo,entregar,voltar,desfazer}`). Cada uma
leva o identificador (`acao`) e a hora em que foi feita (`feitaEm`); na fila, também a `rota`, os `dados` dela e a
claquete. Sem rede, a janela atualiza na hora, como se a ação tivesse ido, a caixinha diz "Sem rede: vai quando a rede
voltar." e o topo conta as guardadas ("Dora · 2"); com ações guardadas, a janela manda a fila de novo a cada 8 s.
Quando a fila de uma Produção esvazia, a janela lê a Produção do PROMeiro, que é a verdade. A ação recusada de vez sai
da fila e fica em `promeiro-recusadas.json` (na mesma pasta) até a janela mostrar na caixinha. O Desfazer sem rede tira
da fila a ação que ainda não foi; a que já foi ganha um desfazer na fila, com o identificador dela (`desfaz`). Teste:
`PROMEIRO=/caminho/do/TEXTAO NODE_PATH=$(npm root -g) node extension/scripts/e2e-janela.js`.

## onde está no código

- `extension/client/js/attractions.js`: `recentCards()` filtra os cards (com `des`, `st` e `fil`),
  `guessCardAttractions()` liga o card sem `atr` pela claquete e `findAttractions()` devolve os cards junto (`cards`).
- `extension/client/js/projetista.js`: `pickGroups()` monta os grupos (as regras num ponto só, também no editor),
  `cardTarget()` diz o que o card aponta, `loginMatches()` é a regra do **seu**, `cardRow()` desenha a linha e
  `cardFiles()` acha os `.aep` do card.
- `extension/client/js/mock-host.js`: os cards de exemplo (`mockCards`: digite `premio`, `summer`, `encanto`, `vem ai`,
  `mood` ou `domingao`).
- `extension/client/js/promeiro.js` e `extension/host/promeiro.jsx`: a chave do Padeiro e a lista das Produções;
  `attractions.js` troca os cards do webhook pelos do PROMeiro (`currentCards()`), também na resposta do host
  (`findAttractions()`, no navegador de teste).
- o aviso do Padeiro: `projetista.js` (`avisoTarget()` e `avisar()`, ao abrir ou criar), `promeiro.js` (`notify()` e
  `flush()`, a fila), `attractions.js` (`filmProduction()`, a Produção do filme) e `host/promeiro.jsx`
  (`promeiroQueue`, `promeiroQueueAdd`, `promeiroQueueDrop`, `promeiroRecusadas`); `bar.js` manda a fila ao abrir e
  de tempos em tempos.
- as ações da janela na fila: `promeiro.js` (`windowAction()`, `take()`, `unqueue()`, `refused()`) e
  `promeiro-janela.js` (`guardar()`, `lerFila()`, a Produção otimista).
