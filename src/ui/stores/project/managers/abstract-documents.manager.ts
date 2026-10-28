import { deepObjectsComparison } from "@/lib/object";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
	ProjectStoreState,
} from "../project.store";
import Project from "@/schemas/project/project.schema";
import { ProjectDocumentType } from "../project.store.types";
import type {
	ProjectStoreAnalytics,
	ProjectStoreFeedback,
} from "../environment/project-store-environment";

const COMMANDS_STACK_SIZE = 100;

/**
 * What every document of the project shares (grafcet, ladder, HMI page): undo histories,
 * registration of the mounted stores, and resynchronisation of those stores after a project
 * command.
 */
export default abstract class AbstractDocumentsManager<
	TDocument extends { id: string; copy(): unknown },
	TValues,
	TManagers extends { commandsStackManager: { refreshFlags(): void } },
> {
	protected setStoreState: ProjectStoreSetFunction;
	protected getStoreState: ProjectStoreGetFunction;

	/**
	 * Undo history de chaque document, tenu ici plutôt que dans son store : un store est créé
	 * au montage de la page et abandonné à sa fermeture, garder l'historique là-bas signifiait
	 * que fermer un onglet détruisait silencieusement l'historique. Le garder au niveau projet
	 * le fait survivre à la page.
	 */
	private commandsStacks: Map<string, CommandsStack<TDocument>> = new Map();

	protected abstract readonly documentType: ProjectDocumentType;

	constructor(
		setStoreState: ProjectStoreSetFunction,
		getStoreState: ProjectStoreGetFunction,
		protected readonly analytics: ProjectStoreAnalytics,
		protected readonly feedback?: ProjectStoreFeedback,
	) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	protected abstract getDocument(
		project: Project,
		id: string,
	): TDocument | undefined;
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
	protected abstract adoptDocument(
		managers: TManagers,
		document: TDocument,
	): void;
	/** Le document actuellement détenu par le store monté (pour éviter une resynchro inutile). */
	protected abstract getAdoptedDocument(
		managers: TManagers,
	): TDocument | undefined;

	getCommandsStack(documentId: string): CommandsStack<TDocument> {
		let stack = this.commandsStacks.get(documentId);
		if (!stack) {
			stack = new CommandsStack<TDocument>(COMMANDS_STACK_SIZE);
			this.commandsStacks.set(documentId, stack);
		}
		return stack;
	}

	/** Drops every commands stack of the manager, mounted stores' flags untouched. */
	clearCommandsStacks(): void {
		this.commandsStacks.clear();
	}

	/**
	 * Empties the commands stacks of the given documents (those that exist), keeping the stacks
	 * in place, and realigns the undo/redo flags of their mounted stores. Commands hold textual
	 * snapshots, so a history recorded before a rewrite of the document (variable rename) would
	 * restore stale content.
	 */
	clearCommandsStacksOf(documentIds: string[]): void {
		const managers = this.getStoresManagers(this.getStoreState());
		documentIds.forEach((documentId) => {
			this.commandsStacks.get(documentId)?.clear();
			managers[documentId]?.commandsStackManager.refreshFlags();
		});
	}

	protected deleteCommandsStack(documentId: string): void {
		this.commandsStacks.delete(documentId);
	}

	getActiveStoreValues(): TValues | null {
		const activeScope = this.getStoreState().activeScope;
		const activeScopeType = this.getStoreState().activeScopeType;
		if (activeScopeType !== this.documentType || !activeScope) return null;
		return this.getStoresValues(this.getStoreState())[activeScope] || null;
	}

	setStoreValues(documentId: string, values: TValues): void {
		this.setStoreState((state) => {
			const current = this.getStoresValues(state);
			return this.setStoresValues({
				...current,
				[documentId]: { ...current[documentId], ...values },
			});
		});
	}

	registerStoreManager(documentId: string, manager: TManagers): void {
		this.setStoreState((state) => {
			const current = this.getStoresManagers(state);
			return this.setStoresManagers({ ...current, [documentId]: manager });
		});
	}

	deleteStoreManager(documentId: string): void {
		this.setStoreState((state) => {
			const current = { ...this.getStoresManagers(state) };
			delete current[documentId];
			return this.setStoresManagers(current);
		});
	}

	getActiveStoreManagers(): TManagers | null {
		const activeScope = this.getStoreState().activeScope;
		const activeScopeType = this.getStoreState().activeScopeType;
		if (activeScopeType !== this.documentType || !activeScope) return null;
		return this.getStoresManagers(this.getStoreState())[activeScope] || null;
	}

	/**
	 * Fait adopter par les stores montés le document à jour du projet.
	 *
	 * Une commande projet peut réécrire un document (renommer une variable réécrit les
	 * expressions/références qui la ciblent, dans tous les programmes du projet). Ceux dont la
	 * page est fermée sont déjà à jour, le projet les détenant directement. Mais un store monté
	 * possède sa propre copie et la repousse dans le projet : sans cette resynchronisation, il
	 * écraserait le résultat de la commande avec sa version périmée.
	 *
	 * Seuls les stores dont le document a réellement changé sont resynchronisés : une commande
	 * projet ne réécrit qu'une partie des documents (souvent aucun), inutile de cloner et de
	 * réaligner la vue des autres.
	 */
	syncMountedStoresFromProject(): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const managers = this.getStoresManagers(this.getStoreState());
		Object.entries(managers).forEach(([documentId, manager]) => {
			const document = this.getDocument(project, documentId);
			if (!document) return;
			const adopted = this.getAdoptedDocument(manager);
			if (adopted && deepObjectsComparison(adopted, document)) return;
			//Une copie, pour que le store et le projet ne partagent jamais la même instance
			this.adoptDocument(manager, document.copy() as TDocument);
		});
	}
}
