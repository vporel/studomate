import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import PLCRoutine from "@/simulator/core/plc/plc-routine";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import { getNumericRange } from "@/schemas/variable/variable.schema";
import {
	compiledProject,
	parseStatement,
	plcVariable,
	UNO_PIN_RANGE,
} from "@tests/utils/bytecode-program";
import { NativeVm, nativeVerifyMany } from "@tests/utils/native-vm";
import type { RemoteIoPlan } from "@/hardware/arduino/remote-io/remote-io-plan";
import arduinoIoBindings from "./arduino-io-bindings";
import { HEADER_OFFSETS } from "./bytecode-format";
import { imageChecksum } from "./bytecode-image";
import generateBytecode from "./bytecode.generator";
import verifyBytecode from "./bytecode.verifier";

const NO_IO: RemoteIoPlan = { pins: [], inputs: [], outputs: [] };
const ident = (name: string) => IdentifiersBuilder.buildIdentifierNode(name);

function build(
	variables: PLCVariable[],
	routines: Parameters<typeof compiledProject>[0]["routines"],
	ioPlan: RemoteIoPlan = NO_IO,
	cyclePeriodMs = 100,
) {
	const image = generateBytecode({
		compiled: compiledProject({ variables, routines }),
		ioBindings: arduinoIoBindings(ioPlan),
		cyclePeriodMs,
		pinRange: UNO_PIN_RANGE,
	});
	const vm = new NativeVm(image.bytes);
	const at = (name: string) => image.layout.variableIndexByName[name];
	return { image, vm, at };
}

