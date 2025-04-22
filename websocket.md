
# Documentation des Communications WebSocket TradingView

## I. Vue d'Ensemble du Système WebSocket

TradingView utilise une infrastructure WebSocket personnalisée pour permettre des communications en temps réel entre le client (navigateur) et ses serveurs backend. Cette architecture est essentielle pour fournir des données de marché actualisées, des mises à jour de graphiques, et une interactivité générale de la plateforme.

## II. Architecture Technique

### Classes Principales

1. **WebSocket (classe `r`)** 
   - Implémentation de base du protocole WebSocket
   - Gère l'encodage/décodage des messages
   - Maintient la connexion WebSocket native

2. **Socket (classe `c`)** 
   - Couche intermédiaire entre WebSocket et WSBackendConnection
   - Gère les événements et les rappels (callbacks)

3. **WSBackendConnection (classe principale)**
   - Gère la logique de connexion avancée
   - Implémente la reconnexion, la redirection et la file d'attente des messages
   - Fournit une API pour d'autres composants de l'application

### Initialisation

```javascript
window.WSBackendConnection = new r(window.WEBSOCKET_HOST, {
    pingRequired: window.WS_HOST_PING_REQUIRED,
    proHost: window.WEBSOCKET_PRO_HOST,
    reconnectHost: window.WEBSOCKET_HOST_FOR_RECONNECT,
    initialHost: window.WEBSOCKET_INITIAL_HOST,
    connectionType: window.WEBSOCKET_CONNECTION_TYPE
});
```

### Paramètres d'initialisation détaillés

```javascript
constructor(e, t = {}) {
    this._queueStack = [];
    this._reconnectCount = 0;
    this._redirectCount = 0;
    this._errorsCount = 0;
    this._errorsInfoSent = false;
    this._connectionStart = null;
    this._connectionEstablished = null;
    this._reconnectTimeout = null;
    this._onlineCancellationToken = null;
    this._isConnectionForbidden = false;
    
    this._initialHost = t.initialHost || null;
    this._suggestedHost = e;
    this._proHost = t.proHost;
    this._reconnectHost = t.reconnectHost;
    this._noReconnectAfterTimeout = true === t.noReconnectAfterTimeout;
    this._dataRequestTimeout = t.dataRequestTimeout;
    this._connectionType = t.connectionType;
}
```

## III. Protocole de Messagerie

### Format de Base

TradingView utilise un format de message propriétaire inspiré de Socket.io:

```
~m~[LONGUEUR]~m~[CONTENU]
```

- `~m~` est un délimiteur constant
- `[LONGUEUR]` est la longueur du contenu en caractères
- `[CONTENU]` est le contenu du message

### Encodage des Messages

```javascript
_encode(e) {
    let t, o = "";
    const i = Array.isArray(e) ? e : [e];
    for (let e = 0; e < i.length; e++) {
        t = null === i[e] || void 0 === i[e] ? "" : n._stringify(i[e]);
        o += s + t.length + s + t;
    }
    return o;
}

// Version alternative avec plus de commentaires
_encode(e) {
    // Format: ~m~[LENGTH]~m~[PAYLOAD]
    let messageText = "";
    const messages = Array.isArray(e) ? e : [e];
    for (let i = 0; i < messages.length; i++) {
        const payload = r._stringify(messages[i]);
        messageText += i + payload.length + i + payload;
    }
    return messageText;
}

// Lors de la stringification des objets JSON
static _stringify(e) {
    return "[object Object]" === Object.prototype.toString.call(e) 
        ? "~j~" + JSON.stringify(e) 
        : String(e);
}
```

### Décodage des Messages

```javascript
_decode(e) {
    const t = [];
    let n, o;
    do {
        if (e.substring(0, 3) !== s) return t;
        n = "";
        
        const i = (e = e.substring(3)).length;
        for (let t = 0; t < i; t++) {
            if (o = Number(e.substring(t, t + 1)), 
               Number(e.substring(t, t + 1)) !== o) {
                e = e.substring(n.length + 3);
                n = Number(n);
                break;
            }
            n += o;
        }
        
        t.push(e.substring(0, n));
        e = e.substring(n);
    } while (e !== "");
    
    return t;
}

// Version alternative avec variables renommées
_decode(e) {
    const messages = [];
    let lengthStr, lengthVal;
    
    do {
        if (e.substring(0, 3) !== i) return messages;
        lengthStr = "";
        lengthVal = "";
        
        const len = (e = e.substring(3)).length;
        for (let t = 0; t < len; t++) {
            if (Number(e.substring(t, t + 1)) !== s) {
                e = e.substring(lengthStr.length + 3);
                lengthStr = Number(lengthStr);
                break;
            }
            lengthStr += e.substring(t, t + 1);
        }
        
        messages.push(e.substring(0, lengthStr));
        e = e.substring(lengthStr);
    } while (e !== "");
    
    return messages;
}
```

