# Skills dos agentes (pt-BR)

As skills do [Matt Pocock](https://github.com/mattpocock/skills) ("Skills For Real Engineers"), traduzidas para
o português e usadas aqui do mesmo jeito. Licença MIT (veja `LICENSE`): o crédito é dele, a tradução é nossa.
Os comandos continuam com os nomes originais (`/grill-me`, `/tdd`…).

O método, em quatro problemas e quatro correções:

1. **O agente não fez o que eu queria** → um interrogatório antes de cada mudança: `/grill-me` ou `/grill-with-docs`.
2. **O agente fala demais** → uma linguagem compartilhada: o `GLOSSARY.md` e as ADRs em `docs/adr/`
   (`/grill-with-docs`, `domain-modeling`).
3. **O código não funciona** → ciclos de retorno: tipos, navegador e testes, com `tdd` (vermelho-verde-refatorar)
   e `diagnosing-bugs`.
4. **Virou uma bagunça** → cuidar do desenho do código todo dia: `/improve-codebase-architecture`, `codebase-design`.

O fluxo do dia a dia: `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement`. Na dúvida sobre qual usar:
`/ask-matt`. A configuração deste repositório (issues no GitHub, rótulos em pt-BR, glossário) está em
`docs/agents/` e no `CLAUDE.md`.

## Chamadas por você (comandos)

- `/ask-matt`: qual skill ou fluxo serve para a sua situação.
- `/grill-me`: um interrogatório sobre um plano até resolver cada ramo da decisão.
- `/grill-with-docs`: o interrogatório que também atualiza o `GLOSSARY.md` e as ADRs.
- `/to-spec`: transforma a conversa numa spec e publica nas Issues.
- `/to-tickets`: quebra um plano ou spec em tickets de fatia vertical, com os bloqueios.
- `/implement`: faz o trabalho de uma spec ou de tickets, com `tdd` e `code-review` no fim.
- `/implement-spec`: uma spec inteira num branch, com subagentes em paralelo.
- `/triage`: passa as issues pelos papéis da triagem.
- `/wayfinder`: planeja um trabalho grande demais para uma sessão, como um mapa de tickets de decisão.
- `/improve-codebase-architecture`: procura onde aprofundar os módulos, num relatório HTML.
- `/retro`: depois de uma sessão, o que melhorar no ambiente do agente.
- `/handoff`: resume a conversa para outro agente continuar.
- `/to-questionnaire`: um questionário para quem pode responder uma decisão.
- `/wait-what`: "não entendi": o agente explica de novo com o vocabulário do glossário.
- `/teach`: aprende um assunto em várias sessões, com aulas e registro do que já foi aprendido.
- `/setup-matt-pocock-skills`: a configuração do repositório (já feita aqui).

## Usadas pelo agente quando cabem (ou por você)

`grilling`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`, `code-review`, `pr`, `prototype`,
`research`, `wizard`, `writing-for-agents`.
