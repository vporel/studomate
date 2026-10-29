/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Project from "@/schemas/project/project.schema";
import useProgramMenuItems from "./useProgramMenuItems";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("./ExplorerContextMenu", () => ({
	explorerContextMenuEventsOut: {
		emit: jest.fn(),
		on: jest.fn(),
		off: jest.fn(),
	},
}));

import { explorerContextMenuEventsOut } from "./ExplorerContextMenu";

describe.each([
	{ type: "grafcet" as const, other: "ladder" as const, id: "g1" },
	{ type: "ladder" as const, other: "grafcet" as const, id: "l1" },
])("useProgramMenuItems($type)", ({ type, id }) => {
	const makeManager = () => ({
		getProgramOrThrow: jest.fn(),
		deleteProgramById: jest.fn(),
		setExcludedFromExecution: jest.fn(),
	});
	const grafcetsManager = makeManager();
	const laddersManager = makeManager();
	const manager = type === "grafcet" ? grafcetsManager : laddersManager;
	const otherManager = type === "grafcet" ? laddersManager : grafcetsManager;
	const pagesManager = { openPage: jest.fn() };
	const renameEvent = `${type}-rename`;
	const renamePayload =
		type === "grafcet" ? { grafcetId: id } : { ladderId: id };

	function setup(mode: ProjectMode, project?: Project) {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				grafcetsManager,
				laddersManager,
				pagesManager,
				mode,
				project,
			}),
		);
		return renderHook(() => useProgramMenuItems(type), {
			wrapper: i18nWrapper(),
		});
	}

	afterEach(() => jest.clearAllMocks());

	it(`opens the page for the given ${type}`, () => {
		manager.getProgramOrThrow.mockReturnValue({ name: "Program 1" });
		const { result } = setup(ProjectMode.DESIGN);

		act(() => result.current(id)[0][0].onClick?.());

		expect(pagesManager.openPage).toHaveBeenCalledWith({
			id,
			type,
			title: "Program 1",
		});
	});

	it(`does not open a page when the ${type} no longer exists`, () => {
		manager.getProgramOrThrow.mockReturnValue(undefined);
		const { result } = setup(ProjectMode.DESIGN);

		act(() => result.current(id)[0][0].onClick?.());

		expect(pagesManager.openPage).not.toHaveBeenCalled();
	});

	it("enables rename and delete in design mode", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const items = result.current(id);
		expect(items[1][0].disabled).toBe(false);
		expect(items[1][1].disabled).toBe(false);
	});

	it("disables rename and delete outside design mode", () => {
		const { result } = setup(ProjectMode.SIMULATION);
		const items = result.current(id);
		expect(items[1][0].disabled).toBe(true);
		expect(items[1][1].disabled).toBe(true);
	});

	it("emits a rename event", () => {
		const { result } = setup(ProjectMode.DESIGN);
		act(() => result.current(id)[1][0].onClick?.());
		expect(explorerContextMenuEventsOut.emit).toHaveBeenCalledWith(
			renameEvent,
			renamePayload,
		);
	});

	it(`deletes the ${type} after confirmation`, () => {
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
		const { result } = setup(ProjectMode.DESIGN);

		act(() => result.current(id)[1][1].onClick?.());

		expect(manager.deleteProgramById).toHaveBeenCalledWith(id);
		confirmSpy.mockRestore();
	});

	it(`does not delete the ${type} when the user cancels`, () => {
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
		const { result } = setup(ProjectMode.DESIGN);

		act(() => result.current(id)[1][1].onClick?.());

		expect(manager.deleteProgramById).not.toHaveBeenCalled();
		confirmSpy.mockRestore();
	});

	it("never uses the manager of the other program type", () => {
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
		manager.getProgramOrThrow.mockReturnValue({ name: "Program 1" });
		const { result } = setup(ProjectMode.DESIGN);

		act(() => {
			result.current(id)[0][0].onClick?.();
			result.current(id)[1][1].onClick?.();
		});

		expect(otherManager.getProgramOrThrow).not.toHaveBeenCalled();
		expect(otherManager.deleteProgramById).not.toHaveBeenCalled();
		expect(otherManager.setExcludedFromExecution).not.toHaveBeenCalled();
		confirmSpy.mockRestore();
	});

	if (type === "grafcet") {
		it("adds an item to include an excluded grafcet back in execution", () => {
			const project = new Project("p1", "P", "");
			const grafcet = new Grafcet("g1", "G1");
			grafcet.excludedFromExecution = true;
			project.addProgram(grafcet);
			const { result } = setup(ProjectMode.DESIGN, project);

			const items = result.current("g1");
			act(() => items[2][0].onClick?.());

			expect(grafcetsManager.setExcludedFromExecution).toHaveBeenCalledWith(
				"g1",
				false,
			);
			expect(laddersManager.setExcludedFromExecution).not.toHaveBeenCalled();
		});
	} else {
		it("adds an item to exclude a standard ladder from execution", () => {
			const project = new Project("p1", "P", "");
			const ladder = project.createLadder("L1");
			const { result } = setup(ProjectMode.DESIGN, project);

			const items = result.current(ladder.id);
			act(() => items[2][0].onClick?.());

			expect(laddersManager.setExcludedFromExecution).toHaveBeenCalledWith(
				ladder.id,
				true,
			);
			expect(grafcetsManager.setExcludedFromExecution).not.toHaveBeenCalled();
		});

		it("adds no execution item for the Main", () => {
			const project = new Project("p1", "P", "");
			const main = Object.values(project.ladders).find(
				(l) => l.role === "main",
			)!;
			const { result } = setup(ProjectMode.DESIGN, project);

			expect(result.current(main.id)).toHaveLength(2);
		});
	}
});
