/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render } from "@testing-library/react";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import { fakeStoreApi, selectorImplementation } from "@tests/utils/store-mocks";
import { GRAFCET_FLOW_MIN_ZOOM } from "@/ui/stores/grafcet/managers/view.manager";
import { GRAFCET_PAGE_DIMENSIONS } from "@/ui/utils/grafcet/grafcet-utils";
import GrafcetFlow from "./GrafcetFlow";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../context/GrafcetContext");
// Le menu contextuel a son propre scope de test ; ici on vérifie seulement que GrafcetFlow
// l'assemble sans planter.
jest.mock("../context-menu/GrafcetContextMenu", () => ({
	__esModule: true,
	default: () => <div data-testid="context-menu" />,
}));

let reactFlowProps: Record<string, unknown> = {};
jest.mock("@xyflow/react", () => {
	const actual = jest.requireActual("@xyflow/react");
	return {
		...actual,
		ReactFlow: (props: Record<string, unknown>) => {
			reactFlowProps = props;
			return <actual.ReactFlow {...props} />;
		},
	};
});

// jsdom n'implémente pas ResizeObserver (API navigateur, hors du DOM qu'il simule) ; React Flow
// s'en sert pour se dimensionner au montage. Les observateurs de la page du grafcet sont
// gardés pour que les tests puissent simuler un redimensionnement du bloc.
const pageObservers: ((entries: unknown[]) => void)[] = [];
class ResizeObserverStub {
	constructor(private callback: (entries: unknown[]) => void) {}
	observe(element: Element) {
		if (element.classList.contains("grafcet-page"))
			pageObservers.push(this.callback);
	}
	unobserve() {}
	disconnect() {}
}
(global as any).ResizeObserver = ResizeObserverStub;

function resizePage(width: number, height: number) {
	act(() => {
		pageObservers.forEach((callback) =>
			callback([{ contentRect: { width, height } }]),
		);
	});
}

function mockStores(
	viewManager: Record<string, unknown>,
	editingEnabled = true,
	zoom: number | null = null,
) {
	const grafcet = new GrafcetBuilder().id("g1").build();

	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			mode: ProjectMode.DESIGN,
			editingEnabled,
			setActiveScope: jest.fn(),
		}),
	);
	(useGrafcetContext as jest.Mock).mockReturnValue({
		store: fakeStoreApi({ grafcet }),
	});
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			grafcet,
			nodes: [],
			edges: [],
			zoom,
			viewManager: {
				setReactFlowInstance: jest.fn(),
				setContainerElement: jest.fn(),
				setZoom: jest.fn(),
				setMinZoom: jest.fn(),
				setViewportPinned: jest.fn(),
				pinViewport: jest.fn(),
				applyZoom: jest.fn(),
				syncFromInstance: jest.fn(),
				...viewManager,
			},
			workflowManager: {
				handleNodesChange: jest.fn(),
				handleNewConnection: jest.fn(),
				handleEdgesChange: jest.fn(),
				deleteNodesAndEdges: jest.fn(),
			},
		}),
	);
}

