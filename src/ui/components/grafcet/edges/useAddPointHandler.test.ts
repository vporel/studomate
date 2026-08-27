/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useAddPointHandler, { getPointsForAdding } from "./useAddPointHandler";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/grafcet/context/GrafcetContext");

describe("getPointsForAdding", () => {
	it("returns the midpoints between consecutive points", () => {
		expect(
			getPointsForAdding([
				[0, 0],
				[10, 0],
				[10, 10],
			]),
		).toEqual([
			[5, 0],
			[10, 5],
		]);
	});

	it("returns an empty array for a single point", () => {
		expect(getPointsForAdding([[0, 0]])).toEqual([]);
	});
});

describe("useAddPointHandler", () => {
	const updateEdgeData = jest.fn();
	const workflowManager = { updateEdgeData };

	// `vertices` = liste complète `[source, ...coudes, target]`.
	function setup(mode: ProjectMode, vertices: [number, number][]) {
		(useGrafcetStore as jest.Mock).mockImplementation(
			selectorImplementation({ workflowManager }),
		);
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({ mode }),
		);
		return renderHook(() => useAddPointHandler(vertices, "edge-1"));
	}

	afterEach(() => jest.clearAllMocks());

	it("exposes one midpoint per segment as pointsForAdding", () => {
		const { result } = setup(ProjectMode.DESIGN, [
			[0, 0],
			[5, 5],
			[10, 0],
		]);
		expect(result.current.pointsForAdding).toEqual([
			[2.5, 2.5],
			[7.5, 2.5],
		]);
	});

	it("inserts a new coude at the segment index on a straight edge", () => {
		const { result } = setup(ProjectMode.DESIGN, [
			[0, 0],
			[10, 0],
		]);

		act(() => result.current.addPoint(0));

		expect(updateEdgeData).toHaveBeenCalledWith("edge-1", expect.any(Function));
		const updater = updateEdgeData.mock.calls[0][1];
		expect(updater({ points: [] })).toEqual({ points: [[5, 0]] });
	});

	it("inserts a new coude between existing coudes at the segment index", () => {
		const { result } = setup(ProjectMode.DESIGN, [
			[0, 0],
			[5, 5],
			[10, 0],
		]);

		act(() => result.current.addPoint(1));

		const updater = updateEdgeData.mock.calls[0][1];
		expect(updater({ points: [[5, 5]] })).toEqual({
			points: [
				[5, 5],
				[7.5, 2.5],
			],
		});
	});

	it("does nothing outside design mode", () => {
		const { result } = setup(ProjectMode.SIMULATION, [
			[0, 0],
			[10, 0],
		]);

		act(() => result.current.addPoint(0));

		expect(updateEdgeData).not.toHaveBeenCalled();
	});
});
