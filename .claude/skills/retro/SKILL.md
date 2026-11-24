---
name: retro
description: "Faça uma retrospectiva de uma sessão de código."
disable-model-invocation: true
---

O usuário pediu uma **retrospectiva**. Você vai sugerir melhorias no **ambiente** do agente de código para melhorar as próximas execuções.

## Passos

1. Chame a ferramenta Skill com `writing-for-agents` para obter o guia de estilo de escrita.

2. Leia as fontes primárias da sessão que o usuário indicar. Isso pode significar vasculhar os logs de sessão nesta máquina. Se o usuário não indicar uma sessão, use a atual.

3. Procure candidatos a melhoria nestas categorias.

- **Navegação**: quão fácil foi para o agente achar os arquivos certos? Há dependências ocultas entre arquivos? Um **ponteiro de navegação** facilitaria? _Use quando_ a sessão demorou muito para achar uma informação.
- **Verificações automáticas**: há verificações automáticas que poderiam pegar os erros que o agente cometeu? Linting, tipagem, testes, linters de sistema de arquivos? Leia primeiro o comando de verificação do próprio repositório (os scripts `lint`/`check` do `package.json` ou da ferramenta de build, o workflow de CI), para que a descoberta seja uma verificação que já existe mas está desconectada ou quebrada em silêncio, e não uma reinvenção. Um repositório sem nenhuma **barreira de proteção** (sem hook de pre-commit e sem job de CI rodando o comando de lint/typecheck/teste) já é por si só uma descoberta: um repositório sem lint é uma oportunidade perdida permanente, não um padrão neutro. _Use quando_ o agente cometeu um erro que uma verificação automática poderia ter pegado, ou o repositório não tem barreira de proteção nenhuma.
- **Padrões de código**: o **agente revisor** deveria receber uma nova regra para aplicar? Alguma regra existente deveria ser removida ou esclarecida? Classifique a violação primeiro: uma violação **mecânica** (um padrão sintático fixo, uma API proibida, um formato de import, uma regra de localização de arquivo) ganha uma verificação determinística, ponto final: uma regra customizada no linter do próprio repositório, um novo hook de pre-commit ou um novo job de CI, o que for mais barato dada a linguagem do repositório e a barreira de proteção que já existe. Por padrão, construa a verificação em vez de escrever a regra. Reserve o `CODING_STANDARDS.md` para genuínas **questões de julgamento** (consistência entre arquivos, "segue o estilo do entorno", qualquer coisa que nenhuma barreira de proteção jamais poderia substituir). _Use quando_ o agente revisor deixou passar um erro.
- **AGENTS.md global**: há instruções de direcionamento que deveriam ir para os padrões de código (ou para verificações automáticas)? _Use quando_ o arquivo AGENTS.md está especialmente grande, no repositório OU no escopo global do usuário.
- **Economia de ferramentas**: o agente fez chamadas de ferramenta caras que poderiam ser enxugadas? Há alguma ferramenta customizada (CLIs, MCPs) especialmente ineficiente em tokens? _Use quando_ o agente fez uma chamada de ferramenta cara.
- **Instruções inócuas**: procure instruções nos arquivos de direcionamento que não mudam o comportamento do agente. _Use quando_ os arquivos de direcionamento estão grandes e difíceis de manejar.
- **Acesso à informação**: procure oportunidades de aumentar o acesso do agente à informação. Duplicar (com tee) os logs do servidor de desenvolvimento, acesso somente leitura a serviços de terceiros. _Use quando_ uma informação crucial não estava disponível para o agente.

4. Apresente esses candidatos ao usuário, em ordem de gravidade.

## Referência

### Implementação vs. revisão

Lembre que todo trabalho passa por duas etapas: implementação e revisão. O agente de implementação é o que sofre mais **pressão de contexto**. Ele é responsável por explorar, escrever código e depurar falhas.

O agente de revisão é o que sofre menos pressão de contexto: ele recebe um diff, então não precisa explorar. Muitas vezes não precisa escrever código nem depurar.

Isso significa que quem deve impor os padrões de código é o agente de revisão, não o de implementação.

### Arquivos

Você tem acesso a vários arquivos no repositório:

- `CLAUDE.md`/`AGENTS.md`: esses arquivos são empurrados para a janela de contexto de qualquer agente que trabalhe neste repositório. Devem ser usados com extrema parcimônia, normalmente só para **ponteiros de navegação** para outros arquivos.
- `CODING_STANDARDS.md`: este arquivo é lido durante a revisão, não durante a implementação. Adicione **ponteiros de navegação** para pastas de documentação se o arquivo de padrões passar de 1.000 linhas.
- Documentação: use a documentação como arquivos de referência, apontados por outros arquivos. Procure a documentação existente antes de escrever uma nova.
- Skills: use skills para documentação (já que a descrição delas vai para a janela de contexto do agente) ou para comandos invocados pelo usuário. Siga as orientações da skill `writing-for-agents`.
