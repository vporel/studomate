/** @jest-environment jsdom */
import {
	getStoredCloudProjectIds,
	setStoredCloudProjectIds,
} from "./cloud-project-ids.storage";

describe("cloud-project-ids.storage", () => {
	beforeEach(() => {
		localStorage.clear();
		jest.restoreAllMocks();
	});

	it("returns no id when nothing is stored", () => {
		expect(getStoredCloudProjectIds()).toEqual([]);
	});

	it("reads back the stored ids", () => {
		expect(setStoredCloudProjectIds(["a", "b"])).toBe(true);

		expect(getStoredCloudProjectIds()).toEqual(["a", "b"]);
	});

	it("keeps the ids under the studomate_ key", () => {
		setStoredCloudProjectIds(["a"]);

		expect(
			JSON.parse(localStorage.getItem("studomate_cloud_project_ids")!),
		).toEqual(["a"]);
	});

	it("returns no id for a value that is not an array", () => {
		localStorage.setItem("studomate_cloud_project_ids", '{"a":1}');

		expect(getStoredCloudProjectIds()).toEqual([]);
	});

	it("returns no id for corrupted JSON", () => {
		localStorage.setItem("studomate_cloud_project_ids", "{oops");

		expect(getStoredCloudProjectIds()).toEqual([]);
	});

	it("reports a refused write and logs it, without throwing", () => {
		const error = jest.spyOn(console, "error").mockImplementation(() => {});
		jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new DOMException("full", "QuotaExceededError");
		});

		expect(setStoredCloudProjectIds(["a"])).toBe(false);
		expect(error).toHaveBeenCalled();
	});

	it("can store an empty list", () => {
		setStoredCloudProjectIds(["a"]);
		setStoredCloudProjectIds([]);

		expect(getStoredCloudProjectIds()).toEqual([]);
	});
});
