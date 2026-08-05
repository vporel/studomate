import Connection from "../connection.schema";
import Ladder from "../ladder.schema";
import { LadderElement } from "../element.schema";
import AbstractLadderCommand from "./abstract-ladder.command";

/**
 * Retire des éléments, en restaurant à l'annulation aussi bien les éléments que les connexions
 * qui les touchaient (capturées dans le payload par l'appelant avant dispatch) : auto-suffisant,
 * pas besoin de la composer avec une `ConnectionsRemoveCommand` séparée pour rester cohérent à
 * l'annulation.
 *
 * Une borne d'alimentation laissée sans connexion sortante par ce retrait est elle-même retirée
 * en cascade par `Ladder.removeElements` — capturée ici (pas dans le payload, l'appelant ne peut
 * pas la connaître à l'avance) pour être restaurée à l'annulation.
 */
export default class ElementsRemoveCommand extends AbstractLadderCommand<{
	elements: { sectionId: string; element: LadderElement }[];
	connections: { sectionId: string; connection: Connection }[];
}> {
	private sweptRailTerminals: { sectionId: string; element: LadderElement }[] = [];

	getType(): string {
		return "ladder-elements-remove";
	}

	execute(ladder: Ladder): [ladder: Ladder, isCommandValid: boolean] {
		if (this.payload.elements.length === 0) return [ladder, false];
		this.sweptRailTerminals = ladder.removeElements(this.payload.elements.map(({ element }) => element.id));
		return [ladder, true];
	}

	cancel(ladder: Ladder): Ladder {
		for (const { sectionId, element } of this.payload.elements) {
			ladder.addElements(sectionId, [{ ...element }]);
		}
		for (const { sectionId, element } of this.sweptRailTerminals) {
			ladder.addElements(sectionId, [{ ...element }]);
		}
		for (const { sectionId, connection } of this.payload.connections) {
			ladder.addConnections(sectionId, [connection.copy()]);
		}
		return ladder;
	}
}
