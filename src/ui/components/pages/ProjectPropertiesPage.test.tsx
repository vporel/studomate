/**
 * @jest-environment jsdom
 */
import { Dialect } from "@/expression-language/dialect.enum";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "../projects/ProjectContext";
import ProjectPropertiesPage from "./ProjectPropertiesPage";

jest.mock("../projects/ProjectContext");

const READ_ONLY_TEXT = "Modifiable en mode Conception uniquement.";

const shareProject = jest.fn();
const SHAREABLE_REPOSITORY = {
	getByShareToken: jest.fn(),
	getShareToken: jest.fn(),
	createShareToken: jest.fn(),
	deleteShareToken: jest.fn(),
};

function setup(
	mode: ProjectMode,
	{
		shareable = true,
		isSharedProject = false,
		editingEnabled = true,
		activePageLocked = false,
	} = {},
) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			mode,
			editingEnabled,
			activePageId: "project-properties",
			pagesData: {
				"project-properties": {
					id: "project-properties",
					type: "project-properties",
					locked: activePageLocked,
				},
			},
			project: {
				name: "Mon projet",
				author: "Moi",
				dialect: Dialect.FR,
				exercise: { statement: "Enonce" },
			},
			setProjectName: jest.fn(),
			setProjectAuthor: jest.fn(),
			setProjectDialect: jest.fn(),
			setExerciseStatement: jest.fn(),
			projectRepository: shareable ? SHAREABLE_REPOSITORY : {},
			isSharedProject,
			sharingManager: { shareProject },
		}),
	);
	renderWithI18n(<ProjectPropertiesPage />);
}

const fields = () => [
	screen.getByLabelText("Nom"),
	screen.getByLabelText("Auteur"),
	screen.getByLabelText("Énoncé de l'exercice"),
	screen.getByRole("combobox"),
];

describe("ProjectPropertiesPage", () => {
	beforeEach(() => shareProject.mockClear());

	it("offers to share the project and reports where the sharing started from", () => {
		setup(ProjectMode.DESIGN);

		fireEvent.click(screen.getByRole("button", { name: "Partager le projet" }));

		expect(shareProject).toHaveBeenCalledWith("properties");
	});

	it("also offers it in Simulation mode, like the Project menu", () => {
		setup(ProjectMode.SIMULATION);

		expect(
			screen.getByRole("button", { name: "Partager le projet" }),
		).toBeVisible();
	});

	it("does not offer it when the storage cannot share", () => {
		setup(ProjectMode.DESIGN, { shareable: false });

		expect(
			screen.queryByRole("button", { name: "Partager le projet" }),
		).not.toBeInTheDocument();
	});

	it("does not offer it on a project opened from a share link", () => {
		setup(ProjectMode.DESIGN, { isSharedProject: true });

		expect(
			screen.queryByRole("button", { name: "Partager le projet" }),
		).not.toBeInTheDocument();
	});

	it("keeps every field editable in Design mode without read-only hint", () => {
		setup(ProjectMode.DESIGN);

		for (const field of fields()) {
			expect(field).not.toHaveAttribute("disabled");
			expect(field).not.toHaveAttribute("aria-disabled", "true");
		}
		expect(screen.queryByText(READ_ONLY_TEXT)).not.toBeInTheDocument();
	});

	it("disables every field for a project opened read-only", () => {
		setup(ProjectMode.DESIGN, { editingEnabled: false });

		expect(screen.getByLabelText("Nom")).toBeDisabled();
		expect(screen.getByLabelText("Auteur")).toBeDisabled();
		expect(screen.getByLabelText("Énoncé de l'exercice")).toBeDisabled();
	});

	it("keeps every field editable when the page itself is locked", () => {
		setup(ProjectMode.DESIGN, { activePageLocked: true });

		expect(screen.getByLabelText("Nom")).not.toBeDisabled();
		expect(screen.getByLabelText("Auteur")).not.toBeDisabled();
	});

	it("disables every field and explains why in Simulation mode", () => {
		setup(ProjectMode.SIMULATION);

		expect(screen.getByLabelText("Nom")).toBeDisabled();
		expect(screen.getByLabelText("Auteur")).toBeDisabled();
		expect(screen.getByLabelText("Énoncé de l'exercice")).toBeDisabled();
		expect(screen.getByRole("combobox")).toHaveAttribute(
			"aria-disabled",
			"true",
		);
		expect(screen.getAllByText(READ_ONLY_TEXT)).toHaveLength(2);
	});
});
