/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import useProjectPrograms from "./useProjectPrograms";

jest.mock("@/ui/components/projects/ProjectContext");

describe("useProjectPrograms", () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it("returns an empty array when there is no project", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation((selector: any) =>
			selector({ project: null })
		);
		const { result } = renderHook(() => useProjectPrograms());
		expect(result.current).toEqual([]);
	});

	it("returns a sorted list of grafcets and ladders", () => {
		const mockState = {
			project: {
				grafcets: {
					g1: { id: "g1", name: "Zebra" },
					g2: { id: "g2", name: "Apple" },
				},
				ladders: {
					l1: { id: "l1", name: "Mango" },
					l2: { id: "l2", name: "Banana" },
				},
			},
		};

		(useProjectStore as unknown as jest.Mock).mockImplementation((selector: any) =>
			selector(mockState)
		);

		const { result } = renderHook(() => useProjectPrograms());
		
		expect(result.current).toEqual([
			{ id: "g2", name: "Apple", type: "grafcet" },
			{ id: "l2", name: "Banana", type: "ladder" },
			{ id: "l1", name: "Mango", type: "ladder" },
			{ id: "g1", name: "Zebra", type: "grafcet" },
		]);
	});
});
