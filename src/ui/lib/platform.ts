export function isIos(): boolean {
	if (typeof navigator !== "undefined") {
		// Prefer User-Agent Client Hints when available, fall back to userAgent.
		const nav: any = navigator as any;
		const platformSource =
			(nav.userAgentData && nav.userAgentData.platform) ||
			(typeof navigator.userAgent === "string" ? navigator.userAgent : "");

		return /Mac|iPhone|iPad|iPod/.test(platformSource);
	}

	if (typeof process !== "undefined" && typeof process.platform === "string") {
		return process.platform === "darwin";
	}

	return false;
}

export function platformShortcut(standard: string, ios: string): string {
	return isIos() ? ios : standard;
}

/** Safari on any Apple platform; excludes the Chromium browsers and Firefox, which also carry a `Safari` token. */
export function isSafari(): boolean {
	if (typeof navigator === "undefined") return false;
	// Defined only by WebKit on iOS, including a home-screen web app whose user agent has no `Safari` token.
	if ((navigator as { standalone?: boolean }).standalone !== undefined) {
		return true;
	}
	const ua = navigator.userAgent;
	return (
		/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS|Android/.test(ua)
	);
}

/** Whether the page runs as an installed app (its own window) rather than in a browser tab. */
export function isStandaloneDisplay(): boolean {
	if (typeof window === "undefined") return false;
	return (
		window.matchMedia?.("(display-mode: standalone)").matches === true ||
		(navigator as { standalone?: boolean }).standalone === true
	);
}
