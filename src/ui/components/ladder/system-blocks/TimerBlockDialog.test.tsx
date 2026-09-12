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
import TimerBlockDialog from "./TimerBlockDialog";

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
			<TimerBlockDialog />
		</AppThemeProvider>,
	);

	return { executeOperation };
}

describe("TimerBlockDialog", () => {
	afterEach(() => jest.clearAllMocks());

	it("ne rend rien quand aucune création/édition n'est en attente", () => {
		setup();

		expect(
			screen.queryByText("Nouvelle temporisation"),
		).not.toBeInTheDocument();
	});

	it("s'ouvre en création et insère le bloc au clic sur Créer", () => {
		const insert = jest.fn();
		setup({ pendingSystemBlockCreation: { blockType: "timer", insert } });

		expect(screen.getByText("Nouvelle temporisation")).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Nom"), {
			target: { value: "Tempo1" },
		});
		fireEvent.click(screen.getByText("Créer"));

		expect(insert).toHaveBeenCalledWith({
			name: "Tempo1",
			timerType: "TON",
			pt: "",
		});
	});

	it("désactive Créer tant que le nom est vide ou invalide", () => {
		setup({
			pendingSystemBlockCreation: { blockType: "timer", insert: jest.fn() },
		});

		expect(screen.getByText("Créer")).toBeDisabled();

		fireEvent.change(screen.getByLabelText("Nom"), {
			target: { value: "1Tempo" },
		});

		expect(screen.getByText("Créer")).toBeDisabled();
	});

	it("s'ouvre en édition préremplie, et dispatche ElementUpdateCommand au clic sur Enregistrer", () => {
		const { executeOperation } = setup({
			pendingSystemBlockEdit: {
				blockType: "timer",
				elementId: "b1",
				initial: { name: "Tempo1", timerType: "TON", pt: "T#5s" },
			},
		});

		expect(screen.getByText("Modifier la temporisation")).toBeInTheDocument();
		expect(screen.getByLabelText("Nom")).toHaveValue("Tempo1");

		fireEvent.change(screen.getByLabelText("Nom"), {
			target: { value: "Tempo2" },
		});
		fireEvent.click(screen.getByText("Enregistrer"));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [[commands]] = executeOperation.mock.calls;
		expect(commands[0].payload.changes).toEqual({
			data: { params: { name: "Tempo2", timerType: "TON", pt: "T#5s" } },
		});
	});
});
