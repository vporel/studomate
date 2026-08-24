import { createCoilElement, createContactElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Variable from "@/schemas/variable/variable.schema";
import { createSectionWith, wireInSeries } from "@tests/utils/ladder-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import ContactAnalyser from "./contact.analyser";

describe("ContactAnalyser", () => {
	const analyser = new ContactAnalyser();

	beforeEach(() => VariableFactory.reset());

	function variablesMap(...variables: Variable[]): Map<string, Variable> {
		return new Map(variables.map((v) => [v.mnemonic, v]));
	}

	it("signale CONTACT_VARIABLE_UNDECLARED quand la variable n'est pas dans le dictionnaire", () => {
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "NO", 0, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const ladder = new Ladder("l1", "L", [
			createSectionWith([rail, contact, coil], wireInSeries([rail, contact, coil])),
		]);

		const issues = analyser.analyseInContext(contact, ladder, variablesMap(), ProjectFactory.createEmpty());

		expect(issues.map((i) => i.code)).toContain("CONTACT_VARIABLE_UNDECLARED");
	});

	it("signale CONTACT_VARIABLE_NOT_BOOLEAN quand la variable n'est pas booléenne", () => {
		const rail = createRailTerminalElement(0);
		const a = VariableFactory.createMemoryInt("A");
		const contact = createContactElement("A", "NO", 0, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const ladder = new Ladder("l1", "L", [
			createSectionWith([rail, contact, coil], wireInSeries([rail, contact, coil])),
		]);

		const issues = analyser.analyseInContext(contact, ladder, variablesMap(a), ProjectFactory.createEmpty());

		expect(issues.map((i) => i.code)).toContain("CONTACT_VARIABLE_NOT_BOOLEAN");
	});

	it("signale NETWORK_NO_COIL (warning) quand le contact ne pilote aucune bobine", () => {
		const rail = createRailTerminalElement(0);
		const a = VariableFactory.createLogicInput("A");
		const contact = createContactElement("A", "NO", 0, 1);
		const ladder = new Ladder("l1", "L", [createSectionWith([rail, contact], wireInSeries([rail, contact]))]);

		const issues = analyser.analyseInContext(contact, ladder, variablesMap(a), ProjectFactory.createEmpty());

		const issue = issues.find((i) => i.code === "NETWORK_NO_COIL");
		expect(issue).toBeDefined();
		expect(issue?.severity).toBe("warning");
	});

	it("signale ELEMENT_NO_PREDECESSOR quand le contact n'a aucune connexion entrante", () => {
		const a = VariableFactory.createLogicInput("A");
		const contact = createContactElement("A", "NO", 0, 0);
		const coil = createCoilElement("Q", "normal", 0, 1);
		const ladder = new Ladder("l1", "L", [createSectionWith([contact, coil], wireInSeries([contact, coil]))]);

		const issues = analyser.analyseInContext(contact, ladder, variablesMap(a), ProjectFactory.createEmpty());

		expect(issues.map((i) => i.code)).toContain("ELEMENT_NO_PREDECESSOR");
	});

	it("cumule NETWORK_NO_COIL et ELEMENT_NO_PREDECESSOR sur un contact totalement isolé", () => {
		const a = VariableFactory.createLogicInput("A");
		const contact = createContactElement("A", "NO", 0, 0);
		const ladder = new Ladder("l1", "L", [createSectionWith([contact])]);

		const issues = analyser.analyseInContext(contact, ladder, variablesMap(a), ProjectFactory.createEmpty());

		expect(issues.map((i) => i.code).sort()).toEqual(["ELEMENT_NO_PREDECESSOR", "NETWORK_NO_COIL"]);
	});

	it("n'émet aucune issue pour un contact valide, correctement câblé", () => {
		const a = VariableFactory.createLogicInput("A");
		const q = VariableFactory.createMemoryBool("Q");
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "NO", 0, 1);
		const coil = createCoilElement("Q", "normal", 0, 2);
		const ladder = new Ladder("l1", "L", [
			createSectionWith([rail, contact, coil], wireInSeries([rail, contact, coil])),
		]);

		const issues = analyser.analyseInContext(contact, ladder, variablesMap(a, q), ProjectFactory.createEmpty());

		expect(issues).toEqual([]);
	});
});
