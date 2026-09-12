import { classifyStorageWriteError } from "./storage-write-error";

describe("classifyStorageWriteError", () => {
	const originalLocalStorage = (globalThis as any).localStorage;

	afterEach(() => {
		(globalThis as any).localStorage = originalLocalStorage;
	});

	it("reconnaît le quota dépassé quel que soit le nom du navigateur", () => {
		expect(
			classifyStorageWriteError(
				new DOMException("full", "QuotaExceededError"),
			),
		).toBe("quota-exceeded");
		expect(
			classifyStorageWriteError(
				new DOMException("full", "NS_ERROR_DOM_QUOTA_REACHED"),
			),
		).toBe("quota-exceeded");
	});

	it("classe une autre erreur en « unknown » quand le stockage existe", () => {
		(globalThis as any).localStorage = {};
		expect(classifyStorageWriteError(new Error("boom"))).toBe("unknown");
	});

	it("classe en « unavailable » quand le localStorage est absent", () => {
		delete (globalThis as any).localStorage;
		expect(classifyStorageWriteError(new Error("boom"))).toBe("unavailable");
	});
});
