# TradingView Data Collector

# To Do

- [ ] Traduire cette merde 

[Demo.mp4](./Demo.mov)

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
