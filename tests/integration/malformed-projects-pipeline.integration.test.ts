import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { createCoilElement, createContactElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import { wireInSeries, wireLadderIntoMain } from "@tests/utils/ladder-factory";
import Project from "@/schemas/project/project.schema";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

/**
 * Verrouille l'invariant « Analyser completeness » : sur un projet malformé, l'analyse doit
 * remonter une issue `error` **et** le pipeline (pré-compilation + compilation) ne doit pas
 * lever plus loin — une erreur que seul le pré-compilateur ou le compilateur attraperait serait
 * un bug d'analyseur.
 */
describe("Projets malformés — analyse rouge, pas de crash aval", () => {
	beforeEach(() => {
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	function expectCaughtByAnalyser(project: Project, code: string | string[]) {
		const accepted = Array.isArray(code) ? code : [code];
		let pipeline: ReturnType<typeof compilePipelineDetailed>;
		expect(() => {
			pipeline = compilePipelineDetailed(project);
		}).not.toThrow();
		const errorCodes = pipeline!.analysis.issues
			.filter((i) => i.severity === "error")
			.map((i) => i.code);
		expect(errorCodes.some((c) => accepted.includes(c))).toBe(true);
	}

	/** Cycle 2 étapes valide, à casser ensuite. */
	function cycle(): Grafcet {
		return GrafcetFactory.createSimpleCycle("g", "VRAI", "VRAI");
	}

	it("grafcet sans étape initiale", () => {
		const grafcet = cycle();
		grafcet.steps["g-step-0"].data.initial = false;
		expectCaughtByAnalyser(ProjectFactory.createWithGrafcets([grafcet]), "GRAFCET_NO_INITIAL_STEP");
	});

	it("grafcet à étapes initiales multiples", () => {
		const grafcet = cycle();
		grafcet.steps["g-step-1"].data.initial = true;
		expectCaughtByAnalyser(ProjectFactory.createWithGrafcets([grafcet]), "GRAFCET_MULTIPLE_INITIAL_STEPS");
	});

	it("numéros d'étape dupliqués dans un grafcet", () => {
		const grafcet = cycle();
		grafcet.steps["g-step-1"].data.number = 0;
		expectCaughtByAnalyser(ProjectFactory.createWithGrafcets([grafcet]), "STEP_NUMBER_DUPLICATE");
	});

	it("étape en impasse (transition aval retirée)", () => {
		const grafcet = cycle();
		grafcet.connections = grafcet.connections.filter(
			(c) => !(c.source.id === "g-step-1" && c.target.id === "g-trans-1"),
		);
		expectCaughtByAnalyser(ProjectFactory.createWithGrafcets([grafcet]), "STEP_NO_SUCCESSOR");
	});

	it("étape inatteignable (aucun chemin depuis l'étape initiale)", () => {
		const grafcet = cycle();
		const orphan = new StepBuilder().id("g-step-2").number(2).initial(false).position(400, 400).build();
		grafcet.steps["g-step-2"] = orphan;
		expectCaughtByAnalyser(ProjectFactory.createWithGrafcets([grafcet]), [
			"GRAFCET_UNREACHABLE_STEPS",
			"STEP_NO_PREDECESSOR",
		]);
	});

	it("action numérique sur une variable booléenne", () => {
		const bool = VariableFactory.createMemoryBool("B");
		const grafcet = GrafcetFactory.createNumericActionCycle("g", "B := 1", ActionExecutionMode.CONTINUOUS);
		expectCaughtByAnalyser(ProjectFactory.create([bool], [grafcet]), [
			"ACTION_NUMERIC_TYPE_MISMATCH",
			"ACTION_INVALID_EXPRESSION",
		]);
	});

	it("action qui écrit une variable d'entrée", () => {
		const input = VariableFactory.createLogicInput("I0");
		const grafcet = GrafcetFactory.createCycleWithBooleanActions("g", "I0", "", "VRAI", "VRAI", ActionExecutionMode.SET);
		expectCaughtByAnalyser(ProjectFactory.create([input], [grafcet]), "ACTION_VARIABLE_IS_INPUT");
	});

	it("bobine Ladder pilotant une variable d'entrée", () => {
		const input = VariableFactory.createLogicInput("I0");
		const project = ProjectFactory.createWithVariables([input]);
		const ladder = project.createLadder("L");
		wireLadderIntoMain(project, ladder);
		const [section] = ladder.sections;
		const rail = createRailTerminalElement(0);
		const contact = createContactElement("I0", "NO", 0, 1);
		const coil = createCoilElement("I0", "normal", 0, 2);
		ladder.addElements(section.id, [rail, contact, coil]);
		ladder.addConnections(section.id, wireInSeries([rail, contact, coil]));
		expectCaughtByAnalyser(project, "LADDER_COIL_VARIABLE_IS_INPUT");
	});

	it("bobine Ladder pilotant une variable non booléenne", () => {
		const int = VariableFactory.createMemoryInt("N");
		const project = ProjectFactory.createWithVariables([int]);
		const ladder = project.createLadder("L");
		wireLadderIntoMain(project, ladder);
		const [section] = ladder.sections;
		const rail = createRailTerminalElement(0);
		const coil = createCoilElement("N", "normal", 0, 1);
		ladder.addElements(section.id, [rail, coil]);
		ladder.addConnections(section.id, wireInSeries([rail, coil]));
		expectCaughtByAnalyser(project, "LADDER_COIL_VARIABLE_NOT_BOOLEAN");
	});

	it("action qui affecte une variable système `_SYS_` en lecture seule", () => {
		const grafcet = GrafcetFactory.createNumericActionCycle("g", "_SYS_TB_200ms := VRAI", ActionExecutionMode.CONTINUOUS);
		let pipeline: ReturnType<typeof compilePipelineDetailed>;
		expect(() => {
			pipeline = compilePipelineDetailed(ProjectFactory.create([], [grafcet]));
		}).not.toThrow();
		expect(pipeline!.analysis.issues.filter((i) => i.severity === "error").length).toBeGreaterThan(0);
	});
});
