/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useBranchActions from "./useBranchActions";

jest.mock("@/ui/components/grafcet/context/GrafcetContext");

describe("useBranchActions", () => {
	it("délègue l'ajout d'une branche au workflow manager avec l'index d'insertion", () => {
		const addJunctionBranch = jest.fn();
		(useGrafcetStore as jest.Mock).mockImplementation(
			selectorImplementation({ workflowManager: { addJunctionBranch } }),
		);

		const { result } = renderHook(() => useBranchActions("node-1"));
		act(() => result.current.add(2));

		expect(addJunctionBranch).toHaveBeenCalledWith("node-1", 2);
	});
});
