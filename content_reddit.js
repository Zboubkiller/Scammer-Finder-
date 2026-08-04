// ==========================================
// FICHIER COMPLETE : content_reddit.js (Corrigé)
// ==========================================
(async function() {
    let lastUrl = location.href;
    let isAnalyzing = false; // Anti-double appel corrigé (suppression de l'évier)

    // --- Fonction principale d'analyse ---
    async function checkProfile() {
        // Ne s'active que sur les pages de profil /user/XXXX
        if (!window.location.pathname.startsWith('/user/')) return;

        // Vérification si le module Reddit est activé dans les réglages de l'extension
        const { enableReddit = true } = await chrome.storage.local.get('enableReddit');
        if (!enableReddit) return;

        const pathSegments = window.location.pathname.split('/');
        // Le nom d'utilisateur est le 3ème segment (/user/nom_utilisateur)
        const username = pathSegments[2];
        if (!username) return;

        console.log("🔍 [Audit] Analyse du profil en cours :", username);

        try {
            // Récupération simultanée des infos du profil et de l'activité
            const [aboutRes, overviewRes] = await Promise.all([
                fetch(`https://www.reddit.com/user/${username}/about.json`),
                fetch(`https://www.reddit.com/user/${username}/overview.json?limit=50`)
            ]);

            if (!aboutRes.ok || !overviewRes.ok) {
                console.error("❌ [Audit] Erreur lors de la récupération des données Reddit.");
                return;
            }

            const aboutData = await aboutRes.json();
            const overviewData = await overviewRes.json();

            // Structuration de l'activité (Mappage unifié des posts et commentaires)
            const activity = overviewData.data.children.map(item => {
                const d = item.data;
                if (item.kind === 't3') { // C'est un Post (Publication)
                    return {
                        type: "POST",
                        title: d.title || "",
                        content: d.selftext || d.url || "",
                        subreddit: d.subreddit,
                        created_utc: d.created_utc
                    };
                } else if (item.kind === 't1') { // C'est un Commentaire
                    return {
                        type: "COMMENT",
                        content: d.body || "",
                        target_post_title: d.link_title || "",
                        subreddit: d.subreddit,
                        created_utc: d.created_utc
                    };
                }
                return null;
            }).filter(Boolean);

            // Construction du Payload à envoyer au backend via n8n
            const payload = {
                platform: "reddit",
                username: username,
                user_language: navigator.language || "fr",
                created_utc: aboutData.data.created_utc,
                activity: activity
            };

            console.log("📤 [Audit] Transmission du payload au background script...", payload);

            // Envoi au background script (qui va requêter le webhook n8n)
            chrome.runtime.sendMessage(
                { action: "checkProfile", data: payload },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("❌ [Audit] Erreur runtime:", chrome.runtime.lastError);
                        return;
                    }

                    if (!response) {
                        console.error("❌ [Audit] Aucune réponse reçue du background script.");
                        return;
                    }

                    console.log("📥 [Audit] Réponse reçue du backend, affichage du bandeau.", response);
                    // On transmet toute la réponse (qu'elle soit success: true ou false) pour afficher l'alerte ou le quota
                    renderBanner(response, payload);
                }
            );

        } catch (e) {
            console.error("❌ [Audit] Erreur critique dans le content script :", e);
        }
    }

    // --- Fonction d'affichage de la bannière ---
    function renderBanner(response, rawPayload) {
        const oldBanner = document.getElementById('audit-alert-banner');
        if (oldBanner) oldBanner.remove();

        console.log("🛠️ [Audit] Tentative de rendu de la bannière avec :", response);

        const isSuccess = response.success === true;
        const result = response.result || {};
        const isSuspicious = result.isSuspicious;

        let bgColor, titleText;

        if (isSuccess) {
            // Cas normal : Succès de l'analyse
            bgColor = isSuspicious ? '#d32f2f' : '#2e7d32'; // Rouge (suspect) ou Vert (OK)
            titleText = isSuspicious ? '⚠️ ALERTE : COMPTE SUSPECT' : '✅ PROFIL VÉRIFIÉ';
        } else {
            // Cas d'erreur logique (ex: Quota 10/10 dépassé)
            bgColor = '#ffa000'; // Orange (Avertissement)
            titleText = '⚠️ LIMITE / ERREUR';
        }

        const analysisReason = result.reason || 'Analyse terminée (aucune raison spécifiée).';

        const banner = document.createElement('div');
        banner.id = 'audit-alert-banner';
        banner.style.cssText = `
            position: fixed !important;
            top: 15px !important;
            right: 15px !important;
            z-index: 2147483647 !important;
            background-color: ${bgColor} !important;
            color: white !important;
            padding: 14px 18px !important;
            border-radius: 8px !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important;
            max-width: 380px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            display: block !important;
        `;

        banner.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 4px;">
                <strong style="font-size: 14px; font-weight: bold;">${titleText}</strong>
                <span id="close-banner-btn" style="cursor: pointer; font-size: 20px; font-weight: bold; padding: 0 4px; line-height: 1;">&times;</span>
            </div>
            <div style="font-size: 12px; line-height: 1.5; margin-bottom: 10px;">${analysisReason}</div>
            <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 6px;">
                <button id="toggle-payload-btn" style="background: transparent; border: none; color: white; text-decoration: underline; font-size: 11px; cursor: pointer; padding: 0; opacity: 0.8;">
                    🔍 Voir les données brutes (JSON)
                </button>
                <pre id="payload-container" style="display: none; background: rgba(0,0,0,0.5); color: #f0f0f0; padding: 8px; border-radius: 4px; font-size: 10px; max-height: 200px; overflow-y: auto; margin-top: 8px; white-space: pre-wrap; word-break: break-all; font-family: monospace;"></pre>
            </div>
        `;

        document.body.appendChild(banner);
        console.log("✅ [Audit] Bannière injectée dans le DOM.");

        const closeBtn = document.getElementById('close-banner-btn');
        if (closeBtn) {
            closeBtn.onclick = function() {
                banner.remove();
            };
        }

        const toggleBtn = document.getElementById('toggle-payload-btn');
        const payloadBox = document.getElementById('payload-container');

        if (toggleBtn && payloadBox) {
            toggleBtn.onclick = function() {
                if (payloadBox.style.display === 'none') {
                    const debugData = {
                        "=== Réponse Reçue (Brut) ===": response,
                        "=== Envoyé au Backend ===": rawPayload
                    };
                    payloadBox.textContent = JSON.stringify(debugData, null, 2);
                    payloadBox.style.display = 'block';
                    toggleBtn.textContent = '🙈 Masquer les données brutes';
                } else {
                    payloadBox.style.display = 'none';
                    toggleBtn.textContent = '🔍 Voir les données brutes (JSON)';
                }
            };
        }
    }

    // --- Logique de détection de changement de page (SPA & Refresh F5) ---
    const observer = new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            setTimeout(checkProfile, 1200);
        }
    });

    observer.observe(document, { subtree: true, childList: true });

    // Lancement au chargement initial et après un F5 complet
    if (document.readyState === 'complete') {
        setTimeout(checkProfile, 1000);
    } else {
        window.addEventListener('load', () => setTimeout(checkProfile, 1000));
    }

})();
