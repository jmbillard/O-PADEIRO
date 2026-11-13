# 🧭 guia de UI

[← O PADEIRO](../README.md)

as regras para manter todas as janelas do padeiro com a mesma cara e o mesmo comportamento. vale para tudo o que for criado ou mexido: uma janela nova, um campo, um ícone, uma mensagem.

> 🚩 *antes de implementar uma tela nova (ou uma mudança visível), monte o layout e mostre. se tiver dúvida, pergunte. seguir o mesmo estilo é mais importante que inventar um novo.*

## 📍 princípios

- **coerência acima de tudo** → o que já existe é o padrão. antes de criar um componente, procure um igual (cartão de opção, campo de caminho, lixeira, pílula, menu radial) e use o mesmo.
- **simples** → uma ação por botão, o mínimo de texto, nada de opção que ninguém vai usar.
- **o que é da equipe e o que é deste computador** ficam separados (globo = equipe, salvo na rede; bonequinho = neste computador).

## 📍 cores: nada de cor fixa

- **todas as cores vêm de variáveis** (`css/styles.css` e `js/theme.js`). o tema da configuração (aba APARÊNCIA) troca o destaque, o degradê e o modo claro / escuro: uma cor fixa no CSS não acompanha.
  - destaque e tons: `--blue-50` … `--blue-700`, `--blue-ink`, `--blue-mid` (os nomes são históricos: o tema troca o azul por qualquer cor);
  - com transparência: `rgb(var(--accent-rgb) / 20%)`, `--accent-deep-rgb`, `--glow-rgb`, `--shade-rgb`;
  - superfícies, textos e linhas: `--surface`, `--surface-soft`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--border`…
- **sobre o degradê**, texto, ícones, campos, contornos e o item escolhido usam `--on-brand`: `rgb(var(--on-brand))` ou `rgb(var(--on-brand) / 20%)`. é branco no claro e preto no escuro. nunca `white` nem `rgb(255 255 255 / …)`.
- **texto sobre o degradê: no mínimo 88%** de `--on-brand` (`rgb(var(--on-brand) / 88%)`), também o secundário: abaixo disso some no começo claro do degradê. menos que isso só no que está desabilitado ou é placeholder.
- **o modo escuro é o inverso do claro sobre o degradê**: o texto, os ícones e os contornos ficam pretos. nunca coloque uma superfície escura sobre o degradê claro.
- **o item escolhido sobre o degradê** (aba da configuração, template da lista): contorno fino `rgb(var(--on-brand) / 80%)` e fundo translúcido `rgb(var(--on-brand) / 14%)`, o texto na tinta do degradê. sem pílula branca e sem sombra.
- **UI enxuta: sem halos** → nada de sombra colorida ou anel em volta dos componentes (botões, campos, cartões, item escolhido). o degradê já é a primeira camada (sem a caixa de vidro em cima) e cada coisa tem só um **contorno fino** de 1 px. sombra só no que flutua por cima de tudo: menus, listas abertas, dicas, avisos e o que está sendo arrastado.
- **brilho é brilho, em qualquer tema**: reflexos (a mancha clara do degradê, o fio de luz das miniaturas) usam `--shine-rgb` (branco). nunca `--on-brand` num brilho: ele é a tinta sobre o degradê e, no escuro, vira preta.
- **as únicas cores fixas permitidas** são as que têm significado: sucesso (verde), espera (amarelo), erro (vermelho), o alerta da rede, as bolinhas da barra (projeto, fontes, coletar: verde, tudo certo; laranja, falta algo, uma cor só de atenção), o pãozinho da logo, a ilustração do forninho (o loader) e as amostras de cor da aba APARÊNCIA. contorno dos indicadores: `--badge-ring` (branco no claro, cinza escuro no escuro).
- **o tom de "em andamento"** (`--processing`) é o destaque do tema.

## 📍 formas: cantos concêntricos e centros alinhados

- **raios** pelos tokens: `--radius-small` (12), `--radius-medium` (16), `--radius-large` (22), `--radius-shell` (32), `--radius-pill`.
- **cantos concêntricos** → um elemento arredondado dentro de outro tem o raio de fora = raio de dentro + respiro + borda. deixe a conta no comentário do CSS (ex: `/* concêntrico: raio dos campos + respiro (8) + borda (1) */`).
  - **checagem automática** → `extension/scripts/check-corners.js` passa por todas as janelas (as telas de `extension/scripts/ui-states.js`, as mesmas da checagem do foco) e lista cada canto fora da conta, com o raio que o de fora pede:

    ```bash
    node extension/scripts/check-corners.js
    ```

    conta o que aparece arredondado (fundo, borda, contorno por dentro) e também botões, abas e linhas, que ganham fundo no hover ou no escolhido. **tela ou etapa nova** → acrescente em `ui-states.js`.
  - **botões "+" e botões quadrados dentro de cartões** usam o canto dos campos (`--radius-small`), não a pílula: assim o cartão fica concêntrico com eles e com os campos ao mesmo tempo.
- **botão redondo num canto arredondado** → o centro do botão fica no centro do arco do canto: raio do canto = distância do botão até a borda + raio do botão (ex: botões de 38 px a 15 px da borda → canto de 34 px).
- **rodapés** → o centro dos botões fica sempre a `--footer-center` do fundo da janela, em todas as janelas (os botões se alinham entre janelas lado a lado). numa janela com o degradê e a folha lado a lado, os dois rodapés ficam na mesma altura. **a transição para o rodapé é sempre um degradê**, nunca uma linha: na folha, o fundo do rodapé em degradê (`.action-bar.is-anchored`); no degradê, o conteúdo some numa máscara em degradê (`mask-image`). `--footer-center` é 35 px: o botão redondo (38) fica a 16 px do fundo, o mesmo respiro da lateral. o "⋯" é sempre de 38 px, no degradê e na folha.
  - **checagem automática** → `node extension/scripts/check-footers.js` passa pelas telas de `ui-states.js` e lista cada botão de rodapé fora da linha (o centro a `--footer-center` do fundo) e cada "⋯" de outro tamanho.
- **respiro das janelas: 16 px** → em todas as janelas e colunas (degradê e folha), o conteúdo começa a 16 px da borda, dos lados e em cima; embaixo, os botões do rodapé ficam a 16 px do fundo (`--footer-center`).
- **colunas no degradê** → sem vidro, tudo na coluna (o título, a busca, a lista, os campos, os botões do rodapé) começa na mesma linha à esquerda, a 16 px da borda; e o título da coluna fica na mesma altura do título da folha ao lado (16 px do topo).

## 📍 campos

- **ícone antes OU botões dentro, nunca os dois.** campo com botão (pastinha, ×) não tem ícone antes; campo com ícone antes não tem botão dentro.
- **botões dentro do campo** (`.cfg-path > .mini-button`) → transparentes, sem contorno, nem no hover; à direita.
- **campo de caminho** → só leitura quando o caminho vem do navegador de pastas; mostra o **fim** do caminho (a parte que muda); a pastinha à direita troca a pasta.
- **excluir** → a **lixeira fica fora do campo**, à direita da linha (`PAD_UTIL.trashButton` + `PAD_UTIL.removeRow`; na configuração, `rowDelete`): só o contorno vermelho, a tampa abre para a esquerda no hover. nunca um × dentro do campo para excluir uma linha.
- **placeholder** → `ex:` com um exemplo de verdade (`ex: DOMINGÃO`), em minúsculas fora o exemplo.

## 📍 escolhas

- **opções em cartões** (`wz-opt`) → ícone antes, título e caminho / explicação, **bolinha à direita**. o escolhido fica destacado. é o mesmo cartão em todas as etapas.
- **menus radiais** (`log-radio`) para poucas opções curtas na mesma linha; **toggles** para ligar / desligar.
- **o que depende de uma escolha aparece embaixo dela, animado** (ex: "outra pasta…" abre o campo com a pastinha) e some animado quando sai.
- **nada fica pela metade na tela**: uma opção que ainda não existe fica desabilitada com "em breve", não escondida pela metade.

## 📍 ícones

- **SVG em linha**, `stroke: currentcolor`, traço entre 1.7 e 1.8, cantos e pontas arredondados. a cor vem de quem o contém, nunca do ícone.
- **pastas só no contorno**; **arquivos (o `.aep`, os templates) sólidos**, com a dobra do canto um tom mais escuro da cor do próprio ícone (`--fold`; sobre o degradê, `--fold-on-brand`, que no escuro é clara). num ícone de `<use>`, a cor da dobra passa pela variável `--file-fold`.
- **ícones das ferramentas** (os `barra-<nome>.svg` da pasta de ícones, lidos pelo `js/icons.js`) animam no hover pelo CSS (`css/icons.css`, pelas classes de dentro do desenho: a claquete abre, a lupa procura (e um reflexo passa no vidro), a divisão da janela de templates entra pela direita, a pasta recebe os arquivos…). **a regra:** enquanto o mouse está em cima, o ícone fica diferente do normal (o movimento chega num estado e para nele, com `transition` ou `animation … forwards`); ao sair, volta. nada anima e volta sozinho com o mouse ainda em cima. parados, como no seletor, mostram o primeiro quadro. uma ferramenta nova ganha um ícone com animação. ids de máscaras e recortes levam `{u}` no arquivo (cada cópia ganha um sufixo próprio).
- **a biblioteca de ícones** (o seletor das categorias e das produções) fica em **arquivos**, na pasta `extension/client/icons/`: um `nome.svg` por ícone (o desenho, 24 x 24, com `stroke="currentColor"`) ou um `nome.json` (animação **Lottie**, que toca ao passar o mouse). a ordem e os nomes que aparecem ficam em `icons/icons.json` (`{ "key", "label" }`; um arquivo fora dele vem depois, pelo nome). no After Effects a pasta é lida direto; para o modo de teste (navegador), rode `node extension/scripts/build-icons.js` depois de mexer nos arquivos.
  - **Lottie com as cores do tema** → por padrão os traços e preenchimentos seguem a cor do texto (como os svg); para manter as cores do arquivo, ponha `"tint": false` no item do `icons.json`.
  - a chave (o nome do arquivo) é o que fica gravado na configuração: trocar o desenho de um arquivo troca em todo lugar; renomear o arquivo desfaz a escolha de quem usava a chave antiga.
  - **trocar por uma animação** → um `nome.json` (Lottie) passa à frente do `nome.svg` de mesmo nome: dá para testar uma animação sem apagar o desenho (vale para os da barra também, ex: `barra-project.json`).
  - **nome antigo** → `{ "key": "claquete", "same": "barra-project" }` no `icons.json` faz o nome antigo apontar para outro ícone (o que já foi escolhido com ele continua funcionando). assim os ícones da barra entraram no lugar das cópias que a biblioteca tinha (templates, fonte, camadas, renomear, lupa, link, claquete).
- **nada de ícone automático pelo nome**: quem escolhe é a pessoa.
- **indicadores** (bolinha do projeto, alerta da rede, selo do bonequinho) no canto de baixo à direita do ícone, pequenos, com o contorno `--badge-ring`. a cor de atenção (laranja) é `--attention`; o texto de um aviso nas dicas, `--attention-text`.
  - **a bolinha fica por dentro do ícone** → os 7 px dela cabem na caixa do ícone (24 x 24), a 1 px da borda de baixo e da direita (o canto de cima à esquerda da bolinha fica 8 px antes do canto do ícone). nunca para fora da caixa.
  - **presa ao ícone** → a bolinha anda junto com o ícone em toda animação (gaveta abrindo, barra virando): nada de posição calculada uma vez e corrigida depois, que faz a bolinha pular. na barra, o ícone fica numa caixa (`.bar-ico`) e a bolinha vai dentro dela, só com CSS.

- **parado no estado final** → onde um ícone de ferramenta aparece parado e representa o grupo (o puxador das gavetas da barra), ele mostra o estado final do hover, desenhado assim (`STILL` no `bar.js`), não o primeiro quadro: a claquete aberta, a divisão da janela de templates no lugar.

## 📍 gavetas da barra

- **o que é** → um botão que junta ferramentas (Templates: Preencher e Criar; Projeto: Criar / Alterar, Fontes e Coletar; Organização: Renomear e Organizar). o `◖` abre, no lugar do botão, um contorno fino de 1 px (`rgb(var(--on-brand) / 55%)`), sem fundo, com o puxador, o separador e as ferramentas. uma aberta por vez; fecha no puxador, no clique fora e no `Esc`.
- **forma** → raio 16, com o lado do puxador em meio círculo (metade da altura; na vertical, da largura). os de dentro ficam concêntricos: o raio menos o respiro de 3 px (2 de folga e 1 do contorno).
- **o puxador** → só o ícone do grupo, menor (17 px), parado no estado final do hover e perto do separador (a folga fica no lado redondo). no hover, vira uma seta simples no sentido de recolher (← na horizontal, ↑ na vertical) e fica assim.
- **na vertical** → abre para baixo: o puxador em cima, o separador deitado e as ferramentas em coluna.
- **fechada** → o botão do grupo mostra a pior bolinha de dentro (laranja na frente do verde), a dica só lista as ferramentas de dentro (sem "abrir a gaveta" nem texto repetido), com a bolinha laranja nas que têm pendência; o detalhe fica na dica de cada uma e o andamento (coletar, fontes) aparece nele também.
- **uma ferramenta nova numa gaveta** → um item no `GROUPS` do `bar.js` (ou um `drawer` na ferramenta); o tour abre a gaveta sozinho.

### desenhar um ícone

- **quadro** → `viewBox="0 0 24 24"`, sem `width` / `height` (quem mostra decide o tamanho: 24 px na barra, 20 px no seletor e nos campos, 16 px nos seletores e listas).
- **margem** → o desenho fica entre 2.5 e 21.5 (2.5 de folga em volta), centrado; formas largas podem ir de 2 a 22.
- **contorno** → `stroke="currentColor"`, `stroke-width="1.7"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`. a cor e a espessura de verdade vêm do CSS de cada lugar (o arquivo vale como referência, e para ver o desenho sozinho).
- **detalhes** → nada menor que 2 de vão entre traços (em 16 px o traço fica com ~1.1 px e o vão some). pontos: `M x y h.01` (um traço de comprimento zero vira uma bolinha). cantos arredondados de 1.5 a 2.5.
- **preenchido** só os arquivos (o `.aep`, os templates); o resto é contorno.
- **animado no hover** (os da barra) → classes nos grupos que o `css/icons.css` anima; o desenho parado é o primeiro quadro (é o que aparece no seletor). ids com `{u}`.

### animação Lottie

- **composição** de 24 × 24 px, 30 fps; o **primeiro quadro é o ícone parado** (é o que aparece até passar o mouse) e o último volta para ele.
- **duração** (a mesma dos ícones da barra, animados pelo CSS): **0.3 a 0.8 s**, entre 10 e 24 quadros a 30 fps. gesto simples (inclinar, subir, abrir): ~0.3 s (10 quadros); gesto com ida e volta (a claquete bate e abre): 0.6 a 0.8 s (18 a 24 quadros); só uma sequência mais longa (as letras trocando na fonte) chega a ~1.1 s. nada em loop: toca uma vez a cada vez que o mouse entra.
- **curva** → saída rápida e chegada suave (como a `--ease-soft`: `cubic-bezier(0.16, 1, 0.3, 1)`); no After Effects, um ease out forte na saída do primeiro keyframe e ease in no último.
- **só shape layers** (sem imagens, textos, efeitos nem expressions: a biblioteca usada é a `lottie_light`, que não roda expressions), contorno de **1.7** e cantos e pontas arredondados.
- **cor** → qualquer uma: com `tint` (o padrão), traços e preenchimentos seguem a cor do texto; `"tint": false` no `icons.json` mantém as cores do arquivo.
- **exportar** pelo Bodymovin (ou LottieFiles) como `.json` e salvar na pasta de ícones com o nome do ícone.

## 📍 animação: toda mudança anima

- **entradas** → o que aparece entra suave (opacidade + um leve deslocamento).
- **reordenar, mover, tirar** → o que fica desliza do lugar antigo para o novo (FLIP: mede antes, redesenha, anima a diferença). vale para as listas da configuração e as árvores do coletar e do organizar.
- **excluir** → o item some (fade) e os de baixo sobem deslizando (`collapseThen`).
- **mostrar / esconder** → expande e recolhe (altura + opacidade), nunca pula.
- **curvas e tempos** → `--ease-enter` e `--ease-soft`; 180–320 ms nos detalhes, ~600 ms só para a janela inteira.
- **na abertura** de uma janela ou aba nada anima de novo (só as mudanças).
- **hover** → sem mudar o tamanho das coisas (nada pula); só cor, sombra, um leve `translateY(-1px)` ou a animação do ícone.

## 📍 texto

- **minúsculas** no corpo das dicas e mensagens; **títulos de seção e rótulos em maiúsculas**, com espaçamento (`cfg-title`, `wz-label`, `wz-title`).
- **curto** → uma frase por dica. se precisou de um parágrafo, a tela está complicada.
- **tooltips** → só o que não está escrito na tela (um caminho cortado, o que faz um botão). sem "2 cliques", sem endereços de links.
- **nomes que a pessoa conhece** → atração, claquete, pasta de output (não "root", "relation").

## 📍 mensagens e erros

- **todo erro tem código**: no código, `#PAD_0xx - texto curto em minúsculas.` (a tabela fica no [README](../README.md#-códigos-de-erro)). um código novo entra na tabela.
- **na tela, o texto vem primeiro e o código no fim** (`PAD_UTIL.errorText`: `texto curto · PAD_0xx`): a pessoa lê o que fazer, o suporte acha o código. o texto diz o que fazer (`selecione as comps…`), não só o que deu errado.
- **o que deu certo diz o alcance**: a contagem (`3 itens renomeados`) e, se dá para desfazer, `· Cmd+Z desfaz` (`PAD_UTIL.undoKey`: Cmd+Z no Mac, Ctrl+Z no Windows; nunca Ctrl+Z fixo, que no Mac não desfaz). sem o nome da ferramenta na frase.
- **toda janela abre com o foco no primeiro campo que a pessoa vai usar** (a busca, a atração, a etiqueta livre): digitar funciona sem clicar antes.
- **o botão principal responde a `Ctrl+Enter`** (`PAD_KEYS.primary(botão)`, que também põe o atalho na dica).
- **atalhos sempre com o `Ctrl`, nos dois sistemas**: no macOS o `Cmd` costuma ficar com o After Effects e não chega ao painel. `PAD_KEYS.isMod` aceita os dois no macOS, mas os textos mostram `Ctrl` (`PAD_KEYS.modLabel`). a exceção é o desfazer: `Cmd+Z` no macOS, porque quem desfaz é o próprio After Effects.
- **o que apaga muita coisa de uma vez pede um segundo clique** (o ↻ do criador, a borracha das etiquetas): o primeiro clique marca o botão e avisa; o segundo, em até 4 s, faz.
- **na barra, o resultado vai no aviso** (`toast` do `bar.js`): a bolinha (deu certo, atenção, erro) e o texto. uma ação que pede uma decisão ganha um botão no próprio aviso (ex: `organizar assim mesmo`).
- **validação** (campo vazio, escolha faltando) também tem código e aparece na linha de status da janela, sem alert.
- **o que deu certo** aparece rápido e some sozinho.

