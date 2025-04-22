# Documentation détaillée pour l'utilisation de `_requestHistoryData` via WebSocket

Cette documentation se concentre spécifiquement sur la méthode `request_history_data` de l'API WebSocket de TradingView, comment l'utiliser manuellement et comment traiter les données reçues.

## Analyse de la fonction `_requestHistoryData`

Dans le code source de TradingView, la fonction `_requestHistoryData` est utilisée pour demander des données historiques de prix ou de backtesting:

```javascript
_requestHistoryData() {
    const activeStrategy = this.activeStrategy?.value();
    if (!activeStrategy) return;
    
    const fromDate = this._fromDate;
    const toDate = this._toDate;
    const requestId = this._requestId++;
    const symbol = this.symbolString?.value();
    const studyId = activeStrategy.studyIdString ?? "";
    const dependencies = this.activeStrategyDeps.value();
    const resolution = this.resolution.value();
    const resolutionValue = resolution?.isRange() ? "1" : resolution?.value();
    const inputs = this._patchSosInputs.value();
    
    const dateRange = {
        from_to: {
            from: Math.floor(fromDate/1000),
            to: Math.floor(toDate/1000)
        }
    };
    
    this._sendRequest("request_history_data", [
        this._sessionid,
        requestId,
        symbol,
        resolutionValue,
        0,              // data_range (toujours 0 pour l'historique complet)
        dateRange,
        studyId,
        inputs,
        dependencies
    ]);
}
```

## Étapes pour utiliser manuellement cette fonctionnalité

### 1. Établir une connexion WebSocket

#### Avec JavaScript dans un navigateur:

```javascript
// Initialiser la connexion WebSocket
const ws = new WebSocket('wss://data.tradingview.com/socket.io/websocket');

// Gestionnaire de connexion
ws.onopen = () => {
    console.log('Connexion WebSocket établie');
};

// Gestionnaire d'erreur
ws.onerror = (error) => {
    console.error(`Erreur WebSocket: ${error}`);
};

// Gestionnaire de messages
ws.onmessage = (event) => {
    handleMessage(event.data);
};

// Gestionnaire de fermeture
ws.onclose = (event) => {
    console.log(`Connexion fermée: ${event.code} ${event.reason}`);
};
```

#### Avec websocat en ligne de commande:

```bash
websocat wss://data.tradingview.com/socket.io/websocket
```

### 2. Gérer la négociation de session

La première réponse du serveur après la connexion est l'ID de session, qui n'est pas au format standard `~m~`.

```javascript
let sessionId = null;

function handleMessage(data) {
    // Si nous n'avons pas encore d'ID de session, le premier message est l'ID
    if (!sessionId) {
        sessionId = data;
        console.log(`ID de session reçu: ${sessionId}`);
        
        // Continuer avec l'authentification et les requêtes
        authenticateAndRequestData();
    } else {
        // Analyser les messages ultérieurs
        parseMessage(data);
    }
}
```

### 3. S'authentifier avec un token (si nécessaire)

```javascript
function authenticateAndRequestData() {
    // Récupérer le token d'authentification (par exemple depuis localStorage)
    const authToken = localStorage.getItem('tradingViewAuthToken');
    
    // Envoyer une requête d'authentification
    sendRequest('set_auth_token', [authToken]);
    
    // Créer une session historique
    sendRequest('history_create_session', [sessionId]);
    
    // Configurer le fuseau horaire si nécessaire
    const timezone = "Etc/UTC"; // ou un autre fuseau horaire
    sendRequest('switch_timezone', [sessionId, timezone]);
    
    // Demander des données historiques
    requestHistoricalData();
}
```

### 4. Fonction d'encodage des messages spécifique à TradingView

