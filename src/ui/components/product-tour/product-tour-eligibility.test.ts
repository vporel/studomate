import { setProductTourSeen } from "@/persistence/preferences.storage";
import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import shouldStartProductTour, {
	resetProductTourSuppression,
	suppressProductTourForThisPageLoad,
} from "./product-tour-eligibility";

describe("shouldStartProductTour", () => {
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ restore: restoreLocalStorage } = installMemoryLocalStorage());
		resetProductTourSuppression();
	});

	afterEach(() => restoreLocalStorage());

	it("starts for a browser that never saw the tour", () => {
		expect(shouldStartProductTour()).toBe(true);
	});

	it("does not start once the tour was seen", () => {
		setProductTourSeen();
		expect(shouldStartProductTour()).toBe(false);
	});

	it("does not start when suppressed for this page load", () => {
		suppressProductTourForThisPageLoad();
		expect(shouldStartProductTour()).toBe(false);
	});

	it("starts again after the suppression is reset", () => {
		suppressProductTourForThisPageLoad();
		resetProductTourSuppression();
		expect(shouldStartProductTour()).toBe(true);
	});
});
