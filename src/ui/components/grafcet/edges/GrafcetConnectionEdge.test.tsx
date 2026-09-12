/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useGrafcetStore } from "../context/GrafcetContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import GrafcetConnectionEdge, {
	GrafcetConnectionEdgeType,
} from "./GrafcetConnectionEdge";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../context/GrafcetContext");

function setup({
	points,
	selected = false,
	mode = ProjectMode.DESIGN,
}: {
	points?: [number, number][];
	selected?: boolean;
	mode?: ProjectMode;
}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ mode }),
	);
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ workflowManager: { updateEdgeData: jest.fn() } }),
	);

	const props = {
		id: "e1",
		sourceX: 0,
		sourceY: 0,
		targetX: 100,
		targetY: 100,
		data: points ? { points } : undefined,
		selected,
	} as unknown as GrafcetConnectionEdgeType & Record<string, any>;

	return render(
		<ReactFlowProvider>
			<svg>
				<GrafcetConnectionEdge {...(props as any)} />
			</svg>
		</ReactFlowProvider>,
	);
}

describe("GrafcetConnectionEdge", () => {
	it("trace le tracé (path) reliant la source à la cible", () => {
		const { container } = setup({ points: [] });
		expect(
			container.querySelector(".react-flow__edge-path"),
		).toBeInTheDocument();
	});

	it("n'affiche aucun point de coude quand data.points est vide", () => {
		const { container } = setup({ points: [] });
		expect(container.querySelectorAll('circle[fill="black"]')).toHaveLength(0);
	});

	it("affiche un point de coude par coude déclaré dans data.points", () => {
		const { container } = setup({ points: [[50, 50]] });
		expect(container.querySelectorAll('circle[fill="black"]')).toHaveLength(1);
	});

	it("colore les points de coude en noir quand non sélectionné", () => {
		const { container } = setup({ points: [[50, 50]], selected: false });
		expect(container.querySelectorAll('circle[fill="black"]')).toHaveLength(1);
	});

	it("recalcule ses points depuis sourceX/Y et targetX/Y quand aucune donnée n'est fournie", () => {
		const { container } = setup({ points: undefined });
		expect(
			container.querySelector(".react-flow__edge-path")!.getAttribute("d"),
		).toBeTruthy();
	});

	it("garde une ligne source → cible après déplacement d'un nœud quand la connexion n'a pas de coude", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ mode: ProjectMode.DESIGN }),
		);
		(useGrafcetStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				workflowManager: { updateEdgeData: jest.fn() },
			}),
		);
		const baseProps = { id: "e1", selected: false } as any;

		const { container, rerender } = render(
			<ReactFlowProvider>
				<svg>
					<GrafcetConnectionEdge
						{...baseProps}
						sourceX={0}
						sourceY={0}
						targetX={100}
						targetY={100}
						data={{ points: [] }}
					/>
				</svg>
			</ReactFlowProvider>,
		);

		rerender(
			<ReactFlowProvider>
				<svg>
					<GrafcetConnectionEdge
						{...baseProps}
						sourceX={0}
						sourceY={0}
						targetX={300}
						targetY={50}
						data={{ points: [] }}
					/>
				</svg>
			</ReactFlowProvider>,
		);

		const d = container
			.querySelector(".react-flow__edge-path")!
			.getAttribute("d")!;
		// Un segment de ligne complet source → cible, pas un simple `M` effondré sur un point.
		expect(d).toMatch(/M\s*0,0/);
		expect(d).toMatch(/L\s*300,50/);
		expect(container.querySelectorAll('circle[fill="black"]')).toHaveLength(0);
	});

	it("suit data.points quand ses valeurs changent, mais reste stable si un nouvel objet data porte les mêmes valeurs", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({ mode: ProjectMode.DESIGN }),
		);
		(useGrafcetStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				workflowManager: { updateEdgeData: jest.fn() },
			}),
		);
		const baseProps = {
			id: "e1",
			sourceX: 0,
			sourceY: 0,
			targetX: 100,
			targetY: 100,
			selected: false,
		} as any;

		const { container, rerender } = render(
			<ReactFlowProvider>
				<svg>
					<GrafcetConnectionEdge {...baseProps} data={{ points: [[50, 50]] }} />
				</svg>
			</ReactFlowProvider>,
		);
		expect(container.querySelectorAll('circle[fill="black"]')).toHaveLength(1);

		// Nouvel objet data, mêmes valeurs : la garde `samePoints` évite de réinitialiser l'état.
		rerender(
			<ReactFlowProvider>
				<svg>
					<GrafcetConnectionEdge {...baseProps} data={{ points: [[50, 50]] }} />
				</svg>
			</ReactFlowProvider>,
		);
		expect(container.querySelectorAll('circle[fill="black"]')).toHaveLength(1);

		// Valeurs réellement différentes (2 coudes) : l'état suit.
		rerender(
			<ReactFlowProvider>
				<svg>
					<GrafcetConnectionEdge
						{...baseProps}
						data={{
							points: [
								[30, 30],
								[60, 60],
							],
						}}
					/>
				</svg>
			</ReactFlowProvider>,
		);
		expect(container.querySelectorAll('circle[fill="black"]')).toHaveLength(2);
	});
});
