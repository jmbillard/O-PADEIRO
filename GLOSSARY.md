# O PADEIRO

As ferramentas da equipe de arte da promo dentro do After Effects: dos templates às pastas e projetos das peças
de cada atração.

## Language

### O padeiro

**Barra**:
O painel do padeiro acoplado no After, com as ferramentas.

**Ferramenta**:
Um botão da barra, com uma ação no clique esquerdo e, às vezes, outra no direito.

**Gaveta**:
Um botão da barra que junta ferramentas (Templates, Projeto, Organização).

**Apelido**:
O nome de ofício de uma janela ou ferramenta (A FORMA, O PROJETISTA…), usado nos títulos e nas dicas.

**Configuração**:
A janela onde a equipe e cada designer ajustam o padeiro (apelido: O PRODUTOR).

**Da equipe**:
O que vale para todos, guardado na rede (as produções, os tipos de projeto, a regra do renomear…).
_Avoid_: global

**Deste computador**:
O que vale só para um computador (a aparência, o layout da barra, o designer, o modo local…).
_Avoid_: local (é do modo local e do output local)

**Bolinha**:
O sinal na ferramenta que diz se está tudo certo (verde) ou se falta algo (laranja).

### A equipe

**Designer**:
A pessoa da equipe que faz as peças, identificada pela sigla (JMBILLARD); quem cria e quem salva os projetos.
_Avoid_: usuário

**Login**:
O usuário do sistema da máquina, usado para reconhecer o designer quando a sigla não foi informada.

### Atrações e o que vai ao ar

**Atração**:
Um programa, novela, show, evento ou outro conteúdo com identidade visual própria, para o qual a equipe produz
peças (DOMINGÃO COM HUCK, TELA QUENTE).
_Avoid_: programa (quando o tipo não importa)

**Atração nova**:
Uma atração que ainda não está no índice da busca. Ao criar o projeto dela, a janela de projeto cria as pastas e o
`.aep` e pede o cadastro dela no banco das atrações.

**Banco das atrações**:
Onde a equipe guarda as atrações, os cards e a relação de cada designer com os nomes dele no Teams e no Trello. O
padeiro não o lê direto: lê o índice da busca e pede as mudanças ao n8n.

**Webhook do projeto**:
O webhook do n8n que a janela de projeto avisa, em segundo plano, quando cria o projeto de uma atração nova, para
cadastrá-la no banco das atrações. Fica na configuração da equipe, na aba TIPOS DE PROJETO; vazio, nada é enviado.

**Tipo**:
A classe de uma atração que decide onde ficam as pastas dela: PROGRAMA, NOVELA, VT, FILME…
_Avoid_: categoria

**Tipo fixo**:
Um tipo que é ele mesmo a atração (MOOD MENSAL, CARNAVAL): o nome dele leva direto à pasta do projeto, sem uma
atração no meio.

**Quadro**:
Qualquer subdivisão de uma atração com pasta própria, em qualquer nível (DANÇA DOS FAMOSOS, uma semana, um
especial).
_Avoid_: subpasta, seção

**Filme**:
O conteúdo que uma atração exibe (o filme ENCANTO na TELA QUENTE). Tem identidade visual própria, e as peças dele
seguem a identidade do filme, não a da atração que o exibe.
_Avoid_: título (para o filme em si)

**A produzir**:
Um filme recente que ainda não tem a pasta do projeto. O contrário é **já tem projeto**.

**Sessão**:
Uma atração que exibe filmes (TELA QUENTE, CORUJÃO, SUPERCINE). Tem identidade própria, diferente da de cada filme
que exibe.
_Avoid_: faixa

### As peças

**Peça**:
Cada entrega com render final próprio (uma chamada, a versão de 15s dela, a de cada convidado). Um projeto costuma
gerar várias.
_Avoid_: arte, VT (para a entrega)

**Card**:
O pedido de trabalho no Trello, com a claquete no título. Um card pode virar várias peças.
_Avoid_: tarefa, ticket (para o pedido da equipe), card de produção

**Claquete**:
O texto que identifica uma peça, como vem no card do Trello ou no Teams (`DOMINGAO 25/11`).
_Avoid_: claquete para a janela de projeto

