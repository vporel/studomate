import SceneStepper from "@/3d-scenes/scene-stepper";
import type { ScenePointValues } from "@/3d-scenes/scene-model";
import { getSceneDescriptor, getSceneModel } from "@/3d-scenes/scene.registry";
import type Project from "@/schemas/project/project.schema";
import type PLCVariable from "@/simulator/core/plc/plc-variable";

export type Scene3dStatus = "stopped" | "running" | "paused";

export type Scene3dStateSnapshot = {
	sceneId: string;
	state: unknown;
	simTimeMs: number;
	status: Scene3dStatus;
};

export interface Scene3dBridgeHost {
	getProject(): Project | null;
	applyExternalInputs(values: ReadonlyMap<string, boolean | number>): void;
}

type ActiveScene = {
	sceneId: string;
	stepper: SceneStepper<unknown, unknown>;
	/** Variable id → sensor point id. */
	sensorByVariableId: Map<string, string>;
	/** Variable id → actuator point id (the last point bound to a variable wins). */
	actuatorPointByVariableId: Map<string, string>;
	lastSensors: Map<string, boolean | number>;
};

/**
 * Couples the 3D scene of the project to the simulation: the outputs of each PLC cycle drive
 * the physical model of the scene, whose sensors are written back as input variables.
 */
export default class Scene3dSimulationBridge {
	private active: ActiveScene | null = null;
	private status: Scene3dStatus = "stopped";
	private pendingInteractions: unknown[] = [];
	private readonly listeners = new Set<
		(snapshot: Scene3dStateSnapshot) => void
	>();

	constructor(private readonly host: Scene3dBridgeHost) {}

	/** Called by the transport to receive the model state after each change. */
	subscribe(listener: (snapshot: Scene3dStateSnapshot) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** Input variables driven by a sensor of the running scene. */
	drives(variableId: string): boolean {
		return this.active?.sensorByVariableId.has(variableId) ?? false;
	}

	/** Ids of the input variables driven by a sensor of the running scene. */
	drivenVariableIds(): string[] {
		return this.active ? [...this.active.sensorByVariableId.keys()] : [];
	}

	/**
	 * Starts from the initial state of the model and gives the PLC its sensors before its first
	 * cycle, so that the first scan sees the real situation.
	 */
	onSimulationStart(paused = false): void {
		this.active = this.createActiveScene();
		this.pendingInteractions = [];
		if (!this.active) return;
		this.status = paused ? "paused" : "running";
		const initial = new Map<string, boolean | number>();
		this.collectSensors(
			this.active,
			this.active.stepper.readSensors(),
			initial,
			true,
		);
		if (initial.size > 0) this.host.applyExternalInputs(initial);
		this.publish(this.active);
	}

	setPaused(paused: boolean): void {
		if (!this.active) return;
		this.status = paused ? "paused" : "running";
		this.publish(this.active);
	}

	/**
	 * Current state of the scene of the project: the running one during a simulation, the initial
	 * state of its model otherwise. `null` when the project has no known scene.
	 */
	getSnapshot(): Scene3dStateSnapshot | null {
		if (this.active) return this.snapshotOf(this.active);
		const scene = this.host.getProject()?.scene3d;
		const model = scene ? getSceneModel(scene.sceneId) : undefined;
		if (!scene || !model) return null;
		return {
			sceneId: scene.sceneId,
			state: model.createState(),
			simTimeMs: 0,
			status: "stopped",
		};
	}

	/** Interactions are applied at the next cycle end, never between two cycles. */
	queueInteraction(interaction: unknown): void {
		if (!this.active) return;
		this.pendingInteractions.push(interaction);
	}

	onCycleEnd(snapshot: readonly PLCVariable[], deltaTimeMs: number): void {
		const active = this.active;
		if (!active) return;
		for (const interaction of this.pendingInteractions) {
			active.stepper.applyInteraction(interaction);
		}
		this.pendingInteractions = [];

		const sensors = active.stepper.advance(
			deltaTimeMs,
			this.readActuators(active, snapshot),
		);
		const changed = new Map<string, boolean | number>();
		this.collectSensors(active, sensors, changed, false);
		if (changed.size > 0) this.host.applyExternalInputs(changed);
		this.publish(active);
	}

	/** The next simulation restarts from the initial state of the model. */
	onSimulationStop(): void {
		const previous = this.active;
		this.active = null;
		this.status = "stopped";
		this.pendingInteractions = [];
		if (!previous) return;
		previous.stepper.reset();
		this.publish(previous);
	}

	private createActiveScene(): ActiveScene | null {
		const scene = this.host.getProject()?.scene3d;
		if (!scene) return null;
		const descriptor = getSceneDescriptor(scene.sceneId);
		const model = getSceneModel(scene.sceneId);
		if (!descriptor || !model) return null;

		const sensorByVariableId = new Map<string, string>();
		const actuatorPointByVariableId = new Map<string, string>();
		for (const point of descriptor.points) {
			const variableId = scene.bindings[point.id];
			if (!variableId) continue;
			if (point.kind === "sensor") {
				sensorByVariableId.set(variableId, point.id);
			} else {
				actuatorPointByVariableId.set(variableId, point.id);
			}
		}
		return {
			sceneId: scene.sceneId,
			stepper: new SceneStepper(model),
			sensorByVariableId,
			actuatorPointByVariableId,
			lastSensors: new Map(),
		};
	}

	private readActuators(
		active: ActiveScene,
		snapshot: readonly PLCVariable[],
	): ScenePointValues {
		const actuators: ScenePointValues = {};
		for (const variable of snapshot) {
			const pointId = active.actuatorPointByVariableId.get(variable.getId());
			if (pointId === undefined) continue;
			const value = variable.getValue();
			if (typeof value === "boolean" || typeof value === "number") {
				actuators[pointId] = value;
			}
		}
		return actuators;
	}

	/** Adds to `into` the sensors whose value differs from the last one written (all when `force`). */
	private collectSensors(
		active: ActiveScene,
		sensors: ScenePointValues,
		into: Map<string, boolean | number>,
		force: boolean,
	): void {
		for (const [variableId, pointId] of active.sensorByVariableId) {
			const value = sensors[pointId];
			if (value === undefined) continue;
			if (!force && active.lastSensors.get(variableId) === value) continue;
			active.lastSensors.set(variableId, value);
			into.set(variableId, value);
		}
	}

	private snapshotOf(active: ActiveScene): Scene3dStateSnapshot {
		return {
			sceneId: active.sceneId,
			state: active.stepper.getState(),
			simTimeMs: active.stepper.getSimTimeMs(),
			status: this.status,
		};
	}

	private publish(active: ActiveScene): void {
		const snapshot = this.snapshotOf(active);
		this.listeners.forEach((listener) => listener(snapshot));
	}
}
