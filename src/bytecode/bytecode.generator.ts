import type { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import type {
	CounterNode,
	TimerNode,
} from "@/expression-language/ast/nodes/blocks";
import type { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import { getNumberLiteralKind } from "@/expression-language/ast/nodes/literals";
import FinderVisitor from "@/expression-language/ast/visitors/finder.visitor";
import type { ConvertibleType } from "@/expression-language/conversions";
import type { CompiledProject } from "@/project-compiler/project.compiler";
import PLCRoutine from "@/simulator/core/plc/plc-routine";
import type PLCVariable from "@/simulator/core/plc/plc-variable";
import PlcVariablesMapper from "@/simulator/environment-plc.mapper";
import { Environment } from "@/simulator/interpreter/environment/environment";
import NumericTypeAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/numeric-type-analyser.visitor";
import {
	isBitStringType,
	unifyNumericTypes,
	type NumericType,
} from "@/simulator/interpreter/semantic-analyser/numeric-typing";
import {
	CMP_OPERATORS,
	CMP_UNSIGNED_BIT,
	COUNTER_KINDS,
	FORMAT_VERSION,
	HEADER_OFFSETS,
	HEADER_SIZE,
	IO_ENTRY_SIZE,
	IO_INVERTED_BIT,
	IO_ROLE,
	MAGIC,
	MAX_INDEXED_ENTRIES,
	MAX_PIN_NUMBER,
	OPCODE_SHAPES,
	Op,
	SYSTEM_VARIABLE_IDS,
	SYS_ENTRY_SIZE,
	TIMER_KINDS,
	TYPE_CODE,
	type IoRole,
	type StorageClass,
	type TypeCode,
} from "./bytecode-format";
import BytecodeGenerationError from "./bytecode.error";
import { crc16CcittFalse, crc32 } from "./crc";

export interface BytecodeLayout {
	cyclePeriodMs: number;
	boolCount: number;
	intCount: number;
	wordCount: number;
	int32Count: number;
	ioCount: number;
	sysCount: number;
	routineCount: number;
	scanCount: number;
	maxStack: number;
	maxCallDepth: number;
	codeSize: number;
	/** Size in bytes of the code of each routine, in table order. */
	routineSizes: number[];
	/** Program identifier of each routine, in table order (`null`: a scanned routine with no id). */
	routineProgramIds: (string | null)[];
	/** Index in the image of each kept variable, by variable name. */
	variableIndexByName: Record<string, number>;
	/** Each kept variable with its storage class and type, in index order. */
	variables: VariableLayout[];
	imageSize: number;
}

export interface VariableLayout {
	name: string;
	index: number;
	storageClass: StorageClass;
	typeCode: TypeCode;
}

export interface BytecodeImage {
	bytes: Uint8Array;
	imageId: number;
	layout: BytecodeLayout;
}

/** A variable wired to a physical pin; the pin number means something to the target platform only. */
export interface IoBinding {
	variableId: string;
	role: IoRole;
	pin: number;
	/** Digital inputs only: the variable is true when the pin reads 0. */
	inverted?: boolean;
}

export interface BytecodeGeneratorInput {
	compiled: CompiledProject;
	ioBindings: IoBinding[];
	cyclePeriodMs: number;
}

interface VariableSlot {
	index: number;
	storageClass: StorageClass;
	typeCode: TypeCode;
}

const NUMERIC_TYPE_TO_CODE: Partial<Record<NumericType, TypeCode>> = {
	INT: TYPE_CODE.INT,
	WORD: TYPE_CODE.WORD,
	DINT: TYPE_CODE.DINT,
	DWORD: TYPE_CODE.DWORD,
	TIME: TYPE_CODE.TIME,
	ANY_NUM: TYPE_CODE.INTERNAL,
	ANY_INT: TYPE_CODE.INTERNAL,
};

const CONVERSION_TARGET_TO_CODE: Record<
	Exclude<ConvertibleType, "REAL">,
	TypeCode
> = {
	INT: TYPE_CODE.INT,
	WORD: TYPE_CODE.WORD,
	DINT: TYPE_CODE.DINT,
	DWORD: TYPE_CODE.DWORD,
};

const SIGNED_ARITHMETIC_TYPES: readonly TypeCode[] = [
	TYPE_CODE.INT,
	TYPE_CODE.DINT,
	TYPE_CODE.TIME,
	TYPE_CODE.INTERNAL,
];

const ARITHMETIC_OPCODES = {
	"+": Op.ADD,
	"-": Op.SUB,
	"*": Op.MUL,
	"/": Op.DIV,
} as const;

const MAX_INT32_PATTERN = 0xffffffff;

function storageOf(variable: PLCVariable): {
	storageClass: StorageClass;
	typeCode: TypeCode;
} {
	const declared = variable.getDeclaredType();
	const name = variable.getName();
	if (variable.getType() === "string" || declared === "STRING") {
		throw new BytecodeGenerationError(
			`Variable "${name}": the STRING type cannot be embedded.`,
		);
	}
	if (declared === "REAL") {
		throw new BytecodeGenerationError(
			`Variable "${name}": the REAL type cannot be embedded.`,
		);
	}
	if (variable.getType() === "boolean") {
		return { storageClass: "bool", typeCode: TYPE_CODE.BOOL };
	}
	switch (declared) {
		case "INT":
			return { storageClass: "int", typeCode: TYPE_CODE.INT };
		case "WORD":
			return { storageClass: "word", typeCode: TYPE_CODE.WORD };
		case "DINT":
			return { storageClass: "int32", typeCode: TYPE_CODE.DINT };
		case "DWORD":
			return { storageClass: "int32", typeCode: TYPE_CODE.DWORD };
		case "TIME":
			return { storageClass: "int32", typeCode: TYPE_CODE.TIME };
		default:
			return { storageClass: "int32", typeCode: TYPE_CODE.INTERNAL };
	}
}

/** Position-independent writer for one routine at a time, with forward-jump patching. */
class CodeEmitter {
	readonly bytes: number[] = [];
	depth = 0;
	maxDepth = 0;

	get offset(): number {
		return this.bytes.length;
	}

	op(opcode: number, operands: number[] = []): void {
		const shape = OPCODE_SHAPES[opcode];
		this.bytes.push(opcode, ...operands);
		if (shape) this.adjustDepth(shape.pops, shape.pushes);
	}

	/** Operand-carrying block opcodes manage their own stack effect. */
	adjustDepth(pops: number, pushes: number): void {
		if (this.depth < pops) {
			throw new BytecodeGenerationError("Internal error: stack underflow.");
		}
		this.depth += pushes - pops;
		this.maxDepth = Math.max(this.maxDepth, this.depth);
	}

	jump(opcode: number): number {
		this.op(opcode, [0, 0]);
		return this.bytes.length - 2;
	}

	/** Points the jump whose operand starts at `operandOffset` to the current position. */
	bind(operandOffset: number): void {
		this.bytes[operandOffset] = this.offset & 0xff;
		this.bytes[operandOffset + 1] = (this.offset >> 8) & 0xff;
	}
}

class ProgramGenerator {
	private readonly typeAnalyser: NumericTypeAnalyserVisitor;
	private readonly slotByName = new Map<string, VariableSlot>();
	private readonly routineIndex = new Map<PLCRoutine, number>();
	private readonly emitter = new CodeEmitter();

	constructor(
		private readonly compiled: CompiledProject,
		private readonly routinesToEmbed: PLCRoutine[],
		slots: Map<string, VariableSlot>,
	) {
		this.typeAnalyser = new NumericTypeAnalyserVisitor(
			new Environment(compiled.variables.map(PlcVariablesMapper.plcToEnv)),
		);
		slots.forEach((slot, name) => this.slotByName.set(name, slot));
		routinesToEmbed.forEach((routine, index) =>
			this.routineIndex.set(routine, index),
		);
	}

	generate(): { code: number[]; offsets: number[]; maxStack: number } {
		const offsets: number[] = [];
		for (const [position, routine] of this.routinesToEmbed.entries()) {
			offsets.push(this.emitter.offset);
			if (position === 0) this.emitConstantsPrologue();
			for (const instruction of routine.getInstructions()) {
				if (instruction.kind === "node") {
					this.emitStatement(instruction.node);
					continue;
				}
				this.emitExpression(instruction.condition);
				const skip = this.emitter.jump(Op.JZ);
				const callee = this.compiled.routinesById[instruction.programId];
				const index = callee && this.routineIndex.get(callee);
				if (index === undefined) {
					throw new BytecodeGenerationError(
						`Called program "${instruction.programId}" is missing.`,
					);
				}
				this.emitter.op(Op.CALL, [index]);
				this.emitter.bind(skip);
			}
			this.emitter.op(Op.RET);
			if (this.emitter.depth !== 0) {
				throw new BytecodeGenerationError("Internal error: unbalanced stack.");
			}
		}
		return {
			code: this.emitter.bytes,
			offsets,
			maxStack: this.emitter.maxDepth,
		};
	}

	/** Rewrites every constant of the image at the start of each cycle, ahead of the user
	 * routines: the firmware zeroes the memory when it loads an image. */
	private emitConstantsPrologue(): void {
		for (const variable of this.compiled.variables) {
			if (!variable.isConstant()) continue;
			const slot = this.slotByName.get(variable.getName());
			if (!slot) continue;
			const value = variable.getValue();
			if (typeof value === "boolean") {
				this.emitter.op(value ? Op.PUSH1 : Op.PUSH0);
			} else if (typeof value === "number") {
				this.emitConstant(value);
			} else {
				throw new BytecodeGenerationError("A string cannot be embedded.");
			}
			this.emitter.op(Op.STORE, [slot.index]);
		}
	}

	private slotOf(name: string): VariableSlot {
		const slot = this.slotByName.get(name);
		if (!slot) {
			throw new BytecodeGenerationError(
				`Variable "${name}" is not in the image.`,
			);
		}
		return slot;
	}

	private slotOfIdentifier(node: ASTNode, what: string): VariableSlot {
		if (node.type !== "IDENTIFIER") {
			throw new BytecodeGenerationError(`${what} must be a variable.`);
		}
		return this.slotOf(node.value);
	}

	private numericTypeOf(node: ASTNode): NumericType {
		return this.typeAnalyser.visit(node).type;
	}

	private operationTypeCode(node: ASTNode): TypeCode {
		const type = this.numericTypeOf(node);
		const code = NUMERIC_TYPE_TO_CODE[type];
		if (code === undefined) {
			throw new BytecodeGenerationError(
				`The ${type} type cannot be embedded (node ${node.type}).`,
			);
		}
		return code;
	}

	private signedArithmeticTypeCode(node: ASTNode): TypeCode {
		const code = this.operationTypeCode(node);
		if (!SIGNED_ARITHMETIC_TYPES.includes(code)) {
			throw new BytecodeGenerationError(
				"Arithmetic on a bit string (WORD, DWORD) cannot be embedded.",
			);
		}
		return code;
	}

	private assertNotBitString(node: ASTNode, what: string): void {
		const type = this.numericTypeOf(node);
		if (isBitStringType(type) || type === "REAL" || type === "ANY_REAL") {
			throw new BytecodeGenerationError(`${what} cannot be of type ${type}.`);
		}
	}

	private emitStatement(node: ASTNode): void {
		switch (node.type) {
			case "ASSIGN_STATEMENT": {
				const target = this.slotOfIdentifier(node.left, "Assignment target");
				this.emitExpression(node.right);
				this.emitter.op(Op.STORE, [target.index]);
				return;
			}
			case "IF_CONTROL": {
				this.emitExpression(node.condition);
				const skipTrue = this.emitter.jump(Op.JZ);
				node.trueBranch.forEach((statement) => this.emitStatement(statement));
				if (node.falseBranch === null) {
					this.emitter.bind(skipTrue);
					return;
				}
				const skipFalse = this.emitter.jump(Op.JMP);
				this.emitter.bind(skipTrue);
				node.falseBranch.forEach((statement) => this.emitStatement(statement));
				this.emitter.bind(skipFalse);
				return;
			}
			default:
				this.emitExpression(node);
				this.emitter.op(Op.POP);
		}
	}

	private emitExpression(node: ASTNode): void {
		switch (node.type) {
			case "IDENTIFIER":
				this.emitter.op(Op.LOAD, [this.slotOf(node.value).index]);
				return;
			case "BOOLEAN_LITERAL":
				this.emitter.op(node.value ? Op.PUSH1 : Op.PUSH0);
				return;
			case "NUMBER_LITERAL":
				if (getNumberLiteralKind(node) === "real") {
					throw new BytecodeGenerationError(
						`The real constant ${node.value} cannot be embedded.`,
					);
				}
				this.emitConstant(node.value);
				return;
			case "STRING_LITERAL":
				throw new BytecodeGenerationError("A string cannot be embedded.");
			case "UNARY_EXPRESSION":
				if (node.operator === "NOT") {
					this.emitExpression(node.expr);
					this.emitter.op(Op.NOT);
					return;
				}
				this.emitExpression(node.expr);
				this.emitter.op(Op.NEG, [this.signedArithmeticTypeCode(node)]);
				return;
			case "ARITHMETIC_EXPRESSION": {
				const type = this.signedArithmeticTypeCode(node);
				this.emitExpression(node.left);
				this.emitExpression(node.right);
				this.emitter.op(ARITHMETIC_OPCODES[node.operator], [type]);
				return;
			}
			case "COMPARISON_EXPRESSION": {
				const unified = unifyNumericTypes(
					this.typeAnalyser.visit(node.left),
					this.typeAnalyser.visit(node.right),
				);
				if (unified === null) {
					throw new BytecodeGenerationError(
						"Comparison between operands of incompatible types.",
					);
				}
				if (unified === "REAL" || unified === "ANY_REAL") {
					throw new BytecodeGenerationError(
						"A real comparison cannot be embedded.",
					);
				}
				this.emitExpression(node.left);
				this.emitExpression(node.right);
				const unsigned = isBitStringType(unified) ? CMP_UNSIGNED_BIT : 0;
				this.emitter.op(Op.CMP, [
					CMP_OPERATORS.indexOf(node.operator) | unsigned,
				]);
				return;
			}
			case "LOGICAL_EXPRESSION": {
				this.emitExpression(node.left);
				const end = this.emitter.jump(
					node.operator === "AND" ? Op.JZK : Op.JNZK,
				);
				this.emitter.depth--;
				this.emitExpression(node.right);
				this.emitter.bind(end);
				return;
			}
			case "CONVERSION_EXPRESSION":
				if (node.targetType === "REAL" || node.sourceType === "REAL") {
					throw new BytecodeGenerationError(
						"A conversion to or from REAL cannot be embedded.",
					);
				}
				this.emitExpression(node.expr);
				this.emitter.op(Op.CONV, [CONVERSION_TARGET_TO_CODE[node.targetType]]);
				return;
			case "TIMER_BLOCK":
				this.emitTimer(node);
				return;
			case "COUNTER_BLOCK":
				this.emitCounter(node);
				return;
			default:
				throw new BytecodeGenerationError(
					`${node.type} cannot be used as a value.`,
				);
		}
	}

	private emitConstant(value: number): void {
		if (
			!Number.isInteger(value) ||
			value < -0x80000000 ||
			value > MAX_INT32_PATTERN
		) {
			throw new BytecodeGenerationError(
				`The constant ${value} does not fit in 32 bits.`,
			);
		}
		const pattern = value >>> 0;
		const signed8 = (pattern << 24) >> 24;
		const signed16 = (pattern << 16) >> 16;
		if (pattern === 0) this.emitter.op(Op.PUSH0);
		else if (pattern === 1) this.emitter.op(Op.PUSH1);
		else if (signed8 >>> 0 === pattern) {
			this.emitter.op(Op.PUSH8, [pattern & 0xff]);
		} else if (signed16 >>> 0 === pattern) {
			this.emitter.op(Op.PUSH16, [pattern & 0xff, (pattern >>> 8) & 0xff]);
		} else {
			this.emitter.op(Op.PUSH32, [
				pattern & 0xff,
				(pattern >>> 8) & 0xff,
				(pattern >>> 16) & 0xff,
				pattern >>> 24,
			]);
		}
	}

	private blockSlot(
		node: ASTNode,
		what: string,
		allowed: StorageClass[],
	): VariableSlot {
		const slot = this.slotOfIdentifier(node, what);
		if (!allowed.includes(slot.storageClass)) {
			throw new BytecodeGenerationError(
				`${what} has a storage class (${slot.storageClass}) that a block cannot use.`,
			);
		}
		return slot;
	}

	private emitTimer(node: TimerNode): void {
		const lastIn = this.blockSlot(node.lastInput, "Timer edge memory", [
			"bool",
		]);
		const elapsed = this.blockSlot(node.elapsedTime, "Timer elapsed time", [
			"int",
			"int32",
		]);
		const out = this.blockSlot(node.output, "Timer output", ["bool"]);
		this.assertNotBitString(node.presetTime, "A timer preset");
		this.emitExpression(node.input);
		this.emitExpression(node.presetTime);
		this.emitter.bytes.push(
			Op.TIMER,
			TIMER_KINDS.indexOf(node.timerType),
			lastIn.index,
			elapsed.index,
			out.index,
		);
		this.emitter.adjustDepth(2, 1);
	}

	private emitCounter(node: CounterNode): void {
		const lastIn = this.blockSlot(node.lastInput, "Counter edge memory", [
			"bool",
		]);
		const current = this.blockSlot(node.currentValue, "Counter value", [
			"int",
			"int32",
		]);
		const out = this.blockSlot(node.output, "Counter output", ["bool"]);
		this.assertNotBitString(node.presetValue, "A counter preset");
		const down = node.down;
		this.emitExpression(node.input);
		this.emitExpression(node.control);
		this.emitExpression(node.presetValue);
		const operands: number[] = [
			COUNTER_KINDS.indexOf(node.counterType),
			lastIn.index,
			current.index,
			out.index,
		];
		if (down) {
			this.emitExpression(down.input);
			this.emitExpression(down.load);
			operands.push(
				this.blockSlot(down.lastInput, "Counter down edge memory", ["bool"])
					.index,
				this.blockSlot(down.output, "Counter down output", ["bool"]).index,
			);
		}
		this.emitter.bytes.push(Op.COUNTER, ...operands);
		this.emitter.adjustDepth(down ? 5 : 3, 1);
	}
}

function callsOf(routine: PLCRoutine, compiled: CompiledProject): PLCRoutine[] {
	return routine.getInstructions().flatMap((instruction) => {
		if (instruction.kind !== "call") return [];
		const callee = compiled.routinesById[instruction.programId];
		if (!callee) {
			throw new BytecodeGenerationError(
				`Called program "${instruction.programId}" is missing.`,
			);
		}
		return [callee];
	});
}

/**
 * Routines the image holds: the scanned ones first, then the ones they call, in discovery
 * order. Not `compiled.routines`, which includes the observation routine and leaves out the
 * routines only reached by a call.
 */
function collectRoutinesToEmbed(compiled: CompiledProject): PLCRoutine[] {
	const scanned = compiled.routines.slice(0, compiled.scanRoutineCount);
	const ordered = [...new Set(scanned)];
	for (let i = 0; i < ordered.length; i++) {
		for (const callee of callsOf(ordered[i], compiled)) {
			if (!ordered.includes(callee)) ordered.push(callee);
		}
	}
	return ordered;
}

function maxCallDepthOf(
	routinesToEmbed: PLCRoutine[],
	compiled: CompiledProject,
): number {
	const memo = new Map<PLCRoutine, number>();
	const depthOf = (routine: PLCRoutine): number => {
		const known = memo.get(routine);
		if (known !== undefined) return known;
		const depth = Math.max(
			0,
			...callsOf(routine, compiled).map((callee) => 1 + depthOf(callee)),
		);
		memo.set(routine, depth);
		return depth;
	};
	return Math.max(0, ...routinesToEmbed.map(depthOf));
}

function identifierNamesIn(routinesToEmbed: PLCRoutine[]): Set<string> {
	const names = new Set<string>();
	const finder = new FinderVisitor<IdentifierNode>("IDENTIFIER");
	for (const routine of routinesToEmbed) {
		for (const instruction of routine.getInstructions()) {
			const roots =
				instruction.kind === "node"
					? [instruction.node]
					: [instruction.condition];
			roots.forEach((root) =>
				finder.visit(root).forEach((identifier) => names.add(identifier.value)),
			);
		}
	}
	return names;
}

function assignSlots(
	variables: PLCVariable[],
	kept: (variable: PLCVariable) => boolean,
): { slots: Map<string, VariableSlot>; counts: Record<StorageClass, number> } {
	const keptVariables = variables.filter(kept);
	const counts: Record<StorageClass, number> = {
		bool: 0,
		int: 0,
		word: 0,
		int32: 0,
	};
	const storages = keptVariables.map((variable) => storageOf(variable));
	storages.forEach(({ storageClass }) => counts[storageClass]++);

	const total = keptVariables.length;
	if (total > MAX_INDEXED_ENTRIES) {
		throw new BytecodeGenerationError(
			`${total} variables exceed the limit of ${MAX_INDEXED_ENTRIES}.`,
		);
	}
	const nextIndex: Record<StorageClass, number> = {
		bool: 0,
		int: counts.bool,
		word: counts.bool + counts.int,
		int32: counts.bool + counts.int + counts.word,
	};
	const slots = new Map<string, VariableSlot>();
	keptVariables.forEach((variable, i) => {
		const { storageClass, typeCode } = storages[i];
		slots.set(variable.getName(), {
			index: nextIndex[storageClass]++,
			storageClass,
			typeCode,
		});
	});
	return { slots, counts };
}

function buildIoTable(
	bindings: IoBinding[],
	slotsById: Map<string, VariableSlot>,
): number[] {
	const seenPins = new Set<number>();
	const entries: number[] = [];
	for (const binding of bindings) {
		const slot = slotsById.get(binding.variableId);
		if (!slot) {
			throw new BytecodeGenerationError(
				`Variable "${binding.variableId}" wired to pin ${binding.pin} is not in the image.`,
			);
		}
		const digital =
			binding.role === IO_ROLE.DIGITAL_INPUT ||
			binding.role === IO_ROLE.DIGITAL_INPUT_PULLUP ||
			binding.role === IO_ROLE.DIGITAL_OUTPUT;
		if ((slot.storageClass === "bool") !== digital) {
			throw new BytecodeGenerationError(
				`Variable wired to pin ${binding.pin}: its type does not suit a ${digital ? "digital" : "analog"} pin.`,
			);
		}
		if (
			!(binding.pin >= 2 && binding.pin <= MAX_PIN_NUMBER) ||
			seenPins.has(binding.pin)
		) {
			throw new BytecodeGenerationError(
				`Pin ${binding.pin} is unknown or used twice.`,
			);
		}
		seenPins.add(binding.pin);
		entries.push(
			slot.index,
			binding.role | (binding.inverted ? IO_INVERTED_BIT : 0),
			binding.pin,
		);
	}
	return entries;
}

function writeU16(target: Uint8Array, offset: number, value: number): void {
	target[offset] = value & 0xff;
	target[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32(target: Uint8Array, offset: number, value: number): void {
	writeU16(target, offset, value & 0xffff);
	writeU16(target, offset + 2, value >>> 16);
}

/** CRC-16 of the whole image, its own field (bytes 20 and 21) excluded. */
export function imageChecksum(image: Uint8Array): number {
	const covered = new Uint8Array(image.length - 2);
	covered.set(image.subarray(0, HEADER_OFFSETS.crc16));
	covered.set(image.subarray(HEADER_OFFSETS.crc16 + 2), HEADER_OFFSETS.crc16);
	return crc16CcittFalse(covered);
}

/** Identity of an image: CRC-32 with its checksum and identifier fields zeroed. */
export function imageIdentifier(image: Uint8Array): number {
	const copy = new Uint8Array(image);
	writeU16(copy, HEADER_OFFSETS.crc16, 0);
	writeU32(copy, HEADER_OFFSETS.imageId, 0);
	return crc32(copy);
}

/**
 * Translates a compiled project into the bytecode image run by the Arduino VM
 * (`BYTECODE-SPEC.md`). Throws `BytecodeGenerationError` when the project
 * holds something the format cannot express: the analysis should have rejected it.
 */
export default function generateBytecode(
	input: BytecodeGeneratorInput,
): BytecodeImage {
	const { compiled, cyclePeriodMs } = input;
	if (
		!Number.isInteger(cyclePeriodMs) ||
		cyclePeriodMs < 1 ||
		cyclePeriodMs > 0xffff
	) {
		throw new BytecodeGenerationError(
			`The cycle period (${cyclePeriodMs} ms) must be between 1 and 65535 ms.`,
		);
	}

	const routinesToEmbed = collectRoutinesToEmbed(compiled);
	if (routinesToEmbed.length > MAX_INDEXED_ENTRIES) {
		throw new BytecodeGenerationError(
			`${routinesToEmbed.length} routines exceed the limit of ${MAX_INDEXED_ENTRIES}.`,
		);
	}
	const scanCount = new Set(
		compiled.routines.slice(0, compiled.scanRoutineCount),
	).size;

	const referenced = identifierNamesIn(routinesToEmbed);
	const ioVariableIds = new Set(
		input.ioBindings.map((binding) => binding.variableId),
	);
	const systemNames = new Set(
		SYSTEM_VARIABLE_IDS.map((variable) => variable.name),
	);
	const { slots, counts } = assignSlots(
		compiled.variables,
		(variable) =>
			ioVariableIds.has(variable.getId()) || referenced.has(variable.getName()),
	);
	const slotsById = new Map<string, VariableSlot>();
	for (const variable of compiled.variables) {
		const slot = slots.get(variable.getName());
		if (slot) slotsById.set(variable.getId(), slot);
	}
	for (const name of referenced) {
		if (!slots.has(name) && !systemNames.has(name)) {
			throw new BytecodeGenerationError(`Variable "${name}" is not declared.`);
		}
	}

	const sysTable: number[] = [];
	SYSTEM_VARIABLE_IDS.forEach((variable, id) => {
		const slot = slots.get(variable.name);
		if (!slot) return;
		if (slot.storageClass !== "bool") {
			throw new BytecodeGenerationError(
				`System variable ${variable.name} must be boolean.`,
			);
		}
		sysTable.push(slot.index, id);
	});

	const ioTable = buildIoTable(input.ioBindings, slotsById);
	const { code, offsets, maxStack } = new ProgramGenerator(
		compiled,
		routinesToEmbed,
		slots,
	).generate();
	const maxCallDepth = maxCallDepthOf(routinesToEmbed, compiled);

	const routineTable = offsets.flatMap((offset) => [
		offset & 0xff,
		offset >> 8,
	]);
	const layout: BytecodeLayout = {
		cyclePeriodMs,
		boolCount: counts.bool,
		intCount: counts.int,
		wordCount: counts.word,
		int32Count: counts.int32,
		ioCount: ioTable.length / IO_ENTRY_SIZE,
		sysCount: sysTable.length / SYS_ENTRY_SIZE,
		routineCount: routinesToEmbed.length,
		scanCount,
		maxStack,
		maxCallDepth,
		codeSize: code.length,
		routineSizes: offsets.map(
			(offset, i) => (offsets[i + 1] ?? code.length) - offset,
		),
		routineProgramIds: routinesToEmbed.map(
			(routine) =>
				Object.entries(compiled.routinesById).find(
					([, candidate]) => candidate === routine,
				)?.[0] ?? null,
		),
		variableIndexByName: Object.fromEntries(
			[...slots].map(([name, slot]) => [name, slot.index]),
		),
		variables: [...slots]
			.map(([name, slot]) => ({ name, ...slot }))
			.sort((a, b) => a.index - b.index),
		imageSize:
			HEADER_SIZE +
			ioTable.length +
			sysTable.length +
			routineTable.length +
			code.length,
	};
	for (const [field, value] of [
		["maxStack", maxStack],
		["maxCallDepth", maxCallDepth],
		["code size", code.length],
	] as const) {
		const limit = field === "code size" ? 0xffff : 0xff;
		if (value > limit) {
			throw new BytecodeGenerationError(
				`The ${field} (${value}) exceeds the format limit (${limit}).`,
			);
		}
	}

	const bytes = new Uint8Array(layout.imageSize);
	bytes.set(MAGIC, 0);
	bytes[HEADER_OFFSETS.formatVersion] = FORMAT_VERSION;
	writeU16(bytes, HEADER_OFFSETS.cyclePeriodMs, cyclePeriodMs);
	bytes[HEADER_OFFSETS.boolCount] = layout.boolCount;
	bytes[HEADER_OFFSETS.intCount] = layout.intCount;
	bytes[HEADER_OFFSETS.wordCount] = layout.wordCount;
	bytes[HEADER_OFFSETS.int32Count] = layout.int32Count;
	bytes[HEADER_OFFSETS.ioCount] = layout.ioCount;
	bytes[HEADER_OFFSETS.sysCount] = layout.sysCount;
	bytes[HEADER_OFFSETS.routineCount] = layout.routineCount;
	bytes[HEADER_OFFSETS.scanCount] = layout.scanCount;
	bytes[HEADER_OFFSETS.maxStack] = maxStack;
	bytes[HEADER_OFFSETS.maxCallDepth] = maxCallDepth;
	writeU16(bytes, HEADER_OFFSETS.codeSize, code.length);
	bytes.set([...ioTable, ...sysTable, ...routineTable, ...code], HEADER_SIZE);

	const imageId = imageIdentifier(bytes);
	writeU32(bytes, HEADER_OFFSETS.imageId, imageId);
	writeU16(bytes, HEADER_OFFSETS.crc16, imageChecksum(bytes));

	return { bytes, imageId, layout };
}
