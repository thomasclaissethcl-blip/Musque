
# Impro Lab — POC avancé prêt pour GitHub Pages

Cette version reprend le gabarit UX modale et l'applique à un domaine unique : l'improvisation musicale.

## Ce que contient le projet

- 4 parcours thématiques
- 50 ateliers progressifs
- mode parcours et mode libre
- barre haute à icônes + modals pour garder la page principale lisible
- séance structurée en : intention, à jouer, supports sonores, variation, comprendre, test rapide
- supports sonores joués dans le navigateur : exemple, drone, suite d'accords, boucle de pulsation
- sauvegarde locale, export et import JSON
- service worker pour usage statique simple

## Déploiement sur GitHub Pages

1. Déposez le contenu du dossier à la racine du dépôt GitHub Pages.
2. Activez Pages sur la branche voulue.
3. Vérifiez que les chemins restent relatifs. Le projet est conçu pour fonctionner sans backend.

## Structure utile

- `data/pathways.json` : structure des parcours
- `data/lessons.json` : contenu des 50 ateliers
- `js/app.js` : orchestration générale
- `js/renderers.js` : rendu des vues et des ateliers
- `js/exercises.js` : correction automatique
- `js/midiEngine.js` : moteur audio Web Audio pour les exemples et playbacks

## Limites actuelles

- Le moteur audio reste synthétique. Il favorise l'autonomie et la portabilité plutôt que le réalisme instrumental.
- Les exercices vérifient des repères conceptuels après pratique, mais pas l'exécution instrumentale elle-même.
- Aucune authentification ni synchronisation distante n'est prévue : tout est local.
