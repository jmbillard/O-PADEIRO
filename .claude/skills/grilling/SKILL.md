---
name: grilling
description: Interrogue o usuário de forma implacável sobre um plano, uma decisão ou uma ideia. Use quando o usuário quiser testar o próprio raciocínio sob pressão ou usar qualquer expressão de gatilho de 'interrogar' / 'grill'.
---

Entreviste o usuário de forma implacável até chegarem a um entendimento compartilhado. Mapeie isso como uma **árvore de design**: cada decisão se ramifica nas decisões que dependem dela.

Percorra a árvore em **rodadas**. A **fronteira** é toda decisão cujos pré-requisitos já estão resolvidos: as perguntas que você pode fazer _agora_ sem chutar respostas que você ainda não ouviu. Faça a fronteira inteira em uma rodada: numere cada pergunta e dê a resposta que você recomenda. Depois espere as respostas do usuário antes da próxima rodada.

Formate uma rodada assim:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Formule cada pergunta de modo que "sim" aceite a resposta que você recomenda.

Cada rodada que o usuário responde remodela a árvore: decisões resolvidas empurram a fronteira para fora e destravam as perguntas que dependiam delas. Recalcule a fronteira e faça a próxima rodada. Uma pergunta cuja resposta depende de outra pergunta ainda aberta nesta rodada pertence a uma rodada _posterior_, não a esta.

Descobrir _fatos_ é trabalho seu, nunca do usuário. Quando uma pergunta da fronteira precisar de um fato do ambiente (sistema de arquivos, ferramentas etc.), despache um subagente com uma janela de contexto nova para encontrá-lo; não pergunte ao usuário nada que você mesmo possa consultar. Não fique bloqueado por isso: uma exploração em andamento é um pré-requisito não resolvido, então só as perguntas que dependem dela esperam o subagente reportar; faça o resto da fronteira agora. As _decisões_ são do usuário: apresente cada uma a ele e espere.

A sessão termina quando a fronteira está vazia: todos os ramos da árvore de design visitados, nada presumido em silêncio. Não aja com base nela até o usuário confirmar que vocês chegaram a um entendimento compartilhado.
