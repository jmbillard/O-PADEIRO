# Formato do relatório HTML

A revisão de arquitetura é renderizada como um único arquivo HTML autocontido no diretório temporário do sistema operacional. Tailwind e Mermaid vêm ambos de CDNs. O Mermaid cuida bem dos diagramas com forma de grafo; divs construídas à mão e SVG inline cuidam dos visuais mais editoriais (diagramas de massa, cortes transversais). Misture os dois: não se apoie no Mermaid para tudo, senão começa a parecer genérico.

## Esqueleto

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Revisão de arquitetura de {{nome do repo}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      /* pequena camada própria para o que o Tailwind não cobre de forma limpa:
         linhas tracejadas de costura, pontas de seta com cara de desenho à mão etc. */
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

## Cabeçalho

Nome do repositório, data e uma legenda compacta: caixa sólida = módulo, linha tracejada = costura (seam), seta vermelha = vazamento, caixa escura de borda grossa = módulo profundo. Sem parágrafo de introdução. Direto para os candidatos.

## Card do candidato

Os diagramas carregam o peso. O texto é escasso, simples e usa os termos do glossário (da skill `/codebase-design`) sem cerimônia.

Cada candidato é um `<article>`:

- **Título**: curto, dá nome ao aprofundamento (por exemplo, "Colapsar o pipeline de entrada de Order").
- **Linha de selos**: força da recomendação (`Strong` = esmeralda, `Worth exploring` = âmbar, `Speculative` = ardósia), mais uma tag para a categoria de dependência (`in-process`, `local-substitutable`, `ports & adapters`, `mock`).
- **Arquivos**: lista em fonte monoespaçada, `font-mono text-sm`.
- **Diagrama de antes / depois**: a peça central. Duas colunas, lado a lado. Veja os padrões abaixo.
- **Problema**: uma frase. O que dói.
- **Solução**: uma frase. O que muda.
- **Ganhos**: tópicos, ≤6 palavras cada. Por exemplo: "Testes batem numa interface só", "Lógica de preço para de vazar", "Apagar 4 wrappers rasos".
- **Destaque de ADR** (se for o caso): uma linha numa caixa em tom âmbar.

Nada de parágrafos de explicação. Se o diagrama precisa de um parágrafo para ser entendido, redesenhe o diagrama.

## Padrões de diagrama

Escolha o padrão que combina com o candidato. Misture-os. Não deixe todos os diagramas com a mesma cara. Variedade faz parte da proposta.

### Grafo Mermaid (o burro de carga para dependências / fluxo de chamadas)

Use um `flowchart` ou `graph` do Mermaid quando a ideia for "X chama Y que chama Z, e olha a bagunça". Coloque-o dentro de um card estilizado com Tailwind para que não pareça caído de paraquedas. Estilize com classDef para pintar de vermelho as arestas de vazamento e de escuro o módulo profundo. Diagramas de sequência funcionam bem para "antes: 6 idas e voltas; depois: 1".

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[OrderHandler] --> B[OrderValidator]
      B --> C[OrderRepo]
      C -.leak.-> D[PricingClient]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class C,D leak
  </pre>
</div>
```

### Caixas e setas feitas à mão (quando o layout do Mermaid briga com você)

Módulos como `<div>`s com bordas e rótulos. Setas como elementos SVG inline `<line>` ou `<path>` posicionados de forma absoluta sobre um contêiner relativo. Recorra a isso quando quiser que o diagrama do "depois" pareça um único módulo profundo de borda grossa com o interior acinzentado, já que o Mermaid não renderiza isso com o peso certo.

### Corte transversal (bom para rasura em camadas)

Empilhe faixas horizontais (`h-12 border-l-4`) para mostrar as camadas pelas quais uma chamada passa. Antes: 6 camadas finas, cada uma sem fazer nada. Depois: 1 faixa grossa com o rótulo da responsabilidade consolidada.

### Diagrama de massa (bom para "interface tão larga quanto a implementação")

Dois retângulos por módulo: um para a área de superfície da interface, outro para a implementação. Antes: o retângulo da interface é quase tão alto quanto o da implementação (raso). Depois: o retângulo da interface é baixo e o da implementação é alto (profundo).

### Colapso do grafo de chamadas

Antes: uma árvore de chamadas de função renderizada como caixas aninhadas. Depois: a mesma árvore colapsada numa caixa só, com as chamadas, agora internas, aparecendo esmaecidas dentro dela.

## Orientações de estilo

- Puxe para o editorial, não para o painel corporativo. Espaço em branco generoso. Serifa opcional nos títulos (`font-serif` funciona bem com stone/slate).
- Cor com moderação: um destaque (esmeralda ou índigo), mais vermelho para vazamentos e âmbar para avisos.
- Mantenha os diagramas com ~320px de altura para que antes/depois caibam confortavelmente lado a lado sem rolagem.
- Use `text-xs uppercase tracking-wider` para os rótulos de módulo dentro dos diagramas, para que leiam como esquema, não como UI.
- Os únicos scripts são o CDN do Tailwind e o import ESM do Mermaid. Fora isso, o relatório é estático: nada de código de aplicação, nenhuma interatividade além da própria renderização do Mermaid.

## Seção de recomendação principal

Um card maior. Nome do candidato, uma frase sobre o porquê, link de âncora para o card dele. Só isso.

## Tom

Linguagem simples e concisa, mas os substantivos e verbos de arquitetura vêm direto da skill `/codebase-design`. Concisão não é desculpa para se desviar.

**Use exatamente:** módulo, interface, implementação, profundidade, profundo, raso, costura, adaptador, alavancagem, localidade.

**Nunca substitua por:** componente, serviço, unidade (no lugar de módulo) · API, assinatura (no lugar de interface) · fronteira (no lugar de costura) · camada, wrapper (no lugar de módulo, quando você quer dizer módulo).

**Frases que combinam com o estilo:**

- "O módulo de entrada de Order é raso: a interface quase espelha a implementação."
- "Preço vaza através da costura."
- "Aprofunde: uma interface, um lugar para testar."
- "Dois adaptadores justificam a costura: HTTP em produção, em memória nos testes."

**Os tópicos de ganhos** dão nome ao ganho em termos do glossário: *"localidade: bugs se concentram num módulo só"*, *"alavancagem: uma interface, N pontos de chamada"*, *"a interface encolhe; a implementação absorve os wrappers"*. Não escreva *"mais fácil de manter"* nem *"código mais limpo"*, porque esses termos não estão no glossário e não fazem por merecer seu lugar.

Sem rodeios, sem pigarro, sem "vale notar que…". Se uma frase pode ser um tópico, transforme-a em tópico. Se um tópico pode ser cortado, corte. Se um termo não está no glossário de `/codebase-design`, procure um que esteja antes de inventar um novo.
