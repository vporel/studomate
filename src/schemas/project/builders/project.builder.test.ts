import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import Project from "../project.schema";
import ProjectBuilder from "./project.builder";

describe("ProjectBuilder", () => {
	it("builds a project with default values", () => {
		const project = new ProjectBuilder().id("project-1").build();

		expect(project).toBeInstanceOf(Project);
		expect(project.id).toBe("project-1");
		expect(project.name).toBe("Nouveau projet");
		expect(project.author).toBe("");
		expect(project.variables).toEqual([]);
		expect(Object.keys(project.grafcets)).toHaveLength(0);
	});

	it("builds a project with custom name", () => {
		const project = new ProjectBuilder()
			.id("project-1")
			.name("Mon Projet")
			.build();

		expect(project.name).toBe("Mon Projet");
	});

	it("builds a project with custom author", () => {
		const project = new ProjectBuilder()
			.id("project-1")
			.author("John Doe")
			.build();

		expect(project.author).toBe("John Doe");
	});

	it("builds a project with one variable", () => {
		const variable = new VariableBuilder()
			.id("var-1")
			.mnemonic("sensor")
			.build();
		const project = new ProjectBuilder()
			.id("project-1")
			.addVariable(variable)
			.build();

		expect(project.variables).toHaveLength(1);
		expect(project.variables[0].id).toBe("var-1");
	});

	it("builds a project with multiple variables", () => {
		const var1 = new VariableBuilder().id("var-1").mnemonic("sensor1").build();
		const var2 = new VariableBuilder().id("var-2").mnemonic("sensor2").build();
		const project = new ProjectBuilder()
			.id("project-1")
			.addVariables(var1, var2)
			.build();

		expect(project.variables).toHaveLength(2);
		expect(project.variables[0].id).toBe("var-1");
		expect(project.variables[1].id).toBe("var-2");
	});

	it("builds a project with one grafcet", () => {
		const grafcet = new GrafcetBuilder().id("grafcet-1").name("Main").build();
		const project = new ProjectBuilder()
			.id("project-1")
			.addGrafcet(grafcet)
			.build();

		expect(Object.keys(project.grafcets)).toHaveLength(1);
		expect(project.grafcets["grafcet-1"]).toBeDefined();
		expect(project.grafcets["grafcet-1"].name).toBe("Main");
	});

	it("builds a project with multiple grafcets", () => {
		const grafcet1 = new GrafcetBuilder().id("grafcet-1").name("Main").build();
		const grafcet2 = new GrafcetBuilder().id("grafcet-2").name("Sub").build();
		const project = new ProjectBuilder()
			.id("project-1")
			.addGrafcets(grafcet1, grafcet2)
			.build();

		expect(Object.keys(project.grafcets)).toHaveLength(2);
		expect(project.grafcets["grafcet-1"]).toBeDefined();
		expect(project.grafcets["grafcet-2"]).toBeDefined();
	});

	it("builds a complete project with all properties", () => {
		const var1 = new VariableBuilder().id("var-1").mnemonic("start").build();
		const grafcet1 = new GrafcetBuilder()
			.id("grafcet-1")
			.name("Main Process")
			.build();

		const project = new ProjectBuilder()
			.id("project-1")
			.name("Industrial Control")
			.author("Jane Smith")
			.addVariable(var1)
			.addGrafcet(grafcet1)
			.build();

		expect(project.id).toBe("project-1");
		expect(project.name).toBe("Industrial Control");
		expect(project.author).toBe("Jane Smith");
		expect(project.variables).toHaveLength(1);
		expect(Object.keys(project.grafcets)).toHaveLength(1);
	});

	it("allows method chaining", () => {
		const builder = new ProjectBuilder();
		const result = builder.id("project-1");

		expect(result).toBe(builder);
	});

	it("builds multiple projects independently", () => {
		const project1 = new ProjectBuilder()
			.id("project-1")
			.name("Project 1")
			.build();
		const project2 = new ProjectBuilder()
			.id("project-2")
			.name("Project 2")
			.build();

		expect(project1.id).toBe("project-1");
		expect(project1.name).toBe("Project 1");
		expect(project2.id).toBe("project-2");
		expect(project2.name).toBe("Project 2");
	});
});
