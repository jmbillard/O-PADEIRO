---
name: triage
description: Move issues e PRs externos por uma máquina de estados de papéis de triagem, categoriza, verifica, interroga se necessário e escreve briefings prontos para agentes.
disable-model-invocation: true
---

# Triagem

Move issues do rastreador de issues do projeto por uma pequena máquina de estados de papéis de triagem.

Se este repositório trata pull requests externos como um canal de pedidos (veja a configuração do rastreador de issues), a triagem cobre esses PRs também: **um PR é uma issue com código anexado**, usando os mesmos papéis, os mesmos estados e a mesma máquina, com algumas diferenças marcadas como "para um PR" abaixo. Resolva um `#42` solto como issue ou PR de acordo com a configuração do rastreador.

Todo comentário ou issue publicado no rastreador de issues durante a triagem **deve** começar com este aviso:

```
> *Isto foi gerado por IA durante a triagem.*
```

## Documentos de referência

- [AGENT-BRIEF.md](AGENT-BRIEF.md): como escrever briefings duráveis para agentes
- [OUT-OF-SCOPE.md](OUT-OF-SCOPE.md): como funciona a base de conhecimento `.out-of-scope/`

## Papéis

Dois papéis de **categoria**:

- `bug`: algo está quebrado
- `enhancement`: funcionalidade nova ou melhoria

Cinco papéis de **estado**:

- `needs-triage`: o mantenedor precisa avaliar
- `needs-info`: aguardando mais informações de quem relatou
- `ready-for-agent`: totalmente especificada, pronta para um agente AFK
- `ready-for-human`: precisa de implementação humana
- `wontfix`: não será atendida

Para um PR, os mesmos estados se leem em relação ao código anexado: `ready-for-agent` significa que há um briefing anexado e um agente deve dar o próximo passo sobre o diff; `ready-for-human` significa que está pronto para um humano fazer o merge.

Toda issue triada deve ter exatamente um papel de categoria e um papel de estado. Se os papéis de estado entrarem em conflito, aponte isso e pergunte ao mantenedor antes de fazer qualquer outra coisa.

Estes são os nomes canônicos dos papéis. Os textos reais dos rótulos usados no rastreador de issues podem ser diferentes. O mapeamento deveria ter sido fornecido a você. Se não foi, diga ao usuário para rodar `/setup-matt-pocock-skills`.

Transições de estado: uma issue sem rótulo normalmente vai primeiro para `needs-triage`; de lá, passa para `needs-info`, `ready-for-agent`, `ready-for-human` ou `wontfix`. `needs-info` volta para `needs-triage` quando quem relatou responde. O mantenedor pode intervir a qualquer momento; aponte transições que pareçam incomuns e pergunte antes de prosseguir.

## Invocação

O mantenedor invoca `/triage` e descreve o que quer em linguagem natural. Interprete o pedido e aja. Exemplos:

- "Me mostra tudo que precisa da minha atenção"
- "Vamos olhar a #42" (issue ou PR)
- "Move a #42 para ready-for-agent"
- "O que está pronto para os agentes pegarem?"

## Mostrar o que precisa de atenção

Consulte o rastreador de issues e apresente três grupos, das mais antigas para as mais novas:

1. **Sem rótulo**: nunca passaram por triagem.
2. **`needs-triage`**: avaliação em andamento.
3. **`needs-info` com atividade de quem relatou desde as últimas notas de triagem**: precisam ser reavaliadas.

Quando PRs estiverem no escopo, inclua os PRs externos nesses grupos e marque cada linha com `[PR]` ou `[issue]`. A busca traz só PRs *externos* (a configuração do rastreador define quem conta como externo), então um PR em andamento de um colaborador não é trabalho de triagem. Esse filtro vale só para a busca; um PR citado explicitamente sempre passa por triagem, seja quem for o autor.

Mostre as contagens e um resumo de uma linha por item. Deixe o mantenedor escolher.

