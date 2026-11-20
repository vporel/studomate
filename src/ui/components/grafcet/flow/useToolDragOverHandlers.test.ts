/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useReactFlow } from "@xyflow/react";
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import { useGrafcetToolbarDnD } from "../toolbar/GrafcetToolbarDnDContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { i18nWrapper } from "@tests/utils/i18n";
import useToolDragOverHandlers from "./useToolDragOverHandlers";

jest.mock("@/ui/components/grafcet/context/GrafcetContext");
jest.mock("../toolbar/GrafcetToolbarDnDContext", () => ({
	useGrafcetToolbarDnD: jest.fn(),
}));
jest.mock("@xyflow/react", () => ({
	useReactFlow: jest.fn(),
}));
jest.mock("./grafcet-nodes-definitions", () => ({
	GRAFCET_ELEMENTS_CONFIG: {
		step: {
			elementClass: {
				DEFAULT_DIMENSIONS: { width: 100, height: 60 },
				generateDefaultData: jest.fn((extraData) => ({
					generated: true,
					extraData,
				})),
			},
		},
		comment: {
			elementClass: {
				DEFAULT_DIMENSIONS: { width: 150, height: 40 },
				generateDefaultData: jest.fn(() => ({ text: "Commentaire" })),
			},
		},
	},
}));

function fakeDragEvent(clientX: number, clientY: number) {
	return {
		preventDefault: jest.fn(),
		dataTransfer: { dropEffect: "" },
		clientX,
		clientY,
		pageX: clientX + 1000,
		pageY: clientY + 1000,
	} as any;
}

describe("useToolDragOverHandlers", () => {
	const addNodes = jest.fn();
	const workflowManager = { addDroppedNode: addNodes };
	const screenToFlowPosition = jest.fn(({ x, y }) => ({ x, y }));

	afterEach(() => jest.clearAllMocks());

	function setup(
		draggedItem: { type: string; extraData?: unknown } | null,
		locale: "fr" | "en" | "es" = "fr",
	) {
		(useGrafcetStore as jest.Mock).mockImplementation(
			selectorImplementation({ workflowManager }),
		);
		(useGrafcetToolbarDnD as jest.Mock).mockReturnValue({ draggedItem });
		(useReactFlow as jest.Mock).mockReturnValue({ screenToFlowPosition });
		return renderHook(() => useToolDragOverHandlers(), {
			wrapper: i18nWrapper(locale),
		});
	}

	it("marks the drag-over as a move and prevents default", () => {
		const { result } = setup({ type: "step" });
		const [handleToolDragOver] = result.current;
		const event = fakeDragEvent(0, 0);

		act(() => handleToolDragOver(event));

		expect(event.preventDefault).toHaveBeenCalled();
		expect(event.dataTransfer.dropEffect).toBe("move");
	});

	it("adds a node centered on the drop position", () => {
		const { result } = setup({ type: "step", extraData: { some: "data" } });
		const [, handleToolDrop] = result.current;
		const event = fakeDragEvent(150, 130);

		act(() => handleToolDrop(event));

		expect(event.preventDefault).toHaveBeenCalled();
		expect(addNodes).toHaveBeenCalledTimes(1);
		const [node] = addNodes.mock.calls[0];
		expect(node).toMatchObject({
			type: "step",
			position: { x: 100, y: 100 },
			data: { generated: true, extraData: { some: "data" } },
		});
		expect(node.id).toEqual(expect.any(String));
	});

	it("does nothing when no tool is being dragged", () => {
		const { result } = setup(null);
		const [, handleToolDrop] = result.current;

		act(() => handleToolDrop(fakeDragEvent(0, 0)));

		expect(addNodes).not.toHaveBeenCalled();
	});

	it("writes a new comment in the interface language", () => {
		const { result } = setup({ type: "comment" }, "es");
		const [, handleToolDrop] = result.current;

		act(() => handleToolDrop(fakeDragEvent(0, 0)));

		expect(addNodes.mock.calls[0][0].data).toEqual({ text: "Comentario" });
	});
});
