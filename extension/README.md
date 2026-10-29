# 🧩 O PADEIRO *extensão*

Painel CEP do **O PADEIRO** para o After Effects, com a mesma lógica de templates do script ScriptUI e a interface em HTML / CSS.

> a extensão convive com o script: nenhum arquivo do script ScriptUI é alterado de forma que mude o comportamento dele, e as duas versões compartilham a mesma lista de produções (`O PADEIRO script/O_PADEIRO_config.json`, na pasta de dados do usuário).

<br>

## 📍 o que já tem (v0.1.0)

o fluxo principal de templates: `1 buscar` > `2 selecionar` > `3 preencher` > `4 fila de render`.

- **produção** escolhida na barra do script (main ui): o script grava a escolha em `O PADEIRO script/selected_production.json` e o painel acompanha, então o painel precisa do script aberto para trocar de produção (sem ele, usa a primeira da lista);
- leitura da pasta de templates, com busca dinâmica;
- **preview**, dicas e exemplo do template (`_preview.png` e `_config.json`);
- **preencher** com status, progresso e erro por item (uma comp por linha da fila);
- **fila de render** com escolha do template de output e verificação das pastas de saída;
- script do template (`_script.js`), log, metadados XMP e organização do projeto, como no script;
- duplo clique no template importa e organiza o projeto.

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
│  └─ js/                   → app.js (interface), bridge.js (ponte), mock-host.js (dev)
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

**interface sem o After Effects** — abra `extension/client/index.html` no navegador: sem o AE o painel usa o `mock-host.js`, com templates de mentira. `?mock=slow` deixa as respostas lentas e `?mock=fail` simula erros.

**depurar no AE** — o `.debug` abre a porta `8088`: acesse `http://localhost:8088` no Chrome com o painel aberto.

<br>

## 📍 notas

- a extensão usa o mesmo *webhook* de log do script (`log_db_padeiro`) ao concluir um preenchimento; a falha dele é silenciosa.
- as fontes usam a pilha do sistema (`Inter` se estiver instalada).
- distribuição para a equipe: o ideal é empacotar e assinar um `.zxp` (`ZXPSignCmd`), o que dispensa o `PlayerDebugMode`.
