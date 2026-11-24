---
name: ask-matt
description: Pergunte qual skill ou fluxo serve para a sua situação. Um roteador sobre as skills deste repositório.
disable-model-invocation: true
---

# Pergunte ao Matt

Você não lembra de todas as skills, então pergunte.

Antes de dizer o que uma skill faz ou de recomendar que um passo seja pulado, leia o SKILL.md dessa skill: os resumos aqui servem só para orientação.

Um **fluxo** é um caminho pelas skills. A maioria dos caminhos segue por um **fluxo principal**, e duas **rampas de acesso** desembocam nele. Todo o resto é avulso, ou uma camada de vocabulário que roda por baixo.

## O fluxo principal: ideia → entrega

A rota que a maior parte do trabalho percorre. Você tem uma ideia e quer que ela seja construída.

1. **`/grill-with-docs`** afia a ideia por meio de entrevista. Comece aqui sempre que estiver **trabalhando em um diretório de trabalho**: ela guarda estado, retendo o que aprende em `GLOSSARY.md` e em ADRs. (Sem diretório de trabalho? Use `/grill-me`, que aparece em Avulsas. As duas rodam a mesma primitiva `/grilling`; `grill-with-docs` é a que deixa registro escrito, o que a torna a melhor das duas sempre que houver um repositório onde deixá-lo.)
2. **Bifurcação: dá para resolver todas as perguntas na conversa?** Se uma pergunta precisa de uma resposta executável (estado, regra de negócio, uma UI que você precisa ver), faça um desvio por um protótipo, ligado por **`/handoff`** nos dois sentidos (um protótipo vive no próprio diretório, que é exatamente para isso que `/handoff` existe; veja Fronteiras de fase):
   - **`/handoff`** de ida, depois abra uma sessão nova apontada para esse arquivo,
   - **`/prototype`** para responder a pergunta com código descartável,
   - **`/handoff`** de volta com o que você aprendeu, e referencie isso na thread da ideia original.
3. **Bifurcação: é uma construção de várias sessões?**
   - **Sim** → **`/to-spec`** (transforma a thread em uma especificação (spec)), depois **`/to-tickets`** para dividi-la em tickets de bala traçante (tracer bullet), cada um declarando suas **arestas de bloqueio**. Depois trabalhe os tickets de um de dois jeitos:
     - **`/implement`** por ticket, **dando `/clear` no contexto entre um e outro**. Em um rastreador local, isso é um arquivo por ticket em `.scratch/<feature>/issues/`, trabalhados à mão começando pelos bloqueadores; em um rastreador de verdade, as arestas viram links de bloqueio nativos, então qualquer ticket cujos bloqueadores estejam prontos pode ser pego. Cada ticket é autocontido, então o contexto do anterior é descartável.
     - **`/implement-spec`** para a spec inteira em uma execução só. Ela lê os tickets como um **grafo de tarefas**, roda subagentes implementadores sobre a **fronteira** de tickets prontos em paralelo e junta tudo em uma única **branch de integração**. Use quando preferir orquestrar a construção a conduzir cada ticket você mesmo.
   - **Não** → **`/implement`** aqui mesmo, na mesma janela de contexto.

   De um jeito ou de outro, o código é construído conduzindo **`/tdd`** (uma fatia red-green por vez) e fecha com **`/code-review`**, uma revisão em dois eixos (Padrões + Spec) do diff. `/implement` roda os dois por ticket; os implementadores do `/implement-spec` conduzem cada um seu `/tdd`, e ele roda um `/code-review` sobre a branch de integração. Use **`/tdd`** sozinho quando só quiser construir um comportamento concreto com testes primeiro, sem uma spec completa, e **`/code-review`** sozinho sempre que quiser revisar uma branch ou PR contra um ponto fixo.

   Quando o trabalho sobe como pull request, **`/pr`** dá forma ao corpo: o menor visual que mostra a mudança, evidência de antes/depois de que funciona, e uma avaliação de porta de mão única ou de mão dupla. Ela é invocada pelo modelo, então o agente recorre a ela sempre que escreve um PR.

4. **`/retro`** fecha o ciclo. Depois de uma construção, e principalmente de uma que deu errado, ela repassa a sessão e sugere mudanças no **ambiente** do agente, não no código: indicações de navegação, verificações automáticas, os padrões de código que `/code-review` cobra, arquivos de direcionamento, ferramentas. Erros mecânicos viram verificações determinísticas; decisões de julgamento viram padrões de código. A próxima construção então começa de um ambiente melhor.

### Higiene de contexto

