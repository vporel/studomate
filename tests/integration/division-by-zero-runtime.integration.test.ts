import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import SimulatorExceptionsMapper from "@/bridge/simulator-exceptions.mapper";
import { DivisionByZeroException } from "@/expression-language/interpreter/exceptions/division-by-zero.exception";
import { Dialect } from "@/expression-language/dialect.enum";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compileToPLC } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

/**
 * Une division `a / b` dont le diviseur ne devient nul que *pendant* la simulation n'est pas
 * repliée par le simplifieur (qui ne traite que les diviseurs constants) : elle lève à
 * l'exécution. Le cycle automate doit s'arrêter proprement et remonter une exception dont le
 * mapper sait tirer un message explicite — pas un crash muet.
 */
describe("Division par zéro dynamique en simulation", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("arrête le cycle sur une DivisionByZeroException au message explicite", async () => {
		const result = VariableFactory.createMemoryInt("Result");
		const divisor = VariableFactory.createMemoryInt("Divisor");
		const grafcet = GrafcetFactory.createNumericActionCycle(
			"grafcet-div-zero",
			"Result := 100 / Divisor",
			ActionExecutionMode.CONTINUOUS,
		);
		const project = ProjectFactory.create(
			[result, divisor],
			[grafcet],
			"Division dynamique",
		);

		let cycleError: Error | null = null;
		const plc = compileToPLC(project, 10, Dialect.FR, {
			onCycleError: (e) => {
				cycleError = e;
			},
		});
		expect(plc).not.toBeNull();

		plc!.start();
		await jest.advanceTimersByTimeAsync(200);
		plc!.stop();

		expect(cycleError).toBeInstanceOf(DivisionByZeroException);
		const message = SimulatorExceptionsMapper.getUserFriendlyMessage(
			cycleError,
			"fr",
		);
		expect(message).toContain("Division par zéro");
		expect(message).toContain("100 / 0");
	});
});