## 📍 caminhos

- **gravados e mostrados sem o sufixo do volume** (`/Volumes/VFX`, nunca `/Volumes/VFX-1`). o volume certo (`-1` a `-5`) só entra ao abrir, criar ou montar uma pasta, no host (`padPath`, `padMountedPath`).
- **mostrar** sempre pelo `padDisplayPath` (formato do sistema atual, sem sufixo); o caminho longo corta pelo começo (`…/PROGRAMAS/DOMINGAO`).
- **antes de criar**, conferir de fato no disco (existe / nova), e dizer isso na tela.

## 📍 janelas

- **altura automática** → a janela cresce para caber a etapa (`fitHeight`) e volta ao tamanho padrão quando cabe.
- **sempre no meio da tela** → toda janela (menos a barra) abre centralizada e, ao crescer ou encolher, se centraliza de novo. mude o tamanho só pelo `PAD_BRIDGE.resizeWindow` (`bridge.js`): ele limita o tamanho à área livre da tela (menos 24 px de margem), centraliza e, se o After Effects não deixar mover a janela, encolhe a altura até a parte de baixo caber na tela.
- **a barra: horizontal e vertical, no mínimo 86 px** → o painel da barra pode ficar deitado ou em pé, e o menor lado dele tem 86 px. tudo o que é da barra (botões, bolinhas, dicas, gavetas) é testado nos dois sentidos, com 86 px: 900 × 86 e 86 × 720. as dicas ficam por cima da barra, dentro do painel (no After, nada sai dele): na horizontal, ao lado do botão (nunca por cima dele), com a altura da barra e em colunas (o nome · os cliques · os avisos, que encolhem com … se faltar lugar); na vertical, embaixo do botão (ou em cima), com a largura do painel e empilhadas. linhas de aviso começam com `! ` e saem em laranja.
- **a ação final fecha a janela** (ex: **Salvar** no editor do projeto).
- **pular é pular** → uma opção "pular" não cria nem grava nada.
- **dados só ficam se a ação der certo** → se salvar falhar, nada fica pela metade no projeto.

