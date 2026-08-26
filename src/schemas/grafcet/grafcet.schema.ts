import { Dialect } from "@/expression-language/dialect.enum";
import Program, { ProgramType } from "@/schemas/program/program.schema";
import IdentifierRenamer from "@/expression-language/identifier-renamer";
import KeywordTranslator from "@/expression-language/keyword-translator";
import Action, { ActionType } from "./action.schema";
import Comment from "./comment.schema";
import Connection, { HandleType } from "./connection.schema";
import Element, { ElementType } from "./element.schema";
import JunctionAndEnd from "./junction-and-end.schema";
import JunctionAndStart from "./junction-and-start.schema";
import JunctionOrEnd from "./junction-or-end.schema";
import JunctionOrStart from "./junction-or-start.schema";
import { Dimensions, XYPosition } from "./shared-types";
import StepReferralSource from "./step-referral-source.schema";
import StepReferralTarget from "./step-referral-target.schema";
import Step from "./step.schema";
import Transition from "./transition.schema";

export type GrafcetFormat = {
	type: "A4" | "A3";
	orientation: "portrait" | "landscape";
};

/** Nom par défaut d'un GRAFCET construit sans nom explicite (voir `GrafcetBuilder`) — distinct de
 * `GRAFCET_NAME_LABEL`, propre à la création d'un nouveau GRAFCET depuis l'UI. */
export const DEFAULT_GRAFCET_NAME = "Sans titre";

/** Base du nom auto-généré ("Grafcet_1", "Grafcet_2"...) à la création — voir
 * `Project.nextProgramName`. */
export const GRAFCET_NAME_LABEL = "Grafcet";

export const DEFAULT_GRAFCET_FORMAT: GrafcetFormat = {
	type: "A4",
	orientation: "portrait",
};

/**
 * Classe de schéma et collection portant chaque type d'élément.
 *
 * **Source unique de vérité.** Le `satisfies Record<ElementType, …>` la rend **exhaustive à
 * la compilation** : ajouter un type d'élément sans l'inscrire ici ne compile plus.
 */
const ELEMENT_COLLECTIONS = {
	step: { collection: "steps", schema: Step },
	action: { collection: "actions", schema: Action },
	transition: { collection: "transitions", schema: Transition },
	"step-referral-source": { collection: "stepsReferralsSources", schema: StepReferralSource },
	"step-referral-target": { collection: "stepsReferralsTargets", schema: StepReferralTarget },
	"junction-and-start": { collection: "junctionsAndStarts", schema: JunctionAndStart },
	"junction-and-end": { collection: "junctionsAndEnds", schema: JunctionAndEnd },
	"junction-or-start": { collection: "junctionsOrStarts", schema: JunctionOrStart },
	"junction-or-end": { collection: "junctionsOrEnds", schema: JunctionOrEnd },
	comment: { collection: "comments", schema: Comment },
} as const satisfies Record<
	ElementType,
	{ collection: string; schema: any }
>;

const ELEMENT_TYPES_ENTRIES = Object.entries(ELEMENT_COLLECTIONS) as [
	ElementType,
	(typeof ELEMENT_COLLECTIONS)[ElementType],
][];

export const elementsSchemasClasses: Record<ElementType, any> = Object.fromEntries(
	ELEMENT_TYPES_ENTRIES.map(([type, { schema }]) => [type, schema]),
) as Record<ElementType, any>;

export default class Grafcet extends Program {
	readonly type: ProgramType = "grafcet";
	format: GrafcetFormat = { type: "A4", orientation: "portrait" };
	steps: Step[] = [];
	actions: Action[] = [];
	transitions: Transition[] = [];
	stepsReferralsSources: StepReferralSource[] = [];
	stepsReferralsTargets: StepReferralTarget[] = [];
	junctionsAndStarts: JunctionAndStart[] = [];
	junctionsAndEnds: JunctionAndEnd[] = [];
	junctionsOrStarts: JunctionOrStart[] = [];
	junctionsOrEnds: JunctionOrEnd[] = [];
	comments: Comment[] = [];
	connections: Connection[] = [];

	constructor(id: string, name: string, format: GrafcetFormat) {
		super(id, name);
		this.format = format;
	}

	/**
	 * Get the connections that have the provided element id as source or target, regardless of the handle id
	 * @param elementId
	 * @returns
	 */
	getConnectionsByElementId(elementId: string): Connection[] {
		return this.connections.filter((c) => c.source.id === elementId || c.target.id === elementId);
	}

