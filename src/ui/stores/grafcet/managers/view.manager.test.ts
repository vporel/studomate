/**
 * @jest-environment jsdom
 */
import { Dialect } from "@/expression-language/dialect.enum";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { createGrafcetStore } from "../grafcet.store";

function buildStore() {
	const grafcet = new GrafcetBuilder()
		.addStep(new StepBuilder().id("step-1").number(1).position(0, 0).build())
		.addStep(new StepBuilder().id("step-2").number(2).position(0, 100).build())
		.build();
	return createGrafcetStore(grafcet, new CommandsStack<Grafcet>(100), () => Dialect.FR);
}

function fakeRfInstance(zoom: number) {
	return {
		getZoom: () => zoom,
		zoomIn: jest.fn(),
		zoomOut: jest.fn(),
		fitView: jest.fn(),
	} as any;
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

describe("ViewManager viewport persistence", () => {
	it("has no viewport before one is ever set", () => {
		const store = buildStore();
		expect(store.getState().viewManager.getViewport()).toBeNull();
	});

	it("stores and returns the last viewport set", () => {
		const store = buildStore();
		const viewport = { x: 10, y: 20, zoom: 1.5 };

		store.getState().viewManager.setViewport(viewport);

		expect(store.getState().viewManager.getViewport()).toEqual(viewport);
		expect(store.getState().viewport).toEqual(viewport);
	});
});

describe("ViewManager — instance React Flow", () => {
	it("lève tant que l'instance React Flow n'est pas fournie", () => {
		const store = buildStore();
		expect(() => store.getState().viewManager.throwErrorIfNotReady()).toThrow();
	});

	it("ne lève plus une fois l'instance fournie", () => {
		const store = buildStore();
		store.getState().viewManager.setReactFlowInstance(fakeRfInstance(1));
		expect(() => store.getState().viewManager.throwErrorIfNotReady()).not.toThrow();
	});

	it("getZoom renvoie 1 par défaut sans instance", () => {
		const store = buildStore();
		expect(store.getState().viewManager.getZoom()).toBe(1);
	});

	it("getZoom délègue à l'instance React Flow une fois fournie", () => {
		const store = buildStore();
		store.getState().viewManager.setReactFlowInstance(fakeRfInstance(2.5));
		expect(store.getState().viewManager.getZoom()).toBe(2.5);
	});

	it("zoomIn/zoomOut/fitView ne font rien sans instance", () => {
		const store = buildStore();
		expect(() => {
			store.getState().viewManager.zoomIn();
			store.getState().viewManager.zoomOut();
			store.getState().viewManager.fitView();
		}).not.toThrow();
	});

	it("zoomIn/zoomOut/fitView délèguent à l'instance React Flow", () => {
		const store = buildStore();
		const rfInstance = fakeRfInstance(1);
		store.getState().viewManager.setReactFlowInstance(rfInstance);

		store.getState().viewManager.zoomIn();
		store.getState().viewManager.zoomOut();
		store.getState().viewManager.fitView();

		expect(rfInstance.zoomIn).toHaveBeenCalled();
		expect(rfInstance.zoomOut).toHaveBeenCalled();
		expect(rfInstance.fitView).toHaveBeenCalled();
	});
});

describe("ViewManager — sélection", () => {
	it("getNodes/getEdges renvoient l'état courant du store", () => {
		const store = buildStore();
		expect(store.getState().viewManager.getNodes().map((n) => n.id)).toEqual(["step-1", "step-2"]);
		expect(store.getState().viewManager.getEdges()).toEqual([]);
	});

	it("selectAllNodesAndEdges sélectionne tous les nœuds et arêtes", () => {
		const store = buildStore();
		store.getState().viewManager.selectAllNodesAndEdges();
		expect(store.getState().nodes.every((n) => n.selected)).toBe(true);
	});

	it("selectAllEdges sélectionne toutes les arêtes sans toucher aux nœuds", () => {
		const store = buildStore();
		store.getState().viewManager.selectAllEdges();
		expect(store.getState().nodes.every((n) => n.selected)).toBe(false);
	});

	it("selectNodesAndEdges ajoute à la sélection existante par défaut", () => {
		const store = buildStore();
		store.setState((s) => ({
			nodes: s.nodes.map((n) => (n.id === "step-1" ? { ...n, selected: true } : n)),
		}));

		store.getState().viewManager.selectNodesAndEdges(["step-2"], []);

		const selectedIds = store
			.getState()
			.nodes.filter((n) => n.selected)
			.map((n) => n.id);
		expect(selectedIds.sort()).toEqual(["step-1", "step-2"]);
	});

	it("selectNodesAndEdges avec deselectOtherElements désélectionne le reste", () => {
		const store = buildStore();
		store.setState((s) => ({
			nodes: s.nodes.map((n) => (n.id === "step-1" ? { ...n, selected: true } : n)),
		}));

		store.getState().viewManager.selectNodesAndEdges(["step-2"], [], true);

		const selectedIds = store
			.getState()
			.nodes.filter((n) => n.selected)
			.map((n) => n.id);
		expect(selectedIds).toEqual(["step-2"]);
	});

	it("deselectNodesAndEdges désélectionne uniquement les ids donnés", () => {
		const store = buildStore();
		store.getState().viewManager.selectAllNodesAndEdges();

		store.getState().viewManager.deselectNodesAndEdges(["step-1"], []);

		const selectedIds = store
			.getState()
			.nodes.filter((n) => n.selected)
			.map((n) => n.id);
		expect(selectedIds).toEqual(["step-2"]);
	});

	it("deselectAllNodesAndEdges désélectionne tout", () => {
		const store = buildStore();
		store.getState().viewManager.selectAllNodesAndEdges();

		store.getState().viewManager.deselectAllNodesAndEdges();

		expect(store.getState().nodes.every((n) => !n.selected)).toBe(true);
	});
});

function mockRaf() {
	const queue = new Map<number, FrameRequestCallback>();
	let nextId = 1;
	global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
		const id = nextId++;
		queue.set(id, cb);
		return id;
	}) as any;
	global.cancelAnimationFrame = jest.fn((id: number) => {
		queue.delete(id);
	}) as any;
	return {
		flush: () => {
			const toRun = Array.from(queue.values());
			queue.clear();
			toRun.forEach((cb) => cb(0));
		},
	};
}

