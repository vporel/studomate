import type { CounterBlockParams } from "../block.schema";
import {
	createCounterBlockElement,
	createCounterBlockVariables,
	getCounterBlockParams,
	getCounterBlockVariableMnemonics,
	getCounterPortSpecs,
	readCounterParam,
	writeCounterParam,
} from "./counter.schema";

describe("getCounterPortSpecs", () => {
	it("CTU : pulsion CU, contrôle R", () => {
		const specs = getCounterPortSpecs("CTU");
		expect(specs.map((s) => s.suffix)).toEqual(["CU", "Q", "R", "PV", "CV"]);
	});

	it("CTD : pulsion CD, contrôle LD", () => {
		const specs = getCounterPortSpecs("CTD");
		expect(specs.map((s) => s.suffix)).toEqual(["CD", "Q", "LD", "PV", "CV"]);
	});

	it("CTUD : CU/QU câblés, CD/R/LD/PV en entrées paramètres, QD/CV en sorties paramètres", () => {
		const specs = getCounterPortSpecs("CTUD");
		expect(specs.map((s) => s.suffix)).toEqual([
			"CU",
			"QU",
			"CD",
			"R",
			"LD",
			"PV",
			"QD",
			"CV",
		]);
		expect(
			specs.filter((s) => s.kind === "structural").map((s) => s.suffix),
		).toEqual(["CU", "QU"]);
		expect(specs.find((s) => s.suffix === "CD")?.acceptedLiterals).toEqual([
			"boolean",
		]);
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
			CU: "Compteur1.CU",
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

describe("getCounterBlockVariableMnemonics (CTUD)", () => {
	it("génère CU/QU/QD/CV, pas CD/R/LD/PV", () => {
		expect(getCounterBlockVariableMnemonics("Stock", "CTUD")).toEqual({
			CU: "Stock.CU",
			QU: "Stock.QU",
			QD: "Stock.QD",
			CV: "Stock.CV",
		});
	});
});

describe("readCounterParam / writeCounterParam", () => {
	const ctud: CounterBlockParams = {
		name: "Stock",
		counterType: "CTUD",
		control: "r",
		pv: "5",
	};

	it("CTUD : R lit/écrit control, CD/LD/QD leurs propres champs", () => {
		let params = writeCounterParam(ctud, "CD", "capteur_sortie");
		params = writeCounterParam(params, "LD", "charge");
		params = writeCounterParam(params, "QD", "vide");
		params = writeCounterParam(params, "R", "raz");

		expect(params).toMatchObject({
			control: "raz",
			down: "capteur_sortie",
			load: "charge",
			qd: "vide",
		});
		expect(readCounterParam(params, "CD")).toBe("capteur_sortie");
		expect(readCounterParam(params, "LD")).toBe("charge");
		expect(readCounterParam(params, "QD")).toBe("vide");
		expect(readCounterParam(params, "R")).toBe("raz");
	});

	it("CTD : LD lit/écrit control", () => {
		const ctd: CounterBlockParams = { ...ctud, counterType: "CTD" };
		expect(readCounterParam(ctd, "LD")).toBe("r");
		expect(writeCounterParam(ctd, "LD", "x").control).toBe("x");
	});

	it("CD/LD/QD d'un CTUD non renseignés se lisent comme vides", () => {
		expect(readCounterParam(ctud, "CD")).toBe("");
		expect(readCounterParam(ctud, "LD")).toBe("");
		expect(readCounterParam(ctud, "QD")).toBe("");
	});
});

describe("createCounterBlockVariables", () => {
	it("génère les variables pulsion/Q (BOOL) et CV (INT), rattachées au bloc", () => {
		const variables = createCounterBlockVariables("el1", "Compteur1", "CTU");

		expect(variables.map((v) => v.mnemonic)).toEqual([
			"Compteur1.CU",
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
