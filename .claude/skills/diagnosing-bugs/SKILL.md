---
name: diagnosing-bugs
description: Ciclo de diagnóstico para bugs difíceis e regressões de desempenho. Use quando o usuário disser "diagnostique"/"depure isso" ("diagnose"/"debug this"), ou relatar algo quebrado, lançando erro, falhando ou lento.
---

# Diagnosticando bugs

Uma disciplina para bugs difíceis. Pule fases só quando houver justificativa explícita.

Ao explorar o código, leia o `GLOSSARY.md` (se existir) para formar um modelo mental claro dos módulos relevantes, e confira os ADRs da área em que você está mexendo.

## Oculte segredos

Esta skill faz você mostrar comandos, saídas e artefatos capturados. **Oculte todo segredo antes**: escreva `<REDACTED>` no lugar dele. Monte os ciclos usando variáveis de ambiente, para que a credencial fique no ambiente e não no que você mostra. Artefatos capturados trazem cabeçalhos de autenticação: cite só as linhas que carregam o sinal.

Se a saída com os segredos ocultos não bastar para diagnosticar o bug, diga isso e pergunte ao usuário.

## Fase 1: Monte um ciclo de retorno (feedback loop)

**Esta é a skill.** Todo o resto é mecânico. Se você tem um sinal de passa/falha **apertado** para o bug (um que fica vermelho _neste_ bug), você vai achar a causa; bissecção, teste de hipóteses e instrumentação só consomem esse sinal. Se você não tem um, nenhuma quantidade de olhar para o código vai te salvar.

Gaste um esforço desproporcional aqui. **Seja agressivo. Seja criativo. Recuse-se a desistir.**

### Formas de montar um, mais ou menos nesta ordem

1. **Teste que falha** em qualquer costura (seam) que alcance o bug: unitário, de integração, e2e.
2. **Curl / script HTTP** contra um servidor de desenvolvimento rodando.
3. **Chamada de CLI** com uma entrada de fixture, comparando o stdout com um snapshot sabidamente correto.
4. **Script de navegador headless** (Playwright / Puppeteer) que conduz a UI e faz asserções sobre DOM/console/rede.
5. **Reproduza um trace capturado.** Salve em disco uma requisição de rede / payload / log de eventos real; reproduza-o isoladamente pelo caminho de código.
6. **Harness descartável.** Suba um subconjunto mínimo do sistema (um serviço, dependências mockadas) que exercite o caminho de código do bug com uma única chamada de função.
7. **Ciclo de propriedades / fuzz.** Se o bug é "às vezes a saída sai errada", rode 1000 entradas aleatórias e procure o modo de falha.
8. **Harness de bissecção.** Se o bug apareceu entre dois estados conhecidos (commit, conjunto de dados, versão), automatize "subir no estado X, verificar, repetir" para poder usar `git bisect run`.
9. **Ciclo diferencial.** Passe a mesma entrada pela versão antiga e pela nova (ou por duas configurações) e compare as saídas.
10. **Script bash HITL.** Último recurso. Se um humano precisa clicar, conduza _ele_ com `scripts/hitl-loop.template.sh` para que o ciclo continue estruturado. A saída capturada volta para você.

Monte o ciclo de retorno certo e o bug está 90% resolvido.

### Aperte o ciclo

Trate o ciclo como um produto. Depois que você tiver _um_ ciclo, **aperte-o**:

- Dá para deixá-lo mais rápido? (Faça cache do setup, pule inicializações não relacionadas, restrinja o escopo do teste.)
- Dá para deixar o sinal mais nítido? (Faça a asserção sobre o sintoma específico, não sobre "não quebrou".)
- Dá para deixá-lo mais determinístico? (Fixe o tempo, defina a semente do RNG, isole o sistema de arquivos, congele a rede.)

Um ciclo instável de 30 segundos é pouco melhor que nenhum ciclo; um determinístico de 2 segundos é apertado, um superpoder de depuração.

### Bugs não determinísticos

O objetivo não é uma reprodução limpa, e sim uma **taxa de reprodução maior**. Rode o gatilho 100× em loop, paralelize, adicione carga, estreite as janelas de tempo, injete sleeps. Um bug que falha em 50% das vezes dá para depurar; um de 1% não, então continue aumentando a taxa até dar para depurar.

### Quando você realmente não consegue montar um ciclo

Pare e diga isso explicitamente. Liste o que você tentou. Peça ao usuário: (a) acesso ao ambiente que reproduz o bug, (b) um artefato capturado com os segredos ocultos (arquivo HAR, dump de log, core dump, gravação de tela com timestamps), ou (c) permissão para adicionar instrumentação temporária em produção. **Não** siga para hipóteses sem um ciclo.

### Critério de conclusão: um ciclo apertado que fica vermelho

A Fase 1 termina quando o ciclo está **apertado** e **capaz de ficar vermelho**: você consegue apontar **um comando** (o caminho de um script, uma chamada de teste, um curl) que você **já rodou pelo menos uma vez** (mostre a chamada e a saída, com os segredos ocultos), e que é:

