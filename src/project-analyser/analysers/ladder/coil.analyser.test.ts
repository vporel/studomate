import {
	createCoilElement,
	createContactElement,
	createRailTerminalElement,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Variable from "@/schemas/variable/variable.schema";
import { createSectionWith, wireInSeries } from "@tests/utils/ladder-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import CoilAnalyser from "./coil.analyser";

describe("CoilAnalyser", () => {
	const analyser = new CoilAnalyser();

	beforeEach(() => VariableFactory.reset());

	function variablesMap(...variables: Variable[]): Map<string, Variable> {
		return new Map(variables.map((v) => [v.mnemonic, v]));
	}

	it("signale LADDER_COIL_VARIABLE_UNDECLARED quand la variable n'est pas dans le dictionnaire", () => {
		const rail = createRailTerminalElement(0);
		const coil = createCoilElement("Q", "normal", 0, 1);
		const ladder = new Ladder("l1", "L", [
			createSectionWith([rail, coil], wireInSeries([rail, coil])),
		]);

		const issues = analyser.analyseInContext(
			coil,
			ladder,
			variablesMap(),
			ProjectFactory.createEmpty(),
		);

		expect(issues.map((i) => i.code)).toContain(
			"LADDER_COIL_VARIABLE_UNDECLARED",
		);
	});

	it("signale LADDER_COIL_VARIABLE_NOT_BOOLEAN quand la variable n'est pas booléenne", () => {
		const rail = createRailTerminalElement(0);
		const q = VariableFactory.createMemoryInt("Q");
		const coil = createCoilElement("Q", "normal", 0, 1);
		const ladder = new Ladder("l1", "L", [
			createSectionWith([rail, coil], wireInSeries([rail, coil])),
		]);

		const issues = analyser.analyseInContext(
			coil,
			ladder,
			variablesMap(q),
			ProjectFactory.createEmpty(),
		);

		expect(issues.map((i) => i.code)).toContain(
			"LADDER_COIL_VARIABLE_NOT_BOOLEAN",
		);
	});

	it("signale LADDER_COIL_VARIABLE_IS_INPUT quand la bobine piloterait une entrée", () => {
		const rail = createRailTerminalElement(0);
		const i0 = VariableFactory.createLogicInput("I0");
		const coil = createCoilElement("I0", "normal", 0, 1);
		const ladder = new Ladder("l1", "L", [
			createSectionWith([rail, coil], wireInSeries([rail, coil])),
		]);

		const issues = analyser.analyseInContext(
			coil,
			ladder,
			variablesMap(i0),
			ProjectFactory.createEmpty(),
		);

		expect(issues.map((i) => i.code)).toContain(
			"LADDER_COIL_VARIABLE_IS_INPUT",
		);
	});

	it("signale LADDER_ELEMENT_NO_PREDECESSOR quand la bobine n'a aucune connexion entrante", () => {
		const q = VariableFactory.createMemoryBool("Q");
		const coil = createCoilElement("Q", "normal", 0, 0);
		const ladder = new Ladder("l1", "L", [createSectionWith([coil])]);

		const issues = analyser.analyseInContext(
			coil,
			ladder,
			variablesMap(q),
			ProjectFactory.createEmpty(),
		);

		expect(issues.map((i) => i.code)).toContain(
			"LADDER_ELEMENT_NO_PREDECESSOR",
		);
	});

	it("signale une seule LADDER_COIL_DUPLICATE_NORMAL_ASSIGNMENT par bobine quand deux bobines normales partagent la variable, avec le compte dans le message", () => {
		const q = VariableFactory.createMemoryBool("Q");
		const rail1 = createRailTerminalElement(0);
		const coil1 = createCoilElement("Q", "normal", 0, 1);
		const rail2 = createRailTerminalElement(1);
		const coil2 = createCoilElement("Q", "normal", 1, 1);
		const ladder = new Ladder("l1", "L", [
			createSectionWith(
				[rail1, coil1, rail2, coil2],
				[...wireInSeries([rail1, coil1]), ...wireInSeries([rail2, coil2])],
			),
		]);
		const variables = variablesMap(q);

		const issuesCoil1 = analyser.analyseInContext(
			coil1,
			ladder,
			variables,
			ProjectFactory.createEmpty(),
		);
		const issuesCoil2 = analyser.analyseInContext(
			coil2,
			ladder,
			variables,
			ProjectFactory.createEmpty(),
		);

		expect(
			issuesCoil1.filter(
				(i) => i.code === "LADDER_COIL_DUPLICATE_NORMAL_ASSIGNMENT",
			),
		).toHaveLength(1);
		expect(
			issuesCoil2.filter(
				(i) => i.code === "LADDER_COIL_DUPLICATE_NORMAL_ASSIGNMENT",
			),
		).toHaveLength(1);
		const duplicateIssue = issuesCoil1.find(
			(i) => i.code === "LADDER_COIL_DUPLICATE_NORMAL_ASSIGNMENT",
		)!;
		expect(duplicateIssue.severity).toBe("warning");
		expect(duplicateIssue.params.count).toBe(2);
	});

	it("n'émet aucune issue quand deux bobines set/reset partagent la même variable", () => {
		const q = VariableFactory.createMemoryBool("Q");
		const rail1 = createRailTerminalElement(0);
		const setCoil = createCoilElement("Q", "set", 0, 1);
		const rail2 = createRailTerminalElement(1);
		const resetCoil = createCoilElement("Q", "reset", 1, 1);
		const ladder = new Ladder("l1", "L", [
			createSectionWith(
				[rail1, setCoil, rail2, resetCoil],
				[
					...wireInSeries([rail1, setCoil]),
					...wireInSeries([rail2, resetCoil]),
				],
			),
		]);
		const variables = variablesMap(q);

		const issuesSet = analyser.analyseInContext(
			setCoil,
			ladder,
			variables,
			ProjectFactory.createEmpty(),
		);
		const issuesReset = analyser.analyseInContext(
			resetCoil,
			ladder,
			variables,
			ProjectFactory.createEmpty(),
		);

		expect(issuesSet.map((i) => i.code)).not.toContain(
			"LADDER_COIL_DUPLICATE_NORMAL_ASSIGNMENT",
		);
		expect(issuesReset.map((i) => i.code)).not.toContain(
			"LADDER_COIL_DUPLICATE_NORMAL_ASSIGNMENT",
		);
	});

	it("porte la source ladder-coil, avec l'id de la bobine et le parentId du ladder", () => {
		const rail = createRailTerminalElement(0);
		const coil = createCoilElement("Q", "normal", 0, 1);
		const ladder = new Ladder("l1", "L", [
			createSectionWith([rail, coil], wireInSeries([rail, coil])),
		]);

		const [issue] = analyser.analyseInContext(
			coil,
			ladder,
			variablesMap(),
			ProjectFactory.createEmpty(),
		);

		expect(issue.source).toEqual({
			sourceType: "ladder-coil",
			sourceId: coil.id,
			parentId: "l1",
		});
	});

	it("n'émet aucune issue pour une bobine valide, unique, correctement câblée", () => {
		const q = VariableFactory.createMemoryBool("Q");
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "NO", 0, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const ladder = new Ladder("l1", "L", [
			createSectionWith(
				[rail, contact, coil],
				wireInSeries([rail, contact, coil]),
			),
		]);
		const a = VariableFactory.createLogicInput("A");

		const issues = analyser.analyseInContext(
			coil,
			ladder,
			variablesMap(q, a),
			ProjectFactory.createEmpty(),
		);

		expect(issues).toEqual([]);
	});
});
