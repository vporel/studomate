export type AppVersionCheck = "first-visit" | "unchanged" | "changed";

/**
 * `stored` is the version last seen by this browser, `null` when none was recorded. A browser
 * with no recorded version but already holding projects predates the version key: it is an
 * existing user, not a first visit.
 */
export default function checkAppVersion(
	stored: string | null,
	current: string,
	hasExistingProjects: boolean,
): AppVersionCheck {
	if (stored === null) return hasExistingProjects ? "changed" : "first-visit";
	return stored === current ? "unchanged" : "changed";
}
