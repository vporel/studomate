/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useBarDrag from "./useBarDrag";

jest.mock("@/ui/components/grafcet/context/GrafcetContext");
jest.mock("@xyflow/react", () => ({
	useStore: (selector: (s: unknown) => unknown) =>
		selector({ transform: [0, 0, 1] }),
	useUpdateNodeInternals: () => jest.fn(),
}));

const baseData: JunctionData = {
	pivotPosition: 100,
	branches: {
		b1: { id: "b1", position: 50 },
		b2: { id: "b2", position: 120 },
	},
	branchesOrder: ["b1", "b2"],
};

function setup(args: Parameters<typeof useBarDrag>) {
	const previewJunctionBarPosition = jest.fn();
	const updateNodeData = jest.fn();
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			workflowManager: { previewJunctionBarPosition, updateNodeData },
		}),
	);
	const { result } = renderHook(() => useBarDrag(...args));
	return { startDrag: result.current, previewJunctionBarPosition, updateNodeData };
}

function pointerDown(grip: HTMLElement, clientX: number) {
	return {
		button: 0,
		clientX,
		pointerId: 1,
		currentTarget: grip,
		stopPropagation: jest.fn(),
	} as unknown as React.PointerEvent<HTMLElement>;
}

function move(grip: HTMLElement, clientX: number) {
	grip.dispatchEvent(
		new MouseEvent("pointermove", { clientX } as MouseEventInit),
	);
}

describe("useBarDrag", () => {
	it("prévisualise le déplacement d'une branche pendant le glisser, aligné sur la grille", () => {
		const grip = document.createElement("div");
		const { startDrag, previewJunctionBarPosition, updateNodeData } = setup([
			"node-1",
			baseData,
			false,
			"b1",
			50,
			200,
		]);

		startDrag(pointerDown(grip, 0));
		move(grip, 23);

		expect(previewJunctionBarPosition).toHaveBeenLastCalledWith("node-1", {
			branches: { ...baseData.branches, b1: { id: "b1", position: 70 } },
		});
		expect(updateNodeData).not.toHaveBeenCalled();
	});

	it("ignore une position qui chevauche une autre branche", () => {
		const grip = document.createElement("div");
		const { startDrag, previewJunctionBarPosition } = setup([
			"node-1",
			baseData,
			false,
			"b1",
			50,
			200,
		]);

		startDrag(pointerDown(grip, 0));
		move(grip, 70); // 50 -> 120, position de b2

		expect(previewJunctionBarPosition).not.toHaveBeenCalled();
	});

	it("valide la position finale en une seule commande au relâchement", () => {
		const grip = document.createElement("div");
		const { startDrag, updateNodeData } = setup([
			"node-1",
			baseData,
			false,
			"b1",
			50,
			200,
		]);

		startDrag(pointerDown(grip, 0));
		move(grip, 8);
		move(grip, 17);
		move(grip, 31);
		grip.dispatchEvent(new MouseEvent("pointerup"));

		expect(updateNodeData).toHaveBeenCalledTimes(1);
		const updater = updateNodeData.mock.calls[0][1];
		expect(updater(baseData)).toEqual({
			branches: { ...baseData.branches, b1: { id: "b1", position: 80 } },
		});
	});

	it("ne pousse aucune commande si le pin revient à sa position d'origine", () => {
		const grip = document.createElement("div");
		const { startDrag, updateNodeData } = setup([
			"node-1",
			baseData,
			false,
			"b1",
			50,
			200,
		]);

		startDrag(pointerDown(grip, 0));
		move(grip, 20);
		move(grip, 2);
		grip.dispatchEvent(new MouseEvent("pointerup"));

		expect(updateNodeData).not.toHaveBeenCalled();
	});

	it("déplace le pivot", () => {
		const grip = document.createElement("div");
		const { startDrag, previewJunctionBarPosition } = setup([
			"node-1",
			baseData,
			true,
			null,
			100,
			200,
		]);

		startDrag(pointerDown(grip, 0));
		move(grip, -30);

		expect(previewJunctionBarPosition).toHaveBeenLastCalledWith("node-1", {
			pivotPosition: 70,
		});
	});

	it("cesse d'écouter après le relâchement du pointeur", () => {
		const grip = document.createElement("div");
		const { startDrag, previewJunctionBarPosition } = setup([
			"node-1",
			baseData,
			false,
			"b1",
			50,
			200,
		]);

		startDrag(pointerDown(grip, 0));
		grip.dispatchEvent(new MouseEvent("pointerup"));
		previewJunctionBarPosition.mockClear();
		move(grip, 40);

		expect(previewJunctionBarPosition).not.toHaveBeenCalled();
	});
});
