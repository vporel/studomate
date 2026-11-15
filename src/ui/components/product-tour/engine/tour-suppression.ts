let suppressed = false;

/**
 * Opening a shared project or an autostarted simulation demo must land the visitor directly on
 * the content: every tour is skipped until the page is reloaded.
 */
export function suppressToursForThisPageLoad(): void {
	suppressed = true;
}

export function resetTourSuppression(): void {
	suppressed = false;
}

export function areToursSuppressed(): boolean {
	return suppressed;
}
