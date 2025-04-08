// content.js - Version optimisée qui utilise les sélecteurs CSS

var collectingData = false;
var spaceBarHandler;

// Gestionnaire principal des messages
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log("Content script a reçu un message:", message);
    
    if (message.action === 'startCollecting') {
        if (!collectingData) {
            collectingData = true;
            collectData();
            window.addEventListener(
                'keydown',
                (spaceBarHandler = (e) => {
                    if (e.code === 'Space' && !e.repeat) {
                        setTimeout(() => {
                            collectData();
                        }, 800);
                    }
                })
            );
        }
    } 
    else if (message.action === 'stopCollecting') {
        if (collectingData) {
            collectingData = false;
            window.removeEventListener('keydown', spaceBarHandler);
        }
    } 
    else if (message.action === 'quickScrape') {
        console.log("Action quickScrape reçue!");
        try {
            const data = quickScrapeSpecificValues();
            console.log("Données récupérées:", data);
            
            // Stocker les données dans localStorage
            storeScrapedData(data);
            
            sendResponse({ success: true, data: data });
        } catch (error) {
            console.error("Erreur lors du scraping:", error);
            sendResponse({ success: false, error: error.message });
        }
        return true; // Important pour maintenir la connexion ouverte pour sendResponse
    }
    
    // Pour les autres actions, aucune réponse n'est nécessaire
    return false;
});

// Fonction pour formater les valeurs numériques pour Excel
function formatValueForExcel(value) {
    if (!value || value === 'N/A') return value;
    
    // Remplacer les + par une chaîne vide et supprimer les virgules des nombres
    return value.replace(/\+/g, '').replace(/,/g, '');
}

// Fonction pour stocker les données scrapées dans localStorage avec gestion des doublons
function storeScrapedData(data) {
    // Récupérer les données existantes
    let existingData = localStorage.getItem('tradingViewData');
    let dataArray = [];
    
    if (existingData) {
        try {
            dataArray = JSON.parse(existingData);
        } catch (e) {
            console.error("Erreur lors du parsing des données existantes:", e);
            dataArray = [];
        }
    }
    
    // Vérifier si cette entrée existe déjà pour éviter les doublons
    const isDuplicate = dataArray.some(item => 
        item.ticker === data.ticker && 
        item.netProfit === data.netProfit &&
        item.maxDrawdown === data.maxDrawdown &&
        item.commissionPaid === data.commissionPaid
    );
    
    // Ajouter les nouvelles données uniquement si ce n'est pas un doublon
    if (!isDuplicate) {
        dataArray.push({
            timestamp: new Date().toISOString(),
            ...data
        });
        
        // Limiter à 100 entrées pour éviter de remplir le stockage
        if (dataArray.length > 100) {
            dataArray = dataArray.slice(-100);
        }
        
        // Sauvegarder les données
        localStorage.setItem('tradingViewData', JSON.stringify(dataArray));
        
        // Créer également une version au format TSV pour Excel avec tabulations au lieu de virgules
        let tsvData = "Ticker\tMax Drawdown\tNet Profit\tBuy & Hold Return\tGross Loss\tGross Profit\tMax Equity Run-up\tCommission Paid\n";
        dataArray.forEach(entry => {
            // Formater les valeurs en supprimant les signes + et les virgules
            const ticker = entry.ticker || 'N/A';
            const maxDrawdown = formatValueForExcel(entry.maxDrawdown || 'N/A');
            const netProfit = formatValueForExcel(entry.netProfit || 'N/A');
            const buyHoldReturn = formatValueForExcel(entry.buyHoldReturn || 'N/A');
            const grossLoss = formatValueForExcel(entry.grossLoss || 'N/A');
            const grossProfit = formatValueForExcel(entry.grossProfit || 'N/A');
            const maxEquityRunUp = formatValueForExcel(entry.maxEquityRunUp || 'N/A');
            const commissionPaid = formatValueForExcel(entry.commissionPaid || 'N/A');
            
            tsvData += `${ticker}\t${maxDrawdown}\t${netProfit}\t${buyHoldReturn}\t${grossLoss}\t${grossProfit}\t${maxEquityRunUp}\t${commissionPaid}\n`;
        });
        
        localStorage.setItem('tradingViewDataCSV', tsvData);
        console.log("Données stockées dans localStorage et format TSV prêt");
        return true; // Indique que les données ont été enregistrées
    } else {
        console.log("Doublon détecté, donnée ignorée");
        return false; // Indique que les données n'ont pas été enregistrées (doublon)
    }
}

function collectData() {
    // Utiliser directement la nouvelle méthode robuste
    const data = findTradingViewValues();
    chrome.runtime.sendMessage({ action: 'dataCollected', data: data });
}

