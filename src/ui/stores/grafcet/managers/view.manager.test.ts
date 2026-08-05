import { Dialect } from "@/expression-language/dialect.enum";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { createGrafcetStore } from "../grafcet.store";

function buildStore() {
	const grafcet = new GrafcetBuilder()
		.addStep(new StepBuilder().id("step-1").number(1).position(0, 0).build())
		.build();
	return createGrafcetStore(grafcet, new CommandsStack<Grafcet>(100), () => Dialect.FR);
}

describe("ViewManager.temporarilyHighlightNodesAndEdges", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("surligne immédiatement, puis retire le surlignage après le délai", () => {
		const store = buildStore();

		store.getState().viewManager.temporarilyHighlightNodesAndEdges(["step-1"], []);
		expect(store.getState().highlightedNodesIds).toEqual(["step-1"]);

		jest.advanceTimersByTime(2000);
		expect(store.getState().highlightedNodesIds).toEqual([]);
	});

	// Régression §4.5 : sans `dispose()`, un `setTimeout` en attente continuait de modifier
	// un store abandonné après la fermeture de la page du grafcet.
	it("n'agit plus sur le store après dispose()", () => {
		const store = buildStore();
		store.getState().viewManager.temporarilyHighlightNodesAndEdges(["step-1"], []);

		store.getState().viewManager.dispose();
		jest.advanceTimersByTime(2000);

		//Le surlignage n'a jamais été retiré : le minuteur a été annulé avant de se déclencher
		expect(store.getState().highlightedNodesIds).toEqual(["step-1"]);
	});

	it("n'échoue pas quand dispose() est appelé sans surlignage en attente", () => {
		const store = buildStore();

		expect(() => store.getState().viewManager.dispose()).not.toThrow();
	});
});
