---
name: code-review
description: "Revisa as mudanças desde um ponto fixo (commit, branch, tag ou merge-base) em dois eixos: Padrões (o código segue os padrões de código documentados deste repositório?) e Spec (o código corresponde ao que a issue/especificação de origem pediu?). Roda as duas revisões em subagentes paralelos e apresenta os resultados lado a lado. Use quando o usuário quiser revisar uma branch, um PR, mudanças em andamento, ou pedir para \"revisar desde X\"."
---

Revisão em dois eixos do diff entre `HEAD` e um ponto fixo informado pelo usuário:

- **Padrões**: o código está de acordo com os padrões de código documentados deste repositório?
- **Spec**: o código implementa fielmente a issue / especificação (spec) de origem?

Os dois eixos rodam como **subagentes paralelos**, para que um não polua o contexto do outro, e depois esta skill junta o que eles encontraram. Comece cada subagente com uma janela de contexto nova.

O rastreador de issues já deve ter sido fornecido a você. Se não foi, diga ao usuário para rodar `/setup-matt-pocock-skills`.

## Processo

### 1. Fixe o ponto fixo

O que o usuário disse é o ponto fixo (um SHA de commit, nome de branch, tag, `main`, `HEAD~5` etc.). Se ele não especificou um, peça.

Defina o comando de diff uma vez: `git diff <fixed-point>...HEAD` (três pontos, para que a comparação seja contra a merge-base). Anote também a lista de commits com `git log <fixed-point>..HEAD --oneline`.

Antes de seguir, confirme que o ponto fixo resolve (`git rev-parse <fixed-point>`) e que o diff não está vazio. Uma ref inválida ou um diff vazio devem falhar aqui, não dentro de dois subagentes paralelos.

### 2. Identifique a fonte da spec

Procure a spec de origem, nesta ordem:

1. Referências a issues nas mensagens de commit (`#123`, `Closes #45`, `!67` do GitLab etc.), buscadas pelo fluxo descrito no documento do rastreador.
2. Um caminho que o usuário passou como argumento.
3. Um arquivo de spec em `docs/`, `specs/` ou `.scratch/` que corresponda ao nome da branch ou à funcionalidade.
4. Se não encontrar nada, pergunte ao usuário onde está a spec. Se ele disser que não existe, o subagente de **Spec** é pulado e informa "nenhuma spec disponível".

### 3. Identifique as fontes de padrões

Procure no repositório todos os arquivos que documentam como o código deve ser escrito. Quando existir `CODING_STANDARDS.md` ou `CONTRIBUTING.md`, ele tem que estar na lista.

Além do que o repositório documenta, o eixo de Padrões sempre carrega a **base de code smells** abaixo: um conjunto fixo de code smells de Fowler (_Refactoring_, cap. 3) que vale mesmo quando o repositório não documenta nada. Duas regras a regem:

- **O repositório prevalece.** Um padrão documentado do repositório sempre ganha; onde ele endossa algo que a base apontaria, suprima o smell.
- **Sempre uma questão de julgamento.** Cada smell é uma heurística rotulada ("possível Inveja de Recursos"), nunca uma violação rígida. Como qualquer padrão aqui, pule o que o ferramental já impõe.

Cada smell se lê *o que é* → *como corrigir*; compare com o diff:

