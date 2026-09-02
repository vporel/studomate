/** @type {import("jest").Config} **/
module.exports = {
	testEnvironment: "node",
	testEnvironmentOptions: {
		customExportConditions: [""],
	},
	setupFilesAfterEnv: ["<rootDir>/tests/utils/setupJestDom.ts"],
	transform: {
		// nanoid ships ESM-only from v5 — also transform it (and stop ignoring it in
		// node_modules) instead of the CommonJS-transpiled test build hitting `require()`
		// on its `import` syntax.
		// `isolatedModules: true` : transpile-only, pas de type-check pendant les tests — la
		// couverture de types reste assurée par `npx tsc --noEmit` en CI. Le projet respecte
		// déjà les contraintes d'`isolatedModules` (activé dans `tsconfig.json`).
		"^.+\\.(t|j)sx?$": [
			"ts-jest",
			{ isolatedModules: true, tsconfig: { jsx: "react-jsx", allowJs: true } },
		],
	},
	transformIgnorePatterns: [
		"/node_modules/(?!(nanoid|marked|next-intl|use-intl|@formatjs|intl-messageformat)/)",
	],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
		"^@tests/(.*)$": "<rootDir>/tests/$1",
		"\\.css$": "<rootDir>/tests/utils/cssStub.js",
	},
	// Seuils volontairement placés sous la couverture réelle : assez bas pour ne pas casser la
	// CI au premier fichier tiré par un nouveau test (la couverture ne compte que les fichiers
	// réellement requis par un test), assez haut pour alerter sur une vraie régression.
	// Chiffres de référence : `npm test -- --coverage`.
	coverageThreshold: {
		global: {
			statements: 75,
			branches: 65,
			functions: 65,
			lines: 78,
		},
	},
};
