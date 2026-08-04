import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
	// Ignores globaux : doivent être seuls dans leur objet.
	// Combinés à d'autres clés (`rules`, `files`...), ils ne seraient qu'un filtre
	// local à cet objet de configuration, et le dossier de build serait analysé.
	{
		ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"],
	},
	...compat.extends("next/core-web-vitals", "next/typescript"),
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			// Un paramètre imposé par une signature (visiteur, classe abstraite...) ne peut pas
			// être supprimé sans casser le contrat : on le préfixe par `_` pour marquer
			// explicitement qu'il est inutilisé ici, tout en gardant la signature lisible.
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
		},
	},
	// Les fichiers de configuration à la racine sont en CommonJS
	{
		files: ["*.js", "*.mjs", "*.cjs"],
		rules: {
			"@typescript-eslint/no-require-imports": "off",
		},
	},
];

export default eslintConfig;
