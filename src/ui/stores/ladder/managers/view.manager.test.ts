import LadderViewManager, {
	LADDER_FLOW_MAX_ZOOM,
	LADDER_FLOW_MIN_ZOOM,
} from "./view.manager";

describe("LadderViewManager", () => {
	function setup(zoom = 1) {
		let state = { zoom };
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

	it("zoomIn augmente le zoom d'un facteur 1.2 et repince x/y à 0 sur toutes les sections", () => {
		const { viewManager, getStoreState } = setup();
		const a = fakeInstance();
		const b = fakeInstance();
		viewManager.registerInstance("a", a);
		viewManager.registerInstance("b", b);

		viewManager.zoomIn();

		expect(getStoreState().zoom).toBeCloseTo(1.2);
		for (const instance of [a, b]) {
			expect(instance.setViewport).toHaveBeenCalledWith({
				x: 0,
				y: 0,
				zoom: expect.closeTo(1.2),
			});
		}
	});

	it("zoomOut descend sous 100 %", () => {
		const { viewManager, getStoreState } = setup();

		viewManager.zoomOut();

		expect(getStoreState().zoom).toBeCloseTo(1 / 1.2);
	});

	it("zoomOut ne descend pas sous LADDER_FLOW_MIN_ZOOM", () => {
		const { viewManager, getStoreState } = setup(LADDER_FLOW_MIN_ZOOM);
		const a = fakeInstance();
		viewManager.registerInstance("a", a);

		viewManager.zoomOut();

		expect(getStoreState().zoom).toBe(LADDER_FLOW_MIN_ZOOM);
		expect(a.setViewport).not.toHaveBeenCalled();
	});

	it("zoomIn ne dépasse pas LADDER_FLOW_MAX_ZOOM", () => {
		const { viewManager, getStoreState } = setup(LADDER_FLOW_MAX_ZOOM);

		viewManager.zoomIn();

		expect(getStoreState().zoom).toBe(LADDER_FLOW_MAX_ZOOM);
	});

	it("un pas qui traverse 100 % s'y arrête, dans les deux sens", () => {
		const up = setup(0.9);
		up.viewManager.zoomIn();
		expect(up.getStoreState().zoom).toBe(1);

		const down = setup(1.1);
		down.viewManager.zoomOut();
		expect(down.getStoreState().zoom).toBe(1);
	});

	it("revient à 100 % depuis le zoom minimal en quelques pas", () => {
		const { viewManager, getStoreState } = setup(LADDER_FLOW_MIN_ZOOM);

		for (let i = 0; i < 5 && getStoreState().zoom < 1; i++)
			viewManager.zoomIn();

		expect(getStoreState().zoom).toBe(1);
	});

	// Régression : `zoomTo` garde le CENTRE du viewport fixe en zoomant, ce qui décale x — invisible
	// sur le contenu React Flow, mais désolidarise visuellement le stub du rail de la bordure CSS
	// statique. `syncFromInstance` doit donc TOUJOURS repincer x/y à 0, même quand le zoom résultant
	// est inchangé (ex. un geste à la borne min/max, qui peut décaler x sans changer la valeur).
	it("syncFromInstance repince x/y à 0 même si le zoom ne change pas", () => {
		const { viewManager } = setup(LADDER_FLOW_MIN_ZOOM);
		const a = fakeInstance();
		const b = fakeInstance();
		viewManager.registerInstance("a", a);
		viewManager.registerInstance("b", b);

		viewManager.syncFromInstance("a", LADDER_FLOW_MIN_ZOOM);

		expect(a.setViewport).toHaveBeenCalledWith({
			x: 0,
			y: 0,
			zoom: LADDER_FLOW_MIN_ZOOM,
		});
		expect(b.setViewport).not.toHaveBeenCalled();
	});

	it("syncFromInstance (geste Ctrl + molette) étend le nouveau zoom à toutes les sections", () => {
		const { viewManager, getStoreState } = setup();
		const a = fakeInstance();
		const b = fakeInstance();
		viewManager.registerInstance("a", a);
		viewManager.registerInstance("b", b);

		viewManager.syncFromInstance("a", 0.8);

		expect(getStoreState().zoom).toBe(0.8);
		expect(b.setViewport).toHaveBeenCalledWith({ x: 0, y: 0, zoom: 0.8 });
	});

	it("syncFromInstance borne le zoom reçu", () => {
		const { viewManager, getStoreState } = setup();

		viewManager.syncFromInstance("a", 10);

		expect(getStoreState().zoom).toBe(LADDER_FLOW_MAX_ZOOM);
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

		viewManager.zoomIn();

		expect(instance.setViewport).toHaveBeenCalledTimes(1);
	});

	it("n'appelle plus une section désenregistrée", () => {
		const { viewManager } = setup();
		const a = fakeInstance();
		viewManager.registerInstance("a", a);
		viewManager.unregisterInstance("a");

		viewManager.zoomIn();

		expect(a.setViewport).not.toHaveBeenCalled();
	});

	it("resetViewport repince une section au zoom commun courant", () => {
		const { viewManager } = setup(0.7);
		const a = fakeInstance();
		viewManager.registerInstance("a", a);

		viewManager.resetViewport("a");

		expect(a.setViewport).toHaveBeenCalledWith({ x: 0, y: 0, zoom: 0.7 });
	});
});
