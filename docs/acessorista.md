# 🔎 O ACESSORISTA

[← O PADEIRO](../README.md)

o painel **O ACESSORISTA**: as buscas do padeiro, em duas abas (caminhos e textos).

a janela abre com 720 px de largura e baixa: sem uma busca, ela mostra só o cabeçalho (o loader e os avisos aparecem sobre o degradê). a folha branca com os resultados entra quando você pesquisa. a cada busca ela se ajusta sozinha: alarga para os toggles caberem numa linha e os caminhos aparecerem inteiros (até 70% da largura da tela; ela nunca estreita sozinha) e ajusta a altura para caber os resultados (até 85% da altura da tela; passando disso, a lista rola).

### caminhos

<table><tr><td width="50%"><img src="images/acessorista-caminhos.webp" alt="a busca de caminhos, com as partes numeradas"></td><td><img src="images/anim/acessorista.webp" alt="O ACESSORISTA buscando e trocando para a aba de textos"></td></tr></table>

| | | |
| :---: | --- | --- |
| ❶ | **abas** | **caminhos** e **textos** (o mesmo painel). |
| ❷ | **busca** | atração, claquete, quem mandou, projeto, output ou caminho (a partir de 2 caracteres). |
| ❸ | **fontes da busca** | liga e desliga cada uma: servidor, atrações, filmes, Teams e Trello. a seta relê o índice. |
| ❹ | **resultados** | o ícone diz de onde vem; o trecho achado fica marcado. clique para abrir a pasta. |


`◖ clique esquerdo` em **buscar**, na barra. pesquise por atração, claquete, quem mandou, projeto, output ou caminho (a partir de 2 caracteres) e abra as pastas direto no Finder / Explorer.

os resultados vêm sem títulos de seção: o ícone de cada item diz de onde ele vem.

| ícone | de onde | o que mostra | o clique |
| --- | --- | --- | --- |
| servidor | **servidor** (caminhos fixos) | o nome e a linha **CAMINHO** | — |
| TV de tubo | **atrações** | o nome e as linhas **PROJETO** e **OUTPUT** | — |
| película | **filmes** | o título, o ano de produção entre parênteses e a linha **OUTPUT** | — |
| balão | **Teams** (últimos 30 dias) | quem mandou - cargo, quando (hoje, ontem, o dia da semana até 6 dias atrás ou a data, com a hora) e, embaixo, o caminho da mensagem | o balão abre a mensagem no Teams |
| quadro do Trello | **Trello** (últimos 15 dias) | cards em grade: a claquete, o redator e o editor | o card abre no Trello |

- **como a busca compara** → sem acentos, maiúsculas e pontuação, sempre a partir do começo de uma palavra: '*não*' acha '*NAO APAGAR*', mas não '*an**NA - O***'; '*3/11*' acha '*3/11*' e '*3 11*', mas não '*31/10*'.
- **apelidos das atrações** → quando o que você digita é o começo do nome ou de um *pattern* de uma atração (com 3 letras ou mais), a busca também procura os outros nomes dela: '*GREP*' ou '*G REP*' trazem também o que tem **GLOBO REPORTER** e **G REPORTER** (mensagens, cards, pastas). em cima dos resultados aparece '*também: Globo Repórter*'.
- **interruptores** (ao lado do atualizar) → **SERVIDOR**, **ATRAÇÕES**, **FILMES**, **TEAMS** e **TRELLO** (a mesma ordem dos resultados): desligado, a categoria sai da busca (só aparecem as que têm itens). a escolha fica ao atualizar. no índice local não há interruptores: no lugar, de onde vêm os caminhos.
- **⋯** → ajuda (esta página) e recarregar o painel.
- **caminho** → aparece em breadcrumb: clique em qualquer pasta para abri-la. a pasta que contém o termo buscado fica destacada em amarelo. quando o caminho não cabe, as pastas iniciais saem (com '*…*'); a última e a destacada ficam sempre.
- **atualizar** (o botão redondo, abaixo da busca) → baixa os caminhos de novo (no índice local, indexa as pastas de novo). ao lado dele aparece de onde vêm os caminhos no índice local ('*índice local · 18.430 itens · hoje 09:12*') ou o andamento da indexação.

### índice local

em vez do webhook, cada computador pode ter o seu **índice local** ([configuração > buscar](producoes.md#-buscar), embaixo, em **neste computador**): as pastas escolhidas e todas as subpastas, lidas pelo painel e guardadas no computador. a busca procura pelo **nome** de cada pasta (ícone de pasta, nome e a linha **CAMINHO**) e mostra também os caminhos fixos do servidor. funciona sem rede.

- a última indexação aparece na hora; ela é refeita quando as pastas mudam, uma vez por dia (se ligado) ou no **atualizar**. enquanto indexa, a busca continua com o índice anterior.
- a janela [PROJETO](projeto.md) procura a claquete pelo nome das pastas: vale a pasta cujo nome é o começo da claquete (*MAIS VOCE* para *MAIS VOCE 30 10*). acerta menos que as atrações do webhook (sem os *patterns*).

> 🚩 *obs:*\
> • os caminhos vêm do workflow **PROMO - BUSCAR**, que já devolve o índice pronto (com as mensagens do Teams mais recentes). o painel baixa sozinho, em segundo plano, sem travar o After Effects: a cópia salva aparece na hora e é trocada quando a resposta chega. sem conexão (ou no modo local), vale a cópia salva.\
> • o endereço do workflow e os caminhos fixos do servidor ficam na [configuração > buscar](producoes.md#-buscar).\
> • no macOS, os volumes de rede necessários são montados ao abrir uma pasta. no Windows, os caminhos do Mac (`/Volumes/...`) são convertidos pelo mapa da [configuração > rede](producoes.md#-rede).\
> • aparecem no máximo 20 itens por categoria (24 cards do Trello): refine o termo para ver os demais.

### textos

> <img src="images/acessorista-textos.webp" alt="busca de textos" width="420">

`◗ clique direito` em **buscar**, na barra. o painel lê os textos de todos os layers do projeto e filtra enquanto você digita.

- **APENAS VISÍVEIS** → só layers ligados.
- **IGNORAR ACENTOS** → '*amazonia*' também encontra '*Amazônia*' (ligado por padrão).
- **INVERTER** → layers que **não** contêm o termo.
- clique em um resultado → abre a comp com o layer selecionado, no tempo em que o texto aparece.
- **atualizar** (antes das opções) → lê o projeto de novo (depois de alterar os textos).

> 🚩 *obs:*\
> • a busca ignora maiúsculas e minúsculas, e caracteres como `(`, `.` ou `?` não têm significado especial.

<br>

---

<br>

## 📍 teclado

| tecla | o que faz |
| --- | --- |
| `↓` (na busca) | vai para o primeiro resultado |
| `↑` `↓` | andam nos resultados; `↑` no primeiro volta para a busca |
| `Enter` | abre (pasta, comp ou layer) |
| `Ctrl/Cmd+C` | copia o caminho ou o texto do resultado em foco |
| `Esc` | nos resultados, volta para a busca; na busca, limpa |
| `Ctrl/Cmd+F` | foca a busca da aba |
| `←` `→` (nas abas) | trocam de aba |
