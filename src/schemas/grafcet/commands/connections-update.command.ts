import { deepObjectsComparison } from "@/lib/object";
import Connection from "..//connection.schema";
import Grafcet from "../grafcet.schema";
import AbstractGrafcetCommand from "./abstract-grafcet.command";

export default class ConnectionsUpdateCommand extends AbstractGrafcetCommand<
	{
		connection: Connection;
		previous: Connection;
	}[]
> {
	getType(): string {
		return "grafcet-connections-update";
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
