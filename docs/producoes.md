# 🗂️ configuração

[← O PADEIRO](../README.md)

a janela **O PADEIRO configuração** (`⋯` → '*Configuração*', no painel de templates) tem as abas num cartão de vidro à esquerda, como a lista do painel de templates, com recarregar, salvar (disquete) e o `⋯` no rodapé dele.

as abas ficam em três grupos, separados por uma linha:

| grupo | abas |
| --- | --- |
| **links** | links (o primeiro, como na barra) |
| **ferramentas** | templates, projeto, coletar, renomear, organizar, buscar |
| **o resto** | rede, aparência, layout, meu usuário |

**onde cada coisa é salva** → as ferramentas, os links e a rede são da 🌐 **equipe** (no `O_PADEIRO_config.json` da rede: vale para todo mundo). aparência, layout e meu usuário são 👤 **locais** (na pasta de dados do usuário, neste computador: não muda nada para os outros).

**👤 neste computador** → numa aba da equipe, as opções que são só suas ficam embaixo de uma linha com o bonequinho e **NESTE COMPUTADOR**:

| aba | neste computador |
| --- | --- |
| templates | produções locais · pasta de saída |
| projeto | pasta dos projetos |
| buscar | de onde vêm os caminhos (webhook ou índice local) |
| links | meus links |

uma faixa no topo de cada aba repete onde ela é salva (🌐 *equipe · salvo na rede · embaixo, neste computador* ou 👤 *local · salvo neste computador*).

**padrão da equipe** → a aparência e o layout têm um padrão da equipe, na rede: é o que aparece para quem não personalizou. nas abas **aparência** e **layout**, a faixa diz '*usando o padrão da equipe*' até a primeira mudança; depois, '*personalizado*', com o botão '*voltar ao padrão da equipe*'. para mudar o padrão da equipe, use **⋯ > editar o padrão da equipe**: as duas abas passam a editar o da rede (a faixa fica azul) até '*voltar às minhas preferências*'.

> 🚩 *atalho:* `◖ clique DUPLO` numa ferramenta da barra abre esta janela já na aba dela (templates e fontes → templates, pastas → rede, renomear, organizar, projeto → projeto, coletar → coletar, buscar, links → links). é tudo gravado pelo **disquete** (no rodapé do cartão das abas) ou `Ctrl/Cmd+S`; um ponto amarelo no disquete (e o aviso '*alterações não salvas*', no topo à direita) avisa que há alterações não salvas. o disquete grava tudo de uma vez: o que é da equipe na rede e o que é local neste computador (o aviso diz o que foi para onde).

## 📍 templates

a aba **templates** é a lista de produções. uma **produção** é uma pasta que contém (ou vai conter) templates do padeiro, organizados em subpastas como a equipe preferir.

a lista de produções é **uma só para a equipe**: o arquivo `O_PADEIRO_config.json`, na pasta do padeiro na rede. quando alguém muda a lista, os painéis de todo mundo atualizam sozinhos.

> 📟 *aba templates*:
>
> ![editor de produções](images/producoes.webp)

1. clique em '*+ nova produção*'.
2. escolha um ícone (opcional), digite o nome e escolha a pasta de templates pelo ícone de pasta dentro do campo (o ponto à esquerda do caminho fica verde quando a pasta existe). o **×** no mesmo campo exclui a produção.
3. clique no **disquete** (ou `Ctrl/Cmd+S`).

- **reordenar** → arraste uma produção pelos pontinhos à esquerda (`↑` `↓` com o puxador em foco também movem).
- **buscar** (a barra no topo da aba) → mostra só as produções com o termo no nome ou no caminho.
- **importar / exportar** (os botões com setas, ao lado da busca) → lê ou grava uma lista completa, com os ícones.
- **recarregar** → lê a configuração de novo, descartando o que não foi salvo.
- **⋯** → ajuda (esta página) e recarregar o painel.

> 🚩 *obs:*\
> • a ordem da lista é a do seletor de produção (no rodapé do painel de templates): arraste pelos pontinhos à esquerda de cada produção para reordenar (com o filtro ativo, o arraste fica escondido).\
> • o caminho do arquivo da lista aparece no fim da lista de produções.\
> • o ícone tem **24 x 24 pixels**: imagens maiores são cortadas no centro e reduzidas.\
> • se outra pessoa salvou a lista depois que você abriu o editor, o padeiro **não** sobrescreve o trabalho dela: recarregue e refaça as alterações. uma cópia da lista anterior fica em `O_PADEIRO_config.bak.json`.\
> • sem acesso ao arquivo compartilhado (rede fora), não há lista: os painéis avisam e voltam a ler sozinhos quando a rede voltar.

