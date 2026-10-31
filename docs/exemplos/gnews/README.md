# Exemplo: config da PROMO GNEWS

Uma configuração do O PADEIRO montada a partir do **PROMO-GNEWS-script** (a barra ScriptUI da PROMO GNEWS). Ela recria, com os recursos de configuração da v2.0 beta5, a organização de pastas do projeto, a cor do menu principal na barra e a busca de caminhos com as retrancas da promo.

| arquivo | o que é |
| --- | --- |
| `O_PADEIRO_config.json` | a configuração completa (PRODUCTIONS, DRIVES, RENAME, ORGANIZE, SEARCH, LINKS, APPEARANCE) |
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
| `USR PROMO - ID projeto` (prefixo do usuário + ID do XMP) | prefixo de tipo + nome | **falta**: o nome não usa usuário nem os metadados do projeto |
| apoio + data/hora do end page no nome (`txt_apoio`, `txt_data e horario`) | — | **falta** |
| hard news: `GNEWS projeto n - ID` | — | **falta** |
| collect para `projPath/<grupo>/<retranca>/<projeto>` | — | **falta**: a busca abre as pastas, mas o O PADEIRO não salva / coleta o projeto nelas |
| pasta do dia (`DIARIOS/RJ/aaaa/mm_MÊS/dd`) | entrada fixa em `DIARIOS/RJ` | **parcial**: o caminho com a data não é calculado |
| botões de pastas (shortcuts) | categoria PASTAS DA PROMO na busca | equivalente (links aceitam só http/https) |
| cor do menu claro `#3E50B4` / escuro `#8FF7A7` | uma cor de destaque | **parcial**: a mesma cor nos dois modos |
| categoria SERVIDOR da busca | — | **sobra**: as pastas fixas da PROMO JB (`#INGEST`, `BASES VALENDO`) sempre aparecem |

Resumindo: a **organização de pastas, a barra e a busca de caminhos chegam bem perto** (com os ajustes acima); o que ainda não dá para recriar é a **nomenclatura baseada no projeto** (ID e nome guardados no XMP, prefixo do usuário, dados do end page) e o **collect** para a pasta da retranca.

Caminhos sugeridos para fechar a diferença, em ordem de impacto:

1. **Variáveis no nome** do RENAME: `{usuario}`, `{id}`, `{projeto}` (do XMP do projeto), para montar `USR PROMO - ID nome`.
2. **Tipos "editáveis" e "end pages"** no ORGANIZE (pastas para as tags `edit` e para end pages, e a tag `ignore`).
3. **Cor por modo** na APARÊNCIA (claro / escuro) e opção de esconder a categoria SERVIDOR.
4. **Salvar / coletar na pasta da retranca**: usar o índice da busca (3 letras do ID → pasta) como destino do projeto.
