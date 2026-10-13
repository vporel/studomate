import type { HardwareDeviceDescriptor } from "@/hardware/hardware-device.descriptor";
import arduinoUnoR3 from "@/hardware/arduino/uno-r3.descriptor";
import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import PLCRoutine from "@/simulator/core/plc/plc-routine";
import {
	compiledProject,
	parseStatement,
	plcVariable,
} from "@tests/utils/bytecode-program";
import checkAdmissibility from "./bytecode.admissibility";
import generateBytecode from "./bytecode.generator";

const ident = (name: string) => IdentifiersBuilder.buildIdentifierNode(name);

function imageOf(config: Parameters<typeof compiledProject>[0]) {
	return generateBytecode({
		compiled: compiledProject(config),
		ioBindings: [],
		cyclePeriodMs: 100,
	});
}

const withLimits = (
	limits: Partial<HardwareDeviceDescriptor["limits"]>,
): HardwareDeviceDescriptor["limits"] => ({
	...arduinoUnoR3.limits,
	...limits,
});

describe("checkAdmissibility", () => {
	const small = () =>
		imageOf({
			variables: [
				plcVariable("a:BOOL"),
				plcVariable("i:INT"),
				plcVariable("d:DINT"),
			],
			routines: [["a := true", "i := 1", "d := 2"]],
		});

	it("accepts a small program and reports its exact sizes", () => {
		const image = small();
		const report = checkAdmissibility(image, arduinoUnoR3.limits);
		expect(report.admissible).toBe(true);
		expect(report.issues).toEqual([]);
		expect(report.metrics).toEqual({
			imageBytes: image.layout.imageSize,
			codeBytes: image.layout.codeSize,
			variableBytes: 1 + 2 + 4,
			ramBytes: 7 + 4 * image.layout.maxStack + 0 + 0,
		});
	});

	it("accepts an image exactly as large as the storage", () => {
		const image = small();
		expect(
			checkAdmissibility(
				image,
				withLimits({ programStorageBytes: image.layout.imageSize }),
			).admissible,
		).toBe(true);
	});

	it("reports an image that is too large and names the heaviest routine", () => {
		const callee = PLCRoutine.fromNodes(
			Array.from({ length: 30 }, () => parseStatement("i := i + 1")),
		);
		const main = new PLCRoutine([
			{ kind: "call", programId: "heavy", condition: ident("a") },
			{ kind: "node", node: parseStatement("i := 0") },
		]);
		const compiled = compiledProject({
			variables: [plcVariable("a:BOOL"), plcVariable("i:INT")],
			routines: [[]],
		});
		compiled.routines = [main];
		compiled.routinesById = { main, heavy: callee };
		const image = generateBytecode({
			compiled,
			ioBindings: [],
			cyclePeriodMs: 100,
		});
		const report = checkAdmissibility(
			image,
			withLimits({ programStorageBytes: 100 }),
		);
		expect(report.admissible).toBe(false);
		expect(report.issues).toEqual([
			{
				code: "IMAGE_TOO_LARGE",
				sizeBytes: image.layout.imageSize,
				limitBytes: 100,
				heaviestRoutine: {
					programId: "heavy",
					sizeBytes: image.layout.routineSizes[1],
				},
			},
		]);
	});

	it("reports variables, stack and call depth beyond the VM capacities", () => {
		const callee = PLCRoutine.fromNodes([
			parseStatement("d := d + (d + (d + d))"),
		]);
		const main = new PLCRoutine([
			{ kind: "call", programId: "sub", condition: ident("a") },
		]);
		const compiled = compiledProject({
			variables: [plcVariable("a:BOOL"), plcVariable("d:DINT")],
			routines: [[]],
		});
		compiled.routines = [main];
		compiled.routinesById = { main, sub: callee };
		const image = generateBytecode({
			compiled,
			ioBindings: [],
			cyclePeriodMs: 100,
		});
		const report = checkAdmissibility(
			image,
			withLimits({ vm: { variableBytes: 4, maxStack: 2, maxCallDepth: 0 } }),
		);
		expect(report.issues.map((issue) => issue.code)).toEqual([
			"VARIABLE_MEMORY_EXCEEDED",
			"STACK_TOO_DEEP",
			"CALL_DEPTH_EXCEEDED",
		]);
		expect(report.issues[0]).toEqual({
			code: "VARIABLE_MEMORY_EXCEEDED",
			sizeBytes: 5,
			limitBytes: 4,
		});
		expect(report.issues[1]).toEqual({
			code: "STACK_TOO_DEEP",
			depth: 4,
			limit: 2,
		});
		expect(report.issues[2]).toEqual({
			code: "CALL_DEPTH_EXCEEDED",
			depth: 1,
			limit: 0,
		});
	});

	it("reports conditions nested deeper than the VM can verify", () => {
		let node = ControlsBuilder.buildIfControlNode(
			ident("a"),
			[parseStatement("i := 1")],
			null,
		);
		for (let depth = 0; depth < 20; depth++) {
			node = ControlsBuilder.buildIfControlNode(
				ident("a"),
				[node],
				[parseStatement("i := 2")],
			);
		}
		const image = imageOf({
			variables: [plcVariable("a:BOOL"), plcVariable("i:INT")],
			routines: [[node]],
		});
		const report = checkAdmissibility(image, arduinoUnoR3.limits);
		expect(report.issues).toEqual([
			{ code: "JUMP_NESTING_EXCEEDED", limit: 16 },
		]);
	});
});
