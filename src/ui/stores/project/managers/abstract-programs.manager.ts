import { deepObjectsComparison } from "@/lib/object";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Program, {
	PROGRAM_TYPE_LABELS,
	ProgramType,
} from "@/schemas/program/program.schema";
import Project from "@/schemas/project/project.schema";
import {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
	ProjectStoreState,
} from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";

const COMMANDS_STACK_SIZE = 100;

/**
 * Factorise ce qui est identique entre `GrafcetsManager` et `LaddersManager` : gestion des
 * historiques d'annulation, enregistrement des stores montés, CRUD sur le projet, et
 * resynchronisation des stores montés après une commande projet (renommage de variable...).
 *
 * Les sous-classes n'exposent que ce qui diffère réellement (`newGrafcet`/`newLadder`, qui
 * n'ont pas la même signature) et les implémentations des méthodes abstraites — le reste de
 * l'API publique vit ici et s'appelle directement (`grafcetsManager.getProgramOrThrow(id)`,
 * pas un `getGrafcet` qui ne ferait que renommer l'appel).
 */
export default abstract class AbstractProgramsManager<
	TProgram extends Program,
	TValues,
	TManagers,
> {
	protected setStoreState: ProjectStoreSetFunction;
	protected getStoreState: ProjectStoreGetFunction;

	/**
	 * Undo history de chaque programme, tenu ici plutôt que dans son store : un store est créé
	 * au montage de la page et abandonné à sa fermeture, garder l'historique là-bas signifiait
	 * que fermer un onglet détruisait silencieusement l'historique. Le garder au niveau projet
	 * le fait survivre à la page.
	 */
	private commandsStacks: Map<string, CommandsStack<TProgram>> = new Map();

	protected abstract readonly programType: ProgramType;

	constructor(
		setStoreState: ProjectStoreSetFunction,
		getStoreState: ProjectStoreGetFunction,
	) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	protected abstract getProgram(
		project: Project,
		id: string,
	): TProgram | undefined;
	protected abstract getStoresValues(
		state: ProjectStoreState,
	): Record<string, TValues>;
	protected abstract setStoresValues(
		values: Record<string, TValues>,
	): Partial<ProjectStoreState>;
	protected abstract getStoresManagers(
		state: ProjectStoreState,
	): Record<string, TManagers>;
	protected abstract setStoresManagers(
		managers: Record<string, TManagers>,
	): Partial<ProjectStoreState>;
	protected abstract adoptProgram(managers: TManagers, program: TProgram): void;
	/** Le programme actuellement détenu par le store monté (pour éviter une resynchro inutile). */
	protected abstract getAdoptedProgram(
		managers: TManagers,
	): TProgram | undefined;

	getCommandsStack(programId: string): CommandsStack<TProgram> {
		let stack = this.commandsStacks.get(programId);
		if (!stack) {
			stack = new CommandsStack<TProgram>(COMMANDS_STACK_SIZE);
			this.commandsStacks.set(programId, stack);
		}
		return stack;
	}

	clearCommandsStacks(): void {
		this.commandsStacks.clear();
	}

	getActiveStoreValues(): TValues | null {
		const activeScope = this.getStoreState().activeScope;
		const activeScopeType = this.getStoreState().activeScopeType;
		if (activeScopeType !== this.programType || !activeScope) return null;
		return this.getStoresValues(this.getStoreState())[activeScope] || null;
	}

	setStoreValues(programId: string, values: TValues): void {
		this.setStoreState((state) => {
			const current = this.getStoresValues(state);
			return this.setStoresValues({
				...current,
				[programId]: { ...current[programId], ...values },
			});
		});
	}

	registerStoreManager(programId: string, manager: TManagers): void {
		this.setStoreState((state) => {
			const current = this.getStoresManagers(state);
			return this.setStoresManagers({ ...current, [programId]: manager });
		});
	}

	deleteStoreManager(programId: string): void {
		this.setStoreState((state) => {
			const current = { ...this.getStoresManagers(state) };
			delete current[programId];
			return this.setStoresManagers(current);
		});
	}

	getActiveStoreManagers(): TManagers | null {
		const activeScope = this.getStoreState().activeScope;
		const activeScopeType = this.getStoreState().activeScopeType;
		if (activeScopeType !== this.programType || !activeScope) return null;
		return this.getStoresManagers(this.getStoreState())[activeScope] || null;
	}

	/**
	 * Fait adopter par les stores montés le programme à jour du projet.
	 *
	 * Une commande projet peut réécrire un programme (renommer une variable réécrit les
	 * expressions/références qui la ciblent, dans tous les programmes du projet). Ceux dont la
	 * page est fermée sont déjà à jour, le projet les détenant directement. Mais un store monté
	 * possède sa propre copie et la repousse dans le projet : sans cette resynchronisation, il
	 * écraserait le résultat de la commande avec sa version périmée.
	 *
	 * Seuls les stores dont le programme a réellement changé sont resynchronisés : une commande
	 * projet ne réécrit qu'une partie des programmes (souvent aucun), inutile de cloner et de
	 * réaligner la vue des autres.
	 */
	syncMountedStoresFromProject(): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const managers = this.getStoresManagers(this.getStoreState());
		Object.entries(managers).forEach(([programId, manager]) => {
			const program = this.getProgram(project, programId);
			if (!program) return;
			const adopted = this.getAdoptedProgram(manager);
			if (adopted && deepObjectsComparison(adopted, program)) return;
			//Une copie, pour que le store et le projet ne partagent jamais la même instance
			this.adoptProgram(manager, program.copy() as TProgram);
		});
	}

	protected createProgram(
		name: string,
		create: (project: Project) => TProgram,
	): TProgram | null {
		const project = this.getStoreState().project;
		if (!project) return null;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn(`Cannot create ${this.programType} in non-design mode`);
			return null;
		}
		const newProject = project.copy();
		const program = create(newProject);
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
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn(`Cannot update ${this.programType} in non-design mode`);
			return;
		}
		const existing = this.getProgram(project, program.id);
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
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn(`Cannot delete ${this.programType} in non-design mode`);
			return;
		}
		if (!this.getProgram(project, programId)) {
			throw new Error(
				`${PROGRAM_TYPE_LABELS[this.programType]} not found in project`,
			);
		}
		const newProject = project.copy();
		newProject.deleteProgram(programId);
		this.commandsStacks.delete(programId);
		this.getStoreState().pagesManager.closePage(programId);
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
		}));
	}

	renameProgramById(programId: string, newName: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn(`Cannot rename ${this.programType} in non-design mode`);
			return;
		}
		if (!this.getProgram(project, programId)) {
			throw new Error(
				`${PROGRAM_TYPE_LABELS[this.programType]} not found in project`,
			);
		}
		const newProject = project.copy();
		//getProgram rend explicite que l'on modifie l'instance, et non un objet temporaire
		this.getProgram(newProject, programId)!.name = newName;
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
	}

	getProgramOrThrow(programId: string): TProgram {
		const project = this.getStoreState().project;
		if (!project) throw new Error("No project opened");
		const program = this.getProgram(project, programId);
		if (!program)
			throw new Error(
				`${PROGRAM_TYPE_LABELS[this.programType]} not found in project`,
			);
		return program;
	}
}
