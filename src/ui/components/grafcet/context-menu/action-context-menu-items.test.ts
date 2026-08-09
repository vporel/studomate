import { ActionExecutionMode, ActionType } from "@/schemas/grafcet/action.schema";
import actionContextMenuItems from "./action-context-menu-items";

function fakeAction(type: ActionType, executionMode: ActionExecutionMode | null = null): any {
	return { id: "action-1", data: { type, executionMode } };
}

describe("actionContextMenuItems", () => {
	it("marque comme coché le type courant de l'action", () => {
		const workflowManager = { updateNodeData: jest.fn() } as any;

		const [[typeItem]] = actionContextMenuItems(fakeAction(ActionType.BOOLEAN_VARIABLE), workflowManager);

		const checkedSubItem = typeItem.subItems!.find((s) => s.checked);
		expect(checkedSubItem!.label).toBe("Variable booléene");
	});

	it("appelle updateNodeData avec le nouveau type au clic sur une option de type", () => {
		const workflowManager = { updateNodeData: jest.fn() } as any;
		const [[typeItem]] = actionContextMenuItems(fakeAction(ActionType.TEXT), workflowManager);

		const numericOption = typeItem.subItems!.find((s) => s.label === "Variable numérique")!;
		numericOption.onClick!();

		expect(workflowManager.updateNodeData).toHaveBeenCalledWith("action-1", {
			type: ActionType.NUMERIC_VARIABLE,
		});
	});

	it("n'affiche pas de sous-menu 'Mode d'exécution' pour une action TEXTE", () => {
		const workflowManager = { updateNodeData: jest.fn() } as any;

		const [part1] = actionContextMenuItems(fakeAction(ActionType.TEXT), workflowManager);

		expect(part1.some((item) => item.label === "Mode d'exécution")).toBe(false);
	});

	it("liste uniquement les modes d'exécution compatibles avec le type de l'action", () => {
		const workflowManager = { updateNodeData: jest.fn() } as any;

		const [part1] = actionContextMenuItems(
			fakeAction(ActionType.BOOLEAN_VARIABLE, ActionExecutionMode.SET),
			workflowManager,
		);

		const modeItem = part1.find((item) => item.label === "Mode d'exécution")!;
		const labels = modeItem.subItems!.map((s) => s.label);
		expect(labels).toEqual(["Continue", "Set", "Reset"]);
		expect(modeItem.subItems!.find((s) => s.label === "Set")!.checked).toBe(true);
	});

	it("appelle updateNodeData avec le nouveau mode d'exécution au clic", () => {
		const workflowManager = { updateNodeData: jest.fn() } as any;
		const [part1] = actionContextMenuItems(
			fakeAction(ActionType.BOOLEAN_VARIABLE, ActionExecutionMode.SET),
			workflowManager,
		);

		const modeItem = part1.find((item) => item.label === "Mode d'exécution")!;
		modeItem.subItems!.find((s) => s.label === "Reset")!.onClick!();

		expect(workflowManager.updateNodeData).toHaveBeenCalledWith("action-1", {
			executionMode: ActionExecutionMode.RESET,
		});
	});
});
