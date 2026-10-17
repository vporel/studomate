/**
 * @jest-environment jsdom
 */
import { APP_NAME } from "@/app-info";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import AppStartup from "./AppStartup";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("./auth/AccountStatus", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./profile/ProfilePromptModal", () => ({
	__esModule: true,
	default: () => null,
}));

const newProjectFromTemplate = jest.fn();
const setOpenModalVisible = jest.fn();
const setNewProjectModalVisible = jest.fn();

beforeEach(() => {
	jest.clearAllMocks();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			setOpenModalVisible,
			setNewProjectModalVisible,
			lifecycleManager: { newProjectFromTemplate },
		}),
	);
});

describe("AppStartup", () => {
	it("affiche tous ses textes en français par défaut", () => {
		renderWithI18n(<AppStartup />);
		expect(screen.getByText("Découvrir avec un exemple")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Ouvrir la solution et simuler" }),
		).toBeInTheDocument();
		expect(screen.getByText(/Besoin d'aide pour démarrer/)).toBeInTheDocument();
		expect(
			screen.getByText("Consulter le manuel utilisateur"),
		).toBeInTheDocument();
		expect(screen.getByText("Déjà à l'aise ?")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: `${APP_NAME} : accueil` }),
		).toBeInTheDocument();
	});

	it("affiche tous ses textes en anglais quand la langue de l'interface est l'anglais", () => {
		renderWithI18n(<AppStartup />, { locale: "en" });
		expect(screen.getByText("Discover with an example")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Open the solution and simulate" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Create a new project" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Open an existing project" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Déjà à l'aise ?")).not.toBeInTheDocument();
	});

	it("ouvre la solution de la maquette mise en avant", () => {
		renderWithI18n(<AppStartup />);
		fireEvent.click(
			screen.getByRole("button", { name: "Ouvrir la solution et simuler" }),
		);
		expect(newProjectFromTemplate).toHaveBeenCalledWith(
			"traffic-light",
			"solution",
		);
	});

	it("ouvre les fenêtres de création et d'ouverture de projet", () => {
		renderWithI18n(<AppStartup />);
		fireEvent.click(
			screen.getByRole("button", { name: "Créer un nouveau projet" }),
		);
		expect(setNewProjectModalVisible).toHaveBeenCalledWith(true);
		fireEvent.click(
			screen.getByRole("button", { name: "Ouvrir un projet existant" }),
		);
		expect(setOpenModalVisible).toHaveBeenCalledWith(true);
	});
});
