import Project from "@/schemas/project/project.schema";
import { deserializeProject } from "./project-deserialization";
import { readJson, writeJson } from "./safe-local-storage";
import { StorageWriteResult } from "./storage-write-error";

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
	const parsed = readJson(STORAGE_KEY);
	return typeof parsed === "object" && parsed !== null
		? (parsed as DraftStore)
		: {};
}

export type DraftSaveResult = StorageWriteResult;

// On ne lève pas : le brouillon est ignoré, l'appelant décide quoi en faire.
function writeStore(store: DraftStore): DraftSaveResult {
	return writeJson(STORAGE_KEY, store);
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
): DraftSaveResult {
	const store = pruneExpired(readStore());
	store[projectId] = { projectId, projectName, savedAt: Date.now(), data };
	return writeStore(store);
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

/**
 * Rebuilds the project held by a draft, migrated to the current schema version.
 * Returns null when the draft is not valid JSON or cannot be read as a project
 * (no id, written by a newer version, failed migration).
 */
export function parseDraftProject(data: string): Project | null {
	let raw: unknown;
	try {
		raw = JSON.parse(data);
	} catch {
		return null;
	}
	if (typeof raw !== "object" || raw === null) return null;
	const result = deserializeProject(raw as Record<string, any>);
	return result.ok ? result.project : null;
}
