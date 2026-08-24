/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ThemeProvider as AppThemeProvider } from "@/ui/theme/ThemeContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import BlockNode, { BLOCK_NODE_DIMENSIONS, BlockNodeType } from "./BlockNode";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");

function setup({
	programId = "ladder-1",
	ladders = { "ladder-1": { name: "Convoyeur" } } as Record<string, { name: string }>,
	highlightedNodesIds = [] as string[],
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ project: { ladders } }),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ highlightedNodesIds }),
	);

	const props = {
		id: "block-1",
		data: { blockType: "user-program", params: { programId } },
		selected: false,
		type: "block",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as BlockNodeType & { id: string };

	render(
		<AppThemeProvider>
			<ReactFlowProvider>
				<BlockNode {...(props as any)} />
			</ReactFlowProvider>
		</AppThemeProvider>,
	);
}

describe("BlockNode", () => {
	afterEach(() => jest.clearAllMocks());

	it("affiche le nom du programme référencé", () => {
		setup({ programId: "ladder-1", ladders: { "ladder-1": { name: "Convoyeur" } } });

		expect(screen.getByText("Convoyeur")).toBeInTheDocument();
	});

	it("affiche les libellés des ports EN/ENO d'un bloc 'user-program'", () => {
		setup();

		expect(screen.getByText("EN")).toBeInTheDocument();
		expect(screen.getByText("ENO")).toBeInTheDocument();
	});

	it("n'affiche rien si le programme référencé n'existe plus", () => {
		setup({ programId: "orphan", ladders: { "ladder-1": { name: "Convoyeur" } } });

		expect(screen.queryByText("Convoyeur")).not.toBeInTheDocument();
	});

	it("occupe 2 cellules de grille horizontalement", () => {
		const { GRID_CELL_WIDTH } = jest.requireActual("@/ui/utils/ladder/ladder-flow-builder");
		expect(BLOCK_NODE_DIMENSIONS.width).toBe(GRID_CELL_WIDTH * 2);
	});
});
