import { readJson, writeJson } from "./safe-local-storage";
import normalizeUserProfile, { UserProfile } from "@/user-profile/user-profile";
import { getShareTokenFromUrl } from "@/ui/stores/project/url/project-url";

const STORAGE_KEY = "studomate_user_profile";

/**
 * The stored profile of this browser, or `null` when the user was never asked. A stored profile
 * with empty fields means the user was asked and chose not to answer.
 */
export function getStoredUserProfile(): UserProfile | null {
	const raw = readJson(STORAGE_KEY);
	return raw === undefined || raw === null ? null : normalizeUserProfile(raw);
}

export function setStoredUserProfile(profile: UserProfile): void {
	writeJson(STORAGE_KEY, profile);
}

/** The profile question is asked once per browser, and never to someone opening a shared link. */
export function shouldAskUserProfile(): boolean {
	return getShareTokenFromUrl() === null && getStoredUserProfile() === null;
}