**O que é**:
A parte do nome que diz qual peça é (SERVIÇO, CHAMADA, CONVIDADO), num projeto ou num template.
_Avoid_: peça (para esse campo), nome do template; formato (é o do renomear)

**Janela de projeto**:
A janela do painel onde se escolhe a atração (ou o filme, ou o card), a pasta do projeto e o **o que é**, e se cria ou
abre o projeto. O apelido dela é O PROJETISTA.
_Avoid_: claquete, A CLAQUETE, wizard

### Pastas e arquivos

**Projeto**:
O arquivo `.aep` de uma peça.
_Avoid_: projeto para a pasta

**Pasta do projeto**:
A pasta com a estrutura da equipe (`01_PROJETOS`, `02_ARQUIVOS`, `03_SAIDA`…) de uma atração, quadro ou filme, onde
ficam os projetos e o que eles usam.
_Avoid_: projeto

**Já na pasta**:
Os projetos que já existem na pasta do projeto escolhida; escolher um faz a janela abrir esse projeto em vez de criar
outro.

**Pasta antiga sem ano**:
A pasta de um filme criada antes de o ano de produção entrar no nome (`NAO NAO OLHE`), que continua valendo para o
mesmo filme.

**Output**:
A pasta de entrega na rede, fora da pasta do projeto, para onde vai o render final.
_Avoid_: saída

**Saída**:
A pasta `03_SAIDA`, dentro da pasta do projeto, com os renders para avaliação e os previews.
_Avoid_: output

**Output local**:
A pasta deste computador para onde vai o render quando o output da rede não está acessível.
_Avoid_: pasta de saída

### Projeto aberto

**Dados do padeiro**:
O que o padeiro guarda dentro do projeto: a atração, o quadro, o "o que é", o designer que criou, quem salvou, a pasta
do projeto e o output.

**Estrutura padrão**:
As pastas da equipe dentro da pasta do projeto (`01_PROJETOS`, `02_ARQUIVOS`, `03_SAIDA`, `04_REFS`, `05_EXTERNOS`).

**Coletar**:
Copiar para a estrutura padrão os arquivos que o projeto usa, religar e salvar (apelido da janela: O CATADOR).
_Avoid_: collect

**Migrar**:
Arrumar uma pasta de projeto antiga na estrutura padrão, com os projetos de dentro religados.

**Banco de fontes**:
A pasta da equipe na rede com as fontes que os projetos usam.

**Resolver** (as fontes):
Instalar as fontes que faltam no projeto, pela pasta de fontes do projeto e depois pelo banco de fontes.

**Organizar**:
Arrumar o painel Project do After nas pastas da equipe e pôr as etiquetas (apelido da janela: O CONTRARREGRA).

**Etiqueta**:
O comentário de um item do painel Project que diz o que ele é (EXPORTAR, TEMPLATE, FUNDO…).
_Avoid_: comentário (para a etiqueta)

**Render final**:
O render que vai para o output.

**Preview**:
O render de avaliação, que vai para a saída; também a imagem ou o vídeo que mostra um template na lista.

### Templates

**Template**:
Um projeto modelo (`.aep` ou `.aet`) com os arquivos que andam junto com ele (a configuração, o preview, as fontes e o
script), de onde saem as versões.
_Avoid_: modelo, base; template para a comp ou para o preset do After

**Comp principal**:
A comp do template que é duplicada e preenchida a cada versão.
_Avoid_: template (para a comp)

**Produção**:
Uma frente de trabalho (DIA-A-DIA, um evento) com nome, ícone e uma pasta de templates.
_Avoid_: lista

**Pasta de templates**:
A pasta de uma produção, onde ficam os templates dela.

**Versão**:
Cada comp criada a partir de um template (ou de uma comp), com o seu texto (ANA MARIA, JOÃO GOMES).
_Avoid_: item, duplicata, cópia; versão sozinha para o After Effects

**Preencher**:
Gerar versões de um template a partir do input.
_Avoid_: gerar, A FORMA (para a ação)

**Duplicar**:
Gerar versões da comp aberta, sem template, a partir do input.
_Avoid_: preencher (para isso), A FORMINHA (para a ação)

