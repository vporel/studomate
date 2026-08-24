/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { ThemeProvider as AppThemeProvider } from "@/ui/theme/ThemeContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { PendingSystemBlockCreation, PendingSystemBlockEdit } from "@/ui/utils/ladder/ladder-system-block-drag";
import AssignBlockDialog from "./AssignBlockDialog";

jest.mock("@/ui/components/ladder/context/LadderContext");

function setup({
	pendingSystemBlockCreation = null,
	pendingSystemBlockEdit = null,
	executeOperation = jest.fn(),
}: {
	pendingSystemBlockCreation?: PendingSystemBlockCreation | null;
	pendingSystemBlockEdit?: PendingSystemBlockEdit | null;
	executeOperation?: jest.Mock;
} = {}) {
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			pendingSystemBlockCreation,
			setPendingSystemBlockCreation: jest.fn(),
			pendingSystemBlockEdit,
			setPendingSystemBlockEdit: jest.fn(),
			commandsStackManager: { executeOperation },
		}),
	);

	render(
		<AppThemeProvider>
			<AssignBlockDialog />
		</AppThemeProvider>,
	);

	return { executeOperation };
}

describe("AssignBlockDialog", () => {
	afterEach(() => jest.clearAllMocks());

	it("ne rend rien quand aucune création/édition n'est en attente", () => {
		setup();

		expect(screen.queryByText("Nouvelle affectation")).not.toBeInTheDocument();
	});

	it("s'ouvre en création et insère le bloc, même avec une expression vide", () => {
		const insert = jest.fn();
		setup({ pendingSystemBlockCreation: { blockType: "assign", insert } });

		expect(screen.getByText("Nouvelle affectation")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Créer"));

		expect(insert).toHaveBeenCalledWith({ expression: "" });
	});

	it("s'ouvre en édition préremplie, et dispatche ElementUpdateCommand au clic sur Enregistrer", () => {
		const { executeOperation } = setup({
			pendingSystemBlockEdit: {
				blockType: "assign",
				elementId: "b1",
				initial: { expression: "x := 1" },
			},
		});

		expect(screen.getByText("Modifier l'affectation")).toBeInTheDocument();
		expect(screen.getByLabelText("Expression")).toHaveValue("x := 1");

		fireEvent.change(screen.getByLabelText("Expression"), { target: { value: "x := 2" } });
		fireEvent.click(screen.getByText("Enregistrer"));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [[commands]] = executeOperation.mock.calls;
		expect(commands[0].payload.changes).toEqual({ data: { params: { expression: "x := 2" } } });
	});
});