	getConnectionsByElementIdAndHandle(elementId: string, handle: string): Connection[] {
		return this.connections.filter(
			(c) =>
				(c.source.id === elementId && c.source.handle === handle) ||
				(c.target.id === elementId && c.target.handle === handle),
		);
	}

	getConnectionsByElementIdAndHandleType(elementId: string, handleType: HandleType): Connection[] {
		return this.connections.filter((c) => c[handleType].id === elementId);
	}

	/**
	 * Get a map of all the elements of the grafcet, with their type as key, and the elements list as value
	 * @returns
	 */
	getTypeToElementsMap(): Record<ElementType, Element<any>[]> {
		return Object.fromEntries(
			ELEMENT_TYPES_ENTRIES.map(([type, { collection }]) => [type, this.getCollection(collection)]),
		) as Record<ElementType, Element<any>[]>;
	}

	/**
	 * Accès à la collection portant un type d'élément, sans passer par la construction d'une
	 * table intermédiaire.
	 */
	private getCollection(collection: string): Element<any>[] {
		return (this as unknown as Record<string, Element<any>[]>)[collection];
	}

	/**
	 * Get all the elements of the grafcet in a single list
	 * @returns
	 */
	getAllElements(): Element<any>[] {
		const allElements: Element<any>[] = [];
		for (const [, { collection }] of ELEMENT_TYPES_ENTRIES) {
			allElements.push(...this.getCollection(collection));
		}
		return allElements;
	}

	getElementsByType<T extends Element<any>>(type: ElementType): T[] {
		return this.getCollection(ELEMENT_COLLECTIONS[type].collection) as T[];
	}

	getElementByIdAndType<T extends Element<any>>(id: string, type: ElementType): T | undefined {
		const group = this.getElementsByType<T>(type);
		return group.find((e) => e.id === id);
	}

	getElementById<T extends Element<any>>(id: string): T | undefined {
		//Appelée en boucle par les analyseurs et les helpers : ne pas allouer de tableau
		//intermédiaire en concaténant les collections
		for (const [, { collection }] of ELEMENT_TYPES_ENTRIES) {
			const found = this.getCollection(collection).find((e) => e.id === id);
			if (found) return found as T;
		}
		return undefined;
	}

	addElements(
		elements: { type: ElementType; id: string; data: any; position: XYPosition; size?: Dimensions }[],
	): void {
		elements.forEach(({ type, id, data, position, size }) => {
			const group = this.getElementsByType(type);
			const elementClass = elementsSchemasClasses[type];
			const element = new elementClass(
				id,
				structuredClone(data),
				position,
				structuredClone(size ?? elementClass.DEFAULT_DIMENSIONS),
			);
			if (!group.find((e) => e.id === element.id)) {
				group.push(element);
			}
		});
	}

	updateElements(
		elements: {
			type: ElementType;
			id: string;
			data?: any;
			position?: XYPosition;
			size?: Dimensions;
		}[],
	): void {
		elements.forEach(({ type, id, data, position, size }) => {
			const group = this.getElementsByType(type);
			const element = group.find((e) => e.id === id);
			if (element) {
				if (data) element.updateData(data);
				if (position) element.position = position;
				if (size) element.updateSize(size);
			}
		});
	}

	removeElements(elements: { type: ElementType; id: string }[]): void {
		elements.forEach(({ type, id }) => {
			const group = this.getElementsByType(type);
			const index = group.findIndex((e) => e.id === id);
			if (index !== -1) {
				group.splice(index, 1);
			}
			// Remove related connections
			const relatedConnections = this.connections.filter(
				(c) => c.source.id === id || c.target.id === id,
			);
			this.removeConnections(
				relatedConnections.map((c) => ({ sourceId: c.source.id, targetId: c.target.id })),
			);
		});
	}

	getConnection(sourceId: string, targetId: string): Connection | undefined {
		return this.connections.find((c) => c.source.id === sourceId && c.target.id === targetId);
	}

