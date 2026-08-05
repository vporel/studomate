import Connection from "./connection.schema";
import { LadderElement } from "./element.schema";

function copyElement(element: LadderElement): LadderElement {
	const position = { ...element.position };
	if (element.type === "contact") return { ...element, data: { ...element.data }, position };
	if (element.type === "coil") return { ...element, data: { ...element.data }, position };
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

	getLeftNeighbor(row: number, col: number): LadderElement | undefined {
		return this.elements.find((element) => element.position.row === row && element.position.col === col - 1);
	}

	getRightNeighbor(row: number, col: number): LadderElement | undefined {
		return this.elements.find((element) => element.position.row === row && element.position.col === col + 1);
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
