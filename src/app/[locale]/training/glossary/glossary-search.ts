/** Lowercases and strips diacritics so that "etape" finds "Étape". */
export function normalizeForSearch(text: string): string {
	return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** True when every word of the query appears somewhere in the (already normalized) search text. */
export function matchesQuery(normalizedText: string, query: string): boolean {
	const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
	return words.every((word) => normalizedText.includes(word));
}
