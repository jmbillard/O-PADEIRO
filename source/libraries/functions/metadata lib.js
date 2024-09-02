/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/*

---------------------------------------------------------------
> 📃 script metadata
---------------------------------------------------------------

*/

// Carrega a biblioteca XMP (se ainda não estiver carregada).
if (ExternalObject.AdobeXMPScript == undefined) {
	ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
}

// Obtém um valor de metadado XMP do projeto atual.
function getXMPData(XMPfield) {
	var metaData = new XMPMeta(app.project.xmpPacket); // Cria um objeto XMPMeta a partir dos metadados do projeto
	var XMPSet = XMPConst.NS_DC; // Define o namespace XMP a ser usado (Dublin Core, neste caso)

	// Verifica se a propriedade XMP existe e retorna seu valor, ou uma string vazia se não existir
	return metaData.doesPropertyExist(XMPSet, XMPfield)
		? metaData.getProperty(XMPSet, XMPfield).value
		: '';
}

// Define um valor de metadado XMP no projeto atual.
function setXMPData(XMPfield, XMPval) {
	var metaData = new XMPMeta(app.project.xmpPacket); // Cria um objeto XMPMeta a partir dos metadados do projeto
	var XMPSet = XMPConst.NS_DC; // Define o namespace XMP a ser usado

	// Remove a propriedade existente (se houver) e define o novo valor
	metaData.deleteProperty(XMPSet, XMPfield);
	metaData.setProperty(XMPSet, XMPfield, XMPval);

	// Atualiza os metadados do projeto
	app.project.xmpPacket = metaData.serialize();
}
