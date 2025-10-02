import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";

export type GrafcetConnectionsEvents = {
	add: GrafcetConnection[];
	update: GrafcetConnection[];
	remove: GrafcetConnection[];
};
