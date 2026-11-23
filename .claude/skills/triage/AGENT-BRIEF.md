# Como escrever briefings para agentes

Um briefing para agente é um comentário estruturado publicado em uma issue ou PR do GitHub quando ela passa para `ready-for-agent`. É a especificação oficial a partir da qual um agente AFK vai trabalhar. O corpo original e a discussão são contexto: o briefing é o contrato.

O briefing diz **o que o agente deve fazer**, o que vale para os dois casos: para uma issue, é construir a mudança do zero; para um PR, é o que falta fazer *no diff existente*: terminá-lo, fechar lacunas, tratar os pontos da revisão. Os princípios são os mesmos nos dois casos; o exemplo de PR abaixo mostra a diferença.

## Princípios

### Durabilidade acima de precisão

A issue pode ficar em `ready-for-agent` por dias ou semanas. A base de código vai mudar nesse meio-tempo. Escreva o briefing de modo que ele continue útil mesmo quando arquivos forem renomeados, movidos ou refatorados.

- **Faça**: descreva interfaces, tipos e contratos de comportamento
- **Faça**: nomeie tipos específicos, assinaturas de função ou formatos de configuração que o agente deve procurar ou modificar
- **Não faça**: citar caminhos de arquivo: eles ficam desatualizados
- **Não faça**: citar números de linha
- **Não faça**: supor que a estrutura atual da implementação vai continuar a mesma

### Comportamental, não procedural

Descreva **o que** o sistema deve fazer, não **como** implementar. O agente vai explorar a base de código do zero e tomar as próprias decisões de implementação.

- **Bom:** "O tipo `SkillConfig` deve aceitar um campo opcional `schedule` do tipo `CronExpression`"
- **Ruim:** "Abra src/types/skill.ts e adicione um campo schedule na linha 42"
- **Bom:** "Quando um usuário roda `/triage` sem argumentos, deve ver um resumo das issues que precisam de atenção"
- **Ruim:** "Adicione um switch na função principal do handler"

### Critérios de aceite completos

O agente precisa saber quando terminou. Todo briefing para agente deve ter critérios de aceite concretos e testáveis. Cada critério deve ser verificável de forma independente.

- **Bom:** "Rodar `gh issue list --label needs-triage` retorna issues que passaram pela classificação inicial"
- **Ruim:** "A triagem deve funcionar corretamente"

### Limites de escopo explícitos

Diga o que está fora do escopo. Isso evita que o agente enfeite além do necessário ou faça suposições sobre funcionalidades vizinhas.

## Modelo

```markdown
## Briefing para agente

**Categoria:** bug / enhancement
**Resumo:** descrição em uma linha do que precisa acontecer

**Comportamento atual:**
Descreva o que acontece hoje. Para bugs, é o comportamento quebrado.
Para melhorias, é o estado atual sobre o qual a funcionalidade se apoia.

**Comportamento desejado:**
Descreva o que deve acontecer depois que o agente terminar.
Seja específico sobre casos extremos e condições de erro.

**Interfaces-chave:**
- `TypeName`: o que precisa mudar e por quê
- tipo de retorno de `functionName()`: o que retorna hoje × o que deveria retornar
- Formato da configuração: novas opções necessárias

**Critérios de aceite:**
- [ ] Critério específico e testável 1
- [ ] Critério específico e testável 2
- [ ] Critério específico e testável 3

**Fora do escopo:**
- O que NÃO deve ser mudado nem tratado nesta issue
- Funcionalidade vizinha que parece relacionada, mas é separada
```

## Exemplos

### Bom briefing para agente (bug)

