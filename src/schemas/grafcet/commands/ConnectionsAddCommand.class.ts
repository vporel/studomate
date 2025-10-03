import Grafcet from "../Grafcet.class";
import GrafcetConnection from "../GrafcetConnection.class";
import AbstractGrafcetCommand from "./AbstractGrafcetCommand.class";

export default class ConnectionsAddCommand extends AbstractGrafcetCommand<GrafcetConnection[]> {
	getType(): string {
		return "connections-add";
	}

	execute(grafcet: Grafcet): [grafcet: Grafcet, isCommandValid: boolean] {
		grafcet.addConnections(this.payload);
		return [grafcet, true];
	}

	cancel(grafcet: Grafcet): Grafcet {
		grafcet.removeConnections(
			this.payload.map((c) => ({ sourceId: c.source.id, targetId: c.target.id }))
		);
		return grafcet;
	}
}
