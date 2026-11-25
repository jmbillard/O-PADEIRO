# webhook do projeto

O que **O PROJETISTA** (a janela de projeto) manda ao n8n e o que espera de volta. O padeiro avisa o n8n, em segundo
plano, ao criar o projeto:

- de uma **atração nova** (uma que ainda não está no índice da busca): o n8n cadastra a atração no **banco das
  atrações**. Depois disso, a próxima busca já a acha, e o próximo designer não cria outra pasta para a mesma atração;
- de uma atração escolhida por um **card** do Trello: o n8n põe o **designer** no card (achado na tabela de
  designers) e, se a atração é nova, também liga o card à atração nova no banco.

Este é o primeiro webhook que pede mudanças no banco: os outros (a [busca](acessorista.md), os
[filmes recentes](webhook-filmes.md) e o [Trello](webhook-trello.md)) só leem.

> Por enquanto, só o momento **criado**. Os momentos **aberto** (o `.aep` aberto pelo JÁ NA PASTA de um card) e
> **alterado** (o Alterar ligando o projeto a um card) vêm na #51: o formato abaixo já tem o lugar deles.

## endereço

```
POST https://workflows.jmbillard.com/webhook/projeto
```

O endereço fica na configuração da equipe: configuração > **TIPOS DE PROJETO** > **webhook do projeto** (a chave
`WEBHOOK_DO_PROJETO` do arquivo da equipe). **Vazio, nada é enviado**: é o padrão até o workflow existir; o endereço
acima é só o exemplo que aparece no campo. A validação é a mesma da URL do registro de uso (`http://` ou `https://`,
sem espaços, aspas nem símbolos do terminal): uma URL inválida é recusada ao salvar (`#PAD_089`).

## quando o padeiro envia

- ao **criar** o projeto de uma atração nova pela janela de projeto (os chips dos tipos, ou o card sem atração): o
  cadastro (e, com o card, o card ligado e o designer no card);
- ao **criar** o projeto de uma atração escolhida por um card (a atração do índice, o tipo fixo como MOOD MENSAL ou o
  filme do card): só para pôr o designer no card;
- **não** envia para a atração que já está no índice da busca escolhida sem card (pela busca, ou pelo tipo fixo e o
  filme sem card), nem quando só se olha um card na lista, sem criar;
- **não** envia no **modo local**;
- **não** envia com o endereço vazio.

**A criação nunca espera nem falha pelo envio.** O projeto é criado e salvo primeiro; o envio sai depois, em segundo
plano, pelo Node do painel (`POST` com JSON, tempo máximo de 8 s). A janela mostra o aviso e só então fecha. Sem o
Node (o plano B, ADR 0003), o host envia pelo `curl` (como o registro de uso), com o mesmo tempo máximo.

## envio

A atração nova, sem card:

```json
{
  "momento": "criado",
  "atracao": {
    "nome": "LA NA MINHA TERRA",
    "tipo": "PROGRAMAS",
    "nova": true,
    "quadro": "",
    "pasta": "//vfx-ml-sp/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/LA NA MINHA TERRA/2026",
    "output": "//vfx-ml-sp/EDIT_IN_PLACE/PROMO/cdesign_output/PROGRAMAS/LA NA MINHA TERRA",
    "aep": "//vfx-ml-sp/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/LA NA MINHA TERRA/2026/01_PROJETOS/LA NA MINHA TERRA CHAMADA.aep"
  },
  "card": null,
  "designer": { "login": "jmbillard", "sigla": "JMBILLARD" },
  "versao": "2.0 beta9"
}
```

| campo | o que é |
| --- | --- |
| `momento` | `criado` (o projeto criado). `aberto` (JÁ NA PASTA) e `alterado` (o Alterar) ficam para a #51. |
| `atracao.nome` | o nome da atração, como foi digitado ou tirado da claquete. |
| `atracao.tipo` | o tipo de projeto (PROGRAMAS, NOVELAS, SHOWS…), o da aba TIPOS DE PROJETO. |
| `atracao.nova` | `true`: a atração não estava no índice da busca (o n8n cadastra). `false`: a atração conhecida, escolhida por um card (o n8n só põe o designer no card). |
| `atracao.quadro` | as pastas abaixo da atração, quando o projeto foi criado num quadro (`DANCA DOS FAMOSOS/FINAL`); `""` sem quadro. |
| `atracao.pasta` | a pasta do projeto (a estrutura com `01_PROJETOS`, `02_ARQUIVOS`…), como o padeiro mostra o caminho. |
| `atracao.output` | a pasta de output, se existir; `""` quando o designer pulou o output. |
| `atracao.aep` | o caminho do `.aep` salvo. |
| `card` | o card do Trello de onde veio a atração, ou `null` (a atração nova escolhida sem card). |
| `card.id` | o id do card no Trello (o `card` do [índice do Trello](webhook-trello.md)). |
| `card.claquete` | a claquete do card (o `claq` do índice), para o texto dos avisos e o registro. |
| `designer.login` | o login da máquina, como o sistema o dá (o usuário do sistema). |
| `designer.sigla` | a sigla do designer (a deste computador ou, sem ela, a do login). |
| `versao` | a versão do padeiro. |

