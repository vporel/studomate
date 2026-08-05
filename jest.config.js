/** @type {import("jest").Config} **/
module.exports = {
	testEnvironment: "node",
	testEnvironmentOptions: {
		customExportConditions: [""],
	},
	setupFilesAfterEnv: ["<rootDir>/tests/utils/setupJestDom.ts"],
	transform: {
		"^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
	},
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
		"^@tests/(.*)$": "<rootDir>/tests/$1",
	},
};