## 📍 foco: um contorno fino, nada cortado

- **campos** (`input`, `textarea`, lista) → no foco, só a cor do contorno muda (`--blue-500` na folha, `rgb(var(--on-brand) / 88%)` no degradê). sem anel em volta e sem linha extra.
- **botões, abas e linhas** (`:focus-visible`, só pelo teclado) → um contorno fino de 1 px a 2 px de distância (`outline: 1px solid …; outline-offset: 2px`): `--blue-500` na folha, `rgb(var(--on-brand) / 80%)` no degradê. nas linhas de uma lista que rola, o contorno fica por dentro (`box-shadow: inset 0 0 0 1px …`), senão a rolagem corta.
- **nada cortado** → o contorno do botão sai 3 px da borda. se ele fica dentro de algo que **rola ou recolhe** (`overflow` diferente de `visible`), dê ao bloco uma folga por dentro e compense na margem, para nada sair do lugar:

  ```css
  .bloco-que-rola {
    margin: -4px;  /* compensa a folga: o conteúdo fica onde estava */
    padding: 4px;  /* o contorno do foco cabe aqui dentro */
    overflow-y: auto;
  }
  ```

  veja `.org-side` (`productions.css`) e `.out-reveal` (`project.css`).
- **checagem automática** → `extension/scripts/check-focus-crop.js` abre as janelas no navegador (com o `mock-host.js`), passa pelas telas de `ui-states.js`, foca cada campo e lista os que ficam sem a folga de 3 px em volta: o campo, o bloco que corta e de que lado.

  ```bash
  node extension/scripts/check-focus-crop.js
  ```

  precisa do Playwright e sai com erro quando acha algum corte. **tela ou etapa nova** → acrescente o passo em `ui-states.js`.

