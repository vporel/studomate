import { Dialect } from "@/expression-language/dialect.enum";
import { getConstantNativeValue } from "@/schemas/variable/constant-value";
import {
	getInputRestValue,
	getSliderRange,
} from "@/schemas/variable/input-behavior";
import { SYSTEM_VARIABLES } from "@/schemas/variable/system-variables";
import Variable, {
	getNumericRange,
	VARIABLE_TYPE_TO_NATIVE_TYPE,
} from "@/schemas/variable/variable.schema";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import { directionToScope } from "@/simulator/environment-plc.mapper";

export default class VariableCompiler {
	/**
	 * Converts all project-level variables to PLCVariables. An input with a behavior starts at
	 * its rest value, a slider input is bounded by the slider's range, and a constant starts at
	 * its declared value.
	 */
	static compile(variables: Variable[], dialect: Dialect): PLCVariable[] {
		const result: PLCVariable[] = [];

		for (const variable of variables) {
			const scope = directionToScope[variable.getDirection()];
			const isConstant = variable.zone === "constant";
			const plcVariable = new PLCVariable(
				variable.id,
				variable.mnemonic,
				scope,
				variable.getNativeType(),
				getSliderRange(variable.behavior) ?? getNumericRange(variable.type),
				variable.type,
				isConstant,
				getConstantNativeValue(variable, dialect),
			);
			const restValue = getInputRestValue(variable.behavior);
			if (restValue !== undefined) plcVariable.setValue(restValue);
			result.push(plcVariable);
		}

		return result;
	}

	/**
	 * Variables système (bases de temps `_SYS_TB_*`) injectées dans tout programme compilé.
	 * `scope: "memory"` — le PLC les met à jour lui-même en début de cycle, aucune routine
	 * utilisateur ne les écrit (l'affectation est refusée à l'analyse). Source unique :
	 * `SYSTEM_VARIABLES`.
	 */
	static compileSystemVariables(): PLCVariable[] {
		return SYSTEM_VARIABLES.map(
			(variable) =>
				new PLCVariable(
					variable.name,
					variable.name,
					"memory",
					VARIABLE_TYPE_TO_NATIVE_TYPE[variable.type],
					getNumericRange(variable.type),
					variable.type,
				),
		);
	}
}
