import type { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { Dialect } from "@/expression-language/dialect.enum";
import { parseExpressionCached } from "@/expression-language/parse-expression-cached";
import {
	Op,
	OPCODE_SHAPES,
	counterOperandBytes,
	TIMER_OPERAND_BYTES,
	HEADER_SIZE,
	HEADER_OFFSETS,
	IO_ENTRY_SIZE,
	SYS_ENTRY_SIZE,
	ROUTINE_ENTRY_SIZE,
} from "@/bytecode/bytecode-format";
import type { CompiledProject } from "@/project-compiler/project.compiler";
import PLCRoutine from "@/simulator/core/plc/plc-routine";
import PLCVariable, {
	type PLCVariableScope,
} from "@/simulator/core/plc/plc-variable";
import { getNumericRange } from "@/schemas/variable/variable.schema";
import type { VariableType } from "@/schemas/variable/variable.schema";
import { SYSTEM_VARIABLES } from "@/schemas/variable/system-variables";
import { VARIABLE_TYPE_TO_NATIVE_TYPE } from "@/schemas/variable/variable.schema";

/** `name:TYPE` (declared type) or `name:internal-bool` / `name:internal-number`. */
export function plcVariable(
	spec: string,
	scope: PLCVariableScope = "memory",
	id?: string,
): PLCVariable {
	const [name, type] = spec.split(":");
	if (type === "internal-bool") {
		return new PLCVariable(id ?? name, name, scope, "boolean");
	}
	if (type === "internal-number") {
		return new PLCVariable(id ?? name, name, scope, "number");
	}
	const declared = type as VariableType;
	return new PLCVariable(
		id ?? name,
		name,
		scope,
		VARIABLE_TYPE_TO_NATIVE_TYPE[declared],
		getNumericRange(declared),
		declared,
	);
}

export function systemPlcVariables(): PLCVariable[] {
	return SYSTEM_VARIABLES.map((variable) =>
		plcVariable(`${variable.name}:BOOL`),
	);
}

export function parseStatement(text: string): ASTNode {
	return parseExpressionCached(text, Dialect.EN).ast;
}

/**
 * Hand-built compiled project: every routine is a list of statements (source text or AST).
 * System variables are always declared, as in a real compilation.
 */
export function compiledProject(config: {
	variables: PLCVariable[];
	routines: (string | ASTNode)[][];
	routinesById?: Record<string, PLCRoutine>;
}): CompiledProject {
	const routines = config.routines.map((statements) =>
		PLCRoutine.fromNodes(
			statements.map((statement) =>
				typeof statement === "string" ? parseStatement(statement) : statement,
			),
		),
	);
	return {
		variables: [...config.variables, ...systemPlcVariables()],
		routines,
		scanRoutineCount: routines.length,
		routinesById: config.routinesById ?? {},
		timers: [],
		counters: [],
		observableExpressionVariableIds: {},
	};
}

/** Readable listing of the code section of an image, one line per instruction. */
export function disassemble(image: Uint8Array): string[] {
	const u8 = (offset: number) => image[offset];
	const u16 = (offset: number) => image[offset] | (image[offset + 1] << 8);
	const routineCount = u8(HEADER_OFFSETS.routineCount);
	const codeStart =
		HEADER_SIZE +
		u8(HEADER_OFFSETS.ioCount) * IO_ENTRY_SIZE +
		u8(HEADER_OFFSETS.sysCount) * SYS_ENTRY_SIZE +
		routineCount * ROUTINE_ENTRY_SIZE;
	const codeSize = u16(HEADER_OFFSETS.codeSize);
	const lines: string[] = [];
	let pc = 0;
	while (pc < codeSize) {
		const at = codeStart + pc;
		const opcode = image[at];
		const shape = OPCODE_SHAPES[opcode];
		let name: string;
		let operands: number[];
		if (shape) {
			name = shape.name;
			operands = Array.from(
				image.subarray(at + 1, at + 1 + shape.operandBytes),
			);
		} else if (opcode === Op.TIMER) {
			name = "TIMER";
			operands = Array.from(
				image.subarray(at + 1, at + 1 + TIMER_OPERAND_BYTES),
			);
		} else {
			name = "COUNTER";
			operands = Array.from(
				image.subarray(at + 1, at + 1 + counterOperandBytes(image[at + 1])),
			);
		}
		const isJump = ["JMP", "JZ", "JNZ", "JZK", "JNZK"].includes(name);
		const isWide = ["PUSH16", "PUSH32"].includes(name);
		let text = name;
		if (isJump) text += ` ${operands[0] | (operands[1] << 8)}`;
		else if (name === "PUSH16")
			text += ` ${((operands[0] | (operands[1] << 8)) << 16) >> 16}`;
		else if (name === "PUSH32") {
			text += ` ${(operands[0] | (operands[1] << 8) | (operands[2] << 16) | (operands[3] << 24)) >>> 0}`;
		} else if (name === "PUSH8") text += ` ${(operands[0] << 24) >> 24}`;
		else if (operands.length > 0 && !isWide) text += ` ${operands.join(" ")}`;
		lines.push(`${pc}: ${text}`);
		pc += 1 + operands.length;
	}
	return lines;
}
