import Project from "@/schemas/project/project.schema";
import {
	coil,
	no,
	section,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import { formatAnalysisIssue } from "@/bridge/analysis-issue-formatter";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

function buildProject(
	variables: ReturnType<typeof VariableFactory.createMemoryBool>[],
) {
	const project = new Project("p", "imported", "");
	project.variables.push(
		...variables,
		VariableFactory.createLogicOutput("Q", "q"),
	);
	setMainSections(project, [section("s", "", no("M"), coil("Q"))]);
	return project;
}

describe("variables of an imported project", () => {
	beforeEach(() => VariableFactory.reset());

	it("reports a duplicated mnemonic as such, not as a misleading type error", () => {
		const project = buildProject([
			VariableFactory.createMemoryBool("M", "a"),
			VariableFactory.createMemoryInt("M", "b"),
		]);

		const { analysis } = compilePipelineDetailed(project);

		expect(analysis.issues.map((i) => i.code)).toContain(
			"PROJECT_VARIABLE_MNEMONIC_DUPLICATE",
		);
		const duplicate = analysis.issues.find(
			(i) => i.code === "PROJECT_VARIABLE_MNEMONIC_DUPLICATE",
		)!;
		expect(formatAnalysisIssue(duplicate)).toContain(
			"« M » est déclarée 2 fois",
		);
	});

	it("reports a variable edited outside the interface, with the reason", () => {
		const bad = VariableFactory.createMemoryBool("M", "a");
		bad.mnemonic = "M M";
		const project = buildProject([bad]);

		const { analysis } = compilePipelineDetailed(project);
		const invalid = analysis.issues.find(
			(i) => i.code === "PROJECT_VARIABLE_INVALID",
		)!;

		expect(invalid.severity).toBe("error");
		expect(formatAnalysisIssue(invalid)).toBe(
			"La variable « M M » est invalide : Le mnémonique ne peut contenir que des lettres, chiffres et underscores.",
		);
	});

	it("does not throw on a variable with an unknown zone", () => {
		const bad: any = VariableFactory.createMemoryBool("M", "a");
		bad.zone = "output";
		const project = buildProject([bad]);

		expect(() => compilePipelineDetailed(project)).not.toThrow();
		expect(
			compilePipelineDetailed(project).analysis.issues.map((i) => i.code),
		).toContain("PROJECT_VARIABLE_INVALID");
	});
});
