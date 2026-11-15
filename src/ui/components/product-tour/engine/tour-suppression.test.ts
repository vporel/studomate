import {
	areToursSuppressed,
	resetTourSuppression,
	suppressToursForThisPageLoad,
} from "./tour-suppression";

describe("tour suppression", () => {
	beforeEach(() => resetTourSuppression());

	it("is off by default", () => {
		expect(areToursSuppressed()).toBe(false);
	});

	it("is on once requested for this page load", () => {
		suppressToursForThisPageLoad();
		expect(areToursSuppressed()).toBe(true);
	});

	it("can be reset", () => {
		suppressToursForThisPageLoad();
		resetTourSuppression();
		expect(areToursSuppressed()).toBe(false);
	});
});
