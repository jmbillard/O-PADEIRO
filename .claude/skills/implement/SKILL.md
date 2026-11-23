---
name: implement
description: "Implementa um trabalho a partir de uma especificação (spec) ou de um conjunto de tickets."
disable-model-invocation: true
---

Implemente o trabalho descrito pelo usuário na spec ou nos tickets.

Se o usuário passar a referência de um ticket, busque-o no rastreador de issues e informe o título antes de começar. Se a referência for ambígua, pergunte.

Chame a ferramenta Skill com "tdd" sempre que possível, nas costuras (seams) combinadas previamente.

Rode a checagem de tipos com frequência, arquivos de teste individuais com frequência e a suíte de testes completa uma vez, no final.

Ao terminar, chame a ferramenta Skill com "code-review" para revisar o trabalho.

Faça commit do seu trabalho na branch atual.
