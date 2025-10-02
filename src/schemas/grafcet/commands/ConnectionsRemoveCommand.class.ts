import Grafcet from "../Grafcet.class";
import GrafcetConnection from "../GrafcetConnection.class";
import GrafcetCommand from "./AbstractGrafcetCommand.class";

export default class ConnectionsRemoveCommand extends GrafcetCommand<GrafcetConnection[]> {
	getType(): string {
		return "connections-remove";
	}

	execute(grafcet: Grafcet): [grafcet: Grafcet, isCommandValid: boolean] {
		grafcet.removeConnections(
			this.payload.map((c) => ({ sourceId: c.source.id, targetId: c.target.id }))
		);
		return [grafcet, true];
	}

	cancel(grafcet: Grafcet): Grafcet {
		grafcet.addConnections(this.payload);
		return grafcet;
	}
}
