import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import {
	getStoredAppVersion,
	setStoredAppVersion,
} from "./app-version.storage";

describe("app-version.storage", () => {
	let store: Map<string, string>;
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ store, restore: restoreLocalStorage } = installMemoryLocalStorage());
	});

	afterEach(() => {
		restoreLocalStorage();
		delete (globalThis as any).localStorage;
	});

	it("returns null when nothing is stored", () => {
		expect(getStoredAppVersion()).toBeNull();
	});

	it("persists the version under studomate_app_version", () => {
		setStoredAppVersion("v1.7.0");
		expect(store.get("studomate_app_version")).toBe("v1.7.0");
		expect(getStoredAppVersion()).toBe("v1.7.0");
	});

	it("overwrites a previously stored version", () => {
		setStoredAppVersion("v1.6.0");
		setStoredAppVersion("v1.7.0");
		expect(getStoredAppVersion()).toBe("v1.7.0");
	});
});
