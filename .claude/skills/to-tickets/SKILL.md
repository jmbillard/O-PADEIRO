---
name: to-tickets
description: Quebra um plano, uma especificação (spec) ou a conversa atual em um conjunto de tickets no estilo bala traçante (tracer bullet), cada um declarando suas arestas de bloqueio, publicados no rastreador configurado (arestas como texto em um arquivo por ticket, localmente, ou links de bloqueio nativos em um rastreador de verdade).
disable-model-invocation: true
---

# Para tickets

Quebre um plano, uma spec ou uma conversa em um conjunto de **tickets**: fatias verticais no estilo bala traçante (tracer bullet), cada uma declarando os tickets que a **bloqueiam**.

O rastreador de issues e o vocabulário de rótulos de triagem já devem ter sido fornecidos a você. Se não foram, diga ao usuário para rodar `/setup-matt-pocock-skills`.

## Processo

### 1. Reúna o contexto

Trabalhe com o que já estiver no contexto da conversa. Se o usuário passar uma referência (o caminho de uma spec, o número ou a URL de uma issue) como argumento, busque-a e leia o corpo inteiro e os comentários.

### 2. Explore a base de código (opcional)

Se você ainda não explorou a base de código, faça isso para entender o estado atual do código. Os títulos e as descrições dos tickets devem usar o vocabulário do glossário de domínio do projeto e respeitar os ADRs da área em que você está mexendo.

Procure oportunidades de refatorar o código antes (prefactoring) para facilitar a implementação. "Torne a mudança fácil, depois faça a mudança fácil."

### 3. Rascunhe as fatias verticais

Quebre o trabalho em tickets de **bala traçante**.

<vertical-slice-rules>

- Cada fatia atravessa um caminho estreito, mas COMPLETO, por todas as camadas (schema, API, UI, testes): vertical, NÃO uma fatia horizontal de uma camada só
- Uma fatia concluída pode ser demonstrada ou verificada por si só
- Cada fatia é dimensionada para caber em uma única janela de contexto nova
- Qualquer refatoração prévia (prefactoring) deve ser feita primeiro

</vertical-slice-rules>

Dê a cada ticket suas **arestas de bloqueio**: os outros tickets que precisam estar concluídos antes que ele possa começar. Um ticket sem bloqueadores pode começar imediatamente.

**Refatorações amplas são a exceção ao fatiamento vertical.** Uma **refatoração ampla** é uma mudança mecânica (renomear uma coluna, mudar o tipo de um símbolo compartilhado) cujo **raio de impacto (blast radius)** se espalha pela base de código inteira, de modo que uma única edição quebra milhares de pontos de chamada de uma vez e nenhuma fatia vertical consegue entrar verde. Não force isso em uma bala traçante; sequencie como **expandir–contrair (expand–contract)**. Primeiro expanda: adicione a forma nova ao lado da antiga, para que nada quebre. Depois migre os pontos de chamada em lotes dimensionados pelo raio de impacto (por pacote, por diretório), cada lote em seu próprio ticket bloqueado pela expansão, mantendo o CI verde de lote em lote porque a forma antiga ainda existe. Por fim, contraia: apague a forma antiga quando não restar nenhum chamador, em um ticket bloqueado por todos os lotes de migração. Quando nem os lotes conseguem ficar verdes sozinhos, mantenha a sequência, mas deixe-os compartilhar uma branch de integração, e todos eles bloqueiam um ticket final de integrar e verificar; o verde só é garantido ali.

### 4. Questione o usuário

Apresente a divisão proposta como uma lista numerada. Para cada ticket, mostre:

- **Título**: nome curto e descritivo
- **Bloqueado por**: quais outros tickets (se houver) precisam ser concluídos antes
- **O que entrega**: o comportamento de ponta a ponta que este ticket faz funcionar

Pergunte ao usuário:

- A granularidade parece certa? (grossa demais / fina demais)
- As arestas de bloqueio estão corretas: cada ticket depende só de tickets que realmente o condicionam?
- Algum ticket deveria ser juntado ou dividido mais?

Repita até o usuário aprovar a divisão.

### 5. Publique os tickets no rastreador configurado

Publique os tickets aprovados. **Como** depende do rastreador que o `/setup-matt-pocock-skills` configurou; os tickets são os mesmos de qualquer jeito, só muda o formato das arestas de bloqueio:

- **Arquivos locais** → escreva um arquivo por ticket em `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numerados a partir de `01` na ordem de dependência (bloqueadores primeiro). O "Bloqueado por" de cada arquivo lista os números/títulos de que ele depende. Use o modelo de arquivo por ticket abaixo: um ticket por arquivo, nunca um único arquivo combinado.
- **Um rastreador de issues de verdade (GitHub, Linear, …)** → publique uma issue por ticket na ordem de dependência (bloqueadores primeiro), para que as arestas de bloqueio de cada ticket possam referenciar identificadores reais. Use a relação de bloqueio nativa da plataforma, quando houver; caso contrário, preencha o "Bloqueado por" de cada ticket com as issues que o bloqueiam. Se a origem era uma issue existente, faça de cada ticket uma sub-issue dela (operação do documento do rastreador). Aplique o rótulo de triagem `ready-for-agent`, a não ser que receba outra instrução; os tickets são, por construção, prontos para um agente pegar.

Trabalhe a **fronteira**: qualquer ticket cujos bloqueadores estejam todos concluídos. Para uma cadeia puramente linear, isso significa de cima para baixo.

NÃO feche nem modifique nenhuma issue pai.

<local-ticket-template>

# <NN>: <Título do ticket>

**O que construir:** o comportamento de ponta a ponta que este ticket faz funcionar, do ponto de vista do usuário, não uma lista de implementação camada por camada.

**Bloqueado por:** os números/títulos dos tickets que condicionam este, ou "Nenhum (pode começar imediatamente)".

**Status:** ready-for-agent

- [ ] Critério de aceitação 1
- [ ] Critério de aceitação 2

</local-ticket-template>

<issue-template>

## Pai

Uma referência à issue pai no rastreador (se a origem era uma issue existente; caso contrário, omita esta seção).

## O que construir

O comportamento de ponta a ponta que este ticket faz funcionar, do ponto de vista do usuário, não uma implementação camada por camada.

## Critérios de aceitação

- [ ] Critério 1
- [ ] Critério 2

## Bloqueado por

- Uma referência a cada ticket bloqueador, ou "Nenhum (pode começar imediatamente)". Omita esta seção quando os bloqueadores foram definidos como arestas nativas.

</issue-template>

Em qualquer das formas, evite caminhos de arquivo específicos e trechos de código: eles ficam desatualizados rápido. Exceção: se um protótipo produziu um trecho que codifica uma decisão com mais precisão do que a prosa consegue (máquina de estados, reducer, schema, formato de tipo), coloque-o no texto e anote brevemente que ele veio de um protótipo. Corte até ficar só a parte rica em decisões, não uma demo funcionando, só o que importa.
