# Fronteiras de fase

Uma **fase** é um bloco de trabalho dentro de uma sessão: o interrogatório, a implementação, o QA. A definição é vaga de propósito: uma fase termina quando você pensa *"ok, terminamos isso"*.

A **fronteira de fase** é o intervalo entre duas fases, e é o único lugar onde esta decisão cabe. No meio da fase não há decisão a tomar: continue, ou divida o trabalho que resta em subagentes. Compactar no meio da fase faz o agente perder o fio.

## As cinco opções

| Opção        | O que faz                                                       |
| ------------ | --------------------------------------------------------------- |
| **Continuar** | Fica na sessão. Nenhuma troca de contexto.                      |
| **`/clear`** | Esvazia a janela de contexto e começa do nada.                  |
| **`/handoff`** | Escreve um arquivo markdown portátil e semeia uma sessão em qualquer lugar com ele. |
| **Subagente** | Manda a tarefa para a própria janela de contexto e recebe um relatório de volta. |
| **`/compact`** | Comprime este contexto e semeia uma sessão nova com o resumo.  |

## A árvore

Percorra de cima para baixo na fronteira. O primeiro **sim** vence.

**1. Dá para continuar nesta sessão?** Duas coisas tornam a resposta sim: a próxima fase precisa desta fase como **fonte primária**, ou sobra [smart zone](https://www.aihero.dev/ai-coding-dictionary/smart-zone) suficiente (~150k tokens) para a próxima fase caber. Interrogatório → implementação é o sim típico: a implementação quer o raciocínio na íntegra, não um resumo dele. Continuar não custa nada e não perde nada, então descarte essa opção antes de qualquer outra.

**2. O contexto é irrelevante para o que vem a seguir?** Tudo nesta sessão (a exploração, as decisões, os becos sem saída) é descartável? Se sim, **`/clear`**. É a jogada mais barata do tabuleiro: não leva tempo e devolve a janela inteira. `/clear` também não é definitivo: a sessão antiga continua podendo ser retomada.

O custo de errar aqui é de mão única. Limpe um contexto *relevante* e você perde o **porquê** do que construiu, e nenhuma releitura do diff o traz de volta.

**3. Você precisa passar o bastão?** `/handoff` é de uso restrito. Você só precisa dele quando está:

- trocando para um **novo harness** (Claude → Codex),
- indo para um **novo diretório** ou repositório,
- mandando o trabalho para um **colega**,
- ou desviando uma tarefa paralela que você encontrou **no meio da fase** sem tirar do trilho o que está fazendo.

Essa lista é a cláusula inteira. O que `/handoff` compra é **portabilidade**: um arquivo que viaja. Se nada está viajando, você não precisa dele.

**4. A tarefa pode ser feita AFK?** Ela está delimitada o bastante para rodar com você longe do teclado, sem direcionamento? Então mande para um **subagente** e deixe esta sessão intacta. Revisão automatizada é o caso típico: o agente lê o diff e relata, e você não é necessário enquanto isso.

**5. Caso contrário, `/compact`.** Contexto relevante, mesmo harness, mesmo diretório, e você precisa continuar no circuito: é aqui que a árvore termina, e termina aqui com frequência. Passe uma instrução (`/compact we're going to QA this area`) para que o resumo guarde o que a próxima fase precisa.

`/compact` é o **padrão, não a primeira opção**. Ele fica no fundo porque as quatro perguntas acima são todas mais baratas ou mais precisas. A falha típica quando as pessoas começam por aqui é uma sessão nova que está confiantemente errada sobre uma decisão que o resumo achatou.

## Fontes primárias e secundárias

Toda jogada exceto **Continuar** transforma uma **fonte primária** em uma **fonte secundária**: a sessão como aconteceu, substituída por um resumo dela. A troca tem sempre a mesma forma:

| Fonte                             | Informação  | Ruído | Espaço de manobra |
| --------------------------------- | ----------- | ----- | ----------------- |
| Primária (Continuar)              | Completa    | Muito | Pouco             |
| Secundária (`/compact`, `/handoff`) | Com perdas | Menos | Muito             |

É por isso que a pergunta 1 vem primeiro. Você só paga a perda quando ficar custa mais do que economiza.

## São decisões de julgamento

As perguntas não são objetivas: cada uma tem gosto pessoal, e a mesma fronteira pode ir para dois lados em dois dias diferentes. O valor está em fazê-las **na ordem**, na fronteira e não no meio do trabalho.
