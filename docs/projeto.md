# 🎬 projeto

[← O PADEIRO](../README.md)

a janela **O PADEIRO projeto** cria um projeto novo a partir da **atração**: acha a atração e a pasta dela, cria a estrutura (`01 PROJETOS`, `02 ARQUIVOS`, `03 SAIDA`) e salva o `.aep` com o nome padronizado. depois de criado, a mesma janela vira um **editor** simples da claquete, do designer e da pasta.

> 🚩 *o collect dos arquivos é do botão **coletar** da barra ([abaixo](#-coletar-os-arquivos)).*

abra pelo botão **projeto** da barra (`◖`). o `◗ clique direito` no mesmo botão salva o projeto (se ainda não foi criado pela janela, abre a janela).

> 📟 *janela projeto*:
>
> ![janela projeto](images/projeto.webp)

## 📍 projeto novo, em duas telas

**ATRAÇÃO → CRIAR**. o que é opcional aparece só quando é preciso, na mesma tela; **‹ voltar** volta para a atração. quem acha a atração de primeira faz: digitar → `Enter` → digitar o que é → `Enter`.

1. **ATRAÇÃO** → digite a atração (ex: `DOMINGÃO`). enquanto você digita, o padeiro procura no índice da [busca](acessorista.md) (o mesmo do acessorista, na memória) e **lista as atrações em cartões**, com a primeira marcada (até 4; com mais, continue digitando). `Enter` (ou **Próximo**) segue com a marcada.
   - **como acha** → pelo nome completo (o nome ou um *pattern* da atração é o começo do que foi digitado: *MAIS VOCE* para `MAIS VOCE 30 10`) ou pelo nome em parte, palavra a palavra (cada palavra digitada é uma palavra do nome, na ordem; só a última, ou a que vem antes de um número, pode estar pela metade: `la na minha` → *Lá na Minha Terra*; `GREP 6 11` → *G REPORTER*), a partir de 3 letras. quando a completa acha, as parciais ficam de fora.
   - **nova atração** (sempre no fim da lista; marcada sozinha quando nada é encontrado) → o **nome** (já vem com o que foi digitado, sem números no fim) e a **categoria** abrem logo abaixo do cartão: as da [configuração > projeto](producoes.md#-projeto), cada uma com o seu ícone e o caminho com tokens (ex: `…/SHOWS/{atracao}/{ano}`), com a prévia do caminho. a **última categoria usada** vem escolhida (neste computador). **nenhuma destas: escolher a pasta…** (no fim das categorias) é a saída livre; sem categorias na configuração, o **escolher a pasta…** fica no lugar da lista. a pasta da atração nova é criada ao criar o projeto.
   - **outra pasta…** → abre o navegador de pastas ao seguir.
   - **filmes** seguem o mesmo fluxo: a pasta da letra é só o token `{letra}` do caminho (`…/FILMES/TITULOS/_{letra}_/{atracao}` → `…/_T_/OS TRES PATETAS`).
   - se a pasta da categoria não pode ser acessada (rede fora ou modo local), o projeto vai para a **pasta dos projetos** deste computador (`{categoria}/{atracao}`), com o aviso na prévia.
2. **CRIAR** → no topo, a atração e o designer; logo abaixo, **o que é** (ex: `SERVIÇO`, `ELENCO`, `AESP`). o `.aep` é a atração + o que é, sem acentos e caracteres especiais, em maiúsculas (ex: `MAIS VOCE SERVICO.aep`), e a **claquete** gravada no projeto é a mesma coisa (`MAIS VOCE SERVICO`; dá para trocar no editor). o nome do `.aep` e a árvore mudam enquanto você digita. uma atração pode ter vários projetos.
   - **já na pasta** → uma linha com o último `.aep` alterado da pasta de projetos (`hoje 14:32 · +2`).
   - **nome repetido** → o aviso e as duas saídas ali mesmo: **abrir o existente** ou **salvar como … 2** (o padrão; a árvore já mostra o `… 2.aep`).
   - **a estrutura** (o cartão azul): `01 PROJETOS` com o `.aep`, `02 ARQUIVOS` com `FONTS`, `IMAGENS` e `VÍDEOS`, e `03 SAIDA` (a pasta de projetos que já existe aparece mais clara).
   - **pasta de output** → numa linha só, a escolhida e o caminho (ex: `SERVICO · nova`, `…/2026/SERVICO`). o clique abre as opções embaixo: a da atração (do caminho de output da categoria, ou a do índice), a **subpasta do "o que é"** dentro dela (o padrão), **pular** (não cria nem grava nada; dá para escolher depois, no editor) e **outra pasta…** (com a pastinha). cada uma diz se **já existe** ou é **nova** (a nova é criada junto com o projeto); a escolha (menos a outra pasta) fica lembrada neste computador.
   - **Criar projeto** (ou `Enter` no "o que é") cria as pastas que faltam e salva o `.aep`; a janela cresce sozinha para caber tudo. no macOS, se o volume da rede do caminho (ex: `/Volumes/VFX`) não estiver montado, o padeiro monta antes, como o acessorista faz ao abrir uma pasta. `AUDIOS` e `DADOS` o [coletar](#-coletar-os-arquivos) cria quando o projeto usar áudio ou dados.

> 🚩 *obs:* se a pasta da atração já tem uma pasta de projetos (`01 PROJETOS`, `01PROJETOS`, `PROJETOS`…), ela é usada.

a **claquete**, o **designer**, a **atração**, a **pasta** e a **pasta de output** ficam gravados **no próprio projeto** (metadados XMP: `dc:identifier`, `dc:creator`, `dc:coverage`, `dc:relation` e `dc:source`).

## 📍 editor

ao abrir a janela com um projeto criado por ela:

- **claquete** e **designer** (bonequinho) → o designer vazio vale o da [configuração > meu usuário](producoes.md#-meu-usuário) (por padrão, o usuário do computador, completo).
- **atração** → o nome da atração.
- **pasta** → o caminho do projeto. o botão de pasta dentro do campo move o `.aep` (e a estrutura) para outra pasta.
- **output** → a pasta de output do projeto. o botão de pasta dentro do campo grava outra pasta de output.
- **Salvar** → grava os campos, salva o projeto e fecha a janela.

**projeto já salvo, mas sem os dados do padeiro** (um `.aep` antigo, por exemplo) → a janela pula as etapas e abre direto no editor, com a **atração** preenchida pelo nome do arquivo e a **pasta** pelo caminho onde ele está. digite a claquete, confira e **Salvar**: os dados passam a ficar gravados no projeto.

abrir outro projeto troca os dados da janela.

### bolinha na barra

o botão **projeto** da barra mostra uma bolinha:

- 🟢 **verde** → o projeto aberto está salvo com os dados do padeiro, dentro da pasta dele.
- 🟠 **laranja** → o projeto aberto não tem os dados (ainda não foi salvo, ou foi salvo sem a janela projeto) ou está salvo fora da pasta dele (ex: um "salvar como" na Área de Trabalho). nesse caso, o editor avisa e o **Salvar** leva o `.aep` de volta para a pasta.
- sem bolinha → projeto vazio (sem arquivo e sem itens).

## 📍 coletar os arquivos

o botão **coletar** da barra varre o projeto, copia as mídias usadas (vídeos, sequências de imagens, imagens, áudio, dados e fontes) para a estrutura do projeto, troca os caminhos para as cópias e salva o projeto. detalhes na [barra](../README.md#coletar).

## 📍 menu ⋯

- **novo projeto** → começa as etapas de novo.
- **abrir a pasta** → no Explorer / Finder.
- **ajuda / documentação** → esta página.
- **recarregar painel**
