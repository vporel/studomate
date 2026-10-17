import { TYPE_CODE } from "./bytecode-format";
import type { BytecodeLayout } from "./bytecode.generator";

/** Bytes the variables of an image occupy in the VM memory (README §3.1). */
export function variableMemorySize(layout: BytecodeLayout): number {
	return (
		layout.boolCount +
		2 * (layout.intCount + layout.wordCount) +
		4 * layout.int32Count
	);
}

function offsetOf(layout: BytecodeLayout, index: number): number {
	const { boolCount: b, intCount: n, wordCount: w } = layout;
	if (index < b) return index;
	if (index < b + n + w) return b + 2 * (index - b);
	return b + 2 * (n + w) + 4 * (index - b - n - w);
}

/**
 * Values of the variables of an image, read from a copy of the VM memory, as the simulator holds
 * them: booleans as `boolean`, numbers as `number` (`INT` signed, `WORD` and `DWORD` unsigned,
 * `DINT`, `TIME` and internal variables as signed 32 bits). Throws if the memory has the wrong size.
 */
export default function decodeVariableMemory(
	layout: BytecodeLayout,
	memory: Uint8Array,
): Record<string, boolean | number> {
	const expected = variableMemorySize(layout);
	if (memory.length !== expected) {
		throw new RangeError(
			`Variable memory is ${memory.length} bytes, the image needs ${expected}.`,
		);
	}
	const view = new DataView(
		memory.buffer,
		memory.byteOffset,
		memory.byteLength,
	);
	const values: Record<string, boolean | number> = {};
	for (const variable of layout.variables) {
		const offset = offsetOf(layout, variable.index);
		switch (variable.storageClass) {
			case "bool":
				values[variable.name] = memory[offset] !== 0;
				break;
			case "int":
				values[variable.name] = view.getInt16(offset, true);
				break;
			case "word":
				values[variable.name] = view.getUint16(offset, true);
				break;
			case "int32":
				values[variable.name] =
					variable.typeCode === TYPE_CODE.DWORD
						? view.getUint32(offset, true)
						: view.getInt32(offset, true);
				break;
		}
	}
	return values;
}
