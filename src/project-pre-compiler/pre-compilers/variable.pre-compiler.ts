import Variable, { VariableType, VariableZone } from "../../schemas/variable/variable.schema";
import { PLCVariable, PLCVariableScope, PLCVariableType } from "../../simulator/core/plc/plc";

const ZONE_TO_SCOPE: Record<VariableZone, PLCVariableScope> = {
	"logic-input": "input",
	"logic-output": "output",
	"analog-input": "input",
	"analog-output": "output",
	memory: "memory",
};

/**
 * Maps a project VariableType to a PLCVariableType.
 * Timer types (TON, TOFF, TP) are not directly simulatable as primitive values: undefined → skipped.
 */
const VARIABLE_TYPE_TO_PLC_TYPE: Partial<Record<VariableType, PLCVariableType>> = {
	BOOL: "boolean",
	INT: "number",
	LONG: "number",
	WORD: "number",
	DWORD: "number",
	REAL: "number",
	STRING: "string",
};

export default class VariableCompiler {
	/**
	 * Converts all project-level variables to PLCVariables.
	 * Variables with unsupported types (TON, TOFF, TP) are silently skipped.
	 */
	static compile(variables: Variable[]): PLCVariable[] {
		const result: PLCVariable[] = [];

		for (const variable of variables) {
			const plcType = VARIABLE_TYPE_TO_PLC_TYPE[variable.type];
			if (!plcType) continue;

			const scope = ZONE_TO_SCOPE[variable.zone];
			result.push(new PLCVariable(variable.id, variable.mnemonic, scope, plcType));
		}

		return result;
	}
}
