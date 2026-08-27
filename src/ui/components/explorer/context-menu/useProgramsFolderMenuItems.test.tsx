/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useProgramsFolderMenuItems from "./useProgramsFolderMenuItems";

jest.mock("@/ui/components/projects/ProjectContext");

describe("useProgramsFolderMenuItems", () => {
	const grafcetsManager = { newGrafcet: jest.fn() };
	const laddersManager = { newLadder: jest.fn() };

	function setup(mode: ProjectMode = ProjectMode.DESIGN) {
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({ grafcetsManager, laddersManager, mode }),
		);
		return renderHook(() => useProgramsFolderMenuItems());
	}

	afterEach(() => jest.clearAllMocks());

	it("expose 'Nouveau grafcet' et 'Nouveau ladder' en mode édition", () => {
		const { result } = setup(ProjectMode.DESIGN);
		const items = result.current();

		expect(items[0][0].label).toBe("Nouveau grafcet");
		expect(items[0][0].disabled).toBe(false);
		expect(items[0][1].label).toBe("Nouveau ladder");
		expect(items[0][1].disabled).toBe(false);
	});

	it("désactive les items en mode simulation", () => {
		const { result } = setup(ProjectMode.SIMULATION);
		const items = result.current();

		expect(items[0][0].disabled).toBe(true);
		expect(items[0][1].disabled).toBe(true);
	});

	it("appelle grafcetsManager.newGrafcet au clic sur 'Nouveau grafcet'", () => {
		const { result } = setup();

		act(() => result.current()[0][0].onClick?.());

		expect(grafcetsManager.newGrafcet).toHaveBeenCalledTimes(1);
	});

	it("appelle laddersManager.newLadder au clic sur 'Nouveau ladder'", () => {
		const { result } = setup();

		act(() => result.current()[0][1].onClick?.());

		expect(laddersManager.newLadder).toHaveBeenCalledTimes(1);
	});
});
