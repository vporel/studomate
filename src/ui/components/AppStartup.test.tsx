/**
 * @jest-environment jsdom
 */
import Project from "@/schemas/project/project.schema";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import type { RecentProjects } from "./startup/useRecentProjects";
import AppStartup from "./AppStartup";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("./startup/StartupAside", () => ({
	__esModule: true,
	default: () => <aside data-testid="startup-aside" />,
}));
jest.mock("./auth/AccountStatus", () => ({
	__esModule: true,
	default: () => <div data-testid="account-status" />,
}));
jest.mock("./profile/ProfilePromptModal", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("./startup/RecentProjects", () => ({
	__esModule: true,
	default: ({ projects, total }: { projects: Project[]; total: number }) => (
		<div
			data-testid="recent-projects"
			data-count={projects.length}
			data-total={total}
		/>
	),
}));
jest.mock("@/ui/components/3d-illustrations/Illustration3dSlot", () => ({
	__esModule: true,
	isIllustration3dId: (id: string) => id === "crossroads",
	default: ({
		illustration,
		label,
	}: {
		illustration: string;
		label: string;
	}) => (
		<div
			data-testid="illustration-slot"
			data-illustration={illustration}
			aria-label={label}
		/>
	),
}));

let recent: RecentProjects = { loading: true };
jest.mock("./startup/useRecentProjects", () => ({
	__esModule: true,
	default: () => recent,
}));

const newProjectFromTemplate = jest.fn();
const setOpenModalVisible = jest.fn();
const setNewProjectModalVisible = jest.fn();

beforeEach(() => {
	jest.clearAllMocks();
	recent = {
		loading: false,
		projects: [],
		total: 0,
		cloudUnavailable: false,
		returning: false,
	};
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			setOpenModalVisible,
			setNewProjectModalVisible,
			lifecycleManager: { newProjectFromTemplate },
		}),
	);
});

describe("AppStartup", () => {
	describe("sans projet (première visite)", () => {
		it("met en avant l'exemple du carrefour, illustré par sa scène animée", () => {
			renderWithI18n(<AppStartup />);
			expect(
				screen.getByRole("heading", { name: "Par où commencer ?" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { name: "Carrefour de feux tricolores" }),
			).toBeInTheDocument();
			expect(screen.getByTestId("illustration-slot")).toHaveAttribute(
				"data-illustration",
				"crossroads",
			);
			expect(screen.queryByTestId("recent-projects")).not.toBeInTheDocument();
		});

		it("ouvre la solution ou l'exercice de l'exemple mis en avant", () => {
			renderWithI18n(<AppStartup />);
			fireEvent.click(
				screen.getByRole("button", { name: "Simuler la solution" }),
			);
			expect(newProjectFromTemplate).toHaveBeenCalledWith(
				"crossroads",
				"solution",
			);
			fireEvent.click(
				screen.getAllByRole("button", { name: "Faire l'exercice" })[0],
			);
			expect(newProjectFromTemplate).toHaveBeenCalledWith(
				"crossroads",
				"exercise",
			);
		});

		it("propose les autres exemples sans répéter celui mis en avant", () => {
			renderWithI18n(<AppStartup />);
			expect(screen.getByText("Autres exemples")).toBeInTheDocument();
			expect(
				screen.getAllByRole("heading", {
					name: "Carrefour de feux tricolores",
				}),
			).toHaveLength(1);
			expect(
				screen.getAllByRole("button", { name: "Voir la solution" }),
			).toHaveLength(3);
		});
	});

	describe("avec des projets (retour)", () => {
		beforeEach(() => {
			recent = {
				loading: false,
				projects: [new Project("p1", "Mon projet", "moi")],
				total: 8,
				cloudUnavailable: false,
				returning: true,
			};
		});

		it("affiche les projets récents à la place de l'exemple mis en avant", () => {
			renderWithI18n(<AppStartup />);
			expect(
				screen.getByRole("heading", { name: "Reprendre un projet" }),
			).toBeInTheDocument();
			const list = screen.getByTestId("recent-projects");
			expect(list).toHaveAttribute("data-count", "1");
			expect(list).toHaveAttribute("data-total", "8");
			expect(
				screen.queryByRole("button", { name: "Simuler la solution" }),
			).not.toBeInTheDocument();
			expect(screen.queryByTestId("illustration-slot")).not.toBeInTheDocument();
		});

		it("garde les exemples, carrefour compris, sous les projets récents", () => {
			renderWithI18n(<AppStartup />);
			expect(screen.getByText("Exemples")).toBeInTheDocument();
			expect(
				screen.getByRole("heading", { name: "Carrefour de feux tricolores" }),
			).toBeInTheDocument();
			expect(
				screen.getAllByRole("button", { name: "Voir la solution" }),
			).toHaveLength(3);
		});
	});

	it("n'affiche ni exemple ni projet tant que la liste charge", () => {
		recent = { loading: true };
		renderWithI18n(<AppStartup />);
		expect(screen.queryByTestId("recent-projects")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Voir la solution" }),
		).not.toBeInTheDocument();
	});

	it("ouvre les fenêtres de création, d'ouverture et du catalogue de modèles", () => {
		renderWithI18n(<AppStartup />);
		fireEvent.click(screen.getByRole("button", { name: "Nouveau projet" }));
		expect(setNewProjectModalVisible).toHaveBeenCalledWith(true);
		fireEvent.click(screen.getByRole("button", { name: "Ouvrir un projet" }));
		expect(setOpenModalVisible).toHaveBeenCalledWith(true);
		setNewProjectModalVisible.mockClear();
		fireEvent.click(screen.getByRole("button", { name: "Tous les modèles" }));
		expect(setNewProjectModalVisible).toHaveBeenCalledWith(true);
	});

	it("traduit ses textes en anglais", () => {
		renderWithI18n(<AppStartup />, { locale: "en" });
		expect(
			screen.getByRole("heading", { name: "Where to start?" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Simulate the solution" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Alternate two traffic axes without ever causing a crash.",
			),
		).toBeInTheDocument();
		expect(screen.getByTestId("illustration-slot")).toHaveAttribute(
			"aria-label",
			"3D animation of a crossroads: cars arrive on all four roads and stop at red while the two axes take turns on green.",
		);
	});

	it("affiche dans l'en-tête le lien vers l'accueil et le compte, à côté du cadre latéral", () => {
		renderWithI18n(<AppStartup />);
		expect(
			screen.getByRole("link", { name: "Studomate : accueil" }),
		).toBeInTheDocument();
		expect(screen.getByTestId("startup-aside")).toBeInTheDocument();
		expect(
			within(screen.getByRole("banner")).getByTestId("account-status"),
		).toBeInTheDocument();
	});

	it("reste en mode retour quand tous les projets enregistrés ont été supprimés", () => {
		recent = {
			loading: false,
			projects: [],
			total: 0,
			cloudUnavailable: false,
			returning: true,
		};
		renderWithI18n(<AppStartup />);
		expect(
			screen.getByRole("heading", { name: "Reprendre un projet" }),
		).toBeInTheDocument();
		expect(screen.getByTestId("recent-projects")).toHaveAttribute(
			"data-count",
			"0",
		);
		expect(screen.queryByTestId("illustration-slot")).not.toBeInTheDocument();
	});
});
