import CartonSortingDescriptor from "@/3d-scenes/carton-sorting/v1/carton-sorting.descriptor";
import { createCartonSortingProject } from "@/templates/carton-sorting.template";
import collectScene3dReferences from "./scene3d-references";
import CrossReferenceCollector from "./cross-reference-collector";

describe("collectScene3dReferences", () => {
	it("returns nothing without a scene", () => {
		const project = createCartonSortingProject();
		project.scene3d = null;
		expect(collectScene3dReferences(project)).toEqual([]);
	});

	it("returns nothing for an unknown scene", () => {
		const project = createCartonSortingProject();
		project.scene3d = {
			sceneId: "nope",
			sceneVersion: 1,
			bindings: { t1: "x" },
		};
		expect(collectScene3dReferences(project)).toEqual([]);
	});

	it("makes a sensor write its variable and an actuator read it", () => {
		const references = collectScene3dReferences(createCartonSortingProject());
		const byVariable = Object.fromEntries(
			references.map((r) => [r.variableName, r]),
		);
		expect(byVariable["cpt_psce_c"]).toMatchObject({
			access: "write",
			programType: "scene3d",
			programId: "carton-sorting@1",
			locationId: "cartonAtStation",
			locationKind: "scene3d-point",
		});
		expect(byVariable["Cmd_T1"]).toMatchObject({
			access: "read",
			locationId: "t1",
		});
	});

	it("skips a binding to a deleted variable", () => {
		const project = createCartonSortingProject();
		project.scene3d!.bindings.t1 = "gone";
		const names = collectScene3dReferences(project).map((r) => r.variableName);
		expect(names).not.toContain("Cmd_T1");
		expect(names).toHaveLength(CartonSortingDescriptor.points.length - 1);
	});

	it("is part of the cross-references of the project", () => {
		const rows = CrossReferenceCollector.collect(createCartonSortingProject());
		const row = rows.find((r) => r.variableName === "cpt_p1_out")!;
		expect(row.references.some((r) => r.programType === "scene3d")).toBe(true);
	});
});
