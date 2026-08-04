import Grafcet from "../../grafcet/grafcet.schema";
import Variable from "../../variable/variable.schema";
import Project from "../project.schema";

export default class ProjectBuilder {
	private _id: string;
	private _name: string;
	private _author: string;
	private _variables: Variable[];
	private _grafcets: Grafcet[];

	constructor() {
		this._id = "";
		this._name = "Nouveau projet";
		this._author = "";
		this._variables = [];
		this._grafcets = [];
	}

	id(id: string): ProjectBuilder {
		this._id = id;
		return this;
	}

	name(name: string): ProjectBuilder {
		this._name = name;
		return this;
	}

	author(author: string): ProjectBuilder {
		this._author = author;
		return this;
	}

	addVariable(variable: Variable): ProjectBuilder {
		this._variables.push(variable);
		return this;
	}

	addVariables(...variables: Variable[]): ProjectBuilder {
		this._variables.push(...variables);
		return this;
	}

	addGrafcet(grafcet: Grafcet): ProjectBuilder {
		this._grafcets.push(grafcet);
		return this;
	}

	addGrafcets(...grafcets: Grafcet[]): ProjectBuilder {
		this._grafcets.push(...grafcets);
		return this;
	}

	build(): Project {
		const project = new Project(this._id, this._name, this._author);
		project.variables = [...this._variables];
		this._grafcets.forEach((grafcet) => {
			project.addProgram(grafcet);
		});
		return project;
	}
}
