/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { fakeStoreApi, selectorImplementation } from "@tests/utils/store-mocks";
import StepNode, { StepNodeType } from "./StepNode";

jest.mock("../context/GrafcetContext");
jest.mock("@/ui/components/projects/ProjectContext");
// `useNodeConnections` (utilisé par ce composant) exige un vrai contexte de nœud React Flow,
// fourni seulement quand le nœud est rendu par <ReactFlow> lui-même — pas par <ReactFlowProvider>
// seul. Cette limite de connexions n'est pas ce que ce test vérifie.
jest.mock("@/ui/lib/react-flow/HandleWithConnectionsLimit", () => ({
	__esModule: true,
	default: () => null,
}));

function setup({
	number = 1,
	initial = false,
	selected = false,
	highlightedNodesIds = [] as string[],
	simulationVariablesStates = {} as Record<string, { mnemonic: string; value: boolean }>,
	updateNodeData = jest.fn(),
} = {}) {
	const grafcet = new GrafcetBuilder()
		.id("g1")
		.addStep(new StepBuilder().id("step-1").number(number).initial(initial).position(0, 0).build())
		.build();

	(useGrafcetContext as jest.Mock).mockReturnValue({ store: fakeStoreApi({ grafcet }) });
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			grafcet,
			workflowManager: { updateNodeData },
			highlightedNodesIds,
		}),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ simulationVariablesStates }),
	);

	const props = {
		id: "step-1",
		data: { number, initial, width: 40, height: 40 },
		selected,
		type: "step",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as StepNodeType & { id: string };

	render(<StepNode {...(props as any)} />);

	return { updateNodeData };
}

function numberInput(): HTMLInputElement {
	return document.querySelector(".step_node__input") as HTMLInputElement;
}

describe("StepNode", () => {
	it("affiche le numéro de l'étape", () => {
		setup({ number: 7 });
		expect(numberInput().value).toBe("7");
	});

	it("marque l'étape initiale par une bordure double", () => {
		setup({ initial: true });
		expect(document.querySelector(".grafcet-step-node")).toHaveStyle({
			borderStyle: "double",
			borderWidth: "4px",
		});
	});

	it("n'applique pas la bordure double à une étape non initiale", () => {
		setup({ initial: false });
		expect(document.querySelector(".grafcet-step-node")).toHaveStyle({
			borderStyle: "solid",
			borderWidth: "1px",
		});
	});

	it("porte la classe 'highlighted' quand l'étape fait partie de highlightedNodesIds", () => {
		setup({ highlightedNodesIds: ["step-1"] });
		expect(document.querySelector(".grafcet-step-node")).toHaveClass("highlighted");
	});

	it("ne porte pas la classe 'highlighted' sinon", () => {
		setup({ highlightedNodesIds: ["autre-etape"] });
		expect(document.querySelector(".grafcet-step-node")).not.toHaveClass("highlighted");
	});

	it("édite le numéro au double-clic puis dispatche la commande de mise à jour au blur", () => {
		const { updateNodeData } = setup({ number: 1 });
		fireEvent.doubleClick(document.querySelector(".grafcet-step-node")!);
		const input = numberInput();

		fireEvent.change(input, { target: { value: "5" } });
		fireEvent.blur(input);

		expect(updateNodeData).toHaveBeenCalledWith("step-1", { number: 5 });
	});
});