	addConnections(connections: Connection[]): void {
		// Check if connection elements exist, the source and the target
		connections.forEach((connection) => {
			const sourceExists = !!this.getElementByIdAndType(connection.source.id, connection.source.type);
			const targetExists = !!this.getElementByIdAndType(connection.target.id, connection.target.type);
			if (!sourceExists) {
				throw new Error(
					`Connection 'source' element missing: type=${connection.source.type}, id=${connection.source.id}`,
				);
			}
			if (!targetExists) {
				throw new Error(
					`Connection 'target' element missing: type=${connection.target.type}, id=${connection.target.id}`,
				);
			}
			if (
				sourceExists &&
				targetExists &&
				!this.connections.find(
					(c) => c.source.id === connection.source.id && c.target.id === connection.target.id,
				)
			) {
				this.connections.push(connection);
			}
		});
	}

	/**
	 * Replace the connections with the same source and target ids with the provided ones, if they exist.
	 * If a connection doesn't exist, it will be ignored
	 * @param connections
	 */
	updateConnections(connections: Connection[]): void {
		connections.forEach((connection) => {
			const index = this.connections.findIndex(
				(c) => c.source.id === connection.source.id && c.target.id === connection.target.id,
			);
			if (index !== -1) {
				this.connections[index] = connection;
			}
		});
	}

	removeConnections(
		connections: {
			sourceId: string;
			targetId: string;
		}[],
	): void {
		connections.forEach((connection) => {
			const index = this.connections.findIndex(
				(c) => c.source.id === connection.sourceId && c.target.id === connection.targetId,
			);
			if (index !== -1) {
				this.connections.splice(index, 1);
			}
		});
	}

	/**
	 * Rewrites the identifiers used in every expression of the grafcet.
	 * Used when variables are renamed, so that the expressions referencing them stay valid.
	 *
	 * Only expressions that are actually *code* are rewritten: a TEXT action holds free
	 * descriptive text, not an expression, and must never be touched — renaming a variable
	 * `moteur` must not turn the label "moteur en marche" into "pompe en marche".
	 *
	 * @param renames Map of old identifier name → new identifier name
	 * @param dialect Dialect of the expressions, so that keywords are not mistaken for identifiers
	 */
	renameIdentifiersInExpressions(renames: Record<string, string>, dialect: Dialect = Dialect.FR): void {
		if (Object.keys(renames).length === 0) return;

		this.transitions.forEach((transition) => {
			transition.data.expression = IdentifierRenamer.rename(
				transition.data.expression,
				renames,
				dialect,
			);
		});

		this.actions.forEach((action) => {
			if (action.data.type === ActionType.TEXT) return;
			action.data.expression = IdentifierRenamer.rename(action.data.expression, renames, dialect);
		});
	}

	/**
	 * Traduit les mots-clés des expressions d'un dialecte vers un autre.
	 * Comme pour le renommage, une action TEXT porte du texte descriptif et non du code :
	 * elle n'est jamais touchée.
	 */
	translateExpressionsKeywords(from: Dialect, to: Dialect): void {
		this.transitions.forEach((transition) => {
			transition.data.expression = KeywordTranslator.translate(transition.data.expression, from, to);
		});
		this.actions.forEach((action) => {
			if (action.data.type === ActionType.TEXT) return;
			action.data.expression = KeywordTranslator.translate(action.data.expression, from, to);
		});
	}

	copy(): Grafcet {
		const newGrafcet = Object.assign(new Grafcet(this.id, this.name, this.format), this);
		newGrafcet.format = { ...this.format };
		for (const [, { collection }] of ELEMENT_TYPES_ENTRIES) {
			newGrafcet.setCollection(
				collection,
				this.getCollection(collection).map((element) => element.copy()),
			);
		}
		newGrafcet.connections = this.connections.map((c) => c.copy());
		return newGrafcet;
	}

	private setCollection(collection: string, elements: Element<any>[]): void {
		(this as unknown as Record<string, Element<any>[]>)[collection] = elements;
	}

	static createFromJSON(json: string): Grafcet {
		const jsonParsed = JSON.parse(json);
		const grafcet = Object.assign(new Grafcet("", "", DEFAULT_GRAFCET_FORMAT), jsonParsed);
		for (const [, { collection, schema }] of ELEMENT_TYPES_ENTRIES) {
			grafcet.setCollection(
				collection,
				(jsonParsed[collection] ?? []).map((raw: unknown) => (schema as any).createFromJSON(JSON.stringify(raw))),
			);
		}
		grafcet.connections = (jsonParsed.connections ?? []).map((c: unknown) =>
			Connection.createFromJSON(JSON.stringify(c)),
		);
		return grafcet;
	}
}
