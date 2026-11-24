# O PADEIRO

As ferramentas da equipe de arte da promo dentro do After Effects: dos templates às pastas e projetos das peças
de cada atração.

## Language

### Atrações e o que vai ao ar

**Atração**:
Um programa, novela, show, evento ou outro conteúdo com identidade visual própria, para o qual a equipe produz
peças (DOMINGÃO COM HUCK, TELA QUENTE).
_Avoid_: programa (quando o tipo não importa)

**Tipo**:
A classe de uma atração que decide onde ficam as pastas dela: PROGRAMA, NOVELA, VT, FILME…
_Avoid_: categoria

**Quadro**:
Qualquer subdivisão de uma atração com pasta própria, em qualquer nível (DANÇA DOS FAMOSOS, uma semana, um
especial).
_Avoid_: subpasta, seção

**Filme**:
O conteúdo que uma atração exibe (o filme ENCANTO na TELA QUENTE). Tem identidade visual própria, e as peças dele
seguem a identidade do filme, não a da atração que o exibe.
_Avoid_: título (para o filme em si)

**Sessão**:
Uma atração que exibe filmes (TELA QUENTE, CORUJÃO, SUPERCINE). Tem identidade própria, diferente da de cada filme
que exibe.
_Avoid_: faixa

### As peças

**Peça**:
Cada entrega com render final próprio (uma chamada, a versão de 15s dela, a de cada convidado). Um projeto costuma
gerar várias.
_Avoid_: arte, VT (para a entrega)

**Card**:
O pedido de trabalho no Trello, com a claquete no título. Um card pode virar várias peças.
_Avoid_: tarefa, ticket (para o pedido da equipe)

**Claquete**:
O texto que identifica uma peça, como vem no card do Trello ou no Teams (`DOMINGAO 25/11`).
_Avoid_: claquete para a janela de projeto

**O que é**:
A parte do nome do projeto que diz qual peça ele é (SERVIÇO, CHAMADA, CONVIDADO).
_Avoid_: formato, peça (para esse campo)

### Pastas e arquivos

**Projeto**:
O arquivo `.aep` de uma peça.
_Avoid_: projeto para a pasta

**Pasta do projeto**:
A pasta com a estrutura da equipe (`01_PROJETOS`, `02_ARQUIVOS`, `03_SAIDA`…) de uma atração, quadro ou filme, onde
ficam os projetos e o que eles usam.
_Avoid_: projeto

**Output**:
A pasta de entrega na rede, fora da pasta do projeto, para onde vai o render final.
_Avoid_: saída

**Saída**:
A pasta `03_SAIDA`, dentro da pasta do projeto, com os renders para avaliação e os previews.
_Avoid_: output

### Templates

**Template**:
Um projeto modelo (`.aep` ou `.aet`) com os textos que mudam e as regras de nome e render, de onde saem as versões.
_Avoid_: modelo, base

**Produção**:
Uma coleção de templates de uma frente de trabalho (DIA-A-DIA, um evento), escolhida no painel de templates.
_Avoid_: lista, pasta de templates

**Versão**:
Cada cópia preenchida de um template (ou de uma comp), com o seu texto (ANA MARIA, JOÃO GOMES).
_Avoid_: variação, cópia; versão sozinha para o After Effects

**Versão do After**:
O After Effects em que um projeto foi salvo (After 2025, After 2026).
_Avoid_: versão (sem "do After")

## Relationships

- Uma **atração** é de um **tipo**; o tipo decide onde fica a **pasta do projeto** dela.
- Uma **sessão** é uma atração que exibe **filmes**; a peça de um filme segue a identidade do filme, e o **projeto**
  dela fica na pasta do filme, seja qual for a sessão que o exibe.
- Um **card** traz a **claquete** e pode virar várias **peças**; um **projeto** costuma gerar várias peças.
- Uma **produção** reúne **templates**; cada template gera **versões**.
