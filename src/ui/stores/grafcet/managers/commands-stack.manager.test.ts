import { Dialect } from "@/expression-language/dialect.enum";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/elements-update.command";
import { StepData } from "@/schemas/grafcet/step.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { createGrafcetStore } from "../grafcet.store";

function buildStore() {
	const grafcet = new GrafcetBuilder()
		.id("g1")
		.addStep(new StepBuilder().id("step-1").number(1).position(0, 0).build())
		.build();
	return createGrafcetStore(grafcet, new CommandsStack<Grafcet>(100), () => Dialect.FR);
}

function renumberCommand(newNumber: number, oldNumber: number) {
	return new ElementsUpdateCommand([
		{
			id: "step-1",
			type: "step",
			data: { number: newNumber },
			previousData: { number: oldNumber },
		},
	]);
}

describe("CommandsStackManager (grafcet)", () => {
	describe("executeOperation", () => {
		it("applique la commande au grafcet et active l'annulation", () => {
			const store = buildStore();

			store.getState().commandsStackManager.executeOperation([renumberCommand(2, 1)]);

			const state = store.getState();
			expect((state.grafcet.getElementById("step-1")!.data as StepData).number).toBe(2);
			expect(state.hasCommandsToUndo).toBe(true);
			expect(state.hasCommandsToRedo).toBe(false);
		});

		it("ne fait rien pour une liste de commandes vide", () => {
			const store = buildStore();
			const before = store.getState().grafcet;

			store.getState().commandsStackManager.executeOperation([]);

			expect(store.getState().grafcet).toBe(before);
			expect(store.getState().hasCommandsToUndo).toBe(false);
		});
	});

	describe("undoOperation", () => {
		it("restaure l'état exact d'avant la commande", () => {
			const store = buildStore();
			store.getState().commandsStackManager.executeOperation([renumberCommand(2, 1)]);

			store.getState().commandsStackManager.undoOperation();

			const state = store.getState();
			expect((state.grafcet.getElementById("step-1")!.data as StepData).number).toBe(1);
			expect(state.hasCommandsToUndo).toBe(false);
			expect(state.hasCommandsToRedo).toBe(true);
		});

		it("ne fait rien s'il n'y a rien à annuler", () => {
			const store = buildStore();
			const before = store.getState().grafcet;

			store.getState().commandsStackManager.undoOperation();

			expect(store.getState().grafcet).toBe(before);
		});

		// Le point corrigé en §1.2 : la vue doit refléter l'annulation, y compris les
		// connexions, sans être reconstruite à la main commande par commande.
		it("resynchronise les nœuds de la vue sur le grafcet annulé", () => {
			const store = buildStore();
			store.getState().commandsStackManager.executeOperation([renumberCommand(2, 1)]);

			store.getState().commandsStackManager.undoOperation();

			const node = store.getState().nodes.find((n) => n.id === "step-1")!;
			expect((node.data as StepData).number).toBe(1);
		});
	});

	describe("redoOperation", () => {
		it("réapplique la commande annulée", () => {
			const store = buildStore();
			store.getState().commandsStackManager.executeOperation([renumberCommand(2, 1)]);
			store.getState().commandsStackManager.undoOperation();

			store.getState().commandsStackManager.redoOperation();

			const state = store.getState();
			expect((state.grafcet.getElementById("step-1")!.data as StepData).number).toBe(2);
			expect(state.hasCommandsToUndo).toBe(true);
			expect(state.hasCommandsToRedo).toBe(false);
		});

		it("ne fait rien s'il n'y a rien à rétablir", () => {
			const store = buildStore();
			const before = store.getState().grafcet;

			store.getState().commandsStackManager.redoOperation();

			expect(store.getState().grafcet).toBe(before);
		});

		it("vide la pile de rétablissement après une nouvelle commande", () => {
			const store = buildStore();
			store.getState().commandsStackManager.executeOperation([renumberCommand(2, 1)]);
			store.getState().commandsStackManager.undoOperation();

			store.getState().commandsStackManager.executeOperation([renumberCommand(3, 1)]);

			expect(store.getState().hasCommandsToRedo).toBe(false);
		});
	});

	describe("cycle complet", () => {
		it("exécuter → annuler → rétablir redonne le même résultat", () => {
			const store = buildStore();
			store.getState().commandsStackManager.executeOperation([renumberCommand(2, 1)]);
			const afterExecute = (store.getState().grafcet.getElementById("step-1")!.data as StepData).number;

			store.getState().commandsStackManager.undoOperation();
			store.getState().commandsStackManager.redoOperation();

			const afterRedo = (store.getState().grafcet.getElementById("step-1")!.data as StepData).number;
			expect(afterRedo).toBe(afterExecute);
		});
	});
});
