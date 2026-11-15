import { setProductTourSeen } from "@/persistence/preferences.storage";
import {
	resetTourSuppression,
	suppressToursForThisPageLoad,
} from "@/ui/components/product-tour/engine/tour-suppression";
import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import shouldStartAppTour from "./app-tour-eligibility";

describe("shouldStartAppTour", () => {
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ restore: restoreLocalStorage } = installMemoryLocalStorage());
		resetTourSuppression();
	});

	afterEach(() => restoreLocalStorage());

	it("starts for a browser that never saw the tour", () => {
		expect(shouldStartAppTour()).toBe(true);
	});

	it("does not start once the tour was seen", () => {
		setProductTourSeen();
		expect(shouldStartAppTour()).toBe(false);
	});

	it("does not start when tours are suppressed for this page load", () => {
		suppressToursForThisPageLoad();
		expect(shouldStartAppTour()).toBe(false);
	});

	it("starts again after the suppression is reset", () => {
		suppressToursForThisPageLoad();
		resetTourSuppression();
		expect(shouldStartAppTour()).toBe(true);
	});
});
