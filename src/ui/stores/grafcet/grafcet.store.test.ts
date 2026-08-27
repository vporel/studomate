/**
 * @jest-environment jsdom
 */
import { Dialect } from "@/expression-language/dialect.enum";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/elements-update.command";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { createGrafcetStore } from "./grafcet.store";

function renumberCommand(id: string, newNumber: number, oldNumber: number) {
	return new ElementsUpdateCommand([
		{
			id,
			type: "step",
			data: { number: newNumber },
			previousData: { number: oldNumber },
		},
	]);
}

describe("createGrafcetStore — assemblage initial", () => {
	it("garde une copie défensive du grafcet initial", () => {
		const grafcet = GrafcetFactory.createSimpleCycle("g1");
		const store = createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);

		const { initialGrafcet } = store.getState();
		expect(initialGrafcet).not.toBe(grafcet);
		expect(
			initialGrafcet!
				.getAllElements()
				.map((e) => e.id)
				.sort(),
		).toEqual(
			grafcet
				.getAllElements()
				.map((e) => e.id)
				.sort(),
		);
	});

	it("dérive nodes et edges du grafcet fourni", () => {
		const grafcet = GrafcetFactory.createSimpleCycle("g1");
		const store = createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);

		const { nodes, edges } = store.getState();
		// 2 étapes + 2 transitions, 4 connexions
		expect(nodes).toHaveLength(4);
		expect(edges).toHaveLength(4);
		expect(nodes.map((n) => n.id).sort()).toEqual(
			["g1-step-0", "g1-step-1", "g1-trans-0", "g1-trans-1"].sort(),
		);
	});

	it("câble getDialect sur la fonction injectée", () => {
		const store = createGrafcetStore(
			GrafcetFactory.createSimpleCycle("g1"),
			new CommandsStack<Grafcet>(100),
			() => Dialect.EN,
		);
		expect(store.getState().getDialect()).toBe(Dialect.EN);
	});

	it("expose hasCommandsToUndo/Redo d'après la pile fournie", () => {
		const grafcet = GrafcetFactory.createSimpleCycle("g1");
		const stack = new CommandsStack<Grafcet>(100);
		stack.execute([renumberCommand("g1-step-1", 5, 1)], grafcet);

		const store = createGrafcetStore(grafcet, stack, () => Dialect.FR);

		expect(store.getState().hasCommandsToUndo).toBe(true);
		expect(store.getState().hasCommandsToRedo).toBe(false);
	});

	it("instancie les quatre managers", () => {
		const store = createGrafcetStore(
			GrafcetFactory.createSimpleCycle("g1"),
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);
		const state = store.getState();
		expect(state.viewManager).toBeDefined();
		expect(state.copyCutPasteManager).toBeDefined();
		expect(state.workflowManager).toBeDefined();
		expect(state.commandsStackManager).toBeDefined();
	});

	it("part sans surlignage ni viewport mémorisé", () => {
		const store = createGrafcetStore(
			GrafcetFactory.createSimpleCycle("g1"),
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);
		const state = store.getState();
		expect(state.highlightedNodesIds).toEqual([]);
		expect(state.highlightedEdgesIds).toEqual([]);
		expect(state.viewport).toBeNull();
	});
});
