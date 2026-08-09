/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Project from "@/schemas/project/project.schema";
import { useProjectStore } from "./ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import ProjectsList from "./ProjectsList";

jest.mock("./ProjectContext");

function project(id: string, name: string): Project {
	return new Project(id, name, "");
}

function setup({
	list = [] as Project[],
	deleteFn = jest.fn(),
	onProjectClick = jest.fn(),
	reloadKey = 0,
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ projectRepository: { list: () => list, delete: deleteFn } }),
	);

	const utils = render(<ProjectsList reloadKey={reloadKey} onProjectClick={onProjectClick} />);
	return { ...utils, deleteFn, onProjectClick };
}

describe("ProjectsList", () => {
	it("affiche 'Aucun projet enregistré' quand la liste est vide", async () => {
		setup({ list: [] });
		await waitFor(() => expect(screen.getByText("Aucun projet enregistré")).toBeInTheDocument());
	});

	it("liste les projets renvoyés par le repository", async () => {
		setup({ list: [project("p1", "Projet A"), project("p2", "Projet B")] });
		await waitFor(() => expect(screen.getByText("Projet A")).toBeInTheDocument());
		expect(screen.getByText("Projet B")).toBeInTheDocument();
	});

	it("appelle onProjectClick avec l'id du projet cliqué", async () => {
		const { onProjectClick } = setup({ list: [project("p1", "Projet A")] });
		await waitFor(() => screen.getByText("Projet A"));

		fireEvent.click(screen.getByText("Projet A"));

		expect(onProjectClick).toHaveBeenCalledWith("p1");
	});

	it("supprime le projet après confirmation", async () => {
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
		const { deleteFn } = setup({ list: [project("p1", "Projet A")] });
		await waitFor(() => screen.getByText("Projet A"));

		fireEvent.click(screen.getByLabelText("delete"));

		expect(deleteFn).toHaveBeenCalledWith("p1");
		await waitFor(() => expect(screen.queryByText("Projet A")).not.toBeInTheDocument());
		confirmSpy.mockRestore();
	});

	it("ne supprime rien si la confirmation est refusée", async () => {
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
		const { deleteFn } = setup({ list: [project("p1", "Projet A")] });
		await waitFor(() => screen.getByText("Projet A"));

		fireEvent.click(screen.getByLabelText("delete"));

		expect(deleteFn).not.toHaveBeenCalled();
		expect(screen.getByText("Projet A")).toBeInTheDocument();
		confirmSpy.mockRestore();
	});

	it("le clic sur supprimer ne déclenche pas aussi onProjectClick", async () => {
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
		const { onProjectClick } = setup({ list: [project("p1", "Projet A")] });
		await waitFor(() => screen.getByText("Projet A"));

		fireEvent.click(screen.getByLabelText("delete"));

		expect(onProjectClick).not.toHaveBeenCalled();
		confirmSpy.mockRestore();
	});
});
