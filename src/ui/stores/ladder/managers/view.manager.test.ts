import LadderViewManager, {
	LADDER_FLOW_MAX_ZOOM,
	LADDER_FLOW_MIN_ZOOM,
} from "./view.manager";

describe("LadderViewManager", () => {
	function setup(zoomBySectionId: Record<string, number> = {}) {
		let state = { zoomBySectionId };
		const setStoreState = jest.fn((partial: any) => {
			state = {
				...state,
				...(typeof partial === "function" ? partial(state) : partial),
			};
		});
		const getStoreState = jest.fn(() => state as any);
		const viewManager = new LadderViewManager(
			setStoreState as any,
			getStoreState as any,
		);
		return { viewManager, getStoreState };
	}

	function fakeInstance() {
		return {
			setViewport: jest.fn().mockResolvedValue(true),
			screenToFlowPosition: jest.fn(),
		};
	}

	it("zoomIn augmente le zoom de la section d'un facteur 1.2 et repince x/y à 0", () => {
		const { viewManager, getStoreState } = setup();
		const a = fakeInstance();
		const b = fakeInstance();
		viewManager.registerInstance("a", a);
		viewManager.registerInstance("b", b);

		viewManager.zoomIn("a");

		expect(getStoreState().zoomBySectionId.a).toBeCloseTo(1.2);
		expect(a.setViewport).toHaveBeenCalledWith({
			x: 0,
			y: 0,
			zoom: expect.closeTo(1.2),
		});
		// Les autres sections ne bougent pas.
		expect(getStoreState().zoomBySectionId.b).toBeUndefined();
		expect(b.setViewport).not.toHaveBeenCalled();
	});

	it("zoomOut ne descend pas sous LADDER_FLOW_MIN_ZOOM", () => {
		const { viewManager, getStoreState } = setup({ a: LADDER_FLOW_MIN_ZOOM });

		viewManager.zoomOut("a");

		expect(getStoreState().zoomBySectionId.a).toBe(LADDER_FLOW_MIN_ZOOM);
	});

	it("zoomIn ne dépasse pas LADDER_FLOW_MAX_ZOOM", () => {
		const { viewManager, getStoreState } = setup({ a: LADDER_FLOW_MAX_ZOOM });

		viewManager.zoomIn("a");

		expect(getStoreState().zoomBySectionId.a).toBe(LADDER_FLOW_MAX_ZOOM);
	});

	// Régression : `zoomTo` garde le CENTRE du viewport fixe en zoomant, ce qui décale x — invisible
	// sur le contenu React Flow, mais désolidarise visuellement le stub du rail de la bordure CSS
	// statique. `syncFromInstance` doit donc TOUJOURS repincer x/y à 0, même quand le zoom résultant
	// est inchangé (ex. un geste à la borne min/max, qui peut décaler x sans changer la valeur).
	it("syncFromInstance repince x/y à 0 même si le zoom ne change pas", () => {
		const { viewManager } = setup({ a: LADDER_FLOW_MIN_ZOOM });
		const a = fakeInstance();
		viewManager.registerInstance("a", a);

		viewManager.syncFromInstance("a", LADDER_FLOW_MIN_ZOOM);

		expect(a.setViewport).toHaveBeenCalledWith({
			x: 0,
			y: 0,
			zoom: LADDER_FLOW_MIN_ZOOM,
		});
	});

	// Régression : `setViewport` déclenche lui-même `onMoveEnd` côté React Flow — sans garde,
	// `pinViewport` → `onMoveEnd` → `syncFromInstance` → `pinViewport` boucle sans fin.
	it("ignore un onMoveEnd déclenché par son propre setViewport, plutôt que de boucler", () => {
		const { viewManager } = setup();
		const instance = {
			setViewport: jest.fn((viewport: { zoom: number }) => {
				viewManager.syncFromInstance("a", viewport.zoom);
				return Promise.resolve(true);
			}),
			screenToFlowPosition: jest.fn(),
		};
		viewManager.registerInstance("a", instance);

		viewManager.zoomIn("a");

		expect(instance.setViewport).toHaveBeenCalledTimes(1);
	});

	it("n'appelle plus une section désenregistrée", () => {
		const { viewManager } = setup();
		const a = fakeInstance();
		viewManager.registerInstance("a", a);
		viewManager.unregisterInstance("a");

		viewManager.zoomIn("a");

		expect(a.setViewport).not.toHaveBeenCalled();
	});
});