// Fonction unifiée pour trouver toutes les valeurs
function findTradingViewValues() {
    // Ticker
    let ticker = findTickerValue();
    
    // Utiliser la méthode robuste pour trouver chaque valeur (maintenant pourcentages)
    const netProfit = findPercentValueByLabel("Net profit");
    const grossProfit = findPercentValueByLabel("Gross profit");
    const grossLoss = findPercentValueByLabel("Gross loss");
    const maxDrawdown = findPercentValueByLabel("Max equity drawdown");
    
    // Nouveaux champs demandés
    const commissionPaid = findCommissionPaid(); // Méthode spécifique pour Commission paid
    const buyHoldReturn = findPercentValueByLabel("Buy & hold return");
    const maxEquityRunUp = findPercentValueByLabel("Max equity run-up");
    
    return {
        ticker: ticker,
        netProfit: netProfit,
        grossProfit: grossProfit,
        grossLoss: grossLoss,
        maxDrawdown: maxDrawdown,
        commissionPaid: commissionPaid,
        buyHoldReturn: buyHoldReturn,
        maxEquityRunUp: maxEquityRunUp
    };
}

// Fonction spécifique pour trouver le ticker
function findTickerValue() {
    try {
        // Essayer avec le sélecteur standard
        const element = document.querySelector("#header-toolbar-symbol-search > div");
        if (element) {
            return element.textContent.trim();
        }
        
        // Méthode alternative: chercher dans le titre
        const titleMatch = document.title.match(/(\w+)(?:\:|\/)/);
        if (titleMatch && titleMatch[1]) {
            return titleMatch[1];
        }
        
        // Chercher d'autres éléments qui pourraient contenir le ticker
        const possibleTickers = [
            document.querySelector('[data-name="legend-source-item"]'),
            document.querySelector('[data-name="legend-series-item"]'),
            document.querySelector('.chart-markup-table.pane')
        ];
        
        for (const el of possibleTickers) {
            if (el && el.textContent.match(/[A-Z]+\/[A-Z]+/) || el.textContent.match(/[A-Z]+USD/)) {
                return el.textContent.trim().split(' ')[0];
            }
        }
    } catch (e) {
        console.error("Erreur lors de la récupération du ticker:", e);
    }
    
    return "N/A";
}

// Fonction optimisée pour trouver le pourcentage par son libellé
function findPercentValueByLabel(labelText) {
    console.log(`Recherche du pourcentage pour "${labelText}"`);
    
    // Stratégie 1: Rechercher dans les lignes de tableau
    try {
        const rows = document.querySelectorAll('tr');
        for (const row of rows) {
            // Vérifier si cette ligne contient le libellé
            const hasLabel = Array.from(row.querySelectorAll('div')).some(
                div => div.textContent && div.textContent.trim() === labelText
            );
            
            if (hasLabel) {
                // Chercher l'élément pourcentage dans cette ligne
                const percentElement = row.querySelector('div[class*="percentValue-"]');
                if (percentElement) {
                    let value = percentElement.textContent.trim();
                    value = value.replace('−', '-');
                    console.log(`Trouvé pourcentage pour ${labelText}: "${value}"`);
                    return value;
                }
            }
        }
    } catch (e) {
        console.warn(`Stratégie 1 a échoué pour ${labelText}:`, e);
    }
    
    // Stratégie 2: Recherche par contenu du texte
    try {
        // Tous les éléments contenant le texte du libellé exact
        const elements = Array.from(document.querySelectorAll('*')).filter(
            el => el.textContent && el.textContent.trim() === labelText
        );
        
        for (const element of elements) {
            // Remonter pour trouver la ligne
            let currentNode = element;
            for (let i = 0; i < 4; i++) {
                if (!currentNode) break;
                
                // Si c'est une ligne de tableau
                if (currentNode.tagName === 'TR') {
                    // Chercher le pourcentage dans cette ligne
                    const percentElement = currentNode.querySelector('div[class*="percentValue-"]');
                    if (percentElement) {
                        let value = percentElement.textContent.trim();
                        value = value.replace('−', '-');
                        console.log(`Trouvé pourcentage pour ${labelText} (stratégie 2): "${value}"`);
                        return value;
                    }
                }
                
                // Chercher plus proche dans le nœud actuel
                const percentElement = currentNode.querySelector('div[class*="percentValue-"]');
                if (percentElement) {
                    let value = percentElement.textContent.trim();
                    value = value.replace('−', '-');
                    console.log(`Trouvé pourcentage pour ${labelText} (stratégie 2b): "${value}"`);
                    return value;
                }
                
                currentNode = currentNode.parentElement;
            }
        }
    } catch (e) {
        console.warn(`Stratégie 2 a échoué pour ${labelText}:`, e);
    }
    
    // Stratégie 3: Recherche par proximité dans le DOM
    try {
        const textNodes = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            { 
                acceptNode: function(node) {
                    return node.textContent.trim() === labelText ? 
                        NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                }
            }
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        for (const textNode of textNodes) {
            // Chercher le conteneur parent
            let parent = textNode.parentElement;
            if (!parent) continue;
            
            // Chercher jusqu'à 4 niveaux au-dessus
            for (let i = 0; i < 4; i++) {
                if (!parent) break;
                
                // Essayer de trouver un élément de pourcentage à ce niveau
                const percentElement = parent.querySelector('div[class*="percentValue-"]');
                if (percentElement) {
                    let value = percentElement.textContent.trim();
                    value = value.replace('−', '-');
                    console.log(`Trouvé pourcentage pour ${labelText} (stratégie 3): "${value}"`);
                    return value;
                }
                
                // Monter d'un niveau
                parent = parent.parentElement;
            }
        }
    } catch (e) {
        console.warn(`Stratégie 3 a échoué pour ${labelText}:`, e);
    }
    
    // Si aucun pourcentage trouvé, revenir à la valeur standard
    console.log(`Aucun pourcentage trouvé pour ${labelText}, recherche de la valeur standard...`);
    return findValueByLabel(labelText);
}