Os caminhos vêm como o padeiro os mostra: o caminho de rede (`//servidor/share/…`) ou o do Mac (`/Volumes/…`).

**O card só vai no envio** (ADR 0001: o card só aponta a atração). O padeiro não o grava nos metadados do projeto
(o XMP do `.aep`): a janela passa o card ao host só para montar o envio, junto do `.aep` salvo.

A atração nova a partir de um card sem atração (o n8n cadastra, liga o card a ela e põe o designer no card):

```json
{
  "momento": "criado",
  "atracao": {
    "nome": "RIO SUMMER BEATS",
    "tipo": "SHOWS",
    "nova": true,
    "quadro": "",
    "pasta": "//vfx-ml-sp/VFX/imagem/drive_l/Fileserver_3/SHOWS/RIO SUMMER BEATS/2026",
    "output": "//vfx-ml-sp/EDIT_IN_PLACE/PROMO/cdesign_output/SHOWS/RIO SUMMER BEATS",
    "aep": "//vfx-ml-sp/VFX/imagem/drive_l/Fileserver_3/SHOWS/RIO SUMMER BEATS/2026/01_PROJETOS/RIO SUMMER BEATS TESTE.aep"
  },
  "card": { "id": "6750aa11bb22cc33dd44ee03", "claquete": "RIO SUMMER BEATS 5-12" },
  "designer": { "login": "jmbillard", "sigla": "JMBILLARD" },
  "versao": "2.0 beta9"
}
```

A atração conhecida escolhida por um card (o n8n só põe o designer no card; não cadastra nada):

```json
{
  "momento": "criado",
  "atracao": {
    "nome": "Domingão com Huck",
    "tipo": "",
    "nova": false,
    "quadro": "",
    "pasta": "//vfx-ml-sp/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/DOMINGAO COM HUCK/2026",
    "output": "//vfx-ml-sp/EDIT_IN_PLACE/PROMO/cdesign_output/PROGRAMAS/DOMINGAO COM HUCK/2026",
    "aep": "//vfx-ml-sp/VFX/imagem/drive_l/Fileserver_3/PROGRAMAS/DOMINGAO COM HUCK/2026/01 PROJETOS/DOMINGAO COM HUCK CHAMADA.aep"
  },
  "card": { "id": "6750aa11bb22cc33dd44ee09", "claquete": "DOMINGAO 25/11" },
  "designer": { "login": "jmbillard", "sigla": "JMBILLARD" },
  "versao": "2.0 beta9"
}
```

Na atração conhecida, o `tipo` pode vir vazio (o índice da busca não o guarda).

## resposta

Uma lista curta do que o n8n fez, cada item com um **código** e um **texto**:

```json
{
  "itens": [
    { "codigo": "atracaoCadastrada", "texto": "LA NA MINHA TERRA cadastrada no banco das atrações" }
  ]
}
```

O padeiro mostra os textos juntos, na linha do rodapé da janela de projeto: **verde** quando todos os itens deram
certo, **amarelo** quando algum não deu. Sem `texto`, vale o texto padrão do código.

| código | cor | texto padrão | quando |
| --- | --- | --- | --- |
| `atracaoCadastrada` | verde | `<nome> cadastrada no banco das atrações` | a atração entrou no banco agora. |
| `atracaoJaExistia` | verde | `<nome> já estava no banco das atrações` | outra pessoa já tinha cadastrado: nada foi duplicado. |
| `cardLigado` | verde | `card ligado à atração` | o card ficou ligado à atração nova no banco (só com `atracao.nova` e `card`). |
| `designerEntrouNoCard` | verde | `você entrou no card` | o designer foi posto no card como membro. |
| `designerJaEstavaNoCard` | verde | `você já estava no card` | o designer já era membro do card: nada mudou. |
| `designerNaoEncontrado` | amarelo | `o n8n não achou você na tabela de designers: peça para incluírem` | nem o login nem a sigla estão na tabela de designers: o card fica sem o designer. |
| `erro` | amarelo | `o n8n não conseguiu fazer o pedido: confira à mão` | o workflow falhou (mande o motivo no `texto`). |

- **Também aceito:** a resposta embrulhada pelo n8n numa lista (`[{ "itens": [...] }]`) ou o JSON em texto.
- **Um código desconhecido** vira amarelo, com o texto do n8n (ou `o n8n respondeu <código>`).
- **Sem resposta** (o n8n fora, o tempo esgotado, um HTTP que não é 2xx): um aviso amarelo, dizendo o que não foi
  feito:
  - a atração nova sem card: `<nome> não foi cadastrada no banco das atrações (o n8n não respondeu): o projeto foi
    criado; avise a equipe`;
  - a atração nova por card: `<nome> não foi cadastrada no banco das atrações e você não entrou no card <claquete>
    (o n8n não respondeu): o projeto foi criado; avise a equipe`;
  - a atração conhecida por card: `você não entrou no card <claquete> (o n8n não respondeu): o projeto foi criado;
    entre no card à mão`.
