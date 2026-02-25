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
