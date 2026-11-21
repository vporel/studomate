/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import {
	SYSTEM_VARIABLES_PAGE_DATA,
	getVariablesPageData,
} from "@/ui/stores/project/pages-data";
import { useProjectStore } from "../projects/ProjectContext";
import ExplorerVariablesItems from "./ExplorerVariablesItems";

jest.mock("../projects/ProjectContext");

function setup() {
	const pagesManager = { openPage: jest.fn() };
	const onContextMenu = jest.fn();
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({ pagesManager }),
	);
	render(
		<SimpleTreeView>
			<ExplorerVariablesItems styles={{}} onContextMenu={onContextMenu} />
		</SimpleTreeView>,
		{ wrapper: i18nWrapper() },
	);
	return { pagesManager, onContextMenu };
}

describe("ExplorerVariablesItems", () => {
	it("lists the four variable groups then the system variables", () => {
		setup();
		const labels = screen.getAllByRole("treeitem").map((i) => i.textContent);
		expect(labels).toEqual([
			"Entrées",
			"Sorties",
			"Mémoires",
			"Constantes",
			"Système",
		]);
	});

	it.each([
		["Entrées", "input-variables"],
		["Sorties", "output-variables"],
		["Mémoires", "memory-variables"],
		["Constantes", "constant-variables"],
	] as const)("opens the %s page on click", (label, id) => {
		const { pagesManager } = setup();
		fireEvent.click(screen.getByText(label));
		expect(pagesManager.openPage).toHaveBeenCalledWith(
			getVariablesPageData(id),
		);
	});

	it("opens the system variables page on click", () => {
		const { pagesManager } = setup();
		fireEvent.click(screen.getByText("Système"));
		expect(pagesManager.openPage).toHaveBeenCalledWith(
			SYSTEM_VARIABLES_PAGE_DATA,
		);
	});

	it("reports the variables page on context menu of a group", () => {
		const { onContextMenu } = setup();
		fireEvent.contextMenu(screen.getByText("Sorties"));
		expect(onContextMenu).toHaveBeenCalledWith(expect.anything(), {
			type: "variables",
			variablesPageId: "output-variables",
		});
	});

	it("offers no context menu on the system variables", () => {
		const { onContextMenu } = setup();
		fireEvent.contextMenu(screen.getByText("Système"));
		expect(onContextMenu).not.toHaveBeenCalled();
	});
});
