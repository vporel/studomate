/**
 * @jest-environment jsdom
 */
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import SectionUpdateCommand from "@/schemas/ladder/commands/section-update.command";
import { createLadderStore } from "./ladder.store";

function buildLadder() {
	return new Ladder("l1", "TestLadder", [
		new Section("s1", "A"),
		new Section("s2", "B"),
	]);
}

describe("createLadderStore — assemblage initial", () => {
	it("garde une copie défensive du ladder initial", () => {
		const ladder = buildLadder();
		const store = createLadderStore(ladder, new CommandsStack<Ladder>(100));

		const { initialLadder } = store.getState();
		expect(initialLadder).not.toBe(ladder);
		expect(initialLadder!.sections.map((s) => s.id)).toEqual(["s1", "s2"]);
	});

	it("indexe nodes et edges par id de section", () => {
		const store = createLadderStore(
			buildLadder(),
			new CommandsStack<Ladder>(100),
		);

		const { nodesBySectionId, edgesBySectionId } = store.getState();
		expect(Object.keys(nodesBySectionId).sort()).toEqual(["s1", "s2"]);
		expect(Object.keys(edgesBySectionId).sort()).toEqual(["s1", "s2"]);
	});

	it("part sans section active et la met à jour via le setter", () => {
		const store = createLadderStore(
			buildLadder(),
			new CommandsStack<Ladder>(100),
		);

		expect(store.getState().activeSectionId).toBeNull();
		store.getState().setActiveSectionId("s2");
		expect(store.getState().activeSectionId).toBe("s2");
	});

	it("part sans zoom par section (défaut 1 à la lecture)", () => {
		const store = createLadderStore(
			buildLadder(),
			new CommandsStack<Ladder>(100),
		);
		expect(store.getState().zoomBySectionId).toEqual({});
	});

	it("met à jour les blocs système en attente via leurs setters", () => {
		const store = createLadderStore(
			buildLadder(),
			new CommandsStack<Ladder>(100),
		);

		expect(store.getState().pendingSystemBlockCreation).toBeNull();
		expect(store.getState().pendingSystemBlockEdit).toBeNull();

		const creation = { sectionId: "s1" } as never;
		store.getState().setPendingSystemBlockCreation(creation);
		expect(store.getState().pendingSystemBlockCreation).toBe(creation);
		store.getState().setPendingSystemBlockCreation(null);
		expect(store.getState().pendingSystemBlockCreation).toBeNull();

		const edit = { elementId: "e1" } as never;
		store.getState().setPendingSystemBlockEdit(edit);
		expect(store.getState().pendingSystemBlockEdit).toBe(edit);
	});

	it("expose hasCommandsToUndo/Redo d'après la pile fournie", () => {
		const ladder = buildLadder();
		const stack = new CommandsStack<Ladder>(100);
		stack.execute(
			[
				new SectionUpdateCommand({
					sectionId: "s1",
					title: "A2",
					previousTitle: "A",
				}),
			],
			ladder,
		);

		const store = createLadderStore(ladder, stack);

		expect(store.getState().hasCommandsToUndo).toBe(true);
		expect(store.getState().hasCommandsToRedo).toBe(false);
	});

	it("instancie les managers", () => {
		const store = createLadderStore(
			buildLadder(),
			new CommandsStack<Ladder>(100),
		);
		const state = store.getState();
		expect(state.workflowManager).toBeDefined();
		expect(state.commandsStackManager).toBeDefined();
		expect(state.copyCutPasteManager).toBeDefined();
		expect(state.viewManager).toBeDefined();
	});
});