- **Fora do formato** (sem `itens`, a lista vazia, um item sem `codigo`, o que não é JSON): um aviso amarelo, `não deu
  para confirmar o cadastro de <nome> no banco das atrações (a resposta do n8n veio fora do formato): o projeto foi
  criado; confira na busca` (por card: `… nem a sua entrada no card <claquete> … confira na busca e no Trello`; a
  atração conhecida por card: `não deu para confirmar a sua entrada no card <claquete> … confira no Trello`).

Exemplos:

```json
{ "itens": [ { "codigo": "atracaoJaExistia", "texto": "LA NA MINHA TERRA já estava no banco (cadastrada por TMARTA)" } ] }
```

```json
{ "itens": [ { "codigo": "erro", "texto": "o banco não respondeu: a atração não foi cadastrada" } ] }
```

A atração nova por card:

```json
{
  "itens": [
    { "codigo": "atracaoCadastrada", "texto": "RIO SUMMER BEATS cadastrada no banco das atrações" },
    { "codigo": "cardLigado", "texto": "card RIO SUMMER BEATS 5-12 ligado à atração" },
    { "codigo": "designerEntrouNoCard", "texto": "você entrou no card RIO SUMMER BEATS 5-12" }
  ]
}
```

A atração conhecida por card, com o designer já no card, ou fora da tabela de designers:

```json
{ "itens": [ { "codigo": "designerJaEstavaNoCard", "texto": "você já estava no card DOMINGAO 25/11" } ] }
```

```json
{ "itens": [ { "codigo": "designerNaoEncontrado", "texto": "" } ] }
```

## o card e o designer

Com `card`, o n8n:

1. **acha o designer na tabela de designers** do banco: primeiro pelo `designer.login`, depois pela `designer.sigla`
   (comparados sem acentos nem caixa). A linha da tabela dá o usuário do Trello (o id do membro). Sem linha, responde
   `designerNaoEncontrado` e não mexe no card (o cadastro da atração nova continua);
2. **põe o designer no card** (`POST /1/cards/{card.id}/idMembers`) só se ele ainda não for membro: confere antes os
   membros do card (`GET /1/cards/{card.id}/members`) e, se já estiver, responde `designerJaEstavaNoCard`. O designer
   **nunca aparece duas vezes** no card;
3. com `atracao.nova`, depois do cadastro (ou de achar a que já existia), **liga o card à atração** no banco (o `atr`
   do card no [índice do Trello](webhook-trello.md) passa a ser o nome da atração) e responde `cardLigado`.

O padeiro não lê a tabela de designers nem mostra o nome do Trello: só manda o login e a sigla.

## não duplicar

Duas pessoas podem criar a mesma atração nova antes de o índice da busca ser atualizado. O n8n confere antes de
cadastrar: se já existe no banco uma atração com o **mesmo nome** (comparado sem acentos, símbolos nem caixa: `Lá na
Minha Terra` = `LA NA MINHA TERRA`) ou com a **mesma pasta**, não cria outra e responde `atracaoJaExistia`.

## depois do cadastro

Com `atracaoCadastrada`, `atracaoJaExistia` ou `cardLigado`, a **cópia** do índice da busca neste computador fica marcada como velha
(a data dela vai um dia para trás): a próxima busca da janela de projeto baixa o índice de novo, e a atração já
aparece, se o workflow da busca ler o banco na hora. Sem o Node do painel, a cópia não é marcada (ela fica velha
sozinha, em 10 minutos).

## onde está no código

- `extension/regras/webhook-do-projeto.js`: a regra do envio (`envio`, quando enviar e com quê) e da resposta
  (`avisos`, os avisos e a cópia velha). Os casos ficam em `extension/scripts/test-regras.js`.
- `extension/regras/configuracao.js`: a seção `webhookDoProjeto` (`WEBHOOK_DO_PROJETO`), o endereço e a validação.
- `extension/host/project.jsx`: `PADX.projectCreate` monta o envio (`padEnvioDoProjeto`) e devolve junto do projeto
  criado (o card entra só no envio, não nos metadados); `PADX.projectWebhook` é o plano B pelo `curl`.
- `extension/client/js/projetista.js`: `createArgs()` manda o tipo, se a atração é nova e o card escolhido (`{ id,
  claquete }`, só para o envio); `webhookDoProjeto()` envia
  (`postJson()`, o Node do painel) e mostra os avisos (`showAvisos()`).
- `extension/client/js/search-index.js`: `markStale()`, a cópia marcada como velha.
- `extension/client/productions.html` e `js/productions.js`: o campo na aba TIPOS DE PROJETO.
- `extension/client/js/mock-host.js`: `projectWebhook`, o n8n de mentira do modo de teste (`window.PAD_MOCK_N8N`).

Nada disto foi testado no After Effects de verdade ainda.
