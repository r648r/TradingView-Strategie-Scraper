// content.js - Version optimisée et efficace

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
                        }, 800);
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
    console.log("🔄 Collecte de données en cours...");

    try {
        const data = findTradingViewValues();
        console.log("📊 Données collectées:", data);

        // Envoyer sans attendre de réponse
        chrome.runtime.sendMessage({ action: 'dataCollected', data: data });
        console.log("📤 Données envoyées au background script");
    } catch (error) {
        console.error("❌ Erreur lors de la collecte de données:", error);
    }
}

// Fonction pour formater les valeurs numériques pour Excel
function formatValueForExcel(value) {
    if (!value || value === 'N/A') return value;

    // Remplacer les + par une chaîne vide et supprimer les virgules des nombres
    return value.replace(/\+/g, '').replace(/,/g, '');
}

// Fonction pour stocker les données scrapées dans localStorage avec gestion des doublons
function storeScrapedData(data) {
    console.log("💾 Stockage des données dans localStorage...");

    if (!data || !data.ticker) {
        console.warn("⚠️ Données invalides ou sans ticker");
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

        // Vérifier si cette paire existe déjà et la remplacer
        const ticker = data.ticker;
        const existingIndex = dataArray.findIndex(item => item.ticker === ticker);

        if (existingIndex !== -1) {
            console.log(`🔄 Remplacement de données pour la paire: ${ticker}`);
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
        let tsvData = "Ticker\tMax Drawdown\tNet Profit\tBuy & Hold Return\tGross Loss\tGross Profit\tMax Equity Run-up\tCommission Paid\n";

        // Map pour stocker uniquement la dernière occurrence de chaque ticker
        const tickerMap = new Map();
        for (let i = 0; i < dataArray.length; i++) {
            const ticker = dataArray[i].ticker;
            if (ticker) {
                tickerMap.set(ticker, i);
            }
        }

        // Construire le TSV avec les données uniques
        const processedTickers = new Set();

        for (let i = 0; i < dataArray.length; i++) {
            const entry = dataArray[i];
            const ticker = entry.ticker;

            if (!ticker || processedTickers.has(ticker)) continue;

            // Si c'est la dernière occurrence de ce ticker, l'utiliser
            if (tickerMap.get(ticker) === i) {
                // Formater les valeurs en supprimant les signes + et les virgules
                // Gestion des valeurs avec avertissements console.warn pour les N/A
                const formattedTicker = ticker || 'N/A';
                if (!ticker) {
                    console.warn("⚠️ Valeur manquante pour ticker: N/A");
                }

                // Max Drawdown
                let maxDrawdown;
                if (!entry.maxDrawdown || entry.maxDrawdown === 'N/A') {
                    console.warn("⚠️ Valeur manquante pour Max Drawdown: N/A");
                    maxDrawdown = 'N/A';
                } else {
                    maxDrawdown = formatValueForExcel(entry.maxDrawdown);
                }

                // Net Profit
                let netProfit;
                if (!entry.netProfit || entry.netProfit === 'N/A') {
                    console.warn("⚠️ Valeur manquante pour Net Profit: N/A");
                    netProfit = 'N/A';
                } else {
                    netProfit = formatValueForExcel(entry.netProfit);
                }

                // Buy & Hold Return
                let buyHoldReturn;
                if (!entry.buyHoldReturn || entry.buyHoldReturn === 'N/A') {
                    console.warn("⚠️ Valeur manquante pour Buy & Hold Return: N/A");
                    buyHoldReturn = 'N/A';
                } else {
                    buyHoldReturn = formatValueForExcel(entry.buyHoldReturn);
                }

                // Gross Loss
                let grossLoss;
                if (!entry.grossLoss || entry.grossLoss === 'N/A') {
                    console.warn("⚠️ Valeur manquante pour Gross Loss: N/A");
                    grossLoss = 'N/A';
                } else {
                    grossLoss = formatValueForExcel(entry.grossLoss);
                }

                // Gross Profit
                let grossProfit;
                if (!entry.grossProfit || entry.grossProfit === 'N/A') {
                    console.warn("⚠️ Valeur manquante pour Gross Profit: N/A");
                    grossProfit = 'N/A';
                } else {
                    grossProfit = formatValueForExcel(entry.grossProfit);
                }

                // Max Equity Run-up
                let maxEquityRunUp;
                if (!entry.maxEquityRunUp || entry.maxEquityRunUp === 'N/A') {
                    console.warn("⚠️ Valeur manquante pour Max Equity Run-up: N/A");
                    maxEquityRunUp = 'N/A';
                } else {
                    maxEquityRunUp = formatValueForExcel(entry.maxEquityRunUp);
                }

                // Commission Paid
                let commissionPaid;
                if (!entry.commissionPaid || entry.commissionPaid === 'N/A') {
                    console.warn("⚠️ Valeur manquante pour Commission Paid: N/A");
                    commissionPaid = 'N/A';
                } else {
                    commissionPaid = formatValueForExcel(entry.commissionPaid);
                }

                tsvData += `${formattedTicker}\t${maxDrawdown}\t${netProfit}\t${buyHoldReturn}\t${grossLoss}\t${grossProfit}\t${maxEquityRunUp}\t${commissionPaid}\n`;
                processedTickers.add(ticker);
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
    console.log("🔍 Recherche des valeurs TradingView : findTradingViewValues");

    // Ticker
    let ticker = findTickerValue();
    // Utiliser la méthode robuste pour trouver chaque valeur (pourcentages)
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

// Fonction optimisée pour trouver le ticker
function findTickerValue() {
    console.log("🔍 Recherche du ticker...");

    try {
        // Méthode principale - sélecteur standard (fonctionne presque toujours)
        const element = document.querySelector("#header-toolbar-symbol-search > div");
        if (element) {
            const value = element.textContent.trim();
            console.log(`✅  Ticker trouvé avec sélecteur standard: ${value}`);
            return value;
        }

        // Méthodes alternatives en cas d'échec
        const titleMatch = document.title.match(/(\w+)(?:\:|\/)/);
        if (titleMatch && titleMatch[1]) {
            return titleMatch[1];
        }

        const possibleSelectors = [
            document.querySelector('[data-name="legend-source-item"]'),
            document.querySelector('[data-name="legend-series-item"]'),
            document.querySelector('.chart-markup-table.pane')
        ];

        for (const el of possibleSelectors) {
            if (el && (el.textContent.match(/[A-Z]+\/[A-Z]+/) || el.textContent.match(/[A-Z]+USD/))) {
                return el.textContent.trim().split(' ')[0];
            }
        }
    } catch (e) {
        console.error("❌ Erreur lors de la récupération du ticker:", e);
    }

    return "N/A";
}

// Fonction optimisée pour trouver le pourcentage par son libellé
function findPercentValueByLabel(labelText) {
    console.log(`🔍 Recherche du pourcentage pour "${labelText}"`);

    try {
        // Stratégie principale - recherche dans les lignes de tableau (fonctionne presque toujours)
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
                    console.log(`✅ ${labelText}: "${value}" (stratégie 1)`);
                    return value;
                } else {
                    console.warn(`!!!!! Élément pourcentage non trouvé pour ${labelText} dans la ligne !!!!`);
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
                    return value;
                }

                currentNode = currentNode.parentElement;
            }
        }

        // Si aucun pourcentage n'a été trouvé, chercher une valeur standard
        return findValueByLabel(labelText);
    } catch (e) {
        console.warn(`⚠️ Erreur recherche pour ${labelText}:`, e);
        return "N/A";
    }
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
        console.warn(`⚠️ Erreur recherche valeur pour ${labelText}:`, e);
    }

    return "N/A";
}

// Fonction spécifique pour trouver la Commission paid
function findCommissionPaid() {
    console.log("🔍 Recherche spécifique de Commission paid : findCommissionPaid");

    try {
        // Stratégie principale - recherche dans les éléments titre
        console.log("🔄 Essai stratégie 1: recherche dans les éléments titre");

        const titleSelectors = [
            'div.title-NcOKy65p',
            'div.apply-overflow-tooltip'
        ];

        let titleElements = [];
        for (const selector of titleSelectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`📌 ${elements.length} éléments trouvés avec le sélecteur ${selector}`);
            titleElements = titleElements.concat(Array.from(elements));
        }

        console.log(`📌 Total de ${titleElements.length} éléments titre à vérifier`);

        for (const titleElement of titleElements) {
            if (titleElement.textContent && titleElement.textContent.trim() === "Commission paid") {
                console.log(`📌 Texte "Commission paid" trouvé dans un élément titre`);

                // Remonter jusqu'à la cellule td
                let currentElement = titleElement;
                let level = 0;

                while (currentElement && currentElement.tagName !== 'TR' && level < 5) {
                    console.log(`📌 Remontée niveau ${level}: ${currentElement.tagName}`);
                    currentElement = currentElement.parentElement;
                    level++;
                }

                if (currentElement && currentElement.tagName === 'TR') {
                    console.log(`📌 Ligne de tableau (TR) trouvée au niveau ${level}`);

                    // Chercher la valeur dans la cellule suivante
                    const valueElementSpecific = currentElement.querySelector('div.value-SLJfw5le');
                    if (valueElementSpecific) {
                        const value = valueElementSpecific.textContent.trim();
                        console.log(`✅ Commission trouvée (sélecteur spécifique): "${value}"`);
                        return value;
                    }

                    const valueElementGeneric = currentElement.querySelector('div[class*="value-"]');
                    if (valueElementGeneric) {
                        const value = valueElementGeneric.textContent.trim();
                        return value;
                    }
                }
            }
        }

        // Stratégie de secours - méthode générique
        return findValueByLabel("Commission paid");
    } catch (e) {
        console.warn("❌ Erreur lors de la recherche de Commission paid:", e);
        return "N/A";
    }
}

// Version spécifique pour le scrape rapide
function quickScrapeSpecificValues() {
    console.log("🔄 Exécution de quickScrapeSpecificValues");

    try {
        // Utiliser les mêmes fonctions que pour la collecte normale
        const data = findTradingViewValues();
        console.log("✅ Données récupérées par scrape rapide:", data);
        return data;
    } catch (error) {
        console.error("❌ Erreur dans quickScrapeSpecificValues:", error);
        throw error;
    }
}