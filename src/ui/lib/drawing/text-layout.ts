/**
 * Découpage de texte en lignes pour un rendu sans layout HTML (le PDF et le SVG ne font pas de
 * retour à la ligne automatique). Largeur calculée avec les métriques Helvetica, sans mesure du
 * rendu réel ; on ne cherche pas la justification typographique.
 */

/**
 * Largeurs Helvetica (millièmes d'em) des caractères ASCII imprimables, de l'espace (32) au
 * tilde (126). Arial a les mêmes largeurs : le PDF, le SVG et le PNG sont mesurés pareil.
 */
const HELVETICA_WIDTHS = [
	278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
	278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
	584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
	833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
	278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
	500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
	500, 334, 260, 334, 584,
];
const FIRST_CHAR_CODE = 32;
/** Largeur d'un caractère hors table sans lettre de base ASCII (symboles, emoji). */
const FALLBACK_WIDTH = 556;
/** Le gras est jusqu'à 9 % plus large que le texte normal (mesuré sur Helvetica-Bold). */
const BOLD_WIDTH_FACTOR = 1.09;

function charWidth(char: string): number {
	const code = char.charCodeAt(0);
	if (
		code >= FIRST_CHAR_CODE &&
		code < FIRST_CHAR_CODE + HELVETICA_WIDTHS.length
	)
		return HELVETICA_WIDTHS[code - FIRST_CHAR_CODE];
	//Accented letters are as wide as their base letter
	const base = char.normalize("NFD").charCodeAt(0);
	if (
		base >= FIRST_CHAR_CODE &&
		base < FIRST_CHAR_CODE + HELVETICA_WIDTHS.length
	)
		return HELVETICA_WIDTHS[base - FIRST_CHAR_CODE];
	return FALLBACK_WIDTH;
}

export function estimateTextWidth(
	text: string,
	fontSize: number,
	bold = false,
): number {
	let thousandths = 0;
	for (const char of text) thousandths += charWidth(char);
	return (thousandths / 1000) * fontSize * (bold ? BOLD_WIDTH_FACTOR : 1);
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
			if (current !== "" && estimateTextWidth(candidate, fontSize) > maxWidth) {
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