**Criar** (um template):
Fazer um template novo a partir da comp aberta.
_Avoid_: A FORMA (para a ação)

**Importar**:
Trazer um template ou um `.aep` para o projeto aberto, como está, sem preencher.

**Input**:
O texto digitado para preencher um template, com os blocos de todas as peças.
_Avoid_: input para um campo ou um layer

**Bloco**:
O texto de uma peça no input, separado dos outros por uma linha vazia (ANA MARIA / APRESENTADORA). Cada bloco gera
uma versão por variação de layout.
_Avoid_: item, entrada

**Campo**:
Cada parte de um bloco que vai para um layer editável (o nome, o cargo).
_Avoid_: informação, input

**Layer editável**:
Um layer do template que recebe um campo.
_Avoid_: input

**Variação de layout**:
Uma opção de layout do template; cada bloco gera uma versão por opção.

**Layer de nome**:
O último layer de texto de uma comp, chamado `script_template_name`, cujo texto vira o nome da versão.

**Fila de render**:
As versões postas para renderizar no After, cada uma com um preset de render e o output.

**Registro de uso**:
A linha gravada a cada preenchimento: quando, a produção, o template, quantas versões, quem e o projeto.
_Avoid_: log, telemetria (para a linha)

**Preset de render**:
A configuração de saída do After escolhida para a fila de render (H.264, ProRes…).
_Avoid_: template de output

**Versão do After**:
O After Effects em que um projeto foi salvo (After 2025, After 2026).
_Avoid_: versão (sem "do After")

### Renomear

**Regra do renomear**:
A regra da equipe para o nome de comps, pastas do projeto, outputs da fila e arquivos: o prefixo do formato, a caixa,
o separador e os nomes fixos.

**Renomear**:
Aplicar a regra do renomear a um alvo, dito junto: as comps, os outputs da fila ou os arquivos.

**Formato**:
A classe de uma peça ou de um arquivo no renomear (RODAPÉ, CRÉDITO, VINHETA), reconhecida pelos termos dela no nome.
_Avoid_: tipo (é o da atração), tipo de peça

**Prefixo do formato**:
A sigla do formato que abre o nome (RDP, CRT).
_Avoid_: prefixo do tipo

**Nome fixo**:
Um nome que a regra do renomear sempre escreve do mesmo jeito (LOGO GLOBO).

**Arquivista**:
O painel que renomeia os arquivos e as pastas de uma pasta, pela regra do renomear.

**Item**:
Cada arquivo, pasta ou sequência de imagens da lista do arquivista.
_Avoid_: item para versão ou bloco

**Sequência de imagens**:
Os quadros de uma animação salvos como imagens numeradas, tratados como um item só.

**Religar**:
Trocar no projeto o caminho de um arquivo para o lugar novo dele, porque foi renomeado, movido ou achado.
_Avoid_: relinkar

### Busca

**Acessorista**:
O painel do botão Buscar, com a busca de caminhos e a busca nos textos.

**Busca de caminhos**:
A busca das pastas e dos pedidos da equipe pelas origens: caminhos fixos, atrações, filmes, Teams e Trello.
_Avoid_: busca (sozinha) para as outras buscas

**Busca nos textos**:
A busca nos textos dos layers do projeto aberto.

**Origem**:
Cada origem de resultados da busca de caminhos (caminhos fixos, atrações, filmes, Teams, Trello), que dá para ligar e
desligar.
_Avoid_: categoria, fonte (é a tipografia)

