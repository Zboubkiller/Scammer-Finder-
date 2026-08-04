chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkProfile") {
        (async () => {
            try {
                console.log("background.js -> Envoi de la requête vers le webhook n8n...");
                
                const webhookResponse = await fetch('N8N Webhook', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(request.data)
                });

                if (!webhookResponse.ok) {
                    sendResponse({ success: false, error: "Erreur webhook" });
                    return;
                }

                const result = await webhookResponse.json();
                sendResponse({ success: true, result });
            } catch (e) {
                console.error("Erreur critique background fetch:", e);
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true; // Nécessaire pour l'asynchrone avec sendResponse
    }
});
