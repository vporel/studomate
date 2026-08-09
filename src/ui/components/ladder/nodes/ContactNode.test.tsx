/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { ContactMode } from "@/schemas/ladder/element.schema";
import Variable from "@/schemas/variable/variable.schema";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { DEFAULT_THEME, ThemeProvider as AppThemeProvider } from "@/ui/theme/ThemeContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import ContactNode, { ContactNodeType } from "./ContactNode";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");

// La couleur/le mode passés au symbole sont la vraie logique à couvrir ici — le rendu visuel du
// symbole lui-même (traits, lettres) est la responsabilité de `ContactSymbol`, pas de ce test.
jest.mock("./ContactSymbol", () => ({
	__esModule: true,
	default: ({ mode, color }: { mode: string; color: string }) => (
		<div data-testid="symbol" data-mode={mode} data-color={color} />
	),
}));

function setup({
	variable = "E1",
	mode = "NO" as ContactMode,
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
		id: "contact-1",
		data: { variable, mode },
		selected,
		type: "contact",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as ContactNodeType & { id: string };

	render(
		<AppThemeProvider>
			<ReactFlowProvider>
				<ContactNode {...(props as any)} />
			</ReactFlowProvider>
		</AppThemeProvider>,
	);

	return { executeOperation };
}

describe("ContactNode", () => {
	afterEach(() => jest.clearAllMocks());

	it("affiche le mnémonique courant", () => {
		setup({ variable: "E1" });

		expect(screen.getByRole("combobox")).toHaveValue("E1");
	});

	it("affiche un placeholder '?' quand le mnémonique est vide", () => {
		setup({ variable: "" });

		expect(screen.getByRole("combobox")).toHaveValue("");
		expect(screen.getByPlaceholderText("?")).toBeInTheDocument();
	});

	it("donne le focus au champ au double-clic n'importe où sur le nœud", () => {
		setup({ variable: "E1" });

		fireEvent.doubleClick(screen.getByTestId("symbol"));

		expect(screen.getByRole("combobox")).toHaveFocus();
	});

	it("transmet le mode du contact au symbole", () => {
		setup({ mode: "P" });

		expect(screen.getByTestId("symbol")).toHaveAttribute("data-mode", "P");
	});

	describe("couleur transmise au symbole", () => {
		it("noire par défaut (ni sélectionné, ni sous tension)", () => {
			setup({ selected: false, simulationVariablesStates: {} });

			expect(screen.getByTestId("symbol")).toHaveAttribute("data-color", "black");
		});

		it("couleur 'energized' quand une variable de simulation correspondante est à true", () => {
			setup({
				variable: "E1",
				selected: false,
				simulationVariablesStates: { v1: { mnemonic: "E1", value: true } },
			});

			expect(screen.getByTestId("symbol")).toHaveAttribute("data-color", DEFAULT_THEME.light.energizedColor);
		});

		it("pas de couleur 'energized' si la variable de simulation est à false", () => {
			setup({
				variable: "E1",
				selected: false,
				simulationVariablesStates: { v1: { mnemonic: "E1", value: false } },
			});

			expect(screen.getByTestId("symbol")).toHaveAttribute("data-color", "black");
		});

		it("couleur 'primary' quand sélectionné", () => {
			setup({ selected: true, simulationVariablesStates: {} });

			expect(screen.getByTestId("symbol")).toHaveAttribute("data-color", DEFAULT_THEME.light.primaryColor);
		});

		it("la sélection l'emporte sur l'état 'energized'", () => {
			setup({
				variable: "E1",
				selected: true,
				simulationVariablesStates: { v1: { mnemonic: "E1", value: true } },
			});

			expect(screen.getByTestId("symbol")).toHaveAttribute("data-color", DEFAULT_THEME.light.primaryColor);
		});
	});

	describe("édition du mnémonique", () => {
		it("dispatche ElementUpdateCommand avec la nouvelle et l'ancienne valeur au commit", () => {
			const { executeOperation } = setup({ variable: "E1" });

			const input = screen.getByRole("combobox");
			fireEvent.change(input, { target: { value: "E2" } });
			fireEvent.blur(input);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [[commands]] = executeOperation.mock.calls;
			expect(commands[0].payload).toEqual({
				elementId: "contact-1",
				changes: { data: { variable: "E2" } },
				previousChanges: { data: { variable: "E1" } },
			});
		});

		it("ne dispatche rien si la valeur ne change pas", () => {
			const { executeOperation } = setup({ variable: "E1" });

			fireEvent.blur(screen.getByRole("combobox"));

			expect(executeOperation).not.toHaveBeenCalled();
		});

		it("ne dispatche rien si la valeur est vidée", () => {
			const { executeOperation } = setup({ variable: "E1" });

			const input = screen.getByRole("combobox");
			fireEvent.change(input, { target: { value: "" } });
			fireEvent.blur(input);

			expect(executeOperation).not.toHaveBeenCalled();
		});

		// Outil pédagogique : aucune restriction ne doit empêcher de committer un mnémonique
		// invalide (variable non déclarée, mauvais type...) — l'analyseur le signalera après coup.
		it("accepte un mnémonique qui ne correspond à aucune variable déclarée du projet", () => {
			const { executeOperation } = setup({
				variable: "E1",
				projectVariables: [new Variable("v1", "AutreVariable", "logic-input", "BOOL")],
			});

			const input = screen.getByRole("combobox");
			fireEvent.change(input, { target: { value: "VariableInconnue" } });
			fireEvent.blur(input);

			expect(executeOperation).toHaveBeenCalledTimes(1);
		});
	});
});
