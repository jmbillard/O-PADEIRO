function sendToWebhookWithCurl(data, webhookURL) {
	var jsonData = JSON.stringify(data);
	var curlCmd;

	if (appOs === "Mac") {
		// macOS — escapa aspas simples
		jsonData = jsonData.replace(/'/g, "'\\''");

		curlCmd =
			'/usr/bin/curl -k --tlsv1.2 -X POST ' +
			'"' + webhookURL + '" ' +
			'-H "Content-Type: application/json" ' +
			"-d '" + jsonData + "'";

	} else {
		// Windows — escapa aspas duplas
		jsonData = jsonData.replace(/"/g, '\\"');

		curlCmd =
			'curl -k --tlsv1.2 -X POST "' + webhookURL + '" ' +
			'-H "Content-Type: application/json" ' +
			'-d "' + jsonData + '"';
	}

	try {
		return system.callSystem(curlCmd);
	} catch (err) {
		return null;
	}
}