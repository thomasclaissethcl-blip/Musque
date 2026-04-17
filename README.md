# Impro Lab

Ce dossier contient un POC complet de webapp statique construit à partir du gabarit multi-domaine, puis spécialisé sur les techniques méconnues et efficaces d’improvisation musicale.

## Ce que montre ce prototype

Le POC démontre qu’un même moteur peut devenir un produit fini crédible pour un domaine artistique très pratique.

Il comprend :

- 4 parcours thématiques ;
- 50 ateliers répartis sur 5 stages ;
- un mode libre et un mode parcours guidé ;
- une progression locale avec XP, niveau, série quotidienne et révision espacée ;
- des exercices auto-corrigés de 6 types ;
- un mini moteur de lecture de notes dans le navigateur ;
- une structure 100 % statique adaptée à GitHub Pages.

## Parcours inclus

- Motifs et contraintes fertiles
- Temps, silence et respiration
- Couleur, tension et dehors-dedans
- Narration, interaction et forme longue

## Architecture

- `index.html` : structure de l’interface.
- `styles.css` : identité visuelle du POC.
- `data/lessons.json` : 50 ateliers.
- `data/pathways.json` : 4 parcours.
- `js/midiEngine.js` : lecteur de séquences par synthèse simple.
- `js/exercises.js` : rendu et correction automatique des exercices.
- `js/renderers.js` : affichage détaillé des capsules, y compris pratique et exemples jouables.

## Schéma utile pour adapter une capsule

Chaque capsule suit ce modèle :

```json
{
  "id": "cellule-de-3-notes",
  "title": "La cellule de trois notes",
  "objective": "Fabriquer un discours cohérent à partir de seulement trois hauteurs.",
  "practice": {
    "duration": "6 à 10 minutes",
    "setup": "Préparer le tempo et le repère sonore.",
    "steps": ["Étape 1", "Étape 2", "Étape 3"],
    "selfCheck": "Question d’auto-vérification"
  },
  "examples": [
    { "title": "Exemple A", "tempo": 96, "notes": [{"note": "C4", "duration": 0.5}] }
  ],
  "keyPoints": [
    { "id": "kp1", "front": "Idée à mémoriser", "back": "Explication" }
  ],
  "explanations": [
    { "title": "Pourquoi", "text": "Explication pédagogique" }
  ],
  "exercises": []
}
```

## Déploiement GitHub Pages

1. Créez un dépôt GitHub.
2. Déposez le contenu de ce dossier à la racine du dépôt.
3. Activez GitHub Pages sur la branche voulue.
4. Servez le site depuis la racine ou le dossier principal du dépôt.

Aucune étape serveur n’est nécessaire.

## Remarques sur le lecteur de notes

Le module `js/midiEngine.js` ne s’appuie pas sur Web MIDI, car ce protocole suppose souvent un matériel ou un contexte plus spécifique. Le POC utilise à la place une synthèse locale légère par Web Audio. Pour un produit ultérieur, il serait possible d’ajouter :

- export de vrais fichiers MIDI ;
- import de patterns ;
- choix d’instrument ;
- exercices d’écoute plus avancés ;
- boucles, accompagnements et drones.