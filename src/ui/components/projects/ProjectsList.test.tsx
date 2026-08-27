/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Project from "@/schemas/project/project.schema";
import { useProjectStore } from "./ProjectContext";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { selectorImplementation } from "@tests/utils/store-mocks";
import ProjectsList from "./ProjectsList";

jest.mock("./ProjectContext");
jest.mock("@/ui/stores/auth/auth.store");

let mockSupabaseConfigured = true;
jest.mock("@/persistence/repositories/supabase-client", () => ({
	get isSupabaseConfigured() {
		return mockSupabaseConfigured;
	},
	supabase: {},
}));

function project(id: string, name: string): Project {
	return new Project(id, name, "");
}

function setup({
	list = [] as Project[],
	deleteFn = jest.fn(),
	moveToCloudFn = jest.fn().mockResolvedValue({ ok: true }),
	moveToLocalFn = jest.fn().mockResolvedValue({ ok: true }),
	locationOf = (_id: string) => "local" as "local" | "cloud",
	authenticated = false,
	setAuthModalVisibleFn = jest.fn(),
	onProjectClick = jest.fn(),
	reloadKey = 0,
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			projectRepository: {
				list: () => list,
				delete: deleteFn,
				moveToCloud: moveToCloudFn,
				moveToLocal: moveToLocalFn,
				locationOf,
			},
		}),
	);
	(useAuthStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			user: authenticated ? {} : null,
			setAuthModalVisible: setAuthModalVisibleFn,
		}),
	);

	const utils = render(
		<ProjectsList reloadKey={reloadKey} onProjectClick={onProjectClick} />,
	);
	return {
		...utils,
		deleteFn,
		moveToCloudFn,
		moveToLocalFn,
		setAuthModalVisibleFn,
		onProjectClick,
	};
}

describe("ProjectsList", () => {
	beforeEach(() => {
		mockSupabaseConfigured = true;
	});

	it("masque l'onglet Cloud quand le cloud n'est pas configuré", async () => {
		mockSupabaseConfigured = false;
		setup({ list: [project("p1", "Projet A")] });
		await waitFor(() => screen.getByText("Projet A"));

		expect(
			screen.queryByRole("tab", { name: "Cloud" }),
		).not.toBeInTheDocument();
	});

	it("affiche 'Aucun projet enregistré' quand la liste locale est vide", async () => {
		setup({ list: [] });
		await waitFor(() =>
			expect(screen.getByText("Aucun projet enregistré")).toBeInTheDocument(),
		);
	});

	it("liste les projets locaux renvoyés par le repository, dans l'onglet Local par défaut", async () => {
		setup({ list: [project("p1", "Projet A"), project("p2", "Projet B")] });
		await waitFor(() =>
			expect(screen.getByText("Projet A")).toBeInTheDocument(),
		);
		expect(screen.getByText("Projet B")).toBeInTheDocument();
	});

	it("n'affiche pas les projets cloud dans l'onglet Local", async () => {
		setup({
			list: [project("p1", "Projet local"), project("p2", "Projet cloud")],
			locationOf: (id) => (id === "p2" ? "cloud" : "local"),
		});
		await waitFor(() =>
			expect(screen.getByText("Projet local")).toBeInTheDocument(),
		);
		expect(screen.queryByText("Projet cloud")).not.toBeInTheDocument();
	});

	it("affiche les projets cloud dans l'onglet Cloud une fois connecté", async () => {
		setup({
			list: [project("p1", "Projet local"), project("p2", "Projet cloud")],
			locationOf: (id) => (id === "p2" ? "cloud" : "local"),
			authenticated: true,
		});
		await waitFor(() => screen.getByText("Projet local"));

		fireEvent.click(screen.getByRole("tab", { name: "Cloud" }));

		expect(screen.getByText("Projet cloud")).toBeInTheDocument();
		expect(screen.queryByText("Projet local")).not.toBeInTheDocument();
	});

	it("propose de se connecter dans l'onglet Cloud sans compte", async () => {
		setup({ list: [project("p1", "Projet A")] });
		await waitFor(() => screen.getByText("Projet A"));

		fireEvent.click(screen.getByRole("tab", { name: "Cloud" }));

		expect(
			screen.getByRole("button", { name: "Se connecter" }),
		).toBeInTheDocument();
	});

	it("ouvre la modale d'authentification au clic sur 'Se connecter'", async () => {
		const { setAuthModalVisibleFn } = setup({ list: [] });
		fireEvent.click(screen.getByRole("tab", { name: "Cloud" }));

		fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

		expect(setAuthModalVisibleFn).toHaveBeenCalledWith(true);
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
		await waitFor(() =>
			expect(screen.queryByText("Projet A")).not.toBeInTheDocument(),
		);
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

	it("envoie le projet vers le cloud depuis l'onglet Local, une fois connecté", async () => {
		const { moveToCloudFn } = setup({
			list: [project("p1", "Projet A")],
			authenticated: true,
		});
		await waitFor(() => screen.getByText("Projet A"));

		fireEvent.click(screen.getByLabelText("envoyer vers le cloud"));

		await waitFor(() => expect(moveToCloudFn).toHaveBeenCalled());
	});

	it("ne propose pas d'envoyer vers le cloud sans être connecté", async () => {
		setup({ list: [project("p1", "Projet A")], authenticated: false });
		await waitFor(() => screen.getByText("Projet A"));

		expect(
			screen.queryByLabelText("envoyer vers le cloud"),
		).not.toBeInTheDocument();
	});

	it("rapatrie le projet en local depuis l'onglet Cloud", async () => {
		const { moveToLocalFn } = setup({
			list: [project("p1", "Projet A")],
			locationOf: () => "cloud",
			authenticated: true,
		});
		await waitFor(() => screen.getByText("Aucun projet enregistré")); // rien dans l'onglet Local par défaut
		fireEvent.click(screen.getByRole("tab", { name: "Cloud" }));
		await waitFor(() => screen.getByText("Projet A"));

		fireEvent.click(screen.getByLabelText("rapatrier en local"));

		await waitFor(() => expect(moveToLocalFn).toHaveBeenCalled());
	});
});
