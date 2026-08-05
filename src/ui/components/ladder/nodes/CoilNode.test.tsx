/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { CoilMode } from "@/schemas/ladder/element.schema";
import Variable from "@/schemas/variable/variable.schema";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ThemeProvider as AppThemeProvider } from "@/ui/theme/ThemeContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import CoilNode, { CoilNodeType } from "./CoilNode";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");

// La couleur/le mode passés au symbole sont la vraie logique à couvrir ici — le rendu visuel du
// symbole lui-même (lettre, traits) est la responsabilité de `CoilSymbol`, pas de ce test.
jest.mock("./CoilSymbol", () => ({
	__esModule: true,
	default: ({ mode, color }: { mode: string; color: string }) => (
		<div data-testid="symbol" data-mode={mode} data-color={color} />
	),
}));

function setup({
	variable = "S1",
	mode = "normal" as CoilMode,
	selected = false,
	simulationVariablesStates = {} as Record<string, { mnemonic: string; value: boolean }>,
	highlightedNodesIds = [] as string[],
	projectVariables = [] as Variable[],
	executeOperation = jest.fn(),
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			simulationVariablesStates,
			project: { variables: projectVariables },
		}),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			highlightedNodesIds,
			commandsStackManager: { executeOperation },
		}),
	);

	const props = {
		id: "coil-1",
		data: { variable, mode },
		selected,
		type: "coil",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as CoilNodeType & { id: string };

	render(
		<AppThemeProvider>
			<ReactFlowProvider>
				<CoilNode {...(props as any)} />
			</ReactFlowProvider>
		</AppThemeProvider>,
	);

	return { executeOperation };
}

describe("CoilNode", () => {
	afterEach(() => jest.clearAllMocks());

	it("affiche le mnémonique courant", () => {
		setup({ variable: "S1" });

		expect(screen.getByRole("combobox")).toHaveValue("S1");
	});

	it("affiche un placeholder '?' quand le mnémonique est vide", () => {
		setup({ variable: "" });

		expect(screen.getByRole("combobox")).toHaveValue("");
		expect(screen.getByPlaceholderText("?")).toBeInTheDocument();
	});

	it("donne le focus au champ au double-clic n'importe où sur le nœud", () => {
		setup({ variable: "S1" });

		fireEvent.doubleClick(screen.getByTestId("symbol"));

		expect(screen.getByRole("combobox")).toHaveFocus();
	});

	it("transmet le mode de la bobine au symbole", () => {
		setup({ mode: "set" });

		expect(screen.getByTestId("symbol")).toHaveAttribute("data-mode", "set");
	});

	describe("couleur transmise au symbole", () => {
		it("noire par défaut (ni sélectionnée, ni sous tension)", () => {
			setup({ selected: false, simulationVariablesStates: {} });

			expect(screen.getByTestId("symbol")).toHaveAttribute("data-color", "black");
		});

		it("couleur 'energized' quand une variable de simulation correspondante est à true", () => {
			setup({
				variable: "S1",
				selected: false,
				simulationVariablesStates: { v1: { mnemonic: "S1", value: true } },
			});

			expect(screen.getByTestId("symbol")).toHaveAttribute("data-color", "#00d800");
		});

		it("pas de couleur 'energized' si la variable de simulation est à false", () => {
			setup({
				variable: "S1",
				selected: false,
				simulationVariablesStates: { v1: { mnemonic: "S1", value: false } },
			});

			expect(screen.getByTestId("symbol")).toHaveAttribute("data-color", "black");
		});

		it("couleur 'primary' quand sélectionnée", () => {
			setup({ selected: true, simulationVariablesStates: {} });

			expect(screen.getByTestId("symbol")).toHaveAttribute("data-color", "#1976d2");
		});

		it("la sélection l'emporte sur l'état 'energized'", () => {
			setup({
				variable: "S1",
				selected: true,
				simulationVariablesStates: { v1: { mnemonic: "S1", value: true } },
			});

			expect(screen.getByTestId("symbol")).toHaveAttribute("data-color", "#1976d2");
		});
	});

	describe("édition du mnémonique", () => {
		it("dispatche ElementUpdateCommand avec la nouvelle et l'ancienne valeur au commit", () => {
			const { executeOperation } = setup({ variable: "S1" });

			const input = screen.getByRole("combobox");
			fireEvent.change(input, { target: { value: "S2" } });
			fireEvent.blur(input);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [[commands]] = executeOperation.mock.calls;
			expect(commands[0].payload).toEqual({
				elementId: "coil-1",
				changes: { data: { variable: "S2" } },
				previousChanges: { data: { variable: "S1" } },
			});
		});

		it("ne dispatche rien si la valeur ne change pas", () => {
			const { executeOperation } = setup({ variable: "S1" });

			fireEvent.blur(screen.getByRole("combobox"));

			expect(executeOperation).not.toHaveBeenCalled();
		});

		it("ne dispatche rien si la valeur est vidée", () => {
			const { executeOperation } = setup({ variable: "S1" });

			const input = screen.getByRole("combobox");
			fireEvent.change(input, { target: { value: "" } });
			fireEvent.blur(input);

			expect(executeOperation).not.toHaveBeenCalled();
		});

		// Outil pédagogique : aucune restriction ne doit empêcher de committer un mnémonique
		// invalide (variable d'entrée, non déclarée...) — l'analyseur le signalera après coup.
		it("accepte une variable d'entrée comme cible de la bobine", () => {
			const { executeOperation } = setup({
				variable: "S1",
				projectVariables: [new Variable("v1", "E1", "logic-input", "BOOL")],
			});

			const input = screen.getByRole("combobox");
			fireEvent.change(input, { target: { value: "E1" } });
			fireEvent.blur(input);

			expect(executeOperation).toHaveBeenCalledTimes(1);
		});
	});
});
