import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compileToPLC, getVariableValue } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

/**
 * Cyclic sequence X0 -> X1 -> X2 -> X3 -> X0. Only the transitions X1 -> X2 and X2 -> X3
 * are receptive.
 */
function createSequence(reverseTransitions: boolean): Grafcet {
	const id = "g";
	const steps = [0, 1, 2, 3].map((n) =>
		new StepBuilder()
			.id(`${id}-step-${n}`)
			.number(n)
			.initial(n === 0)
			.position(100, 100 + n * 100)
			.build(),
	);
	const receptive = [false, true, true, false];
	const transitions = [0, 1, 2, 3].map((n) =>
		new TransitionBuilder()
			.id(`${id}-trans-${n}`)
			.expression(receptive[n] ? "VRAI" : "FAUX")
			.position(100, 150 + n * 100)
			.build(),
	);
	const connections = [0, 1, 2, 3].flatMap((n) => [
		new ConnectionBuilder()
			.id(`${id}-in-${n}`)
			.source("step", `${id}-step-${n}`, "source:successor")
			.target("transition", `${id}-trans-${n}`, "target:predecessor")
			.build(),
		new ConnectionBuilder()
			.id(`${id}-out-${n}`)
			.source("transition", `${id}-trans-${n}`, "source:successor")
			.target("step", `${id}-step-${(n + 1) % 4}`, "target:predecessor")
			.build(),
	]);
	return new GrafcetBuilder()
		.id(id)
		.name("Two tokens")
		.addSteps(...steps)
		.addTransitions(
			...(reverseTransitions ? [...transitions].reverse() : transitions),
		)
		.addConnections(...connections)
		.build();
}

describe("Priority activation: a step deactivated and activated in the same cycle stays active", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it.each([
		["transitions in sequence order", false],
		["transitions in reverse order", true],
	])("moves both tokens in one cycle (%s)", async (_label, reverse) => {
		const project = ProjectFactory.create(
			[],
			[createSequence(reverse)],
			"Two tokens",
		);
		const plc = compileToPLC(project);
		expect(plc).not.toBeNull();

		const idOf = (name: string) =>
			plc!
				.getVariablesSnapshot()
				.find((v) => v.getName() === name)!
				.getId();
		plc!.setMemoryValueById(idOf("X1"), true);
		plc!.setMemoryValueById(idOf("X2"), true);

		// The first scan only establishes the state: the tokens move during the second cycle
		plc!.start();
		await jest.advanceTimersByTimeAsync(200);
		plc!.stop();

		expect(getVariableValue(plc!, "X0")).toBe(false);
		expect(getVariableValue(plc!, "X1")).toBe(false);
		expect(getVariableValue(plc!, "X2")).toBe(true);
		expect(getVariableValue(plc!, "X3")).toBe(true);
	});
});
