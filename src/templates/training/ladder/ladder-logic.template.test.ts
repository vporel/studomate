import PlcScenario from "@tests/utils/plc-scenario";
import {
	createLadderLogicProject,
	createLadderLogicSolution,
} from "./ladder-logic.template";

describe("ladder-logic.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé ne fournit que les variables", () => {
		expect(createLadderLogicProject().main.sections[0].elements).toHaveLength(0);
	});

	it.each([
		[false, false, true, false],
		[true, false, true, true],
		[false, true, true, true],
		[true, true, true, false],
		[true, false, false, false],
	])("inter1=%s inter2=%s validation=%s : lampe=%s", async (i1, i2, validation, lampe) => {
		const scenario = new PlcScenario(createLadderLogicSolution());
		scenario.set("inter1", i1);
		scenario.set("inter2", i2);
		scenario.set("validation", validation);
		await scenario.cycles();
		expect(scenario.get("lampe")).toBe(lampe);
		scenario.stop();
	});
});
