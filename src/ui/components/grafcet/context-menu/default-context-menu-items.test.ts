import defaultContextMenuItems from "./default-context-menu-items";

const fakeCopyCutPasteManager = () =>
	({
		copySelectedElements: jest.fn(),
		cutSelectedElements: jest.fn(),
	}) as any;

describe("defaultContextMenuItems", () => {
	it("délègue Copier / Couper au gestionnaire copier-coller", () => {
		const workflowManager = {
			deleteEdges: jest.fn(),
			deleteNodes: jest.fn(),
		} as any;
		const ccp = fakeCopyCutPasteManager();

		const [[copyItem, cutItem]] = defaultContextMenuItems(
			{ type: "step", id: "step-1" } as any,
			workflowManager,
			ccp,
		);
		copyItem.onClick!();
		cutItem.onClick!();

		expect(ccp.copySelectedElements).toHaveBeenCalled();
		expect(ccp.cutSelectedElements).toHaveBeenCalled();
	});

	it("supprime une arête (connexion) via deleteEdges", () => {
		const workflowManager = {
			deleteEdges: jest.fn(),
			deleteNodes: jest.fn(),
		} as any;
		const element = { type: "grafcet-connection", id: "e1" } as any;

		const [, [deleteItem]] = defaultContextMenuItems(
			element,
			workflowManager,
			fakeCopyCutPasteManager(),
		);
		deleteItem.onClick!();

		expect(workflowManager.deleteEdges).toHaveBeenCalledWith(["e1"]);
		expect(workflowManager.deleteNodes).not.toHaveBeenCalled();
	});

	it("supprime un nœud (élément du grafcet) via deleteNodes", () => {
		const workflowManager = {
			deleteEdges: jest.fn(),
			deleteNodes: jest.fn(),
		} as any;
		const element = { type: "step", id: "step-1" } as any;

		const [, [deleteItem]] = defaultContextMenuItems(
			element,
			workflowManager,
			fakeCopyCutPasteManager(),
		);
		deleteItem.onClick!();

		expect(workflowManager.deleteNodes).toHaveBeenCalledWith(["step-1"]);
		expect(workflowManager.deleteEdges).not.toHaveBeenCalled();
	});

	it("ne supprime rien pour un type d'élément inconnu", () => {
		const workflowManager = {
			deleteEdges: jest.fn(),
			deleteNodes: jest.fn(),
		} as any;
		const element = { type: "unknown-type", id: "x1" } as any;

		const [, [deleteItem]] = defaultContextMenuItems(
			element,
			workflowManager,
			fakeCopyCutPasteManager(),
		);
		deleteItem.onClick!();

		expect(workflowManager.deleteNodes).not.toHaveBeenCalled();
		expect(workflowManager.deleteEdges).not.toHaveBeenCalled();
	});
});
