/**
 * @jest-environment jsdom
 */
import Project from "@/schemas/project/project.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import RecentProjects from "./RecentProjects";

jest.mock("@/ui/components/projects/ProjectContext");

const openProject = jest.fn();
const setOpenModalVisible = jest.fn();
const locationOf = jest.fn();

const project = (id: string, name: string) => {
	const p = new Project(id, name, "auteur");
	p.programs = {};
	p.lastModificationDate = new Date(Date.now() - 3 * 24 * 3600 * 1000);
	return p;
};

beforeEach(() => {
	jest.clearAllMocks();
	locationOf.mockReturnValue("local");
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			projectRepository: { locationOf },
			lifecycleManager: { openProject },
			setOpenModalVisible,
		}),
	);
});

describe("RecentProjects", () => {
	it("liste les projets avec leur contenu et leur date de modification relative", () => {
		const withGrafcet = project("p1", "Carrefour");
		withGrafcet.createGrafcet("G1");
		withGrafcet.createHmiPage("Vue");
		withGrafcet.lastModificationDate = new Date(
			Date.now() - 3 * 24 * 3600 * 1000,
		);
		renderWithI18n(<RecentProjects projects={[withGrafcet]} total={1} />);

		expect(screen.getByText("Carrefour")).toBeInTheDocument();
		expect(screen.getByText("GRAFCET · HMI")).toBeInTheDocument();
		expect(screen.getByText("Modifié il y a 3 jours")).toBeInTheDocument();
	});

	it("ouvre le projet cliqué", () => {
		renderWithI18n(
			<RecentProjects projects={[project("p1", "Carrefour")]} total={1} />,
		);
		fireEvent.click(screen.getByText("Carrefour"));
		expect(openProject).toHaveBeenCalledWith("p1");
	});

	it("signale les projets enregistrés dans le cloud", () => {
		locationOf.mockImplementation((id: string) =>
			id === "cloud" ? "cloud" : "local",
		);
		renderWithI18n(
			<RecentProjects
				projects={[project("cloud", "Nuage"), project("local", "Disque")]}
				total={2}
			/>,
		);
		expect(screen.getAllByTitle("Enregistré dans le cloud")).toHaveLength(1);
	});

	it("propose la liste complète seulement quand des projets sont masqués", () => {
		const { rerender } = renderWithI18n(
			<RecentProjects projects={[project("p1", "A")]} total={1} />,
		);
		expect(
			screen.queryByRole("button", { name: /Tous les projets/ }),
		).not.toBeInTheDocument();

		rerender(<RecentProjects projects={[project("p1", "A")]} total={7} />);
		fireEvent.click(
			screen.getByRole("button", { name: "Tous les projets (7)" }),
		);
		expect(setOpenModalVisible).toHaveBeenCalledWith(true);
	});

	it("signale que les projets cloud n'ont pas pu être chargés", () => {
		renderWithI18n(
			<RecentProjects
				projects={[project("p1", "A")]}
				total={1}
				cloudUnavailable
			/>,
		);
		expect(
			screen.getByText(/Vos projets cloud n'ont pas pu être chargés/),
		).toBeInTheDocument();
	});

	it("indique l'absence de projet quand la liste est vide", () => {
		renderWithI18n(<RecentProjects projects={[]} total={0} />);
		expect(
			screen.getByText(/Aucun projet enregistré pour le moment/),
		).toBeInTheDocument();
	});
});
