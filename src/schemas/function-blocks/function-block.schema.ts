import { BlockPortSpec } from "../ladder/block-port.schema";
import Variable from "../variable/variable.schema";

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
 * validation. */
export function validateBlockName(name: string): string[] {
	return Variable.validateMnemonic(name, false);
}
