import { APP_VERSION } from "@/constants";
import Grafcet from "../grafcet/Grafcet.class";
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

	updateGrafcet(grafcetId: string, grafcet: Grafcet) {
		this.grafcets[grafcetId] = grafcet;
	}

	touch() {
		this.lastModificationDate = new Date();
	}
}
