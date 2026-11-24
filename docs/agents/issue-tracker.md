# Rastreador de issues: GitHub

As issues e as specs deste repositório ficam nas Issues do GitHub, em `jmbillard/O-PADEIRO`.

Use o `gh api` (a API REST) para tudo. Nas sessões do Claude Code na nuvem a API GraphQL é recusada, então os
comandos `gh issue …` e `gh pr …` falham lá; o `gh api` funciona tanto na nuvem quanto na máquina local.

## Convenções

- **Criar uma issue**: `gh api repos/jmbillard/O-PADEIRO/issues -f title="..." -F body=@body.md` (escreva corpos de várias linhas num arquivo antes; acrescente `-f "labels[]=precisa-triagem"` para já criar com o rótulo).
- **Ler uma issue**: `gh api repos/jmbillard/O-PADEIRO/issues/<n> --jq '{number, title, state, body, labels: [.labels[].name]}'` e os comentários com `gh api repos/jmbillard/O-PADEIRO/issues/<n>/comments --jq '[.[] | {user: .user.login, body}]'`.
- **Listar issues**: `gh api "repos/jmbillard/O-PADEIRO/issues?state=open&per_page=100" --jq '[.[] | select(.pull_request | not) | {number, title, labels: [.labels[].name]}]'` (acrescente `&labels=<rótulo>` para filtrar; o endpoint também devolve PRs, daí o `select`).
- **Comentar numa issue**: `gh api repos/jmbillard/O-PADEIRO/issues/<n>/comments -F body=@comment.md`
- **Pôr um rótulo**: `gh api repos/jmbillard/O-PADEIRO/issues/<n>/labels -f "labels[]=<rótulo>"`
- **Tirar um rótulo**: `gh api -X DELETE repos/jmbillard/O-PADEIRO/issues/<n>/labels/<rótulo>`
- **Fechar**: comente antes, depois `gh api -X PATCH repos/jmbillard/O-PADEIRO/issues/<n> -f state=closed`

Se uma escrita for recusada numa sessão na nuvem (o proxy só libera alguns caminhos de escrita), diga isso e passe ao
usuário o título, o corpo e os rótulos exatos para ele criar a issue à mão.

Crie issues só no repositório do usuário. Nunca em `mattpocock/skills` (de onde vêm as skills).

## Pull requests como entrada de triagem

**PRs como entrada de pedidos: não.** _(Mude para `sim` se este repositório tratar PRs externos como pedidos; o `/triage` lê esta marcação.)_

Com `sim`, os PRs passam pelos mesmos rótulos e estados das issues, com os equivalentes REST:

- **Ler um PR**: `gh api repos/jmbillard/O-PADEIRO/pulls/<n>` e o diff com `gh api repos/jmbillard/O-PADEIRO/pulls/<n> -H "Accept: application/vnd.github.diff"`.
- **Listar PRs externos para a triagem**: `gh api "repos/jmbillard/O-PADEIRO/pulls?state=open"`, ficando só com os de `author_association` `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` ou `NONE`.
- **Comentar / rotular / fechar**: os endpoints de issue acima também valem para PRs (a numeração é a mesma).

O GitHub usa uma só numeração para issues e PRs, então um `#42` solto pode ser qualquer um dos dois: o endpoint de
issue devolve um campo `pull_request` quando é um PR.

## Quando uma skill diz "publicar no rastreador de issues"

Crie uma issue no GitHub.

## Quando uma skill diz "buscar o ticket"

Leia a issue e os comentários com as duas chamadas `gh api` de **Ler uma issue**.

## Operações do wayfinder

Usadas pelo `/wayfinder`. O **mapa** é uma única issue, com issues **filhas** como tickets.

- **Mapa**: uma issue com o rótulo `wayfinder:map`, com o corpo Notas / Decisões até aqui / Neblina.
- **Ticket filho**: uma issue ligada ao mapa como sub-issue do GitHub (`gh api` no endpoint de sub-issues). Onde não houver sub-issues, ponha a filha numa lista de tarefas no corpo do mapa e `Parte de #<mapa>` no topo do corpo da filha. Rótulos: `wayfinder:<tipo>` (`research`/`prototype`/`grilling`/`task`). Assumido, o ticket fica atribuído a quem conduz.
- **Bloqueio**: as dependências nativas de issues do GitHub: `gh api --method POST repos/jmbillard/O-PADEIRO/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, onde `<blocker-db-id>` é o id numérico do banco da bloqueadora (`gh api repos/jmbillard/O-PADEIRO/issues/<n> --jq .id`, não o `#número`). Onde não houver dependências, use uma linha `Bloqueada por: #<n>, #<n>` no topo do corpo da filha. Um ticket está livre quando todas as bloqueadoras estão fechadas.
- **Fronteira**: liste as filhas abertas do mapa, tire as que têm bloqueadora aberta ou responsável; vale a primeira na ordem do mapa.
- **Assumir**: `gh api repos/jmbillard/O-PADEIRO/issues/<n>/assignees -f "assignees[]=<login>"`, a primeira escrita da sessão.
- **Resolver**: comente a resposta, feche a issue e acrescente um ponteiro (resumo + link) nas Decisões até aqui do mapa.
