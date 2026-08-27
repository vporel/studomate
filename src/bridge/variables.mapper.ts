import Variable from "@/schemas/variable/variable.schema";
import EnvVariable from "@/simulator/interpreter/environment/env-variable";

/**
 * Traduit une variable du **schéma** (modèle métier) vers l'**environnement** du compilateur.
 * Le pendant environnement ↔ PLC est `PlcVariablesMapper`.
 */
export default class SchemaVariablesMapper {
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
