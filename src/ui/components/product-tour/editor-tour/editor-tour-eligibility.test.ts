import {
	setEditorTourSeen,
	setProductTourSeen,
} from "@/persistence/preferences.storage";
import {
	resetTourSuppression,
	suppressToursForThisPageLoad,
} from "@/ui/components/product-tour/engine/tour-suppression";
import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import shouldStartEditorTour from "./editor-tour-eligibility";

describe("shouldStartEditorTour", () => {
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ restore: restoreLocalStorage } = installMemoryLocalStorage());
		resetTourSuppression();
	});

	afterEach(() => restoreLocalStorage());

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
