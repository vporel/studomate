import PlcVariablesMapper from "@/simulator/environment-plc.mapper";
import { Environment } from "@/simulator/interpreter/environment/environment";
import ClockedRunnable from "../clocked-runnable";
import { RunnableCallback } from "../runnable";
import PLCRoutine from "./plc-routine";
import PLCVariable, { PLCVariableValue } from "./plc-variable";

export default class PLC extends ClockedRunnable {
	private inputImage: Record<string, PLCVariable> = {};
	private outputImage: Record<string, PLCVariable> = {};
	private physicalInputs: Record<string, PLCVariable> = {};
	/** Nom → id d'entrée physique. Construit une fois : l'ensemble des E/S est figé à la
	 * création du PLC, cet index n'a donc jamais à être invalidé. */
	private physicalInputIdsByName = new Map<string, string>();
	private physicalOutputs: Record<string, PLCVariable> = {};
	private memory: Record<string, PLCVariable> = {};
	/** Table de forçage : id de variable → valeur imposée, indépendante du scope. */
	private forcedVariables: Map<string, PLCVariableValue> = new Map();
	private program: PLCRoutine[];
	/**
	 * Registre de **toutes** les routines compilées, y compris celles jamais scannées
	 * directement (un ladder standard, appelé par un bloc `"user-program"` seulement). Ne peut
	 * pas être déduit de `program` : `program` ne contient que les routines de premier niveau
	 * (grafcets + Main), volontairement — un ladder appelé n'y figure jamais, donc il faut ce
	 * registre séparé pour que `PLCRoutine.execute` puisse le retrouver par `programId` au moment
	 * de l'appel. Voir `CompiledProject.routinesById`.
	 */
	private routinesById: Record<string, PLCRoutine>;
	private onCycleStart: RunnableCallback<PLC> = () => {};
	private onCycleEnd: RunnableCallback<PLC> = () => {};
	private onCycleError: (error: Error) => void = () => {};
	/**
	 * Environnement d'exécution construit **une seule fois** : ses `Map` id→var et name→var, et
	 * les `EnvVariable` qu'elles contiennent, sont réutilisées de cycle en cycle. Chaque cycle se
	 * contente d'y recopier les valeurs courantes des images puis de les relire.
	 */
	private readonly environment: Environment;

	constructor(config: {
		scanTimeMs: number;
		program: PLCRoutine[];
		routinesById?: Record<string, PLCRoutine>;
		variables: PLCVariable[];
		onPLCStart?: RunnableCallback<PLC>;
		onPLCStop?: RunnableCallback<PLC>;
		onCycleStart?: RunnableCallback<PLC>;
		onCycleEnd?: RunnableCallback<PLC>;
		onCycleError?: (error: Error) => void;
	}) {
		super(config.scanTimeMs);
		this.program = config.program;
		this.routinesById = config.routinesById ?? {};
		if (config.onPLCStart) this.onStart = config.onPLCStart;
		if (config.onPLCStop) this.onStop = config.onPLCStop;
		if (config.onCycleStart) this.onCycleStart = config.onCycleStart;
		if (config.onCycleEnd) this.onCycleEnd = config.onCycleEnd;
		if (config.onCycleError) this.onCycleError = config.onCycleError;
		config.variables.forEach((variable) => {
			const variableCopy = variable.copy();
			if (variable.getScope() === "input") {
				this.physicalInputs[variableCopy.getId()] = variableCopy;
				this.physicalInputIdsByName.set(variableCopy.getName(), variableCopy.getId());
				this.inputImage[variableCopy.getId()] = variableCopy.copy();
			} else if (variable.getScope() === "output") {
				this.physicalOutputs[variableCopy.getId()] = variableCopy.copy();
				//Initialize output image with initial variable values
				this.outputImage[variableCopy.getId()] = variableCopy;
			} else if (variable.getScope() === "memory") {
				this.memory[variableCopy.getId()] = variableCopy;
			}
		});

		this.environment = new Environment(
			[
				...Object.values(this.inputImage),
				...Object.values(this.outputImage),
				...Object.values(this.memory),
			].map(PlcVariablesMapper.plcToEnv),
		);
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
		const id = this.physicalInputIdsByName.get(name);
		const input = id !== undefined ? this.physicalInputs[id] : undefined;
		if (!input) throw new Error(`No input found with name ${name}`);
		return input;
	}

	public forceVariable(id: string, value: PLCVariableValue): void {
		this.forcedVariables.set(id, value);
	}

	public releaseVariable(id: string): void {
		this.forcedVariables.delete(id);
	}

	public releaseAllVariables(): void {
		this.forcedVariables.clear();
	}

	public getForcedVariables(): ReadonlyMap<string, PLCVariableValue> {
		return this.forcedVariables;
	}

	public stepOnce(): void {
		this.tickOnce();
	}

	//Cycle
	protected tick(): void {
		this.executeCallback(this.onCycleStart, "Error in onCycleStart callback:");
		try {
			this.applyForcedVariables();
			this.readInputs();
			this.executeProgram();
			this.writeOutputs();
		} catch (e) {
			this.stop();
			console.error("Error during PLC cycle execution:", e);
			this.executeCallback(
				() => this.onCycleError?.(e as Error),
				"Error in onCycleError callback:",
			);
			return;
		}
		this.executeCallback(this.onCycleEnd, "Error in onCycleEnd callback:");
	}

	private applyForcedVariables(): void {
		this.forcedVariables.forEach((value, id) => {
			if (this.physicalInputs[id]) {
				this.physicalInputs[id].setValue(value);
			} else if (this.outputImage[id]) {
				this.outputImage[id].setValue(value);
			} else if (this.memory[id]) {
				this.memory[id].setValue(value);
			}
		});
	}

	private readInputs(): void {
		Object.entries(this.physicalInputs).forEach(([id, v]) => {
			this.inputImage[id].setValue(v.getValue());
		});
	}

	private executeProgram(): void {
		this.environment.setForcedVariableIds(new Set(this.forcedVariables.keys()));
		for (const [id, v] of Object.entries(this.inputImage)) {
			this.environment.hydrateVariableValue(id, v.getValue());
		}
		for (const [id, v] of Object.entries(this.outputImage)) {
			this.environment.hydrateVariableValue(id, v.getValue());
		}
		for (const [id, v] of Object.entries(this.memory)) {
			this.environment.hydrateVariableValue(id, v.getValue());
		}

		const deltaTimeMs = this.consumeElapsedMs();

		for (const routine of this.program) {
			routine.execute(this.environment, deltaTimeMs, this.routinesById);
		}

		for (const id of Object.keys(this.outputImage)) {
			this.setOutputImageValueById(
				id,
				this.environment.getVariableValueById(id),
			);
		}
		for (const id of Object.keys(this.memory)) {
			this.setMemoryValueById(id, this.environment.getVariableValueById(id));
		}
	}

	private writeOutputs(): void {
		Object.entries(this.outputImage).forEach(([id, v]) => {
			this.physicalOutputs[id].setValue(v.getValue());
		});
	}
}