function buildFlowElement(visible: boolean) {
	const container = document.createElement("div");
	const flow = document.createElement("div");
	flow.className = "react-flow";
	Object.defineProperty(flow, "offsetParent", { value: visible ? document.body : null, configurable: true });
	flow.focus = jest.fn();
	container.appendChild(flow);
	return { container, flow };
}

describe("ViewManager.focus", () => {
	afterEach(() => jest.restoreAllMocks());

	it("focalise immédiatement quand l'élément est déjà visible", () => {
		const raf = mockRaf();
		const store = buildStore();
		const { container, flow } = buildFlowElement(true);
		store.getState().viewManager.setContainerElement(container);

		store.getState().viewManager.focus();
		raf.flush();

		expect(flow.focus).toHaveBeenCalledWith({ preventScroll: true });
	});

	it("attend que l'élément devienne visible avant de le focaliser", () => {
		const raf = mockRaf();
		const store = buildStore();
		const { container, flow } = buildFlowElement(false);
		store.getState().viewManager.setContainerElement(container);

		store.getState().viewManager.focus();
		raf.flush(); // 1ère frame : encore caché (display:none)
		expect(flow.focus).not.toHaveBeenCalled();

		Object.defineProperty(flow, "offsetParent", { value: document.body, configurable: true });
		raf.flush(); // 2e frame : React a re-rendu, l'élément est visible

		expect(flow.focus).toHaveBeenCalledWith({ preventScroll: true });
	});

	it("annule le sondage précédent si appelée à nouveau avant résolution", () => {
		const raf = mockRaf();
		const store = buildStore();
		const { container: containerA, flow: flowA } = buildFlowElement(false); // ne deviendra jamais visible
		const { container: containerB, flow: flowB } = buildFlowElement(true);

		store.getState().viewManager.setContainerElement(containerA);
		store.getState().viewManager.focus();
		store.getState().viewManager.setContainerElement(containerB);
		store.getState().viewManager.focus(); // doit annuler le sondage précédent
		raf.flush();

		expect(flowA.focus).not.toHaveBeenCalled();
		expect(flowB.focus).toHaveBeenCalledWith({ preventScroll: true });
	});

	it("abandonne après un nombre borné de frames et avertit si le conteneur n'est pas défini", () => {
		const raf = mockRaf();
		const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
		const store = buildStore();

		store.getState().viewManager.focus();
		for (let i = 0; i < 40; i++) raf.flush();

		expect(warnSpy).toHaveBeenCalled();
	});

	it("dispose() annule un sondage en attente", () => {
		const raf = mockRaf();
		const store = buildStore();
		const { container, flow } = buildFlowElement(false);
		store.getState().viewManager.setContainerElement(container);

		store.getState().viewManager.focus();
		store.getState().viewManager.dispose();
		Object.defineProperty(flow, "offsetParent", { value: document.body, configurable: true });
		raf.flush();

		expect(flow.focus).not.toHaveBeenCalled();
	});
});
