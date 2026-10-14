import {
	SYSTEM_VARIABLES,
	type SystemVariable,
} from "@/schemas/variable/system-variables";

export const MAGIC = [0x53, 0x54, 0x44, 0x4d] as const; // "STDM"
export const FORMAT_VERSION = 1;
export const HEADER_SIZE = 26;
export const IO_ENTRY_SIZE = 3;
export const SYS_ENTRY_SIZE = 2;
export const ROUTINE_ENTRY_SIZE = 2;
/** Variables and routines are indexed on one byte. */
export const MAX_INDEXED_ENTRIES = 250;
export const MAX_PENDING_TARGETS = 16;

export const HEADER_OFFSETS = {
	formatVersion: 4,
	reserved: 5,
	cyclePeriodMs: 6,
	boolCount: 8,
	intCount: 9,
	wordCount: 10,
	int32Count: 11,
	ioCount: 12,
	sysCount: 13,
	routineCount: 14,
	scanCount: 15,
	maxStack: 16,
	maxCallDepth: 17,
	codeSize: 18,
	crc16: 20,
	imageId: 22,
} as const;

/** Type code of an operation (arithmetic, conversion). */
export const TYPE_CODE = {
	BOOL: 0,
	INT: 1,
	WORD: 2,
	DINT: 3,
	DWORD: 4,
	TIME: 5,
	INTERNAL: 6,
} as const;
export type TypeCode = (typeof TYPE_CODE)[keyof typeof TYPE_CODE];

/** Types an arithmetic opcode accepts: the signed ones. */
export const SIGNED_ARITHMETIC_TYPES: readonly TypeCode[] = [
	TYPE_CODE.INT,
	TYPE_CODE.DINT,
	TYPE_CODE.TIME,
	TYPE_CODE.INTERNAL,
];

export const Op = {
	PUSH0: 0x01,
	PUSH1: 0x02,
	PUSH8: 0x03,
	PUSH16: 0x04,
	PUSH32: 0x05,
	LOAD: 0x06,
	STORE: 0x07,
	POP: 0x08,
	ADD: 0x10,
	SUB: 0x11,
	MUL: 0x12,
	DIV: 0x13,
	NEG: 0x14,
	CONV: 0x15,
	CMP: 0x20,
	NOT: 0x21,
	JMP: 0x30,
	JZ: 0x31,
	JNZ: 0x32,
	JZK: 0x33,
	JNZK: 0x34,
	CALL: 0x40,
	RET: 0x41,
	TIMER: 0x50,
	COUNTER: 0x51,
} as const;
export type Opcode = (typeof Op)[keyof typeof Op];

export const CMP_OPERATORS = ["=", "!=", "<", "<=", ">", ">="] as const;
export const CMP_UNSIGNED_BIT = 0x08;

export const TIMER_KINDS = ["TON", "TOF", "TP"] as const;
export const COUNTER_KINDS = ["CTU", "CTD", "CTUD"] as const;
export const COUNTER_KIND_CTUD = COUNTER_KINDS.indexOf("CTUD");

/** Storage class of a variable, in index order. */
export type StorageClass = "bool" | "int" | "word" | "int32";
export const STORAGE_CLASSES: readonly StorageClass[] = [
	"bool",
	"int",
	"word",
	"int32",
];

export const IO_ROLE = {
	DIGITAL_INPUT: 0,
	DIGITAL_INPUT_PULLUP: 1,
	ANALOG_INPUT: 2,
	DIGITAL_OUTPUT: 3,
	PWM_OUTPUT: 4,
} as const;
export type IoRole = (typeof IO_ROLE)[keyof typeof IO_ROLE];
export const IO_INVERTED_BIT = 0x08;

export function isInputRole(role: number): boolean {
	return role <= IO_ROLE.ANALOG_INPUT;
}

/** Identifier of a system variable in the image: its position in `SYSTEM_VARIABLES`. */
export const SYSTEM_VARIABLE_IDS: readonly SystemVariable[] = SYSTEM_VARIABLES;

/** Operand layout and stack effect of the fixed-shape opcodes. */
export const OPCODE_SHAPES: Record<
	number,
	{ name: string; operandBytes: number; pops: number; pushes: number }
> = {
	[Op.PUSH0]: { name: "PUSH0", operandBytes: 0, pops: 0, pushes: 1 },
	[Op.PUSH1]: { name: "PUSH1", operandBytes: 0, pops: 0, pushes: 1 },
	[Op.PUSH8]: { name: "PUSH8", operandBytes: 1, pops: 0, pushes: 1 },
	[Op.PUSH16]: { name: "PUSH16", operandBytes: 2, pops: 0, pushes: 1 },
	[Op.PUSH32]: { name: "PUSH32", operandBytes: 4, pops: 0, pushes: 1 },
	[Op.LOAD]: { name: "LOAD", operandBytes: 1, pops: 0, pushes: 1 },
	[Op.STORE]: { name: "STORE", operandBytes: 1, pops: 1, pushes: 0 },
	[Op.POP]: { name: "POP", operandBytes: 0, pops: 1, pushes: 0 },
	[Op.ADD]: { name: "ADD", operandBytes: 1, pops: 2, pushes: 1 },
	[Op.SUB]: { name: "SUB", operandBytes: 1, pops: 2, pushes: 1 },
	[Op.MUL]: { name: "MUL", operandBytes: 1, pops: 2, pushes: 1 },
	[Op.DIV]: { name: "DIV", operandBytes: 1, pops: 2, pushes: 1 },
	[Op.NEG]: { name: "NEG", operandBytes: 1, pops: 1, pushes: 1 },
	[Op.CONV]: { name: "CONV", operandBytes: 1, pops: 1, pushes: 1 },
	[Op.CMP]: { name: "CMP", operandBytes: 1, pops: 2, pushes: 1 },
	[Op.NOT]: { name: "NOT", operandBytes: 0, pops: 1, pushes: 1 },
	[Op.JMP]: { name: "JMP", operandBytes: 2, pops: 0, pushes: 0 },
	[Op.JZ]: { name: "JZ", operandBytes: 2, pops: 1, pushes: 0 },
	[Op.JNZ]: { name: "JNZ", operandBytes: 2, pops: 1, pushes: 0 },
	[Op.JZK]: { name: "JZK", operandBytes: 2, pops: 0, pushes: 0 },
	[Op.JNZK]: { name: "JNZK", operandBytes: 2, pops: 0, pushes: 0 },
	[Op.CALL]: { name: "CALL", operandBytes: 1, pops: 0, pushes: 0 },
	[Op.RET]: { name: "RET", operandBytes: 0, pops: 0, pushes: 0 },
};

export const TIMER_OPERAND_BYTES = 4;
export const TIMER_POPS = 2;
/** `k lastIn current out` (CTU, CTD) or `k lastIn current out downLast downOut` (CTUD). */
export function counterOperandBytes(kind: number): number {
	return kind === COUNTER_KIND_CTUD ? 6 : 4;
}
export function counterPops(kind: number): number {
	return kind === COUNTER_KIND_CTUD ? 5 : 3;
}
