# 🎬 projeto

[← O PADEIRO](../README.md)

a janela **O PADEIRO projeto** cria um projeto novo a partir da **claquete**: acha a atração e a pasta dela, cria a estrutura (`01 PROJETOS`, `02 ARQUIVOS`, `03 SAIDA`) e salva o `.aep` com o nome padronizado. depois de criado, a mesma janela vira um **editor** simples da claquete, do designer e da pasta.

> 🚩 *o collect dos arquivos é do botão **coletar** da barra ([abaixo](#-coletar-os-arquivos)).*

abra pelo botão **projeto** da barra (`◖`). o `◗ clique direito` no mesmo botão salva o projeto (se ainda não foi criado pela claquete, abre a janela).

> 📟 *janela projeto*:
>
> ![janela projeto](images/projeto.webp)

## 📍 projeto novo, em etapas

uma tela por vez; **‹ voltar** volta uma etapa.

1. **CLAQUETE** → digite a claquete (ex: `TELA 9 11`, `MAIS VOCE 30 10`). em segundo plano, o padeiro procura a atração no índice do [buscar](acessorista.md) (pelo começo da claquete: o padrão da atração ou o nome) e mostra a atração e o caminho dela.
2. **PASTA** → só aparece quando a claquete combina com mais de uma atração, ou com nenhuma. escolha a atração, **criar nova** (filme inédito, novela nova…) ou **escolher uma pasta…** (o navegador de pastas).
   - **NOVA** → o nome e **dentro de** qual pasta (as pastas das atrações). a pasta da atração nova é criada ao criar o projeto.
3. **FILME** (atrações de filmes) → o título do filme. a lista mostra os filmes parecidos que já existem na pasta da letra; escolha um ou **filme novo**.
   - a letra é a primeira do título, depois do artigo (*Os Três Patetas* → `_T_`); títulos com número vão para `_#_` (*101 Dálmatas*).
   - o `.aep` tem o nome do filme (ex: `NAO NAO OLHE.aep`).
4. **ARQUIVO** (programas, novelas…) → **o que é** (ex: `SERVIÇO`, `CRÉDITOS`, `CHROMA`). o `.aep` é a atração + o que é, sem acentos e caracteres especiais, em maiúsculas (ex: `MAIS VOCE SERVICO.aep`). uma atração pode ter vários projetos.
   - embaixo aparecem os `.aep` que já estão na `01 PROJETOS` da atração, o último alterado primeiro, com a data (`hoje 14:32`, `ontem 09:10`, `28/10`).
   - já existe um com o mesmo nome → **abrir o existente** ou **salvar como … 2**.
5. **CRIAR** → o cartão azul mostra a estrutura e o arquivo: `01 PROJETOS` com o `.aep`, `02 ARQUIVOS` com `FONTS`, `IMAGENS` e `VÍDEOS`, e `03 SAIDA` (a pasta de projetos que já existe aparece mais clara). **Criar projeto** cria as pastas que faltam e salva o `.aep`. `AUDIOS` e `DADOS` o [coletar](#-coletar-os-arquivos) cria quando o projeto usar áudio ou dados.

> 🚩 *obs:* se a pasta da atração já tem uma pasta de projetos (`01 PROJETOS`, `01PROJETOS`, `PROJETOS`…), ela é usada.

a **claquete**, o **designer**, a **atração** e a **pasta** ficam gravados **no próprio projeto** (metadados XMP: `dc:identifier`, `dc:creator`, `dc:coverage` e `dc:relation`).

## 📍 editor

ao abrir a janela com um projeto criado pela claquete:

- **claquete** e **designer** (bonequinho) → o designer vazio vale o da [configuração > meu usuário](producoes.md#-meu-usuário) (por padrão, o usuário do computador, completo).
- **pasta** → a atração e o caminho do projeto.
- **trocar pasta…** → move o `.aep` para outra pasta.
- **Salvar** → grava os campos e salva o projeto.

abrir outro projeto troca os dados da janela.

## 📍 coletar os arquivos

o botão **coletar** da barra varre o projeto, copia as mídias usadas (vídeos, sequências de imagens, imagens, áudio, dados e fontes) para a estrutura do projeto, troca os caminhos para as cópias e salva o projeto. detalhes na [barra](../README.md#coletar).

## 📍 menu ⋯

- **novo projeto pela claquete** → começa as etapas de novo.
- **abrir a pasta** → no Explorer / Finder.
- **ajuda / documentação** → esta página.
- **recarregar painel**
