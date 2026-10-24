/**
 * @jest-environment jsdom
 */
import { act } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { ReactFlowProvider } from "@xyflow/react";
import { DndContext } from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { createContactElement } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useLadderContext, useLadderStore } from "../context/LadderContext";
import { ThemeProvider as AppThemeProvider } from "@/ui/theme/ThemeContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { RAIL_LANE_WIDTH } from "@/ui/utils/ladder/ladder-flow-builder";
import { computeLadderFlowDimensions } from "@/ui/utils/ladder/ladder-flow-dimensions";
import LadderSection from "./LadderSection";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../context/LadderContext");
jest.mock("../context-menu/LadderContextMenu", () => ({
	__esModule: true,
	default: () => null,
}));

const reactFlowProps: Record<string, unknown>[] = [];
jest.mock("@xyflow/react", () => {
	const actual = jest.requireActual("@xyflow/react");
	return {
		...actual,
		ReactFlow: (props: Record<string, unknown>) => {
			reactFlowProps.push(props);
			return null;
		},
	};
});

// jsdom n'implémente pas ResizeObserver ; React Flow s'en sert pour mesurer le viewport au montage.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
(global as any).ResizeObserver = ResizeObserverStub;

type IoCallback = (entries: { isIntersecting: boolean }[]) => void;
class IntersectionObserverStub {
	static instances: IntersectionObserverStub[] = [];
	callback: IoCallback;
	constructor(callback: IoCallback) {
		this.callback = callback;
		IntersectionObserverStub.instances.push(this);
	}
	observe() {}
	unobserve() {}
	disconnect() {}
	trigger(isIntersecting: boolean) {
		this.callback([{ isIntersecting }]);
	}
}

function setup({
	mode = ProjectMode.DESIGN,
	highlightedNodesIds = [] as string[],
	activeSectionId = null as string | null,
	section = new Section("s1", "Ma section", ""),
	excludedFromExecution = false,
	zoom = 1,
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ mode }),
	);
	(useLadderContext as jest.Mock).mockReturnValue({
		contextMenuEvents: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
	});
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			viewManager: {
				registerInstance: jest.fn(),
				unregisterInstance: jest.fn(),
				resetViewport: jest.fn(),
				syncFromInstance: jest.fn(),
			},
			zoom,
			workflowManager: {
				handleNodesChange: jest.fn(),
				handleEdgesChange: jest.fn(),
			},
			nodesBySectionId: { s1: [] },
			edgesBySectionId: { s1: [] },
			highlightedNodesIds,
			activeSectionId,
			setActiveSectionId: jest.fn(),
			selectedSectionIds: [],
			commandsStackManager: { executeOperation: jest.fn() },
			ladder: {
				sections: [section],
				excludedFromExecution,
				canDeleteSection: () => false,
			},
		}),
	);

	const rendered = renderWithI18n(
		<AppThemeProvider>
			<ReactFlowProvider>
				<DndContext>
					<SortableContext
						items={[section.id]}
						strategy={verticalListSortingStrategy}
					>
						<LadderSection section={section} index={0} />
					</SortableContext>
				</DndContext>
			</ReactFlowProvider>
		</AppThemeProvider>,
	);

	return {
		...rendered,
		rerenderWith: (nextHighlightedNodesIds: string[]) => {
			(useLadderStore as unknown as jest.Mock).mockImplementation(
				selectorImplementation({
					viewManager: {
						registerInstance: jest.fn(),
						unregisterInstance: jest.fn(),
						resetViewport: jest.fn(),
						syncFromInstance: jest.fn(),
					},
					zoom: 1,
					workflowManager: {
						handleNodesChange: jest.fn(),
						handleEdgesChange: jest.fn(),
					},
					nodesBySectionId: { s1: [] },
					edgesBySectionId: { s1: [] },
					highlightedNodesIds: nextHighlightedNodesIds,
					setActiveSectionId: jest.fn(),
					selectedSectionIds: [],
					commandsStackManager: { executeOperation: jest.fn() },
					ladder: { sections: [section], canDeleteSection: () => false },
				}),
			);
			rendered.rerender(
				<ReactFlowProvider>
					<DndContext>
						<SortableContext
							items={[section.id]}
							strategy={verticalListSortingStrategy}
						>
							<LadderSection section={section} index={0} />
						</SortableContext>
					</DndContext>
				</ReactFlowProvider>,
			);
		},
	};
}

