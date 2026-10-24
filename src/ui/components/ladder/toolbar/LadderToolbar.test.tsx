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
import {
	LADDER_FLOW_MAX_ZOOM,
	LADDER_FLOW_MIN_ZOOM,
} from "@/ui/stores/ladder/managers/view.manager";
import LadderToolbar from "./LadderToolbar";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../context/LadderContext");
jest.mock("@/ui/lib/hooks/useCollapseOnOverflow");

import useCollapseOnOverflow from "@/ui/lib/hooks/useCollapseOnOverflow";

function setup({
	mode = ProjectMode.DESIGN,
	editingEnabled = true,
	executeOperation = jest.fn(),
	excludedFromExecution = false,
	zoom = 1,
	zoomIn = jest.fn(),
	zoomOut = jest.fn(),
	floatingSystemBlocksPalette = false,
	compact = false,
	systemBlocksPaletteOpen = false,
	onToggleSystemBlocksPalette = jest.fn(),
} = {}) {
	const laddersManager = { setExcludedFromExecution: jest.fn() };
	(useCollapseOnOverflow as jest.Mock).mockReturnValue(compact);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			mode,
			editingEnabled,
			laddersManager,
			capabilities: { ladder: { floatingSystemBlocksPalette } },
		}),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			commandsStackManager: { executeOperation },
			ladder: { id: "l1", excludedFromExecution },
			viewManager: { zoomIn, zoomOut },
			zoom,
		}),
	);

	const { unmount } = renderWithI18n(
		<LadderToolbar
			systemBlocksPaletteOpen={systemBlocksPaletteOpen}
			onToggleSystemBlocksPalette={onToggleSystemBlocksPalette}
		/>,
	);
	return {
		executeOperation,
		laddersManager,
		zoomIn,
		zoomOut,
		onToggleSystemBlocksPalette,
		unmount,
	};
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

	it("désactive le bouton 'Réseau' sur un projet en lecture seule", () => {
		setup({ editingEnabled: false });
		expect(screen.getByText("Réseau").closest("button")).toBeDisabled();
	});

	it("désactive le bouton 'Réseau' hors du mode DESIGN", () => {
		setup({ mode: ProjectMode.SIMULATION });
		expect(screen.getByText("Réseau").closest("button")).toBeDisabled();
	});

	it("affiche le niveau de zoom entre Zoom arrière (à gauche) et Zoom avant (à droite)", () => {
		setup({ zoom: 0.5 });

		const out = screen.getByLabelText("Zoom arrière");
		const level = screen.getByText("50%");
		const zoomIn = screen.getByLabelText("Zoom avant");
		expect(out.compareDocumentPosition(level)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
		expect(level.compareDocumentPosition(zoomIn)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
	});

	describe("blocs systèmes", () => {
		const INLINE_SYMBOLS = ["COMPARE", "ASSIGN", "CALC", "CONV"];

		it("n'offre pas la boîte flottante là où l'explorateur liste les blocs, même quand la barre est étroite", () => {
			setup({ floatingSystemBlocksPalette: false, compact: true });

			for (const symbol of INLINE_SYMBOLS)
				expect(screen.getByText(symbol)).toBeInTheDocument();
			expect(screen.queryByText("Blocs systèmes")).not.toBeInTheDocument();
		});

		it("offre le bouton et garde les quatre outils quand la place suffit", () => {
			setup({ floatingSystemBlocksPalette: true, compact: false });

			expect(screen.getByText("Blocs systèmes")).toBeInTheDocument();
			for (const symbol of INLINE_SYMBOLS)
				expect(screen.getByText(symbol)).toBeInTheDocument();
		});

		it("remplace les quatre outils par le bouton quand la barre est trop étroite", () => {
			setup({ floatingSystemBlocksPalette: true, compact: true });

			for (const symbol of INLINE_SYMBOLS)
				expect(screen.queryByText(symbol)).not.toBeInTheDocument();
			expect(screen.getByText("Blocs systèmes")).toBeInTheDocument();
		});

		it("ouvre et ferme la boîte au clic, et reflète son état", () => {
			const { onToggleSystemBlocksPalette, unmount } = setup({
				floatingSystemBlocksPalette: true,
				compact: true,
				systemBlocksPaletteOpen: false,
			});
			const button = screen.getByText("Blocs systèmes").closest("button")!;
			expect(button).toHaveAttribute("aria-pressed", "false");

			fireEvent.click(button);
			expect(onToggleSystemBlocksPalette).toHaveBeenCalledTimes(1);
			unmount();

			setup({
				floatingSystemBlocksPalette: true,
				compact: true,
				systemBlocksPaletteOpen: true,
			});
			expect(
				screen.getByText("Blocs systèmes").closest("button"),
			).toHaveAttribute("aria-pressed", "true");
		});

		it.each([
			["en lecture seule", { editingEnabled: false }],
			["hors du mode conception", { mode: ProjectMode.SIMULATION }],
		])("grise le bouton %s, comme les autres outils", (_, state) => {
			setup({ floatingSystemBlocksPalette: true, ...state });
			expect(
				screen.getByText("Blocs systèmes").closest("button"),
			).toBeDisabled();
		});

		it("laisse le bouton actif en conception", () => {
			setup({ floatingSystemBlocksPalette: true });
			expect(
				screen.getByText("Blocs systèmes").closest("button"),
			).toBeEnabled();
		});

		it("laisse la barre défiler en dernier recours, sans écraser ses outils", () => {
			setup();
			const toolbar = document.querySelector(".ladder-toolbar") as HTMLElement;
			expect(toolbar).toHaveStyle({ overflowX: "auto" });
		});
	});

	it("zoome et dézoome tous les réseaux via le viewManager", () => {
		const { zoomIn, zoomOut } = setup({ zoom: 1 });

		fireEvent.click(screen.getByLabelText("Zoom avant"));
		fireEvent.click(screen.getByLabelText("Zoom arrière"));

		expect(zoomIn).toHaveBeenCalledTimes(1);
		expect(zoomOut).toHaveBeenCalledTimes(1);
	});

	it("désactive Zoom avant à la borne max et Zoom arrière à la borne min", () => {
		const { unmount } = setup({ zoom: LADDER_FLOW_MAX_ZOOM });
		expect(screen.getByLabelText("Zoom avant")).toHaveAttribute(
			"aria-disabled",
			"true",
		);
		expect(screen.getByLabelText("Zoom arrière")).not.toHaveAttribute(
			"aria-disabled",
			"true",
		);
		unmount();

		setup({ zoom: LADDER_FLOW_MIN_ZOOM });
		expect(screen.getByLabelText("Zoom arrière")).toHaveAttribute(
			"aria-disabled",
			"true",
		);
		expect(screen.getByLabelText("Zoom avant")).not.toHaveAttribute(
			"aria-disabled",
			"true",
		);
	});

	it("garde le zoom disponible sur un projet en lecture seule", () => {
		setup({ editingEnabled: false });
		expect(screen.getByLabelText("Zoom avant")).not.toHaveAttribute(
			"aria-disabled",
			"true",
		);
		expect(screen.getByLabelText("Zoom arrière")).not.toHaveAttribute(
			"aria-disabled",
			"true",
		);
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

		fireEvent.click(
			screen.getByRole("button", { name: "Afficher d'autres bobines" }),
		);
		expect(extraLabels.every(hasTool)).toBe(true);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Masquer les bobines supplémentaires",
			}),
		);
		expect(extraLabels.some(hasTool)).toBe(false);
	});

	it("shows no execution warning for an executed ladder", () => {
		setup();
		expect(screen.queryByText("Exclu de l'exécution")).not.toBeInTheDocument();
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
