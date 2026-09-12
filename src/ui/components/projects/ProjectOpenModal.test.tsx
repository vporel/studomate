/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import Project from "@/schemas/project/project.schema";
import { parseProjectFromFile } from "@/persistence/project-file";
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
jest.mock("@/persistence/project-file");
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
			(parseProjectFromFile as jest.Mock).mockReturnValue(project);
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

		it("alerte et n'ouvre rien si le fichier n'est pas un projet valide", async () => {
			const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
			(openFileDialog as jest.Mock).mockResolvedValue({});
			(readFile as jest.Mock).mockResolvedValue("pas du json valide");
			(parseProjectFromFile as jest.Mock).mockImplementation(() => {
				throw new Error("invalid");
			});
			const { openProject } = setup();

			fireEvent.click(screen.getByText("Ouvrir depuis un fichier..."));
			await Promise.resolve();
			await Promise.resolve();
			await Promise.resolve();

			expect(alertSpy).toHaveBeenCalled();
			expect(openProject).not.toHaveBeenCalled();
			alertSpy.mockRestore();
		});

		it("alerte et n'ouvre rien si l'enregistrement échoue", async () => {
			const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
			const project = new Project("p1", "Importé", "");
			(openFileDialog as jest.Mock).mockResolvedValue({});
			(readFile as jest.Mock).mockResolvedValue('{"id":"p1"}');
			(parseProjectFromFile as jest.Mock).mockReturnValue(project);
			const { openProject } = setup({
				save: jest.fn().mockResolvedValue({ ok: false }),
			});

			fireEvent.click(screen.getByText("Ouvrir depuis un fichier..."));
			await waitFor(() => expect(alertSpy).toHaveBeenCalled());

			expect(openProject).not.toHaveBeenCalled();
			alertSpy.mockRestore();
		});
	});

	describe("Ouvrir depuis un fichier — repli sur <input type=file>", () => {
		it("charge le projet via openFileViaInput quand l'API n'est pas disponible", async () => {
			const project = new Project("p1", "Importé", "");
			(openFileViaInput as jest.Mock).mockResolvedValue('{"id":"p1"}');
			(parseProjectFromFile as jest.Mock).mockReturnValue(project);
			const { openProject } = setup();

			fireEvent.click(screen.getByText("Ouvrir depuis un fichier..."));
			await waitFor(() => expect(openProject).toHaveBeenCalled());

			expect(openFileViaInput).toHaveBeenCalledWith(".json");
			expect(openProject).toHaveBeenCalledWith("p1");
		});
	});
});
