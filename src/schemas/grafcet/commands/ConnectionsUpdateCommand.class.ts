import Grafcet from "../Grafcet.class";
import GrafcetConnection from "../GrafcetConnection.class";
import GrafcetCommand from "./AbstractGrafcetCommand.class";

export default class ConnectionsUpdateCommand extends GrafcetCommand<
	{
		connection: GrafcetConnection;
		previous: GrafcetConnection;
	}[]
> {
	getType(): string {
		return "connections-update";
	}

	execute(grafcet: Grafcet): Grafcet {
		grafcet.updateConnections(this.payload.map((p) => p.connection));
		return grafcet;
	}

	cancel(grafcet: Grafcet): Grafcet {
		grafcet.updateConnections(this.payload.map((p) => p.previous));
		return grafcet;
	}
}
