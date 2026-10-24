/** @jest-environment jsdom */
import { createProjectStore } from "../project.store";
import { authStore } from "@/ui/stores/auth/auth.store";
import { toast } from "react-toastify";
import HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";

jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));

/** Ouvre un projet vierge : `newProject()` n'ouvre plus que la modale, c'est `newProjectFromTemplate(null)` qui crée réellement. */
async function openBlankProject(store: ReturnType<typeof createProjectStore>) {
	await store.getState().lifecycleManager.newProjectFromTemplate(null);
}

describe("ProjectSharingManager", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		jest.restoreAllMocks();
		jest.mocked(toast.error).mockClear();
		authStore.setState({
			user: null,
			ui: { authModalVisible: false, authModalPrompt: null },
		});
	});

	it("ne fait rien si aucun projet n'est ouvert", async () => {
		const store = createProjectStore();
		await expect(
			store.getState().sharingManager.shareProject(),
		).resolves.not.toThrow();
	});

	it("ouvre la modale de connexion quand l'utilisateur n'est pas connecté", async () => {
		const store = createProjectStore();
		await openBlankProject(store);

		await store.getState().sharingManager.shareProject();

		expect(authStore.getState().ui.authModalVisible).toBe(true);
		expect(authStore.getState().ui.authModalPrompt).toMatch(/partager/i);
		expect(store.getState().pendingShareAfterAuth).toBe(true);
	});

	it("reprend le partage automatiquement après connexion (projet local → modale cloud)", async () => {
		const store = createProjectStore();
		await openBlankProject(store);
		await store.getState().sharingManager.shareProject();

		authStore.setState({
			user: { id: "u1" } as never,
			ui: { authModalVisible: false, authModalPrompt: null },
		});
		await Promise.resolve();

		expect(store.getState().pendingShareAfterAuth).toBe(false);
		expect(store.getState().ui.shareRequiresCloudModalVisible).toBe(true);
	});

	it("abandonne la reprise si la modale de connexion se ferme sans connexion", async () => {
		const store = createProjectStore();
		await openBlankProject(store);
		await store.getState().sharingManager.shareProject();

		authStore.getState().setAuthModalVisible(false);

		expect(store.getState().pendingShareAfterAuth).toBe(false);
		expect(store.getState().ui.shareRequiresCloudModalVisible).toBe(false);
	});

	it("connecté + projet local : ouvre la modale « envoyer dans le cloud »", async () => {
		authStore.setState({ user: { id: "u1" } as never });
		const store = createProjectStore();
		await openBlankProject(store);

		await store.getState().sharingManager.shareProject();

		expect(store.getState().ui.shareRequiresCloudModalVisible).toBe(true);
		expect(store.getState().ui.shareModalVisible).toBe(false);
	});

	it("moveToCloudAndShare : toast d'erreur si l'envoi cloud échoue", async () => {
		authStore.setState({ user: { id: "u1" } as never });
		const store = createProjectStore();
		await openBlankProject(store);
		store.getState().setShareRequiresCloudModalVisible(true);
		jest
			.spyOn(store.getState().projectRepository as never, "moveToCloud")
			.mockResolvedValue({ ok: false, reason: "network" } as never);

		await store.getState().sharingManager.moveToCloudAndShare();

		expect(toast.error).toHaveBeenCalled();
		// La modale reste ouverte pour permettre une nouvelle tentative
		expect(store.getState().ui.shareRequiresCloudModalVisible).toBe(true);
	});

	describe("connecté, projet dans le cloud", () => {
		async function openCloudProject() {
			authStore.setState({ user: { id: "u1" } as never });
			const store = createProjectStore();
			await openBlankProject(store);
			const repo = store.getState()
				.projectRepository as HybridProjectRepository;
			jest.spyOn(repo, "locationOf").mockReturnValue("cloud");
			return { store, repo };
		}

		it("réutilise le token existant sans en créer un nouveau", async () => {
			const { store, repo } = await openCloudProject();
			jest.spyOn(repo, "getShareToken").mockResolvedValue("tok-existant");
			const create = jest.spyOn(repo, "createShareToken");

			await store.getState().sharingManager.shareProject();

			expect(create).not.toHaveBeenCalled();
			expect(store.getState().shareToken).toBe("tok-existant");
			expect(store.getState().ui.shareModalVisible).toBe(true);
		});

		it("crée un token quand il n'y en a pas et ouvre la modale de partage", async () => {
			const { store, repo } = await openCloudProject();
			jest.spyOn(repo, "getShareToken").mockResolvedValue(null);
			const create = jest
				.spyOn(repo, "createShareToken")
				.mockResolvedValue({ ok: true, token: "tok-neuf" } as never);

			await store.getState().sharingManager.shareProject();

			expect(create).toHaveBeenCalledWith(store.getState().project!.id);
			expect(store.getState().shareToken).toBe("tok-neuf");
			expect(store.getState().ui.shareModalVisible).toBe(true);
		});

		it("toast d'erreur et pas de modale si la création du token échoue", async () => {
			const { store, repo } = await openCloudProject();
			jest.spyOn(repo, "getShareToken").mockResolvedValue(null);
			jest
				.spyOn(repo, "createShareToken")
				.mockResolvedValue({ ok: false, reason: "network" } as never);

			await store.getState().sharingManager.shareProject();

			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(store.getState().shareToken).toBeNull();
			expect(store.getState().ui.shareModalVisible).toBe(false);
		});

		it("unshareProject : le token est supprimé en cas de succès", async () => {
			const { store, repo } = await openCloudProject();
			store.setState({ shareToken: "tok" });
			const del = jest
				.spyOn(repo, "deleteShareToken")
				.mockResolvedValue({ ok: true });

			await store.getState().sharingManager.unshareProject();

			expect(del).toHaveBeenCalledWith(store.getState().project!.id);
			expect(store.getState().shareToken).toBeNull();
			expect(toast.error).not.toHaveBeenCalled();
		});

		it("unshareProject : toast d'erreur et token conservé en cas d'échec", async () => {
			const { store, repo } = await openCloudProject();
			store.setState({ shareToken: "tok" });
			jest
				.spyOn(repo, "deleteShareToken")
				.mockResolvedValue({ ok: false, reason: "network" } as never);

			await store.getState().sharingManager.unshareProject();

			expect(toast.error).toHaveBeenCalledTimes(1);
			expect(store.getState().shareToken).toBe("tok");
		});

		it("moveToCloudAndShare : ferme la modale cloud puis partage en cas de succès", async () => {
			const { store, repo } = await openCloudProject();
			store.getState().setShareRequiresCloudModalVisible(true);
			jest.spyOn(repo, "moveToCloud").mockResolvedValue({ ok: true } as never);
			jest.spyOn(repo, "getShareToken").mockResolvedValue("tok-cloud");

			await store.getState().sharingManager.moveToCloudAndShare();

			expect(store.getState().ui.shareRequiresCloudModalVisible).toBe(false);
			expect(store.getState().shareToken).toBe("tok-cloud");
			expect(store.getState().ui.shareModalVisible).toBe(true);
			expect(toast.error).not.toHaveBeenCalled();
		});

		it("moveToCloudAndShare : toast de conflit, pas de partage", async () => {
			const { store, repo } = await openCloudProject();
			store.getState().setShareRequiresCloudModalVisible(true);
			jest
				.spyOn(repo, "moveToCloud")
				.mockResolvedValue({ ok: false, reason: "conflict" } as never);
			const getToken = jest.spyOn(repo, "getShareToken");

			await store.getState().sharingManager.moveToCloudAndShare();

			expect(toast.error).toHaveBeenCalledWith(
				expect.stringMatching(/existe déjà/),
			);
			expect(getToken).not.toHaveBeenCalled();
			expect(store.getState().ui.shareModalVisible).toBe(false);
			expect(store.getState().ui.shareRequiresCloudModalVisible).toBe(true);
		});
	});

	it("unshareProject et moveToCloudAndShare ne font rien sans projet ouvert", async () => {
		const store = createProjectStore();

		await store.getState().sharingManager.unshareProject();
		await store.getState().sharingManager.moveToCloudAndShare();

		expect(toast.error).not.toHaveBeenCalled();
	});
});
