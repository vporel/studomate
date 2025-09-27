import Grafcet from "../Grafcet.class";
import GrafcetConnection from "../GrafcetConnection.class";
import GrafcetCommand from "./AbstractGrafcetCommand.class";

export default class ConnectionsAddCommand extends GrafcetCommand<GrafcetConnection[]> {
	getType(): string {
		return "connections-add";
	}

	execute(grafcet: Grafcet): Grafcet {
		grafcet.addConnections(this.payload);
		return grafcet;
	}

	cancel(grafcet: Grafcet): Grafcet {
		grafcet.removeConnections(this.payload);
		return grafcet;
	}
}
