---
name: setup-matt-pocock-skills
description: "Configura este repositório para as skills de engenharia: define o rastreador de issues, o vocabulário de rótulos de triagem e a organização dos documentos de domínio. Rode uma vez antes do primeiro uso das outras skills de engenharia."
disable-model-invocation: true
---

# Configurar as skills do Matt Pocock

Monte a configuração por repositório que as skills de engenharia pressupõem:

- **Rastreador de issues**: onde as issues ficam (GitHub por padrão; markdown local também é suportado de fábrica)
- **Rótulos de triagem**: os textos usados para os cinco papéis canônicos de triagem
- **Documentos de domínio**: onde ficam o `GLOSSARY.md` e os ADRs, e as regras de quem os consome para lê-los

Esta é uma skill guiada por prompt, não um script determinístico. Explore, apresente o que encontrou, confirme com o usuário e só então escreva.

## Processo

### 1. Explore

Olhe o repositório atual para entender o ponto de partida. Leia o que existir; não suponha:

- `git remote -v` e `.git/config`: é um repositório do GitHub? Qual?
- `AGENTS.md` e `CLAUDE.md` na raiz do repositório: algum dos dois existe? Já existe uma seção `## Agent skills` em algum deles?
- `GLOSSARY.md` e `GLOSSARY-MAP.md` na raiz do repositório, e os antigos `CONTEXT.md` / `CONTEXT-MAP.md`. Se existir um arquivo antigo, ofereça fazer `git mv` dele para o nome `GLOSSARY` correspondente e reescrever esses nomes em `docs/agents/domain.md`.
- `docs/adr/` e quaisquer diretórios `src/*/docs/adr/`
- `docs/agents/`: a saída anterior desta skill já existe?
- `.scratch/`: sinal de que já se usa a convenção de rastreador de issues em markdown local
- A skill `triage` está instalada? (uma pasta da skill `triage` ao lado desta, ou `triage` entre as suas skills disponíveis.) Isso decide se a Seção B roda ou não.
- Sinais de monorepo: um `pnpm-workspace.yaml`, um campo `workspaces` no `package.json`, ou um `packages/*` preenchido com `src/` próprio. Eles só aparecem em um repositório realmente grande, com vários pacotes; a ausência deles significa contexto único, que é o caso de quase todo repositório.

### 2. Apresente o que encontrou e pergunte

Resuma o que existe e o que falta. Depois percorra as seções em ordem. Uma seção, uma resposta, depois a próxima.

Abra cada seção com a resposta recomendada, para o usuário poder aceitá-la com uma palavra. Dê uma explicação de uma linha só quando a escolha realmente se ramificar; pule a seção inteira quando a exploração já tiver resolvido a questão (a Seção B quando `triage` não estiver instalada, a Seção C quando não houver monorepo).

**Seção A: Rastreador de issues.**

> Explicação: O "rastreador de issues" é onde ficam as issues deste repositório. Skills como `to-tickets`, `triage` e `to-spec` leem dele e escrevem nele. Elas precisam saber se devem chamar `gh issue create`, escrever um arquivo markdown em `.scratch/` ou seguir algum outro fluxo que você descrever. Escolha o lugar onde você de fato acompanha o trabalho deste repositório.

Postura padrão: estas skills foram projetadas para o GitHub. Se um `git remote` apontar para o GitHub, proponha o GitHub. Se um `git remote` apontar para o GitLab (`gitlab.com` ou um servidor próprio), proponha o GitLab. Caso contrário (ou se o usuário preferir), ofereça:

