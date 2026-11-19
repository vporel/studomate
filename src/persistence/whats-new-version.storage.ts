import { readString, writeString } from "./safe-local-storage";

const STORAGE_KEY = "studomate_whats_new_version";

/** `null` when no version was recorded or storage is unavailable. */
export function getStoredWhatsNewVersion(): string | null {
	return readString(STORAGE_KEY);
}

export function setStoredWhatsNewVersion(version: string): void {
	writeString(STORAGE_KEY, version);
}
