import {
	CMP_OPERATORS,
	COUNTER_KINDS,
	COUNTER_KIND_CTUD,
	FORMAT_VERSION,
	HEADER_OFFSETS,
	HEADER_SIZE,
	IO_ENTRY_SIZE,
	IO_INVERTED_BIT,
	IO_ROLE,
	MAGIC,
	MAX_INDEXED_ENTRIES,
	MAX_PENDING_TARGETS,
	OPCODE_SHAPES,
	Op,
	ROUTINE_ENTRY_SIZE,
	SIGNED_ARITHMETIC_TYPES,
	SYSTEM_VARIABLE_IDS,
	SYS_ENTRY_SIZE,
	TIMER_KINDS,
	TIMER_OPERAND_BYTES,
	TIMER_POPS,
	TYPE_CODE,
	counterOperandBytes,
	counterPops,
	type StorageClass,
	type TypeCode,
} from "./bytecode-format";
import { imageChecksum } from "./bytecode-image";
import type { PinNumberRange } from "@/hardware/hardware-device.descriptor";

/** Reason reported when conditional jumps are nested deeper than the VM can check. */
export const TOO_MANY_PENDING_JUMPS = "too many pending jumps";

export type BytecodeVerification =
	{ valid: true } | { valid: false; reason: string };

const CONVERSION_TYPES = [
	TYPE_CODE.INT,
	TYPE_CODE.WORD,
	TYPE_CODE.DINT,
	TYPE_CODE.DWORD,
	TYPE_CODE.TIME,
];
const ARITHMETIC_OPS: number[] = [Op.ADD, Op.SUB, Op.MUL, Op.DIV, Op.NEG];

class Refusal extends Error {}

function refuse(reason: string): never {
	throw new Refusal(reason);
}

/**
 * Structural check of an image, equivalent to the one the VM runs before executing a program
 * (`BYTECODE-SPEC.md`, §7.1). `capacityBytes` is the storage available to
 * the image.
 */
export default function verifyBytecode(
	image: Uint8Array,
	capacityBytes: number,
	pinRange: PinNumberRange,
): BytecodeVerification {
	try {
		check(image, capacityBytes, pinRange);
		return { valid: true };
	} catch (error) {
		if (error instanceof Refusal)
			return { valid: false, reason: error.message };
		throw error;
	}
}

