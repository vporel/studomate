/** @jest-environment jsdom */
import {
	getStoredScene3dSessionId,
	setStoredScene3dSessionId,
} from "./scene3d-session.storage";

describe("scene3d-session.storage", () => {
	beforeEach(() => {
		sessionStorage.clear();
		jest.restoreAllMocks();
	});

	it("returns null when nothing is stored", () => {
		expect(getStoredScene3dSessionId()).toBeNull();
	});

	it("reads back the stored id", () => {
		setStoredScene3dSessionId("abc");

		expect(getStoredScene3dSessionId()).toBe("abc");
	});

	it("keeps the id under a studomate_ key of sessionStorage, not localStorage", () => {
		setStoredScene3dSessionId("abc");

		expect(sessionStorage.getItem("studomate_3d_scene_session")).toBe("abc");
		expect(localStorage.getItem("studomate_3d_scene_session")).toBeNull();
	});

	it("replaces a previous id", () => {
		setStoredScene3dSessionId("first");
		setStoredScene3dSessionId("second");

		expect(getStoredScene3dSessionId()).toBe("second");
	});

	it("returns null and does not throw when the storage refuses a read", () => {
		jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("denied");
		});

		expect(getStoredScene3dSessionId()).toBeNull();
	});

	it("does not throw when the storage refuses a write", () => {
		jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("quota");
		});

		expect(() => setStoredScene3dSessionId("abc")).not.toThrow();
	});
});
