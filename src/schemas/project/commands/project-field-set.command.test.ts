import { Scene3d } from "@/schemas/3d-scene/scene3d.schema";
import { HardwareTarget } from "@/schemas/hardware/hardware-target.schema";
import Project from "../project.schema";
import ProjectFieldSetCommand from "./project-field-set.command";

const sceneA: Scene3d = { sceneId: "a", bindings: {} };
const sceneB: Scene3d = { sceneId: "b", bindings: { p: "v1" } };
const bare: HardwareTarget = { modelId: "arduino-uno-r3" };
const configured: HardwareTarget = {
	modelId: "arduino-uno-r3",
	pins: { "%PD2": { inverted: true } },
};

describe("ProjectFieldSetCommand", () => {
	it("applies the new value and restores the old one on cancel", () => {
		const project = new Project("p1", "Ancien", "Alice");
		const command = new ProjectFieldSetCommand({
			field: "name",
			newValue: "Nouveau",
			oldValue: "Ancien",
		});

		const [result, valid] = command.execute(project);
		expect(valid).toBe(true);
		expect(result.name).toBe("Nouveau");
		expect(command.cancel(project).name).toBe("Ancien");
	});

	it("only touches its own field", () => {
		const project = new Project("p1", "Projet", "Alice");
		new ProjectFieldSetCommand({
			field: "author",
			newValue: "Bob",
			oldValue: "Alice",
		}).execute(project);

		expect(project.name).toBe("Projet");
	});

	it("restores an absent value (undefined) on cancel", () => {
		const project = new Project("p1", "Projet", "");
		project.author = undefined;
		const command = new ProjectFieldSetCommand({
			field: "author",
			newValue: "Bob",
			oldValue: undefined,
		});
		command.execute(project);
		expect(command.cancel(project).author).toBeUndefined();
	});

	it("sets, removes and restores the exercise", () => {
		const project = new Project("p1", "Projet", "");
		project.exercise = { statement: "A" };
		const command = new ProjectFieldSetCommand({
			field: "exercise",
			newValue: undefined,
			oldValue: { statement: "A" },
		});
		expect(command.execute(project)[0].exercise).toBeUndefined();
		expect(command.cancel(project).exercise).toEqual({ statement: "A" });
	});

	it("sets, removes and restores the 3D scene", () => {
		const project = new Project("p1", "Projet", "");
		const set = new ProjectFieldSetCommand({
			field: "scene3d",
			newValue: sceneA,
			oldValue: undefined,
		});
		expect(set.execute(project)[0].scene3d).toBe(sceneA);
		expect(set.cancel(project).scene3d).toBeUndefined();

		project.scene3d = sceneA;
		const remove = new ProjectFieldSetCommand({
			field: "scene3d",
			newValue: null,
			oldValue: sceneA,
		});
		expect(remove.execute(project)[0].scene3d).toBeNull();
		expect(remove.cancel(project).scene3d).toBe(sceneA);

		const swap = new ProjectFieldSetCommand({
			field: "scene3d",
			newValue: sceneB,
			oldValue: sceneA,
		});
		expect(swap.execute(project)[0].scene3d).toBe(sceneB);
	});

	it("sets and restores the hardware target", () => {
		const project = new Project("p1", "Projet", "");
		project.hardwareTarget = bare;
		const command = new ProjectFieldSetCommand({
			field: "hardwareTarget",
			newValue: configured,
			oldValue: bare,
		});
		expect(command.execute(project)[0].hardwareTarget).toBe(configured);
		expect(command.cancel(project).hardwareTarget).toBe(bare);
	});

	it("derives its type from the field", () => {
		expect(
			new ProjectFieldSetCommand({
				field: "scene3d",
				newValue: null,
				oldValue: null,
			}).getType(),
		).toBe("project-scene3d-set");
	});
});
