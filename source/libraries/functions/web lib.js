
function sendToWebhookWithCurl(data, webhookURL) {
    // Converte o objeto para string JSON
    var jsonData = JSON.stringify(data);
    
    // Escapa as aspas duplas para a linha de comando
    jsonData = jsonData.replace(/"/g, '\\"');
    
    // Cria o comando curl
    var curlCmd = 'curl -X POST "' + webhookURL + '" -H "Content-Type: application/json" -d "' + jsonData + '"';
    
    try {
        // Executa o comando
        var result = system.callSystem(curlCmd);
        // alert("Dados enviados com sucesso!\nResposta: " + result);
    } catch (err) {
        // alert("Erro ao enviar dados: " + error.toString());
    }
}