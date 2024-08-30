/*

---------------------------- info ----------------------------

  title:   O PADEIRO script

  notes:   a collection of templates and companion script

  author:  Jean-Marc Billard
  version: xxx
  date:    xx-xx-2024

--------------------------------------------------------------

*/
//  jshint -W061

try {
  var scriptMainPath = '//10.228.183.165/VFX/imagem/drive_l/Fileserver_3/INSTITUCIONAL/_adm-designers/SCRIPTS FREE/O_PADEIRO/';
  var scriptMainFile = new File(scriptMainPath + 'O_PADEIRO_SOURCE.jsxbin');

  scriptMainFile.open('r');
  eval(scriptMainFile.read());

  scriptMainFile.close();

} catch (err) {
  alert('(っ °Д °;)っ      #PAD_001 - ' + err.message);
}
