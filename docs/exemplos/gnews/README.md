# Exemplo: config da PROMO GNEWS

Uma configuração do O PADEIRO montada a partir do **PROMO-GNEWS-script** (a barra ScriptUI da PROMO GNEWS). Ela recria, com os recursos de configuração da v2.0 beta5, a organização de pastas do projeto, a cor do menu principal na barra e a busca de caminhos com as retrancas da promo.

| arquivo | o que é |
| --- | --- |
| `O_PADEIRO_config.json` | a configuração completa (PRODUCTIONS, DRIVES, RENAME, ORGANIZE, SEARCH, PROJECT, LINKS, APPEARANCE) |
| `gnews_path_index.json` | o índice de caminhos usado pela aba BUSCA (no lugar do webhook) |

## Como usar

1. Copie `gnews_path_index.json` para a rede, no caminho de `SEARCH.file`:
   `//egcdesign01.servicos.corp.tvglobo.com.br/cdesign/JORNALISMO/GLOBONEWS/PROMO/O PADEIRO/gnews_path_index.json`
   (ou outro caminho, e ajuste `SEARCH.file` / a aba BUSCA).
2. Use `O_PADEIRO_config.json` como a configuração compartilhada (ou importe as seções pela janela de configuração).
3. Os templates da pasta `PROMO/TEMPLATES` são os da barra antiga: passe-os pelo [conversor](../../conversor.md) antes de usar a produção **PROMO GNEWS**.

Todas as seções foram conferidas com as próprias funções de validação do host (`padClean*`): nenhuma é rejeitada nem alterada.

## O que cada seção recria

### Organização de pastas (ORGANIZE)

O modo padrão do script (`projectMode: 0`, o template "legacy PROMO"):

```
(raiz)            ← comps com a tag export
_MATERIAL
  Comps           ← precomps
  Videos
  Imagens         ← imagens (e arquivos de dados)
  Sons
  Solidos
missing           ← arquivos faltando
```

- **Render na raiz**: nenhuma pasta recebe o tipo "render", então as comps de export ficam na raiz, como no script.
- **Tag `export`**: `renderComments: ["EXPORT"]` e `autoComment: "EXPORT"` (comps selecionadas sem comentário recebem a tag ao organizar, como o `insertPromoID` do script).
- **Tags de footage viram subpastas** (`commentSubfolders`): `bg`, `ref`, `photo`, `logo`, `music`… antes de `:` viram subpastas da pasta do tipo, igual ao `populateFootageItemFolders` do script.

O modo alternativo do script (`projectMode: 1`) também cabe: `---- render ----` (render), `assets/precomps`, `assets/footage` (vídeos), `footage/images`, `footage/sounds` e `solids` na raiz.

### Nomenclatura (RENAME)

- Caixa **minúscula**, sem acentos e com o separador ` - `, como o resto do nome nas comps da promo.
- Tipos para as peças do script: **EP** (end page, vai para render com `EXPORT`), **TITLE**, **INFO**, **MAP**, **TWITTER** e **DOCUMENT** (as tags de hard news).
  Ex.: `End Page Jornal das Dez` → `EP - jornal das dez` (comentário `EXPORT`); `mapa eleições SP` → `MAP - eleicoes sp`.

### Busca de caminhos (SEARCH)

O índice tem uma categoria por grupo do `promoSubPath` do script, com uma entrada por retranca (as 3 letras do ID do projeto + o nome), apontando para `PROMO/<grupo>/<retranca>`:

| categoria | retrancas |
| --- | --- |
| CANAL | INS, DIG, PIL, MKT |
| VINHETAS | NDL, BIP, ASE |
| JORNAIS | EMN, EMP, CON, EST, GMN, EDE, EPA, JDE, EDO |
| FACTUAIS | ELE, EUA, MUN, RET, COB |
| PROGRAMAS | INT, CID, GAB, DOC, MIR, DAV, PAP, MSC, CEN, DEB, ESP |
| MARCA E COMUNICAÇÃO | MAC |
| PASTAS DA PROMO | arquivo, templates, fonts, bases dos jornais, utilidades, diários RJ, MAM hard news / para arte / magazine |

Buscar `EMP`, `em ponto` ou `jornais` encontra a pasta de Em Ponto. A última categoria substitui os botões de pastas da aba *shortcuts* do script. Os caminhos estão em formato Windows; no macOS eles são convertidos e montados pelos volumes de DRIVES.

