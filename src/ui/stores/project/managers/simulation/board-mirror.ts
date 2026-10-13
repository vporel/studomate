import type { CompiledProject } from "@/project-compiler/project.compiler";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import PlcVariablesMapper from "@/simulator/environment-plc.mapper";
import { Environment } from "@/simulator/interpreter/environment/environment";

/**
 * Turns the variable values a running board reports into what the interface shows of a
 * simulation. The board runs the program itself; this only replays the part the program does not
 * embed: the observation routine, which evaluates each transition's receptivity (pure
 * expressions) and reads the elapsed time of the timers, from the values the board reported.
 */
export default class BoardMirror {
	private readonly environment: Environment;
	private readonly variablesByName: Map<string, PLCVariable>;
	private readonly variablesById: Map<string, PLCVariable>;
	private readonly observationRoutines: CompiledProject["routines"];
	private readonly observationVariableIds: Set<string>;

	constructor(private readonly compiled: CompiledProject) {
		this.variablesByName = new Map(
			compiled.variables.map((variable) => [variable.getName(), variable]),
		);
		this.variablesById = new Map(
			compiled.variables.map((variable) => [variable.getId(), variable]),
		);
		this.environment = new Environment(
			compiled.variables.map(PlcVariablesMapper.plcToEnv),
		);
		this.observationRoutines = compiled.routines.slice(
			compiled.scanRoutineCount,
		);
		this.observationVariableIds = new Set(
			Object.values(compiled.observableExpressionVariableIds).flatMap((refs) =>
				refs.map((ref) => ref.variableId),
			),
		);
	}

	/** Name of the variable with this id, `undefined` for an id the project does not know. */
	nameOf(variableId: string): string | undefined {
		return this.variablesById.get(variableId)?.getName();
	}

	/**
	 * Variables of the project with the value the board reported for them, plus the observed
	 * values worked out from these. A variable the program does not use is not in the image, so it
	 * has no value to show and is left out.
	 */
	snapshot(values: Record<string, boolean | number>): PLCVariable[] {
		const reported: PLCVariable[] = [];
		for (const [name, value] of Object.entries(values)) {
			const variable = this.variablesByName.get(name);
			if (!variable) continue;
			this.environment.hydrateVariableValue(variable.getId(), value);
			reported.push(this.withValue(variable, value));
		}
		for (const routine of this.observationRoutines) {
			routine.execute(this.environment, 0, this.compiled.routinesById);
		}
		const observed = this.compiled.variables
			.filter((variable) => this.observationVariableIds.has(variable.getId()))
			.map((variable) =>
				this.withValue(
					variable,
					this.environment.getVariableValueById(variable.getId()),
				),
			);
		return [...reported, ...observed];
	}

	private withValue(
		variable: PLCVariable,
		value: boolean | number | string,
	): PLCVariable {
		const copy = variable.copy();
		copy.setValue(value);
		return copy;
	}
}