// Fonction optimisée pour trouver une valeur par son libellé (conservée pour les valeurs sans pourcentage)
function findValueByLabel(labelText) {
    console.log(`Recherche de la valeur pour "${labelText}"`);
    
    // Stratégie 1: Recherche basée sur la structure des tableaux
    try {
        const rows = document.querySelectorAll('tr');
        for (const row of rows) {
            // Vérifier si cette ligne contient le libellé
            const hasLabel = Array.from(row.querySelectorAll('div')).some(
                div => div.textContent && div.textContent.trim() === labelText
            );
            
            if (hasLabel) {
                // Chercher l'élément valeur dans cette ligne
                const valueElement = row.querySelector('div[class*="value-"]');
                if (valueElement) {
                    let value = valueElement.textContent.trim();
                    // Remplacer le tiret TradingView par un signe moins standard
                    value = value.replace('−', '-');
                    console.log(`Trouvé ${labelText}: "${value}"`);
                    return value;
                }
            }
        }
    } catch (e) {
        console.warn(`Stratégie 1 a échoué pour ${labelText}:`, e);
    }
    
    // Stratégie 2: Recherche par contenu du texte
    try {
        // Tous les éléments contenant le texte du libellé exact
        const elements = Array.from(document.querySelectorAll('*')).filter(
            el => el.textContent && el.textContent.trim() === labelText
        );
        
        for (const element of elements) {
            // Remonter pour trouver la ligne
            let currentNode = element;
            for (let i = 0; i < 4; i++) {
                if (!currentNode) break;
                
                // Si c'est une ligne de tableau
                if (currentNode.tagName === 'TR') {
                    // Chercher la cellule avec la valeur
                    const valueElement = currentNode.querySelector('div[class*="value-"]');
                    if (valueElement) {
                        let value = valueElement.textContent.trim();
                        value = value.replace('−', '-');
                        console.log(`Trouvé ${labelText} (stratégie 2): "${value}"`);
                        return value;
                    }
                }
                
                currentNode = currentNode.parentElement;
            }
        }
    } catch (e) {
        console.warn(`Stratégie 2 a échoué pour ${labelText}:`, e);
    }
    
    // Stratégie 3: Recherche par proximité dans le DOM
    try {
        const textNodes = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            { 
                acceptNode: function(node) {
                    return node.textContent.trim() === labelText ? 
                        NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
                }
            }
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        for (const textNode of textNodes) {
            // Trouver le nœud de valeur le plus proche
            const parent = textNode.parentElement;
            if (!parent) continue;
            
            // Chercher dans les frères
            let sibling = parent.nextElementSibling;
            while (sibling) {
                const valueEl = sibling.querySelector('div[class*="value-"]');
                if (valueEl) {
                    let value = valueEl.textContent.trim();
                    value = value.replace('−', '-');
                    console.log(`Trouvé ${labelText} (stratégie 3.1): "${value}"`);
                    return value;
                }
                sibling = sibling.nextElementSibling;
            }
            
            // Chercher dans le parent commun
            const grandParent = parent.parentElement;
            if (grandParent) {
                const valueElements = grandParent.querySelectorAll('div[class*="value-"]');
                for (const valueEl of valueElements) {
                    if (!valueEl.textContent.includes(labelText)) {
                        let value = valueEl.textContent.trim();
                        value = value.replace('−', '-');
                        console.log(`Trouvé ${labelText} (stratégie 3.2): "${value}"`);
                        return value;
                    }
                }
            }
        }
    } catch (e) {
        console.warn(`Stratégie 3 a échoué pour ${labelText}:`, e);
    }
    
    console.warn(`Aucune valeur trouvée pour "${labelText}"`);
    return "N/A";
}