**👤 neste computador** (embaixo, só suas):

- **produções locais** → produções **só suas**, com pastas deste computador, independentes das da equipe (nada é copiado da rede). cada linha tem o nome e a pasta (a pastinha escolhe, o **×** tira; os pontinhos reordenam); '*+ nova produção local*' acrescenta. aparecem no seletor de produção do painel de templates depois das da equipe, no grupo **neste computador**, com o bonequinho. o nome não pode repetir o de uma produção da equipe.
  > 🚩 *obs:* produções da equipe com caminho deste computador (`~/...`, `/Users/...`, `C:\...` ou uma letra fora do mapa de drives) são **ignoradas**: não aparecem para ninguém (na lista da equipe, ficam riscadas). quem tinha escolhido uma pasta para elas ganhou uma produção local com essa pasta.
- **pasta de saída** → para onde vão os renders da fila quando a pasta de output do template não pode ser acessada. vazia, a Área de Trabalho.
<br>

---

<br>

## 📍 projeto

a aba **projeto** define as **categorias** da atração nova: a lista **dentro de** da [janela PROJETO](projeto.md) (etapa NOVA).

- **categorias** → cada categoria num cartão:
  - **NOME** → o nome, com o **ícone** dentro do campo (clique para trocar); a **lixeira**, fora do campo, exclui a categoria;
  - **PROJETO** → o caminho da pasta da atração nova, com tokens;
  - **OUTPUT** → o caminho da pasta de output dela, com tokens (opcional: sem ele, a etapa CRIAR não propõe a pasta de output).

  embaixo de cada caminho, a prévia; a pastinha escolhe a pasta da categoria (o `/{atracao}` entra no fim). os pontinhos reordenam (a ordem é a do dentro de).
- **tokens** → clique num token para pôr no caminho em foco (onde está o cursor):

  | token | vira |
  | --- | --- |
  | `{atracao}` | o nome da atração nova (obrigatório), sem acentos, em maiúsculas |
  | `{ano}` | o ano atual (`2026`) |
  | `{mes}` | o mês atual (`01` a `12`) |
  | `{categoria}` | o nome da categoria |
  | `{letra}` | a primeira letra do nome, sem o artigo (*Os Três Patetas* → `T`; números → `#`) |

  ex: `…/SHOWS/{atracao}/{ano}` → `…/SHOWS/ROCK IN RIO/2026`; `…/FILMES/TITULOS/_{letra}_/{atracao}` → `…/_T_/OS TRES PATETAS`.
- **{letra}** → uma categoria com `{letra}` ganha a etapa dos **parecidos** na janela PROJETO (os que já existem na pasta da letra), como os filmes, e o `.aep` tem o nome digitado.
- **ícone** → o escolhido no seletor (clique no ícone, dentro do campo do nome): todos os desenhos do padeiro, estáticos. vale no dentro de da janela PROJETO. a categoria nova começa com a pasta.
- a ordem na janela PROJETO: primeiro a atração que já existe (achada pela claquete, na pasta dela); se não existe ou é nova, a categoria; se nenhuma serve, **nenhuma destas: escolher a pasta…** (livre). sem categorias na configuração, só o livre.

- **cadastro no banco** *(em breve, desligado)* → reservado: ao criar o projeto de uma atração ou de um filme novo, a etapa CRIAR **propõe** o cadastro (o nome, a categoria e a pasta vão para um webhook que atualiza o banco das atrações e a busca). na hora, **pular** (o padrão, para testes) ou **cadastrar**.

**👤 neste computador** (embaixo):

- **pasta dos projetos** → para onde vai o projeto de uma atração nova quando a pasta da categoria não pode ser acessada (rede fora ou modo local), na estrutura `{categoria}/{atracao}`. vazia, a Área de Trabalho.

> 🚩 *obs:* uma atração que já existe (achada pela claquete) continua indo para a pasta dela; os caminhos das categorias valem só para a atração nova.
<br>

