import Connection from "..//connection.schema";
import Grafcet from "../grafcet.schema";
import AbstractGrafcetCommand from "./abstract-grafcet.command";

export default class ConnectionsRemoveCommand extends AbstractGrafcetCommand<Connection[]> {
	getType(): string {
		return "grafcet-connections-remove";
	}

	execute(grafcet: Grafcet): [grafcet: Grafcet, isCommandValid: boolean] {
		grafcet.removeConnections(
			this.payload.map((c) => ({ sourceId: c.source.id, targetId: c.target.id })),
		);
		return [grafcet, true];
	}

	cancel(grafcet: Grafcet): Grafcet {
		grafcet.addConnections(this.payload);
		return grafcet;
	}
}
