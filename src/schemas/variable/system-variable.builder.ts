import { SYSTEM_VARIABLES } from "./system-variables";
import Variable from "./variable.schema";

/**
 * Variables système sous forme de `Variable` de schéma, pour les consommateurs qui résolvent
 * les identifiants par mnémonique (analyse Ladder : contacts, bobines ; autocomplétion). Zone
 * `logic-input` pour que `getDirection()` renvoie `IN` (lecture seule : une bobine sur une
 * variable système est refusée). Construites hors du constructeur validant — le préfixe `_SYS_`
 * y est justement interdit à l'utilisateur.
 *
 * Fichier séparé de `system-variables.ts` : ce dernier ne dépend pas de la classe `Variable`
 * (cycle `variable.schema` ↔ `variable.validator` ↔ `system-variables`), alors qu'instancier
 * `Variable` au chargement du module l'exigerait.
 */
export const SYSTEM_SCHEMA_VARIABLES: readonly Variable[] = SYSTEM_VARIABLES.map(
	(systemVariable) =>
		Object.assign(new Variable("_sys", "sys", "logic-input", "BOOL"), {
			id: systemVariable.name,
			mnemonic: systemVariable.name,
			zone: "logic-input",
			type: systemVariable.type,
		}),
);
