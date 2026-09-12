# Contributing to Studomate

Thanks for your interest in Studomate! Feedback, bug reports, and contributions are welcome.

## Reporting a bug or suggesting an idea

Open an [issue](https://github.com/vporel/studomate/issues) describing:
- what you observe / what you're proposing,
- the expected behavior if it's a bug,
- steps to reproduce if possible.

## Proposing a change (pull request)

1. Fork the repo and create a branch from `develop`.
2. Install dependencies: `npm install` (Node 20 or later).
3. Run the project locally: `npm run dev`.
4. Before submitting your PR, run the same checks as CI:

   ```bash
   npm run lint      # style and ESLint rules
   npx tsc --noEmit  # type checking
   npm test          # unit tests
   npm run build     # production build
   ```

5. Open the pull request against `develop`, describing the change and its motivation.

These four commands are automatically re-run by CI on Node 22 on every push and pull request.

For substantial changes, opening an issue beforehand to discuss it is appreciated, to avoid work that might ultimately not be accepted.
