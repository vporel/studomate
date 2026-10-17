import { BLOCK_OPERAND_LITERALS } from "@/schemas/ladder/block.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import Variable from "@/schemas/variable/variable.schema";
import {
	cellValue,
	columnsGridTemplate,
	computeStatus,
	inputWidthPx,
} from "./variable-selector-utils";

function boolInput(mnemonic: string): Variable {
	return new Variable({
		id: "v1",
		mnemonic,
		zone: "logic-input",
		type: "BOOL",
		dialect: Dialect.FR,
	});
}

function intMemory(mnemonic: string): Variable {
	return new Variable({
		id: "v2",
		mnemonic,
		zone: "memory",
		type: "INT",
		dialect: Dialect.FR,
	});
}

describe("computeStatus", () => {
	it("retourne null pour un mnémonique vide", () => {
		expect(computeStatus("", [], Dialect.FR)).toBeNull();
		expect(computeStatus("   ", [], Dialect.FR)).toBeNull();
	});

	it("retourne ok pour une constante TIME sur une pinoche d'opérande de bloc", () => {
		expect(
			computeStatus("T#2s", [], Dialect.FR, undefined, undefined, [
				...BLOCK_OPERAND_LITERALS,
			]),
		).toBe("ok");
	});

	it("retourne ok pour un mnémonique déclaré sans filtre", () => {
		const variables = [boolInput("moteur")];

		expect(computeStatus("moteur", variables, Dialect.FR)).toBe("ok");
	});

	it("retourne excluded-behavior pour une entrée dont le comportement est exclu", () => {
		const pushButton = boolInput("arret").update(
			{ behavior: { kind: "push-button-nc", params: null } },
			Dialect.FR,
		);
		const free = boolInput("libre");
		const excluded = ["push-button-no", "push-button-nc"] as const;

		expect(
			computeStatus(
				"arret",
				[pushButton],
				Dialect.FR,
				undefined,
				undefined,
				undefined,
				excluded,
			),
		).toBe("excluded-behavior");
		expect(
			computeStatus(
				"libre",
				[free],
				Dialect.FR,
				undefined,
				undefined,
				undefined,
				excluded,
			),
		).toBe("ok");
	});

	it("retourne excluded-zone pour une variable d'une zone exclue", () => {
		const constant = new Variable({
			id: "k",
			mnemonic: "SEUIL",
			zone: "constant",
			type: "INT",
			value: "4",
			dialect: Dialect.FR,
		});
		const excluded = ["constant"] as const;

		expect(
			computeStatus(
				"SEUIL",
				[constant],
				Dialect.FR,
				undefined,
				undefined,
				undefined,
				undefined,
				excluded,
			),
		).toBe("excluded-zone");
		expect(computeStatus("SEUIL", [constant], Dialect.FR)).toBe("ok");
		expect(
			computeStatus(
				"compteur",
				[intMemory("compteur")],
				Dialect.FR,
				undefined,
				undefined,
				undefined,
				undefined,
				excluded,
			),
		).toBe("ok");
	});

	it("retourne undeclared quand le mnémonique est inconnu", () => {
		expect(computeStatus("inconnu", [boolInput("moteur")], Dialect.FR)).toBe(
			"undeclared",
		);
	});

	it("retourne wrong-type quand la variable existe mais hors du typeFilter", () => {
		const variables = [intMemory("compteur")];

		expect(computeStatus("compteur", variables, Dialect.FR, ["BOOL"])).toBe(
			"wrong-type",
		);
	});

	it("retourne excluded-direction quand la direction est exclue", () => {
		const variables = [boolInput("capteur")];

		expect(
			computeStatus("capteur", variables, Dialect.FR, undefined, "IN"),
		).toBe("excluded-direction");
	});

	it("retourne ok pour une constante TIME si 'time' est accepté", () => {
		expect(
			computeStatus("T#5s", [], Dialect.FR, undefined, undefined, ["time"]),
		).toBe("ok");
	});

	it("ne retourne pas ok pour une constante TIME mal formée", () => {
		expect(
			computeStatus("T#s5s", [], Dialect.FR, undefined, undefined, ["time"]),
		).not.toBe("ok");
	});

	it("retourne undeclared pour T# si 'time' n'est pas accepté", () => {
		expect(
			computeStatus("T#5s", [], Dialect.FR, undefined, undefined, ["number"]),
		).toBe("undeclared");
	});

	it("retourne ok pour un littéral numérique si 'number' est accepté", () => {
		expect(
			computeStatus("42", [], Dialect.FR, undefined, undefined, ["number"]),
		).toBe("ok");
	});

	it("retourne ok pour un littéral booléen selon le dialecte", () => {
		expect(
			computeStatus("vrai", [], Dialect.FR, undefined, undefined, ["boolean"]),
		).toBe("ok");
		expect(
			computeStatus("vrai", [], Dialect.EN, undefined, undefined, ["boolean"]),
		).toBe("undeclared");
	});

	it("retourne ok pour un littéral chaîne si 'string' est accepté", () => {
		expect(
			computeStatus('"abc"', [], Dialect.FR, undefined, undefined, ["string"]),
		).toBe("ok");
	});
});

describe("cellValue", () => {
	it("retourne l'adresse ou — si absente", () => {
		const v = new Variable({
			id: "v1",
			mnemonic: "moteur",
			zone: "logic-output",
			type: "BOOL",
			dialect: Dialect.FR,
		});
		v.address = "%Q0.0";

		expect(cellValue(v, "address")).toBe("%Q0.0");
	});

	it("retourne — quand l'adresse est absente", () => {
		const v = new Variable({
			id: "v1",
			mnemonic: "moteur",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		});

		expect(cellValue(v, "address")).toBe("—");
	});

	it("retourne le mnémonique", () => {
		const v = new Variable({
			id: "v1",
			mnemonic: "moteur",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		});

		expect(cellValue(v, "mnemonic")).toBe("moteur");
	});

	it("retourne le type", () => {
		const v = new Variable({
			id: "v1",
			mnemonic: "moteur",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		});

		expect(cellValue(v, "type")).toBe("INT");
	});

	it("retourne le libellé de direction", () => {
		expect(
			cellValue(
				new Variable({
					id: "v1",
					mnemonic: "a",
					zone: "logic-input",
					type: "BOOL",
					dialect: Dialect.FR,
				}),
				"scope",
			),
		).toBe("Entrée");
		expect(
			cellValue(
				new Variable({
					id: "v2",
					mnemonic: "b",
					zone: "logic-output",
					type: "BOOL",
					dialect: Dialect.FR,
				}),
				"scope",
			),
		).toBe("Sortie");
		expect(
			cellValue(
				new Variable({
					id: "v3",
					mnemonic: "c",
					zone: "memory",
					type: "BOOL",
					dialect: Dialect.FR,
				}),
				"scope",
			),
		).toBe("Mémoire");
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
