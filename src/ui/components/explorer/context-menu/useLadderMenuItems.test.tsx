/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useLadderMenuItems from "./useLadderMenuItems";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("./ExplorerContextMenu", () => ({
	explorerContextMenuEventsOut: { emit: jest.fn(), on: jest.fn(), off: jest.fn() },
}));

import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

describe("useLadderMenuItems", () => {
	const laddersManager = {
		getProgramOrThrow: jest.fn(),
		deleteProgramById: jest.fn(),
	};
	const pagesManager = { openPage: jest.fn() };

	function setup(mode: ProjectMode) {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({ laddersManager, pagesManager, mode }),
		);
		return renderHook(() => useLadderMenuItems());
	}

	afterEach(() => jest.clearAllMocks());

	it("opens the page for the given ladder", () => {
		laddersManager.getProgramOrThrow.mockReturnValue({ name: "Ladder 1" });
		const { result } = setup(ProjectMode.DESIGN);

		act(() => result.current("l1")[0][0].onClick?.());

		expect(pagesManager.openPage).toHaveBeenCalledWith({
			id: "l1",
			type: "ladder",
			title: "Ladder 1",
		});
	});

	it("does not open a page when the ladder no longer exists", () => {
		laddersManager.getProgramOrThrow.mockReturnValue(undefined);
		const { result } = setup(ProjectMode.DESIGN);

		act(() => result.current("l1")[0][0].onClick?.());

		expect(pagesManager.openPage).not.toHaveBeenCalled();
	});

	it("enables rename and delete in design mode", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const items = result.current("l1");
		expect(items[1][0].disabled).toBe(false);
		expect(items[1][1].disabled).toBe(false);
	});

	it("disables rename and delete outside design mode", () => {
		const { result } = setup(ProjectMode.SIMULATION);
		const items = result.current("l1");
		expect(items[1][0].disabled).toBe(true);
		expect(items[1][1].disabled).toBe(true);
	});

	it("emits a rename event", () => {
		const { result } = setup(ProjectMode.DESIGN);
		act(() => result.current("l1")[1][0].onClick?.());
		expect(explorerContextMenuEventsOut.emit).toHaveBeenCalledWith("ladder-rename", { ladderId: "l1" });
	});

	it("deletes the ladder after confirmation", () => {
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
		const { result } = setup(ProjectMode.DESIGN);

		act(() => result.current("l1")[1][1].onClick?.());

		expect(laddersManager.deleteProgramById).toHaveBeenCalledWith("l1");
		confirmSpy.mockRestore();
	});

	it("does not delete the ladder when the user cancels", () => {
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
		const { result } = setup(ProjectMode.DESIGN);

		act(() => result.current("l1")[1][1].onClick?.());

		expect(laddersManager.deleteProgramById).not.toHaveBeenCalled();
		confirmSpy.mockRestore();
	});
});
