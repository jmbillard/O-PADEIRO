# 🎬 projeto

[← O PADEIRO](../README.md)

a janela **O PADEIRO projeto** cria um projeto novo a partir da **atração**: acha a atração e a pasta dela, cria a estrutura (`01 PROJETOS`, `02 ARQUIVOS`, `03 SAIDA`) e salva o `.aep` com o nome padronizado. depois de criado, a mesma janela vira um **editor** simples da claquete, do designer e da pasta.

> 🚩 *o collect dos arquivos é do botão **coletar** da barra ([abaixo](#-coletar-os-arquivos)).*

abra pelo botão **projeto** da barra (`◖`). o `◗ clique direito` no mesmo botão salva o projeto (se ainda não foi criado pela janela, abre a janela).

> 📟 *janela projeto*:
>
> ![janela projeto](images/projeto.webp)

## 📍 projeto novo, em etapas

uma tela por vez; **‹ voltar** volta uma etapa.

1. **ATRAÇÃO** → digite a atração (ex: `DOMINGÃO`). a atração escolhida (a achada, a da lista ou a nova) fica gravada também como a **claquete** do projeto (dá para trocar no editor). enquanto você digita, o padeiro procura a atração no índice da [busca](acessorista.md) (o mesmo do acessorista, na memória) e mostra a atração e o caminho dela:
   - pelo nome completo: o nome ou um *pattern* da atração é o começo do que foi digitado (*MAIS VOCE* para `MAIS VOCE 30 10`);
   - pelo nome em parte, palavra a palavra: cada palavra digitada é uma palavra do nome, na ordem, e só a última (ou a que vem antes de um número) pode estar pela metade (`la na minha` → *Lá na Minha Terra*; `GREP 6 11` → *G REPORTER*; `a nobre dama` não acha *A Nobreza do Amor*), a partir de 3 letras. quando a completa acha, as parciais ficam de fora.
   - **não é essa? escolher outra ou criar nova** (embaixo da atração encontrada) → abre a etapa PASTA mesmo com a atração achada.
2. **PASTA** → só aparece quando o nome digitado combina com mais de uma atração, ou com nenhuma. escolha a atração, **criar nova** (filme inédito, novela nova…) ou **escolher uma pasta…** (o navegador de pastas).
   - **NOVA** → o nome (já vem com o que foi digitado na primeira etapa, sem números no fim) e **dentro de** qual categoria: as da [configuração > projeto](producoes.md#-projeto), cada uma com o seu ícone e o caminho com tokens (ex: `…/SHOWS/{atracao}/{ano}`); embaixo, a prévia do caminho. a pasta da atração nova é criada ao criar o projeto.
   - **nenhuma destas: escolher a pasta…** (sempre no fim da lista) → a saída livre, quando nenhuma categoria serve para a atração. sem categorias na configuração, o **escolher a pasta…** fica no lugar da lista.
   - **filmes** seguem o mesmo fluxo das outras categorias: a pasta da letra é só o token `{letra}` do caminho (`…/FILMES/TITULOS/_{letra}_/{atracao}` → `…/_T_/OS TRES PATETAS`).
   - se a pasta da categoria não pode ser acessada (rede fora ou modo local), o projeto vai para a **pasta dos projetos** deste computador (`{categoria}/{atracao}`), com o aviso na prévia.
3. **ARQUIVO** (todas as atrações, filmes também) → **o que é** (ex: `SERVIÇO`, `CRÉDITOS`, `CHROMA`). o `.aep` é a atração + o que é, sem acentos e caracteres especiais, em maiúsculas (ex: `MAIS VOCE SERVICO.aep`). uma atração pode ter vários projetos.
   - embaixo aparecem os `.aep` que já estão na `01 PROJETOS` da atração, o último alterado primeiro, com a data (`hoje 14:32`, `ontem 09:10`, `28/10`).
   - já existe um com o mesmo nome → **abrir o existente** ou **salvar como … 2**.
4. **CRIAR** → embaixo da estrutura, a **pasta de output** (a do caminho de output da categoria, ou a da atração no índice): se já existe, vai para os dados do projeto; se ainda não existe, um menu radial **pular** / **criar a pasta** (o padrão). **pular** não cria a pasta nem grava nada no projeto (dá para escolher depois, no editor). depois: o cartão azul mostra a estrutura e o arquivo: `01 PROJETOS` com o `.aep`, `02 ARQUIVOS` com `FONTS`, `IMAGENS` e `VÍDEOS`, e `03 SAIDA` (a pasta de projetos que já existe aparece mais clara). **Criar projeto** cria as pastas que faltam e salva o `.aep`. a janela cresce sozinha para caber a etapa toda. no macOS, se o volume da rede do caminho (ex: `/Volumes/VFX`) não estiver montado, o padeiro monta antes, como o acessorista faz ao abrir uma pasta. `AUDIOS` e `DADOS` o [coletar](#-coletar-os-arquivos) cria quando o projeto usar áudio ou dados.

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

- 🟢 **verde** → o projeto aberto está salvo com os dados do padeiro.
- 🟠 **laranja** → o projeto aberto não tem os dados (ainda não foi salvo, ou foi salvo sem a janela projeto).
- sem bolinha → projeto vazio (sem arquivo e sem itens).

## 📍 coletar os arquivos

o botão **coletar** da barra varre o projeto, copia as mídias usadas (vídeos, sequências de imagens, imagens, áudio, dados e fontes) para a estrutura do projeto, troca os caminhos para as cópias e salva o projeto. detalhes na [barra](../README.md#coletar).

## 📍 menu ⋯

- **novo projeto** → começa as etapas de novo.
- **abrir a pasta** → no Explorer / Finder.
- **ajuda / documentação** → esta página.
- **recarregar painel**
