# Studomate

[![CI](https://github.com/vporel/studomate/actions/workflows/ci.yml/badge.svg)](https://github.com/vporel/studomate/actions/workflows/ci.yml)

**Studomate** est un outil pédagogique dédié à l'automatisme : apprentissage, conception et simulation de logiques d'automatisme directement dans le navigateur.

L'objectif est de rendre les concepts d'automatisme accessibles, visuels et actionnables — de l'introduction en classe à la mise en pratique individuelle. Le projet prend actuellement en charge le **GRAFCET**, avec l'ambition d'évoluer vers un simulateur plus large (autres notations comme le **Ladder**, nouvelles interfaces, etc.).

## Fonctionnalités

- **Édition graphique** de GRAFCET : étapes, transitions, actions, entrées/sorties virtuelles, temporisations, compteurs, variables analogiques.
- **Simulation** en mode pas-à-pas, scan complet ou exécution continue, avec visualisation en temps réel des états actifs et des transitions évaluées.
- **Analyse** du projet pour détecter les erreurs de structure avant simulation.
- **Manuel utilisateur** intégré à l'application.

## Feuille de route

- Amélioration de l'éditeur (alignements, validations, ergonomie).
- Tableaux de bord de simulation.
- Comptes utilisateurs & sauvegarde cloud.
- Ouverture à d'autres langages/notations d'automatisme (Ladder, etc.).

Public visé : étudiants (BTS, IUT, écoles d'ingénieurs, universités), enseignants et formateurs en automatisme/électrotechnique, professionnels en reconversion ou remise à niveau.

## Stack technique

- [Next.js](https://nextjs.org) (App Router) + React 19 + TypeScript
- [MUI](https://mui.com) pour l'interface
- [React Flow (@xyflow/react)](https://reactflow.dev) pour l'éditeur graphique
- [Zustand](https://github.com/pmndrs/zustand) pour la gestion d'état
- Jest pour les tests

## Démarrer en local

Node 20 ou plus est requis.

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans le navigateur.

## Tests

```bash
npm test
```

## Contribuer

Les idées, retours et contributions sont les bienvenus. Ouvrez une issue ou une pull request.

## Licence

Ce projet est sous licence [MIT](./LICENSE).
