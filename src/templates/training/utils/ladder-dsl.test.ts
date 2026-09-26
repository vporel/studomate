import PlcScenario from "@tests/utils/plc-scenario";
import Project from "@/schemas/project/project.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import {
	callProgramsFromMain,
	coil,
	section,
	nf,
	no,
	or,
	buildLadder,
	setMainSections,
	setCoil,
} from "./ladder-dsl";

function projectWithVariables(): Project {
	const project = new Project("p", "test", "");
	project.variables.push(
		VariableBuilder.buildLogicInput("1", "a"),
		VariableBuilder.buildLogicInput("2", "b"),
		VariableBuilder.buildLogicOutput("3", "q"),
		VariableBuilder.buildLogicOutput("4", "r"),
	);
	return project;
}

describe("ladder-dsl", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("wires contacts in series (AND) and branches in parallel (OR)", async () => {
		const project = projectWithVariables();
		setMainSections(project, [
			section("n", "", or([no("a")], [no("b")]), nf("r"), coil("q")),
		]);
		expect(
			compilePipelineDetailed(project).analysis.issues.filter(
				(i) => i.severity === "error",
			),
		).toHaveLength(0);

		const scenario = new PlcScenario(project);
		await scenario.cycles();
		expect(scenario.get("q")).toBe(false);
		scenario.set("b", true);
		await scenario.cycles();
		expect(scenario.get("q")).toBe(true);
		scenario.stop();
	});

	it("fans out to several coils when nothing follows a parallel group", async () => {
		const project = projectWithVariables();
		setMainSections(project, [
			section("n", "", no("a"), or([coil("q")], [setCoil("r")])),
		]);
		const scenario = new PlcScenario(project);
		scenario.set("a", true);
		await scenario.cycles();
		expect(scenario.get("q")).toBe(true);
		expect(scenario.get("r")).toBe(true);
		scenario.stop();
	});

	it("rejects an empty parallel branch", () => {
		expect(() => section("n", "", no("a"), or([], [coil("q")]))).toThrow();
	});

	it("makes the Main call each program in order", () => {
		const project = projectWithVariables();
		const sub = project.createLadder("Sub");
		sub.sections = [section("n", "", no("a"), coil("q"))];
		callProgramsFromMain(project, [sub]);
		expect(project.main.sections).toHaveLength(1);
		const analysis = compilePipelineDetailed(project).analysis;
		expect(analysis.issues.filter((i) => i.severity === "error")).toHaveLength(0);
		expect(buildLadder("x", [section("n", "", coil("q"))]).sections).toHaveLength(1);
	});
});
