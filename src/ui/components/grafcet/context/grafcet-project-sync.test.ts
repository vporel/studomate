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
		updateProgramData: jest.fn(),
		setStoreValues: jest.fn(),
	} as unknown as GrafcetsManager;
}

function buildStore() {
	const grafcet = new GrafcetBuilder()
		.id("g1")
		.addStep(new StepBuilder().id("step-1").number(1).position(0, 0).build())
		.build();
	return createGrafcetStore(
		grafcet,
		new CommandsStack<Grafcet>(100),
		() => Dialect.FR,
	);
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

		expect(grafcetsManager.updateProgramData).not.toHaveBeenCalled();
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

		expect(grafcetsManager.updateProgramData).toHaveBeenCalledTimes(1);
		unsubscribe();
	});

	it("ne répercute pas les compteurs d'annulation quand ils n'ont pas changé", () => {
		const store = buildStore();
		const grafcetsManager = fakeGrafcetsManager();
		const unsubscribe = syncGrafcetToProject(store, grafcetsManager);

		store.getState().viewManager.selectNodesAndEdges(["step-1"], []);

		expect(grafcetsManager.setStoreValues).not.toHaveBeenCalled();
		unsubscribe();
	});

	it("répercute les compteurs d'annulation quand ils changent", () => {
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

		expect(grafcetsManager.setStoreValues).toHaveBeenCalledWith(
			"g1",
			expect.objectContaining({ hasCommandsToUndo: true }),
		);
		unsubscribe();
	});

	it("ne notifie plus après désabonnement", () => {
		const store = buildStore();
		const grafcetsManager = fakeGrafcetsManager();
		const unsubscribe = syncGrafcetToProject(store, grafcetsManager);
		unsubscribe();

		store.getState().viewManager.selectNodesAndEdges(["step-1"], []);

		expect(grafcetsManager.setStoreValues).not.toHaveBeenCalled();
	});
});
