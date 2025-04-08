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
