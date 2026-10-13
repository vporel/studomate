import generateBytecode from "@/bytecode/bytecode.generator";
import type { CompiledProject } from "@/project-compiler/project.compiler";
import { isSystemVariableName } from "@/schemas/variable/system-variables";
import PLC from "@/simulator/core/plc/plc";
import type PLCVariable from "@/simulator/core/plc/plc-variable";
import type { PLCVariableValue } from "@/simulator/core/plc/plc-variable";
import { NativeVm } from "./native-vm";

export interface ConformityOptions {
	cycles: number;
	seed: number;
	/** Probability, per cycle and per input, that the input changes. */
	changeProbability: number;
	scanTimeMs?: number;
}

export interface ConformityReport {
	cyclesCompared: number;
	simulatorFaultCycle: number | null;
	vmFaultCycle: number | null;
	/** Variables compared (present in the image and in the simulator). */
	comparedVariables: number;
	/** Number of distinct states the simulator went through: 1 means the run was inert. */
	distinctStates: number;
	mismatches: string[];
}

function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function toNumber(value: PLCVariableValue): number {
	if (typeof value === "boolean") return value ? 1 : 0;
	if (typeof value === "number") return value;
	throw new Error("A string cannot be compared");
}

/** What the VM prints for a variable, brought to the representation the simulator holds. */
function vmValueAs(variable: PLCVariable, value: number): number {
	return variable.getDeclaredType() === "DWORD" ? value >>> 0 : value;
}

function randomInput(
	variable: PLCVariable,
	random: () => number,
): PLCVariableValue {
	if (variable.getType() === "boolean") return random() < 0.5;
	const range = variable.getNumericRange();
	const min = Math.max(range?.min ?? 0, -40000);
	const max = Math.min(range?.max ?? 1023, 40000);
	return Math.floor(min + random() * (max - min + 1));
}

/**
 * Runs a compiled project in the simulator (with its establishment cycle, as
 * `SimulationManager.startSimulation` does) and in the native VM, with the same inputs on every
 * cycle, and lists every divergence. Needs Jest fake timers.
 */
export function compareSimulatorAndVm(
	compiled: CompiledProject,
	options: ConformityOptions,
): ConformityReport {
	const scanTimeMs = options.scanTimeMs ?? 100;
	const random = mulberry32(options.seed);
	const image = generateBytecode({
		compiled,
		ioBindings: [],
		cyclePeriodMs: scanTimeMs,
	});
	const indexByName = image.layout.variableIndexByName;

	let simulatorFaultCycle: number | null = null;
	const plc = new PLC({
		scanTimeMs,
		program: compiled.routines,
		routinesById: compiled.routinesById,
		variables: compiled.variables,
		onCycleError: () => {
			simulatorFaultCycle = currentCycle;
		},
	});
	let currentCycle = 0;

	const variablesByName = new Map(
		compiled.variables.map((variable) => [variable.getName(), variable]),
	);
	const inputs = compiled.variables.filter(
		(variable) =>
			variable.getScope() === "input" &&
			!isSystemVariableName(variable.getName()) &&
			variable.getName() in indexByName,
	);
	const compared = Object.keys(indexByName).filter((name) =>
		variablesByName.has(name),
	);

	const commands: string[] = [];
	const inputValues = new Map<string, PLCVariableValue>();
	for (const variable of compiled.variables) {
		const name = variable.getName();
		if (!(name in indexByName)) continue;
		const initial = toNumber(variable.getValue());
		if (initial !== 0) commands.push(`set ${indexByName[name]} ${initial}`);
	}
	inputs.forEach((variable) =>
		inputValues.set(variable.getName(), variable.getValue()),
	);

	const simulatorTrace: Record<string, number>[] = [];
	plc.start();
	plc.pause();
	for (let cycle = 0; cycle < options.cycles; cycle++) {
		currentCycle = cycle;
		for (const variable of inputs) {
			if (random() >= options.changeProbability) continue;
			const value = randomInput(variable, random);
			inputValues.set(variable.getName(), value);
			plc.setPhysicalInputValueByName(variable.getName(), value);
			commands.push(
				`set ${indexByName[variable.getName()]} ${toNumber(value)}`,
			);
		}
		commands.push("cycle");
		if (cycle === 0) {
			plc.stepOnce();
			plc.resume();
		} else {
			jest.advanceTimersByTime(scanTimeMs);
		}
		const snapshot = new Map(
			plc
				.getVariablesSnapshot()
				.map((variable) => [variable.getName(), variable]),
		);
		simulatorTrace.push(
			Object.fromEntries(
				compared.map((name) => [
					name,
					toNumber(snapshot.get(name)!.getValue()),
				]),
			),
		);
		if (simulatorFaultCycle !== null) break;
	}
	plc.stop();

	const vmTrace = new NativeVm(image.bytes).run(commands);
	const vmFaultCycle = vmTrace.findIndex((cycle) => cycle.fault !== 0);
	const mismatches: string[] = [];
	const lastCycle = Math.min(simulatorTrace.length, vmTrace.length);
	for (let cycle = 0; cycle < lastCycle; cycle++) {
		if (cycle === simulatorFaultCycle) break;
		for (const name of compared) {
			const expected = simulatorTrace[cycle][name];
			const actual = vmValueAs(
				variablesByName.get(name)!,
				vmTrace[cycle].variables[indexByName[name]],
			);
			if (expected !== actual) {
				mismatches.push(
					`cycle ${cycle}, ${name}: simulator ${expected}, VM ${actual}`,
				);
				if (mismatches.length >= 20) break;
			}
		}
		if (mismatches.length >= 20) break;
	}
	return {
		cyclesCompared: lastCycle,
		simulatorFaultCycle,
		vmFaultCycle: vmFaultCycle === -1 ? null : vmFaultCycle,
		comparedVariables: compared.length,
		distinctStates: new Set(
			simulatorTrace.map((state) => JSON.stringify(state)),
		).size,
		mismatches,
	};
}
