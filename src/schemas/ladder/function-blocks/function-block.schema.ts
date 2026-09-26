import {
	validateMnemonic,
	type VariableValidationIssue,
} from "@/schemas/variable/variable.validator";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import Variable from "@/schemas/variable/variable.schema";
import { BlockPortSpec, requireConcreteType } from "../block-port.schema";

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

/** Les `Variable` exposées d'un bloc nommé `name`, une par port de `portSpecs` dont
 * `generatesVariable` est vrai. Générées à l'analyse à partir des éléments du bloc, jamais
 * persistées dans `project.variables` : elles disparaissent avec le `BlockElement`. */
export function createBlockVariables(
	elementId: string,
	name: string,
	portSpecs: BlockPortSpec[],
): Variable[] {
	return portSpecs
		.filter((spec) => spec.generatesVariable)
		.map((spec) =>
			new VariableBuilder()
				.id(`${elementId}-${spec.suffix}`)
				.mnemonic(`${name}.${spec.suffix}`)
				.zone("memory")
				.type(requireConcreteType(spec))
				.ownerBlock({ id: elementId })
				.build(),
		);
}

/** Un nom de bloc partage son espace de noms avec les mnémoniques de variable : même règle de
 * validation (mêmes codes d'erreur). */
export function validateBlockName(name: string): VariableValidationIssue[] {
	return validateMnemonic(name, false);
}
