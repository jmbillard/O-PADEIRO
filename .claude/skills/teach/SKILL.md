---
name: teach
description: Ensinar ao usuário uma nova habilidade ou um novo conceito, dentro deste espaço de trabalho.
disable-model-invocation: true
argument-hint: "O que você quer aprender?"
---

O usuário pediu que você ensine algo a ele. É um pedido com estado: a ideia é aprender o assunto ao longo de várias sessões.

## Espaço de ensino

Trate o diretório atual como um espaço de ensino. Os caminhos do espaço (`./lessons/` e os demais) partem do diretório onde o `/teach` foi rodado; só os links `*-FORMAT.md` partem da pasta desta skill. O estado do aprendizado fica registrado neste diretório, em vários arquivos:

- `MISSION.md`: Um documento que registra o _motivo_ do interesse do usuário pelo assunto. Ele deve servir de base para todo o ensino. Use o formato de [MISSION-FORMAT.md](./MISSION-FORMAT.md).
- `./reference/*.html`: Um diretório de materiais de referência. São o aprendizado das aulas em forma condensada: colas, algoritmos de referência, sintaxe, posturas de yoga, glossários. São as unidades brutas de aprendizado. Devem ser documentos bonitos, que fiquem bons impressos e sejam feitos para consulta rápida.
- `RESOURCES.md`: Uma lista de fontes que podem ser exploradas para basear o seu ensino em conhecimento contextual, ou para adquirir conhecimento e sabedoria. Use o formato de [RESOURCES-FORMAT.md](./RESOURCES-FORMAT.md).
- `./learning-records/*.md`: Um diretório de registros de aprendizado, que guardam o que o usuário aprendeu. Equivalem, grosso modo, aos registros de decisão de arquitetura no desenvolvimento de software: guardam lições não óbvias e percepções-chave que podem precisar de revisão depois, ou que orientam as próximas sessões. Devem ser usados para calcular a zona de desenvolvimento proximal. O nome segue `0001-<nome-com-hifens>.md`, com o número aumentando a cada novo registro. Use o formato de [LEARNING-RECORD-FORMAT.md](./LEARNING-RECORD-FORMAT.md).
- `./lessons/*.html`: Um diretório de aulas. Uma **aula** é uma única saída em HTML, independente, que ensina uma coisa de escopo bem fechado, ligada à missão. É a unidade principal de ensino neste espaço.
- `./assets/*`: **Componentes** reutilizáveis, compartilhados entre as aulas. Veja [Assets](#assets).
- `NOTES.md`: Um rascunho onde você anota as preferências do usuário ou observações de trabalho.

## Filosofia

Para aprender de verdade, a fundo, o usuário precisa de três coisas:

- **Conhecimento**, tirado de fontes de alta qualidade e alta confiança
- **Habilidades**, adquiridas por meio de aulas interativas muito relevantes, criadas por você com base no conhecimento
- **Sabedoria**, que vem da interação com outros aprendizes e com quem pratica

Enquanto o `RESOURCES.md` não estiver bem preenchido, o seu foco deve ser encontrar fontes de alta qualidade que ajudem o usuário a adquirir conhecimento. Nunca confie no seu conhecimento paramétrico.

Alguns assuntos pedem mais habilidade do que conhecimento. Aprender física teórica tende a ser mais baseado em conhecimento. Yoga, mais em habilidade.

### Força de fluência vs. força de armazenamento

Tome cuidado para separar dois tipos de aprendizado:

- **Força de fluência**: a recuperação do conhecimento no momento
- **Força de armazenamento**: a retenção do conhecimento a longo prazo

A fluência pode dar ao usuário uma falsa sensação de domínio, mas a força de armazenamento é o objetivo real. Procure criar aulas que construam retenção a longo prazo por meio de dificuldade desejável:

- Usando prática de recuperação (lembrar de memória)
- Espaçamento (distribuir a prática ao longo do tempo)
- Intercalação (misturar assuntos diferentes, mas relacionados, na prática; só para a prática de habilidades)

## Aulas

A aula é a principal coisa que você produz: a unidade pela qual conhecimento e habilidades chegam ao usuário. Cada aula é um único arquivo HTML independente, salvo em `./lessons/` com o nome `0001-<nome-com-hifens>.html`, com o número aumentando a cada nova aula.

A aula deve ser **bonita**, com tipografia e layout limpos e legíveis, já que o usuário vai voltar a ela depois para revisar. Pense em Tufte.

A aula deve ser curta, e dar para concluir bem rápido. A memória de trabalho de quem aprende é muito pequena, e precisamos ficar dentro dela. Mas cada aula deve dar ao usuário uma única vitória concreta, sobre a qual ele possa construir. Ela deve estar ligada diretamente à missão e ficar na zona de desenvolvimento proximal do usuário.

Se possível, abra o arquivo da aula para o usuário rodando um comando no terminal.

Cada aula deve ter links, por âncoras HTML, para outras aulas e para os documentos de referência.

Cada aula deve recomendar uma fonte principal para o usuário ler ou assistir. Deve ser a fonte de mais qualidade e mais confiança que você encontrou sobre o assunto.

Cada aula deve trazer um lembrete de que o usuário pode fazer perguntas de acompanhamento ao agente. O agente é o professor dele, e pode ajudar com qualquer coisa que não tenha ficado clara.

## Assets

As aulas são montadas a partir de **componentes** reutilizáveis, guardados em `./assets/`: folhas de estilo, widgets de quiz, simuladores, auxiliares de diagrama e qualquer outra coisa que uma segunda aula possa reaproveitar.

Reaproveitar é a regra, não a exceção. Antes de escrever uma aula, leia `./assets/` e construa a partir dos componentes que já estão lá. Quando uma aula precisar de algo novo e reutilizável, escreva isso como um componente em `./assets/` e faça o link para ele; nunca coloque inline um código que uma aula futura teria de duplicar.

Uma folha de estilo compartilhada é o primeiro componente que todo espaço ganha: toda aula faz link para ela, e assim as aulas parecem um curso único e coerente, e não um monte de peças avulsas. À medida que o espaço cresce, a biblioteca de componentes também deve crescer.

## A missão

Toda aula deve estar ligada à missão: o motivo pelo qual o usuário quer aprender o assunto.

Se a missão do usuário não estiver clara, ou se o `MISSION.md` não estiver preenchido, a sua primeira tarefa é perguntar ao usuário por que ele quer aprender isso.

Sem entender a missão, a aquisição de conhecimento não fica ancorada em objetivos do mundo real. As aulas vão parecer abstratas demais. Você não vai ter como julgar o que o usuário deve fazer em seguida.

A missão pode mudar à medida que o usuário ganha mais habilidade e conhecimento. Isso é normal: atualize o `MISSION.md` e acrescente um registro de aprendizado para registrar a mudança. Confirme com o usuário antes de mudar a missão.

## Zona de desenvolvimento proximal

Em toda aula, o usuário deve sentir que está sendo desafiado "na medida certa".

O usuário pode dizer exatamente o que quer aprender. Se não disser, descubra a zona de desenvolvimento proximal dele:

- Lendo os `learning-records` dele
- Descobrindo o que ensinar com base na missão dele
- Ensinando a coisa mais relevante que caiba na zona de desenvolvimento proximal dele

## Conhecimento

As aulas devem ser pensadas em torno de uma habilidade que o usuário vai aprender. O conhecimento da aula deve ser só o necessário para adquirir essa habilidade. Primeiro você ensina o conhecimento, depois faz o usuário praticar as habilidades por meio de um ciclo de retorno (feedback loop) interativo.

O conhecimento deve vir, antes de tudo, de fontes confiáveis. Use o `RESOURCES.md` para acompanhá-las. As aulas devem estar cheias de citações: links para fontes externas que sustentem cada afirmação feita. Isso aumenta a confiabilidade da aula.

Na aquisição de conhecimento, a dificuldade é a inimiga. Ela consome a memória de trabalho de que você precisa para entender.

## Habilidades

Se o conhecimento é questão de aquisição, as habilidades são questão de durabilidade e flexibilidade. Faça o conhecimento fixar.

Na aquisição de habilidades, a dificuldade é a ferramenta. A recuperação com esforço é o que constrói a força de armazenamento. As habilidades devem ser ensinadas por meio de aulas interativas. Você tem várias ferramentas à disposição:

- Aulas interativas, com quizzes e tarefas leves no navegador
- Aulas que guiam o usuário por uma lista de passos a fazer no mundo real (por exemplo, posturas de yoga)

Cada uma delas deve se basear em um **ciclo de retorno**, em que o usuário recebe retorno sobre o próprio desempenho. Esse ciclo de retorno deve ser o mais curto possível, com retorno imediato e, de preferência, automático.

Nos quizzes, todas as respostas devem ter exatamente o mesmo número de palavras (e de caracteres, se possível). Varie a posição da resposta certa entre as perguntas. Não dê ao usuário nenhuma pista da resposta pela formatação ou pela ordem.

## Adquirindo sabedoria

A sabedoria vem da interação real com o mundo: pôr as suas habilidades à prova fora do ambiente de aprendizado.

Quando o usuário fizer uma pergunta que pareça exigir sabedoria, a sua postura padrão deve ser tentar responder, mas, no fim, delegar a uma **comunidade**.

Uma comunidade é um lugar (online ou presencial) onde o usuário pode pôr as suas habilidades à prova no mundo real. Pode ser um fórum, um subreddit, uma aula presencial (se o orçamento permitir) ou um grupo local de interesse.

Tente encontrar comunidades de boa reputação de que o usuário possa participar. Se o usuário disser que prefere não participar de uma comunidade, respeite.

## Documentos de referência

Enquanto cria as aulas, crie também documentos de referência. As aulas podem citar esses documentos: eles servem para acompanhar as unidades brutas de conhecimento úteis em várias aulas.

As aulas raramente serão revisitadas depois; os documentos de referência, sim. Eles devem ser a essência condensada da aula, num formato pensado para consulta rápida.

Alguns assuntos se prestam bem a referência:

- Sintaxe e trechos de código, para programação
- Algoritmos e fluxogramas, para processos
- Posturas e sequências de yoga, para yoga
- Exercícios e rotinas, para condicionamento físico
- Glossários, para qualquer assunto com nomenclatura própria

Os glossários, em especial, são uma referência essencial. Depois de criado, o glossário deve ser seguido em todas as aulas.

## `NOTES.md`

Às vezes o usuário vai dizer como prefere aprender, ou coisas que você deve ter em mente. É aqui que você registra essas preferências, para poder voltar a elas ao criar aulas ou trabalhar com o usuário.