```markdown
## Briefing para agente

**Categoria:** bug
**Resumo:** Skill description truncation drops mid-word, producing broken output

**Comportamento atual:**
When a skill description exceeds 1024 characters, it is truncated at exactly
1024 characters regardless of word boundaries. This produces descriptions
that end mid-word (e.g. "Use when the user wants to confi").

**Comportamento desejado:**
Truncation should break at the last word boundary before 1024 characters
and append "..." to indicate truncation.

**Interfaces-chave:**
- The `SkillMetadata` type's `description` field: no type change needed,
  but the validation/processing logic that populates it needs to respect
  word boundaries
- Any function that reads SKILL.md frontmatter and extracts the description

**Critérios de aceite:**
- [ ] Descriptions under 1024 chars are unchanged
- [ ] Descriptions over 1024 chars are truncated at the last word boundary
      before 1024 chars
- [ ] Truncated descriptions end with "..."
- [ ] The total length including "..." does not exceed 1024 chars

**Fora do escopo:**
- Changing the 1024 char limit itself
- Multi-line description support
```

### Bom briefing para agente (enhancement)

```markdown
## Briefing para agente

**Categoria:** enhancement
**Resumo:** Add `.out-of-scope/` directory support for tracking rejected feature requests

**Comportamento atual:**
When a feature request is rejected, the issue is closed with a `wontfix` label
and a comment. There is no persistent record of the decision or reasoning.
Future similar requests require the maintainer to recall or search for the
prior discussion.

**Comportamento desejado:**
Rejected feature requests should be documented in `.out-of-scope/<concept>.md`
files that capture the decision, reasoning, and links to all issues that
requested the feature. When triaging new issues, these files should be
checked for matches.

**Interfaces-chave:**
- Markdown file format in `.out-of-scope/`: each file should have a
  `# Concept Name` heading, a `**Decision:**` line, a `**Reason:**` line,
  and a `**Prior requests:**` list with issue links
- The triage workflow should read all `.out-of-scope/*.md` files early
  and match incoming issues against them by concept similarity

**Critérios de aceite:**
- [ ] Closing a feature as wontfix creates/updates a file in `.out-of-scope/`
- [ ] The file includes the decision, reasoning, and link to the closed issue
- [ ] If a matching `.out-of-scope/` file already exists, the new issue is
      appended to its "Prior requests" list rather than creating a duplicate
- [ ] During triage, existing `.out-of-scope/` files are checked and surfaced
      when a new issue matches a prior rejection

**Fora do escopo:**
- Automated matching (human confirms the match)
- Reopening previously rejected features
- Bug reports (only enhancement rejections go to `.out-of-scope/`)
```

### Bom briefing para agente (PR)

Para um PR, "Comportamento atual" descreve o estado do diff, e o briefing pede ao agente que o termine ou corrija em vez de construir do zero.

```markdown
## Briefing para agente

**Categoria:** enhancement
**Resumo:** Finish the contributor's `--json` output flag for `triage list`

**Comportamento atual:**
The PR adds a `--json` flag that serializes the issue list to JSON. The happy
path works and the diff matches the project's command structure. Two gaps
remain: errors are still printed as human text (not JSON), and the new flag has
no test coverage.

**Comportamento desejado:**
With `--json`, all output (including errors) is well-formed JSON on stdout,
and the command's exit codes are unchanged. The existing human-readable output
is untouched when the flag is absent.

**Interfaces-chave:**
- The command's error path should emit `{ "error": string }` under `--json`
  instead of the plain-text error
- Reuse the existing serializer the PR already added; don't introduce a second

**Critérios de aceite:**
- [ ] `triage list --json` emits valid JSON for both success and error cases
- [ ] Exit codes match the non-JSON command
- [ ] A test covers the `--json` success output and one error case
- [ ] Default (non-JSON) output is byte-for-byte unchanged

**Fora do escopo:**
- Adding `--json` to any other command
- Changing the JSON shape of the success payload the PR already defined
```

### Briefing ruim para agente

```markdown
## Briefing para agente

**Resumo:** Fix the triage bug

**What to do:**
The triage thing is broken. Look at the main file and fix it.
The function around line 150 has the issue.

**Files to change:**
- src/triage/handler.ts (line 150)
- src/types.ts (line 42)
```

Isto é ruim porque:
- Não tem categoria
- Descrição vaga ("the triage thing is broken")
- Cita caminhos de arquivo e números de linha que vão ficar desatualizados
- Não tem critérios de aceite
- Não tem limites de escopo
- Não descreve o comportamento atual versus o desejado
