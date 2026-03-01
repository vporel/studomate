import PLCRoutine from "./plc-routine";
import PLCVariable, { PLCVariableValue } from "./plc-variable";

type PLCCallback = (plc: PLC) => void | undefined;

export default class PLC {
	private inputImage: Record<string, PLCVariable> = {};
	private outputImage: Record<string, PLCVariable> = {};
	private physicalInputs: Record<string, PLCVariable> = {};
	private physicalOutputs: Record<string, PLCVariable> = {};
	private memory: Record<string, PLCVariable> = {};
	private scanTimeMs: number;
	private cycleTimer: NodeJS.Timeout | null = null;
	private program: PLCRoutine[];
	private onPLCStart: PLCCallback = () => {};
	private onPLCStop: PLCCallback = () => {};
	private onCycleStart: PLCCallback = () => {};
	private onCycleEnd: PLCCallback = () => {};
	private onCycleError: (error: Error) => void = () => {};

	constructor(config: {
		scanTimeMs: number;
		program: PLCRoutine[];
		variables: PLCVariable[];
		onPLCStart?: PLCCallback;
		onPLCStop?: PLCCallback;
		onCycleStart?: PLCCallback;
		onCycleEnd?: PLCCallback;
		onCycleError?: (error: Error) => void;
	}) {
		this.scanTimeMs = config.scanTimeMs;
		this.program = config.program;
		if (config.onPLCStart) this.onPLCStart = config.onPLCStart;
		if (config.onPLCStop) this.onPLCStop = config.onPLCStop;
		if (config.onCycleStart) this.onCycleStart = config.onCycleStart;
		if (config.onCycleEnd) this.onCycleEnd = config.onCycleEnd;
		if (config.onCycleError) this.onCycleError = config.onCycleError;
		config.variables.forEach((variable) => {
			const variableCopy = variable.copy();
			if (variable.getScope() === "input") {
				this.physicalInputs[variableCopy.getId()] = variableCopy;
			} else if (variable.getScope() === "output") {
				this.physicalOutputs[variableCopy.getId()] = variableCopy.copy();
				//Initialize output image with initial variable values
				this.outputImage[variableCopy.getId()] = variableCopy;
			} else if (variable.getScope() === "memory") {
				this.memory[variableCopy.getId()] = variableCopy;
			}
		});
	}

	/**
	 * Returns read-only copies of all variables (input image, output image, memory).
	 * Callers cannot mutate PLC state through these copies.
	 */
	public getVariablesSnapshot(): readonly PLCVariable[] {
		return [
			...Object.values(this.inputImage),
			...Object.values(this.outputImage),
			...Object.values(this.memory),
		].map((v) => v.copy());
	}

	public setOutputImageValueById(id: string, value: PLCVariableValue): void {
		const variable = this.getOutputImageVariableById(id);
		variable.setValue(value);
	}

	private getOutputImageVariableById(id: string): PLCVariable {
		const variable = this.outputImage[id];
		if (!variable) throw new Error(`No output variable found with id ${id}`);
		return variable;
	}

	public setMemoryValueById(id: string, value: PLCVariableValue): void {
		const variable = this.getMemoryVariableById(id);
		variable.setValue(value);
	}

	private getMemoryVariableById(id: string): PLCVariable {
		const variable = this.memory[id];
		if (!variable) throw new Error(`No memory variable found with id ${id}`);
		return variable;
	}

	public setPhysicalInputValueById(id: string, value: PLCVariableValue): void {
		const input = this.getPhysicalInputById(id);
		input.setValue(value);
	}

	public setPhysicalInputValueByName(name: string, value: PLCVariableValue): void {
		const input = this.getPhysicalInputByName(name);
		input.setValue(value);
	}

	private getPhysicalInputById(id: string): PLCVariable {
		const input = this.physicalInputs[id];
		if (!input) throw new Error(`No input found with id ${id}`);
		return input;
	}

	private getPhysicalInputByName(name: string): PLCVariable {
		const input = Object.values(this.physicalInputs).find((i) => i.getName() === name);
		if (!input) throw new Error(`No input found with name ${name}`);
		return input;
	}

	//Scan cycle
	private scan(): void {
		this.executeCallback(this.onCycleStart, "Error in onCycleStart callback:");
		try {
			this.readInputs();
			this.executeProgram();
			this.writeOutputs();
			this.internalTasks();
		} catch (e) {
			this.stop();
			console.error("Error during PLC cycle execution:", e);
			this.executeCallback(() => this.onCycleError?.(e as Error), "Error in onCycleError callback:");
			return;
		}
		this.executeCallback(this.onCycleEnd, "Error in onCycleEnd callback:");
	}

	private readInputs(): void {
		Object.entries(this.physicalInputs).forEach(([id, v]) => {
			this.inputImage[id] = v.copy();
		});
	}

	private executeProgram(): void {
		this.program.forEach((routine) => routine.execute(this));
	}

	private writeOutputs(): void {
		Object.entries(this.outputImage).forEach(([id, v]) => {
			this.physicalOutputs[id] = v.copy();
		});
	}
	private internalTasks(): void {}

	// Exécution
	public start(): void {
		if (!this.cycleTimer) {
			if (this.onPLCStart) this.onPLCStart(this);
			this.cycleTimer = setInterval(() => this.scan(), this.scanTimeMs);
		}
	}
	public stop(): void {
		if (this.cycleTimer) {
			clearInterval(this.cycleTimer);
			this.cycleTimer = null;
			if (this.onPLCStop) this.onPLCStop(this);
		}
	}

	private executeCallback(callback?: PLCCallback, messageOnError?: string): void {
		try {
			if (callback) callback(this);
		} catch (e) {
			console.error(messageOnError || "Error during PLC callback execution:", e);
		}
	}
}
