---
name: implement-spec
description: "Implementa em código o resultado de /to-spec e /to-tickets."
disable-model-invocation: true
---

Você recebeu uma especificação (spec). Essa spec deve ter tickets associados, descrevendo como implementá-la.

O rastreador de issues já deve ter sido fornecido a você. Se não foi, diga ao usuário para rodar `/setup-matt-pocock-skills`.

O objetivo é a spec inteira implementada em uma única **branch de integração**, com cada ticket resolvido do jeito que o rastreador de issues fecha o trabalho.

Os tickets não são uma lista de passos. São um **grafo de tarefas** com relações de bloqueio entre eles. Isso significa que sempre existe uma **fronteira** de tickets prontos para serem pegos.

Comece cada subagente com uma janela de contexto nova.

A comunicação com os subagentes, nos dois sentidos, deve ser enxuta. Comunique-se principalmente por **ponteiros de contexto**: para a spec, os tickets, as notas de pesquisa e os commits anteriores. Não duplique informação que já está disponível pelos ponteiros.

Os **subagentes implementadores** devem rodar em segundo plano sempre que possível, para o máximo de concorrência.

## Passos

1. Leia a spec e os tickets para entender o grafo de tarefas.

2. (opcional) Use um **subagente de exploração** para fazer qualquer exploração que os tickets exijam - arquivos relevantes da base de código ou documentação externa. Garanta que o subagente de exploração consiga salvar arquivos - ele deve salvar suas notas em markdown em um diretório fora do repositório, acessível a todos os subagentes futuros. Isso deixa os **subagentes implementadores** focados na implementação em vez de na exploração.

3. Crie a branch de integração. Se o rastreador de issues fecha o trabalho por meio de PRs, ou se o usuário pedir, abra um PR em rascunho depois do primeiro merge no passo 5 (uma branch sem nenhum commit à frente da main não consegue abrir um), marcado como fechando a spec e os tickets.

4. Use um **subagente implementador** novo para cada ticket, cada um na sua própria worktree e na sua própria branch. Cada subagente implementador:
   - confirma que sua worktree está baseada na branch de integração antes de começar e, se não estiver, faz reset para ela;
   - chama a ferramenta Skill com `tdd` para construir o ticket;
   - faz merge da ponta da branch de integração na sua própria branch antes de informar que terminou

5. Quando um **subagente implementador** terminar, faça o merge do trabalho dele na branch de integração com um **subagente de merge**.

6. Se isso mudar a **fronteira** de tickets disponíveis, dispare mais **subagentes implementadores** para trabalhar nos novos tickets. Isso permite o máximo de concorrência.

7. Quando todos os tickets estiverem concluídos, chame a ferramenta Skill com `code-review` na branch de integração. Corrija todos os problemas apontados pela revisão de código em um único **subagente implementador** novo.

8. Se existir um PR em rascunho, marque-o como pronto para revisão. Caso contrário, resolva cada ticket do jeito que o rastreador de issues fecha o trabalho e informe a branch de integração.

9. Limpe todas as worktrees dos **subagentes implementadores**.
