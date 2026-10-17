import { BlockPortSpec } from "../block-port.schema";
import {
	createBlockVariables,
	getBlockVariableMnemonics,
	validateBlockName,
} from "./function-block.schema";

describe("getBlockVariableMnemonics", () => {
	it("génère un mnémonique plat par port, préfixé du nom du bloc", () => {
		const portSpecs: BlockPortSpec[] = [
			{
				suffix: "IN",
				type: "BOOL",
				kind: "structural",
				direction: "input",
				generatesVariable: true,
			},
			{
				suffix: "OUT",
				type: "BOOL",
				kind: "structural",
				direction: "output",
				generatesVariable: true,
			},
		];

		expect(getBlockVariableMnemonics("MonBloc", portSpecs)).toEqual({
			IN: "MonBloc.IN",
			OUT: "MonBloc.OUT",
		});
	});

	it("ignore les ports dont generatesVariable est faux", () => {
		const portSpecs: BlockPortSpec[] = [
			{
				suffix: "IN",
				type: "BOOL",
				kind: "structural",
				direction: "input",
				generatesVariable: true,
			},
			{
				suffix: "PARAM",
				type: "TIME",
				kind: "parameter",
				direction: "input",
				generatesVariable: false,
			},
		];

		expect(getBlockVariableMnemonics("MonBloc", portSpecs)).toEqual({
			IN: "MonBloc.IN",
		});
	});
});

describe("validateBlockName", () => {
	it("accepte un nom valide", () => {
		expect(validateBlockName("Tempo1")).toEqual([]);
	});

	it("rejette un nom qui ne respecte pas la règle des mnémoniques", () => {
		expect(validateBlockName("1Tempo")).not.toEqual([]);
	});
});

describe("createBlockVariables", () => {
	const portSpecs: BlockPortSpec[] = [
		{
			suffix: "IN",
			type: "BOOL",
			kind: "structural",
			direction: "input",
			generatesVariable: true,
		},
		{
			suffix: "PT",
			type: "TIME",
			kind: "parameter",
			direction: "input",
			generatesVariable: false,
		},
		{
			suffix: "ET",
			type: "TIME",
			kind: "parameter",
			direction: "output",
			generatesVariable: true,
		},
	];

	it("ne crée une variable que pour les ports qui en génèrent une", () => {
		const variables = createBlockVariables("el-1", "Tempo1", portSpecs);

		expect(variables.map((v) => v.mnemonic)).toEqual(["Tempo1.IN", "Tempo1.ET"]);
	});

	it("renseigne id, zone, type et propriétaire", () => {
		const [inVar, etVar] = createBlockVariables("el-1", "Tempo1", portSpecs);

		expect(inVar).toMatchObject({
			id: "el-1-IN",
			zone: "memory",
			type: "BOOL",
			ownerBlock: { id: "el-1" },
		});
		expect(etVar).toMatchObject({ id: "el-1-ET", type: "TIME" });
	});

	it("renvoie une liste vide sans port générateur", () => {
		expect(createBlockVariables("el-1", "X", [portSpecs[1]!])).toEqual([]);
	});
});
