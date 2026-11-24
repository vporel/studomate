/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { selectorImplementation } from "@tests/utils/store-mocks";
import type { LadderElement } from "@/schemas/ladder/element.schema";
import { createCounterBlockElement } from "@/schemas/ladder/function-blocks/counter.schema";
import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { useProjectStore } from "../projects/ProjectContext";
import useGotoProgram from "../projects/useGotoProgram";
import ExplorerSystemBlockInstancesItems from "./ExplorerSystemBlockInstancesItems";

jest.mock("../projects/ProjectContext");
jest.mock("../projects/useGotoProgram");

const timer = (id: string, name: string, row = 0) => ({
	...createTimerBlockElement({ name, timerType: "TON", pt: "T#1s" }, row, 0),
	id,
});

const counter = (id: string, name: string, row = 0) => ({
	...createCounterBlockElement(
		{ name, counterType: "CTU", control: "CU", pv: "10" },
		row,
		0,
	),
	id,
});

function ladderWith(id: string, elements: LadderElement[]): Ladder {
	const ladder = new Ladder(id, id);
	ladder.addElements(ladder.sections[0].id, elements);
	return ladder;
}

function setup(ladders: Ladder[]) {
	const onGotoProgram = jest.fn();
	const onContextMenu = jest.fn();
	(useGotoProgram as jest.Mock).mockReturnValue(onGotoProgram);
	(useProjectStore as jest.Mock).mockImplementation(
		selectorImplementation({
			project: {
				ladders: Object.fromEntries(
					ladders.map((ladder) => [ladder.id, ladder]),
				),
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
	it("lists the timers of every ladder, then their counters, named after their parameters", () => {
		setup([
			ladderWith("l1", [counter("c1", "C1"), timer("t1", "T1", 1)]),
			ladderWith("l2", [timer("t2", "T2")]),
		]);
		expect(screen.getAllByRole("treeitem").map((i) => i.textContent)).toEqual([
			"T1",
			"T2",
			"C1",
		]);
	});

	it("goes to the ladder and highlights the element on click", () => {
		const { onGotoProgram } = setup([ladderWith("l1", [timer("e1", "T1")])]);
		fireEvent.click(screen.getByText("T1"));
		expect(onGotoProgram).toHaveBeenCalledWith("l1", "ladder", "e1");
	});

	it("reports the block instance on context menu", () => {
		const { onContextMenu } = setup([ladderWith("l2", [counter("e2", "C1")])]);
		fireEvent.contextMenu(screen.getByText("C1"));
		expect(onContextMenu).toHaveBeenCalledWith(expect.anything(), {
			type: "block-instance",
			ladderId: "l2",
			elementId: "e2",
		});
	});

	it("keeps instances of the same ladder distinct", () => {
		setup([ladderWith("l1", [timer("e1", "T1"), timer("e2", "T2", 1)])]);
		expect(screen.getAllByRole("treeitem")).toHaveLength(2);
	});
});