```javascript
function encodeMessage(message) {
    if (typeof message === 'object') {
        // Messages JSON
        const jsonString = JSON.stringify(message);
        return `~m~${jsonString.length}~m~~j~${jsonString}`;
    } else {
        // Messages texte ou heartbeat
        return `~m~${message.length}~m~${message}`;
    }
}

function sendRequest(method, params = []) {
    const request = {
        m: method,  // Méthode à appeler
        p: params   // Paramètres de la méthode
    };
    
    const encodedMessage = encodeMessage(request);
    ws.send(encodedMessage);
    console.log(`Envoi de requête: ${method}`, params);
}
```

### 5. Demander des données historiques

Voici la fonction détaillée qui correspond au `_requestHistoryData` de TradingView:

```javascript
function requestHistoricalData() {
    // Paramètres nécessaires
    const requestId = Date.now();  // Un identifiant unique pour la requête
    const symbol = "BINANCE:BTCUSDT";  // Symbole pour lequel on veut les données
    const resolution = "D";  // Résolution temporelle (D=jour, 60=60min, etc.)
    
    // Plage de dates (en secondes Unix)
    const fromDate = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);  // 30 jours en arrière
    const toDate = Math.floor(Date.now() / 1000);  // Maintenant
    
    const dateRange = {
        from_to: {
            from: fromDate,
            to: toDate
        }
    };
    
    // Paramètres pour les études/indicateurs (si nécessaire)
    const studyId = "";  // Pour les prix bruts, laissez vide
    const inputs = {};   // Paramètres de l'étude (vide pour les prix bruts)
    const dependencies = [];  // Dépendances de l'étude (vide pour les prix bruts)
    
    // Pour une stratégie de backtesting, vous auriez besoin de:
    // const studyId = "Script@tv-scripting-101!";  // ID de votre script Pine
    // const inputs = { "length": 14, "source": "close" };  // Paramètres de votre script
    
    // Envoyer la requête
    sendRequest("request_history_data", [
        sessionId,
        requestId,
        symbol,
        resolution,
        0,  // data_range (0 pour l'historique complet)
        dateRange,
        studyId,
        inputs,
        dependencies
    ]);
}
```

### 6. Traiter et analyser les réponses

```javascript
function parseMessage(data) {
    // Si c'est un heartbeat, répondre immédiatement
    if (data.includes("~h~")) {
        const heartbeatId = data.split("~h~")[1];
        ws.send(`~m~${heartbeatId.length}~m~~h~${heartbeatId}`);
        return;
    }
    
    // Essayer d'extraire un message JSON
    if (data.includes("~m~") && data.includes("~j~")) {
        try {
            // Extraire la partie JSON
            const jsonStartIndex = data.indexOf("~j~") + 3;
            const jsonString = data.substring(jsonStartIndex);
            const jsonData = JSON.parse(jsonString);
            
            handleJsonResponse(jsonData);
        } catch (error) {
            console.error("Erreur d'analyse JSON:", error);
        }
    }
}

function handleJsonResponse(jsonData) {
    // Vérifier la méthode de la réponse
    const method = jsonData.m;
    const params = jsonData.p;
    
    console.log(`Réponse reçue pour la méthode: ${method}`);
    
    if (method === "request_data") {
        // C'est une réponse à notre demande de données historiques
        const responseData = params[2];
        
        if (responseData && responseData.ns && responseData.ns.d) {
            // Les données sont compressées, il faut les décompresser
            unpackData(responseData.ns.d).then(processHistoricalData);
        }
    } else if (method.includes("error")) {
        console.error("Erreur reçue:", jsonData);
    }
}

// Fonction pour décompresser et traiter les données
// Note: TradingView utilise une méthode spécifique de compression
// Cette fonction est une simplification
function unpackData(compressedData) {
    // Dans un cas réel, utilisez la bibliothèque appropriée pour décompresser
    // Par exemple, pako.js pour la décompression GZIP
    return Promise.resolve(compressedData);
}

function processHistoricalData(data) {
    if (!data || !data.data) {
        console.log("Pas de données reçues");
        return;
    }
    
    // Pour les données de prix brutes
    if (data.data.series) {
        const candles = data.data.series.s;
        console.log("Données de chandeliers reçues:", candles);
        
        // Formater les données pour l'utilisation
        const formattedCandles = candles.map(candle => ({
            time: candle.v[0] * 1000,  // Convertir en millisecondes
            open: parseFloat(candle.v[1]),
            high: parseFloat(candle.v[2]),
            low: parseFloat(candle.v[3]),
            close: parseFloat(candle.v[4]),
            volume: parseFloat(candle.v[5] || 0)
        }));
        
        console.log("Données formatées:", formattedCandles);
    }
    
    // Pour les données de backtesting
    if (data.data.report) {
        console.log("Rapport de backtesting reçu:", data.data.report);
        
        // Traiter les différentes sections du rapport
        const { equity, trades, performance } = data.data.report;
        console.log("Équité:", equity);
        console.log("Trades:", trades);
        console.log("Performance:", performance);
    }
}
```

