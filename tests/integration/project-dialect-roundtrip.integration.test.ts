import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Project from "@/schemas/project/project.schema";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compileToPLC, expectVariableValue } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

/**
 * `Project.setDialect` traduit les mots-clés des expressions du schéma (voir
 * `keyword-translator`). Ce test verrouille le fait qu'un aller-retour FR→EN→FR au **niveau
 * projet** laisse tout le pipeline (parse → analyse → pré-compil → compil → simulation) vert
 * dans les deux dialectes et rend les expressions à l'identique.
 */
describe("Round-trip de dialecte au niveau projet", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	function grafcetExpressions(grafcet: Grafcet): string[] {
		return [
			...Object.values(grafcet.transitions).map((t) => t.data.expression),
			...Object.values(grafcet.actions).map((a) => a.data.expression),
		];
	}

	/** Franchit E0 → E1 quand `I0 ET I1`, puis maintient `Q0` (action continue) tant que E1 est active. */
	async function expectPipelineWorks(project: Project, dialect: Dialect) {
		let cycleError: Error | null = null;
		const plc = compileToPLC(project, 10, dialect, {
			onCycleError: (e) => (cycleError = e),
		});
		expect(plc).not.toBeNull();

		plc!.setPhysicalInputValueByName("I0", false);
		plc!.setPhysicalInputValueByName("I1", false);
		plc!.start();
		await jest.advanceTimersByTimeAsync(200);
		if (cycleError) throw cycleError;
		expectVariableValue(plc!, "X0", true);
		expectVariableValue(plc!, "Q0", false);

		plc!.setPhysicalInputValueByName("I0", true);
		plc!.setPhysicalInputValueByName("I1", true);
		await jest.advanceTimersByTimeAsync(200);
		if (cycleError) throw cycleError;
		expectVariableValue(plc!, "X1", true);
		expectVariableValue(plc!, "Q0", true);

		plc!.stop();
	}

	it("FR → EN → FR : pipeline vert dans les deux dialectes, expressions rendues à l'identique", async () => {
		const grafcet = GrafcetFactory.createCycleWithBooleanActions(
			"g",
			"",
			"Q0",
			"I0 ET I1",
			"NON I0",
			ActionExecutionMode.SET,
			ActionExecutionMode.CONTINUOUS,
		);
		const project = ProjectFactory.create(
			[
				VariableFactory.createLogicInput("I0"),
				VariableFactory.createLogicInput("I1"),
				VariableFactory.createLogicOutput("Q0"),
			],
			[grafcet],
		);
		const grafcetInProject = Object.values(project.grafcets)[0];
		const frExpressions = grafcetExpressions(grafcetInProject);
		expect(frExpressions).toEqual(
			expect.arrayContaining(["I0 ET I1", "NON I0"]),
		);

		// 1. FR
		expect(project.dialect).toBe(Dialect.FR);
		await expectPipelineWorks(project, Dialect.FR);

		// 2. FR → EN : mots-clés traduits, pipeline toujours vert
		project.setDialect(Dialect.EN);
		expect(project.dialect).toBe(Dialect.EN);
		const enExpressions = grafcetExpressions(grafcetInProject);
		expect(enExpressions).toEqual(
			expect.arrayContaining(["I0 AND I1", "NOT I0"]),
		);
		await expectPipelineWorks(project, Dialect.EN);

		// 3. EN → FR : retour à l'identique
		project.setDialect(Dialect.FR);
		expect(project.dialect).toBe(Dialect.FR);
		expect(grafcetExpressions(grafcetInProject)).toEqual(frExpressions);
		await expectPipelineWorks(project, Dialect.FR);
	});
});
