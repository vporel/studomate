/**
 * Nom disponible au format "Label_N" — en partant de 1, en avançant jusqu'à trouver un nom
 * absent de `existingNames`. Ignore les trous laissés par un renommage/une suppression (ex.
 * "Label_2" seul existant -> "Label_1", pas "Label_3") : chaque appelant ne garantit l'unicité
 * que dans son propre espace de noms (ex. widgets d'une page HMI, programmes d'un projet).
 */
export function nextAvailableName(
	label: string,
	existingNames: string[],
): string {
	const existing = new Set(existingNames);
	let n = 1;
	while (existing.has(`${label}_${n}`)) n++;
	return `${label}_${n}`;
}
