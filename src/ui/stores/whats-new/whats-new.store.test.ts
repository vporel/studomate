import { whatsNewStore } from "./whats-new.store";

describe("whatsNewStore", () => {
	beforeEach(() => whatsNewStore.getState().close());

	it("is hidden at first", () => {
		expect(whatsNewStore.getState().visible).toBe(false);
	});

	it("opens and closes", () => {
		whatsNewStore.getState().open();
		expect(whatsNewStore.getState().visible).toBe(true);
		whatsNewStore.getState().close();
		expect(whatsNewStore.getState().visible).toBe(false);
	});
});
