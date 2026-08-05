/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import useFlowContextMenu from "./useFlowContextMenu";
import { useReactFlow } from "@xyflow/react";

jest.mock("@xyflow/react", () => ({
	useReactFlow: jest.fn(),
}));

describe("useFlowContextMenu", () => {
	const mockScreenToFlowPosition = jest.fn();
	const mockEmit = jest.fn();
	let contextMenuEvents: any;

	beforeEach(() => {
		jest.clearAllMocks();
		(useReactFlow as jest.Mock).mockReturnValue({
			screenToFlowPosition: mockScreenToFlowPosition,
		});
		contextMenuEvents = { emit: mockEmit };
	});

	it("opens context menu without guard", () => {
		mockScreenToFlowPosition.mockReturnValue({ x: 100, y: 200 });
		const { result } = renderHook(() => useFlowContextMenu(contextMenuEvents));

		const preventDefault = jest.fn();
		const event = { clientX: 10, clientY: 20, preventDefault } as unknown as MouseEvent;
		
		act(() => {
			result.current.openContextMenu(event, { id: "element1" });
		});

		expect(preventDefault).toHaveBeenCalled();
		expect(mockScreenToFlowPosition).toHaveBeenCalledWith({ x: 10, y: 20 });
		expect(mockEmit).toHaveBeenCalledWith("show", {
			element: { id: "element1" },
			position: { x: 100, y: 200 },
		});
	});

	it("opens context menu when guard allows it", () => {
		const canOpen = jest.fn().mockReturnValue(true);
		const { result } = renderHook(() => useFlowContextMenu(contextMenuEvents, canOpen));

		const event = { clientX: 0, clientY: 0, preventDefault: jest.fn() } as unknown as MouseEvent;
		act(() => result.current.openContextMenu(event, { id: "element1" }));

		expect(canOpen).toHaveBeenCalledWith({ id: "element1" });
		expect(mockEmit).toHaveBeenCalledWith("show", expect.any(Object));
	});

	it("does not open context menu when guard prevents it", () => {
		const canOpen = jest.fn().mockReturnValue(false);
		const { result } = renderHook(() => useFlowContextMenu(contextMenuEvents, canOpen));

		const event = { clientX: 0, clientY: 0, preventDefault: jest.fn() } as unknown as MouseEvent;
		act(() => result.current.openContextMenu(event, { id: "element1" }));

		expect(canOpen).toHaveBeenCalledWith({ id: "element1" });
		expect(mockEmit).not.toHaveBeenCalled();
	});

	it("closes context menu", () => {
		const { result } = renderHook(() => useFlowContextMenu(contextMenuEvents));

		act(() => {
			result.current.closeContextMenu();
		});

		expect(mockEmit).toHaveBeenCalledWith("hide");
	});
});
