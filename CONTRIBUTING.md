# Contribuer à Studomate

Merci de l'intérêt porté à Studomate ! Les retours, rapports de bugs et contributions sont les bienvenus.

## Signaler un bug ou proposer une idée

Ouvrez une [issue](https://github.com/vporel/studomate/issues) en décrivant :
- ce que vous observez / ce que vous proposez,
- le comportement attendu si c'est un bug,
- les étapes pour reproduire si possible.

## Proposer une modification (pull request)

1. Forkez le repo et créez une branche depuis `develop`.
2. Installez les dépendances : `npm install` (Node 20 ou plus).
3. Lancez le projet en local : `npm run dev`.
4. Avant de proposer votre PR, faites passer les mêmes vérifications que la CI :

   ```bash
   npm run lint      # style et règles ESLint
   npx tsc --noEmit  # vérification des types
   npm test          # tests unitaires
   npm run build     # build de production
   ```

5. Ouvrez la pull request vers `develop` en décrivant le changement et sa motivation.

Ces quatre commandes sont rejouées automatiquement par la CI sur Node 20 et 22 à chaque push et chaque pull request.

Pour les changements conséquents, ouvrir une issue au préalable pour en discuter est apprécié, afin d'éviter du travail qui ne serait finalement pas retenu.
