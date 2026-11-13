# 🥖 O PADEIRO · v2.0 beta7

🗨️ **pt-BR** ⚡ preenchimento em massa de templates e outras utilidades para o After Effects ⚡

o padeiro duplica comps, preenche os textos e cria a fila de render a partir de um projeto template. ideal para volumes grandes de "*artes iguais*" e caminhos de rede longos e confusos.

o fluxo é simples, em 3 etapas:\
`1 buscar` > `2 selecionar` > `3 preencher`

<p align="center"><img src="docs/images/anim/barra.webp" alt="a barra do padeiro: cada ferramenta anima ao passar o mouse" width="1000"></p>

> 🚩 *a versão anterior (script ScriptUI, até a v1.97) continua disponível no branch [`LEGACY`](https://github.com/jmbillard/O-PADEIRO/tree/LEGACY).*

o padeiro é uma **extensão** do After Effects: a **barra** é um painel que pode ser acoplado em qualquer lugar da interface, como os painéis nativos. cada ferramenta tem **dois cliques**: o `◖` esquerdo faz a ação principal na hora e o `◗` direito abre **as opções** dela na própria barra, sem executar nada e as tarefas maiores abrem em **janelas** próprias, cada uma com um nome de ofício (ou objeto) da padaria e dos bastidores da TV: **a turma**.

### 🧑‍🍳 a turma

| | ferramenta | `◖ clique esquerdo`: faz na hora | `◗ clique direito`: as opções |
| :---: | --- | --- | --- |
| <img src="docs/images/icons/project.png" width="40" alt="projeto"> | **Projeto** | abre **[A CLAQUETE](docs/projeto.md)**: projeto novo pela atração, ou o editor | salvar na pasta do projeto · categorias e pastas |
| <img src="docs/images/icons/templates.png" width="40" alt="templates"> | **Templates** | abre **[A FORMA](docs/templates.md)**: preencher um template e criar a fila de render | **[criar um template](docs/criador.md)** · produções |
| <img src="docs/images/icons/import.png" width="40" alt="importar"> | **Importar** | **[O VERSIONADOR](docs/versionador.md)** importa um projeto do After de qualquer versão | salvar em versão anterior |
| <img src="docs/images/icons/fonts.png" width="40" alt="fontes"> | **Fontes** | **[O TIPÓGRAFO](docs/fontes.md)** instala as fontes que faltam | ver as fontes do projeto · banco de fontes |
| <img src="docs/images/icons/rename.png" width="40" alt="renomear"> | **Renomear** | **O ETIQUETADOR** renomeia as comps selecionadas | saídas da fila de render · regras de nomes |
| <img src="docs/images/icons/organize.png" width="40" alt="organizar"> | **Organizar** | **[O CONTRARREGRA](#organizar)** organiza o projeto | etiquetas · pastas do projeto |
| <img src="docs/images/icons/collect.png" width="40" alt="coletar"> | **Coletar** | **[O CATADOR](#coletar)** coleta os arquivos na pasta do projeto | ver os arquivos · pastas da coleta |
| <img src="docs/images/icons/folders.png" width="40" alt="pastas"> | **Pastas** | **O ADAPTADOR** abre a pasta do último render | **[converter caminhos](docs/conversor.md)** Windows ⇄ macOS |
| <img src="docs/images/icons/search.png" width="40" alt="buscar"> | **Buscar** | abre **[O ACESSORISTA](docs/acessorista.md)**: busca de caminhos | textos dos layers · fontes da busca |

e mais: **[O PRODUTOR](docs/producoes.md)**, a configuração, e o **[instalador](#-instalação)**.

| janela | menu `Window` > `Extensions` | para que serve |
| --- | --- | --- |
| a barra | **O PADEIRO** | as ferramentas e os atalhos para as janelas ([abaixo](#-a-barra-principal)) |
| 📄 [A FORMA](docs/templates.md) | **Templates · A FORMA** | os templates: buscar, selecionar e preencher, e criar a fila de render |
| ✨ [A FORMA · criar](docs/criador.md) | **Criar template · A FORMA** | o criador de templates: transformar a comp aberta em um novo template |
| 🎬 [A CLAQUETE](docs/projeto.md) | **Projeto · A CLAQUETE** | o projeto: acha a pasta da atração, cria a estrutura e salva o `.aep` |
| 🔤 [O TIPÓGRAFO](docs/fontes.md) | **Fontes · O TIPÓGRAFO** | as fontes do projeto: o estado de cada uma, trocar por outra e copiar para uma pasta |
| 📦 [O CATADOR](#coletar) | **Coletar · O CATADOR** | os arquivos do projeto: coletar, coletar em outra pasta e resolver os que faltam |
| 🏷️ [O CONTRARREGRA](#organizar) | **Etiquetas · O CONTRARREGRA** | as etiquetas: comentários nos itens do projeto que o organizar entende |
| 🔎 [O ACESSORISTA](docs/acessorista.md) | **Buscar · O ACESSORISTA** | buscar caminhos de atrações e textos nos layers do projeto |
| 🔁 [O ADAPTADOR](docs/conversor.md) | **Caminhos · O ADAPTADOR** | converter caminhos entre Windows e macOS |
| 🕰️ [O VERSIONADOR](docs/versionador.md) | **Versões · O VERSIONADOR** | salvar o projeto aberto em versões mais velhas do After (até 3 para trás) |
| 🗂️ [O PRODUTOR](docs/producoes.md) | **Configuração · O PRODUTOR** | a configuração: o que é da equipe e o que é só deste computador |

no menu e no título de cada janela, **a função vem na frente e a turma depois** (`Coletar · O CATADOR`): quem procura acha pelo que a janela faz. *(os nomes do menu vêm do manifest: valem depois de rodar o instalador de novo.)*

**tamanhos das janelas** (do manifest: valem depois de rodar o instalador de novo). cada uma abre com o conteúdo inteiro à vista e não encolhe abaixo do ponto em que algo fica cortado; as que ajustam a própria altura ao conteúdo (buscar, caminhos, versões) têm o mínimo baixo.

| janela | abre com | mínimo |
| --- | --- | --- |
| a barra | 800 × 84 | 86 × 56 (o After Effects não deixa um painel mais estreito que 86) |
| Templates | 1100 × 1160 | 340 × 480 (uma coluna, com o rodapé preso) |
| Criar template | 1260 × 960 | 1150 × 820 |
| Projeto | 440 × 780 | 380 × 580 |
| Configuração | 940 × 800 | 940 × 700 |
| Fontes | 460 × 520 | 380 × 420 |
| Coletar | 460 × 620 | 380 × 440 |
| Etiquetas | 520 × 680 | 440 × 640 |
| Versões | 560 × 580 | 420 × 300 |
| Buscar | 720 × 280 | 420 × 150 |
| Caminhos | 800 × 190 | 420 × 190 |

cada janela tem a sua documentação, também aberta pelo **⋯ > ajuda / documentação** da própria janela.

### 🎨 o visual

o padrão é o fundo **neutro**: a barra e as janelas no cinza dos painéis do After Effects (a cor é lida do próprio aplicativo), com a cor de destaque só nos botões principais e no que está escolhido, para não competir com a composição. o **degradê** (o das imagens desta documentação) e o fundo sólido continuam na aba **aparência**, para quem preferir.

todas as janelas falam a mesma língua: o **degradê** à esquerda, com as listas, as abas e os campos direto nele (só um contorno fino, sem caixas nem brilhos em volta), e a **folha branca** à direita. o escolhido ganha um contorno; os cantos arredondados são concêntricos; o respiro é de 16 px em volta; e os botões do rodapé ficam na mesma linha em todas as janelas, lado a lado. claro, escuro e as cores da equipe ficam na aba **aparência** d'[O PRODUTOR](docs/producoes.md#-aparência).

<table><tr>
<td width="34%"><a href="docs/templates.md"><img src="docs/images/forninho-preencher.webp" alt="A FORMA"></a><p align="center"><b>A FORMA</b></p></td>
<td width="33%"><a href="docs/criador.md"><img src="docs/images/forma.webp" alt="A FORMA"></a><p align="center"><b>A FORMA</b></p></td>
<td width="33%"><a href="docs/producoes.md"><img src="docs/images/produtor.webp" alt="O PRODUTOR"></a><p align="center"><b>O PRODUTOR</b></p></td>
</tr></table>

> 🧭 *vai mexer nas telas? o [guia de UI](docs/guia-ui.md) tem as regras e as três checagens automáticas (cantos, rodapés e foco).*

<br>

## 📍 sumário

- [instalação](#-instalação)
- [a barra principal](#-a-barra-principal)
- [ferramentas da barra](#-ferramentas-da-barra)
- [painéis](#-painéis)
- [teclado e atalhos](#-teclado-e-atalhos)
- [códigos de erro](#-códigos-de-erro)
- [manutenção](#-manutenção)

<br>

---

<br>

## 📍 instalação

requer After Effects **2022 (22.0)** ou mais novo, no macOS ou no Windows.

1. no After Effects, acesse `File` > `Scripts` > `Run Script File...` e escolha o arquivo **`INSTALAR O PADEIRO.jsx`**, direto da **pasta do padeiro na rede** (a que tem a pasta `extension/` e o arquivo `O_PADEIRO_GLOBAL_config.json`).
2. o instalador guia o passo a passo. com tudo certo (os testes passam), ele abre direto na **ação**; '*anterior*' volta para a checagem:
   - **checagem** → confere a versão do After Effects, o acesso à rede, a pasta `extension/` e a lista de produções compartilhada. o que faltar fica marcado em vermelho (ou amarelo, se for só um aviso), com a explicação de como resolver. sem o acesso à rede, o link '*› abrir preferências de scripts e expressões*' abre a tela certa: marque a opção (veja [abaixo](#habilitando-o-acesso-à-rede)) e clique em '*› verificar de novo*'.
   - **ação** → '*instalar*' (ou '*atualizar*', se já estiver instalado) ou '*remover*'.
   - **andamento** → a barra mostra cada etapa e, no fim, o resumo.

   > 📟 *instalador (checagem):*
   >
   > <img src="docs/images/instalador.webp" alt="instalador do padeiro: checagem" width="380">
3. **reinicie** o After Effects. no macOS, se o padeiro não aparecer em `Window` > `Extensions`, reinicie o computador: a liberação de extensões sem assinatura às vezes só vale depois disso.
4. abra a barra pelo menu `Window` > `Extensions` > `O PADEIRO` e acople onde preferir. as outras ferramentas abrem em janelas, pelos botões da barra (ou pelo mesmo menu).

> 🚩 *obs:*\
> • instale sempre **a partir da pasta do padeiro na rede**: o instalador grava onde está a lista de produções compartilhada, e é ela que mantém todo mundo com a lista mais atual.\
> • o **código do padeiro fica na rede**: o computador recebe só um carregador, que abre os painéis direto da pasta do padeiro. por isso, **para atualizar, basta fechar e abrir o painel de novo** depois que os arquivos da rede forem trocados.\
> • o instalador só precisa rodar de novo quando a lista de painéis mudar (um painel novo, por exemplo). o mesmo instalador também **remove** a extensão.\
> • sem acesso à pasta do padeiro na rede, os painéis avisam e tentam de novo sozinhos.\
> • o instalador roda dentro do After Effects, então o macOS não bloqueia (como acontece com scripts abertos pelo Finder).\
> • **janelas pretas no After Effects 2025**: resolvido a partir desta versão. se ainda acontecer, rode o instalador de novo (o carregador antigo usava outro manifest).\
> • o instalador também remove a versão antiga do padeiro (o script `O PADEIRO.jsx` da pasta `Scripts/ScriptUI Panels`), que deixou de existir.

### habilitando o acesso à rede

o padeiro lê e grava arquivos na rede (templates, lista de produções, fontes). na checagem, o instalador abre sozinho a tela de preferências certa: marque '**Allow Scripts to Write Files and Access Network**' e clique em '*› verificar de novo*'.

> 📋 *a opção nas preferências de scripting:*\
> ![preferências de scripting](docs/images/ae-preferencias-scripting.png)

<br>

---

<br>

## 📍 a barra principal

<img src="docs/images/barra-vertical.webp" alt="barra vertical" width="150" align="right">

a barra se adapta ao tamanho do painel: horizontal, com os nomes embaixo dos ícones, ou vertical, com os nomes ao lado (bem estreita, só os ícones, com os links um embaixo do outro).

![barra principal, com as partes numeradas](docs/images/barra.webp)

| | | |
| :---: | --- | --- |
| ❶ | **rede / local** | **servidor**: tudo vem da rede. **servidor com alerta amarelo**: a rede caiu e o padeiro usa as cópias deste computador (modo local, até a rede voltar). **notebook**: modo local, ligado por você. `◖` abre a [configuração > rede](docs/producoes.md#-rede) (no notebook, [meu usuário](docs/producoes.md#-meu-usuário)). |
| ❷ | **links** | os links da equipe e, com um bonequinho no canto, os seus (só neste computador), com o ícone de cada site ([configuração > links](docs/producoes.md#-links)). |
| ❸ | **a turma** | as ferramentas ([tabela acima](#-a-turma)), em grupos. a ordem, os grupos e quais aparecem ficam na aba **layout** da [configuração](docs/producoes.md#-layout): cada pessoa monta a sua barra a partir de um padrão da equipe. |
| ❹ | **bolinhas** | o estado de cada uma: no **projeto**, 🟢 com os dados do padeiro, 🟠 sem; nas **fontes**, 🟠 falta alguma, 🟢 tudo certo; no **coletar**, 🟠 arquivo fora das pastas de projetos, 🟢 tudo nelas. 🟠 é sempre "falta algo": o balão do botão diz o quê. |
| ❺ | **pãozinho** | `◖` abre esta documentação; `◗` refaz o tour da barra. a versão do padeiro aparece embaixo dele. |

cada botão tem **dois cliques**:

- `◖ clique esquerdo` → a ação principal, na hora (ou a janela da ferramenta, quando ela precisa de uma).
- `◗ clique direito` → **as opções** (a gaveta): no lugar dos botões aparecem o nome da ferramenta, cada coisa que ela faz num botão com o nome por extenso (a do clique esquerdo em destaque), a configuração dela (tracejada) e o **×** para voltar. o clique direito nunca executa nada sozinho. a gaveta fecha ao escolher, no `Esc`, clicando fora ou um instante depois de o mouse sair da barra. na barra vertical, a gaveta é uma coluna da largura da barra; só abaixo de 72 px (sem lugar para os nomes) o clique direito faz direto a segunda ação.

com o mouse num botão, a linha de status mostra o nome e os dois cliques (na barra vertical ou baixa, um balão).

### primeira vez (o tour)

<p align="center"><img src="docs/images/anim/tour.webp" alt="o tour da primeira vez, na própria barra" width="1000"></p>

sem a configuração da equipe (nem na rede, nem a cópia deste computador), a barra abre um tour num balão de vidro, e as ferramentas esperam:

1. **onde fica a configuração da equipe?** → **achar na rede** (escolha o `O_PADEIRO_GLOBAL_config.json`; o caminho fica gravado, como faz o instalador) · **criar uma nova** (numa pasta da rede, com os padrões; se já houver uma lá, vale ela) · **só aqui** (modo local, com os padrões).
2. **quem é você?** → a sigla do designer (a mesma de configuração > meu usuário).
3. **a turma** → cada ferramenta acende, com o nome e o que fazem os dois cliques. experimente `◖` e `◗` na ferramenta acesa: durante o tour, os cliques só acendem a linha do clique, não rodam nada.

`◗` no pãozinho refaz o tour da turma a qualquer hora.

### trabalhando na barra

**a linha de status** → uma linha embaixo dos botões, que nunca cobre nenhum deles. três coisas aparecem nela, nesta ordem de vez:

- **o resultado da última ação**: uma bolinha (🟢 deu certo, 🟠 atenção, 🔴 erro), o texto com a contagem (`3 itens renomeados`), o botão **desfazer** quando dá para desfazer, e o × para fechar. um clique no texto abre a mensagem inteira; uma ação que pede uma decisão traz os botões na própria linha.
- **a dica do botão sob o mouse**: o nome e os dois cliques, cada um com o mousezinho (no lugar do balão, que cobria os botões vizinhos).
- **a conferência do projeto**, em repouso: o que as bolinhas sabem, por extenso (`projeto sem atração nem pasta`, `2 arquivos fora das pastas de projetos`, as fontes que faltam). clicar numa pendência leva à ferramenta dela, e com o mouse em cima o botão da ferramenta acende. sem pendências: `em ordem: projeto, fontes e arquivos`.

na **barra vertical** (acoplada na lateral, como a equipe usa: uns 86 px de largura), o resultado aparece num cartão embaixo, acima do pãozinho, com o texto quebrando por palavra; a dica é o balão ao lado do botão, e o estado continua nas bolinhas. na horizontal bem baixa (menos de 76 px), também o cartão e o balão.

**coletar com arquivos faltando** → O CATADOR avisa antes (quais faltam) e oferece '*ver a lista*' (para resolver) ou coletar o resto.

**organizar sem nada marcado** → sem nenhuma comp selecionada nem com comentário, O CONTRARREGRA avisa antes (nada iria para as comps de render) e oferece '*organizar assim mesmo*'.

**a ordem padrão** segue o ciclo do projeto: **começar** (projeto, templates, importar) · **arrumar** (fontes, renomear, organizar) · **entregar** (coletar, pastas) · **achar** (buscar). cada pessoa continua montando a sua na aba [layout](docs/producoes.md#-layout).

<p align="center"><img src="docs/images/anim/progresso.webp" alt="O CATADOR coletando: a contagem e a linha embaixo do botão" width="760"></p>

**O CATADOR** (coletar) e **O TIPÓGRAFO** (fontes) mostram o andamento no próprio botão: o nome vira a contagem (`5/12`), uma linha fina enche embaixo e o ícone repete a animação; no fim, um brilho verde. o coletar vai arquivo por arquivo (o After Effects fica livre entre um e outro); as fontes contam as etapas do resolver (projeto → banco → conferindo) e o envio ao banco em segundo plano.

<br clear="right">

> 🚩 *obs:*\
> • a versão do padeiro aparece embaixo do pãozinho.\
> • a produção é o título da lista no painel de templates (clique nela para trocar) e vale para todos os painéis, que acompanham a troca na hora.

<br>

---

<br>

## 📍 ferramentas da barra

> 🚩 *nas seções abaixo, o que aparece em `◗ clique direito` é a opção de mesmo nome na gaveta da ferramenta (o clique direito abre as opções; um clique nela faz o que está descrito).*

### fontes

as fontes de cada projeto aberto vão sozinhas para o [banco de fontes](docs/fontes.md) na rede e para a pasta de fontes do projeto. a bolinha no botão: 🟠 laranja quando falta algo, 🟢 verde quando está tudo certo.

`◖ clique esquerdo` → resolver: com tudo instalado, só avisa que está ok; faltando alguma, instala primeiro da pasta de fontes do projeto e depois do banco; a que não for achada abre O TIPÓGRAFO.

`◗ clique direito` → **O TIPÓGRAFO**, a janela de [fontes do projeto](docs/fontes.md#-fontes-do-projeto-janela): o estado de cada fonte, a troca por outra (com busca e prévia) e copiar as fontes para uma pasta.

### coletar

a bolinha no botão: 🟠 laranja quando o projeto tem algum arquivo fora das pastas de projetos ([configuração > projeto](docs/producoes.md): o começo fixo do caminho de cada categoria, como `…/PROGRAMAS`; `VFX-1` … `VFX-5` valem como `VFX`; no Windows, `L:\…` vale como o caminho de rede da letra no [mapa de drives](docs/producoes.md), e o nome do servidor, curto ou completo, não importa), 🟢 verde quando está tudo nelas. sem categorias na configuração, vale estar na rede.

enquanto trabalha, o nome do botão vira a contagem (`5/12`), uma linha fina enche embaixo dele e o ícone repete a animação; no fim, um brilho verde. o mesmo vale para as **fontes**: ao resolver (projeto → banco → conferindo) e ao enviar as fontes ao banco em segundo plano.

`◖ clique esquerdo` → **O CATADOR** copia os arquivos usados no projeto para a estrutura do projeto, na árvore de pastas da [configuração > coletar](docs/producoes.md#-coletar) (padrão: `01_PROJETOS` com o `.aep`, `02_ARQUIVOS` com FONTS, IMAGENS, VÍDEOS, AUDIOS e DADOS, `03_SAIDA` com PREVIEWS e `04_REFS`), e troca os caminhos no projeto para as cópias. a raiz é a pasta de cima da `01_PROJETOS` (ou a pasta do `.aep`, se ele não estiver nela). depois, salva o projeto, sempre.

- cada tipo (vídeos, sequências de imagens, imagens, áudio, dados e fontes) vai para a sua pasta; tipos fora da árvore não são coletados.
- **sequências de imagens** são copiadas inteiras (os quadros do trecho usado), cada uma numa subpasta com o nome dela; a interpretação (fps, alpha) é mantida.
- arquivos que já estão na pasta do projeto ficam como estão: coletar de novo só copia o que é novo.

`◗ clique direito` → **O CATADOR**, a janela do coletar: uma linha por arquivo do projeto, com a miniatura (a imagem ou o primeiro quadro; áudio e dados com o ícone do tipo), o tipo, em quantas comps aparece e a pasta. clicar numa linha mostra o item no painel Project.

<table><tr><td width="56%"><img src="docs/images/catador.webp" alt="O CATADOR, com as partes numeradas"></td><td><img src="docs/images/anim/catador.webp" alt="O CATADOR resolvendo um arquivo que falta e coletando"></td></tr></table>

| | | |
| :---: | --- | --- |
| ❶ | **o projeto** | o `.aep`, quantos arquivos e quantos estão fora do lugar. |
| ❷ | **✕ faltando** | o arquivo não existe (ou está num volume desmontado: o ❼ resolve). |
| ❸ | **↑ amarela** | fora das pastas de projetos (ex: a Área de Trabalho): o coletar leva para a pasta do projeto. |
| ❹ | **↑ azul** | nas pastas de projetos, mas fora da pasta deste projeto: o coletar copia. |
| ❺ | **✓** | já está na pasta do projeto. (**–** cinza: tipo fora da árvore do coletar.) |
| ❻ | **outra pasta** | coleta numa pasta escolhida. |
| ❼ | **resolver os que faltam** | procura cada arquivo faltando no volume certo (`VFX`, `VFX-1` … `VFX-5`), monta o share se precisar e relinka (desfaz com um `Cmd+Z` no macOS, `Ctrl+Z` no Windows). |
| ❽ | **Coletar** | copia o que falta para a estrutura do projeto; as setas sobem enquanto copia. o **⋯** abre a pasta do projeto. |

> 🚩 *obs:*\
> • o projeto precisa estar salvo (os arquivos vão para a pasta dele), ou use o clique direito.\
> • arquivos ausentes e fontes sem arquivo local (ex: Adobe Fonts) não são coletados: o padeiro avisa quais.

### importar

**O VERSIONADOR** ([a página dele](docs/versionador.md)):

`◖ clique esquerdo` → escolha um projeto do After (`.aep` ou `.aet`) e ele é importado no projeto aberto, **de qualquer versão**: o de versão mais nova (ex.: salvo no 2026 e você está no 2025) vira antes uma cópia na versão que está rodando, na pasta temporária. a pasta que a importação cria leva o nome do arquivo original.

`◗ clique direito` → abre a janela **O VERSIONADOR**: salva o projeto aberto em até 3 versões mais velhas do After (`nome_AE24.aep`, `nome_AE23.aep`…), na pasta do projeto ou em outra.

- a conversão troca só o número da versão no cabeçalho do arquivo (como o [AEP-Downgrader](https://github.com/itsAnchorpoint/AEP-Downgrader) e o [AESHIFT](https://github.com/mason-reed24/aeshift-after-effects-tool)): efeitos, expressões e recursos que só existem na versão nova podem faltar ou dar aviso. **confira antes de usar em produção**.
- o original nunca é alterado.

### pastas

`◖ clique esquerdo` → abre a pasta do primeiro arquivo de saída do último item da fila de render. se a pasta ainda não existir (antes do render), abre a mais próxima que existe.

`◗ clique direito` → abre o [conversor de caminhos](docs/conversor.md).

### renomear

**O ETIQUETADOR**: dá a cada comp e a cada saída de render o nome no padrão da equipe.

`◖ clique esquerdo` → renomeia as comps selecionadas no painel de projeto: remove caracteres especiais, passa para MAIÚSCULAS e acrescenta o prefixo do tipo (rodapé, cartão, lettering...).

*o tipo vem do nome da pasta em que a comp está (ex: `RODAPES`, `LETTERING - JOGO`) ou de um prefixo / sufixo já presente no nome da comp. o nome da pasta tem prioridade.*

`◗ clique direito` → aplica a mesma regra aos arquivos de saída de **todos** os itens da fila de render (o nome das comps não muda).

> 🚩 *obs:*\
> • com uma pasta do projeto selecionada, a pasta e todas as comps dentro dela são renomeadas.\
> • cada saída continua na pasta em que estava; itens já renderizados não mudam e nomes repetidos na mesma pasta ganham um sufixo (`_2`, `_3`...).\
> • comps com o layer de texto `script_template_name` (último layer) recebem o nome definido nesse layer ([como usar](docs/templates.md#o-nome-da-comp-pelo-layer-script_template_name)).

**prefixos e termos reconhecidos** (no singular ou plural, com ou sem acento, como palavras inteiras):

| prefixo | termos |
| --- | --- |
| **RDP** | RODAPE, RDP |
| **CRT** | CARTAO, CARTOES, CRT |
| **LETT** | LETTERING, LETT, LET |
| **CONFRONTO** | CONFRONTO |
| **TARJA** | TARJA, TRJ, TAR |
| **PASSAGEM** | PASSAGEM, TRANSICAO, TRANSICOES, LAPADA |
| **ASSINA** | ASSINATURA, ASSINA, ASS |
| **FOTO** | FOTO, IMG, IMAGEM, IMAGENS |
| **REF** | REFERENCIA, PREVIEW, REF, PREV |

### organizar

**O CONTRARREGRA**: deixa cada coisa do projeto no lugar certo, como o contrarregra antes de gravar.

`◖ clique esquerdo` → organiza o projeto no modelo da PROMO.

> 🚩 *obs:*\
> • **selecione antes as comps principais** (as que serão renderizadas): elas recebem o comentário 'EXPORTAR' e vão para '01 COMPS'.\
> • com uma pasta para as **comps editáveis** na árvore (configuração), comps com 'EDIT' no comentário vão para ela.\
> • comps com comentário 'EXPORTAR', 'TEMPLATE' ou 'LOGO GLOBO' também vão para '01 COMPS'; as com o comentário de um tipo reconhecido (ex: 'RODAPE', dado pelo renomear) vão para uma subpasta com esse nome.\
> • as demais comps vão para '02 PRECOMPS' (em subpastas pelo comentário, se houver).\
> • footages vão para '03 ARQUIVOS' (VIDEOS, IMAGENS, AUDIO, SOLIDOS, DADOS) e arquivos ausentes para 'MISSING'. o texto do comentário antes de ':' vira subpasta.\
> • pastas que ficarem vazias são removidas.

`◗ clique direito` → abre **O CONTRARREGRA**: as **etiquetas**, comentários nos itens selecionados no painel Project que o organizar entende.

- **render** (EXPORTAR, TEMPLATE, LOGO GLOBO) e **editáveis** (EDIT): os comentários da configuração > organizar.
- **tipo de peça** (RODAPE, CARTAO, LETTERING...): os tipos do **O ETIQUETADOR**; a comp vai para uma subpasta com o tipo.
- **arquivos** (FUNDO, LOGO, FOTO, TRILHA, LOC): o comentário do footage vira subpasta; a lista é da equipe (configuração > organizar > etiquetas dos arquivos).

`◖` numa etiqueta aplica nos selecionados e `◗` limpa o comentário deles; o número ao lado diz quantos itens do projeto já têm a etiqueta. o campo de cima aplica um texto livre (`Enter`; vazio limpa). no rodapé, a **vassourinha** limpa o comentário de todos os itens do projeto e **Organizar** organiza (o mesmo que o `◖`). tudo desfaz com `Ctrl/Cmd+Z`.

> ![estrutura do projeto](docs/images/ae-estrutura-projeto.png)

<br>

---

<br>

## 📍 painéis

| | |
| --- | --- |
| [🧩 instalação](#-instalação) | o instalador: checagem, instalar / atualizar e remover |
| [📄 A FORMA](docs/templates.md) | templates: buscar, fixados e recentes, preview, fontes, input, fila de render e editor de config |
| [✨ A FORMA](docs/criador.md) | criar template: formulário, nomenclatura, layers editáveis e arquivo de configuração |
| [🔤 O TIPÓGRAFO](docs/fontes.md) | fontes: banco de fontes, o botão fontes e a janela de fontes do projeto |
| [🎬 A CLAQUETE](docs/projeto.md) | projeto: projeto novo pela atração, estrutura de pastas e editor |
| [🗂️ O PRODUTOR](docs/producoes.md) | configuração: produções, links da barra, logs, drives da rede, renomear, organizar, coletar, busca, projeto e aparência (compartilhados pela equipe) |
| [📦 O CATADOR](#coletar) | coletar: os arquivos do projeto, outra pasta e os que faltam |
| [🔎 O ACESSORISTA](docs/acessorista.md) | busca de caminhos e busca nos textos do projeto |
| [🔁 O ADAPTADOR](docs/conversor.md) | conversor: caminhos Windows / macOS |
| [🧭 guia de UI](docs/guia-ui.md) | as regras para criar e mexer nas janelas: cores do tema, cantos, campos, ícones, animações, mensagens |

<br>

---

<br>

## 📍 teclado e atalhos

o mesmo vocabulário em todos os painéis:

| tecla | o que faz |
| --- | --- |
| `↑` `↓` | andam nas listas. `↓` na busca vai para o primeiro item; `↑` no primeiro volta para a busca |
| `Enter` | abre / seleciona. nos templates, seleciona e leva para o input |
| `Esc` | limpa a busca ou volta um passo |
| `Ctrl/Cmd+F` | foca a busca do painel |
| `Ctrl/Cmd+S` | salva (produções, criador de templates) |
| `Ctrl/Cmd+Enter` | preenche (templates) |
| `Cmd+Z` / `Cmd+Shift+Z` (macOS) · `Ctrl+Z` / `Ctrl+Shift+Z` (Windows) | num campo de texto, desfaz / refaz o texto; fora dele, com o foco em qualquer janela do padeiro, desfaz / refaz **no After Effects** (o atalho é repassado) |
| `Ctrl/Cmd+C` | copia o caminho ou o texto do resultado em foco (O ACESSORISTA) |

- **barra** → `←` `→` andam pelos botões; `Enter` faz a ação do clique esquerdo e `Shift+Enter` abre as opções (`Esc` volta).
- **listas suspensas** → com a lista aberta, digite para filtrar (útil com muitas produções).

os atalhos de cada painel estão na documentação dele.

<br>

---

<br>

## 📍 códigos de erro

todo erro do padeiro tem um código `PAD_`, que aparece **no fim** da mensagem (`selecione as comps ou pastas que serão renomeadas · PAD_032`): primeiro o que fazer, depois o código. o aviso pode ser fechado no ×. use o código para achar a causa:

| código | o que aconteceu |
| --- | --- |
| `#PAD_003` `#PAD_004` `#PAD_007` `#PAD_012` `#PAD_PATH_003` | sem acesso à rede: habilite '*Allow Scripts to Write Files and Access Network*' |
| `#PAD_005` | o projeto não foi preenchido pelo padeiro (instalar fontes depende disso) |
| `#PAD_006` `#PAD_035` | a pasta `FONTS` do template não existe ou não tem `.ttf` / `.otf` |
| `#PAD_008` | a fila de render está vazia |
| `#PAD_009` `#PAD_019` `#PAD_062` | pasta de output (ou caminho) não encontrada |
| `#PAD_017` | o `_config.json` do template é inválido |
| `#PAD_018` `#PAD_022` | o arquivo do template não foi encontrado |
| `#PAD_021` | um layer editável da config não existe no template |
| `#PAD_023` `#PAD_025` `#PAD_026` `#PAD_028` `#PAD_031` `#PAD_063` | criador de templates: comp principal ou layers editáveis faltando |
| `#PAD_027` | criador de templates: o teste de preenchimento falhou |
| `#PAD_029` | criador de templates: falta a atração ou o que é |
| `#PAD_032` `#PAD_033` | renomear: nada selecionado / saídas que não puderam ser renomeadas |
| `#PAD_034` | algumas fontes não puderam ser copiadas (ex: Adobe Fonts) |
| `#PAD_036` | organizar: erro ao organizar o projeto |
| `#PAD_043` | o painel pediu uma ação que o host não conhece (painel e host de versões diferentes: reabra o painel) |
| `#PAD_044` `#PAD_045` | editor de config: dado inválido / não foi possível gravar o arquivo |
| `#PAD_046` | o input está vazio |
| `#PAD_047` `#PAD_048` `#PAD_049` | preenchimento / fila de render fora de ordem (comece de novo) |
| `#PAD_050` | o projeto está vazio |
| `#PAD_051` a `#PAD_057` | lista de produções: dado inválido, falha ao gravar ou arquivo de importação inválido |
| `#PAD_058` | não foi possível baixar o índice de caminhos do acessorista |
| `#PAD_059` `#PAD_060` `#PAD_069` | busca de textos: a comp ou o layer não existe mais (atualize a busca) |
| `#PAD_061` | conversor: nenhum caminho informado |
| `#PAD_064` | a lista de produções compartilhada (na rede) não está acessível |
| `#PAD_065` | outra pessoa salvou a lista de produções depois que você abriu o editor |
| `#PAD_066` `#PAD_067` `#PAD_068` | o painel não conseguiu carregar o padeiro da rede |
| `#PAD_070` `#PAD_071` `#PAD_072` `#PAD_PATH_001` `#PAD_PATH_002` | caminho de rede inválido, volume não montado ou pasta inacessível |
| `#PAD_073` `#PAD_074` | banco de fontes: trocar fontes sem o After Effects 2024 / nenhum arquivo para instalar ou banco sem pasta |
| `#PAD_075` | criador: a fila de render já está renderizando (preview .mp4) |
| `#PAD_076` | criador: nenhum template de output H.264 para o preview .mp4 |
| `#PAD_077` | criador: o preview .mp4 não foi gerado |
| `#PAD_078` | configuração: endereço do webhook do log inválido (vazio, sem http(s):// ou com espaços/aspas) |
| `#PAD_079` | configuração: letra de drive inválida ou repetida |
| `#PAD_080` | configuração: o caminho do drive não é de rede (`//servidor/share/...`) |
| `#PAD_081` | configuração: volume sem nome, repetido ou sem servidor |
| `#PAD_082` | configuração: tipo de renomear sem prefixo, comentário ou termos, prefixo repetido ou separador inválido |
| `#PAD_083` | configuração: nome fixo sem o termo ou sem o nome |
| `#PAD_084` | configuração: árvore de pastas do organizar inválida (nome vazio ou repetido, pasta pai inexistente, ciclo ou conteúdo em duas pastas) |
| `#PAD_085` | configuração: comentários de render vazios ou comentário automático fora deles |
| `#PAD_086` | configuração: endereço do webhook da busca inválido ou arquivo de índice não escolhido |
| `#PAD_087` | configuração: link sem nome ou com endereço inválido |
| `#PAD_088` | configuração: cor da aparência inválida (use `#rrggbb`) |
| `#PAD_089` | configuração > projeto: categoria sem nome ou sem caminho, repetida, com token desconhecido ou sem `{atracao}` |
| `#PAD_090` | projeto: sem atração, sem título do filme ou sem ID e nome |
| `#PAD_091` | projeto: sem pasta de destino, projeto ainda não salvo, nome do arquivo vazio ou pasta que não pôde ser criada |
| `#PAD_092` | projeto: já existe um `.aep` com esse nome na pasta |
| `#PAD_093` | coletar: itens que não puderam ser coletados (sem permissão, arquivo ausente) |
| `#PAD_094` | configuração: árvore do coletar inválida (nome vazio, repetido ou com `\ / : * ? " < > \|`, pasta pai inexistente, ciclo, tipo em duas pastas) ou sem nenhum tipo |
| `#PAD_095` | coletar: projeto não salvo (use o clique direito para escolher a pasta) |
| `#PAD_096` | modo local (ligado ou sem a rede): sem cópia da configuração neste computador, ou tentativa de editar a configuração da equipe |
| `#PAD_097` | criador de templates: variações de layout (nenhum efeito de menu selecionado, sufixo vazio ou repetido, layer do efeito removido) |
| `#PAD_098` | produção local (configuração > templates, neste computador): sem nome ou sem pasta, ou com o nome de uma produção da equipe |
| `#PAD_100` | importar / versionador: o arquivo não é um projeto do After (`.aep` / `.aet`), a versão não pôde ser lida ou o painel está sem acesso aos arquivos |
| `#PAD_102` | versionador: projeto nunca salvo, sem pasta ou pasta que não existe |
| `#PAD_103` | etiquetas: nada selecionado no painel Project, ou só pastas |
| `#PAD_101` | primeira vez (tour): o arquivo escolhido não é a configuração da equipe, não é um JSON válido, ou a pasta não aceita gravar |
| `#PAD_099` | erro inesperado: anote a mensagem e avise a equipe |

<br>

---

<br>

## 📍 manutenção

o código da extensão, a estrutura dos arquivos, como testar sem o After Effects e onde ficam as configurações mais comuns estão em [`extension/README.md`](extension/README.md).
