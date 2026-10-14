import Project from "../project.schema";
import ProjectFieldSetCommand from "./project-field-set.command";

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

	it("derives its type from the field", () => {
		expect(
			new ProjectFieldSetCommand({
				field: "name",
				newValue: "B",
				oldValue: "A",
			}).getType(),
		).toBe("project-name-set");
	});
});
