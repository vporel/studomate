import { Dialect } from "@/expression-language/dialect.enum";
import { parseConstantLiteral } from "@/schemas/variable/constant-value";
import Variable from "@/schemas/variable/variable.schema";
import EnvVariable from "@/simulator/interpreter/environment/env-variable";

/**
 * Traduit une variable du **schéma** (modèle métier) vers l'**environnement** du compilateur.
 * Le pendant environnement ↔ PLC est `PlcVariablesMapper`.
 */
export default class SchemaVariablesMapper {
	/** The declared value of a constant is parsed with the project dialect. A constant whose
	 * literal is invalid (reported by the analysis) is built at the type's zero value. */
	static schemaToEnv(
		schemaVar: Variable,
		dialect: Dialect = Dialect.FR,
	): EnvVariable {
		const isConstant = schemaVar.zone === "constant";
		const initialValue = isConstant
			? (parseConstantLiteral(
					schemaVar.value ?? "",
					schemaVar.type,
					dialect,
				) ?? undefined)
			: undefined;
		const envVar = new EnvVariable(
			schemaVar.id,
			schemaVar.mnemonic,
			schemaVar.getNativeType(),
			schemaVar.getDirection(),
			schemaVar.getNumericRange(),
			schemaVar.type,
			isConstant,
			initialValue,
		);
		return envVar;
	}
}
