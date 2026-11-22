/**
 * @jest-environment jsdom
 */
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { render, screen } from "@testing-library/react";
import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import { selectorImplementation } from "@tests/utils/store-mocks";
import SidePanel from "./SidePanel";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock(
	"next/dynamic",
	() => () =>
		function Scene3dSidePanelStub() {
			return <div data-testid="scene" />;
		},
);
jest.mock("../watch-tables/WatchTables", () => ({
	__esModule: true,
	default: () => <div data-testid="watch-tables" />,
}));

function setup({
	sidePanelVisible = false,
	watchTablesVisible = false,
	mode = ProjectMode.SIMULATION,
	scene3d = {} as object | null,
} = {}) {
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: {
				scene3dSidePanelVisible: sidePanelVisible,
				watchTablesVisible,
			},
			mode,
			project: { scene3d },
		}),
	);
	return render(<SidePanel />);
}

describe("SidePanel", () => {
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ restore: restoreLocalStorage } = installMemoryLocalStorage());
	});

	afterEach(() => restoreLocalStorage());

	it("shows the scene alone over the whole panel", () => {
		setup({ sidePanelVisible: true });
		expect(screen.getByTestId("scene")).toBeInTheDocument();
		expect(screen.queryByTestId("watch-tables")).not.toBeInTheDocument();
	});

	it("shows the watch tables alone during the simulation", () => {
		setup({ watchTablesVisible: true });
		expect(screen.getByTestId("watch-tables")).toBeInTheDocument();
		expect(screen.queryByTestId("scene")).not.toBeInTheDocument();
	});

	it("does not show the watch tables in design mode", () => {
		setup({ watchTablesVisible: true, mode: ProjectMode.DESIGN });
		expect(screen.queryByTestId("watch-tables")).not.toBeInTheDocument();
	});

	it("does not show the scene when the project has none", () => {
		setup({ sidePanelVisible: true, scene3d: null });
		expect(screen.queryByTestId("scene")).not.toBeInTheDocument();
	});

	it("shows the scene above the watch tables when both are open", () => {
		setup({ sidePanelVisible: true, watchTablesVisible: true });
		const scene = screen.getByTestId("scene");
		const tables = screen.getByTestId("watch-tables");
		expect(
			scene.compareDocumentPosition(tables) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("gives the scene the share of the height remembered by the browser", () => {
		localStorage.setItem("studomate_side_panel_scene_share", "70");
		const rectSpy = jest
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockReturnValue({ width: 400, height: 1000 } as DOMRect);
		setup({ sidePanelVisible: true, watchTablesVisible: true });
		expect(screen.getByTestId("scene").parentElement).toHaveStyle({
			height: "70%",
		});
		rectSpy.mockRestore();
	});

	it("keeps the scene mounted when the watch tables open", () => {
		const { rerender } = setup({ sidePanelVisible: true });
		const scene = screen.getByTestId("scene");
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				ui: { scene3dSidePanelVisible: true, watchTablesVisible: true },
				mode: ProjectMode.SIMULATION,
				project: { scene3d: {} },
			}),
		);
		rerender(<SidePanel />);
		expect(screen.getByTestId("scene")).toBe(scene);
	});
});
