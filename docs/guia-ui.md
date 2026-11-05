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
- **sobre o degradê (e o vidro em cima dele)**, texto, ícones, vidros, contornos e brilhos usam `--on-brand`: `rgb(var(--on-brand))` ou `rgb(var(--on-brand) / 20%)`. é branco no claro e preto no escuro. nunca `white` nem `rgb(255 255 255 / …)`.
- **o modo escuro é o inverso do claro sobre o degradê**: o vidro, o texto e os ícones ficam pretos, e o item escolhido vira uma pílula escura. nunca coloque uma superfície escura sobre o vidro claro.
- **pílula do item escolhido** (aba, template, arquivo do CRIAR): fundo `--surface` (ou `--on-brand`), texto e ícone na cor de destaque (`--blue-500`), a mesma dos ícones dos cartões.
- **o brilho dos botões de destaque é sempre claro**: a sombra colorida usa `--button-glow-rgb` (no claro, o fim do degradê; no escuro, a cor clara do brilho, `--glow-rgb`). nunca `--accent-deep-rgb` direto numa sombra de botão: no escuro, ela some no fundo.
- **as únicas cores fixas permitidas** são as que têm significado: sucesso (verde), espera (amarelo), erro (vermelho), o alerta da rede, a bolinha do projeto (verde / laranja), o pãozinho da logo e as amostras de cor da aba APARÊNCIA. contorno dos indicadores: `--badge-ring` (branco no claro, cinza escuro no escuro).
- **o tom de "em andamento"** (`--processing`) é o destaque do tema.

## 📍 formas: cantos concêntricos e centros alinhados

- **raios** pelos tokens: `--radius-small` (12), `--radius-medium` (16), `--radius-large` (22), `--radius-shell` (32), `--radius-pill`.
- **cantos concêntricos** → um elemento arredondado dentro de outro tem o raio de fora = raio de dentro + respiro + borda. deixe a conta no comentário do CSS (ex: `/* concêntrico: raio dos campos + respiro (8) + borda (1) */`).
- **botão redondo num canto arredondado** → o centro do botão fica no centro do arco do canto: raio do canto = distância do botão até a borda + raio do botão (ex: botões de 38 px a 15 px da borda → canto de 34 px).
- **rodapés** → o centro dos botões fica sempre a `--footer-center` do fundo da janela, em todas as janelas (os botões se alinham entre janelas lado a lado).

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
- **ícones das ferramentas** (os `barra-<nome>.svg` da pasta de ícones, lidos pelo `js/icons.js`) animam no hover pelo CSS (`css/icons.css`, pelas classes de dentro do desenho: a claquete bate, a lupa mostra a letra, a pasta recebe os arquivos…); parados, como no seletor, mostram o primeiro quadro. uma ferramenta nova ganha um ícone com animação. ids de máscaras e recortes levam `{u}` no arquivo (cada cópia ganha um sufixo próprio).
- **a biblioteca de ícones** (o seletor das categorias e das produções) fica em **arquivos**, na pasta `extension/client/icons/`: um `nome.svg` por ícone (o desenho, 24 x 24, com `stroke="currentColor"`) ou um `nome.json` (animação **Lottie**, que toca ao passar o mouse). a ordem e os nomes que aparecem ficam em `icons/icons.json` (`{ "key", "label" }`; um arquivo fora dele vem depois, pelo nome). no After Effects a pasta é lida direto; para o modo de teste (navegador), rode `node extension/scripts/build-icons.js` depois de mexer nos arquivos.
  - **Lottie com as cores do tema** → por padrão os traços e preenchimentos seguem a cor do texto (como os svg); para manter as cores do arquivo, ponha `"tint": false` no item do `icons.json`.
  - a chave (o nome do arquivo) é o que fica gravado na configuração: trocar o desenho de um arquivo troca em todo lugar; renomear o arquivo desfaz a escolha de quem usava a chave antiga.
  - **trocar por uma animação** → um `nome.json` (Lottie) passa à frente do `nome.svg` de mesmo nome: dá para testar uma animação sem apagar o desenho (vale para os da barra também, ex: `barra-project.json`).
  - **nome antigo** → `{ "key": "claquete", "same": "barra-project" }` no `icons.json` faz o nome antigo apontar para outro ícone (o que já foi escolhido com ele continua funcionando). assim os ícones da barra entraram no lugar das cópias que a biblioteca tinha (templates, fonte, camadas, renomear, lupa, link, claquete).