function check(
	image: Uint8Array,
	capacityBytes: number,
	pinRange: PinNumberRange,
): void {
	if (image.length < HEADER_SIZE) refuse("image shorter than its header");
	if (MAGIC.some((byte, i) => image[i] !== byte)) refuse("bad magic");
	if (image[HEADER_OFFSETS.formatVersion] !== FORMAT_VERSION) {
		refuse("unknown format version");
	}
	if (image[HEADER_OFFSETS.reserved] !== 0) refuse("reserved byte is not 0");

	const u8 = (offset: number) => image[offset];
	const u16 = (offset: number) => image[offset] | (image[offset + 1] << 8);
	const boolCount = u8(HEADER_OFFSETS.boolCount);
	const intCount = u8(HEADER_OFFSETS.intCount);
	const wordCount = u8(HEADER_OFFSETS.wordCount);
	const int32Count = u8(HEADER_OFFSETS.int32Count);
	const ioCount = u8(HEADER_OFFSETS.ioCount);
	const sysCount = u8(HEADER_OFFSETS.sysCount);
	const routineCount = u8(HEADER_OFFSETS.routineCount);
	const scanCount = u8(HEADER_OFFSETS.scanCount);
	const maxStack = u8(HEADER_OFFSETS.maxStack);
	const codeSize = u16(HEADER_OFFSETS.codeSize);
	const varCount = boolCount + intCount + wordCount + int32Count;

	const ioStart = HEADER_SIZE;
	const sysStart = ioStart + ioCount * IO_ENTRY_SIZE;
	const routinesStart = sysStart + sysCount * SYS_ENTRY_SIZE;
	const codeStart = routinesStart + routineCount * ROUTINE_ENTRY_SIZE;
	const totalSize = codeStart + codeSize;
	if (totalSize > capacityBytes) refuse("image larger than the storage");
	if (totalSize !== image.length) refuse("image size differs from its header");
	if (imageChecksum(image) !== u16(HEADER_OFFSETS.crc16)) refuse("bad CRC");

	if (varCount > MAX_INDEXED_ENTRIES) refuse("too many variables");
	if (routineCount > MAX_INDEXED_ENTRIES) refuse("too many routines");
	if (scanCount > routineCount) refuse("more scanned routines than routines");
	if (sysCount > SYSTEM_VARIABLE_IDS.length)
		refuse("too many system variables");

	const classOf = (index: number): StorageClass =>
		index < boolCount
			? "bool"
			: index < boolCount + intCount
				? "int"
				: index < boolCount + intCount + wordCount
					? "word"
					: "int32";

	const pins = new Set<number>();
	for (let i = 0; i < ioCount; i++) {
		const entry = ioStart + i * IO_ENTRY_SIZE;
		const index = image[entry];
		const role = image[entry + 1] & 0x07;
		const flags = image[entry + 1] & ~0x07;
		const pin = image[entry + 2];
		if (index >= varCount) refuse("I/O variable out of range");
		if (role > IO_ROLE.PWM_OUTPUT) refuse("unknown I/O role");
		if ((flags & ~IO_INVERTED_BIT) !== 0) refuse("reserved I/O bits set");
		const digitalInput =
			role === IO_ROLE.DIGITAL_INPUT || role === IO_ROLE.DIGITAL_INPUT_PULLUP;
		if ((flags & IO_INVERTED_BIT) !== 0 && !digitalInput) {
			refuse("only a digital input can be inverted");
		}
		const digital = digitalInput || role === IO_ROLE.DIGITAL_OUTPUT;
		if ((classOf(index) === "bool") !== digital) {
			refuse("I/O variable class does not suit its role");
		}
		if (pin < pinRange.min || pin > pinRange.max || pins.has(pin)) {
			refuse("invalid or duplicated pin");
		}
		pins.add(pin);
	}
	for (let i = 0; i < sysCount; i++) {
		const entry = sysStart + i * SYS_ENTRY_SIZE;
		if (image[entry] >= boolCount)
			refuse("system variable not in the 1-byte class");
		if (image[entry + 1] >= SYSTEM_VARIABLE_IDS.length) {
			refuse("unknown system variable");
		}
	}

	const offsets: number[] = [];
	for (let i = 0; i < routineCount; i++) {
		offsets.push(u16(routinesStart + i * ROUTINE_ENTRY_SIZE));
	}
	if (routineCount > 0 && offsets[0] !== 0)
		refuse("first routine must start at 0");
	for (let i = 0; i < routineCount; i++) {
		if (offsets[i] >= codeSize) refuse("routine offset out of the code");
		if (i > 0 && offsets[i] <= offsets[i - 1]) {
			refuse("routine offsets must be strictly increasing");
		}
	}
	if (routineCount === 0 && codeSize !== 0) refuse("code without routine");

	for (let r = 0; r < routineCount; r++) {
		checkRoutine({
			image,
			code: codeStart,
			start: offsets[r],
			end: offsets[r + 1] ?? codeSize,
			varCount,
			routineCount,
			maxStack,
			classOf,
		});
	}
}

interface RoutineContext {
	image: Uint8Array;
	code: number;
	start: number;
	end: number;
	varCount: number;
	routineCount: number;
	maxStack: number;
	classOf: (index: number) => StorageClass;
}

