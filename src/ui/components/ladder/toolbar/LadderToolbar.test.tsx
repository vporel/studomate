/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useLadderStore } from "../context/LadderContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import SectionAddCommand from "@/schemas/ladder/commands/section-add.command";
import LadderToolbar from "./LadderToolbar";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../context/LadderContext");

function setup({
	mode = ProjectMode.DESIGN,
	executeOperation = jest.fn(),
	excludedFromExecution = false,
} = {}) {
	const laddersManager = { setExcludedFromExecution: jest.fn() };
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ mode, laddersManager }),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			commandsStackManager: { executeOperation },
			ladder: { id: "l1", excludedFromExecution },
		}),
	);

	renderWithI18n(<LadderToolbar />);
	return { executeOperation, laddersManager };
}

describe("LadderToolbar", () => {
	it("assemble les outils de dépose sans planter", () => {
		setup();

		expect(screen.getByText("Réseau")).toBeInTheDocument();
	});

	it("dispatche SectionAddCommand au clic sur 'Réseau'", () => {
		const { executeOperation } = setup();

		fireEvent.click(screen.getByText("Réseau"));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands[0]).toBeInstanceOf(SectionAddCommand);
	});

	it("désactive le bouton 'Réseau' hors du mode DESIGN", () => {
		setup({ mode: ProjectMode.SIMULATION });
		expect(screen.getByText("Réseau").closest("button")).toBeDisabled();
	});

	it("masque les bobines inversée et de front tant que la flèche d'extension n'est pas cliquée", () => {
		setup();
		const extraLabels = [
			"Bobine inversée",
			"Bobine de front montant (impulsion à l'activation)",
			"Bobine de front descendant (impulsion à la désactivation)",
		];
		const hasTool = (label: string) =>
			document.querySelector(`[title="${label}"], [aria-label="${label}"]`) !==
			null;

		expect(extraLabels.some(hasTool)).toBe(false);

		fireEvent.click(screen.getByRole("button", { name: "Afficher d'autres bobines" }));
		expect(extraLabels.every(hasTool)).toBe(true);

		fireEvent.click(screen.getByRole("button", { name: "Masquer les bobines supplémentaires" }));
		expect(extraLabels.some(hasTool)).toBe(false);
	});

	it("shows no execution warning for an executed ladder", () => {
		setup();
		expect(
			screen.queryByText("Exclu de l'exécution"),
		).not.toBeInTheDocument();
	});

	it("shows the execution warning for an excluded ladder, whose dialog re-includes it", () => {
		const { laddersManager } = setup({ excludedFromExecution: true });

		fireEvent.click(screen.getByText("Exclu de l'exécution"));
		fireEvent.click(screen.getByText("Inclure dans l'exécution"));

		expect(laddersManager.setExcludedFromExecution).toHaveBeenCalledWith(
			"l1",
			false,
		);
	});
});
