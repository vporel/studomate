const STORAGE_KEY = "studomate_drafts";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type Draft = {
	projectId: string;
	projectName: string;
	savedAt: number; // timestamp ms
	data: string; // JSON sérialisé du projet
};

type DraftStore = Record<string, Draft>; // indexé par projectId

function readStore(): DraftStore {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : {};
		return typeof parsed === "object" && parsed !== null ? parsed : {};
	} catch {
		return {};
	}
}

function writeStore(store: DraftStore): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch {
		// Quota dépassé : on ne lève pas, le brouillon est silencieusement ignoré
	}
}

/** Supprime les entrées expirées et retourne le store nettoyé. */
function pruneExpired(store: DraftStore): DraftStore {
	const now = Date.now();
	const pruned: DraftStore = {};
	for (const id in store) {
		if (now - store[id].savedAt < DRAFT_TTL_MS) {
			pruned[id] = store[id];
		}
	}
	return pruned;
}

export function saveDraft(
	projectId: string,
	projectName: string,
	data: string,
): void {
	const store = pruneExpired(readStore());
	store[projectId] = { projectId, projectName, savedAt: Date.now(), data };
	writeStore(store);
}

export function getDraft(projectId: string): Draft | null {
	const store = pruneExpired(readStore());
	return store[projectId] ?? null;
}

/** Retourne tous les brouillons valides (non expirés), triés du plus récent au plus ancien. */
export function getAllDrafts(): Draft[] {
	const store = pruneExpired(readStore());
	writeStore(store); // persiste le nettoyage
	return Object.values(store).sort((a, b) => b.savedAt - a.savedAt);
}

export function deleteDraft(projectId: string): void {
	const store = pruneExpired(readStore());
	delete store[projectId];
	writeStore(store);
}

export function deleteAllDrafts(): void {
	writeStore({});
}
