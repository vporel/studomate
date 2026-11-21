/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "./ProjectContext";
import useCanEditProject from "./useCanEditProject";

jest.mock("./ProjectContext");

function setup(state: object) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation(state),
	);
	return renderHook(() => useCanEditProject()).result.current;
}

describe("useCanEditProject", () => {
	it("is true in design mode with editing enabled", () => {
		expect(setup({ mode: ProjectMode.DESIGN, editingEnabled: true })).toBe(
			true,
		);
	});

	it("is false in simulation mode", () => {
		expect(setup({ mode: ProjectMode.SIMULATION, editingEnabled: true })).toBe(
			false,
		);
	});

	it("is false for a project opened read-only", () => {
		expect(setup({ mode: ProjectMode.DESIGN, editingEnabled: false })).toBe(
			false,
		);
	});

	it("stays true when the active page is locked", () => {
		expect(
			setup({
				mode: ProjectMode.DESIGN,
				editingEnabled: true,
				activePageId: "p1",
				pagesData: { p1: { id: "p1", type: "grafcet", locked: true } },
			}),
		).toBe(true);
	});
});
