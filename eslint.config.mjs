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
			"unicode-bom": ["error", "never"],
			// console.error/warn sont la stratégie de journalisation actuelle (analysers,
			// repositories, managers...) ; seul console.log (oublis de debug) est visé.
			"no-console": ["error", { allow: ["warn", "error"] }],
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
			// Un import qui remonte de plusieurs niveaux (`../../...`) doit passer par l'alias
			// `@/...` : sa cible ne dépend plus de l'emplacement du fichier qui importe, et il
			// ne peut plus coexister avec un alias pointant vers la même chose dans un même
			// fichier. Un seul niveau (`../sibling`) reste autorisé, pour les modules d'un même
			// dossier de fonctionnalité.
			"no-restricted-imports": [
				"error",
				{
					paths: [
						{
							name: "@mui/icons-material",
							message:
								"Importez chaque icône par son chemin direct (@mui/icons-material/Nom) : le barrel ralentit la compilation dev/HMR.",
						},
					],
					patterns: [
						{
							group: ["../../*"],
							message: "Utilisez l'alias @/... plutôt qu'un import relatif remontant de plusieurs niveaux.",
						},
						{
							group: [
								"../schemas/*",
								"../expression-language/*",
								"../project-analyser/*",
								"../project-pre-compiler/*",
								"../project-compiler/*",
								"../simulator/*",
								"../persistence/*",
								"../ui/*",
								"../bridge/*",
								"../lib/*",
							],
							message:
								"Utilisez l'alias @/... plutôt qu'un import relatif traversant une frontière de module.",
						},
					],
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
	// Règles nécessitant les informations de type (project service) : limitées aux fichiers
	// TS/TSX du projet, les fichiers de config (*.mjs, *.js) n'en font pas partie.
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: __dirname,
			},
		},
		rules: {
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
		},
	},
];

export default eslintConfig;