- **GitHub**: as issues ficam nas GitHub Issues do repositório (usa a CLI `gh`)
- **GitLab**: as issues ficam nas GitLab Issues do repositório (usa a CLI [`glab`](https://gitlab.com/gitlab-org/cli))
- **Markdown local**: as issues ficam como arquivos em `.scratch/<feature>/` neste repositório (bom para projetos individuais ou repositórios sem remoto)
- **Outro** (Jira, Linear etc.): peça ao usuário para descrever o fluxo em um parágrafo; a skill vai registrá-lo como texto livre

Registre a escolha em `docs/agents/issue-tracker.md`. Os modelos do GitHub e do GitLab trazem uma opção "PRs como canal de pedidos", **desligada** por padrão. Deixe desligada e não toque no assunto: um usuário que queira PRs externos na fila de triagem pode mudar a opção no arquivo depois.

Um rastreador do GitHub ou do GitLab precisa de um repositório acessível. Quando o usuário escolher um deles e nenhum `git remote` apontar para esse servidor, peça a URL do repositório e faça a ligação (`git init` se necessário, `git remote add origin <url>`) antes de seguir. Está pronto quando `gh repo view` / `glab repo view` mostrar o projeto de dentro deste diretório; se não mostrar, pare e diga ao usuário o que está faltando.

**Seção B: Vocabulário de rótulos de triagem.** Pule esta seção inteira se a skill `triage` não estiver instalada (a exploração te disse), já que uma skill não instalada não precisa de rótulos.

Se estiver instalada, faça exatamente uma pergunta:

> Você quer manter os rótulos de triagem padrão? (recomendado: **sim**)

Os padrões são os cinco papéis canônicos, cada rótulo com o texto igual ao nome: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Com **sim**, escreva-os como estão. Só se o usuário disser não, geralmente porque o rastreador dele já usa outros nomes (por exemplo, `bug:triage` para `needs-triage`), colete as substituições para que `triage` aplique os rótulos existentes em vez de criar duplicatas.

**Seção C: Documentos de domínio.** Use por padrão **contexto único** (um `GLOSSARY.md` + `docs/adr/` na raiz do repositório). Isso serve para quase todo repositório; escreva sem perguntar.

Ofereça **vários contextos** (um `GLOSSARY-MAP.md` na raiz apontando para arquivos `GLOSSARY.md` por contexto) só quando a exploração tiver encontrado sinais de monorepo. Nesse caso, confirme qual organização o usuário quer.

### 3. Confirme e edite

Mostre ao usuário um rascunho de:

- O bloco `## Agent skills` a ser adicionado ao arquivo que for editado, `CLAUDE.md` ou `AGENTS.md` (veja o passo 4 para as regras de escolha)
- O conteúdo de `docs/agents/issue-tracker.md`, `docs/agents/domain.md` e `docs/agents/triage-labels.md` (este último só quando `triage` estiver instalada)

Deixe o usuário editar antes de escrever.

### 4. Escreva

**Escolha o arquivo a editar:**

- Se `CLAUDE.md` existir, edite-o.
- Senão, se `AGENTS.md` existir, edite-o.
- Se nenhum dos dois existir, pergunte ao usuário qual criar; não escolha por ele.

Nunca crie `AGENTS.md` quando `CLAUDE.md` já existir (nem o contrário); sempre edite o que já está lá.

Se já existir um bloco `## Agent skills` no arquivo escolhido, atualize o conteúdo dele no lugar em vez de acrescentar uma duplicata. Não sobrescreva edições do usuário nas seções em volta.

O bloco:

```markdown
## Agent skills

### Issue tracker

[one-line summary of where issues are tracked]. See `docs/agents/issue-tracker.md`.

### Triage labels

[one-line summary of the label vocabulary]. See `docs/agents/triage-labels.md`.

### Domain docs

[one-line summary of layout: "single-context" or "multi-context"]. See `docs/agents/domain.md`.
```

Inclua o sub-bloco `### Triage labels`, e escreva `docs/agents/triage-labels.md`, só quando `triage` estiver instalada e a Seção B tiver rodado. Quando não estiver, os dois ficam de fora.

Quando a Seção B tiver rodado no GitHub ou no GitLab, crie cada rótulo configurado que faltar no rastreador (`gh label create` / `glab label create`).

Depois escreva os arquivos de documentação usando os modelos iniciais desta pasta da skill como ponto de partida:

- [issue-tracker-github.md](./issue-tracker-github.md): rastreador de issues no GitHub
- [issue-tracker-gitlab.md](./issue-tracker-gitlab.md): rastreador de issues no GitLab
- [issue-tracker-local.md](./issue-tracker-local.md): rastreador de issues em markdown local
- [triage-labels.md](./triage-labels.md): mapeamento de rótulos (só se `triage` estiver instalada)
- [domain.md](./domain.md): regras de consumo dos documentos de domínio + organização

Para rastreadores de issues do tipo "outro", escreva `docs/agents/issue-tracker.md` do zero usando a descrição do usuário.

### 5. Pronto

Diga ao usuário que a configuração está concluída e quais skills de engenharia vão passar a ler esses arquivos. Mencione que ele pode editar `docs/agents/*.md` diretamente depois; rodar esta skill de novo só é necessário se ele quiser trocar de rastreador de issues ou recomeçar do zero.
