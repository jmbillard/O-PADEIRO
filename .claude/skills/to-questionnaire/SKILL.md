---
name: to-questionnaire
description: Transforma uma decisão que você não consegue responder sozinho em um questionário para outra pessoa preencher.
disable-model-invocation: true
---

Transforme algo que o usuário não consegue responder sozinho em um **questionário**: um documento Markdown que ele entrega a uma pessoa para preencher de forma assíncrona, ou que os dois preenchem juntos em uma reunião. O destinatário tem um conhecimento que falta ao usuário; o questionário extrai esse conhecimento dele.

**Interrogue o envio, não o assunto.** Entreviste o usuário só sobre o _envio_, que ele sempre consegue responder: para quem vai e o que ele precisa de volta. As perguntas do documento então miram a **lacuna** entre o que o destinatário sabe e o que o usuário precisa.


1. **Para quem vai?** Pergunte, em uma única troca, o papel do destinatário, a especialidade dele e a relação dele com o usuário. Isso define o tom do questionário e quanto contexto ele precisa carregar. Pronto quando você souber quem é o destinatário e o que ele sabe que o usuário não sabe.

2. **O que você precisa de volta?** Pergunte, em uma única troca, as decisões ou os fatos específicos que o usuário não consegue resolver sozinho e precisa dessa pessoa. Pronto quando você tiver uma lista concreta do que o usuário precisa sair sabendo fazer ou decidir.

3. **Escreva o questionário.** Rascunhe perguntas voltadas para a lacuna dos passos 1–2, seguindo a estrutura do documento abaixo. Grave em `to-questionnaire-<slug>.md` no diretório atual (slug a partir do assunto) e informe o caminho. Pronto quando o arquivo existir e cada item que o usuário citou no passo 2 estiver coberto por uma pergunta.

## Estrutura do documento

Enquadre o documento como um **questionário de descoberta**: falta contexto ao usuário, o destinatário o tem. Ordene as perguntas da mais importante para a menos importante, já que, sendo assíncrono, talvez você só tenha uma passada, e agrupe-as sob títulos `##` por tema quando houver mais do que um punhado. Escreva usando o modelo abaixo.

<questionnaire-template>

# <Título do questionário>

**Objetivo:** por que este questionário existe e qual decisão depende dele.

**De:** <o usuário>, **Para:** <o destinatário>, **Como suas respostas serão usadas:** <para onde elas vão>

## Contexto

Um parágrafo para situar um destinatário que não estava na cabeça do usuário. O suficiente para responder bem, não uma página.

## Como responder

Prazo e esforço aproximado. Respostas parciais e "não sei" são úteis: sinalize qualquer coisa de que você não tenha certeza em vez de pular.

## <Título do tema>

Uma seção `##` por tema. Em cada uma, suas perguntas, da mais importante para a menos importante. Cada pergunta é uma ideia só, nunca composta, com um espaço de resposta logo abaixo, e um _por que isso importa_ de uma linha apenas quando a pergunta puder ser mal interpretada ou convidar uma resposta displicente.

<question-example>
### Que carga o sistema deve aguentar no lançamento?

_Por que isso importa: decide se provisionamos para picos de tráfego agora ou deixamos para depois._

>
</question-example>

## Mais alguma coisa?

Um fechamento para tudo o que sobrou: há algo que não perguntamos e que deveríamos saber?

</questionnaire-template>
