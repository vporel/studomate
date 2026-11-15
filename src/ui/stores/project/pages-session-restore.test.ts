import type Project from "@/schemas/project/project.schema";
import type { ProjectStorePersistence } from "./environment/project-store-environment";
import { restorePagesSession } from "./pages-session-restore";
import { SCENE3D_VIEW_PAGE_DATA, SCENE3D_VIEW_PAGE_ID } from "./pages-data";
import type {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "./project.store.types";

function setup({ hasScene }: { hasScene: boolean }) {
	const openPage = jest.fn();
	const project = {
		id: "p1",
		scene3d: hasScene ? { sceneId: "parking" } : undefined,
		getProgram: () => undefined,
		getHmiPage: () => undefined,
	} as unknown as Project;
	const pagesSession = {
		get: () => ({
			pagesOrder: [SCENE3D_VIEW_PAGE_ID],
			activePageId: SCENE3D_VIEW_PAGE_ID,
		}),
		set: jest.fn(),
	} as unknown as ProjectStorePersistence["pagesSession"];
	const set: ProjectStoreSetFunction = jest.fn();
	const get = (() => ({
		pagesManager: { openPage },
	})) as unknown as ProjectStoreGetFunction;
	restorePagesSession(set, get, project, null, pagesSession);
	return { openPage, set };
}

describe("restorePagesSession, page of the 3D scene", () => {
	it("reopens the page of the scene of a project that has one", () => {
		const { openPage } = setup({ hasScene: true });
		expect(openPage).toHaveBeenCalledWith(SCENE3D_VIEW_PAGE_DATA);
	});

	it("does not reopen it once the scene was removed from the project", () => {
		const { openPage, set } = setup({ hasScene: false });
		expect(openPage).not.toHaveBeenCalled();
		expect(set).toHaveBeenLastCalledWith(expect.any(Function));
		const restored = (set as jest.Mock).mock.calls.at(-1)![0]();
		expect(restored.pagesOrder).not.toContain(SCENE3D_VIEW_PAGE_ID);
	});
});
