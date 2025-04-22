// content.js - Version optimisée avec logs réduits

console.log("🚀 Content script TradingView Data Collector chargé");

// Variables globales
var collectingData = false;
var spaceBarHandler;

// Gestionnaire principal des messages
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log("📩 Content script a reçu un message:", message);

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
                        }, 1200);
                    }
                })
            );
            console.log("✅ Collecte démarrée");
        }
        return false;
    }
    else if (message.action === 'stopCollecting') {
        if (collectingData) {
            collectingData = false;
            window.removeEventListener('keydown', spaceBarHandler);
            console.log("✅ Collecte arrêtée");
        }
        return false;
    }
    else if (message.action === 'quickScrape') {
        console.log("🔍 Action quickScrape reçue!");
        try {
            const data = quickScrapeSpecificValues();
            console.log("📊 Données récupérées:", data);

            // Stocker les données dans localStorage
            const storedSuccessfully = storeScrapedData(data);
            console.log("💾 Stockage des données:", storedSuccessfully ? "réussi" : "échoué");

            sendResponse({ success: true, data: data });
            console.log("✅ Réponse envoyée avec succès pour quickScrape");
        } catch (error) {
            console.error("❌ Erreur lors du scraping:", error);
            sendResponse({ success: false, error: error.message });
        }
        return true; // Important pour maintenir la connexion ouverte pour sendResponse
    }

    return false;
});

// Fonction pour collecter les données et les envoyer au background script
function collectData() {
    console.log("🔄 Collecte de données en cours : collectData");

    try {
        const data = findTradingViewValues();
        console.log("📊 Données collectées:", data);

        // Envoyer sans attendre de réponse
        chrome.runtime.sendMessage({ action: 'dataCollected', data: data });
        console.log("📤 Données envoyées au background script : collectData");
    } catch (error) {
        console.error("❌ collectData : Erreur lors de la collecte de données:", error);
    }
}

// Fonction pour formater les valeurs numériques pour Excel
function formatValueForExcel(value) {
    if (!value || value === 'N/A') return value;

    // Remplacer les + par une chaîne vide et supprimer les virgules des nombres
    return value.replace(/\+/g, '').replace(/,/g, '');
}

