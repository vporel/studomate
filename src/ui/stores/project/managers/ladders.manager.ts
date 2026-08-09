import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import { ProgramType } from "@/schemas/program/program.schema";
import {
	LadderStoreManagers,
	LadderStoreValues,
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
	ProjectStoreState,
} from "../project.store";
import AbstractProgramsManager from "./abstract-programs.manager";

export default class LaddersManager extends AbstractProgramsManager<Ladder, LadderStoreValues, LadderStoreManagers> {
	protected readonly programType: ProgramType = "ladder";

	constructor(setStoreState: ProjectStoreSetFunction, getStoreState: ProjectStoreGetFunction) {
		super(setStoreState, getStoreState);
	}

	protected getProgram(project: Project, id: string): Ladder | undefined {
		return project.getLadder(id);
	}

	protected getStoresValues(state: ProjectStoreState): Record<string, LadderStoreValues> {
		return state.laddersStoresValues;
	}

	protected setStoresValues(values: Record<string, LadderStoreValues>): Partial<ProjectStoreState> {
		return { laddersStoresValues: values };
	}

	protected getStoresManagers(state: ProjectStoreState): Record<string, LadderStoreManagers> {
		return state.laddersStoresManagers;
	}

	protected setStoresManagers(managers: Record<string, LadderStoreManagers>): Partial<ProjectStoreState> {
		return { laddersStoresManagers: managers };
	}

	protected adoptProgram(managers: LadderStoreManagers, program: Ladder): void {
		managers.workflowManager.adoptLadder(program);
	}

	newLadder(name: string): Ladder | null {
		return this.createProgram(name, (project) => project.createLadder(name));
	}
}
