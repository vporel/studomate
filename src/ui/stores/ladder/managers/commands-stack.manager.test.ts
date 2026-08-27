/**
 * @jest-environment jsdom
 */
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import SectionUpdateCommand from "@/schemas/ladder/commands/section-update.command";
import { createLadderStore } from "../ladder.store";

function buildStore() {
	const section = new Section("s1", "Section Initiale");
	const ladder = new Ladder("l1", "TestLadder", [section]);
	return createLadderStore(ladder, new CommandsStack<Ladder>(100));
}

function renameCommand(newTitle: string, previousTitle: string) {
	return new SectionUpdateCommand({
		sectionId: "s1",
		title: newTitle,
		previousTitle,
	});
}

describe("LadderCommandsStackManager (ladder)", () => {
	describe("executeOperation", () => {
		it("applique la commande au ladder et active l'annulation", () => {
			const store = buildStore();

			store
				.getState()
				.commandsStackManager.executeOperation([
					renameCommand("Section Renommée", "Section Initiale"),
				]);

			const state = store.getState();
			expect(state.ladder.getSection("s1")!.title).toBe("Section Renommée");
			expect(state.hasCommandsToUndo).toBe(true);
			expect(state.hasCommandsToRedo).toBe(false);
		});

		it("ne fait rien pour une liste de commandes vide", () => {
			const store = buildStore();
			const before = store.getState().ladder;

			store.getState().commandsStackManager.executeOperation([]);

			expect(store.getState().ladder).toBe(before);
			expect(store.getState().hasCommandsToUndo).toBe(false);
		});
	});

	describe("undoOperation", () => {
		it("restaure l'état exact d'avant la commande", () => {
			const store = buildStore();
			store
				.getState()
				.commandsStackManager.executeOperation([
					renameCommand("Section Renommée", "Section Initiale"),
				]);

			store.getState().commandsStackManager.undoOperation();

			const state = store.getState();
			expect(state.ladder.getSection("s1")!.title).toBe("Section Initiale");
			expect(state.hasCommandsToUndo).toBe(false);
			expect(state.hasCommandsToRedo).toBe(true);
		});

		it("ne fait rien s'il n'y a rien à annuler", () => {
			const store = buildStore();
			const before = store.getState().ladder;

			store.getState().commandsStackManager.undoOperation();

			expect(store.getState().ladder).toBe(before);
		});
	});

	describe("redoOperation", () => {
		it("réapplique la commande annulée", () => {
			const store = buildStore();
			store
				.getState()
				.commandsStackManager.executeOperation([
					renameCommand("Section Renommée", "Section Initiale"),
				]);
			store.getState().commandsStackManager.undoOperation();

			store.getState().commandsStackManager.redoOperation();

			const state = store.getState();
			expect(state.ladder.getSection("s1")!.title).toBe("Section Renommée");
			expect(state.hasCommandsToUndo).toBe(true);
			expect(state.hasCommandsToRedo).toBe(false);
		});

		it("ne fait rien s'il n'y a rien à rétablir", () => {
			const store = buildStore();
			const before = store.getState().ladder;

			store.getState().commandsStackManager.redoOperation();

			expect(store.getState().ladder).toBe(before);
		});

		it("vide la pile de rétablissement après une nouvelle commande", () => {
			const store = buildStore();
			store
				.getState()
				.commandsStackManager.executeOperation([
					renameCommand("V2", "Section Initiale"),
				]);
			store.getState().commandsStackManager.undoOperation();

			store
				.getState()
				.commandsStackManager.executeOperation([
					renameCommand("V3", "Section Initiale"),
				]);

			expect(store.getState().hasCommandsToRedo).toBe(false);
		});
	});

	describe("cycle complet", () => {
		it("exécuter → annuler → rétablir redonne le même résultat", () => {
			const store = buildStore();
			store
				.getState()
				.commandsStackManager.executeOperation([
					renameCommand("Section Renommée", "Section Initiale"),
				]);
			const afterExecute = store.getState().ladder.getSection("s1")!.title;

			store.getState().commandsStackManager.undoOperation();
			store.getState().commandsStackManager.redoOperation();

			const afterRedo = store.getState().ladder.getSection("s1")!.title;
			expect(afterRedo).toBe(afterExecute);
		});
	});
});
