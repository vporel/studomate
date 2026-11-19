import { Dialect } from "@/expression-language/dialect.enum";
import {
	getAnalyserDisabledNoticeHidden,
	getAutoOpenHmiSimulationOnStart,
	getDefaultDialect,
	getPreferredLocale,
	getPreferredSaveLocation,
	getEditorTourSeen,
	getProductTourSeen,
	getProjectEverSaved,
	getStoredScene3dDisplayMode,
	getStoredSimulationMode,
	setAnalyserDisabledNoticeHidden,
	setAutoOpenHmiSimulationOnStart,
	setDefaultDialect,
	setPreferredLocale,
	setPreferredSaveLocation,
	setEditorTourSeen,
	setProductTourSeen,
	setProjectEverSaved,
	setStoredScene3dDisplayMode,
	setStoredSimulationMode,
	getScene3dFloatingFrame,
	getSidePanelSceneShare,
	getSidePanelWidth,
	setScene3dFloatingFrame,
	setSidePanelSceneShare,
	setSidePanelWidth,
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
	describe.each([
		[
			"simulation mode",
			getStoredSimulationMode,
			setStoredSimulationMode,
			"studomate_simulation_mode",
		],
		[
			"3D scene display mode",
			getStoredScene3dDisplayMode,
			setStoredScene3dDisplayMode,
			"studomate_scene3d_display_mode",
		],
	] as const)("%s", (_label, get, set, key) => {
		it("is null until one was stored", () => {
			expect(get(["continuous", "step"])).toBeNull();
		});

		it(`is stored under ${key}`, () => {
			set("step");
			expect(localStorage.getItem(key)).toBe("step");
		});

		it("is read back when it is one of the known values", () => {
			set("step");
			expect(get(["continuous", "step"])).toBe("step");
		});

		it("is null when it is not one of the known values", () => {
			set("turbo");
			expect(get(["continuous", "step"])).toBeNull();
		});
	});

	describe("editor tours", () => {
		it("are not seen until marked", () => {
			expect(getEditorTourSeen("grafcet")).toBe(false);
			expect(getEditorTourSeen("ladder")).toBe(false);
			expect(getEditorTourSeen("hmi")).toBe(false);
		});

		it("remember each editor independently", () => {
			setEditorTourSeen("ladder");
			expect(getEditorTourSeen("ladder")).toBe(true);
			expect(getEditorTourSeen("grafcet")).toBe(false);
			expect(getEditorTourSeen("hmi")).toBe(false);
		});

		it("do not affect the app tour", () => {
			setEditorTourSeen("hmi");
			expect(getProductTourSeen()).toBe(false);
		});

		it("store under studomate_editor_tour_<kind>_seen", () => {
			setEditorTourSeen("grafcet");
			expect(localStorage.getItem("studomate_editor_tour_grafcet_seen")).toBe(
				"true",
			);
		});

		it("fall back to not seen when storage throws", () => {
			(globalThis as any).localStorage = {
				getItem: () => {
					throw new Error("blocked");
				},
				setItem: () => {
					throw new Error("blocked");
				},
			};
			expect(getEditorTourSeen("hmi")).toBe(false);
			expect(() => setEditorTourSeen("hmi")).not.toThrow();
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

	describe("analyser disabled notice", () => {
		it("is shown until the user hides it", () => {
			expect(getAnalyserDisabledNoticeHidden()).toBe(false);
		});

		it("remembers that the user hid it", () => {
			setAnalyserDisabledNoticeHidden();
			expect(getAnalyserDisabledNoticeHidden()).toBe(true);
		});
	});
});

describe("preferences.storage: floating frame of the 3D scene", () => {
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ restore: restoreLocalStorage } = installMemoryLocalStorage());
	});

	afterEach(() => restoreLocalStorage());

	it("has no frame until one was stored", () => {
		expect(getScene3dFloatingFrame()).toBeNull();
	});

	it("remembers the frame", () => {
		const frame = { x: 10, y: 46, width: 420, height: 300 };
		setScene3dFloatingFrame(frame);
		expect(getScene3dFloatingFrame()).toEqual(frame);
	});

	it.each([
		["invalid JSON", "{nope"],
		["a missing field", JSON.stringify({ x: 1, y: 2, width: 3 })],
		[
			"a non numeric field",
			JSON.stringify({ x: 1, y: 2, width: 3, height: "4" }),
		],
		["a null value", "null"],
	])("ignores a stored frame with %s", (_label, raw) => {
		localStorage.setItem("studomate_scene3d_floating_frame", raw);
		expect(getScene3dFloatingFrame()).toBeNull();
	});
});

describe("preferences.storage: side panel layout", () => {
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ restore: restoreLocalStorage } = installMemoryLocalStorage());
	});

	afterEach(() => restoreLocalStorage());

	describe("width", () => {
		it("is unknown until the panel was resized", () => {
			expect(getSidePanelWidth()).toBeNull();
		});

		it("is remembered in whole pixels", () => {
			setSidePanelWidth(412.6);
			expect(getSidePanelWidth()).toBe(413);
		});

		it.each(["abc", "0", "-20", ""])("ignores the stored value %p", (raw) => {
			localStorage.setItem("studomate_side_panel_width", raw);
			expect(getSidePanelWidth()).toBeNull();
		});
	});

	describe("share of the scene", () => {
		it("is unknown until the scene was resized", () => {
			expect(getSidePanelSceneShare()).toBeNull();
		});

		it("is remembered", () => {
			setSidePanelSceneShare(62.5);
			expect(getSidePanelSceneShare()).toBe(62.5);
		});

		it.each(["abc", "0", "100", "140"])(
			"ignores the stored value %p",
			(raw) => {
				localStorage.setItem("studomate_side_panel_scene_share", raw);
				expect(getSidePanelSceneShare()).toBeNull();
			},
		);
	});
});
