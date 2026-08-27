import Connection from "./connection.schema";
import { getElementWidth, LadderElement } from "./element.schema";

function copyElement(element: LadderElement): LadderElement {
	const position = { ...element.position };
	if (element.type === "contact")
		return { ...element, data: { ...element.data }, position };
	if (element.type === "coil")
		return { ...element, data: { ...element.data }, position };
	if (element.type === "block")
		return { ...element, data: { ...element.data }, position };
	return { ...element, data: { ...element.data }, position };
}

/**
 * Une section porte sa propre barre d'alimentation, un ensemble d'éléments (contacts/bobines/
 * bornes d'alimentation, chacun positionné sur la grille) et les connexions qui les relient.
 */
export default class Section {
	id: string;
	title: string;
	description: string;
	elements: LadderElement[];
	connections: Connection[];

	constructor(
		id: string,
		title: string,
		description: string = "",
		elements: LadderElement[] = [],
		connections: Connection[] = [],
	) {
		this.id = id;
		this.title = title;
		this.description = description;
		this.elements = elements;
		this.connections = connections;
	}

	getElement(elementId: string): LadderElement | undefined {
		return this.elements.find((element) => element.id === elementId);
	}

	/** Voisin de gauche, en tenant compte de la largeur de l'élément trouvé (un `block` occupe 2
	 * colonnes : son bord droit, celui qui touche `col`, est à `position.col + 2`, pas `+ 1`). */
	getLeftNeighbor(row: number, col: number): LadderElement | undefined {
		return this.elements.find(
			(element) =>
				element.position.row === row &&
				element.position.col + getElementWidth(element) === col,
		);
	}

	/** Voisin de droite de l'élément (existant ou en cours de dépose) occupant `col`..`col + width -
	 * 1` — `width` par défaut à 1 (contact/bobine), passer 2 pour un `block`. */
	getRightNeighbor(
		row: number,
		col: number,
		width: number = 1,
	): LadderElement | undefined {
		return this.elements.find(
			(element) =>
				element.position.row === row && element.position.col === col + width,
		);
	}

	copy(): Section {
		return new Section(
			this.id,
			this.title,
			this.description,
			this.elements.map(copyElement),
			this.connections.map((connection) => connection.copy()),
		);
	}

	static createFromJSON(json: string): Section {
		const jsonParsed = JSON.parse(json);
		const section = Object.assign(new Section("", ""), jsonParsed);
		section.elements = jsonParsed.elements ?? [];
		section.connections = (jsonParsed.connections ?? []).map((raw: unknown) =>
			Connection.createFromJSON(JSON.stringify(raw)),
		);
		return section;
	}
}