- **Nome Misterioso (Mysterious Name)**: uma função, variável ou tipo cujo nome não revela o que faz ou guarda. → renomeie; se nenhum nome honesto aparecer, o design está confuso.
- **Código Duplicado (Duplicated Code)**: a mesma forma de lógica aparece em mais de um trecho ou arquivo da mudança. → extraia a forma compartilhada e chame-a dos dois lugares.
- **Inveja de Recursos (Feature Envy)**: um método que mexe mais nos dados de outro objeto do que nos próprios. → mova o método para junto dos dados que ele inveja.
- **Agrupamentos de Dados (Data Clumps)**: os mesmos poucos campos ou parâmetros sempre viajam juntos (um tipo querendo nascer). → junte-os em um tipo e passe esse tipo.
- **Obsessão por Primitivos (Primitive Obsession)**: um primitivo ou string fazendo as vezes de um conceito de domínio que merece seu próprio tipo. → dê ao conceito seu próprio tipo pequeno.
- **Switches Repetidos (Repeated Switches)**: o mesmo `switch`/cascata de `if` sobre o mesmo tipo se repete ao longo da mudança. → substitua por polimorfismo, ou por um mapa único que os dois pontos compartilhem.
- **Cirurgia com Rifle (Shotgun Surgery)**: uma mudança lógica obriga a edições espalhadas por muitos arquivos do diff. → reúna em um módulo o que muda junto.
- **Alteração Divergente (Divergent Change)**: um arquivo ou módulo é editado por vários motivos sem relação entre si. → divida para que cada módulo mude por um motivo só.
- **Generalidade Especulativa (Speculative Generality)**: abstração, parâmetros ou ganchos adicionados para necessidades que a spec não tem. → apague; volte a deixar inline até aparecer uma necessidade real.
- **Cadeias de Mensagens (Message Chains)**: navegação longa do tipo `a.b().c().d()` da qual o chamador não deveria depender. → esconda o percurso atrás de um método no primeiro objeto.
- **Intermediário (Middle Man)**: uma classe ou função que basicamente só delega adiante. → corte-a e chame o destino real diretamente.
- **Herança Recusada (Refused Bequest)**: uma subclasse ou implementação que ignora ou sobrescreve a maior parte do que herda. → abandone a herança e use composição.

### 4. Dispare os dois subagentes em paralelo

Faça as duas chamadas de subagente juntas, em primeiro plano, e junte os relatórios que eles devolverem.

**O prompt do subagente de Padrões** deve incluir:

- O comando de diff completo e a lista de commits.
- A lista de arquivos-fonte de padrões que você encontrou no passo 3, **mais a base de code smells do passo 3** colada por inteiro (o subagente não tem outro acesso a ela).
- A instrução: "Relate, por arquivo/trecho quando fizer sentido, (a) cada ponto em que o diff viola um padrão documentado: cite o padrão (arquivo + a regra); e (b) qualquer smell da base que você notar: dê o nome e cite o trecho. Diferencie violações rígidas de questões de julgamento: infrações a padrões documentados podem ser rígidas, mas os smells da base são sempre questões de julgamento, e um padrão documentado do repositório prevalece sobre a base. Pule o que o ferramental impõe. Menos de 400 palavras."

**O prompt do subagente de Spec** deve incluir:

- O comando de diff e a lista de commits.
- O caminho ou o conteúdo já buscado da spec.
- A instrução: "Relate: (a) requisitos que a spec pediu e que estão faltando ou parciais; (b) comportamento no diff que não foi pedido (aumento de escopo); (c) requisitos que parecem implementados, mas cuja implementação parece errada. Cite a linha da spec em cada achado. Menos de 400 palavras."

Se a spec estiver faltando, pule o subagente de Spec e registre isso no relatório final.

### 5. Junte os resultados

Apresente os dois relatórios sob os títulos `## Padrões` e `## Spec`, na íntegra ou com uma limpeza leve. **Não** misture nem reordene os achados, porque os dois eixos são separados de propósito (veja _Por que dois eixos_).

Termine com um resumo de uma linha: total de achados por eixo e o pior problema _dentro de cada eixo_ (se houver). Não escolha um vencedor único entre os eixos: essa é justamente a reordenação que a separação existe para evitar.

## Por que dois eixos

Uma mudança pode passar em um eixo e falhar no outro:

- Código que segue todos os padrões, mas implementa a coisa errada → **Padrões passa, Spec falha.**
- Código que faz exatamente o que a issue pediu, mas quebra as convenções do projeto → **Spec passa, Padrões falha.**

Relatar os dois separadamente impede que um eixo mascare o outro.
