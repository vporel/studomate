/**
 * @jest-environment jsdom
 */
import useCanEditActivePage from "@/ui/components/projects/useCanEditActivePage";
import { fireEvent, render } from "@testing-library/react";
import JunctionNodeBranchAddButtons from "./JunctionNodeBranchAddButtons";
import { useJunctionNodeContext } from "./context/JunctionNodeContext";

jest.mock("./context/JunctionNodeContext");
jest.mock("@/ui/components/projects/useCanEditActivePage");

function setup(positions: { left: number; insertIndex: number }[]) {
	const onBranchAdd = jest.fn();
	(useJunctionNodeContext as jest.Mock).mockReturnValue({
		branchAddButtonsPositions: positions,
		onBranchAdd,
	});
	const utils = render(<JunctionNodeBranchAddButtons top={20} />);
	return { onBranchAdd, ...utils };
}

describe("JunctionNodeBranchAddButtons", () => {
	beforeEach(() => (useCanEditActivePage as jest.Mock).mockReturnValue(true));

	it("renders one button per position", () => {
		const { getAllByRole } = setup([
			{ left: 10, insertIndex: 0 },
			{ left: 50, insertIndex: 1 },
			{ left: 90, insertIndex: 2 },
		]);
		expect(getAllByRole("button")).toHaveLength(3);
	});

	it("renders no button when the project cannot be edited", () => {
		(useCanEditActivePage as jest.Mock).mockReturnValue(false);
		const { queryAllByRole } = setup([{ left: 10, insertIndex: 0 }]);
		expect(queryAllByRole("button")).toHaveLength(0);
	});

	it("renders nothing without positions", () => {
		const { queryAllByRole } = setup([]);
		expect(queryAllByRole("button")).toHaveLength(0);
	});

	it("calls onBranchAdd with the insertion index of the clicked button", () => {
		const { getAllByRole, onBranchAdd } = setup([
			{ left: 10, insertIndex: 0 },
			{ left: 50, insertIndex: 1 },
		]);
		fireEvent.click(getAllByRole("button")[1]!);
		expect(onBranchAdd).toHaveBeenCalledTimes(1);
		expect(onBranchAdd).toHaveBeenCalledWith(1);
	});

	it("places each button at its left position, centered, and at the given top", () => {
		const { getAllByRole } = setup([{ left: 50, insertIndex: 0 }]);
		const style = getComputedStyle(getAllByRole("button")[0]!);
		expect(style.top).toBe("20px");
		expect(style.left).toBe("40px");
	});
});
