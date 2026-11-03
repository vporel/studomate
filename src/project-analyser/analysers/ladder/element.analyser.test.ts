import {
	createContactElement,
	createRailTerminalElement,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { ProjectAnalyserIssueSource } from "@/project-analyser/project.analyser.issue";
import { createSectionWith, wireInSeries } from "@tests/utils/ladder-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import { checkBooleanVariable, checkHasPredecessor } from "./element.analyser";

const source: ProjectAnalyserIssueSource = {
	sourceType: "ladder-contact",
	sourceId: "e1",
	parentId: "l1",
};

describe("checkHasPredecessor", () => {
	function buildLadder(incoming: boolean) {
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "NO", 0, 1);
		const connections = incoming
			? wireInSeries([rail, contact])
			: wireInSeries([contact, rail]);
		const ladder = new Ladder("l1", "L", [
			createSectionWith([rail, contact], connections),
		]);
		return { ladder, contact };
	}

	it("returns null when a connection targets the element", () => {
		const { ladder, contact } = buildLadder(true);
		expect(checkHasPredecessor(contact, ladder, source)).toBeNull();
	});

	it("returns an error issue with the given source when nothing targets the element", () => {
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("A", "NO", 0, 1);
		const ladder = new Ladder("l1", "L", [
			createSectionWith([rail, contact], []),
		]);

		const issue = checkHasPredecessor(contact, ladder, source);

		expect(issue?.code).toBe("LADDER_ELEMENT_NO_PREDECESSOR");
		expect(issue?.severity).toBe("error");
		expect(issue?.source).toEqual(source);
	});

	it("returns an issue when the element only has an outgoing connection", () => {
		const { ladder, contact } = buildLadder(false);
		expect(checkHasPredecessor(contact, ladder, source)?.code).toBe(
			"LADDER_ELEMENT_NO_PREDECESSOR",
		);
	});
});

describe("checkBooleanVariable", () => {
	const codes = {
		noVariable: "LADDER_COIL_NO_VARIABLE",
		undeclared: "LADDER_COIL_VARIABLE_UNDECLARED",
		notBoolean: "LADDER_COIL_VARIABLE_NOT_BOOLEAN",
	} as const;

	beforeEach(() => VariableFactory.reset());

	function check(
		name: string,
		...variables: ReturnType<typeof VariableFactory.createMemoryBool>[]
	) {
		const map = new Map(variables.map((v) => [v.mnemonic, v]));
		return checkBooleanVariable(name, map, source, codes);
	}

	it.each(["", "   "])("reports noVariable for %j", (name) => {
		const issue = check(name);
		expect(issue?.code).toBe("LADDER_COIL_NO_VARIABLE");
		expect(issue?.severity).toBe("error");
		expect(issue?.source).toEqual(source);
		expect(issue?.params).toEqual({});
	});

	it("reports undeclared with the variable name", () => {
		const issue = check("A");
		expect(issue?.code).toBe("LADDER_COIL_VARIABLE_UNDECLARED");
		expect(issue?.params).toEqual({ variableName: "A" });
	});

	it("reports notBoolean with the variable name", () => {
		const issue = check("A", VariableFactory.createMemoryInt("A"));
		expect(issue?.code).toBe("LADDER_COIL_VARIABLE_NOT_BOOLEAN");
		expect(issue?.params).toEqual({ variableName: "A" });
	});

	it("returns null for a declared BOOL variable", () => {
		expect(check("A", VariableFactory.createMemoryBool("A"))).toBeNull();
	});
});
