import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import PLCRoutine from "@/simulator/core/plc/plc-routine";
import {
	compiledProject,
	disassemble,
	parseStatement,
	plcVariable,
	systemPlcVariables,
} from "@tests/utils/bytecode-program";
import type { RemoteIoPlan } from "@/hardware/arduino/remote-io/remote-io-plan";
import arduinoIoBindings from "./arduino-io-bindings";
import { FORMAT_VERSION, HEADER_OFFSETS, HEADER_SIZE } from "./bytecode-format";
import BytecodeGenerationError from "./bytecode.error";
import generateBytecode, {
	imageChecksum,
	imageIdentifier,
} from "./bytecode.generator";
import verifyBytecode from "./bytecode.verifier";
import { crc16CcittFalse, crc32 } from "./crc";

const NO_IO: RemoteIoPlan = { pins: [], inputs: [], outputs: [] };
const ident = (name: string) => IdentifiersBuilder.buildIdentifierNode(name);

function generate(
	config: Parameters<typeof compiledProject>[0],
	ioPlan: RemoteIoPlan = NO_IO,
) {
	const image = generateBytecode({
		compiled: compiledProject(config),
		ioBindings: arduinoIoBindings(ioPlan),
		cyclePeriodMs: 100,
	});
	expect(verifyBytecode(image.bytes, 1024)).toEqual({ valid: true });
	return image;
}

const code = (image: { bytes: Uint8Array }) =>
	disassemble(image.bytes).map((line) => line.replace(/^\d+: /, ""));

describe("CRC", () => {
	it("computes the standard check values", () => {
		const check = new TextEncoder().encode("123456789");
		expect(crc16CcittFalse(check)).toBe(0x29b1);
		expect(crc32(check)).toBe(0xcbf43926);
	});
});

