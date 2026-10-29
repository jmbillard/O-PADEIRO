# 🛠️ O PADEIRO — desenvolvimento

guia do código da extensão. o guia de uso está no [README principal](../README.md).

a extensão é um pacote **CEP** (Common Extensibility Platform) para o After Effects 2022+: painéis em HTML / CSS / JS (o *client*) que conversam com o After Effects através de ExtendScript (o *host*).

<br>

## 📍 os painéis

todos os painéis vêm do mesmo pacote (`CSXS/manifest.xml`) e carregam o mesmo host. a barra é um painel acoplável (`<Type>Panel</Type>`); as outras ferramentas são janelas que não acoplam (`<Type>Modeless</Type>`).

| painel (menu `Window` > `Extensions`) | id | página | script | porta de depuração |
| --- | --- | --- | --- | --- |
| O PADEIRO (barra) | `com.jmbillard.opadeiro.bar` | `bar.html` | `js/bar.js` | 8089 |
| O PADEIRO templates | `com.jmbillard.opadeiro.panel` | `index.html` | `js/app.js` | 8088 |
| O ACESSORISTA | `com.jmbillard.opadeiro.finder` | `finder.html` | `js/finder.js` | 8090 |
| O PADEIRO conversor | `com.jmbillard.opadeiro.converter` | `converter.html` | `js/converter.js` | 8091 |
| O PADEIRO produções | `com.jmbillard.opadeiro.productions` | `productions.html` | `js/productions.js` | 8092 |
| O PADEIRO criar template | `com.jmbillard.opadeiro.maker` | `maker.html` | `js/maker.js` | 8093 |

<br>

## 📍 estrutura

```text
O-PADEIRO/
├─ INSTALAR O PADEIRO.jsx        → instalador do carregador (File > Scripts > Run Script File... no After Effects)
├─ O_PADEIRO_config.json         → lista de produções COMPARTILHADA pela equipe
├─ docs/images/                  → imagens da documentação
└─ extension/
   ├─ CSXS/manifest.xml          → os 6 painéis
   ├─ .debug                     → portas de depuração (CEF)
   ├─ loader/stub.html           → modelo da página instalada em cada computador (abre a página da rede)
   ├─ client/                    → painéis (HTML / CSS / JS)
   │  ├─ *.html                  → uma página por painel
   │  ├─ css/styles.css          → tokens e componentes da linguagem visual (degradê, vidro, folha branca)
   │  ├─ css/panel.css           → componentes comuns (busca, árvore, dropdown, foco) e o painel de templates
   │  ├─ css/loader.css          → o forninho (loader)
   │  ├─ css/<painel>.css        → bar, finder, converter, productions, maker
   │  └─ js/
   │     ├─ bridge.js            → ponte com o host (PAD_BRIDGE.call), diálogos de arquivo, abrir / fechar painéis
   │     ├─ keys.js              → teclado comum (setas, Esc, Ctrl/Cmd+F / S) e registerKeyEventsInterest
   │     ├─ dropdown.js          → lista suspensa arredondada (com filtro digitado)
   │     ├─ config-editor.js     → formulário do _config.json (painel de templates)
   │     ├─ util.js              → ícones das produções, forninho, URLs de arquivo
   │     ├─ mock-host.js         → host de mentira, para abrir os painéis no navegador
   │     └─ <painel>.js          → lógica de cada painel
   ├─ host/                      → ExtendScript (roda dentro do After Effects)
   │  ├─ loader.jsx              → carregador: confere se o host mudou na rede
   │  ├─ index.jsx               → entrada: includes
   │  ├─ env.jsx                 → nome, versão, sistema e pastas de dados
   │  ├─ api.jsx                 → PADX_call e os métodos da barra e dos templates
   │  ├─ finder.jsx              → O ACESSORISTA e o conversor
   │  ├─ productions.jsx         → lista de produções (gravação com conferência de conflito)
   │  ├─ maker.jsx               → criador de templates
   │  └─ lib/                    → funções de apoio (texto, arquivos, layers, renomear, projeto, metadados, rede, fontes)
   └─ scripts/                   → instaladores de desenvolvimento (install-mac.sh, install-win.ps1)
```

<br>

## 📍 o código vive na rede

a pasta do padeiro na rede é a única cópia do código. o `INSTALAR O PADEIRO.jsx` grava no computador só um **carregador**, na pasta de extensões CEP do usuário:

```text
com.jmbillard.opadeiro.panel/
├─ CSXS/manifest.xml   → cópia do manifest da rede (os painéis e os menus)
├─ .debug              → portas de depuração
└─ client/<página>.html → uma por painel, gerada de extension/loader/stub.html
```

