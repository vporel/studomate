# Studomate

[![CI](https://github.com/vporel/studomate/actions/workflows/ci.yml/badge.svg)](https://github.com/vporel/studomate/actions/workflows/ci.yml)

**Studomate** est le studio d'automatisme le plus rapide et le plus accessible pour apprendre et expérimenter le **GRAFCET**, le **Ladder** et les **HMI** : gratuit, sans installation, directement dans le navigateur.

Sa valeur n'est pas d'être plus puissant qu'un logiciel industriel, mais de réduire à presque zéro la friction pour apprendre l'automatisme : pas d'installation, pas de licence, pas d'automate ni de cartes d'E/S à configurer. Son différenciateur : GRAFCET, Ladder et HMI animées dans le même environnement, avec des variables partagées entre les trois — une partie opérative virtuelle pour voir le système réagir.

Sans compte, les projets sont stockés localement dans le navigateur ; la sauvegarde cloud et le partage par lien sont optionnels via un compte (pseudo, sans email).

## Fonctionnalités

- **Édition graphique multi-langages** : GRAFCET et Ladder (étapes, transitions, contacts, bobines, temporisations, compteurs...).
- **HMI animées** : déplacement d'un objet, remplissage d'un réservoir, changement d'état visuel — une partie opérative virtuelle pilotée par les variables du projet.
- **Simulation et Visualisation** : Exécution en mode pas-à-pas ou continu, avec visualisation en temps réel des états, des transitions, et des variables en direct.
- **Analyse en continu** : les erreurs de structure sont signalées pendant l'édition (sévérités `error` / `warning`), pas seulement au lancement de la simulation.
- **Manuel utilisateur** intégré à l'application.
- **Partage par lien** : envoyez un projet à vos étudiants ; ils l'ouvrent sans compte ni installation.
- **Comptes & sauvegarde cloud (optionnels)** : projets stockés localement ou dans le cloud, authentification par pseudo (sans email).
- **Vos projets vous appartiennent** : export/import JSON, schéma versionné avec migrations automatiques — un projet exporté aujourd'hui restera ouvrable demain.

## Vie privée

Aucun email requis, aucune donnée personnelle stockée, aucun cookie de suivi. L'authentification se fait par pseudo et les statistiques d'usage sont anonymes.

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

Ce projet est sous licence [GNU AGPL v3](./LICENSE).
