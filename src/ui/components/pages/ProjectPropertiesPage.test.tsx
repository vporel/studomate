/**
 * @jest-environment jsdom
 */
import { Dialect } from "@/expression-language/dialect.enum";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "../projects/ProjectContext";
import ProjectPropertiesPage from "./ProjectPropertiesPage";

jest.mock("../projects/ProjectContext");

const READ_ONLY_TEXT = "Modifiable en mode Conception uniquement.";

function setup(mode: ProjectMode) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			mode,
			activePageId: "project-properties",
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
	it("keeps every field editable in Design mode without read-only hint", () => {
		setup(ProjectMode.DESIGN);

		for (const field of fields()) {
			expect(field).not.toHaveAttribute("disabled");
			expect(field).not.toHaveAttribute("aria-disabled", "true");
		}
		expect(screen.queryByText(READ_ONLY_TEXT)).not.toBeInTheDocument();
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
