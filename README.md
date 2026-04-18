# Microlearning Studio Template

Ce gabarit est une webapp statique multi-domaine inspirée du principe de votre application initiale, mais généralisée pour des contenus autres que linguistiques.

## Ce que contient le gabarit

Le moteur est volontairement simple à maintenir. Il fonctionne sans backend et s'appuie sur des données JSON.

- `index.html` : structure globale de l'interface.
- `styles.css` : feuille de style unique.
- `js/app.js` : orchestration générale.
- `js/state.js` : progression, XP, niveau, série, validation des capsules.
- `js/exercises.js` : rendu et correction automatique des exercices.
- `js/review.js` : cartes de révision espacée.
- `js/dataService.js` : chargement des contenus.
- `js/storage.js` : sauvegarde locale et export/import.
- `js/renderers.js` : affichage des parcours, capsules et détails.
- `js/utils.js` : fonctions utilitaires.
- `data/pathways.json` : parcours d'exemple.
- `data/lessons.json` : capsules d'exemple.

## Types d'exercices intégrés

Les six types pris en charge dans ce gabarit sont les suivants.

- QCU : `single_choice`
- QCM : `multiple_choice`
- vrai/faux : `true_false`
- texte court à réponse attendue : `short_text`
- appariement : `match_pairs`
- remise en ordre : `order_steps`

Tous sont corrigés automatiquement côté navigateur.

## Principe pédagogique généralisé

Chaque capsule repose sur la même structure :

1. un objectif,
2. une situation ou un contexte,
3. des points clés transformables en cartes de révision,
4. des blocs explicatifs,
5. un ou plusieurs exercices.

Cette structure peut être transposée à de nombreux domaines, par exemple la conformité, la cybersécurité, la maintenance, le management, la qualité, la santé, la vente, la relation client, etc.

## Adapter le gabarit à un autre domaine

La première adaptation à réaliser se situe dans `data/lessons.json`.

Chaque capsule suit ce schéma :

```json
{
  "id": "incident-reporting",
  "title": "Signaler un incident utilement",
  "type": "capsule",
  "typeLabel": "Capsule méthode",
  "description": "Résumé court visible dans le catalogue.",
  "objective": "Compétence ciblée.",
  "context": "Situation de départ ou cas métier.",
  "keyPoints": [
    {
      "id": "kp1",
      "front": "Point à mémoriser",
      "back": "Explication ou bonne pratique."
    }
  ],
  "explanations": [
    {
      "title": "Commentaire pédagogique",
      "text": "Développement explicatif."
    }
  ],
  "exercises": [],
  "pathways": [
    { "id": "onboarding", "order": 1, "stage": "decouverte" }
  ]
}
```

## Exemples de réemploi

### Domaine réglementaire

Les points clés peuvent devenir : obligation, condition, exception, risque, justificatif.

Les exercices peuvent vérifier :

- le bon choix d'une règle applicable,
- l'identification d'une non-conformité,
- la chronologie d'une procédure,
- l'association entre situation et document attendu.

### Domaine managérial

Les points clés peuvent devenir : posture, formulation, erreur fréquente, action recommandée.

Les exercices peuvent vérifier :

- le bon réflexe de communication,
- le repérage d'un biais de management,
- l'ordre des étapes d'un entretien,
- le choix d'une réponse adaptée à une situation.

### Domaine technique

Les points clés peuvent devenir : symptôme, cause probable, contrôle à effectuer, action corrective.

Les exercices peuvent vérifier :

- l'association entre panne et diagnostic,
- la remise en ordre d'une intervention,
- la bonne lecture d'un signal,
- le choix de l'action la plus sûre.

## Limites actuelles du gabarit

Le gabarit est immédiatement exploitable, mais plusieurs améliorations restent possibles.

- Ajouter une évaluation de fin de capsule avec score récapitulatif.
- Ajouter un algorithme de révision espacée plus fin.
- Gérer des réponses semi-ouvertes avec expressions régulières ou variantes pondérées.
- Ajouter des médias par capsule : image, audio, vidéo courte, schéma.
- Ajouter des gabarits visuels différents selon le type de capsule.

## Mise en route

Ouvrez `index.html` dans un serveur local statique.

Exemples simples :

- VS Code avec Live Server
- `python -m http.server`
- n'importe quel hébergement statique

Le service worker ne fonctionnera correctement qu'en contexte de serveur local ou distant.

## Intention du gabarit

Le code est commenté pour servir de base de production et de support de compréhension. Chaque module contient des indications de personnalisation et le jeu de données fourni joue le rôle d'exemple immédiatement visible.


## Évolution UX intégrée

Cette version du gabarit réintroduit le principe d'organisation issu de l'application source :
- une barre haute avec accès rapide par icônes ;
- une surface principale réservée au parcours et aux capsules ;
- un tableau de bord en modal pour le suivi, la révision et l'exercice rapide ;
- une modal de réglages pour le mode d'apprentissage et les options futures ;
- une modal de sauvegarde pour export, import et réinitialisation.

L'objectif est de limiter l'effet "tout est étalé" et de rendre le parcours utilisateur plus lisible sans perdre les fonctions du gabarit multi-domaine.
