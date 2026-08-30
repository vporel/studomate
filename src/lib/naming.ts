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

/**
 * Nom d'une copie de `originalName` : celui-ci suffixé `_2`, `_3`... jusqu'à un nom absent de
 * `existingNames` (ex. "Mon_bloc" -> "Mon_bloc_2"). Un suffixe `_N` déjà porté par `originalName`
 * est incrémenté, pas empilé ("Mon_bloc_2" -> "Mon_bloc_3", jamais "Mon_bloc_2_2").
 */
export function nextCopyName(
	originalName: string,
	existingNames: string[],
): string {
	const existing = new Set(existingNames);
	const match = originalName.match(/^(.*)_(\d+)$/);
	const stem = match ? match[1] : originalName;
	let n = match ? Number(match[2]) + 1 : 2;
	while (existing.has(`${stem}_${n}`)) n++;
	return `${stem}_${n}`;
}
