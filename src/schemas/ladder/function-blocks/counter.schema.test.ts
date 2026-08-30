import {
	createCounterBlockElement,
	createCounterBlockVariables,
	getCounterBlockParams,
	getCounterBlockVariableMnemonics,
	getCounterPortSpecs,
} from "./counter.schema";

describe("getCounterPortSpecs", () => {
	it("CTU : pulsion IN, contrôle R", () => {
		const specs = getCounterPortSpecs("CTU");
		expect(specs.map((s) => s.suffix)).toEqual(["IN", "Q", "R", "PV", "CV"]);
	});

	it("CTD : pulsion CD, contrôle LD", () => {
		const specs = getCounterPortSpecs("CTD");
		expect(specs.map((s) => s.suffix)).toEqual(["CD", "Q", "LD", "PV", "CV"]);
	});

	it("PV accepte un littéral numérique, le contrôle un littéral booléen", () => {
		const specs = getCounterPortSpecs("CTU");
		expect(specs.find((s) => s.suffix === "PV")?.acceptedLiterals).toEqual([
			"number",
		]);
		expect(specs.find((s) => s.suffix === "R")?.acceptedLiterals).toEqual([
			"boolean",
		]);
	});
});

describe("getCounterBlockVariableMnemonics", () => {
	it("génère les mnémoniques pulsion/Q/CV à partir du nom du bloc, pas le contrôle ni PV", () => {
		expect(getCounterBlockVariableMnemonics("Compteur1", "CTU")).toEqual({
			IN: "Compteur1.IN",
			Q: "Compteur1.Q",
			CV: "Compteur1.CV",
		});
		expect(getCounterBlockVariableMnemonics("Compteur1", "CTD")).toEqual({
			CD: "Compteur1.CD",
			Q: "Compteur1.Q",
			CV: "Compteur1.CV",
		});
	});
});

describe("createCounterBlockVariables", () => {
	it("génère les variables pulsion/Q (BOOL) et CV (INT), rattachées au bloc", () => {
		const variables = createCounterBlockVariables("el1", "Compteur1", "CTU");

		expect(variables.map((v) => v.mnemonic)).toEqual([
			"Compteur1.IN",
			"Compteur1.Q",
			"Compteur1.CV",
		]);
		expect(variables.map((v) => v.type)).toEqual(["BOOL", "BOOL", "INT"]);
		expect(variables.every((v) => v.ownerBlock?.id === "el1")).toBe(true);
	});
});

describe("createCounterBlockElement", () => {
	it("pose un bloc compteur à la position donnée, avec sa config dans data.params", () => {
		const block = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "5" },
			2,
			3,
		);

		expect(block.type).toBe("block");
		expect(block.data).toEqual({
			blockType: "counter",
			params: { name: "Compteur1", counterType: "CTU", control: "R", pv: "5" },
		});
		expect(block.position).toEqual({ row: 2, col: 3 });
		expect(block.id).toBeTruthy();
	});

	it("chaque bloc créé a un id distinct", () => {
		const a = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "5" },
			0,
			0,
		);
		const b = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "5" },
			0,
			0,
		);
		expect(a.id).not.toBe(b.id);
	});
});

describe("getCounterBlockParams", () => {
	it("renvoie la config d'un bloc compteur", () => {
		const block = createCounterBlockElement(
			{
				name: "Compteur1",
				counterType: "CTD",
				control: "LD",
				pv: "5",
				cv: "Sortie",
			},
			0,
			0,
		);

		expect(getCounterBlockParams(block)).toEqual({
			name: "Compteur1",
			counterType: "CTD",
			control: "LD",
			pv: "5",
			cv: "Sortie",
		});
	});

	it("renvoie null pour un bloc d'un autre type", () => {
		const block = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "5" },
			0,
			0,
		);
		block.data = { blockType: "user-program", params: { programId: "prog1" } };

		expect(getCounterBlockParams(block)).toBeNull();
	});
});