describe("native VM", () => {
	describe("numeric semantics", () => {
		it("wraps INT at its range and keeps WORD unsigned", () => {
			const { vm, at } = build(
				[plcVariable("i:INT"), plcVariable("w:WORD"), plcVariable("j:INT")],
				[["i := i + 1", "w := INT_TO_WORD(j)"]],
			);
			const [cycle] = vm.run([
				`set ${at("i")} 32767`,
				`set ${at("j")} -1`,
				"cycle",
			]);
			expect(cycle.variables[at("i")]).toBe(-32768);
			expect(cycle.variables[at("w")]).toBe(65535);
		});

		it("wraps DINT at 32 bits", () => {
			const { vm, at } = build([plcVariable("d:DINT")], [["d := d * 3"]]);
			const [cycle] = vm.run([`set ${at("d")} 2000000000`, "cycle"]);
			expect(cycle.variables[at("d")]).toBe(1705032704);
		});

		it("truncates a division towards zero", () => {
			const { vm, at } = build(
				[plcVariable("i:INT"), plcVariable("j:INT"), plcVariable("k:INT")],
				[["i := j / k"]],
			);
			const [cycle] = vm.run([
				`set ${at("j")} -7`,
				`set ${at("k")} 2`,
				"cycle",
			]);
			expect(cycle.variables[at("i")]).toBe(-3);
		});

		it("returns the dividend for -2^31 / -1", () => {
			const { vm, at } = build(
				[plcVariable("d:DINT"), plcVariable("m:DINT")],
				[["d := d / m"]],
			);
			const [cycle] = vm.run([
				`set ${at("d")} -2147483648`,
				`set ${at("m")} -1`,
				"cycle",
			]);
			expect(cycle.fault).toBe(0);
			expect(cycle.variables[at("d")]).toBe(-2147483648);
		});

		it("faults on a division by zero and stays stopped", () => {
			const { vm, at } = build(
				[plcVariable("i:INT"), plcVariable("j:INT"), plcVariable("k:INT")],
				[["i := j / k"]],
			);
			const cycles = vm.run(["cycle", "cycle"]);
			expect(cycles.map((cycle) => cycle.fault)).toEqual([1, 1]);
			expect(cycles[0].variables[at("i")]).toBe(0);
		});

		it("does not evaluate the guarded side of an AND", () => {
			const { vm, at } = build(
				[plcVariable("a:BOOL"), plcVariable("i:INT"), plcVariable("j:INT")],
				[["a := j != 0 AND i / j > 1"]],
			);
			const [guarded, open] = vm.run([
				`set ${at("i")} 10`,
				"cycle",
				`set ${at("j")} 2`,
				"cycle",
			]);
			expect(guarded.fault).toBe(0);
			expect(guarded.variables[at("a")]).toBe(0);
			expect(open.variables[at("a")]).toBe(1);
		});

		it("compares bit strings as unsigned and integers as signed", () => {
			const { vm, at } = build(
				[
					plcVariable("a:BOOL"),
					plcVariable("b:BOOL"),
					plcVariable("w:WORD"),
					plcVariable("i:INT"),
				],
				[["a := w > 3", "b := i < 3"]],
			);
			const [cycle] = vm.run([
				`set ${at("w")} 40000`,
				`set ${at("i")} -5`,
				"cycle",
			]);
			expect(cycle.variables[at("a")]).toBe(1);
			expect(cycle.variables[at("b")]).toBe(1);
		});
	});

	describe("control flow", () => {
		it("runs the branch the condition selects", () => {
			const { vm, at } = build(
				[plcVariable("a:BOOL"), plcVariable("i:INT")],
				[
					[
						ControlsBuilder.buildIfControlNode(
							ident("a"),
							[parseStatement("i := 1")],
							[parseStatement("i := 2")],
						),
					],
				],
			);
			const [off, on] = vm.run(["cycle", `set ${at("a")} 1`, "cycle"]);
			expect(off.variables[at("i")]).toBe(2);
			expect(on.variables[at("i")]).toBe(1);
		});

		it("calls a routine only when its condition holds", () => {
			const callee = PLCRoutine.fromNodes([parseStatement("i := i + 1")]);
			const main = new PLCRoutine([
				{ kind: "call", programId: "sub", condition: ident("a") },
			]);
			const compiled = compiledProject({
				variables: [plcVariable("a:BOOL"), plcVariable("i:INT")],
				routines: [[]],
			});
			compiled.routines = [main];
			compiled.routinesById = { main, sub: callee };
			const image = generateBytecode({
				compiled,
				ioBindings: [],
				cyclePeriodMs: 100,
				pinRange: UNO_PIN_RANGE,
			});
			const vm = new NativeVm(image.bytes);
			const a = image.layout.variableIndexByName.a;
			const i = image.layout.variableIndexByName.i;
			const cycles = vm.run(["cycle", `set ${a} 1`, "cycle", "cycle"]);
			expect(cycles.map((cycle) => cycle.variables[i])).toEqual([0, 1, 2]);
		});
	});

	describe("system variables", () => {
		it("raises _SYS_FIRST_SCAN on the first cycle only", () => {
			const { vm, at } = build(
				[plcVariable("a:BOOL")],
				[["a := _SYS_FIRST_SCAN"]],
			);
			const cycles = vm.run(["cycle", "cycle", "cycle"]);
			expect(cycles.map((cycle) => cycle.variables[at("a")])).toEqual([
				1, 0, 0,
			]);
		});

		it("toggles a time base on its half period", () => {
			const { vm, at } = build(
				[plcVariable("a:BOOL")],
				[["a := _SYS_TB_200ms"]],
			);
			const cycles = vm.run(["cycle", "cycle", "cycle", "cycle", "cycle"]);
			expect(cycles.map((cycle) => cycle.variables[at("a")])).toEqual([
				1, 0, 1, 0, 1,
			]);
		});
	});

	describe("blocks", () => {
		const timerVariables = () => [
			plcVariable("in:BOOL"),
			plcVariable("last:internal-bool"),
			plcVariable("et:internal-number"),
			plcVariable("q:internal-bool"),
		];
		const timer = (type: "TON" | "TOF" | "TP", presetMs: number) =>
			BlocksBuilder.buildTimerNode(
				type,
				ident("in"),
				ident("last"),
				LiteralsBuilder.buildNumberNode(presetMs),
				ident("et"),
				ident("q"),
			);

		it("delays a TON output by its preset time", () => {
			const { vm, at } = build(timerVariables(), [[timer("TON", 250)]]);
			const cycles = vm.run([`set ${at("in")} 1`, ...Array(6).fill("cycle")]);
			expect(cycles.map((cycle) => cycle.variables[at("q")])).toEqual([
				0, 0, 0, 0, 1, 1,
			]);
			expect(cycles[3].variables[at("et")]).toBe(300);
		});

		it("resets a TON when its input falls", () => {
			const { vm, at } = build(timerVariables(), [[timer("TON", 250)]]);
			const cycles = vm.run([
				`set ${at("in")} 1`,
				"cycle",
				"cycle",
				`set ${at("in")} 0`,
				"cycle",
			]);
			expect(cycles[2].variables[at("et")]).toBe(0);
			expect(cycles[2].variables[at("q")]).toBe(0);
		});

		it("holds a TOF output for its preset time after the input falls", () => {
			const { vm, at } = build(timerVariables(), [[timer("TOF", 250)]]);
			const cycles = vm.run([
				`set ${at("in")} 1`,
				"cycle",
				`set ${at("in")} 0`,
				...Array(5).fill("cycle"),
			]);
			expect(cycles.map((cycle) => cycle.variables[at("q")])).toEqual([
				1, 1, 1, 1, 1, 0,
			]);
		});

		it("emits a TP pulse of its preset time", () => {
			const { vm, at } = build(timerVariables(), [[timer("TP", 250)]]);
			const cycles = vm.run([`set ${at("in")} 1`, ...Array(6).fill("cycle")]);
			expect(cycles.map((cycle) => cycle.variables[at("q")])).toEqual([
				1, 1, 1, 1, 0, 0,
			]);
		});

		it("accumulates the time of a late cycle in one step", () => {
			const { vm, at } = build(timerVariables(), [[timer("TON", 1000)]]);
			const states = vm.run([
				`set ${at("in")} 1`,
				"cycle",
				"cycle",
				"advance 350",
				"poll",
			]);
			expect(states[2].status).toBe("ran");
			expect(states[2].variables[at("et")]).toBe(400);
		});

		it("does not run a cycle before its period has elapsed", () => {
			const { vm } = build([plcVariable("i:INT")], [["i := i + 1"]]);
			const states = vm.run([
				"poll",
				"advance 40",
				"poll",
				"advance 60",
				"poll",
			]);
			expect(states.map((state) => state.status)).toEqual([
				"ran",
				"idle",
				"ran",
			]);
		});

		it("counts rising edges up to its preset with CTU and resets", () => {
			const { vm, at } = build(
				[
					plcVariable("cu:BOOL"),
					plcVariable("r:BOOL"),
					plcVariable("last:internal-bool"),
					plcVariable("cv:internal-number"),
					plcVariable("q:internal-bool"),
				],
				[
					[
						BlocksBuilder.buildCounterNode(
							"CTU",
							ident("cu"),
							ident("last"),
							ident("r"),
							LiteralsBuilder.buildNumberNode(2),
							ident("cv"),
							ident("q"),
						),
					],
				],
			);
			const cycles = vm.run([
				`set ${at("cu")} 1`,
				"cycle",
				`set ${at("cu")} 0`,
				"cycle",
				`set ${at("cu")} 1`,
				"cycle",
				`set ${at("r")} 1`,
				"cycle",
			]);
			expect(
				cycles.map((cycle) => [
					cycle.variables[at("cv")],
					cycle.variables[at("q")],
				]),
			).toEqual([
				[1, 0],
				[1, 0],
				[2, 1],
				[0, 0],
			]);
		});

		it("lets a CTUD count both ways", () => {
			const { vm, at } = build(
				[
					plcVariable("cu:BOOL"),
					plcVariable("cd:BOOL"),
					plcVariable("r:BOOL"),
					plcVariable("ld:BOOL"),
					plcVariable("lastu:internal-bool"),
					plcVariable("lastd:internal-bool"),
					plcVariable("cv:internal-number"),
					plcVariable("qu:internal-bool"),
					plcVariable("qd:internal-bool"),
				],
				[
					[
						BlocksBuilder.buildCounterNode(
							"CTUD",
							ident("cu"),
							ident("lastu"),
							ident("r"),
							LiteralsBuilder.buildNumberNode(2),
							ident("cv"),
							ident("qu"),
							{
								input: ident("cd"),
								lastInput: ident("lastd"),
								load: ident("ld"),
								output: ident("qd"),
							},
						),
					],
				],
			);
			const cycles = vm.run([
				`set ${at("cu")} 1`,
				"cycle",
				`set ${at("cu")} 0`,
				`set ${at("cd")} 1`,
				"cycle",
				`set ${at("cd")} 0`,
				"cycle",
			]);
			expect(cycles.map((cycle) => cycle.variables[at("cv")])).toEqual([
				1, 0, 0,
			]);
			expect(cycles.map((cycle) => cycle.variables[at("qd")])).toEqual([
				0, 1, 1,
			]);
		});
	});

	describe("pins", () => {
		const variables = () => [
			plcVariable("btn:BOOL", "input", "id-btn"),
			plcVariable("raw:BOOL", "input", "id-raw"),
			plcVariable("pot:INT", "input", "id-pot"),
			plcVariable("lamp:BOOL", "output", "id-lamp"),
			plcVariable("dim:INT", "output", "id-dim"),
			plcVariable("i:INT"),
			plcVariable("j:INT"),
		];
		const ioPlan: RemoteIoPlan = {
			pins: [
				{ pin: "2", mode: "IP" },
				{ pin: "4", mode: "I" },
				{ pin: "A0", mode: "A" },
				{ pin: "13", mode: "O" },
				{ pin: "9", mode: "P" },
			],
			inputs: [
				{ variableId: "id-btn", pin: "2", kind: "digital", inverted: true },
				{ variableId: "id-raw", pin: "4", kind: "digital", inverted: false },
				{ variableId: "id-pot", pin: "A0", kind: "analog", inverted: false },
			],
			outputs: [
				{
					variableId: "id-lamp",
					pin: "13",
					kind: "digital",
					range: { min: 0, max: 1 },
				},
				{
					variableId: "id-dim",
					pin: "9",
					kind: "analog",
					range: { min: 0, max: 255 },
				},
			],
		};
		const program = [["lamp := btn", "dim := pot", "i := i + 1", "j := j / i"]];

		it("reads inputs (inverted or not, analog) and drives outputs", () => {
			const { vm, at } = build(
				variables(),
				[["lamp := btn", "dim := pot"]],
				ioPlan,
			);
			const cycles = vm.run([
				"pin 2 0",
				"pin 4 1",
				"pin 14 700",
				"cycle",
				"pin 2 1",
				"pin 14 100",
				"cycle",
			]);
			expect(cycles[0].variables[at("btn")]).toBe(1);
			expect(cycles[0].variables[at("raw")]).toBe(1);
			expect(cycles[0].variables[at("pot")]).toBe(700);
			expect(cycles[0].pins).toEqual({ 9: 255, 13: 1 });
			expect(cycles[1].variables[at("btn")]).toBe(0);
			expect(cycles[1].pins).toEqual({ 9: 100, 13: 0 });
		});

		it("saturates a negative PWM value to 0", () => {
			const { vm, at } = build(variables(), [["dim := pot - 300"]], ioPlan);
			const [cycle] = vm.run(["pin 14 100", "cycle"]);
			expect(cycle.variables[at("dim")]).toBe(-200);
			expect(cycle.pins[9]).toBe(0);
		});

		it("drives every output low when the program faults", () => {
			const { vm } = build(
				variables(),
				[program[0].slice(0, 2).concat(["j := j / i"])],
				ioPlan,
			);
			const cycles = vm.run(["pin 2 0", "pin 14 700", "cycle"]);
			expect(cycles[0].fault).toBe(1);
			expect(cycles[0].pins).toEqual({ 9: 0, 13: 0 });
		});

		it("starts with outputs low before the first cycle", () => {
			const { vm } = build(variables(), [["lamp := true"]], ioPlan);
			const [state] = vm.run(["mem"]);
			expect(state.pins).toEqual({ 9: 0, 13: 0 });
		});
	});

	describe("forced variables", () => {
		it("keeps the value of a forced variable whatever the program writes, until released", () => {
			const { vm, at } = build([plcVariable("i:INT")], [["i := i + 1"]]);
			const cycles = vm.run([
				"cycle",
				`force ${at("i")} 100`,
				"cycle",
				"cycle",
				`release ${at("i")}`,
				"cycle",
			]);
			expect(cycles.map((cycle) => cycle.variables[at("i")])).toEqual([
				1, 100, 100, 101,
			]);
		});

		it("keeps a forced output on its pin", () => {
			const { vm, at } = build(
				[plcVariable("a:BOOL", "output", "id-a")],
				[["a := false"]],
				{
					pins: [{ pin: "13", mode: "O" }],
					inputs: [],
					outputs: [
						{
							variableId: "id-a",
							pin: "13",
							kind: "digital",
							range: { min: 0, max: 1 },
						},
					],
				},
			);
			const [cycle] = vm.run([`force ${at("a")} 1`, "cycle"]);
			expect(cycle.pins[13]).toBe(1);
		});

		it("lets the forced value override a pin that feeds an input", () => {
			const { vm, at } = build(
				[plcVariable("btn:BOOL", "input", "id-btn")],
				[[]],
				{
					pins: [{ pin: "2", mode: "I" }],
					inputs: [
						{
							variableId: "id-btn",
							pin: "2",
							kind: "digital",
							inverted: false,
						},
					],
					outputs: [],
				},
			);
			const cycles = vm.run([
				"pin 2 1",
				"cycle",
				`force ${at("btn")} 0`,
				"cycle",
			]);
			expect(cycles.map((cycle) => cycle.variables[at("btn")])).toEqual([1, 0]);
		});

		it("holds the output of a timer block back from a forced elapsed time", () => {
			const { vm, at } = build(
				[
					plcVariable("in:BOOL"),
					plcVariable("last:internal-bool"),
					plcVariable("et:internal-number"),
					plcVariable("q:internal-bool"),
				],
				[
					[
						BlocksBuilder.buildTimerNode(
							"TON",
							ident("in"),
							ident("last"),
							LiteralsBuilder.buildNumberNode(250),
							ident("et"),
							ident("q"),
						),
					],
				],
			);
			const cycles = vm.run([
				`set ${at("in")} 1`,
				"cycle",
				`force ${at("et")} 1000`,
				"cycle",
			]);
			expect(cycles[1].variables[at("et")]).toBe(1000);
			expect(cycles[1].variables[at("q")]).toBe(1);
		});

		it("ignores a force on an index that is not a variable", () => {
			const { vm } = build([plcVariable("i:INT")], [["i := 1"]]);
			expect(() => vm.run(["force 200 1", "cycle"])).not.toThrow();
		});
	});

	describe("image verification", () => {
		it("refuses to start on a corrupted image", () => {
			const { image } = build([plcVariable("i:INT")], [["i := 1"]]);
			const corrupted = new Uint8Array(image.bytes);
			corrupted[corrupted.length - 2] ^= 0xff;
			expect(new NativeVm(corrupted).startError()).toMatch(/^ERR \d+$/);
		});

		it("refuses to start when the image needs a deeper stack than the VM has", () => {
			const depth = 40;
			const { vm, image } = build(
				[plcVariable("i:INT")],
				[[`i := ${"i + (".repeat(depth)}i${")".repeat(depth)}`]],
			);
			expect(image.layout.maxStack).toBeGreaterThan(32);
			expect(vm.verify()).toBe(0);
			expect(vm.startError()).toMatch(/^ERR \d+$/);
		});

		it("takes the same decision as the TypeScript verifier on single-byte corruptions", () => {
			const { image } = build(
				[
					plcVariable("a:BOOL"),
					plcVariable("i:INT"),
					plcVariable("m:internal-number"),
					plcVariable("in:BOOL"),
					plcVariable("last:internal-bool"),
					plcVariable("q:internal-bool"),
				],
				[
					[
						ControlsBuilder.buildIfControlNode(
							ident("a"),
							[parseStatement("i := 1")],
							[parseStatement("i := m + 2")],
						),
						BlocksBuilder.buildTimerNode(
							"TON",
							ident("in"),
							ident("last"),
							LiteralsBuilder.buildNumberNode(500),
							ident("m"),
							ident("q"),
						),
						parseStatement("a := in AND NOT q"),
					],
				],
			);
			const candidates: Uint8Array[] = [];
			for (let offset = 0; offset < image.bytes.length; offset++) {
				for (const value of [0x00, 0x01, 0x07, 0x33, 0x50, 0x80, 0xff]) {
					if (image.bytes[offset] === value) continue;
					const copy = new Uint8Array(image.bytes);
					copy[offset] = value;
					if (
						offset !== HEADER_OFFSETS.crc16 &&
						offset !== HEADER_OFFSETS.crc16 + 1
					) {
						const checksum = imageChecksum(copy);
						copy[HEADER_OFFSETS.crc16] = checksum & 0xff;
						copy[HEADER_OFFSETS.crc16 + 1] = checksum >> 8;
					}
					candidates.push(copy);
				}
			}
			const nativeStatuses = nativeVerifyMany([image.bytes, ...candidates]);
			expect(nativeStatuses[0]).toBe(0);
			const mismatches = candidates.flatMap((candidate, i) => {
				const typescript = verifyBytecode(candidate, 1024, UNO_PIN_RANGE);
				const native = nativeStatuses[i + 1];
				return typescript.valid === (native === 0)
					? []
					: [
							{
								i,
								typescript,
								native,
								bytes: Buffer.from(candidate).toString("hex"),
							},
						];
			});
			expect(mismatches).toEqual([]);
		});
	});

	describe("constants", () => {
		const constant = (name: string, value: number) =>
			new PLCVariable(
				name,
				name,
				"memory",
				"number",
				getNumericRange("INT"),
				"INT",
				true,
				value,
			);

		it("holds the declared value from the first cycle and restores it after an external write", () => {
			const { vm, at } = build(
				[constant("K", 123), plcVariable("out:INT")],
				[["out := K"]],
			);

			const cycles = vm.run(["cycle", `set ${at("K")} 5`, "cycle"]);

			expect(cycles[0].variables[at("K")]).toBe(123);
			expect(cycles[0].variables[at("out")]).toBe(123);
			expect(cycles[1].variables[at("K")]).toBe(123);
			expect(cycles[1].variables[at("out")]).toBe(123);
		});

		it("restores a zero constant as well", () => {
			const { vm, at } = build(
				[constant("K", 0), plcVariable("out:INT")],
				[["out := K"]],
			);

			const [cycle] = vm.run([`set ${at("K")} 9`, "cycle"]);

			expect(cycle.variables[at("out")]).toBe(0);
		});
	});
});
