import { readString, writeString } from "./safe-local-storage";

const STORAGE_KEY = "studomate_app_version";

/** `null` when no version was recorded or storage is unavailable. */
export function getStoredAppVersion(): string | null {
	return readString(STORAGE_KEY);
}

export function setStoredAppVersion(version: string): void {
	writeString(STORAGE_KEY, version);
}
