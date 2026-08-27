import CommandsStack from "@/schemas/commands/commands-stack.schema";
import SectionAddCommand from "@/schemas/ladder/commands/section-add.command";
import Ladder from "@/schemas/ladder/ladder.schema";
import LaddersManager from "@/ui/stores/project/managers/ladders.manager";
import { createLadderStore } from "@/ui/stores/ladder/ladder.store";
import { syncLadderToProject } from "./ladder-project-sync";

function fakeLaddersManager() {
	return {
		updateProgramData: jest.fn(),
		setStoreValues: jest.fn(),
	} as unknown as LaddersManager;
}

function buildStore() {
	const ladder = new Ladder("l1", "Mon ladder");
	return createLadderStore(ladder, new CommandsStack<Ladder>(100));
}

describe("syncLadderToProject", () => {
	it("répercute un changement qui remplace effectivement le ladder", () => {
		const store = buildStore();
		const laddersManager = fakeLaddersManager();
		const unsubscribe = syncLadderToProject(store, laddersManager);

		store
			.getState()
			.commandsStackManager.executeOperation([
				new SectionAddCommand({ sectionId: "s2", title: "B", description: "" }),
			]);

		expect(laddersManager.updateProgramData).toHaveBeenCalledTimes(1);
		unsubscribe();
	});

	it("répercute les compteurs d'annulation quand ils changent", () => {
		const store = buildStore();
		const laddersManager = fakeLaddersManager();
		const unsubscribe = syncLadderToProject(store, laddersManager);

		store
			.getState()
			.commandsStackManager.executeOperation([
				new SectionAddCommand({ sectionId: "s2", title: "B", description: "" }),
			]);

		expect(laddersManager.setStoreValues).toHaveBeenCalledWith(
			"l1",
			expect.objectContaining({ hasCommandsToUndo: true }),
		);
		unsubscribe();
	});

	it("ne répercute pas les compteurs d'annulation quand ils n'ont pas changé", () => {
		const store = buildStore();
		const laddersManager = fakeLaddersManager();
		const unsubscribe = syncLadderToProject(store, laddersManager);

		store.getState().viewManager.zoomIn();

		expect(laddersManager.setStoreValues).not.toHaveBeenCalled();
		unsubscribe();
	});

	it("ne notifie plus après désabonnement", () => {
		const store = buildStore();
		const laddersManager = fakeLaddersManager();
		const unsubscribe = syncLadderToProject(store, laddersManager);
		unsubscribe();

		store
			.getState()
			.commandsStackManager.executeOperation([
				new SectionAddCommand({ sectionId: "s2", title: "B", description: "" }),
			]);

		expect(laddersManager.updateProgramData).not.toHaveBeenCalled();
	});
});