function checkRoutine(context: RoutineContext): void {
	const { image, code, start, end, varCount, routineCount, maxStack, classOf } =
		context;
	const byteAt = (address: number) => image[code + address];
	const pending: { address: number; depth: number }[] = [];
	let depth: number | null = 0;
	let pc = start;
	const retAddress = end - 1;

	const addTarget = (address: number, targetDepth: number, from: number) => {
		if (address <= from || address > retAddress)
			refuse("jump target out of range");
		const existing = pending.find((entry) => entry.address === address);
		if (existing) {
			if (existing.depth !== targetDepth)
				refuse("stack depth mismatch at a jump");
			return;
		}
		if (pending.length >= MAX_PENDING_TARGETS) refuse(TOO_MANY_PENDING_JUMPS);
		pending.push({ address, depth: targetDepth });
		pending.sort((a, b) => a.address - b.address);
	};

	const requireVariable = (index: number) => {
		if (index >= varCount) refuse("variable index out of range");
	};
	const requireClass = (index: number, allowed: StorageClass[]) => {
		requireVariable(index);
		if (!allowed.includes(classOf(index)))
			refuse("wrong variable class in a block");
	};

	while (pc < end) {
		if (pending.length > 0 && pending[0].address < pc) {
			refuse("jump into the middle of an instruction");
		}
		if (pending.length > 0 && pending[0].address === pc) {
			const target = pending.shift()!;
			if (depth !== null && depth !== target.depth) {
				refuse("stack depth mismatch at a jump target");
			}
			depth = target.depth;
		} else if (depth === null) {
			refuse("unreachable code");
		}
		let current: number = depth!;

		const opcode = byteAt(pc);
		const shape = OPCODE_SHAPES[opcode];
		let length: number;
		let pops: number;
		let pushes: number;
		if (shape) {
			length = 1 + shape.operandBytes;
			pops = shape.pops;
			pushes = shape.pushes;
		} else if (opcode === Op.TIMER) {
			length = 1 + TIMER_OPERAND_BYTES;
			pops = TIMER_POPS;
			pushes = 1;
		} else if (opcode === Op.COUNTER) {
			if (pc + 1 >= end) refuse("operands outside the routine");
			const kind = byteAt(pc + 1);
			if (kind >= COUNTER_KINDS.length) refuse("unknown counter kind");
			length = 1 + counterOperandBytes(kind);
			pops = counterPops(kind);
			pushes = 1;
		} else {
			refuse("unknown opcode");
		}
		if (pc + length > end) refuse("operands outside the routine");

		if (opcode === Op.RET && pc !== retAddress)
			refuse("RET before the end of the routine");
		if (pc === retAddress && opcode !== Op.RET) {
			refuse("routine does not end with RET");
		}

		const operand = (i: number) => byteAt(pc + 1 + i);
		switch (opcode) {
			case Op.LOAD:
			case Op.STORE:
				requireVariable(operand(0));
				break;
			case Op.CALL:
				if (operand(0) >= routineCount) refuse("routine index out of range");
				if (current !== 0) refuse("CALL with a non-empty stack");
				break;
			case Op.CMP: {
				const value = operand(0);
				if ((value & 0x07) >= CMP_OPERATORS.length || (value & 0xf0) !== 0) {
					refuse("invalid comparison");
				}
				break;
			}
			case Op.TIMER:
				if (operand(0) >= TIMER_KINDS.length) refuse("unknown timer kind");
				requireClass(operand(1), ["bool"]);
				requireClass(operand(2), ["int", "int32"]);
				requireClass(operand(3), ["bool"]);
				break;
			case Op.COUNTER: {
				const kind = operand(0);
				requireClass(operand(1), ["bool"]);
				requireClass(operand(2), ["int", "int32"]);
				requireClass(operand(3), ["bool"]);
				if (kind === COUNTER_KIND_CTUD) {
					requireClass(operand(4), ["bool"]);
					requireClass(operand(5), ["bool"]);
				}
				break;
			}
			default:
				if (ARITHMETIC_OPS.includes(opcode)) {
					if (!SIGNED_ARITHMETIC_TYPES.includes(operand(0) as TypeCode)) {
						refuse("type not allowed in arithmetic");
					}
				} else if (opcode === Op.CONV) {
					if (!CONVERSION_TYPES.includes(operand(0) as never)) {
						refuse("type not allowed in a conversion");
					}
				}
		}

		if (current < pops) refuse("stack underflow");
		current = current - pops + pushes;
		if (current > maxStack) refuse("stack deeper than declared");

		switch (opcode) {
			case Op.JMP: {
				const target = operand(0) | (operand(1) << 8);
				addTarget(target, current, pc);
				depth = null;
				break;
			}
			case Op.JZ:
			case Op.JNZ: {
				const target = operand(0) | (operand(1) << 8);
				addTarget(target, current, pc);
				depth = current;
				break;
			}
			case Op.JZK:
			case Op.JNZK: {
				const target = operand(0) | (operand(1) << 8);
				if (current < 1) refuse("stack underflow");
				addTarget(target, current, pc);
				depth = current - 1;
				break;
			}
			case Op.RET:
				if (current !== 0) refuse("RET with a non-empty stack");
				if (pending.length > 0) refuse("jump past the end of the routine");
				depth = null;
				break;
			default:
				depth = current;
		}
		pc += length;
	}
}
