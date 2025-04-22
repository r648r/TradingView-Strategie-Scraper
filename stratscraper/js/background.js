// Remplacer la fonction updateBadgeCount actuelle par celle-ci
function updateBadgeCount() {
    chrome.storage.local.get(['collectedData'], (result) => {
        const collectedData = result.collectedData || [];
        
        // Extraire les combinaisons ticker+timeframe uniques
        const uniqueCombinations = new Set();
        collectedData.forEach(item => {
            if (item.ticker && item.timeframe) {
                uniqueCombinations.add(`${item.ticker}-${item.timeframe}`);
            } else if (item.ticker) {
                // Pour compatibilité avec anciennes données sans timeframe
                uniqueCombinations.add(item.ticker);
            }
        });
        
        const uniqueCount = uniqueCombinations.size;
        chrome.action.setBadgeText({ text: uniqueCount.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#4688F1' });
        console.log(`🔢 Badge mis à jour: ${uniqueCount} combinaisons ticker-timeframe uniques`);
    });
}
// Modifier la fonction updateCollectedData pour utiliser la nouvelle fonction updateBadgeCount
function updateCollectedData(data) {
    console.log("📊 Mise à jour des données collectées");
    
    chrome.storage.local.get(['collectedData'], (result) => {
        const collectedData = result.collectedData || [];
        
        // Vérifier si cette combinaison ticker+timeframe existe déjà
        const ticker = data.ticker;
        const timeframe = data.timeframe;
        
        if (ticker && timeframe) {
            const existingIndex = collectedData.findIndex(item => 
                item.ticker === ticker && item.timeframe === timeframe);
            
            if (existingIndex !== -1) {
                console.log(`🔄 Remplacement des données pour le ticker: ${ticker} (${timeframe})`);
                // Remplacer les données existantes
                collectedData.splice(existingIndex, 1);
            }
        } else if (ticker) {
            // Fallback pour les données sans timeframe
            const existingIndex = collectedData.findIndex(item => item.ticker === ticker && !item.timeframe);
            
            if (existingIndex !== -1) {
                console.log(`🔄 Remplacement des données pour le ticker (sans timeframe): ${ticker}`);
                collectedData.splice(existingIndex, 1);
            }
        }
        
        collectedData.push(data);
        console.log(`📌 ${collectedData.length} entrées maintenant stockées`);
        
        chrome.storage.local.set({ collectedData: collectedData }, () => {
            // Mettre à jour le compteur sur l'icône
            updateBadgeCount();
            console.log("✅ Données enregistrées, badge mis à jour");
        });
    });
}

// Ajouter cette nouvelle fonction pour gérer les demandes de scrape rapide depuis le popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'performQuickScrape') {
        console.log("📩 Background script a reçu une demande de scrape rapide");
        
        // Obtenir l'onglet actif
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.error("❌ Aucun onglet actif trouvé");
                sendResponse({ success: false, error: "Aucun onglet actif trouvé" });
                return;
            }
            
            const tab = tabs[0];
            
            // Vérifier que l'on est sur TradingView
            if (!tab.url.includes('tradingview.com')) {
                console.warn("❌ L'URL n'est pas TradingView:", tab.url);
                sendResponse({ success: false, error: "Veuillez ouvrir TradingView pour utiliser cette fonction" });
                return;
            }
            
            // Envoyer la commande quickScrape au content script
            console.log("📤 Envoi de la commande quickScrape au content script");
            chrome.tabs.sendMessage(tab.id, { action: 'quickScrape' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("❌ Erreur de communication:", chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    return;
                }
                
                if (response && response.success) {
                    console.log("✅ Scrape réussi, données reçues:", response.data);
                    
                    // Enregistrer les données dans le stockage local
                    updateCollectedData(response.data);
                    
                    // Répondre au popup
                    sendResponse({ success: true, data: response.data });
                } else {
                    console.error("❌ Échec du scrape:", response ? response.error : "Erreur inconnue");
                    sendResponse({ success: false, error: response ? response.error : "Erreur inconnue" });
                }
            });
        });
        
        return true; // Indique que sendResponse sera appelé de manière asynchrone
    }
    
    if (message.action === 'start') {
        console.log("📩 Background script a reçu une demande de démarrage de collecte");
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.error("❌ Aucun onglet actif trouvé");
                return;
            }
            
            chrome.tabs.sendMessage(tabs[0].id, { action: 'startCollecting' });
        });
        
        return false;
    }
    
    if (message.action === 'stop') {
        console.log("📩 Background script a reçu une demande d'arrêt de collecte");
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.error("❌ Aucun onglet actif trouvé");
                return;
            }
            
            chrome.tabs.sendMessage(tabs[0].id, { action: 'stopCollecting' });
        });
        
        return false;
    }
    
    if (message.action === 'dataCollected') {
        console.log("📩 Background script a reçu des données collectées:", message.data);
        updateCollectedData(message.data);
        return false;
    }
    
    if (message.action === 'getCollectingStatus') {
        // Cette fonctionnalité n'est pas implémentée - nous retournons juste un statut par défaut
        sendResponse({ collecting: false });
        return false;
    }
    
    return false;
});

// Écouter l'événement d'installation
chrome.runtime.onInstalled.addListener(() => {
    console.log("🔧 Extension installée ou mise à jour");
    // Initialiser le badge
    updateBadgeCount();
});