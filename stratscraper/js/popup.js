// popup.js - Version avec affichage direct des données

// Éléments UI
let startBtn, stopBtn, exportJsonBtn, clearDataBtn, quickScrapeBtn, exportExcelBtn, statusDiv, dataContainer;

// Initialiser les gestionnaires d'événements quand le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    // Récupérer les références aux éléments UI
    startBtn = document.getElementById('startBtn');
    stopBtn = document.getElementById('stopBtn');
    exportJsonBtn = document.getElementById('exportJsonBtn');
    clearDataBtn = document.getElementById('clearDataBtn');
    quickScrapeBtn = document.getElementById('quickScrapeBtn');
    exportExcelBtn = document.getElementById('exportExcelBtn');
    statusDiv = document.getElementById('status');
    dataContainer = document.getElementById('dataContainer');
    
    // Vérifier si des éléments manquent
    if (!startBtn || !stopBtn || !exportJsonBtn || !clearDataBtn || !quickScrapeBtn || !statusDiv || !dataContainer) {
        console.error("Certains éléments UI n'ont pas été trouvés");
        return;
    }

    // Charger et afficher les données existantes
    loadAndDisplayData();

    // Vérifier l'état de collecte initial
    chrome.runtime.sendMessage({ action: 'getCollectingStatus' }, function(response) {
        if (response && response.collecting) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            updateStatus('Collecte en cours...');
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            updateStatus('Prêt à collecter des données');
        }
    });

    // Gestionnaire pour le bouton Démarrer
    startBtn.addEventListener('click', function() {
        chrome.runtime.sendMessage({ action: 'start' });
        startBtn.disabled = true;
        stopBtn.disabled = false;
        updateStatus('Collecte en cours...');
    });

    // Gestionnaire pour le bouton Arrêter
    stopBtn.addEventListener('click', function() {
        chrome.runtime.sendMessage({ action: 'stop' });
        startBtn.disabled = false;
        stopBtn.disabled = true;
        updateStatus('Collecte arrêtée');
    });

    // Gestionnaire pour le bouton Export JSON
    exportJsonBtn.addEventListener('click', function() {
        downloadJson();
    });

    // Gestionnaire pour le bouton Effacer
    clearDataBtn.addEventListener('click', function() {
        clearCollectedData();
    });

    // Gestionnaire pour le bouton Export Excel
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function() {
            exportToExcel();
        });
    }

    // Gestionnaire pour le bouton One Scrape
    quickScrapeBtn.addEventListener('click', function() {
        console.log("Bouton One Scrape cliqué");
        updateStatus('Récupération des données en cours...');
        
        performQuickScrape();
    });
});

// Écouter les messages du background script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'updateButtonStates') {
        if (message.collecting) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            updateStatus('Collecte en cours...');
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            updateStatus('Collecte arrêtée');
        }
    } else if (message.action === 'dataCollected') {
        updateStatus('Données collectées avec succès');
        // Recharger l'affichage des données
        loadAndDisplayData();
    } else if (message.action === 'error') {
        updateStatus('Erreur: ' + message.message);
    }
});

// Fonction pour charger et afficher les données
function loadAndDisplayData() {
    chrome.storage.local.get(['collectedData'], function(result) {
        const collectedData = result.collectedData || [];
        
        // Éliminer les doublons
        const uniqueData = removeDuplicates(collectedData);
        
        // Mettre à jour l'affichage
        displayDataInPopup(uniqueData);
    });
}

