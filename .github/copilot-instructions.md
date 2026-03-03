# Copilot / Assistant Instructions

Ce fichier documente les règles et bonnes pratiques que l'assistant (Copilot) doit suivre dans ce projet.

## Règles générales (extraites des consignes du projet)

- Utiliser l'outil `apply_patch` pour modifier ou ajouter des fichiers dans le dépôt.
- Avant chaque appel d'outil, afficher un bref préambule expliquant ce qui va être fait (1-2 phrases).
- Utiliser le TODO list tool (`manage_todo_list`) pour planifier et suivre les tâches multi-étapes.
- Quand vous modifiez des fichiers, faire des changements minimaux et ciblés.
- Ne pas divulguer le nom du modèle à moins que l'utilisateur le demande explicitement.
- Respecter les règles de formatage et les conventions du dépôt existant.
- Pour les modifications de code : privilégier la précision et la sécurité, et exécuter les tests/builds si possible.
- **Ne pas créer de fichiers `index.ts` dans les dossiers** pour ré-exporter les modules.

## Règles spécifiques au rendu final

- Fournir des réponses concises et orientées action.
- Lors de la présentation de changements importants, lister les fichiers modifiés et leur chemin.

## Règles techniques à suivre

- Préférer `userAgentData.platform` puis `navigator.userAgent` plutôt que `navigator.platform` (dépréciation).
- Utiliser `z ustand` store via `createStore` et exposer les setters depuis le store pour ouvrir/fermer des modales.
- Quand une modification est faite dans un hook (`useEffect`, `useCallback`, `useMemo`, etc.), vérifier que la liste des dépendances du hook est correcte et complète.

## Librairies principales (extraites de `package.json`)

- Framework / runtime : `next` — 15.5.2
- UI : `@mui/material` — ^7.3.2, `@mui/icons-material` — ^7.3.2, `@mui/x-tree-view` — ^8.14.0, `@emotion/react` — ^11.14.0, `@emotion/styled` — ^11.14.1
- State : `zustand` — ^5.0.11
- Utilitaires : `date-fns` — ^4.1.0, `mitt` — ^3.0.1, `nanoid` — ^5.1.6
- DOM / images : `dom-to-image` — ^2.6.0, `html-to-image` — ^1.11.13
- Feedback : `react-toastify` — ^11.0.5
- React : `react` — 19.1.0, `react-dom` — 19.1.0
- Dev / tooling : `eslint` — ^9, `eslint-config-next` — 15.5.2, `typescript` — ^5

## Recommandations pour les IDs & exports

- Pour des IDs courts et sûrs, préférer `nanoid` (longueur par défaut 21) plutôt que tronquer des UUIDs.
- Pour les exportations (fichiers), centraliser la logique dans un utilitaire pour réutilisation et test.

## Notes pour l'intégration continue et dev

- Linting : `eslint` / `eslint-config-next`.
- TypeScript est utilisé (`typescript`), faire attention aux types exportés depuis les stores.

## Tests unitaires

- Les tests unitaires Jest sont placés **à côté des fichiers concernés**, pas dans un dossier séparé `src/tests/`.
- Nommer les fichiers de test : `nomDuFichier.test.ts` (ou `.test.tsx` pour les composants React).
- Utiliser Jest avec `ts-jest` pour les tests TypeScript.
- **Lors de l'écriture de tests, ne jamais modifier le code source**. Les tests doivent valider le code existant tel quel.
- Si un problème est détecté dans le code source pendant l'écriture des tests, **remonter l'alerte à l'utilisateur** et attendre sa décision avant toute modification.

---

Fichier généré automatiquement par l'assistant pour référencer les règles du projet.
