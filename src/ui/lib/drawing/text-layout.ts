/**
 * Découpage de texte en lignes pour un rendu sans layout HTML (le PDF et le SVG ne font pas de
 * retour à la ligne automatique). Largeur estimée par nombre de caractères — suffisant pour des
 * expressions et libellés courts ; on ne cherche pas la justification typographique.
 */

/** Largeur moyenne d'un caractère en fraction de la taille de police (Helvetica ~0.5). */
const AVG_CHAR_WIDTH_RATIO = 0.5;

export function estimateTextWidth(text: string, fontSize: number): number {
	return text.length * fontSize * AVG_CHAR_WIDTH_RATIO;
}

/**
 * Coupe `text` en lignes tenant dans `maxWidth` px. Respecte les `\n` existants. Un mot plus
 * large que `maxWidth` n'est pas coupé (il déborde) — on privilégie la lisibilité du token.
 */
export function wrapText(
	text: string,
	maxWidth: number,
	fontSize: number,
): string[] {
	const lines: string[] = [];
	for (const paragraph of text.split("\n")) {
		if (paragraph === "") {
			lines.push("");
			continue;
		}
		let current = "";
		for (const word of paragraph.split(/\s+/)) {
			const candidate = current === "" ? word : `${current} ${word}`;
			if (
				current !== "" &&
				estimateTextWidth(candidate, fontSize) > maxWidth
			) {
				lines.push(current);
				current = word;
			} else {
				current = candidate;
			}
		}
		lines.push(current);
	}
	return lines;
}
