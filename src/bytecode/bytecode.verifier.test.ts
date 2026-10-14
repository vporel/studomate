import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import {
	compiledProject,
	parseStatement,
	plcVariable,
	UNO_PIN_RANGE,
} from "@tests/utils/bytecode-program";
import {
	HEADER_OFFSETS,
	HEADER_SIZE,
	IO_ENTRY_SIZE,
	IO_INVERTED_BIT,
	IO_ROLE,
	MAX_PENDING_TARGETS,
	Op,
	SYSTEM_VARIABLE_IDS,
	TYPE_CODE,
} from "./bytecode-format";
import { imageChecksum } from "./bytecode-image";
import generateBytecode from "./bytecode.generator";
import verifyBytecode, { TOO_MANY_PENDING_JUMPS } from "./bytecode.verifier";

const ident = (name: string) => IdentifiersBuilder.buildIdentifierNode(name);

/** `i := 1` guarded by a branch: header, 1 routine, code 0..: LOAD 0, JZ, PUSH1, STORE 1, JMP, ... */
function sampleImage(): Uint8Array {
	const compiled = compiledProject({
		variables: [
			plcVariable("a:BOOL"),
			plcVariable("i:INT"),
			plcVariable("m:internal-number"),
		],
		routines: [
			[
				ControlsBuilder.buildIfControlNode(
					ident("a"),
					[parseStatement("i := 1")],
					[parseStatement("i := m + 2")],
				),
			],
		],
	});
	return generateBytecode({
		compiled,
		ioBindings: [],
		cyclePeriodMs: 100,
		pinRange: UNO_PIN_RANGE,
	}).bytes;
}

const CODE_START = HEADER_SIZE + 2;

/** Applies `mutate` and recomputes the checksum, so only the structure is wrong. */
function mutated(mutate: (image: Uint8Array) => void): Uint8Array {
	const image = sampleImage();
	mutate(image);
	const checksum = imageChecksum(image);
	image[HEADER_OFFSETS.crc16] = checksum & 0xff;
	image[HEADER_OFFSETS.crc16 + 1] = checksum >> 8;
	return image;
}

function withChecksum(image: Uint8Array): Uint8Array {
	const checksum = imageChecksum(image);
	image[HEADER_OFFSETS.crc16] = checksum & 0xff;
	image[HEADER_OFFSETS.crc16 + 1] = checksum >> 8;
	return image;
}

/** Hand-built image: the variable counts of `sampleImage`, no I/O table, the given tables and code. */
function crafted(config: {
	routines: number[];
	code: number[];
	sys?: number[][];
	maxStack?: number;
}): Uint8Array {
	const sys = config.sys ?? [];
	const tables = [
		...sys.flat(),
		...config.routines.flatMap((offset) => [offset & 0xff, offset >> 8]),
	];
	const image = new Uint8Array(
		HEADER_SIZE + tables.length + config.code.length,
	);
	image.set(sampleImage().subarray(0, HEADER_SIZE));
	image[HEADER_OFFSETS.ioCount] = 0;
	image[HEADER_OFFSETS.sysCount] = sys.length;
	image[HEADER_OFFSETS.routineCount] = config.routines.length;
	image[HEADER_OFFSETS.scanCount] = Math.min(1, config.routines.length);
	image[HEADER_OFFSETS.maxStack] = config.maxStack ?? 4;
	image[HEADER_OFFSETS.codeSize] = config.code.length & 0xff;
	image[HEADER_OFFSETS.codeSize + 1] = config.code.length >> 8;
	image.set([...tables, ...config.code], HEADER_SIZE);
	return withChecksum(image);
}

/** `count` conditional jumps to distinct forward addresses (starts of the filler pairs), then filler, then RET. */
function pendingJumpsCode(count: number): number[] {
	const filler = 40;
	const fillerStart = count * 4;
	const code: number[] = [];
	for (let i = 0; i < count; i++) {
		const target = fillerStart + 2 * i;
		code.push(Op.PUSH0, Op.JZ, target & 0xff, target >> 8);
	}
	for (let i = 0; i < filler; i++) code.push(Op.PUSH0, Op.POP);
	code.push(Op.RET);
	return code;
}

const reason = (image: Uint8Array, capacity = 1024) => {
	const result = verifyBytecode(image, capacity, UNO_PIN_RANGE);
	return result.valid ? null : result.reason;
};

