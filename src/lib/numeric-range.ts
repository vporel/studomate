/**
 * Domaine de valeurs d'un type numérique d'automate (INT, WORD…). Concept neutre : ni le schéma
 * ni le simulateur n'en dépendent l'un de l'autre, ils s'accordent sur cette forme.
 */
export interface NumericRange {
	min: number;
	max: number;
	/** La valeur stockée est forcée entière (troncature vers zéro). */
	integer: boolean;
	/**
	 * Dépassement : `true` → repli modulo (comportement d'un automate réel, un INT qui passe
	 * 32767 revient à -32768) ; `false` → saturation aux bornes.
	 */
	wrap: boolean;
}

/** Ramène `value` dans `range` (troncature entière, puis repli ou saturation selon `range.wrap`). */
export function coerceToRange(value: number, range: NumericRange): number {
	if (!Number.isFinite(value)) return value;
	const truncated = range.integer ? Math.trunc(value) : value;
	if (truncated >= range.min && truncated <= range.max) return truncated;
	if (!range.wrap) {
		return Math.min(range.max, Math.max(range.min, truncated));
	}
	const span = range.max - range.min + 1;
	return range.min + (((truncated - range.min) % span) + span) % span;
}
