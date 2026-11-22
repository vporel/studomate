/**
 * @jest-environment jsdom
 */
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { SYSTEM_BLOCK_CATALOG } from "@/ui/components/ladder/system-blocks/system-block-catalog";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-system-block-drag";
import { useProjectStore } from "../projects/ProjectContext";
import ExplorerSystemBlocksItems from "./ExplorerSystemBlocksItems";

jest.mock("../projects/ProjectContext");

function setup(mode: ProjectMode) {
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({ mode, editingEnabled: true }),
	);
	render(
		<SimpleTreeView>
			<ExplorerSystemBlocksItems styles={{}} />
		</SimpleTreeView>,
		{ wrapper: i18nWrapper() },
	);
}

function dragStart(label: string) {
	const dataTransfer = { setData: jest.fn(), effectAllowed: "" };
	const item = screen.getByText(label).closest("li")!;
	const event = createEvent.dragStart(item);
	Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
	fireEvent(item, event);
	return dataTransfer;
}

describe("ExplorerSystemBlocksItems", () => {
	it("lists one entry per catalog block", () => {
		setup(ProjectMode.DESIGN);
		expect(screen.getAllByRole("treeitem")).toHaveLength(
			SYSTEM_BLOCK_CATALOG.length,
		);
	});

	it("carries the block type in the drag data while designing", () => {
		setup(ProjectMode.DESIGN);
		const item = screen.getByText("Temporisation").closest("li")!;
		expect(item).toHaveAttribute("draggable", "true");

		const dataTransfer = dragStart("Temporisation");

		expect(dataTransfer.setData).toHaveBeenCalledWith(
			LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE,
			"timer",
		);
		expect(dataTransfer.effectAllowed).toBe("copy");
	});

	it("is not draggable in simulation", () => {
		setup(ProjectMode.SIMULATION);
		const item = screen.getByText("Temporisation").closest("li")!;
		expect(item).not.toHaveAttribute("draggable", "true");

		const dataTransfer = dragStart("Temporisation");

		expect(dataTransfer.setData).not.toHaveBeenCalled();
	});
});
