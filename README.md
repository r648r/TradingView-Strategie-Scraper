# TradingView Data Collector

# To Do

- [ ] Traduire cette merde 
- [ ] Trouver l'appel / intégré dans la doc non off de l'api
    - [ ] ~m~38800~m~{"m":"du","p":["cs_Nn9mHOshjPD9",{"st4":{"node":"ams1-charts-pro-4-study-5nsgg-9","st":[],"ns":{"d":"{\"dataCompressed\":\"

```bash
 python3 tvd.py "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"
```

## Description
TradingView Data Collector est une extension Chrome qui vous permet de collecter facilement des données de performance depuis TradingView. Cette extension est particulièrement utile pour les traders qui souhaitent analyser et comparer les performances de différentes stratégies ou paires de trading.

## Fonctionnalités
- Capture des indicateurs clés comme Net Profit, Max Drawdown, Buy & Hold Return, etc.
- Collecte manuelle ou automatique des données (avec la barre d'espace)
- Export vers Excel (format TSV) ou JSON
- Élimination intelligente des doublons (garde la dernière version de chaque paire)
- Interface utilisateur simple et intuitive

## Installation
1. Décompressez le fichier ZIP dans un dossier
2. Ouvrez Chrome et allez dans les extensions (chrome://extensions/)
3. Activez le "Mode développeur" (bouton en haut à droite)
4. Cliquez sur "Charger l'extension non empaquetée"
5. Naviguez vers le dossier contenant les fichiers décompressés et sélectionnez-le

## Utilisation
1. Ouvrez TradingView et affichez les résultats de votre stratégie
2. Cliquez sur l'icône de l'extension
3. Utilisez le bouton "1 Scrape" pour collecter les données de la page actuelle
4. Alternativement, cliquez sur "Démarrer la collecte" et utilisez la barre d'espace pour collecter des données de plusieurs configurations
5. Exportez vos données avec "Exporter pour Excel" ou "Télécharger JSON"

## Démonstration
Une vidéo de démonstration (demo.mp4) est incluse pour vous aider à comprendre comment utiliser l'extension. Cette vidéo montre pas à pas comment collecter et exporter des données.

## Gestion des doublons
Cette extension gère intelligemment les doublons en conservant uniquement la dernière version de chaque paire de trading. Si vous collectez plusieurs fois les données pour la même paire (par exemple, BTCUSD), seules les données les plus récentes seront conservées.

## Dépannage
- Si l'extension affiche "ERR" sur son icône, assurez-vous d'être sur TradingView.com
- Si certaines valeurs apparaissent comme "N/A", essayez de rafraîchir la page et de collecter à nouveau
- Pour réinitialiser complètement l'extension, utilisez le bouton "Effacer les données"

# TradingView WebSocket API Documentation

This document contains all known WebSocket API calls in the `TradingView-API` repository. Each call includes its purpose, required parameters, and examples for usage.

---

## **1. WebSocket Connection**

### Description
Establishes the main WebSocket connection for interacting with TradingView's real-time data.

### Connection Details
- **URL**: `wss://data.tradingview.com/socket.io/websocket?type=chart`
- **Headers**:
  - `Origin: https://www.tradingview.com`
- **Authentication**: Not required for connection establishment.

### Websocat Command
```bash
websocat --header="Origin: https://www.tradingview.com" "wss://data.tradingview.com/socket.io/websocket?type=chart"
```

---

## **2. Auth Token Setup**

### Description
Authenticates the client using an `auth_token`. This is required for accessing premium features or restricted data.

### Parameters
- `auth_token`: The token for authentication (use `unauthorized_user_token` for anonymous access).

### Websocat Command
```bash
echo '~m~48~m~{"m":"set_auth_token","p":["your_auth_token"]}' | websocat --header="Origin: https://www.tradingview.com" "wss://data.tradingview.com/socket.io/websocket?type=chart"
```

---

## **3. Chart Session Management**

### 3.1 Create Chart Session
**Description**: Initializes a session for data visualization.
- **Parameters**: `session_id` (unique identifier).

**Websocat Command**:
```bash
echo '~m~50~m~{"m":"chart_create_session","p":["unique_session_id"]}' | websocat --header="Origin: https://www.tradingview.com" "wss://data.tradingview.com/socket.io/websocket?type=chart"
```

### 3.2 Resolve Symbol
**Description**: Configures the market symbol for a chart session.
- **Parameters**: 
  - `session_id`: Chart session ID.
  - `symbol_id`: Unique symbol identifier.
  - `market_symbol`: Market symbol (e.g., `BINANCE:BTCEUR`).

**Websocat Command**:
```bash
echo '~m~80~m~{"m":"resolve_symbol","p":["session_id","symbol_id","={\"symbol\":\"BINANCE:BTCEUR\"}"]}' | websocat --header="Origin: https://www.tradingview.com" "wss://data.tradingview.com/socket.io/websocket?type=chart"
```

### 3.3 Create Series
**Description**: Sets up a data series on the chart with a specific timeframe.
- **Parameters**:
  - `session_id`, `series_id`, `symbol_id`.
  - Timeframe in minutes (e.g., `15` for 15-minute intervals).

**Websocat Command**:
```bash
echo '~m~60~m~{"m":"create_series","p":["session_id","series_id","symbol_id","15"]}' | websocat --header="Origin: https://www.tradingview.com" "wss://data.tradingview.com/socket.io/websocket?type=chart"
```

---

## **4. Quote Session Management**

### 4.1 Create Quote Session
**Description**: Initializes a session for real-time quote updates.
- **Parameters**: `quote_session_id`.

**Websocat Command**:
```bash
echo '~m~50~m~{"m":"quote_create_session","p":["quote_session_id"]}' | websocat --header="Origin: https://www.tradingview.com" "wss://data.tradingview.com/socket.io/websocket?type=chart"
```

### 4.2 Set Quote Fields
**Description**: Defines the fields to receive in a quote session.
- **Parameters**: 
  - `quote_session_id`, followed by field names (e.g., `lp`, `volume`, `bid`, `ask`).

**Websocat Command**:
```bash
echo '~m~80~m~{"m":"quote_set_fields","p":["quote_session_id","lp","volume","bid","ask"]}' | websocat --header="Origin: https://www.tradingview.com" "wss://data.tradingview.com/socket.io/websocket?type=chart"
```

---

## **5. Replay Session Management**

### 5.1 Create Replay Session
**Description**: Configures a session to replay historical data.
- **Parameters**: `replay_session_id`.

**Websocat Command**:
```bash
echo '~m~50~m~{"m":"replay_create_session","p":["replay_session_id"]}' | websocat --header="Origin: https://www.tradingview.com" "wss://data.tradingview.com/socket.io/websocket?type=chart"
```

### 5.2 Add Series to Replay
**Description**: Adds a data series to a replay session.
- **Parameters**: 
  - `replay_session_id`, `series_id`, and `market_symbol` (e.g., `BINANCE:BTCEUR`).

**Websocat Command**:
```bash
echo '~m~100~m~{"m":"replay_add_series","p":["replay_session_id","series_id","={\"symbol\":\"BINANCE:BTCEUR\"}","15"]}' | websocat --header="Origin: https://www.tradingview.com" "wss://data.tradingview.com/socket.io/websocket?type=chart"
```

---

## **6. Ping for Keep-Alive**

### Description
Sends a ping to maintain the WebSocket connection.

### Websocat Command
```bash
echo '~m~10~m~{"m":"ping","p":[]}' | websocat "wss://data.tradingview.com/socket.io/websocket?type=chart"
```

---

## **7. Fetch Additional Data**

### Description
Requests additional historical data for a chart series.
- **Parameters**: 
  - `session_id`, `series_id`, and number of data points to fetch.

**Websocat Command**:
```bash
echo '~m~70~m~{"m":"request_more_data","p":["session_id","series_id","200"]}' | websocat --header="Origin: https://www.tradingview.com" "wss://data.tradingview.com/socket.io/websocket?type=chart"
```

---

## **8. Error Handling**

### Description
Catches protocol errors and logs details.

### Example Message
```bash
echo '~m~50~m~{"m":"protocol_error","p":["error_details"]}' | websocat --header="Origin: https://www.tradingview.com" "wss://data.tradingview.com/socket.io/websocket?type=chart"
```

---

This README covers all known WebSocket API calls from the `TradingView-API` repository. For additional details or updates, refer to the project's source code or documentation.


### 1. Authentification via Token

```javascript
// Dans la construction de l'URL de connexion
e.searchParams.append("date", window.BUILD_TIME || "");

// Gestion du token d'authentification
class c {
    constructor() {
        this.invalidated = new o.Delegate;
        window.loginStateChange.subscribe(this, (e => {
            e || (this._set(window.user.auth_token), this.invalidated.fire());
        }));
        this._set(window.user.auth_token);
    }
    
    get(e) {
        if (!window.is_authenticated) return Promise.resolve("");
        
        if (!e && performance.now() < this._cache.monoValidThru && 
            Date.now() < this._cache.wallValidThru) {
            return Promise.resolve(this._cache.token);
        }
        
        return this._fetch(Boolean(e), 0);
    }
}
```

### 2. Sécurité des Messages

- Utilisation du protocole WSS (WebSocket Secure)
- Validation des formats de message
- Gestion des timeouts pour éviter les connexions zombies

---

Cette documentation présente une analyse complète et détaillée du système de communications WebSocket de TradingView, en expliquant son architecture technique, son protocole de messagerie propriétaire, les mécanismes de fiabilité et de sécurité, ainsi que des exemples concrets de communications client-serveur.