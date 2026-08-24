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

	it("sorts by type first (ladder before grafcet), then by name", () => {
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
			{ id: "l2", name: "Banana", type: "ladder" },
			{ id: "l1", name: "Mango", type: "ladder" },
			{ id: "g2", name: "Apple", type: "grafcet" },
			{ id: "g1", name: "Zebra", type: "grafcet" },
		]);
	});

	it("place le Main avant les ladders standards, quel que soit son nom", () => {
		const mockState = {
			project: {
				grafcets: {},
				ladders: {
					l1: { id: "l1", name: "Zebra", role: "standard" },
					l2: { id: "l2", name: "Main", role: "main" },
					l3: { id: "l3", name: "Apple", role: "standard" },
				},
			},
		};

		(useProjectStore as unknown as jest.Mock).mockImplementation((selector: any) =>
			selector(mockState)
		);

		const { result } = renderHook(() => useProjectPrograms());

		expect(result.current.map((p) => p.id)).toEqual(["l2", "l3", "l1"]);
	});
});
