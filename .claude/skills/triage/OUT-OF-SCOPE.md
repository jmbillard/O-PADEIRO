# Base de conhecimento do que está fora do escopo

O diretório `.out-of-scope/` de um repositório guarda registros persistentes de pedidos de funcionalidade rejeitados. Ele serve a dois propósitos:

1. **Memória institucional**: por que uma funcionalidade foi rejeitada, para o raciocínio não se perder quando a issue é fechada
2. **Eliminação de duplicatas**: quando chega uma issue nova que corresponde a uma rejeição anterior, a skill pode trazer a decisão anterior à tona em vez de rediscutir tudo

## Estrutura do diretório

```
.out-of-scope/
├── dark-mode.md
├── plugin-system.md
└── graphql-api.md
```

Um arquivo por **conceito**, não por issue. Várias issues pedindo a mesma coisa ficam agrupadas em um arquivo só.

## Formato do arquivo

O arquivo deve ser escrito em um estilo descontraído e legível, mais parecido com um documento de design curto do que com um registro de banco de dados. Use parágrafos, exemplos de código e exemplos para deixar o raciocínio claro e útil para quem o encontrar pela primeira vez.

```markdown
# Dark Mode

This project does not support dark mode or user-facing theming.

## Por que está fora do escopo

The rendering pipeline assumes a single color palette defined in
`ThemeConfig`. Supporting multiple themes would require:

- A theme context provider wrapping the entire component tree
- Per-component theme-aware style resolution
- A persistence layer for user theme preferences

This is a significant architectural change that doesn't align with the
project's focus on content authoring. Theming is a concern for downstream
consumers who embed or redistribute the output.

```ts
// The current ThemeConfig interface is not designed for runtime switching:
interface ThemeConfig {
  colors: ColorPalette; // single palette, resolved at build time
  fonts: FontStack;
}
```

## Pedidos anteriores

- #42: "Add dark mode support"
- #87: "Night theme for accessibility"
- #134: "Dark theme option"
```

### Como nomear o arquivo

Use um nome curto e descritivo em kebab-case para o conceito: `dark-mode.md`, `plugin-system.md`, `graphql-api.md`. O nome deve ser reconhecível o bastante para que alguém navegando pelo diretório entenda o que foi rejeitado sem abrir o arquivo.

### Como escrever o motivo

O motivo deve ter substância: não "não queremos isso", mas por quê. Bons motivos fazem referência a:

- Escopo ou filosofia do projeto ("Este projeto foca em X; temas são uma preocupação de quem consome a jusante")
- Restrições técnicas ("Dar suporte a isso exigiria Y, que entra em conflito com a nossa arquitetura Z")
- Decisões estratégicas ("Escolhemos usar A em vez de B porque...")

O motivo deve ser durável. Evite citar circunstâncias temporárias ("estamos muito ocupados agora"); essas não são rejeições de verdade, são adiamentos.

## Quando consultar `.out-of-scope/`

Durante a triagem (Passo 1: Reúna contexto), leia todos os arquivos em `.out-of-scope/`. Ao avaliar uma issue nova:

- Verifique se o pedido corresponde a um conceito fora do escopo já existente
- A correspondência é por semelhança de conceito, não por palavra-chave: "tema noturno" corresponde a `dark-mode.md`
- Se houver correspondência, leve ao mantenedor: "Isto é parecido com `.out-of-scope/dark-mode.md`. Rejeitamos isso antes porque [motivo]. Você ainda pensa do mesmo jeito?"

O mantenedor pode:

- **Confirmar**: a issue nova é adicionada à lista "Pedidos anteriores" do arquivo existente e depois fechada
- **Reconsiderar**: o arquivo de fora do escopo é apagado ou atualizado, e a issue segue pela triagem normal
- **Discordar**: as issues são relacionadas mas distintas; siga com a triagem normal

## Quando escrever em `.out-of-scope/`

Só quando um **enhancement** (não um bug) é *rejeitado* como `wontfix`. Isso vale para PRs de enhancement exatamente como vale para issues: um PR rejeitado é registrado aqui para que o mesmo pedido não volte como código novo.

**Não** escreva aqui quando algo for fechado como `wontfix` por **já estar implementado**. Isso é uma funcionalidade construída, não rejeitada; registrá-la envenenaria as verificações de duplicatas com rejeições falsas. Em vez disso, o comentário de fechamento aponta onde a funcionalidade já está.

O fluxo:

1. O mantenedor decide que um pedido de funcionalidade está fora do escopo
2. Verifique se já existe um arquivo correspondente em `.out-of-scope/`
3. Se sim: acrescente a issue nova à lista "Pedidos anteriores"
4. Se não: crie um arquivo novo com o nome do conceito, a decisão, o motivo e o primeiro pedido anterior
5. Publique um comentário na issue explicando a decisão e mencionando o arquivo em `.out-of-scope/`
6. Feche a issue com o rótulo `wontfix`

## Como atualizar ou remover arquivos de fora do escopo

Se o mantenedor mudar de ideia sobre um conceito rejeitado antes:

- Apague o arquivo em `.out-of-scope/`
- A skill não precisa reabrir issues antigas; elas são registros históricos
- A issue nova que motivou a reconsideração segue pela triagem normal