1. **página** → ao abrir um painel, a página instalada procura a mesma página na pasta `extension` da rede (no macOS, também em `/Volumes/<volume>-1` a `-5`) e navega para ela. sem acesso, mostra um aviso e tenta de novo a cada 4 s.
2. **host** → na primeira chamada, `client/js/bridge.js` pede ao After Effects para avaliar `host/loader.jsx` da mesma pasta da página. o carregador compara nome e data de cada `.jsx` / `.js` do host com a última leitura e, se algo mudou (ou nunca foi lido), o painel avalia `host/index.jsx` de novo.

resultado: trocar os arquivos na rede e **reabrir o painel** já atualiza a interface e o host, sem reinstalar e sem reiniciar o After Effects. reinstalar só é preciso quando o `manifest.xml` muda (painel novo, tamanho padrão, menu).

> 🚩 *obs:*\
> • o manifest não tem `ScriptPath`: o host é sempre carregado pelos painéis, da rede.\
> • no After Effects 2025 (macOS) os painéis e janelas abertos com o After Effects já rodando ficam pretos (só aparecem se o After Effects iniciar com eles acoplados). a página carrega e é desenhada (a miniatura do DevTools mostra), mas a janela não mostra o desenho. `--disable-gpu` e o tipo `Modeless` não resolveram. em teste: o mesmo CSXS (7.0) e os mesmos parâmetros do CEF de uma extensão que funciona no 2025 (`--enable-nodejs`, `--mixed-context`), sem o `--disable-web-security` dela. no 2026 tudo abre normalmente. como o manifest é copiado pelo instalador, mudanças nele pedem reinstalar.\
> • os painéis compartilham o mesmo ExtendScript do After Effects: reabrir um painel depois de uma atualização recarrega o host para todos.

<br>

## 📍 como o painel fala com o After Effects

o client chama `PAD_BRIDGE.call('método', { ...argumentos })`, que vira `PADX_call('método', 'json')` no host (`window.__adobe_cep__.evalScript`). o host responde `{ ok: true, data }` ou `{ ok: false, error }`, e o `call` devolve uma *Promise* com o `data` (ou rejeita com a mensagem de erro).

```js
var info = await PAD_BRIDGE.call('templateInfo', { uri: node.uri });
```

- **métodos** → cada um é uma função `PADX.<nome>` no host (`api.jsx`, `finder.jsx`, `productions.jsx`, `maker.jsx`).
- **avisos das libs** → as libs avisam com `alert()`. dentro de `padCollect(fn)` esses avisos são recolhidos e voltam como `{ messages, data }`, para o painel mostrar no próprio estilo.
- **desfazer** → `padGroup('nome', fn)` agrupa as alterações num único passo de *undo*.
- **operações longas em passos** → o After Effects ocupado congela o painel. por isso o trabalho é dividido em chamadas curtas, e o painel anima entre elas:
  - pasta de templates → `listDir` (uma pasta por chamada);
  - preenchimento → `fillBegin` / `fillStep` / `fillFinish`;
  - fila de render → `queueBegin` / `queueStep`;
  - textos do projeto → `textCompList` / `textIndexChunk`.

### comunicação entre painéis

cada painel é uma página separada. eles combinam o que fazer por arquivos pequenos na pasta de dados do usuário (`Folder.userData/O PADEIRO script/`) e conferem de tempos em tempos (1 a 3 s, e ao ganhar foco):

| arquivo | quem grava | quem lê |
| --- | --- | --- |
| `selected_production.json` | barra (produção escolhida) | templates |
| `finder_tab.json` | barra (botão buscar) | O ACESSORISTA (aba a abrir) |
| `converter_request.json` | barra (botão pastas) | conversor (caminho a mostrar) |
| `shared_config.txt` | instaladores | host (onde está a lista compartilhada) |
| `temp/template_lists.json` | templates | templates (fixados e recentes, por produção) |

a **lista de produções** é sempre o `O_PADEIRO_config.json` compartilhado: o caminho de `shared_config.txt` ou, sem ele, o arquivo na pasta acima de `extension/`. não existe cópia local. a data de modificação do arquivo (`stamp`) avisa os painéis quando a lista muda e impede que o editor sobrescreva o trabalho de outra pessoa.

<br>

## 📍 desenvolvimento

### instalar a partir do repositório

para usar, o caminho é o mesmo da equipe: `INSTALAR O PADEIRO.jsx` a partir do repositório (o carregador aponta para a pasta `extension/` do repo). para desenvolver, os scripts de `extension/scripts/` também servem:

```bash
./extension/scripts/install-mac.sh
```

