import {
	classifyStorageWriteError,
	StorageWriteResult,
} from "./storage-write-error";

/** `null` when the key is missing or storage is unavailable. */
export function readString(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

/** `undefined` when the key is missing, holds invalid JSON, or storage is unavailable. */
export function readJson(key: string): unknown {
	const raw = readString(key);
	if (raw === null) return undefined;
	try {
		return JSON.parse(raw);
	} catch {
		return undefined;
	}
}

export function writeString(key: string, value: string): StorageWriteResult {
	try {
		localStorage.setItem(key, value);
		return { ok: true };
	} catch (e) {
		return { ok: false, reason: classifyStorageWriteError(e) };
	}
}

export function writeJson(key: string, value: unknown): StorageWriteResult {
	return writeString(key, JSON.stringify(value));
}
