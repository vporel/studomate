/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { ReactFlowProvider } from "@xyflow/react";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { CompareBlockParams } from "@/schemas/ladder/block.schema";
import { ThemeProvider as AppThemeProvider } from "@/ui/theme/ThemeContext";
import {
	GRID_CELL_HEIGHT,
	GRID_CELL_WIDTH,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { selectorImplementation } from "@tests/utils/store-mocks";
import CompareBlockNode from "./CompareBlockNode";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");

function setup(
	params: CompareBlockParams = { in1: "A", in2: "B", operator: ">" },
) {
	const executeOperation = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ project: { variables: [] } }),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			highlightedNodesIds: [],
			commandsStackManager: { executeOperation },
		}),
	);

	const { container } = renderWithI18n(
		<AppThemeProvider>
			<ReactFlowProvider>
				<CompareBlockNode
					id="block-1"
					data={{ blockType: "compare", params }}
					selected={false}
				/>
			</ReactFlowProvider>
		</AppThemeProvider>,
	);
	return { container, executeOperation };
}

describe("CompareBlockNode", () => {
	afterEach(() => jest.clearAllMocks());

	it("affiche les deux opérandes et l'opérateur", () => {
		setup({ in1: "capteur1", in2: "seuil", operator: ">=" });

		expect(screen.getByDisplayValue("capteur1")).toBeInTheDocument();
		expect(screen.getByDisplayValue("seuil")).toBeInTheDocument();
		expect(screen.getByText(">=")).toBeInTheDocument();
	});

	it("est rendu sur une seule cellule de grille (comme un contact)", () => {
		const { container } = setup();
		expect(container.firstChild).toHaveStyle({
			width: `${GRID_CELL_WIDTH}px`,
			height: `${GRID_CELL_HEIGHT}px`,
		});
	});

	it("commite IN1 à la validation du champ", () => {
		const { executeOperation } = setup({
			in1: "A",
			in2: "B",
			operator: ">",
		});

		const field = screen.getByDisplayValue("A");
		fireEvent.change(field, { target: { value: "capteur" } });
		fireEvent.blur(field);

		expect(executeOperation.mock.calls[0][0][0].payload.changes).toEqual({
			data: { params: { in1: "capteur", in2: "B", operator: ">" } },
		});
	});

	it("commite l'opérateur choisi dans le menu", () => {
		const { executeOperation } = setup({ in1: "A", in2: "B", operator: "=" });

		fireEvent.mouseDown(
			screen.getByRole("combobox", { name: "Opérateur de comparaison" }),
		);
		fireEvent.click(screen.getByRole("option", { name: "<=" }));

		expect(executeOperation.mock.calls[0][0][0].payload.changes).toEqual({
			data: { params: { in1: "A", in2: "B", operator: "<=" } },
		});
	});
});