## 📍 antes de enviar

- [ ] modo **claro e escuro**, com um tema de cores bem diferentes do azul padrão (ex: laranja → roxo);
- [ ] **nenhuma cor nova fixa** no CSS (procure por `#` e por `rgb(255 255 255`);
- [ ] **campos**: nenhum com ícone antes e botão dentro; lixeira fora;
- [ ] **mudanças animadas** (entrar, mover, sumir) e nada pulando no hover;
- [ ] **cantos concêntricos**: `node extension/scripts/check-corners.js` sem nenhum canto fora da conta;
- [ ] **rodapés na mesma linha**: `node extension/scripts/check-footers.js` sem nenhum botão fora;
- [ ] **sem halos** (nenhuma sombra ou anel em volta dos componentes) e **o foco aparece inteiro** ([acima](#-foco-um-contorno-fino-nada-cortado)): `node extension/scripts/check-focus-crop.js` sem nenhum corte;
- [ ] **a barra nos dois sentidos**, com 86 px (horizontal e vertical): as telas `barra: horizontal 86 px` e `barra: vertical 86 px` das checagens;
- [ ] **mensagens com código** `#PAD_`;
- [ ] **o mesmo componente** que já existe em outra janela;
- [ ] testado no navegador (`?mock=`) e, no host, código **ES3** (sem ternário encadeado).
