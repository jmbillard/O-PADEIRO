/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> O PADEIRO — host (ExtendScript) da extensão CEP
---------------------------------------------------------------

Avaliado a pedido dos painéis (client/js/bridge.js → host/loader.jsx), direto da pasta na rede.
Junta as libs (host/lib) e expõe a API que os painéis chamam através de PADX_call.

*/

var PADX_VERSION = '0.1.0';
var PADX_HOST_PATH = new File($.fileName).parent.fsName;

#include "env.jsx"

#include "lib/JSON lib.js"
#include "lib/PROT lib.js"
#include "lib/globals.js"

#include "lib/functions/string lib.js"
#include "lib/functions/file system lib.js"
#include "lib/functions/layers lib.js"
#include "lib/functions/rename lib.js"
#include "lib/functions/project lib.js"
#include "lib/functions/metadata lib.js"
#include "lib/functions/web lib.js"
#include "lib/functions/fonts lib.js"
#include "lib/acessorista.js"

#include "api.jsx"
#include "finder.jsx"
#include "productions.jsx"
#include "maker.jsx"