describe("verifyBytecode pin range", () => {
	const imageOnPin = (pin: number) =>
		generateBytecode({
			compiled: compiledProject({
				variables: [plcVariable("lamp:BOOL", "memory", "id-lamp")],
				routines: [[]],
			}),
			ioBindings: [
				{ variableId: "id-lamp", role: IO_ROLE.DIGITAL_OUTPUT, pin },
			],
			cyclePeriodMs: 100,
			pinRange: { min: 2, max: 40 },
		}).bytes;

	it.each([
		[3, false],
		[4, true],
		[6, true],
		[7, false],
	])("with the range 4..6, pin %i is accepted: %s", (pin, accepted) => {
		const result = verifyBytecode(imageOnPin(pin), 1024, { min: 4, max: 6 });
		expect(result.valid).toBe(accepted);
		if (!result.valid) expect(result.reason).toBe("invalid or duplicated pin");
	});

	it("accepts or refuses the same image depending on the range given", () => {
		const image = imageOnPin(3);
		expect(verifyBytecode(image, 1024, UNO_PIN_RANGE)).toEqual({ valid: true });
		expect(verifyBytecode(image, 1024, { min: 4, max: 6 }).valid).toBe(false);
	});
});

describe("verifyBytecode", () => {
	it("accepts a generated image", () => {
		expect(verifyBytecode(sampleImage(), 1024, UNO_PIN_RANGE)).toEqual({
			valid: true,
		});
	});

	describe("header", () => {
		it("refuses a too short image", () => {
			expect(reason(new Uint8Array(10))).toMatch(/header/);
		});

		it("refuses a bad magic, version and reserved byte", () => {
			expect(reason(mutated((i) => (i[0] = 0)))).toMatch(/magic/);
			expect(
				reason(mutated((i) => (i[HEADER_OFFSETS.formatVersion] = 2))),
			).toMatch(/version/);
			expect(reason(mutated((i) => (i[HEADER_OFFSETS.reserved] = 1)))).toMatch(
				/reserved/,
			);
		});

		it("refuses an image bigger than the storage", () => {
			expect(reason(sampleImage(), 20)).toMatch(/larger/);
		});

		it("refuses a size that differs from the header", () => {
			const image = sampleImage();
			expect(reason(image.subarray(0, image.length - 1))).toMatch(/size/);
		});

		it("refuses a wrong CRC", () => {
			const image = sampleImage();
			image[CODE_START] ^= 0xff;
			expect(reason(image)).toBe("bad CRC");
		});

		it("refuses more scanned routines than routines", () => {
			expect(reason(mutated((i) => (i[HEADER_OFFSETS.scanCount] = 2)))).toMatch(
				/scanned/,
			);
		});
	});

	describe("tables", () => {
		it("refuses a first routine offset that is not 0", () => {
			expect(reason(mutated((i) => (i[HEADER_SIZE] = 1)))).toMatch(
				/start at 0/,
			);
		});
	});

	describe("code", () => {
		it("refuses an unknown opcode", () => {
			expect(reason(mutated((i) => (i[CODE_START] = 0xee)))).toBe(
				"unknown opcode",
			);
		});

		it("refuses a variable index out of range", () => {
			expect(reason(mutated((i) => (i[CODE_START + 1] = 200)))).toMatch(
				/variable index/,
			);
		});

		it("refuses a jump into the middle of an instruction", () => {
			// JZ at offset 2: operand bytes at 3 and 4. Point it at 6 (inside PUSH1/STORE operands).
			const image = mutated((i) => {
				i[CODE_START + 3] = 7;
			});
			expect(reason(image)).toMatch(/middle|depth|range/);
		});

		it("refuses a jump target outside the routine", () => {
			expect(reason(mutated((i) => (i[CODE_START + 3] = 250)))).toMatch(
				/range/,
			);
		});

		it("refuses a stack deeper than declared", () => {
			expect(reason(mutated((i) => (i[HEADER_OFFSETS.maxStack] = 0)))).toMatch(
				/deeper/,
			);
		});

		it("refuses a RET before the end of the routine", () => {
			expect(reason(mutated((i) => (i[CODE_START] = Op.RET)))).toMatch(
				/RET|non-empty|unreachable/,
			);
		});

		it("refuses dead code after an unconditional jump", () => {
			// The else part starts right after JMP: turn the JZ target into the JMP's own target.
			const image = sampleImage();
			const jzOperand = CODE_START + 3;
			const jmpTarget = image[CODE_START + 9] | (image[CODE_START + 10] << 8);
			const dead = mutated((i) => {
				i[jzOperand] = jmpTarget & 0xff;
				i[jzOperand + 1] = jmpTarget >> 8;
			});
			expect(reason(dead)).toMatch(/unreachable/);
		});

		it("refuses an arithmetic type that is a bit string", () => {
			const image = mutated((i) => {
				const at = CODE_START + [...i.subarray(CODE_START)].indexOf(Op.ADD);
				i[at + 1] = 2;
			});
			expect(reason(image)).toMatch(/arithmetic/);
		});
	});

	describe("blocks", () => {
		function blockImage(
			routine: Parameters<typeof compiledProject>[0]["routines"],
		) {
			return generateBytecode({
				compiled: compiledProject({
					variables: [
						plcVariable("in:BOOL"),
						plcVariable("down:BOOL"),
						plcVariable("r:BOOL"),
						plcVariable("last:internal-bool"),
						plcVariable("lastd:internal-bool"),
						plcVariable("et:internal-number"),
						plcVariable("q:internal-bool"),
						plcVariable("qd:internal-bool"),
					],
					routines: routine,
				}),
				ioBindings: [],
				cyclePeriodMs: 100,
				pinRange: UNO_PIN_RANGE,
			});
		}
		const ident = (name: string) =>
			IdentifiersBuilder.buildIdentifierNode(name);
		const withOperand = (
			generated: ReturnType<typeof blockImage>,
			opcode: number,
			operand: number,
			value: number,
		) => {
			const image = generated.bytes;
			const at = CODE_START + [...image.subarray(CODE_START)].indexOf(opcode);
			image[at + 1 + operand] = value;
			const checksum = imageChecksum(image);
			image[HEADER_OFFSETS.crc16] = checksum & 0xff;
			image[HEADER_OFFSETS.crc16 + 1] = checksum >> 8;
			return image;
		};

		it("refuses an unknown timer kind", () => {
			const generated = blockImage([
				[
					BlocksBuilder.buildTimerNode(
						"TON",
						ident("in"),
						ident("last"),
						LiteralsBuilder.buildNumberNode(2000, undefined, "time"),
						ident("et"),
						ident("q"),
					),
				],
			]);
			expect(reason(generated.bytes.slice())).toBeNull();
			expect(reason(withOperand(generated, Op.TIMER, 0, 3))).toBe(
				"unknown timer kind",
			);
		});

		it("refuses a CTUD whose down operands are not booleans", () => {
			const generated = blockImage([
				[
					BlocksBuilder.buildCounterNode(
						"CTUD",
						ident("in"),
						ident("last"),
						ident("r"),
						LiteralsBuilder.buildNumberNode(3),
						ident("et"),
						ident("q"),
						{
							input: ident("down"),
							lastInput: ident("lastd"),
							load: ident("r"),
							output: ident("qd"),
						},
					),
				],
			]);
			expect(reason(generated.bytes.slice())).toBeNull();
			const nonBool = generated.layout.variableIndexByName.et;
			for (const operand of [4, 5]) {
				expect(
					reason(withOperand(generated, Op.COUNTER, operand, nonBool)),
				).toBe("wrong variable class in a block");
			}
		});
	});

	describe("I/O table", () => {
		const IN = 0;
		const OUT = 1;
		const ANALOG = 2;
		const entryAt = (entry: number) => HEADER_SIZE + entry * IO_ENTRY_SIZE;
		function ioImage() {
			return generateBytecode({
				compiled: compiledProject({
					variables: [
						plcVariable("in:BOOL", "memory", "id-in"),
						plcVariable("out:BOOL", "memory", "id-out"),
						plcVariable("an:INT", "memory", "id-an"),
					],
					routines: [[]],
				}),
				ioBindings: [
					{ variableId: "id-in", role: IO_ROLE.DIGITAL_INPUT, pin: 2 },
					{ variableId: "id-out", role: IO_ROLE.DIGITAL_OUTPUT, pin: 3 },
					{ variableId: "id-an", role: IO_ROLE.ANALOG_INPUT, pin: 14 },
				],
				cyclePeriodMs: 100,
				pinRange: UNO_PIN_RANGE,
			}).bytes;
		}
		function mutateIo(mutate: (image: Uint8Array) => void) {
			const image = ioImage();
			mutate(image);
			return withChecksum(image);
		}

		it("accepts the unmutated image, including an inverted digital input", () => {
			expect(reason(ioImage())).toBeNull();
			const inverted = mutateIo((i) => (i[entryAt(IN) + 1] |= IO_INVERTED_BIT));
			expect(reason(inverted)).toBeNull();
		});

		it("refuses a variable out of range", () => {
			expect(reason(mutateIo((i) => (i[entryAt(OUT)] = 200)))).toBe(
				"I/O variable out of range",
			);
		});

		it("refuses an unknown role", () => {
			const image = mutateIo((i) => (i[entryAt(OUT) + 1] = 5));
			expect(reason(image)).toBe("unknown I/O role");
		});

		it("refuses reserved flag bits", () => {
			const image = mutateIo((i) => (i[entryAt(OUT) + 1] |= 0x10));
			expect(reason(image)).toBe("reserved I/O bits set");
		});

		it("refuses an inverted output and an inverted analog input", () => {
			for (const entry of [OUT, ANALOG]) {
				const image = mutateIo(
					(i) => (i[entryAt(entry) + 1] |= IO_INVERTED_BIT),
				);
				expect(reason(image)).toBe("only a digital input can be inverted");
			}
		});

		it("refuses a duplicated pin", () => {
			const image = mutateIo((i) => (i[entryAt(OUT) + 2] = i[entryAt(IN) + 2]));
			expect(reason(image)).toBe("invalid or duplicated pin");
		});

		it("refuses a pin outside the range", () => {
			const image = mutateIo((i) => (i[entryAt(OUT) + 2] = 250));
			expect(reason(image)).toBe("invalid or duplicated pin");
		});

		it("refuses a boolean variable bound to a non-digital role", () => {
			const image = mutateIo(
				(i) => (i[entryAt(OUT) + 1] = IO_ROLE.ANALOG_INPUT),
			);
			expect(reason(image)).toBe("I/O variable class does not suit its role");
		});

		it("refuses a numeric variable bound to a digital role", () => {
			for (const role of [IO_ROLE.DIGITAL_INPUT, IO_ROLE.DIGITAL_OUTPUT]) {
				const image = mutateIo((i) => (i[entryAt(ANALOG) + 1] = role));
				expect(reason(image)).toBe("I/O variable class does not suit its role");
			}
		});
	});

	describe("system table", () => {
		function sysImage() {
			return generateBytecode({
				compiled: compiledProject({
					variables: [plcVariable("lamp:BOOL"), plcVariable("n:INT")],
					routines: [["lamp := _SYS_TB_200ms", "n := 1"]],
				}),
				ioBindings: [],
				cyclePeriodMs: 100,
				pinRange: UNO_PIN_RANGE,
			}).bytes;
		}

		it("accepts the unmutated image", () => {
			const image = sysImage();
			expect(image[HEADER_OFFSETS.sysCount]).toBe(1);
			expect(reason(image)).toBeNull();
		});

		it("refuses a system variable stored outside the 1-byte class", () => {
			const image = sysImage();
			image[HEADER_SIZE] = image[HEADER_OFFSETS.boolCount];
			expect(reason(withChecksum(image))).toBe(
				"system variable not in the 1-byte class",
			);
		});

		it("refuses an unknown system variable identifier", () => {
			const image = sysImage();
			image[HEADER_SIZE + 1] = SYSTEM_VARIABLE_IDS.length;
			expect(reason(withChecksum(image))).toBe("unknown system variable");
		});

		it("refuses more system entries than system variables", () => {
			const image = crafted({
				sys: Array.from({ length: SYSTEM_VARIABLE_IDS.length + 1 }, () => [
					0, 0,
				]),
				routines: [0],
				code: [Op.RET],
			});
			expect(reason(image)).toBe("too many system variables");
		});
	});

	describe("counts and routine table", () => {
		it("refuses too many variables", () => {
			const image = mutated((i) => (i[HEADER_OFFSETS.boolCount] = 251));
			expect(reason(image)).toBe("too many variables");
		});

		it("refuses too many routines", () => {
			const image = crafted({
				routines: Array.from({ length: 251 }, () => 0),
				code: [],
			});
			expect(reason(image)).toBe("too many routines");
		});

		it("refuses a routine offset out of the code", () => {
			const image = crafted({ routines: [0, 5], code: [Op.RET] });
			expect(reason(image)).toBe("routine offset out of the code");
		});

		it("refuses routine offsets that do not increase", () => {
			const image = crafted({
				routines: [0, 1, 1],
				code: [Op.RET, Op.RET, Op.RET],
			});
			expect(reason(image)).toBe("routine offsets must be strictly increasing");
		});

		it("refuses code without routine", () => {
			const image = crafted({ routines: [], code: [Op.RET] });
			expect(reason(image)).toBe("code without routine");
		});
	});

	describe("calls and returns", () => {
		it("accepts a CALL with an empty stack to an existing routine", () => {
			const image = crafted({
				routines: [0, 3],
				code: [Op.CALL, 1, Op.RET, Op.RET],
			});
			expect(reason(image)).toBeNull();
		});

		it("refuses a CALL with a non-empty stack", () => {
			const image = crafted({
				routines: [0, 5],
				code: [Op.PUSH1, Op.CALL, 1, Op.POP, Op.RET, Op.RET],
			});
			expect(reason(image)).toBe("CALL with a non-empty stack");
		});

		it("refuses a CALL to a routine index out of range", () => {
			const image = crafted({ routines: [0], code: [Op.CALL, 1, Op.RET] });
			expect(reason(image)).toBe("routine index out of range");
		});

		it("refuses a RET with a non-empty stack", () => {
			const image = crafted({ routines: [0], code: [Op.PUSH1, Op.RET] });
			expect(reason(image)).toBe("RET with a non-empty stack");
		});

		it("refuses a routine that does not end with RET", () => {
			const image = crafted({ routines: [0], code: [Op.PUSH1, Op.POP] });
			expect(reason(image)).toBe("routine does not end with RET");
		});
	});

	describe("jumps", () => {
		const jz = (target: number) => [Op.JZ, target & 0xff, target >> 8];
		const jmp = (target: number) => [Op.JMP, target & 0xff, target >> 8];

		it("accepts nested forward jumps up to the pending limit", () => {
			const image = crafted({
				routines: [0],
				code: pendingJumpsCode(MAX_PENDING_TARGETS),
			});
			expect(reason(image)).toBeNull();
		});

		it("refuses more nested pending jumps than the VM can check", () => {
			const image = crafted({
				routines: [0],
				code: pendingJumpsCode(MAX_PENDING_TARGETS + 1),
			});
			expect(reason(image)).toBe(TOO_MANY_PENDING_JUMPS);
		});

		it("refuses two jumps to one address with different stack depths", () => {
			// JZ at 1 targets 9 with depth 0, JNZ at 6 targets 9 with depth 1.
			const code = [
				Op.PUSH1,
				...jz(9),
				Op.PUSH1,
				Op.PUSH1,
				Op.JNZ,
				9,
				0,
				Op.RET,
			];
			expect(reason(crafted({ routines: [0], code }))).toBe(
				"stack depth mismatch at a jump",
			);
		});

		it("refuses a fall-through whose depth differs from the jump target depth", () => {
			// JZ at 1 targets the RET at 7 with depth 0, the fall-through arrives with depth 1.
			const code = [Op.PUSH1, ...jz(7), Op.PUSH1, Op.PUSH1, Op.POP, Op.RET];
			expect(reason(crafted({ routines: [0], code }))).toBe(
				"stack depth mismatch at a jump target",
			);
		});

		it("refuses a jump backwards", () => {
			const code = [Op.PUSH1, Op.POP, ...jmp(0), Op.RET];
			expect(reason(crafted({ routines: [0], code }))).toBe(
				"jump target out of range",
			);
		});

		it("refuses a conditional jump on an empty stack", () => {
			const code = [...jz(4), Op.RET];
			expect(reason(crafted({ routines: [0], code }))).toBe("stack underflow");
		});

		it("refuses a keeping jump on an empty stack", () => {
			const code = [Op.JZK, 4, 0, Op.RET];
			expect(reason(crafted({ routines: [0], code }))).toBe("stack underflow");
		});
	});

	describe("instructions", () => {
		it("refuses operands running past the routine", () => {
			const code = [Op.RET, Op.LOAD];
			expect(reason(crafted({ routines: [0, 1], code }))).toBe(
				"operands outside the routine",
			);
		});

		it("refuses an unknown counter kind", () => {
			const code = [Op.COUNTER, 3, 0, 0, 0, Op.RET];
			expect(reason(crafted({ routines: [0], code }))).toBe(
				"unknown counter kind",
			);
		});

		it("refuses an invalid comparison", () => {
			for (const value of [6, 0x10]) {
				const code = [Op.PUSH1, Op.PUSH1, Op.CMP, value, Op.POP, Op.RET];
				expect(reason(crafted({ routines: [0], code }))).toBe(
					"invalid comparison",
				);
			}
		});

		it("refuses a conversion to a type that is not an integer", () => {
			const code = [Op.PUSH1, Op.CONV, TYPE_CODE.BOOL, Op.POP, Op.RET];
			expect(reason(crafted({ routines: [0], code }))).toBe(
				"type not allowed in a conversion",
			);
		});

		it("refuses popping an empty stack", () => {
			const code = [Op.POP, Op.RET];
			expect(reason(crafted({ routines: [0], code }))).toBe("stack underflow");
		});
	});
});
