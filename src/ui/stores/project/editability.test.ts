import {
	canEdit,
	isPageEditingEnabled,
	isPageReadOnly,
	refuseEdit,
} from "./editability";
import { ProjectMode } from "./ProjectMode.enum";
import type { PageData } from "./project.store.types";

const page = (
	id: string,
	type: PageData["type"],
	locked?: boolean,
): PageData => ({ id, type, title: id, ...(locked ? { locked } : {}) });

function state(
	overrides: Partial<{
		mode: ProjectMode;
		editingEnabled: boolean;
		activePageId: string | null;
		pages: PageData[];
	}> = {},
) {
	const pages = overrides.pages ?? [page("g1", "grafcet")];
	return {
		mode: overrides.mode ?? ProjectMode.DESIGN,
		editingEnabled: overrides.editingEnabled ?? true,
		activePageId:
			overrides.activePageId === undefined ? "g1" : overrides.activePageId,
		pagesData: Object.fromEntries(pages.map((p) => [p.id, p])),
	};
}

describe("canEdit", () => {
	it("is true in design mode with editing enabled", () => {
		expect(canEdit(state())).toBe(true);
	});

	it("is false in simulation mode", () => {
		expect(canEdit(state({ mode: ProjectMode.SIMULATION }))).toBe(false);
	});

	it("is false when editing is disabled, even in design mode", () => {
		expect(canEdit(state({ editingEnabled: false }))).toBe(false);
	});

	it("is false when the active page is locked", () => {
		expect(canEdit(state({ pages: [page("g1", "grafcet", true)] }))).toBe(
			false,
		);
	});

	it("follows the active page: a locked page does not lock the others", () => {
		const pages = [page("g1", "grafcet"), page("v1", "variables", true)];
		expect(canEdit(state({ pages, activePageId: "g1" }))).toBe(true);
		expect(canEdit(state({ pages, activePageId: "v1" }))).toBe(false);
	});

	it("is not blocked by a lock when there is no active page", () => {
		expect(canEdit(state({ activePageId: null }))).toBe(true);
	});
});

describe("isPageEditingEnabled", () => {
	it("is false for a locked page and true for the others", () => {
		const s = state({
			pages: [page("g1", "grafcet"), page("v1", "variables", true)],
		});
		expect(isPageEditingEnabled(s, "g1")).toBe(true);
		expect(isPageEditingEnabled(s, "v1")).toBe(false);
	});

	it("is false for every page of a project opened read-only", () => {
		expect(isPageEditingEnabled(state({ editingEnabled: false }), "g1")).toBe(
			false,
		);
	});

	it("is true for a page that is not open", () => {
		expect(isPageEditingEnabled(state(), "unknown")).toBe(true);
	});

	it("does not depend on the mode", () => {
		expect(
			isPageEditingEnabled(state({ mode: ProjectMode.SIMULATION }), "g1"),
		).toBe(true);
	});
});

describe("isPageReadOnly", () => {
	const pages = [
		page("g1", "grafcet"),
		page("l1", "ladder"),
		page("h1", "hmi"),
		page("v1", "variables"),
		page("p1", "preferences"),
	];

	it("is false for every editor in design mode", () => {
		for (const id of ["g1", "l1", "h1", "v1"]) {
			expect(isPageReadOnly(state({ pages }), id)).toBe(false);
		}
	});

	it("is true in simulation for grafcet, ladder and variables", () => {
		const simulation = state({ pages, mode: ProjectMode.SIMULATION });
		for (const id of ["g1", "l1", "v1"]) {
			expect(isPageReadOnly(simulation, id)).toBe(true);
		}
	});

	it("keeps an HMI page editable in simulation", () => {
		expect(
			isPageReadOnly(state({ pages, mode: ProjectMode.SIMULATION }), "h1"),
		).toBe(false);
	});

	it("is true for a locked page, an HMI page included, in any mode", () => {
		const locked = [page("h1", "hmi", true), page("g1", "grafcet", true)];
		for (const mode of [ProjectMode.DESIGN, ProjectMode.SIMULATION]) {
			expect(isPageReadOnly(state({ pages: locked, mode }), "h1")).toBe(true);
			expect(isPageReadOnly(state({ pages: locked, mode }), "g1")).toBe(true);
		}
	});

	it("is true for every editor of a project opened read-only", () => {
		expect(isPageReadOnly(state({ pages, editingEnabled: false }), "h1")).toBe(
			true,
		);
	});

	it("is false for a page that is not an editor", () => {
		expect(
			isPageReadOnly(
				state({ pages, editingEnabled: false, mode: ProjectMode.SIMULATION }),
				"p1",
			),
		).toBe(false);
	});

	it("is false for a page that is not open", () => {
		expect(isPageReadOnly(state({ editingEnabled: false }), "unknown")).toBe(
			false,
		);
	});
});

describe("refuseEdit", () => {
	let warn: jest.SpyInstance;
	beforeEach(() => {
		warn = jest.spyOn(console, "warn").mockImplementation(() => {});
	});
	afterEach(() => warn.mockRestore());

	it("lets an editable project through without warning", () => {
		expect(refuseEdit(state(), "add x")).toBe(false);
		expect(warn).not.toHaveBeenCalled();
	});

	it("refuses in simulation mode and warns", () => {
		expect(refuseEdit(state({ mode: ProjectMode.SIMULATION }), "add x")).toBe(
			true,
		);
		expect(warn).toHaveBeenCalledWith("Cannot add x in non-design mode");
	});

	it("refuses silently on a read-only project", () => {
		expect(refuseEdit(state({ editingEnabled: false }), "add x")).toBe(true);
		expect(warn).not.toHaveBeenCalled();
	});

	it("refuses silently on a locked page", () => {
		expect(
			refuseEdit(state({ pages: [page("g1", "grafcet", true)] }), "add x"),
		).toBe(true);
		expect(warn).not.toHaveBeenCalled();
	});
});