### Types de Messages Spéciaux

```javascript
_checkIfHeartbeat(e) {
    return this._checkMessageType(e, "h");
}

_checkIfJson(e) {
    return this._checkMessageType(e, "j");
}

_checkMessageType(e, t) {
    return e.substring(0, 3) === "~" + t + "~";
}
```

## IV. Cycle de Vie de la Connexion

### 1. Établissement de la Connexion

```javascript
_doConnect() {
    // Détermination du serveur hôte
    this._host = this.getHost();
    
    // Création du socket
    this._socket = new o(this._host, {
        timeout: this._dataRequestTimeout,
        connectionType: this._connectionType
    });
    
    // Liaison des événements
    this._bindEvents();
    
    // Mesures de performance
    this._connectionStart = performance.now();
    this._connectionEstablished = null;
    
    // Connexion
    this._socket.connect();
    
    // Marques de performance
    performance.mark("SWSC", {detail: "Start WebSocket connection"});
}
```

### Construction de l'URL de connexion
```javascript
_prepareUrl() {
    const e = a(this.getHost());
    e.pathname += "socket.io/websocket";
    e.protocol = "wss:";
    e.searchParams.append("from", window.location.pathname.slice(1, 50));
    e.searchParams.append("date", window.BUILD_TIME || "");
    
    if ((0, s.isOnMobileAppPage)("any")) {
        e.searchParams.append("client", "mobile");
    }
    
    if (this._connectionType) {
        e.searchParams.append("type", this._connectionType);
    }
    
    if (window.WEBSOCKET_PARAMS_ANALYTICS) {
        const { ws_page_uri: t, ws_ancestor_origin: n } = window.WEBSOCKET_PARAMS_ANALYTICS;
        t && e.searchParams.append("page-uri", t);
        n && e.searchParams.append("ancestor-origin", n);
    }
    
    return e.href;
}
```

### 2. Négociation de Session

Le premier message reçu contient l'ID de session, non au format `~m~` standard:

```javascript
_onMessage(e) {
    if (!this.sessionid) {
        this.sessionid = e;
        this._onConnect();
    } else {
        // Traitement normal des messages
        if (this._checkIfHeartbeat(e)) {
            this._onHeartbeat(e.slice(3));
        } else if (this._checkIfJson(e)) {
            this._base.onMessage(JSON.parse(e.slice(3)));
        } else {
            this._base.onMessage(e);
        }
    }
}
```

### 3. Redirection (le cas échéant)

```javascript
_bindEvents() {
    this._socket.on("connect", () => {
        const e = this.getSessionId();
        if ("string" == typeof e) {
            const t = JSON.parse(e);
            if (t.redirect) {
                this._redirectCount += 1;
                this._suggestedHost = t.redirect;
                
                if (this.isMaxRedirects()) {
                    this._sendTelemetry("redirect_bailout");
                }
                
                return void this._redirect();
            }
        }
        
        // Connexion réussie
        this._connectionEstablished = performance.now();
        this._processMessageQueue();
        this._logMessage(0, "connect session:" + e);
    });
}
```

### 4. Déconnexion et Reconnexion

```javascript
_onDisconnect(e) {
    // Programmation de la reconnexion
    if (!this._noReconnectAfterTimeout || null !== this._reconnectTimeout) {
        this._reconnectTimeout = setTimeout(this._tryReconnect.bind(this), 5000);
    }
    
    // Nettoyage et notification
    this._clearOnlineCancellationToken();
    this._propagateDisconnect(e);
    this._closeSocket();
    this._queueStack = [];
    
    // Journalisation des erreurs
    let t = "disconnect session:" + this.getSessionId();
    if (e) {
        t += ", code:" + e.code + ", reason:" + e.reason;
        if (1005 === e.code) {
            this._sendTelemetry("websocket_code_1005");
        }
    }
    
    this._logMessage(0, t);
}

_reconnectWhenOnline() {
    if (navigator.onLine) {
        this._logMessage(0, "Network status: online - trying to connect");
        this._doConnect();
        this._onReconnect && this._onReconnect();
    } else {
        this._logMessage(0, "Network status: offline - wait until online");
        this._onlineCancellationToken = (0, l.callWhenOnline)(() => {
            this._logMessage(0, "Network status changed to online - trying to connect");
            this._doConnect();
            this._onReconnect && this._onReconnect();
        });
    }
}

_tryReconnect() {
    if (this._tryConnect()) {
        this._reconnectCount += 1;
    }
}
```

