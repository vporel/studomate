import { Dialect } from "@/expression-language/dialect.enum";
import Variable from "@/schemas/variable/variable.schema";
import {
	cellValue,
	columnsGridTemplate,
	computeStatus,
	inputWidthPx,
} from "./variable-selector-utils";

function boolInput(mnemonic: string): Variable {
	return new Variable("v1", mnemonic, "logic-input", "BOOL");
}

function intMemory(mnemonic: string): Variable {
	return new Variable("v2", mnemonic, "memory", "INT");
}

describe("computeStatus", () => {
	it("retourne null pour un mnémonique vide", () => {
		expect(computeStatus("", [])).toBeNull();
		expect(computeStatus("   ", [])).toBeNull();
	});

	it("retourne ok pour un mnémonique déclaré sans filtre", () => {
		const variables = [boolInput("moteur")];

		expect(computeStatus("moteur", variables)).toBe("ok");
	});

	it("retourne undeclared quand le mnémonique est inconnu", () => {
		expect(computeStatus("inconnu", [boolInput("moteur")])).toBe("undeclared");
	});

	it("retourne wrong-type quand la variable existe mais hors du typeFilter", () => {
		const variables = [intMemory("compteur")];

		expect(computeStatus("compteur", variables, ["BOOL"])).toBe("wrong-type");
	});

	it("retourne excluded-direction quand la direction est exclue", () => {
		const variables = [boolInput("capteur")];

		expect(computeStatus("capteur", variables, undefined, "IN")).toBe(
			"excluded-direction",
		);
	});

	it("retourne ok pour une constante TIME si 'time' est accepté", () => {
		expect(computeStatus("T#5s", [], undefined, undefined, ["time"])).toBe("ok");
	});

	it("retourne undeclared pour T# si 'time' n'est pas accepté", () => {
		expect(computeStatus("T#5s", [], undefined, undefined, ["number"])).toBe(
			"undeclared",
		);
	});

	it("retourne ok pour un littéral numérique si 'number' est accepté", () => {
		expect(computeStatus("42", [], undefined, undefined, ["number"])).toBe("ok");
	});

	it("retourne ok pour un littéral booléen selon le dialecte", () => {
		expect(
			computeStatus("vrai", [], undefined, undefined, ["boolean"], Dialect.FR),
		).toBe("ok");
		expect(
			computeStatus("vrai", [], undefined, undefined, ["boolean"], Dialect.EN),
		).toBe("undeclared");
	});

	it("retourne ok pour un littéral chaîne si 'string' est accepté", () => {
		expect(
			computeStatus('"abc"', [], undefined, undefined, ["string"]),
		).toBe("ok");
	});
});

describe("cellValue", () => {
	it("retourne l'adresse ou — si absente", () => {
		const v = new Variable("v1", "moteur", "logic-output", "BOOL");
		v.address = "%Q0.0";

		expect(cellValue(v, "address")).toBe("%Q0.0");
	});

	it("retourne — quand l'adresse est absente", () => {
		const v = new Variable("v1", "moteur", "memory", "BOOL");

		expect(cellValue(v, "address")).toBe("—");
	});

	it("retourne le mnémonique", () => {
		const v = new Variable("v1", "moteur", "memory", "BOOL");

		expect(cellValue(v, "mnemonic")).toBe("moteur");
	});

	it("retourne le type", () => {
		const v = new Variable("v1", "moteur", "memory", "INT");

		expect(cellValue(v, "type")).toBe("INT");
	});

	it("retourne le libellé de direction", () => {
		expect(
			cellValue(new Variable("v1", "a", "logic-input", "BOOL"), "scope"),
		).toBe("Entrée");
		expect(
			cellValue(new Variable("v2", "b", "logic-output", "BOOL"), "scope"),
		).toBe("Sortie");
		expect(cellValue(new Variable("v3", "c", "memory", "BOOL"), "scope")).toBe(
			"Mémoire",
		);
	});
});

describe("columnsGridTemplate", () => {
	it("produit une chaîne CSS pour les colonnes demandées", () => {
		expect(columnsGridTemplate(["mnemonic", "type"])).toBe("180px 60px");
	});

	it("gère une liste vide", () => {
		expect(columnsGridTemplate([])).toBe("");
	});
});

describe("inputWidthPx", () => {
	it("retourne au moins 44px pour un texte vide", () => {
		expect(inputWidthPx("", "12px Arial")).toBeGreaterThanOrEqual(44);
	});

	it("retourne une valeur plus grande pour un texte plus long", () => {
		const short = inputWidthPx("AB", "12px Arial");
		const long = inputWidthPx("ABCDEFGHIJ", "12px Arial");

		expect(long).toBeGreaterThanOrEqual(short);
	});
});
