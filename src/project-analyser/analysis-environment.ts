import SchemaVariablesMapper from "@/bridge/variables.mapper";
import {
	isSystemVariableName,
	SYSTEM_VARIABLES,
} from "@/schemas/variable/system-variables";
import Variable, {
	VARIABLE_TYPE_TO_NATIVE_TYPE,
} from "@/schemas/variable/variable.schema";
import EnvVariable from "@/simulator/interpreter/environment/env-variable";
import { Environment } from "@/simulator/interpreter/environment/environment";

/**
 * Construit l'`Environment` de résolution des identifiants pour l'analyse d'un projet : les
 * variables du schéma (utilisateur + générées) **plus les variables système** (`_SYS_TB_*`),
 * exposées en lecture seule (direction `IN` — toute affectation est refusée par l'analyse
 * sémantique). Les variables système ne sont pas persistées : elles n'existent que le temps de
 * l'analyse et de la compilation. Toute variable système déjà présente dans `schemaVariables`
 * est ignorée au profit de la définition canonique.
 */
export default function buildAnalysisEnvironment(
	schemaVariables: Variable[],
): Environment {
	return new Environment([
		...schemaVariables
			.filter((variable) => !isSystemVariableName(variable.mnemonic))
			.map(SchemaVariablesMapper.schemaToEnv),
		...SYSTEM_VARIABLES.map(
			(variable) =>
				new EnvVariable(
					variable.name,
					variable.name,
					VARIABLE_TYPE_TO_NATIVE_TYPE[variable.type],
					"IN",
				),
		),
	]);
}