// Modification de la fonction storeScrapedData pour gérer les combinaisons ticker+timeframe
function storeScrapedData(data) {
    console.log("💾 Stockage des données dans localStorage...");

    if (!data || !data.ticker) {
        console.warn("❌ Données invalides ou sans ticker");
        return false;
    }

    try {
        // Récupérer les données existantes
        let existingData = localStorage.getItem('tradingViewData');
        let dataArray = [];

        if (existingData) {
            try {
                dataArray = JSON.parse(existingData);
                console.log(`📊 ${dataArray.length} entrées trouvées dans localStorage`);
            } catch (e) {
                console.error("❌ Erreur lors du parsing des données existantes:", e);
                dataArray = [];
            }
        }

        // Vérifier si cette combinaison ticker+timeframe existe déjà et la remplacer
        const ticker = data.ticker;
        const timeframe = data.timeframe;
        let existingIndex = -1;
        
        if (ticker && timeframe) {
            existingIndex = dataArray.findIndex(item => 
                item.ticker === ticker && item.timeframe === timeframe);
        } else if (ticker) {
            // Si pas de timeframe, chercher une entrée sans timeframe pour ce ticker
            existingIndex = dataArray.findIndex(item => 
                item.ticker === ticker && !item.timeframe);
        }

        if (existingIndex !== -1) {
            console.log(`🔄 Remplacement de données pour ${ticker} ${timeframe ? `(${timeframe})` : ''}`);
            dataArray.splice(existingIndex, 1);
        }

        // Ajouter les nouvelles données avec timestamp
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
        console.log(`✅ ${dataArray.length} entrées sauvegardées dans localStorage`);

        // Créer également une version au format TSV pour Excel avec tabulations au lieu de virgules
        let tsvData = "Ticker\tTimeframe\tMax Drawdown\tNet Profit\tBuy & Hold Return\tGross Loss\tGross Profit\tMax Equity Run-up\tCommission Paid\n";

        // Map pour stocker uniquement la dernière occurrence de chaque combinaison ticker+timeframe
        const combinationMap = new Map();
        for (let i = 0; i < dataArray.length; i++) {
            const item = dataArray[i];
            const itemTicker = item.ticker;
            const itemTimeframe = item.timeframe;
            
            if (itemTicker) {
                const key = itemTimeframe ? `${itemTicker}-${itemTimeframe}` : itemTicker;
                combinationMap.set(key, i);
            }
        }

        // Construire le TSV avec les données uniques
        const processedCombinations = new Set();

        for (let i = 0; i < dataArray.length; i++) {
            const entry = dataArray[i];
            const entryTicker = entry.ticker;
            const entryTimeframe = entry.timeframe;
            
            if (!entryTicker) continue;
            
            const key = entryTimeframe ? `${entryTicker}-${entryTimeframe}` : entryTicker;
            
            if (processedCombinations.has(key)) continue;

            // Si c'est la dernière occurrence de cette combinaison, l'utiliser
            if (combinationMap.get(key) === i) {
                // Formater les valeurs en supprimant les signes + et les virgules
                const formattedTicker = entryTicker || 'N/A';
                if (!entryTicker) {
                    console.warn("❌ Valeur manquante pour ticker: N/A");
                }

                // Timeframe et autres champs
                const timeframe = entry.timeframe || 'N/A';
                const maxDrawdown = formatValueForExcel(entry.maxDrawdown || 'N/A');
                const netProfit = formatValueForExcel(entry.netProfit || 'N/A');
                const buyHoldReturn = formatValueForExcel(entry.buyHoldReturn || 'N/A');
                const grossLoss = formatValueForExcel(entry.grossLoss || 'N/A');
                const grossProfit = formatValueForExcel(entry.grossProfit || 'N/A');
                const maxEquityRunUp = formatValueForExcel(entry.maxEquityRunUp || 'N/A');
                const commissionPaid = formatValueForExcel(entry.commissionPaid || 'N/A');

                tsvData += `${formattedTicker}\t${timeframe}\t${maxDrawdown}\t${netProfit}\t${buyHoldReturn}\t${grossLoss}\t${grossProfit}\t${maxEquityRunUp}\t${commissionPaid}\n`;
                processedCombinations.add(key);
            }
        }

        localStorage.setItem('tradingViewDataCSV', tsvData);
        console.log(`📄 Format TSV créé`);

        return true;
    } catch (error) {
        console.error("❌ Erreur lors du stockage des données:", error);
        return false;
    }
}

// Fonction unifiée pour trouver toutes les valeurs
function findTradingViewValues() {
    console.log("🥷 Scraping TradingView function findTradingViewValues");

    // Ticker
    let ticker = findTickerValue();
    // Timeframe
    let timeframe = extraireTemps();
    // Utiliser la méthode robuste pour trouver chaque valeur (pourcentages)

    console.log("🔍 Recherche des pourcentage : function findTradingViewValues");
    const netProfit = findPercentValueByLabel("Net profit");
    const grossProfit = findPercentValueByLabel("Gross profit");
    const grossLoss = findPercentValueByLabel("Gross loss");
    const maxDrawdown = findPercentValueByLabel("Max equity drawdown");

    // Nouveaux champs demandés
    const commissionPaid = findCommissionPaid();
    const buyHoldReturn = findPercentValueByLabel("Buy & hold return");
    const maxEquityRunUp = findPercentValueByLabel("Max equity run-up");

    const result = {
        ticker: ticker,
        timeframe: timeframe,
        netProfit: netProfit,
        grossProfit: grossProfit,
        grossLoss: grossLoss,
        maxDrawdown: maxDrawdown,
        commissionPaid: commissionPaid,
        buyHoldReturn: buyHoldReturn,
        maxEquityRunUp: maxEquityRunUp
    };
    return result;
}

/**
 * Extracteur de temps avec logs réduits qui capture les durées
 * incluant minutes, heures, jours, semaines et mois
 */