describe("generateBytecode", () => {
	describe("header and layout", () => {
		it("writes the header fields and a valid checksum and identifier", () => {
			const image = generate({
				variables: [plcVariable("a:BOOL"), plcVariable("i:INT")],
				routines: [["a := true", "i := 3"]],
			});
			const { bytes, layout } = image;
			expect([...bytes.subarray(0, 4)]).toEqual([0x53, 0x54, 0x44, 0x4d]);
			expect(bytes[HEADER_OFFSETS.formatVersion]).toBe(FORMAT_VERSION);
			expect(bytes[HEADER_OFFSETS.reserved]).toBe(0);
			expect(bytes[HEADER_OFFSETS.cyclePeriodMs]).toBe(100);
			expect(layout).toMatchObject({
				boolCount: 1,
				intCount: 1,
				wordCount: 0,
				int32Count: 0,
				ioCount: 0,
				sysCount: 0,
				routineCount: 1,
				scanCount: 1,
				maxStack: 1,
				maxCallDepth: 0,
			});
			expect(bytes.length).toBe(layout.imageSize);
			expect(layout.imageSize).toBe(HEADER_SIZE + 2 + layout.codeSize);
			expect(imageChecksum(bytes)).toBe(bytes[20] | (bytes[21] << 8));
			expect(imageIdentifier(bytes)).toBe(image.imageId);
		});

		it("is deterministic and changes the identifier with the code", () => {
			const config = {
				variables: [plcVariable("i:INT")],
				routines: [["i := 3"]],
			};
			const first = generate(config);
			const second = generate(config);
			const other = generate({ ...config, routines: [["i := 4"]] });
			expect(second.bytes).toEqual(first.bytes);
			expect(other.imageId).not.toBe(first.imageId);
		});

		it("rejects an invalid cycle period", () => {
			expect(() =>
				generateBytecode({
					compiled: compiledProject({ variables: [], routines: [[]] }),
					ioBindings: [],
					cyclePeriodMs: 0,
				}),
			).toThrow(BytecodeGenerationError);
		});
	});

	describe("variables", () => {
		it("ranks variables by storage class, keeping the declaration order inside a class", () => {
			const image = generate({
				variables: [
					plcVariable("d:DINT"),
					plcVariable("w1:WORD"),
					plcVariable("i1:INT"),
					plcVariable("b1:BOOL"),
					plcVariable("i2:INT"),
					plcVariable("t:TIME"),
					plcVariable("m:internal-number"),
					plcVariable("b2:internal-bool"),
					plcVariable("dw:DWORD"),
				],
				routines: [
					[
						"d := 0",
						"w1 := 0",
						"i1 := 0",
						"b1 := false",
						"i2 := 0",
						"t := 0",
						"m := 0",
						"b2 := false",
						"dw := 0",
					],
				],
			});
			expect(image.layout).toMatchObject({
				boolCount: 2,
				intCount: 2,
				wordCount: 1,
				int32Count: 4,
			});
			expect(image.layout.variableIndexByName).toEqual({
				b1: 0,
				b2: 1,
				i1: 2,
				i2: 3,
				w1: 4,
				d: 5,
				t: 6,
				m: 7,
				dw: 8,
			});
		});

		it("leaves out variables no kept code refers to", () => {
			const image = generate({
				variables: [plcVariable("used:INT"), plcVariable("unused:INT")],
				routines: [["used := 1"]],
			});
			expect(image.layout.variableIndexByName).toEqual({ used: 0 });
		});

		it("embeds a referenced system variable and its identifier", () => {
			const image = generate({
				variables: [plcVariable("a:BOOL")],
				routines: [["a := _SYS_TB_500ms"]],
			});
			expect(image.layout.sysCount).toBe(1);
			const sysTable = image.bytes.subarray(HEADER_SIZE, HEADER_SIZE + 2);
			expect([...sysTable]).toEqual([
				image.layout.variableIndexByName["_SYS_TB_500ms"],
				3,
			]);
		});

		it.each(["REAL", "STRING"] as const)("refuses a %s variable", (type) => {
			expect(() =>
				generate({
					variables: [plcVariable(`x:${type}`)],
					routines: [["x := x"]],
				}),
			).toThrow(BytecodeGenerationError);
		});

		it("refuses an undeclared variable", () => {
			expect(() =>
				generate({
					variables: [plcVariable("a:BOOL")],
					routines: [["a := ghost"]],
				}),
			).toThrow(/ghost/);
		});

		it("refuses more than 250 variables", () => {
			const variables = Array.from({ length: 251 }, (_, i) =>
				plcVariable(`v${i}:INT`),
			);
			expect(() =>
				generate({
					variables,
					routines: [variables.map((variable) => `${variable.getName()} := 1`)],
				}),
			).toThrow(/250/);
		});
	});

	describe("constants", () => {
		it.each([
			[0, ["PUSH0"]],
			[1, ["PUSH1"]],
			[2, ["PUSH8 2"]],
			[-1, ["PUSH8 -1"]],
			[127, ["PUSH8 127"]],
			[128, ["PUSH16 128"]],
			[-128, ["PUSH8 -128"]],
			[-129, ["PUSH16 -129"]],
			[32767, ["PUSH16 32767"]],
			[-32768, ["PUSH16 -32768"]],
			[32768, ["PUSH32 32768"]],
			[-32769, ["PUSH32 4294934527"]],
			[2147483647, ["PUSH32 2147483647"]],
		])(
			"encodes %i as the shortest push of its 32-bit pattern",
			(value, expected) => {
				const image = generate({
					variables: [plcVariable("d:DINT")],
					routines: [
						[
							StatementsBuilder.buildAssignStatementNode(
								ident("d"),
								LiteralsBuilder.buildNumberNode(value),
							),
						],
					],
				});
				expect(code(image)).toEqual([...expected, "STORE 0", "RET"]);
			},
		);

		it("keeps the unsigned pattern of a WORD or DWORD constant", () => {
			const image = generate({
				variables: [plcVariable("w:WORD"), plcVariable("dw:DWORD")],
				routines: [["w := 40000", "dw := 4000000000"]],
			});
			expect(code(image)).toEqual([
				"PUSH32 40000",
				"STORE 0",
				"PUSH32 4000000000",
				"STORE 1",
				"RET",
			]);
		});

		it("refuses a real or out-of-range constant", () => {
			expect(() =>
				generate({
					variables: [plcVariable("d:DINT")],
					routines: [["d := 1.5"]],
				}),
			).toThrow(BytecodeGenerationError);
			expect(() =>
				generate({
					variables: [plcVariable("dw:DWORD")],
					routines: [["dw := 5000000000"]],
				}),
			).toThrow(/32 bits/);
		});
	});

	describe("expressions", () => {
		it("emits arithmetic with the type of the result", () => {
			const image = generate({
				variables: [
					plcVariable("i:INT"),
					plcVariable("j:INT"),
					plcVariable("d:DINT"),
					plcVariable("t:TIME"),
					plcVariable("u:TIME"),
				],
				routines: [
					["i := i + j", "d := d * 3", "d := d - INT_TO_DINT(i)", "t := u / 2"],
				],
			});
			expect(code(image)).toEqual([
				"LOAD 0",
				"LOAD 1",
				"ADD 1",
				"STORE 0",
				"LOAD 2",
				"PUSH8 3",
				"MUL 3",
				"STORE 2",
				"LOAD 2",
				"LOAD 0",
				"CONV 3",
				"SUB 3",
				"STORE 2",
				"LOAD 4",
				"PUSH8 2",
				"DIV 5",
				"STORE 3",
				"RET",
			]);
		});

		it("types an operation on internal variables as 6", () => {
			const image = generate({
				variables: [
					plcVariable("m:internal-number"),
					plcVariable("n:internal-number"),
				],
				routines: [["m := n + 1", "m := -n"]],
			});
			expect(code(image)).toEqual([
				"LOAD 1",
				"PUSH1",
				"ADD 6",
				"STORE 0",
				"LOAD 1",
				"NEG 6",
				"STORE 0",
				"RET",
			]);
		});

		it("converts to the target type", () => {
			const image = generate({
				variables: [
					plcVariable("i:INT"),
					plcVariable("w:WORD"),
					plcVariable("d:DINT"),
					plcVariable("dw:DWORD"),
				],
				routines: [
					[
						"i := DINT_TO_INT(d)",
						"w := INT_TO_WORD(i)",
						"dw := WORD_TO_DWORD(w)",
						"d := INT_TO_DINT(i)",
					],
				],
			});
			expect(code(image).filter((line) => line.startsWith("CONV"))).toEqual([
				"CONV 1",
				"CONV 2",
				"CONV 4",
				"CONV 3",
			]);
		});

		it("refuses arithmetic on a bit string and conversions to REAL", () => {
			expect(() =>
				generate({
					variables: [plcVariable("w:WORD")],
					routines: [["w := w + 1"]],
				}),
			).toThrow(BytecodeGenerationError);
			expect(() =>
				generate({
					variables: [plcVariable("i:INT"), plcVariable("r:REAL")],
					routines: [["r := INT_TO_REAL(i)"]],
				}),
			).toThrow(BytecodeGenerationError);
		});

		it("flags unsigned comparisons only for bit strings", () => {
			const image = generate({
				variables: [
					plcVariable("a:BOOL"),
					plcVariable("w:WORD"),
					plcVariable("i:INT"),
					plcVariable("dw:DWORD"),
				],
				routines: [
					["a := w > 3", "a := i <= -2", "a := dw != 7", "a := w = w"],
				],
			});
			expect(code(image).filter((line) => line.startsWith("CMP"))).toEqual([
				"CMP 12", // > unsigned
				"CMP 3", // <= signed
				"CMP 9", // != unsigned
				"CMP 8", // = unsigned
			]);
		});

		it("short-circuits AND and OR and keeps the stack balanced", () => {
			const image = generate({
				variables: [
					plcVariable("a:BOOL"),
					plcVariable("b:BOOL"),
					plcVariable("c:BOOL"),
				],
				routines: [["a := b AND NOT c", "a := b OR c"]],
			});
			expect(disassemble(image.bytes)).toEqual([
				"0: LOAD 1",
				"2: JZK 8",
				"5: LOAD 2",
				"7: NOT",
				"8: STORE 0",
				"10: LOAD 1",
				"12: JNZK 17",
				"15: LOAD 2",
				"17: STORE 0",
				"19: RET",
			]);
			expect(image.layout.maxStack).toBe(1);
		});

		it("evaluates a division only when its guard lets it through", () => {
			const image = generate({
				variables: [
					plcVariable("a:BOOL"),
					plcVariable("i:INT"),
					plcVariable("j:INT"),
				],
				routines: [["a := j != 0 AND i / j > 1"]],
			});
			const lines = code(image);
			expect(lines.findIndex((l) => l.startsWith("JZK"))).toBeLessThan(
				lines.findIndex((l) => l.startsWith("DIV")),
			);
		});
	});

	describe("statements", () => {
		it("compiles an if without else", () => {
			const image = generate({
				variables: [plcVariable("a:BOOL"), plcVariable("i:INT")],
				routines: [
					[
						ControlsBuilder.buildIfControlNode(
							ident("a"),
							[parseStatement("i := 1")],
							null,
						),
					],
				],
			});
			expect(disassemble(image.bytes)).toEqual([
				"0: LOAD 0",
				"2: JZ 8",
				"5: PUSH1",
				"6: STORE 1",
				"8: RET",
			]);
		});

		it("compiles an if with else, nested", () => {
			const inner = ControlsBuilder.buildIfControlNode(
				ident("a"),
				[parseStatement("i := 1")],
				[parseStatement("i := 2")],
			);
			const image = generate({
				variables: [plcVariable("a:BOOL"), plcVariable("i:INT")],
				routines: [
					[
						ControlsBuilder.buildIfControlNode(
							ident("a"),
							[inner],
							[parseStatement("i := 3")],
						),
					],
				],
			});
			const lines = code(image);
			expect(lines.filter((line) => line.startsWith("JMP"))).toHaveLength(2);
			expect(image.layout.maxStack).toBe(1);
		});

		it("compiles an if with an empty else without dead code", () => {
			const image = generate({
				variables: [plcVariable("a:BOOL"), plcVariable("i:INT")],
				routines: [
					[
						ControlsBuilder.buildIfControlNode(
							ident("a"),
							[parseStatement("i := 1")],
							[],
						),
					],
				],
			});
			expect(disassemble(image.bytes)).toEqual([
				"0: LOAD 0",
				"2: JZ 11",
				"5: PUSH1",
				"6: STORE 1",
				"8: JMP 11",
				"11: RET",
			]);
		});
	});

	describe("blocks", () => {
		function timerNode(type: "TON" | "TOF" | "TP") {
			return BlocksBuilder.buildTimerNode(
				type,
				ident("in"),
				ident("last"),
				LiteralsBuilder.buildNumberNode(2000, undefined, "time"),
				ident("et"),
				ident("q"),
			);
		}
		const timerVariables = () => [
			plcVariable("in:BOOL"),
			plcVariable("last:internal-bool"),
			plcVariable("et:internal-number"),
			plcVariable("q:internal-bool"),
		];

		it.each([
			["TON", 0],
			["TOF", 1],
			["TP", 2],
		] as const)(
			"emits a %s block with its operands and pops an ignored output",
			(type, kind) => {
				const image = generate({
					variables: timerVariables(),
					routines: [[timerNode(type)]],
				});
				const { variableIndexByName: v } = image.layout;
				expect(code(image)).toEqual([
					`LOAD ${v.in}`,
					"PUSH16 2000",
					`TIMER ${kind} ${v.last} ${v.et} ${v.q}`,
					"POP",
					"RET",
				]);
				expect(image.layout.maxStack).toBe(2);
			},
		);

		it("uses the timer output as a value without popping it", () => {
			const image = generate({
				variables: [...timerVariables(), plcVariable("out:BOOL")],
				routines: [
					[
						BlocksBuilder.buildTimerNode(
							"TON",
							ident("in"),
							ident("last"),
							LiteralsBuilder.buildNumberNode(5),
							ident("et"),
							ident("q"),
						),
						parseStatement("out := q"),
					],
				],
			});
			expect(code(image).includes("POP")).toBe(true);
		});

		it("refuses a bit string preset or a wrong operand class", () => {
			expect(() =>
				generate({
					variables: [...timerVariables(), plcVariable("pt:WORD")],
					routines: [
						[
							BlocksBuilder.buildTimerNode(
								"TON",
								ident("in"),
								ident("last"),
								ident("pt"),
								ident("et"),
								ident("q"),
							),
						],
					],
				}),
			).toThrow(/WORD/);
			expect(() =>
				generate({
					variables: [
						plcVariable("in:BOOL"),
						plcVariable("last:internal-bool"),
						plcVariable("et:WORD"),
						plcVariable("q:internal-bool"),
					],
					routines: [[timerNode("TON")]],
				}),
			).toThrow(/storage class/);
		});

		it("emits CTU and CTUD counters", () => {
			const variables = [
				plcVariable("cu:BOOL"),
				plcVariable("cd:BOOL"),
				plcVariable("r:BOOL"),
				plcVariable("ld:BOOL"),
				plcVariable("lastu:internal-bool"),
				plcVariable("lastd:internal-bool"),
				plcVariable("cv:internal-number"),
				plcVariable("qu:internal-bool"),
				plcVariable("qd:internal-bool"),
			];
			const ctu = BlocksBuilder.buildCounterNode(
				"CTU",
				ident("cu"),
				ident("lastu"),
				ident("r"),
				LiteralsBuilder.buildNumberNode(3),
				ident("cv"),
				ident("qu"),
			);
			const ctud = BlocksBuilder.buildCounterNode(
				"CTUD",
				ident("cu"),
				ident("lastu"),
				ident("r"),
				LiteralsBuilder.buildNumberNode(3),
				ident("cv"),
				ident("qu"),
				{
					input: ident("cd"),
					lastInput: ident("lastd"),
					load: ident("ld"),
					output: ident("qd"),
				},
			);
			const image = generate({ variables, routines: [[ctu], [ctud]] });
			const { variableIndexByName: v } = image.layout;
			const lines = code(image);
			expect(lines).toContain(`COUNTER 0 ${v.lastu} ${v.cv} ${v.qu}`);
			expect(lines).toContain(
				`COUNTER 2 ${v.lastu} ${v.cv} ${v.qu} ${v.lastd} ${v.qd}`,
			);
			expect(image.layout.maxStack).toBe(5);
		});
	});

	describe("routines and calls", () => {
		function callerAndCallee() {
			const callee = PLCRoutine.fromNodes([parseStatement("i := i + 1")]);
			const compiled = compiledProject({
				variables: [plcVariable("a:BOOL"), plcVariable("i:INT")],
				routines: [["i := 0"]],
				routinesById: { sub: callee },
			});
			const main = new PLCRoutine([
				{ kind: "node", node: parseStatement("i := 0") },
				{ kind: "call", programId: "sub", condition: ident("a") },
			]);
			compiled.routines = [main];
			compiled.scanRoutineCount = 1;
			compiled.routinesById = { main, sub: callee };
			return compiled;
		}

		it("appends called routines after the scanned ones and emits a conditional CALL", () => {
			const image = generateBytecode({
				compiled: callerAndCallee(),
				ioBindings: [],
				cyclePeriodMs: 100,
			});
			expect(verifyBytecode(image.bytes, 1024)).toEqual({ valid: true });
			expect(image.layout).toMatchObject({
				routineCount: 2,
				scanCount: 1,
				maxCallDepth: 1,
				routineProgramIds: ["main", "sub"],
			});
			const lines = code(image);
			expect(lines).toContain("CALL 1");
			expect(lines.indexOf("CALL 1")).toBe(
				lines.findIndex((l) => l.startsWith("JZ")) + 1,
			);
		});

		it("leaves out the routines after the scanned ones and the uncalled ones", () => {
			const compiled = compiledProject({
				variables: [plcVariable("i:INT")],
				routines: [["i := 1"], ["i := 2"]],
			});
			compiled.scanRoutineCount = 1;
			const image = generateBytecode({
				compiled,
				ioBindings: [],
				cyclePeriodMs: 100,
			});
			expect(image.layout.routineCount).toBe(1);
		});

		it("refuses a call to a missing routine", () => {
			const compiled = compiledProject({
				variables: [plcVariable("a:BOOL")],
				routines: [[]],
			});
			compiled.routines = [
				new PLCRoutine([
					{ kind: "call", programId: "ghost", condition: ident("a") },
				]),
			];
			expect(() =>
				generateBytecode({ compiled, ioBindings: [], cyclePeriodMs: 100 }),
			).toThrow(/ghost/);
		});

		it("measures the deepest chain of nested calls", () => {
			const leaf = PLCRoutine.fromNodes([parseStatement("i := 1")]);
			const middle = new PLCRoutine([
				{ kind: "call", programId: "leaf", condition: ident("a") },
			]);
			const main = new PLCRoutine([
				{ kind: "call", programId: "middle", condition: ident("a") },
				{ kind: "call", programId: "leaf", condition: ident("a") },
			]);
			const compiled = compiledProject({
				variables: [plcVariable("a:BOOL"), plcVariable("i:INT")],
				routines: [[]],
			});
			compiled.routines = [main];
			compiled.routinesById = { main, middle, leaf };
			const image = generateBytecode({
				compiled,
				ioBindings: [],
				cyclePeriodMs: 100,
			});
			expect(verifyBytecode(image.bytes, 1024)).toEqual({ valid: true });
			expect(image.layout.maxCallDepth).toBe(2);
			expect(image.layout.routineProgramIds).toEqual([
				"main",
				"middle",
				"leaf",
			]);
		});
	});

	describe("I/O table", () => {
		const plc = [
			plcVariable("btn:BOOL", "input", "id-btn"),
			plcVariable("lamp:BOOL", "output", "id-lamp"),
			plcVariable("pot:INT", "input", "id-pot"),
			plcVariable("dim:INT", "output", "id-dim"),
			plcVariable("raw:BOOL", "input", "id-raw"),
		];
		const ioPlan: RemoteIoPlan = {
			pins: [
				{ pin: "2", mode: "IP" },
				{ pin: "13", mode: "O" },
				{ pin: "A0", mode: "A" },
				{ pin: "9", mode: "P" },
				{ pin: "4", mode: "I" },
			],
			inputs: [
				{ variableId: "id-btn", pin: "2", kind: "digital", inverted: true },
				{ variableId: "id-pot", pin: "A0", kind: "analog", inverted: false },
				{ variableId: "id-raw", pin: "4", kind: "digital", inverted: false },
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

		it("lists inputs then outputs with role, inversion bit and pin number", () => {
			const image = generate(
				{ variables: plc, routines: [["lamp := btn", "dim := pot"]] },
				ioPlan,
			);
			const { variableIndexByName: v } = image.layout;
			expect(image.layout.ioCount).toBe(5);
			const table = [...image.bytes.subarray(HEADER_SIZE, HEADER_SIZE + 15)];
			expect(table).toEqual([
				v.btn,
				1 | 8,
				2,
				v.pot,
				2,
				14,
				v.raw,
				0,
				4,
				v.lamp,
				3,
				13,
				v.dim,
				4,
				9,
			]);
		});

		it("keeps an I/O variable no program refers to", () => {
			const image = generate({ variables: plc, routines: [[]] }, ioPlan);
			expect(Object.keys(image.layout.variableIndexByName).sort()).toEqual([
				"btn",
				"dim",
				"lamp",
				"pot",
				"raw",
			]);
		});

		it("refuses a digital pin on a non-boolean variable and a duplicated pin", () => {
			expect(() =>
				generate(
					{ variables: plc, routines: [[]] },
					{
						...ioPlan,
						inputs: [
							{
								variableId: "id-pot",
								pin: "2",
								kind: "digital",
								inverted: false,
							},
						],
						outputs: [],
					},
				),
			).toThrow(/digital/);
			expect(() =>
				generate(
					{ variables: plc, routines: [[]] },
					{
						...ioPlan,
						inputs: [
							{
								variableId: "id-btn",
								pin: "2",
								kind: "digital",
								inverted: false,
							},
							{
								variableId: "id-raw",
								pin: "2",
								kind: "digital",
								inverted: false,
							},
						],
						outputs: [],
					},
				),
			).toThrow(/twice/);
		});
	});

	it("declares the system variables in table order of SYSTEM_VARIABLES", () => {
		expect(systemPlcVariables().map((variable) => variable.getName())).toEqual([
			"_SYS_FIRST_SCAN",
			"_SYS_TB_100ms",
			"_SYS_TB_200ms",
			"_SYS_TB_500ms",
			"_SYS_TB_1s",
			"_SYS_TB_2s",
		]);
	});
});
