import fs from "fs";
import path from "path";
import {
	getSceneDescriptor,
	getSceneModel,
	listSceneVersions,
	listScenes,
} from "./scene.registry";

describe("scene registry", () => {
	it("has unique scene ids", () => {
		const ids = listScenes().map((scene) => scene.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("has unique point ids and suggested mnemonics inside each scene", () => {
		for (const scene of listScenes()) {
			const ids = scene.points.map((p) => p.id);
			const mnemonics = scene.points.map((p) => p.suggestedMnemonic);
			expect(new Set(ids).size).toBe(ids.length);
			expect(new Set(mnemonics).size).toBe(mnemonics.length);
		}
	});

	it("finds a scene by id and returns undefined for an unknown one", () => {
		expect(getSceneDescriptor("carton-sorting", 1)?.id).toBe("carton-sorting");
		expect(getSceneDescriptor("crossroads", 1)?.id).toBe("crossroads");
		expect(getSceneDescriptor("drilling", 1)?.id).toBe("drilling");
		expect(getSceneDescriptor("elevator", 1)?.id).toBe("elevator");
		expect(getSceneDescriptor("parking", 1)?.id).toBe("parking");
		expect(getSceneDescriptor("unknown", 1)).toBeUndefined();
	});

	it("resolves a scene by id and version, and rejects an unknown version", () => {
		expect(getSceneDescriptor("elevator", 1)?.version).toBe(1);
		expect(getSceneDescriptor("elevator", 99)).toBeUndefined();
		expect(getSceneModel("elevator", 1)).toBeDefined();
		expect(getSceneModel("elevator", 99)).toBeUndefined();
	});

	it("lists one entry per scene id", () => {
		const ids = listScenes().map((scene) => scene.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids.length).toBeGreaterThan(0);
	});

	it("starts every scene at a positive integer version", () => {
		for (const scene of listScenes()) {
			expect(Number.isInteger(scene.version)).toBe(true);
			expect(scene.version).toBeGreaterThanOrEqual(1);
		}
	});

	it("lists the released versions of a scene, empty for an unknown one", () => {
		expect(listSceneVersions("elevator")).toEqual([1]);
		expect(listSceneVersions("unknown")).toEqual([]);
	});

	it("gives every version a screenshot that exists in public/", () => {
		for (const scene of listScenes()) {
			expect(
				fs.existsSync(path.join(process.cwd(), "public", scene.imageUrl)),
			).toBe(true);
		}
	});
});
