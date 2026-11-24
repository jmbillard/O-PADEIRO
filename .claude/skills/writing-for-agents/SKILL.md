---
name: writing-for-agents
description: Escrever documentos para agentes. Use ao criar ou editar skills, ou ao modificar AGENTS.md ou CLAUDE.md.
---

Referência para escrever qualquer documento que um agente consome: uma skill, um `AGENTS.md` / `CLAUDE.md`, um documento alcançado por um ponteiro. A embalagem muda; a escrita não: as mesmas alavancas tornam cada um previsível, já que o agente segue o mesmo _processo_ a cada execução, em vez de produzir a mesma saída.

Quando o documento que você está escrevendo for uma skill, leia [`SKILL-MECHANICS.md`](SKILL-MECHANICS.md) para frontmatter, escolha de invocação e skills roteadoras.

## Ponteiros de contexto

Um **ponteiro de contexto** é uma referência mantida no contexto do agente que nomeia algum material fora do contexto e codifica a condição para alcançá-lo. A description de uma skill é um; uma linha no `AGENTS.md` que nomeia um documento é o mesmo objeto. É a _redação_ do ponteiro, não o alvo dele, que decide quando o agente alcança o material, e com que confiabilidade. Um alvo indispensável atrás de um ponteiro mal redigido é um bug de variância: afie a redação primeiro, e só coloque o material inline se afiar não resolver.

Um ponteiro faz dois trabalhos: dizer o que é o material e listar os **ramos** que devem levar a alcançá-lo (um ramo é um caso distinto que o documento trata, de modo que execuções diferentes seguem caminhos diferentes por ele). Cada palavra de um ponteiro sempre carregado custa a cada turno, então ele merece uma poda ainda mais rigorosa que o corpo:

- **Ponha a palavra-guia na frente**: o ponteiro é onde ela faz o trabalho de disparar.
- **Um gatilho por ramo.** Sinônimos que renomeiam um único ramo são um ramo escrito duas vezes; junte-os e mantenha só os ramos de fato distintos.
- **Corte a identidade que o corpo já carrega.**

## As duas cargas

Todo documento e todo ponteiro que você acrescenta gasta um de dois orçamentos:

- **Carga de contexto** é o custo do material sempre carregado na janela do agente: uma linha do `AGENTS.md`, a description de uma skill, qualquer coisa que fica no contexto a cada turno, gastando tokens e atenção quer seja acionada, quer não.
- **Carga cognitiva** é o custo para o humano: quais documentos existem e quando recorrer a cada um. O humano é o índice. Não é um custo a minimizar: é o preço da autonomia humana; gaste-o onde o julgamento humano importa, remova-o onde não importa.

Material alcançado só por um ponteiro escapa da carga de contexto ao preço da própria linha do ponteiro; material sem nenhum ponteiro depende inteiramente da carga cognitiva.

## Hierarquia de informação

Um documento é feito de dois tipos de conteúdo: **passos** (as ações ordenadas que o agente executa) e **referência** (definições, regras, fatos consultados sob demanda). Os dois se misturam livremente: só passos (uma receita), só referência (as regras de uma revisão, esta skill) ou ambos. A decisão central é onde cada pedaço fica na **hierarquia de informação**, uma escada ordenada pela urgência com que o agente precisa do material:

1. **Passo no arquivo** é o nível principal: o que o agente faz, em ordem.
2. **Referência no arquivo** é consultada sob demanda. Muitas vezes é um conjunto de pares legitimamente plano (todas as regras de uma revisão no mesmo degrau), o que é um arranjo perfeitamente bom, não um mau sinal.
3. **Referência revelada** é empurrada para um arquivo separado, alcançada por um ponteiro de contexto, carregada só quando o ponteiro dispara. Vai desde um arquivo irmão na mesma pasta até referência totalmente externa, que fica em qualquer lugar e para a qual qualquer documento pode apontar.

Empurre de menos e o topo incha; empurre demais e você esconde material de que o agente de fato precisa. Essa tensão é a decisão inteira.

