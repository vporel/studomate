# Studomate

[![CI](https://github.com/vporel/studomate/actions/workflows/ci.yml/badge.svg)](https://github.com/vporel/studomate/actions/workflows/ci.yml)

**Studomate** est un outil pédagogique dédié à l'automatisme : apprentissage, conception et simulation de logiques d'automatisme, directement dans le navigateur et hors ligne
(sauvegarde cloud et partage optionnels via un compte).

L'objectif est de rendre les concepts d'automatisme accessibles, visuels et actionnables — de l'introduction en classe à la mise en pratique individuelle. Le projet prend actuellement en charge le **GRAFCET** et le **Ladder**, et permet de concevoir des interfaces **HMI**.

## Fonctionnalités

- **Édition graphique multi-langages** : GRAFCET et Ladder (étapes, transitions, contacts, bobines, temporisations, compteurs...).
- **Création d'interfaces HMI** : Concevez des interfaces homme-machine interactives pour piloter et visualiser le système.
- **Simulation et Visualisation** : Exécution en mode pas-à-pas ou continu, avec visualisation en temps réel des états, des transitions, et des variables en direct.
- **Analyse** du projet pour détecter les erreurs de structure avant simulation.
- **Manuel utilisateur** intégré à l'application.
- **Comptes & sauvegarde cloud** : projets stockés localement ou dans le cloud, avec partage de projet par lien.

## Feuille de route

- Amélioration de l'éditeur (alignements, validations, ergonomie).
- Tableaux de bord de simulation avancés.
- Ouverture à d'autres langages/notations d'automatisme.

Public visé : étudiants (BTS, IUT, écoles d'ingénieurs, universités), enseignants et formateurs en automatisme/électrotechnique, professionnels en reconversion ou remise à niveau.

## Stack technique

- [Next.js](https://nextjs.org) (App Router) + React 19 + TypeScript
- [MUI](https://mui.com) pour l'interface
- [React Flow (@xyflow/react)](https://reactflow.dev) pour l'éditeur graphique
- [Zustand](https://github.com/pmndrs/zustand) pour la gestion d'état
- [Supabase](https://supabase.com) pour l'authentification et le stockage cloud des projets
- [Sentry](https://sentry.io) pour le monitoring d'erreurs
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
