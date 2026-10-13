import Project from "@/schemas/project/project.schema";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import Scene3dSimulationBridge, {
	Scene3dStateSnapshot,
} from "./scene3d-simulation.bridge";

const T1_MS = 516 / 0.06;

function createHarness(bindings: Record<string, string> | null) {
	const project = new Project("p1", "Projet", "auteur");
	if (bindings) project.scene3d = { sceneId: "carton-sorting", bindings };
	const applied: Map<string, boolean | number>[] = [];
	const bridge = new Scene3dSimulationBridge({
		getProject: () => project,
		applyExternalInputs: (values) => applied.push(new Map(values)),
	});
	return { project, bridge, applied };
}

function actuators(values: Record<string, boolean>): PLCVariable[] {
	return Object.entries(values).map(([id, value]) => {
		const variable = new PLCVariable(id, id, "output", "boolean");
		variable.setValue(value);
		return variable;
	});
}

const BINDINGS = {
	t1: "v-t1",
	p1Out: "v-p1out",
	cartonAtStation: "v-station",
	p1AtIn: "v-p1in",
	p1AtOut: "v-p1outsw",
};

describe("Scene3dSimulationBridge", () => {
	it("does nothing without a scene", () => {
		const { bridge, applied } = createHarness(null);
		bridge.onSimulationStart();
		bridge.onCycleEnd([], 100);
		expect(applied).toEqual([]);
		expect(bridge.drives("v-station")).toBe(false);
	});

	it("applies the initial sensors before the first cycle", () => {
		const { bridge, applied } = createHarness(BINDINGS);
		bridge.onSimulationStart();
		expect(applied).toHaveLength(1);
		expect(applied[0].get("v-station")).toBe(false);
		expect(applied[0].get("v-p1in")).toBe(true);
		expect(applied[0].get("v-p1outsw")).toBe(false);
	});

	it("reports the bound sensors as driven inputs, not the actuators", () => {
		const { bridge } = createHarness(BINDINGS);
		bridge.onSimulationStart();
		expect(bridge.drives("v-station")).toBe(true);
		expect(bridge.drives("v-t1")).toBe(false);
		bridge.onSimulationStop();
		expect(bridge.drives("v-station")).toBe(false);
	});

	it("applies only the sensors that changed, from the bound actuators of the cycle", () => {
		const { bridge, applied } = createHarness(BINDINGS);
		bridge.onSimulationStart();
		bridge.queueInteraction({ type: "newCarton" });
		applied.length = 0;

		bridge.onCycleEnd(actuators({ "v-t1": true }), 100);
		expect(applied).toEqual([]);

		bridge.onCycleEnd(actuators({ "v-t1": true }), T1_MS);
		expect(applied).toHaveLength(1);
		expect([...applied[0]]).toEqual([["v-station", true]]);
	});

	it("ignores actuators that are not bound", () => {
		const { bridge, applied } = createHarness({
			cartonAtStation: "v-station",
		});
		bridge.onSimulationStart();
		bridge.queueInteraction({ type: "newCarton" });
		applied.length = 0;
		bridge.onCycleEnd(actuators({ "v-t1": true }), T1_MS + 100);
		expect(applied).toEqual([]);
	});

	it("ignores interactions queued outside a simulation", () => {
		const { bridge, applied } = createHarness(BINDINGS);
		bridge.queueInteraction({ type: "newCarton" });
		bridge.onSimulationStart();
		applied.length = 0;
		bridge.onCycleEnd(actuators({ "v-t1": true }), T1_MS + 100);
		expect(applied).toEqual([]);
	});

	it("applies queued interactions at the next cycle end only", () => {
		const { bridge } = createHarness(BINDINGS);
		bridge.onSimulationStart();
		const snapshots: Scene3dStateSnapshot[] = [];
		bridge.subscribe((snapshot) => snapshots.push(snapshot));

		bridge.queueInteraction({ type: "newCarton" });
		expect(snapshots).toEqual([]);
		bridge.onCycleEnd(actuators({ "v-t1": true }), 100);

		expect(snapshots).toHaveLength(1);
		expect(snapshots[0].state).toMatchObject({ cartonPresent: true });
	});

	it("publishes the state and the simulated time after each cycle", () => {
		const { bridge } = createHarness(BINDINGS);
		bridge.onSimulationStart();
		const snapshots: Scene3dStateSnapshot[] = [];
		bridge.subscribe((snapshot) => snapshots.push(snapshot));

		bridge.onCycleEnd([], 100);
		bridge.onCycleEnd([], 100);

		expect(snapshots.map((s) => s.simTimeMs)).toEqual([100, 200]);
		expect(snapshots[0].sceneId).toBe("carton-sorting");
	});

	it("stops publishing to an unsubscribed listener", () => {
		const { bridge } = createHarness(BINDINGS);
		bridge.onSimulationStart();
		const listener = jest.fn();
		const unsubscribe = bridge.subscribe(listener);
		unsubscribe();
		bridge.onCycleEnd([], 100);
		expect(listener).not.toHaveBeenCalled();
	});

	it("goes back to the initial state when the simulation stops", () => {
		const { bridge } = createHarness(BINDINGS);
		bridge.onSimulationStart();
		bridge.queueInteraction({ type: "newCarton" });
		bridge.onCycleEnd(actuators({ "v-t1": true }), T1_MS + 100);
		const snapshots: Scene3dStateSnapshot[] = [];
		bridge.subscribe((snapshot) => snapshots.push(snapshot));

		bridge.onSimulationStop();

		expect(snapshots).toHaveLength(1);
		expect(snapshots[0]).toMatchObject({
			simTimeMs: 0,
			state: { cartonPresent: false, cartonPos: 0 },
		});
	});

	it("ignores an unknown scene", () => {
		const { project, bridge, applied } = createHarness(BINDINGS);
		project.scene3d = { sceneId: "nope", bindings: BINDINGS };
		bridge.onSimulationStart();
		bridge.onCycleEnd([], 100);
		expect(applied).toEqual([]);
	});

	describe("status and snapshot", () => {
		it("reports running, paused and stopped in the published snapshots", () => {
			const { bridge } = createHarness(BINDINGS);
			const statuses: string[] = [];
			bridge.subscribe((snapshot) => statuses.push(snapshot.status));

			bridge.onSimulationStart();
			bridge.setPaused(true);
			bridge.setPaused(false);
			bridge.onSimulationStop();

			expect(statuses).toEqual(["running", "paused", "running", "stopped"]);
		});

		it("starts as paused when the simulation starts in step-by-step mode", () => {
			const { bridge } = createHarness(BINDINGS);
			bridge.onSimulationStart(true);
			expect(bridge.getSnapshot()?.status).toBe("paused");
		});

		it("ignores a pause change without a running scene", () => {
			const { bridge } = createHarness(BINDINGS);
			const listener = jest.fn();
			bridge.subscribe(listener);
			bridge.setPaused(true);
			expect(listener).not.toHaveBeenCalled();
		});

		it("gives the initial state of the model outside a simulation", () => {
			const { bridge } = createHarness(BINDINGS);
			expect(bridge.getSnapshot()).toMatchObject({
				sceneId: "carton-sorting",
				simTimeMs: 0,
				status: "stopped",
				state: { cartonPresent: false },
			});
		});

		it("gives the live state during a simulation", () => {
			const { bridge } = createHarness(BINDINGS);
			bridge.onSimulationStart();
			bridge.queueInteraction({ type: "newCarton" });
			bridge.onCycleEnd([], 100);
			expect(bridge.getSnapshot()).toMatchObject({
				simTimeMs: 100,
				status: "running",
				state: { cartonPresent: true },
			});
		});

		it("has no snapshot without a scene or with an unknown one", () => {
			const { project, bridge } = createHarness(null);
			expect(bridge.getSnapshot()).toBeNull();
			project.scene3d = { sceneId: "nope", bindings: {} };
			expect(bridge.getSnapshot()).toBeNull();
		});
	});
});
