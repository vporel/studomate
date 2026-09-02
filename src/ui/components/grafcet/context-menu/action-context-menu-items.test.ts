import { identityT } from "@tests/utils/i18n";
import {
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import {
	ContextMenuItemBaseType,
	ContextMenuItemType,
} from "@/ui/lib/context-menu/context-menu";
import actionContextMenuItems from "./action-context-menu-items";

function fakeAction(
	type: ActionType,
	executionMode: ActionExecutionMode | null = null,
): any {
	return { id: "action-1", data: { type, executionMode } };
}

/** Grafcet factice : par défaut l'action n'est liée à aucune étape. */
function fakeGrafcet(step: any = null): any {
	return {
		getConnectionsByElementIdAndHandle: () =>
			step
				? [{ source: { type: "step", id: step.id }, target: {} }]
				: [],
		getElementByIdAndType: () => step,
	};
}

// Ce menu ne pose jamais de séparateur dans ses sous-menus — sans risque de renvoyer un
// `ContextMenuDividerType` ici, contrairement au type général `ContextMenuSubItemType`.
function subItemsOf(item: ContextMenuItemType): ContextMenuItemBaseType[] {
	return item.subItems as ContextMenuItemBaseType[];
}

function typeGroupOf(groups: ContextMenuItemType[][]): ContextMenuItemType[] {
	return groups.find((group) =>
		group.some((item) => item.label === "actionType"),
	)!;
}

describe("actionContextMenuItems", () => {
	it("marque comme coché le type courant de l'action", () => {
		const workflowManager = { updateNodeData: jest.fn() } as any;

		const groups = actionContextMenuItems(
			fakeAction(ActionType.BOOLEAN_VARIABLE),
			fakeGrafcet(),
			false,
			workflowManager,
			identityT,
			identityT,
			identityT,
		);

		const [typeItem] = typeGroupOf(groups);
		const checkedSubItem = subItemsOf(typeItem).find((s) => s.checked);
		expect(checkedSubItem!.label).toBe("boolean_variable");
	});

	it("appelle updateNodeData avec le nouveau type au clic sur une option de type", () => {
		const workflowManager = { updateNodeData: jest.fn() } as any;
		const groups = actionContextMenuItems(
			fakeAction(ActionType.TEXT),
			fakeGrafcet(),
			false,
			workflowManager,
			identityT,
			identityT,
			identityT,
		);

		const [typeItem] = typeGroupOf(groups);
		const numericOption = subItemsOf(typeItem).find(
			(s) => s.label === "numeric_variable",
		)!;
		numericOption.onClick!();

		expect(workflowManager.updateNodeData).toHaveBeenCalledWith("action-1", {
			type: ActionType.NUMERIC_VARIABLE,
		});
	});

	it("n'affiche pas de sous-menu 'Mode d'exécution' pour une action TEXTE", () => {
		const workflowManager = { updateNodeData: jest.fn() } as any;

		const groups = actionContextMenuItems(
			fakeAction(ActionType.TEXT),
			fakeGrafcet(),
			false,
			workflowManager,
			identityT,
			identityT,
			identityT,
		);

		expect(typeGroupOf(groups).some((item) => item.label === "actionMode")).toBe(
			false,
		);
	});

	it("liste uniquement les modes d'exécution compatibles avec le type de l'action", () => {
		const workflowManager = { updateNodeData: jest.fn() } as any;

		const groups = actionContextMenuItems(
			fakeAction(ActionType.BOOLEAN_VARIABLE, ActionExecutionMode.SET),
			fakeGrafcet(),
			false,
			workflowManager,
			identityT,
			identityT,
			identityT,
		);

		const modeItem = typeGroupOf(groups).find(
			(item) => item.label === "actionMode",
		)!;
		const labels = subItemsOf(modeItem).map((s) => s.label);
		expect(labels).toEqual(["continuous", "set", "reset"]);
		expect(subItemsOf(modeItem).find((s) => s.label === "set")!.checked).toBe(
			true,
		);
	});

	it("appelle updateNodeData avec le nouveau mode d'exécution au clic", () => {
		const workflowManager = { updateNodeData: jest.fn() } as any;
		const groups = actionContextMenuItems(
			fakeAction(ActionType.BOOLEAN_VARIABLE, ActionExecutionMode.SET),
			fakeGrafcet(),
			false,
			workflowManager,
			identityT,
			identityT,
			identityT,
		);

		const modeItem = typeGroupOf(groups).find(
			(item) => item.label === "actionMode",
		)!;
		subItemsOf(modeItem).find((s) => s.label === "reset")!.onClick!();

		expect(workflowManager.updateNodeData).toHaveBeenCalledWith("action-1", {
			executionMode: ActionExecutionMode.RESET,
		});
	});

	describe("option « Ajouter une action »", () => {
		it("n'apparaît pas quand l'action n'est liée à aucune étape", () => {
			const groups = actionContextMenuItems(
				fakeAction(ActionType.BOOLEAN_VARIABLE),
				fakeGrafcet(),
				false,
				{ addActionToStep: jest.fn() } as any,
				identityT,
				identityT,
				identityT,
			);

			expect(
				groups.some((group) =>
					group.some((item) => item.label === "addAction"),
				),
			).toBe(false);
		});

		it("apparaît et cible l'étape liée quand l'action est liée à une étape", () => {
			const addActionToStep = jest.fn();
			const groups = actionContextMenuItems(
				fakeAction(ActionType.BOOLEAN_VARIABLE),
				fakeGrafcet({ id: "step-1" }),
				false,
				{ addActionToStep } as any,
				identityT,
				identityT,
				identityT,
			);

			const addActionItem = groups
				.flat()
				.find((item) => item.label === "addAction")!;
			expect(addActionItem).toBeDefined();
			addActionItem.onClick!();
			expect(addActionToStep).toHaveBeenCalledWith("step-1");
		});

		it("n'apparaît pas en simulation même si l'action est liée à une étape", () => {
			const groups = actionContextMenuItems(
				fakeAction(ActionType.BOOLEAN_VARIABLE),
				fakeGrafcet({ id: "step-1" }),
				true,
				{ addActionToStep: jest.fn() } as any,
				identityT,
				identityT,
				identityT,
			);

			expect(
				groups.flat().some((item) => item.label === "addAction"),
			).toBe(false);
		});
	});
});
