/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { useProjectStore } from "../projects/ProjectContext";
import { explorerContextMenuEventsOut } from "./context-menu/ExplorerContextMenu";
import ExplorerHmiItems from "./ExplorerHmiItems";

jest.mock("../projects/ProjectContext");
jest.mock("./context-menu/ExplorerContextMenu", () => {
	const mod = jest.requireActual("mitt");
	const mitt = mod.default?.default ?? mod.default ?? mod;
	return { explorerContextMenuEventsOut: mitt() };
});

function setup({
	pages = [
		{ id: "h1", name: "Accueil" },
		{ id: "h2", name: "Supervision" },
	],
	mainId = "h1" as string | undefined,
	mode = ProjectMode.DESIGN,
} = {}) {
	const hmiManager = { renameHmiPage: jest.fn() };
	const pagesManager = { openPage: jest.fn() };
	const onContextMenu = jest.fn();
	const project = {
		hmiPages: Object.fromEntries(pages.map((p) => [p.id, p])),
		getMainHmiPage: () => pages.find((p) => p.id === mainId),
	};
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({
			project,
			mode,
			editingEnabled: true,
			hmiManager,
			pagesManager,
		}),
	);
	render(
		<SimpleTreeView>
			<ExplorerHmiItems styles={{}} onContextMenu={onContextMenu} />
		</SimpleTreeView>,
		{ wrapper: i18nWrapper() },
	);
	return { hmiManager, pagesManager, onContextMenu };
}

describe("ExplorerHmiItems", () => {
	it("shows a placeholder when the project has no HMI page", () => {
		setup({ pages: [], mainId: undefined });
		expect(screen.getByText("Aucune page HMI")).toBeInTheDocument();
	});

	it("tags only the main page", () => {
		setup();
		expect(screen.getAllByText("Principale")).toHaveLength(1);
		expect(screen.getByText("Accueil").closest("li")!.textContent).toContain(
			"Principale",
		);
		expect(
			screen.getByText("Supervision").closest("li")!.textContent,
		).not.toContain("Principale");
	});

	it("opens the page on click", () => {
		const { pagesManager } = setup();
		fireEvent.click(screen.getByText("Supervision"));
		expect(pagesManager.openPage).toHaveBeenCalledWith({
			id: "h2",
			type: "hmi",
			title: "Supervision",
		});
	});

	it("reports the page on context menu", () => {
		const { onContextMenu } = setup();
		fireEvent.contextMenu(screen.getByText("Supervision"));
		expect(onContextMenu).toHaveBeenCalledWith(expect.anything(), {
			type: "hmi",
			hmiPageId: "h2",
		});
	});

	it("renames the page on double click then Enter", () => {
		const { hmiManager } = setup();
		fireEvent.doubleClick(screen.getByText("Accueil"));
		const input = screen.getByDisplayValue("Accueil");
		fireEvent.change(input, { target: { value: "  Home " } });
		fireEvent.keyDown(input, { key: "Enter" });
		expect(hmiManager.renameHmiPage).toHaveBeenCalledWith("h1", "Home");
	});

	it("does not start renaming on double click in simulation", () => {
		setup({ mode: ProjectMode.SIMULATION });
		fireEvent.doubleClick(screen.getByText("Accueil"));
		expect(screen.queryByDisplayValue("Accueil")).not.toBeInTheDocument();
	});

	it("starts renaming the page targeted by a hmi-rename event only", () => {
		setup();
		act(() => {
			explorerContextMenuEventsOut.emit("hmi-rename", { hmiPageId: "h2" });
		});
		expect(screen.getByDisplayValue("Supervision")).toBeInTheDocument();
		expect(screen.queryByDisplayValue("Accueil")).not.toBeInTheDocument();
	});

	it("ignores a hmi-rename event in simulation", () => {
		setup({ mode: ProjectMode.SIMULATION });
		act(() => {
			explorerContextMenuEventsOut.emit("hmi-rename", { hmiPageId: "h2" });
		});
		expect(screen.queryByDisplayValue("Supervision")).not.toBeInTheDocument();
	});
});
