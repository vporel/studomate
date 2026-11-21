/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "../projects/ProjectContext";
import useGotoProgram from "../projects/useGotoProgram";
import ExplorerSystemBlockInstancesItems from "./ExplorerSystemBlockInstancesItems";

jest.mock("../projects/ProjectContext");
jest.mock("../projects/useGotoProgram");

const blockEntry = (
	ladderId: string,
	elementId: string,
	blockType: "timer" | "counter",
	name: string,
) => ({
	ladder: { id: ladderId },
	element: { id: elementId, data: { blockType, params: { name } } },
});

function setup(
	timers: ReturnType<typeof blockEntry>[],
	counters: ReturnType<typeof blockEntry>[],
) {
	const onGotoProgram = jest.fn();
	const onContextMenu = jest.fn();
	(useGotoProgram as jest.Mock).mockReturnValue(onGotoProgram);
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({
			project: {
				getAllTimerBlockElements: () => timers,
				getAllCounterBlockElements: () => counters,
			},
		}),
	);
	render(
		<SimpleTreeView>
			<ExplorerSystemBlockInstancesItems
				styles={{}}
				onContextMenu={onContextMenu}
			/>
		</SimpleTreeView>,
	);
	return { onGotoProgram, onContextMenu };
}

describe("ExplorerSystemBlockInstancesItems", () => {
	it("lists timers then counters, named after their parameters", () => {
		setup(
			[blockEntry("l1", "e1", "timer", "T1")],
			[blockEntry("l2", "e2", "counter", "C1")],
		);
		expect(screen.getAllByRole("treeitem").map((i) => i.textContent)).toEqual([
			"T1",
			"C1",
		]);
	});

	it("ignores elements whose block type does not match", () => {
		setup([blockEntry("l1", "e1", "counter", "X")], []);
		expect(screen.queryAllByRole("treeitem")).toHaveLength(0);
	});

	it("goes to the ladder and highlights the element on click", () => {
		const { onGotoProgram } = setup(
			[blockEntry("l1", "e1", "timer", "T1")],
			[],
		);
		fireEvent.click(screen.getByText("T1"));
		expect(onGotoProgram).toHaveBeenCalledWith("l1", "ladder", "e1");
	});

	it("reports the block instance on context menu", () => {
		const { onContextMenu } = setup(
			[],
			[blockEntry("l2", "e2", "counter", "C1")],
		);
		fireEvent.contextMenu(screen.getByText("C1"));
		expect(onContextMenu).toHaveBeenCalledWith(expect.anything(), {
			type: "block-instance",
			ladderId: "l2",
			elementId: "e2",
		});
	});

	it("keeps instances of the same ladder distinct", () => {
		setup(
			[
				blockEntry("l1", "e1", "timer", "T1"),
				blockEntry("l1", "e2", "timer", "T2"),
			],
			[],
		);
		expect(screen.getAllByRole("treeitem")).toHaveLength(2);
	});
});
