import { deepObjectsComparison } from "@/lib/object";
import { refuseEdit } from "../editability";
import Program, {
	PROGRAM_TYPE_LABELS,
	ProgramType,
} from "@/schemas/program/program.schema";
import Project from "@/schemas/project/project.schema";
import AbstractDocumentsManager from "./abstract-documents.manager";

/**
 * Factorise ce qui est identique entre `GrafcetsManager` et `LaddersManager`, en plus de
 * `AbstractDocumentsManager` (historiques d'annulation, stores montés, resynchronisation) : le CRUD
 * sur le projet et ses règles de mode.
 *
 * Les sous-classes n'exposent que ce qui diffère réellement (`newGrafcet`/`newLadder`, qui
 * n'ont pas la même signature) et les implémentations des méthodes abstraites — le reste de
 * l'API publique vit ici et s'appelle directement (`grafcetsManager.getProgramOrThrow(id)`,
 * pas un `getGrafcet` qui ne ferait que renommer l'appel).
 */
export default abstract class AbstractProgramsManager<
	TProgram extends Program,
	TValues,
	TManagers extends { commandsStackManager: { refreshFlags(): void } },
> extends AbstractDocumentsManager<TProgram, TValues, TManagers> {
	protected abstract readonly programType: ProgramType;

	protected get documentType(): ProgramType {
		return this.programType;
	}

	protected createProgram(
		name: string,
		create: (project: Project) => TProgram,
	): TProgram | null {
		const project = this.getStoreState().project;
		if (!project) return null;
		if (refuseEdit(this.getStoreState(), `create ${this.programType}`))
			return null;
		const newProject = project.copy();
		const program = create(newProject);
		this.analytics.trackEvent("program-created", { type: this.programType });
		this.getStoreState().pagesManager.openPage({
			id: program.id,
			type: this.programType,
			title: program.name,
		});
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
		}));
		return program;
	}

	updateProgramData(program: TProgram): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (refuseEdit(this.getStoreState(), `update ${this.programType}`)) return;
		const existing = this.getDocument(project, program.id);
		if (!existing)
			throw new Error(
				`${PROGRAM_TYPE_LABELS[this.programType]} not found in project`,
			);
		if (!deepObjectsComparison(existing, program)) {
			this.setStoreState(() => ({
				project: project.copyWithProgram(program),
				hasUnsavedChanges: true,
			}));
		}
	}

	deleteProgramById(programId: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (refuseEdit(this.getStoreState(), `delete ${this.programType}`)) return;
		if (!this.getDocument(project, programId)) {
			throw new Error(
				`${PROGRAM_TYPE_LABELS[this.programType]} not found in project`,
			);
		}
		const newProject = project.copy();
		newProject.deleteProgram(programId);
		this.deleteCommandsStack(programId);
		this.getStoreState().pagesManager.closePage(programId);
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
		}));
	}

	renameProgramById(programId: string, newName: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (refuseEdit(this.getStoreState(), `rename ${this.programType}`)) return;
		if (!this.getDocument(project, programId)) {
			throw new Error(
				`${PROGRAM_TYPE_LABELS[this.programType]} not found in project`,
			);
		}
		const newProject = project.copy();
		//getDocument rend explicite que l'on modifie l'instance, et non un objet temporaire
		this.getDocument(newProject, programId)!.name = newName;
		const pagesData = this.getStoreState().pagesData;
		if (pagesData[programId]) {
			const newPagesData = structuredClone(pagesData);
			newPagesData[programId].title = newName;
			this.setStoreState(() => ({ pagesData: newPagesData }));
		}
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
		}));
		// A mounted store pushes its own copy back to the project on its next change.
		this.syncMountedStoresFromProject();
	}

	setExcludedFromExecution(programId: string, excluded: boolean): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (
			refuseEdit(
				this.getStoreState(),
				`change execution of ${this.programType}`,
			)
		)
			return;
		const program = this.getDocument(project, programId);
		if (!program) {
			throw new Error(
				`${PROGRAM_TYPE_LABELS[this.programType]} not found in project`,
			);
		}
		if (excluded && !program.canBeExcludedFromExecution()) return;
		if (program.excludedFromExecution === excluded) return;
		const newProject = project.copy();
		this.getDocument(newProject, programId)!.excludedFromExecution = excluded;
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
		}));
		// A mounted store pushes its own copy back to the project on its next change.
		this.syncMountedStoresFromProject();
	}

	getProgramOrThrow(programId: string): TProgram {
		const project = this.getStoreState().project;
		if (!project) throw new Error("No project opened");
		const program = this.getDocument(project, programId);
		if (!program)
			throw new Error(
				`${PROGRAM_TYPE_LABELS[this.programType]} not found in project`,
			);
		return program;
	}
}
