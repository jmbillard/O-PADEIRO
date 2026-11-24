---
name: handoff
description: Compacta a conversa atual em um documento de passagem de bastão (handoff) para outro agente continuar.
argument-hint: "Para que a próxima sessão será usada?"
disable-model-invocation: true
---

Escreva um documento de passagem de bastão (handoff) resumindo a conversa atual para que um agente novo possa continuar o trabalho. Salve no diretório temporário do sistema operacional do usuário (`$TMPDIR`, senão `/tmp`; `%TEMP%` no Windows), não no workspace atual.

Inclua no documento uma seção de "skills sugeridas", dizendo para quais skills o próximo agente deve chamar a ferramenta Skill.

Não duplique conteúdo que já está registrado em outros artefatos (especificações [specs], planos, ADRs, issues, commits, diffs). Em vez disso, faça referência a eles pelo caminho ou pela URL.

Oculte qualquer informação sensível, como chaves de API, senhas ou dados pessoais identificáveis.

Se o usuário passou argumentos, trate-os como uma descrição do foco da próxima sessão e adapte o documento de acordo.
