import { PLCVariable, PLCVariableType } from "../simulator/core/plc/plc";

const MEMO_PREFIX = "_GeneratedMemo_";

/**
 * Generates synthetic BOOL memory variables for steps that need
 * edge detection (rising/falling) to execute onActivation / onDeactivation action phases.
 *
 * Mnemonics are sequential integers starting from 0, skipping any that are already
 * taken (by user variables or previously generated variables).
 *
 * @param stepIds   IDs of the steps that need a memo variable
 * @param taken     Set of all already-used mnemonics (mutated in place to reserve new ones)
 * @returns Map from stepId → its generated PLCVariable
 */
export default class MemoVariableGenerator {
	static generate(type: PLCVariableType, taken: Set<string>): PLCVariable {
		let counter = 0;
		while (taken.has(`${MEMO_PREFIX}${counter}`)) {
			counter++;
		}
		const name = `${MEMO_PREFIX}${counter}`;
		return new PLCVariable(name, name, "memory", type);
	}
}