describe("GrafcetFlow", () => {
	it("se rend sans planter et affiche la page identifiée par l'id du grafcet", () => {
		mockStores({});

		const { container } = render(<GrafcetFlow />);

		expect(container.querySelector("#grafcet-g1")).toBeInTheDocument();
		expect(container.querySelector("#grafcet-g1")).toHaveClass(
			"grafcet-page",
			"flow-page",
		);
	});

	it("déclare au store le zoom minimal de la page, dans l'application comme dans un bloc", () => {
		const setMinZoom = jest.fn();
		mockStores({ setMinZoom });

		const { unmount } = render(<GrafcetFlow />);
		expect(setMinZoom).toHaveBeenLastCalledWith(GRAFCET_FLOW_MIN_ZOOM);
		unmount();

		render(<GrafcetFlow fitToContainer />);
		expect(setMinZoom).toHaveBeenLastCalledWith(GRAFCET_FLOW_MIN_ZOOM);
	});

	describe("cadre de la page", () => {
		const frameOf = (container: HTMLElement) =>
			container.querySelector(".react-flow")!.parentElement;

		it("a la taille de la page à 100 %", () => {
			mockStores({}, true, 1);
			const { container } = render(<GrafcetFlow />);
			expect(frameOf(container)).toHaveStyle({
				width: `${GRAFCET_PAGE_DIMENSIONS.width}px`,
				height: `${GRAFCET_PAGE_DIMENSIONS.height}px`,
			});
		});

		it.each([0.5, 1.5, 2])("suit le zoom (%s) sans limite", (zoom) => {
			mockStores({}, true, zoom);
			const { container } = render(<GrafcetFlow />);
			expect(frameOf(container)).toHaveStyle({
				width: `${GRAFCET_PAGE_DIMENSIONS.width * zoom}px`,
				height: `${GRAFCET_PAGE_DIMENSIONS.height * zoom}px`,
			});
		});

		it("vaut 100 % tant que le zoom n'est pas connu", () => {
			mockStores({}, true, null);
			const { container } = render(<GrafcetFlow />);
			expect(frameOf(container)).toHaveStyle({
				width: `${GRAFCET_PAGE_DIMENSIONS.width}px`,
			});
		});

		it("se centre par des marges automatiques, sans translation", () => {
			mockStores({}, true, 1);
			const { container } = render(<GrafcetFlow />);
			expect(frameOf(container)).toHaveStyle({
				marginLeft: "auto",
				marginRight: "auto",
			});
			expect(frameOf(container)).not.toHaveStyle({ marginLeft: "50%" });
		});

		it("est défilable dans le conteneur de la page", () => {
			mockStores({}, true, 1);
			const { container } = render(<GrafcetFlow />);
			expect(container.querySelector("#grafcet-g1")).toHaveStyle({
				overflow: "auto",
			});
		});
	});

	describe("Ctrl/Cmd + molette", () => {
		it("zoome sur toute la page, y compris hors du flow", () => {
			const zoomIn = jest.fn();
			const zoomOut = jest.fn();
			mockStores({ zoomIn, zoomOut }, true, 1);
			const { container } = render(<GrafcetFlow />);
			const page = container.querySelector("#grafcet-g1")!;

			fireEvent.wheel(page, { ctrlKey: true, deltaY: -100 });
			fireEvent.wheel(page, { metaKey: true, deltaY: 100 });

			expect(zoomIn).toHaveBeenCalledTimes(1);
			expect(zoomOut).toHaveBeenCalledTimes(1);
		});

		it("zoome aussi au-dessus du flow", () => {
			const zoomIn = jest.fn();
			mockStores({ zoomIn }, true, 1);
			const { container } = render(<GrafcetFlow />);

			fireEvent.wheel(container.querySelector(".react-flow")!, {
				ctrlKey: true,
				deltaY: -100,
			});

			expect(zoomIn).toHaveBeenCalledTimes(1);
		});

		it("laisse la molette seule défiler", () => {
			const zoomIn = jest.fn();
			const zoomOut = jest.fn();
			mockStores({ zoomIn, zoomOut }, true, 1);
			const { container } = render(<GrafcetFlow />);

			fireEvent.wheel(container.querySelector("#grafcet-g1")!, {
				deltaY: -100,
			});

			expect(zoomIn).not.toHaveBeenCalled();
			expect(zoomOut).not.toHaveBeenCalled();
		});
	});

	describe("déplacement à la souris", () => {
		it("est désactivé quand la page est à sa taille réelle, elle défile", () => {
			mockStores({}, true, 1);
			render(<GrafcetFlow />);
			expect(reactFlowProps.panOnDrag).toBe(false);
		});

		it("est activé quand le grafcet est ajusté à son bloc, pour atteindre ce que le zoom cache", () => {
			mockStores({}, false, 1);
			render(<GrafcetFlow fitToContainer />);
			expect(reactFlowProps.panOnDrag).toBe(true);
		});
	});

	it("verrouille le viewport de la page à sa taille réelle, dans l'application", () => {
		const setViewportPinned = jest.fn();
		mockStores({ setViewportPinned });

		render(<GrafcetFlow />);

		expect(setViewportPinned).toHaveBeenLastCalledWith(true);
	});

	describe("dans un bloc intégré", () => {
		beforeEach(() => {
			pageObservers.length = 0;
		});

		function rfInstance() {
			return { setViewport: jest.fn(), fitView: jest.fn() };
		}

		it("ouvre le grafcet modifiable sur toute la largeur de la page, défilable", () => {
			const applyZoom = jest.fn();
			const setViewportPinned = jest.fn();
			const instance = rfInstance();
			mockStores({ rfInstance: instance, applyZoom, setViewportPinned });
			const { container } = render(<GrafcetFlow fitToContainer />);

			resizePage(500, 400);

			expect(applyZoom).toHaveBeenLastCalledWith(
				expect.closeTo(500 / GRAFCET_PAGE_DIMENSIONS.width),
			);
			expect(setViewportPinned).toHaveBeenLastCalledWith(true);
			expect(instance.fitView).not.toHaveBeenCalled();
			expect(container.querySelector("#grafcet-g1")).toHaveStyle({
				overflow: "auto",
			});
		});

		it("suit la largeur du bloc, mais pas sa hauteur", () => {
			const applyZoom = jest.fn();
			mockStores({ rfInstance: rfInstance(), applyZoom });
			render(<GrafcetFlow fitToContainer />);
			resizePage(500, 400);
			const calls = applyZoom.mock.calls.length;

			resizePage(500, 700);
			expect(applyZoom).toHaveBeenCalledTimes(calls);

			resizePage(794, 700);
			expect(applyZoom).toHaveBeenLastCalledWith(1);
		});

		it("cadre le contenu quand le grafcet n'est pas modifiable", () => {
			const applyZoom = jest.fn();
			const setViewportPinned = jest.fn();
			const instance = rfInstance();
			mockStores({ rfInstance: instance, applyZoom, setViewportPinned }, false);
			render(<GrafcetFlow fitToContainer />);

			resizePage(500, 400);

			expect(instance.fitView).toHaveBeenCalled();
			expect(applyZoom).not.toHaveBeenCalled();
			expect(setViewportPinned).toHaveBeenLastCalledWith(false);
		});
	});
});
