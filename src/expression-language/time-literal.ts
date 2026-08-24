/**
 * Constante TIME façon IEC 61131-3 : `T#` suivi d'unités `d`/`h`/`m`/`s`/`ms` combinables en
 * ordre décroissant (`T#1h2m3s4ms`), une valeur seule au-delà de son unité naturelle tolérée
 * (`T#100s`), décimales et underscore comme séparateur de lisibilité tolérés (`T#1h_30m`,
 * `T#1.5s`).
 */
const UNIT_TO_MS: Record<string, number> = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1_000, ms: 1 };

// "ms" doit être tenté avant "m"/"s" seuls, sinon l'alternance capturerait "m" et laisserait un "s" orphelin.
const COMPONENT_REGEX = /(\d+(?:\.\d+)?)(ms|d|h|m|s)/gi;

export const TIME_LITERAL_PREFIX = "T#";

/** `true` si `text` a la forme d'une constante TIME (`T#...`), sans en valider le contenu — utile
 * pour distinguer une constante d'un nom de variable avant d'appeler `parseTimeLiteral`. */
export function isTimeLiteral(text: string): boolean {
	return text.trim().toUpperCase().startsWith(TIME_LITERAL_PREFIX);
}

/** Parse une constante TIME en millisecondes, ou `null` si `text` n'en est pas une valide. */
export function parseTimeLiteral(text: string): number | null {
	const trimmed = text.trim();
	if (!isTimeLiteral(trimmed)) return null;
	const body = trimmed.slice(TIME_LITERAL_PREFIX.length).replace(/_/g, "");
	if (body.length === 0) return null;

	let totalMs = 0;
	let consumed = 0;
	COMPONENT_REGEX.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = COMPONENT_REGEX.exec(body)) !== null) {
		if (match.index !== consumed) return null; // caractères inattendus entre deux composants
		const [full, valueText, unit] = match;
		totalMs += parseFloat(valueText) * UNIT_TO_MS[unit.toLowerCase()];
		consumed += full.length;
	}
	if (consumed === 0 || consumed !== body.length) return null;
	return Math.round(totalMs);
}
