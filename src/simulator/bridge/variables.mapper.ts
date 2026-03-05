import EnvVariable, { EnvVariableDirection } from "../compiler/environment/env-variable";
import PLCVariable, { PLCVariableScope } from "../core/plc/plc-variable";

const directionToScope: Record<EnvVariableDirection, PLCVariableScope> = {
	IN: "input",
	OUT: "output",
	INOUT: "memory",
};

function invertRecord<K extends string, V extends string>(record: Record<K, V>): Record<V, K> {
	return Object.fromEntries(Object.entries(record).map(([k, v]) => [v, k])) as Record<V, K>;
}

const scopeToDirection = invertRecord(directionToScope);

export default class VariablesMapper {
	static envToPlc(envVar: EnvVariable): PLCVariable {
		const scope = directionToScope[envVar.getDirection()];
		const plcVar = new PLCVariable(envVar.getId(), envVar.getName(), scope, envVar.getType());
		plcVar.setValue(envVar.getValue());
		return plcVar;
	}

	static plcToEnv(plcVar: PLCVariable): EnvVariable {
		const direction = scopeToDirection[plcVar.getScope()];
		const envVar = new EnvVariable(plcVar.getId(), plcVar.getName(), plcVar.getType(), direction);
		envVar.setValue(plcVar.getValue());
		return envVar;
	}
}
