import Project from "@/schemas/project/project.schema";
import { getInputRestValue } from "@/schemas/variable/input-behavior";
import PLC from "@/simulator/core/plc/plc";
import { compileToPLC, getVariableValue } from "@tests/utils/test-helpers";

/**
 * Drives a project's PLC one scan at a time with Jest fake timers (`jest.useFakeTimers()` must be
 * active in the calling test). `press`/`release` follow the input's physical behavior: pressing
 * a normally closed push button opens its contact.
 */
export default class PlcScenario {
	readonly plc: PLC;
	private readonly project: Project;
	private cycleError: Error | null = null;

	constructor(project: Project, private readonly scanMs: number = 100) {
		this.project = project;
		const plc = compileToPLC(project, scanMs, undefined, {
			onCycleError: (error) => {
				this.cycleError = error;
			},
		});
		if (!plc) throw new Error("Project does not compile");
		this.plc = plc;
		this.plc.start();
	}

	async cycles(count: number = 1): Promise<void> {
		await jest.advanceTimersByTimeAsync(this.scanMs * count);
		if (this.cycleError) throw this.cycleError;
	}

	async seconds(count: number): Promise<void> {
		await this.cycles(Math.round((count * 1000) / this.scanMs));
	}

	set(name: string, value: boolean | number): void {
		this.plc.setPhysicalInputValueByName(name, value);
	}

	async press(name: string, holdCycles: number = 0): Promise<void> {
		const behavior = this.project.variables.find(
			(variable) => variable.mnemonic === name,
		)?.behavior;
		const rest = getInputRestValue(behavior);
		this.set(name, typeof rest === "boolean" ? !rest : true);
		if (holdCycles > 0) await this.cycles(holdCycles);
	}

	release(name: string): void {
		const behavior = this.project.variables.find(
			(variable) => variable.mnemonic === name,
		)?.behavior;
		const rest = getInputRestValue(behavior);
		this.set(name, typeof rest === "boolean" ? rest : false);
	}

	/** Press for `holdCycles` scans, then release and let one more scan run. */
	async tap(name: string, holdCycles: number = 1): Promise<void> {
		await this.press(name, holdCycles);
		this.release(name);
		await this.cycles(1);
	}

	get(name: string): boolean | number | string {
		return getVariableValue(this.plc, name);
	}

	stop(): void {
		this.plc.stop();
	}
}
