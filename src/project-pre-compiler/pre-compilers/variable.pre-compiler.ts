import Variable, {
	VariableType,
	VariableZone,
} from "@/schemas/variable/variable.schema";
import PLCVariable, {
	PLCVariableScope,
	PLCVariableType,
} from "@/simulator/core/plc/plc-variable";

const ZONE_TO_SCOPE: Record<VariableZone, PLCVariableScope> = {
	"logic-input": "input",
	"logic-output": "output",
	"analog-input": "input",
	"analog-output": "output",
	memory: "memory",
};

/**
 * Maps a project VariableType to a PLCVariableType. TIME est stockée en ms, native "number"
 * (voir `VARIABLE_TYPE_TO_NATIVE_TYPE`) — même mapping que les autres types numériques.
 */
const VARIABLE_TYPE_TO_PLC_TYPE: Partial<
	Record<VariableType, PLCVariableType>
> = {
	BOOL: "boolean",
	INT: "number",
	LONG: "number",
	WORD: "number",
	DWORD: "number",
	REAL: "number",
	STRING: "string",
	TIME: "number",
};

export default class VariableCompiler {
	/**
	 * Converts all project-level variables to PLCVariables.
	 */
	static compile(variables: Variable[]): PLCVariable[] {
		const result: PLCVariable[] = [];

		for (const variable of variables) {
			const plcType = VARIABLE_TYPE_TO_PLC_TYPE[variable.type];
			if (!plcType) continue;

			const scope = ZONE_TO_SCOPE[variable.zone];
			result.push(
				new PLCVariable(variable.id, variable.mnemonic, scope, plcType),
			);
		}

		return result;
	}
}