no macOS, sem argumentos, o instalador cria um **link** para a pasta `extension/`: as alterações valem depois de recarregar o painel (feche e abra, ou recarregue pela porta de depuração). `--copy` faz uma cópia fixa e `--uninstall` remove.

```powershell
powershell -ExecutionPolicy Bypass -File extension\scripts\install-win.ps1
```

no Windows o instalador sempre copia (`-Uninstall` remove).

> 🚩 *obs:*\
> • rodando a partir do repositório, a lista "compartilhada" é o `O_PADEIRO_config.json` da raiz do repo: salvar no editor de produções grava nele.\
> • os instaladores ligam o `PlayerDebugMode` (CSXS 9 a 12), sem o qual o CEP não carrega extensões sem assinatura.\
> • os instaladores também removem o `O PADEIRO.jsx` da versão antiga (script ScriptUI) das pastas `Scripts/ScriptUI Panels`.\
> • mudanças no `manifest.xml` só valem depois de reiniciar o After Effects.

### abrir os painéis no navegador

sem o After Effects, os painéis usam o `mock-host.js` (templates, produções e respostas de mentira). abra qualquer página de `extension/client/` no Chrome:

| parâmetro | efeito |
| --- | --- |
| `?mock=slow` | respostas lentas (para ver os loaders) |
| `?mock=fail` | erros nas chamadas |
| `?mock=conflict` | conflito ao salvar a lista de produções |
| `?mock=local` | lista compartilhada inacessível (até `window.PAD_MOCK_NETBACK = true`) |
| `?mock=nonet` | sem acesso à rede nas preferências |
| `?nocomp` | criador de templates sem comp aberta |
| `?path=...` | conversor aberto com um caminho |

no mock, o template **TARJA DUPLA** tem fontes faltando (para testar a pergunta das fontes).

### depurar no After Effects

com o painel aberto, acesse `http://localhost:<porta>` no Chrome (portas na tabela dos painéis) para ter o console, os elementos e a rede do painel. o ExtendScript pode ser depurado com a extensão *ExtendScript Debugger* do VS Code.

<br>

## 📍 onde mudar o quê

- **botões da barra** → `SECTIONS` em `client/js/bar.js` (rótulo, ícone, dicas e ações dos cliques esquerdo e direito). as ações ficam em `actions`, no mesmo arquivo.
- **link do apontamento** → `APONTAMENTO_URL` em `client/js/bar.js`.
- **documentação de cada painel** → `docs/<painel>.md` (templates, criador, produções, acessorista, conversor); o `DOCS_URL` de cada `client/js/<painel>.js` aponta para ela (o ⋯ > ajuda abre).
- **tipos de renomeação** (prefixos e termos) → `renameRefArray` em `host/lib/globals.js`; a lógica em `host/lib/functions/rename lib.js`.
- **letras de drive da rede** → `DRIVE_MAP` em `host/lib/globals.js`.
- **config padrão dos templates** → `defaultTemplateConfigObj` em `host/lib/globals.js`.
- **estrutura de pastas do projeto** → `PROJECT_FOLDERS` em `host/lib/functions/project lib.js`.
- **categorias do acessorista** → `PS_CATEGORIES` (ordem e rótulos) e `PS_LOCAL_SOURCES` (listas fixas, como `servidor`) em `host/lib/acessorista.js`. qualquer lista nova no JSON do workflow vira uma categoria e um filtro automaticamente.
- **quantas atrações aparecem** → `MAX_RESULTS` em `client/js/finder.js`.
- **cores, raios e sombras** → os tokens em `:root`, no início de `client/css/styles.css`.
- **versão** → `ExtensionBundleVersion` em `CSXS/manifest.xml` e `PADX_VERSION` em `host/index.jsx`.

> 🚩 *obs:*\
> • `host/lib/JSON lib.js` usa codificação UTF-16 LE e os `.jsx` do host usam UTF-8 com BOM: mantenha essas codificações ao editar.\
> • o ExtendScript é ES3: nada de `let`, `const`, *arrow functions* ou métodos novos de array e string. ele também avalia ternários encadeados (`a ? b : c ? d : e`) de outro jeito: use parênteses ou `if` / `else`.\
> • o client roda no Chromium do CEP 11 (Chrome 88): `async` / `await` funcionam, mas evite recursos mais novos que isso.

<br>

## 📍 notas

- ao concluir um preenchimento, o host envia um registro ao *webhook* de log (`log_db_padeiro`); a falha dele é silenciosa.
- as fontes da interface usam a pilha do sistema (`Inter` se estiver instalada).
- para distribuir sem o `PlayerDebugMode`, o caminho é empacotar e assinar um `.zxp` (`ZXPSignCmd`).