---

<br>

## 📍 coletar

a aba **coletar** define a **estrutura de pastas de cada projeto**: onde o botão **coletar** (na barra) copia os arquivos usados e onde a janela **projeto** salva o `.aep`. é uma árvore no mesmo jeito da aba organizar. vem com a estrutura padrão:

```
01 PROJETOS        ← o .aep (tipo projeto)
02 ARQUIVOS
   FONTS           ← fontes
   IMAGENS         ← imagens e sequências de imagens
   VÍDEOS          ← vídeos
   AUDIOS          ← áudio
   DADOS           ← dados (json, csv, txt...)
03 SAIDA           ← previews e finais para avaliação (criada vazia)
```

a raiz da estrutura é a pasta do projeto: a de cima da pasta do tipo **projeto** (`01 PROJETOS`). pastas sem tipo (como `02 ARQUIVOS` e `03 SAIDA`) também são criadas. '*usar a estrutura padrão*' (abaixo dos tipos) troca a árvore por esta.

- **árvore** → as mesmas regras do organizar: arrastar, renomear, '*+ nova pasta*', **×** para excluir.
- **tipos de arquivo** → projeto (.aep), vídeos, sequências de imagens, imagens, áudio, dados e fontes. arraste cada tipo para a pasta que deve recebê-lo. o tipo que fica na raiz (riscado) **não é coletado** (o projeto, fora da árvore, fica na própria pasta do projeto).
- **sequências de imagens** → copiadas inteiras (os quadros do trecho usado no projeto), cada uma numa subpasta com o nome dela (`render_0001.png` → `render`). a interpretação do item (fps, alpha) é mantida.
- **sempre salva** → depois de copiar, os itens apontam para as cópias e o projeto é salvo.
<br>

---

<br>

## 📍 renomear

a aba **renomear** define como o botão **renomear** (na barra) padroniza os nomes das comps. vem preenchida com os tipos de sempre; outra equipe ajusta para os tipos de peça dela.

- **testar** (no topo) → digite o nome de uma comp e veja na hora como ela fica com a tabela em edição.
- **formato do nome** → a **caixa de texto** (CAIXA ALTA, caixa baixa, Título ou como está), o **separador** entre o prefixo e o nome (` - `; os espaços contam) e **remover caracteres especiais** (ligado, tira acentos e símbolos: **JOÃO!** vira **JOAO**). a caixa e os acentos valem para a parte descritiva; o prefixo do tipo fica como foi escrito. o separador também é o dos nomes criados pelos templates.
- **tipos de peça** → o **prefixo** do nome, o **comentário** da comp e os **termos** que identificam o tipo no nome da comp (ou da pasta dela): digite um termo e a vírgula (ou Enter) para virar um chip; o `×` do chip (ou backspace no campo vazio) tira. ex: `RDP` · `RODAPE` · `rodapé, rdp`: **rodapé_joão silva** → **RDP - JOAO SILVA**.
- **nomes fixos** → a comp que tem o termo no nome (ou no comentário) passa a se chamar sempre o mesmo nome. ex: **LOGO GLOBO**.

> 🚩 *obs:*\
> • a ordem importa: vale o primeiro tipo encontrado. arraste pelos pontinhos para reordenar.\
> • os termos são palavras: maiúsculas e acentos não importam (`rodape` reconhece **Rodapé**), e o plural com S também vale (`tarja` reconhece **TARJAS**). plurais irregulares entram como outro termo (`cartao, cartoes`).\
> • o comentário do tipo também é usado pelo **organizar**.
<br>

---

<br>

## 📍 organizar

a aba **organizar** define a árvore de pastas que o botão **organizar** (na barra) monta no projeto. vem preenchida com a árvore de sempre (`01 COMPS`, `02 PRECOMPS`, `03 ARQUIVOS` com `VIDEOS`, `IMAGENS`, `AUDIO`, `SOLIDOS` e `DADOS`, e `MISSING`).

a aba tem duas colunas: à esquerda, a **árvore do projeto** (no azul); à direita, os **tipos de item** e os ajustes.

