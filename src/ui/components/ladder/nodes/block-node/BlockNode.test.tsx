/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { ReactFlowProvider } from "@xyflow/react";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ThemeProvider as AppThemeProvider } from "@/ui/theme/ThemeContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import BlockNode, {
	BLOCK_NODE_DIMENSIONS,
	BlockNodeData,
	BlockNodeType,
} from "./BlockNode";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");

function setup({
	programId = "ladder-1",
	ladders = { "ladder-1": { name: "Convoyeur" } } as Record<
		string,
		{ name: string }
	>,
	highlightedNodesIds = [] as string[],
	data,
	executeOperation = jest.fn(),
}: {
	programId?: string;
	ladders?: Record<string, { name: string }>;
	highlightedNodesIds?: string[];
	data?: BlockNodeData;
	executeOperation?: jest.Mock;
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ project: { ladders } }),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			highlightedNodesIds,
			commandsStackManager: { executeOperation },
			workflowManager: { openSystemBlockEditor: jest.fn() },
		}),
	);

	const props = {
		id: "block-1",
		data: data ?? { blockType: "user-program", params: { programId } },
		selected: false,
		type: "block",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as BlockNodeType & { id: string };

	const { container } = renderWithI18n(
		<AppThemeProvider>
			<ReactFlowProvider>
				<BlockNode {...(props as any)} />
			</ReactFlowProvider>
		</AppThemeProvider>,
	);

	return { executeOperation, container };
}

