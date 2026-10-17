import { stubLocalStorage } from "@tests/utils/local-storage-stub";

describe("stubLocalStorage", () => {
	it("installs the stub and restores the original state, idempotently", () => {
		const before = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
		const restore = stubLocalStorage({ getItem: () => "stubbed" });
		expect(globalThis.localStorage.getItem("k")).toBe("stubbed");

		restore();
		restore();
		expect(Object.getOwnPropertyDescriptor(globalThis, "localStorage")).toEqual(
			before,
		);
	});
});
