import Grafcet, { GrafcetFormat } from "@/schemas/grafcet/grafcet.schema";
import Project from "@/schemas/project/project.schema";
import { ProgramType } from "@/schemas/program/program.schema";
import {
	GrafcetStoreManagers,
	GrafcetStoreValues,
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
	ProjectStoreState,
} from "../project.store";
import AbstractProgramsManager from "./abstract-programs.manager";

export default class GrafcetsManager extends AbstractProgramsManager<Grafcet, GrafcetStoreValues, GrafcetStoreManagers> {
	protected readonly programType: ProgramType = "grafcet";

	constructor(setStoreState: ProjectStoreSetFunction, getStoreState: ProjectStoreGetFunction) {
		super(setStoreState, getStoreState);
	}

	protected getProgram(project: Project, id: string): Grafcet | undefined {
		return project.getGrafcet(id);
	}

	protected getStoresValues(state: ProjectStoreState): Record<string, GrafcetStoreValues> {
		return state.grafcetsStoresValues;
	}

	protected setStoresValues(values: Record<string, GrafcetStoreValues>): Partial<ProjectStoreState> {
		return { grafcetsStoresValues: values };
	}

	protected getStoresManagers(state: ProjectStoreState): Record<string, GrafcetStoreManagers> {
		return state.grafcetsStoresManagers;
	}

	protected setStoresManagers(managers: Record<string, GrafcetStoreManagers>): Partial<ProjectStoreState> {
		return { grafcetsStoresManagers: managers };
	}

	protected adoptProgram(managers: GrafcetStoreManagers, program: Grafcet): void {
		managers.workflowManager.adoptGrafcet(program);
	}

	newGrafcet(name: string, format: GrafcetFormat): Grafcet | null {
		return this.createProgram(name, (project) => project.createGrafcet(name, format));
	}
}
