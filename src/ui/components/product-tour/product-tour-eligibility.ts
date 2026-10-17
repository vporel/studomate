import { getProductTourSeen } from "@/persistence/preferences.storage";

let suppressed = false;

/**
 * Opening a shared project or an autostarted simulation demo must land the visitor directly on
 * the content: the tour is skipped until the page is reloaded.
 */
export function suppressProductTourForThisPageLoad(): void {
	suppressed = true;
}

export function resetProductTourSuppression(): void {
	suppressed = false;
}

export default function shouldStartProductTour(): boolean {
	return !suppressed && !getProductTourSeen();
}
