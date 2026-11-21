/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import useLadderRailEnergized from "./useLadderRailEnergized";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");

function energized(mode: ProjectMode, excludedFromExecution: boolean) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ mode }),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ ladder: { excludedFromExecution } }),
	);
	return renderHook(() => useLadderRailEnergized()).result.current;
}

describe("useLadderRailEnergized", () => {
	it("is energized when simulating an executed ladder", () => {
		expect(energized(ProjectMode.SIMULATION, false)).toBe(true);
	});

	it("is not energized in design mode", () => {
		expect(energized(ProjectMode.DESIGN, false)).toBe(false);
	});

	it("is not energized when the ladder is excluded from execution", () => {
		expect(energized(ProjectMode.SIMULATION, true)).toBe(false);
	});
});
