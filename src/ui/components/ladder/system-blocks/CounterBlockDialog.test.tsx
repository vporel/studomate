/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ThemeProvider as AppThemeProvider } from "@/ui/theme/ThemeContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import {
	PendingSystemBlockCreation,
	PendingSystemBlockEdit,
} from "@/ui/utils/ladder/ladder-system-block-drag";
import CounterBlockDialog from "./CounterBlockDialog";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");

function setup({
	pendingSystemBlockCreation = null,
	pendingSystemBlockEdit = null,
	isNameTaken = jest.fn(() => false),
	executeOperation = jest.fn(),
}: {
	pendingSystemBlockCreation?: PendingSystemBlockCreation | null;
	pendingSystemBlockEdit?: PendingSystemBlockEdit | null;
	isNameTaken?: jest.Mock;
	executeOperation?: jest.Mock;
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ project: { isNameTaken } }),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			pendingSystemBlockCreation,
			setPendingSystemBlockCreation: jest.fn(),
			pendingSystemBlockEdit,
			setPendingSystemBlockEdit: jest.fn(),
			commandsStackManager: { executeOperation },
		}),
	);

	renderWithI18n(
		<AppThemeProvider>
			<CounterBlockDialog />
		</AppThemeProvider>,
	);

	return { executeOperation };
}

describe("CounterBlockDialog", () => {
	afterEach(() => jest.clearAllMocks());

	it("ne rend rien quand aucune création/édition n'est en attente", () => {
		setup();

		expect(screen.queryByText("Nouveau compteur")).not.toBeInTheDocument();
	});

	it("ne s'ouvre pas pour une création de tempo", () => {
		setup({
			pendingSystemBlockCreation: { blockType: "timer", insert: jest.fn() },
		});

		expect(screen.queryByText("Nouveau compteur")).not.toBeInTheDocument();
	});

	it("s'ouvre en création avec la note, et insère un CTU par défaut", () => {
		const insert = jest.fn();
		setup({ pendingSystemBlockCreation: { blockType: "counter", insert } });

		expect(screen.getByText("Nouveau compteur")).toBeInTheDocument();
		expect(screen.getByText(/front montant/)).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Nom"), {
			target: { value: "Cpt1" },
		});
		fireEvent.click(screen.getByText("Créer"));

		expect(insert).toHaveBeenCalledWith({
			name: "Cpt1",
			counterType: "CTU",
			control: "",
			pv: "",
		});
	});

	it("désactive Créer tant que le nom est vide", () => {
		setup({
			pendingSystemBlockCreation: { blockType: "counter", insert: jest.fn() },
		});

		expect(screen.getByText("Créer")).toBeDisabled();
	});

	it("s'ouvre en édition préremplie (nom et variante), et dispatche ElementUpdateCommand au clic sur Enregistrer", () => {
		const { executeOperation } = setup({
			pendingSystemBlockEdit: {
				blockType: "counter",
				elementId: "b1",
				initial: {
					name: "Cpt1",
					counterType: "CTUD",
					control: "R",
					pv: "10",
				},
			},
		});

		expect(screen.getByText("Modifier le compteur")).toBeInTheDocument();
		expect(screen.getByLabelText("Nom")).toHaveValue("Cpt1");
		expect(screen.getByText(/^CTUD/)).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("Nom"), {
			target: { value: "Cpt2" },
		});
		fireEvent.click(screen.getByText("Enregistrer"));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [[commands]] = executeOperation.mock.calls;
		expect(commands[0].payload.changes).toEqual({
			data: {
				params: {
					name: "Cpt2",
					counterType: "CTUD",
					control: "R",
					pv: "10",
				},
			},
		});
		expect(commands[0].payload.previousChanges).toEqual({
			data: {
				params: {
					name: "Cpt1",
					counterType: "CTUD",
					control: "R",
					pv: "10",
				},
			},
		});
	});
});
