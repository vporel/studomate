import generateBytecode from "@/bytecode/bytecode.generator";
import PLC from "@/simulator/core/plc/plc";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import { PROJECT_TEMPLATES } from "@/templates";
import { compileProject } from "@tests/utils/test-helpers";
import BoardMirror from "./board-mirror";

jest.useFakeTimers();

function solutionOf(id: string) {
	return PROJECT_TEMPLATES.find((template) => template.id === id)!.solution!();
}

/**
 * Runs the simulator, hands the mirror the values a board would report (the variables of the
 * image), and checks that the mirror works out the observed values the simulator publishes itself.
 */
function compareObservations(id: string, cycles: number) {
	const compiled = compileProject(solutionOf(id))!;
	const image = generateBytecode({
		compiled,
		ioBindings: [],
		cyclePeriodMs: 100,
	});
	const mirror = new BoardMirror(compiled);
	const observationIds = new Set(
		Object.values(compiled.observableExpressionVariableIds).flatMap((refs) =>
			refs.map((ref) => ref.variableId),
		),
	);
	const plc = new PLC({
		scanTimeMs: 100,
		program: compiled.routines,
		routinesById: compiled.routinesById,
		variables: compiled.variables,
	});
	const inputs = compiled.variables.filter(
		(variable) => variable.getScope() === "input",
	);
	let state = 1;
	const random = () =>
		(state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;

	plc.start();
	plc.pause();
	let compared = 0;
	let observedTrue = 0;
	for (let cycle = 0; cycle < cycles; cycle++) {
		for (const input of inputs) {
			if (random() < 0.2) {
				plc.setPhysicalInputValueByName(
					input.getName(),
					input.getType() === "boolean"
						? random() < 0.5
						: Math.floor(random() * 100),
				);
			}
		}
		if (cycle === 0) {
			plc.stepOnce();
			plc.resume();
		} else {
			jest.advanceTimersByTime(100);
		}
		const simulated = new Map(
			plc
				.getVariablesSnapshot()
				.map((variable) => [variable.getId(), variable]),
		);
		const byName = new Map(
			[...simulated.values()].map((variable) => [variable.getName(), variable]),
		);
		const values = Object.fromEntries(
			image.layout.variables.map(({ name }) => [
				name,
				byName.get(name)!.getValue(),
			]),
		) as Record<string, boolean | number>;

		const mirrored = new Map(
			mirror.snapshot(values).map((variable) => [variable.getId(), variable]),
		);
		for (const observationId of observationIds) {
			expect(mirrored.get(observationId)?.getValue()).toBe(
				simulated.get(observationId)!.getValue(),
			);
			compared++;
			if (simulated.get(observationId)!.getValue() === true) observedTrue++;
		}
	}
	plc.stop();
	return { compared, observedTrue, observationCount: observationIds.size };
}

describe("BoardMirror", () => {
	it.each(["traffic-light", "crossroads", "drilling", "elevator"])(
		"works out the observed values of %s as the simulator does",
		(id) => {
			const { compared, observedTrue, observationCount } = compareObservations(
				id,
				200,
			);
			expect(observationCount).toBeGreaterThan(0);
			expect(compared).toBeGreaterThan(0);
			// The comparison is meaningful: receptivities are true at times.
			expect(observedTrue).toBeGreaterThan(0);
		},
	);

	it("leaves out the variables the board did not report", () => {
		const compiled = compileProject(solutionOf("traffic-light"))!;
		const mirror = new BoardMirror(compiled);
		const names = compiled.variables
			.filter((variable) => !variable.getName().startsWith("_"))
			.map((variable) => variable.getName());
		const reported = names[0];
		const type = compiled.variables
			.find((variable) => variable.getName() === reported)!
			.getType();

		const snapshot = mirror.snapshot({
			[reported]: type === "boolean" ? true : 3,
		});

		expect(snapshot.map((variable) => variable.getName())).toContain(reported);
		const others = snapshot.filter(
			(variable) =>
				variable.getName() !== reported &&
				!Object.values(compiled.observableExpressionVariableIds)
					.flat()
					.some((ref) => ref.variableId === variable.getId()),
		);
		expect(others).toEqual([]);
	});

	it("ignores a reported name the project does not know", () => {
		const compiled = compileProject(solutionOf("traffic-light"))!;
		const mirror = new BoardMirror(compiled);
		expect(() => mirror.snapshot({ unknown: true })).not.toThrow();
	});

	it("keeps the declared value of a constant the board reports", () => {
		const compiled = compileProject(solutionOf("traffic-light"))!;
		compiled.variables.push(
			new PLCVariable("k", "K", "memory", "number", null, "INT", true, 8),
		);
		const mirror = new BoardMirror(compiled);

		const snapshot = mirror.snapshot({ K: 0 });

		const constant = snapshot.find((variable) => variable.getName() === "K")!;
		expect(constant.getValue()).toBe(8);
		expect(constant.isConstant()).toBe(true);
	});
});
