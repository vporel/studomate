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
		"^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx", allowJs: true } }],
	},
	transformIgnorePatterns: ["/node_modules/(?!nanoid/)"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
		"^@tests/(.*)$": "<rootDir>/tests/$1",
	},
	// Seuils fixés avec une marge sous la couverture mesurée (statements 77.96 %, branches 60 %,
	// functions 70.67 %, lines 79.92 % au 2026-08-05) : assez bas pour ne pas casser la CI au
	// premier fichier importé par un nouveau test (la couverture ne compte que les fichiers
	// réellement requis par un test), assez haut pour alerter sur une vraie régression.
	coverageThreshold: {
		global: {
			statements: 75,
			branches: 55,
			functions: 65,
			lines: 78,
		},
	},
};
