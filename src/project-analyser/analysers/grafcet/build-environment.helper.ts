import Variable from "@/schemas/variable/variable.schema";
import SchemaVariablesMapper from "@/bridge/variables.mapper";
import { Environment } from "@/simulator/interpreter/environment/environment";

const cache = new WeakMap<Variable[], Environment>();

/**
 * Construit un `Environment` à partir de la liste de variables, en réutilisant l'instance déjà
 * construite tant que la même référence de tableau est passée. Un passage d'analyse de grafcet
 * (`GrafcetAnalyser.analyse`) appelle `analyseInContext` sur tous ses éléments avec exactement
 * le même tableau `variables` — ce cache évite de reconstruire un `Environment` identique à
 * chaque transition et à chaque ligne d'action.
 */
export function buildEnvironmentCached(variables: Variable[]): Environment {
	let env = cache.get(variables);
	if (!env) {
		env = new Environment(variables.map(SchemaVariablesMapper.schemaToEnv));
		cache.set(variables, env);
	}
	return env;
}