// Fonction spécifique pour trouver la Commission paid
function findCommissionPaid() {
    console.log("Recherche spécifique de Commission paid");
    
    try {
        // Stratégie 1: Rechercher par le texte "Commission paid" dans les titres
        const titleElements = Array.from(document.querySelectorAll('div.title-NcOKy65p, div.apply-overflow-tooltip'));
        for (const titleElement of titleElements) {
            if (titleElement.textContent && titleElement.textContent.trim() === "Commission paid") {
                // Remonter jusqu'à la cellule td
                let currentElement = titleElement;
                while (currentElement && currentElement.tagName !== 'TR') {
                    currentElement = currentElement.parentElement;
                }
                
                if (currentElement) {
                    // Chercher la valeur dans la cellule suivante
                    const valueElement = currentElement.querySelector('div.value-SLJfw5le');
                    if (valueElement) {
                        console.log("Commission trouvée:", valueElement.textContent);
                        return valueElement.textContent.trim();
                    }
                }
            }
        }
        
        // Stratégie 2: Chercher directement dans toutes les lignes TR
        const rows = document.querySelectorAll('tr');
        for (const row of rows) {
            if (row.textContent.includes("Commission paid")) {
                const valueElement = row.querySelector('div.value-SLJfw5le');
                if (valueElement) {
                    console.log("Commission trouvée (stratégie 2):", valueElement.textContent);
                    return valueElement.textContent.trim();
                }
                
                // Essayer avec un sélecteur plus générique si le précédent échoue
                const valueElement2 = row.querySelector('div[class*="value-"]');
                if (valueElement2) {
                    console.log("Commission trouvée (sélecteur générique):", valueElement2.textContent);
                    return valueElement2.textContent.trim();
                }
            }
        }
        
        // Stratégie 3: Chercher dans tous les éléments contenant "Commission paid"
        const commissionElements = Array.from(document.querySelectorAll('*')).filter(
            el => el.textContent && el.textContent.trim() === "Commission paid"
        );
        
        for (const element of commissionElements) {
            // Remonter pour trouver le parent commun
            let currentNode = element.parentElement;
            for (let i = 0; i < 4; i++) {
                if (!currentNode) break;
                
                // Chercher un élément valeur à ce niveau
                const valueElement = currentNode.querySelector('div[class*="value-"]');
                if (valueElement) {
                    console.log("Commission trouvée (stratégie 3):", valueElement.textContent);
                    return valueElement.textContent.trim();
                }
                
                // Monter d'un niveau
                currentNode = currentNode.parentElement;
            }
        }
        
        // Stratégie 4: Récupération générique
        return findValueByLabel("Commission paid");
    } catch (e) {
        console.warn("Erreur lors de la recherche de Commission paid:", e);
        return "N/A";
    }
}

// Version spécifique pour le scrape rapide - optimisée pour les pourcentages
function quickScrapeSpecificValues() {
    console.log("Exécution de quickScrapeSpecificValues");
    
    // Récupérer le ticker
    const ticker = findTickerValue();
    
    // Récupérer les valeurs en pourcentage
    const netProfit = findPercentValueByLabel("Net profit");
    const grossProfit = findPercentValueByLabel("Gross profit");
    const grossLoss = findPercentValueByLabel("Gross loss");
    const maxDrawdown = findPercentValueByLabel("Max equity drawdown");
    
    // Nouveaux champs demandés
    const commissionPaid = findCommissionPaid(); // Méthode spécifique pour Commission paid
    const buyHoldReturn = findPercentValueByLabel("Buy & hold return");
    const maxEquityRunUp = findPercentValueByLabel("Max equity run-up");
    
    return {
        ticker: ticker,
        netProfit: netProfit,
        grossProfit: grossProfit,
        grossLoss: grossLoss,
        maxDrawdown: maxDrawdown,
        commissionPaid: commissionPaid,
        buyHoldReturn: buyHoldReturn,
        maxEquityRunUp: maxEquityRunUp
    };
}

// Fonction pour exporter les données au format TSV
function getCSVData() {
    const tsvData = localStorage.getItem('tradingViewDataCSV');
    return tsvData || "Aucune donnée disponible";
}