- [ ] **Capaz de ficar vermelho**: ele percorre o caminho de código real do bug e faz a asserção sobre o **sintoma exato do usuário**, então pode ficar vermelho neste bug e verde depois de corrigido. Não basta "roda sem erro"; ele tem de ser capaz de _pegar este bug específico_.
- [ ] **Determinístico**: o mesmo veredito em toda execução (bugs instáveis: uma taxa de reprodução alta e fixada, conforme acima).
- [ ] **Rápido**: segundos, não minutos.
- [ ] **Executável por agente**: você consegue rodá-lo sem supervisão; humano no ciclo só via `scripts/hitl-loop.template.sh`.

Se você se pegar lendo código para montar uma teoria antes de esse comando existir, **pare: pular direto para uma hipótese é exatamente a falha que esta skill evita.** Sem comando capaz de ficar vermelho, sem Fase 2.

## Fase 2: Reproduza + minimize

Rode o ciclo. Veja-o ficar vermelho quando o bug aparece.

Confirme:

- [ ] O ciclo produz o modo de falha que o **usuário** descreveu, e não uma falha diferente que por acaso está por perto. Bug errado = correção errada.
- [ ] A falha se reproduz em várias execuções (ou, para bugs não determinísticos, se reproduz a uma taxa alta o bastante para depurar).
- [ ] Você capturou o sintoma exato (mensagem de erro, saída errada, tempo lento) para que as fases seguintes possam verificar se a correção realmente o resolve.

### Minimize

Assim que estiver vermelho, reduza a reprodução ao **menor cenário que ainda fica vermelho**. Corte entradas, chamadores, configuração, dados e passos **um de cada vez**, rodando o ciclo de novo depois de cada corte, e mantenha só o que sustenta a falha.

Por que se dar ao trabalho: uma reprodução mínima encolhe o espaço de hipóteses na Fase 3 (menos peças móveis sobrando para suspeitar) e vira o teste de regressão limpo na Fase 5.

Termina quando **todo elemento restante sustenta a falha**: remover qualquer um deles faz o ciclo ficar verde.

Não avance até ter reproduzido **e** minimizado.

## Fase 3: Levante hipóteses

Gere **de 3 a 5 hipóteses ranqueadas** antes de testar qualquer uma delas. Gerar uma hipótese só ancora na primeira ideia plausível.

Cada hipótese tem de ser **falseável**: declare a previsão que ela faz.

> Formato: "Se <X> é a causa, então <mudar Y> fará o bug sumir / <mudar Z> o deixará pior."

Se você não consegue declarar a previsão, a hipótese é só uma impressão: descarte-a ou deixe-a mais precisa.

**Mostre a lista ranqueada ao usuário antes de testar.** Ele muitas vezes tem conhecimento de domínio que muda o ranking na hora ("acabamos de fazer deploy de uma mudança na #3"), ou conhece hipóteses que já descartou. Checkpoint barato, grande economia de tempo. Não fique travado nisso; siga com o seu ranking se o usuário estiver ausente.

## Fase 4: Instrumente

Cada sonda tem de corresponder a uma previsão específica da Fase 3. **Mude uma variável de cada vez.**

Ferramentas, em ordem de preferência:

1. **Inspeção com debugger / REPL**, se o ambiente permitir. Um breakpoint vale mais que dez logs.
2. **Logs direcionados** nas fronteiras que distinguem as hipóteses.
3. Nunca "logar tudo e dar grep".

**Marque todo log de depuração** com um prefixo único, por exemplo `[DEBUG-a4f2]`. A limpeza no final vira um único grep. Logs sem marca sobrevivem; logs marcados morrem.

**Ramo de desempenho.** Para regressões de desempenho, logs costumam ser a ferramenta errada. Em vez disso: estabeleça uma medição de referência (harness de tempo, `performance.now()`, profiler, plano de consulta) e depois faça bissecção. Primeiro meça, depois corrija.

## Fase 5: Correção + teste de regressão

Escreva o teste de regressão **antes da correção**, mas só se houver uma **costura correta** para ele.

Uma costura correta é aquela em que o teste exercita o **padrão real do bug** como ele ocorre no ponto de chamada. Se a única costura disponível for rasa demais (teste com um só chamador quando o bug precisa de vários chamadores, teste unitário que não consegue replicar a cadeia que disparou o bug), um teste de regressão ali dá uma falsa confiança.

**Se não existe costura correta, isso em si é a descoberta.** Anote. A arquitetura do código está impedindo que o bug seja travado. Sinalize isso para a próxima fase.

Se existe uma costura correta:

1. Transforme a reprodução minimizada em um teste que falha nessa costura.
2. Veja-o falhar. Se você forçou o vermelho alterando código ou uma fixture, faça um `diff` contra uma cópia intacta para provar que a alteração entrou antes de confiar nela.
3. Aplique a correção.
4. Veja-o passar.
5. Rode de novo o ciclo de retorno da Fase 1 contra o cenário original (não minimizado).

## Fase 6: Limpeza

Obrigatório antes de declarar que terminou:

- [ ] A reprodução original não reproduz mais (rode de novo o ciclo da Fase 1)
- [ ] O teste de regressão passa (ou a ausência de costura está documentada)
- [ ] Toda instrumentação `[DEBUG-...]` foi removida (dê `grep` no prefixo)
- [ ] Protótipos descartáveis foram apagados (ou movidos para um local de depuração claramente marcado)
- [ ] A hipótese que se mostrou correta está declarada na mensagem do commit / PR, para que o próximo a depurar aprenda