## Fazer a triagem de uma issue ou PR específico

1. **Reúna contexto.** Leia a issue ou o PR inteiro (corpo, comentários, rótulos, autor, datas; para um PR, o diff também). Interprete as notas de triagem anteriores para não perguntar de novo o que já foi resolvido. Explore a base de código usando o glossário de domínio do projeto, respeitando os ADRs da área. Faça duas verificações na base de código: (a) **redundância**: procure uma implementação existente do comportamento pedido pelo conceito de domínio (não só pelas palavras do pedido), e informe onde procurou. Se encontrar, é um `wontfix` de algo já implementado (passo 5). (b) **rejeição anterior**: leia `.out-of-scope/*.md` e aponte qualquer arquivo que se pareça com este pedido.

2. **Recomende.** Diga ao mantenedor qual categoria e qual estado você recomenda, com o raciocínio, mais um breve resumo da base de código relevante para o pedido (inclusive se já está implementado). Aguarde orientação.

3. **Verifique a alegação.** Antes de qualquer interrogatório, confira se a alegação se sustenta. Para um bug, reproduza a partir dos passos de quem relatou. Para um PR, confirme que o diff faz o que diz: faça checkout, rode os testes ou comandos relevantes. Relate o que aconteceu: confirmado (com o caminho no código), falhou, ou detalhes insuficientes (um sinal forte de `needs-info`). Uma verificação confirmada torna o briefing para o agente muito mais forte.

4. **Interrogue (se necessário).** Se o pedido precisar ser desenvolvido, chame a ferramenta Skill duas vezes, para "grilling" e "domain-modeling", e interrogue até dar forma a ele, uma rodada de perguntas por vez, afiando os termos de domínio e atualizando `GLOSSARY.md`/ADRs no caminho, à medida que as decisões saem.

5. **Aplique o resultado:**
   - `ready-for-agent`: publique um comentário com o briefing para o agente ([AGENT-BRIEF.md](AGENT-BRIEF.md)).
   - `ready-for-human`: mesma estrutura de um briefing para agente, mas explique por que não pode ser delegado (decisões de julgamento, acesso externo, decisões de design, teste manual).
   - `needs-info`: publique notas de triagem (modelo abaixo).
   - Para `wontfix`, feche a issue, com um comentário que depende do *porquê*:
     - **Já implementado**: a mudança já existe na base de código. Aponte onde ela está; **não** escreva em `.out-of-scope/` (essa base de conhecimento é para pedidos *rejeitados*, não para os já construídos).
     - **Rejeitado (bug)**: dê uma explicação educada e feche.
     - **Rejeitado (enhancement)**: escreva em `.out-of-scope/`, coloque o link em um comentário e feche ([OUT-OF-SCOPE.md](OUT-OF-SCOPE.md)).
   - `needs-triage`: aplique o papel. Comentário opcional se houver progresso parcial.

## Mudança rápida de estado

Se o mantenedor disser "move a #42 para ready-for-agent", confie nele e aplique o papel diretamente. Confirme o que vai fazer (mudanças de papel, comentário, fechamento) e então aja. Pule o interrogatório. Se for mover para `ready-for-agent` sem uma sessão de interrogatório, pergunte se ele quer escrever um briefing para o agente.

## Modelo de needs-info

```markdown
## Notas da triagem

**O que já estabelecemos:**

- ponto 1
- ponto 2

**O que ainda precisamos de você (@quem-relatou):**

- pergunta 1
- pergunta 2
```

Registre tudo o que foi resolvido durante o interrogatório em "O que já estabelecemos" para o trabalho não se perder. As perguntas devem ser específicas e acionáveis, não "por favor, forneça mais informações".

## Retomar uma sessão anterior

Se já houver notas de triagem na issue ou no PR, leia-as, verifique se quem relatou respondeu alguma pergunta pendente e apresente um quadro atualizado antes de continuar. Não pergunte de novo o que já foi resolvido.
