import { BlockPortSpec } from "../ladder/block-port.schema";
import {
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
