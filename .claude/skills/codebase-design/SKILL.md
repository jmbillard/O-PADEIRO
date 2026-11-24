---
name: codebase-design
description: Vocabulário compartilhado para projetar módulos profundos. Use quando o usuário quiser projetar ou melhorar a interface de um módulo, encontrar oportunidades de aprofundamento, decidir onde fica uma costura (seam), deixar o código mais testável ou mais navegável por IA, ou quando outra skill precisar do vocabulário de módulo profundo.
---

# Design de código

Projete **módulos profundos**: muito comportamento atrás de uma interface pequena, colocada numa costura limpa, testável por essa interface. Use esta linguagem e estes princípios sempre que houver código sendo projetado ou reestruturado. O objetivo é alavancagem para quem chama, localidade para quem mantém e testabilidade para todos.

## Glossário

Use estes termos exatamente: não troque por "componente", "serviço", "API" ou "fronteira". Linguagem consistente é a questão toda.

**Módulo**: qualquer coisa com uma interface e uma implementação. Propositalmente independente de escala: uma função, uma classe, um pacote ou uma fatia que atravessa camadas. _Evite_: unidade, componente, serviço.

**Interface**: tudo o que quem chama precisa saber para usar o módulo corretamente: a assinatura de tipos, mas também invariantes, restrições de ordem, modos de erro, configuração obrigatória e características de desempenho. _Evite_: API, assinatura (estreitos demais, referem-se só à superfície no nível de tipos).

**Implementação**: o que está dentro de um módulo, seu corpo de código. Diferente de **Adaptador**: uma coisa pode ser um adaptador pequeno com uma implementação grande (um repositório Postgres) ou um adaptador grande com uma implementação pequena (um fake em memória). Use "adaptador" quando o assunto for a costura; "implementação" nos outros casos.

**Profundidade**: alavancagem na interface. A quantidade de comportamento que quem chama (ou um teste) consegue exercitar por unidade de interface que precisa aprender. Um módulo é **profundo** quando muito comportamento fica atrás de uma interface pequena, e **raso** quando a interface é quase tão complexa quanto a implementação.

**Costura (seam)** _(Michael Feathers)_: um lugar onde você pode alterar o comportamento sem editar naquele lugar; o *local* onde vive a interface de um módulo. Onde colocar a costura é uma decisão de design própria, separada do que vai atrás dela. _Evite_: fronteira (sobrecarregado pelo bounded context do DDD).

**Adaptador**: uma coisa concreta que satisfaz uma interface numa costura. Descreve o *papel* (que encaixe ele ocupa), não a substância (o que tem dentro).

**Alavancagem**: o que quem chama ganha com a profundidade. Mais capacidade por unidade de interface aprendida. Uma implementação se paga em N pontos de chamada e M testes.

**Localidade**: o que quem mantém ganha com a profundidade. Mudanças, bugs, conhecimento e verificação se concentram num lugar só, em vez de se espalharem pelos chamadores. Corrigiu uma vez, corrigiu em todo lugar.

## Profundo vs raso

**Módulo profundo** = interface pequena + muita implementação:

```
┌────────────────────────┐
│   Interface pequena    │  ← Poucos métodos, parâmetros simples
├────────────────────────┤
│                        │
│ Implementação profunda │  ← Lógica complexa escondida
│                        │
└────────────────────────┘
```

**Módulo raso** = interface grande + pouca implementação (evite):

```
┌─────────────────────────────────┐
│       Interface grande          │  ← Muitos métodos, parâmetros complexos
├─────────────────────────────────┤
│  Implementação rasa             │  ← Só repassa
└─────────────────────────────────┘
```

Ao projetar uma interface, pergunte:

- Dá para reduzir o número de métodos?
- Dá para simplificar os parâmetros?
- Dá para esconder mais complexidade lá dentro?

## Princípios

- **Profundidade é uma propriedade da interface, não da implementação.** Um módulo profundo pode ser composto internamente de partes pequenas, mockáveis e substituíveis; elas só não fazem parte da interface. Um módulo pode ter **costuras internas** (privadas da sua implementação, usadas pelos próprios testes) além da **costura externa** na sua interface.
- **O teste da exclusão.** Imagine apagar o módulo. Se a complexidade some, ele só repassava. Se a complexidade reaparece em N chamadores, ele fazia por merecer.
- **A interface é a superfície de teste.** Quem chama e os testes atravessam a mesma costura. Se você quer testar *além* da interface, o módulo provavelmente está com o formato errado.
- **Um adaptador significa uma costura hipotética. Dois adaptadores significam uma real.** Não introduza uma costura a menos que algo de fato varie através dela.

## Projetando para testabilidade

Boas interfaces tornam o teste natural:

1. **Receba as dependências, não as crie.**

   ```typescript
   // Testável
   function processOrder(order, paymentGateway) {}

   // Difícil de testar
   function processOrder(order) {
     const gateway = new StripeGateway();
   }
   ```

2. **Retorne resultados, não produza efeitos colaterais.**

   ```typescript
   // Testável
   function calculateDiscount(cart): Discount {}

   // Difícil de testar
   function applyDiscount(cart): void {
     cart.total -= discount;
   }
   ```

3. **Superfície pequena.** Menos métodos = menos testes necessários. Menos parâmetros = setup de teste mais simples.

## Relações

- Um **Módulo** tem exatamente uma **Interface** (a superfície que ele apresenta a quem chama e aos testes).
- **Profundidade** é uma propriedade de um **Módulo**, medida em relação à sua **Interface**.
- Uma **Costura** é onde vive a **Interface** de um **Módulo**.
- Um **Adaptador** fica numa **Costura** e satisfaz a **Interface**.
- **Profundidade** produz **Alavancagem** para quem chama e **Localidade** para quem mantém.

## Enquadramentos rejeitados

- **Profundidade como razão entre linhas de implementação e linhas de interface** (Ousterhout): premia inchar a implementação. Usamos profundidade-como-alavancagem no lugar.
- **"Interface" como a palavra-chave `interface` do TypeScript ou os métodos públicos de uma classe**: estreito demais: interface aqui inclui todo fato que quem chama precisa saber.
- **"Fronteira"**: sobrecarregado pelo bounded context do DDD. Diga **costura** ou **interface**.

## Indo mais fundo

- **Aprofundar um agrupamento considerando suas dependências**, veja [DEEPENING.md](DEEPENING.md): categorias de dependência, disciplina de costuras e testes que substituem em vez de empilhar.
- **Explorar interfaces alternativas**, veja [DESIGN-IT-TWICE.md](DESIGN-IT-TWICE.md): suba subagentes em paralelo para projetar a interface de várias formas radicalmente diferentes e depois compare por profundidade, localidade e posição da costura.
