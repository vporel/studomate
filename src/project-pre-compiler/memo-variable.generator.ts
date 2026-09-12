import PLCVariable, {
	PLCVariableType,
} from "@/simulator/core/plc/plc-variable";

const MEMO_PREFIX = "_GeneratedMemo_";

/**
 * Generates synthetic memory variables
 * Can be used for edge detection (rising/falling) to execute onActivation / onDeactivation action phases.
 *
 * Mnemonics are sequential integers starting from 0, skipping any that are already
 * taken (by user variables or previously generated variables).
 */
export default class MemoVariableGenerator {
	static generate(type: PLCVariableType, takenNames: Set<string>): PLCVariable {
		let counter = 0;
		while (takenNames.has(`${MEMO_PREFIX}${counter}`)) {
			counter++;
		}
		const name = `${MEMO_PREFIX}${counter}`;
		return new PLCVariable(name, name, "memory", type);
	}
}