Mantenha os passos 1–3 em **uma janela de contexto contínua** (não compacte nem limpe até depois do `/to-tickets`) para que o interrogatório, a spec e os tickets se apoiem todos no mesmo raciocínio. Cada `/implement` então começa do zero, trabalhando a partir do ticket. Rode `/retro` na sessão que ela vai repassar, antes de limpar; depois de limpar, aponte-a para o log dessa sessão.

O limite disso é a **[smart zone](https://www.aihero.dev/ai-coding-dictionary/smart-zone)**: a janela (~150k tokens nos modelos de ponta) dentro da qual o modelo ainda raciocina com precisão. Se uma sessão se aproximar dela antes do `/to-tickets`, não siga em frente degradado; dê `/compact` na fronteira de fase mais próxima e continue (veja Fronteiras de fase).

## Rampas de acesso

Uma situação inicial que gera trabalho e depois desemboca no fluxo principal.

- **Bugs e pedidos se acumulando** → **`/triage`**. Ela move issues pelos papéis de triagem e produz issues prontas para agentes, que **`/implement`** pega depois.

  A triagem é só para issues **que você não criou**: relatos de bug, pedidos de funcionalidade que chegam, qualquer coisa que chegue crua. Tickets produzidos por `/to-tickets` já estão prontos para agentes, então **não faça triagem deles**.

- **Algo quebrou** → **`/diagnosing-bugs`**. Para os difíceis: o bug que resiste a uma primeira olhada, a falha intermitente, a regressão que entrou entre dois estados sabidamente bons. Ela se recusa a teorizar até ter um **ciclo de retorno (feedback loop) curto** (um comando que já fica vermelho com *este* bug), e então corrige com um teste de regressão. Com a correção feita, rode **`/retro`** na mesma sessão para perguntar o que teria evitado o bug; quando a conclusão real for que não há uma boa costura (seam) para travá-lo, isso é trabalho para **`/improve-codebase-architecture`**.

- **Um esforço enorme e nebuloso: um projeto do zero ou uma funcionalidade enorme, grande demais para uma sessão** → **`/wayfinder`**, o fluxo que mais exige cognitivamente aqui. Quando o caminho daqui até o destino ainda não está visível, ela traça um **mapa compartilhado** de **tickets de decisão** no rastreador de issues e os resolve um de cada vez, produzindo **decisões, não entregáveis**, até a névoa recuar e o caminho ficar claro. Onde **`/grill-with-docs`** afia uma ideia que cabe em uma sessão, wayfinder é para a ideia que não cabe, e é mais lenta e mais densa, então guarde-a exatamente para isso, nunca para uma funcionalidade bem delimitada.

  Quando o mapa clareia, **ela passa o bastão, não constrói**: entre no fluxo principal em **`/to-spec`**, que condensa as decisões interligadas do mapa em um plano construível, e depois `/to-tickets` e `/implement` como de costume. Levar o mapa direto para `/implement` pula essa condensação e joga fora o detalhe interligado, então vá direto para `/implement` só quando o esforço acabou se mostrando realmente pequeno.

## Saúde da base de código

Não é trabalho de funcionalidade, só manutenção.

- **`/improve-codebase-architecture`** roda sempre que você tiver um tempo livre, para manter a base de código boa para os agentes operarem. Ela aponta **oportunidades de aprofundamento**; escolher uma _gera uma ideia_ que você pode levar para o fluxo principal em `/grill-with-docs`. Ela é o levantamento que encontra os candidatos; **`/codebase-design`** (abaixo) é a bancada onde você projeta o escolhido.

## Vocabulário por baixo

Duas referências invocadas pelo modelo que rodam *por baixo* das outras skills, cada uma a única fonte da verdade do seu vocabulário. Recorra a elas diretamente quando o problema forem as **palavras**, não o processo; ou deixe que as skills acima as puxem.

- **`/domain-modeling`**: afia a linguagem de *domínio* do projeto: questiona um termo vago, resolve uma palavra sobrecarregada ("conta" fazendo três papéis), registra uma decisão difícil de reverter como ADR. É a disciplina ativa que `/grill-with-docs` conduz para manter o `GLOSSARY.md` um glossário limpo.
- **`/codebase-design`** é o vocabulário de módulo profundo (módulo, interface, profundidade, costura, adaptador, alavancagem, localidade) para projetar a *forma* de um módulo: muito comportamento atrás de uma interface pequena, em uma costura limpa. `/tdd` e `/improve-codebase-architecture` falam essa língua.

## Fronteiras de fase

Uma **fase** é um bloco de trabalho dentro de uma sessão: o interrogatório, a implementação, o QA. Na **fronteira** entre duas delas você tem cinco opções, e escolher entre elas é a decisão mais nebulosa de todo este mapa:

- **Continuar**: fique onde está. Não custa nada, não perde nada.
- **`/clear`**: esvazia a janela, quando nada daqui importa para o que vem a seguir.
- **`/handoff`** escreve um arquivo markdown portátil. Uso restrito: só para um **novo harness**, um **novo diretório**, um **colega**, ou para desviar uma tarefa paralela **no meio da fase**. O que ele compra é portabilidade.
- **Subagente**: mande uma tarefa bem delimitada para a própria janela e receba um relatório de volta.
- **`/compact`** comprime este contexto e semeia uma sessão nova com ele. O **padrão**, no fundo da árvore e não a primeira opção.

Leia [PHASE-BOUNDARIES.md](PHASE-BOUNDARIES.md) para a árvore ordenada: as cinco perguntas, o raciocínio por trás de cada ramo, e por que o custo da fonte primária faz de **Continuar** a primeira a ser descartada. Tome a decisão **na** fronteira; no meio da fase, continue ou divida o resto em subagentes.

## Avulsas

Totalmente fora do fluxo principal.

- **`/grill-me`**: a mesma entrevista implacável do `/grill-with-docs`, mas **sem estado**: não salva nada localmente e não monta nenhum `GLOSSARY.md`. Use quando você **não estiver trabalhando em um diretório de trabalho** (afiando um plano, um design, um texto, qualquer coisa sem repositório por baixo). Se estiver em um diretório de trabalho, use `/grill-with-docs`: ela roda a mesma entrevista e deixa registro escrito, então é estritamente a melhor.
- **`/grilling`** é a própria primitiva de entrevista: rodadas, a fronteira, fatos são trabalho do agente e decisões são suas. `/grill-me` e `/grill-with-docs` são as duas entradas nomeadas, e `/triage`, `/wayfinder` e `/improve-codebase-architecture` a rodam internamente. Use diretamente só quando quiser a entrevista sem nada em volta.
- **`/prototype`** é um programa pequeno e descartável que responde uma pergunta de design: esse modelo de estado parece certo, ou como essa UI deveria ser. Descartável é uma restrição sobre como o código é escrito, não uma promessa de destruí-lo: a resposta é incorporada ao código de verdade, e o protótipo em si é guardado como **fonte primária** em uma branch `prototype/<name>` saída da main, referenciada na issue de implementação. É o desvio no passo 2 do fluxo principal, mas use a qualquer momento em que uma pergunta de design for difícil de resolver no papel.
- **`/research`**: delegue o trabalho braçal de leitura a um **agente em segundo plano**: ele investiga uma pergunta em **fontes primárias** e depois deixa um arquivo Markdown com citações no repositório. Continue trabalhando enquanto ele lê. O arquivo que ele produz é algo para levar *para dentro* do fluxo principal em `/grill-with-docs`, já que a pesquisa alimenta o raciocínio em vez de substituí-lo.
- **`/to-questionnaire`** entra quando o que está te travando não está na sua cabeça nem na base de código, mas na **de outra pessoa**, e escreve para ela um questionário para preencher. É o inverso do `/grill-me`: em vez de te entrevistar sobre o assunto, te entrevista sobre o **envio** (para quem vai, o que você precisa de volta) e mira as perguntas na lacuna. O que volta é material para `/grill-with-docs` ou `/to-spec`.
- **`/wizard`** é para os passos que só um **humano** pode dar: provisionar infraestrutura, configurar credenciais ou segredos de CI, clicar por um painel de terceiros desconhecido, rodar uma migração ou virada pontual. Ela gera um script bash interativo que abre cada URL, captura cada valor e grava no `.env` e nos segredos do GitHub, para que o procedimento deixe de ser algo que você reexplica a um agente toda vez. Invocada pelo modelo, então o agente recorre a ela no momento em que bate em uma parede que só você pode passar. Se o agente pudesse simplesmente fazer sozinho, deveria; isto é para onde um humano está de fato no circuito.
- **`/wait-what`** é o corretivo para uma mensagem que não pegou. Use no meio da conversa, dentro de qualquer outra skill, e o agente reapresenta o que acabou de dizer com o contexto que te faltava, em linguagem simples, usando o vocabulário do `GLOSSARY.md`. Ela funciona depois do fato; `/grill-with-docs` é a cura antecipada, porque uma linguagem compartilhada acordada cedo é o que impede o jargão de sequer aparecer.
- **`/teach`**: aprenda um conceito ao longo de várias sessões, usando o diretório atual como espaço de trabalho com estado.
- **`/writing-for-agents`** é a referência para escrever documentos que agentes consomem: skills, AGENTS.md, documentos referenciados.

## Pré-requisito

**`/setup-matt-pocock-skills`**: rode antes do seu primeiro fluxo de engenharia para configurar o rastreador de issues, os rótulos de triagem e a organização de documentos que as outras skills pressupõem. Rastreadores de issues personalizados também funcionam.
