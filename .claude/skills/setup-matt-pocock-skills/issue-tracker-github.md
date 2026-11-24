# Rastreador de issues: GitHub

As issues e as specs deste repositório ficam como issues do GitHub. Use a CLI `gh` para todas as operações.

## Convenções

- **Criar uma issue**: `gh issue create --title "..." --body "..."`. Use um heredoc para corpos com várias linhas.
- **Ler uma issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **Listar issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` com os filtros `--label` e `--state` adequados.
- **Tornar uma issue sub-issue de uma issue pai**: `gh issue create --parent <parent> ...`, ou `gh issue edit <parent> --add-sub-issue <child>` depois (`gh` 2.94+). Com `gh` mais antigo: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>` (id de banco de dados, como em **Bloqueio** abaixo). Sem sub-issues, coloque `Part of #<parent>` no topo do corpo da issue filha.
- **Bloqueio**: as **dependências nativas de issues** do GitHub, a representação canônica e visível na interface. Adicione uma aresta com `gh issue create --blocked-by <n>,<n> ...` ou `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+). Com `gh` mais antigo: `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, onde `<blocker-db-id>` é o **id de banco de dados** numérico do bloqueador (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _não_ o `#number` nem o `node_id`). Onde as dependências não estiverem disponíveis, use como alternativa uma linha `Blocked by: #<n>, #<n>` no topo do corpo da issue filha. Um ticket fica desbloqueado quando todos os bloqueadores estão fechados.
- **Contar bloqueadores abertos**: `gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by` (só bloqueadores abertos; 0 significa que pode começar). `gh issue view <n> --json blockedBy` lista também os bloqueadores fechados, então filtre: `--jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'`.
- **Comentar em uma issue**: `gh issue comment <number> --body "..."`
- **Aplicar / remover rótulos**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Fechar**: publique a explicação com `gh issue comment <number> --body "..."` e depois `gh issue close <number>`. Em uma issue já fechada, `gh issue close --comment` descarta o comentário e mesmo assim sai com 0.

Descubra o repositório a partir de `git remote -v`; o `gh` faz isso automaticamente quando roda dentro de um clone.

Abra issues só no repositório do próprio usuário. Nunca abra issues em `mattpocock/skills` (o repositório de onde estas skills vêm), a não ser que o usuário seja o dono. Em um fork, o `gh` pode usar por padrão o repositório pai upstream, então antes do primeiro `gh issue create` de uma sessão, confira o destino com `gh repo view --json nameWithOwner` e confirme com o usuário se não for o repositório dele.

## Pull requests como canal de triagem

**PRs como canal de pedidos: não.** _(Mude para `yes` se este repositório trata PRs externos como pedidos de funcionalidade; `/triage` lê esta opção.)_

Quando estiver em `yes`, os PRs passam pelos mesmos rótulos e estados das issues, usando os equivalentes `gh pr`:

- **Ler um PR**: `gh pr view <number>`, depois `gh pr view <number> --comments` (fora de um TTY, `--comments` mostra só os comentários, não o corpo), e `gh pr diff <number>` para o diff.
- **Listar PRs externos para triagem**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comentar / rotular / fechar**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

O GitHub usa uma única sequência de números para issues e PRs, então um `#42` solto pode ser qualquer um dos dois: resolva com `gh pr view 42` e, se falhar, use `gh issue view 42`.

## Quando uma skill disser "publicar no rastreador de issues"

Crie uma issue no GitHub.

## Quando uma skill disser "buscar o ticket relevante"

Leia como em **Ler uma issue** acima.

## Operações de wayfinding

Usadas pela `/wayfinder`. O **mapa** é uma única issue com issues **filhas** como tickets.

- **Mapa**: uma única issue com o rótulo `wayfinder:map`, contendo o corpo com Notes / Decisions-so-far / Fog. `gh issue create --label wayfinder:map`.
- **Ticket filho**: uma issue ligada ao mapa como sub-issue do GitHub (veja **Tornar uma issue sub-issue de uma issue pai**). Onde sub-issues não estiverem habilitadas, adicione a filha a uma lista de tarefas no corpo do mapa e coloque `Part of #<map>` no topo do corpo da filha. Rótulos: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Depois de assumido, o ticket fica atribuído ao dev que está conduzindo.
- **Bloqueio**: veja **Bloqueio** em Convenções.
- **Consulta da fronteira**: liste as filhas abertas do mapa (`gh issue list --state open`, restrito às sub-issues / lista de tarefas do mapa), descarte as que têm um bloqueador aberto (veja **Contar bloqueadores abertos**, ou uma issue aberta na linha `Blocked by`) ou um responsável atribuído; a primeira na ordem do mapa vence.
- **Assumir**: `gh issue edit <n> --add-assignee @me`, a primeira escrita da sessão.
- **Resolver**: `gh issue comment <n> --body "<answer>"`, depois `gh issue close <n>`, depois acrescente uma indicação de contexto (resumo + link) às Decisions-so-far do mapa.
