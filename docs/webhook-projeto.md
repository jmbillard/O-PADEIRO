# webhook do projeto

O que **O PROJETISTA** (a janela de projeto) manda ao n8n e o que espera de volta. Ao criar o projeto de uma
**atração nova** (uma que ainda não está no índice da busca), o padeiro avisa o n8n, em segundo plano, para cadastrar
a atração no **banco das atrações**. Depois disso, a próxima busca já a acha, e o próximo designer não cria outra pasta
para a mesma atração.

Este é o primeiro webhook que pede mudanças no banco: os outros (a [busca](acessorista.md), os
[filmes recentes](webhook-filmes.md) e o [Trello](webhook-trello.md)) só leem.

> Por enquanto, só a atração nova criada **sem card**. O card do Trello (ligar o card à atração, pôr o designer no
> card) e os momentos **aberto** (JÁ NA PASTA) e **alterado** (o Alterar) vêm na #50: o formato abaixo já tem o lugar
> deles.

## endereço

```
POST https://workflows.jmbillard.com/webhook/projeto
```

O endereço fica na configuração da equipe: configuração > **TIPOS DE PROJETO** > **webhook do projeto** (a chave
`WEBHOOK_DO_PROJETO` do arquivo da equipe). **Vazio, nada é enviado**: é o padrão até o workflow existir; o endereço
acima é só o exemplo que aparece no campo. A validação é a mesma da URL do registro de uso (`http://` ou `https://`,
sem espaços, aspas nem símbolos do terminal): uma URL inválida é recusada ao salvar (`#PAD_089`).

## quando o padeiro envia

- ao **criar** o projeto de uma atração nova pela janela de projeto (os chips dos tipos, ou o card sem atração);
- **não** envia para a atração que já está no índice da busca, para o tipo fixo (MOOD MENSAL), para o filme, nem
  quando só se olha um card na lista;
- **não** envia no **modo local**;
- **não** envia com o endereço vazio.

**A criação nunca espera nem falha pelo envio.** O projeto é criado e salvo primeiro; o envio sai depois, em segundo
plano, pelo Node do painel (`POST` com JSON, tempo máximo de 8 s). A janela mostra o aviso e só então fecha. Sem o
Node (o plano B, ADR 0003), o host envia pelo `curl` (como o registro de uso), com o mesmo tempo máximo.

## envio

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
| `momento` | `criado` (o projeto criado). `aberto` (JÁ NA PASTA) e `alterado` (o Alterar) ficam para a #50. |
| `atracao.nome` | o nome da atração, como foi digitado ou tirado da claquete. |
| `atracao.tipo` | o tipo de projeto (PROGRAMAS, NOVELAS, SHOWS…), o da aba TIPOS DE PROJETO. |
| `atracao.nova` | `true`: a atração não estava no índice da busca. |
| `atracao.quadro` | as pastas abaixo da atração, quando o projeto foi criado num quadro (`DANCA DOS FAMOSOS/FINAL`); `""` sem quadro. |
| `atracao.pasta` | a pasta do projeto (a estrutura com `01_PROJETOS`, `02_ARQUIVOS`…), como o padeiro mostra o caminho. |
| `atracao.output` | a pasta de output, se existir; `""` quando o designer pulou o output. |
| `atracao.aep` | o caminho do `.aep` salvo. |
| `card` | `null` por enquanto. Na #50: `{ "id", "claquete" }` do card do Trello de onde veio a atração. O card só vai no envio, nunca no projeto (ADR 0001). |
| `designer.login` | o login da máquina (o usuário do sistema). |
| `designer.sigla` | a sigla do designer (a deste computador ou, sem ela, a do login). |
| `versao` | a versão do padeiro. |

Os caminhos vêm como o padeiro os mostra: o caminho de rede (`//servidor/share/…`) ou o do Mac (`/Volumes/…`).

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
| `cardLigado` | verde | `card ligado à atração` | (#50) o card ficou ligado à atração nova. |
| `designerEntrouNoCard` | verde | `você entrou no card` | (#50) o designer foi posto no card. |
| `designerJaEstavaNoCard` | verde | `você já estava no card` | (#50) nada mudou no card. |
| `designerNaoEncontrado` | amarelo | `o n8n não achou você na tabela de designers: peça para incluírem` | (#50) nem o login nem a sigla estão na tabela de designers. |
| `erro` | amarelo | `o n8n não conseguiu fazer o pedido: confira à mão` | o workflow falhou (mande o motivo no `texto`). |

- **Também aceito:** a resposta embrulhada pelo n8n numa lista (`[{ "itens": [...] }]`) ou o JSON em texto.
- **Um código desconhecido** vira amarelo, com o texto do n8n (ou `o n8n respondeu <código>`).
- **Sem resposta** (o n8n fora, o tempo esgotado, um HTTP que não é 2xx): um aviso amarelo, `<nome> não foi cadastrada
  no banco das atrações (o n8n não respondeu): o projeto foi criado; avise a equipe`.
- **Fora do formato** (sem `itens`, a lista vazia, um item sem `codigo`, o que não é JSON): um aviso amarelo, `não deu
  para confirmar o cadastro de <nome> no banco das atrações (a resposta do n8n veio fora do formato): o projeto foi
  criado; confira na busca`.

Exemplos:

```json
{ "itens": [ { "codigo": "atracaoJaExistia", "texto": "LA NA MINHA TERRA já estava no banco (cadastrada por TMARTA)" } ] }
```

```json
{ "itens": [ { "codigo": "erro", "texto": "o banco não respondeu: a atração não foi cadastrada" } ] }
```

## não duplicar

Duas pessoas podem criar a mesma atração nova antes de o índice da busca ser atualizado. O n8n confere antes de
cadastrar: se já existe no banco uma atração com o **mesmo nome** (comparado sem acentos, símbolos nem caixa: `Lá na
Minha Terra` = `LA NA MINHA TERRA`) ou com a **mesma pasta**, não cria outra e responde `atracaoJaExistia`.

## depois do cadastro

Com `atracaoCadastrada` ou `atracaoJaExistia`, a **cópia** do índice da busca neste computador fica marcada como velha
(a data dela vai um dia para trás): a próxima busca da janela de projeto baixa o índice de novo, e a atração já
aparece, se o workflow da busca ler o banco na hora. Sem o Node do painel, a cópia não é marcada (ela fica velha
sozinha, em 10 minutos).

## onde está no código

- `extension/regras/webhook-do-projeto.js`: a regra do envio (`envio`, quando enviar e com quê) e da resposta
  (`avisos`, os avisos e a cópia velha). Os casos ficam em `extension/scripts/test-regras.js`.
- `extension/regras/configuracao.js`: a seção `webhookDoProjeto` (`WEBHOOK_DO_PROJETO`), o endereço e a validação.
- `extension/host/project.jsx`: `PADX.projectCreate` monta o envio (`padEnvioDoProjeto`) e devolve junto do projeto
  criado; `PADX.projectWebhook` é o plano B pelo `curl`.
- `extension/client/js/projetista.js`: `createArgs()` manda o tipo e se a atração é nova; `webhookDoProjeto()` envia
  (`postJson()`, o Node do painel) e mostra os avisos (`showAvisos()`).
- `extension/client/js/search-index.js`: `markStale()`, a cópia marcada como velha.
- `extension/client/productions.html` e `js/productions.js`: o campo na aba TIPOS DE PROJETO.
- `extension/client/js/mock-host.js`: `projectWebhook`, o n8n de mentira do modo de teste (`window.PAD_MOCK_N8N`).

Nada disto foi testado no After Effects de verdade ainda.
