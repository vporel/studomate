/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { fakeStoreApi } from "@tests/utils/store-mocks";
import { useProjectContext } from "@/ui/components/projects/ProjectContext";
import useLadderRenderContext from "./useLadderRenderContext";

jest.mock("@/ui/components/projects/ProjectContext");

function setup(state: { project?: unknown }) {
	(useProjectContext as jest.Mock).mockReturnValue(fakeStoreApi(state));
	return renderHook(() => useLadderRenderContext(), {
		wrapper: i18nWrapper(),
	});
}

describe("useLadderRenderContext", () => {
	it("names a target program from the project as it is when the export draws", () => {
		const state: { project?: unknown } = {
			project: { ladders: {}, grafcets: { g1: { name: "Cycle" } } },
		};
		const { result } = setup(state);
		state.project = {
			ladders: { l1: { name: "Pompe" } },
			grafcets: { g1: { name: "Cycle renommé" } },
		};

		expect(result.current.programName?.("g1")).toBe("Cycle renommé");
		expect(result.current.programName?.("l1")).toBe("Pompe");
		expect(result.current.programName?.("missing")).toBeUndefined();
	});

	it("names no program without a project", () => {
		const { result } = setup({});

		expect(result.current.programName?.("g1")).toBeUndefined();
	});

	it("keeps the same context across project edits", () => {
		const state = { project: { ladders: {}, grafcets: {} } };
		const { result, rerender } = setup(state);
		const first = result.current;
		state.project = { ladders: {}, grafcets: {} };

		rerender();

		expect(result.current).toBe(first);
	});
});