## Exemple complet avec websocat

Pour utiliser websocat pour envoyer des requêtes manuellement:

```bash
# Installer websocat si ce n'est pas déjà fait
# Sur Linux/Mac: cargo install websocat
# Sur Windows: télécharger depuis https://github.com/vi/websocat/releases

# Lancer une session interactive
websocat wss://data.tradingview.com/socket.io/websocket
```

Une fois connecté, vous recevrez l'ID de session. Ensuite, envoyez les messages encodés suivants:

1. Message d'authentification:
```
~m~45~m~~j~{"m":"set_auth_token","p":["VOTRE_TOKEN_AUTH"]}
```

2. Création de session:
```
~m~59~m~~j~{"m":"history_create_session","p":["VOTRE_ID_SESSION"]}
```

3. Configuration du fuseau horaire:
```
~m~63~m~~j~{"m":"switch_timezone","p":["VOTRE_ID_SESSION","Etc/UTC"]}
```

4. Demande de données historiques:
```
~m~250~m~~j~{"m":"request_history_data","p":["VOTRE_ID_SESSION",1234567890,"BINANCE:BTCUSDT","D",0,{"from_to":{"from":1609459200,"to":1640995200}},"","",[]]}
```

### Considérations importantes

1. **Authentification**: Un token valide est souvent requis pour accéder aux données. Le token peut être extrait des cookies de votre session TradingView.

2. **Format de date**: Les dates sont en secondes Unix (pas en millisecondes).

3. **Format de résolution**:
   - Minutes: "1", "5", "15", "30", "60", "120", "240"
   - Jours: "D" ou "1D"
   - Semaines: "W" ou "1W"
   - Mois: "M" ou "1M"

4. **Décompression**: Les données réelles reçues sont généralement compressées. TradingView utilise des algorithmes spécifiques pour compresser/décompresser les données.

5. **Limitation de requêtes**: TradingView limite probablement le nombre de requêtes par utilisateur.

6. **Changements d'API**: Cette API n'est pas documentée officiellement et peut changer sans préavis.

## Points techniques particuliers

1. **Format des paramètres `studyId` et `inputs`**:
   - Pour les données de prix brutes: laissez `studyId` vide et `inputs` comme un objet vide
   - Pour les indicateurs/stratégies: `studyId` doit être au format "NomDuScript@tv-namespaceDuScript!"
   - Les `inputs` doivent correspondre exactement aux paramètres de l'indicateur

2. **Compression des données**:
   - TradingView utilise un format de compression personnalisé pour les données
   - La fonction `unpackNonSeriesData` est utilisée pour décompresser les données

3. **Authentification**:
   - Le token d'authentification peut être récupéré du cookie "sessionid" 
   - Une authentification réussie est nécessaire pour la plupart des requêtes

4. **Suivi des requêtes**:
   - Chaque requête a un identifiant unique (`requestId`)
   - Les réponses contiennent cet identifiant pour faire correspondre les requêtes et les réponses

Cette documentation devrait vous permettre de commencer à utiliser l'API WebSocket de TradingView pour récupérer des données historiques et effectuer des backtests manuellement.