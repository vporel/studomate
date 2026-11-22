/** @jest-environment jsdom */
import { Scene3dDisplayMode } from "../scene3d-display-mode.enum";
import { SimulationMode } from "../simulation-mode.enum";
import createAppProjectStoreEnvironment from "./app-project-store-environment";
import {
	setStoredScene3dDisplayMode,
	setStoredSimulationMode,
} from "@/persistence/preferences.storage";

function preferences() {
	return createAppProjectStoreEnvironment().preferences;
}

jest.mock("@/ui/services/analytics", () => ({
	__esModule: true,
	default: jest.fn(),
}));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));
const { toast: mockedToast } = jest.requireMock("react-toastify");

describe("3D scene display mode of the app", () => {
	beforeEach(() => localStorage.clear());

	it("has no chosen mode until the user chose one", () => {
		expect(preferences().getScene3dDisplayMode()).toBeNull();
	});

	it.each(Object.values(Scene3dDisplayMode))(
		"remembers the %s mode",
		(mode) => {
			setStoredScene3dDisplayMode(mode);
			expect(preferences().getScene3dDisplayMode()).toBe(mode);
		},
	);

	it("ignores an unknown stored mode", () => {
		localStorage.setItem("studomate_scene3d_display_mode", "fullscreen");
		expect(preferences().getScene3dDisplayMode()).toBeNull();
	});

	it("offers every mode, the side panel by default", () => {
		const { scene3dDisplay } = createAppProjectStoreEnvironment();
		expect([...scene3dDisplay.availableModes].sort()).toEqual(
			Object.values(Scene3dDisplayMode).sort(),
		);
		expect(scene3dDisplay.defaultMode).toBe(Scene3dDisplayMode.SIDE_PANEL);
	});

	it("reads and writes the chosen mode through the preferences of the environment", () => {
		const { preferences } = createAppProjectStoreEnvironment();
		preferences.setScene3dDisplayMode(Scene3dDisplayMode.PAGE);
		expect(preferences.getScene3dDisplayMode()).toBe(Scene3dDisplayMode.PAGE);
	});
});

describe("simulation mode of the app", () => {
	beforeEach(() => localStorage.clear());

	it("is continuous until the user chose one", () => {
		expect(preferences().getSimulationMode()).toBe(SimulationMode.CONTINUOUS);
	});

	it.each(Object.values(SimulationMode))("remembers the %s mode", (mode) => {
		setStoredSimulationMode(mode);
		expect(preferences().getSimulationMode()).toBe(mode);
	});

	it("falls back to continuous for an unknown stored mode", () => {
		localStorage.setItem("studomate_simulation_mode", "turbo");
		expect(preferences().getSimulationMode()).toBe(SimulationMode.CONTINUOUS);
	});
});

describe("capabilities of the app", () => {
	it("lets the user exclude a program from execution", () => {
		expect(
			createAppProjectStoreEnvironment().capabilities
				.programExecutionExclusionToggle,
		).toBe(true);
	});
});

describe("messages and drafts of the app", () => {
	beforeEach(() => {
		localStorage.clear();
		mockedToast.error.mockClear();
	});

	it("shows an error as a toast", () => {
		createAppProjectStoreEnvironment().notifications.error("Oups");

		expect(mockedToast.error).toHaveBeenCalledWith("Oups");
	});

	it("translates in the language of the interface", () => {
		const env = createAppProjectStoreEnvironment();

		expect(env.translate("toasts")("draftCorrupted")).toBe(
			"Le brouillon est corrompu et n'a pas pu être ouvert.",
		);
		expect(env.translate("toasts.save")("generic")).toEqual(expect.any(String));
	});

	it("stores, reads and deletes the drafts of the browser storage", () => {
		const { drafts } = createAppProjectStoreEnvironment().persistence!;

		expect(drafts.save("p1", "Projet", "{}").ok).toBe(true);
		expect(drafts.get("p1")).toMatchObject({ projectId: "p1", data: "{}" });

		drafts.delete("p1");
		expect(drafts.get("p1")).toBeNull();
	});

	it("reads nothing from unreadable data", () => {
		const { drafts } = createAppProjectStoreEnvironment().persistence!;

		expect(drafts.parse("not json")).toBeNull();
	});
});
