import AbstractLadderCommand from "@/schemas/ladder/commands/abstract-ladder.command";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import ElementsRemoveCommand from "@/schemas/ladder/commands/elements-remove.command";
import SectionRemoveCommand from "@/schemas/ladder/commands/section-remove.command";
import {
	CounterBlockParams,
	TimerBlockParams,
} from "@/schemas/ladder/block.schema";
import { CoilType, ContactType } from "@/schemas/ladder/element.schema";
import { PendingSystemBlockEdit } from "@/ui/utils/ladder/ladder-system-block-drag";
import {
	LadderStoreGetFunction,
	LadderStoreSetFunction,
} from "../ladder.store";

/** Opérations d'édition sur les éléments/sections du Ladder : suppression (cascade élément →
 * connexions), changement de type contact/bobine, ouverture de l'éditeur de bloc système,
 * suppression de sections. */
export default class LadderElementOpsManager {
	private setStoreState: LadderStoreSetFunction;
	private getStoreState: LadderStoreGetFunction;

	constructor(
		setStoreState: LadderStoreSetFunction,
		getStoreState: LadderStoreGetFunction,
	) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	/**
	 * Supprime plusieurs sections en une seule opération annulable. Un ladder gardant toujours au
	 * moins une section : si `sectionIds` les couvre toutes, la première du tableau
	 * `ladder.sections` est conservée (et non la première de `sectionIds`).
	 *
	 * L'`index` de chaque `SectionRemoveCommand` est calculé au fil des retraits du lot (position
	 * courante, pas position d'origine) pour que le rejeu inverse des `cancel` à l'annulation
	 * réinsère chaque section à la bonne place.
	 */
	deleteSections(sectionIds: string[]): void {
		const ladder = this.getStoreState().ladder;
		if (ladder.sections.length <= 1) return;

		const orderedTargets = ladder.sections.filter((s) =>
			sectionIds.includes(s.id),
		);
		if (orderedTargets.length === 0) return;

		const toDelete =
			orderedTargets.length === ladder.sections.length
				? orderedTargets.filter((s) => s.id !== ladder.sections[0].id)
				: orderedTargets;

		const remainingIds = ladder.sections.map((s) => s.id);
		const commands = toDelete.map((section) => {
			const index = remainingIds.indexOf(section.id);
			remainingIds.splice(index, 1);
			return new SectionRemoveCommand({
				sectionId: section.id,
				title: section.title,
				description: section.description,
				elements: section.elements,
				connections: section.connections,
				index,
			});
		});

		this.getStoreState().commandsStackManager.executeOperation(commands);
	}

	/**
	 * Supprime des éléments (et, en cascade, les connexions qui les touchent) et des connexions
	 * isolées d'une section. Partagée par `useLadderDeleteHandler` (touche Suppr, menu
	 * contextuel) et par le couper (Ctrl+X) : la cascade élément → connexions ne doit exister
	 * qu'à un seul endroit.
	 */
	deleteElements(
		sectionId: string,
		elementIds: string[],
		edgeIds: string[] = [],
	): void {
		const section = this.getStoreState().ladder.getSection(sectionId);
		if (!section) return;
		const removedElementIds = new Set(
			elementIds.filter((id) => section.getElement(id)),
		);
		const commands: AbstractLadderCommand<any>[] = [];

		if (removedElementIds.size > 0) {
			const elements = [...removedElementIds].map((id) => ({
				sectionId: section.id,
				element: section.getElement(id)!,
			}));
			const touchedConnections = section.connections
				.filter(
					(c) =>
						removedElementIds.has(c.source.id) ||
						removedElementIds.has(c.target.id),
				)
				.map((connection) => ({ sectionId: section.id, connection }));
			commands.push(
				new ElementsRemoveCommand({
					elements,
					connections: touchedConnections,
				}),
			);
		}

		//Connexions supprimées isolément (aucune de leurs extrémités n'est déjà couverte par la
		//cascade d'ElementsRemoveCommand ci-dessus).
		const standaloneConnections = edgeIds
			.map((id) => section.connections.find((c) => c.id === id))
			.filter((c): c is NonNullable<typeof c> => !!c)
			.filter(
				(c) =>
					!removedElementIds.has(c.source.id) &&
					!removedElementIds.has(c.target.id),
			);
		if (standaloneConnections.length > 0) {
			commands.push(
				new ConnectionsRemoveCommand({
					sectionId: section.id,
					connections: standaloneConnections,
				}),
			);
		}

		if (commands.length > 0)
			this.getStoreState().commandsStackManager.executeOperation(commands);
	}

	/**
	 * Change le type d'un contact (NO/NF/P/N) sans toucher à sa variable ni à ses connexions —
	 * déclenché par le sous-menu « Type » du menu contextuel. Sans effet si l'élément n'est pas un
	 * contact ou porte déjà ce type.
	 */
	setContactType(
		sectionId: string,
		elementId: string,
		type: ContactType,
	): void {
		const section = this.getStoreState().ladder.getSection(sectionId);
		const element = section?.getElement(elementId);
		if (!element || element.type !== "contact" || element.data.type === type)
			return;
		this.getStoreState().commandsStackManager.executeOperation([
			new ElementUpdateCommand({
				elementId,
				changes: { data: { type } },
				previousChanges: { data: { type: element.data.type } },
			}),
		]);
	}

	/**
	 * Change le type d'une bobine (normal/set/reset) sans toucher à sa variable ni à ses connexions —
	 * déclenché par le sous-menu « Type » du menu contextuel. Sans effet si l'élément n'est pas une
	 * bobine ou porte déjà ce type.
	 */
	setCoilType(sectionId: string, elementId: string, type: CoilType): void {
		const section = this.getStoreState().ladder.getSection(sectionId);
		const element = section?.getElement(elementId);
		if (!element || element.type !== "coil" || element.data.type === type)
			return;
		this.getStoreState().commandsStackManager.executeOperation([
			new ElementUpdateCommand({
				elementId,
				changes: { data: { type } },
				previousChanges: { data: { type: element.data.type } },
			}),
		]);
	}

	/**
	 * Ouvre la fenêtre de configuration d'un bloc système existant, préremplie — déclenché par le
	 * double-clic sur le bloc dans le canevas ou par "Paramétrer" dans le menu contextuel de
	 * l'explorateur (voir `useBlockInstanceMenuItems`), qui appelle cette méthode une fois la page
	 * du ladder ciblé devenue active.
	 */
	// `blockType` doit être fourni explicitement par l'appelant plutôt que déduit de la présence
	// d'un champ (comme `timerType`/`counterType` le permettent pour timer/counter). Les blocs
	// `"compare"`/`"assign"`/`"arithmetic"` n'ont pas de fenêtre : ils se configurent sur le canevas.
	openSystemBlockEditor(
		elementId: string,
		blockType: PendingSystemBlockEdit["blockType"],
		initial: TimerBlockParams | CounterBlockParams,
	): void {
		this.setStoreState({
			pendingSystemBlockEdit: {
				blockType,
				elementId,
				initial,
			} as PendingSystemBlockEdit,
		});
	}
}
