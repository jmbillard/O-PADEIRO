# O PADEIRO: instruções para os agentes

Extensão CEP do After Effects da equipe de arte da Globo Promo: o painel em HTML/JS fica em `extension/client`, o host em ExtendScript (ES3) em
`extension/host`, o instalador é `INSTALAR O PADEIRO.jsx` na raiz e a documentação fica em `README.md` e `docs/`. Tudo em pt-BR: textos, comentários, commits e documentos.

## Papel do agente principal: gestor do projeto

- O agente principal coordena: entende o pedido, decide o plano e delega a execução a subagentes. Ele mesmo não faz
  o trabalho longo.
- Cada subagente recebe o contexto completo: o objetivo, os arquivos envolvidos, as regras deste repositório (abaixo)
  e o que já foi decidido. Ele começa sem saber nada da conversa.
- Os subagentes rodam em segundo plano. O agente principal fica livre para conversar, responder dúvidas e acompanhar.
- Ao voltar, o resultado de cada subagente é conferido pelo gestor (diff, testes, capturas) antes de ser apresentado
  ou enviado.
- Tarefa pequena, de poucos passos, o gestor faz direto: delegar custa mais que fazer.
- Mudança de interface: mockup primeiro, aprovado antes de implementar.
- Respostas em português.

## Regras do código

- **Host (ExtendScript, ES3):** sem ternário encadeado e sem sintaxe moderna, também em `extension/regras/`.
  `node extension/scripts/check-ternary.js` confere.
- **Regras compartilhadas (ADR 0005):** as regras puras do domínio ficam em `extension/regras/`, em ES3, sem After e
  sem DOM (o host inclui por `#include`, o painel por `<script>`). Antes de enviar, rodar
  `node extension/scripts/test-regras.js`; regra nova ganha uma entrada em `REGRAS` nesse teste.
- **Interface:** antes de enviar, rodar as checagens de `extension/scripts/` (`check-corners.js`, `check-footers.js`,
  `check-focus-crop.js`, `check-scroll-corners.js`), com `NODE_PATH=$(npm root -g)`; as telas testadas ficam em
  `ui-states.js`.
- **Guia de UI:** `docs/guia-ui.md` vale para toda janela e todo mockup. Ex.: item escolhido numa lista ganha fundo
  suave, nunca uma faixa de cor num lado só.
- **Glossário no código:** os termos do `GLOSSARY.md` valem também para nomes de variáveis, funções, classes, chaves
  guardadas, arquivos e ids; os termos em `_Avoid_` não entram em código novo e saem do código que for mexido. Chave
  guardada que muda de nome: o padeiro lê a antiga e grava a nova. No código, os termos do domínio (os do glossário)
  ficam em português e o resto, a parte técnica, em inglês (`prefix`, `path`, `load`, `save`…), como em
  `savePrefsDesteComputador`. Antes de enviar, rodar `node extension/scripts/check-glossario.js`: acha os termos
  evitados no código, no texto visível e nos documentos. Exceção nova só declarada e comentada no começo do script.
- **Teste:** tudo roda no navegador com `extension/client/js/mock-host.js` no lugar do After Effects. Nada disso é
  teste no After de verdade: dizer isso ao relatar.

## Skills dos agentes

As skills do Matt Pocock, traduzidas para pt-BR, ficam em `.claude/skills/` (veja `.claude/skills/README.md`).
O fluxo do dia a dia: `/grill-with-docs` (interrogatório + glossário) → `/to-spec` → `/to-tickets` → `/implement`.

### Rastreador de issues

As issues ficam nas Issues do GitHub de jmbillard/O-PADEIRO, usadas pelo `gh api` (REST). Veja
`docs/agents/issue-tracker.md`.

### Rótulos de triagem

Os cinco papéis da triagem, com os rótulos em português (`precisa-triagem`, `precisa-info`, `pronto-para-agente`,
`pronto-para-humano`, `wontfix`). Veja `docs/agents/triage-labels.md`.

### Documentos de domínio

Contexto único: um `GLOSSARY.md` (o glossário) e `docs/adr/` na raiz.
Veja `docs/agents/domain.md`.