### Projeto (PROJECT)

A aba *project* do script vira a janela [PROJETO](../../projeto.md):

- **ID e nome do projeto** nos mesmos campos do XMP (`dc:identifier`, `dc:title`): projetos feitos na barra antiga abrem com os dados.
- **Retrancas**: as 33 do `promoSubPath`, pelas 3 primeiras letras do ID (`EMP123456` → `JORNAIS/em ponto`), dentro de `…/GLOBONEWS/PROMO`.
- **Nome das comps**: `{usuario} PROMO - {id} {projeto}` → `JBI PROMO - EMP123456 historia ao vivo`, como o `renamePromoComps` (a sigla é a do usuário, editável na janela).
- **Arquivo e pasta**: `{id} {projeto}.aep` dentro de uma pasta com o mesmo nome, na pasta da retranca, como o `filesCollectPROMO`.
- **Coletar arquivos** copia para `project files/<pastas do projeto>`, a mesma estrutura do script; **coletar fontes** copia para `FONTS`.

### Barra (APPEARANCE e LINKS)

- Fundo **sólido** na cor do menu principal do script, `#3E50B4` (modo claro); fonte do sistema, como a ScriptUI.
- Links da aba *shortcuts*: OneDrive, Trello da promo, Apontamento e Planner (o ícone vem do favicon de cada site).

### Drives (DRIVES)

Os volumes dos dois servidores do script: `cdesign` (egcdesign01) e `Arte_Ilha` (pamjb), com `T:` para o cdesign.

## Quão perto chega

| recurso do script | no O PADEIRO | |
| --- | --- | --- |
| estrutura de pastas (modos 0 e 1) | ORGANIZE | igual |
| comps de export na raiz / tag `export` | render sem pasta + `EXPORT` | igual |
| tags de footage → subpastas | `commentSubfolders` | igual |
| pasta `_EDITAR` (tag `edit`) | — | **falta**: não há tipo "editáveis"; comps com `edit` vão para `Comps/EDIT` |
| pasta `End Pages` (detecta o efeito `servico end page`) | tipo EP pelo nome | **parcial**: só pelo nome da comp, vai para a raiz junto com o render |
| tag `ignore` (fica fora das subpastas) | — | **parcial**: vira a subpasta `Comps/IGNORE` |
| subpastas pelo nome do template de Essential Graphics | subpastas pelo comentário | **parcial**: o critério é outro |
| `USR PROMO - ID projeto` (prefixo do usuário + ID do XMP) | janela PROJETO: `{usuario} PROMO - {id} {projeto}` | igual (lê os mesmos campos do XMP) |
| apoio + data/hora do end page no nome (`txt_apoio`, `txt_data e horario`) | — | **falta** |
| hard news: `GNEWS projeto n - ID` | — | **falta** |
| collect para `projPath/<grupo>/<retranca>/<projeto>` | janela PROJETO: salvar + coletar arquivos / fontes | igual (sequências de imagens ficam de fora, com aviso) |
| botão de salvar com clique direito (Desktop) | `⋯ > salvar em outra pasta…` | equivalente |
| pasta do dia (`DIARIOS/RJ/aaaa/mm_MÊS/dd`) | entrada fixa em `DIARIOS/RJ` | **parcial**: o caminho com a data não é calculado |
| botões de pastas (shortcuts) | categoria PASTAS DA PROMO na busca | equivalente (links aceitam só http/https) |
| cor do menu claro `#3E50B4` / escuro `#8FF7A7` | uma cor de destaque | **parcial**: a mesma cor nos dois modos |
| categoria SERVIDOR da busca | — | **sobra**: as pastas fixas da PROMO JB (`#INGEST`, `BASES VALENDO`) sempre aparecem |

Resumindo: **organização de pastas, barra, busca de caminhos e o projeto (ID, nome, retranca, nomenclatura, salvar e coletar) chegam bem perto**; o que ainda falta são os **dados do end page no nome** (apoio, data e hora), o modo **hard news** e os ajustes do organizar.

Próximos passos sugeridos, em ordem de impacto:

1. **Tipos "editáveis" e "end pages"** no ORGANIZE (pastas para as tags `edit` e para end pages, e a tag `ignore`).
2. **Cor por modo** na APARÊNCIA (claro / escuro) e opção de esconder a categoria SERVIDOR.
3. **Dados do end page** como variáveis do nome das comps (`{apoio}`, `{horario}`).
