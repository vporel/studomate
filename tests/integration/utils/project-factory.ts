import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectBuilder from "@/schemas/project/builders/project.builder";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";

/**
 * Factory for creating test projects
 */
export class ProjectFactory {
	private static counter = 0;

	static reset(): void {
		this.counter = 0;
	}

	/**
	 * Creates an empty project
	 */
	static createEmpty(name?: string, author?: string): Project {
		const projectId = `test-project-${this.counter++}`;
		return new ProjectBuilder()
			.id(projectId)
			.name(name || "Test Project")
			.author(author || "Test Author")
			.build();
	}

	/**
	 * Creates a project with variables
	 */
	static createWithVariables(variables: Variable[], name?: string, author?: string): Project {
		const projectId = `test-project-${this.counter++}`;
		return new ProjectBuilder()
			.id(projectId)
			.name(name || "Test Project")
			.author(author || "Test Author")
			.addVariables(...variables)
			.build();
	}

	/**
	 * Creates a project with grafcets
	 */
	static createWithGrafcets(grafcets: Grafcet[], name?: string, author?: string): Project {
		const projectId = `test-project-${this.counter++}`;
		return new ProjectBuilder()
			.id(projectId)
			.name(name || "Test Project")
			.author(author || "Test Author")
			.addGrafcets(...grafcets)
			.build();
	}

	/**
	 * Creates a complete project with variables and grafcets
	 */
	static create(variables: Variable[], grafcets: Grafcet[], name?: string, author?: string): Project {
		const projectId = `test-project-${this.counter++}`;
		return new ProjectBuilder()
			.id(projectId)
			.name(name || "Test Project")
			.author(author || "Test Author")
			.addVariables(...variables)
			.addGrafcets(...grafcets)
			.build();
	}
}
