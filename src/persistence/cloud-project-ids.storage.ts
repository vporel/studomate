import { readJson, writeJson } from "./safe-local-storage";

const STORAGE_KEY = "studomate_cloud_project_ids";

/** The ids of the projects that live in the cloud, as last recorded in this browser. */
export function getStoredCloudProjectIds(): string[] {
	const parsed = readJson(STORAGE_KEY);
	return Array.isArray(parsed) ? parsed : [];
}

/** Whether the ids were recorded: the storage can be full or unavailable. */
export function setStoredCloudProjectIds(ids: string[]): boolean {
	const result = writeJson(STORAGE_KEY, ids);
	if (!result.ok) {
		console.error(
			"Impossible de mettre à jour l'index des projets cloud :",
			result.reason,
		);
	}
	return result.ok;
}
