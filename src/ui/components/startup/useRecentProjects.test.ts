/**
 * @jest-environment jsdom
 */
import {
	getProjectEverSaved,
	setProjectEverSaved,
} from "@/persistence/preferences.storage";
import Project from "@/schemas/project/project.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { renderHook, waitFor } from "@testing-library/react";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useRecentProjects from "./useRecentProjects";

jest.mock("@/ui/components/projects/ProjectContext");

let authState: { user: { id: string } | null } = { user: null };
jest.mock("@/ui/stores/auth/auth.store", () => ({
	useAuthStore: (selector: (state: unknown) => unknown) => selector(authState),
}));

const list = jest.fn();
let openModalVisible = false;

const projectModifiedOn = (id: string, isoDate: string) => {
	const project = new Project(id, id, "auteur");
	project.lastModificationDate = new Date(isoDate);
	return project;
};

beforeEach(() => {
	jest.clearAllMocks();
	localStorage.clear();
	authState = { user: null };
	openModalVisible = false;
	const projectRepository = { list };
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		(selector: (state: unknown) => unknown) =>
			selectorImplementation({ projectRepository, ui: { openModalVisible } })(
				selector,
			),
	);
});

describe("useRecentProjects", () => {
	it("est en chargement tant que la liste n'est pas arrivée", () => {
		list.mockReturnValue(new Promise(() => {}));
		const { result } = renderHook(() => useRecentProjects(2));
		expect(result.current).toEqual({ loading: true });
	});

	it("garde les plus récemment modifiés, du plus récent au plus ancien, et compte le total", async () => {
		list.mockResolvedValue({
			projects: [
				projectModifiedOn("ancien", "2026-01-01"),
				projectModifiedOn("recent", "2026-03-01"),
				projectModifiedOn("moyen", "2026-02-01"),
			],
			skipped: [],
		});
		const { result } = renderHook(() => useRecentProjects(2));

		await waitFor(() => expect(result.current.loading).toBe(false));
		if (result.current.loading) return;
		expect(result.current.projects.map((p) => p.id)).toEqual([
			"recent",
			"moyen",
		]);
		expect(result.current.total).toBe(3);
	});

	it("traite un échec de chargement comme une absence de projet", async () => {
		jest.spyOn(console, "error").mockImplementation(() => {});
		list.mockRejectedValue(new Error("boom"));
		const { result } = renderHook(() => useRecentProjects(5));

		await waitFor(() =>
			expect(result.current).toEqual({
				loading: false,
				projects: [],
				total: 0,
				cloudUnavailable: false,
				returning: false,
			}),
		);
	});

	it("recharge la liste quand l'utilisateur connecté change", async () => {
		list.mockResolvedValue({ projects: [], skipped: [] });
		const { result, rerender } = renderHook(() => useRecentProjects(5));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(list).toHaveBeenCalledTimes(1);

		authState = { user: { id: "u1" } };
		rerender();

		await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
	});

	it("recharge la liste à la fermeture de la modale d'ouverture, où des projets ont pu être supprimés", async () => {
		list.mockResolvedValue({
			projects: [projectModifiedOn("p1", "2026-01-01")],
			skipped: [],
		});
		const { result, rerender } = renderHook(() => useRecentProjects(5));
		await waitFor(() => expect(result.current.loading).toBe(false));

		openModalVisible = true;
		rerender();
		expect(list).toHaveBeenCalledTimes(1);

		list.mockResolvedValue({ projects: [], skipped: [] });
		openModalVisible = false;
		rerender();

		await waitFor(() => expect(result.current).toMatchObject({ total: 0 }));
		expect(list).toHaveBeenCalledTimes(2);
	});

	it("signale un cloud injoignable et reste en mode retour, les projets manquants pouvant y être", async () => {
		list.mockResolvedValue({ projects: [], skipped: [], failed: true });
		const { result } = renderHook(() => useRecentProjects(5));

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current).toMatchObject({
			cloudUnavailable: true,
			returning: true,
		});
	});

	describe("returning", () => {
		it("est faux sans projet ni enregistrement passé", async () => {
			list.mockResolvedValue({ projects: [], skipped: [] });
			const { result } = renderHook(() => useRecentProjects(5));

			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(result.current).toMatchObject({ returning: false });
		});

		it("reste vrai quand tous les projets ont été supprimés après un enregistrement", async () => {
			setProjectEverSaved();
			list.mockResolvedValue({ projects: [], skipped: [] });
			const { result } = renderHook(() => useRecentProjects(5));

			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(result.current).toMatchObject({ returning: true, total: 0 });
		});

		it("marque le navigateur quand des projets existent déjà sans marqueur", async () => {
			list.mockResolvedValue({
				projects: [projectModifiedOn("p1", "2026-01-01")],
				skipped: [],
			});
			const { result } = renderHook(() => useRecentProjects(5));

			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(result.current).toMatchObject({ returning: true });
			expect(getProjectEverSaved()).toBe(true);
		});
	});
});
