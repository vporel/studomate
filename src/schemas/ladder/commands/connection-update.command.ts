import { ConnectionData } from "../connection.schema";
import Ladder from "../ladder.schema";
import AbstractLadderCommand from "./abstract-ladder.command";

/** Modifie le tracé (`data.points`) d'une connexion existante — jamais sa source/cible. Utilisée
 * par le déplacement d'un segment (souris ou flèches directionnelles) et par la poussée d'un
 * coude quand le nœud connecté se déplace. */
export default class ConnectionUpdateCommand extends AbstractLadderCommand<{
	connectionId: string;
	changes: Partial<ConnectionData>;
	previousChanges: Partial<ConnectionData>;
}> {
	getType(): string {
		return "ladder-connection-update";
	}

	execute(ladder: Ladder): [ladder: Ladder, isCommandValid: boolean] {
		if (!ladder.findConnection(this.payload.connectionId))
			return [ladder, false];
		ladder.updateConnectionData(
			this.payload.connectionId,
			this.payload.changes,
		);
		return [ladder, true];
	}

	cancel(ladder: Ladder): Ladder {
		ladder.updateConnectionData(
			this.payload.connectionId,
			this.payload.previousChanges,
		);
		return ladder;
	}
}
