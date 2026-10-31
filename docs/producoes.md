# 🗂️ configuração

[← O PADEIRO](../README.md)

a janela **O PADEIRO configuração** (`⋯` → '*Configuração*', no painel de templates) reúne o que vale para a equipe toda, em cinco abas: **produções**, **logs**, **drives**, **renomear** e **organizar**. tudo fica no mesmo arquivo compartilhado, `O_PADEIRO_config.json`, e é gravado junto em '*Salvar*' (ou `Ctrl/Cmd+S`).

## 📍 produções

uma **produção** é uma pasta que contém (ou vai conter) templates do padeiro, organizados em subpastas como a equipe preferir.

a lista de produções é **uma só para a equipe**: o arquivo `O_PADEIRO_config.json`, na pasta do padeiro na rede. quando alguém muda a lista, os painéis de todo mundo atualizam sozinhos.

> 📟 *aba produções*:
>
> ![editor de produções](images/producoes.webp)

1. clique em '*+ nova produção*'.
2. escolha um ícone (opcional), digite o nome e escolha a pasta de templates pelo ícone de pasta dentro do campo (o ponto à esquerda do caminho fica verde quando a pasta existe). o **×** no mesmo campo exclui a produção.
3. clique em '*Salvar*' (ou `Ctrl/Cmd+S`).

- **reordenar** → arraste uma produção pelos pontinhos à esquerda (`↑` `↓` com o puxador em foco também movem).
- **filtrar** → mostra só as produções com o termo no nome ou no caminho.
- **importar / exportar** (os botões com setas, no canto inferior esquerdo, só nesta aba) → lê ou grava uma lista completa, com os ícones.
- **recarregar** → lê a configuração de novo, descartando o que não foi salvo.
- **⋯** → ajuda (esta página) e recarregar o painel.

> 🚩 *obs:*\
> • a ordem da lista é a do seletor de produção (no rodapé do painel de templates): arraste pelos pontinhos à esquerda de cada produção para reordenar (com o filtro ativo, o arraste fica escondido).\
> • o caminho do arquivo da lista aparece no fim da lista de produções.\
> • o ícone tem **24 x 24 pixels**: imagens maiores são cortadas no centro e reduzidas.\
> • se outra pessoa salvou a lista depois que você abriu o editor, o padeiro **não** sobrescreve o trabalho dela: recarregue e refaça as alterações. uma cópia da lista anterior fica em `O_PADEIRO_config.bak.json`.\
> • sem acesso ao arquivo compartilhado (rede fora), não há lista: os painéis avisam e voltam a ler sozinhos quando a rede voltar.

<br>

---

<br>

## 📍 logs

a aba **logs** define onde o padeiro registra cada preenchimento: data, produção, template, quantidade, usuário, máquina e projeto.

| opção | o que faz |
| --- | --- |
| **webhook** | envia cada registro para o endereço do campo (`http://` ou `https://`) |
| **CSV por produção** | um arquivo só por produção, `O_PADEIRO_log.csv`, na pasta de templates dela: cada preenchimento acrescenta uma nova linha (o arquivo é criado na primeira vez, com cabeçalho; separador `;`, abre direto no Excel) |
| **CSV global** | um arquivo só para a equipe toda, `O_PADEIRO_log.csv`, na mesma pasta da lista de produções (`O_PADEIRO_config.json`): cada preenchimento de qualquer produção acrescenta uma nova linha |
| **desligado** | não registra nada |

> 🚩 *obs:*\
> • o endereço do webhook fica guardado mesmo com o CSV ou o log desligado: basta voltar para "webhook".\
> • se o CSV não puder ser gravado na hora (aberto no Excel, rede fora), a linha fica guardada na máquina e entra no arquivo no próximo preenchimento.

<br>

---

<br>

## 📍 drives

a aba **drives** é o mapa da rede que o padeiro usa para converter caminhos entre Windows e Mac (conversor, busca de caminhos e os caminhos dos templates). vem preenchida com o mapa de sempre; outra equipe, com outros servidores, ajusta aqui.

