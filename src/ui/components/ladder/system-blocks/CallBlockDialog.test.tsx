/**
 * @jest-environment jsdom
 */
import Project from "@/schemas/project/project.schema";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ThemeProvider as AppThemeProvider } from "@/ui/theme/ThemeContext";
import { PendingSystemBlockCreation } from "@/ui/utils/ladder/ladder-system-block-drag";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import CallBlockDialog from "./CallBlockDialog";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/ladder/context/LadderContext");

function setup({
	project,
	ladderId,
	pending = null,
}: {
	project: Project;
	ladderId: string;
	pending?: PendingSystemBlockCreation | null;
}) {
	const setPendingSystemBlockCreation = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ project }),
	);
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ladder: { id: ladderId },
			pendingSystemBlockCreation: pending,
			setPendingSystemBlockCreation,
			pendingSystemBlockEdit: null,
			setPendingSystemBlockEdit: jest.fn(),
		}),
	);
	renderWithI18n(
		<AppThemeProvider>
			<CallBlockDialog />
		</AppThemeProvider>,
	);
	return { setPendingSystemBlockCreation };
}

describe("CallBlockDialog", () => {
	afterEach(() => jest.clearAllMocks());

	it("ne rend rien quand aucune création n'est en attente", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("Autre");

		setup({ project, ladderId: project.main.id });

		expect(screen.queryByText("Appeler un ladder")).not.toBeInTheDocument();
		expect(ladder).toBeDefined();
	});

	it("affiche un texte explicatif, sans liste ni bouton, quand aucun ladder n'est appelable", () => {
		const project = new Project("p1", "Projet", "");

		setup({
			project,
			ladderId: project.main.id,
			pending: { blockType: "user-program", insert: jest.fn() },
		});

		expect(screen.getByText("Appeler un ladder")).toBeInTheDocument();
		expect(
			screen.getByText(/Aucun autre ladder n'existe dans le projet/),
		).toBeInTheDocument();
		expect(screen.queryByText(/exclus de l'exécution/)).not.toBeInTheDocument();
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
		expect(screen.queryByText("Ajouter")).not.toBeInTheDocument();
	});

	it("ne lit pas le projet tant que la fenêtre est fermée", () => {
		const project = new Project("p1", "Projet", "");
		project.createLadder("Autre");
		setup({ project, ladderId: project.main.id });

		const selectors = (useProjectStore as unknown as jest.Mock).mock.calls.map(
			([selector]) => selector({ project }),
		);

		expect(selectors.length).toBeGreaterThan(0);
		expect(selectors.every((value) => value === null)).toBe(true);
	});

	it("explique que les autres ladders sont exclus quand ce sont les seuls restants", () => {
		const project = new Project("p1", "Projet", "");
		project.createLadder("Exclu").excludedFromExecution = true;

		setup({
			project,
			ladderId: project.main.id,
			pending: { blockType: "user-program", insert: jest.fn() },
		});

		expect(
			screen.getByText(
				/Les autres ladders du projet sont exclus de l'exécution/,
			),
		).toBeInTheDocument();
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
	});

	it("présélectionne le premier ladder appelable et l'insère au clic sur Ajouter", () => {
		const project = new Project("p1", "Projet", "");
		const first = project.createLadder("Premier");
		project.createLadder("Second");
		const insert = jest.fn();

		setup({
			project,
			ladderId: project.main.id,
			pending: { blockType: "user-program", insert },
		});
		fireEvent.click(screen.getByText("Ajouter"));

		expect(insert).toHaveBeenCalledWith({ programId: first.id });
	});

	it("insère le ladder choisi dans la liste", () => {
		const project = new Project("p1", "Projet", "");
		project.createLadder("Premier");
		const second = project.createLadder("Second");
		const insert = jest.fn();

		setup({
			project,
			ladderId: project.main.id,
			pending: { blockType: "user-program", insert },
		});
		fireEvent.mouseDown(screen.getByRole("combobox"));
		fireEvent.click(within(screen.getByRole("listbox")).getByText("Second"));
		fireEvent.click(screen.getByText("Ajouter"));

		expect(insert).toHaveBeenCalledWith({ programId: second.id });
	});

	it("ne propose ni le Main, ni le ladder en cours d'édition, ni un ladder exclu", () => {
		const project = new Project("p1", "Projet", "");
		const current = project.createLadder("Courant");
		project.createLadder("Appelable");
		project.createLadder("Exclu").excludedFromExecution = true;

		setup({
			project,
			ladderId: current.id,
			pending: { blockType: "user-program", insert: jest.fn() },
		});
		fireEvent.mouseDown(screen.getByRole("combobox"));
		const options = within(screen.getByRole("listbox"))
			.getAllByRole("option")
			.map((option) => option.textContent);

		expect(options).toEqual(["Appelable"]);
	});

	it("propose aussi les ladders exclus quand le ladder en cours d'édition est exclu", () => {
		const project = new Project("p1", "Projet", "");
		const current = project.createLadder("Courant");
		current.excludedFromExecution = true;
		project.createLadder("Appelable");
		project.createLadder("Exclu").excludedFromExecution = true;

		setup({
			project,
			ladderId: current.id,
			pending: { blockType: "user-program", insert: jest.fn() },
		});
		fireEvent.mouseDown(screen.getByRole("combobox"));
		const options = within(screen.getByRole("listbox"))
			.getAllByRole("option")
			.map((option) => option.textContent);

		expect(options).toEqual(["Appelable", "Exclu"]);
	});

	it("ferme la fenêtre après l'insertion", () => {
		const project = new Project("p1", "Projet", "");
		project.createLadder("Premier");

		const { setPendingSystemBlockCreation } = setup({
			project,
			ladderId: project.main.id,
			pending: { blockType: "user-program", insert: jest.fn() },
		});
		fireEvent.click(screen.getByText("Ajouter"));

		expect(setPendingSystemBlockCreation).toHaveBeenCalledWith(null);
	});
});
