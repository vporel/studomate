import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import {
	compiledProject,
	parseStatement,
	plcVariable,
} from "@tests/utils/bytecode-program";
import { HEADER_OFFSETS, HEADER_SIZE, Op } from "./bytecode-format";
import generateBytecode, { imageChecksum } from "./bytecode.generator";
import verifyBytecode from "./bytecode.verifier";

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

const reason = (image: Uint8Array, capacity = 1024) => {
	const result = verifyBytecode(image, capacity);
	return result.valid ? null : result.reason;
};

describe("verifyBytecode", () => {
	it("accepts a generated image", () => {
		expect(verifyBytecode(sampleImage(), 1024)).toEqual({ valid: true });
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
});
