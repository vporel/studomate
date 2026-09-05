import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

describe("Variables système — pipeline", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("une réceptivité qui lit une base de temps compile sans erreur", () => {
		const q0 = VariableFactory.createLogicOutput("Q0");
		const grafcet = GrafcetFactory.createCycleWithBooleanActions(
			"grafcet-1",
			"",
			"Q0",
			"_SYS_TB_500ms",
			"NON _SYS_TB_500ms",
		);
		const project = ProjectFactory.create([q0], [grafcet], "Base de temps");

		const pipeline = compilePipelineDetailed(project);

		expect(pipeline.analysis.issues).toEqual([]);
		expect(pipeline.preCompilation.errors).toEqual([]);
		expect(pipeline.compilation.errors).toEqual([]);
		// Les variables système sont injectées dans le programme compilé.
		const names = pipeline.compilation.result!.variables.map((v) => v.getName());
		expect(names).toEqual(
			expect.arrayContaining([
				"_SYS_TB_100ms",
				"_SYS_TB_200ms",
				"_SYS_TB_500ms",
				"_SYS_TB_1s",
				"_SYS_TB_2s",
			]),
		);
	});

	it("une action qui affecte une base de temps est signalée à l'analyse", () => {
		const grafcet = GrafcetFactory.createNumericActionCycle(
			"grafcet-1",
			"_SYS_TB_200ms := VRAI",
			ActionExecutionMode.CONTINUOUS,
		);
		const project = ProjectFactory.create([], [grafcet], "Affectation système");

		const pipeline = compilePipelineDetailed(project);

		expect(pipeline.analysis.issues.length).toBeGreaterThan(0);
	});
});
