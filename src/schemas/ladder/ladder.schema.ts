import Program, { ProgramType } from "../program/program.schema";
import { createRandomId } from "@/ids";
import Connection, { ConnectionData } from "./connection.schema";
import { CoilData, ContactData, GridPosition, LadderElement } from "./element.schema";
import Section from "./section.schema";

export const DEFAULT_LADDER_NAME = "Sans titre";

export const DEFAULT_SECTION_TITLE = "";

export default class Ladder extends Program {
	readonly type: ProgramType = "ladder";
	sections: Section[];

	constructor(id: string, name: string, sections?: Section[]) {
		super(id, name);
		// Un ladder porte toujours au moins une section.
		this.sections = sections ?? [new Section(createRandomId(), DEFAULT_SECTION_TITLE)];
	}

	//=============== SECTIONS ===============

	getSection(sectionId: string): Section | undefined {
		return this.sections.find((section) => section.id === sectionId);
	}

	createSection(title: string = DEFAULT_SECTION_TITLE, description: string = ""): Section {
		const section = new Section(createRandomId(), title, description);
		this.sections.push(section);
		return section;
	}

	renameSection(sectionId: string, title: string): void {
		const section = this.getSection(sectionId);
		if (section) section.title = title;
	}

	setSectionDescription(sectionId: string, description: string): void {
		const section = this.getSection(sectionId);
		if (section) section.description = description;
	}

	/**
	 * Ne supprime pas la dernière section restante : un ladder porte toujours au moins une
	 * section.
	 */
	deleteSection(sectionId: string): void {
		if (this.sections.length <= 1) return;
		const index = this.sections.findIndex((section) => section.id === sectionId);
		if (index !== -1) this.sections.splice(index, 1);
	}

	reorderSections(orderedSectionIds: string[]): void {
		const bySectionId = new Map(this.sections.map((section) => [section.id, section]));
		const reordered = orderedSectionIds
			.map((id) => bySectionId.get(id))
			.filter((section): section is Section => section !== undefined);
		//Ajoute à la fin toute section absente de orderedSectionIds, pour ne jamais en perdre une
		for (const section of this.sections) {
			if (!reordered.includes(section)) reordered.push(section);
		}
		this.sections = reordered;
	}

	//=============== ÉLÉMENTS / CONNEXIONS ===============

	findElement(elementId: string): { section: Section; element: LadderElement } | undefined {
		for (const section of this.sections) {
			const element = section.getElement(elementId);
			if (element) return { section, element };
		}
		return undefined;
	}

	findConnection(connectionId: string): { section: Section; connection: Connection } | undefined {
		for (const section of this.sections) {
			const connection = section.connections.find((c) => c.id === connectionId);
			if (connection) return { section, connection };
		}
		return undefined;
	}

	/** Le tracé d'une connexion (`data.points`) — jamais sa source/cible, qui passent par
	 * `ConnectionsAddCommand`/`ConnectionsRemoveCommand`. */
	updateConnectionData(connectionId: string, changes: Partial<ConnectionData>): void {
		const located = this.findConnection(connectionId);
		if (!located) return;
		Object.assign(located.connection.data, changes);
	}

	addElements(sectionId: string, elements: LadderElement[]): void {
		const section = this.getSection(sectionId);
		if (!section) return;
		section.elements.push(...elements);
	}

	updateElement(
		elementId: string,
		changes: { data?: Partial<ContactData | CoilData>; position?: Partial<GridPosition> },
	): void {
		const located = this.findElement(elementId);
		if (!located || located.element.type === "railTerminal") return;
		if (changes.data) Object.assign(located.element.data, changes.data);
		if (changes.position) Object.assign(located.element.position, changes.position);
	}

	/**
	 * Retire les éléments donnés, et en cascade toute connexion qui en référence un — en miroir
	 * de `Grafcet.removeElements` (`src/schemas/grafcet/grafcet.schema.ts`). Retire aussi toute
	 * borne d'alimentation qui se retrouve sans connexion sortante suite à ce retrait (voir
	 * `pruneOrphanedRailTerminals`), et la renvoie pour que l'appelant puisse la restaurer à
	 * l'annulation.
	 */
	removeElements(elementIds: string[]): { sectionId: string; element: LadderElement }[] {
		const affectedSections = new Set<Section>();
		for (const elementId of elementIds) {
			const located = this.findElement(elementId);
			if (!located) continue;
			const index = located.section.elements.findIndex((element) => element.id === elementId);
			if (index !== -1) located.section.elements.splice(index, 1);
			located.section.connections = located.section.connections.filter(
				(connection) => connection.source.id !== elementId && connection.target.id !== elementId,
			);
			affectedSections.add(located.section);
		}
		return this.pruneOrphanedRailTerminals(affectedSections);
	}

