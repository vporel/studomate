import ViewManager, { LADDER_FLOW_MAX_ZOOM, LADDER_FLOW_MIN_ZOOM } from "./view.manager";

describe("ViewManager", () => {
	function setup(initialZoom = 1) {
		let state = { zoom: initialZoom };
		const setStoreState = jest.fn((partial: Partial<typeof state>) => {
			state = { ...state, ...partial };
		});
		const getStoreState = jest.fn(() => state as any);
		const viewManager = new ViewManager(setStoreState as any, getStoreState as any);
		return { viewManager, setStoreState, getStoreState };
	}

	function fakeInstance() {
		return { setViewport: jest.fn().mockResolvedValue(true), screenToFlowPosition: jest.fn() };
	}

	it("zoomIn augmente le zoom d'un facteur 1.2 et repositionne x/y à 0 sur toutes les sections", () => {
		const { viewManager, getStoreState } = setup(1);
		const a = fakeInstance();
		const b = fakeInstance();
		viewManager.registerInstance("a", a);
		viewManager.registerInstance("b", b);

		viewManager.zoomIn();

		expect(getStoreState().zoom).toBeCloseTo(1.2);
		expect(a.setViewport).toHaveBeenCalledWith({ x: 0, y: 0, zoom: expect.closeTo(1.2) });
		expect(b.setViewport).toHaveBeenCalledWith({ x: 0, y: 0, zoom: expect.closeTo(1.2) });
	});

	it("zoomOut ne descend pas sous LADDER_FLOW_MIN_ZOOM", () => {
		const { viewManager, getStoreState } = setup(LADDER_FLOW_MIN_ZOOM);

		viewManager.zoomOut();

		expect(getStoreState().zoom).toBe(LADDER_FLOW_MIN_ZOOM);
	});

	it("zoomIn ne dépasse pas LADDER_FLOW_MAX_ZOOM", () => {
		const { viewManager, getStoreState } = setup(LADDER_FLOW_MAX_ZOOM);

		viewManager.zoomIn();

		expect(getStoreState().zoom).toBe(LADDER_FLOW_MAX_ZOOM);
	});

	// Régression : `zoomTo` (utilisé auparavant) garde le CENTRE du viewport fixe en zoomant,
	// ce qui décale x — invisible sur le contenu React Flow, mais désolidarise visuellement le
	// stub du rail de la bordure CSS statique (hors du viewport zoomable). `syncFromInstance`
	// doit donc TOUJOURS repincer x/y à 0, même quand le zoom résultant est inchangé (ex. un
	// Ctrl+molette à la borne min/max, qui peut décaler x sans changer la valeur affichée).
	it("syncFromInstance repince x/y à 0 sur toutes les sections même si le zoom ne change pas", () => {
		const { viewManager } = setup(LADDER_FLOW_MIN_ZOOM);
		const a = fakeInstance();
		viewManager.registerInstance("a", a);

		viewManager.syncFromInstance(LADDER_FLOW_MIN_ZOOM);

		expect(a.setViewport).toHaveBeenCalledWith({ x: 0, y: 0, zoom: LADDER_FLOW_MIN_ZOOM });
	});

	// Régression : `setViewport` déclenche lui-même `onMoveEnd` côté React Flow (transition de
	// viewport, programmatique ou non) — sans garde, `pinAllViewports` → `onMoveEnd` →
	// `syncFromInstance` → `pinAllViewports` boucle sans fin dès qu'une section est enregistrée.
	it("ignore un onMoveEnd déclenché par son propre setViewport, plutôt que de boucler indéfiniment", () => {
		const { viewManager } = setup(1);
		const instance = {
			setViewport: jest.fn((viewport: { zoom: number }) => {
				// Simule le comportement réel de React Flow : setViewport déclenche onMoveEnd.
				viewManager.syncFromInstance(viewport.zoom);
				return Promise.resolve(true);
			}),
			screenToFlowPosition: jest.fn(),
		};
		viewManager.registerInstance("a", instance);

		viewManager.zoomIn();

		expect(instance.setViewport).toHaveBeenCalledTimes(1);
	});

	it("n'appelle plus une section désenregistrée", () => {
		const { viewManager } = setup(1);
		const a = fakeInstance();
		viewManager.registerInstance("a", a);
		viewManager.unregisterInstance("a");

		viewManager.zoomIn();

		expect(a.setViewport).not.toHaveBeenCalled();
	});
});
