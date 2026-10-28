import { Dialect } from "@/expression-language/dialect.enum";
import {
	getAutoOpenHmiSimulationOnStart,
	getDefaultDialect,
	getPreferredLocale,
	getPreferredSaveLocation,
	getProductTourSeen,
	getProjectEverSaved,
	setAutoOpenHmiSimulationOnStart,
	setDefaultDialect,
	setPreferredLocale,
	setPreferredSaveLocation,
	setProductTourSeen,
	setProjectEverSaved,
} from "./preferences.storage";
import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";

describe("preferences.storage", () => {
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ restore: restoreLocalStorage } = installMemoryLocalStorage());
	});

	afterEach(() => restoreLocalStorage());

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

	describe("dialecte par défaut", () => {
		it("retourne null tant qu'aucun dialecte n'a été choisi", () => {
			expect(getDefaultDialect()).toBeNull();
		});

		it("retient le dialecte choisi", () => {
			setDefaultDialect(Dialect.EN);
			expect(getDefaultDialect()).toBe(Dialect.EN);

			setDefaultDialect(Dialect.FR);
			expect(getDefaultDialect()).toBe(Dialect.FR);
		});

		it("ignore une valeur non reconnue", () => {
			localStorage.setItem("studomate_default_dialect", "ES");
			expect(getDefaultDialect()).toBeNull();
		});
	});

	describe("langue", () => {
		it("retourne null tant qu'aucune langue n'a été choisie", () => {
			expect(getPreferredLocale()).toBeNull();
		});

		it("retient la langue choisie", () => {
			setPreferredLocale("en");
			expect(getPreferredLocale()).toBe("en");

			setPreferredLocale("fr");
			expect(getPreferredLocale()).toBe("fr");
		});

		it("ignore une valeur non reconnue", () => {
			localStorage.setItem("studomate_locale", "zz");
			expect(getPreferredLocale()).toBeNull();
		});
	});

	describe("ouverture automatique de la simulation HMI", () => {
		it("vaut true tant qu'aucune préférence n'a été enregistrée (comportement historique)", () => {
			expect(getAutoOpenHmiSimulationOnStart()).toBe(true);
		});

		it("retient la préférence désactivée", () => {
			setAutoOpenHmiSimulationOnStart(false);
			expect(getAutoOpenHmiSimulationOnStart()).toBe(false);

			setAutoOpenHmiSimulationOnStart(true);
			expect(getAutoOpenHmiSimulationOnStart()).toBe(true);
		});
	});
	describe("product tour", () => {
		it("is not seen until it has been marked", () => {
			expect(getProductTourSeen()).toBe(false);
		});

		it("remembers that the tour was seen", () => {
			setProductTourSeen();
			expect(getProductTourSeen()).toBe(true);
		});

		it("falls back to not seen when storage throws", () => {
			(globalThis as any).localStorage = {
				getItem: () => {
					throw new Error("blocked");
				},
				setItem: () => {
					throw new Error("blocked");
				},
			};
			expect(getProductTourSeen()).toBe(false);
			expect(() => setProductTourSeen()).not.toThrow();
		});
	});
	describe("project ever saved", () => {
		it("is false until a save has been marked", () => {
			expect(getProjectEverSaved()).toBe(false);
		});

		it("remembers that a project was saved", () => {
			setProjectEverSaved();
			expect(getProjectEverSaved()).toBe(true);
		});
	});
});