	/**
	 * Valide que `source`/`target` existent dans les éléments de la section avant d'ajouter, et
	 * qu'une borne d'alimentation n'est jamais la cible d'une connexion (elle n'a pas de côté
	 * entrant) — en miroir de `Grafcet.addConnections`. Erreur de programmation si ce n'est pas
	 * le cas (les commandes ne doivent jamais produire une connexion orpheline ou invalide), pas
	 * un cas utilisateur normal à signaler via l'analyseur.
	 */
	addConnections(sectionId: string, connections: Connection[]): void {
		const section = this.getSection(sectionId);
		if (!section) return;
		for (const connection of connections) {
			const source = section.getElement(connection.source.id);
			const target = section.getElement(connection.target.id);
			if (!source) {
				throw new Error(`Connection 'source' element missing: id=${connection.source.id}`);
			}
			if (!target) {
				throw new Error(`Connection 'target' element missing: id=${connection.target.id}`);
			}
			if (target.type === "railTerminal") {
				throw new Error(`Connection 'target' cannot be a rail terminal: id=${connection.target.id}`);
			}
			if (
				!section.connections.find(
					(c) => c.source.id === connection.source.id && c.target.id === connection.target.id,
				)
			) {
				section.connections.push(connection);
			}
		}
	}

	/**
	 * Retire les connexions données, et toute borne d'alimentation qui se retrouve sans connexion
	 * sortante suite à ce retrait (voir `pruneOrphanedRailTerminals`), renvoyée pour que
	 * l'appelant puisse la restaurer à l'annulation.
	 */
	removeConnections(
		sectionId: string,
		pairs: { sourceId: string; targetId: string }[],
	): { sectionId: string; element: LadderElement }[] {
		const section = this.getSection(sectionId);
		if (!section) return [];
		for (const { sourceId, targetId } of pairs) {
			const index = section.connections.findIndex(
				(c) => c.source.id === sourceId && c.target.id === targetId,
			);
			if (index !== -1) section.connections.splice(index, 1);
		}
		return this.pruneOrphanedRailTerminals(new Set([section]));
	}

	/**
	 * Une borne d'alimentation n'est jamais persistée sans connexion sortante (voir
	 * `RailTerminalElement`) : après tout retrait de connexion ou d'élément susceptible de
	 * l'isoler, on la retire à son tour.
	 */
	private pruneOrphanedRailTerminals(
		sections: Set<Section>,
	): { sectionId: string; element: LadderElement }[] {
		const removed: { sectionId: string; element: LadderElement }[] = [];
		for (const section of sections) {
			const orphaned = section.elements.filter(
				(element) =>
					element.type === "railTerminal" &&
					!section.connections.some((connection) => connection.source.id === element.id),
			);
			for (const element of orphaned) {
				const index = section.elements.findIndex((e) => e.id === element.id);
				if (index !== -1) section.elements.splice(index, 1);
				removed.push({ sectionId: section.id, element });
			}
		}
		return removed;
	}

	/**
	 * Tous les éléments de toutes les sections — utilisé par l'analyseur/le pré-compilateur, pour
	 * qui les sections ne sont qu'une organisation d'édition.
	 */
	getAllElements(): LadderElement[] {
		return this.sections.flatMap((section) => section.elements);
	}

	getAllConnections(): { sectionId: string; connection: Connection }[] {
		return this.sections.flatMap((section) =>
			section.connections.map((connection) => ({ sectionId: section.id, connection })),
		);
	}

	/**
	 * Used when variables are renamed, so that the contacts/coils referencing them stay valid.
	 * Contrairement aux expressions GRAFCET, `variable` n'est pas du code à parser : c'est le
	 * mnémonique référencé tel quel, donc une simple substitution suffit.
	 *
	 * @param renames Map of old mnemonic → new mnemonic
	 */
	renameVariableReferences(renames: Record<string, string>): void {
		if (Object.keys(renames).length === 0) return;

		this.sections.forEach((section) => {
			section.elements.forEach((element) => {
				if (element.type !== "contact" && element.type !== "coil") return;
				const data = element.data as ContactData | CoilData;
				const newName = renames[data.variable];
				if (newName) data.variable = newName;
			});
		});
	}

	copy(): Ladder {
		return new Ladder(
			this.id,
			this.name,
			this.sections.map((section) => section.copy()),
		);
	}

	static createFromJSON(json: string): Ladder {
		const jsonParsed = JSON.parse(json);
		const ladder = Object.assign(new Ladder("", ""), jsonParsed);
		ladder.sections = (jsonParsed.sections ?? []).map((raw: unknown) =>
			Section.createFromJSON(JSON.stringify(raw)),
		);
		return ladder;
	}
}
