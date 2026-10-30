# 🔎 O ACESSORISTA

[← O PADEIRO](../README.md)

o painel **O ACESSORISTA**: as buscas do padeiro, em duas abas (caminhos e textos).

a janela abre com 720 px de largura e baixa: sem uma busca, ela mostra só o cabeçalho (o loader e os avisos aparecem sobre o degradê). a folha branca com os resultados entra quando você pesquisa. a cada busca ela se ajusta sozinha: alarga para os toggles caberem numa linha e os caminhos aparecerem inteiros (até 70% da largura da tela; ela nunca estreita sozinha) e ajusta a altura para caber os resultados (até 85% da altura da tela; passando disso, a lista rola).

### caminhos

> <img src="images/acessorista-caminhos.webp" alt="busca de caminhos" width="420">

`◖ clique esquerdo` em **buscar**, na barra. pesquise por atração, projeto, output ou caminho (a partir de 2 caracteres) e abra as pastas direto no Finder / Explorer.

- **categorias** → TEAMS, TRELLO, SERVIDOR... cada uma tem um interruptor para entrar ou sair da busca.
- **⋯** → ajuda (esta página) e recarregar o painel.
- **pastinhas** (à direita do nome da atração) → a com documento abre a pasta de projeto; a com quadro de filme, a de output.
- **caminho** → aparece em breadcrumb: clique em qualquer pasta para abri-la. a pasta que contém o termo buscado fica destacada em amarelo. quando o caminho não cabe, as pastas iniciais saem (com '*…*'); a última e a destacada ficam sempre.
- **atualizar** (antes dos interruptores) → baixa os caminhos de novo.

> 🚩 *obs:*\
> • os caminhos vêm de um workflow e ficam em cache por 30 segundos, para trazer sempre os caminhos mais atuais do Teams. sem conexão, o último índice salvo é usado.\
> • no macOS, os volumes de rede necessários são montados ao abrir uma pasta.\
> • aparecem no máximo 60 atrações por busca (somando as categorias): refine o termo para ver as demais.

### textos

> <img src="images/acessorista-textos.webp" alt="busca de textos" width="420">

`◗ clique direito` em **buscar**, na barra. o painel lê os textos de todos os layers do projeto e filtra enquanto você digita.

- **APENAS VISÍVEIS** → só layers ligados.
- **IGNORAR ACENTOS** → '*amazonia*' também encontra '*Amazônia*' (ligado por padrão).
- **INVERTER** → layers que **não** contêm o termo.
- clique em um resultado → abre a comp com o layer selecionado, no tempo em que o texto aparece.
- **atualizar** (antes dos interruptores) → lê o projeto de novo (depois de alterar os textos).

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