**Revelação progressiva** é o movimento escada abaixo (para fora do arquivo principal e para trás de um ponteiro), para que o topo continue legível. Não é principalmente uma otimização de tokens: é como a hierarquia é protegida. A ramificação é o teste mais limpo de revelação: deixe inline o que todo ramo precisa e empurre para trás de um ponteiro o que só alguns ramos alcançam. Quando um documento tem passos, referência no arquivo que deveria ser revelada os enterra e transforma prestar atenção neles em cara ou coroa: uma alavanca de variância, não só de legibilidade.

**Co-localização** é a companheira dentro do arquivo: enquanto a escada decide _quão abaixo_ um pedaço fica, a co-localização decide _o que fica ao lado dele_ uma vez lá. Mantenha a definição, as regras e as ressalvas de um conceito sob um mesmo título em vez de espalhadas, para que ler uma parte traga as vizinhas junto. O teste: o documento deve ler como documentação escrita para o agente. Material agrupado lê assim; material espalhado não. (É diferente de duplicação: ela repete um significado em dois lugares; o espalhamento fragmenta um significado em muitos.)

**Inchaço** é o modo de falha aqui: um documento simplesmente longo demais, mesmo quando cada linha está viva e é única. A atenção se dilui no excesso, e cada linha a mais é mais uma a manter relevante. A cura é a escada: revele referência atrás de ponteiros e divida por ramo ou sequência para que cada caminho carregue só o que precisa.

## Passos e critérios de conclusão

Todo passo termina em um **critério de conclusão**, a condição que diz ao agente que o trabalho está feito. Duas propriedades fazem dele uma alavanca:

- **Clareza**: o agente consegue distinguir feito de não feito? Um limite vago ("entendimento alcançado") convida à **conclusão prematura**: encerrar o passo antes de ele estar de fato feito, com a atenção escorregando para _estar pronto_. Os passos visíveis ainda pela frente (os **passos pós-conclusão**) fornecem a atração; a clareza do critério é a resistência. Defenda nesta ordem: **afie o limite primeiro** (local e barato); só se ele for irredutivelmente difuso _e_ você observar a pressa, esconda os passos seguintes dividindo a sequência. Esconder só funciona através de uma fronteira de contexto real (uma passagem de bastão [handoff] ou o despacho de um subagente; uma chamada inline deixa os passos seguintes no contexto e não limpa nada).
- **Exigência**: quanto ele requer. "Todo model modificado contabilizado" força um trabalho minucioso onde "produza uma lista de mudanças" não força. A exigência move o **trabalho de apuração** (a escavação que o agente faz dentro do trabalho, latente na redação em vez de escrita como passo próprio), e não está presa a passos: "toda regra aplicada" amarra um corpo de referência plana assim como "todo passo feito" amarra uma sequência, e é assim que um documento só de referência ainda carrega uma barra de exaustividade.

Os critérios mais fortes são ao mesmo tempo verificáveis e exaustivos.

## Quando dividir

Dividir um documento em dois gasta uma das duas cargas, então divida só quando o corte compensar:

- **Por sequência**: divida uma série de passos quando os passos pós-conclusão tentam o agente a apressar o passo diante dele. Mantê-los fora de vista gera mais trabalho de apuração na tarefa atual. Cuidado com o inverso: juntar sequências expõe cada passo aos passos seguintes, convidando à conclusão prematura.
- **Por invocação**, específico de skills: veja [`SKILL-MECHANICS.md`](SKILL-MECHANICS.md).

## Palavras-guia

Uma **palavra-guia** é um conceito compacto que já vive no pré-treinamento do modelo e com o qual o agente pensa enquanto executa o documento (_lição_, _névoa de guerra_, _balas traçantes_). Repetida como token, nunca como frase, ela acumula uma definição distribuída e ancora uma região inteira de comportamento com o mínimo de tokens, recrutando conhecimentos prévios que o modelo já tem. Cunhar a sua própria funciona se você a definir com clareza, mas uma palavra inventada não recruta conhecimento prévio nenhum: você paga em tokens de definição o que uma palavra pré-treinada dá de graça; procure primeiro uma palavra existente.