// Fonction modifiée pour supprimer les doublons et garder la dernière occurrence de chaque ticker
function removeDuplicates(data) {
    const tickerMap = new Map(); // Map de ticker -> indice
    const duplicates = new Set(); // Ensemble des tickers avec doublons
    
    // Premier passage : identifier les doublons et mémoriser la dernière occurrence
    for (let i = 0; i < data.length; i++) {
        const ticker = data[i].ticker;
        if (ticker) {  // Vérifier que le ticker existe et n'est pas vide
            if (tickerMap.has(ticker)) {
                duplicates.add(ticker);
                tickerMap.set(ticker, i); // Mettre à jour vers le dernier indice
            } else {
                tickerMap.set(ticker, i);
            }
        }
    }
    
    // Journaliser les doublons trouvés
    if (duplicates.size > 0) {
        console.log(`Doublons trouvés pour les paires: ${Array.from(duplicates).join(', ')}`);
    }
    
    // Second passage : construire le tableau filtré
    const uniqueData = [];
    const seenTickers = new Set();
    
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const ticker = item.ticker;
        
        if (!ticker) {
            // Inclure les éléments sans ticker (s'il y en a)
            uniqueData.push(item);
            continue;
        }
        
        // Si ce n'est pas la dernière occurrence d'un ticker en double, passer
        if (duplicates.has(ticker) && tickerMap.get(ticker) !== i) {
            continue;
        }
        
        // Si on a déjà ajouté ce ticker, passer
        if (seenTickers.has(ticker)) {
            continue;
        }
        
        seenTickers.add(ticker);
        uniqueData.push(item);
    }
    
    return uniqueData;
}

// Fonction pour afficher les données dans le popup
function displayDataInPopup(data) {
    if (!dataContainer) return;
    
    if (data.length === 0) {
        dataContainer.innerHTML = '<p class="no-data">Aucune donnée disponible</p>';
        return;
    }
    
    let tableHtml = '<table class="data-table">';
    tableHtml += '<tr><th>Ticker</th><th>Net Profit</th><th>Max DD</th><th>Commission</th></tr>';
    
    data.forEach(item => {
        tableHtml += `<tr>
            <td>${item.ticker || 'N/A'}</td>
            <td>${item.netProfit || 'N/A'}</td>
            <td>${item.maxDrawdown || 'N/A'}</td>
            <td>${item.commissionPaid || 'N/A'}</td>
        </tr>`;
    });
    
    tableHtml += '</table>';
    dataContainer.innerHTML = tableHtml;
}

// Fonction pour formater les valeurs numériques pour Excel
function formatValueForExcel(value) {
    if (!value || value === 'N/A') return value;
    
    // Remplacer les + par une chaîne vide et supprimer les virgules des nombres
    return value.replace(/\+/g, '').replace(/,/g, '');
}

// Fonction pour effectuer un scrape rapide
function performQuickScrape() {
    // Récupérer l'onglet actif
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs || tabs.length === 0) {
            console.error("Aucun onglet actif trouvé");
            updateStatus('Erreur: Aucun onglet actif trouvé');
            return;
        }
        
        const tab = tabs[0];
        console.log("Onglet actif:", tab.url);
        
        if (!tab.url.includes('tradingview.com')) {
            console.warn("L'URL n'est pas TradingView:", tab.url);
            updateStatus('Erreur: Veuillez ouvrir TradingView pour utiliser cette fonction');
            return;
        }
        
        // Envoyer la demande de scrape rapide
        chrome.runtime.sendMessage({ action: 'performQuickScrape' }, function(response) {
            if (chrome.runtime.lastError) {
                console.error("Erreur lors de la communication:", chrome.runtime.lastError);
                updateStatus('Erreur: ' + chrome.runtime.lastError.message);
                return;
            }
            
            console.log("Réponse reçue pour quickScrape:", response);
            
            if (response && response.success) {
                const data = response.data;
                
                // Mettre à jour le statut
                updateStatus('Données récupérées avec succès!');
                
                // Enregistrer dans le stockage
                chrome.storage.local.get(['collectedData'], function(result) {
                    const collectedData = result.collectedData || [];
                    
                    // Vérifier si ce ticker existe déjà
                    const existingIndex = collectedData.findIndex(item => item.ticker === data.ticker);
                    
                    if (existingIndex !== -1) {
                        // Remplacer l'entrée existante par la nouvelle
                        console.log(`Remplacement de l'entrée dupliquée pour la paire: ${data.ticker}`);
                        collectedData.splice(existingIndex, 1);
                    }
                    
                    // Ajouter la nouvelle entrée
                    collectedData.push(data);
                    
                    chrome.storage.local.set({ collectedData: collectedData }, function() {
                        console.log("Données enregistrées, mise à jour du badge");
                        chrome.action.setBadgeText({ text: collectedData.length.toString() });
                        chrome.action.setBadgeBackgroundColor({ color: '#4688F1' });
                        
                        // Recharger l'affichage
                        loadAndDisplayData();
                    });
                });
            } else {
                updateStatus('Erreur: Impossible de récupérer les données');
            }
        });
    });
}

