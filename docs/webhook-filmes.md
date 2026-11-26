# webhook dos filmes recentes

O que **O PROJETISTA** (a janela de projeto) espera do workflow dos filmes. Digitando, os filmes criados na base nos últimos
dias que batem com o texto aparecem na busca, com o pôster, o ano de produção e a exibição (com o campo vazio, nada
aparece). Os filmes que ainda não têm pasta de projeto ganham a etiqueta **A PRODUZIR**.

## endereço

```
GET https://workflows.jmbillard.com/webhook/filmes-recentes
```

O workflow é o **PROMO: FILMES PARA O PADEIRO** (n8n). O endereço fica em `PS_FILMS_URL`, no começo de
`extension/host/lib/acessorista.js`.

O painel faz um `GET` simples, sem corpo e sem autenticação (tempo máximo de 15 s), e guarda a lista por 10 min: com
a janela aberta o dia todo, os filmes novos e os pôsteres (o link expira) chegam sozinhos. Sem resposta, a lista não
aparece e O PROJETISTA segue funcionando como antes.

## resposta

```json
{
  "filmes": [
    {
      "titulo": "Não! Não Olhe!",
      "ano": 2022,
      "exibicao": "2026-12-05",
      "sessao": "Corujão",
      "poster": "https://…/nao-nao-olhe_sm.webp?token=…",
      "trello": "https://trello.com/c/6750aa11bb22cc33dd44ee55/412-tela-quente-nao-nao-olhe"
    }
  ]
}
```

| campo | obrigatório | o que é |
| --- | --- | --- |
| `titulo` | sim | o título do filme, como deve aparecer (com acentos e pontuação). O PROJETISTA tira acentos e símbolos para o nome das pastas e do `.aep`. |
| `ano` | não | o ano de produção, com 4 algarismos (número ou texto). vai para o token `{ano_producao}` e para o nome do `.aep`. sem ano, os parênteses somem. |
| `exibicao` | não | a data da exibição, `AAAA-MM-DD` (aparece como `05/12`). a lista põe a exibição mais próxima em cima. |
| `sessao` | não | a sessão (Corujão, Supercine…). |
| `poster` | não | o endereço de uma **miniatura pública**, aberta sem login (uns 200 × 300 px). sem pôster, aparece o ícone de filme. |
| `trello` | não | o link do card do filme no Trello. o card do índice da busca com o mesmo id (`card`) vira, no grupo **NO TRELLO**, o **card de filme**: com o pôster, e leva ao filme (o filme não repete em FILMES). |

- **Quais filmes:** um por filme, pela próxima exibição, de 2 dias atrás a 45 dias à frente (sem as canceladas). No
  grupo **FILMES**, os **A PRODUZIR** vêm primeiro e depois os que **JÁ TÊM PROJETO**, cada parte com a exibição mais
  próxima em cima. O workflow manda também `filme_id`, `pasta`, `projeto`, `output` e `inedito`; o painel ainda não
  usa esses campos.
- **O pôster:** a miniatura do anexo do Teable, com um link assinado que expira. O Node do painel baixa a imagem e
  o `<img>` recebe um `data:` (`posterSrc()` em `attractions.js`, um download por endereço enquanto a janela está
  aberta): o Teable responde com `Cross-Origin-Resource-Policy: same-origin`, e o Chromium do CEP (o painel é
  `file://`) recusa o `<img src="https://…">` direto. O endereço tem que devolver HTTP 200 com `Content-Type:
  image/…`; o que não é imagem (o JSON de erro do Teable, a página de login do Cloudflare Access) vira o ícone, e
  enquanto baixa também aparece o ícone. Sem o Node (o navegador de teste), o `<img>` usa o endereço direto.
- **Também aceito:** a lista direto (`[ {…}, {…} ]`), embrulhada pelo n8n (`[{ "filmes": [...] }]`) ou um item por
  filme (`[{ "json": {…} }]`). Os nomes em inglês (`name`, `year`) também valem.
- **A PRODUZIR:** não vem do webhook. O PROJETISTA lê a pasta da letra do filme (o caminho do tipo **FILME**, até o
  `{atracao}`), cada letra uma vez, e marca o filme que ainda não tem pasta. Compara o título sem acento e sem
  pontuação: vale a pasta com o mesmo ano ou uma antiga sem ano (`NAO NAO OLHE`). A pasta de outro ano é outro filme
  (um remake: `ANNA (1987)` não é `ANNA (2019)`).
- **Sem travar o After:** a lista é baixada no primeiro clique no campo, e as etiquetas chegam depois. O host só converte o caminho das
  pastas das letras (`projectFilmsParents`), e o Node do painel lê as pastas sem bloquear. Sem o Node, o host lê
  (`projectFilmsDone`).
- **Já tem pasta antiga sem ano:** escolhido o filme, o projeto entra na pasta que já existe, em vez de criar outra
  ao lado com o ano. O `.aep` leva o ano do mesmo jeito.
- **Fora do índice da busca:** o filme cadastrado depois da última cópia do índice entra pelos dados do webhook, com
  a pasta pelo tipo **FILME**.

## na configuração

O ano entra sozinho na pasta e no output dos filmes: se o caminho do tipo **FILME** (configuração > TIPOS DE PROJETO) termina
em `{atracao}` e não tem o token `{ano_producao}`, O PROJETISTA acrescenta ` ({ano_producao})`. Para colocar o ano em
outro lugar, use o token no caminho:

```
…/FILMES/TITULOS/_{letra}_/{atracao} ({ano_producao})
```

O `.aep` do filme leva o título com o ano (`NAO NAO OLHE (2022) CHAMADA.aep`), ou o nome do campo ARQUIVO do tipo,
se ele estiver preenchido. No editor (o botão **Alterar**), o ano fica no nome ao salvar, enquanto a atração for o
filme.

## onde está no código

- `extension/host/lib/acessorista.js`: `PS_FILMS_URL`, o endereço.
- `extension/client/js/attractions.js`: `recentFilms()` baixa e `parseFilms()` lê a resposta.
- `extension/client/js/projetista.js`: `loadFilms()` confere as pastas, `pickGroups()` monta o grupo FILMES (e o card de
  filme, pelo `cardFilm()`) e `filmRow()` desenha cada linha.
- `extension/host/project.jsx`: `PADX.projectFilmsParents` converte as pastas das letras; `PADX.projectFilmsDone`
  confere quais filmes já têm pasta (o plano B, sem o Node).
- `extension/client/js/mock-host.js`: `projectFilmsRecent`, os filmes de exemplo do modo de teste.
