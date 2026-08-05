import { Dialect } from "@/expression-language/dialect.enum";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/elements-update.command";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import GrafcetsManager from "@/ui/stores/project/managers/grafcets.manager";
import { createGrafcetStore } from "@/ui/stores/grafcet/grafcet.store";
import { syncGrafcetToProject } from "./grafcet-project-sync";

function fakeGrafcetsManager() {
	return {
		updateGrafcetData: jest.fn(),
		setGrafcetStoreValues: jest.fn(),
	} as unknown as GrafcetsManager;
}

function buildStore() {
	const grafcet = new GrafcetBuilder()
		.id("g1")
		.addStep(new StepBuilder().id("step-1").number(1).position(0, 0).build())
		.build();
	return createGrafcetStore(grafcet, new CommandsStack<Grafcet>(100), () => Dialect.FR);
}

describe("syncGrafcetToProject", () => {
	// Régression §3.3 : `subscribe` sans sélecteur se déclenchait à chaque changement du
	// store — y compris une simple sélection, qui ne touche pas `state.grafcet` — et relançait
	// à chaque fois la comparaison profonde du grafcet entier.
	it("ne répercute pas une sélection qui ne touche pas le grafcet", () => {
		const store = buildStore();
		const grafcetsManager = fakeGrafcetsManager();
		const unsubscribe = syncGrafcetToProject(store, grafcetsManager);

		store.getState().viewManager.selectNodesAndEdges(["step-1"], []);

		expect(grafcetsManager.updateGrafcetData).not.toHaveBeenCalled();
		unsubscribe();
	});

	it("répercute un changement qui remplace effectivement le grafcet", () => {
		const store = buildStore();
		const grafcetsManager = fakeGrafcetsManager();
		const unsubscribe = syncGrafcetToProject(store, grafcetsManager);
		const element = store.getState().grafcet.getElementById("step-1")!;

		store.getState().commandsStackManager.executeOperation([
			new ElementsUpdateCommand([
				{
					id: "step-1",
					type: "step",
					data: { ...element.data, number: 2 },
					previousData: element.data,
				},
			]),
		]);

		expect(grafcetsManager.updateGrafcetData).toHaveBeenCalledTimes(1);
		unsubscribe();
	});

	it("répercute toujours les compteurs d'annulation, même sans changement du grafcet", () => {
		const store = buildStore();
		const grafcetsManager = fakeGrafcetsManager();
		const unsubscribe = syncGrafcetToProject(store, grafcetsManager);

		store.getState().viewManager.selectNodesAndEdges(["step-1"], []);

		expect(grafcetsManager.setGrafcetStoreValues).toHaveBeenCalledWith(
			"g1",
			expect.objectContaining({ hasCommandsToUndo: expect.any(Boolean) }),
		);
		unsubscribe();
	});

	it("ne notifie plus après désabonnement", () => {
		const store = buildStore();
		const grafcetsManager = fakeGrafcetsManager();
		const unsubscribe = syncGrafcetToProject(store, grafcetsManager);
		unsubscribe();

		store.getState().viewManager.selectNodesAndEdges(["step-1"], []);

		expect(grafcetsManager.setGrafcetStoreValues).not.toHaveBeenCalled();
	});
});
