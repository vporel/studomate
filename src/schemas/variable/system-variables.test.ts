import {
	getSystemVariable,
	isSystemVariableName,
	SYSTEM_TIME_BASES,
	SYSTEM_VARIABLE_PREFIX,
	SYSTEM_VARIABLES,
} from "./system-variables";

describe("isSystemVariableName", () => {
	it("reconnaît le préfixe réservé", () => {
		expect(isSystemVariableName("_SYS_TB_200ms")).toBe(true);
		expect(isSystemVariableName("_SYS_whatever")).toBe(true);
	});

	it("rejette tout le reste", () => {
		expect(isSystemVariableName("moteur")).toBe(false);
		expect(isSystemVariableName("_GeneratedMemo_0")).toBe(false);
		expect(isSystemVariableName("Tempo1.ET")).toBe(false);
	});
});

describe("SYSTEM_TIME_BASES", () => {
	it("expose les quatre bases attendues, toutes BOOL et préfixées", () => {
		expect(SYSTEM_TIME_BASES.map((b) => b.name)).toEqual([
			"_SYS_TB_100ms",
			"_SYS_TB_200ms",
			"_SYS_TB_500ms",
			"_SYS_TB_1s",
			"_SYS_TB_2s",
		]);
		for (const base of SYSTEM_TIME_BASES) {
			expect(base.type).toBe("BOOL");
			expect(base.name.startsWith(SYSTEM_VARIABLE_PREFIX)).toBe(true);
			expect(base.periodMs).toBeGreaterThan(0);
			expect(base.description).not.toHaveLength(0);
		}
	});

	// Simplification assumée : le moteur n'émet qu'une impulsion par scan, une base plus rapide
	// que le temps de scan par défaut (100 ms) perdrait des tops.
	it("aucune base n'a de période inférieure au temps de scan par défaut (100 ms)", () => {
		for (const base of SYSTEM_TIME_BASES) {
			expect(base.periodMs).toBeGreaterThanOrEqual(100);
		}
	});

	it("périodes croissantes, en millisecondes", () => {
		expect(SYSTEM_TIME_BASES.map((b) => b.periodMs)).toEqual([
			100, 200, 500, 1000, 2000,
		]);
	});
});

describe("SYSTEM_VARIABLES / getSystemVariable", () => {
	it("contient au moins les bases de temps", () => {
		for (const base of SYSTEM_TIME_BASES) {
			expect(SYSTEM_VARIABLES).toContainEqual(base);
		}
	});

	it("getSystemVariable retrouve par nom, undefined sinon", () => {
		expect(getSystemVariable("_SYS_TB_1s")?.name).toBe("_SYS_TB_1s");
		expect(getSystemVariable("_SYS_TB_unknown")).toBeUndefined();
		expect(getSystemVariable("moteur")).toBeUndefined();
	});
});
