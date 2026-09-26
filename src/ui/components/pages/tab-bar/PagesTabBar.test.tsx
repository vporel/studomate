/**
 * @jest-environment jsdom
 */
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import PagesTabBar, {
	edgeFadeMask,
	reorderTabIds,
	restrictToHorizontalAxis,
} from "./PagesTabBar";

jest.mock("@/ui/components/projects/ProjectContext");

function setup({
	activePageId = "p1",
	setActivePage = jest.fn(),
	reorderPages = jest.fn(),
}: {
	activePageId?: string;
	setActivePage?: jest.Mock;
	reorderPages?: jest.Mock;
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			pagesManager: { setActivePage, reorderPages },
			activePageId,
			project: { ladders: {} },
			pagesData: {
				p1: { title: "Grafcet 1", type: "grafcet" },
				p2: { title: "Variables", type: "variables" },
				p3: { title: "HMI", type: "hmi" },
			},
			pagesOrder: ["p1", "p2", "p3"],
		}),
	);
	renderWithI18n(<PagesTabBar />);
	return { setActivePage, reorderPages };
}

describe("edgeFadeMask", () => {
	it("ne renvoie aucun masque quand rien ne déborde", () => {
		expect(edgeFadeMask(false, false)).toBeUndefined();
	});

	it("estompe uniquement le bord qui déborde", () => {
		expect(edgeFadeMask(true, false)).toBe(
			"linear-gradient(to right, transparent, black 28px, black)",
		);
		expect(edgeFadeMask(false, true)).toBe(
			"linear-gradient(to right, black, black calc(100% - 28px), transparent)",
		);
	});

	it("estompe les deux bords quand des onglets sont cachés de chaque côté", () => {
		expect(edgeFadeMask(true, true)).toBe(
			"linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)",
		);
	});
});

describe("PagesTabBar — accessibilité des onglets", () => {
	it("expose une tablist et des onglets avec aria-selected", () => {
		setup({ activePageId: "p1" });

		expect(
			screen.getByRole("tablist", { name: "Onglets ouverts" }),
		).toBeInTheDocument();

		const tabs = screen.getAllByRole("tab");
		expect(tabs).toHaveLength(3);
		expect(screen.getByRole("tab", { name: /Grafcet 1/ })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getByRole("tab", { name: /Variables/ })).toHaveAttribute(
			"aria-selected",
			"false",
		);
	});

	it("active l'onglet sur Entrée et Espace", () => {
		const { setActivePage } = setup({ activePageId: "p1" });
		const variablesTab = screen.getByRole("tab", { name: /Variables/ });

		fireEvent.keyDown(variablesTab, { key: "Enter" });
		fireEvent.keyDown(variablesTab, { key: " " });

		expect(setActivePage).toHaveBeenCalledTimes(2);
		expect(setActivePage).toHaveBeenCalledWith("p2");
	});
});

describe("reorderTabIds", () => {
	const ids = ["a", "b", "c"];

	it("déplace l'onglet vers la position de l'onglet survolé", () => {
		expect(reorderTabIds(ids, "a", "c")).toEqual(["b", "c", "a"]);
		expect(reorderTabIds(ids, "c", "a")).toEqual(["c", "a", "b"]);
		expect(reorderTabIds(ids, "a", "b")).toEqual(["b", "a", "c"]);
	});

	it("renvoie null quand l'ordre ne change pas", () => {
		expect(reorderTabIds(ids, "b", "b")).toBeNull();
		expect(reorderTabIds(ids, "b", null)).toBeNull();
	});

	it("renvoie null pour un id inconnu", () => {
		expect(reorderTabIds(ids, "x", "a")).toBeNull();
		expect(reorderTabIds(ids, "a", "x")).toBeNull();
	});
});

describe("restrictToHorizontalAxis", () => {
	it("annule le déplacement vertical et conserve le reste", () => {
		const result = restrictToHorizontalAxis({
			transform: { x: 42, y: 30, scaleX: 1, scaleY: 1 },
		} as Parameters<typeof restrictToHorizontalAxis>[0]);
		expect(result).toEqual({ x: 42, y: 0, scaleX: 1, scaleY: 1 });
	});
});

describe("PagesTabBar : réordonnancement par glisser-déposer", () => {
	const TAB_WIDTH = 100;
	const TAB_HEIGHT = 35;
	let rectSpy: jest.SpyInstance;

	// jsdom has no PointerEvent: without it, fireEvent.pointer* carry no clientX/clientY
	beforeAll(() => {
		if (typeof window.PointerEvent === "undefined") {
			class PointerEventPolyfill extends MouseEvent {
				isPrimary: boolean;
				constructor(type: string, init: PointerEventInit = {}) {
					super(type, init);
					this.isPrimary = init.isPrimary ?? true;
				}
			}
			window.PointerEvent = PointerEventPolyfill as typeof PointerEvent;
		}
	});

	// jsdom has no layout: each tab gets a rect from its index in the row
	beforeEach(() => {
		rectSpy = jest
			.spyOn(HTMLElement.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: HTMLElement) {
				const tab = this.closest<HTMLElement>("[data-page-id]");
				const index = tab
					? ["p1", "p2", "p3"].indexOf(tab.dataset.pageId!)
					: 0;
				const left = index * TAB_WIDTH;
				return {
					x: left,
					y: 0,
					left,
					top: 0,
					right: left + TAB_WIDTH,
					bottom: TAB_HEIGHT,
					width: TAB_WIDTH,
					height: TAB_HEIGHT,
					toJSON: () => ({}),
				} as DOMRect;
			});
	});

	afterEach(() => {
		rectSpy.mockRestore();
	});

	function tabElement(pageId: string) {
		return document.querySelector<HTMLElement>(`[data-page-id="${pageId}"]`)!;
	}

	function pointer(
		type: "pointerDown" | "pointerMove" | "pointerUp",
		target: Element | Document,
		clientX: number,
		clientY: number,
	) {
		act(() => {
			fireEvent[type](target, {
				clientX,
				clientY,
				isPrimary: true,
				button: 0,
			});
		});
	}

	function drag(
		pageId: string,
		from: { x: number; y: number },
		to: { x: number; y: number },
	) {
		pointer("pointerDown", tabElement(pageId), from.x, from.y);
		pointer("pointerMove", document, from.x + 10, from.y);
		pointer("pointerMove", document, to.x, to.y);
	}

	it("réordonne les onglets quand on dépose un onglet sur un autre", () => {
		const { reorderPages, setActivePage } = setup();

		drag("p1", { x: 50, y: 17 }, { x: 250, y: 17 });
		pointer("pointerUp", document, 250, 17);

		expect(reorderPages).toHaveBeenCalledWith(["p2", "p3", "p1"]);
		expect(setActivePage).not.toHaveBeenCalled();
	});

	it("ne déplace l'onglet glissé que sur l'axe horizontal", () => {
		setup();

		drag("p1", { x: 50, y: 17 }, { x: 130, y: 200 });

		expect(tabElement("p1").style.transform).toMatch(
			/^translate3d\(80px, 0px, 0\)/,
		);
	});

	it("ne réordonne pas pour un déplacement sous le seuil d'activation", () => {
		const { reorderPages } = setup();

		pointer("pointerDown", tabElement("p1"), 50, 17);
		pointer("pointerMove", document, 53, 17);
		pointer("pointerUp", document, 53, 17);

		expect(reorderPages).not.toHaveBeenCalled();
	});
});
