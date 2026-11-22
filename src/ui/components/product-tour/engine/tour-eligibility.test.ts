import {
	setEditorTourSeen,
	setProductTourSeen,
} from "@/persistence/preferences.storage";
import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import { shouldStartAppTour, shouldStartEditorTour } from "./tour-eligibility";
import {
	resetTourSuppression,
	suppressToursForThisPageLoad,
} from "./tour-suppression";

let restoreLocalStorage: () => void;

beforeEach(() => {
	({ restore: restoreLocalStorage } = installMemoryLocalStorage());
	resetTourSuppression();
});

afterEach(() => restoreLocalStorage());

describe("shouldStartAppTour", () => {
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

describe("shouldStartEditorTour", () => {
	it("waits for the app tour to have been seen", () => {
		expect(shouldStartEditorTour("grafcet")).toBe(false);
	});

	it("starts once the app tour was seen and the editor tour was not", () => {
		setProductTourSeen();
		expect(shouldStartEditorTour("grafcet")).toBe(true);
	});

	it("does not start for an editor whose tour was seen, but still does for the others", () => {
		setProductTourSeen();
		setEditorTourSeen("ladder");
		expect(shouldStartEditorTour("ladder")).toBe(false);
		expect(shouldStartEditorTour("hmi")).toBe(true);
	});

	it("does not start when tours are suppressed for this page load", () => {
		setProductTourSeen();
		suppressToursForThisPageLoad();
		expect(shouldStartEditorTour("hmi")).toBe(false);
	});
});