## V. Types de Messages et Structure

### 1. Messages Simples (Texte)

Format: `~m~[LONGUEUR]~m~[TEXTE]`
Exemple: `~m~5~m~hello`

### 2. Messages JSON

Format: `~m~[LONGUEUR]~m~~j~[JSON_STRING]`
Traitement:
```javascript
_checkIfJson(e) {
    return this._checkMessageType(e, "j");
}

// Dans _onMessage
if (this._checkIfJson(e)) {
    this._base.onMessage(JSON.parse(e.slice(3)));
}

// Lors de l'encodage
static _stringify(e) {
    return "[object Object]" === Object.prototype.toString.call(e) 
        ? "~j~" + JSON.stringify(e) 
        : String(e);
}
```

### 3. Messages Heartbeat

Format: `~m~[LONGUEUR]~m~~h~[ID]`
Traitement:
```javascript
_checkIfHeartbeat(e) {
    return this._checkMessageType(e, "h");
}

_onHeartbeat(e) {
    this.send("~h~" + e);
}

// Dans _onMessage
if (this._checkIfHeartbeat(e)) {
    this._onHeartbeat(e.slice(3));
}

_setTimeout() {
    this._clearIdleTimeout();
    this._timeout = setTimeout(this._onTimeout.bind(this), this._options.timeout);
}

_onTimeout() {
    this.disconnect();
    this._onDisconnect({
        code: 4000,
        reason: "socket.io timeout",
        wasClean: false
    });
}
```

### 4. Messages de Session

Le premier message reçu après la connexion est l'ID de session (format spécial).

### 5. Messages d'Erreur

Format typique: `~m~[LONGUEUR]~m~~j~{"error":"[MESSAGE]","code":[CODE]}`

## VI. Mécanismes de Fiabilité

### 1. File d'Attente des Messages

```javascript
_queueMessage(e) {
    if (0 === this._queueStack.length) {
        this._logMessage(0, "Socket is not connected. Queued a message");
    }
    this._queueStack.push(e);
}

_processMessageQueue() {
    if (0 !== this._queueStack.length) {
        this._logMessage(0, "Processing queued messages");
        this._queueStack.forEach(this.send.bind(this));
        this._logMessage(0, "Processed " + this._queueStack.length + " messages");
        this._queueStack = [];
    }
}
```

### 2. Reconnexion Automatique

```javascript
_tryReconnect() {
    if (this._tryConnect()) {
        this._reconnectCount += 1;
    }
}
```

### 3. Sélection Intelligente du Serveur

```javascript
getHost() {
    const e = this._tryGetProHost();
    return null !== e 
        ? e 
        : this._reconnectHost && this._reconnectCount > 3 
            ? this._reconnectHost 
            : this._suggestedHost;
}

_tryGetProHost() {
    return window.TradingView && 
           window.TradingView.onChartPage && 
           "battle" === window.environment && 
           !this._redirectCount && 
           -1 === window.location.href.indexOf("ws_host")
                ? this._initialHost 
                    ? this._initialHost 
                    : void 0 !== window.user && window.user.pro_plan 
                        ? this._proHost || this._suggestedHost 
                        : null
                : null;
}
```

### 4. Limites et Timeouts

```javascript
// Limite de redirections
isMaxRedirects() {
    return this._redirectCount >= 20;
}

// Limite de reconnexions
isMaxReconnects() {
    return this._reconnectCount >= 20;
}

// Timeout par défaut des requêtes
_dataRequestTimeout = t.dataRequestTimeout || 20000;

// Délai de timeout pour les heartbeats
_setTimeout() {
    this._clearIdleTimeout();
    this._timeout = setTimeout(this._onTimeout.bind(this), this._options.timeout);
}

// Seuil de logs d'erreurs pour télémétrie
const h = Number(window.TELEMETRY_WS_ERROR_LOGS_THRESHOLD) || 0;
```

