# Protótipo de lógica

Um único arquivo HTML autocontido (uma **demo compartilhável**) que permite a qualquer pessoa conduzir um modelo de estado clicando em botões. Use quando a pergunta for sobre **regra de negócio, transições de estado ou formato dos dados**: o tipo de coisa que parece razoável no papel, mas só se revela errada quando você a passa por casos reais.

Como é um arquivo só, sem nada para instalar, dá para entregá-lo a alguém que não é desenvolvedor (um designer, um PM, um especialista no domínio) e deixar que a pessoa sinta o modelo por conta própria. Por isso ele fala a língua dela, não a do código.

## Quando este é o formato certo

- "Não sei se essa máquina de estados trata o caso extremo em que acontece X e depois Y."
- "Esse modelo de dados realmente me deixa representar o caso em que..."
- "Quero sentir como a API deveria ser antes de escrevê-la."
- Qualquer situação em que alguém queira **apertar botões e ver o estado mudar**.

Se a pergunta for "como isso deveria ficar", este é o ramo errado. Use [UI.md](UI.md).

## Processo

### 1. Declare a pergunta

Antes de escrever código, anote qual modelo de estado e qual pergunta você está prototipando. Um parágrafo, no topo da demo (numa introdução visível, não só num comentário). Um protótipo de lógica que responde à pergunta errada é puro desperdício, então deixe a pergunta explícita para que possa ser conferida depois, esteja o usuário olhando agora ou voltando a ela mais tarde, quando estiver ausente.

### 2. Isole a lógica num módulo portátil

Coloque a lógica de fato (a parte que responde à pergunta) num único bloco `<script>`, escrita como um módulo pequeno e puro que possa ser retirado dali e colocado no código real depois. A página em volta é descartável; esse módulo não.

O formato certo depende da pergunta:

- **Um reducer puro**: `(state, action) => state`. Bom quando as ações são eventos discretos e o estado é um valor único.
- **Uma máquina de estados**: estados e transições explícitos. Boa quando "quais ações são sequer permitidas agora" faz parte da pergunta.
- **Um pequeno conjunto de funções puras** sobre um tipo de dado simples. Bom quando não há um estado atual implícito, só transformações.
- **Uma classe ou módulo com uma superfície de métodos clara**, quando a lógica de fato é dona de um estado interno contínuo.

Escolha o formato que melhor se encaixa na pergunta feita, *não* o mais fácil de ligar a uma página. Mantenha-o puro: sem DOM, sem `document`, sem handlers de botão mexendo lá dentro. A página chama o módulo; nada flui na direção contrária. É isso que torna o protótipo útil além da própria vida: depois que a pergunta é respondida, o reducer / máquina / conjunto de funções validado passa sozinho para o módulo real.

### 3. Monte o arquivo HTML compartilhável

Um arquivo, HTML/CSS/JS puro: sem framework, sem bundler, sem servidor, tudo inline para que abra com dois cliques e sobreviva a ser enviado por e-mail. Qualquer pessoa deve conseguir rodá-lo só abrindo o arquivo.

Escreva para quem não é desenvolvedor. Todo rótulo está em **linguagem de domínio**, não de código: botões e estado se leem como o negócio, não como o reducer. Explique em palavras simples o que está acontecendo.

Organize com uma hierarquia limpa, de cima para baixo:

1. **Título e uma explicação de uma linha** do que esta demo deixa você explorar (a pergunta do passo 1).
2. **Estado atual**: todo o estado relevante, renderizado como um painel legível (campos com rótulo, não um despejo de JSON cru), renderizado de novo após cada clique para que a mudança fique visível. Onde ajudar alguém que não é desenvolvedor a acompanhar, destaque o que acabou de mudar.
3. **Botões de uso livre**: um botão por ação, sempre disponível, para que qualquer pessoa possa cutucar o modelo em qualquer ordem. Cada clique dispara a sua ação e renderiza o estado de novo.
4. **Roteiros guiados**: um conjunto de **cenários**, um por aba. Cada aba traz uma descrição curta, em linguagem simples, do cenário (a situação que ele monta e no que prestar atenção) e, logo abaixo, os **botões a apertar** para aquele cenário, em ordem. Cada passo é um botão de verdade: clicar nele executa aquela ação e avança para o próximo passo. Iniciar um roteiro volta para um estado inicial conhecido, para que o cenário rode do mesmo jeito toda vez.

Escolha cenários que demonstrem os casos incômodos, aqueles difíceis de raciocinar no papel: o caminho feliz, um caso extremo traiçoeiro, uma tentativa de fazer algo que deveria ser proibido.

Deixe-o bonito, mas contido: tipografia limpa, espaçamento generoso, uma cor de destaque. Sem animações, sem firulas: nada que concorra com o estado e os botões.

### 4. Entregue

Envie o arquivo ou abra-o para a pessoa. Ela vai clicar pelos roteiros e pelo uso livre quando puder; os momentos interessantes são quando ela diz "peraí, isso não deveria ser possível" ou "ué, eu achava que X seria diferente"; esses são os bugs da _ideia_, que é a questão toda. Se ela quiser ações novas ou um cenário novo, adicione. Protótipos evoluem.

### 5. Registre a resposta e o protótipo

Depois que o protótipo tiver respondido à sua pergunta, registre a resposta e depois registre o protótipo do jeito que a [SKILL](SKILL.md) descreve. O mapeamento específico da lógica: o reducer / máquina / conjunto de funções validado passa para o módulo real (a decisão, absorvida); a casca HTML vai junto para o branch descartável que guarda o protótipo como fonte primária e, por ser um único arquivo autocontido, continua trivial de rodar de novo lá.

## Antipadrões

- **Não adicione testes.** Um protótipo que precisa de testes já não é um protótipo.
- **Não o ligue ao banco de dados real.** Use estado em memória, a menos que a pergunta seja especificamente sobre persistência.
- **Não generalize.** Nada de "e se quisermos suportar X depois". O protótipo responde a uma pergunta.
- **Não misture a lógica com a página.** Se o módulo puro referencia o DOM, `document` ou handlers de botão, ele já não pode ser retirado dali. Mantenha a página como uma casca fina sobre um módulo puro.
- **Não recorra a framework, bundler ou servidor.** Um arquivo que o destinatário abre com dois cliques; um app React ou um servidor de desenvolvimento acaba com o "compartilhável".
- **Não coloque a casca HTML em produção.** A página é otimizada para ser clicada à mão. O módulo de lógica por trás dela é a parte que vale guardar.
