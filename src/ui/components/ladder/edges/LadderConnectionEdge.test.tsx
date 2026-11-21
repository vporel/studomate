/**
 * @jest-environment jsdom
 */
import ConnectionUpdateCommand from "@/schemas/ladder/commands/connection-update.command";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import PageVisibilityContext from "@/ui/components/pages/page-visibility-context";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import useCanEditActivePage from "@/ui/components/projects/useCanEditActivePage";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import {
	ThemeProvider as AppThemeProvider,
	DEFAULT_THEME,
} from "@/ui/theme/ThemeContext";
import { quarterColToPx } from "@/ui/utils/ladder/ladder-edge-geometry";
import { computeEnergizedEdges } from "@/ui/utils/ladder/ladder-power-flow";
import { fireEvent, render } from "@testing-library/react";
import { selectorImplementation } from "@tests/utils/store-mocks";
import LadderConnectionEdge from "./LadderConnectionEdge";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");
jest.mock("@/ui/components/projects/useCanEditActivePage");
jest.mock("@/ui/utils/ladder/ladder-power-flow");

const screenToFlowPosition = jest.fn();
jest.mock("@xyflow/react", () => ({
	...jest.requireActual("@xyflow/react"),
	useReactFlow: () => ({ screenToFlowPosition }),
}));

const POINTS: [number, number][] = [
	[0, 2],
	[1, 2],
];

function setup({
	selected = true,
	points = POINTS as [number, number][] | undefined,
	sourceY = 50,
	targetY = 120,
	canEdit = true,
	mode = ProjectMode.DESIGN,
	energized = false,
	pageVisible = true,
	executeOperation = jest.fn(),
} = {}) {
	(useCanEditActivePage as jest.Mock).mockReturnValue(canEdit);
	(computeEnergizedEdges as jest.Mock).mockReturnValue(
		new Set(energized ? ["edge-1"] : []),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ mode, simulationVariablesStates: {} }),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ladder: { id: "ladder-1" },
			commandsStackManager: { executeOperation },
		}),
	);

	const props = {
		id: "edge-1",
		sourceX: 10,
		sourceY,
		targetX: 200,
		targetY,
		data: points ? { points } : undefined,
		selected,
	};
	const { container } = render(
		<AppThemeProvider>
			<PageVisibilityContext.Provider value={pageVisible}>
				<svg>
					<LadderConnectionEdge {...(props as any)} />
				</svg>
			</PageVisibilityContext.Provider>
		</AppThemeProvider>,
	);
	return { container, executeOperation };
}

const handleOf = (c: HTMLElement) => c.querySelector("line");