describe("BlockNode", () => {
	afterEach(() => jest.clearAllMocks());

	it("affiche le nom du programme référencé", () => {
		setup({
			programId: "ladder-1",
			ladders: { "ladder-1": { name: "Convoyeur" } },
		});

		expect(screen.getByText("Convoyeur")).toBeInTheDocument();
	});

	it("affiche les libellés des ports EN/ENO d'un bloc 'user-program'", () => {
		setup();

		expect(screen.getByText("EN")).toBeInTheDocument();
		expect(screen.getByText("ENO")).toBeInTheDocument();
	});

	it("n'affiche rien si le programme référencé n'existe plus", () => {
		setup({
			programId: "orphan",
			ladders: { "ladder-1": { name: "Convoyeur" } },
		});

		expect(screen.queryByText("Convoyeur")).not.toBeInTheDocument();
	});

	it("occupe 2 cellules de grille horizontalement", () => {
		const { GRID_CELL_WIDTH } = jest.requireActual(
			"@/ui/utils/ladder/ladder-flow-builder",
		);
		expect(BLOCK_NODE_DIMENSIONS.width).toBe(GRID_CELL_WIDTH * 2);
	});

	describe("blocs assign / arithmetic", () => {
		it("affiche les libellés EN/ENO et IN/OUT d'un bloc assign", () => {
			setup({
				data: { blockType: "assign", params: { out: "sortie", in: "entree" } },
			});

			expect(screen.getByText("EN")).toBeInTheDocument();
			expect(screen.getByText("ENO")).toBeInTheDocument();
			expect(screen.getByText("IN")).toBeInTheDocument();
			expect(screen.getByText("OUT")).toBeInTheDocument();
			expect(screen.getByDisplayValue("sortie")).toBeInTheDocument();
			expect(screen.getByDisplayValue("entree")).toBeInTheDocument();
		});

		it("affiche IN1/IN2/OUT et l'opérateur d'un bloc arithmetic", () => {
			setup({
				data: {
					blockType: "arithmetic",
					params: { in1: "a", in2: "b", out: "c", operator: "*" },
				},
			});

			expect(screen.getByText("IN1")).toBeInTheDocument();
			expect(screen.getByText("IN2")).toBeInTheDocument();
			expect(screen.getByText("OUT")).toBeInTheDocument();
			expect(screen.getByText("*")).toBeInTheDocument();
		});

		it("sont rendus sur 2 cellules de grille de large", () => {
			const { GRID_CELL_WIDTH } = jest.requireActual(
				"@/ui/utils/ladder/ladder-flow-builder",
			);
			const { container } = setup({
				data: { blockType: "assign", params: { out: "A", in: "1" } },
			});
			expect(container.firstChild).toHaveStyle({
				width: `${GRID_CELL_WIDTH * 2}px`,
			});
		});
	});

	describe("bloc timer", () => {
		const timerData: BlockNodeData = {
			blockType: "timer",
			params: { name: "Tempo1", timerType: "TON", pt: "T#5s", et: "Sortie" },
		};

		it("affiche le sélecteur de variante, positionné sur la valeur courante", () => {
			setup({ data: timerData });

			expect(
				screen.getByRole("combobox", {
					name: "Variante de la temporisation",
				}),
			).toHaveTextContent("TON");
		});

		it("édite le nom en place et dispatche ElementUpdateCommand au commit", () => {
			const { executeOperation } = setup({ data: timerData });

			const input = screen.getByLabelText("Nom du bloc");
			fireEvent.change(input, { target: { value: "Tempo2" } });
			fireEvent.keyDown(input, { key: "Enter" });
			fireEvent.blur(input);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [command] = executeOperation.mock.calls[0][0];
			expect(command.payload.changes.data.params).toMatchObject({
				name: "Tempo2",
			});
		});

		it("restaure l'ancien nom si le champ est vidé au commit", () => {
			const { executeOperation } = setup({ data: timerData });

			const input = screen.getByLabelText("Nom du bloc");
			fireEvent.change(input, { target: { value: "" } });
			fireEvent.blur(input);

			expect(executeOperation).not.toHaveBeenCalled();
			expect(input).toHaveValue("Tempo1");
		});

		it("affiche le nom du bloc, les libellés IN/Q et les libellés PT/ET (toujours visibles)", () => {
			setup({ data: timerData });

			expect(screen.getByDisplayValue("Tempo1")).toBeInTheDocument();
			expect(screen.getByText("IN")).toBeInTheDocument();
			expect(screen.getByText("Q")).toBeInTheDocument();
			expect(screen.getByText("PT")).toBeInTheDocument();
			expect(screen.getByText("ET")).toBeInTheDocument();
		});

		it("affiche les champs PT/ET (autocomplétion, placeholder '?') pré-remplis avec leur valeur", () => {
			setup({ data: timerData });

			const [ptField, etField] = screen.getAllByRole("combobox");
			expect(ptField).toHaveValue("T#5s");
			expect(etField).toHaveValue("Sortie");
			expect(ptField).toHaveAttribute("placeholder", "?");
		});

		it("un double-clic sur le libellé PT donne le focus au champ PT", () => {
			setup({ data: timerData });

			fireEvent.doubleClick(screen.getByText("PT"));

			const [ptField] = screen.getAllByRole("combobox");
			expect(ptField).toHaveFocus();
		});

		it("dispatche ElementUpdateCommand quand le champ PT est modifié puis quitte le focus", () => {
			const { executeOperation } = setup({ data: timerData });

			const [ptField] = screen.getAllByRole("combobox");
			fireEvent.change(ptField, { target: { value: "T#10s" } });
			fireEvent.blur(ptField);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [command] = executeOperation.mock.calls[0][0];
			expect(command.payload.elementId).toBe("block-1");
			expect(command.payload.changes.data.params).toMatchObject({
				pt: "T#10s",
			});
			expect(command.payload.previousChanges.data.params).toMatchObject({
				pt: "T#5s",
			});
		});

		it("ne dispatche rien si la valeur n'a pas changé", () => {
			const { executeOperation } = setup({ data: timerData });

			const [, etField] = screen.getAllByRole("combobox");
			fireEvent.blur(etField);

			expect(executeOperation).not.toHaveBeenCalled();
		});
	});
});
