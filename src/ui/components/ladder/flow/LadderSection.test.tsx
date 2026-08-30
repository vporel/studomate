/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
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
import { selectorImplementation } from "@tests/utils/store-mocks";
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

function setup({
	mode = ProjectMode.DESIGN,
	highlightedNodesIds = [] as string[],
	section = new Section("s1", "Ma section", ""),
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
			zoomBySectionId: { s1: 1 },
			workflowManager: {
				handleNodesChange: jest.fn(),
				handleEdgesChange: jest.fn(),
			},
			nodesBySectionId: { s1: [] },
			edgesBySectionId: { s1: [] },
			highlightedNodesIds,
			setActiveSectionId: jest.fn(),
			selectedSectionIds: [],
			commandsStackManager: { executeOperation: jest.fn() },
			ladder: { sections: [section] },
		}),
	);

	const rendered = render(
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
					zoomBySectionId: { s1: 1 },
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
					ladder: { sections: [section] },
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

	it("replie/déplie le contenu au clic sur le bouton de repli de l'en-tête", () => {
		setup();
		const collapseButton = screen.getByLabelText("Replier la section");

		fireEvent.click(collapseButton);

		expect(screen.getByLabelText("Déplier la section")).toBeInTheDocument();
	});

	it("se déplie automatiquement quand un de ses éléments est mis en surbrillance", () => {
		const contact = createContactElement("A", "NO", 0, 0);
		const section = new Section("s1", "Ma section", "", [contact]);
		const { rerenderWith } = setup({ section });

		fireEvent.click(screen.getByLabelText("Replier la section"));
		expect(screen.getByLabelText("Déplier la section")).toBeInTheDocument();

		rerenderWith([contact.id]);

		expect(screen.getByLabelText("Replier la section")).toBeInTheDocument();
	});
});
