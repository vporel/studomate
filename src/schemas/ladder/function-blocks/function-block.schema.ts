import {
	validateMnemonic,
	type VariableValidationIssue,
} from "@/schemas/variable/variable.validator";
import { BlockPortSpec } from "../block-port.schema";

/** Les mnémoniques plats générés pour un bloc nommé `name`, un par port de `portSpecs` dont
 * `generatesVariable` est vrai (ex. `Tempo1.IN`). */
export function getBlockVariableMnemonics(
	name: string,
	portSpecs: BlockPortSpec[],
): Record<string, string> {
	return Object.fromEntries(
		portSpecs
			.filter((spec) => spec.generatesVariable)
			.map((spec) => [spec.suffix, `${name}.${spec.suffix}`]),
	);
}

/** Un nom de bloc partage son espace de noms avec les mnémoniques de variable : même règle de
 * validation (mêmes codes d'erreur). */
export function validateBlockName(name: string): VariableValidationIssue[] {
	return validateMnemonic(name, false);
}
