/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { ThemeProvider as AppThemeProvider } from "@/ui/theme/ThemeContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { ReactFlowProvider } from "@xyflow/react";
import RailTerminalNode, { RailTerminalNodeType } from "./RailTerminalNode";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");

function setup(
	virtual: boolean,
	{ mode = ProjectMode.DESIGN, excludedFromExecution = false } = {},
) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ mode }),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ ladder: { excludedFromExecution } }),
	);
	const props = {
		id: "rail-1",
		data: { virtual },
		selected: false,
		type: "railTerminal",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as RailTerminalNodeType & { id: string };

	return render(
		<AppThemeProvider>
			<ReactFlowProvider>
				<RailTerminalNode {...(props as any)} />
			</ReactFlowProvider>
		</AppThemeProvider>,
	);
}

describe("RailTerminalNode", () => {
	it("distingue visuellement (classe CSS différente) une borne virtuelle d'une borne réelle", () => {
		const virtualBar = setup(true).container.querySelectorAll(
			"div",
		)[1] as HTMLElement;
		const realBar = setup(false).container.querySelectorAll(
			"div",
		)[1] as HTMLElement;

		expect(virtualBar.className).not.toBe(realBar.className);
	});

	describe("couleur en simulation", () => {
		const bar = (c: HTMLElement) => c.querySelectorAll("div")[1] as HTMLElement;

		it.each([false, true])("est verte (virtual=%s)", (virtual) => {
			const { container } = setup(virtual, { mode: ProjectMode.SIMULATION });
			expect(bar(container)).toHaveStyle({ background: "rgb(0, 216, 0)" });
		});

		it("n'est pas verte en conception", () => {
			const { container } = setup(false);
			expect(bar(container)).not.toHaveStyle({ background: "rgb(0, 216, 0)" });
		});

		it("n'est pas verte pour un ladder exclu de l'exécution", () => {
			const { container } = setup(false, {
				mode: ProjectMode.SIMULATION,
				excludedFromExecution: true,
			});
			expect(bar(container)).not.toHaveStyle({ background: "rgb(0, 216, 0)" });
		});
	});

	it("expose un handle source à droite pour la connexion au premier élément de la ligne", () => {
		const { container } = setup(false);
		const handle = container.querySelector('[data-handleid="source"]');
		expect(handle).toHaveClass("source");
	});
});
