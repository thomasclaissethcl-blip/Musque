# ImproLab Studio

POC complet construit à partir du gabarit multi-domaine pour démontrer un usage sur le thème des techniques méconnues et efficaces d'improvisation musicale.

## Contenu du POC

- 4 parcours thématiques
- 52 capsules
- 5 niveaux de progression : découverte, apprentissage, approfondissement, maîtrise, atelier expert
- exercices auto-corrigés directement dans les capsules et via le mode "exercice rapide"
- révision espacée à partir des points clés
- moteur sonore léger de type MIDI navigateur, fondé sur des séquences de notes et Web Audio
- sauvegarde locale, export et import de progression, fonctionnement statique

## Parcours inclus

- Motifs et cellules
- Rythme et débit
- Harmonie et couleurs
- Interaction et narration

## Principes de ce POC

Chaque capsule suit la même logique :

1. un objectif précis
2. une mise en pratique sur instrument
3. quelques points clés transformés en cartes de révision
4. deux exemples sonores ou plus
5. des exercices auto-corrigés

## Exemple de structure de capsule

```json
{
  "id": "motifs-cells-01",
  "title": "Limiter le matériau à trois notes",
  "practiceTask": {
    "title": "Mise en pratique sur instrument",
    "instructions": "Prenez trois notes voisines et jouez-les dans plusieurs ordres avant de répondre.",
    "successHint": "Cherchez un résultat audible et simple."
  },
  "listeningExamples": [
    {
      "title": "Exemple source",
      "tempo": 92,
      "instrument": "warm",
      "notes": [
        { "midi": 60, "duration": 0.5 },
        { "midi": 62, "duration": 0.5 }
      ]
    }
  ]
}
```

## Adapter le POC à un autre domaine

Le moteur reste multi-domaine. Pour changer de domaine :

- remplacez `data/pathways.json`
- remplacez `data/lessons.json`
- ajustez les couleurs et textes d'interface dans `styles.css`, `index.html` et `js/config.js`
- conservez le moteur d'exercices si les six types intégrés vous suffisent

## Modules commentés

Chaque fichier JavaScript comporte un en-tête expliquant son rôle et donnant un exemple d'adaptation.