function extraireTemps() {
    console.log("🔍 Recherche du temps : function extraireTemps");
    
    // Variable pour stocker le timeframe trouvé
    let timeframeFound = "N/A";
    let activeButtons = [];
    
    // Sélectionner les boutons avec tooltip
    const boutonsAvecTooltip = document.querySelectorAll('button[data-tooltip]');
    
    // Parcourir les boutons sans logs excessifs
    boutonsAvecTooltip.forEach(bouton => {
        const tooltip = bouton.getAttribute('data-tooltip');
        
        // Exclure les tooltips qui contiennent "intervals"
        if (tooltip.includes("intervals")) {
            return;
        }
        
        // Extraire le nombre du tooltip (par exemple "2" de "2 weeks")
        let nombre = 0;
        const matchNombre = tooltip.match(/^(\d+)\s*/);
        if (matchNombre) {
            nombre = parseInt(matchNombre[1], 10);
        }
        
        // Ne garder que les tooltips qui sont des durées simples (singulier ou pluriel)
        if (tooltip.match(/^\d+\s*(minute|minutes|hour|hours|day|days|week|weeks|month|months)$/i)) {
            let minutes = 0;
            let unite = "";
            
            // Extraire les minutes
            if (tooltip.match(/(\d+)\s*minute(s)?/i)) {
                minutes = parseInt(tooltip.match(/(\d+)\s*minute(s)?/i)[1], 10);
                unite = "M";
            }
            // Extraire les heures et convertir en minutes
            else if (tooltip.match(/(\d+)\s*hour(s)?/i)) {
                minutes = parseInt(tooltip.match(/(\d+)\s*hour(s)?/i)[1], 10) * 60;
                unite = "H";
            }
            // Extraire les jours et convertir en minutes
            else if (tooltip.match(/(\d+)\s*day(s)?/i)) {
                minutes = parseInt(tooltip.match(/(\d+)\s*day(s)?/i)[1], 10) * 24 * 60;
                unite = "D";
            }
            // Extraire les semaines et convertir en minutes
            else if (tooltip.match(/(\d+)\s*week(s)?/i)) {
                minutes = parseInt(tooltip.match(/(\d+)\s*week(s)?/i)[1], 10) * 7 * 24 * 60;
                unite = "W";
            }
            // Extraire les mois et convertir en minutes (approximativement 30 jours par mois)
            else if (tooltip.match(/(\d+)\s*month(s)?/i)) {
                minutes = parseInt(tooltip.match(/(\d+)\s*month(s)?/i)[1], 10) * 30 * 24 * 60;
                unite = "M";
            }
            
            // Si on a trouvé une valeur valide
            if (minutes > 0) {
                // Construire le texte attendu (par exemple "1H", "2D", etc.)
                const texteAttendu = `${nombre}${unite}`;
                
                // Vérifier si le bouton est actif (a la classe "active")
                if (bouton.classList.contains('active') || 
                    bouton.getAttribute('aria-pressed') === 'true' || 
                    getComputedStyle(bouton).backgroundColor !== 'transparent') {
                    activeButtons.push(texteAttendu);
                    timeframeFound = texteAttendu;
                }
            }
        }
    });
    
    // Log unique pour tous les boutons actifs trouvés
    if (activeButtons.length > 0) {
        console.log(`✅ Timeframe actif trouvé: ${activeButtons[0]}${activeButtons.length > 1 ? ` (et ${activeButtons.length - 1} autres)` : ''}`);
    } else {
        console.log("❌ Aucun timeframe actif trouvé");
    }
    
    return timeframeFound;
}

// Fonction optimisée pour trouver le ticker
function findTickerValue() {
    console.log("🔍 Recherche du ticker : function findTickerValue");

    try {
        // Méthode principale - sélecteur standard (fonctionne presque toujours)
        const element = document.querySelector("#header-toolbar-symbol-search > div");
        if (element) {
            const value = element.textContent.trim();
            console.log(`✅ Ticker trouvé: ${value}`);
            return value;
        }

        // Méthodes alternatives en cas d'échec
        const titleMatch = document.title.match(/(\w+)(?:\:|\/)/);
        if (titleMatch && titleMatch[1]) {
            console.log(`✅ Ticker trouvé via titre: ${titleMatch[1]}`);
            return titleMatch[1];
        }

        const possibleSelectors = [
            document.querySelector('[data-name="legend-source-item"]'),
            document.querySelector('[data-name="legend-series-item"]'),
            document.querySelector('.chart-markup-table.pane')
        ];

        for (const el of possibleSelectors) {
            if (el && (el.textContent.match(/[A-Z]+\/[A-Z]+/) || el.textContent.match(/[A-Z]+USD/))) {
                const ticker = el.textContent.trim().split(' ')[0];
                console.log(`✅ Ticker trouvé via sélecteur alternatif: ${ticker}`);
                return ticker;
            }
        }
        
        console.warn("❌ Aucun ticker trouvé");
    } catch (e) {
        console.error("❌ Erreur lors de la récupération du ticker:", e);
    }

    return "N/A";
}

