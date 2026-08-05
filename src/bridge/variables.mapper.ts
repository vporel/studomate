import Variable from "@/schemas/variable/variable.schema";
import EnvVariable from "@/simulator/interpreter/environment/env-variable";

/**
 * Traduit une variable du **schéma** (modèle métier) vers l'**environnement** du compilateur.
 *
 * Le nom porte le sens de la traduction : un autre mapper, `PlcVariablesMapper`, traduit dans
 * l'autre partie de la chaîne (environnement ↔ PLC). Les deux s'appelaient `VariablesMapper`,
 * si bien qu'un appel ne disait pas lequel était en jeu sans remonter aux imports.
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
