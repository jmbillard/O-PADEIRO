---
name: improve-codebase-architecture
description: Varre o código em busca de oportunidades de aprofundamento, apresenta-as num relatório HTML visual e depois conduz um interrogatório sobre a que você escolher.
disable-model-invocation: true
---

# Melhore a arquitetura do código

Traga à tona o atrito arquitetural e proponha **oportunidades de aprofundamento**: refatorações que transformam módulos rasos em módulos profundos. O objetivo é testabilidade e navegabilidade por IA.

Este comando é _orientado_ pelo modelo de domínio do projeto e construído sobre um vocabulário de design compartilhado:

- Chame a ferramenta Skill com "codebase-design" para obter o vocabulário de arquitetura (**módulo**, **interface**, **profundidade**, **costura (seam)**, **adaptador**, **alavancagem**, **localidade**) e seus princípios (o teste da exclusão, "a interface é a superfície de teste", "um adaptador = costura hipotética, dois = real"). Use esses termos exatamente em toda sugestão, e não escorregue para "componente", "serviço", "API" ou "fronteira".
- A linguagem de domínio do `GLOSSARY.md` dá nome às boas costuras; os ADRs em `docs/adr/` registram decisões que este comando não deve rediscutir.

## Processo

### 1. Explore

**Delimite o escopo antes de varrer: YAGNI.** Aprofundar um módulo compensa porque facilita as mudanças futuras nele, então dê peso extra às partes do código que mudaram recentemente. Decida *onde* olhar antes de olhar:

- Se o usuário indicou uma direção (um módulo, um subsistema, um ponto de dor), siga-a e pule a inferência abaixo.
- Caso contrário, volte um bom trecho no histórico de commits (`git log --oneline`) para achar os pontos quentes do código, os arquivos e áreas que aparecem o tempo todo, e deixe que esses caminhos atraiam sua atenção primeiro. Se as mudanças estiverem espalhadas, sem um ponto quente claro, amplie a rede.

Leia primeiro o glossário de domínio do projeto (`GLOSSARY.md`) e os ADRs da área em que você está mexendo.

Depois crie um subagente com uma janela de contexto nova para percorrer o código. Não siga heurísticas rígidas; explore de forma orgânica e anote onde você sente atrito:

- Onde entender um conceito exige pular entre muitos módulos pequenos?
- Onde os módulos são **rasos**, com uma interface quase tão complexa quanto a implementação?
- Onde funções puras foram extraídas só por testabilidade, mas os bugs reais se escondem na forma como elas são chamadas (sem **localidade**)?
- Onde módulos fortemente acoplados vazam através das suas costuras?
- Que partes do código não têm testes, ou são difíceis de testar pela interface atual?

Aplique o **teste da exclusão** a tudo o que você suspeitar que é raso: apagar aquilo concentraria a complexidade ou só a mudaria de lugar? Um "sim, concentra" é o sinal que você procura.

### 2. Apresente os candidatos num relatório HTML

Escreva um arquivo HTML autocontido no diretório temporário do sistema operacional, para que nada caia no repositório. Descubra o diretório temporário por `$TMPDIR`, usando `/tmp` como alternativa (ou `%TEMP%` no Windows), e escreva em `<tmpdir>/architecture-review-<timestamp>.html` para que cada execução gere um arquivo novo. Abra-o para o usuário (`xdg-open <path>` no Linux, `open <path>` no macOS, `start <path>` no Windows) e informe o caminho absoluto.

O relatório usa **Tailwind via CDN** para layout e estilo, e **Mermaid via CDN** para diagramas em que um grafo/fluxo/sequência comunica a estrutura de forma confiável. Misture Mermaid com visuais feitos à mão em CSS/SVG: use Mermaid quando as relações tiverem forma de grafo (grafos de chamadas, dependências, sequências), e divs/SVG construídos à mão quando quiser algo mais editorial (diagramas de massa, cortes transversais, animações de colapso). Cada candidato ganha uma **visualização de antes/depois**. Seja visual.

Para cada candidato, renderize um card com:

- **Arquivos**: quais arquivos/módulos estão envolvidos
- **Problema**: por que a arquitetura atual está causando atrito
- **Solução**: descrição em linguagem simples do que mudaria
- **Benefícios**: explicados em termos de localidade e alavancagem, e de como os testes melhorariam
- **Diagrama de antes / depois**: lado a lado, desenhado sob medida, ilustrando a rasura e o aprofundamento
- **Força da recomendação**: uma entre `Strong`, `Worth exploring`, `Speculative`, renderizada como selo

Termine o relatório com uma seção de **Recomendação principal**: qual candidato você atacaria primeiro e por quê.

**Use o vocabulário do GLOSSARY.md para o domínio e o vocabulário de `/codebase-design` para a arquitetura.** Se o `GLOSSARY.md` define "Order", fale em "o módulo de entrada de Order", não em "o FooBarHandler", e não em "o serviço de Order".

**Conflitos com ADRs**: se um candidato contradiz um ADR existente, só traga-o à tona quando o atrito for real o bastante para justificar revisitar o ADR. Marque isso claramente no card (por exemplo, um destaque de aviso: _"contradiz o ADR-0007, mas vale reabrir porque…"_). Não liste toda refatoração teórica que um ADR proíbe.

Veja [HTML-REPORT.md](HTML-REPORT.md) para o esqueleto HTML completo, os padrões de diagrama e as orientações de estilo.

NÃO proponha interfaces ainda. Depois de escrever o arquivo, pergunte ao usuário: "Qual destes você gostaria de explorar?"

### 3. Ciclo de interrogatório

Quando o usuário escolher um candidato, chame a ferramenta Skill com "grilling" para percorrer com ele a árvore de decisões: restrições, dependências, o formato do módulo aprofundado, o que fica atrás da costura, quais testes sobrevivem.

Os efeitos colaterais acontecem no meio da conversa, à medida que as decisões se cristalizam; chame a ferramenta Skill com "domain-modeling" para manter o modelo de domínio atualizado ao longo do caminho:

- **Vai nomear um módulo aprofundado com um conceito que não está no `GLOSSARY.md`?** Adicione o termo ao `GLOSSARY.md`. Crie o arquivo só quando precisar, se ele não existir.
- **Deixou mais preciso um termo vago durante a conversa?** Atualize o `GLOSSARY.md` ali mesmo.
- **O usuário rejeitou o candidato por um motivo que sustenta a decisão?** Ofereça um ADR, assim: _"Quer que eu registre isso como um ADR para que futuras revisões de arquitetura não sugiram isso de novo?"_ Só ofereça quando o motivo for de fato necessário para um futuro explorador não sugerir a mesma coisa de novo; pule motivos passageiros ("não vale a pena agora") e os óbvios.
- **Quer explorar interfaces alternativas para o módulo aprofundado?** Chame a ferramenta Skill com "codebase-design" e use o padrão de subagentes em paralelo de design-it-twice.
