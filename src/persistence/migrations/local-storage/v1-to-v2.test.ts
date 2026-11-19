import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import v1ToV2 from "./v1-to-v2";

describe("layout migration v1 → v2", () => {
	let store: Map<string, string>;
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ store, restore: restoreLocalStorage } = installMemoryLocalStorage());
	});

	afterEach(() => restoreLocalStorage());

	it("starts from layout v1", () => {
		expect(v1ToV2.from).toBe(1);
	});

	it("creates the what's new version key and rewrites the app version key", () => {
		store.set("studomate_app_version", "v1.7.1");

		v1ToV2.migrate();

		expect(store.get("studomate_whats_new_version")).toBe("v1.7.1");
		expect(store.get("studomate_app_version")).toBe("v1.7.2");
	});

	it("creates both keys when none existed", () => {
		v1ToV2.migrate();

		expect(store.get("studomate_whats_new_version")).toBe("v1.7.1");
		expect(store.get("studomate_app_version")).toBe("v1.7.2");
	});

	it("leaves the projects untouched", () => {
		store.set("studomate_projects_data", '{"p1":{"name":"A"}}');
		store.set("studomate_project_p1", '{"id":"p1"}');

		v1ToV2.migrate();

		expect(store.get("studomate_projects_data")).toBe('{"p1":{"name":"A"}}');
		expect(store.get("studomate_project_p1")).toBe('{"id":"p1"}');
	});

	it("can run twice without changing the outcome", () => {
		v1ToV2.migrate();
		v1ToV2.migrate();

		expect(store.get("studomate_whats_new_version")).toBe("v1.7.1");
		expect(store.get("studomate_app_version")).toBe("v1.7.2");
	});
});
