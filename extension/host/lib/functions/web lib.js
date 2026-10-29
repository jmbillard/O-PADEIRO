function sendToWebhookWithCurl(data, webhookURL) {
	var jsonData = JSON.stringify(data);
	var curlCmd;

	if (appOs === "Mac") {
		// macOS — escapa aspas simples
		jsonData = jsonData.replace(/'/g, "'\\''");

		curlCmd =
			"echo '" + jsonData + "' | " +
			"/usr/bin/curl --connect-timeout 3 --max-time 5 " +
			"-k --tlsv1.2 -X POST " +
			'"' + webhookURL + '" ' +
			'-H "Content-Type: application/json" ' +
			"-d @-";


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