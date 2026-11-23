# webhook dos filmes recentes

O que a claquete (janela **PROJETO**) espera do workflow dos filmes. Com o campo vazio, a claquete mostra os filmes
criados na base nos últimos dias, com o pôster, o ano de produção e a exibição. Os filmes que ainda não têm pasta de
projeto ganham a etiqueta **A PRODUZIR** e vêm primeiro.

## endereço

```
GET https://workflows.jmbillard.com/webhook/filmes-recentes
```

O endereço ainda é provisório: ele fica em `PS_FILMS_URL`, no começo de `extension/host/lib/acessorista.js`. Se o
workflow ganhar outro endereço, é só trocar ali.

O painel faz um `GET` simples, sem corpo e sem autenticação, uma vez por janela aberta (tempo máximo de 15 s). Sem
resposta, a lista não aparece e a claquete segue funcionando como antes.

## resposta

```json
{
  "filmes": [
    {
      "titulo": "Não! Não Olhe!",
      "ano": 2022,
      "exibicao": "2026-12-05",
      "sessao": "Corujão",
      "poster": "https://…/nao-nao-olhe.jpg"
    }
  ]
}
```

| campo | obrigatório | o que é |
| --- | --- | --- |
| `titulo` | sim | o título do filme, como deve aparecer (com acentos e pontuação). a claquete tira acentos e símbolos para o nome das pastas e do `.aep`. |
| `ano` | não | o ano de produção, com 4 algarismos (número ou texto). vai para o token `{ano_producao}` e para o nome do `.aep`. sem ano, os parênteses somem. |
| `exibicao` | não | a data da exibição, `AAAA-MM-DD` (aparece como `05/12`). |
| `sessao` | não | a sessão (Corujão, Supercine…). |
| `poster` | não | o endereço de uma **miniatura pública**, aberta sem login (uns 200 × 300 px). sem pôster, aparece o ícone de filme. |

- **Quais filmes:** os criados (ou atualizados) na base nos últimos dias. Sugestão: 30 dias, para a lista ficar
  pequena. A ordem da resposta é a ordem da lista, com os que já têm projeto depois.
- **Também aceito:** a lista direto (`[ {…}, {…} ]`), embrulhada pelo n8n (`[{ "filmes": [...] }]`) ou um item por
  filme (`[{ "json": {…} }]`). Os nomes em inglês (`name`, `year`) também valem.
- **A PRODUZIR:** não vem do webhook. O After lê a pasta da letra do filme (o caminho do tipo **FILME**, até o
  `{atracao}`) e marca o filme que ainda não tem pasta, comparando o título sem acento, sem pontuação e sem o ano.

## na configuração

Para o ano entrar na pasta e no output, o tipo **FILME** (configuração > PROJETO) usa o token novo
`{ano_producao}` entre parênteses:

```
…/FILMES/TITULOS/_{letra}_/{atracao} ({ano_producao})
```

O `.aep` do filme leva o título com o ano (`NAO NAO OLHE (2022) CHAMADA.aep`), ou o nome do campo ARQUIVO do tipo,
se ele estiver preenchido.

## onde está no código

- `extension/host/lib/acessorista.js`: `PS_FILMS_URL`, o endereço.
- `extension/client/js/attractions.js`: `recentFilms()` baixa e `parseFilms()` lê a resposta.
- `extension/client/js/project.js`: `loadFilms()` confere as pastas, `renderFilms()` mostra a lista e `filmRow()`
  desenha cada linha.
- `extension/host/project.jsx`: `PADX.projectFilmsDone` confere quais filmes já têm pasta.
- `extension/client/js/mock-host.js`: `projectFilmsRecent`, os filmes de exemplo do modo de teste.