- **árvore** → clique no nome para renomear a pasta. arraste a pasta pelos pontinhos: **sobre outra pasta**, ela entra; **entre duas pastas** (aparece uma linha), fica no mesmo nível; sobre **raiz do projeto**, volta para a raiz. '*+ nova pasta*' (no lado branco, abaixo dos tipos) cria uma pasta na raiz; o **×** (passe o mouse) exclui.
- **tipos de item** → comps de render, comps editáveis, outras comps, vídeos, imagens, áudio, sólidos, dados e arquivos ausentes. arraste um tipo (o cartão da direita ou a etiqueta na árvore) para a pasta que deve recebê-lo; uma pasta pode receber mais de um tipo. cada cartão mostra onde o tipo está. o **×** da etiqueta (ou soltar o tipo na raiz) tira o tipo da pasta.
- **comps de render** → a comp vai para a pasta das comps de render quando o comentário dela contém um destes termos (ou o comentário de um tipo de peça da aba renomear).
- **comps editáveis** → com uma pasta para o tipo **comps editáveis** na árvore, a comp vai para ela quando o comentário contém um destes termos (padrão: `EDIT`, que também vale para `EDITAR`). sem essa pasta, as editáveis ficam com as outras comps.
- **comentário automático** → dado às comps selecionadas sem comentário (ao organizar) e às comps criadas pelos templates. precisa conter um dos termos de render.
- **extensões de dados** → arquivos tratados como dados (`.csv`, `.json`...).
- **comentários viram subpastas** → ligado, comps e arquivos com comentário ficam numa subpasta com o nome dele (ex: `01 COMPS / RODAPE`). na árvore, cada pasta que recebe itens mostra isso numa subpasta tracejada, '*comentários viram subpastas*'.

> 🚩 *obs:*\
> • renomear uma pasta leva as subpastas junto; excluir uma pasta sobe as subpastas e os tipos dela para a pasta de cima.\
> • o tipo que não está em nenhuma pasta fica na raiz do projeto (aparece na linha **raiz do projeto**).\
> • `Esc` cancela um arrasto; perto das bordas, a árvore rola sozinha.\
> • a pasta dos arquivos ausentes só é criada quando há algum arquivo ausente.
<br>

---

<br>

## 📍 buscar

a aba **buscar** ajusta a busca de caminhos (**O ACESSORISTA**) e as atrações da janela [PROJETO](projeto.md).

- **webhook** → o endereço do workflow **PROMO - BUSCAR**, que devolve o índice pronto (Teams, Trello, atrações e filmes). vazio, vale o padrão (`…/webhook/buscar`).
- **servidor · caminhos fixos** → pastas que aparecem sempre na busca, com o ícone de servidor, para todo mundo. cada linha tem um **nome** e um **caminho** (do Mac, `/Volumes/...`, ou da rede do Windows, `\\servidor\share\...`); a pastinha escolhe a pasta, o **×** tira a linha e os pontinhos reordenam. o servidor e o share saem do próprio caminho (ou do mapa da aba **rede**), e o volume é montado ao abrir.

**👤 de onde vêm os caminhos** (neste computador, embaixo) → o que o [acessorista](acessorista.md) e a janela [PROJETO](projeto.md) usam aqui:
  - **webhook da equipe** → o índice do webhook acima.
  - **índice local** → as pastas da lista (a pastinha escolhe, o **×** tira), lidas com todas as subpastas e guardadas neste computador. **só pastas** deixa o índice mais leve (sem os arquivos); **atualizar sozinho uma vez por dia** refaz o índice ao abrir a busca. **indexar agora** refaz na hora e mostra a última indexação (quando, quantos itens e o tamanho).
  - uma janela do acessorista ou do projeto já aberta passa a usar a escolha nova quando você volta para ela.

> 🚩 *obs:* o índice antigo (com categorias e arquivo de índice) ficou só para o padeiro legacy.
<br>

---

<br>

## 📍 links

a aba **links** (🌐 equipe) define os links que aparecem no começo da barra de todo mundo (ex: a planilha de apontamento de projetos). os seus (**👤 meus links**, embaixo, neste computador) ficam só nesta máquina e aparecem na barra depois dos da equipe, com um **bonequinho** no canto do ícone.

cada link tem um **nome** (aparece na dica), o **endereço** e o **ícone**: por padrão, o do próprio site (favicon). clique no ícone para escolher outra imagem (24 x 24 pixels, como o das produções); o **↺** no canto volta para o favicon. arraste pelos pontinhos para mudar a ordem; o **×** no campo do endereço exclui o link.