// Fonction pour télécharger les données au format JSON
function downloadJson() {
    chrome.storage.local.get(['collectedData'], function(result) {
        const collectedData = result.collectedData || [];
        if (collectedData.length === 0) {
            updateStatus('Aucune donnée à exporter');
            return;
        }
        
        // Éliminer les doublons
        const uniqueData = removeDuplicates(collectedData);
        
        // Créer un blob JSON
        const jsonBlob = new Blob([JSON.stringify(uniqueData, null, 2)], {type: 'application/json'});
        
        // Créer un lien de téléchargement
        const downloadUrl = URL.createObjectURL(jsonBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'tradingview_data_' + new Date().toISOString().slice(0, 10) + '.json';
        
        // Déclencher le téléchargement
        document.body.appendChild(a);
        a.click();
        
        // Nettoyer
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
            updateStatus('Téléchargement JSON terminé');
        }, 100);
    });
}

// Fonction pour exporter les données pour Excel
function exportToExcel() {
    // Tenter d'abord d'accéder au localStorage
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs || tabs.length === 0) {
            updateStatus('Erreur: Aucun onglet actif trouvé');
            return;
        }
        
        const tab = tabs[0];
        
        // Exécuter un script pour récupérer les données
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                // Si les données existent dans localStorage, les récupérer
                const excelData = localStorage.getItem('tradingViewData');
                if (excelData) {
                    try {
                        // Analyser les données JSON
                        const rawDataArray = JSON.parse(excelData);
                        
                        // Éliminer les doublons en gardant la dernière occurrence par ticker
                        const tickerMap = new Map();
                        for (let i = 0; i < rawDataArray.length; i++) {
                            const ticker = rawDataArray[i].ticker;
                            if (ticker) {
                                tickerMap.set(ticker, i);
                            }
                        }
                        
                        const dataArray = [];
                        const processed = new Set();
                        
                        for (let i = 0; i < rawDataArray.length; i++) {
                            const ticker = rawDataArray[i].ticker;
                            if (!ticker || processed.has(ticker)) continue;
                            
                            // Si c'est la dernière occurrence de ce ticker, l'utiliser
                            if (tickerMap.get(ticker) === i) {
                                dataArray.push(rawDataArray[i]);
                                processed.add(ticker);
                            }
                        }
                        
                        console.log("Doublons éliminés, données restantes:", dataArray.length);
                        
                        // Formater pour Excel avec tabulations
                        let tsvContent = "Ticker\tMax Drawdown\tNet Profit\tBuy & Hold Return\tGross Loss\tGross Profit\tMax Equity Run-up\tCommission Paid\n";
                        
                        dataArray.forEach(data => {
                            // Supprimer les signes + et les virgules dans les valeurs numériques
                            const ticker = data.ticker || 'N/A';
                            const maxDrawdown = data.maxDrawdown ? data.maxDrawdown.replace(/\+/g, '').replace(/,/g, '') : 'N/A';
                            const netProfit = data.netProfit ? data.netProfit.replace(/\+/g, '').replace(/,/g, '') : 'N/A';
                            const buyHoldReturn = data.buyHoldReturn ? data.buyHoldReturn.replace(/\+/g, '').replace(/,/g, '') : 'N/A';
                            const grossLoss = data.grossLoss ? data.grossLoss.replace(/\+/g, '').replace(/,/g, '') : 'N/A';
                            const grossProfit = data.grossProfit ? data.grossProfit.replace(/\+/g, '').replace(/,/g, '') : 'N/A';
                            const maxEquityRunUp = data.maxEquityRunUp ? data.maxEquityRunUp.replace(/\+/g, '').replace(/,/g, '') : 'N/A';
                            const commissionPaid = data.commissionPaid ? data.commissionPaid.replace(/\+/g, '').replace(/,/g, '') : 'N/A';
                            
                            tsvContent += `${ticker}\t${maxDrawdown}\t${netProfit}\t${buyHoldReturn}\t${grossLoss}\t${grossProfit}\t${maxEquityRunUp}\t${commissionPaid}\n`;
                        });
                        
                        return tsvContent;
                    } catch (e) {
                        console.error("Erreur lors du parsing JSON:", e);
                        return null;
                    }
                }
                return null;
            }
        }, (results) => {
            if (chrome.runtime.lastError) {
                console.error('Erreur lors de la récupération des données:', chrome.runtime.lastError);
                exportExcelFromStorage();
                return;
            }
            
            if (results && results[0] && results[0].result) {
                const tsvContent = results[0].result;
                navigator.clipboard.writeText(tsvContent)
                    .then(() => {
                        updateStatus('Données exportées dans le presse-papiers (format Excel)');
                    })
                    .catch(err => {
                        console.error('Erreur lors de la copie:', err);
                        updateStatus('Erreur lors de l\'export des données');
                    });
            } else {
                exportExcelFromStorage();
            }
        });
    });
}

