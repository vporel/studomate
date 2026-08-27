import Grafcet, {
	DEFAULT_GRAFCET_FORMAT,
	GRAFCET_NAME_LABEL,
	GrafcetFormat,
} from "@/schemas/grafcet/grafcet.schema";
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

export default class GrafcetsManager extends AbstractProgramsManager<
	Grafcet,
	GrafcetStoreValues,
	GrafcetStoreManagers
> {
	protected readonly programType: ProgramType = "grafcet";

	constructor(
		setStoreState: ProjectStoreSetFunction,
		getStoreState: ProjectStoreGetFunction,
	) {
		super(setStoreState, getStoreState);
	}

	protected getProgram(project: Project, id: string): Grafcet | undefined {
		return project.getGrafcet(id);
	}

	protected getStoresValues(
		state: ProjectStoreState,
	): Record<string, GrafcetStoreValues> {
		return state.grafcetsStoresValues;
	}

	protected setStoresValues(
		values: Record<string, GrafcetStoreValues>,
	): Partial<ProjectStoreState> {
		return { grafcetsStoresValues: values };
	}

	protected getStoresManagers(
		state: ProjectStoreState,
	): Record<string, GrafcetStoreManagers> {
		return state.grafcetsStoresManagers;
	}

	protected setStoresManagers(
		managers: Record<string, GrafcetStoreManagers>,
	): Partial<ProjectStoreState> {
		return { grafcetsStoresManagers: managers };
	}

	protected adoptProgram(
		managers: GrafcetStoreManagers,
		program: Grafcet,
	): void {
		managers.workflowManager.adoptGrafcet(program);
	}

	protected getAdoptedProgram(
		managers: GrafcetStoreManagers,
	): Grafcet | undefined {
		return managers.workflowManager.getGrafcet();
	}

	/** @param name Absent : auto-généré au format "Grafcet_N", unique parmi les programmes du
	 * projet (voir `Project.nextProgramName`). */
	newGrafcet(
		name?: string,
		format: GrafcetFormat = DEFAULT_GRAFCET_FORMAT,
	): Grafcet | null {
		const project = this.getStoreState().project;
		if (!project) return null;
		const resolvedName = name ?? project.nextProgramName(GRAFCET_NAME_LABEL);
		return this.createProgram(resolvedName, (p) =>
			p.createGrafcet(resolvedName, format),
		);
	}
}
