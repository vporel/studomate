import { APP_VERSION } from "@/constants";
import Grafcet, { GrafcetFormat } from "../grafcet/Grafcet.class";
import { createRandomId } from "../schemas-helpers";
import Variable from "../variable/Variable.class";

export const DEFAULT_PROJECT_NAME = "Nouveau projet";

export default class Project {
	id: string;
	appVersion: string;
	name: string;
	creationDate: Date;
	lastModificationDate: Date;
	author?: string;
	variables: Variable[];
	grafcets: Record<string, Grafcet>;

	constructor(id: string, name: string, author: string) {
		this.id = id;
		this.appVersion = APP_VERSION;
		this.name = name;
		this.creationDate = new Date();
		this.lastModificationDate = new Date();
		this.author = author;
		this.variables = [];
		this.grafcets = {};
	}

	addGrafcet(name: string, format: GrafcetFormat): Grafcet {
		const grafcetId = createRandomId();
		this.grafcets[grafcetId] = new Grafcet(grafcetId, name, format);
		this.touch();
		return this.grafcets[grafcetId];
	}

	updateGrafcet(grafcetId: string, grafcet: Grafcet) {
		this.grafcets[grafcetId] = grafcet;
		this.touch();
	}

	deleteGrafcet(grafcetId: string) {
		delete this.grafcets[grafcetId];
		this.touch();
	}

	touch() {
		this.lastModificationDate = new Date();
	}

	copy(): Project {
		const newProject = Object.assign(new Project("", "", ""), this);
		newProject.variables = this.variables.map((v) => v.copy());
		for (const grafcetId in this.grafcets) {
			newProject.grafcets[grafcetId] = this.grafcets[grafcetId].copy();
		}
		return newProject;
	}

	static createFromJSON(json: string): Project {
		const jsonParsed = JSON.parse(json);
		const project = Object.assign(new Project("", "", ""), jsonParsed);
		project.creationDate = new Date(jsonParsed.creationDate);
		project.lastModificationDate = new Date(jsonParsed.lastModificationDate);
		project.variables = (jsonParsed.variables || []).map((v: any) =>
			Variable.createFromJSON(JSON.stringify(v)),
		);
		const grafcets: Record<string, Grafcet> = {};
		for (const grafcetId in jsonParsed.grafcets) {
			grafcets[grafcetId] = Grafcet.createFromJSON(JSON.stringify(jsonParsed.grafcets[grafcetId]));
		}
		project.grafcets = grafcets;
		return project;
	}
}