// Fonction optimisée pour trouver le pourcentage par son libellé
function findPercentValueByLabel(labelText) {
    try {
        // Stratégie principale - recherche dans les lignes de tableau
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
                    console.log(`✅ ${labelText}: "${value}"`);
                    return value;
                }
            }
        }

        // Stratégie alternative - pour les cas où la première stratégie échoue
        // Recherche générique par contenu du texte
        const elements = Array.from(document.querySelectorAll('*')).filter(
            el => el.textContent && el.textContent.trim() === labelText
        );

        for (const element of elements) {
            let currentNode = element;
            for (let i = 0; i < 3; i++) {
                if (!currentNode) break;

                const percentElement = currentNode.querySelector('div[class*="percentValue-"]');
                if (percentElement) {
                    let value = percentElement.textContent.trim();
                    value = value.replace('−', '-');
                    console.log(`✅ ${labelText}: "${value}" (méthode alt)`);
                    return value;
                }

                currentNode = currentNode.parentElement;
            }
        }

        // Si aucun pourcentage n'a été trouvé, chercher une valeur standard
        const standardValue = findValueByLabel(labelText);
        if (standardValue !== "N/A") {
            console.log(`✅ ${labelText}: "${standardValue}" (valeur standard)`);
            return standardValue;
        }
        
        console.warn(`❌ Valeur non trouvée pour: ${labelText}`);
    } catch (e) {
        console.warn(`❌ Erreur recherche pour ${labelText}:`, e);
    }

    return "N/A";
}

// Fonction pour trouver une valeur par son libellé (pour les valeurs sans pourcentage)
function findValueByLabel(labelText) {
    try {
        // Recherche dans les lignes de tableau
        const rows = document.querySelectorAll('tr');

        for (const row of rows) {
            const hasLabel = Array.from(row.querySelectorAll('div')).some(
                div => div.textContent && div.textContent.trim() === labelText
            );

            if (hasLabel) {
                const valueElement = row.querySelector('div[class*="value-"]');
                if (valueElement) {
                    let value = valueElement.textContent.trim();
                    value = value.replace('−', '-');
                    return value;
                }
            }
        }

        // Si la première méthode échoue, essayons une autre approche
        const elements = Array.from(document.querySelectorAll('*')).filter(
            el => el.textContent && el.textContent.trim() === labelText
        );

        for (const element of elements) {
            let currentNode = element.parentElement;
            for (let i = 0; i < 3; i++) {
                if (!currentNode) break;

                const valueElement = currentNode.querySelector('div[class*="value-"]');
                if (valueElement) {
                    let value = valueElement.textContent.trim();
                    value = value.replace('−', '-');
                    return value;
                }

                currentNode = currentNode.parentElement;
            }
        }
    } catch (e) {
        console.warn(`❌ Erreur recherche valeur pour ${labelText}:`, e);
    }

    return "N/A";
}

// Fonction spécifique pour trouver la Commission paid
function findCommissionPaid() {
    try {
        // Recherche avec méthode directe et optimisée
        const commissionValue = findValueByLabel("Commission paid");
        if (commissionValue !== "N/A") {
            console.log(`✅ Commission paid: "${commissionValue}"`);
            return commissionValue;
        }
        
        // Stratégie alternative si nécessaire
        const titleSelectors = [
            'div.title-NcOKy65p',
            'div.apply-overflow-tooltip'
        ];

        for (const selector of titleSelectors) {
            const elements = document.querySelectorAll(selector);
            
            for (const element of elements) {
                if (element.textContent && element.textContent.trim() === "Commission paid") {
                    let row = element.closest('tr');
                    if (row) {
                        const valueElement = row.querySelector('div[class*="value-"]');
                        if (valueElement) {
                            const value = valueElement.textContent.trim();
                            console.log(`✅ Commission paid: "${value}" (méthode alt)`);
                            return value;
                        }
                    }
                }
            }
        }
        
        console.warn("❌ Commission paid non trouvée");
    } catch (e) {
        console.warn("❌ Erreur lors de la recherche de Commission paid:", e);
    }

    return "N/A";
}

// Version spécifique pour le scrape rapide
function quickScrapeSpecificValues() {
    console.log("🔄 Exécution du scrape rapide");

    try {
        // Utiliser les mêmes fonctions que pour la collecte normale
        const data = findTradingViewValues();
        return data;
    } catch (error) {
        console.error("❌ Erreur dans quickScrapeSpecificValues:", error);
        throw error;
    }
}