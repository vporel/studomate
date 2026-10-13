import { Dialect } from "@/expression-language/dialect.enum";
import type PLC from "@/simulator/core/plc/plc";
import Scene3dSimulationBridge from "@/ui/stores/project/managers/3d-scene/scene3d-simulation.bridge";
import { createCartonSortingSolution } from "@/templates/carton-sorting.template";
import { compileToPLC, getVariableValue } from "@tests/utils/test-helpers";

jest.setTimeout(30000);

/** Runs the solution of the carton sorting template with its 3D scene as plant model. */
function startStation(scanTimeMs = 10) {
	const project = createCartonSortingSolution();
	let plc: PLC | null = null;
	let cycleError: Error | null = null;
	const bridge = new Scene3dSimulationBridge({
		getProject: () => project,
		applyExternalInputs: (values) => {
			for (const [id, value] of values) {
				plc!.setPhysicalInputValueById(id, value);
			}
		},
	});
	plc = compileToPLC(project, scanTimeMs, Dialect.FR, {
		onCycleEnd: (instance) =>
			bridge.onCycleEnd(
				instance.getVariablesSnapshot(),
				instance.getLastCycleDeltaMs(),
			),
		onCycleError: (error) => (cycleError = error),
	})!;
	expect(plc).not.toBeNull();
	bridge.onSimulationStart();
	plc.setPhysicalInputValueByName("dcy", false);
	plc.start();

	const pulseDcy = async () => {
		plc!.setPhysicalInputValueByName("dcy", true);
		await jest.advanceTimersByTimeAsync(scanTimeMs * 2 + 20);
		plc!.setPhysicalInputValueByName("dcy", false);
		await jest.advanceTimersByTimeAsync(scanTimeMs + 10);
	};
	const stop = () => {
		plc!.stop();
		bridge.onSimulationStop();
	};
	return {
		plc: plc!,
		bridge,
		pulseDcy,
		stop,
		getError: () => cycleError,
	};
}

describe("carton sorting template with its 3D scene", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("sees the sensors of the plant at rest from the first scan", async () => {
		const { plc, stop } = startStation();
		await jest.advanceTimersByTimeAsync(50);
		expect(getVariableValue(plc, "cpt_p1_in")).toBe(true);
		expect(getVariableValue(plc, "cpt_p1_out")).toBe(false);
		expect(getVariableValue(plc, "cpt_psce_c")).toBe(false);
		stop();
	});

	it("sorts a low carton with P1 then P2 and counts it", async () => {
		const { plc, bridge, pulseDcy, stop, getError } = startStation();
		await jest.advanceTimersByTimeAsync(50);
		await pulseDcy();
		bridge.queueInteraction({ type: "newCarton" });

		await jest.advanceTimersByTimeAsync(45000);
		if (getError()) throw getError();

		expect(getVariableValue(plc, "C")).toBe(1);
		expect(getVariableValue(plc, "cpt_p2_in")).toBe(true);
		expect(getVariableValue(plc, "cpt_p1_in")).toBe(true);
		stop();
	});

	it("sorts a high carton with P1 then P3 and ejects it at P3's level", async () => {
		const { plc, bridge, pulseDcy, stop, getError } = startStation();
		const states: { cartonY: number; cartonXExtra: number }[] = [];
		bridge.subscribe((snapshot) =>
			states.push(snapshot.state as { cartonY: number; cartonXExtra: number }),
		);
		await jest.advanceTimersByTimeAsync(50);
		await pulseDcy();
		bridge.queueInteraction({ type: "setCartonHigh", high: true });
		bridge.queueInteraction({ type: "newCarton" });

		await jest.advanceTimersByTimeAsync(45000);
		if (getError()) throw getError();

		expect(getVariableValue(plc, "C")).toBe(1);
		expect(getVariableValue(plc, "cpt_p3_in")).toBe(true);
		const last = states[states.length - 1];
		expect(last.cartonY).toBe(276);
		expect(last.cartonXExtra).toBe(70);
		stop();
	});

	it("sorts a carton with a slower scan time too", async () => {
		const { plc, bridge, pulseDcy, stop, getError } = startStation(100);
		await jest.advanceTimersByTimeAsync(300);
		await pulseDcy();
		await jest.advanceTimersByTimeAsync(200);
		bridge.queueInteraction({ type: "newCarton" });

		await jest.advanceTimersByTimeAsync(45000);
		if (getError()) throw getError();

		expect(getVariableValue(plc, "C")).toBe(1);
		stop();
	});

	it("resets the cycle after two cartons", async () => {
		const { plc, bridge, pulseDcy, stop, getError } = startStation();
		await jest.advanceTimersByTimeAsync(50);
		await pulseDcy();
		bridge.queueInteraction({ type: "newCarton" });
		await jest.advanceTimersByTimeAsync(45000);

		bridge.queueInteraction({ type: "newCarton" });
		await jest.advanceTimersByTimeAsync(45000);
		if (getError()) throw getError();

		expect(getVariableValue(plc, "C")).toBe(0);
		expect(getVariableValue(plc, "Cmd_T2T3")).toBe(false);
		stop();
	});

	it("keeps both sorted cartons in the scene after two cartons", async () => {
		const { bridge, pulseDcy, stop, getError } = startStation();
		let last: { cartonXExtra: number; sortedCartons: unknown[] } | null = null;
		bridge.subscribe((snapshot) => (last = snapshot.state as typeof last));
		await jest.advanceTimersByTimeAsync(50);
		await pulseDcy();
		bridge.queueInteraction({ type: "newCarton" });
		await jest.advanceTimersByTimeAsync(45000);
		bridge.queueInteraction({ type: "newCarton" });
		await jest.advanceTimersByTimeAsync(45000);
		if (getError()) throw getError();

		expect(last!.cartonXExtra).toBe(70);
		expect(last!.sortedCartons).toHaveLength(1);
		stop();
	});

	it("ignores a carton requested while the previous one is being sorted", async () => {
		const { plc, bridge, pulseDcy, stop, getError } = startStation();
		await jest.advanceTimersByTimeAsync(50);
		await pulseDcy();
		bridge.queueInteraction({ type: "newCarton" });
		await jest.advanceTimersByTimeAsync(12000);
		bridge.queueInteraction({ type: "newCarton" });
		await jest.advanceTimersByTimeAsync(45000);
		if (getError()) throw getError();

		expect(getVariableValue(plc, "C")).toBe(1);
		expect(getVariableValue(plc, "cpt_p2_in")).toBe(true);
		stop();
	});

	it("does not move any carton while T1 is not commanded", async () => {
		const { plc, bridge, stop } = startStation();
		bridge.queueInteraction({ type: "newCarton" });
		await jest.advanceTimersByTimeAsync(20000);
		expect(getVariableValue(plc, "cpt_psce_c")).toBe(false);
		stop();
	});
});
