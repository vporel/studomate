import { feedbackStore } from "./feedback.store";

describe("feedbackStore", () => {
	beforeEach(() => feedbackStore.getState().close());

	it("is closed at first", () => {
		expect(feedbackStore.getState().source).toBeNull();
	});

	it("opens with the source it was asked from", () => {
		feedbackStore.getState().open("menu");
		expect(feedbackStore.getState().source).toBe("menu");
	});

	it("keeps the source of a box that is already open", () => {
		feedbackStore.getState().open("prompt");
		feedbackStore.getState().open("menu");
		expect(feedbackStore.getState().source).toBe("prompt");
	});

	it("closes", () => {
		feedbackStore.getState().open("prompt");
		feedbackStore.getState().close();
		expect(feedbackStore.getState().source).toBeNull();
	});
});
