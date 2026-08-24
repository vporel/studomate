import blockContextMenuItems from "./block-context-menu-items";

describe("blockContextMenuItems", () => {
	it("propose 'Paramétrer' pour un bloc tempo, qui ouvre l'éditeur via le workflowManager", () => {
		const workflowManager = { openSystemBlockEditor: jest.fn() } as any;
		const params = { name: "Tempo1", timerType: "TON", pt: "T#5s" };
		const block = { id: "block-1", data: { blockType: "timer", params } } as any;

		const [[item]] = blockContextMenuItems(block, workflowManager);
		expect(item.label).toBe("Paramétrer");
		item.onClick!();

		expect(workflowManager.openSystemBlockEditor).toHaveBeenCalledWith("block-1", "timer", params);
	});

	it("propose 'Paramétrer' pour un bloc compteur, qui ouvre l'éditeur via le workflowManager", () => {
		const workflowManager = { openSystemBlockEditor: jest.fn() } as any;
		const params = { name: "Compteur1", counterType: "CTU", control: "R", pv: "5" };
		const block = { id: "block-1", data: { blockType: "counter", params } } as any;

		const [[item]] = blockContextMenuItems(block, workflowManager);
		expect(item.label).toBe("Paramétrer");
		item.onClick!();

		expect(workflowManager.openSystemBlockEditor).toHaveBeenCalledWith("block-1", "counter", params);
	});

	it("propose 'Paramétrer' pour un bloc compare, qui ouvre l'éditeur via le workflowManager", () => {
		const workflowManager = { openSystemBlockEditor: jest.fn() } as any;
		const params = { expression: "A > B" };
		const block = { id: "block-1", data: { blockType: "compare", params } } as any;

		const [[item]] = blockContextMenuItems(block, workflowManager);
		expect(item.label).toBe("Paramétrer");
		item.onClick!();

		expect(workflowManager.openSystemBlockEditor).toHaveBeenCalledWith("block-1", "compare", params);
	});

	it("propose 'Paramétrer' pour un bloc assign, qui ouvre l'éditeur via le workflowManager", () => {
		const workflowManager = { openSystemBlockEditor: jest.fn() } as any;
		const params = { expression: "A := B" };
		const block = { id: "block-1", data: { blockType: "assign", params } } as any;

		const [[item]] = blockContextMenuItems(block, workflowManager);
		expect(item.label).toBe("Paramétrer");
		item.onClick!();

		expect(workflowManager.openSystemBlockEditor).toHaveBeenCalledWith("block-1", "assign", params);
	});

	it("ne propose rien pour un bloc 'user-program'", () => {
		const workflowManager = { openSystemBlockEditor: jest.fn() } as any;
		const block = { id: "block-1", data: { blockType: "user-program", params: { programId: "ladder-2" } } } as any;

		expect(blockContextMenuItems(block, workflowManager)).toEqual([]);
	});
});
