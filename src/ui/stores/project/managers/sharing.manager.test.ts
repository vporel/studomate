/** @jest-environment jsdom */
import { createProjectStore } from "../project.store";
import { authStore } from "@/ui/stores/auth/auth.store";
import { toast } from "react-toastify";

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
});
