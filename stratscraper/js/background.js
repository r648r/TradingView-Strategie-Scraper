// background.js - Version adaptée pour les sélecteurs CSS et les pourcentages

let collecting = false; // Garde la trace de l'état de la collecte

// Gestionnaire principal des messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background script a reçu un message:", message);
    
    if (message.action === 'start') {
        collecting = true;
        updateButtonStates();
        injectContentScript();
    } 
    else if (message.action === 'stop') {
        collecting = false;
        updateButtonStates();
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'stopCollecting' });
            }
        });
    } 
    else if (message.action === 'dataCollected') {
        updateCollectedData(message.data);
        // Transférer le message au popup pour mise à jour du statut
        chrome.runtime.sendMessage({ action: 'dataCollected' });
    } 
    else if (message.action === 'getCollectingStatus') {
        sendResponse({ collecting: collecting });
    }
    // Gestionnaire pour le debug CSS
    else if (message.action === 'debugCSS') {
        debugCSSInTab(message.selector, sendResponse);
        return true; // Important pour la réponse asynchrone
    }
    // Gestionnaire pour le scrape rapide
    else if (message.action === 'performQuickScrape') {
        performQuickScrapeInTab(sendResponse);
        return true; // Important pour la réponse asynchrone
    }
});

function injectContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            console.error("Aucun onglet actif trouvé");
            return;
        }
        
        const tab = tabs[0];
        if (tab.url.includes('tradingview.com')) {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id },
                    files: ['js/content.js'],
                },
                (injectionResults) => {
                    if (chrome.runtime.lastError) {
                        console.error("Erreur d'injection:", chrome.runtime.lastError);
                        chrome.runtime.sendMessage({ 
                            action: 'error', 
                            message: 'Erreur lors de l\'injection du script: ' + chrome.runtime.lastError.message 
                        });
                        return;
                    }
                    
                    console.log("Script injecté avec succès, démarrage de la collecte");
                    chrome.tabs.sendMessage(tab.id, { action: 'startCollecting' });
                }
            );
        } else {
            console.warn("URL non valide pour TradingView:", tab.url);
            // Utiliser chrome.action.setBadgeText au lieu d'alert pour une meilleure UX
            chrome.action.setBadgeText({ text: 'ERR' });
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
            
            // Notifier le popup
            chrome.runtime.sendMessage({ 
                action: 'error', 
                message: 'Veuillez ouvrir TradingView.com dans l\'onglet actif.' 
            });
            
            // Réinitialiser l'état de collecte
            collecting = false;
            updateButtonStates();
        }
    });
}

// Fonction pour déboguer un sélecteur CSS directement - Mise à jour pour inclure les pourcentages
function debugCSSInTab(selector, sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            sendResponse({ success: false, error: "Aucun onglet actif" });
            return;
        }
        
        const tab = tabs[0];
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: (selectorToTest) => {
                console.log("Test sélecteur CSS:", selectorToTest);
                try {
                    const element = document.querySelector(selectorToTest);
                    
                    if (element) {
                        // Chercher aussi un pourcentage à proximité
                        let percentElement = null;
                        let percentValue = null;
                        let parentElement = element.parentElement;
                        
                        // Chercher un élément avec classe percentValue
                        if (parentElement) {
                            percentElement = parentElement.querySelector('div[class*="percentValue-"]');
                            if (percentElement) {
                                percentValue = percentElement.textContent.trim();
                            }
                        }
                        
                        return { 
                            success: true, 
                            text: element.textContent.trim(),
                            percentValue: percentValue,
                            nodeType: element.nodeType,
                            tagName: element.tagName
                        };
                    } else {
                        // Tentative avec un sélecteur moins spécifique
                        const genericSelector = selectorToTest.replace(/\.\w+-\w+/, '[class*="-"]');
                        console.log("Essai avec sélecteur générique:", genericSelector);
                        const genericElement = document.querySelector(genericSelector);
                        
                        if (genericElement) {
                            // Chercher aussi un pourcentage à proximité
                            let percentElement = null;
                            let percentValue = null;
                            let parentElement = genericElement.parentElement;
                            
                            // Chercher un élément avec classe percentValue
                            if (parentElement) {
                                percentElement = parentElement.querySelector('div[class*="percentValue-"]');
                                if (percentElement) {
                                    percentValue = percentElement.textContent.trim();
                                }
                            }
                            
                            return { 
                                success: true, 
                                text: genericElement.textContent.trim(),
                                percentValue: percentValue,
                                nodeType: genericElement.nodeType,
                                tagName: genericElement.tagName,
                                note: "Trouvé avec sélecteur générique"
                            };
                        }
                        
                        return { success: false, error: "Aucun élément trouvé" };
                    }
                } catch (error) {
                    return { success: false, error: error.toString() };
                }
            },
            args: [selector]
        }, (results) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            
            if (results && results.length > 0) {
                sendResponse(results[0].result);
            } else {
                sendResponse({ success: false, error: "Aucun résultat" });
            }
        });
    });
}

// Fonction pour effectuer un scrape rapide
function performQuickScrapeInTab(sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            sendResponse({ success: false, error: "Aucun onglet actif" });
            return;
        }
        
        const tab = tabs[0];
        
        // 1. Injecter le script content si nécessaire
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['js/content.js']
        }, () => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            
            // 2. Envoyer la commande de scrape rapide
            chrome.tabs.sendMessage(tab.id, { action: 'quickScrape' }, (response) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    return;
                }
                
                // 3. Transférer la réponse
                sendResponse(response);
            });
        });
    });
}

function updateCollectedData(data) {
    chrome.storage.local.get(['collectedData'], (result) => {
        const collectedData = result.collectedData || [];
        collectedData.push(data);
        chrome.storage.local.set({ collectedData: collectedData }, () => {
            // Mettre à jour le compteur sur l'icône
            updateBadgeCount(collectedData.length);
        });
    });
}

function updateBadgeCount(count) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#4688F1' });
}

function updateButtonStates() {
    // Notifier le popup pour mettre à jour l'état des boutons
    chrome.runtime.sendMessage({ action: 'updateButtonStates', collecting: collecting });
}

// Réinitialiser le texte du badge au démarrage
chrome.runtime.onStartup.addListener(() => {
    chrome.action.setBadgeText({ text: '' });
});

// Réinitialiser le texte du badge à l'installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeText({ text: '' });
    console.log("Extension TradingView Data Collector installée ou mise à jour");
});