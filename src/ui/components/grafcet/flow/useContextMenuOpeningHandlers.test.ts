/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useGrafcetContext } from "../context/GrafcetContext";
import useFlowContextMenu from "@/ui/lib/hooks/useFlowContextMenu";
import useContextMenuOpeningHandlers from "./useContextMenuOpeningHandlers";

jest.mock("../context/GrafcetContext");
jest.mock("@/ui/lib/hooks/useFlowContextMenu");

describe("useContextMenuOpeningHandlers", () => {
	const openContextMenu = jest.fn();
	const contextMenuEvents = {};

	beforeEach(() => {
		(useGrafcetContext as jest.Mock).mockReturnValue({ contextMenuEvents });
		(useFlowContextMenu as jest.Mock).mockReturnValue({ openContextMenu });
	});

	afterEach(() => jest.clearAllMocks());

	it("delegates pane context menu opening with a pane element", () => {
		const { result } = renderHook(() => useContextMenuOpeningHandlers());
		const event = {} as any;

		act(() => result.current.onPaneContextMenu(event));

		expect(openContextMenu).toHaveBeenCalledWith(event, { type: "pane" });
	});

	it("delegates node context menu opening with the node", () => {
		const { result } = renderHook(() => useContextMenuOpeningHandlers());
		const event = {} as any;
		const node = { id: "n1" };

		act(() => result.current.onNodeContextMenu(event, node));

		expect(openContextMenu).toHaveBeenCalledWith(event, node);
	});

	it("delegates edge context menu opening with the edge", () => {
		const { result } = renderHook(() => useContextMenuOpeningHandlers());
		const event = {} as any;
		const edge = { id: "e1" };

		act(() => result.current.onEdgeContextMenu(event, edge));

		expect(openContextMenu).toHaveBeenCalledWith(event, edge);
	});
});