> 🚩 *obs:*\
> • sem favicon (site sem o arquivo ou rede fora), aparece o desenho de um link.\
> • os seus links podem ser editados e salvos mesmo sem acesso à lista da rede.
<br>

---

<br>

## 📍 rede

a aba **rede** junta o que é configurado uma vez para a equipe e quase nunca muda: onde fica o registro de uso e o mapa dos drives.

### registro de uso

define onde o padeiro registra cada preenchimento: data, produção, template, quantidade, usuário, máquina e projeto.

| opção | o que faz |
| --- | --- |
| **webhook** | envia cada registro para o endereço do campo (`http://` ou `https://`) |
| **CSV por produção** | um arquivo só por produção, `O_PADEIRO_log.csv`, na pasta de templates dela: cada preenchimento acrescenta uma nova linha (o arquivo é criado na primeira vez, com cabeçalho; separador `;`, abre direto no Excel) |
| **CSV global** | um arquivo só para a equipe toda, `O_PADEIRO_log.csv`, na mesma pasta da lista de produções (`O_PADEIRO_config.json`): cada preenchimento de qualquer produção acrescenta uma nova linha |
| **desligado** | não registra nada |

> 🚩 *obs:*\
> • o endereço do webhook fica guardado mesmo com o CSV ou o log desligado: basta voltar para "webhook".\
> • se o CSV não puder ser gravado na hora (aberto no Excel, rede fora), a linha fica guardada na máquina e entra no arquivo no próximo preenchimento.

### drives

é o mapa da rede que o padeiro usa para converter caminhos entre Windows e Mac (conversor, busca de caminhos e os caminhos dos templates). vem preenchida com o mapa de sempre; outra equipe, com outros servidores, ajusta aqui.

- **drives da rede** → a letra do Windows e o caminho de rede que ela representa (`//servidor/share/pasta`). ex: `L:` → `//vfx-ml-sp.../VFX/imagem/drive_l`: `L:\PROMO\x` vira `//vfx-ml-sp.../VFX/imagem/drive_l/PROMO/x` (e `/Volumes/drive_l/PROMO/x` no Mac).
- **volumes sem letra** → volumes montados no Mac (`/Volumes/NOME`) que não têm letra no Windows: o nome do volume e o servidor onde ele está.
- **servidor padrão** → usado quando o volume não está em nenhuma das listas.

> 🚩 *obs:*\
> • a letra pode ser digitada com ou sem `:`; caminhos com `\` são convertidos para `/` ao salvar.\
> • os painéis passam a usar o mapa novo em alguns segundos, sem reiniciar o After Effects.
<br>

---

<br>

## 📍 aparência

a aba **aparência** (👤 local) define o visual de todas as janelas do padeiro **neste computador**. sem personalização, vale o padrão da equipe (que se edita em **⋯ > editar o padrão da equipe**).

- **modo** e **fundo** → dois menus lado a lado: claro, escuro ou automático (segue o sistema); degradê ou sólido.
- **cores** → o quadradinho com o espectro mostra as duas amostras: no **degradê**, início e fim (o fundo das janelas e da barra); no **sólido**, só a primeira (a cor do fundo e dos destaques); a linha da segunda fica desabilitada e ela volta ao trocar para degradê. cada amostra fica sobre a própria cor no quadradinho: a volta em torno do centro é a **matiz** e a distância do centro é a **saturação** (no centro, sem cor; na borda, a cor pura). **arraste** a amostra por todo o quadradinho (ou clique nele para levar até ali a amostra da linha aberta); clicar numa amostra abre a linha dela. ao lado, cada amostra tem uma linha com o nome e o código (`#rrggbb`, para digitar); clique na linha para abrir o **brilho** (o trilho mostra o efeito na própria cor; o quadradinho mostra as cores no brilho da cor da linha aberta, e a amostra dela fica por cima). no degradê, o destaque (botões, títulos, seleção) é o tom do meio entre início e fim; os tons claros (seleção, avisos, bordas de foco) são calculados a partir dele. com cores claras, o padeiro ajusta a leitura sozinho: o destaque usado em textos escurece até dar para ler (no modo escuro, clareia), e os textos e ícones sobre o degradê (barra, abas, botões) trocam o branco por um tom escuro.
- **fonte** → Inter (padrão), a do sistema, Helvetica / Arial, Segoe UI, Roboto, Georgia ou monoespaçada. a fonte precisa estar instalada no computador.
- **logo da barra** → uma imagem no lugar do pãozinho (reduzida para caber, sem cortar; PNG com fundo transparente fica melhor). '*voltar ao pãozinho*' desfaz.
- **restaurar a aparência padrão** → volta tudo ao visual de sempre.

