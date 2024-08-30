# 📓 INTEGRADA

> 📑 ***INTEGRADA.aet***

> 📂 **pastas:**\
> • **marcas** → `\\10.228.183.165\vfx\imagem\drive_l\Fileserver_3\ESPORTES\FUTEBOL\FUTEBOL 2024\CHAMADA PATROCINADORES 2024\02 ARQUIVOS`\
> • **output** → `\\10.228.183.165\vfx\imagem\drive_l\Fileserver_3\ESPORTES\FUTEBOL\FUTEBOL 2024\CHAMADA PATROCINADORES 2024\SAIDAS`

> 🚩 *obs:* a entrega é feita por *link de download*!

---

<br>

> 🎬 *preview:*\
> ![preview](INTEGRADA/preview.gif)

---

<br>

## 📍 funcionamento básico

1. Abra a **comp** '*LOGOS*': Nesta seção, você personalizará as marcas dos patrocinadores.
2. Substitua as imagens: Troque as imagens nos **layers** '*logo 1*' a '*logo 8*' pelas logos dos patrocinadores.
3. Ajuste a ordem: Arraste os **layers** para cima ou para baixo para mudar a ordem em que as marcas aparecem na animação.
4. Desabilite logos não usados: Se você tiver menos de 8 patrocinadores, desative os **layers** de logo que não serão utilizados.
5. Edite os controles disponíveis na janela de '*Controle de Efeitos*' de cada marca:\
  Cores: Se a opção '*Cores Livres*' estiver habilitada, você poderá personalizar as cores das artes laterais da marca.
  Escala: Ajuste o tamanho de cada marca na chamada.
1. Ajuste a duração da animação:\
  Abra a **comp** '*PATROCINADORES FUT 2024*'.
  Utilize os marcadores na **timeline** como guia para definir o fim da animação.
  O template acomoda de 6 a 8 marcas.
1. Renomeie a **comp** principal:
  Dê um novo nome para a **comp** '*PATROCINADORES FUT 2024*'.
  Adicionando um '*_*' (underline) seguido da data de início e fim do período de vigência da chamada.

> 📋 *exemplo:* "*PATROCINADORES FUT 2024_08-06 A 14-06*".

> 🚩 *obs:* Sempre use **CAIXA ALTA SEM ACENTUAÇÃO** e **SEM CARACTERES ESPECIAIS** para nomear **comps**.

---

<br>

## 📍 parâmetros

Os controles para personalizar as marcas estão localizados nos respectivos **layers** dentro da **comp** '*LOGOS*'. São eles:

### opções da marca

![fx1](<INTEGRADA/opcoes da marca.png>)

- **cores livres** → Ativa a personalização das cores das artes laterais da marca.
- **cores da arte lateral**:

  - **cor 1** → Define a cor que substituirá o preto na arte lateral.
  - **cor 2** → Define a cor que substituirá o branco na arte lateral.

- **escala** → Controla o tamanho da marca.

> 🚩 *obs:* não edite os efeitos a baixo!.

---

<br>

## 🚨 Atenção!

para adicionar uma nova marca:

  1. Abra a **comp** '*LOGOS*': Acesse a composição onde as marcas são gerenciadas.
  2. Duplique um **layer** existente: Escolha um dos **layers** de marca já existentes e duplique-o.
  3. Substitua a imagem: Troque a imagem no **layer** duplicado pela logo da nova marca.
  4. Reordene o **layer**: Mova o novo **layer** para a posição desejada na ordem de exibição das marcas.
  5. Personalize a nova marca na janela de '*Controle de Efeitos*':
  Escala: Ajuste o tamanho da nova logo.
  Cores: Se a opção "Cores Livres" estiver habilitada, você poderá personalizar as cores da arte lateral da nova marca.

---

<br>

## ✨ dicas

ao usar o script **O PADEIRO**:

- Informe a data: Insira a data de vigência da chamada no campo de **input** e clique em **criar**. O script abrirá automaticamente a janela de '*importação de arquivos*'.
- Encontre as imagens: Navegue até a pasta onde estão as logos das marcas.
- Renomeie os arquivos: Para garantir a ordem correta das marcas na animação, adicione um número no início do nome de cada arquivo, indicando a posição desejada.

apos importar as logos as logos o script irá:

  1. organizar as imagens em uma pasta no projeto
  2. substituir as imagens dos **layers** '*logo 1*' a '*logo 8*' na **comp** '*LOGOS*' seguindo a ordem correta das marcas.
  3. desabilitar os **layers** de logo que não serão utilizados.
  4. Ajustar a duração da animação na **comp** '*PATROCINADORES FUT 2024*' para o numero de marcas correto (6 a 8 marcas).

> 📋 *exemplo:*\
> ![busca](<INTEGRADA/importar-marcas.gif>)
