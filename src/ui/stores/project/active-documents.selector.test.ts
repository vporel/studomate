import activeDocumentsManager from "./active-documents.selector";
import type { ProjectStoreState } from "./project.store.types";

const grafcetsManager = { name: "grafcets" };
const laddersManager = { name: "ladders" };
const hmiManager = { name: "hmi" };

function stateWith(activeScopeType: string) {
	return {
		activeScopeType,
		grafcetsManager,
		laddersManager,
		hmiManager,
	} as unknown as ProjectStoreState;
}

describe("activeDocumentsManager", () => {
	it.each([
		["grafcet", grafcetsManager],
		["ladder", laddersManager],
		["hmi", hmiManager],
	])("returns the manager of the %s documents", (scope, manager) => {
		expect(activeDocumentsManager(stateWith(scope))).toBe(manager);
	});

	it("returns null for the project scope", () => {
		expect(activeDocumentsManager(stateWith("project"))).toBeNull();
	});
});
