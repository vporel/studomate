import Variable from "@/schemas/variable/variable.schema";
import EnvVariable from "@/simulator/compiler/environment/env-variable";

export default class VariablesMapper {
	static schemaToEnv(schemaVar: Variable): EnvVariable {
		const envVar = new EnvVariable(
			schemaVar.id,
			schemaVar.mnemonic,
			schemaVar.getNativeType(),
			schemaVar.getDirection(),
		);
		return envVar;
	}
}
