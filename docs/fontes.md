# 🔤 fontes

o padeiro cuida das fontes dos projetos sozinho: as fontes de cada projeto aberto vão para um **banco de fontes** na rede e para a **pasta de fontes do projeto** (`02 ARQUIVOS/FONTS`), em segundo plano, sem travar o After Effects. quando falta uma fonte, o botão **fontes** da barra resolve.

> requer o After Effects 2024 ou mais novo.

<br>

## 📍 banco de fontes

a pasta do banco fica na [configuração > fontes](producoes.md). nela, cada fonte é guardada pelo nome PostScript (`GloboSans-Bold.otf`), com um `.json` ao lado: família, estilo e as versões (quem enviou, de que computador e projeto, quando).

- **o envio** → enquanto a barra está aberta, as fontes usadas no projeto aberto que ainda não estão no banco (ou na pasta de fontes do projeto) são copiadas, uma por vez. vale para todas: as instaladas, as do sistema e as do Adobe Fonts.
- **outra versão** → um arquivo diferente com o mesmo nome PostScript vai ao lado, com a data no nome (`GloboSans-Bold@20261106-1402.otf`): nada é sobrescrito, e a mais recente é a que instala.
- **neste computador** → dá para desligar o envio das fontes deste computador (configuração > fontes, embaixo). instalar a partir do banco continua valendo.
- nada sobe em massa: o banco cresce com as fontes dos projetos que são abertos.

<br>

## 📍 o botão fontes (barra)

a bolinha no botão:

- 🟠 **laranja** → falta algo: uma fonte que não está neste computador, ou que ainda não está no banco ou na pasta do projeto (o envio está a caminho). o balão diz quantas e o quê.
- 🟢 **verde** → todas instaladas, no banco e na pasta do projeto.

`◖ clique esquerdo` → **resolver**. com todas as fontes instaladas, só avisa que está tudo ok (sem erro, mesmo sem banco ou sem pasta de fontes). faltando alguma: instala primeiro da pasta de fontes do projeto (poucas e perto, o mais rápido) e, o que ainda faltar, do banco; a que não for achada em nenhum dos dois abre a janela de fontes, para trocar.

`◗ clique direito` → a janela de **fontes do projeto**.

<br>

## 📍 fontes do projeto (janela)

no topo, o projeto e quantas fontes e layers. uma linha por fonte: o nome, quantos layers usam, a amostra escrita na própria fonte e o estado (o ícone; o texto no balão):

| | estado | o que acontece |
|---|---|---|
| ✓ | ok | instalada, no banco e na pasta do projeto |
| ↑ | enviando | instalada, a caminho do banco ou da pasta do projeto |
| ↓ | instala do banco | não está neste computador, mas está no banco: **Resolver** instala |
| ✕ | sem arquivo | não está neste computador nem no banco: escolha outra para trocar |

- **trocar** → clique na linha: abre a busca (só os nomes, rápida) com as **sugestões** (a troca que a equipe já usou para essa fonte e a mesma família, o peso mais perto primeiro), as que estão **no banco** (instalam ao trocar) e as **instaladas**. embaixo, a prévia da fonte marcada. a fonte sem arquivo já abre assim, com a sugestão escolhida; apagar o campo desfaz a troca.
- **Resolver** → instala as que faltam (primeiro da pasta de fontes do projeto, depois do banco, e as escolhidas que estão só no banco) e troca as escolhidas no projeto inteiro, de uma vez (um `Ctrl/Cmd+Z` desfaz). a troca fica lembrada no banco: da próxima vez que a mesma fonte faltar, em qualquer computador, ela já vem como sugestão.
- **andamento** → com a janela aberta, a seta do estado anima: sobe enquanto a fonte é copiada para o banco e a pasta do projeto, desce enquanto é instalada.
- **a pasta com o T (canto esquerdo do rodapé)** → copia todas as fontes do projeto para uma pasta qualquer (o collect das fontes).
- **⋯** → abrir o banco, ajuda e recarregar.

> 🚩 *obs:*\
> • uma fonte recém-instalada pode demorar um instante para o After Effects enxergar: se a troca disser "a fonte nova ainda não está instalada", clique em **Resolver** de novo.
