# Mecânica de skills

O ramo específico de skills de [`writing-for-agents`](SKILL.md): o que muda quando o documento é uma skill (frontmatter, a escolha de invocação e skills roteadoras). Todo o resto sobre como escrevê-la é a referência universal em `SKILL.md`.

## Invocação

Duas escolhas, trocando uma carga pela outra:

- Uma skill **invocada pelo modelo** mantém uma `description`, para que o agente possa dispará-la por conta própria e outras skills possam alcançá-la. Você ainda pode digitar o nome dela: a invocação pelo modelo sempre _inclui_ o alcance do usuário; uma description só acrescenta a descoberta pelo agente, nunca tira a do humano. A description é o ponteiro de contexto de nível mais alto da skill, obrigado a ficar carregado o tempo todo: carga de contexto permanente em troca de ser encontrável. Uma skill invocada pelo modelo cujo conteúdo é todo referência também serve de casa para referência compartilhada: outra skill pode invocá-la, então a referência de que várias skills precisam vive em um só lugar. Mecânica: omita `disable-model-invocation` e escreva uma description voltada para o modelo, com os ramos de gatilho (as regras de escrita de ponteiros de `SKILL.md` valem por inteiro).
- Uma skill **invocada pelo usuário** tira a description do alcance do agente: só o humano digitando o nome dela pode invocá-la, e nenhuma outra skill pode. Carga de contexto zero, mas ela gasta carga cognitiva: você é o índice que precisa lembrar que ela existe. Mecânica: defina `disable-model-invocation: true`; a `description` passa a ser voltada para o humano: um resumo de uma linha, sem listas de gatilhos.

Escolha a invocação pelo modelo só quando o agente precisar alcançar a skill sozinho, ou outra skill precisar. Se ela só é disparada à mão, faça-a invocada pelo usuário e não pague carga de contexto.

Referência compartilhada de que duas skills invocadas pelo usuário precisam não pode morar em nenhuma das duas: sem descriptions, nenhuma consegue disparar a outra. Empurre-a para um arquivo comum fora do sistema de skills: referência externa para a qual qualquer skill pode apontar.

## Dividir por invocação

O corte por invocação na divisão (o corte por sequência fica em `SKILL.md`): separe uma skill invocada pelo modelo quando você tiver uma palavra-guia distinta que deva dispará-la sozinha (uma palavra de gatilho que você realmente usa nos seus prompts), ou quando outra skill precisar alcançá-la. Você paga carga de contexto pela nova description sempre carregada, então esse alcance independente precisa valer a pena.

## Skills roteadoras

Quando as skills invocadas pelo usuário se multiplicam além do que você consegue lembrar, essa carga cognitiva acumulada se cura com uma **skill roteadora**: uma skill invocada pelo usuário que nomeia as outras e diz quando recorrer a cada uma, para que o humano tenha uma skill para lembrar em vez de muitas. Ela só pode sugerir, nunca dispará-las: skills invocadas pelo usuário não têm description, então nada além do humano consegue alcançá-las.