- **drives da rede** → a letra do Windows e o caminho de rede que ela representa (`//servidor/share/pasta`). ex: `L:` → `//vfx-ml-sp.../VFX/imagem/drive_l`: `L:\PROMO\x` vira `//vfx-ml-sp.../VFX/imagem/drive_l/PROMO/x` (e `/Volumes/drive_l/PROMO/x` no Mac).
- **volumes sem letra** → volumes montados no Mac (`/Volumes/NOME`) que não têm letra no Windows: o nome do volume e o servidor onde ele está.
- **servidor padrão** → usado quando o volume não está em nenhuma das listas.

> 🚩 *obs:*\
> • a letra pode ser digitada com ou sem `:`; caminhos com `\` são convertidos para `/` ao salvar.\
> • os painéis passam a usar o mapa novo em alguns segundos, sem reiniciar o After Effects.

<br>

---

<br>

## 📍 renomear

a aba **renomear** define como o botão **renomear** (na barra) padroniza os nomes das comps. vem preenchida com os tipos de sempre; outra equipe ajusta para os tipos de peça dela.

- **testar** (no topo) → digite o nome de uma comp e veja na hora como ela fica com a tabela em edição.
- **tipos de peça** → o **prefixo** do nome, o **comentário** da comp e os **termos** que identificam o tipo no nome da comp (ou da pasta dela), separados por vírgula. ex: `RDP` · `RODAPE` · `rodapé, rdp`: **rodapé_joão silva** → **RDP - JOAO SILVA**.
- **nomes fixos** → a comp que tem o termo no nome (ou no comentário) passa a se chamar sempre o mesmo nome. ex: **LOGO GLOBO**.

> 🚩 *obs:*\
> • a ordem importa: vale o primeiro tipo encontrado. arraste pelos pontinhos para reordenar.\
> • os termos são palavras: maiúsculas e acentos não importam, e o plural com S também vale (`tarja` reconhece **TARJAS**). plurais irregulares entram como outro termo (`cartao, cartoes`).\
> • o comentário do tipo também é usado pelo **organizar**.

<br>

---

<br>

## 📍 organizar

a aba **organizar** define a árvore de pastas que o botão **organizar** (na barra) monta no projeto. vem preenchida com a árvore de sempre (`01 COMPS`, `02 PRECOMPS`, `03 ARQUIVOS` com `VIDEOS`, `IMAGENS`, `AUDIO`, `SOLIDOS` e `DADOS`, e `MISSING`).

a aba tem duas colunas: à esquerda, a **árvore do projeto** (no azul); à direita, os **tipos de item** e os ajustes.

- **árvore** → clique no nome para renomear a pasta. arraste a pasta pelos pontinhos: **sobre outra pasta**, ela entra; **entre duas pastas** (aparece uma linha), fica no mesmo nível; sobre **raiz do projeto**, volta para a raiz. '*+ nova pasta*' cria uma pasta na raiz; o **×** (passe o mouse) exclui.
- **tipos de item** → comps de render, outras comps, vídeos, imagens, áudio, sólidos, dados e arquivos ausentes. arraste um tipo (o cartão da direita ou a etiqueta na árvore) para a pasta que deve recebê-lo; uma pasta pode receber mais de um tipo. cada cartão mostra onde o tipo está. o **×** da etiqueta (ou soltar o tipo na raiz) tira o tipo da pasta.
- **comps de render** → a comp vai para a pasta das comps de render quando o comentário dela contém um destes termos (ou o comentário de um tipo de peça da aba renomear).
- **comentário automático** → dado às comps selecionadas sem comentário (ao organizar) e às comps criadas pelos templates. precisa conter um dos termos de render.
- **extensões de dados** → arquivos tratados como dados (`.csv`, `.json`...).
- **o comentário vira subpasta** → ligado, comps e arquivos com comentário ficam numa subpasta com o nome dele (ex: `01 COMPS / RODAPE`).

> 🚩 *obs:*\
> • renomear uma pasta leva as subpastas junto; excluir uma pasta sobe as subpastas e os tipos dela para a pasta de cima.\
> • o tipo que não está em nenhuma pasta fica na raiz do projeto (aparece na linha **raiz do projeto**).\
> • `Esc` cancela um arrasto; perto das bordas, a árvore rola sozinha.\
> • a pasta dos arquivos ausentes só é criada quando há algum arquivo ausente.

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
