/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useGrafcetStore } from "../context/GrafcetContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import GrafcetConnectionEdge, { GrafcetConnectionEdgeType } from "./GrafcetConnectionEdge";

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
	(useProjectStore as unknown as jest.Mock).mockImplementation(selectorImplementation({ mode }));
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
		const { container } = setup({ points: [[0, 0], [100, 100]] });
		expect(container.querySelector(".react-flow__edge-path")).toBeInTheDocument();
	});

	it("n'affiche aucun point de coude (fill plein) quand le tracé n'a pas de coude déclaré", () => {
		const { container } = setup({ points: [[0, 0], [100, 100]] });
		expect(container.querySelectorAll('circle[fill="black"]')).toHaveLength(0);
	});

	it("affiche un point de coude par coude déclaré dans data.points", () => {
		const { container } = setup({
			points: [
				[0, 0],
				[50, 50],
				[100, 100],
			],
		});
		// 2 cercles par point de coude (visuel + zone de drag)
		expect(container.querySelectorAll('circle[fill="black"]')).toHaveLength(1);
	});

	it("colore les points de coude en noir quand non sélectionné", () => {
		const { container } = setup({
			points: [
				[0, 0],
				[50, 50],
				[100, 100],
			],
			selected: false,
		});
		expect(container.querySelectorAll('circle[fill="black"]')).toHaveLength(1);
	});

	it("recalcule ses points depuis sourceX/Y et targetX/Y quand aucune donnée n'est fournie", () => {
		const { container } = setup({ points: undefined });
		expect(container.querySelector(".react-flow__edge-path")!.getAttribute("d")).toBeTruthy();
	});
});
