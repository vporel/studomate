import { PageData, ProjectStoreState } from "../project.store";
import PagesManager from "./pages.manager";

const mockSetPagesSession = jest.fn();
const mockSetActivePageIdInUrl = jest.fn();

jest.mock("@/ui/lib/pages-session-storage", () => ({
	setPagesSession: (...args: unknown[]) => mockSetPagesSession(...args),
}));
jest.mock("@/ui/lib/pages-url", () => ({
	setActivePageIdInUrl: (...args: unknown[]) => mockSetActivePageIdInUrl(...args),
}));

/**
 * Ces tests tournent sans zustand ni React : le manager ne reçoit qu'un `get`/`set`.
 */
function makeManager(
	initial: { pagesOrder?: string[]; pagesData?: Record<string, PageData>; activePageId?: string | null },
	projectId: string | null = "p1",
) {
	let state = {
		project: projectId ? { id: projectId } : null,
		pagesOrder: initial.pagesOrder ?? [],
		pagesData: initial.pagesData ?? {},
		activePageId: initial.activePageId ?? null,
		setActiveScope: jest.fn(),
	} as unknown as ProjectStoreState;

	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...patch } as ProjectStoreState;
	};
	const get = () => state;

	return { manager: new PagesManager(set, get), getState: () => state };
}

function page(id: string): PageData {
	return { id, type: "grafcet", title: id };
}

describe("PagesManager", () => {
	afterEach(() => jest.clearAllMocks());

	describe("openPage", () => {
		it("ajoute la page en fin d'ordre et l'active", () => {
			const { manager, getState } = makeManager({ pagesOrder: ["a"], pagesData: { a: page("a") } });

			manager.openPage(page("b"));

			expect(getState().pagesOrder).toEqual(["a", "b"]);
			expect(getState().activePageId).toBe("b");
		});

		// L'ordre est explicite : rouvrir ne doit pas déplacer la page
		it("ne réordonne pas une page déjà ouverte", () => {
			const { manager, getState } = makeManager({
				pagesOrder: ["a", "b", "c"],
				pagesData: { a: page("a"), b: page("b"), c: page("c") },
			});

			manager.openPage(page("a"));

			expect(getState().pagesOrder).toEqual(["a", "b", "c"]);
			expect(getState().activePageId).toBe("a");
		});

		// Sans cela, les raccourcis clavier et l'annulation restaient sur la page précédente
		it("met à jour le scope actif même quand la page est déjà ouverte", () => {
			const { manager, getState } = makeManager({
				pagesOrder: ["a", "b"],
				pagesData: { a: page("a"), b: page("b") },
				activePageId: "b",
			});

			manager.openPage(page("a"));

			expect(getState().setActiveScope).toHaveBeenCalledWith("a");
		});
	});

	describe("closePage", () => {
		it("retire la page de l'ordre et des données", () => {
			const { manager, getState } = makeManager({
				pagesOrder: ["a", "b"],
				pagesData: { a: page("a"), b: page("b") },
			});

			manager.closePage("a");

			expect(getState().pagesOrder).toEqual(["b"]);
			expect(getState().pagesData.a).toBeUndefined();
		});

		it("active la page précédente quand on ferme la page active", () => {
			const { manager, getState } = makeManager({
				pagesOrder: ["a", "b", "c"],
				pagesData: { a: page("a"), b: page("b"), c: page("c") },
				activePageId: "b",
			});

			manager.closePage("b");

			expect(getState().activePageId).toBe("a");
		});

		it("active la suivante quand on ferme la première", () => {
			const { manager, getState } = makeManager({
				pagesOrder: ["a", "b"],
				pagesData: { a: page("a"), b: page("b") },
				activePageId: "a",
			});

			manager.closePage("a");

			expect(getState().activePageId).toBe("b");
		});

		it("ne change pas la page active si ce n'est pas elle qu'on ferme", () => {
			const { manager, getState } = makeManager({
				pagesOrder: ["a", "b"],
				pagesData: { a: page("a"), b: page("b") },
				activePageId: "a",
			});

			manager.closePage("b");

			expect(getState().activePageId).toBe("a");
		});

		it("n'active plus rien quand on ferme la dernière page", () => {
			const { manager, getState } = makeManager({
				pagesOrder: ["a"],
				pagesData: { a: page("a") },
				activePageId: "a",
			});

			manager.closePage("a");

			expect(getState().activePageId).toBeNull();
		});

		it("ignore une page non ouverte", () => {
			const { manager, getState } = makeManager({ pagesOrder: ["a"], pagesData: { a: page("a") } });

			manager.closePage("inexistante");

			expect(getState().pagesOrder).toEqual(["a"]);
		});
	});

	describe("setActivePage", () => {
		it("refuse une page non ouverte", () => {
			const { manager } = makeManager({ pagesOrder: ["a"], pagesData: { a: page("a") } });

			expect(() => manager.setActivePage("inexistante")).toThrow();
		});
	});

	describe("persistance de la session (localStorage + URL)", () => {
		it("openPage enregistre la session et pose activePage dans l'URL", () => {
			const { manager } = makeManager({ pagesOrder: ["a"], pagesData: { a: page("a") } });

			manager.openPage(page("b"));

			expect(mockSetPagesSession).toHaveBeenCalledWith("p1", { pagesOrder: ["a", "b"], activePageId: "b" });
			expect(mockSetActivePageIdInUrl).toHaveBeenCalledWith("b");
		});

		it("closePage enregistre la session même quand la page active ne change pas", () => {
			const { manager } = makeManager({
				pagesOrder: ["a", "b"],
				pagesData: { a: page("a"), b: page("b") },
				activePageId: "a",
			});

			manager.closePage("b");

			expect(mockSetPagesSession).toHaveBeenCalledWith("p1", { pagesOrder: ["a"], activePageId: "a" });
			expect(mockSetActivePageIdInUrl).toHaveBeenCalledWith("a");
		});

		it("setActivePage enregistre la session", () => {
			const { manager } = makeManager({
				pagesOrder: ["a", "b"],
				pagesData: { a: page("a"), b: page("b") },
				activePageId: "a",
			});

			manager.setActivePage("b");

			expect(mockSetPagesSession).toHaveBeenCalledWith("p1", { pagesOrder: ["a", "b"], activePageId: "b" });
			expect(mockSetActivePageIdInUrl).toHaveBeenCalledWith("b");
		});

		it("ne persiste rien sans projet ouvert", () => {
			const { manager } = makeManager({ pagesOrder: ["a"], pagesData: { a: page("a") } }, null);

			manager.closePage("a");

			expect(mockSetPagesSession).not.toHaveBeenCalled();
			expect(mockSetActivePageIdInUrl).not.toHaveBeenCalled();
		});
	});
});
