# O Padeiro

A extensão do After Effects da equipe de arte da Globo Promo: cria e organiza os projetos (pastas, `.aep`,
output), preenche templates e cuida das fontes e das mídias. O host é ExtendScript (ES3, trava o After); o painel
tem Node.

## Projetos

**A Claquete**:
A janela PROJETO: escolhe a atração (ou o filme, ou o card do Trello), a pasta e o "o que é", e cria ou abre o `.aep`.
_Evitar_: janela de projeto, wizard

**Atração**:
O que ganha claquete própria (programa, novela, show, lançamento de filme…), com a pasta de projetos e a de output,
vinda do índice da busca.
_Evitar_: programa (como conceito geral)

**Tipo (de projeto)**:
Uma categoria da aba PROJETO da configuração (PROGRAMAS, NOVELA, FILME, MOOD MENSAL…) com o caminho por tokens
(`{atracao}`, `{ano}`, `{letra}`, `{proximo_mes}`…), o output e, às vezes, o nome do `.aep`.
_Evitar_: categoria (nome antigo, ainda aceito no token `{categoria}`)

**Tipo fixo**:
O tipo sem `{atracao}` no caminho, que é a própria atração (MOOD MENSAL, CARNAVAL): digitar o nome leva direto à
pasta da regra.

**O que é**:
O complemento do nome do `.aep` depois da atração (`SERVIÇO`, `CHAMADA`, `TEASER`).
_Evitar_: sufixo, descrição

**Já na pasta**:
Os `.aep` que já estão na pasta de projetos; marcar um troca "Criar projeto" por "Abrir projeto".

**Pasta antiga sem ano**:
A pasta de filme criada antes da regra do ano (`NAO NAO OLHE`), que continua valendo para o mesmo título.

## Filmes e cards

**Filme**:
Um título da grade que passa numa sessão (Tela Quente, Corujão…), com o ano de produção na pasta e no `.aep`
(`NAO NAO OLHE (2022)`), na pasta da letra (`FILMES/TITULOS/_N_`).

**A produzir / Já tem projeto**:
As etiquetas do filme recente: sem a pasta do filme ainda, ou com ela.

**Card do Trello (na claquete)**:
O card novo (últimos 7 dias, não finalizado) de uma atração, que aparece no grupo NO TRELLO. Ele só aponta a
atração (e, no tipo fixo, o mês); o projeto não guarda nada dele.
_Evitar_: card de produção

## Busca

**Índice da busca**:
O JSON do webhook do BUSCAR (n8n) com as atrações, os filmes, os cards do Trello e as pastas citadas no Teams,
guardado pelo acessorista e renovado de 10 em 10 min.
_Evitar_: cache (sozinho), base

**Acessorista**:
O painel da busca de caminhos (as pastas das atrações, do Teams e do Trello).

## PROMeiro

**Chave do Padeiro**:
O que identifica este computador no PROMeiro: pedida sozinha na primeira vez (usuário do computador, computador,
sistema e sigla), guardada no `promeiro.json` da pasta de dados, **pendente** até um administrador ligar a um designer.
Ligada, o grupo NO TRELLO vem das Produções do PROMeiro; pendente, revogada ou sem rede, do webhook.
_Evitar_: token, senha, login

**Aviso do Padeiro**:
O que o Padeiro manda ao PROMeiro quando o projeto é aberto ou criado pelo card ou pela Produção do NO TRELLO, ou por
um filme: o PROMeiro faz o mesmo que o **Peguei** (o designer da chave entra no card e na Produção). Leva a hora da
abertura e um identificador, para o repetido não gravar de novo. Só com a chave ligada.
_Evitar_: webhook do projeto (é a rota do n8n)

**Fila dos avisos**:
Os avisos do Padeiro ainda não entregues, no `promeiro-fila.json` da pasta de dados: o aviso entra nela primeiro e sai
quando o PROMeiro responde. Sem rede, ou com o PROMeiro fora do ar, fica e vai de novo ao abrir a barra ou a claquete
e, com a barra aberta, a cada 3 minutos.
_Evitar_: cache, pendências
