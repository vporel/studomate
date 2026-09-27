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

	it("places the closing bend of a shorter branch clear of the longer branch's last element", () => {
		// Branche longue : [a, b] (2 éléments) ; branche courte : [c] (1 élément) — reproduit le cas
		// d'une auto-maintien (contact court en parallèle d'un groupe contact+condition) où le coude
		// par défaut de l'éditeur peut tomber pile sur le bord de `b` faute de connaître les éléments
		// intercalés (voir la section "Auto-maintien" des templates naïfs).
		const s = section(
			"n",
			"",
			or([no("a"), no("b")], [no("c")]),
			nf("r"),
			coil("q"),
		);
		const findByVariable = (name: string) =>
			s.elements.find((e) => "data" in e && (e as any).data.variable === name)!;
		const contactB = findByVariable("b");
		const contactC = findByVariable("c");
		const nfR = findByVariable("r");
		const closingConnection = s.connections.find(
			(c) => c.source.id === contactC.id && c.target.id === nfR.id,
		)!;
		expect(closingConnection).toBeDefined();

		const bendCol = closingConnection.data.points[0][1];
		const bColRightEdge = (contactB.position.col + 1) * 4; // bord droit de `b`, quarts de colonne
		const rColLeftEdge = nfR.position.col * 4; // bord gauche de `r`, quarts de colonne
		expect(bendCol).toBeGreaterThan(bColRightEdge);
		expect(bendCol).toBeLessThan(rColLeftEdge);
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
