/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> O PADEIRO — host (ExtendScript) da extensão CEP
---------------------------------------------------------------

Carregado pelo CEP (ScriptPath do manifest). Reaproveita as libs do script ScriptUI
(cópias em host/lib, geradas por scripts/sync-libs.sh) e expõe a API que o painel chama
através de PADX_call (client/js/bridge.js).

*/

var PADX_VERSION = '0.1.0';
var PADX_HOST_PATH = new File($.fileName).parent.fsName;

#include "env.jsx"

#include "lib/JSON lib.js"
#include "lib/PROT lib.js"
#include "lib/globals.shared.js"

#include "lib/functions/string lib.js"
#include "lib/functions/file system lib.js"
#include "lib/functions/layers lib.js"
#include "lib/functions/rename lib.js"
#include "lib/functions/project lib.js"
#include "lib/functions/metadata lib.js"
#include "lib/functions/web lib.js"
#include "lib/functions/treeView lib.js"
#include "lib/functions/fonts lib.js"
#include "lib/acessorista.shared.js"

#include "api.jsx"
#include "finder.jsx"
#include "productions.jsx"
