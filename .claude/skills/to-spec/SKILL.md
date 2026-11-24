---
name: to-spec
description: "Transforma a conversa atual em uma especificação (spec) e a publica no rastreador de issues do projeto: sem entrevista, só a síntese do que já foi discutido."
disable-model-invocation: true
---

Esta skill pega o contexto da conversa atual e o que você entende da base de código e produz uma especificação (spec). NÃO entreviste o usuário; apenas sintetize o que você já sabe.

O rastreador de issues e o vocabulário de rótulos de triagem já devem ter sido fornecidos a você. Se não foram, diga ao usuário para rodar `/setup-matt-pocock-skills`.

## Processo

1. Explore o repositório para entender o estado atual da base de código, se ainda não fez isso. Use o vocabulário do glossário de domínio do projeto em toda a spec e respeite os ADRs da área em que você está mexendo.

2. Esboce as costuras (seams) em que você vai testar a funcionalidade. Prefira costuras existentes a novas. Use a costura mais alta possível. Se precisar de costuras novas, proponha-as no ponto mais alto que conseguir. Quanto menos costuras na base de código, melhor - o número ideal é um.

Confirme com o usuário se essas costuras correspondem ao que ele espera.

3. Escreva a spec usando o modelo abaixo e depois publique-a no rastreador de issues do projeto. Aplique o rótulo de triagem `ready-for-agent` - não é preciso triagem adicional.

<spec-template>

## Enunciado do problema

O problema que o usuário enfrenta, do ponto de vista do usuário.

## Solução

A solução do problema, do ponto de vista do usuário.

## Histórias de usuário

Uma lista LONGA e numerada de histórias de usuário. Cada história deve seguir o formato:

1. Como <ator>, quero <funcionalidade>, para que <benefício>

<user-story-example>
1. Como cliente de banco pelo celular, quero ver o saldo das minhas contas, para que eu possa tomar decisões mais bem informadas sobre meus gastos
</user-story-example>

Esta lista de histórias de usuário deve ser extremamente extensa e cobrir todos os aspectos da funcionalidade.

## Decisões de implementação

Uma lista das decisões de implementação que foram tomadas. Pode incluir:

- Os módulos que serão criados/modificados
- As interfaces desses módulos que serão modificadas
- Esclarecimentos técnicos do desenvolvedor
- Decisões de arquitetura
- Mudanças de schema
- Contratos de API
- Interações específicas

NÃO inclua caminhos de arquivo específicos nem trechos de código. Eles podem ficar desatualizados muito rápido.

Exceção: se um protótipo produziu um trecho que codifica uma decisão com mais precisão do que a prosa consegue (máquina de estados, reducer, schema, formato de tipo), coloque-o dentro da decisão correspondente e anote brevemente que ele veio de um protótipo. Corte até ficar só a parte rica em decisões, não uma demo funcionando, só o que importa.

## Decisões de teste

Uma lista das decisões de teste que foram tomadas. Inclua:

- Uma descrição do que torna um teste bom (testar só o comportamento externo, não detalhes de implementação)
- Quais módulos serão testados
- Referências anteriores para os testes (ou seja, tipos de teste parecidos na base de código)

## Fora do escopo

Uma descrição do que está fora do escopo desta spec.

## Notas adicionais

Quaisquer notas adicionais sobre a funcionalidade.

</spec-template>