Ela ancora duas vezes. No corpo, a _execução_: o agente recorre ao mesmo comportamento toda vez que a palavra aparece, e dentro de referência plana ela concentra a atenção em uma classe de coisa a procurar. Em um ponteiro, a _invocação_: quando a mesma palavra vive nos seus prompts, nos seus documentos e no seu código, o agente liga essa linguagem compartilhada ao material e o alcança com mais confiabilidade.

Cace oportunidades de refatorar com palavras-guia. Uma tríade escrita por extenso em três lugares, um ponteiro gastando uma frase para acenar para uma ideia. Cada um é um trecho implorando para se condensar em um único token:

- "rápido, determinístico, de baixo custo" → _enxuto_ (um ciclo _enxuto_).
- "um ciclo em que você confia" → _vermelho_, transformando um critério difuso em um estado binário observável (o ciclo fica _vermelho_ com o bug, ou não fica).

Você ganha duas vezes: menos tokens e um gancho mais nítido para o agente pendurar o raciocínio. Parta do princípio de que todo documento carrega reformulações que palavras-guia aposentariam. Vá atrás delas.

**Negação** é o modo de falha ao lado desta alavanca: guiar por proibição arrasta o comportamento proibido para o contexto e o torna _mais_ disponível, não menos. _Não pense em um elefante_, e o elefante é tudo o que existe; a negação é um modificador fraco que o conceito fortemente ativado atropela, então a proibição é meio lida como uma instrução para fazer a coisa. Use o prompt **positivo**: declare o comportamento-alvo ("escreva comentários de uma linha") para que o proibido nunca seja dito. Uma proibição só merece seu lugar como uma barreira rígida que você não consegue formular de forma positiva; mesmo assim, junte-a ao alvo positivo para que a atenção caia no que fazer.

## Poda

- Mantenha cada significado em uma **fonte única da verdade**: um lugar com autoridade, para que mudar o comportamento seja uma edição em um só lugar. **Duplicação** (o mesmo significado em mais de um lugar) custa manutenção e tokens, e infla a proeminência de um significado na escada além do seu nível real. (É o inverso acidental de uma palavra-guia, que repete um token de propósito, nunca o significado.)
- O **ambiente** também é uma fonte da verdade (scripts do `package.json`, arquivos de configuração, a estrutura de diretórios, a saída de `--help`), e um documento que o repete é um **cache**: uma cópia de uma consulta, que só compensa a carga quando a consulta é cara. Guarde em cache o que o agente não encontra olhando: a convenção não escrita, o motivo por trás de uma escolha, a pegadinha que nenhuma configuração confessa. Deixe as consultas de um arquivo ou de um comando para o ambiente, onde não podem ficar desatualizadas.
- Verifique cada linha quanto à **relevância**: ela ainda tem a ver com o que o documento faz? Uma linha perde relevância por nunca ter tido a ver com a tarefa (mera exposição, ou um ramo que deveria ser revelado) ou por ficar desatualizada à medida que o comportamento ou o mundo que ela descreve muda. Documentos mais curtos são mais fáceis de manter relevantes. Sem uma disciplina de poda, o destino padrão é o **sedimento**: camadas desatualizadas que se depositam porque acrescentar parece seguro e remover parece arriscado, até você ter que perfurar através delas para achar o que ainda está vivo.
- Cace **no-ops** frase por frase: uma instrução que o modelo já obedece por padrão paga carga para não dizer nada. O teste (ela muda o comportamento em relação ao padrão?) é relativo ao modelo, não ao leitor: duas pessoas que discordam sobre um no-op discordam sobre o padrão, e resolvem isso executando o documento, não debatendo. Quando uma frase reprova, apague a frase inteira em vez de cortar palavras dela. O teste também avalia palavras-guia: uma palavra fraca demais para vencer o padrão (_seja minucioso_ quando o agente já é mais ou menos minucioso) é um no-op, e a correção é uma palavra mais forte (_implacável_), não uma técnica diferente.
