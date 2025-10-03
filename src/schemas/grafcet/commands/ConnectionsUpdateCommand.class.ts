import { deepObjectsComparison } from "@/lib/object";
import Grafcet from "../Grafcet.class";
import GrafcetConnection from "../GrafcetConnection.class";
import AbstractGrafcetCommand from "./AbstractGrafcetCommand.class";

export default class ConnectionsUpdateCommand extends AbstractGrafcetCommand<
	{
		connection: GrafcetConnection;
		previous: GrafcetConnection;
	}[]
> {
	getType(): string {
		return "connections-update";
	}

	execute(grafcet: Grafcet): [grafcet: Grafcet, isCommandValid: boolean] {
		let isCommandValid = false;
		for (const { connection, previous } of this.payload) {
			if (deepObjectsComparison(connection.data, previous.data) === false) {
				isCommandValid = true;
				break;
			}
		}
		if (!isCommandValid) return [grafcet, false];
		grafcet.updateConnections(this.payload.map((p) => p.connection));
		return [grafcet, true];
	}

	cancel(grafcet: Grafcet): Grafcet {
		grafcet.updateConnections(this.payload.map((p) => p.previous));
		return grafcet;
	}
}
