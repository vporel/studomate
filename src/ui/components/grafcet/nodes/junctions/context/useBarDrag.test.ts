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

/** Jonction canonique à deux branches : b1 et b2 sont toutes deux des extrémités. */
const twoBranches: JunctionData = {
	pivotPosition: 100,
	branches: {
		b1: { id: "b1", position: 10 },
		b2: { id: "b2", position: 190 },
	},
	branchesOrder: ["b1", "b2"],
};

/** Jonction à trois branches : b2 est une branche intermédiaire. */
const threeBranches: JunctionData = {
	pivotPosition: 100,
	branches: {
		b1: { id: "b1", position: 10 },
		b2: { id: "b2", position: 100 },
		b3: { id: "b3", position: 190 },
	},
	branchesOrder: ["b1", "b2", "b3"],
};

function setup(args: Parameters<typeof useBarDrag>) {
	const previewJunctionBarPosition = jest.fn();
	const updateNodeData = jest.fn();
	const applyJunctionBranchDrag = jest.fn();
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			workflowManager: {
				previewJunctionBarPosition,
				updateNodeData,
				applyJunctionBranchDrag,
			},
		}),
	);
	const { result } = renderHook(() => useBarDrag(...args));
	return {
		startDrag: result.current,
		previewJunctionBarPosition,
		updateNodeData,
		applyJunctionBranchDrag,
	};
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

describe("useBarDrag — branche extrême", () => {
	it("élargit la jonction par la gauche quand on tire la première branche au-delà du bord", () => {
		const grip = document.createElement("div");
		const { startDrag, previewJunctionBarPosition, applyJunctionBranchDrag } =
			setup(["node-1", twoBranches, false, "b1", 10, 200, 300]);

		startDrag(pointerDown(grip, 0));
		move(grip, -30);

		expect(previewJunctionBarPosition).toHaveBeenLastCalledWith(
			"node-1",
			{
				branches: {
					b1: { id: "b1", position: 10 },
					b2: { id: "b2", position: 220 },
				},
				pivotPosition: 130,
			},
			{ x: 270, width: 230 },
		);

		grip.dispatchEvent(new MouseEvent("pointerup"));
		expect(applyJunctionBranchDrag).toHaveBeenCalledWith("node-1", {
			branches: {
				b1: { id: "b1", position: 10 },
				b2: { id: "b2", position: 220 },
			},
			pivotPosition: 130,
			nodeX: 270,
			width: 230,
		});
	});

	it("bute le bord gauche de la jonction sur le bord de la page", () => {
		const grip = document.createElement("div");
		const { startDrag, applyJunctionBranchDrag } = setup([
			"node-1",
			twoBranches,
			false,
			"b1",
			10,
			200,
			20,
		]);

		startDrag(pointerDown(grip, 0));
		move(grip, -100); // ne peut décaler que de 20 vers la gauche
		grip.dispatchEvent(new MouseEvent("pointerup"));

		expect(applyJunctionBranchDrag).toHaveBeenCalledWith("node-1", {
			branches: {
				b1: { id: "b1", position: 10 },
				b2: { id: "b2", position: 210 },
			},
			pivotPosition: 120,
			nodeX: 0,
			width: 220,
		});
	});

	it("élargit la jonction par la droite quand on tire la dernière branche", () => {
		const grip = document.createElement("div");
		const { startDrag, applyJunctionBranchDrag } = setup([
			"node-1",
			twoBranches,
			false,
			"b2",
			190,
			200,
			300,
		]);

		startDrag(pointerDown(grip, 0));
		move(grip, 40);
		grip.dispatchEvent(new MouseEvent("pointerup"));

		expect(applyJunctionBranchDrag).toHaveBeenCalledWith("node-1", {
			branches: {
				b1: { id: "b1", position: 10 },
				b2: { id: "b2", position: 230 },
			},
			pivotPosition: 100,
			nodeX: 300,
			width: 240,
		});
	});

	it("ne pousse aucune commande si la géométrie revient à son état initial", () => {
		const grip = document.createElement("div");
		const { startDrag, applyJunctionBranchDrag } = setup([
			"node-1",
			twoBranches,
			false,
			"b1",
			10,
			200,
			300,
		]);

		startDrag(pointerDown(grip, 0));
		move(grip, -30);
		move(grip, 0);
		grip.dispatchEvent(new MouseEvent("pointerup"));

		expect(applyJunctionBranchDrag).not.toHaveBeenCalled();
	});
});

describe("useBarDrag — pivot et branche intermédiaire", () => {
	it("prévisualise le déplacement d'une branche intermédiaire, aligné sur la grille", () => {
		const grip = document.createElement("div");
		const { startDrag, previewJunctionBarPosition, updateNodeData } = setup([
			"node-1",
			threeBranches,
			false,
			"b2",
			100,
			200,
			300,
		]);

		startDrag(pointerDown(grip, 0));
		move(grip, 23);

		expect(previewJunctionBarPosition).toHaveBeenLastCalledWith("node-1", {
			branches: { ...threeBranches.branches, b2: { id: "b2", position: 120 } },
		});
		expect(updateNodeData).not.toHaveBeenCalled();
	});

	it("valide la branche intermédiaire en une seule commande au relâchement", () => {
		const grip = document.createElement("div");
		const { startDrag, updateNodeData } = setup([
			"node-1",
			threeBranches,
			false,
			"b2",
			100,
			200,
			300,
		]);

		startDrag(pointerDown(grip, 0));
		move(grip, 8);
		move(grip, 31);
		grip.dispatchEvent(new MouseEvent("pointerup"));

		expect(updateNodeData).toHaveBeenCalledTimes(1);
		const updater = updateNodeData.mock.calls[0][1];
		expect(updater(threeBranches)).toEqual({
			branches: { ...threeBranches.branches, b2: { id: "b2", position: 130 } },
		});
	});

	it("déplace le pivot", () => {
		const grip = document.createElement("div");
		const { startDrag, previewJunctionBarPosition } = setup([
			"node-1",
			twoBranches,
			true,
			null,
			100,
			200,
			300,
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
			threeBranches,
			false,
			"b2",
			100,
			200,
			300,
		]);

		startDrag(pointerDown(grip, 0));
		grip.dispatchEvent(new MouseEvent("pointerup"));
		previewJunctionBarPosition.mockClear();
		move(grip, 40);

		expect(previewJunctionBarPosition).not.toHaveBeenCalled();
	});
});
