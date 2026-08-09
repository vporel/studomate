/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import { ActionExecutionMode, ActionType } from "@/schemas/grafcet/action.schema";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { fakeStoreApi, selectorImplementation } from "@tests/utils/store-mocks";
import ActionNode, { ActionNodeType } from "./ActionNode";

jest.mock("../context/GrafcetContext");
jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/lib/react-flow/HandleWithConnectionsLimit", () => ({
	__esModule: true,
	default: () => null,
}));

function setup({
	expression = "compteur := 1",
	type = ActionType.NUMERIC_VARIABLE,
	executionMode = null as ActionExecutionMode | null,
	stepNumber = 1 as number | "",
	simulationVariablesStates = {} as Record<string, { mnemonic: string; value: boolean }>,
	updateNodeData = jest.fn(),
} = {}) {
	const step = new StepBuilder().id("step-1").number(stepNumber).initial().position(0, 0).build();
	const action = new ActionBuilder()
		.id("action-1")
		.expression(expression)
		.type(type)
		.executionMode(executionMode)
		.build();
	const connection = new ConnectionBuilder()
		.id("c1")
		.source("step", "step-1", "source:action")
		.target("action", "action-1", "target:step")
		.build();
	const grafcet = new GrafcetBuilder()
		.id("g1")
		.addStep(step)
		.addAction(action)
		.addConnection(connection)
		.build();

	(useGrafcetContext as jest.Mock).mockReturnValue({ store: fakeStoreApi({ grafcet }) });
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			grafcet,
			workflowManager: { updateNodeData },
			highlightedNodesIds: [],
		}),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { grafcets: { g1: grafcet } },
			simulationVariablesStates,
		}),
	);

	const props = {
		id: "action-1",
		data: { expression, type, executionMode, width: 100, height: 40 },
		selected: false,
		width: 0,
		height: 0,
		type: "action",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as ActionNodeType & { id: string };

	render(<ActionNode {...(props as any)} />);

	return { updateNodeData };
}

function expressionTextarea(): HTMLTextAreaElement {
	return document.querySelector(".action_node__textarea") as HTMLTextAreaElement;
}

describe("ActionNode", () => {
	it("affiche l'expression de l'action", () => {
		setup({ expression: "compteur := compteur + 1" });
		expect(expressionTextarea().value).toBe("compteur := compteur + 1");
	});

	it("édite l'expression au double-clic puis dispatche la commande de mise à jour au blur", () => {
		const { updateNodeData } = setup({ expression: "A" });
		fireEvent.doubleClick(document.querySelector(".grafcet-action-node")!);
		const textarea = expressionTextarea();

		fireEvent.change(textarea, { target: { value: "B" } });
		fireEvent.blur(textarea);

		expect(updateNodeData).toHaveBeenCalledWith("action-1", { expression: "B" });
	});

	it("affiche le badge 'S' pour une action SET", () => {
		setup({ type: ActionType.BOOLEAN_VARIABLE, executionMode: ActionExecutionMode.SET, expression: "Q0" });
		expect(document.querySelector(".grafcet-action-node")!.textContent).toContain("S");
	});

	it("affiche le badge 'R' pour une action RESET", () => {
		setup({ type: ActionType.BOOLEAN_VARIABLE, executionMode: ActionExecutionMode.RESET, expression: "Q0" });
		expect(document.querySelector(".grafcet-action-node")!.textContent).toContain("R");
	});

	it("s'illumine (fond couleur primaire) quand l'étape porteuse est active en simulation", () => {
		setup({
			stepNumber: 1,
			simulationVariablesStates: { "grafcet-g1-step-1": { mnemonic: "X1", value: true } },
		});
		expect(document.querySelector(".grafcet-action-node")).toHaveStyle({ color: "rgb(255, 255, 255)" });
	});

	it("reste en noir quand l'étape porteuse n'est pas active", () => {
		setup({ stepNumber: 1, simulationVariablesStates: {} });
		expect(document.querySelector(".grafcet-action-node")).toHaveStyle({ color: "rgb(0, 0, 0)" });
	});
});