// Fonction alternative pour exporter les données Excel à partir du stockage de l'extension
function exportExcelFromStorage() {
    chrome.storage.local.get(['collectedData'], function(result) {
        const collectedData = result.collectedData || [];
        if (collectedData.length === 0) {
            updateStatus('Aucune donnée à exporter');
            return;
        }
        
        // Éliminer les doublons
        const uniqueData = removeDuplicates(collectedData);
        
        // Créer une chaîne tabulée (TSV)
        let tsvContent = 'Ticker\tMax Drawdown\tNet Profit\tBuy & Hold Return\tGross Loss\tGross Profit\tMax Equity Run-up\tCommission Paid\n';
        
        uniqueData.forEach(data => {
            // Formater les valeurs en supprimant les signes + et les virgules
            const ticker = data.ticker || 'N/A';
            const maxDrawdown = formatValueForExcel(data.maxDrawdown || 'N/A');
            const netProfit = formatValueForExcel(data.netProfit || 'N/A');
            const buyHoldReturn = formatValueForExcel(data.buyHoldReturn || 'N/A');
            const grossLoss = formatValueForExcel(data.grossLoss || 'N/A');
            const grossProfit = formatValueForExcel(data.grossProfit || 'N/A');
            const maxEquityRunUp = formatValueForExcel(data.maxEquityRunUp || 'N/A');
            const commissionPaid = formatValueForExcel(data.commissionPaid || 'N/A');
            
            tsvContent += `${ticker}\t${maxDrawdown}\t${netProfit}\t${buyHoldReturn}\t${grossLoss}\t${grossProfit}\t${maxEquityRunUp}\t${commissionPaid}\n`;
        });
        
        // Copier dans le presse-papiers
        navigator.clipboard.writeText(tsvContent)
            .then(() => {
                updateStatus('Données copiées dans le presse-papiers (format Excel)');
            })
            .catch(err => {
                console.error('Erreur lors de la copie:', err);
                updateStatus('Erreur lors de la copie des données');
            });
    });
}

// Effacer les données collectées
function clearCollectedData() {
    // Effacer à la fois le stockage Chrome et le localStorage
    chrome.storage.local.set({ collectedData: [] }, function() {
        // Effacer aussi le localStorage
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs && tabs.length > 0) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    function: () => {
                        localStorage.removeItem('tradingViewData');
                        localStorage.removeItem('tradingViewDataCSV');
                    }
                }, () => {
                    updateStatus('Données effacées');
                    chrome.action.setBadgeText({ text: '' });
                    // Mettre à jour l'affichage
                    dataContainer.innerHTML = '<p class="no-data">Aucune donnée disponible</p>';
                });
            } else {
                updateStatus('Données effacées (extension uniquement)');
                chrome.action.setBadgeText({ text: '' });
                // Mettre à jour l'affichage
                dataContainer.innerHTML = '<p class="no-data">Aucune donnée disponible</p>';
            }
        });
    });
}

// Mettre à jour le message de statut
function updateStatus(message) {
    console.log("Status update:", message);
    if (statusDiv) {
        statusDiv.textContent = message;
    }
}