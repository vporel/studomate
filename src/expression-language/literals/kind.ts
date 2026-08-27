import { isBooleanLiteral } from "./boolean";
import { Dialect } from "../dialect.enum";
import { isNumberLiteral } from "./number";
import { isStringLiteral } from "./string";
import { isTimeLiteral } from "./time";

/** Les formes de littéral qu'une pinoche paramètre peut accepter en plus d'un nom de variable :
 * une constante TIME (`T#...`), un nombre brut, un booléen (`vrai`/`faux`), une chaîne. Une
 * pinoche déclare celles qu'elle accepte via `BlockPortSpec.acceptedLiterals` (absent/vide → nom
 * de variable uniquement). */
export const LITERAL_KINDS = ["time", "number", "boolean", "string"] as const;

export type LiteralKind = (typeof LITERAL_KINDS)[number];

/** `true` si `text` a la forme d'un littéral de ce genre. Le dialecte n'est utile que pour
 * `"boolean"` (mot-clé traduit), il est ignoré pour les autres. */
export function matchesLiteralKind(
	text: string,
	kind: LiteralKind,
	dialect: Dialect,
): boolean {
	switch (kind) {
		case "time":
			return isTimeLiteral(text);
		case "number":
			return isNumberLiteral(text);
		case "boolean":
			return isBooleanLiteral(text, dialect);
		case "string":
			return isStringLiteral(text);
	}
}

/** `true` si `text` correspond à l'un des genres de littéral acceptés. */
export function matchesAnyAcceptedLiteral(
	text: string,
	acceptedLiterals: LiteralKind[] | undefined,
	dialect: Dialect,
): boolean {
	return (
		acceptedLiterals?.some((kind) => matchesLiteralKind(text, kind, dialect)) ??
		false
	);
}