describe("LadderSection", () => {
	beforeEach(() => {
		reactFlowProps.length = 0;
	});

	it("désactive l'auto-pan de React Flow pendant un glisser de nœud (viewport verrouillé à 0,0)", () => {
		setup();
		expect(reactFlowProps.at(-1)).toMatchObject({
			panOnDrag: false,
			autoPanOnNodeDrag: false,
		});
	});

	it("désactive le clavier a11y natif de React Flow (déplacement flèches fait maison) mais garde onDelete", () => {
		setup();
		const props = reactFlowProps.at(-1)!;
		expect(props.disableKeyboardA11y).toBe(true);
		expect(typeof props.onDelete).toBe("function");
	});

	it("se rend sans planter, avec la section identifiée par son id", () => {
		const { container } = setup();
		expect(
			container.querySelector('[data-section-id="s1"]'),
		).toBeInTheDocument();
	});

	describe("zoom commun", () => {
		const FRAME_MARGINS = 20;
		const fullWidth = () =>
			computeLadderFlowDimensions(0).width + RAIL_LANE_WIDTH * 2;
		const sectionOf = (zoom: number) =>
			setup({ zoom }).container.querySelector('[data-section-id="s1"]');

		it("part du zoom du store pour le viewport de React Flow", () => {
			setup({ zoom: 0.7 });
			expect(reactFlowProps.at(-1)).toMatchObject({
				defaultViewport: { x: 0, y: 0, zoom: 0.7 },
				minZoom: 0.5,
				maxZoom: 2,
			});
		});

		it("garde sa largeur à 100 %", () => {
			expect(sectionOf(1)).toHaveStyle({
				width: `${fullWidth() + FRAME_MARGINS}px`,
			});
		});

		it("rétrécit avec le zoom sous 100 %, marges comprises hors zoom", () => {
			expect(sectionOf(0.5)).toHaveStyle({
				width: `${fullWidth() * 0.5 + FRAME_MARGINS}px`,
			});
		});

		it("s'élargit avec le zoom au-delà de 100 %", () => {
			expect(sectionOf(1.25)).toHaveStyle({
				width: `${fullWidth() * 1.25 + FRAME_MARGINS}px`,
			});
		});

		it("garde sa largeur à partir de 150 %", () => {
			const atLimit = `${fullWidth() * 1.5 + FRAME_MARGINS}px`;
			expect(sectionOf(1.5)).toHaveStyle({ width: atLimit });
			expect(sectionOf(2)).toHaveStyle({ width: atLimit });
		});
	});

	it("se centre par des marges automatiques, sans translation qui rendrait son bord gauche inaccessible", () => {
		const { container } = setup();
		const section = container.querySelector('[data-section-id="s1"]');
		expect(section).toHaveStyle({ marginLeft: "auto", marginRight: "auto" });
		expect(section).not.toHaveStyle({ marginLeft: "50%" });
		expect((section as HTMLElement).style.transform).not.toContain(
			"translate(-50%",
		);
	});

	describe("barre d'alimentation", () => {
		const hasEnergizedRail = (container: HTMLElement) =>
			[...container.querySelectorAll("*")].some(
				(el) =>
					getComputedStyle(el).borderLeftColor === "rgb(0, 216, 0)" &&
					getComputedStyle(el).borderLeftWidth === "2px",
			);

		it("est verte en simulation", () => {
			const { container } = setup({
				mode: ProjectMode.SIMULATION,
				activeSectionId: "s1",
			});
			expect(hasEnergizedRail(container)).toBe(true);
		});

		it("reste noire en conception", () => {
			const { container } = setup({ activeSectionId: "s1" });
			expect(hasEnergizedRail(container)).toBe(false);
		});

		it("reste noire en simulation pour un ladder exclu de l'exécution", () => {
			const { container } = setup({
				mode: ProjectMode.SIMULATION,
				activeSectionId: "s1",
				excludedFromExecution: true,
			});
			expect(hasEnergizedRail(container)).toBe(false);
		});
	});

	it("replie/déplie le contenu au clic sur le bouton de repli de l'en-tête", () => {
		setup();
		const collapseButton = screen.getByLabelText("Replier le réseau");

		fireEvent.click(collapseButton);

		expect(screen.getByLabelText("Déplier le réseau")).toBeInTheDocument();
	});

	it("se déplie automatiquement quand un de ses éléments est mis en surbrillance", () => {
		const contact = createContactElement("A", "NO", 0, 0);
		const section = new Section("s1", "Ma section", "", [contact]);
		const { rerenderWith } = setup({ section });

		fireEvent.click(screen.getByLabelText("Replier le réseau"));
		expect(screen.getByLabelText("Déplier le réseau")).toBeInTheDocument();

		rerenderWith([contact.id]);

		expect(screen.getByLabelText("Replier le réseau")).toBeInTheDocument();
	});

	describe("virtualisation du canvas (montage à l'approche du viewport)", () => {
		const realIo = (global as any).IntersectionObserver;
		beforeEach(() => {
			IntersectionObserverStub.instances.length = 0;
			(global as any).IntersectionObserver = IntersectionObserverStub;
		});
		afterEach(() => {
			(global as any).IntersectionObserver = realIo;
		});

		it("ne monte pas React Flow tant que la section n'a pas approché le viewport", () => {
			setup();
			expect(reactFlowProps.length).toBe(0);
		});

		it("monte React Flow quand la section entre dans le viewport, et le garde monté ensuite", () => {
			setup();
			act(() => IntersectionObserverStub.instances[0].trigger(true));
			expect(reactFlowProps.length).toBeGreaterThan(0);

			act(() => IntersectionObserverStub.instances[0]?.trigger(false));
			expect(reactFlowProps.at(-1)).toBeDefined();
		});

		it("remonte React Flow après un cycle repli / dépliage", () => {
			setup();
			act(() => IntersectionObserverStub.instances[0].trigger(true));
			const countAfterMount = reactFlowProps.length;
			expect(countAfterMount).toBeGreaterThan(0);

			fireEvent.click(screen.getByLabelText("Replier le réseau"));
			fireEvent.click(screen.getByLabelText("Déplier le réseau"));

			expect(reactFlowProps.length).toBeGreaterThan(countAfterMount);
		});

		it("monte React Flow d'emblée si la section est active", () => {
			setup({ activeSectionId: "s1" });
			expect(reactFlowProps.length).toBeGreaterThan(0);
		});

		it("monte React Flow d'emblée si un élément de la section est surligné", () => {
			const contact = createContactElement("A", "NO", 0, 0);
			const section = new Section("s1", "Ma section", "", [contact]);
			setup({ section, highlightedNodesIds: [contact.id] });
			expect(reactFlowProps.length).toBeGreaterThan(0);
		});
	});
});
