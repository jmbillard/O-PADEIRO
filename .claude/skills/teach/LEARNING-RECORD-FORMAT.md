# Formato do registro de aprendizado

Os registros de aprendizado ficam em `./learning-records/` e usam numeração sequencial: `0001-slug.md`, `0002-slug.md` etc. Crie o diretório sob demanda: só quando o primeiro registro for escrito.

Eles são o equivalente, no ensino, dos ADRs: guardam lições não óbvias, percepções-chave e o conhecimento prévio declarado que vão orientar as próximas sessões. São usados para calcular a zona de desenvolvimento proximal.

## Modelo

```md
# {Short title of what was learned or established}

{1-3 sentences: what was learned (or what prior knowledge was established), and why it matters for future sessions.}
```

O formato é só isso. Um registro de aprendizado pode ser um único parágrafo. O valor está em registrar _que_ isso agora é sabido e _por que_ isso muda o que ensinar em seguida, não em preencher seções.

## Seções opcionais

Só inclua estas quando agregarem valor de verdade. A maioria dos registros não vai precisar delas.

- Frontmatter de **Status** (`active | superseded by LR-NNNN`): útil quando um entendimento anterior se mostra errado e é substituído.
- **Evidência**: como o usuário demonstrou o entendimento (uma pergunta respondida, um exercício concluído, uma experiência prévia citada). Útil quando a afirmação pode ser revista.
- **Implicações**: o que isso libera ou descarta para as próximas sessões. Vale registrar quando não é óbvio.

## Numeração

Procure em `./learning-records/` o maior número existente e some um.

## Quando escrever um registro de aprendizado

Escreva um quando qualquer uma destas condições valer:

1. **O usuário demonstrou entendimento real de algo não trivial**: não só contato com o assunto, mas evidência de que ele consegue usar o conceito corretamente. Isso define um novo patamar para o que ensinar em seguida.
2. **O usuário revelou conhecimento prévio**: "Eu já sei X." Registre para que as próximas sessões não ensinem de novo. Registre também a _profundidade_ declarada.
3. **Um equívoco foi corrigido**: o usuário acreditava em algo errado e agora entende por quê. Estes valem muito: preveem os tropeços futuros em assuntos relacionados.
4. **A missão mudou em resposta ao aprendizado**: o usuário descobriu que se importava com algo diferente do que pensava. Faça um link cruzado para [[MISSION.md]] e atualize-o.

### O que _não_ conta

- Material que só foi apresentado. Apresentar não é aprender. Espere pela evidência.
- Qualquer coisa já registrada de forma enxuta em [[GLOSSARY.md]] como definição de termo. Não duplique.
- Diários de atividade sessão a sessão. Registros de aprendizado não são um diário: são percepções com peso de decisão.

## Substituição

Quando um registro mais novo contradiz um anterior (o entendimento do usuário se aprofundou ou foi corrigido), marque o registro antigo com `Status: superseded by LR-NNNN` em vez de apagá-lo. A história de como o entendimento evoluiu já é, por si só, um sinal útil.
