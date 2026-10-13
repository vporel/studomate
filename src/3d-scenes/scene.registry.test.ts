import { getSceneDescriptor, listScenes } from "./scene.registry";

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
		expect(getSceneDescriptor("carton-sorting")?.id).toBe("carton-sorting");
		expect(getSceneDescriptor("crossroads")?.id).toBe("crossroads");
		expect(getSceneDescriptor("drilling")?.id).toBe("drilling");
		expect(getSceneDescriptor("elevator")?.id).toBe("elevator");
		expect(getSceneDescriptor("unknown")).toBeUndefined();
	});
});
