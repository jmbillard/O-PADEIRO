# Rastreador de issues: GitHub

As issues e as specs deste repositório ficam nas Issues do GitHub (`jmbillard/o-padeiro`). Use o `gh` para tudo.

## Convenções

- **Criar uma issue**: `gh issue create --title "..." --body "..."`. Use um heredoc para corpos de várias linhas.
- **Ler uma issue**: `gh issue view <número> --json number,title,body,labels,comments`.
- **Listar issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`, com os filtros `--label` e `--state` que couberem.
- **Sub-issue de uma issue mãe**: `gh issue create --parent <mãe> ...`, ou depois `gh issue edit <mãe> --add-sub-issue <filha>` (`gh` 2.94+). `gh` mais antigo: `gh api --method POST repos/<dono>/<repo>/issues/<mãe>/sub_issues -F sub_issue_id=<id-no-banco-da-filha>` (o id do banco, como em **Bloqueio** abaixo). Sem sub-issues, ponha `Parte de #<mãe>` no topo do corpo da filha.
- **Bloqueio**: as **dependências nativas** do GitHub, a forma canônica e visível na interface. Crie a ligação com `gh issue create --blocked-by <n>,<n> ...` ou `gh issue edit <filha> --add-blocked-by <bloqueadora>` (`gh` 2.94+). `gh` mais antigo: `gh api --method POST repos/<dono>/<repo>/issues/<filha>/dependencies/blocked_by -F issue_id=<id-no-banco-da-bloqueadora>`, onde o id do banco é o numérico (`gh api repos/<dono>/<repo>/issues/<n> --jq .id`, _não_ o `#número` nem o `node_id`). Sem dependências, use uma linha `Bloqueada por: #<n>, #<n>` no topo do corpo da filha. Um ticket está livre quando todas as bloqueadoras estão fechadas.
- **Contar bloqueadoras abertas**: `gh api repos/<dono>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by` (só as abertas; 0 quer dizer que dá para começar).
- **Comentar**: `gh issue comment <número> --body "..."`
- **Pôr / tirar rótulos**: `gh issue edit <número> --add-label "..."` / `--remove-label "..."`
- **Fechar**: poste a explicação com `gh issue comment <número> --body "..."` e depois `gh issue close <número>`.

O repositório vem do `git remote -v`; o `gh` descobre sozinho quando roda dentro do clone.

Crie issues só no repositório do usuário. Nunca em `mattpocock/skills` (de onde vêm estas skills).

## Nas sessões do Claude Code na nuvem (claude.ai/code)

Lá só funciona o `gh api` (REST): `gh issue …` e `gh pr …` são recusados. Use os equivalentes:

- **Criar**: `gh api repos/jmbillard/o-padeiro/issues -f title='...' -f body='...' -f 'labels[]=precisa-triagem'`
- **Ler**: `gh api repos/jmbillard/o-padeiro/issues/<n>` e `gh api repos/jmbillard/o-padeiro/issues/<n>/comments`
- **Listar**: `gh api 'repos/jmbillard/o-padeiro/issues?state=open&per_page=100&page=1'` (pagine com `page=N`)
- **Comentar**: `gh api repos/jmbillard/o-padeiro/issues/<n>/comments -f body='...'`
- **Rótulos**: `gh api repos/jmbillard/o-padeiro/issues/<n>/labels -f 'labels[]=...'` (pôr) e
  `gh api -X DELETE repos/jmbillard/o-padeiro/issues/<n>/labels/<rótulo>` (tirar)
- **Fechar**: `gh api -X PATCH repos/jmbillard/o-padeiro/issues/<n> -f state=closed` (depois do comentário)
- **Sub-issue / bloqueio**: os comandos `gh api` de cima

## Pull requests como entrada de triagem

**PRs como entrada de pedidos: não.** _(Mude para `sim` se este repositório tratar PRs externos como pedidos; o `/triage` lê esta marcação.)_

## Quando uma skill diz "publicar no rastreador de issues"

Crie uma issue no GitHub.

## Quando uma skill diz "buscar o ticket"

Leia como em **Ler uma issue** acima.

## Operações do wayfinder

Usadas pelo `/wayfinder`. O **mapa** é uma única issue, com issues **filhas** como tickets.

- **Mapa**: uma issue com o rótulo `wayfinder:map`, com o corpo Notas / Decisões até aqui / Neblina. `gh issue create --label wayfinder:map`.
- **Ticket filho**: uma issue ligada ao mapa como sub-issue (veja **Sub-issue** acima). Rótulos: `wayfinder:<tipo>` (`research`/`prototype`/`grilling`/`task`). Assumido, o ticket fica atribuído a quem conduz.
- **Bloqueio**: veja **Bloqueio** nas Convenções.
- **Fronteira**: as filhas abertas do mapa, sem bloqueadora aberta e sem responsável; vale a primeira na ordem do mapa.
- **Assumir**: `gh issue edit <n> --add-assignee @me`, a primeira escrita da sessão.
- **Resolver**: `gh issue comment <n> --body "<resposta>"`, depois `gh issue close <n>`, e acrescente um ponteiro (resumo + link) nas Decisões até aqui do mapa.
