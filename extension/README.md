# 🧩 O PADEIRO *extensão*

Painel CEP do **O PADEIRO** para o After Effects, com a mesma lógica de templates do script ScriptUI e a interface em HTML / CSS.

> a extensão convive com o script: nenhum arquivo do script ScriptUI é alterado de forma que mude o comportamento dele, e as duas versões compartilham a mesma lista de produções (`O PADEIRO script/O_PADEIRO_config.json`, na pasta de dados do usuário).

<br>

## 📍 os painéis

a extensão tem dois painéis, que podem ser acoplados separadamente (`Window` > `Extensions`):

- **O PADEIRO** → a barra principal (degradê azul, horizontal ou vertical conforme o tamanho). escolhe a **produção** e tem os mesmos botões do script, com clique esquerdo e direito:
  - `templates` abre o painel de templates;
  - `fontes` instala as fontes do template / faz o collect das fontes do projeto;
  - `pastas` abre a pasta do último item da fila de render;
  - `renomear` renomeia as comps selecionadas / todas as saídas de render;
  - `organizar` organiza o projeto / cria só a estrutura de pastas;
  - o ícone de corrente abre o apontamento de projetos.
  - `buscar` abre o painel **O ACESSORISTA** (a lupa mostra letras passando pelo vidro no hover);
  - o que depende de uma tela ainda não portada (criar template, conversor de caminhos, editor de produções) avisa "em breve".
- **O PADEIRO templates** → o painel de templates, descrito abaixo.
- **O ACESSORISTA** → as buscas, em um painel com duas abas (o botão `buscar` da barra abre na aba certa):
  - `CAMINHOS` (principal, clique direito): a busca de caminhos de atrações (Teams, Trello, atrações e servidor), a partir de 2 caracteres, com filtros por categoria e botões para abrir projeto, output e pasta. a lupa de atualizar baixa o índice de novo. usa a mesma lógica do script (cache de 30 s, volumes SMB montados no macOS).
  - `TEXTOS` (clique esquerdo): a busca no conteúdo dos layers de texto. lê o projeto ao abrir (loader do forninho com o andamento por comp) e filtra enquanto você digita, com `APENAS VISÍVEIS`, `IGNORAR ACENTOS` e `INVERTER`. o termo aparece destacado e clicar abre a comp com o layer selecionado no tempo do texto. o botão de atualizar lê o projeto de novo.

a produção escolhida na barra é gravada em `O PADEIRO script/selected_production.json` (o script ScriptUI grava o mesmo arquivo) e o painel de templates acompanha.

<br>

## 📍 o que já tem no painel de templates (v0.1.0)

o fluxo principal de templates: `1 buscar` > `2 selecionar` > `3 preencher` > `4 fila de render`.

- **produção** escolhida na barra principal (da extensão ou do script): sem nenhuma das duas, usa a primeira da lista;
- leitura da pasta de templates, com busca dinâmica;
- **preview**, dicas e exemplo do template (`_preview.png` e `_config.json`). se existir `_preview.webm` ou `_preview.mp4` ao lado do template, o preview toca em loop e o mouse navega pelos quadros (como o thumbnail do Premiere); sem vídeo, usa o png. o `webm` (VP8/VP9) é o mais seguro: o suporte a `mp4` (H.264) depende da versão do CEP;
- **preencher** com status, progresso e erro por item (uma comp por linha da fila);
- **fila de render** com escolha do template de output e verificação das pastas de saída;
- script do template (`_script.js`), log, metadados XMP e organização do projeto, como no script;
- duplo clique no template importa e organiza o projeto.
- **loader temático** (pães saindo do forninho) enquanto lê a lista de templates e o template escolhido. a pasta de templates é lida **pasta a pasta**, em chamadas curtas ao After Effects, com o andamento no loader: assim o painel continua animando em vez de travar numa leitura longa da rede.
- **editor de config** (lápis ao lado do nome do template): formulário para o `_config.json` com nome, comp, prefixo, caixa de texto, separador, tempo de referência, exemplo, dicas, layers editáveis (com ordem), variações de layout (`inputFx`) e pastas de import / output. mostra o nome final da comp com o exemplo, valida antes de salvar e preserva chaves que o formulário não conhece. em template sem config, o mesmo botão cria o arquivo.

