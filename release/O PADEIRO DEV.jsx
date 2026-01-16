try {
  eval("#include '~/O-PADEIRO/O_PADEIRO.js'; // → UI definition file");
} catch (err) {
  alert('nope... (っ °Д °;)っ\n\n' + err.message);
}