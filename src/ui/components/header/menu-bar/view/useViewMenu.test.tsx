/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { AppContextProvider } from "@/ui/components/AppContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import type { ReactNode } from "react";
import useViewMenu from "./useViewMenu";

jest.mock("@/ui/components/projects/ProjectContext");

const I18n = i18nWrapper();
const wrapper = ({ children }: { children: ReactNode }) => (
	<I18n>
		<AppContextProvider>{children}</AppContextProvider>
	</I18n>
);

const setCrossReferenceResultVisible = jest.fn();
const setAnalysisResultVisible = jest.fn();

const closeScene3d = jest.fn();
const showScene3d = jest.fn();

function mockProjectStore({
	crossReferenceResultVisible = false,
	analysisResultVisible = false,
	scene3d = null,
	scene3dFloatingVisible = false,
	scene3dPageOpen = false,
	scene3dPageActive = true,
	scene3dBrowserTabOpen = false,
	availableModes = ["floating-box", "page", "browser-tab"],
}: {
	crossReferenceResultVisible?: boolean;
	analysisResultVisible?: boolean;
	scene3d?: object | null;
	scene3dFloatingVisible?: boolean;
	scene3dPageOpen?: boolean;
	scene3dPageActive?: boolean;
	scene3dBrowserTabOpen?: boolean;
	availableModes?: string[];
} = {}) {
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: {
				crossReferenceResultVisible,
				analysisResultVisible,
				scene3dFloatingVisible,
				scene3dBrowserTabOpen,
			},
			pagesData: scene3dPageOpen
				? { "scene3d-view": { id: "scene3d-view", type: "scene3d-view" } }
				: {},
			activePageId:
				scene3dPageOpen && scene3dPageActive ? "scene3d-view" : "other",
			setCrossReferenceResultVisible,
			setAnalysisResultVisible,
			project: { scene3d },
			scene3dDisplayManager: {
				close: closeScene3d,
				show: showScene3d,
				availableModes,
			},
		}),
	);
}

describe("useViewMenu", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockProjectStore();
	});

	it("exposes the explorer toggle, checked when the explorer is visible", () => {
		const { result } = renderHook(() => useViewMenu(), { wrapper });
		expect(result.current.id).toBe("view");
		expect(result.current.items[0][0].label).toBe("Explorateur");
		expect(result.current.items[0][0].checked).toBe(true);
	});

	it("toggles the explorer visibility when clicked", () => {
		const { result } = renderHook(() => useViewMenu(), { wrapper });

		act(() => result.current.items[0][0].onClick?.());
		expect(result.current.items[0][0].checked).toBe(false);

		act(() => result.current.items[0][0].onClick?.());
		expect(result.current.items[0][0].checked).toBe(true);
	});

	it("exposes cross-references and analysis-results toggles reflecting panel visibility", () => {
		mockProjectStore({ analysisResultVisible: true });
		const { result } = renderHook(() => useViewMenu(), { wrapper });

		const [crossRef, analysis] = result.current.items[1];
		expect(crossRef.label).toBe("Références croisées");
		expect(crossRef.checked).toBe(false);
		expect(analysis.label).toBe("Résultats de l'analyse");
		expect(analysis.checked).toBe(true);
	});

	it("toggles the cross-reference and analysis panels when clicked", () => {
		const { result } = renderHook(() => useViewMenu(), { wrapper });

		act(() => result.current.items[1][0].onClick?.());
		expect(setCrossReferenceResultVisible).toHaveBeenCalledWith(true);

		act(() => result.current.items[1][1].onClick?.());
		expect(setAnalysisResultVisible).toHaveBeenCalledWith(true);
	});

	it("has no 3D scene entry when the project has no scene", () => {
		const { result } = renderHook(() => useViewMenu(), { wrapper });
		expect(result.current.items).toHaveLength(2);
	});

	describe("3D scene entry", () => {
		const scene3d = {
			sceneId: "carton-sorting",
			sceneVersion: 1,
			bindings: {},
		};
		const entry = () => {
			const { result } = renderHook(() => useViewMenu(), { wrapper });
			return result.current.items[2][0];
		};

		it("opens a submenu with the display modes, and does nothing by itself", () => {
			mockProjectStore({ scene3d });
			const item = entry();

			expect(item.label).toBe("Scène 3D");
			expect(item.checked).toBeUndefined();
			expect(item.onClick).toBeUndefined();
			expect(item.subItems!.map((mode) => mode.label)).toEqual([
				"Cadre flottant",
				"Page",
				"Onglet du navigateur",
			]);
		});

		it("is a single group: the modes are not listed in the menu itself", () => {
			mockProjectStore({ scene3d });
			const { result } = renderHook(() => useViewMenu(), { wrapper });
			expect(result.current.items).toHaveLength(3);
		});

		it.each([
			["nowhere", {}, [false, false, false]],
			[
				"the floating box",
				{ scene3dFloatingVisible: true },
				[true, false, false],
			],
			["a page", { scene3dPageOpen: true }, [false, true, false]],
			[
				"none when the page of the scene is in the background",
				{ scene3dPageOpen: true, scene3dPageActive: false },
				[false, false, false],
			],
			["a browser tab", { scene3dBrowserTabOpen: true }, [false, false, true]],
		])(
			"checks the mode in which the scene is shown: %s",
			(_label, shown, checked) => {
				mockProjectStore({ scene3d, ...shown });
				expect(entry().subItems!.map((mode) => mode.checked)).toEqual(checked);
			},
		);

		it("shows the scene in the mode that is clicked", () => {
			mockProjectStore({ scene3d });
			const modes = entry().subItems!;
			act(() => modes[2].onClick?.());
			expect(showScene3d).toHaveBeenCalledWith("browser-tab");
			expect(closeScene3d).not.toHaveBeenCalled();
		});

		it("closes the scene when the mode it is shown in is clicked", () => {
			mockProjectStore({ scene3d, scene3dPageOpen: true });
			const modes = entry().subItems!;
			act(() => modes[1].onClick?.());
			expect(closeScene3d).toHaveBeenCalledTimes(1);
			expect(showScene3d).not.toHaveBeenCalled();
		});

		it("brings the page of the scene forward when it is in the background", () => {
			mockProjectStore({
				scene3d,
				scene3dPageOpen: true,
				scene3dPageActive: false,
			});
			const modes = entry().subItems!;
			act(() => modes[1].onClick?.());
			expect(showScene3d).toHaveBeenCalledWith("page");
			expect(closeScene3d).not.toHaveBeenCalled();
		});

		it("only lists the modes of the environment", () => {
			mockProjectStore({ scene3d, availableModes: ["page"] });
			expect(entry().subItems!.map((mode) => mode.label)).toEqual(["Page"]);
		});
	});
});
