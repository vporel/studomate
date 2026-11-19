/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import Project from "@/schemas/project/project.schema";
import {
	importProjectFromFile,
	ProjectFileError,
} from "@/persistence/project-file";
import {
	openFileDialog,
	openFileViaInput,
	readFile,
} from "@/ui/lib/file-system";
import { useProjectStore } from "./ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import ProjectOpenModal from "./ProjectOpenModal";

jest.mock("./ProjectContext");
jest.mock("@/ui/lib/file-system");
jest.mock("@/persistence/project-file", () => ({
	...jest.requireActual("@/persistence/project-file"),
	importProjectFromFile: jest.fn(),
}));
jest.mock("./ProjectsList", () => ({
	__esModule: true,
	default: ({ onProjectClick }: { onProjectClick: (id: string) => void }) => (
		<button onClick={() => onProjectClick("existing-id")}>project-item</button>
	),
}));

function setup({
	openProject = jest.fn(),
	setOpenModalVisible = jest.fn(),
	save = jest.fn().mockResolvedValue({ ok: true }),
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			projectRepository: { save },
			lifecycleManager: { openProject },
			ui: { openModalVisible: true },
			setOpenModalVisible,
		}),
	);

	renderWithI18n(<ProjectOpenModal />);
	return { openProject, setOpenModalVisible, save };
}

describe("ProjectOpenModal", () => {
	afterEach(() => {
		jest.clearAllMocks();
		delete (window as any).showOpenFilePicker;
	});

	it("ouvre le projet cliqué dans la liste, puis ferme la modale", () => {
		const { openProject, setOpenModalVisible } = setup();

		fireEvent.click(screen.getByText("project-item"));

		expect(openProject).toHaveBeenCalledWith("existing-id");
		expect(setOpenModalVisible).toHaveBeenCalledWith(false);
	});

	describe("Ouvrir depuis un fichier — File System Access API disponible", () => {
		beforeEach(() => {
			(window as any).showOpenFilePicker = jest.fn();
		});

		it("charge, enregistre et ouvre le projet importé", async () => {
			const project = new Project("p1", "Importé", "");
			(openFileDialog as jest.Mock).mockResolvedValue({});
			(readFile as jest.Mock).mockResolvedValue('{"id":"p1"}');
			(importProjectFromFile as jest.Mock).mockReturnValue(project);
			const { openProject, setOpenModalVisible, save } = setup();

			fireEvent.click(screen.getByText("Ouvrir depuis un fichier..."));
			await waitFor(() => expect(openProject).toHaveBeenCalled());

			expect(save).toHaveBeenCalledWith(project);
			expect(openProject).toHaveBeenCalledWith("p1");
			expect(setOpenModalVisible).toHaveBeenCalledWith(false);
		});

		it("n'ouvre rien si la sélection du fichier est annulée", async () => {
			(openFileDialog as jest.Mock).mockResolvedValue(null);
			const { openProject } = setup();

			fireEvent.click(screen.getByText("Ouvrir depuis un fichier..."));
			await Promise.resolve();
			await Promise.resolve();

			expect(openProject).not.toHaveBeenCalled();
		});

		it.each([
			[
				new ProjectFileError("not-json"),
				"Ce fichier n'est pas un fichier de projet lisible : son contenu est mal formé.",
			],
			[
				new ProjectFileError("not-a-project"),
				"Ce fichier ne contient pas un projet Studomate.",
			],
			[
				new ProjectFileError("newer-version"),
				"Ce projet a été enregistré par une version plus récente de Studomate. Mettez l'application à jour pour l'ouvrir.",
			],
			[
				new Error("unexpected"),
				"Ce fichier ne contient pas un projet Studomate.",
			],
		])(
			"shows why the file was rejected (%s) and opens nothing",
			async (error, message) => {
				(openFileDialog as jest.Mock).mockResolvedValue({});
				(readFile as jest.Mock).mockResolvedValue("contenu");
				(importProjectFromFile as jest.Mock).mockImplementation(() => {
					throw error;
				});
				const { openProject, save, setOpenModalVisible } = setup();

				fireEvent.click(screen.getByText("Ouvrir depuis un fichier..."));

				expect(await screen.findByRole("alert")).toHaveTextContent(message);
				expect(save).not.toHaveBeenCalled();
				expect(openProject).not.toHaveBeenCalled();
				expect(setOpenModalVisible).not.toHaveBeenCalled();
			},
		);

		it("shows a read error when the picked file cannot be read", async () => {
			(openFileDialog as jest.Mock).mockResolvedValue({});
			(readFile as jest.Mock).mockRejectedValue(new Error("denied"));
			const { openProject } = setup();

			fireEvent.click(screen.getByText("Ouvrir depuis un fichier..."));

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"Le fichier n'a pas pu être lu.",
			);
			expect(openProject).not.toHaveBeenCalled();
		});

		it("shows a save error and opens nothing when saving fails", async () => {
			const project = new Project("p1", "Importé", "");
			(openFileDialog as jest.Mock).mockResolvedValue({});
			(readFile as jest.Mock).mockResolvedValue('{"id":"p1"}');
			(importProjectFromFile as jest.Mock).mockReturnValue(project);
			const { openProject } = setup({
				save: jest.fn().mockResolvedValue({ ok: false }),
			});

			fireEvent.click(screen.getByText("Ouvrir depuis un fichier..."));

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"Le projet n'a pas pu être enregistré dans le navigateur.",
			);
			expect(openProject).not.toHaveBeenCalled();
		});

		it("clears the previous error on a new attempt", async () => {
			(openFileDialog as jest.Mock).mockResolvedValue({});
			(readFile as jest.Mock).mockResolvedValue("contenu");
			(importProjectFromFile as jest.Mock).mockImplementationOnce(() => {
				throw new ProjectFileError("not-json");
			});
			(openFileDialog as jest.Mock).mockResolvedValueOnce({});
			setup();

			fireEvent.click(screen.getByText("Ouvrir depuis un fichier..."));
			await screen.findByRole("alert");
			(openFileDialog as jest.Mock).mockResolvedValueOnce(null);
			fireEvent.click(screen.getByText("Ouvrir depuis un fichier..."));

			await waitFor(() =>
				expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
			);
		});
	});

	describe("Ouvrir depuis un fichier — repli sur <input type=file>", () => {
		it("charge le projet via openFileViaInput quand l'API n'est pas disponible", async () => {
			const project = new Project("p1", "Importé", "");
			(openFileViaInput as jest.Mock).mockResolvedValue('{"id":"p1"}');
			(importProjectFromFile as jest.Mock).mockReturnValue(project);
			const { openProject } = setup();

			fireEvent.click(screen.getByText("Ouvrir depuis un fichier..."));
			await waitFor(() => expect(openProject).toHaveBeenCalled());

			expect(openFileViaInput).toHaveBeenCalledWith(".json");
			expect(openProject).toHaveBeenCalledWith("p1");
		});
	});
});
