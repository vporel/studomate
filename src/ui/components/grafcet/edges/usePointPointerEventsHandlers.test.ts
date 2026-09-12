/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useReactFlow } from "@xyflow/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import usePointPointerEventsHandlers from "./usePointPointerEventsHandlers";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/grafcet/context/GrafcetContext");
jest.mock("@xyflow/react", () => ({
	useReactFlow: jest.fn(),
}));

function fakePointerEvent(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		stopPropagation: jest.fn(),
		target: { setPointerCapture: jest.fn(), releasePointerCapture: jest.fn() },
		pointerId: 1,
		buttons: 0,
		pageX: 0,
		pageY: 0,
		...overrides,
	} as any;
}

describe("usePointPointerEventsHandlers", () => {
	const updateEdgeData = jest.fn();
	const workflowManager = { updateEdgeData };
	const screenToFlowPosition = jest.fn(({ x, y }) => ({ x, y }));

	// `points` ne porte que les coudes intermédiaires.
	function setup(mode: ProjectMode) {
		(useGrafcetStore as jest.Mock).mockImplementation(
			selectorImplementation({ workflowManager }),
		);
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({ mode }),
		);
		(useReactFlow as jest.Mock).mockReturnValue({ screenToFlowPosition });
		const points: [number, number][] = [
			[0, 0],
			[10, 0],
			[20, 0],
		];
		const setPoints = jest.fn();
		const { result } = renderHook(() =>
			usePointPointerEventsHandlers(points, setPoints, "edge-1"),
		);
		return { result, setPoints };
	}

	afterEach(() => jest.clearAllMocks());

	describe("handlePointPointerDown", () => {
		it("captures the pointer", () => {
			const { result } = setup(ProjectMode.DESIGN);
			const event = fakePointerEvent();
			act(() => result.current.handlePointPointerDown(event, 1));
			expect(event.target.setPointerCapture).toHaveBeenCalledWith(1);
		});

		it("does nothing outside design mode", () => {
			const { result } = setup(ProjectMode.SIMULATION);
			const event = fakePointerEvent();
			act(() => result.current.handlePointPointerDown(event, 1));
			expect(event.target.setPointerCapture).not.toHaveBeenCalled();
		});

		it("deletes the targeted coude on right click", () => {
			const { result } = setup(ProjectMode.DESIGN);
			const event = fakePointerEvent({ buttons: 2 });
			act(() => result.current.handlePointPointerDown(event, 0));

			expect(updateEdgeData).toHaveBeenCalledWith(
				"edge-1",
				expect.any(Function),
			);
			const updater = updateEdgeData.mock.calls[0][1];
			expect(
				updater({
					points: [
						[0, 0],
						[10, 0],
						[20, 0],
					],
				}),
			).toEqual({
				points: [
					[10, 0],
					[20, 0],
				],
			});
		});

		it("does nothing on right click for an out-of-range index", () => {
			const { result } = setup(ProjectMode.DESIGN);
			const event = fakePointerEvent({ buttons: 2 });
			act(() => result.current.handlePointPointerDown(event, 5));

			const updater = updateEdgeData.mock.calls[0][1];
			expect(
				updater({
					points: [
						[0, 0],
						[10, 0],
						[20, 0],
					],
				}),
			).toEqual({});
		});
	});

	describe("handlePointPointerMove", () => {
		it("updates the moved coude's position when the left button is held", () => {
			const { result, setPoints } = setup(ProjectMode.DESIGN);
			const event = fakePointerEvent({ buttons: 1, pageX: 99, pageY: 42 });

			act(() => result.current.handlePointPointerMove(event, 1));

			expect(setPoints).toHaveBeenCalledWith(expect.any(Function));
			const updater = setPoints.mock.calls[0][0];
			expect(
				updater([
					[0, 0],
					[10, 0],
					[20, 0],
				]),
			).toEqual([
				[0, 0],
				[99, 42],
				[20, 0],
			]);
		});

		it("does nothing when no button is held", () => {
			const { result, setPoints } = setup(ProjectMode.DESIGN);
			const event = fakePointerEvent({ buttons: 0 });

			act(() => result.current.handlePointPointerMove(event, 1));

			expect(setPoints).not.toHaveBeenCalled();
		});
	});

	describe("handlePointPointerUp", () => {
		it("releases the pointer and persists the coudes", () => {
			const { result } = setup(ProjectMode.DESIGN);
			const event = fakePointerEvent();

			act(() => result.current.handlePointPointerUp(event, 1));

			expect(event.target.releasePointerCapture).toHaveBeenCalledWith(1);
			expect(updateEdgeData).toHaveBeenCalledWith("edge-1", {
				points: [
					[0, 0],
					[10, 0],
					[20, 0],
				],
			});
		});
	});
});
