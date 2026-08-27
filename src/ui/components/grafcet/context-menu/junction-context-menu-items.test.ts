import junctionContextMenuItems from "./junction-context-menu-items";

function fakeJunction(branchesOrder: string[]): any {
	return { id: "junction-1", data: { branchesOrder } };
}

describe("junctionContextMenuItems", () => {
	it("émet 'junction-select-pivot' au clic sur Sélectionner le pivot", () => {
		const contextMenuEvents = { emit: jest.fn() } as any;
		const workflowManager = { deleteJunctionBranch: jest.fn() } as any;
		const [[selectPivotItem]] = junctionContextMenuItems(
			fakeJunction(["b1", "b2"]),
			contextMenuEvents,
			workflowManager,
		);

		selectPivotItem.onClick!();

		expect(contextMenuEvents.emit).toHaveBeenCalledWith("node-action", {
			nodeId: "junction-1",
			type: "junction-select-pivot",
		});
	});

	it("liste une sous-option par branche pour sélectionner une branche, numérotées à partir de 1", () => {
		const contextMenuEvents = { emit: jest.fn() } as any;
		const workflowManager = { deleteJunctionBranch: jest.fn() } as any;
		const [[, selectBranchItem]] = junctionContextMenuItems(
			fakeJunction(["b1", "b2", "b3"]),
			contextMenuEvents,
			workflowManager,
		);

		expect(selectBranchItem.subItems!.map((s) => s.label)).toEqual([
			"Branche 1",
			"Branche 2",
			"Branche 3",
		]);
		selectBranchItem.subItems![1].onClick();

		expect(contextMenuEvents.emit).toHaveBeenCalledWith("node-action", {
			nodeId: "junction-1",
			type: "junction-select-branch",
			branchId: "b2",
		});
	});

	it("désactive 'Supprimer une branche' quand la jonction n'a que 2 branches", () => {
		const contextMenuEvents = { emit: jest.fn() } as any;
		const workflowManager = { deleteJunctionBranch: jest.fn() } as any;
		const [[, , deleteBranchItem]] = junctionContextMenuItems(
			fakeJunction(["b1", "b2"]),
			contextMenuEvents,
			workflowManager,
		);

		expect(deleteBranchItem.disabled).toBe(true);
	});

	it("active 'Supprimer une branche' à partir de 3 branches, et délègue à deleteJunctionBranch", () => {
		const contextMenuEvents = { emit: jest.fn() } as any;
		const workflowManager = { deleteJunctionBranch: jest.fn() } as any;
		const [[, , deleteBranchItem]] = junctionContextMenuItems(
			fakeJunction(["b1", "b2", "b3"]),
			contextMenuEvents,
			workflowManager,
		);

		expect(deleteBranchItem.disabled).toBe(false);
		deleteBranchItem.subItems![2].onClick();

		expect(workflowManager.deleteJunctionBranch).toHaveBeenCalledWith(
			"junction-1",
			"b3",
		);
	});
});
