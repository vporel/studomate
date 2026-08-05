import ClockedRunnable from "../clocked-runnable";
import { RunnableCallback } from "../runnable";
import PLCRoutine from "./plc-routine";
import PLCVariable, { PLCVariableValue } from "./plc-variable";

export default class PLC extends ClockedRunnable {
	private inputImage: Record<string, PLCVariable> = {};
	private outputImage: Record<string, PLCVariable> = {};
	private physicalInputs: Record<string, PLCVariable> = {};
	private physicalOutputs: Record<string, PLCVariable> = {};
	private memory: Record<string, PLCVariable> = {};
	private program: PLCRoutine[];
	private onCycleStart: RunnableCallback<PLC> = () => {};
	private onCycleEnd: RunnableCallback<PLC> = () => {};
	private onCycleError: (error: Error) => void = () => {};

	constructor(config: {
		scanTimeMs: number;
		program: PLCRoutine[];
		variables: PLCVariable[];
		onPLCStart?: RunnableCallback<PLC>;
		onPLCStop?: RunnableCallback<PLC>;
		onCycleStart?: RunnableCallback<PLC>;
		onCycleEnd?: RunnableCallback<PLC>;
		onCycleError?: (error: Error) => void;
	}) {
		super(config.scanTimeMs);
		this.program = config.program;
		if (config.onPLCStart) this.onStart = config.onPLCStart;
		if (config.onPLCStop) this.onStop = config.onPLCStop;
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

	//Cycle
	protected tick(): void {
		this.executeCallback(this.onCycleStart, "Error in onCycleStart callback:");
		try {
			this.readInputs();
			this.executeProgram();
			this.writeOutputs();
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
}
