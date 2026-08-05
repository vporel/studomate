import Connection from "../connection.schema";
import Ladder from "../ladder.schema";
import { LadderElement } from "../element.schema";
import AbstractLadderCommand from "./abstract-ladder.command";

/**
 * Retire des connexions existantes. Une borne d'alimentation laissée sans connexion sortante par
 * ce retrait est retirée en cascade par `Ladder.removeConnections` — capturée ici pour être
 * restaurée à l'annulation, avant les connexions qui la référencent (`addConnections` valide que
 * la source existe déjà).
 */
export default class ConnectionsRemoveCommand extends AbstractLadderCommand<{
	sectionId: string;
	connections: Connection[];
}> {
	private sweptRailTerminals: { sectionId: string; element: LadderElement }[] = [];

	getType(): string {
		return "ladder-connections-remove";
	}

	execute(ladder: Ladder): [ladder: Ladder, isCommandValid: boolean] {
		if (this.payload.connections.length === 0) return [ladder, false];
		this.sweptRailTerminals = ladder.removeConnections(
			this.payload.sectionId,
			this.payload.connections.map((c) => ({ sourceId: c.source.id, targetId: c.target.id })),
		);
		return [ladder, true];
	}

	cancel(ladder: Ladder): Ladder {
		for (const { sectionId, element } of this.sweptRailTerminals) {
			ladder.addElements(sectionId, [{ ...element }]);
		}
		ladder.addConnections(
			this.payload.sectionId,
			this.payload.connections.map((connection) => connection.copy()),
		);
		return ladder;
	}
}
