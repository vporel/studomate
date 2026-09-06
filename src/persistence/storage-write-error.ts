/**
 * Raison d'un échec d'écriture dans le `localStorage`, indépendamment de ce qu'on tentait
 * d'écrire (projet, brouillon…). `quota-exceeded` mérite un message spécifique : c'est le seul
 * cas où l'utilisateur peut agir (libérer de la place, exporter).
 */
export type StorageWriteErrorReason = "quota-exceeded" | "unavailable" | "unknown";

export function classifyStorageWriteError(e: unknown): StorageWriteErrorReason {
	if (typeof DOMException !== "undefined" && e instanceof DOMException) {
		//Firefox et Chrome ne s'accordent pas sur le nom, et Chrome utilise le code 22
		if (
			e.name === "QuotaExceededError" ||
			e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
			e.code === 22
		) {
			return "quota-exceeded";
		}
	}
	if (typeof localStorage === "undefined") return "unavailable";
	return "unknown";
}