- **nada de ícone automático pelo nome**: quem escolhe é a pessoa.
- **indicadores** (bolinha do projeto, alerta da rede, selo do bonequinho) no canto de baixo à direita do ícone, pequenos, com o contorno `--badge-ring`.

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

- **todo erro tem código**: `#PAD_0xx - texto curto em minúsculas.` (a tabela fica no [README](../README.md#-códigos-de-erro)). um código novo entra na tabela.
- **validação** (campo vazio, escolha faltando) também tem código e aparece na linha de status da janela, sem alert.
- **o que deu certo** aparece rápido e some sozinho.

## 📍 caminhos

- **gravados e mostrados sem o sufixo do volume** (`/Volumes/VFX`, nunca `/Volumes/VFX-1`). o volume certo (`-1` a `-5`) só entra ao abrir, criar ou montar uma pasta, no host (`padPath`, `padMountedPath`).
- **mostrar** sempre pelo `padDisplayPath` (formato do sistema atual, sem sufixo); o caminho longo corta pelo começo (`…/PROGRAMAS/DOMINGAO`).
- **antes de criar**, conferir de fato no disco (existe / nova), e dizer isso na tela.

## 📍 janelas

- **altura automática** → a janela cresce para caber a etapa (`fitHeight`) e volta ao tamanho padrão quando cabe.
- **a ação final fecha a janela** (ex: **Salvar** no editor do projeto).
- **pular é pular** → uma opção "pular" não cria nem grava nada.
- **dados só ficam se a ação der certo** → se salvar falhar, nada fica pela metade no projeto.

## 📍 brilho do foco: nada cortado

o campo com foco ganha um brilho de **4 px em volta** (`.cfg-input:focus`, em `panel.css`). se o campo fica dentro de algo que **rola ou recolhe** (`overflow` diferente de `visible`: listas com rolagem, colunas, blocos que abrem animados), o brilho é cortado na borda desse bloco, mais visível na **primeira linha** das listas e nos campos de largura total.

- **como resolver** → dê ao bloco que corta 4 px de folga por dentro e compense na margem, para nada sair do lugar:

  ```css
  .bloco-que-rola {
    margin: -4px;  /* compensa a folga: o conteúdo fica onde estava */
    padding: 4px;  /* o brilho cabe aqui dentro */
    overflow-y: auto;
  }
  ```

  num bloco que abre e fecha animado, a folga entra na margem dos dois estados (fechado e aberto). veja `.org-side` (`productions.css`) e `.out-reveal` (`project.css`).
- **checagem automática** → `extension/scripts/check-focus-crop.js` abre as janelas no navegador (com o `mock-host.js`), passa pelas etapas principais (o criador com a pasta de mídias, as etapas da janela projeto, o editor de config, as abas da configuração…), foca cada campo e lista os que têm o brilho cortado: o campo, o bloco que corta e de que lado.

  ```bash
  node extension/scripts/check-focus-crop.js
  ```

  precisa do Playwright. as transições ficam desligadas (o brilho é medido no tamanho final) e o script sai com erro quando acha algum corte.
- **tela ou etapa nova** → acrescente o passo para chegar nela na lista `CHECKS` do script. ele não vê o que só aparece depois de uma ação que não está nos passos (ex: uma linha nova).
- **corte só durante a animação** (o bloco abrindo, com `overflow: hidden` do `motion.js`) é aceitável: no fim da animação o brilho aparece inteiro.

## 📍 antes de enviar

- [ ] modo **claro e escuro**, com um tema de cores bem diferentes do azul padrão (ex: laranja → roxo);
- [ ] **nenhuma cor nova fixa** no CSS (procure por `#` e por `rgb(255 255 255`);
- [ ] **campos**: nenhum com ícone antes e botão dentro; lixeira fora;
- [ ] **mudanças animadas** (entrar, mover, sumir) e nada pulando no hover;
- [ ] **o brilho do foco aparece inteiro** em todos os campos ([acima](#-brilho-do-foco-nada-cortado)): `node extension/scripts/check-focus-crop.js` sem nenhum corte;
- [ ] **mensagens com código** `#PAD_`;
- [ ] **o mesmo componente** que já existe em outra janela;
- [ ] testado no navegador (`?mock=`) e, no host, código **ES3** (sem ternário encadeado).
