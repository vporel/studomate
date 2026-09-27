/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ThemeProvider as AppThemeProvider } from "@/ui/theme/ThemeContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import LadderVariableNodeShell from "./LadderVariableNodeShell";
import { getHighlightOverlaySx } from "./node-highlight";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");
jest.mock("./node-highlight", () => ({
	getHighlightOverlaySx: jest.fn(() => ({})),
}));

function setup(
	props: Partial<Parameters<typeof LadderVariableNodeShell>[0]> = {},
	highlightedNodesIds: string[] = [],
) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { variables: [], getAllTimerBlockElements: () => [], getAllCounterBlockElements: () => [] },
			simulationVariablesStates: {},
			simulationVariablesStatesByMnemonic: {},
		}),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ladder: { id: "ladder-1", excludedFromExecution: false },
			highlightedNodesIds,
			commandsStackManager: { executeOperation: jest.fn() },
		}),
	);
	return render(
		<AppThemeProvider>
			<ReactFlowProvider>
				<LadderVariableNodeShell id="n1" variable="A" labelTop={-5} {...props}>
					<div data-testid="symbol" />
				</LadderVariableNodeShell>
			</ReactFlowProvider>
		</AppThemeProvider>,
	);
}

describe("LadderVariableNodeShell", () => {
	afterEach(() => jest.clearAllMocks());

	it("rend le symbole passé en enfant", () => {
		const { getByTestId } = setup();

		expect(getByTestId("symbol")).toBeInTheDocument();
	});

	it("n'a qu'une poignée d'entrée par défaut", () => {
		const { container } = setup();

		expect(container.querySelector('[data-handleid="target"]')).not.toBeNull();
		expect(container.querySelector('[data-handleid="source"]')).toBeNull();
	});

	it("ajoute la poignée de sortie avec hasSourceHandle", () => {
		const { container } = setup({ hasSourceHandle: true });

		expect(container.querySelector('[data-handleid="source"]')).not.toBeNull();
	});

	it("décale le sélecteur de variable de labelTop pixels", () => {
		const { getByRole } = setup({ labelTop: -7 });

		let el: HTMLElement | null = getByRole("combobox");
		while (el && getComputedStyle(el).position !== "absolute")
			el = el.parentElement;
		expect(getComputedStyle(el!).top).toBe("-7px");
	});

	it.each([
		[["n1"], true],
		[["autre"], false],
		[[], false],
	])("passe highlighted à l'overlay (%j → %s)", (ids, expected) => {
		setup({}, ids);

		expect(getHighlightOverlaySx).toHaveBeenCalledWith(
			expected,
			expect.anything(),
		);
	});
});