**Caminho fixo**:
Uma pasta da equipe que sempre aparece na busca de caminhos, cadastrada na configuração (#INGEST, BASES VALENDO).
_Avoid_: servidor (para a fonte)

**Índice da busca**:
O conjunto de atrações, filmes, cards do Trello e mensagens do Teams com caminhos, montado pela equipe e baixado pelo
painel.
_Avoid_: cache, base

**Cópia**:
O índice da busca salvo no computador, que vale enquanto um novo não chega e quando não há rede.
_Avoid_: cache

**Mensagem do Teams**:
Uma mensagem de um chat do Teams que cita um caminho, com quem mandou, o cargo e quando.

**Mapa de drives**:
A tabela da equipe que liga cada letra de drive do Windows ao caminho de rede, para os caminhos valerem no Mac e no
Windows.

**Modo local**:
Trabalhar sem a rede da equipe: a busca usa só a cópia ou o índice local, e o que iria para a rede vai para o output
local.

**Índice local**:
O índice montado por um computador com as pastas que ele escolheu, no lugar do índice da busca.

### PROMeiro

**PROMeiro**:
A ferramenta da equipe que recebe os roteiros e manda as Produções para o Trello. O endereço dele fica na configuração
da equipe (aba BUSCAR); vazio, nada fala com ele e tudo continua pelo n8n.

**Chave do Padeiro**:
O que identifica este computador no PROMeiro: pedida sozinha na primeira vez (o login, o nome do computador, o sistema
e a sigla), guardada na configuração deste computador (`computador_promeiro.json`, na pasta de dados), **pendente**
até um administrador ligar a um designer. Ligada, o grupo NO TRELLO vem das Produções do PROMeiro; pendente, revogada
ou sem rede, do webhook.
_Avoid_: senha, token (para a chave)

**Aviso do Padeiro**:
O que o Padeiro manda ao PROMeiro quando o projeto é aberto ou criado pelo card ou pela Produção do NO TRELLO, ou por
um filme: o PROMeiro faz o mesmo que o **Peguei** (o designer da chave entra no card e na Produção). Leva a hora da
abertura e um identificador, para o repetido não gravar de novo. Só com a chave ligada; o webhook do projeto (o n8n)
continua a ir, com ou sem a chave.
_Avoid_: webhook do projeto (para o aviso: é a rota do n8n)

**Fila dos avisos**:
Os avisos do Padeiro (e as ações da janela PROMeiro · produções) ainda não entregues, no `promeiro-fila.json` da pasta
de dados: o aviso entra nela primeiro e sai quando o PROMeiro responde. Sem rede, ou com o PROMeiro fora do ar, fica e
vai de novo ao abrir a barra ou O PROJETISTA e, com a barra aberta, a cada 3 minutos.
_Avoid_: pendências (para a fila)

**Janela PROMeiro · produções**:
O painel acoplável com as Produções do PROMeiro dentro do After, no visual do PROMeiro: a lista (Entrada, Produzindo,
Minhas) e a Produção aberta, com Abrir projeto, Preencher templates, as artes, o fogo e Entreguei.

### Apelidos

| ferramenta / janela | apelido |
| --- | --- |
| a barra | O PADEIRO |
| preencher | A FORMA |
| duplicar | A FORMINHA |
| criar (template) | O CONFEITEIRO |
| janela de projeto (Iniciar / Alterar) | O PROJETISTA |
| fontes | O TIPÓGRAFO |
| coletar | O CATADOR |
| render | O FORNO |
| renomear (comps e outputs) | O ETIQUETADOR |
| organizar | O CONTRARREGRA |
| arquivos | O ARQUIVISTA |
| importar AEP (versões do After) | O VERSIONADOR |
| pastas (e o conversor de caminhos) | O ADAPTADOR |
| buscar | O ACESSORISTA |
| configuração | O PRODUTOR |

## Relationships

- Uma **atração** é de um **tipo**; o tipo decide onde fica a **pasta do projeto** dela.
- Uma **sessão** é uma atração que exibe **filmes**; a peça de um filme segue a identidade do filme, e o **projeto**
  dela fica na pasta do filme, seja qual for a sessão que o exibe.
- A pasta do projeto de um **filme** leva o ano de produção do filme (`NAO NAO OLHE (2022)`), menos a **pasta antiga
  sem ano**, que continua valendo.
- Um **card** traz a **claquete** e pode virar várias **peças**; um **projeto** costuma gerar várias peças.
- Um **card** só aponta a **atração** (e, no **tipo fixo**, o mês); o **projeto** não guarda nada do card.
- O **output** das versões vem do **template**; quando o **projeto** ainda não tem output, ele passa a ser o do template.
- Uma **produção** tem uma **pasta de templates** e reúne os **templates** dela; cada template gera **versões** a partir da
  **comp principal**.
