import { createRandomId } from "@/ids";
import Project, {
	PROJECT_SCHEMA_VERSION,
} from "@/schemas/project/project.schema";
import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import { getHandoff, saveHandoff } from "./handoff.storage";

const NO_PAGES = { pagesOrder: [], activePageId: null };

describe("handoff.storage", () => {
	let store: Map<string, string>;
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ store, restore: restoreLocalStorage } = installMemoryLocalStorage());
	});

	afterEach(() => restoreLocalStorage());

	const newProject = (name: string) => new Project(createRandomId(), name, "");

	it("gives back the project, its template and its locale", () => {
		const project = newProject("Exercice");
		const id = saveHandoff({
			project,
			templateId: "linear-sequence",
			locale: "en",
			pages: NO_PAGES,
		});

		const handoff = getHandoff(id!);

		expect(handoff!.project.id).toBe(project.id);
		expect(handoff!.project.name).toBe("Exercice");
		expect(handoff!.templateId).toBe("linear-sequence");
		expect(handoff!.locale).toBe("en");
	});

	it("keeps the entry after reading it", () => {
		const id = saveHandoff({
			project: newProject("A"),
			templateId: null,
			locale: "fr",
			pages: NO_PAGES,
		});

		getHandoff(id!);

		expect(getHandoff(id!)).not.toBeNull();
	});

	it("is replaced by the next handoff, which makes the previous token unknown", () => {
		const first = saveHandoff({
			project: newProject("A"),
			templateId: null,
			locale: "fr",
			pages: NO_PAGES,
		});
		const second = saveHandoff({
			project: newProject("B"),
			templateId: null,
			locale: "fr",
			pages: NO_PAGES,
		});

		expect(getHandoff(first!)).toBeNull();
		expect(getHandoff(second!)!.project.name).toBe("B");
	});

	it("returns null for an unknown token or an empty storage", () => {
		expect(getHandoff("nope")).toBeNull();
	});

	it("returns null when the stored project cannot be read", () => {
		const id = saveHandoff({
			project: newProject("A"),
			templateId: null,
			locale: "fr",
			pages: NO_PAGES,
		})!;
		const entry = JSON.parse(store.get("studomate_handoff")!);
		store.set(
			"studomate_handoff",
			JSON.stringify({ ...entry, data: "{ not json" }),
		);

		expect(getHandoff(id)).toBeNull();
	});

	it("returns null for a project written by a newer version", () => {
		const id = saveHandoff({
			project: newProject("A"),
			templateId: null,
			locale: "fr",
			pages: NO_PAGES,
		})!;
		const entry = JSON.parse(store.get("studomate_handoff")!);
		const data = JSON.parse(entry.data);
		store.set(
			"studomate_handoff",
			JSON.stringify({
				...entry,
				data: JSON.stringify({
					...data,
					schemaVersion: PROJECT_SCHEMA_VERSION + 1,
				}),
			}),
		);

		expect(getHandoff(id)).toBeNull();
	});

	it("returns null when the stored locale is unknown", () => {
		const id = saveHandoff({
			project: newProject("A"),
			templateId: null,
			locale: "fr",
			pages: NO_PAGES,
		})!;
		const entry = JSON.parse(store.get("studomate_handoff")!);
		store.set("studomate_handoff", JSON.stringify({ ...entry, locale: "xx" }));

		expect(getHandoff(id)).toBeNull();
	});

	it("returns null instead of throwing when the storage refuses the write", () => {
		restoreLocalStorage();
		({ store, restore: restoreLocalStorage } = installMemoryLocalStorage({
			onSetItem: () => {
				throw new DOMException("full", "QuotaExceededError");
			},
		}));

		expect(
			saveHandoff({
				project: newProject("A"),
				templateId: null,
				locale: "fr",
				pages: NO_PAGES,
			}),
		).toBeNull();
	});

	it("gives back the tabs that were open", () => {
		const pages = { pagesOrder: ["g1", "g2"], activePageId: "g2" };
		const id = saveHandoff({
			project: newProject("A"),
			templateId: null,
			locale: "fr",
			pages,
		});

		expect(getHandoff(id!)!.pages).toEqual(pages);
	});

	it("reads an entry without tabs as no open tab", () => {
		const id = saveHandoff({
			project: newProject("A"),
			templateId: null,
			locale: "fr",
			pages: NO_PAGES,
		})!;
		const { pages: _pages, ...entry } = JSON.parse(
			store.get("studomate_handoff")!,
		);
		store.set("studomate_handoff", JSON.stringify(entry));

		expect(getHandoff(id)!.pages).toEqual(NO_PAGES);
	});

	it("drops the tab ids that are not strings", () => {
		const id = saveHandoff({
			project: newProject("A"),
			templateId: null,
			locale: "fr",
			pages: NO_PAGES,
		})!;
		const entry = JSON.parse(store.get("studomate_handoff")!);
		store.set(
			"studomate_handoff",
			JSON.stringify({
				...entry,
				pages: { pagesOrder: ["g1", 3, null], activePageId: 7 },
			}),
		);

		expect(getHandoff(id)!.pages).toEqual({
			pagesOrder: ["g1"],
			activePageId: null,
		});
	});
});
