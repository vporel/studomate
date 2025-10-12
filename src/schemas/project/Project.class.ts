import { APP_VERSION } from "@/constants";
import Grafcet, { GrafcetFormat } from "../grafcet/Grafcet.class";
import { createElementId } from "../schemas-helpers";
import Variable from "../Variable.class";

export default class Project {
	appVersion: string;
	name: string;
	creationDate: Date;
	lastModificationDate: Date;
	author?: string;
	variables: Variable[];
	grafcets: Record<string, Grafcet>;

	constructor(name: string, author: string) {
		this.appVersion = APP_VERSION;
		this.name = name;
		this.creationDate = new Date();
		this.lastModificationDate = new Date();
		this.author = author;
		this.variables = [];
		this.grafcets = {};
	}

	addGrafcet(name: string, format: GrafcetFormat): Grafcet {
		const grafcetId = createElementId();
		this.grafcets[grafcetId] = new Grafcet(grafcetId, name, format);
		return this.grafcets[grafcetId];
	}

	updateGrafcet(grafcetId: string, grafcet: Grafcet) {
		this.grafcets[grafcetId] = grafcet;
	}

	touch() {
		this.lastModificationDate = new Date();
	}
}
