---
name: tdd
description: Desenvolvimento guiado por testes (TDD). Use quando o usuário quiser construir funcionalidades ou corrigir bugs com o teste primeiro, mencionar "red-green-refactor" (vermelho-verde-refatorar) ou quiser testes de integração.
---

# Desenvolvimento guiado por testes

TDD é o ciclo vermelho → verde. Esta skill é a referência que faz esse ciclo produzir testes que valem a pena manter: o que é um bom teste, onde os testes ficam, os antipadrões e as regras do ciclo. Todas as seções valem em todo ciclo: consulte-as antes e durante o ciclo, não depois.

Ao explorar a base de código, leia o `GLOSSARY.md` (se existir) para que os nomes dos testes e o vocabulário das interfaces batam com a linguagem de domínio do projeto, e respeite os ADRs da área em que você está mexendo.

## O que é um bom teste

Testes verificam comportamento por meio de interfaces públicas, não detalhes de implementação. O código pode mudar inteiro; os testes não deveriam. Um bom teste se lê como uma especificação: "usuário consegue finalizar a compra com um carrinho válido" diz exatamente qual capacidade existe, e sobrevive a refatorações porque não se importa com a estrutura interna.

Veja [tests.md](tests.md) para exemplos e [mocking.md](mocking.md) para orientações sobre mocks.

## Costuras: onde os testes ficam

Uma **costura (seam)** é a fronteira pública em que você testa: a interface em que você observa o comportamento sem enfiar a mão lá dentro. Os testes ficam nas costuras, nunca contra os detalhes internos.

**Teste só nas costuras combinadas previamente.** Antes de escrever qualquer teste, anote as costuras que serão testadas e confirme-as com o usuário. Nenhum teste é escrito em uma costura não confirmada. Você não consegue testar tudo, então combinar as costuras de antemão é o que faz o esforço de teste cair nos caminhos críticos e na lógica complexa, em vez de em cada caso de borda.

Pergunte: "Qual é a interface pública e quais costuras devemos testar?" Dê a cada costura proposta uma nota de uma linha sobre o que ela pega e o que ela deixa passar.

Quando o próprio formato dessa interface estiver em questão (quão profundo é o módulo, onde a costura deve ficar, o que a interface deve expor), chame a ferramenta Skill com "codebase-design" para obter o vocabulário. Ela é a fonte compartilhada dos termos módulo, interface, profundidade, costura, adaptador, alavancagem e localidade, e é uma referência para consultar, não uma sessão para conduzir.

## Antipadrões

- **Acoplado à implementação**: faz mock de colaboradores internos, testa métodos privados ou verifica por um canal lateral (consultando o banco de dados em vez de usar a interface). O sinal: o teste quebra quando você refatora, mas o comportamento não mudou.
- **Tautológico**: a asserção recalcula o valor esperado do mesmo jeito que o código (`expect(add(a, b)).toBe(a + b)`, um snapshot montado à mão do mesmo jeito, uma constante comparada consigo mesma), então ele passa por construção e nunca pode discordar do código. Os valores esperados precisam vir de uma fonte da verdade independente: um literal sabidamente correto, um exemplo resolvido, a especificação.
- **Fatiamento horizontal**: escrever todos os testes primeiro e depois toda a implementação. Testes em lote verificam comportamento _imaginado_: você testa o _formato_ das coisas em vez do comportamento visível ao usuário, os testes ficam insensíveis a mudanças reais, e você se compromete com uma estrutura de testes antes de entender a implementação. Trabalhe em **fatias verticais**: um teste → uma implementação → repete, cada teste uma **bala traçante (tracer bullet)** que responde ao que o último ciclo ensinou.

## Regras do ciclo

- **Vermelho antes de verde.** Escreva primeiro o teste que falha, depois só o código suficiente para ele passar. Não antecipe testes futuros nem adicione funcionalidades especulativas.
- **Uma fatia por vez.** Uma costura, um teste, uma implementação mínima por ciclo.
- **Refatorar não faz parte do ciclo.** Isso pertence à etapa de revisão (veja a skill `code-review`), não ao ciclo de implementação vermelho → verde.
