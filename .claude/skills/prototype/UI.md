# Protótipo de UI

Gere **várias variações de UI radicalmente diferentes** numa única rota, alternáveis por uma barra flutuante na parte de baixo. O usuário alterna entre as variantes no navegador, escolhe uma (ou rouba pedaços de cada) e depois joga o resto fora.

Se a pergunta for sobre lógica/estado, e não sobre a aparência de algo, este é o ramo errado. Use [LOGIC.md](LOGIC.md).

## Quando este é o formato certo

- "Como esta página deveria ficar?"
- "Quero ver algumas opções para este dashboard antes de me comprometer."
- "Tente um layout diferente para a tela de configurações."
- Qualquer situação em que o usuário, de outro jeito, passaria um dia escolhendo entre três mockups vagos na cabeça.

## Dois subformatos: prefira fortemente o subformato A

Um protótipo de UI é muito mais fácil de julgar quando está **encostado no resto do app**: cabeçalho de verdade, barra lateral de verdade, dados de verdade, densidade de verdade. Uma rota descartável isolada é um vácuo: toda variante parece boa no isolamento. Vá pelo subformato A sempre que houver uma página existente plausível para hospedar as variantes. Só recorra ao subformato B se o protótipo realmente não tiver uma casa por perto.

### Subformato A: ajuste numa página existente (preferido)

A rota já existe. As variantes são renderizadas **na mesma rota**, controladas por um parâmetro de busca `?variant=` na URL. A busca de dados, os parâmetros e a autenticação existentes continuam todos. Só a renderização é trocada. Este é o padrão; escolha-o a menos que haja um motivo específico para não escolher.

Se o protótipo for de algo que ainda não tem página, mas *naturalmente viveria dentro de uma* (uma nova seção do dashboard, um novo card na tela de configurações, um novo passo num fluxo existente), continua sendo o subformato A. Monte as variantes dentro da página hospedeira.

### Subformato B: uma página nova (último recurso)

Use só quando a coisa sendo prototipada realmente não tiver uma página existente onde viver (por exemplo, uma superfície de nível superior inteiramente nova, ou um fluxo que não dá para embutir em nenhum lugar sensato).

Crie uma **rota descartável** seguindo a convenção de rotas que o projeto já usa. Não invente uma nova estrutura de nível superior. Dê a ela um nome que deixe óbvio que é um protótipo (por exemplo, inclua a palavra `prototype` no caminho ou no nome do arquivo). Mesmo padrão `?variant=`.

Antes de se comprometer com o subformato B, confira: não existe mesmo nenhuma página onde isso possa ser embutido? Uma rota vazia esconde problemas de design que uma rota cheia exporia.

Nos dois subformatos a barra flutuante de baixo é idêntica.

## Processo

### 1. Declare a pergunta e escolha N

Por padrão, **3 variantes**. Mais de 5 deixa de ser radicalmente diferente e começa a ser ruído, então pare aí.

Anote o plano em uma linha, no local do protótipo ou num comentário no topo do arquivo:

> "Três variantes da página de configurações, alternáveis por `?variant=`, na rota existente `/settings`."

Isso funciona esteja o usuário aqui para discordar ou não.

### 2. Gere variantes radicalmente diferentes

Faça um rascunho de cada variante. Mantenha cada uma presa a:

- O propósito da página e os dados a que ela tem acesso.
- A biblioteca de componentes / sistema de estilo do projeto (TailwindCSS, shadcn, MUI, CSS puro, o que for).
- Um nome de componente exportado claro, por exemplo `VariantA`, `VariantB`, `VariantC`.

As variantes têm de ser **estruturalmente diferentes**: layout diferente, hierarquia de informação diferente, affordance principal diferente, e não só cores diferentes. Três grades de cards levemente ajustadas não são um protótipo de UI, são papel de parede. Se dois rascunhos saírem parecidos demais, refaça um com a orientação explícita "não use uma grade de cards".

### 3. Ligue tudo

Crie um único componente seletor na rota:

```tsx
// pseudocódigo, adapte ao framework do projeto
const variant = searchParams.get('variant') ?? 'A';
return (
  <>
    {variant === 'A' && <VariantA {...data} />}
    {variant === 'B' && <VariantB {...data} />}
    {variant === 'C' && <VariantC {...data} />}
    <PrototypeSwitcher variants={['A','B','C']} current={variant} />
  </>
);
```

No subformato A (página existente): mantenha toda a busca de dados existente acima do seletor; só a subárvore renderizada muda por variante.

No subformato B (página nova): a rota descartável em `/prototype/<name>` monta o mesmo seletor.

### 4. Monte o seletor flutuante

Uma barra pequena de posição fixa, centralizada na parte de baixo da tela, com três peças:

- **Seta da esquerda**: vai para a variante anterior (dá a volta).
- **Rótulo da variante**: mostra a chave da variante atual e, se a variante exportar um nome, esse nome também. Por exemplo, `B (Sidebar layout)`.
- **Seta da direita**: avança (dá a volta).

Comportamento:

- Clicar numa seta atualiza o parâmetro de busca da URL (use o roteador do framework, por exemplo `router.replace` no Next, `navigate` no React Router etc.) para que a variante possa ser compartilhada e se mantenha ao recarregar.
- Teclado: as setas `←` e `→` também alternam. Não intercepte as setas quando um `<input>`, `<textarea>` ou `[contenteditable]` estiver com foco.
- Visualmente distinta da página (por exemplo, uma pílula de alto contraste, sombra sutil), para que fique óbvio que não faz parte do design sendo avaliado.
- Escondida nos builds de produção: condicione a `process.env.NODE_ENV !== 'production'` ou a uma verificação equivalente, para que um merge de protótipo perdido não leve a barra aos usuários.

Coloque o seletor num único componente compartilhado para que os dois subformatos possam reutilizá-lo. Coloque-o onde a UI compartilhada vive no projeto.

### 5. Entregue

Mostre a URL (e as chaves de `?variant=`). O usuário vai alternar entre elas quando puder. O retorno interessante costuma ser **"quero o cabeçalho da B com a barra lateral da C"**, que é o design que ele de fato quer.

### 6. Registre a resposta e faça a limpeza

Depois que uma variante vencer, registre a resposta (qual variante e por quê) e depois registre o protótipo do jeito que a [SKILL](SKILL.md) descreve. Incorpore a vencedora ao código real e mova o resto para o branch descartável, não para a main:

- **Subformato A**: incorpore a vencedora à página existente; tire da main as variantes perdedoras e o seletor.
- **Subformato B**: promova a variante vencedora a uma rota de verdade; tire da main a rota descartável e o seletor.

O conjunto completo de variantes é a fonte primária, então ele vai para o branch descartável, não para o lixo, já que componentes de variante e o seletor deixados no branch main apodrecem rápido e confundem o próximo leitor.

## Antipadrões

- **Variantes que só diferem em cor ou texto.** Isso é um ajuste, não um protótipo. Variantes de verdade discordam sobre a estrutura.
- **Compartilhar código demais entre variantes.** Um `<Header>` compartilhado tudo bem; um `<Layout>` compartilhado anula o propósito. Cada variante deve ter liberdade para jogar fora o layout.
- **Ligar variantes a mutações reais.** Protótipos só de leitura tudo bem. Se uma variante precisar alterar dados, aponte-a para um stub: a pergunta é "como isso deveria ficar", não "o backend funciona".
- **Promover o protótipo direto para produção.** O código da variante foi escrito sob as restrições de protótipo (sem testes, tratamento de erros mínimo). Reescreva-o direito quando for incorporá-lo.