describe("LadderConnectionEdge", () => {
	beforeAll(() => {
		if (typeof window.PointerEvent === "undefined") {
			class PointerEventStub extends MouseEvent {
				pointerId: number;
				constructor(type: string, init: PointerEventInit = {}) {
					super(type, init);
					this.pointerId = init.pointerId ?? 0;
				}
			}
			(window as any).PointerEvent = PointerEventStub;
		}
	});

	beforeEach(() => {
		jest.clearAllMocks();
		(SVGElement.prototype as any).setPointerCapture = jest.fn();
		(SVGElement.prototype as any).releasePointerCapture = jest.fn();
	});

	describe("poignée du segment vertical", () => {
		it("présente quand l'arête est sélectionnée et a un segment vertical", () => {
			const { container } = setup();
			expect(handleOf(container)).not.toBeNull();
		});

		it("absente quand l'arête n'est pas sélectionnée", () => {
			const { container } = setup({ selected: false });
			expect(handleOf(container)).toBeNull();
		});

		it("absente sans segment vertical (même ligne)", () => {
			const { container } = setup({ sourceY: 50, targetY: 50 });
			expect(handleOf(container)).toBeNull();
		});
	});

	describe("glisser du segment vertical", () => {
		function drag(container: HTMLElement, x: number | null) {
			const line = handleOf(container)!;
			fireEvent.pointerDown(line, { pointerId: 1 });
			if (x !== null) {
				screenToFlowPosition.mockReturnValue({ x, y: 0 });
				fireEvent.pointerMove(line, { buttons: 1, clientX: 1, clientY: 1 });
			}
			fireEvent.pointerUp(handleOf(container)!, { pointerId: 1 });
		}

		it("exécute une seule ConnectionUpdateCommand au relâchement, avec les points décalés", () => {
			const { container, executeOperation } = setup();
			const line = handleOf(container)!;
			fireEvent.pointerDown(line, { pointerId: 1 });
			for (const q of [3, 4, 5]) {
				screenToFlowPosition.mockReturnValue({ x: quarterColToPx(q), y: 0 });
				fireEvent.pointerMove(handleOf(container)!, { buttons: 1 });
			}
			expect(executeOperation).not.toHaveBeenCalled();
			fireEvent.pointerUp(handleOf(container)!, { pointerId: 1 });

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [[commands]] = executeOperation.mock.calls;
			expect(commands).toHaveLength(1);
			expect(commands[0]).toBeInstanceOf(ConnectionUpdateCommand);
			expect(commands[0]).toMatchObject({
				payload: {
					connectionId: "edge-1",
					changes: {
						points: [
							[0, 5],
							[1, 5],
						],
					},
					previousChanges: {
						points: [
							[0, 2],
							[1, 2],
						],
					},
				},
			});
		});

		it("aucune commande si la colonne n'a pas changé", () => {
			const { container, executeOperation } = setup();
			drag(container, quarterColToPx(2));
			expect(executeOperation).not.toHaveBeenCalled();
		});

		it("aucune commande sans mouvement", () => {
			const { container, executeOperation } = setup();
			drag(container, null);
			expect(executeOperation).not.toHaveBeenCalled();
		});

		it("ignore les mouvements sans bouton enfoncé", () => {
			const { container, executeOperation } = setup();
			const line = handleOf(container)!;
			fireEvent.pointerDown(line, { pointerId: 1 });
			screenToFlowPosition.mockReturnValue({ x: quarterColToPx(6), y: 0 });
			fireEvent.pointerMove(line, { buttons: 0 });
			fireEvent.pointerUp(line, { pointerId: 1 });
			expect(executeOperation).not.toHaveBeenCalled();
		});
	});

	it("pointer-events none sur le groupe quand canEdit est faux", () => {
		const { container } = setup({ canEdit: false });
		expect(container.querySelector("g")).toHaveStyle("pointer-events: none");
	});

	it("pointer-events all sur le groupe quand canEdit est vrai", () => {
		const { container } = setup({ canEdit: true });
		expect(container.querySelector("g")).toHaveStyle("pointer-events: all");
	});

	describe("énergisation", () => {
		const strokeOf = (c: HTMLElement) =>
			c.querySelector<SVGPathElement>("path.react-flow__edge-path")!.style
				.stroke;

		it("trait énergisé en simulation quand la connexion est énergisée", () => {
			const { container } = setup({
				mode: ProjectMode.SIMULATION,
				energized: true,
			});
			expect(strokeOf(container)).not.toBe("");
			expect(
				container.querySelector<SVGPathElement>("path.react-flow__edge-path")!
					.style.strokeWidth,
			).toBe("2");
			expect(strokeOf(container).toLowerCase()).toMatch(
				new RegExp(
					DEFAULT_THEME.light.energizedColor.replace("#", "").toLowerCase() +
						"|rgb\\(0, 216, 0\\)",
				),
			);
		});

		it("pas énergisé en conception", () => {
			const { container } = setup({
				mode: ProjectMode.DESIGN,
				energized: true,
			});
			expect(strokeOf(container)).toBe("");
		});

		it("pas énergisé quand la page n'est pas visible", () => {
			const { container } = setup({
				mode: ProjectMode.SIMULATION,
				energized: true,
				pageVisible: false,
			});
			expect(strokeOf(container)).toBe("");
		});

		it("pas énergisé quand la connexion n'est pas dans l'ensemble énergisé", () => {
			const { container } = setup({
				mode: ProjectMode.SIMULATION,
				energized: false,
			});
			expect(strokeOf(container)).toBe("");
		});
	});
});
