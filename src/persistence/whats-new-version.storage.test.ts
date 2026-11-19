import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import {
	getStoredWhatsNewVersion,
	setStoredWhatsNewVersion,
} from "./whats-new-version.storage";

describe("whats-new-version.storage", () => {
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
		expect(getStoredWhatsNewVersion()).toBeNull();
	});

	it("persists the version under studomate_whats_new_version", () => {
		setStoredWhatsNewVersion("v1.7.1");
		expect(store.get("studomate_whats_new_version")).toBe("v1.7.1");
		expect(getStoredWhatsNewVersion()).toBe("v1.7.1");
	});
});
