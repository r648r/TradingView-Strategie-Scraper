// Remplacer la fonction updateBadgeCount actuelle par celle-ci
function updateBadgeCount() {
    chrome.storage.local.get(['collectedData'], (result) => {
        const collectedData = result.collectedData || [];
        
        // Extraire les tickers uniques
        const uniqueTickers = new Set();
        collectedData.forEach(item => {
            if (item.ticker) {
                uniqueTickers.add(item.ticker);
            }
        });
        
        const uniqueCount = uniqueTickers.size;
        chrome.action.setBadgeText({ text: uniqueCount.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#4688F1' });
        console.log(`🔢 Badge mis à jour: ${uniqueCount} tickers uniques`);
    });
}

// Modifier la fonction updateCollectedData pour utiliser la nouvelle fonction updateBadgeCount
function updateCollectedData(data) {
    console.log("📊 Mise à jour des données collectées");
    
    chrome.storage.local.get(['collectedData'], (result) => {
        const collectedData = result.collectedData || [];
        
        // Vérifier si ce ticker existe déjà
        const ticker = data.ticker;
        if (ticker) {
            const existingIndex = collectedData.findIndex(item => item.ticker === ticker);
            
            if (existingIndex !== -1) {
                console.log(`🔄 Remplacement des données pour le ticker: ${ticker}`);
                // Remplacer les données existantes
                collectedData.splice(existingIndex, 1);
            }
        }
        
        collectedData.push(data);
        console.log(`📌 ${collectedData.length} entrées maintenant stockées`);
        
        chrome.storage.local.set({ collectedData: collectedData }, () => {
            // Mettre à jour le compteur sur l'icône avec les tickers uniques
            updateBadgeCount();
            console.log("✅ Données enregistrées, badge mis à jour");
        });
    });
}