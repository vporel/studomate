/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { fakeStoreApi, selectorImplementation } from "@tests/utils/store-mocks";
import TransitionNode, { TransitionNodeType } from "./TransitionNode";

jest.mock("../context/GrafcetContext");
jest.mock("@/ui/components/projects/ProjectContext");
// Voir StepNode.test.tsx : `useNodeConnections` exige le contexte de nœud interne de
// <ReactFlow>, absent en test unitaire ; la limite de connexions n'est pas ce que ce test vérifie.
jest.mock("@/ui/lib/react-flow/HandleWithConnectionsLimit", () => ({
	__esModule: true,
	default: () => null,
}));

function setup({
	expression = "I0",
	selected = false,
	highlightedNodesIds = [] as string[],
	observableExpressionsValues = {} as Record<
		string,
		{ label: string | null; value: unknown }[]
	>,
	updateNodeData = jest.fn(),
} = {}) {
	const grafcet = new GrafcetBuilder()
		.id("g1")
		.addTransition(
			new TransitionBuilder()
				.id("trans-1")
				.expression(expression)
				.position(0, 0)
				.build(),
		)
		.build();

	(useGrafcetContext as jest.Mock).mockReturnValue({
		store: fakeStoreApi({ grafcet }),
	});
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			grafcet,
			workflowManager: { updateNodeData },
			highlightedNodesIds,
		}),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ observableExpressionsValues }),
	);

	const props = {
		id: "trans-1",
		data: { expression },
		selected,
		type: "transition",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as TransitionNodeType & { id: string };

	render(<TransitionNode {...(props as any)} />);

	return { updateNodeData };
}

function expressionTextarea(): HTMLTextAreaElement {
	return document.querySelector(
		".transition_node__textarea",
	) as HTMLTextAreaElement;
}

describe("TransitionNode", () => {
	it("affiche la réceptivité (expression) de la transition", () => {
		setup({ expression: "I0 ET M1" });
		expect(expressionTextarea().value).toBe("I0 ET M1");
	});

	it("porte la classe 'highlighted' quand la transition fait partie de highlightedNodesIds", () => {
		setup({ highlightedNodesIds: ["trans-1"] });
		expect(document.querySelector(".grafcet-transition-node")).toHaveClass(
			"highlighted",
		);
	});

	it("ne porte pas la classe 'highlighted' sinon", () => {
		setup({ highlightedNodesIds: ["autre"] });
		expect(document.querySelector(".grafcet-transition-node")).not.toHaveClass(
			"highlighted",
		);
	});

	it("colore la réceptivité en couleur primaire quand elle est vraie pendant la simulation", () => {
		setup({
			observableExpressionsValues: {
				"trans-1": [{ label: null, value: true }],
			},
		});
		expect(expressionTextarea()).not.toHaveStyle({ color: "black" });
	});

	it("laisse la réceptivité en noir quand elle est fausse (ou hors simulation)", () => {
		setup({
			observableExpressionsValues: {
				"trans-1": [{ label: null, value: false }],
			},
		});
		expect(expressionTextarea()).toHaveStyle({ color: "rgb(0, 0, 0)" });
	});

	it("affiche le temps écoulé d'une tempo unique, sans son nom", () => {
		setup({
			observableExpressionsValues: {
				"trans-1": [{ label: "t1", value: 2500 }],
			},
		});
		expect(document.body.textContent).toContain("2.5s");
		expect(document.body.textContent).not.toContain("t1/2.5s");
	});

	it("affiche les temps écoulés de plusieurs tempos, préfixés par leur nom", () => {
		setup({
			observableExpressionsValues: {
				"trans-1": [
					{ label: "t1", value: 2500 },
					{ label: "t2", value: 0 },
				],
			},
		});
		expect(document.body.textContent).toContain("t1/2.5s, t2/0.0s");
	});

	it("n'affiche aucun temps écoulé hors simulation", () => {
		setup();
		expect(document.body.textContent).not.toMatch(/\ds/);
	});

	it("édite la réceptivité au double-clic puis dispatche la commande de mise à jour au blur", () => {
		const { updateNodeData } = setup({ expression: "I0" });
		fireEvent.doubleClick(document.querySelector(".grafcet-transition-node")!);
		const textarea = expressionTextarea();

		fireEvent.change(textarea, { target: { value: "I1" } });
		fireEvent.blur(textarea);

		expect(updateNodeData).toHaveBeenCalledWith("trans-1", {
			expression: "I1",
		});
	});

	it("fond transparent au repos, gris clair pendant l'édition", () => {
		setup({ expression: "I0" });
		expect(expressionTextarea()).toHaveStyle({ background: "transparent" });

		fireEvent.doubleClick(document.querySelector(".grafcet-transition-node")!);
		expect(expressionTextarea()).toHaveStyle({
			background: "rgb(238, 238, 238)",
		});
	});
});
