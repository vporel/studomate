---
name: process-audit
description: Traiter, dépiler et résoudre les points d'un fichier d'audit (typiquement _ai_context/audit-code.md ou _ai_context/audit-perfs.md). Boucle de haut en bas sur les points numérotés : vérifier, proposer un plan, attendre validation, implémenter, tester, supprimer le point.
---

# Skill : traitement d'un fichier d'audit

Ce skill s'applique dès qu'une tâche demande de traiter, dépiler ou résoudre les points d'un
fichier d'audit (typiquement `_ai_context/audit-code.md` ou `_ai_context/audit-perfs.md`).

Un fichier d'audit est une liste numérotée de points (1, 2, 3… avec d'éventuels sous-points),
chacun décrivant un défaut avec fichier(s) concerné(s), symptôme, problème et recommandation.

## Prérequis — savoir quel fichier traiter

Le skill ne démarre pas tant que le fichier d'audit cible n'est pas connu. S'il n'a pas été
passé en argument (`/process-audit _ai_context/audit-perfs.md`) et qu'il n'est pas évident
d'après la conversation, demander explicitement quel fichier traiter. Ne pas deviner.

## La boucle

Le fichier est traité **de haut en bas**. Pour chaque itération :

### 1. Choisir un point

Prendre le **premier point encore présent** dans le fichier (le plus haut). Ne pas sauter de
point, ne pas laisser le développeur choisir l'ordre — c'est toujours le premier restant.

### 2. Vérifier que l'audit dit vrai

Aller lire le code réellement concerné et confirmer que le défaut décrit existe bien tel
qu'énoncé.

- Si le point est **confirmé** : passer à l'étape 3.
- Si le point est un **faux positif** (le défaut n'existe pas, ou plus, ou la description est
  fausse) : le signaler clairement au développeur (ce qui a été vérifié, pourquoi le point ne
  tient pas) et **attendre sa décision** (supprimer le point sans rien implémenter, le
  requalifier, autre). Ne jamais supprimer un point de sa propre initiative dans ce cas.

### 3. Proposer un plan

Décrire le plan d'implémentation en texte : fichiers touchés, nature des changements,
migrations éventuelles (voir CLAUDE.md), risques. Ne pas écrire de code à ce stade.

### 4. Attendre la validation du développeur

**Point non négociable : ne rien implémenter avant que le développeur ait explicitement
validé le plan.**

- Si le plan est **rejeté ou amendé** : le réviser et re-soumettre, puis re-attendre la
  validation. On ne passe pas à l'étape suivante sans un feu vert explicite.
- Une notification automatique de tâche de fond n'est **pas** une validation.

### 5. Implémenter

Une fois le plan validé, l'implémenter. Changements minimaux et ciblés, style du dépôt (voir
CLAUDE.md).

Pour chaque fichier créé ou modifié qui introduit une logique nouvelle ou modifiée
(fonction, branche, règle métier, comportement de composant) : écrire les tests dédiés
correspondants (créés à côté du fichier ou ajoutés à un test existant). Se demander
explicitement quels cas le correctif introduit et les couvrir — ne pas se contenter de
relancer la suite existante. Seul un changement sans logique propre (renommage, déplacement,
type pur) peut s'en dispenser.

### 6. Vérifier

Avant de toucher au fichier d'audit :

- Lancer les tests **affectés ou créés** par le changement (`npx jest chemin/du/fichier.test.ts`),
  pas la suite entière — sauf changement transverse (voir CLAUDE.md).
- Lancer `npx tsc --noEmit` et `npm run lint`.

Si une vérification échoue, corriger avant de continuer. Ne pas passer à l'étape 7 sur du
rouge.

### 7. Supprimer le point

Supprimer purement et simplement le bloc du point dans le fichier d'audit. **Ne pas** le
marquer « Traité », « Fait » ou barré — le **supprimer**.

**Ne pas renuméroter** les points restants : les numéros servent de références croisées
(« voir point 24 »), les garder stables même si des trous apparaissent.

### 8. Répercuter sur les points liés

Relire le reste du fichier d'audit et repérer les points **liés** à celui qu'on vient de
traiter (même fichier, même mécanisme, dépendance).

- Si le traitement a **modifié ce qu'un autre point doit dire** (lignes qui ont bougé, partie
  du problème déjà résolue) : mettre à jour le texte de ce point directement dans le fichier
  d'audit pour refléter l'état réel.
- Si un point lié devient **entièrement caduc** : ne pas le supprimer d'office — le signaler
  au développeur et attendre sa décision (comme un faux positif à l'étape 2).

### 9. Point suivant

Enchaîner directement sur le point suivant (retour à l'étape 1) **sans demander au
développeur s'il veut continuer**. La boucle ne s'arrête que lorsque le fichier d'audit ne
contient plus aucun point.

La validation attendue à l'étape 4 porte uniquement sur le plan du point courant, jamais sur
le fait de poursuivre la boucle.

## Fin

Quand tous les points sont traités, l'indiquer au développeur. Le fichier d'audit vidé peut
être laissé en place (ou supprimé si le développeur le demande).
