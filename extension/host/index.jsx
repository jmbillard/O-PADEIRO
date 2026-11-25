/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> O PADEIRO — host (ExtendScript) da extensão CEP
---------------------------------------------------------------

Avaliado a pedido dos painéis (client/js/bridge.js → host/loader.jsx), direto da pasta na rede.
Junta as libs (host/lib) e expõe a API que os painéis chamam através de PADX_call.

*/

var PADX_VERSION = '2.0 RC1';
var PADX_HOST_PATH = new File($.fileName).parent.fsName;

#include "env.jsx"

#include "lib/JSON lib.js"
#include "lib/PROT lib.js"

// a tabela de seções da configuração (regra compartilhada, ADR 0005): antes das libs, que tiram dela os padrões
#include "../regras/configuracao.js"

#include "lib/globals.js"

#include "lib/functions/string lib.js"
#include "lib/functions/file system lib.js"
#include "lib/functions/layers lib.js"
// a regra do renomear (compartilhada, ADR 0005) vem antes de rename lib.js, que a usa ao carregar
#include "../regras/regra-do-renomear.js"
#include "lib/functions/rename lib.js"
#include "lib/functions/project lib.js"
#include "lib/functions/metadata lib.js"
#include "lib/functions/web lib.js"
#include "lib/functions/fonts lib.js"
#include "lib/acessorista.js"
// as funções globais que os scripts de template (_script.js) do padeiro antigo chamam: depois das libs, que elas usam
#include "lib/scripts-de-template.js"

// as regras compartilhadas com o painel e o teste em Node (ADR 0005)
#include "../regras/nomes-repetidos.js"
// o preset de render: o nome curto, o H.264 preferido e a lista sem os _HIDDEN
#include "../regras/preset-de-render.js"
// do caminho guardado no projeto para os lugares de hoje (o religar d'O CATADOR, coletar.jsx)
#include "../regras/caminhos.js"
// o lugar do arquivo: neste computador ou na rede (a etiqueta d'O CATADOR, coletar.jsx)
#include "../regras/lugar-do-arquivo.js"
// as referências de comp nas expressões (comp("NOME")): o preenchimento reescreve as das precomps renomeadas
#include "../regras/referencias-de-comp.js"
// o webhook do projeto: o envio ao n8n do projeto criado, aberto ou alterado (project.jsx)
#include "../regras/webhook-do-projeto.js"

#include "api.jsx"
#include "finder.jsx"
#include "productions.jsx"
#include "project.jsx"
#include "coletar.jsx"
#include "migrate.jsx"
#include "render.jsx"
#include "files.jsx"
#include "light.jsx"
#include "confeiteiro.jsx"
#include "fontbank.jsx"
#include "brand.jsx"
