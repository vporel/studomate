/** @jest-environment jsdom */
import requestPersistentStorage from "./storage-persist";

function setStorage(storage: unknown) {
	Object.defineProperty(navigator, "storage", {
		value: storage,
		configurable: true,
	});
}

describe("requestPersistentStorage", () => {
	it("asks the browser once and reports its answer", async () => {
		const persist = jest.fn().mockResolvedValue(true);
		setStorage({ persist, persisted: jest.fn().mockResolvedValue(false) });

		await expect(requestPersistentStorage()).resolves.toBe(true);
		expect(persist).toHaveBeenCalledTimes(1);
	});

	it("does not ask again when storage is already persistent", async () => {
		const persist = jest.fn();
		setStorage({ persist, persisted: jest.fn().mockResolvedValue(true) });

		await expect(requestPersistentStorage()).resolves.toBe(true);
		expect(persist).not.toHaveBeenCalled();
	});

	it("reports a refusal", async () => {
		setStorage({
			persist: jest.fn().mockResolvedValue(false),
			persisted: jest.fn().mockResolvedValue(false),
		});

		await expect(requestPersistentStorage()).resolves.toBe(false);
	});

	it("stays silent when the API is missing or throws", async () => {
		setStorage(undefined);
		await expect(requestPersistentStorage()).resolves.toBe(false);

		setStorage({ persist: jest.fn().mockRejectedValue(new Error("denied")) });
		await expect(requestPersistentStorage()).resolves.toBe(false);
	});
});
