# O PADEIRO: instruções para os agentes

Extensão CEP do After Effects: o painel em HTML/JS fica em `extension/client`, o host em ExtendScript (ES3) em
`extension/host`, o instalador é `INSTALAR O PADEIRO.jsx` na raiz e a documentação fica em `README.md` e `docs/`.

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

- **Host (ExtendScript, ES3):** sem ternário encadeado e sem sintaxe moderna. `node extension/scripts/check-ternary.js`
  confere.
- **Interface:** antes de enviar, rodar as checagens de `extension/scripts/` (`check-corners.js`, `check-footers.js`,
  `check-focus-crop.js`, `check-scroll-corners.js`); as telas testadas ficam em `ui-states.js`.
- **Teste:** tudo roda no navegador com `extension/client/js/mock-host.js` no lugar do After Effects. Nada disso é
  teste no After de verdade: dizer isso ao relatar.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for jmbillard/O-PADEIRO, used through `gh api` (REST). See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
