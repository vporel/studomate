import {
	getPreferredSaveLocation,
	setPreferredSaveLocation,
} from "./preferences.storage";

function installLocalStorage() {
	const store = new Map<string, string>();
	(globalThis as any).localStorage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => store.set(k, v),
		removeItem: (k: string) => store.delete(k),
		clear: () => store.clear(),
	};
	return store;
}

describe("preferences.storage", () => {
	beforeEach(() => {
		installLocalStorage();
	});

	it("retourne null tant qu'aucune préférence n'a été enregistrée", () => {
		expect(getPreferredSaveLocation()).toBeNull();
	});

	it("retient le lieu enregistré", () => {
		setPreferredSaveLocation("cloud");
		expect(getPreferredSaveLocation()).toBe("cloud");

		setPreferredSaveLocation("local");
		expect(getPreferredSaveLocation()).toBe("local");
	});

	it("ignore une valeur corrompue en localStorage", () => {
		localStorage.setItem("studomate_preferred_save_location", "n'importe quoi");
		expect(getPreferredSaveLocation()).toBeNull();
	});
});
