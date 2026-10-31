# 🎬 projeto

[← O PADEIRO](../README.md)

a janela **O PADEIRO projeto** guarda o **ID** e o **nome** do projeto aberto, descobre a **retranca** pelo começo do ID e, com ela, a pasta onde o projeto é salvo, com o nome padronizado.

> 🚩 *o collect dos arquivos é do botão **coletar** da barra ([abaixo](#-coletar-os-arquivos)).*

abra pelo botão **projeto** da barra (`◖`). o `◗ clique direito` no mesmo botão salva o projeto direto na pasta da retranca, sem abrir a janela.

> 📟 *janela projeto*:
>
> ![janela projeto](images/projeto.webp)

## 📍 dados do projeto

- **ID** (`#`) → o código do projeto, em maiúsculas e sem espaços (ex: `EMP123456`). as primeiras letras indicam a retranca.
- **sigla** (bonequinho) → a sua sigla, usada na variável `{usuario}`. fica só neste computador; vazia, vale a padrão (as 3 primeiras letras do usuário do sistema).
- **nome do projeto** → como você quiser escrever: os acentos e a caixa seguem o formato da aba **renomear** da configuração.

o ID e o nome ficam gravados **no próprio projeto** (metadados XMP, `dc:identifier` e `dc:title`), um instante depois de digitar. abrir outro projeto troca os dados da janela. projetos feitos na barra antiga da PROMO GNEWS usam os mesmos campos: abrem aqui com o ID e o nome.

## 📍 retranca e pasta

o cartão azul mostra a **retranca** encontrada (o código e o nome da pasta) e o **caminho**:

- projeto ainda não salvo → a pasta onde ele vai ser salvo (em azul).
- projeto já salvo → onde ele está; se o destino mudou (outro ID), o novo aparece embaixo, em azul.

a pastinha à direita abre a pasta do projeto (ou, antes de salvar, a mais próxima do destino que já existe).

> 🚩 *obs:* sem retranca para o ID, o projeto vai para a pasta dos projetos. sem pasta dos projetos configurada, '*Salvar projeto*' pede uma pasta.

## 📍 nome do arquivo

a linha **arquivo** mostra o nome do `.aep`, pelo padrão da [configuração > projeto](producoes.md#-projeto) (ex: `{id} {projeto}` → `EMP123456 historia ao vivo.aep`).

## 📍 salvar projeto

salva o projeto na pasta mostrada no cartão, com o nome do **arquivo**. com '*uma pasta para cada projeto*' (configuração), cria uma pasta com o mesmo nome.

- já existe um projeto com o mesmo nome na pasta → o padeiro avisa; clique de novo em '*Salvar projeto*' (logo em seguida) para substituir. salvar de novo o próprio projeto não pergunta.
- **⋯ > salvar em outra pasta…** → escolhe a pasta na hora (a pasta do projeto é criada dentro dela).
- ao salvar, a pasta abre no Explorer / Finder.

## 📍 coletar os arquivos

depois de salvo, o botão **coletar** da barra copia os arquivos usados para a pasta do projeto (vídeos, sequências de imagens, imagens, áudio, dados e fontes), na árvore da [configuração > coletar](producoes.md#-coletar), e troca os caminhos no projeto. detalhes na [barra](../README.md#coletar).

## 📍 menu ⋯

- **salvar em outra pasta…**
- **configuração do projeto** → abre a configuração na aba **projeto**.
- **ajuda / documentação** → esta página.
- **recarregar painel**
