import normalizeUserProfile, { UserProfile } from "@/user-profile/user-profile";
import { getShareTokenFromUrl } from "./project-url";

const STORAGE_KEY = "studomate_user_profile";

/**
 * The stored profile of this browser, or `null` when the user was never asked. A stored profile
 * with empty fields means the user was asked and chose not to answer.
 */
export function getStoredUserProfile(): UserProfile | null {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? normalizeUserProfile(JSON.parse(raw)) : null;
	} catch {
		return null;
	}
}

export function setStoredUserProfile(profile: UserProfile): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
	} catch {
		// Best-effort: the worst case is asking the question again.
	}
}

/** The profile question is asked once per browser, and never to someone opening a shared link. */
export function shouldAskUserProfile(): boolean {
	return getShareTokenFromUrl() === null && getStoredUserProfile() === null;
}
