import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compileToPLC, getVariableValue } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

/**
 * Une variable INT accumulée sans garde finit par dépasser 32767 : le simulateur doit alors
 * replier la valeur (comportement d'un automate réel), pas la laisser croître indéfiniment.
 */
describe("Débordement INT en simulation", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("replie un accumulateur INT au lieu de le laisser dépasser 32767", async () => {
		const counter = VariableFactory.createMemoryInt("Counter");
		const grafcet = GrafcetFactory.createNumericActionCycle(
			"grafcet-overflow",
			"Counter := Counter + 10000",
			ActionExecutionMode.CONTINUOUS,
		);
		const project = ProjectFactory.create(
			[counter],
			[grafcet],
			"INT overflow",
		);

		let cycleError: Error | null = null;
		const plc = compileToPLC(project, 10, Dialect.FR, {
			onCycleError: (e) => {
				cycleError = e;
			},
		});
		expect(plc).not.toBeNull();

		plc!.start();
		await jest.advanceTimersByTimeAsync(500);
		plc!.stop();
		if (cycleError) throw cycleError;

		const value = getVariableValue(plc!, "Counter") as number;
		expect(value).toBeGreaterThanOrEqual(-32768);
		expect(value).toBeLessThanOrEqual(32767);
	});
});
