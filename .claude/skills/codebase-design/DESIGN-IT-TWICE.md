# Projete duas vezes

Quando o usuário quiser explorar interfaces alternativas para um candidato a aprofundamento já escolhido, use este padrão de subagentes em paralelo. Baseado em "Design It Twice" (Ousterhout): é improvável que a sua primeira ideia seja a melhor.

Usa o vocabulário de [SKILL.md](SKILL.md): **módulo**, **interface**, **costura (seam)**, **adaptador**, **alavancagem**.

## Processo

### 1. Enquadre o espaço do problema

Antes de criar os subagentes, escreva para o usuário uma explicação do espaço do problema do candidato escolhido:

- As restrições que qualquer nova interface precisaria satisfazer
- As dependências em que ela se apoiaria, e em qual categoria cada uma se encaixa (veja [DEEPENING.md](DEEPENING.md))
- Um esboço de código ilustrativo e aproximado para dar chão às restrições; não é uma proposta, só uma forma de tornar as restrições concretas

Mostre isso ao usuário e siga imediatamente para o Passo 2. O usuário lê e pensa enquanto os subagentes trabalham em paralelo.

### 2. Crie os subagentes

Crie 3 ou mais subagentes em paralelo, cada um com uma janela de contexto nova. Cada um deve produzir uma interface **radicalmente diferente** para o módulo aprofundado.

Passe a cada subagente, no prompt, um briefing técnico separado (caminhos de arquivo, detalhes de acoplamento, categoria de dependência segundo [DEEPENING.md](DEEPENING.md), o que fica atrás da costura). O briefing é independente da explicação do espaço do problema feita para o usuário no Passo 1. Dê a cada agente uma restrição de design diferente:

- Agente 1: "Minimize a interface: no máximo de 1 a 3 pontos de entrada. Maximize a alavancagem por ponto de entrada."
- Agente 2: "Maximize a flexibilidade: suporte muitos casos de uso e extensão."
- Agente 3: "Otimize para o chamador mais comum: deixe o caso padrão trivial."
- Agente 4 (se fizer sentido): "Projete em torno de portas e adaptadores para as dependências que atravessam a costura."

Inclua no briefing tanto o vocabulário de [SKILL.md](SKILL.md) quanto o vocabulário do GLOSSARY.md, para que cada subagente nomeie as coisas de forma consistente com a linguagem de arquitetura e com a linguagem de domínio do projeto.

Cada subagente entrega:

1. Interface (tipos, métodos, parâmetros, mais invariantes, ordem, modos de erro)
2. Exemplo de uso mostrando como os chamadores a usam
3. O que a implementação esconde atrás da costura
4. Estratégia de dependências e adaptadores (veja [DEEPENING.md](DEEPENING.md))
5. Prós e contras: onde a alavancagem é alta, onde é fraca

### 3. Apresente e compare

Apresente os designs um de cada vez para que o usuário absorva cada um, e depois compare-os em texto corrido. Contraste por **profundidade** (alavancagem na interface), **localidade** (onde as mudanças se concentram) e **posição da costura**.

Depois de comparar, dê a sua própria recomendação: qual design você acha mais forte e por quê. Se elementos de designs diferentes combinarem bem, proponha um híbrido. Tenha opinião: o usuário quer uma leitura firme, não um cardápio.