ficam para as próximas versões: editor de produções, criador de templates, fontes, renomear, organizar, buscas, O Acessorista e conversor de caminhos.

<br>

## 📍 instalação (macOS e Windows)

requer After Effects **2022 (22.0)** ou mais novo.

```bash
./extension/scripts/install-mac.sh
```

```powershell
powershell -ExecutionPolicy Bypass -File extension\scripts\install-win.ps1
```

reinicie o After Effects e abra `Window` > `Extensions` > `O PADEIRO`.

> 🚩 *obs:*\
> • sem assinatura (`.zxp`), o CEP só carrega extensões com o `PlayerDebugMode` ligado, o que os scripts acima fazem.\
> • habilite também `Edit` > `Preferences` > `Scripting & Expressions...` > '**Allow Scripts to Write Files and Access Network**'.\
> • no macOS o instalador cria um *link* para a pasta `extension/` (bom para desenvolver); use `--copy` para uma cópia fixa e `--uninstall` para remover.

<br>

## 📍 estrutura

```text
extension/
├─ CSXS/manifest.xml        → declaração do painel
├─ client/                  → painel (HTML / CSS / JS)
│  ├─ css/styles.css        → tokens e componentes da linguagem visual
│  ├─ css/panel.css         → componentes do padeiro (busca, input, fila)
│  ├─ css/bar.css           → barra principal
│  ├─ css/finder.css        → o acessorista (buscas)
│  ├─ index.html, js/app.js → painel de templates
│  ├─ finder.html, js/finder.js → o acessorista
│  ├─ bar.html, js/bar.js   → barra principal
│  └─ js/                   → bridge.js (ponte), dropdown.js, config-editor.js, util.js, mock-host.js (dev)
├─ host/                    → ExtendScript (roda dentro do After Effects)
│  ├─ index.jsx             → entrada: includes
│  ├─ api.jsx               → métodos chamados pelo painel (PADX.*)
│  └─ lib/                  → libs do script, copiadas por scripts/sync-libs.sh
└─ scripts/                 → instaladores e sincronização das libs
```

o painel chama `PADX_call('método', json)` no host (`client/js/bridge.js`) e recebe `{ ok, data }` ou `{ ok: false, error }`. o preenchimento e a fila de render são divididos em passos (`fillBegin` / `fillStep` / `fillFinish`, `queueBegin` / `queueStep`) para a interface mostrar o andamento.

<br>

## 📍 desenvolvimento

**libs compartilhadas** — `host/lib/` é gerada a partir de `source/libraries/` (e as constantes de rede / renomeação, de `source/globals.js`). depois de mexer nelas, rode e comite o resultado:

```bash
./extension/scripts/sync-libs.sh
```

**interface sem o After Effects** — abra `extension/client/index.html` (templates) ou `bar.html` (barra) no navegador: sem o AE o painel usa o `mock-host.js`, com templates de mentira. `?mock=slow` deixa as respostas lentas e `?mock=fail` simula erros.

**depurar no AE** — o `.debug` abre as portas `8088` (templates), `8089` (barra) e `8090` (acessorista): acesse `http://localhost:8088` no Chrome com o painel aberto.

<br>

## 📍 notas

- a extensão usa o mesmo *webhook* de log do script (`log_db_padeiro`) ao concluir um preenchimento; a falha dele é silenciosa.
- as fontes usam a pilha do sistema (`Inter` se estiver instalada).
- distribuição para a equipe: o ideal é empacotar e assinar um `.zxp` (`ZXPSignCmd`), o que dispensa o `PlayerDebugMode`.
