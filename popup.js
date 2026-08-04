document.addEventListener('DOMContentLoaded', async () => {
    const redditCheckbox = document.getElementById('reddit');
    const lbcCheckbox = document.getElementById('lbc');
    const auditBtn = document.getElementById('audit-btn'); // ID de ton bouton pour lancer l'audit
    const statusTextElement = document.getElementById('status-text'); // ID du texte de statut/chargement

    // Charger les états enregistrés
    const { enableReddit = true, enableLbc = true } = await chrome.storage.local.get(['enableReddit', 'enableLbc']);
    redditCheckbox.checked = enableReddit;
    lbcCheckbox.checked = enableLbc;

    // Sauvegarder les changements
    redditCheckbox.addEventListener('change', (e) => {
        chrome.storage.local.set({ enableReddit: e.target.checked });
    });

    lbcCheckbox.addEventListener('change', (e) => {
        chrome.storage.local.set({ enableLbc: e.target.checked });
    });

    // Gestion du clic pour lancer l'analyse avec animation de chargement
    if (auditBtn) {
        auditBtn.addEventListener('click', async () => {
            // Étapes affichées successivement pour faire patienter pendant ~25s
            const loadingSteps = [
                "Connexion sécurisée au serveur...",
                "Extraction de l'historique d'activité...",
                "Analyse des deltas temporels et des patterns...",
                "Vérification des indices de comptes zombies...",
                "Finalisation du rapport de sécurité..."
            ];

            let currentStep = 0;
            if (statusTextElement) {
                statusTextElement.textContent = loadingSteps[0];
                statusTextElement.classList.remove('error-status');
            }

            // Boucle d'incertitude visuelle toutes les 4,5 secondes
            const loadingInterval = setInterval(() => {
                currentStep++;
                if (currentStep < loadingSteps.length) {
                    if (statusTextElement) statusTextElement.textContent = loadingSteps[currentStep];
                } else {
                    if (statusTextElement) statusTextElement.textContent = "Finalisation de l'analyse en cours...";
                }
            }, 4500);

            try {
                // Requête vers ton webhook n8n
                const response = await fetch('https://N8N Webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platform: "reddit",
                        user_language: navigator.language || "en",
                        // Ajoute ici les données récupérées de ton content script si besoin
                    })
                });

                const data = await response.json();

                // Nettoyage de l'intervalle de chargement dès la réponse reçue
                clearInterval(loadingInterval);

                // Gestion de la réponse selon le succès ou l'échec (quota)
                if (statusTextElement) {
                    if (data.success === false) {
                        // Cas de l'erreur / Quota atteint
                        statusTextElement.textContent = data.result?.reason || "Limite atteinte.";
                        statusTextElement.classList.add('error-status'); // Optionnel : pour styliser en rouge dans ton CSS
                    } else {
                        // Cas du succès
                        statusTextElement.textContent = data.result?.reason || "Analyse terminée avec succès.";
                        statusTextElement.classList.remove('error-status');
                    }
                }

            } catch (error) {
                clearInterval(loadingInterval);
                if (statusTextElement) {
                    statusTextElement.textContent = "Erreur de connexion avec le serveur d'audit.";
                    statusTextElement.classList.add('error-status');
                }
                console.error("Erreur Webhook:", error);
            }
        });
    }
});
