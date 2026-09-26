import { setProductTourSeen } from "@/persistence/preferences.storage";
import shouldStartProductTour, {
	resetProductTourSuppression,
	suppressProductTourForThisPageLoad,
} from "./product-tour-eligibility";

describe("shouldStartProductTour", () => {
	beforeEach(() => {
		const store = new Map<string, string>();
		(globalThis as any).localStorage = {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => store.set(k, v),
		};
		resetProductTourSuppression();
	});

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