### 5. État de connexion

```javascript
isConnected() {
    return !!this._socket && this._socket.isConnected();
}

isConnecting() {
    return !!this._socket && this._socket.isConnecting();
}

getConnectionEstablished() {
    return this._connectionEstablished;
}

getReconnectCount() {
    return this._reconnectCount;
}

getRedirectCount() {
    return this._redirectCount;
}
```

## VII. Performance et Surveillance

### 1. Mesure de la Latence (Ping)

```javascript
_startPing() {
    // Création de l'URL de ping
    const e = a(this.getHost());
    e.pathname += "ping";
    e.protocol = "https:";
    
    // Collecte des statistiques
    let t = 0, n = 0;
    const s = e => {
        this._pingInfo = this._pingInfo || { max: 0, min: Infinity, avg: 0 };
        const s = (new Date).getTime() - e;
        s > this._pingInfo.max && (this._pingInfo.max = s);
        s < this._pingInfo.min && (this._pingInfo.min = s);
        t += s;
        n++;
        this._pingInfo.avg = t / n;
        
        if (n >= 10 && this._pingIntervalId) {
            clearInterval(this._pingIntervalId);
            delete this._pingIntervalId;
        }
    };
    
    // Envoi périodique des pings
    this._pingIntervalId = setInterval(() => {
        const t = (new Date).getTime(),
              n = new XMLHttpRequest;
        n.open("GET", e, true);
        n.send();
        n.onreadystatechange = () => {
            if (n.readyState === XMLHttpRequest.DONE && n.status === 200) {
                s(t);
            }
        };
    }, 10000);
}
```

### 2. Mesures de Performance

```javascript
// Lors de la connexion
this._connectionStart = performance.now();
performance.mark("SWSC", {detail: "Start WebSocket connection"});

// À la connexion réussie
this._connectionEstablished = performance.now();
performance.mark("EWSC", {detail: "End WebSocket connection"});
performance.measure("WebSocket connection delay", "SWSC", "EWSC");
```

### 3. Télémétrie et Journalisation

```javascript
_sendTelemetry(e, t) {
    const n = { event: e, params: t };
    this._telemetry 
        ? this._flushTelemetryObject(n) 
        : this._telemetryObjectsQueue.push(n);
}

_logMessage(e, t) {
    const n = { method: e, message: t };
    this._logger
        ? this._flushLogMessage(n)
        : (n.message = `[${(new Date).toISOString()}] ${n.message}`,
           this._logsQueue.push(n));
}
```

## VIII. Exemples de Communications Typiques

### 1. Établissement de Session

Client → Serveur: Connexion WebSocket initiale
Serveur → Client: `[SESSION_ID]` (message spécial hors format)
Client: Stocke l'ID de session et génère l'événement "connect"

### 2. Heartbeats

Serveur → Client: `~m~2~m~~h~1`
Client → Serveur: `~m~2~m~~h~1`

### 3. Abonnement à un Symbole (hypothétique)

Client → Serveur: `~m~52~m~~j~{"method":"series_subscribe","params":["BINANCE:BTCUSDT"]}`
Serveur → Client: `~m~44~m~~j~{"result":true,"id":"cs_XXXXXXX"}`

### 4. Réception de Données (hypothétique)

Serveur → Client: `~m~96~m~~j~{"m":"series_data","p":["cs_XXXXXXX",{"s":"ok","v":[[1649764800,"45000.21","46250.12","44800.19","45995.63","1234.56"]]}]}`

### 5. Création d'Indicateur (hypothétique)

Client → Serveur: `~m~82~m~~j~{"method":"chart_create_study","params":["cs_XXXXXXX","rsi@tv-basicstudies",{}]}`
Serveur → Client: `~m~44~m~~j~{"result":true,"id":"st_XXXXXXX"}`

### 6. Gestion des Erreurs

Serveur → Client: `~m~58~m~~j~{"error":"Invalid session","code":401,"data":{"logout":true}}`

### 7. Processus de Redirection

Serveur → Client: `{"redirect": "alternate-server.tradingview.com"}`
Client: Se déconnecte et se reconnecte au serveur spécifié

## IX. Considérations de Sécurité et d'Authentification