> 🚩 *obs:* enquanto você edita, só esta janela mostra a prévia; ao salvar, as outras janelas mudam em alguns segundos.

> 💡 *exemplo:* [config da PROMO GNEWS](exemplos/gnews/README.md): pastas, nomenclatura, busca e barra montadas a partir da barra antiga da promo, com o que ainda falta para chegar igual.
<br>

---

<br>

## 📍 layout

a aba **layout** (👤 local) monta a **sua** barra (sem personalização, vale o padrão da equipe), no mesmo esquema do organizar: à esquerda, no azul, a **barra em fila única** (como ela aparece); à direita, o que está **fora da barra**.

- **ordem** → arraste cada ferramenta da barra pelos pontinhos.
- **tirar** → o **×** de uma ferramenta (ou dos links, no topo) tira ela da barra; passe o mouse para ver o ×.
- **fora da barra** → cada ferramenta tirada vira um bloco à direita, com o que ela faz; o **+** põe de volta, no fim da barra (os links voltam ao começo).
- **separadores** → '*+ separador*' (à direita, abaixo dos blocos) acrescenta um no fim da barra; arraste para o lugar. cada separador vira uma divisória na barra; o **×** tira. um grupo sem nenhuma ferramenta some junto com a divisória.

> 🚩 *obs:* a barra acompanha em alguns segundos. separadores no começo, no fim ou dois seguidos são ignorados ao salvar.

<br>

---

<br>

## 📍 meu usuário

a aba **meu usuário** (👤 local) guarda o que é seu e não é de nenhuma ferramenta, só nesta máquina (as opções locais de cada ferramenta ficam na aba dela, embaixo, em **neste computador**):

- **designer** → o seu nome nos projetos (variável `{usuario}`), ou uma sigla, se preferir. vazio, vale o usuário do sistema, completo. é o mesmo do bonequinho da [janela projeto](projeto.md).
- **registro de uso** → '*enviar o meu registro de uso*': ligado, este computador registra cada template preenchido como a equipe definiu na aba **rede** (inclusive nas produções locais); desligado, nada sai daqui.
- **modo local** → trabalhar **sem a rede**. é exatamente o que o padeiro faz sozinho quando a rede cai; ligar à mão só evita que ele tente a rede (bom em casa ou numa VPN lenta).
  - a configuração da equipe vem da **última cópia** guardada neste computador (atualizada sempre que o padeiro lê a configuração com a rede) e fica só para leitura.
  - só as [produções locais](#-templates) aparecem no painel de templates, e a busca de caminhos usa o **último índice baixado** (ou o índice local).
  - as atrações novas vão para a [pasta dos projetos](#-projeto) daqui (sem ela, a Área de Trabalho).
  - **todos** os renders da fila vão para a [pasta de saída](#-templates) daqui (sem ela, a Área de Trabalho).
  - os logs esperam a volta para a rede (o webhook não é chamado).
  - o ícone na ponta da barra oposta à do pãozinho (à esquerda; na vertical, no topo) mostra o modo: **servidor** na rede, **servidor com o alerta amarelo** quando a rede caiu e **notebook** no modo local ligado por você. um clique no servidor abre a aba **rede**; no notebook, esta aba. a aba meu usuário também avisa quando a rede caiu.

> 🚩 *obs:* a cópia da configuração é guardada na primeira vez que o padeiro abre com a rede: sem ela, o modo local não liga (`#PAD_096`). a configuração da equipe só volta a ser editável com a rede.
<br>

---

<br>

## 📍 teclado

| tecla | o que faz |
| --- | --- |
| `Ctrl/Cmd+S` | salva a configuração |
| `Ctrl/Cmd+F` | foca o filtro |
| `↑` `↓` (em um campo) | vão para o mesmo campo da linha de cima / de baixo |
| `Esc` | limpa o filtro |
